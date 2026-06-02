# TokenFlow Checkpoints

This file tracks concrete TDD checkpoints. Each checkpoint should move through:

```text
red -> green -> refactor -> verified
```

## Completed

### Checkpoint 0: Workspace Scaffold

Status: verified

Completed:

- created pnpm workspace
- added TypeScript config
- added Vitest config
- created `@tokenflow/core`
- installed dependencies
- added root typecheck config

Verification:

```bash
pnpm test
pnpm typecheck
```

Result:

```text
2 test files passed
3 tests passed
typecheck passed
```

### Checkpoint 1: Health Function

Status: verified

Completed:

- wrote failing health test
- implemented `getHealth`

Files:

- `packages/core/src/health.test.ts`
- `packages/core/src/health.ts`

Behavior:

- returns package name and version

### Checkpoint 2: Initial OpenAI Request Normalization

Status: verified

Completed:

- wrote failing OpenAI-style normalization test
- wrote failing raw-prompt-retention-disabled test
- implemented minimal `normalizeRequest`

Files:

- `packages/core/src/normalize/normalize-request.test.ts`
- `packages/core/src/normalize/normalize-request.ts`

Behavior:

- normalizes OpenAI-style chat request
- preserves metadata
- preserves retention policy
- omits raw prompt text when raw prompt retention is disabled

### Checkpoint 3: Normalize Anthropic-Style Requests

Status: verified

Goal:

Support Anthropic-style messages input in the same internal normalized shape as OpenAI-style requests.

Why this is next:

- the architecture requires a provider-compatible gateway
- OpenAI and Anthropic are the first two provider shapes to normalize
- this keeps the work narrow before adding Zod validation, policy, or detectors

Completed:

- wrote failing Anthropic-style normalization test
- wrote failing Anthropic raw-prompt-retention-disabled test
- implemented minimal Anthropic normalization branch
- converted Anthropic `system` into a normalized `system` message
- reused raw-prompt omission behavior for Anthropic system and message content

Files:

```text
packages/core/src/normalize/normalize-request.test.ts
packages/core/src/normalize/normalize-request.ts
```

Verification:

```bash
pnpm test
pnpm typecheck
```

Result:

```text
2 test files passed
5 tests passed
typecheck passed
```

### Checkpoint 4: Malformed Request Validation

Status: verified

Goal:

Reject malformed request shapes with explicit validation errors.

Completed:

- wrote failing tests for unsupported provider and malformed request shapes
- added `NormalizeRequestError`
- added stable validation codes
- validated provider, metadata, retention, body, model, messages, message content, and Anthropic system prompt

Files:

```text
packages/core/src/normalize/normalize-request.test.ts
packages/core/src/normalize/normalize-request.ts
```

Verification:

```bash
pnpm test
pnpm typecheck
```

Result:

```text
2 test files passed
11 tests passed
typecheck passed
```

### Checkpoint 5: Safe Normalized Types

Status: verified

Goal:

Move inline normalizer types into stable exported type files and add a package entrypoint.

Why this is next:

- policy, routing, metering, API, CLI, and MCP modules will need shared normalized request types
- the normalizer currently hides useful types inside the implementation file
- exporting types now reduces coupling before detectors and policy are added

Completed:

- wrote failing package entrypoint tests
- wrote type-shape tests for normalized request types
- added `packages/core/src/index.ts`
- added `packages/core/src/normalize/types.ts`
- moved normalizer types out of `normalize-request.ts`
- exported public types with `export type`
- kept runtime normalizer behavior unchanged

Files:

```text
packages/core/src/index.test.ts
packages/core/src/index.ts
packages/core/src/normalize/types.test.ts
packages/core/src/normalize/types.ts
packages/core/src/normalize/normalize-request.ts
```

Verification:

```bash
pnpm test
pnpm typecheck
```

Result:

```text
4 test files passed
16 tests passed
typecheck passed
```

### Checkpoint 6: PII Detector Tests

Status: verified

Goal:

Start the detector package with failing tests for email, phone, SSN-like values, and redaction behavior.

Why this is next:

- normalization now produces stable shared types
- policy cannot be built until sensitive-data findings have a stable shape
- PII detection is a core requirement for enterprise and SMB adoption

