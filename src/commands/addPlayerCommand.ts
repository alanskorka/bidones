import { PrismaClient } from "@prisma/client";
import { normalizeText } from "../normalize";
import { DEFAULT_TEAM_NAME, ensureTeam } from "../db";

export async function addPlayerCommand(
  prisma: PrismaClient,
  canonicalName: string
): Promise<void> {
  const trimmed = canonicalName.trim();
  if (!trimmed) {
    throw new Error("El nombre canónico no puede estar vacío.");
  }

  const aliasNormalized = normalizeText(trimmed);
  if (!aliasNormalized) {
    throw new Error("El nombre canónico no es válido.");
  }

  const team = await ensureTeam(DEFAULT_TEAM_NAME, prisma);
  await prisma.$transaction(async (tx) => {
    const player = await tx.player.create({
      data: {
        teamId: team.id,
        canonicalName: trimmed,
        active: true
      }
    });

    await tx.alias.create({
      data: {
        teamId: team.id,
        playerId: player.id,
        aliasNormalized
      }
    });
  });

  console.log(`Jugador agregado: ${trimmed}`);
}
