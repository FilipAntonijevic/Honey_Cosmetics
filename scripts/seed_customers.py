#!/usr/bin/env python3
"""Import customer profiles from WooCommerce-style CSV export."""

import csv
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCKER = "honey_cosmetics-postgres-1"
DEFAULT_CSV = ROOT / "scripts" / "customers_import.csv"


def sql_escape(value: str) -> str:
    return value.replace("'", "''")


def run_sql(statements: str) -> None:
    proc = subprocess.run(
        [
            "docker", "exec", "-i", DOCKER,
            "psql", "-U", "postgres", "-d", "honey_cosmetics", "-v", "ON_ERROR_STOP=1",
        ],
        input=statements,
        text=True,
        capture_output=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"SQL failed:\n{proc.stdout}\n{proc.stderr}")


def parse_dt(raw: str | None) -> datetime | None:
    if not raw or not raw.strip():
        return None
    value = raw.strip()
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def normalize_country(raw: str | None) -> str:
    code = (raw or "").strip().upper()
    if code in ("RS", "SRB"):
        return "Srbija"
    return (raw or "").strip() or "Srbija"


def normalize_email(raw: str | None) -> str:
    return (raw or "").strip().lower()


def fix_text(value: str) -> str:
    replacements = {
        "": "Š", "": "š", "": "ž", "": "Ž", "": "ć", "": "Ć",
        "ð": "đ", "Ð": "Đ", "": "",
    }
    for src, dst in replacements.items():
        value = value.replace(src, dst)
    return value.strip()


def parse_money(raw: str | None) -> float | None:
    if not raw or not raw.strip():
        return None
    value = raw.strip().replace(" ", "").replace(",", ".")
    try:
        return float(value)
    except ValueError:
        return None


def parse_rows(path: Path) -> dict[str, dict]:
    profiles: dict[str, dict] = {}

    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        header = next(reader, None)
        if not header:
            return profiles

        for row in reader:
            if len(row) < 10:
                row.extend([""] * (10 - len(row)))

            email = normalize_email(row[4])
            if not email or "@" not in email:
                continue

            display_name = fix_text(row[0] or "")
            username = fix_text(row[1] or "")
            first_seen = parse_dt(row[2])
            last_activity = parse_dt(row[3]) or first_seen
            order_count = int(row[5]) if (row[5] or "").strip().isdigit() else 0
            total_spent = parse_money(row[6])
            if total_spent is not None and (row[7] or "").strip().upper() in ("RS", "SRB", ""):
                # Standard export: col6 is country, not revenue.
                total_spent = 0.0
            else:
                total_spent = total_spent or 0.0
            country = normalize_country(row[6] if total_spent == 0 else row[7])
            city = fix_text((row[7] if total_spent == 0 else row[8]) or "") or None
            postal = fix_text((row[9] if total_spent == 0 else row[10]) or "") or None

            if not display_name:
                display_name = email

            current = {
                "email": email,
                "display_name": display_name,
                "first_seen": first_seen,
                "last_activity": last_activity,
                "order_count": order_count,
                "total_spent": total_spent,
                "country": country,
                "city": city,
                "postal": postal,
                "has_username": bool(username),
            }

            previous = profiles.get(email)
            if previous is None:
                profiles[email] = current
                continue

            if current["first_seen"] and (
                not previous["first_seen"] or current["first_seen"] < previous["first_seen"]
            ):
                previous["first_seen"] = current["first_seen"]

            if current["last_activity"] and (
                not previous["last_activity"] or current["last_activity"] > previous["last_activity"]
            ):
                previous["last_activity"] = current["last_activity"]

            if current["order_count"] > previous["order_count"]:
                previous["order_count"] = current["order_count"]

            if current["total_spent"] > previous["total_spent"]:
                previous["total_spent"] = current["total_spent"]

            if len(current["display_name"]) > len(previous["display_name"]) and "@" not in current["display_name"]:
                previous["display_name"] = current["display_name"]

            for field in ("city", "postal", "country"):
                if current[field] and not previous[field]:
                    previous[field] = current[field]

            if current["has_username"]:
                previous["has_username"] = True

    return profiles


def to_sql_timestamp(dt: datetime | None) -> str:
    if dt is None:
        return "NOW()"
    return f"'{dt.isoformat().replace('+00:00', 'Z')}'"


def build_sql(profiles: dict[str, dict]) -> str:
    admin_email = "filipdantonijevic@gmail.com"
    lines = ["BEGIN;"]

    for email, profile in sorted(profiles.items(), key=lambda item: item[1]["first_seen"] or datetime.min.replace(tzinfo=timezone.utc)):
        if email == admin_email:
            continue

        city_sql = f"'{sql_escape(profile['city'])}'" if profile["city"] else "NULL"
        postal_sql = f"'{sql_escape(profile['postal'])}'" if profile["postal"] else "NULL"
        lines.append(
            "INSERT INTO \"CustomerProfiles\" (\"Email\", \"DisplayName\", \"City\", \"PostalCode\", \"Country\", \"FirstSeenAt\", \"LastActivityAt\", \"ImportedOrderCount\", \"ImportedTotalSpent\") "
            f"VALUES ('{sql_escape(profile['email'])}', '{sql_escape(profile['display_name'])}', {city_sql}, {postal_sql}, "
            f"'{sql_escape(profile['country'])}', {to_sql_timestamp(profile['first_seen'])}, {to_sql_timestamp(profile['last_activity'])}, "
            f"{profile['order_count']}, {profile['total_spent']:.2f}) "
            "ON CONFLICT (\"Email\") DO UPDATE SET "
            "\"DisplayName\" = EXCLUDED.\"DisplayName\", "
            "\"City\" = COALESCE(EXCLUDED.\"City\", \"CustomerProfiles\".\"City\"), "
            "\"PostalCode\" = COALESCE(EXCLUDED.\"PostalCode\", \"CustomerProfiles\".\"PostalCode\"), "
            "\"Country\" = EXCLUDED.\"Country\", "
            "\"FirstSeenAt\" = LEAST(\"CustomerProfiles\".\"FirstSeenAt\", EXCLUDED.\"FirstSeenAt\"), "
            "\"LastActivityAt\" = GREATEST(\"CustomerProfiles\".\"LastActivityAt\", EXCLUDED.\"LastActivityAt\"), "
            "\"ImportedOrderCount\" = EXCLUDED.\"ImportedOrderCount\", "
            "\"ImportedTotalSpent\" = EXCLUDED.\"ImportedTotalSpent\";"
        )

    lines.append("COMMIT;")
    return "\n".join(lines)


def main() -> None:
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV
    if not csv_path.exists():
        raise SystemExit(f"CSV not found: {csv_path}")

    profiles = parse_rows(csv_path)
    print(f"Parsed {len(profiles)} unique customer emails from {csv_path.name}")
    run_sql(build_sql(profiles))
    print("Import complete.")


if __name__ == "__main__":
    main()
