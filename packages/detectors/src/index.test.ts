import { describe, expect, expectTypeOf, it } from "vitest";
import {
  detectPii,
  detectSecrets,
  redactPii,
  redactSecrets,
  redactSensitiveData,
  scanSensitiveData
} from "./index.js";
import type {
  PiiFinding,
  PiiRedactionResult,
  SecretFinding,
  SecretRedactionResult,
  SensitiveDataFinding,
  SensitiveDataRedactionResult
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

  it("exports sensitive data scanner functions", () => {
    expect(typeof scanSensitiveData).toBe("function");
    expect(typeof redactSensitiveData).toBe("function");
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

  it("exports sensitive data scanner types", () => {
    expectTypeOf<SensitiveDataFinding>().toMatchTypeOf<{
      kind: "pii" | "secret";
      category: "email" | "phone" | "ssn" | "api_key" | "bearer_token" | "private_key";
      start: number;
      end: number;
      length: number;
      confidence: "medium" | "high";
    }>();
    expectTypeOf<SensitiveDataRedactionResult>().toMatchTypeOf<{
      text: string;
      findings: SensitiveDataFinding[];
    }>();
  });
});
