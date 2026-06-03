import { describe, expect, expectTypeOf, it } from "vitest";
import { createUsageEvent } from "./usage-event.js";
import type { GatewayResponse } from "../gateway/handle-gateway-request.js";
import type { UsageEvent, UsageEventInput } from "./usage-event.js";

const gateway = {
  decision: "warn",
  normalizedRequest: {
    provider: "openai",
    model: "gpt-4.1-mini",
    metadata: {
      actorId: "user-1",
      teamId: "team-1",
      repo: "tokenflow",
      harness: "codex",
      taskType: "execute",
      environment: "dev"
    },
    retention: {
      storeRawPrompt: true,
      storeRawToolOutput: false
    },
    messages: [{ role: "user", text: "Email jane@example.com." }]
  },
  policy: {
    action: "warn",
    findings: [
      {
        kind: "pii",
        category: "email",
        start: 6,
        end: 22,
        length: 16,
        confidence: "high",
        messageIndex: 0,
        role: "user"
      }
    ],
    reasons: [
      {
        action: "warn",
        category: "email",
        kind: "pii",
        message: "pii email requires warning"
      }
    ]
  },
  upstreamBody: {
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: "Email jane@example.com." }]
  }
} satisfies GatewayResponse;

describe("usage event", () => {
  it("creates a dashboard-safe event from a gateway decision", () => {
    expect(
      createUsageEvent({
        requestId: "req-1",
        occurredAt: "2026-06-03T12:00:00.000Z",
        gateway,
        latencyMs: 42,
        tokenUsage: {
          inputTokens: 128,
          outputTokens: 64,
          cachedTokens: 16
        }
      })
    ).toEqual({
      type: "usage",
      requestId: "req-1",
      occurredAt: "2026-06-03T12:00:00.000Z",
      provider: "openai",
      model: "gpt-4.1-mini",
      metadata: gateway.normalizedRequest.metadata,
      decision: "warn",
      inputTokens: 128,
      outputTokens: 64,
      cachedTokens: 16,
      totalTokens: 192,
      latencyMs: 42,
      estimatedCostUsd: null,
      actualCostUsd: null,
      policy: {
        findingCount: 1,
        findingsByKind: {
          pii: 1,
          secret: 0
        },
        findingsByCategory: {
          email: 1
        }
      }
    });
  });

  it("uses zero token counts when provider usage is not available yet", () => {
    expect(
      createUsageEvent({
        requestId: "req-2",
        occurredAt: "2026-06-03T12:01:00.000Z",
        gateway,
        latencyMs: 7
      })
    ).toMatchObject({
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      totalTokens: 0
    });
  });

  it("does not include raw prompt text or raw sensitive values", () => {
    const event = createUsageEvent({
      requestId: "req-3",
      occurredAt: "2026-06-03T12:02:00.000Z",
      gateway,
      latencyMs: 3
    });

    const serialized = JSON.stringify(event);

    expect(serialized).not.toContain("jane@example.com");
    expect(serialized).not.toContain("Email jane@example.com.");
  });

  it("exports usage event types", () => {
    expectTypeOf<UsageEventInput>().toMatchTypeOf<{
      requestId: string;
      occurredAt: string;
      gateway: GatewayResponse;
      latencyMs: number;
      tokenUsage?: {
        inputTokens?: number;
        outputTokens?: number;
        cachedTokens?: number;
      };
    }>();
    expectTypeOf<UsageEvent>().toMatchTypeOf<{
      type: "usage";
      requestId: string;
      provider: "openai" | "anthropic";
      model: string;
      decision: "allow" | "warn" | "redact" | "block";
      totalTokens: number;
    }>();
  });
});
