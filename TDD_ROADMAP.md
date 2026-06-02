# TokenFlow TDD Roadmap

This roadmap turns TokenFlow into a test-driven TypeScript project. Each milestone starts with failing tests, then adds only enough code to pass those tests.

The first implementation should avoid real LLM providers. A fake provider gives deterministic behavior while the gateway, policy, routing, metering, and audit pipeline are proven.

## Development Rules

- Write tests before implementation.
- Keep each milestone small enough to finish and verify.
- Prefer behavior tests over implementation-detail tests.
- Use fake providers until the core pipeline is stable.
- Do not add enterprise-only features until the core event and policy model works.
- Avoid raw prompt or raw tool-output retention by default.
- Keep modules independently testable.

## Suggested Stack

- TypeScript
- pnpm workspaces
- Vitest
- Zod
- Fastify or Hono
- SQLite for local mode tests
- PostgreSQL later for production integration tests
- Redis later for counters and rate limits
- React + shadcn/ui later for dashboard

## Target Workspace

```text
apps/
  api/
  cli/
  mcp/
  dashboard/

packages/
  core/
  config/
  detectors/
  providers/
  retrieval/
  storage/
  test-fixtures/
```

## Milestone 0: Project Scaffold

Goal: create the TypeScript workspace and test runner.

Write failing tests first:

```text
packages/core/src/health.test.ts
- returns package name and version
```

Implement:

```text
package.json
pnpm-workspace.yaml
tsconfig.base.json
vitest.config.ts
packages/core/package.json
packages/core/src/health.ts
packages/core/src/health.test.ts
```

Acceptance:

```bash
pnpm test
```

Expected result: tests pass.

## Milestone 1: Request Normalization

Goal: normalize provider-specific requests into TokenFlow's internal event shape.

Write failing tests first:

```text
packages/core/src/normalize/normalize-request.test.ts
- normalizes OpenAI-style chat request
- normalizes Anthropic-style messages request
- preserves actor, team, repo, harness, task type, and environment metadata
- rejects malformed requests
- omits raw prompt text when raw retention is disabled
```

Implement:

```text
packages/core/src/normalize/types.ts
packages/core/src/normalize/normalize-request.ts
packages/config/src/schema.ts
```

Minimal interfaces:

```text
ProviderRequest
TokenFlowRequest
TokenFlowMetadata
RetentionPolicy
NormalizedRequest
```

Acceptance:

- OpenAI and Anthropic input shapes produce the same internal shape.
- Validation errors are explicit.
- Retention policy is honored.

## Milestone 2: PII And Secrets Detection

Goal: detect and act on sensitive data before model calls or event persistence.

Write failing tests first:

```text
packages/detectors/src/pii.test.ts
- detects email addresses
- detects phone-number-like values
- detects SSN-like values
- redacts PII in redact mode
- blocks PII in block mode
- hashes PII in hash mode
- records detection counts without raw values

packages/detectors/src/secrets.test.ts
- detects API-key-like strings
- detects private-key blocks
- detects bearer tokens
- redacts secrets in redact mode
- blocks secrets in block mode
```

Implement:

```text
packages/detectors/src/pii.ts
packages/detectors/src/secrets.ts
packages/core/src/policy/sensitive-data-policy.ts
```

Acceptance:

- Detectors return spans, categories, severity, and safe metadata.
- Policy can observe, warn, redact, block, hash, or allowlist findings.

## Milestone 3: Policy Engine

Goal: make policy decisions from scans, metadata, environment profile, and budgets.

Write failing tests first:

```text
packages/core/src/policy/policy-engine.test.ts
- allows clean requests
- redacts requests when PII policy is redact
- blocks requests when PII policy is block
- blocks disallowed providers
- blocks disallowed models
- adds warning decisions in warn mode
- returns an explanation for each decision
- never includes raw sensitive values in decision metadata
```

Implement:

```text
packages/core/src/policy/policy-engine.ts
packages/config/src/profiles.ts
packages/core/src/policy/types.ts
```

Acceptance:

- Every decision has a stable code.
- Every decision has safe metadata for audit logs.
- Policy behavior is deterministic.

## Milestone 4: Context Budget Manager

Goal: keep model input under configured budgets while preserving required context.

Write failing tests first:

```text
packages/core/src/context/budget-manager.test.ts
- accepts context under budget
- removes optional context over budget
- preserves system and policy context
- preserves user task
- prunes lowest-priority context first
- reports estimated saved tokens
- explains what was pruned
```

