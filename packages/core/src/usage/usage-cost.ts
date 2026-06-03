import type { Provider } from "../normalize/types.js";

export type UsageModelPricing = {
  provider: Provider;
  model: string;
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
  cachedInputUsdPerMillionTokens?: number;
};

export type EstimateUsageCostInput = {
  provider: Provider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  pricing: UsageModelPricing[];
};

export type UsageCostEstimate =
  | {
      status: "estimated";
      currency: "USD";
      estimatedCostUsd: number;
      inputCostUsd: number;
      cachedInputCostUsd: number;
      outputCostUsd: number;
    }
  | {
      status: "unknown";
      currency: "USD";
      estimatedCostUsd: null;
      reason: "missing_model_pricing";
    };

export function estimateUsageCost(
  input: EstimateUsageCostInput
): UsageCostEstimate {
  const modelPricing = input.pricing.find(
    (pricing) =>
      pricing.provider === input.provider && pricing.model === input.model
  );

  if (!modelPricing) {
    return {
      status: "unknown",
      currency: "USD",
      estimatedCostUsd: null,
      reason: "missing_model_pricing"
    };
  }

  const cachedTokens = Math.min(input.cachedTokens, input.inputTokens);
  const uncachedInputTokens = input.inputTokens - cachedTokens;
  const cachedInputPrice =
    modelPricing.cachedInputUsdPerMillionTokens ??
    modelPricing.inputUsdPerMillionTokens;
  const inputCostUsd = costPerMillion(
    uncachedInputTokens,
    modelPricing.inputUsdPerMillionTokens
  );
  const cachedInputCostUsd = costPerMillion(cachedTokens, cachedInputPrice);
  const outputCostUsd = costPerMillion(
    input.outputTokens,
    modelPricing.outputUsdPerMillionTokens
  );

  return {
    status: "estimated",
    currency: "USD",
    estimatedCostUsd: roundUsd(
      inputCostUsd + cachedInputCostUsd + outputCostUsd
    ),
    inputCostUsd,
    cachedInputCostUsd,
    outputCostUsd
  };
}

function costPerMillion(tokens: number, usdPerMillionTokens: number): number {
  return roundUsd((tokens / 1_000_000) * usdPerMillionTokens);
}

function roundUsd(value: number): number {
  return Number(value.toFixed(12));
}
