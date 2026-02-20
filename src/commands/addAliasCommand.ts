import { PrismaClient } from "@prisma/client";
import { DEFAULT_TEAM_NAME, ensureTeam, findPlayerByCanonicalName } from "../db";
import { normalizeText } from "../normalize";

export async function addAliasCommand(
  prisma: PrismaClient,
  canonicalName: string,
  alias: string
): Promise<void> {
  const team = await ensureTeam(DEFAULT_TEAM_NAME, prisma);
  const player = await findPlayerByCanonicalName(canonicalName, team.id, prisma);
  if (!player) {
    throw new Error(`No existe jugador canónico: ${canonicalName}`);
  }

  const normalized = normalizeText(alias);
  if (!normalized) {
    throw new Error("Alias inválido.");
  }

  await prisma.alias.create({
    data: {
      teamId: team.id,
      playerId: player.id,
      aliasNormalized: normalized
    }
  });

  console.log(`Alias agregado para ${player.canonicalName}: ${alias}`);
}
