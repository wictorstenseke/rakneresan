# Errors

Log of encountered errors and conclusions.

<!-- Format:
## YYYY-MM-DD: <short title>
**Type**: deterministic | infrastructure
**Context**: what was happening
**Error**: what failed
**Conclusion**: (only for deterministic errors or confirmed patterns)
-->

## 2026-06-03: npm audit sandbox DNS block
**Type**: infrastructure
**Context**: Running security audit dependency advisory check.
**Error**: `npm audit --json` failed inside sandbox with `getaddrinfo ENOTFOUND registry.npmjs.org`.
**Conclusion**: Networked npm advisory checks require approved network access in this environment.
