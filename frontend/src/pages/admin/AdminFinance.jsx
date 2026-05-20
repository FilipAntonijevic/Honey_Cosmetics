import { useEffect, useMemo, useState } from 'react'
import api from '../../api'

const LEDGER_ENTRY_TYPE = { Income: 0, Expense: 1 }

const SOURCE_LABELS = {
  Manual: 'Ručni unos',
  StockPurchase: 'Nabavka',
  OrderDelivered: 'Porudžbina (dostavljeno)',
}

function signedAmount(entry) {
  return entry.entryType === 'Income' ? entry.amount : -entry.amount
}

function netAmount(entries) {
  return entries.reduce((s, e) => s + signedAmount(e), 0)
}

function dayKeyFromDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function monthLabel(year, monthIndex) {
  const d = new Date(year, monthIndex, 1)
  const name = d.toLocaleDateString('sr-RS', { month: 'long' })
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}.`
}

function dayLabel(dayKey) {
  const [y, m, d] = dayKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('sr-RS', { day: 'numeric', month: 'long', year: 'numeric' })
}

function buildTree(entries) {
  const byYear = new Map()
  for (const e of entries) {
    const d = new Date(e.occurredAt)
    const y = d.getFullYear()
    const m = d.getMonth()
    const dk = dayKeyFromDate(d)
    if (!byYear.has(y)) byYear.set(y, new Map())
    const byMonth = byYear.get(y)
    if (!byMonth.has(m)) byMonth.set(m, new Map())
    const byDay = byMonth.get(m)
    if (!byDay.has(dk)) byDay.set(dk, [])
    byDay.get(dk).push(e)
  }

  return [...byYear.keys()].sort((a, b) => b - a).map((year) => {
    const monthMap = byYear.get(year)
    const months = [...monthMap.keys()].sort((a, b) => b - a).map((month) => {
      const dayMap = monthMap.get(month)
      const days = [...dayMap.keys()].sort((a, b) => b.localeCompare(a)).map((dk) => {
        const txs = [...dayMap.get(dk)].sort(
          (a, b) => new Date(b.occurredAt) - new Date(a.occurredAt) || b.id - a.id,
        )
        return { dayKey: dk, entries: txs, net: netAmount(txs) }
      })
      const monthEntries = days.flatMap((d) => d.entries)
      return { month, label: monthLabel(year, month), days, net: netAmount(monthEntries) }
    })
    const yearEntries = months.flatMap((m) => m.days.flatMap((d) => d.entries))
    return { year, months, net: netAmount(yearEntries) }
  })
}

function txShortLabel(entry) {
  if (entry.source === 'StockPurchase' && entry.productName) return `Nabavka — ${entry.productName}`
  if (entry.source === 'StockPurchase') return 'Nabavka'
  if (entry.source === 'Manual') return entry.entryType === 'Income' ? 'Ručni prihod' : 'Ručni trošak'
  if (entry.source === 'OrderDelivered' && entry.entryType === 'Income') return 'Uplata korisnika (dostavljeno)'
  if (entry.source === 'OrderDelivered') return 'Porudžbina (stari zapis troška)'
  return entry.entryType === 'Income' ? 'Prihod' : 'Trošak'
}

function AmountCell({ value }) {
  if (value == null) return <span className="ledger-tree-row__amount-empty">—</span>
  const pos = value >= 0
  const fmt = (n) => Number(n).toLocaleString('sr-RS', { maximumFractionDigits: 0 })
  return (
    <span className={pos ? 'ledger-amt--in' : 'ledger-amt--out'}>
      {pos ? '+' : '−'} {fmt(Math.abs(value))} RSD
    </span>
  )
}

function TreeRow({
  depth,
  open,
  onToggle,
  label,
  amount,
  onClick,
  active,
  children,
  isLeaf,
}) {
  const expandable = !isLeaf || onToggle != null
  return (
    <>
      <div
        className={[
          'ledger-tree-row',
          `ledger-tree-row--depth-${depth}`,
          isLeaf ? 'ledger-tree-row--leaf' : '',
          expandable ? 'ledger-tree-row--expandable' : '',
          active ? 'ledger-tree-row--active' : '',
        ].filter(Boolean).join(' ')}
        onClick={onClick}
        onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        <span className="ledger-tree-row__indent" style={{ width: `${depth * 1.25}rem` }} />
        {expandable ? (
          <button
            type="button"
            className="ledger-tree-row__chevron"
            aria-expanded={open}
            onClick={(e) => { e.stopPropagation(); onToggle?.() }}
          >
            {open ? '▼' : '▶'}
          </button>
        ) : (
          <span className="ledger-tree-row__chevron ledger-tree-row__chevron--spacer" />
        )}
        <span className="ledger-tree-row__label">{label}</span>
        <span className="ledger-tree-row__amount"><AmountCell value={amount} /></span>
      </div>
      {open && children}
    </>
  )
}

function EntryDetailInline({ entry, fmt }) {
  const isIncome = entry.entryType === 'Income'
  const isPurchase = entry.source === 'StockPurchase'

  return (
    <div className="ledger-detail-inline">
      <dl className="ledger-detail__dl">
        <dt>Datum i vreme</dt>
        <dd>{new Date(entry.occurredAt).toLocaleString('sr-RS')}</dd>
        <dt>Tip</dt>
        <dd>{isIncome ? 'Prihod' : 'Trošak'}</dd>
        <dt>Iznos</dt>
        <dd className={isIncome ? 'ledger-amt--in' : 'ledger-amt--out'}>
          {isIncome ? '+' : '−'} {fmt(entry.amount)} RSD
        </dd>
        <dt>Izvor</dt>
        <dd>{SOURCE_LABELS[entry.source] ?? entry.source}</dd>
        <dt>Opis</dt>
        <dd>{entry.description}</dd>
        {entry.orderId != null && (
          <>
            <dt>Porudžbina</dt>
            <dd>#{entry.orderId}</dd>
          </>
        )}
        {isPurchase && entry.purchaseQuantity != null && (
          <>
            <dt>Proizvod</dt>
            <dd>{entry.productName ?? '—'}</dd>
            <dt>Količina</dt>
            <dd>{entry.purchaseQuantity} kom</dd>
            <dt>Cena proizvoda (po komadu)</dt>
            <dd>{fmt(entry.purchaseUnitCost ?? 0)} RSD</dd>
            <dt>Ukupna cena proizvoda</dt>
            <dd>{fmt(entry.purchaseMerchandiseTotal ?? 0)} RSD</dd>
            <dt>Transport / carina</dt>
            <dd>{fmt(entry.purchaseTransportCost ?? 0)} RSD</dd>
            <dt>Ukupan trošak nabavke</dt>
            <dd><strong>{fmt(entry.purchaseTotalCost ?? entry.amount)} RSD</strong></dd>
            {entry.purchaseNote && (
              <>
                <dt>Napomena</dt>
                <dd>{entry.purchaseNote}</dd>
              </>
            )}
          </>
        )}
      </dl>
    </div>
  )
}

function TransactionRow({ entry, depth, expanded, toggle, fmt }) {
  const txKey = `tx:${entry.id}`
  const open = expanded.has(txKey)

  return (
    <TreeRow
      depth={depth}
      open={open}
      onToggle={() => toggle(txKey)}
      onClick={() => toggle(txKey)}
      active={open}
      label={(
        <>
          <span className="ledger-tree-row__time">
            {new Date(entry.occurredAt).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {txShortLabel(entry)}
        </>
      )}
      amount={signedAmount(entry)}
    >
      <EntryDetailInline entry={entry} fmt={fmt} />
    </TreeRow>
  )
}

export default function AdminFinance() {
  const [entries, setEntries] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showManual, setShowManual] = useState(false)
  const [manual, setManual] = useState({ entryType: 'Income', amount: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [expanded, setExpanded] = useState(new Set())

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/admin/finance/ledger'),
      api.get('/admin/finance/ledger/summary'),
    ])
      .then(([e, s]) => {
        setEntries(e.data)
        setSummary(s.data)
        const now = new Date()
        const y = now.getFullYear()
        const m = now.getMonth()
        const dk = dayKeyFromDate(now)
        setExpanded(new Set([`y:${y}`, `y:${y}:m:${m}`, `y:${y}:m:${m}:d:${dk}`]))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const tree = useMemo(() => buildTree(entries), [entries])

  const toggle = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const submitManual = async (e) => {
    e.preventDefault()
    setFormError('')
    const amount = parseFloat(manual.amount)
    const description = manual.description.trim()
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Unesite ispravan iznos.')
      return
    }
    if (!description) {
      setFormError('Opis je obavezan.')
      return
    }
    setSaving(true)
    try {
      await api.post('/admin/finance/ledger', {
        entryType: LEDGER_ENTRY_TYPE[manual.entryType] ?? 0,
        amount,
        description,
      })
      setShowManual(false)
      setManual({ entryType: 'Income', amount: '', description: '' })
      load()
    } catch (err) {
      const d = err.response?.data
      const msg = typeof d === 'string'
        ? d
        : d?.title ?? d?.errors
          ? Object.values(d.errors).flat().join(' ')
          : 'Unos nije sačuvan.'
      setFormError(msg)
    } finally {
      setSaving(false)
    }
  }

  const fmt = (n) => Number(n).toLocaleString('sr-RS', { maximumFractionDigits: 0 })

  return (
    <div className="adm-page adm-page--ledger">
      <div className="adm-page-header adm-page-header--ledger">
        <div>
          <h1 className="adm-page-title">Prihodi i troškovi</h1>
          {summary && (
            <p className="adm-page-sub adm-finance-summary">
              <span className="adm-finance-summary__item">
                Prihod: <strong>{fmt(summary.totalIncome)} RSD</strong>
              </span>
              {' · '}
              <span className="adm-finance-summary__item">
                Trošak: <strong>{fmt(summary.totalExpense)} RSD</strong>
              </span>
              {' · '}
              <span className="adm-finance-summary__item">
                Bilans:{' '}
                <strong className={summary.balance >= 0 ? 'adm-finance-balance--pos' : 'adm-finance-balance--neg'}>
                  {summary.balance >= 0 ? '+' : '−'} {fmt(Math.abs(summary.balance))} RSD
                </strong>
              </span>
            </p>
          )}
        </div>
        <button type="button" className="adm-btn adm-btn-primary" onClick={() => { setFormError(''); setShowManual(true) }}>
          + Ručni unos
        </button>
      </div>

      <p className="adm-field-hint adm-page-hint--ledger">
        Proširite godinu → mesec → dan. Klik na transakciju prikazuje detalje.
      </p>

      <div className="ledger-tree-wrap">
        {loading ? (
          <div className="adm-loading-cell">Učitavanje…</div>
        ) : tree.length === 0 ? (
          <div className="adm-loading-cell">Nema stavki.</div>
        ) : (
          <div className="ledger-tree">
            <div className="ledger-tree-head">
              <span className="ledger-tree-head__label">Period / transakcija</span>
              <span className="ledger-tree-head__amount">Iznos (neto)</span>
            </div>
            {tree.map((yearNode) => {
              const yKey = `y:${yearNode.year}`
              const yOpen = expanded.has(yKey)
              return (
                <TreeRow
                  key={yKey}
                  depth={0}
                  open={yOpen}
                  onToggle={() => toggle(yKey)}
                  label={String(yearNode.year)}
                  amount={yearNode.net}
                  onClick={() => toggle(yKey)}
                >
                  {yearNode.months.map((monthNode) => {
                    const mKey = `${yKey}:m:${monthNode.month}`
                    const mOpen = expanded.has(mKey)
                    return (
                      <TreeRow
                        key={mKey}
                        depth={1}
                        open={mOpen}
                        onToggle={() => toggle(mKey)}
                        label={monthNode.label}
                        amount={monthNode.net}
                        onClick={() => toggle(mKey)}
                      >
                        {monthNode.days.map((dayNode) => {
                          const dKey = `${mKey}:d:${dayNode.dayKey}`
                          const dOpen = expanded.has(dKey)
                          return (
                            <TreeRow
                              key={dKey}
                              depth={2}
                              open={dOpen}
                              onToggle={() => toggle(dKey)}
                              label={dayLabel(dayNode.dayKey)}
                              amount={dayNode.net}
                              onClick={() => toggle(dKey)}
                            >
                              {dayNode.entries.map((entry) => (
                                <TransactionRow
                                  key={entry.id}
                                  entry={entry}
                                  depth={3}
                                  expanded={expanded}
                                  toggle={toggle}
                                  fmt={fmt}
                                />
                              ))}
                            </TreeRow>
                          )
                        })}
                      </TreeRow>
                    )
                  })}
                </TreeRow>
              )
            })}
          </div>
        )}
      </div>

      {showManual && (
        <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowManual(false)}>
          <div className="adm-modal" role="dialog">
            <h2>Ručni unos</h2>
            <p className="adm-field-hint" style={{ padding: '0 1.6rem' }}>
              Unos se automatski evidentira za današnji dan (najnoviji u listi).
            </p>
            <form onSubmit={submitManual} className="adm-form">
              {formError && <div className="adm-form-error">{formError}</div>}
              <div className="adm-form-row">
                <label>Tip</label>
                <select className="adm-input" value={manual.entryType}
                  onChange={(e) => setManual((m) => ({ ...m, entryType: e.target.value }))}>
                  <option value="Income">Prihod (+)</option>
                  <option value="Expense">Trošak (−)</option>
                </select>
              </div>
              <div className="adm-form-row">
                <label>Iznos (RSD)</label>
                <input className="adm-input" type="number" min="0.01" step="0.01" required value={manual.amount}
                  onChange={(e) => setManual((m) => ({ ...m, amount: e.target.value }))} />
              </div>
              <div className="adm-form-row">
                <label>Opis</label>
                <input className="adm-input" required value={manual.description}
                  onChange={(e) => setManual((m) => ({ ...m, description: e.target.value }))} />
              </div>
              <div className="adm-modal-footer">
                <button type="button" className="adm-btn" onClick={() => setShowManual(false)}>Odustani</button>
                <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>Sačuvaj</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
