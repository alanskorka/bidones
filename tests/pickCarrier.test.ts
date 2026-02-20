import { describe, expect, it } from "vitest";
import { pickCarrier } from "../src/pickCarrier";

describe("pickCarrier", () => {
  it("desempata por last_carried_at cuando times_carried es igual", async () => {
    const attendees = [
      { id: 1, canonicalName: "Ana" },
      { id: 2, canonicalName: "Beto" }
    ];

    const client = {
      carryLog: {
        groupBy: async () => [
          { playerId: 1, _count: { _all: 2 }, _max: { date: "2026-02-10" } },
          { playerId: 2, _count: { _all: 2 }, _max: { date: "2026-01-10" } }
        ]
      }
    };

    const result = await pickCarrier(attendees, client);
    expect(result.selected.canonicalName).toBe("Beto");
  });

  it("desempata alfabeticamente si todo lo demas empata", async () => {
    const attendees = [
      { id: 1, canonicalName: "Carlos" },
      { id: 2, canonicalName: "Bruno" }
    ];

    const client = {
      carryLog: {
        groupBy: async () => [
          { playerId: 1, _count: { _all: 1 }, _max: { date: "2026-02-01" } },
          { playerId: 2, _count: { _all: 1 }, _max: { date: "2026-02-01" } }
        ]
      }
    };

    const result = await pickCarrier(attendees, client);
    expect(result.selected.canonicalName).toBe("Bruno");
  });
});
