export type PolicyAction = "allow" | "warn" | "redact" | "block";

export type FindingKind = "pii" | "secret";

export type FindingConfidence = "medium" | "high";

export type PolicyFinding = {
  kind: FindingKind;
  category: string;
  start: number;
  end: number;
  length: number;
  confidence: FindingConfidence;
};

export type PolicyRule = {
  category: string;
  action: PolicyAction;
};

export type PolicyReason = {
  action: Exclude<PolicyAction, "allow">;
  category: string;
  kind: FindingKind;
  message: string;
};

export type PolicyDecision = {
  action: PolicyAction;
  findings: PolicyFinding[];
  reasons: PolicyReason[];
};

export type EvaluatePolicyInput = {
  findings: PolicyFinding[];
  rules: PolicyRule[];
  defaultAction?: Exclude<PolicyAction, "allow">;
};

const ACTION_RANK: Record<PolicyAction, number> = {
  allow: 0,
  warn: 1,
  redact: 2,
  block: 3
};

export function evaluatePolicy(input: EvaluatePolicyInput): PolicyDecision {
  const reasons = input.findings.flatMap((finding) => {
    const action = resolveAction(finding, input);

    if (action === "allow") {
      return [];
    }

    return [
      {
        action,
        category: finding.category,
        kind: finding.kind,
        message: `${finding.kind} ${finding.category} requires ${nounForAction(action)}`
      }
    ];
  });

  return {
    action: reasons.reduce<PolicyAction>(
      (currentAction, reason) =>
        ACTION_RANK[reason.action] > ACTION_RANK[currentAction]
          ? reason.action
          : currentAction,
      "allow"
    ),
    findings: input.findings,
    reasons
  };
}

function resolveAction(
  finding: PolicyFinding,
  input: EvaluatePolicyInput
): PolicyAction {
  return (
    input.rules.find((rule) => rule.category === finding.category)?.action ??
    input.defaultAction ??
    "allow"
  );
}

function nounForAction(action: Exclude<PolicyAction, "allow">): string {
  if (action === "warn") {
    return "warning";
  }

  return action;
}
