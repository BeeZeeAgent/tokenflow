import { describe, expect, it } from "vitest";
import { NormalizeRequestError, normalizeRequest } from "./normalize-request.js";

describe("normalizeRequest", () => {
  it("normalizes an OpenAI-style chat request", () => {
    const normalized = normalizeRequest({
      provider: "openai",
      metadata: {
        actorId: "user-1",
        teamId: "team-1",
        repo: "acme/api",
        harness: "codex",
        taskType: "exploratory-search",
        environment: "local"
      },
      retention: {
        storeRawPrompt: true,
        storeRawToolOutput: false
      },
      body: {
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: "Follow policy." },
          { role: "user", content: "Find auth refresh logic." }
        ]
      }
    });

    expect(normalized).toMatchObject({
      provider: "openai",
      model: "gpt-4.1-mini",
      metadata: {
        actorId: "user-1",
        teamId: "team-1",
        repo: "acme/api",
        harness: "codex",
        taskType: "exploratory-search",
        environment: "local"
      },
      messages: [
        { role: "system", text: "Follow policy." },
        { role: "user", text: "Find auth refresh logic." }
      ],
      retention: {
        storeRawPrompt: true,
        storeRawToolOutput: false
      }
    });
  });

  it("omits raw prompt text when raw prompt retention is disabled", () => {
    const normalized = normalizeRequest({
      provider: "openai",
      metadata: {
        actorId: "user-1",
        teamId: "team-1",
        repo: "acme/api",
        harness: "codex",
        taskType: "exploratory-search",
        environment: "local"
      },
      retention: {
        storeRawPrompt: false,
        storeRawToolOutput: false
      },
      body: {
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: "Secret prompt text" }]
      }
    });

    expect(normalized.messages).toEqual([
      {
        role: "user",
        text: "[raw prompt omitted]",
        originalLength: "Secret prompt text".length
      }
    ]);
  });

  it("normalizes an Anthropic-style messages request", () => {
    const normalized = normalizeRequest({
      provider: "anthropic",
      metadata: {
        actorId: "user-1",
        teamId: "team-1",
        repo: "acme/api",
        harness: "claude-code",
        taskType: "architecture-reasoning",
        environment: "local"
      },
      retention: {
        storeRawPrompt: true,
        storeRawToolOutput: false
      },
      body: {
        model: "claude-sonnet-4-5",
        system: "Follow enterprise policy.",
        messages: [
          { role: "user", content: "Map the gateway flow." },
          { role: "assistant", content: "I will inspect the gateway." }
        ]
      }
    });

    expect(normalized).toMatchObject({
      provider: "anthropic",
      model: "claude-sonnet-4-5",
      metadata: {
        actorId: "user-1",
        teamId: "team-1",
        repo: "acme/api",
        harness: "claude-code",
        taskType: "architecture-reasoning",
        environment: "local"
      },
      messages: [
        { role: "system", text: "Follow enterprise policy." },
        { role: "user", text: "Map the gateway flow." },
        { role: "assistant", text: "I will inspect the gateway." }
      ],
      retention: {
        storeRawPrompt: true,
        storeRawToolOutput: false
      }
    });
  });

  it("omits Anthropic raw prompt text when raw prompt retention is disabled", () => {
    const normalized = normalizeRequest({
      provider: "anthropic",
      metadata: {
        actorId: "user-1",
        teamId: "team-1",
        repo: "acme/api",
        harness: "claude-code",
        taskType: "architecture-reasoning",
        environment: "local"
      },
      retention: {
        storeRawPrompt: false,
        storeRawToolOutput: false
      },
      body: {
        model: "claude-sonnet-4-5",
        system: "Sensitive system prompt",
        messages: [{ role: "user", content: "Sensitive user prompt" }]
      }
    });

    expect(normalized.messages).toEqual([
      {
        role: "system",
        text: "[raw prompt omitted]",
        originalLength: "Sensitive system prompt".length
      },
      {
        role: "user",
        text: "[raw prompt omitted]",
        originalLength: "Sensitive user prompt".length
      }
    ]);
  });

  it("rejects unsupported providers with a stable validation error", () => {
    expectInvalidRequest(
      {
        provider: "unsupported",
        metadata: validMetadata(),
        retention: validRetention(),
        body: {
          model: "unknown-model",
          messages: [{ role: "user", content: "Hello" }]
        }
      },
      "invalid_provider"
    );
  });

  it("rejects requests with missing metadata", () => {
    expectInvalidRequest(
      {
        provider: "openai",
        retention: validRetention(),
        body: {
          model: "gpt-4.1-mini",
          messages: [{ role: "user", content: "Hello" }]
        }
      },
      "invalid_metadata"
    );
  });

  it("rejects requests with missing model", () => {
    expectInvalidRequest(
      {
        provider: "openai",
        metadata: validMetadata(),
        retention: validRetention(),
        body: {
          messages: [{ role: "user", content: "Hello" }]
        }
      },
      "invalid_model"
    );
  });

  it("rejects requests with missing messages", () => {
    expectInvalidRequest(
      {
        provider: "openai",
        metadata: validMetadata(),
        retention: validRetention(),
        body: {
          model: "gpt-4.1-mini"
        }
      },
      "invalid_messages"
    );
  });

  it("rejects requests with invalid message content", () => {
    expectInvalidRequest(
      {
        provider: "openai",
        metadata: validMetadata(),
        retention: validRetention(),
        body: {
          model: "gpt-4.1-mini",
          messages: [{ role: "user", content: 42 }]
        }
      },
      "invalid_message_content"
    );
  });

  it("rejects Anthropic requests with invalid system content", () => {
    expectInvalidRequest(
      {
        provider: "anthropic",
        metadata: validMetadata(),
        retention: validRetention(),
        body: {
          model: "claude-sonnet-4-5",
          system: 42,
          messages: [{ role: "user", content: "Hello" }]
        }
      },
      "invalid_system"
    );
  });
});

function expectInvalidRequest(input: unknown, code: string) {
  try {
    normalizeRequest(input as never);
  } catch (error) {
    expect(error).toBeInstanceOf(NormalizeRequestError);
    expect((error as NormalizeRequestError).code).toBe(code);
    return;
  }

  throw new Error("Expected normalizeRequest to throw");
}

function validMetadata() {
  return {
    actorId: "user-1",
    teamId: "team-1",
    repo: "acme/api",
    harness: "codex",
    taskType: "exploratory-search",
    environment: "local"
  };
}

function validRetention() {
  return {
    storeRawPrompt: true,
    storeRawToolOutput: false
  };
}
