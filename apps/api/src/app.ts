import { createServer } from "node:http";
import type {
  IncomingHttpHeaders,
  IncomingMessage,
  Server,
  ServerResponse
} from "node:http";
import type { AddressInfo } from "node:net";
import {
  handleHttpGatewayRequest
} from "@tokenflow/core";
import type {
  HttpGatewayAdapterConfig,
  HttpGatewayRequest,
  HttpGatewayResponse
} from "@tokenflow/core";

export type ApiConfig = HttpGatewayAdapterConfig;

export type ApiRequest = HttpGatewayRequest;

export type ApiResponse = {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  gateway?: ApiGatewayMetadata;
};

export type ApiGatewayMetadata = NonNullable<HttpGatewayResponse["gateway"]> & {
  provider?: HttpGatewayResponse["provider"];
};

export type ApiApp = {
  handle: (request: ApiRequest) => Promise<ApiResponse>;
};

export type StartApiServerInput = {
  config: ApiConfig;
  port: number;
  host?: string;
};

export type ApiServer = {
  url: string;
  close: () => Promise<void>;
};

export function createDefaultApiConfig(): ApiConfig {
  return {
    defaultMetadata: {
      actorId: "anonymous",
      teamId: "default-team",
      repo: "unknown",
      harness: "api",
      taskType: "unknown",
      environment: "dev"
    },
    defaultRetention: {
      storeRawPrompt: true,
      storeRawToolOutput: false
    },
    rules: []
  };
}

export function createApiApp(config: ApiConfig): ApiApp {
  return {
    async handle(request) {
      const response = handleHttpGatewayRequest(request, config);

      return toApiResponse(response);
    }
  };
}

export async function startApiServer(
  input: StartApiServerInput
): Promise<ApiServer> {
  const app = createApiApp(input.config);
  const server = createServer((request, response) => {
    void handleNodeRequest(app, request, response);
  });

  await listen(server, input.port, input.host);

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("API server did not expose a TCP address.");
  }

  const host = address.address === "::" ? "127.0.0.1" : address.address;

  return {
    url: `http://${host}:${address.port}`,
    close: () => close(server)
  };
}

async function handleNodeRequest(
  app: ApiApp,
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  const bodyResult = await readJsonBody(request);

  if (!bodyResult.ok) {
    writeJson(response, {
      status: 400,
      headers: {
        "content-type": "application/json"
      },
      body: {
        error: {
          code: "invalid_json",
          message: "Request body must be valid JSON."
        }
      }
    });
    return;
  }

  const apiResponse = await app.handle({
    method: request.method ?? "GET",
    path: request.url ?? "/",
    headers: normalizeHeaders(request.headers),
    body: bodyResult.body
  });

  writeJson(response, apiResponse);
}

function toApiResponse(response: HttpGatewayResponse): ApiResponse {
  return {
    status: response.status,
    headers: {
      "content-type": "application/json"
    },
    body: response.body,
    gateway: response.gateway
      ? {
          ...response.gateway,
          provider: response.provider
        }
      : undefined
  };
}

function normalizeHeaders(
  headers: IncomingHttpHeaders
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name.toLowerCase(),
      Array.isArray(value) ? value[0] : value
    ])
  );
}

async function readJsonBody(
  request: IncomingMessage
): Promise<{ ok: true; body: unknown } | { ok: false }> {
  const rawBody = await readBody(request);

  if (rawBody.length === 0) {
    return {
      ok: true,
      body: {}
    };
  }

  try {
    return {
      ok: true,
      body: JSON.parse(rawBody) as unknown
    };
  } catch {
    return {
      ok: false
    };
  }
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function writeJson(response: ServerResponse, apiResponse: ApiResponse): void {
  response.writeHead(apiResponse.status, apiResponse.headers);
  response.end(
    JSON.stringify(
      apiResponse.gateway
        ? {
            body: apiResponse.body,
            gateway: apiResponse.gateway
          }
        : apiResponse.body
    )
  );
}

function listen(
  server: Server,
  port: number,
  host?: string
): Promise<AddressInfo> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve(server.address() as AddressInfo);
    });
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
