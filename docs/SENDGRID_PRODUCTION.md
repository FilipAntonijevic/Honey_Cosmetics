# SendGrid Production Setup — honey-cosmetic.com

Complete guide for authenticating **honey-cosmetic.com** with SendGrid and configuring the Honey Cosmetics backend for maximum deliverability.

> **Important:** DNS record **values** (the right-hand CNAME targets) are **unique to your SendGrid account**. They can only be generated inside your SendGrid dashboard. This document explains exactly how to obtain them and what to send to your GoDaddy administrator.

---

## Part 1 — SendGrid account setup

### 1.1 Create a restricted API key

1. Log in to [SendGrid](https://app.sendgrid.com/).
2. Go to **Settings → API Keys**.
3. Click **Create API Key**.
4. Name: `Honey Cosmetics Production`
5. Permissions: **Restricted Access** → enable **Mail Send → Full Access** only.
6. Copy the key (starts with `SG.`). **You will not see it again.**

Store it only on the server:

```bash
# /etc/honey-api.env (never commit to git)
SendGrid__ApiKey=SG.xxxxxxxxxxxxxxxxxxxxx
```

### 1.2 Domain Authentication (DKIM + SPF return-path)

1. Go to **Settings → Sender Authentication**.
2. Click **Authenticate Your Domain** (under Domain Authentication).
3. Choose DNS host: **GoDaddy**.
4. Enter domain: `honey-cosmetic.com`
5. Leave **Use automated security** enabled (recommended — allows SendGrid to rotate DKIM keys).
6. Click **Next**. SendGrid displays the DNS records you must add.

SendGrid will show **3 CNAME records** (typical with automated security):

| Purpose | Host / Name (GoDaddy) | Points to (Value) |
|---------|----------------------|-------------------|
| DKIM key 1 | `s1._domainkey` | `s1.domainkey.uXXXXXX.wlXXX.sendgrid.net` |
| DKIM key 2 | `s2._domainkey` | `s2.domainkey.uXXXXXX.wlXXX.sendgrid.net` |
| Return-path / SPF branding | `em####` (e.g. `em2847`) | `uXXXXXX.wlXXX.sendgrid.net` |

Replace `uXXXXXX.wlXXX` with the exact values from **your** SendGrid dashboard.

#### GoDaddy-specific rules

- In the **Name** field, enter **only the subdomain part** (e.g. `s1._domainkey`), **not** `s1._domainkey.honey-cosmetic.com`. GoDaddy appends the domain automatically.
- **Type:** CNAME
- **TTL:** 1 Hour (or lowest available)
- **Value:** paste the full target exactly as SendGrid shows (no trailing spaces)
- Do **not** create TXT records for DKIM — SendGrid uses CNAME delegation.

### 1.3 DNS records to forward to your domain administrator

Copy this table, fill in the **Value** column from SendGrid, and send to whoever manages GoDaddy DNS:

| # | Type | Name (Host) | Value (Points to) | TTL |
|---|------|-------------|-------------------|-----|
| 1 | CNAME | `s1._domainkey` | *(from SendGrid — DKIM 1)* | 1 Hour |
| 2 | CNAME | `s2._domainkey` | *(from SendGrid — DKIM 2)* | 1 Hour |
| 3 | CNAME | `em####` *(from SendGrid)* | *(from SendGrid — return-path)* | 1 Hour |
| 4 | TXT | `@` | `v=spf1 include:sendgrid.net ~all` | 1 Hour |
| 5 | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@honey-cosmetic.com` | 1 Hour |

**Notes for the administrator:**

- Records 1–3 come from SendGrid Domain Authentication (unique per account).
- Record 4 (SPF) authorizes SendGrid to send on behalf of `honey-cosmetic.com`. If you already have an SPF record, merge: `v=spf1 include:sendgrid.net include:OTHER ~all` (only one SPF TXT per domain).
- Record 5 (DMARC) is recommended for deliverability monitoring. Start with `p=none`, move to `p=quarantine` after 2–4 weeks of clean sending.

### 1.4 Verify domain in SendGrid

1. Wait 15–60 minutes for DNS propagation (can take up to 48 hours).
2. In SendGrid → **Settings → Sender Authentication**, click **Verify** next to `honey-cosmetic.com`.
3. Status should change to **Verified** with DKIM and SPF showing as valid.

Check externally:

- [MXToolbox SPF](https://mxtoolbox.com/SuperTool.aspx?action=spf%3ahoney-cosmetic.com)
- [MXToolbox DMARC](https://mxtoolbox.com/SuperTool.aspx?action=dmarc%3ahoney-cosmetic.com)
- Send a test email and inspect headers for `dkim=pass`, `spf=pass`, `dmarc=pass`

### 1.5 Link Branding (recommended)

Link branding rewrites tracked links to use your domain instead of `sendgrid.net`, improving trust and deliverability.

1. SendGrid → **Settings → Sender Authentication → Link Branding**.
2. Click **Brand Your Links**.
3. Choose subdomain: `links` or `url` (e.g. `links.honey-cosmetic.com`).
4. SendGrid generates **2 additional CNAME records**. Add them in GoDaddy the same way.

| Type | Name (Host) | Value (Points to) |
|------|-------------|-------------------|
| CNAME | `links` *(or as shown)* | *(from SendGrid)* |
| CNAME | `####.links` *(from SendGrid)* | *(from SendGrid)* |

5. Click **Verify** after DNS propagates.

> The backend disables click/open tracking on transactional emails, but link branding still helps with overall domain reputation.

---

## Part 2 — Backend configuration

All secrets are loaded from **environment variables** (never hardcoded).

### 2.1 Server environment file

On Hetzner, edit `/etc/honey-api.env`:

```bash
ASPNETCORE_ENVIRONMENT=Production

# SendGrid — REQUIRED
SendGrid__ApiKey=SG.your-real-api-key
SendGrid__FromEmail=noreply@honey-cosmetic.com
SendGrid__FromName=Honey Cosmetics
SendGrid__ReplyToEmail=info@honey-cosmetic.com
SendGrid__AdminEmail=your-inbox@example.com

# Optional — leave empty for auto-detect from request domain
# FrontendUrl=https://honey-cosmetic.com
# PublicApiUrl=https://honey-cosmetic.com
```

Template file in repo: `deploy/honey-api.env.example`

Restart API after changes:

```bash
systemctl restart honey-api
journalctl -u honey-api -n 30 --no-pager
```

Look for: `SendGrid: API key configured, From=noreply@honey-cosmetic.com`

### 2.2 What the backend sends

| Email type | Trigger | From | Reply-To |
|------------|---------|------|----------|
| Registration confirmation | User registers | `noreply@honey-cosmetic.com` | — |
| Password reset | Forgot password | `noreply@honey-cosmetic.com` | — |
| Order confirmation (customer) | Checkout | `noreply@honey-cosmetic.com` | Site contact email |
| Order notification (admin) | Checkout | `noreply@honey-cosmetic.com` | — |
| Contact form | `/api/contact/message` | `noreply@honey-cosmetic.com` | Customer's email |
| Collaboration form | `/api/contact/collaboration` | `noreply@honey-cosmetic.com` | Customer's email |
| Wishlist back-in-stock | Admin stock update | `noreply@honey-cosmetic.com` | Site contact email |

### 2.3 Deliverability settings (already in code)

- Click tracking: **disabled**
- Open tracking: **disabled**
- Category: `transactional`
- Bypass list/spam/bounce/unsubscribe management (transactional mail must not be blocked by marketing rules)

### 2.4 Admin panel email addresses

In **Admin → Linkovi**, configure:

- **Porudžbine i notifikacije** — admin inbox(es) for new orders
- **Info — kontakt** — shown on site + used as Reply-To on order confirmations
- **Reklamacije** — displayed on site

These are independent of SendGrid `FromEmail` (which stays `noreply@`).

---

## Part 3 — Domain and nginx (website move)

When `honey-cosmetic.com` DNS points to your Hetzner server, update nginx:

```nginx
server {
    listen 80;
    server_name honey-cosmetic.com www.honey-cosmetic.com;

    location /api/ {
        proxy_pass http://127.0.0.1:5128/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Then add SSL with Certbot:

```bash
certbot --nginx -d honey-cosmetic.com -d www.honey-cosmetic.com
```

Email links auto-detect the domain from incoming requests (no code change needed when DNS switches).

---

## Part 4 — Testing checklist

After DNS verification and server config:

- [ ] `journalctl -u honey-api` shows `SendGrid: API key configured`
- [ ] Register a new test account → confirmation email arrives from `noreply@honey-cosmetic.com`
- [ ] Click confirmation link → works on `https://honey-cosmetic.com`
- [ ] Forgot password → reset email arrives
- [ ] Place a test order → customer + admin notification emails arrive
- [ ] Submit contact form → email arrives with Reply-To set to customer's address
- [ ] Check email headers: `dkim=pass`, `spf=pass`
- [ ] Email lands in **Inbox**, not Spam (test Gmail + Outlook)

---

## Part 5 — Troubleshooting

| Problem | Solution |
|---------|----------|
| SendGrid Verify fails | Wait longer for DNS; check GoDaddy host names don't include domain twice |
| HTTP 403 from SendGrid | API key missing Mail Send permission; or From address domain not verified |
| Emails go to spam | Complete domain authentication + DMARC; warm up sending volume gradually |
| Links in email point to wrong domain | Ensure nginx sends `Host` and `X-Forwarded-Proto` headers |
| `SendGrid API ključ nije podešen` | Set `SendGrid__ApiKey` in `/etc/honey-api.env` and restart |

---

## Quick reference — environment variables

| Variable | Example | Required |
|----------|---------|----------|
| `SendGrid__ApiKey` | `SG.xxx` | Yes |
| `SendGrid__FromEmail` | `noreply@honey-cosmetic.com` | Yes |
| `SendGrid__FromName` | `Honey Cosmetics` | Yes |
| `SendGrid__ReplyToEmail` | `info@honey-cosmetic.com` | Recommended |
| `SendGrid__AdminEmail` | `admin@example.com` | Fallback inbox |
