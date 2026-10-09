const H = () => ({ Authorization: 'Bearer ' + (sessionStorage.getItem('token') || '') })
const expire = () => { sessionStorage.clear(); location.reload() }

export const get = async u => {
  const r = await fetch('/api/v1' + u, { headers: H() })
  if (r.status === 401) expire()
  if (!r.ok) throw new Error(r.status)
  return r.json()
}

export const post = async (u, b) => {
  const r = await fetch('/api/v1' + u, { method: 'POST', headers: { ...H(), 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
  const j = await r.json().catch(() => ({}))
  if (r.status === 401) expire()
  if (!r.ok) throw new Error(j.message || 'Something went wrong (' + r.status + ')')
  return j
}

export const downloadCsv = async () => {
  const r = await fetch('/api/v1/reports/sales.csv', { headers: H() })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(await r.blob())
  a.download = 'sales.csv'
  a.click()
}

export const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
export const lit = n => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 }) + ' L'
export const when = ts => (ts || '').slice(0, 16).replace('T', ' ')

export function printReceipt(s, fuel) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<title>${s.invoice}</title><body style="font-family:monospace;max-width:320px;margin:20px auto">
  <h2 style="margin:0">⛽ SmartFuel Station</h2><small>Academic prototype · demo receipt</small><hr>
  Invoice: ${s.invoice}<br>Date: ${(s.ts || '').slice(0, 19).replace('T', ' ')}<br>Fuel: ${fuel}<br>Qty: ${s.qty} L<br>
  Rate: ₹${s.unitPriceAtSale}/L<br><b>Total: ₹${s.total}</b><br>Payment: ${s.payMode}<br>Vehicle: ${s.vehicle || '-'}<br>
  Attendant: ${s.attendant}<hr>Thank you, drive safe!</body>`)
  w.document.close()
  w.print()
}
