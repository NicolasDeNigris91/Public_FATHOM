# Security Policy

## Supported Versions

Only the `main` branch receives security fixes. There are no long-lived
release branches; the latest commit on `main` is the only supported state.

| Version | Supported          |
| ------- | ------------------ |
| `main`  | :white_check_mark: |
| other   | :x:                |

## Reporting a Vulnerability

**Please do not report vulnerabilities via public GitHub issues, pull
requests, discussions, or social media.**

Email **nicolas.denigris91@icloud.com** with the subject line
`[SECURITY] Fathom: <short description>`.

Include:

- A description of the vulnerability and its impact.
- Reproduction steps (URL, page, payload, or minimal case).
- Affected commit SHA or tag.
- Your assessment of severity, if any.
- Whether you have shared the issue with anyone else.

If you prefer encrypted reports, request a PGP key in your first message.

## Response Timeline

- **Acknowledgement:** within 72 hours of report.
- **Initial assessment and severity classification:** within 7 days.
- **Fix or mitigation on `main`:** target 30 days for confirmed
  vulnerabilities; longer for issues that require coordinated disclosure
  with upstream dependencies or affected hosts.
- **Public disclosure:** after a fix has shipped on `main`, or after a
  90-day embargo from the report date — whichever comes first. Embargoes
  may be extended by mutual agreement when third parties are affected.

A GitHub Security Advisory is opened for every confirmed vulnerability
once the fix has shipped. CVE assignment is requested via GitHub for
issues that warrant one.

## Patch Release Policy

Fathom follows a rolling-release model on `main`:

- **Critical / High** severity: patched on `main` and announced in a
  pinned GitHub issue and the project changelog within the response
  window above.
- **Medium / Low** severity: patched on `main` and noted in the next
  routine commit message; no separate announcement.

Deployments from `main` are expected to update within 7 days of a
critical patch. Older deployment artifacts are not back-patched.

## Scope

In scope:

- Code in this repository (`apps/site`, `scripts/`, workflows).
- Configuration that ships with this repository.
- The deployed site at `fathom.nicolaspilegidenigris.dev`.

Out of scope:

- Third-party services linked from the framework content.
- Self-hosted deployments by other operators.
- Vulnerabilities in dependencies that are already publicly tracked
  upstream — please report those to the upstream project. We are happy
  to coordinate the fix on our side once an upstream advisory exists.

## Safe Harbor

Researchers acting in good faith — testing only their own accounts,
respecting privacy and rate limits, and avoiding service degradation —
will not be pursued under CFAA or equivalent laws by the project
maintainers. We credit researchers (with permission) in the release
notes once a fix ships.
