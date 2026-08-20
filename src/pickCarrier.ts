import { parseList } from "./parseList";
import { normalizeText } from "./normalize";

export type AttendeePlayer = {
  id: number;
  canonicalName: string;
};

type AliasRow = {
  aliasNormalized: string;
  player: {
    id: number;
    canonicalName: string;
  };
};

type HistoryRow = {
  date: string;
  playerId: number;
  rawListText: string;
  createdAt?: string | Date;
};

export type PracticeHistoryRecord = {
  date: string;
  attendeeIds: number[];
  carriedPlayerId: number;
};

export type CarrierSelectionConfig = {
  alpha: number;
  onboardingBase: number;
  recencyPenalty: {
    sameAttendance: number;
    previousAttendance: number;
    twoAttendancesAgo: number;
    older: number;
  };
  scoreEpsilon: number;
};

export const DEFAULT_CARRIER_SELECTION_CONFIG: CarrierSelectionConfig = {
  alpha: 0.35,
  onboardingBase: 2,
  recencyPenalty: {
    sameAttendance: 100,
    previousAttendance: 2,
    twoAttendancesAgo: 1,
    older: 0
  },
  scoreEpsilon: 0.01
};

const NEVER_CARRY_NORMALIZED_NAMES = new Set(["gordo"]);

export type PlayerPickStat = {
  playerId: number;
  attendanceCount: number;
  carryCount: number;
  joinedAt: string | null;
  lastCarryDate: string | null;
  lastCarryAttendanceNumber: number | null;
  attendanceWeight: number;
  expectedCarryCount: number;
  carryDebt: number;
  attendancesSinceLastCarry: number | null;
  recencyPenalty: number;
  finalScore: number;
  selected: boolean;
};

export type PickResult = {
  selected: AttendeePlayer;
  stats: PlayerPickStat[];
};

type PickClient = {
  alias: {
    findMany: (args: {
      where: {
        teamId: number;
      };
      include: { player: true };
    }) => Promise<AliasRow[]>;
  };
  carryLog: {
    findMany: (args: {
      where: {
        teamId: number;
        date?: {
          lt?: string;
        };
      };
      orderBy?: Array<{ date: "asc" | "desc" } | { createdAt: "asc" | "desc" }>;
    }) => Promise<HistoryRow[]>;
  };
};

export type PickCarrierOptions = {
  teamId: number;
  currentDate?: string;
  config?: Partial<CarrierSelectionConfig>;
  rng?: () => number;
};

function compareNullableDateAsc(a: string | null, b: string | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  return a.localeCompare(b);
}

function compareNullableNumberDesc(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  return b - a;
}

function mergeConfig(config?: Partial<CarrierSelectionConfig>): CarrierSelectionConfig {
  return {
    alpha: config?.alpha ?? DEFAULT_CARRIER_SELECTION_CONFIG.alpha,
    onboardingBase:
      config?.onboardingBase ?? DEFAULT_CARRIER_SELECTION_CONFIG.onboardingBase,
    recencyPenalty: {
      sameAttendance:
        config?.recencyPenalty?.sameAttendance ??
        DEFAULT_CARRIER_SELECTION_CONFIG.recencyPenalty.sameAttendance,
      previousAttendance:
        config?.recencyPenalty?.previousAttendance ??
        DEFAULT_CARRIER_SELECTION_CONFIG.recencyPenalty.previousAttendance,
      twoAttendancesAgo:
        config?.recencyPenalty?.twoAttendancesAgo ??
        DEFAULT_CARRIER_SELECTION_CONFIG.recencyPenalty.twoAttendancesAgo,
      older:
        config?.recencyPenalty?.older ??
        DEFAULT_CARRIER_SELECTION_CONFIG.recencyPenalty.older
    },
    scoreEpsilon: config?.scoreEpsilon ?? DEFAULT_CARRIER_SELECTION_CONFIG.scoreEpsilon
  };
}

function getRecencyPenalty(
  attendancesSinceLastCarry: number | null,
  config: CarrierSelectionConfig
): number {
  if (attendancesSinceLastCarry === null) {
    return config.recencyPenalty.older;
  }

  if (attendancesSinceLastCarry === 0) {
    return config.recencyPenalty.sameAttendance;
  }
  if (attendancesSinceLastCarry === 1) {
    return config.recencyPenalty.previousAttendance;
  }
  if (attendancesSinceLastCarry === 2) {
    return config.recencyPenalty.twoAttendancesAgo;
  }

  return config.recencyPenalty.older;
}

