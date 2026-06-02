import { describe, expect, it } from "vitest";
import { getHealth } from "./health.js";

describe("getHealth", () => {
  it("returns package name and version", () => {
    expect(getHealth()).toEqual({
      name: "@tokenflow/core",
      version: "0.1.0"
    });
  });
});
