import { redactSensitiveData, scanSensitiveData } from "@tokenflow/detectors";
import { evaluatePolicy } from "./evaluate-policy.js";
import type {
  EvaluatePolicyInput,
  PolicyDecision,
  PolicyFinding,
  PolicyRule
} from "./evaluate-policy.js";
import type {
  MessageRole,
  NormalizedMessage,
  NormalizedRequest
} from "../normalize/types.js";

export type RequestPolicyFinding = PolicyFinding & {
  messageIndex: number;
  role: MessageRole;
};

export type EvaluateRequestPolicyInput = {
  request: NormalizedRequest;
  rules: PolicyRule[];
  defaultAction?: EvaluatePolicyInput["defaultAction"];
};

export type RequestPolicyDecision = Omit<PolicyDecision, "findings"> & {
  findings: RequestPolicyFinding[];
  redactedRequest?: NormalizedRequest;
};

export function evaluateRequestPolicy(
  input: EvaluateRequestPolicyInput
): RequestPolicyDecision {
  const findings = scanRequestMessages(input.request);
  const decision = evaluatePolicy({
    findings,
    rules: input.rules,
    defaultAction: input.defaultAction
  });

  if (decision.action !== "redact") {
    return {
      ...decision,
      findings
    };
  }

  return {
    ...decision,
    findings,
    redactedRequest: redactRequest(input.request)
  };
}

function scanRequestMessages(request: NormalizedRequest): RequestPolicyFinding[] {
  return request.messages.flatMap((message, messageIndex) => {
    if (!hasScannableText(message)) {
      return [];
    }

    return scanSensitiveData(message.text).map((finding) => ({
      ...finding,
      messageIndex,
      role: message.role
    }));
  });
}

function redactRequest(request: NormalizedRequest): NormalizedRequest {
  return {
    ...request,
    messages: request.messages.map((message) => {
      if (!hasScannableText(message)) {
        return message;
      }

      return {
        ...message,
        text: redactSensitiveData(message.text).text
      };
    })
  };
}

function hasScannableText(
  message: NormalizedMessage
): message is NormalizedMessage & { text: string } {
  return message.text !== "[raw prompt omitted]";
}