Implement:

```text
packages/core/src/context/budget-manager.ts
packages/core/src/context/token-estimator.ts
packages/core/src/context/types.ts
```

Acceptance:

- Required context is never removed.
- Optional context is pruned predictably.
- The explanation is useful for debugging and dashboard display.

## Milestone 5: Tool-Output Pruning

Goal: transform noisy command output into agent-useful summaries.

Write failing tests first:

```text
packages/core/src/context/tool-output-pruner.test.ts
- removes repeated lines
- removes progress bars
- preserves failing test names
- preserves stack traces
- preserves file paths and line numbers
- summarizes long logs
- drops raw output when retention is disabled
- keeps raw-output reference when retention is enabled
```

Implement:

```text
packages/core/src/context/tool-output-pruner.ts
packages/core/src/context/log-patterns.ts
```

Acceptance:

- Important failure evidence survives pruning.
- Summaries are shorter than raw output.
- Retention policy is enforced.

## Milestone 6: Model Router

Goal: route requests to suitable models by task type, risk, cost, and policy.

Write failing tests first:

```text
packages/core/src/routing/model-router.test.ts
- routes exploratory search to cheap allowed model
- routes summarization to cheap allowed model
- routes architecture reasoning to strong allowed model
- routes high-risk execution to strongest approved model
- refuses disallowed model
- respects provider allowlist
- records routing reason
```

Implement:

```text
packages/core/src/routing/model-router.ts
packages/core/src/routing/types.ts
packages/config/src/model-catalog.ts
```

Acceptance:

- Routing is deterministic.
- Routing decisions are explainable.
- No request is routed to a disallowed model or provider.

## Milestone 7: Usage Metering

Goal: attribute token usage and cost to teams, users, repos, harnesses, task types, models, and providers.

Write failing tests first:

```text
packages/core/src/metering/usage-meter.test.ts
- records input tokens
- records output tokens
- records cached tokens
- estimates cost from model pricing
- attributes usage to actor, team, repo, harness, and task type
- emits spike event when threshold is crossed
```

Implement:

```text
packages/core/src/metering/usage-meter.ts
packages/core/src/metering/pricing.ts
packages/core/src/metering/types.ts
```

Acceptance:

- Cost math is covered by tests.
- Unknown prices are handled explicitly.
- Spike events are deterministic in tests.

## Milestone 8: Audit Event Store

Goal: persist safe usage and policy events.

Write failing tests first:

```text
packages/storage/src/memory-event-store.test.ts
- writes request events
- writes policy events
- writes usage events
- queries events by time range
- queries events by team, repo, harness, and actor
- refuses events containing raw redacted values
```

Implement:

```text
packages/storage/src/event-store.ts
packages/storage/src/memory-event-store.ts
packages/core/src/audit/audit-log.ts
```

Acceptance:

- Memory store supports local tests.
- Raw sensitive values are rejected by defensive checks.
- Event shape is stable enough for the dashboard.

## Milestone 9: End-To-End Fake Gateway Pipeline

Goal: prove the full control path without real providers.

Write failing tests first:

```text
packages/core/src/pipeline/pipeline.test.ts
- processes clean request end to end
- redacts PII before fake provider call
- blocks request before fake provider call
- applies context budget before routing
- routes model before provider call
- meters fake provider usage
- writes audit and usage events
- returns policy warnings to caller
```

Implement:

```text
packages/core/src/pipeline/pipeline.ts
packages/providers/src/fake-provider.ts
```

Acceptance:

The tested flow works:

```text
request
-> normalize
-> budget
-> scan
-> policy
-> route
-> fake provider
-> meter
-> audit
-> response
```

## Milestone 10: API App

Goal: expose the pipeline over HTTP.

Write failing tests first:

```text
apps/api/src/routes/gateway.test.ts
- accepts OpenAI-compatible chat request
- accepts Anthropic-compatible messages request
- returns validation errors
- returns block response for blocked policy
- returns usage metadata
- writes audit events
```

Implement:

```text
apps/api/src/app.ts
apps/api/src/routes/gateway.ts
apps/api/src/server.ts
```

Acceptance:

- API tests run without external providers.
- HTTP surface uses the same core pipeline.

## Milestone 11: CLI

Goal: give local users immediate value.

Write failing tests first:

