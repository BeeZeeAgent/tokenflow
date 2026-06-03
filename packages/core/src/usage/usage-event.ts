import type {
  GatewayDecision,
  GatewayResponse
} from "../gateway/handle-gateway-request.js";
import type {
  Provider,
  TokenFlowMetadata
} from "../normalize/types.js";

export type UsageTokenCounts = {
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
};

export type UsageEventInput = {
  requestId: string;
  occurredAt: string;
  gateway: GatewayResponse;
  latencyMs: number;
  tokenUsage?: UsageTokenCounts;
  estimatedCostUsd?: number;
  actualCostUsd?: number;
};

export type UsageEvent = {
  type: "usage";
  requestId: string;
  occurredAt: string;
  provider: Provider;
  model: string;
  metadata: TokenFlowMetadata;
  decision: GatewayDecision;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalTokens: number;
  latencyMs: number;
  estimatedCostUsd: number | null;
  actualCostUsd: number | null;
  policy: {
    findingCount: number;
    findingsByKind: {
      pii: number;
      secret: number;
    };
    findingsByCategory: Record<string, number>;
  };
};

export function createUsageEvent(input: UsageEventInput): UsageEvent {
  const inputTokens = input.tokenUsage?.inputTokens ?? 0;
  const outputTokens = input.tokenUsage?.outputTokens ?? 0;
  const cachedTokens = input.tokenUsage?.cachedTokens ?? 0;

  return {
    type: "usage",
    requestId: input.requestId,
    occurredAt: input.occurredAt,
    provider: input.gateway.normalizedRequest.provider,
    model: input.gateway.normalizedRequest.model,
    metadata: input.gateway.normalizedRequest.metadata,
    decision: input.gateway.decision,
    inputTokens,
    outputTokens,
    cachedTokens,
    totalTokens: inputTokens + outputTokens,
    latencyMs: input.latencyMs,
    estimatedCostUsd: input.estimatedCostUsd ?? null,
    actualCostUsd: input.actualCostUsd ?? null,
    policy: summarizePolicyFindings(input.gateway.policy.findings)
  };
}

function summarizePolicyFindings(
  findings: GatewayResponse["policy"]["findings"]
): UsageEvent["policy"] {
  return findings.reduce<UsageEvent["policy"]>(
    (summary, finding) => {
      summary.findingCount += 1;
      summary.findingsByKind[finding.kind] += 1;
      summary.findingsByCategory[finding.category] =
        (summary.findingsByCategory[finding.category] ?? 0) + 1;

      return summary;
    },
    {
      findingCount: 0,
      findingsByKind: {
        pii: 0,
        secret: 0
      },
      findingsByCategory: {}
    }
  );
}