function parseHistoryRecords(
  historyRows: HistoryRow[],
  aliasMap: Map<string, { id: number; canonicalName: string }>
): PracticeHistoryRecord[] {
  return historyRows.map((row) => {
    const attendees = parseList(row.rawListText)
      .map((item) => aliasMap.get(item.normalized)?.id)
      .filter((id): id is number => typeof id === "number");

    return {
      date: row.date,
      attendeeIds: attendees,
      carriedPlayerId: row.playerId
    };
  });
}

function buildHistorySlice(
  history: PracticeHistoryRecord[],
  startIndex: number
): {
  relevantAssignments: number;
  attendanceCountByPlayer: Map<number, number>;
  carryCountByPlayer: Map<number, number>;
  firstAttendanceIndexByPlayer: Map<number, number>;
  lastCarryIndexByPlayer: Map<number, number>;
} {
  const attendanceCountByPlayer = new Map<number, number>();
  const carryCountByPlayer = new Map<number, number>();
  const firstAttendanceIndexByPlayer = new Map<number, number>();
  const lastCarryIndexByPlayer = new Map<number, number>();

  for (let index = startIndex; index < history.length; index += 1) {
    const record = history[index];
    for (const playerId of record.attendeeIds) {
      attendanceCountByPlayer.set(
        playerId,
        (attendanceCountByPlayer.get(playerId) ?? 0) + 1
      );
      if (!firstAttendanceIndexByPlayer.has(playerId)) {
        firstAttendanceIndexByPlayer.set(playerId, index);
      }
    }

    carryCountByPlayer.set(
      record.carriedPlayerId,
      (carryCountByPlayer.get(record.carriedPlayerId) ?? 0) + 1
    );
    lastCarryIndexByPlayer.set(record.carriedPlayerId, index);
  }

  return {
    relevantAssignments: history.length - startIndex,
    attendanceCountByPlayer,
    carryCountByPlayer,
    firstAttendanceIndexByPlayer,
    lastCarryIndexByPlayer
  };
}

