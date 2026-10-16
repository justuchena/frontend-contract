import { Suspense } from "react";

// FC-007: the pending case is handled and the failed case is not
export function ThreadPane() {
  return <Suspense fallback={<p>Loading</p>}><article /></Suspense>;
}
