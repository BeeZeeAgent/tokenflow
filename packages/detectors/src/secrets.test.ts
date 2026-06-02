import { describe, expect, it } from "vitest";
import { detectSecrets, redactSecrets } from "./secrets.js";

describe("secrets detector", () => {
  it("detects API-key-like strings", () => {
    const text = "Use api_key sk-abc123SECRETxyz789 now.";
    const secret = "sk-abc123SECRETxyz789";

    expect(detectSecrets(text)).toEqual([
      {
        category: "api_key",
        start: text.indexOf(secret),
        end: text.indexOf(secret) + secret.length,
        length: secret.length,
        confidence: "medium"
      }
    ]);
  });

  it("detects bearer tokens", () => {
    const text = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI.";
    const secret = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI";

    expect(detectSecrets(text)).toEqual([
      {
        category: "bearer_token",
        start: text.indexOf(secret),
        end: text.indexOf(secret) + secret.length,
        length: secret.length,
        confidence: "high"
      }
    ]);
  });

  it("detects private-key blocks", () => {
    const secret = [
      "-----BEGIN PRIVATE KEY-----",
      "abc123",
      "-----END PRIVATE KEY-----"
    ].join("\n");
    const text = `Do not send this:\n${secret}\nDone.`;

    expect(detectSecrets(text)).toEqual([
      {
        category: "private_key",
        start: text.indexOf(secret),
        end: text.indexOf(secret) + secret.length,
        length: secret.length,
        confidence: "high"
      }
    ]);
  });

  it("redacts detected secrets", () => {
    const result = redactSecrets(
      "Key sk-abc123SECRETxyz789 and Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI."
    );

    expect(result.text).toBe(
      "Key [REDACTED_API_KEY] and Authorization: [REDACTED_BEARER_TOKEN]."
    );
    expect(result.findings.map((finding) => finding.category)).toEqual([
      "api_key",
      "bearer_token"
    ]);
  });

  it("returns safe metadata without raw secret values", () => {
    const secret = "sk-abc123SECRETxyz789";
    const findings = detectSecrets(`Key ${secret}.`);
    const serialized = JSON.stringify(findings);

    expect(serialized).not.toContain(secret);
    expect(findings[0]).not.toHaveProperty("value");
    expect(findings[0]).not.toHaveProperty("text");
  });

  it("returns no findings for clean text", () => {
    expect(detectSecrets("Rotate credentials through the approved vault.")).toEqual([]);
  });
});