export function evaluateCarrierSelection(
  attendees: AttendeePlayer[],
  history: PracticeHistoryRecord[],
  configOverride?: Partial<CarrierSelectionConfig>,
  rng: () => number = Math.random
): PickResult {
  const eligibleAttendees = attendees.filter(
    (player) => !NEVER_CARRY_NORMALIZED_NAMES.has(normalizeText(player.canonicalName))
  );

  if (eligibleAttendees.length === 0) {
    throw new Error("No hay asistentes elegibles para elegir.");
  }

  const config = mergeConfig(configOverride);
  const orderedHistory = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const candidates = eligibleAttendees.map((player) => {
    const firstAttendanceIndex = orderedHistory.findIndex((record) =>
      record.attendeeIds.includes(player.id)
    );
    const sliceStart = firstAttendanceIndex === -1 ? orderedHistory.length : firstAttendanceIndex;
    const sliceStats = buildHistorySlice(orderedHistory, sliceStart);
    const attendanceCount = sliceStats.attendanceCountByPlayer.get(player.id) ?? 0;
    const carryCount = sliceStats.carryCountByPlayer.get(player.id) ?? 0;
    const joinedAt = firstAttendanceIndex === -1 ? null : orderedHistory[firstAttendanceIndex].date;
    const lastCarryIndex = sliceStats.lastCarryIndexByPlayer.get(player.id);
    const lastCarryDate =
      typeof lastCarryIndex === "number" ? orderedHistory[lastCarryIndex].date : null;
    const lastCarryAttendanceNumber =
      typeof lastCarryIndex === "number"
        ? (() => {
            let count = 0;
            for (let index = 0; index <= lastCarryIndex; index += 1) {
              if (orderedHistory[index].attendeeIds.includes(player.id)) {
                count += 1;
              }
            }
            return count;
          })()
        : null;
    const attendancesSinceLastCarry =
      typeof lastCarryIndex === "number"
        ? (() => {
            let count = 0;
            for (let index = lastCarryIndex + 1; index < orderedHistory.length; index += 1) {
              if (orderedHistory[index].attendeeIds.includes(player.id)) {
                count += 1;
              }
            }
            return count;
          })()
        : null;
    const effectiveAttendanceCount = attendanceCount + config.onboardingBase;
    const attendanceWeight = Math.pow(effectiveAttendanceCount, -config.alpha);

    const attendanceWeights = new Map<number, number>();
    for (let index = sliceStart; index < orderedHistory.length; index += 1) {
      for (const attendeeId of orderedHistory[index].attendeeIds) {
        attendanceWeights.set(
          attendeeId,
          (attendanceWeights.get(attendeeId) ?? 0) + 1
        );
      }
    }

    const totalRelevantAttendanceWeights = [...attendanceWeights.entries()].reduce(
      (sum, [playerId, count]) =>
        sum +
        Math.pow(count + config.onboardingBase, -config.alpha),
      0
    );
    const expectedCarryCount =
      totalRelevantAttendanceWeights === 0
        ? 0
        : (sliceStats.relevantAssignments * attendanceWeight) /
          totalRelevantAttendanceWeights;
    const carryDebt = expectedCarryCount - carryCount;
    const recencyPenalty = getRecencyPenalty(attendancesSinceLastCarry, config);
    const finalScore = carryDebt - recencyPenalty;

    return {
      player,
      attendanceCount,
      carryCount,
      joinedAt,
      lastCarryDate,
      lastCarryAttendanceNumber,
      attendanceWeight,
      expectedCarryCount,
      carryDebt,
      attendancesSinceLastCarry,
      recencyPenalty,
      finalScore
    };
  });

  const withScore = candidates
    .map((candidate) => ({ ...candidate, score: candidate.finalScore }))
    .sort((a, b) => b.score - a.score);

  const bestScore = withScore[0].score;
  let finalists = withScore.filter(
    (candidate) => bestScore - candidate.score <= config.scoreEpsilon
  );

  if (finalists.length > 1) {
    finalists = [...finalists].sort((a, b) =>
      compareNullableNumberDesc(
        a.attendancesSinceLastCarry,
        b.attendancesSinceLastCarry
      )
    );
    const bestAttendanceGap = finalists[0].attendancesSinceLastCarry;
    finalists = finalists.filter(
      (candidate) =>
        candidate.attendancesSinceLastCarry === bestAttendanceGap ||
        (bestAttendanceGap === null && candidate.attendancesSinceLastCarry === null)
    );
  }

  if (finalists.length > 1) {
    finalists = [...finalists].sort((a, b) =>
      compareNullableDateAsc(a.lastCarryDate, b.lastCarryDate)
    );
    const oldestCarryDate = finalists[0].lastCarryDate;
    finalists = finalists.filter((candidate) => candidate.lastCarryDate === oldestCarryDate);
  }

  const selected =
    finalists.length === 1
      ? finalists[0]
      : finalists[Math.floor(rng() * finalists.length)];

  const stats = candidates.map((candidate) => ({
    playerId: candidate.player.id,
    attendanceCount: candidate.attendanceCount,
    carryCount: candidate.carryCount,
    joinedAt: candidate.joinedAt,
    lastCarryDate: candidate.lastCarryDate,
    lastCarryAttendanceNumber: candidate.lastCarryAttendanceNumber,
    attendanceWeight: candidate.attendanceWeight,
    expectedCarryCount: candidate.expectedCarryCount,
    carryDebt: candidate.carryDebt,
    attendancesSinceLastCarry: candidate.attendancesSinceLastCarry,
    recencyPenalty: candidate.recencyPenalty,
    finalScore: candidate.finalScore,
    selected: candidate.player.id === selected.player.id
  }));

  return {
    selected: selected.player,
    stats
  };
}

export async function pickCarrier(
  attendees: AttendeePlayer[],
  client: PickClient,
  options: PickCarrierOptions
): Promise<PickResult> {
  const aliasRows = await client.alias.findMany({
    where: { teamId: options.teamId },
    include: { player: true }
  });

  const historyRows = await client.carryLog.findMany({
    where: {
      teamId: options.teamId,
      ...(options.currentDate ? { date: { lt: options.currentDate } } : {})
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }]
  });

  const aliasMap = new Map<string, { id: number; canonicalName: string }>();
  for (const row of aliasRows) {
    aliasMap.set(row.aliasNormalized, row.player);
  }

  const history = parseHistoryRecords(historyRows, aliasMap);
  return evaluateCarrierSelection(attendees, history, options.config, options.rng);
}
