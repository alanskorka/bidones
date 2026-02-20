import { spawnSync } from "node:child_process";
import { mkdir, access, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

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
  const result = spawnSync(process.execPath, [prismaCliPath, "migrate", "deploy"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  if (result.status !== 0 || result.error) {
    const stderr = (result.stderr ?? "").toString().trim();
    const stdout = (result.stdout ?? "").toString().trim();
    const details = stderr || stdout || result.error?.message || "Sin detalle";
    throw new Error(`No se pudieron aplicar las migraciones. ${details}`);
  }

  const dataDir = path.join(process.cwd(), "data");
  const seedPath = path.join(dataDir, "seed.example.json");
  const seedContent = JSON.stringify(
    {
      players: [
        {
          canonicalName: "Federico G",
          aliases: ["Fede", "Federico", "Federico G"]
        },
        {
          canonicalName: "Nicolas P",
          aliases: ["Nico", "Nicolas", "Nicolas P"]
        }
      ]
    },
    null,
    2
  );

  await mkdir(dataDir, { recursive: true });
  if (!(await fileExists(seedPath))) {
    await writeFile(seedPath, seedContent, "utf8");
  }

  console.log("Inicializacion completa.");
}