```text
apps/cli/src/commands.test.ts
- estimates tokens for stdin
- scans stdin for PII
- scans stdin for secrets
- summarizes file output
- returns nonzero exit code for block mode
```

Implement:

```text
apps/cli/src/index.ts
apps/cli/src/commands/
```

Acceptance:

- CLI works with stdin and file paths.
- CLI does not require the API server for local features.

## Milestone 12: MCP Server

Goal: expose core functions as MCP tools.

Write failing tests first:

```text
apps/mcp/src/server.test.ts
- registers detect_pii tool
- registers detect_secrets tool
- registers estimate_tokens tool
- registers summarize_tool_output tool
- returns structured tool results
- rejects invalid tool arguments
```

Implement:

```text
apps/mcp/src/server.ts
apps/mcp/src/tools.ts
```

Acceptance:

- MCP tools call shared core packages.
- Tool results are compact and agent-friendly.

## Milestone 13: Persistent Storage

Goal: move from memory store to SQLite local mode and PostgreSQL team mode.

Write failing tests first:

```text
packages/storage/src/sqlite-event-store.test.ts
- creates schema
- inserts events
- queries events
- enforces safe event constraints

packages/storage/src/postgres-event-store.test.ts
- creates schema
- inserts events
- queries events
- supports team/repo/harness filters
```

Implement:

```text
packages/storage/src/sqlite-event-store.ts
packages/storage/src/postgres-event-store.ts
packages/storage/src/migrations/
```

Acceptance:

- SQLite works for individuals.
- PostgreSQL works for team and enterprise mode.

## Milestone 14: Basic Dashboard

Goal: show usage and policy events.

Write failing tests first:

```text
apps/api/src/routes/metrics.test.ts
- returns spend by model
- returns spend by team
- returns policy events
- returns recent spikes

apps/dashboard/src/components/*.test.tsx
- renders usage table
- renders spend cards
- renders policy event table
```

Implement:

```text
apps/api/src/routes/metrics.ts
apps/dashboard/src/
```

Acceptance:

- shadcn/ui dashboard shows useful operational data.
- Dashboard reads from API metrics, not directly from storage.

## Milestone 15: Retrieval And Indexing

Goal: reduce code-reading tokens through indexed retrieval.

Write failing tests first:

```text
packages/retrieval/src/lexical-index.test.ts
- indexes files
- ignores configured files
- returns matching snippets
- includes file paths and line numbers
- respects caller access scope

packages/retrieval/src/search-policy.test.ts
- filters inaccessible files
- filters sensitive snippets
- returns compact results
```

Implement:

```text
packages/retrieval/src/lexical-index.ts
packages/retrieval/src/search.ts
packages/retrieval/src/ignore-rules.ts
```

Acceptance:

- Lexical search works before semantic search is added.
- Returned snippets are compact and policy-filtered.

## Milestone 16: Enterprise Controls

Goal: add features that matter mainly to enterprises.

Write failing tests first:

```text
packages/config/src/rbac-policy.test.ts
- grants admin access by role
- denies unauthorized policy edits
- scopes teams and repos

packages/core/src/audit/retention-policy.test.ts
- deletes eligible events
- preserves audit events that must be retained
- disables raw retention by default
```

Implement:

```text
packages/config/src/rbac-policy.ts
packages/core/src/audit/retention-policy.ts
apps/api/src/routes/admin-policy.ts
```

Acceptance:

- Enterprise controls do not affect individual local mode.
- Admin-only behavior is isolated behind explicit policy.

## Recommended Build Order

1. Milestone 0: scaffold
2. Milestone 1: normalization
3. Milestone 2: detectors
4. Milestone 3: policy engine
5. Milestone 4: context budget
6. Milestone 5: tool-output pruning
7. Milestone 6: model router
8. Milestone 7: usage metering
9. Milestone 8: audit store
10. Milestone 9: fake gateway pipeline
11. Milestone 10: API
12. Milestone 11: CLI
13. Milestone 12: MCP
14. Milestone 13: persistent storage
15. Milestone 14: dashboard
16. Milestone 15: retrieval
17. Milestone 16: enterprise controls

## First Implementation Slice

The first coding session should do only this:

```text
scaffold pnpm workspace
write failing health test
make health test pass
write failing OpenAI normalization test
make OpenAI normalization pass
write failing retention-disabled test
make retention-disabled behavior pass
```

That gives the project a working rhythm without pulling in too much architecture at once.
