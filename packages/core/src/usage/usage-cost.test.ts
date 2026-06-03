import { describe, expect, expectTypeOf, it } from "vitest";
import { estimateUsageCost } from "./usage-cost.js";
import type {
  EstimateUsageCostInput,
  UsageCostEstimate,
  UsageModelPricing
} from "./usage-cost.js";

const pricing = [
  {
    provider: "openai",
    model: "gpt-4.1-mini",
    inputUsdPerMillionTokens: 0.4,
    outputUsdPerMillionTokens: 1.6,
    cachedInputUsdPerMillionTokens: 0.1
  }
] satisfies UsageModelPricing[];

describe("usage cost estimation", () => {
  it("estimates input, cached input, and output token cost from model pricing", () => {
    expect(
      estimateUsageCost({
        provider: "openai",
        model: "gpt-4.1-mini",
        inputTokens: 1_000_000,
        outputTokens: 500_000,
        cachedTokens: 250_000,
        pricing
      })
    ).toEqual({
      status: "estimated",
      currency: "USD",
      estimatedCostUsd: 1.125,
      inputCostUsd: 0.3,
      cachedInputCostUsd: 0.025,
      outputCostUsd: 0.8
    });
  });

  it("uses input pricing for cached tokens when no cached price is configured", () => {
    expect(
      estimateUsageCost({
        provider: "openai",
        model: "gpt-4.1-mini",
        inputTokens: 100,
        outputTokens: 0,
        cachedTokens: 25,
        pricing: [
          {
            provider: "openai",
            model: "gpt-4.1-mini",
            inputUsdPerMillionTokens: 1,
            outputUsdPerMillionTokens: 2
          }
        ]
      })
    ).toMatchObject({
      status: "estimated",
      estimatedCostUsd: 0.0001
    });
  });

  it("returns an explicit unknown result when model pricing is missing", () => {
    expect(
      estimateUsageCost({
        provider: "anthropic",
        model: "claude-sonnet-4",
        inputTokens: 100,
        outputTokens: 50,
        cachedTokens: 0,
        pricing
      })
    ).toEqual({
      status: "unknown",
      currency: "USD",
      estimatedCostUsd: null,
      reason: "missing_model_pricing"
    });
  });

  it("exports cost estimation types", () => {
    expectTypeOf<UsageModelPricing>().toMatchTypeOf<{
      provider: "openai" | "anthropic";
      model: string;
      inputUsdPerMillionTokens: number;
      outputUsdPerMillionTokens: number;
      cachedInputUsdPerMillionTokens?: number;
    }>();
    expectTypeOf<EstimateUsageCostInput>().toMatchTypeOf<{
      provider: "openai" | "anthropic";
      model: string;
      inputTokens: number;
      outputTokens: number;
      cachedTokens: number;
      pricing: UsageModelPricing[];
    }>();
    expectTypeOf<UsageCostEstimate>().toMatchTypeOf<
      | {
          status: "estimated";
          estimatedCostUsd: number;
        }
      | {
          status: "unknown";
          estimatedCostUsd: null;
          reason: "missing_model_pricing";
        }
    >();
  });
});
