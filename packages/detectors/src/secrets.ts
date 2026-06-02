export type SecretCategory = "api_key" | "bearer_token" | "private_key";

export type SecretConfidence = "medium" | "high";

export type SecretFinding = {
  category: SecretCategory;
  start: number;
  end: number;
  length: number;
  confidence: SecretConfidence;
};

export type SecretRedactionResult = {
  text: string;
  findings: SecretFinding[];
};

type Pattern = {
  category: SecretCategory;
  confidence: SecretConfidence;
  expression: RegExp;
};

const PATTERNS: Pattern[] = [
  {
    category: "private_key",
    confidence: "high",
    expression: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z ]*PRIVATE KEY-----/g
  },
  {
    category: "bearer_token",
    confidence: "high",
    expression: /\bBearer\s+[A-Za-z0-9._~+/-]{20,}={0,2}\b/g
  },
  {
    category: "api_key",
    confidence: "medium",
    expression: /\b(?:sk|pk|rk|ak)-[A-Za-z0-9_]{12,}\b/g
  }
];

const REDACTION_BY_CATEGORY: Record<SecretCategory, string> = {
  api_key: "[REDACTED_API_KEY]",
  bearer_token: "[REDACTED_BEARER_TOKEN]",
  private_key: "[REDACTED_PRIVATE_KEY]"
};

export function detectSecrets(text: string): SecretFinding[] {
  const findings = PATTERNS.flatMap((pattern) => findMatches(text, pattern));

  return findings.sort((left, right) => left.start - right.start);
}

export function redactSecrets(text: string): SecretRedactionResult {
  const findings = detectSecrets(text);
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

function findMatches(text: string, pattern: Pattern): SecretFinding[] {
  return [...text.matchAll(pattern.expression)].map((match) => {
    const start = match.index;
    const length = match[0].length;

    return {
      category: pattern.category,
      start,
      end: start + length,
      length,
      confidence: pattern.confidence
    };
  });
}
