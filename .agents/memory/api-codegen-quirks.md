---
name: Generated API codegen quirks
description: Avoid two TypeScript issues seen with the workspace's Orval-generated client and Zod schemas.
---

When OpenAPI generation derives an export name from an operation, avoid giving a referenced component that same operation-shaped name. For example, a `CreateOrder` response component named `CreateOrderResponse` can collide with the operation-generated export; use a domain-shaped name such as `OrderBatch`.

The generated fetch client may use `Headers.entries()`. Its TypeScript library set must include `DOM.Iterable`, or `typecheck:libs` fails even though Orval generation itself succeeds.

**Why:** Orval can finish generation successfully while the chained TypeScript check fails on generated output; naming and standard-library issues are not obvious from the API contract alone.

**How to apply:** If codegen fails in the post-generation typecheck, inspect both the generated export names and the client package's TypeScript `lib` before changing runtime code.
