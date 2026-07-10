---
status: open
---

# Billing Platform Modernization

## Outcome

Move billing ingestion to an event-driven boundary without interrupting invoice
processing or weakening the audit trail.

## Next actions

- [ ] Approve the billing domain event contract 📅 2026-07-08
- [ ] Review the zero-downtime migration runbook 📅 2026-07-15

## Decision constraints

- Preserve idempotency across replay and recovery.
- Keep rollback ownership explicit for every migration stage.
