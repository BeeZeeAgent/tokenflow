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

Status: pending

Goal:

Export PII and secrets detector APIs from a stable `@tokenflow/detectors` package entrypoint.

Files:

```text
packages/detectors/src/index.test.ts
packages/detectors/src/index.ts
```
