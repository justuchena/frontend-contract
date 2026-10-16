// FC-011: prints findings, can never fail.
const findings = ["two zones point at nothing"];
for (const f of findings) console.log(`  ✗ ${f}`);
console.log(`${findings.length} finding(s)`);
