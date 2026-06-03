import { handleGatewayRequest } from "./handle-gateway-request.js";
import { NormalizeRequestError } from "../normalize/normalize-request.js";
import type {
  GatewayRequestInput,
  GatewayResponse,
  GatewayUsageInput
} from "./handle-gateway-request.js";
import type { PolicyRule } from "../policy/evaluate-policy.js";
import type {
  Provider,
  RetentionPolicy,
  TokenFlowMetadata
} from "../normalize/types.js";

export type HttpGatewayRequest = {
  method: string;
  path: string;
  headers: Record<string, string | undefined>;
  body: unknown;
  usage?: HttpGatewayUsageInput;
};

export type HttpGatewayUsageInput = Omit<GatewayUsageInput, "requestId">;

export type HttpGatewayAdapterConfig = {
  defaultMetadata: TokenFlowMetadata;
  defaultRetention: RetentionPolicy;
  rules: PolicyRule[];
  defaultAction?: "warn" | "redact" | "block";
};

export type HttpGatewayResponse = {
  status: number;
  provider?: Provider;
  body: unknown;
  gateway?: GatewayResponse;
};

export function handleHttpGatewayRequest(
  request: HttpGatewayRequest,
  config: HttpGatewayAdapterConfig
): HttpGatewayResponse {
  const provider = providerFromPath(request.path);

  if (!provider) {
    return {
      status: 422,
      provider: undefined,
      body: {
        error: {
          code: "unsupported_route",
          message: "Unsupported gateway route."
        }
      }
    };
  }

  if (request.method !== "POST") {
    return {
      status: 405,
      provider,
      body: {
        error: {
          code: "unsupported_method",
          message: "Only POST gateway requests are supported."
        }
      }
    };
  }

  if (!isValidMetadata(config.defaultMetadata)) {
    return {
      status: 500,
      provider,
      body: {
        error: {
          code: "invalid_adapter_config",
          message: "TokenFlow adapter metadata defaults are invalid."
        }
      }
    };
  }

  const gateway = tryHandleGatewayRequest({
    provider,
    metadata: metadataFromHeaders(request.headers, config.defaultMetadata),
    retention: config.defaultRetention,
    body: request.body as GatewayRequestInput["body"],
    rules: config.rules,
    defaultAction: config.defaultAction,
    usage: usageFromRequest(request)
  });

  if (gateway instanceof NormalizeRequestError) {
    return {
      status: 400,
      provider,
      body: {
        error: {
          code: "invalid_provider_request",
          validationCode: gateway.code,
          message: "Provider request body is invalid."
        }
      }
    };
  }

  if (gateway.decision === "block") {
    return {
      status: 403,
      provider,
      body: {
        error: {
          code: "policy_blocked",
          message: "Request blocked by TokenFlow policy."
        }
      },
      gateway
    };
  }

  if (gateway.decision === "redact") {
    return {
      status: 200,
      provider,
      body: gateway.redactedRequest,
      gateway
    };
  }

  return {
    status: 200,
    provider,
    body: gateway.upstreamBody,
    gateway
  };
}

function tryHandleGatewayRequest(
  input: GatewayRequestInput
): GatewayResponse | NormalizeRequestError {
  try {
    return handleGatewayRequest(input);
  } catch (error) {
    if (error instanceof NormalizeRequestError) {
      return error;
    }

    throw error;
  }
}

function providerFromPath(path: string): Provider | undefined {
  if (path === "/v1/chat/completions") {
    return "openai";
  }

  if (path === "/v1/messages") {
    return "anthropic";
  }

  return undefined;
}

function metadataFromHeaders(
  headers: HttpGatewayRequest["headers"],
  defaults: TokenFlowMetadata
): TokenFlowMetadata {
  return {
    actorId: headerOrDefault(headers, "x-tokenflow-actor-id", defaults.actorId),
    teamId: headerOrDefault(headers, "x-tokenflow-team-id", defaults.teamId),
    repo: headerOrDefault(headers, "x-tokenflow-repo", defaults.repo),
    harness: headerOrDefault(headers, "x-tokenflow-harness", defaults.harness),
    taskType: headerOrDefault(headers, "x-tokenflow-task-type", defaults.taskType),
    environment: headerOrDefault(
      headers,
      "x-tokenflow-environment",
      defaults.environment
    )
  };
}

function isValidMetadata(metadata: TokenFlowMetadata): boolean {
  return [
    metadata.actorId,
    metadata.teamId,
    metadata.repo,
    metadata.harness,
    metadata.taskType,
    metadata.environment
  ].every((field) => field.length > 0);
}

function headerOrDefault(
  headers: HttpGatewayRequest["headers"],
  name: string,
  defaultValue: string
): string {
  const value = headers[name];

  return value && value.length > 0 ? value : defaultValue;
}

function usageFromRequest(
  request: HttpGatewayRequest
): GatewayRequestInput["usage"] | undefined {
  if (!request.usage) {
    return undefined;
  }

  return {
    ...request.usage,
    requestId: headerOrDefault(
      request.headers,
      "x-tokenflow-request-id",
      "unknown-request"
    )
  };
}
