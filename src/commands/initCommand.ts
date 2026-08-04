import { spawnSync } from "node:child_process";
import { mkdir, access, writeFile, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { prisma, ensureTeam } from "../db";

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function initCommand(): Promise<void> {
  const prismaCliPath = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  const result = spawnSync(process.execPath, [prismaCliPath, "db", "push"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  if (result.status !== 0 || result.error) {
    const stderr = (result.stderr ?? "").toString().trim();
    const stdout = (result.stdout ?? "").toString().trim();
    const details = stderr || stdout || result.error?.message || "Sin detalle";
    throw new Error(`No se pudo sincronizar el esquema de base de datos. ${details}`);
  }

  const dataDir = path.join(process.cwd(), "data");
  const seedPath = path.join(dataDir, "seed.example.json");
  const seedContent = JSON.stringify(
    {
      teamName: "Hebraica",
      players: [
        { canonicalName: "Mika", aliases: ["Mika"] },
        { canonicalName: "Oso", aliases: ["Oso"] },
        { canonicalName: "Chiqui", aliases: ["Chiqui", "Chico"] },
        { canonicalName: "Marce", aliases: ["Marce"] },
        { canonicalName: "Loco", aliases: ["Loco", "Degen"] },
        { canonicalName: "Fino", aliases: ["Fino"] },
        { canonicalName: "Ioni", aliases: ["Ioni"] },
        { canonicalName: "Gato", aliases: ["Gato"] },
        { canonicalName: "Joaco", aliases: ["Joaco"] },
        { canonicalName: "Bocha", aliases: ["Bocha"] },
        { canonicalName: "Hugo", aliases: ["Hugo"] },
        { canonicalName: "Gordo", aliases: ["Gordo"] },
        { canonicalName: "Javi", aliases: ["Javi"] },
        { canonicalName: "Ake", aliases: ["Ake"] },
        { canonicalName: "Oldak", aliases: ["Oldak"] },
        { canonicalName: "Suizo", aliases: ["Suizo"] },
        { canonicalName: "Mato", aliases: ["Mato"] },
        { canonicalName: "Lucas", aliases: ["Lucas"] },
        { canonicalName: "Givo", aliases: ["Givo"] },
        { canonicalName: "Mauri", aliases: ["Mauri"] },
        { canonicalName: "Wilder", aliases: ["Wilder"] },
        { canonicalName: "Colo", aliases: ["Colo"] },
        { canonicalName: "Tommy", aliases: ["Tommy"] },
        { canonicalName: "Nuri", aliases: ["Nuri", "Nuriel"] },
        { canonicalName: "Juanpe", aliases: ["Juanpe"] },
        { canonicalName: "Ruso", aliases: ["Ruso"] },
        { canonicalName: "Ary", aliases: ["Ary"], active: false },
        { canonicalName: "Nico", aliases: ["Nico"], active: false },
        { canonicalName: "Tuti", aliases: ["Tuti"], active: false }
      ]
    },
    null,
    2
  );

  await mkdir(dataDir, { recursive: true });

  if (!(await fileExists(seedPath))) {
    await writeFile(seedPath, seedContent, "utf8");
  }

  const seedJsonPath = path.join(dataDir, "seed.example.json");
  const seedRaw = await readFile(seedJsonPath, "utf8");
  const seed = JSON.parse(seedRaw) as {
    teamName?: string;
    players?: Array<{
      canonicalName: string;
      aliases?: string[];
      active?: boolean;
    }>;
  };

  const teamName = seed.teamName?.trim() || "Hebraica";
  const team = await ensureTeam(teamName, prisma);

  for (const playerSeed of seed.players ?? []) {
    const canonicalName = playerSeed.canonicalName.trim();
    if (!canonicalName) {
      continue;
    }

    const player = await prisma.player.upsert({
      where: {
        teamId_canonicalName: {
          teamId: team.id,
          canonicalName
        }
      },
      create: {
        teamId: team.id,
        canonicalName,
        active: playerSeed.active ?? true
      },
      update: {
        active: playerSeed.active ?? true
      }
    });

    const aliases = new Set([canonicalName, ...(playerSeed.aliases ?? [])]);
    for (const alias of aliases) {
      const aliasNormalized = alias.trim();
      if (!aliasNormalized) {
        continue;
      }

      await prisma.alias.upsert({
        where: {
          teamId_aliasNormalized: {
            teamId: team.id,
            aliasNormalized: aliasNormalized
          }
        },
        create: {
          teamId: team.id,
          playerId: player.id,
          aliasNormalized
        },
        update: {
          playerId: player.id
        }
      });
    }
  }

  console.log("Inicializacion completa.");
}
