@AGENTS.md

## Git workflow

- Commit and push directly to `main`. Don't create feature branches or pull requests unless asked.
- Run `npx tsc --noEmit` and `npx expo lint` before every push, since there's no PR review step to catch failures.
- Every push to `main` that touches app code queues an Android EAS build (`.github/workflows/eas-build.yml`), so group related changes into one push.
