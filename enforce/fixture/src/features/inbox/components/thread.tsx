import { useState } from "react";
// The deliberate OK: another feature, through its entry point.
import { billingLabel } from "../../billing";

// A view with no transport of its own. Nothing in this file is a finding.
// The copy below names an Authorization header and a Bearer token and holds a
// URL in a string: all of it is masked, none of it is reported. These are the
// assertions that matter, because any regex catches the violation and the hard
// part is leaving the deliberate pattern alone.
export function Thread() {
  const [open, setOpen] = useState(false);
  const help = "Paste your Authorization header, e.g. Bearer abc123";
  return <p onClick={() => setOpen(!open)}>{open ? help : "/api/threads"}</p>;
}
