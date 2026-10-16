import { useSearchParams } from "react-router-dom";

export function InvoiceFilters() {
  const [params, setSearchParams] = useSearchParams();
  // FC-004: a second owner for the URL, outside the route
  return <button onClick={() => setSearchParams({ status: "paid" })}>Paid</button>;
}
