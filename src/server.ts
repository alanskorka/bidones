import express, { Request, Response } from "express";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { initCommand } from "./commands/initCommand";
import { todayIsoDate, isValidIsoDate } from "./utils/date";
import { normalizeText } from "./normalize";
import { parseList } from "./parseList";
import { pickCarrier } from "./pickCarrier";
import { renderMessage } from "./renderMessage";

const app = express();
const port = Number(process.env.PORT ?? 3030);
const publicDir = path.join(process.cwd(), "public");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));

async function ensureGroupByName(name: string) {
  const clean = name.trim();
  if (!clean) {
    throw new Error("Nombre de grupo invalido.");
  }
  const existing = await prisma.team.findUnique({ where: { name: clean } });
  if (existing) {
    return existing;
  }
  return prisma.team.create({ data: { name: clean, active: true } });
}

async function getGroupOrThrow(groupId: number) {
  const group = await prisma.team.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new Error("Grupo no encontrado.");
  }
  return group;
}

async function findPlayerInGroupByCanonicalName(groupId: number, canonicalName: string) {
  const target = normalizeText(canonicalName);
  const players = await prisma.player.findMany({ where: { teamId: groupId } });
  return players.find((p) => normalizeText(p.canonicalName) === target) ?? null;
}

async function pickForGroup(groupId: number, date: string, listText: string) {
  const parsed = parseList(listText);
  if (parsed.length === 0) {
    return { ok: false as const, reason: "empty-list" as const };
  }

  const normalizedNames = [...new Set(parsed.map((p) => p.normalized))];
  const aliases = await prisma.alias.findMany({
    where: {
      teamId: groupId,
      aliasNormalized: { in: normalizedNames },
      player: { active: true }
    },
    include: { player: true }
  });

  const aliasMap = new Map<string, { id: number; canonicalName: string }>();
  for (const row of aliases) {
    aliasMap.set(row.aliasNormalized, {
      id: row.player.id,
      canonicalName: row.player.canonicalName
    });
  }

  const unresolved = parsed.filter((item) => !aliasMap.has(item.normalized));
  if (unresolved.length > 0) {
    return {
      ok: false as const,
      reason: "unresolved" as const,
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
    });

  const { selected } = await pickCarrier(attendees, {
    carryLog: {
      groupBy: async () =>
        prisma.carryLog.groupBy({
          by: ["playerId"],
          where: {
            teamId: groupId,
            playerId: { in: attendees.map((a) => a.id) }
          },
          _count: { _all: true },
          _max: { date: true }
        } as any)
    }
  });

  await prisma.carryLog.create({
    data: {
      teamId: groupId,
      date,
      playerId: selected.id,
      rawListText: listText
    }
  });

  return {
    ok: true as const,
    selectedName: selected.canonicalName,
    message: renderMessage(selected.canonicalName)
  };
}

app.post("/api/init", async (_req: Request, res: Response) => {
  try {
    await initCommand();
    await ensureGroupByName("Hebraica");
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
});

app.get("/api/groups", async (_req: Request, res: Response) => {
  try {
    const groups = await prisma.team.findMany({ orderBy: { name: "asc" } });
    res.json({ ok: true, groups });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
});

app.post("/api/groups", async (req: Request, res: Response) => {
  try {
    const name = `${req.body?.name ?? ""}`;
    const group = await ensureGroupByName(name);
    res.json({ ok: true, group });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ ok: false, error: message });
  }
});

app.delete("/api/groups/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ ok: false, error: "id invalido." });
      return;
    }

    const groupsCount = await prisma.team.count();
    if (groupsCount <= 1) {
      res.status(400).json({
        ok: false,
        error: "No se puede borrar el ultimo grupo."
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.carryLog.deleteMany({ where: { teamId: id } });
      await tx.alias.deleteMany({ where: { teamId: id } });
      await tx.player.deleteMany({ where: { teamId: id } });
      await tx.team.delete({ where: { id } });
    });

    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ ok: false, error: message });
  }
});

app.get("/api/players", async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.query.groupId);
    if (!Number.isInteger(groupId)) {
      res.status(400).json({ ok: false, error: "groupId invalido." });
      return;
    }
    await getGroupOrThrow(groupId);
    const players = await prisma.player.findMany({
      where: { teamId: groupId },
      orderBy: { canonicalName: "asc" }
    });
    const aliases = await prisma.alias.findMany({
      where: { teamId: groupId },
      orderBy: { aliasNormalized: "asc" }
    });
    const aliasesByPlayer = new Map<number, Array<{ id: number; aliasNormalized: string }>>();
    for (const alias of aliases) {
      const list = aliasesByPlayer.get(alias.playerId) ?? [];
      list.push({ id: alias.id, aliasNormalized: alias.aliasNormalized });
      aliasesByPlayer.set(alias.playerId, list);
    }
    res.json({
      ok: true,
      players: players.map((p) => ({
        ...p,
        aliases: aliasesByPlayer.get(p.id) ?? []
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
});

app.post("/api/players", async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.body?.groupId);
    const canonicalName = `${req.body?.canonicalName ?? ""}`.trim();
    if (!Number.isInteger(groupId) || !canonicalName) {
      res.status(400).json({ ok: false, error: "Datos invalidos." });
      return;
    }
    await getGroupOrThrow(groupId);
    const player = await prisma.player.create({
      data: { teamId: groupId, canonicalName, active: true }
    });
    await prisma.alias.create({
      data: {
        teamId: groupId,
        playerId: player.id,
        aliasNormalized: normalizeText(canonicalName)
      }
    });
    res.json({ ok: true, player });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ ok: false, error: message });
  }
});

