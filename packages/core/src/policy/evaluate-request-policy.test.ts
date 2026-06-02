import { describe, expect, expectTypeOf, it } from "vitest";
import { evaluateRequestPolicy } from "./evaluate-request-policy.js";
import type { NormalizedRequest } from "../normalize/types.js";
import type {
  EvaluateRequestPolicyInput,
  RequestPolicyDecision,
  RequestPolicyFinding
} from "./evaluate-request-policy.js";

const baseRequest: NormalizedRequest = {
  provider: "openai",
  model: "gpt-4.1-mini",
  metadata: {
    actorId: "user-1",
    teamId: "team-1",
    repo: "tokenflow",
    harness: "codex",
    taskType: "explore",
    environment: "dev"
  },
  retention: {
    storeRawPrompt: true,
    storeRawToolOutput: false
  },
  messages: []
};

describe("evaluateRequestPolicy", () => {
  it("allows clean normalized requests", () => {
    expect(
      evaluateRequestPolicy({
        request: {
          ...baseRequest,
          messages: [{ role: "user", text: "Review public architecture notes." }]
        },
        rules: []
      })
    ).toEqual({
      action: "allow",
      findings: [],
      reasons: []
    });
  });

  it("scans normalized request messages and adds message metadata", () => {
    const request = {
      ...baseRequest,
      messages: [
        { role: "user", text: "Email jane@example.com." },
        { role: "assistant", text: "Use key sk-abc123SECRETxyz789." }
      ]
    } satisfies NormalizedRequest;

    expect(
      evaluateRequestPolicy({
        request,
        rules: []
      }).findings
    ).toEqual([
      {
        kind: "pii",
        category: "email",
        start: 6,
        end: 22,
        length: 16,
        confidence: "high",
        messageIndex: 0,
        role: "user"
      },
      {
        kind: "secret",
        category: "api_key",
        start: 8,
        end: 29,
        length: 21,
        confidence: "medium",
        messageIndex: 1,
        role: "assistant"
      }
    ]);
  });

  it("applies policy rules to scanned message findings", () => {
    const result = evaluateRequestPolicy({
      request: {
        ...baseRequest,
        messages: [{ role: "user", text: "Email jane@example.com." }]
      },
      rules: [{ category: "email", action: "warn" }]
    });

    expect(result.action).toBe("warn");
    expect(result.reasons).toEqual([
      {
        action: "warn",
        category: "email",
        kind: "pii",
        message: "pii email requires warning"
      }
    ]);
  });

  it("redacts normalized request messages when the final policy action is redact", () => {
    const request = {
      ...baseRequest,
      messages: [
        { role: "user", text: "Email jane@example.com." },
        { role: "assistant", text: "Use key sk-abc123SECRETxyz789." }
      ]
    } satisfies NormalizedRequest;

    const result = evaluateRequestPolicy({
      request,
      rules: [
        { category: "email", action: "redact" },
        { category: "api_key", action: "redact" }
      ]
    });

    expect(result.action).toBe("redact");
    expect(result.redactedRequest).toEqual({
      ...request,
      messages: [
        { role: "user", text: "Email [REDACTED_EMAIL]." },
        { role: "assistant", text: "Use key [REDACTED_API_KEY]." }
      ]
    });
  });

  it("uses block precedence across request messages", () => {
    expect(
      evaluateRequestPolicy({
        request: {
          ...baseRequest,
          messages: [
            { role: "user", text: "Email jane@example.com." },
            { role: "assistant", text: "Use key sk-abc123SECRETxyz789." }
          ]
        },
        rules: [
          { category: "email", action: "redact" },
          { category: "api_key", action: "block" }
        ]
      }).action
    ).toBe("block");
  });

  it("does not scan omitted raw prompt placeholders", () => {
    const result = evaluateRequestPolicy({
      request: {
        ...baseRequest,
        messages: [
          {
            role: "user",
            text: "[raw prompt omitted]",
            originalLength: 42
          }
        ]
      },
      rules: [{ category: "email", action: "block" }]
    });

    expect(result.action).toBe("allow");
    expect(result.findings).toEqual([]);
  });

  it("exports request policy types", () => {
    expectTypeOf<EvaluateRequestPolicyInput>().toMatchTypeOf<{
      request: NormalizedRequest;
      rules: Array<{ category: string; action: "allow" | "warn" | "redact" | "block" }>;
      defaultAction?: "warn" | "redact" | "block";
    }>();
    expectTypeOf<RequestPolicyFinding>().toMatchTypeOf<{
      kind: "pii" | "secret";
      category: string;
      start: number;
      end: number;
      length: number;
      confidence: "medium" | "high";
      messageIndex: number;
      role: "system" | "user" | "assistant" | "tool";
    }>();
    expectTypeOf<RequestPolicyDecision>().toMatchTypeOf<{
      action: "allow" | "warn" | "redact" | "block";
      findings: RequestPolicyFinding[];
      reasons: Array<{ action: "warn" | "redact" | "block" }>;
      redactedRequest?: NormalizedRequest;
    }>();
  });
});
