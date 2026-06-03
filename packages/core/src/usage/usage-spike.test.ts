import { describe, expect, expectTypeOf, it } from "vitest";
import { detectUsageSpike } from "./usage-spike.js";
import type {
  DetectUsageSpikeInput,
  UsageSpike,
  UsageSpikeThresholds
} from "./usage-spike.js";

describe("usage spike detection", () => {
  it("emits a token spike when total tokens cross the configured threshold", () => {
    expect(
      detectUsageSpike({
        totalTokens: 1_200,
        estimatedCostUsd: null,
        thresholds: {
          totalTokens: 1_000
        }
      })
    ).toEqual({
      triggered: true,
      reasons: [
        {
          code: "total_tokens_threshold_exceeded",
          observed: 1_200,
          threshold: 1_000
        }
      ]
    });
  });

  it("emits a cost spike when estimated cost crosses the configured threshold", () => {
    expect(
      detectUsageSpike({
        totalTokens: 100,
        estimatedCostUsd: 2.5,
        thresholds: {
          estimatedCostUsd: 2
        }
      })
    ).toEqual({
      triggered: true,
      reasons: [
        {
          code: "estimated_cost_threshold_exceeded",
          observed: 2.5,
          threshold: 2
        }
      ]
    });
  });

  it("returns both spike reasons in deterministic order", () => {
    expect(
      detectUsageSpike({
        totalTokens: 2_000,
        estimatedCostUsd: 5,
        thresholds: {
          totalTokens: 1_000,
          estimatedCostUsd: 2
        }
      }).reasons.map((reason) => reason.code)
    ).toEqual([
      "total_tokens_threshold_exceeded",
      "estimated_cost_threshold_exceeded"
    ]);
  });

  it("does not trigger when values are at or below thresholds", () => {
    expect(
      detectUsageSpike({
        totalTokens: 1_000,
        estimatedCostUsd: 2,
        thresholds: {
          totalTokens: 1_000,
          estimatedCostUsd: 2
        }
      })
    ).toEqual({
      triggered: false,
      reasons: []
    });
  });

  it("ignores cost threshold when estimated cost is unknown", () => {
    expect(
      detectUsageSpike({
        totalTokens: 100,
        estimatedCostUsd: null,
        thresholds: {
          estimatedCostUsd: 2
        }
      })
    ).toEqual({
      triggered: false,
      reasons: []
    });
  });

  it("exports spike detection types", () => {
    expectTypeOf<UsageSpikeThresholds>().toMatchTypeOf<{
      totalTokens?: number;
      estimatedCostUsd?: number;
    }>();
    expectTypeOf<DetectUsageSpikeInput>().toMatchTypeOf<{
      totalTokens: number;
      estimatedCostUsd: number | null;
      thresholds: UsageSpikeThresholds;
    }>();
    expectTypeOf<UsageSpike>().toMatchTypeOf<{
      triggered: boolean;
      reasons: Array<{
        code:
          | "total_tokens_threshold_exceeded"
          | "estimated_cost_threshold_exceeded";
        observed: number;
        threshold: number;
      }>;
    }>();
  });
});
