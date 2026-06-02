import { describe, expect, expectTypeOf, it } from "vitest";
import { detectPii, detectSecrets, redactPii, redactSecrets } from "./index.js";
import type {
  PiiFinding,
  PiiRedactionResult,
  SecretFinding,
  SecretRedactionResult
} from "./index.js";

describe("@tokenflow/detectors entrypoint", () => {
  it("exports PII detector functions", () => {
    expect(typeof detectPii).toBe("function");
    expect(typeof redactPii).toBe("function");
  });

  it("exports secrets detector functions", () => {
    expect(typeof detectSecrets).toBe("function");
    expect(typeof redactSecrets).toBe("function");
  });

  it("exports PII detector types", () => {
    expectTypeOf<PiiFinding>().toMatchTypeOf<{
      category: "email" | "phone" | "ssn";
      start: number;
      end: number;
      length: number;
      confidence: "medium" | "high";
    }>();
    expectTypeOf<PiiRedactionResult>().toMatchTypeOf<{
      text: string;
      findings: PiiFinding[];
    }>();
  });

  it("exports secrets detector types", () => {
    expectTypeOf<SecretFinding>().toMatchTypeOf<{
      category: "api_key" | "bearer_token" | "private_key";
      start: number;
      end: number;
      length: number;
      confidence: "medium" | "high";
    }>();
    expectTypeOf<SecretRedactionResult>().toMatchTypeOf<{
      text: string;
      findings: SecretFinding[];
    }>();
  });
});
