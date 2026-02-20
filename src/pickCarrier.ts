export type AttendeePlayer = {
  id: number;
  canonicalName: string;
};

type GroupedStat = {
  playerId: number;
  _count: { _all: number };
  _max: { date: string | null };
};

type PickClient = {
  carryLog: {
    groupBy: (args: {
      by: ["playerId"];
      where: { playerId: { in: number[] } };
      _count: { _all: true };
      _max: { date: true };
    }) => Promise<GroupedStat[]>;
  };
};

export type PlayerPickStat = {
  playerId: number;
  timesCarried: number;
  lastCarriedAt: string | null;
};

export type PickResult = {
  selected: AttendeePlayer;
  stats: PlayerPickStat[];
};

function compareNullableDateAsc(a: string | null, b: string | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  return a.localeCompare(b);
}

export async function pickCarrier(
  attendees: AttendeePlayer[],
  client: PickClient
): Promise<PickResult> {
  if (attendees.length === 0) {
    throw new Error("No hay asistentes para elegir.");
  }

  const ids = attendees.map((a) => a.id);
  const grouped = await client.carryLog.groupBy({
    by: ["playerId"],
    where: { playerId: { in: ids } },
    _count: { _all: true },
    _max: { date: true }
  });

  const statsMap = new Map<number, PlayerPickStat>();
  for (const row of grouped) {
    statsMap.set(row.playerId, {
      playerId: row.playerId,
      timesCarried: row._count._all,
      lastCarriedAt: row._max.date
    });
  }

  const withStats = attendees.map((player) => ({
    player,
    stat:
      statsMap.get(player.id) ?? {
        playerId: player.id,
        timesCarried: 0,
        lastCarriedAt: null
      }
  }));

  withStats.sort((a, b) => {
    if (a.stat.timesCarried !== b.stat.timesCarried) {
      return a.stat.timesCarried - b.stat.timesCarried;
    }

    const dateComp = compareNullableDateAsc(a.stat.lastCarriedAt, b.stat.lastCarriedAt);
    if (dateComp !== 0) {
      return dateComp;
    }

    return a.player.canonicalName.localeCompare(b.player.canonicalName, "es");
  });

  return {
    selected: withStats[0].player,
    stats: withStats.map((x) => x.stat)
  };
}
