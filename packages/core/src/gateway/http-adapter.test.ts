import { describe, expect, expectTypeOf, it } from "vitest";
import { handleHttpGatewayRequest } from "./http-adapter.js";
import type {
  HttpGatewayAdapterConfig,
  HttpGatewayRequest,
  HttpGatewayResponse
} from "./http-adapter.js";

const baseConfig = {
  defaultMetadata: {
    actorId: "anonymous",
    teamId: "default-team",
    repo: "unknown",
    harness: "http",
    taskType: "unknown",
    environment: "dev"
  },
  defaultRetention: {
    storeRawPrompt: true,
    storeRawToolOutput: false
  },
  rules: []
} satisfies HttpGatewayAdapterConfig;

describe("HTTP gateway adapter", () => {
  it("adapts OpenAI chat completion requests from an HTTP-like envelope", () => {
    const body = {
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: "Review public architecture notes." }]
    };

    expect(
      handleHttpGatewayRequest(
        {
          method: "POST",
          path: "/v1/chat/completions",
          headers: {
            "x-tokenflow-actor-id": "user-1",
            "x-tokenflow-team-id": "team-1",
            "x-tokenflow-repo": "tokenflow",
            "x-tokenflow-harness": "codex",
            "x-tokenflow-task-type": "execute",
            "x-tokenflow-environment": "dev"
          },
          body
        },
        baseConfig
      )
    ).toMatchObject({
      status: 200,
      provider: "openai",
      body,
      gateway: {
        decision: "allow"
      }
    });
  });

  it("adapts Anthropic messages requests from an HTTP-like envelope", () => {
    const result = handleHttpGatewayRequest(
      {
        method: "POST",
        path: "/v1/messages",
        headers: {},
        body: {
          model: "claude-sonnet-4",
          system: "Keep data private.",
          messages: [{ role: "user", content: "Review public architecture notes." }]
        }
      },
      baseConfig
    );

    expect(result.status).toBe(200);
    expect(result.provider).toBe("anthropic");
    expect(result.gateway?.normalizedRequest.messages).toEqual([
      { role: "system", text: "Keep data private." },
      { role: "user", text: "Review public architecture notes." }
    ]);
  });

  it("returns a 422 response for unsupported provider routes", () => {
    expect(
      handleHttpGatewayRequest(
        {
          method: "POST",
          path: "/v1/unknown",
          headers: {},
          body: {}
        },
        baseConfig
      )
    ).toEqual({
      status: 422,
      provider: undefined,
      body: {
        error: {
          code: "unsupported_route",
          message: "Unsupported gateway route."
        }
      }
    });
  });

  it("returns a 403 response when policy blocks the request", () => {
    const result = handleHttpGatewayRequest(
      {
        method: "POST",
        path: "/v1/chat/completions",
        headers: {},
        body: {
          model: "gpt-4.1-mini",
          messages: [{ role: "user", content: "Use key sk-abc123SECRETxyz789." }]
        }
      },
      {
        ...baseConfig,
        rules: [{ category: "api_key", action: "block" }]
      }
    );

    expect(result).toMatchObject({
      status: 403,
      provider: "openai",
      body: {
        error: {
          code: "policy_blocked",
          message: "Request blocked by TokenFlow policy."
        }
      },
      gateway: {
        decision: "block"
      }
    });
  });

  it("returns a redacted normalized body when policy redacts the request", () => {
    const result = handleHttpGatewayRequest(
      {
        method: "POST",
        path: "/v1/chat/completions",
        headers: {},
        body: {
          model: "gpt-4.1-mini",
          messages: [{ role: "user", content: "Email jane@example.com." }]
        }
      },
      {
        ...baseConfig,
        rules: [{ category: "email", action: "redact" }]
      }
    );

    expect(result.status).toBe(200);
    expect(result.gateway?.decision).toBe("redact");
    expect(result.body).toEqual({
      provider: "openai",
      model: "gpt-4.1-mini",
      metadata: baseConfig.defaultMetadata,
      retention: baseConfig.defaultRetention,
      messages: [{ role: "user", text: "Email [REDACTED_EMAIL]." }]
    });
  });

  it("exports HTTP adapter types", () => {
    expectTypeOf<HttpGatewayRequest>().toMatchTypeOf<{
      method: string;
      path: string;
      headers: Record<string, string | undefined>;
      body: unknown;
    }>();
    expectTypeOf<HttpGatewayAdapterConfig>().toMatchTypeOf<{
      defaultMetadata: {
        actorId: string;
        teamId: string;
        repo: string;
        harness: string;
        taskType: string;
        environment: string;
      };
      defaultRetention: {
        storeRawPrompt: boolean;
        storeRawToolOutput: boolean;
      };
      rules: Array<{ category: string; action: "allow" | "warn" | "redact" | "block" }>;
    }>();
    expectTypeOf<HttpGatewayResponse>().toMatchTypeOf<{
      status: number;
      provider?: "openai" | "anthropic";
      body: unknown;
      gateway?: unknown;
    }>();
  });
});
