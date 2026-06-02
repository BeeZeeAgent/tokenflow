import { describe, expect, it } from "vitest";
import {
  evaluatePolicy,
  getHealth,
  NormalizeRequestError,
  normalizeRequest
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
});
