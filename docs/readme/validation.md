# Release validation

Date: 2026-10-14. Checks are executed in an isolated working checkout. Screenshots use local synthetic/demo data. A source implementation, a passing automated test and external-service acceptance are separate claims.

## Commands

```bash
npm test
npm run lint
npm run build
npm run publish:dry-run -- --draft draft-001
```

PASS: 30 tests, lint, build and draft-001 dry-run. Actual local account service health omitted mongoUri; configured Origin was accepted and an untrusted Origin returned 403. Node 26 tests used --no-experimental-webstorage. No live posting was performed. Hardware, external credentials, signing and production deployment are separate setup/acceptance steps.
