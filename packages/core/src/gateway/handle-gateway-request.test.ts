import { describe, expect, expectTypeOf, it } from "vitest";
import { handleGatewayRequest } from "./handle-gateway-request.js";
import type {
  GatewayDecision,
  GatewayRequestInput,
  GatewayResponse
} from "./handle-gateway-request.js";

const baseInput = {
  provider: "openai",
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
  }
} satisfies Omit<GatewayRequestInput, "body" | "rules">;

describe("handleGatewayRequest", () => {
  it("allows clean provider requests and returns the original upstream body", () => {
    const body = {
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: "Review public architecture notes." }]
    } satisfies GatewayRequestInput["body"];

    expect(
      handleGatewayRequest({
        ...baseInput,
        body,
        rules: []
      })
    ).toEqual({
      decision: "allow",
      upstreamBody: body,
      normalizedRequest: {
        provider: "openai",
        model: "gpt-4.1-mini",
        metadata: baseInput.metadata,
        retention: baseInput.retention,
        messages: [{ role: "user", text: "Review public architecture notes." }]
      },
      policy: {
        action: "allow",
        findings: [],
        reasons: []
      }
    });
  });

  it("warns but still allows upstream forwarding", () => {
    const body = {
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: "Email jane@example.com." }]
    } satisfies GatewayRequestInput["body"];

    const result = handleGatewayRequest({
      ...baseInput,
      body,
      rules: [{ category: "email", action: "warn" }]
    });

    expect(result.decision).toBe("warn");
    expect(result.upstreamBody).toBe(body);
    expect(result.policy.reasons).toEqual([
      {
        action: "warn",
        category: "email",
        kind: "pii",
        message: "pii email requires warning"
      }
    ]);
  });

  it("returns a redacted normalized request when policy requires redaction", () => {
    const result = handleGatewayRequest({
      ...baseInput,
      body: {
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: "Email jane@example.com." }]
      },
      rules: [{ category: "email", action: "redact" }]
    });

    expect(result.decision).toBe("redact");
    expect(result.upstreamBody).toBeUndefined();
    expect(result.redactedRequest?.messages).toEqual([
      { role: "user", text: "Email [REDACTED_EMAIL]." }
    ]);
  });

  it("blocks upstream forwarding when policy requires block", () => {
    const result = handleGatewayRequest({
      ...baseInput,
      body: {
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: "Use key sk-abc123SECRETxyz789." }]
      },
      rules: [{ category: "api_key", action: "block" }]
    });

    expect(result.decision).toBe("block");
    expect(result.upstreamBody).toBeUndefined();
    expect(result.redactedRequest).toBeUndefined();
    expect(result.policy.findings[0]).toMatchObject({
      kind: "secret",
      category: "api_key",
      messageIndex: 0,
      role: "user"
    });
  });

  it("supports Anthropic-style requests through the same handler", () => {
    const result = handleGatewayRequest({
      ...baseInput,
      provider: "anthropic",
      body: {
        model: "claude-sonnet-4",
        system: "Keep data private.",
        messages: [{ role: "user", content: "Review public architecture notes." }]
      },
      rules: []
    });

    expect(result.decision).toBe("allow");
    expect(result.normalizedRequest.messages).toEqual([
      { role: "system", text: "Keep data private." },
      { role: "user", text: "Review public architecture notes." }
    ]);
  });

  it("exports gateway types", () => {
    expectTypeOf<GatewayDecision>().toEqualTypeOf<"allow" | "warn" | "redact" | "block">();
    expectTypeOf<GatewayRequestInput>().toMatchTypeOf<{
      provider: "openai" | "anthropic";
      body: {
        model: string;
        messages: Array<{ role: string; content: string }>;
      };
      rules: Array<{ category: string; action: GatewayDecision }>;
    }>();
    expectTypeOf<GatewayResponse>().toMatchTypeOf<{
      decision: GatewayDecision;
      normalizedRequest: unknown;
      policy: unknown;
      upstreamBody?: unknown;
      redactedRequest?: unknown;
    }>();
  });
});
