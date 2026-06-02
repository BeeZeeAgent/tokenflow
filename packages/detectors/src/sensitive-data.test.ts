import { describe, expect, it } from "vitest";
import { redactSensitiveData, scanSensitiveData } from "./sensitive-data.js";

describe("sensitive data scanner", () => {
  it("detects mixed PII and secrets in source order", () => {
    const text = "Email jane@example.com uses key sk-abc123SECRETxyz789.";

    expect(scanSensitiveData(text)).toEqual([
      {
        kind: "pii",
        category: "email",
        start: 6,
        end: 22,
        length: 16,
        confidence: "high"
      },
      {
        kind: "secret",
        category: "api_key",
        start: 32,
        end: 53,
        length: 21,
        confidence: "medium"
      }
    ]);
  });

  it("preserves source order across detector families", () => {
    const text = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI belongs to root@example.com.";

    expect(scanSensitiveData(text).map((finding) => finding.kind)).toEqual([
      "secret",
      "pii"
    ]);
  });

  it("redacts mixed sensitive data", () => {
    const result = redactSensitiveData(
      "Email jane@example.com uses key sk-abc123SECRETxyz789."
    );

    expect(result.text).toBe(
      "Email [REDACTED_EMAIL] uses key [REDACTED_API_KEY]."
    );
    expect(result.findings.map((finding) => finding.category)).toEqual([
      "email",
      "api_key"
    ]);
  });

  it("returns safe metadata without raw values", () => {
    const rawEmail = "jane@example.com";
    const rawSecret = "sk-abc123SECRETxyz789";
    const findings = scanSensitiveData(`Email ${rawEmail} uses ${rawSecret}.`);
    const serialized = JSON.stringify(findings);

    expect(serialized).not.toContain(rawEmail);
    expect(serialized).not.toContain(rawSecret);
    expect(findings[0]).not.toHaveProperty("value");
    expect(findings[0]).not.toHaveProperty("text");
  });

  it("returns no findings for clean text", () => {
    const result = redactSensitiveData("Review public architecture notes.");

    expect(result).toEqual({
      text: "Review public architecture notes.",
      findings: []
    });
  });
});
