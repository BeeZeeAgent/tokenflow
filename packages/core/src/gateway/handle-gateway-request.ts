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
import { createUsageEvent } from "../usage/usage-event.js";
import type {
  UsageEvent,
  UsageEventInput
} from "../usage/usage-event.js";

export type GatewayDecision = "allow" | "warn" | "redact" | "block" | "observe";

export type HarnessRolloutMode = "off" | "observe" | "enforce";

export type GatewayUsageInput = Omit<UsageEventInput, "gateway">;

export type GatewayRequestInput = NormalizeRequestInput & {
  metadata: TokenFlowMetadata;
  retention: RetentionPolicy;
  rules: PolicyRule[];
  defaultAction?: "warn" | "redact" | "block";
  rolloutMode?: HarnessRolloutMode;
  usage?: GatewayUsageInput;
};

export type GatewayResponse = {
  decision: GatewayDecision;
  rolloutMode: HarnessRolloutMode;
  observedDecision?: GatewayDecision;
  normalizedRequest: NormalizedRequest;
  policy: RequestPolicyDecision;
  upstreamBody?: NormalizeRequestInput["body"];
  redactedRequest?: NormalizedRequest;
  usageEvent?: UsageEvent;
};

export function handleGatewayRequest(input: GatewayRequestInput): GatewayResponse {
  const rolloutMode = input.rolloutMode ?? "enforce";
  const normalizedRequest = normalizeRequest(input);

  if (rolloutMode === "off") {
    return withUsageEvent(input, {
      decision: "allow",
      rolloutMode,
      normalizedRequest,
      policy: {
        action: "allow",
        findings: [],
        reasons: []
      },
      upstreamBody: input.body
    });
  }

  const policy = evaluateRequestPolicy({
    request: normalizedRequest,
    rules: input.rules,
    defaultAction: input.defaultAction
  });

  if (rolloutMode === "observe") {
    return withUsageEvent(input, {
      decision: "observe",
      rolloutMode,
      observedDecision: policy.action,
      normalizedRequest,
      policy,
      upstreamBody: input.body,
      redactedRequest: policy.redactedRequest
    });
  }

  if (policy.action === "block") {
    return withUsageEvent(input, {
      decision: "block",
      rolloutMode,
      normalizedRequest,
      policy
    });
  }

  if (policy.action === "redact") {
    return withUsageEvent(input, {
      decision: "redact",
      rolloutMode,
      normalizedRequest,
      policy,
      redactedRequest: policy.redactedRequest
    });
  }

  return withUsageEvent(input, {
    decision: policy.action,
    rolloutMode,
    normalizedRequest,
    policy,
    upstreamBody: input.body
  });
}

function withUsageEvent(
  input: GatewayRequestInput,
  response: GatewayResponse
): GatewayResponse {
  if (!input.usage) {
    return response;
  }

  return {
    ...response,
    usageEvent: createUsageEvent({
      ...input.usage,
      gateway: response
    })
  };
}
