import { afterEach, describe, expect, it } from "vitest";
import {
  createApiApp,
  createDefaultApiConfig,
  startApiServer
} from "./app.js";
import type {
  ApiApp,
  ApiRequest,
  ApiResponse
} from "./app.js";

const servers: Array<{ close: () => Promise<void> }> = [];

afterEach(async () => {
  await Promise.all(servers.map((server) => server.close()));
  servers.length = 0;
});

describe("API app", () => {
  it("handles OpenAI-compatible chat completion requests", async () => {
    const app = createApiApp({
      ...createDefaultApiConfig(),
      rules: [{ category: "email", action: "warn" }]
    });

    const response = await app.handle({
      method: "POST",
      path: "/v1/chat/completions",
      headers: {
        "x-tokenflow-harness": "codex"
      },
      body: {
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: "Email jane@example.com." }]
      }
    });

    expect(response).toMatchObject({
      status: 200,
      headers: {
        "content-type": "application/json"
      },
      body: {
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: "Email jane@example.com." }]
      },
      gateway: {
        provider: "openai",
        decision: "warn"
      }
    });
  });

  it("handles Anthropic-compatible messages requests", async () => {
    const app = createApiApp(createDefaultApiConfig());

    const response = await app.handle({
      method: "POST",
      path: "/v1/messages",
      headers: {},
      body: {
        model: "claude-sonnet-4",
        system: "Keep data private.",
        messages: [{ role: "user", content: "Review public notes." }]
      }
    });

    expect(response.status).toBe(200);
    expect(response.gateway?.provider).toBe("anthropic");
    expect(response.gateway?.decision).toBe("allow");
  });

  it("returns structured errors for unsupported routes", async () => {
    const app = createApiApp(createDefaultApiConfig());

    await expect(
      app.handle({
        method: "POST",
        path: "/v1/unknown",
        headers: {},
        body: {}
      })
    ).resolves.toEqual({
      status: 422,
      headers: {
        "content-type": "application/json"
      },
      body: {
        error: {
          code: "unsupported_route",
          message: "Unsupported gateway route."
        }
      }
    });
  });

  it("returns structured errors for invalid JSON in the Node server", async () => {
    const server = await startApiServer({
      config: createDefaultApiConfig(),
      port: 0
    });
    servers.push(server);

    const response = await fetch(`${server.url}/v1/chat/completions`, {
      method: "POST",
      body: "{not json",
      headers: {
        "content-type": "application/json"
      }
    });

    await expect(response.json()).resolves.toEqual({
      error: {
        code: "invalid_json",
        message: "Request body must be valid JSON."
      }
    });
    expect(response.status).toBe(400);
  });

  it("serves gateway routes over a runnable Node HTTP server", async () => {
    const server = await startApiServer({
      config: {
        ...createDefaultApiConfig(),
        defaultRolloutMode: "observe",
        rules: [{ category: "api_key", action: "block" }]
      },
      port: 0
    });
    servers.push(server);

    const response = await fetch(`${server.url}/v1/chat/completions`, {
      method: "POST",
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: "Use key sk-abc123SECRETxyz789." }]
      }),
      headers: {
        "content-type": "application/json",
        "x-tokenflow-harness": "codex"
      }
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.gateway).toMatchObject({
      provider: "openai",
      decision: "observe",
      observedDecision: "block"
    });
  });

  it("exports API app types", () => {
    const app = createApiApp(createDefaultApiConfig());

    expectTypeShape<ApiApp>(app);
    expectTypeShape<ApiRequest>({
      method: "POST",
      path: "/v1/chat/completions",
      headers: {},
      body: {}
    });
    expectTypeShape<ApiResponse>({
      status: 200,
      headers: {
        "content-type": "application/json"
      },
      body: {}
    });
  });
});

function expectTypeShape<T>(_value: T): void {
  expect(true).toBe(true);
}
