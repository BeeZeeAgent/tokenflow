import { normalizeRequest } from "../normalize/normalize-request.js";
import type {
  NormalizedRequest,
  NormalizeRequestInput,
  RetentionPolicy,
  TokenFlowMetadata
} from "../normalize/types.js";
import { evaluateRequestPolicy } from "../policy/evaluate-request-policy.js";
import type {
  RequestPolicyDecision
} from "../policy/evaluate-request-policy.js";
import type { PolicyRule } from "../policy/evaluate-policy.js";

export type GatewayDecision = "allow" | "warn" | "redact" | "block";

export type GatewayRequestInput = NormalizeRequestInput & {
  metadata: TokenFlowMetadata;
  retention: RetentionPolicy;
  rules: PolicyRule[];
  defaultAction?: "warn" | "redact" | "block";
};

export type GatewayResponse = {
  decision: GatewayDecision;
  normalizedRequest: NormalizedRequest;
  policy: RequestPolicyDecision;
  upstreamBody?: NormalizeRequestInput["body"];
  redactedRequest?: NormalizedRequest;
};

export function handleGatewayRequest(input: GatewayRequestInput): GatewayResponse {
  const normalizedRequest = normalizeRequest(input);
  const policy = evaluateRequestPolicy({
    request: normalizedRequest,
    rules: input.rules,
    defaultAction: input.defaultAction
  });

  if (policy.action === "block") {
    return {
      decision: "block",
      normalizedRequest,
      policy
    };
  }

  if (policy.action === "redact") {
    return {
      decision: "redact",
      normalizedRequest,
      policy,
      redactedRequest: policy.redactedRequest
    };
  }

  return {
    decision: policy.action,
    normalizedRequest,
    policy,
    upstreamBody: input.body
  };
}
