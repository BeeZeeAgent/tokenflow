export type UsageSpikeThresholds = {
  totalTokens?: number;
  estimatedCostUsd?: number;
};

export type UsageSpikeReasonCode =
  | "total_tokens_threshold_exceeded"
  | "estimated_cost_threshold_exceeded";

export type UsageSpikeReason = {
  code: UsageSpikeReasonCode;
  observed: number;
  threshold: number;
};

export type UsageSpike = {
  triggered: boolean;
  reasons: UsageSpikeReason[];
};

export type DetectUsageSpikeInput = {
  totalTokens: number;
  estimatedCostUsd: number | null;
  thresholds: UsageSpikeThresholds;
};

export function detectUsageSpike(input: DetectUsageSpikeInput): UsageSpike {
  const reasons: UsageSpikeReason[] = [];

  if (
    input.thresholds.totalTokens !== undefined &&
    input.totalTokens > input.thresholds.totalTokens
  ) {
    reasons.push({
      code: "total_tokens_threshold_exceeded",
      observed: input.totalTokens,
      threshold: input.thresholds.totalTokens
    });
  }

  if (
    input.thresholds.estimatedCostUsd !== undefined &&
    input.estimatedCostUsd !== null &&
    input.estimatedCostUsd > input.thresholds.estimatedCostUsd
  ) {
    reasons.push({
      code: "estimated_cost_threshold_exceeded",
      observed: input.estimatedCostUsd,
      threshold: input.thresholds.estimatedCostUsd
    });
  }

  return {
    triggered: reasons.length > 0,
    reasons
  };
}
