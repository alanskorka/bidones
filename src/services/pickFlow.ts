import { parseList } from "../parseList";
import { pickCarrier } from "../pickCarrier";
import { renderMessage } from "../renderMessage";
import { DEFAULT_TEAM_NAME, ensureTeam } from "../db";

export type PickFlowResult =
  | { ok: true; selectedName: string; message: string }
  | { ok: false; reason: "unresolved"; unresolvedNames: string[] }
  | { ok: false; reason: "empty-list" };

export async function executePickFlow(params: {
  prisma: any;
  date: string;
  rawListText: string;
}): Promise<PickFlowResult> {
  const team = await ensureTeam(DEFAULT_TEAM_NAME, params.prisma);
  const parsed = parseList(params.rawListText);
  if (parsed.length === 0) {
    return { ok: false, reason: "empty-list" };
  }

  const normalizedNames = [...new Set(parsed.map((p) => p.normalized))];
  const aliasRows = await params.prisma.alias.findMany({
    where: {
      teamId: team.id,
      aliasNormalized: { in: normalizedNames },
      player: { active: true }
    },
    include: { player: true }
  });

  const aliasMap = new Map<string, { id: number; canonicalName: string; teamId: number }>();
  for (const row of aliasRows) {
    aliasMap.set(row.aliasNormalized, row.player);
  }

  const unresolved = parsed.filter((item) => !aliasMap.has(item.normalized));
  if (unresolved.length > 0) {
    return {
      ok: false,
      reason: "unresolved",
      unresolvedNames: unresolved.map((u) => u.raw)
    };
  }

  const seen = new Set<number>();
  const attendees = parsed
    .map((item) => aliasMap.get(item.normalized)!)
    .filter((player) => {
      if (seen.has(player.id)) {
        return false;
      }
      seen.add(player.id);
      return true;
    })
    .map((player) => ({
      id: player.id,
      canonicalName: player.canonicalName
    }));

  const { selected } = await pickCarrier(attendees, {
    carryLog: {
      groupBy: async () =>
        params.prisma.carryLog.groupBy({
          by: ["playerId"],
          where: { teamId: team.id, playerId: { in: attendees.map((a) => a.id) } },
          _count: { _all: true },
          _max: { date: true }
        })
    }
  });

  await params.prisma.carryLog.create({
    data: {
      teamId: team.id,
      date: params.date,
      playerId: selected.id,
      rawListText: params.rawListText
    }
  });

  return {
    ok: true,
    selectedName: selected.canonicalName,
    message: renderMessage(selected.canonicalName)
  };
}

