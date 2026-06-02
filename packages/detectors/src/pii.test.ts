import { describe, expect, it } from "vitest";
import { detectPii, redactPii } from "./pii.js";

describe("PII detector", () => {
  it("detects email addresses", () => {
    const findings = detectPii("Contact ada.lovelace@example.com for access.");

    expect(findings).toEqual([
      {
        category: "email",
        start: 8,
        end: 32,
        length: 24,
        confidence: "high"
      }
    ]);
  });

  it("detects phone-number-like values", () => {
    const findings = detectPii("Call +1 (415) 555-0134 after review.");

    expect(findings).toEqual([
      {
        category: "phone",
        start: 5,
        end: 22,
        length: 17,
        confidence: "medium"
      }
    ]);
  });

  it("detects SSN-like values", () => {
    const findings = detectPii("Employee SSN is 123-45-6789.");

    expect(findings).toEqual([
      {
        category: "ssn",
        start: 16,
        end: 27,
        length: 11,
        confidence: "high"
      }
    ]);
  });

  it("redacts detected PII", () => {
    const result = redactPii(
      "Email jane@example.com, phone 415-555-0134, SSN 123-45-6789."
    );

    expect(result.text).toBe(
      "Email [REDACTED_EMAIL], phone [REDACTED_PHONE], SSN [REDACTED_SSN]."
    );
    expect(result.findings.map((finding) => finding.category)).toEqual([
      "email",
      "phone",
      "ssn"
    ]);
  });

  it("returns safe metadata without raw values", () => {
    const rawEmail = "root@example.com";
    const findings = detectPii(`Escalate to ${rawEmail}.`);
    const serialized = JSON.stringify(findings);

    expect(serialized).not.toContain(rawEmail);
    expect(findings[0]).not.toHaveProperty("value");
    expect(findings[0]).not.toHaveProperty("text");
  });

  it("returns no findings for clean text", () => {
    expect(detectPii("Review the public architecture note.")).toEqual([]);
  });
});
