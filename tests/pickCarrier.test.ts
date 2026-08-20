import { describe, expect, it } from "vitest";
import {
  evaluateCarrierSelection,
  type PracticeHistoryRecord
} from "../src/pickCarrier";

type Player = {
  id: number;
  canonicalName: string;
};

function player(id: number, canonicalName: string): Player {
  return { id, canonicalName };
}

function record(
  date: string,
  carriedPlayerId: number,
  attendeeIds: number[]
): PracticeHistoryRecord {
  return { date, carriedPlayerId, attendeeIds };
}

function statById(stats: ReturnType<typeof evaluateCarrierSelection>["stats"], id: number) {
  const stat = stats.find((item) => item.playerId === id);
  if (!stat) {
    throw new Error(`No se encontro estadistica para el jugador ${id}.`);
  }
  return stat;
}

describe("evaluateCarrierSelection", () => {
  it("ignora a Gordo aunque sea el candidato natural", () => {
    const attendees = [player(1, "Gordo"), player(2, "Beto"), player(3, "Ana")];
    const history: PracticeHistoryRecord[] = [
      record("2026-01-01", 2, [1, 2, 3]),
      record("2026-01-08", 2, [1, 2, 3]),
      record("2026-01-15", 3, [1, 2, 3])
    ];

    const result = evaluateCarrierSelection(attendees, history);

    expect(result.selected.canonicalName).not.toBe("Gordo");
    expect(result.stats.some((stat) => stat.playerId === 1)).toBe(false);
  });

  it("falla si solo queda Gordo como asistente elegible", () => {
    const attendees = [player(1, "Gordo")];

    expect(() => evaluateCarrierSelection(attendees, [])).toThrow(
      "No hay asistentes elegibles para elegir."
    );
  });

  it("elige al que menos veces llevo cuando todos asistieron igual", () => {
    const attendees = [player(1, "Ana"), player(2, "Beto"), player(3, "Caro")];
    const history: PracticeHistoryRecord[] = [
      record("2026-01-01", 1, [1, 2, 3]),
      record("2026-01-08", 1, [1, 2, 3]),
      record("2026-01-15", 2, [1, 2, 3]),
      record("2026-01-22", 1, [1, 2, 3]),
      record("2026-01-29", 1, [1, 2, 3])
    ];

    const result = evaluateCarrierSelection(attendees, history);

    expect(result.selected.id).toBe(3);
    expect(statById(result.stats, 3).carryCount).toBe(0);
    expect(statById(result.stats, 1).carryCount).toBe(4);
  });

  it("desempata por recencia cuando la deuda es la misma", () => {
    const attendees = [player(1, "Ana"), player(2, "Beto")];
    const history: PracticeHistoryRecord[] = [
      record("2026-01-01", 1, [1, 2]),
      record("2026-01-08", 2, [1, 2]),
      record("2026-01-15", 1, [1, 2])
    ];

    const result = evaluateCarrierSelection(attendees, history);

    expect(result.selected.id).toBe(2);
    expect(statById(result.stats, 2).attendancesSinceLastCarry).toBe(1);
    expect(statById(result.stats, 1).attendancesSinceLastCarry).toBe(0);
  });

  it("penaliza a quien llevo en su ultima aparicion aunque haya faltado mucho tiempo", () => {
    const attendees = [player(1, "Ana"), player(2, "Beto")];
    const history: PracticeHistoryRecord[] = [
      record("2026-01-01", 2, [1, 2]),
      record("2026-03-01", 1, [1, 2]),
      record("2026-05-01", 1, [1, 2])
    ];

    const result = evaluateCarrierSelection(attendees, history);

    expect(result.selected.id).toBe(2);
    expect(statById(result.stats, 1).recencyPenalty).toBeGreaterThan(
      statById(result.stats, 2).recencyPenalty
    );
  });

  it("no exonera por completo al que asiste poco", () => {
    const attendees = [player(1, "Ana"), player(2, "Beto")];
    const history: PracticeHistoryRecord[] = [];

    for (let i = 1; i <= 20; i += 1) {
      const date = `2026-01-${String(i).padStart(2, "0")}`;
      history.push(record(date, 1, [1, 2]));
    }

    const result = evaluateCarrierSelection(attendees, history);
    const lowAttendance = statById(result.stats, 2);

    expect(lowAttendance.carryDebt).toBeGreaterThanOrEqual(0);
    expect(lowAttendance.finalScore).not.toBeNaN();
  });

  it("castiga a quien asiste poco y lo vuelve mas probable para llevar", () => {
    const attendees = [player(1, "Ana"), player(2, "Beto")];
    const history: PracticeHistoryRecord[] = [];

    for (let i = 1; i <= 100; i += 1) {
      const date = `2026-02-${String((i % 28) + 1).padStart(2, "0")}`;
      history.push(record(date, 1, i <= 5 ? [1, 2] : [1]));
    }

    const result = evaluateCarrierSelection(attendees, history);
    const big = statById(result.stats, 1);
    const small = statById(result.stats, 2);

    expect(small.attendanceCount).toBe(5);
    expect(big.attendanceCount).toBe(100);
    expect(small.expectedCarryCount).toBeGreaterThan(big.expectedCarryCount);
    expect(small.finalScore).toBeGreaterThan(big.finalScore);
    expect(small.expectedCarryCount / small.attendanceCount).toBeGreaterThan(
      big.expectedCarryCount / big.attendanceCount
    );
  });

  it("no arrastra deuda historica a un jugador nuevo", () => {
    const attendees = [player(1, "Ana"), player(2, "Beto")];
    const history: PracticeHistoryRecord[] = [
      record("2026-01-01", 1, [1]),
      record("2026-01-08", 1, [1]),
      record("2026-01-15", 1, [1])
    ];

    const result = evaluateCarrierSelection([...attendees, player(3, "Caro")], history);
    const newPlayer = statById(result.stats, 3);

    expect(newPlayer.attendanceCount).toBe(0);
    expect(newPlayer.carryCount).toBe(0);
    expect(newPlayer.carryDebt).toBe(0);
    expect(newPlayer.joinedAt).toBeNull();
  });

  it("si alguien tiene mucha deuda pero llevo en la practica anterior, puede perder contra otro candidato razonable", () => {
    const attendees = [player(1, "Ana"), player(2, "Beto")];
    const history: PracticeHistoryRecord[] = [
      record("2026-01-01", 2, [1, 2]),
      record("2026-01-08", 2, [1, 2]),
      record("2026-01-15", 2, [1, 2]),
      record("2026-01-22", 1, [1, 2])
    ];

    const result = evaluateCarrierSelection(attendees, history);

    expect(result.selected.id).toBe(2);
    expect(statById(result.stats, 1).recencyPenalty).toBeGreaterThan(
      statById(result.stats, 2).recencyPenalty
    );
  });

  it("aplica penalizacion a todos cuando todos llevaron recientemente", () => {
    const attendees = [player(1, "Ana"), player(2, "Beto"), player(3, "Caro")];
    const history: PracticeHistoryRecord[] = [
      record("2026-01-01", 1, [1, 2, 3]),
      record("2026-01-08", 2, [1, 2, 3]),
      record("2026-01-15", 3, [1, 2, 3])
    ];

    const result = evaluateCarrierSelection(attendees, history);

    expect(result.stats.every((stat) => stat.recencyPenalty > 0 || stat.carryCount === 0)).toBe(
      true
    );
  });

  it("maneja jugadores sin asignaciones previas", () => {
    const attendees = [player(1, "Ana"), player(2, "Beto")];
    const history: PracticeHistoryRecord[] = [
      record("2026-01-01", 1, [1, 2]),
      record("2026-01-08", 1, [1, 2])
    ];

    const result = evaluateCarrierSelection(attendees, history);

    expect(statById(result.stats, 2).carryCount).toBe(0);
    expect(statById(result.stats, 2).lastCarryDate).toBeNull();
    expect(result.selected.id).toBeDefined();
  });

  it("resuelve un empate total con sorteo en el ultimo paso", () => {
    const attendees = [player(1, "Ana"), player(2, "Beto")];
    const history: PracticeHistoryRecord[] = [];

    const result = evaluateCarrierSelection(attendees, history, undefined, () => 0.99);

    expect(result.stats[0].finalScore).toBeCloseTo(result.stats[1].finalScore, 10);
    expect(result.selected.id).toBe(2);
  });
});
