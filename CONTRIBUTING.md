# Contributing to Fathom

Fathom is a personal study framework, but the content is open to the wider
community. The contributions that move the project forward are:

- **Corrections.** Typos, broken links, factual errors in framework content,
  outdated references.
- **References.** Pointers to canonical books, papers, RFCs, talks, or
  codebases that fit an existing module's scope.
- **Site improvements.** UX, performance, or accessibility regressions in
  `apps/site`.

If you are reporting a security issue, do **not** open a public PR or issue;
follow [SECURITY.md](./SECURITY.md).

## Ground rules

- **Cite primary sources.** A correction or addition should point to a book,
  paper, RFC, or spec, not a Medium post.
- **Match the tone.** The framework is dense and direct. No padding, no
  motivational filler.
- **One topic per PR.** A typo fix and a content rewrite go in separate PRs.
- **Conventional commits.** `type(scope): summary`, lower-case, imperative.
  Match the existing log style.

## Local environment

For framework content (markdown), no setup is needed beyond a text editor.
Run the validator before pushing:

```bash
node scripts/validate-content.mjs
```

For the Next.js site:

```bash
cd apps/site
npm install
npm run dev          # http://localhost:3000
npm run lint
npm run typecheck
npm test
```

## Test bar

| Change touches             | Required                                                       |
| -------------------------- | -------------------------------------------------------------- |
| Framework markdown         | `node scripts/validate-content.mjs`                            |
| `apps/site` (Next.js code) | `npm run lint` + `npm run typecheck` + `npm test`              |
| Both                       | All of the above                                               |

CI runs the same checks on every PR.

## Style

- Markdown: ASCII hyphens (no em-dashes), 2-space indent in code blocks,
  fenced code blocks with explicit language tag.
- TypeScript: project ESLint + `tsc --noEmit` strict. No `any`.
- No AI-attribution trailers in commit messages.

## Signed commits

PRs are expected to ship with verified signatures. The fastest path is
SSH-signing with the same key you already push with:

```bash
# Tell git to sign with SSH and where your public key lives
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
git config --global tag.gpgsign true
```

Then add the same public key to GitHub as a **signing key** (separate from
your authentication key — GitHub treats them independently:
Settings → SSH and GPG keys → New SSH key → key type: signing).

Verify locally with `git log --show-signature -1`; verify on GitHub by
the green "Verified" badge next to the commit.

GPG signing is also accepted; see GitHub's docs for setup.

## Hooks

Activate the pre-commit hook once per clone — it runs the same checks
CI does, against your staged changes only:

```bash
git config core.hooksPath .githooks
```

## License

By submitting a PR, you agree that your contribution is licensed under the
same [CC BY-NC 4.0](./LICENSE) terms as the rest of the framework.