Completed:

- created `@tokenflow/detectors`
- wrote failing tests for email, phone, SSN-like values, redaction, safe metadata, and clean text
- added shared PII finding and redaction result types
- implemented conservative regex-based detection
- implemented deterministic redaction tokens
- kept detector findings free of raw PII values

Files:

```text
packages/detectors/package.json
packages/detectors/tsconfig.json
packages/detectors/src/pii.test.ts
packages/detectors/src/pii.ts
```

Verification:

```bash
pnpm test
pnpm typecheck
```

Result:

```text
5 test files passed
22 tests passed
typecheck passed
```

### Checkpoint 7: Secrets Detector Tests

Status: verified

Goal:

Add failing tests for API-key-like strings, bearer tokens, and private-key blocks.

Completed:

- wrote failing tests for API-key-like strings, bearer tokens, private-key blocks, redaction, safe metadata, and clean text
- added shared secret finding and redaction result types
- implemented conservative regex-based detection
- implemented deterministic redaction tokens
- kept detector findings free of raw secret values

Files:

```text
packages/detectors/src/secrets.test.ts
packages/detectors/src/secrets.ts
```

Verification:

```bash
pnpm test
pnpm typecheck
```

Result:

```text
6 test files passed
28 tests passed
typecheck passed
```

## Next Slice

### Checkpoint 8: Detector Package Entrypoint

Status: verified

Goal:

Export PII and secrets detector APIs from a stable `@tokenflow/detectors` package entrypoint.

Completed:

- wrote failing package entrypoint tests
- exported PII detector functions
- exported secrets detector functions
- exported PII finding and redaction result types
- exported secrets finding and redaction result types

Files:

```text
packages/detectors/src/index.test.ts
packages/detectors/src/index.ts
```

Verification:

```bash
pnpm test
pnpm typecheck
```

Result:

```text
7 test files passed
32 tests passed
typecheck passed
```

### Checkpoint 9: Unified Sensitive Data Scanner

Status: verified

Goal:

Combine PII and secrets findings behind one scanner API for policy layers to consume.

Completed:

- wrote failing unified scanner tests
- tagged findings with `kind: "pii" | "secret"`
- merged PII and secrets findings in source order
- implemented deterministic redaction across mixed finding types
- kept scanner findings free of raw sensitive values
- exported scanner functions and types from `@tokenflow/detectors`

Files:

```text
packages/detectors/src/sensitive-data.test.ts
packages/detectors/src/sensitive-data.ts
packages/detectors/src/index.test.ts
packages/detectors/src/index.ts
```

Verification:

```bash
pnpm test
pnpm typecheck
```

Result:

```text
8 test files passed
39 tests passed
typecheck passed
```

### Checkpoint 10: Policy Decision Basics

Status: verified

Goal:

Add a first policy layer that can allow, warn, redact, or block based on unified sensitive-data findings.

Completed:

- wrote failing policy decision tests
- added structural policy finding types compatible with detector findings
- implemented `allow`, `warn`, `redact`, and `block` decisions
- added action precedence: block over redact, redact over warn, warn over allow
- added configurable default action for unmatched findings
- exported policy APIs and types from `@tokenflow/core`

Files:

```text
packages/core/src/policy/evaluate-policy.test.ts
packages/core/src/policy/evaluate-policy.ts
packages/core/src/index.test.ts
packages/core/src/index.ts
```

Verification:

```bash
pnpm test
pnpm typecheck
```

Result:

```text
9 test files passed
47 tests passed
typecheck passed
```

### Checkpoint 11: Request Policy Pipeline

Status: verified

Goal:

Apply sensitive-data scanning and policy evaluation to normalized request messages.

Completed:

- wrote failing request policy pipeline tests
- added `@tokenflow/core` dependency on `@tokenflow/detectors`
- added detector package entry metadata for package-level resolution
- scanned normalized message text with the unified sensitive-data scanner
- attached message index and role metadata to policy findings
- skipped raw-prompt-omitted placeholders
- applied policy action precedence across request messages
- returned a redacted normalized request when the final action is `redact`
- exported request policy APIs and types from `@tokenflow/core`

