import { useState } from 'react'

const DEMO = [
  { u: 'admin', i: '🛡️', d: 'Full access' }, { u: 'manager', i: '📋', d: 'Run the station' },
  { u: 'cashier', i: '💳', d: 'Sales & billing' }, { u: 'attendant', i: '⛽', d: 'Pump sales' }, { u: 'auditor', i: '🔍', d: 'Read-only' }]

export default function Login({ onOk }) {
  const [u, setU] = useState(''), [p, setP] = useState(''), [show, setShow] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const go = async e => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const r = await fetch('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) })
      if (!r.ok) { setErr('Invalid username or password'); return }
      const j = await r.json(); sessionStorage.setItem('token', j.token); onOk({ username: j.username, role: j.role })
    } catch { setErr('Cannot reach the server. Is the backend running?') } finally { setBusy(false) }
  }
  return <div className="login-wrap">
    <div className="login-hero">
      <div className="logo big">⛽</div>
      <h1><b>Smart</b>Fuel Station</h1>
      <p>Fuel retail operations &amp; inventory management — sales, tanks, shifts and insights in one place.</p>
      <ul><li>🛢️ Live tank levels &amp; low-stock alerts</li><li>💳 Fast, accurate sales billing</li><li>📈 Forecasts and reports at a glance</li></ul>
    </div>
    <form className="login-card" onSubmit={go}>
      <h2>Welcome back 👋</h2><p className="muted">Sign in to continue</p>
      <label className="fld"><span>Username</span><input autoFocus autoComplete="username" placeholder="e.g. manager" value={u} onChange={e => setU(e.target.value)} required /></label>
      <label className="fld"><span>Password</span>
        <div className="pw"><input autoComplete="current-password" placeholder="Your password" type={show ? 'text' : 'password'} value={p} onChange={e => setP(e.target.value)} required />
          <button type="button" className="eye" onClick={() => setShow(!show)} aria-label="Show or hide password">{show ? '🙈' : '👁️'}</button></div></label>
      {err && <div className="note bad">{err}</div>}
      <button className="btn primary block lg" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      <div className="demo"><span className="muted">Demo accounts — tap to fill</span>
        <div className="demo-grid">{DEMO.map(x => <button type="button" key={x.u} className="demo-chip" onClick={() => { setU(x.u); setP('Demo@123') }}><b>{x.i} {x.u}</b><small>{x.d}</small></button>)}</div></div>
    </form>
  </div>
}
