# Cloud development environment

Use the existing `/workspace/SOBRIVIEW-3D` checkout. Each task is isolated; do not create a worktree unless explicitly requested.

Node.js 24 and `/usr/bin/chromium` were available in the onboarding instance. No backend services, API keys, patient data, PACS or external image downloads are required.

Reinstall using `bash scripts/cloud-install.sh` or `npm ci`. Installed dependencies and build outputs can be retained in an environment snapshot; running processes must be restarted.

From the checkout, start `npm run dev -- --host 127.0.0.1`. Check the printed port with an internal HTTP request, then run the browser tests to verify functional readiness. This document does not create a user-facing cloud preview.

Validation:

```sh
npm run lint
npm run test
npm run build
npm run test:e2e
E2E_PREVIEW=1 npm run test:e2e
```

The second browser command exercises the production bundle and requires an existing build. Playwright uses installed system Chromium when available; otherwise install its matching browser with `npx playwright install chromium`.

Package downloads use the environment's package-manager network preset. Git operations use the supplied HTTPS Git proxy. Creating a GitHub pull request additionally needs access to `api.github.com`; Git push access alone does not establish API access.

Saving the platform's reusable install/start configuration could not be confirmed because the onboarding configuration service returned `INVALID_ARGUMENT`. These checked-in instructions remain available independently of that service. They do not establish publication or restoration in a fresh task.
