---
name: Vite artifact build environment
description: Why artifact Vite configs need build-time defaults for runtime environment variables.
---

Vite evaluates its config during both development-server startup and production builds. Workspace builds do not necessarily receive workflow-injected `PORT` or `BASE_PATH`; provide defaults matching the artifact's configured local port and preview path, while still honoring workflow values when present.

**Why:** A missing runtime-only environment variable can prevent the repository-wide build from reaching the product app, even when development preview works.

**How to apply:** When changing an artifact's Vite config, compare fallback values with `.replit-artifact/artifact.toml` and run the root build without workflow environment variables.