app.patch("/api/players/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const active = Boolean(req.body?.active);
    if (!Number.isInteger(id)) {
      res.status(400).json({ ok: false, error: "id invalido." });
      return;
    }
    const player = await prisma.player.update({
      where: { id },
      data: { active }
    });
    res.json({ ok: true, player });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ ok: false, error: message });
  }
});

app.delete("/api/players/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ ok: false, error: "id invalido." });
      return;
    }

    const carryCount = await prisma.carryLog.count({ where: { playerId: id } });
    if (carryCount > 0) {
      res.status(400).json({
        ok: false,
        error: "No se puede borrar jugador con historial. Borra su historial primero."
      });
      return;
    }

    await prisma.alias.deleteMany({ where: { playerId: id } });
    await prisma.player.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ ok: false, error: message });
  }
});

app.post("/api/aliases", async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.body?.groupId);
    const canonicalName = `${req.body?.canonicalName ?? ""}`.trim();
    const aliasInput = `${req.body?.alias ?? ""}`.trim();
    if (!Number.isInteger(groupId) || !canonicalName || !aliasInput) {
      res.status(400).json({ ok: false, error: "Datos invalidos." });
      return;
    }

    const player = await findPlayerInGroupByCanonicalName(groupId, canonicalName);
    if (!player) {
      res.status(404).json({ ok: false, error: "Jugador no encontrado." });
      return;
    }

    const alias = await prisma.alias.create({
      data: {
        teamId: groupId,
        playerId: player.id,
        aliasNormalized: normalizeText(aliasInput)
      }
    });
    res.json({ ok: true, alias });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ ok: false, error: message });
  }
});

app.post("/api/pick", async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.body?.groupId);
    const listText = `${req.body?.listText ?? ""}`;
    const dateRaw = `${req.body?.date ?? ""}`.trim();
    const date = dateRaw || todayIsoDate();

    if (!Number.isInteger(groupId)) {
      res.status(400).json({ ok: false, error: "groupId invalido." });
      return;
    }
    await getGroupOrThrow(groupId);

    if (!isValidIsoDate(date)) {
      res.status(400).json({ ok: false, error: "Fecha invalida. Usa YYYY-MM-DD." });
      return;
    }

    const result = await pickForGroup(groupId, date, listText);
    if (!result.ok) {
      if (result.reason === "empty-list") {
        res.status(400).json({ ok: false, error: "La lista quedo vacia." });
        return;
      }
      res.status(400).json({
        ok: false,
        error: "Hay nombres sin mapear.",
        unresolvedNames: result.unresolvedNames
      });
      return;
    }

    res.json({
      ok: true,
      selectedName: result.selectedName,
      message: result.message
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        ok: false,
        error: "Ya existe una asignacion para esa fecha en ese grupo."
      });
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
});

app.get("/api/history", async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.query.groupId);
    if (!Number.isInteger(groupId)) {
      res.status(400).json({ ok: false, error: "groupId invalido." });
      return;
    }
    await getGroupOrThrow(groupId);
    const logs = await prisma.carryLog.findMany({
      where: { teamId: groupId },
      include: { player: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200
    });

    res.json({
      ok: true,
      items: logs.map((log) => ({
        date: log.date,
        canonicalName: log.player.canonicalName
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
});

app.post("/api/history/upsert", async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.body?.groupId);
    const date = `${req.body?.date ?? ""}`.trim();
    const canonicalName = `${req.body?.canonicalName ?? ""}`.trim();
    if (!Number.isInteger(groupId) || !isValidIsoDate(date) || !canonicalName) {
      res.status(400).json({ ok: false, error: "Datos invalidos." });
      return;
    }

    const player = await findPlayerInGroupByCanonicalName(groupId, canonicalName);
    if (!player) {
      res.status(404).json({ ok: false, error: "Jugador no encontrado en ese grupo." });
      return;
    }

    await prisma.carryLog.upsert({
      where: { teamId_date: { teamId: groupId, date } },
      create: {
        teamId: groupId,
        date,
        playerId: player.id,
        rawListText: "edicion manual"
      },
      update: {
        playerId: player.id
      }
    });

    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
});

app.delete("/api/history", async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.query.groupId);
    const date = `${req.query.date ?? ""}`.trim();
    if (!Number.isInteger(groupId) || !isValidIsoDate(date)) {
      res.status(400).json({ ok: false, error: "groupId o fecha invalidos." });
      return;
    }
    await prisma.carryLog.delete({
      where: { teamId_date: { teamId: groupId, date } }
    });
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ ok: false, error: message });
  }
});

app.get("/", (_req: Request, res: Response) => {
  res.redirect("/asignacion");
});

app.get("/asignacion", (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, "asignacion.html"));
});

app.get("/plantel", (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, "plantel.html"));
});

app.get("/grupos", (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, "grupos.html"));
});

app.get("/historial", (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, "historial.html"));
});

app.get("*", (_req: Request, res: Response) => {
  res.redirect("/asignacion");
});

app.listen(port, () => {
  console.log(`Bidones app en http://localhost:${port}`);
});
