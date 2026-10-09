import { useCallback, useEffect, useState } from 'react'
import { get } from './api.js'
import { Toasts, fuelColor } from './ui.jsx'
import Login from './Login.jsx'
import { Home, Sales, Tanks, Shifts, Insights, Audit } from './pages.jsx'

const NAV = [
  { id: 'home', l: 'Home', i: '🏠' }, { id: 'sales', l: 'Sales', i: '⛽' }, { id: 'tanks', l: 'Tanks', i: '🛢️' },
  { id: 'shifts', l: 'Shifts', i: '🕒' }, { id: 'insights', l: 'Insights', i: '📈' }, { id: 'audit', l: 'Audit', i: '🧾', roles: ['ADMIN', 'AUDITOR'] }]
const PAGES = { home: Home, sales: Sales, tanks: Tanks, shifts: Shifts, insights: Insights, audit: Audit }

const saved = () => { try { return localStorage.getItem('theme') } catch { return null } }

function Shell({ me, theme, toggleTheme }) {
  const nav = NAV.filter(n => !n.roles || n.roles.includes(me.role))
  const [tab, setTab] = useState(() => nav.some(n => n.id === location.hash.slice(1)) ? location.hash.slice(1) : 'home')
  const [d, setD] = useState(), [ins, setIns] = useState(), [rep, setRep] = useState(), [cu, setCu] = useState([]), [sh, setSh] = useState([]), [au, setAu] = useState([])
  const [toasts, setToasts] = useState([]), [upd, setUpd] = useState()
  const mg = ['ADMIN', 'MANAGER'].includes(me.role), canRep = ['ADMIN', 'MANAGER', 'AUDITOR'].includes(me.role)

  const load = useCallback(() => {
    const ok = () => {}
    get('/dashboard').then(x => { setD(x); setUpd(new Date()) }).catch(ok)
    get('/insights').then(setIns).catch(ok); get('/customers').then(setCu).catch(ok); get('/shifts').then(setSh).catch(ok)
    if (['ADMIN', 'AUDITOR'].includes(me.role)) get('/audit').then(setAu).catch(ok)
    if (canRep) get('/reports/sales').then(setRep).catch(ok)
  }, [me.role, canRep])
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t) }, [load])

  const toast = (t, ok) => { const id = Date.now() + Math.random(); setToasts(s => [...s, { id, t, ok }]); setTimeout(() => setToasts(s => s.filter(x => x.id !== id)), 4500) }
  const run = async (fn, okMsg) => { try { const r = await fn(); toast(okMsg, true); load(); return r ?? true } catch (e) { toast(e.message, false); return false } }
  const go = t => { setTab(t); location.hash = t; window.scrollTo(0, 0) }
  const logout = () => { sessionStorage.clear(); location.reload() }

  const fuels = d?.fuels || [], fn = Object.fromEntries(fuels.map(f => [f.id, f.name]))
  const colorOf = id => fuelColor(fuels.find(f => f.id === id))
  const tk = id => d?.tanks.find(x => x.id == id)
  const ctx = { me, d, ins, rep, cu, sh, au, mg, canRep, run, go, fn, colorOf, tk, load }
  const Page = PAGES[tab] || Home

  return <div className="app">
    <aside className="side">
      <div className="brand"><span className="logo">⛽</span><div><b>Smart</b>Fuel<small>Station</small></div></div>
      <nav>{nav.map(n => <button key={n.id} className={tab === n.id ? 'on' : ''} onClick={() => go(n.id)}><span>{n.i}</span>{n.l}</button>)}</nav>
      <div className="side-foot">
        <div className="who"><div className="avatar">{me.username[0].toUpperCase()}</div><div><b>{me.username}</b><small>{me.role}</small></div></div>
        <div className="btns"><button className="btn sm ghost" onClick={toggleTheme}>{theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</button><button className="btn sm ghost" onClick={logout}>Logout</button></div>
      </div>
    </aside>
    <div className="main">
      <header className="top">
        <div className="brand m"><span className="logo">⛽</span><b>Smart</b>Fuel</div>
        <div className="live">{upd && <><span className="live-dot" />Live · {upd.toLocaleTimeString()}</>}</div>
        <div className="top-r"><button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">{theme === 'dark' ? '☀️' : '🌙'}</button><button className="icon-btn m" onClick={logout} aria-label="Logout">⎋</button></div>
      </header>
      <main className="content">
        {!d ? <div className="stats">{[0, 1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 92 }} />)}</div> : <Page {...ctx} />}
      </main>
    </div>
    <nav className="bottom">{nav.map(n => <button key={n.id} className={tab === n.id ? 'on' : ''} onClick={() => go(n.id)}><span>{n.i}</span>{n.l}</button>)}</nav>
    <Toasts items={toasts} dismiss={id => setToasts(s => s.filter(x => x.id !== id))} />
  </div>
}

export default function App() {
  const [me, setMe] = useState(), [ready, setReady] = useState(!sessionStorage.getItem('token'))
  const [theme, setTheme] = useState(() => saved() || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('theme', theme) } catch {} }, [theme])
  useEffect(() => { if (sessionStorage.getItem('token')) get('/me').then(setMe).catch(() => sessionStorage.clear()).finally(() => setReady(true)) }, [])
  if (!ready) return <div className="splash"><span className="logo big">⛽</span></div>
  return me ? <Shell me={me} theme={theme} toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} /> : <Login onOk={setMe} />
}
