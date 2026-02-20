import { describe, expect, it } from "vitest";
import { resolvePlayers } from "../src/resolvePlayers";
import { parseList } from "../src/parseList";

describe("resolvePlayers", () => {
  it("resuelve por alias y reporta no mapeados", async () => {
    const parsed = parseList("Complejo 20hs\nFede\nNico\nDesconocido");
    const client = {
      alias: {
        findMany: async () => [
          {
            aliasNormalized: "fede",
            player: { id: 1, canonicalName: "Federico G", active: true }
          },
          {
            aliasNormalized: "nico",
            player: { id: 2, canonicalName: "Nicolas P", active: true }
          }
        ]
      }
    };

    const result = await resolvePlayers(parsed, client);
    expect(result.resolved.map((r) => r.player.canonicalName)).toEqual(["Federico G", "Nicolas P"]);
    expect(result.unresolved.map((u) => u.normalized)).toEqual(["desconocido"]);
  });
});
