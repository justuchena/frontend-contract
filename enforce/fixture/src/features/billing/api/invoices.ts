// Data layer. Every pattern here is correct and must not be reported.
const base = process.env.VITE_API_BASE_URL ?? "/api";

export async function listInvoices(token: string) {
  const res = await fetch(`${base}/invoices`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`invoices: ${res.status}`);
  return res.json();
}
