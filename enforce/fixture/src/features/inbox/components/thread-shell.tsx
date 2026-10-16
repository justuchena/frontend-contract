import { Suspense } from "react";
import { ErrorBoundary } from "../../../shared/error-boundary";

// The deliberate OK: both non-ready states answered in the same place.
export function ThreadShell() {
  return (
    <ErrorBoundary fallback={<p>That thread did not load. Retry.</p>}>
      <Suspense fallback={<p>Loading</p>}><article /></Suspense>
    </ErrorBoundary>
  );
}
