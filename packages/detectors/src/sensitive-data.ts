import { detectPii } from "./pii.js";
import { detectSecrets } from "./secrets.js";
import type { PiiCategory, PiiConfidence, PiiFinding } from "./pii.js";
import type { SecretCategory, SecretConfidence, SecretFinding } from "./secrets.js";

export type SensitiveDataFinding =
  | SensitivePiiFinding
  | SensitiveSecretFinding;

export type SensitivePiiFinding = PiiFinding & {
  kind: "pii";
  category: PiiCategory;
  confidence: PiiConfidence;
};

export type SensitiveSecretFinding = SecretFinding & {
  kind: "secret";
  category: SecretCategory;
  confidence: SecretConfidence;
};

export type SensitiveDataRedactionResult = {
  text: string;
  findings: SensitiveDataFinding[];
};

const REDACTION_BY_CATEGORY: Record<
  SensitiveDataFinding["category"],
  string
> = {
  email: "[REDACTED_EMAIL]",
  phone: "[REDACTED_PHONE]",
  ssn: "[REDACTED_SSN]",
  api_key: "[REDACTED_API_KEY]",
  bearer_token: "[REDACTED_BEARER_TOKEN]",
  private_key: "[REDACTED_PRIVATE_KEY]"
};

export function scanSensitiveData(text: string): SensitiveDataFinding[] {
  const findings: SensitiveDataFinding[] = [
    ...detectPii(text).map(toSensitivePiiFinding),
    ...detectSecrets(text).map(toSensitiveSecretFinding)
  ];

  return findings.sort((left, right) => left.start - right.start);
}

export function redactSensitiveData(text: string): SensitiveDataRedactionResult {
  const findings = scanSensitiveData(text);
  const redactedText = [...findings]
    .sort((left, right) => right.start - left.start)
    .reduce<string>((currentText, finding) => {
      const replacement = REDACTION_BY_CATEGORY[finding.category];

      return `${currentText.slice(0, finding.start)}${replacement}${currentText.slice(finding.end)}`;
    }, text);

  return {
    text: redactedText,
    findings
  };
}

function toSensitivePiiFinding(finding: PiiFinding): SensitivePiiFinding {
  return {
    kind: "pii",
    ...finding
  };
}

function toSensitiveSecretFinding(
  finding: SecretFinding
): SensitiveSecretFinding {
  return {
    kind: "secret",
    ...finding
  };
}
