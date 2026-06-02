# TokenFlow

TokenFlow is a harness-agnostic control plane for reducing LLM token spend, limiting unnecessary data exposure, and giving enterprises one place to observe and govern agentic AI usage.

The goal is not to replace approved agent harnesses such as Codex, Claude Code, Cursor, OpenCode, internal agents, or custom workflows. The goal is to sit around them as a minimization, routing, policy, and observability layer. If a harness is already approved, TokenFlow should not require broad new access. It should inherit the harness/user permissions, expose less information to models, and give admins better control over usage.

## Problem

Enterprise LLM costs are increasingly driven by agentic workflows. Coding agents and operational agents repeatedly search repositories, read files, run tools, inspect logs, retry failed actions, and send large amounts of context to models. Token usage can spike because of noisy shell output, duplicate code, verbose file formats, large startup prompts, weak retrieval, repeated failed loops, and overuse of expensive models for exploratory work.

Point solutions already exist:

- RTK-like layers reduce noisy terminal output before the agent sees it.
- Semble-like code search reduces token waste by returning relevant snippets instead of full files or large grep dumps.
- LLM gateways provide usage tracking, budgets, routing, and provider abstraction.
- Prompt caching reduces cost when stable prompt prefixes are reused.
- PII and secrets scanners reduce risk before data reaches a model.

TokenFlow combines these ideas into one modular platform.

## Design Principles

- **Harness agnostic:** support many agent harnesses without forcing users into a single agent runtime.
- **Minimize, do not expand:** inherit existing IAM, SSO, RBAC, repo access, and harness permissions.
- **Expose less data:** prune, summarize, redact, and retrieve selectively before model calls.
- **Make cost observable:** capture spend, token volume, cache hit rates, routing decisions, and spikes in one place.
- **Prefer retrieval over compression:** use indexing to avoid irrelevant context, then use output pruning as a safety net.
- **Route by task phase:** use weaker models for exploration and summarization, stronger models for reasoning and execution.
- **Admin tunable:** every major layer can be enabled, disabled, or tuned by team, repo, harness, environment, and data classification.
- **Regulation aligned:** support controls that map to CISA Secure by Design, NIST AI RMF, OWASP LLM risks, privacy requirements, auditability, and enterprise retention policy.

## Architecture

TokenFlow has four main planes.

### 1. Gateway Plane

The gateway plane is the central entry point for LLM and agent traffic.

Supported integration modes:

- OpenAI-compatible proxy
- Anthropic-compatible proxy
- SDK middleware
- CLI wrapper
- MCP server
- shell output wrapper
- sidecar process
- local-only mode for sensitive repositories

Every request is normalized into a common event shape:

```text
actor -> harness -> task -> repo/project -> model -> prompt/context/tools -> response -> usage/cost/policy events
```

The gateway captures:

- input, output, and cached token counts
- model and provider
- team, user, repo, project, and harness
- tool calls and result size
- policy decisions
- latency and errors
- estimated and actual cost
- cache hit rate
- routing decisions

### 2. Context Plane

The context plane controls what information reaches the model.

Core modules:

- startup context injector
- code and document index
- semantic search
- lexical search
- tool-output pruning
- shell/log/test-output summarization
- file summarization
- duplicate-code and dead-code hints
- prompt-cache layout optimizer
- context budget manager

The preferred path is:

```text
agent intent -> indexed retrieval -> relevant snippets -> policy scan -> model context
```

The fallback path is:

```text
agent command -> raw tool output -> pruning/summarization -> policy scan -> model context
```

This lets TokenFlow use both code indexing and RTK-like output reduction. Indexing prevents waste earlier. Output pruning handles unavoidable noisy execution results.

### 3. Policy And Security Plane

The policy plane reduces risk without becoming a new data authority.

Controls:

- PII detection
- secrets detection
- prompt injection detection
- data classification
- model allow/deny lists
- tool allow/deny lists
- per-team budgets
- per-repo budgets
- raw-output retention policy
- audit logging
- blocked-request logging
- export controls
- approval workflows for stricter environments

