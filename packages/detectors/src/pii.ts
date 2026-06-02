export type PiiCategory = "email" | "phone" | "ssn";

export type PiiConfidence = "medium" | "high";

export type PiiFinding = {
  category: PiiCategory;
  start: number;
  end: number;
  length: number;
  confidence: PiiConfidence;
};

export type PiiRedactionResult = {
  text: string;
  findings: PiiFinding[];
};

type Pattern = {
  category: PiiCategory;
  confidence: PiiConfidence;
  expression: RegExp;
};

const PATTERNS: Pattern[] = [
  {
    category: "email",
    confidence: "high",
    expression: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
  },
  {
    category: "phone",
    confidence: "medium",
    expression: /(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b/g
  },
  {
    category: "ssn",
    confidence: "high",
    expression: /\b\d{3}-\d{2}-\d{4}\b/g
  }
];

const REDACTION_BY_CATEGORY: Record<PiiCategory, string> = {
  email: "[REDACTED_EMAIL]",
  phone: "[REDACTED_PHONE]",
  ssn: "[REDACTED_SSN]"
};

export function detectPii(text: string): PiiFinding[] {
  const findings = PATTERNS.flatMap((pattern) => findMatches(text, pattern));

  return findings.sort((left, right) => left.start - right.start);
}

export function redactPii(text: string): PiiRedactionResult {
  const findings = detectPii(text);
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

function findMatches(text: string, pattern: Pattern): PiiFinding[] {
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
