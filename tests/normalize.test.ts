import { describe, expect, it } from "vitest";
import { normalizeText } from "../src/normalize";

describe("normalizeText", () => {
  it("normaliza tildes y espacios", () => {
    expect(normalizeText("  Féderíco   G  ")).toBe("federico g");
  });

  it("elimina prefijos y emojis comunes", () => {
    expect(normalizeText("✅ 1)   FEDE 😎")).toBe("fede");
  });
});