PII detection should run at multiple points:

- before prompt submission
- before tool output enters context
- before raw logs are stored
- before dashboard display
- before data export
- before indexed content is retrievable

PII modes:

- `observe`: detect and log only
- `warn`: notify user or agent
- `redact`: mask sensitive values
- `block`: stop the request
- `hash`: preserve joinability without exposing raw values
- `allowlist`: permit known safe fields or systems

Sensitive data categories:

- direct PII such as names, email addresses, phone numbers, addresses, SSNs, national IDs
- secrets such as API keys, tokens, credentials, private keys
- business-sensitive data such as customer names, contracts, tickets, financial records
- regulated data such as PHI, PCI, GDPR-relevant data, depending on environment

TokenFlow should align with CISA Secure by Design, NIST AI RMF, and OWASP LLM guidance. It should not claim that installing the tool automatically makes a company compliant. The stronger claim is that TokenFlow provides controls, logs, and enforcement points that help enterprises operate agentic AI systems in a more governable way.

### 4. Admin And Analytics Plane

The admin dashboard should use shadcn/ui for a consistent, agent-friendly enterprise interface.

Dashboard views:

- spend by team, repo, harness, model, provider, and task type
- token usage trends
- usage spikes and anomaly detection
- top token-wasting prompts, tools, files, repos, and harnesses
- model-routing outcomes
- prompt-cache hit rates
- PII and secrets events
- prompt injection events
- policy violations
- retained raw-output volume
- estimated savings from recommendations
- before/after savings reports

Admin controls:

- enable or disable each module
- tune context budgets
- tune redaction policies
- configure retention
- configure model routing
- set model allowlists
- set team/repo budgets
- select local-only mode
- select regulated-environment profile

Suggested profiles:

- `dev-permissive`
- `standard-enterprise`
- `regulated`
- `high-security`
- `local-only`

## MCP And CLI Surface

TokenFlow should expose useful parts of the system as MCP tools and CLI commands.

Example MCP tools:

```text
search_code(query, repo, budget)
summarize_tool_output(output, intent, budget)
detect_pii(text, mode)
detect_secrets(text, mode)
estimate_tokens(payload)
choose_model(task_type, risk_level, budget)
get_startup_context(repo, task)
explain_policy_decision(event_id)
```

Example CLI commands:

```bash
tokenflow search "where auth token refresh happens"
tokenflow run pytest
tokenflow summarize build.log
tokenflow pii-scan output.txt
tokenflow secrets-scan output.txt
tokenflow budget status
tokenflow route --task exploratory-search
tokenflow gateway events --last 1h
```

## Minimal Access-Policy Hassle

TokenFlow should not create broad new access paths.

Rules:

- If the user cannot read a repo, TokenFlow cannot index it for that user.
- If the harness cannot access a file, TokenFlow cannot retrieve it through that harness.
- If a harness is read-only, TokenFlow must not create write capability.
- If raw output contains restricted data, TokenFlow can redact, suppress, or block it, but must not expose it more broadly.
- Admins configure policy centrally, but resource access remains tied to existing IAM, SSO, RBAC, and harness permissions.

This makes the approval story simpler: TokenFlow is a data minimization and observability layer around already-approved tools.

## Backend Base: TDD Outline

The backend should start small and test-first. The first implementation should prove the request pipeline, policy decisions, token accounting, and modular configuration before adding complex indexing or dashboard features.

### Suggested Stack

- TypeScript backend
- Fastify or Hono for HTTP APIs
- PostgreSQL for durable events, policies, budgets, and audit logs
- Redis for short-lived request state and rate limiting
- OpenTelemetry for traces and metrics
- Vitest for unit and integration tests
- Testcontainers for PostgreSQL/Redis integration tests
- Zod for request and policy schema validation
- shadcn/ui frontend later, likely with Next.js or Vite

Python would also be reasonable, but TypeScript fits naturally with a shadcn dashboard and MCP/CLI packaging.

### Initial Backend Modules

