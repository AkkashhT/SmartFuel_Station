import { useEffect, useState } from 'react'
import { AreaChart, Area, CartesianGrid, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { get, post, inr, lit, when, downloadCsv, printReceipt } from './api.js'
import { Card, Stat, Pill, Empty, TankRing, Form } from './ui.jsx'

const PAY = [{ v: 'CASH', i: '💵' }, { v: 'UPI', i: '📱' }, { v: 'CARD', i: '💳' }, { v: 'CREDIT', i: '🧾' }]
const PAYCOL = { CASH: '#22b573', UPI: '#7c5cff', CARD: '#2f80ed', CREDIT: '#f5a524' }

/* ───────────── HOME ───────────── */
export function Home(c) {
  const { d, me, sh, go, mg, run, tk, fn } = c
  const open = sh.find(x => x.status === 'OPEN')
  const h = new Date().getHours(), hello = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  return <>
    <div className="hero">
      <div><h1>{hello}, {me.username} 👋</h1><p>Here's how the station is doing right now.</p></div>
      <div className="hero-actions">
        {me.role !== 'AUDITOR' && <button className="btn light" onClick={() => go('sales')}>⛽ New sale</button>}
        {mg && <button className="btn ghost" onClick={() => go('tanks')}>🚚 Record delivery</button>}
      </div>
    </div>
    <div className={'shift-banner ' + (open ? 'on' : 'off')}>
      <span className="live-dot" />{open ? <><b>{open.name} shift is open</b> · started {when(open.openedAt)}</> : <><b>No shift is open.</b> {mg ? 'Open one to start recording sales.' : 'Ask a manager to open a shift before selling.'}</>}
      {mg && <button className="btn sm" onClick={() => go('shifts')}>{open ? 'Manage' : 'Open shift'}</button>}
    </div>
    <div className="stats">
      <Stat tone="orange" icon="💰" label="Revenue today" value={inr(d.revenue)} />
      <Stat tone="blue" icon="⛽" label="Fuel sold" value={lit(d.litres)} />
      <Stat tone="violet" icon="🧾" label="Transactions" value={d.transactions} />
      <Stat tone={d.alerts.length ? 'rose' : 'green'} icon={d.alerts.length ? '🔔' : '✅'} label="Open alerts" value={d.alerts.length} sub={d.alerts.length ? 'Needs attention' : 'All clear'} />
    </div>
    <div className="cols">
      <Card title="Tank levels" icon="🛢️" action={<button className="link" onClick={() => go('tanks')}>Details →</button>}>
        <div className="tank-grid">{d.tanks.map(t => <TankRing key={t.id} t={t} fuel={fn[t.fuelId]} color={c.colorOf(t.fuelId)} onClick={() => go('tanks')} />)}</div>
      </Card>
      <div className="stack">
        <Card title="Alerts" icon="🔔">
          {d.alerts.length ? d.alerts.map(a => <div key={a.id} className="row">
            <Pill s={a.alertLevel} />
            <div className="grow"><b>{tk(a.tankId)?.name || 'Tank ' + a.tankId}</b><small>{lit(a.stock)} left · {a.status.toLowerCase()}</small></div>
            {mg && a.status === 'OPEN' && <button className="btn sm" onClick={() => run(() => post(`/alerts/${a.id}/ack`, {}), 'Alert acknowledged')}>Ack</button>}
          </div>) : <Empty icon="🌿">No alerts. Every tank is healthy.</Empty>}
        </Card>
        <Card title="Today's prices" icon="🏷️">
          <div className="prices">{d.fuels.map(f => <div key={f.id} className="price" style={{ '--c': c.colorOf(f.id) }}><small>{f.name}</small><b>₹{f.price}</b><small>per litre</small></div>)}</div>
        </Card>
      </div>
    </div>
  </>
}

/* ───────────── SALES ───────────── */
function SaleForm({ c, setLast }) {
  const { d, cu, run, fn } = c
  const [tank, setTank] = useState(''), [mode, setMode] = useState('L'), [val, setVal] = useState(''), [pay, setPay] = useState('CASH')
  const [veh, setVeh] = useState(''), [cust, setCust] = useState(''), [busy, setBusy] = useState(false)
  const t = d.tanks.find(x => x.id == tank), f = t && d.fuels.find(x => x.id === t.fuelId)
  const price = f ? +f.price : 0, v = +val || 0
  const litres = mode === 'L' ? v : price ? v / price : 0, total = mode === 'L' ? v * price : v
  const over = t && litres > +t.stock, ready = t && litres > 0 && (pay !== 'CREDIT' || cust) && !over
  const quick = mode === 'L' ? [5, 10, 20, 30, 50] : [100, 200, 500, 1000, 2000]
  const submit = async e => {
    e.preventDefault(); if (!ready) return; setBusy(true)
    const ok = await run(() => post('/sales', { tankId: +tank, qty: +litres.toFixed(2), payMode: pay, vehicle: veh, customerId: cust ? +cust : null }).then(setLast), 'Sale recorded')
    setBusy(false); if (ok) { setVal(''); setVeh(''); setCust('') }
  }
  return <Card title="New sale" icon="⛽">
    <form onSubmit={submit}>
      <div className="step"><span>1</span>Choose fuel</div>
      <div className="pick">{d.tanks.map(x => { const ff = d.fuels.find(y => y.id === x.fuelId)
        return <button type="button" key={x.id} className={'pick-i ' + (tank == x.id ? 'on' : '')} style={{ '--c': c.colorOf(x.fuelId) }} onClick={() => setTank(x.id)}>
          <b>{fn[x.fuelId]}</b><span>₹{ff?.price}/L</span><small>{x.name} · {lit(x.stock)}</small></button> })}</div>
      <div className="step"><span>2</span>How much?</div>
      <div className="seg"><button type="button" className={mode === 'L' ? 'on' : ''} onClick={() => { setMode('L'); setVal('') }}>By litres</button><button type="button" className={mode === 'R' ? 'on' : ''} onClick={() => { setMode('R'); setVal('') }}>By amount ₹</button></div>
      <input className="big-in" type="number" step="any" min="0" inputMode="decimal" placeholder={mode === 'L' ? 'Litres' : 'Amount in ₹'} value={val} onChange={e => setVal(e.target.value)} />
      <div className="chips">{quick.map(q => <button type="button" key={q} className="chip" onClick={() => setVal(String(q))}>{mode === 'L' ? q + ' L' : '₹' + q}</button>)}</div>
      <div className="step"><span>3</span>Payment</div>
      <div className="pay">{PAY.map(p => <button type="button" key={p.v} className={pay === p.v ? 'on' : ''} style={{ '--c': PAYCOL[p.v] }} onClick={() => setPay(p.v)}><span>{p.i}</span>{p.v}</button>)}</div>
      {pay === 'CREDIT' && <label className="fld"><span>Customer (required for credit)</span>
        <select value={cust} onChange={e => setCust(e.target.value)}><option value="">Select customer…</option>{cu.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
      <label className="fld"><span>Vehicle number <em>optional</em></span><input placeholder="KA 01 AB 1234" value={veh} onChange={e => setVeh(e.target.value.toUpperCase())} /></label>
      <div className={'total ' + (over ? 'bad' : '')}>
        <div><small>{f ? `${litres.toFixed(2)} L × ₹${price}` : 'Select a fuel to see the total'}</small><b>{inr(total)}</b></div>
        {over && <small className="err">Only {lit(t.stock)} left in this tank</small>}
      </div>
      <button className="btn primary block lg" disabled={!ready || busy}>{busy ? 'Recording…' : 'Confirm sale'}</button>
    </form>
  </Card>
}

function SalesTable({ c }) {
  const { d, fn } = c
  const [pg, setPg] = useState(), [page, setPage] = useState(0), [sort, setSort] = useState('id'), [dir, setDir] = useState('desc')
  useEffect(() => { get(`/reports/sales/page?size=8&page=${page}&sort=${sort}&dir=${dir}`).then(setPg).catch(() => {}) }, [page, sort, dir, d])
  const th = (k, l) => <th className="sortable" onClick={() => { if (sort === k) setDir(dir === 'asc' ? 'desc' : 'asc'); else { setSort(k); setDir('desc') } }}>{l}{sort === k ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
  const pages = pg ? Math.max(1, Math.ceil(pg.total / pg.size)) : 1
  return <Card title="Sales history" icon="🧾" action={<div className="btns"><button className="btn sm" onClick={downloadCsv}>⬇ CSV</button><button className="btn sm dark" onClick={() => window.print()}>🖨 Print / PDF</button></div>}>
    {!pg ? <div className="skel" style={{ height: 160 }} /> : !pg.items.length ? <Empty icon="🧾">No sales yet.</Empty> : <>
      <table className="tbl"><thead><tr>{th('id', 'Invoice')}{th('time', 'Time')}<th>Fuel</th>{th('qty', 'Litres')}{th('total', 'Total')}<th>Pay</th></tr></thead>
        <tbody>{pg.items.map(s => <tr key={s.id}><td data-l="Invoice"><b>{s.invoice}</b></td><td data-l="Time">{when(s.ts)}</td><td data-l="Fuel">{fn[s.fuelId]}</td><td data-l="Litres">{s.qty}</td><td data-l="Total"><b>{inr(s.total)}</b></td><td data-l="Pay"><span className="pay-tag" style={{ '--c': PAYCOL[s.payMode] }}>{s.payMode}</span></td></tr>)}</tbody></table>
      <div className="pager"><button className="btn sm" disabled={page === 0} onClick={() => setPage(page - 1)}>← Prev</button><span>Page {page + 1} of {pages}</span><button className="btn sm" disabled={(page + 1) * pg.size >= pg.total} onClick={() => setPage(page + 1)}>Next →</button></div></>}
  </Card>
}

export function Sales(c) {
  const [last, setLast] = useState()
  const { me, d, fn, canRep } = c
  return <>
    <PageHead t="Sales" s="Record a fuel sale in three quick steps." />
    <div className="cols">
      {me.role !== 'AUDITOR' ? <SaleForm c={c} setLast={setLast} /> : <Card title="Read-only access" icon="🔍"><Empty icon="🔍">Auditors can review sales but not create them.</Empty></Card>}
      <div className="stack">
        {last && <Card title="Last sale" icon="✅" className="success">
          <div className="receipt"><small>{last.invoice}</small><b>{inr(last.total)}</b><span>{last.qty} L of {fn[last.fuelId]} · {last.payMode}</span></div>
          <button className="btn primary block" onClick={() => printReceipt(last, fn[last.fuelId])}>🖨 Print receipt</button></Card>}
        <div className="stats two">
          <Stat tone="orange" icon="💰" label="Revenue today" value={inr(d.revenue)} />
          <Stat tone="violet" icon="🧾" label="Transactions" value={d.transactions} />
        </div>
      </div>
    </div>
    {canRep && <SalesTable c={c} />}
  </>
}

/* ───────────── TANKS ───────────── */
export function Tanks(c) {
  const { d, mg, run, fn, tk } = c
  const [sel, setSel] = useState(d.tanks[0]?.id), [led, setLed] = useState([])
  useEffect(() => { if (sel) get(`/tanks/${sel}/ledger`).then(setLed).catch(() => {}) }, [sel, d])
  const t = tk(sel), col = t ? c.colorOf(t.fuelId) : '#ff8c1a'
  const tOpt = d.tanks.map(x => ({ v: x.id, l: `${x.name} · ${fn[x.fuelId]}` })), fOpt = d.fuels.map(f => ({ v: f.id, l: `${f.name} (now ₹${f.price})` }))
  return <>
    <PageHead t="Tanks & inventory" s="Tap a tank to see its stock trend and ledger." />
    <Card><div className="tank-grid">{d.tanks.map(x => <TankRing key={x.id} t={x} fuel={fn[x.fuelId]} color={c.colorOf(x.fuelId)} active={sel === x.id} onClick={() => setSel(x.id)} />)}</div></Card>
    {t && <Card title={`${t.name} · ${fn[t.fuelId]} — stock trend`} icon="📉">
      {led.length ? <>
        <ResponsiveContainer width="100%" height={220}><AreaChart data={[...led].reverse().map((m, i) => ({ i: i + 1, stock: +m.balanceAfter }))}>
          <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={col} stopOpacity=".5" /><stop offset="100%" stopColor={col} stopOpacity=".02" /></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" /><XAxis dataKey="i" hide /><YAxis width={55} tick={{ fill: 'var(--muted)', fontSize: 12 }} /><Tooltip formatter={v => [lit(v), 'Stock']} labelFormatter={() => ''} />
          <Area dataKey="stock" stroke={col} strokeWidth={3} fill="url(#g1)" /></AreaChart></ResponsiveContainer>
        <table className="tbl"><thead><tr><th>Type</th><th>Litres</th><th>Balance</th><th>Reference</th></tr></thead>
          <tbody>{led.slice(0, 8).map(m => <tr key={m.id}><td data-l="Type"><Pill s={m.type}>{m.type}</Pill></td><td data-l="Litres">{m.qty}</td><td data-l="Balance">{m.balanceAfter}</td><td data-l="Reference">{m.ref}</td></tr>)}</tbody></table></>
        : <Empty icon="📭">No movements recorded for this tank yet.</Empty>}
    </Card>}
    {mg && <div className="forms">
      <Form title="Fuel delivery" icon="🚚" btn="Record delivery" run={v => run(() => post('/deliveries', { tankId: +v.tank, note: v.note, qty: +v.qty }), 'Delivery recorded')}
        fields={[{ k: 'tank', label: 'Receiving tank', ph: 'Select tank…', options: tOpt }, { k: 'note', label: 'Delivery note #', ph: 'e.g. DN-1042' }, { k: 'qty', label: 'Litres received', ph: '0', type: 'number' }]}
        note={v => tk(v.tank) ? `Space available: ${lit(tk(v.tank).capacity - tk(v.tank).stock)}` : ''} />
      <Form title="Update fuel price" icon="🏷️" btn="Update price" run={v => run(() => post(`/fuels/${v.fuel}/price`, { price: +v.price, reason: v.reason }), 'Price updated')}
        fields={[{ k: 'fuel', label: 'Fuel', ph: 'Select fuel…', options: fOpt }, { k: 'price', label: 'New price (₹/L)', ph: '0.00', type: 'number' }, { k: 'reason', label: 'Reason', ph: 'e.g. Market revision', opt: 1 }]} />
      <Form title="Stock adjustment" icon="⚖️" btn="Apply adjustment" run={v => run(() => post(`/tanks/${v.tank}/adjust`, { qty: +v.qty, reason: v.reason }), 'Adjustment applied')}
        fields={[{ k: 'tank', label: 'Tank', ph: 'Select tank…', options: tOpt }, { k: 'qty', label: 'Litres (+ add / − remove)', ph: '-5', type: 'number' }, { k: 'reason', label: 'Reason', ph: 'Required for the audit trail' }]} />
    </div>}
  </>
}

/* ───────────── SHIFTS & CUSTOMERS ───────────── */
export function Shifts(c) {
  const { sh, cu, mg, me, run } = c
  const open = sh.find(x => x.status === 'OPEN'), closed = sh.find(x => x.status === 'CLOSED')
  const diff = n => n == null ? 'neutral' : +n === 0 ? 'good' : 'warn'
  return <>
    <PageHead t="Shifts & customers" s="Open and close shifts, and manage credit customers." />
    <div className="forms">
      {mg && (open
        ? <Form title={`Close shift: ${open.name}`} icon="🔒" btn="Close shift" run={v => run(() => post(`/shifts/${open.id}/close`, { actualCollection: +v.act, physicalStock: +v.phys, remarks: v.rem }), 'Shift closed')}
            fields={[{ k: 'act', label: 'Actual collection (₹)', ph: '0.00', type: 'number' }, { k: 'phys', label: 'Physical stock, all tanks (L)', ph: '0', type: 'number' }, { k: 'rem', label: 'Manager remarks', ph: 'Explain any variance', opt: 1 }]} />
        : <Form title="Open a shift" icon="🔓" btn="Open shift" run={v => run(() => post('/shifts/open', { name: v.name }), 'Shift opened')}
            fields={[{ k: 'name', label: 'Shift', ph: 'Select shift…', options: ['MORNING', 'EVENING', 'NIGHT'].map(x => ({ v: x, l: x[0] + x.slice(1).toLowerCase() })) }]} />)}
      {!mg && <Card title="Current shift" icon="🕒">{open ? <div className="row"><Pill s="NORMAL">OPEN</Pill><b>{open.name}</b></div> : <Empty icon="🌙">No shift is open right now.</Empty>}</Card>}
      <Card title="Last closed shift" icon="📒">
        {closed ? <div className="kv">
          <div><small>Shift</small><b>{closed.name}</b></div><div><small>Litres sold</small><b>{lit(closed.litresSold)}</b></div>
          <div><small>Expected</small><b>{inr(closed.expectedTotal)}</b></div><div><small>Actual</small><b>{inr(closed.actualCollection)}</b></div>
          <div className={diff(closed.collectionDifference)}><small>Cash difference</small><b>{inr(closed.collectionDifference)}</b></div>
          <div className={diff(closed.stockVariance)}><small>Stock variance</small><b>{lit(closed.stockVariance)}</b></div></div>
          : <Empty icon="📒">No closed shifts yet.</Empty>}
      </Card>
    </div>
    <div className="forms">
      <Card title="Customers" icon="👥">
        {cu.length ? cu.map(x => <div key={x.id} className="row"><div className="avatar">{x.name[0]?.toUpperCase()}</div><div className="grow"><b>{x.name}</b><small>Credit limit {inr(x.creditLimit)}{x.outstanding ? ` · owes ${inr(x.outstanding)}` : ''}</small></div></div>) : <Empty icon="👥">No customers yet. Add one to allow credit sales.</Empty>}
      </Card>
      {me.role !== 'AUDITOR' && <Form title="Add customer" icon="➕" btn="Add customer" run={v => run(() => post('/customers', { name: v.name, creditLimit: +v.limit || 0 }), 'Customer added')}
        fields={[{ k: 'name', label: 'Name', ph: 'Customer or company' }, { k: 'limit', label: 'Credit limit (₹)', ph: '0', type: 'number', opt: 1 }]} />}
    </div>
  </>
}

/* ───────────── INSIGHTS ───────────── */
export function Insights(c) {
  const { ins, rep, canRep } = c
  const bars = rep ? Object.entries(rep.byFuelRevenue).map(([name, v]) => ({ name, revenue: +v })) : []
  const pie = rep ? Object.entries(rep.byPayment).map(([name, value]) => ({ name, value: +value })) : []
  const dl = n => n == null ? 'neutral' : n < 3 ? 'bad' : n < 7 ? 'warn' : 'good'
  return <>
    <PageHead t="Insights" s="Forecasts, sensor checks and unusual activity." />
    {canRep && <div className="forms">
      <Card title="Revenue by fuel" icon="📊"><ResponsiveContainer width="100%" height={250}><BarChart data={bars}><CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} /><XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 12 }} /><YAxis width={60} tick={{ fill: 'var(--muted)', fontSize: 12 }} /><Tooltip formatter={v => [inr(v), 'Revenue']} />
        <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>{bars.map((b, i) => <Cell key={i} fill={['#ff8c1a', '#2f80ed', '#7c5cff', '#12b5a6', '#ff4d6d'][i % 5]} />)}</Bar></BarChart></ResponsiveContainer></Card>
      <Card title="Payment mix" icon="🥧"><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>{pie.map(p => <Cell key={p.name} fill={PAYCOL[p.name] || '#999'} />)}</Pie><Tooltip formatter={v => inr(v)} /><Legend /></PieChart></ResponsiveContainer></Card>
    </div>}
    {!ins ? <div className="skel" style={{ height: 200 }} /> : <>
      <Card title="Forecast & reorder advice" icon="🔮">
        <table className="tbl"><thead><tr><th>Tank</th><th>Avg / day</th><th>Days left</th><th>Suggested order</th></tr></thead>
          <tbody>{ins.tanks.map(t => <tr key={t.tankId}><td data-l="Tank"><b>{t.name}</b></td><td data-l="Avg / day">{t.avgDailySales} L</td><td data-l="Days left"><span className={'tag ' + dl(t.daysRemaining)}>{t.daysRemaining ?? '—'}</span></td><td data-l="Suggested order"><b>{t.recommendedOrder} L</b></td></tr>)}</tbody></table>
      </Card>
      <div className="forms">
        <Card title="Sensor vs system" icon="📡" action={<span className="tag neutral">SIMULATED</span>}>
          <table className="tbl"><tbody>{ins.tanks.map(t => <tr key={t.tankId}><td data-l="Tank"><b>{t.name}</b></td><td data-l="Sensor">{t.sensorLitres} L</td><td data-l="Temp">{t.sensorTempC}°C</td><td data-l="Variance"><span className={'tag ' + (t.sensorAlert ? 'bad' : 'good')}>Δ {t.sensorVariance}</span></td></tr>)}</tbody></table></Card>
        <Card title="Anomaly flags" icon="🚩">
          {ins.anomalies.length ? ins.anomalies.map((a, i) => <div key={i} className="row"><Pill s="CRITICAL">{a.type}</Pill><div className="grow"><b>{a.invoice}</b><small>{a.detail}</small></div></div>) : <Empty icon="🛡️">Nothing unusual detected.</Empty>}</Card>
      </div></>}
  </>
}

/* ───────────── AUDIT ───────────── */
export function Audit({ au }) {
  return <>
    <PageHead t="Audit log" s="The latest activity across the system." />
    <Card>{au.length ? au.slice(0, 25).map(a => <div key={a.id} className="row"><div className="avatar sm">{a.actor?.[0]?.toUpperCase()}</div>
      <div className="grow"><b>{a.actor}</b> · {a.action}<small>{a.detail}</small></div><small className="when">{when(a.ts)}</small></div>) : <Empty icon="🧾">No audit entries yet.</Empty>}</Card>
  </>
}

export const PageHead = ({ t, s }) => <div className="page-head"><h1>{t}</h1><p>{s}</p></div>
