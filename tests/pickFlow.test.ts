import { describe, expect, it, vi } from "vitest";
import { executePickFlow } from "../src/services/pickFlow";

describe("executePickFlow fail-safe", () => {
  it("no inserta carry_log si hay nombres sin mapear", async () => {
    const create = vi.fn();
    const groupBy = vi.fn();

    const prisma = {
      team: {
        findUnique: async () => ({ id: 1, name: "Hebraica", active: true }),
        create: async () => ({ id: 1, name: "Hebraica", active: true })
      },
      alias: {
        findMany: async () => []
      },
      carryLog: {
        groupBy,
        create
      }
    };

    const result = await executePickFlow({
      prisma,
      date: "2026-02-20",
      rawListText: "Aduana 19.15\nJugador Fantasma"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unresolved");
      expect(result.unresolvedNames).toEqual(["Jugador Fantasma"]);
    }
    expect(create).not.toHaveBeenCalled();
    expect(groupBy).not.toHaveBeenCalled();
  });
});
