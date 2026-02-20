import { PrismaClient, Player, Team } from "@prisma/client";
import { normalizeText } from "./normalize";

export const prisma = new PrismaClient();
export const DEFAULT_TEAM_NAME = "Hebraica";

export async function ensureTeam(
  name: string,
  client: PrismaClient = prisma
): Promise<Team> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Nombre de grupo invalido.");
  }
  const existing = await client.team.findUnique({ where: { name: trimmed } });
  if (existing) {
    return existing;
  }
  return client.team.create({ data: { name: trimmed, active: true } });
}

export async function findPlayerByCanonicalName(
  canonicalName: string,
  teamId?: number,
  client: PrismaClient = prisma
): Promise<Player | null> {
  const target = normalizeText(canonicalName);
  const players = await client.player.findMany({
    where: {
      active: true,
      ...(teamId ? { teamId } : {})
    }
  });
  return players.find((p) => normalizeText(p.canonicalName) === target) ?? null;
}
