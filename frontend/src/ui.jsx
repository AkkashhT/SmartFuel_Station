import { useState } from 'react'
import { lit } from './api.js'

export function fuelColor(f) {
  const n = (f?.name || '').toLowerCase()
  if (/diesel/.test(n)) return '#2f80ed'
  if (/premium|power|xp|speed|98|95/.test(n)) return '#7c5cff'
  if (/petrol|gasoline|regular|unleaded/.test(n)) return '#ff8c1a'
  if (/cng|lpg|gas/.test(n)) return '#12b5a6'
  return ['#ff8c1a', '#2f80ed', '#7c5cff', '#12b5a6', '#ff4d6d'][(f?.id ?? 0) % 5]
}

export const Card = ({ title, icon, action, children, className = '' }) =>
  <section className={'card ' + className}>
    {(title || action) && <div className="card-h"><h3>{icon && <span className="ico">{icon}</span>}{title}</h3>{action}</div>}
    {children}
  </section>

export const Stat = ({ label, value, sub, icon, tone }) =>
  <div className={'stat ' + tone}>
    <div className="stat-ico">{icon}</div>
    <div><div className="stat-l">{label}</div><div className="stat-v">{value}</div>{sub && <div className="stat-s">{sub}</div>}</div>
  </div>

export const Pill = ({ s, children }) => <span className={'pill ' + s}>{children ?? s}</span>
export const Empty = ({ icon = '✨', children }) => <div className="empty"><span>{icon}</span>{children}</div>

export function TankRing({ t, fuel, color, onClick, active }) {
  const p = Math.max(0, Math.min(100, Math.round(t.stock / t.capacity * 100)))
  return <button type="button" className={`tank ${t.status} ${active ? 'active' : ''} ${onClick ? 'click' : ''}`} onClick={onClick}>
    <div className="ring" style={{ '--p': p + '%' }}><span>{p}%</span></div>
    <div className="tank-info">
      <div className="tank-name"><i className="dot" style={{ background: color }} />{fuel}</div>
      <small>{t.name}</small>
      <div className="tank-lit">{lit(t.stock)} <small>of {lit(t.capacity)}</small></div>
      <Pill s={t.status} />
    </div>
  </button>
}

export function Toasts({ items, dismiss }) {
  return <div className="toasts" role="status" aria-live="polite">
    {items.map(t => <div key={t.id} className={'toast ' + (t.ok ? 'ok' : 'bad')} onClick={() => dismiss(t.id)}><span>{t.ok ? '✔' : '✖'}</span>{t.t}</div>)}
  </div>
}

export function Form({ title, icon, fields, run, btn, note }) {
  const [v, setV] = useState({}), [busy, setBusy] = useState(false)
  const set = k => e => setV(s => ({ ...s, [k]: e.target.value }))
  const n = note && note(v)
  return <Card title={title} icon={icon}>
    <form onSubmit={async e => { e.preventDefault(); setBusy(true); const ok = await run(v); setBusy(false); if (ok) setV({}) }}>
      {fields.map(f => <label key={f.k} className="fld">
        <span>{f.label}{f.opt && <em> optional</em>}</span>
        {f.options
          ? <select value={v[f.k] ?? ''} onChange={set(f.k)} required={!f.opt}><option value="">{f.ph}</option>{f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
          : <input placeholder={f.ph} type={f.type || 'text'} step="any" inputMode={f.type === 'number' ? 'decimal' : undefined} value={v[f.k] ?? ''} onChange={set(f.k)} required={!f.opt} />}
      </label>)}
      {n && <div className="note">{n}</div>}
      <button className="btn primary block" disabled={busy}>{busy ? 'Please wait…' : btn}</button>
    </form>
  </Card>
}
