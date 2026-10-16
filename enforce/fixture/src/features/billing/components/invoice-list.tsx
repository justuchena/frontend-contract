import { useEffect, useState } from "react";
// FC-006: reaches into another feature's internals
import { useThread } from "../../inbox/hooks/use-thread";
// the deliberate OK beside it: the feature's entry point
import { inboxLabel } from "../../inbox";

export function InvoiceList() {
  const [invoices, setInvoices] = useState([]);

  // FC-003 + FC-001 + FC-002
  useEffect(() => {
    fetch("/api/invoices", { headers: { Authorization: `Bearer ${localStorage.token}` } })
      .then((r) => r.json())
      .then(setInvoices);
  }, []);

  // FC-010: neither reports nor says what is lost
  try {
    useThread();
  } catch {
  }

  // the deliberate OK: a catch that says what it gives up
  try {
    useThread();
  } catch {
    // no thread yet on a cold mount; the list renders without the preview
  }

  // the deliberate OK: a catch that reports
  try {
    useThread();
  } catch (err) {
    console.error(err);
  }

  return <ul>{invoices.map((i: any) => <li key={i.id}>{inboxLabel}</li>)}</ul>;
}
