import {
  createDefaultApiConfig,
  startApiServer
} from "./app.js";

const port = Number(process.env.TOKENFLOW_API_PORT ?? "3000");
const host = process.env.TOKENFLOW_API_HOST ?? "127.0.0.1";

const server = await startApiServer({
  config: createDefaultApiConfig(),
  host,
  port
});

process.stdout.write(`TokenFlow API listening on ${server.url}\n`);