```text
src/
  app.ts
  config/
    profiles.ts
    schema.ts
  gateway/
    normalize-request.ts
    proxy-controller.ts
    usage-meter.ts
  policy/
    policy-engine.ts
    pii-detector.ts
    secrets-detector.ts
    prompt-injection-detector.ts
  context/
    budget-manager.ts
    tool-output-pruner.ts
    startup-context.ts
  routing/
    model-router.ts
  events/
    event-store.ts
    audit-log.ts
  mcp/
    server.ts
  cli/
    index.ts
  dashboard-api/
    metrics-controller.ts
```

### First Test Suite

Start with behavior-level tests instead of implementation-heavy tests.

#### 1. Request Normalization

Tests:

- normalizes OpenAI-style chat requests into the internal event schema
- normalizes Anthropic-style messages into the internal event schema
- preserves harness, actor, repo, task, and model metadata
- rejects malformed requests with a clear validation error
- never stores raw prompt text when raw retention is disabled

#### 2. PII And Secrets Policy

Tests:

- detects email, phone number, SSN-like values, and API-key-like secrets
- redacts detected values in `redact` mode
- blocks the request in `block` mode
- logs detection metadata without storing raw sensitive values
- honors allowlisted fields

#### 3. Context Budgeting

Tests:

- accepts context under budget
- prunes low-priority context when over budget
- preserves required system and policy context
- returns a clear explanation of what was removed
- records estimated saved tokens

#### 4. Tool-Output Pruning

Tests:

- removes progress bars, repeated lines, and irrelevant log noise
- preserves failing test names, stack traces, file paths, and line numbers
- returns a summary plus a reference to raw output if retention is enabled
- drops raw output when retention is disabled

#### 5. Model Routing

Tests:

- routes exploratory search to cheaper allowed models
- routes high-risk reasoning or code execution to stronger allowed models
- refuses disallowed models
- respects team and environment policy
- records the routing reason

#### 6. Usage Metering

Tests:

- records input, output, cached, and total tokens
- estimates cost by model pricing configuration
- attributes cost to team, repo, harness, task type, and actor
- emits a spike event when usage crosses a configured threshold

#### 7. Audit Logging

Tests:

- records policy decisions immutably
- records blocked requests
- records redaction counts, not raw redacted values
- supports querying by team, repo, harness, actor, and time window

### First TDD Milestone

Milestone 1 should implement a fake-provider gateway:

```text
client request
-> normalize
-> run PII/secrets scan
-> apply context budget
-> choose model
-> call fake provider
-> meter usage
-> write event/audit log
-> return response
```

No real LLM provider is needed for the first milestone. Tests should prove the control flow and policy behavior with a fake provider.

### Second TDD Milestone

Milestone 2 should add:

- OpenAI-compatible proxy endpoint
- Anthropic-compatible proxy endpoint
- token estimation
- basic CLI commands
- MCP server with `detect_pii`, `estimate_tokens`, and `summarize_tool_output`
- PostgreSQL-backed event store

### Third TDD Milestone

Milestone 3 should add:

- code index API
- lexical search first
- semantic search later
- startup context profiles
- shadcn dashboard shell
- spend charts
- policy-event table
- spike detection view

## Open Design Questions

- Should indexing happen centrally, locally, or both?
- Should sensitive repos force local-only indexing?
- Should raw tool output ever be retained by default?
- Should model routing be deterministic policy, learned optimization, or both?
- How much should TokenFlow rely on existing DLP tools versus built-in PII detection?
- Should the CLI wrap commands directly or only summarize files/output passed to it?
- Should the MCP server expose raw search results or only policy-filtered summaries?

## References

- CISA Secure by Design: https://www.cisa.gov/resources-tools/resources/secure-by-design
- NIST AI Risk Management Framework: https://www.nist.gov/itl/ai-risk-management-framework
- OWASP Top 10 for LLM Applications: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- RTK AI: https://github.com/rtk-ai/rtk
- Semble: https://github.com/MinishLab/semble
- OpenAI prompt caching: https://openai.com/index/api-prompt-caching/
- Anthropic prompt caching: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
