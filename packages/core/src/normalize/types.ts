export type Provider = "openai" | "anthropic";

export type MessageRole = "system" | "user" | "assistant" | "tool";

export type TokenFlowMetadata = {
  actorId: string;
  teamId: string;
  repo: string;
  harness: string;
  taskType: string;
  environment: string;
};

export type RetentionPolicy = {
  storeRawPrompt: boolean;
  storeRawToolOutput: boolean;
};

export type ProviderMessage = {
  role: MessageRole;
  content: string;
};

export type OpenAIRequestBody = {
  model: string;
  messages: ProviderMessage[];
};

export type AnthropicRequestBody = {
  model: string;
  system?: string;
  messages: ProviderMessage[];
};

export type NormalizeRequestInput = {
  provider: Provider;
  metadata: TokenFlowMetadata;
  retention: RetentionPolicy;
  body: OpenAIRequestBody | AnthropicRequestBody;
};

export type NormalizedMessage =
  | {
      role: MessageRole;
      text: string;
    }
  | {
      role: MessageRole;
      text: "[raw prompt omitted]";
      originalLength: number;
    };

export type NormalizedRequest = {
  provider: Provider;
  model: string;
  metadata: TokenFlowMetadata;
  retention: RetentionPolicy;
  messages: NormalizedMessage[];
};