Files:

```text
packages/core/package.json
packages/core/src/policy/evaluate-request-policy.test.ts
packages/core/src/policy/evaluate-request-policy.ts
packages/core/src/index.test.ts
packages/core/src/index.ts
packages/detectors/package.json
pnpm-lock.yaml
```

Verification:

```bash
pnpm test
pnpm typecheck
```

Result:

```text
10 test files passed
55 tests passed
typecheck passed
```

### Checkpoint 12: Gateway Request Handler

Status: verified

Goal:

Normalize provider requests and evaluate request policy in one gateway-facing function.

Completed:

- wrote failing gateway handler tests
- added a transport-agnostic gateway handler
- normalized OpenAI-style and Anthropic-style provider bodies
- evaluated request policy in the same handler
- returned original upstream body for `allow` and `warn`
- returned redacted normalized request for `redact`
- blocked upstream forwarding for `block`
- exported gateway APIs and types from `@tokenflow/core`

Files:

```text
packages/core/src/gateway/handle-gateway-request.test.ts
packages/core/src/gateway/handle-gateway-request.ts
packages/core/src/index.test.ts
packages/core/src/index.ts
```

Verification:

```bash
pnpm test
pnpm typecheck
```

Result:

```text
11 test files passed
62 tests passed
typecheck passed
```

### Checkpoint 13: HTTP Gateway Adapter Tests

Status: verified

Goal:

Add the first transport adapter that turns HTTP-like request envelopes into gateway handler inputs.

Completed:

- wrote failing HTTP adapter tests
- added framework-neutral HTTP request and response envelope types
- mapped OpenAI chat completion routes to `provider: "openai"`
- mapped Anthropic messages routes to `provider: "anthropic"`
- populated metadata from `x-tokenflow-*` headers with config defaults
- returned 422 for unsupported routes
- returned 403 for policy blocks
- returned redacted normalized request bodies for redaction decisions
- exported HTTP adapter APIs and types from `@tokenflow/core`

Files:

```text
packages/core/src/gateway/http-adapter.test.ts
packages/core/src/gateway/http-adapter.ts
packages/core/src/index.test.ts
packages/core/src/index.ts
```

Verification:

```bash
pnpm test
pnpm typecheck
```

Result:

```text
12 test files passed
69 tests passed
typecheck passed
```

### Checkpoint 14: HTTP Adapter Validation Errors

Status: verified

Goal:

Return structured HTTP errors for malformed provider request bodies instead of leaking internal exceptions.

Completed:

- wrote failing malformed OpenAI request body test
- wrote failing malformed Anthropic request body test
- caught `NormalizeRequestError` inside the HTTP adapter
- returned structured `400 invalid_provider_request` responses
- preserved the normalizer validation code in `validationCode`
- continued rethrowing unknown internal errors

Files:

```text
packages/core/src/gateway/http-adapter.test.ts
packages/core/src/gateway/http-adapter.ts
```

Verification:

```bash
pnpm test
pnpm typecheck
```

Result:

```text
12 test files passed
71 tests passed
typecheck passed
```

### Checkpoint 15: HTTP Adapter Method and Header Validation

Status: verified

Goal:

Reject unsupported HTTP methods and invalid or empty required TokenFlow metadata defaults with structured errors.

Completed:

- wrote failing unsupported HTTP method test
- wrote failing invalid adapter metadata default test
- verified empty metadata header overrides fall back to configured defaults
- returned structured `405 unsupported_method` responses
- returned structured `500 invalid_adapter_config` responses
- performed adapter-level validation before provider request normalization

Files:

```text
packages/core/src/gateway/http-adapter.test.ts
packages/core/src/gateway/http-adapter.ts
```

Verification:

```bash
pnpm test
pnpm typecheck
```

Result:

```text
12 test files passed
74 tests passed
typecheck passed
```

## Next Slice

### Checkpoint 16: Usage Event Shape

Status: pending

Goal:

Define the first metering event shape emitted by gateway decisions for dashboard and cost analysis.

Files:

```text
packages/core/src/usage/usage-event.test.ts
packages/core/src/usage/usage-event.ts
```
