import { describe, expect, expectTypeOf, it } from "vitest";
import { evaluatePolicy } from "./evaluate-policy.js";
import type {
  PolicyDecision,
  PolicyFinding,
  PolicyRule
} from "./evaluate-policy.js";

const emailFinding: PolicyFinding = {
  kind: "pii",
  category: "email",
  start: 6,
  end: 22,
  length: 16,
  confidence: "high"
};

const apiKeyFinding: PolicyFinding = {
  kind: "secret",
  category: "api_key",
  start: 32,
  end: 53,
  length: 21,
  confidence: "medium"
};

const privateKeyFinding: PolicyFinding = {
  kind: "secret",
  category: "private_key",
  start: 12,
  end: 80,
  length: 68,
  confidence: "high"
};

describe("evaluatePolicy", () => {
  it("allows clean inputs with no findings", () => {
    expect(evaluatePolicy({ findings: [], rules: [] })).toEqual({
      action: "allow",
      findings: [],
      reasons: []
    });
  });

  it("warns when a matching finding is configured for warning", () => {
    expect(
      evaluatePolicy({
        findings: [emailFinding],
        rules: [{ category: "email", action: "warn" }]
      })
    ).toEqual({
      action: "warn",
      findings: [emailFinding],
      reasons: [
        {
          action: "warn",
          category: "email",
          kind: "pii",
          message: "pii email requires warning"
        }
      ]
    });
  });

  it("redacts when a matching finding is configured for redaction", () => {
    expect(
      evaluatePolicy({
        findings: [apiKeyFinding],
        rules: [{ category: "api_key", action: "redact" }]
      }).action
    ).toBe("redact");
  });

  it("blocks when a matching finding is configured for blocking", () => {
    expect(
      evaluatePolicy({
        findings: [privateKeyFinding],
        rules: [{ category: "private_key", action: "block" }]
      }).action
    ).toBe("block");
  });

  it("uses block over redact and warn when several rules match", () => {
    expect(
      evaluatePolicy({
        findings: [emailFinding, apiKeyFinding, privateKeyFinding],
        rules: [
          { category: "email", action: "warn" },
          { category: "api_key", action: "redact" },
          { category: "private_key", action: "block" }
        ]
      }).action
    ).toBe("block");
  });

  it("falls back to a configured default action for unmatched findings", () => {
    expect(
      evaluatePolicy({
        findings: [emailFinding],
        rules: [],
        defaultAction: "redact"
      }).action
    ).toBe("redact");
  });

  it("exports policy types", () => {
    expectTypeOf<PolicyRule>().toMatchTypeOf<{
      category: string;
      action: "allow" | "warn" | "redact" | "block";
    }>();
    expectTypeOf<PolicyDecision>().toMatchTypeOf<{
      action: "allow" | "warn" | "redact" | "block";
      findings: PolicyFinding[];
      reasons: Array<{
        action: "warn" | "redact" | "block";
        category: string;
        kind: "pii" | "secret";
        message: string;
      }>;
    }>();
  });
});
