#!/usr/bin/env node
import { Command } from "commander";
import { prisma } from "./db";
import { initCommand } from "./commands/initCommand";
import { addPlayerCommand } from "./commands/addPlayerCommand";
import { addAliasCommand } from "./commands/addAliasCommand";
import { pickCommand } from "./commands/pickCommand";
import { historyCommand } from "./commands/historyCommand";

const program = new Command();

program.name("bidones").description("Asignador de bidones").version("1.0.0");

program
  .command("init")
  .description("Crea DB con migraciones Prisma y seed opcional")
  .action(async () => {
    await initCommand();
  });

program
  .command("add-player")
  .description("Agrega jugador canónico")
  .argument("<canonicalName>", "Nombre canónico")
  .action(async (canonicalName: string) => {
    await addPlayerCommand(prisma, canonicalName);
  });

program
  .command("add-alias")
  .description("Agrega alias para un jugador canónico")
  .argument("<canonicalName>", "Nombre canónico")
  .argument("<alias>", "Alias")
  .action(async (canonicalName: string, alias: string) => {
    await addAliasCommand(prisma, canonicalName, alias);
  });

program
  .command("pick")
  .description("Elige quién lleva bidones")
  .option("--date <YYYY-MM-DD>", "Fecha")
  .requiredOption("--list-file <path>", "Ruta del archivo con la lista del día")
  .action(async (opts: { date?: string; listFile: string }) => {
    await pickCommand({
      prisma,
      date: opts.date,
      listFile: opts.listFile
    });
  });

program
  .command("history")
  .description("Muestra historial de carry_log")
  .option('--player <canonicalName>', "Filtrar por jugador")
  .action(async (opts: { player?: string }) => {
    await historyCommand({ prisma, player: opts.player });
  });

program
  .parseAsync(process.argv)
  .catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
