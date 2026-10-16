import { useSearchParams } from "react-router-dom";
import { InvoiceFilters } from "../features/billing/components/invoice-filters";

// The deliberate OK: the route owns the URL, so it may write it.
export function InvoicesRoute() {
  const [, setSearchParams] = useSearchParams();
  return <InvoiceFilters onReset={() => setSearchParams({})} />;
}
