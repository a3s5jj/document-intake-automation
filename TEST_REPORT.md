# Test Report

Public export checked: 2026-09-02

n8n target: 2.27.4

Test data: synthetic only

## Current result

`npm test` completed successfully against the files in this repository.

| Check | Result |
|---|---:|
| Structural and export checks | 687 passed |
| Fixture-driven transformations | 12 / 12 passed |
| Workflow exports inactive | 2 / 2 |
| Private credential or resource IDs found | 0 |

The validator also compiled every Code node and expression, checked graph
reachability and supported node versions, and verified the deterministic canvas
layouts.

Both renamed public exports were then imported into a blank, isolated n8n 2.27.4
profile. The 62-node Gmail workflow and 34-node Telegram workflow were accepted and
remained inactive. See
[`evidence/public_export_import_verification.json`](evidence/public_export_import_verification.json).

## Runtime evidence

The Gmail workflow's final isolated live verification was completed on 2026-08-31.
Five synthetic messages produced six message-label records and seven attachments.
The workflow was rerun over the same time window; email rows, attachment rows, and
Drive files remained at 6, 7, and 7.

The Telegram workflow was imported and exercised with synthetic fixtures. Telegram
and Gemini credentials were not supplied, so it remains `NOT_LIVE_TESTED`.

## Evidence boundary

- `evidence/sanitized_live_verification.json` records the Gmail observations.
- `evidence/offline_verification.json` records the deterministic suite.
- `evidence/n8n_import_verification.json` records schema acceptance and inactive state.
- `evidence/public_export_import_verification.json` records the fresh public-copy import.
No production inbox, receipt, account identifier, or credential is included.
