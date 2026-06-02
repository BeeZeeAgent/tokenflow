import type {
  AnthropicRequestBody,
  MessageRole,
  NormalizedRequest,
  NormalizeRequestInput,
  ProviderMessage,
  RetentionPolicy,
  TokenFlowMetadata
} from "./types.js";

export class NormalizeRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "NormalizeRequestError";
  }
}

export function normalizeRequest(input: NormalizeRequestInput): NormalizedRequest {
  validateRequest(input as unknown);

  const messages =
    input.provider === "anthropic"
      ? normalizeAnthropicMessages(input.body as AnthropicRequestBody)
      : input.body.messages;

  return {
    provider: input.provider,
    model: input.body.model,
    metadata: input.metadata,
    retention: input.retention,
    messages: messages.map((message) => normalizeMessage(message, input.retention))
  };
}

function validateRequest(input: unknown): asserts input is NormalizeRequestInput {
  if (!isRecord(input)) {
    throwInvalid("invalid_request", "Request must be an object.");
  }

  if (input.provider !== "openai" && input.provider !== "anthropic") {
    throwInvalid("invalid_provider", "Provider must be one of: openai, anthropic.");
  }

  if (!isMetadata(input.metadata)) {
    throwInvalid("invalid_metadata", "Metadata is required and must contain string fields.");
  }

  if (!isRetentionPolicy(input.retention)) {
    throwInvalid("invalid_retention", "Retention policy is required.");
  }

  if (!isRecord(input.body)) {
    throwInvalid("invalid_body", "Body is required and must be an object.");
  }

  if (typeof input.body.model !== "string" || input.body.model.length === 0) {
    throwInvalid("invalid_model", "Model is required.");
  }

  if (!Array.isArray(input.body.messages)) {
    throwInvalid("invalid_messages", "Messages are required.");
  }

  if (input.provider === "anthropic" && "system" in input.body) {
    if (input.body.system !== undefined && typeof input.body.system !== "string") {
      throwInvalid("invalid_system", "Anthropic system prompt must be a string.");
    }
  }

  for (const message of input.body.messages) {
    if (!isRecord(message) || !isMessageRole(message.role)) {
      throwInvalid("invalid_message", "Message role is invalid.");
    }

    if (typeof message.content !== "string") {
      throwInvalid("invalid_message_content", "Message content must be a string.");
    }
  }
}

function isMetadata(value: unknown): value is TokenFlowMetadata {
  if (!isRecord(value)) {
    return false;
  }

  return [
    value.actorId,
    value.teamId,
    value.repo,
    value.harness,
    value.taskType,
    value.environment
  ].every((field) => typeof field === "string" && field.length > 0);
}

function isRetentionPolicy(value: unknown): value is RetentionPolicy {
  return (
    isRecord(value) &&
    typeof value.storeRawPrompt === "boolean" &&
    typeof value.storeRawToolOutput === "boolean"
  );
}

function isMessageRole(value: unknown): value is MessageRole {
  return value === "system" || value === "user" || value === "assistant" || value === "tool";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function throwInvalid(code: string, message: string): never {
  throw new NormalizeRequestError(code, message);
}

function normalizeAnthropicMessages(body: AnthropicRequestBody): ProviderMessage[] {
  if (!body.system) {
    return body.messages;
  }

  return [{ role: "system", content: body.system }, ...body.messages];
}

function normalizeMessage(message: ProviderMessage, retention: RetentionPolicy) {
  if (retention.storeRawPrompt) {
    return {
      role: message.role,
      text: message.content
    };
  }

  return {
    role: message.role,
    text: "[raw prompt omitted]",
    originalLength: message.content.length
  };
}
