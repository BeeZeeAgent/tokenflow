import { describe, expectTypeOf, it } from "vitest";
import type {
  NormalizedMessage,
  NormalizedRequest,
  NormalizeRequestInput,
  TokenFlowMetadata
} from "./types.js";

describe("normalization types", () => {
  it("supports normalized request shape", () => {
    expectTypeOf<NormalizedRequest>().toMatchTypeOf<{
      provider: "openai" | "anthropic";
      model: string;
      metadata: TokenFlowMetadata;
      retention: {
        storeRawPrompt: boolean;
        storeRawToolOutput: boolean;
      };
      messages: NormalizedMessage[];
    }>();
  });

  it("supports normalize request input shape", () => {
    expectTypeOf<NormalizeRequestInput>().toMatchTypeOf<{
      provider: "openai" | "anthropic";
      metadata: TokenFlowMetadata;
      retention: {
        storeRawPrompt: boolean;
        storeRawToolOutput: boolean;
      };
      body: {
        model: string;
        messages: Array<{
          role: "system" | "user" | "assistant" | "tool";
          content: string;
        }>;
      };
    }>();
  });
});
