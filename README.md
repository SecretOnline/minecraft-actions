# Minecraft Actions

> [!NOTE]
> This release was generated from [`73d7c267e4d1f01c6ab6d9f80439b5fe0888c3e9`](https://github.com/SecretOnline/minecraft-actions/commit/73d7c267e4d1f01c6ab6d9f80439b5fe0888c3e9).

A collection of GitHub actions for my projects.

> [!CAUTION]
> I **_strongly_** advise that you don't rely on these actions. I do not have any sort of versioning scheme or support policy for these.

## Development

Actions are written in TypeScript (`src/`) and bundled with [esbuild](https://esbuild.github.io/) into a `dist/index.js` per action, which is what each `action.yml`'s `runs.main` points at. `dist/` is not committed on `main` — it's built fresh in CI and in the release workflow.

```sh
npm ci
npm run build       # bundle src/* into each action's dist/index.js
npm run typecheck   # tsc --noEmit
npm test            # vitest unit tests
```

`setup-mod-gradle` remains a composite action (it calls third-party marketplace actions for Java/Gradle setup).

### Testing locally

- **[github/local-action](https://github.com/github/local-action)** — fastest inner loop for a single `node24` action. Runs `src/<action>/index.ts` directly (no build step) against a `.env` file of `INPUT_*` values. Only exercises one action at a time, not a full composite/workflow.
- **[nektos/act](https://github.com/nektos/act)** — runs actual workflows/composite actions in Docker against the real `action.yml` files. Needs `dist/` built first (`npm run build`), since `act` executes the `main` entry point directly like real GitHub Actions does. Use this to exercise `setup-mod-gradle` end-to-end, including its marketplace-action steps.
