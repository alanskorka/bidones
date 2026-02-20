import { PrismaClient } from "@prisma/client";
import { DEFAULT_TEAM_NAME, ensureTeam, findPlayerByCanonicalName } from "../db";

export async function historyCommand(params: {
  prisma: PrismaClient;
  player?: string;
}): Promise<void> {
  const team = await ensureTeam(DEFAULT_TEAM_NAME, params.prisma);
  let playerId: number | undefined;

  if (params.player) {
    const player = await findPlayerByCanonicalName(params.player, team.id, params.prisma);
    if (!player) {
      throw new Error(`No existe jugador canónico: ${params.player}`);
    }
    playerId = player.id;
  }

  const logs = await params.prisma.carryLog.findMany({
    where: {
      teamId: team.id,
      ...(playerId ? { playerId } : {})
    },
    include: { player: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }]
  });

  if (logs.length === 0) {
    console.log("Sin historial.");
    return;
  }

  for (const log of logs) {
    console.log(`${log.date} | ${log.player.canonicalName}`);
  }
}
