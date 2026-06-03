import { describe, expect, it } from "vitest";
import {
  evaluatePolicy,
  evaluateRequestPolicy,
  getHealth,
  handleGatewayRequest,
  handleHttpGatewayRequest,
  NormalizeRequestError,
  normalizeRequest,
  createUsageEvent
} from "./index.js";

describe("@tokenflow/core entrypoint", () => {
  it("exports getHealth", () => {
    expect(getHealth()).toEqual({
      name: "@tokenflow/core",
      version: "0.1.0"
    });
  });

  it("exports normalizeRequest", () => {
    expect(typeof normalizeRequest).toBe("function");
  });

  it("exports NormalizeRequestError", () => {
    const error = new NormalizeRequestError("invalid_request", "Invalid request.");

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("invalid_request");
  });

  it("exports evaluatePolicy", () => {
    expect(typeof evaluatePolicy).toBe("function");
  });

  it("exports evaluateRequestPolicy", () => {
    expect(typeof evaluateRequestPolicy).toBe("function");
  });

  it("exports handleGatewayRequest", () => {
    expect(typeof handleGatewayRequest).toBe("function");
  });

  it("exports handleHttpGatewayRequest", () => {
    expect(typeof handleHttpGatewayRequest).toBe("function");
  });

  it("exports createUsageEvent", () => {
    expect(typeof createUsageEvent).toBe("function");
  });
});
