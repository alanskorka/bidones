import { ParsedName } from "./parseList";

export type ResolvedPlayer = {
  id: number;
  canonicalName: string;
  active: boolean;
};

export type ResolvedAttendee = {
  input: ParsedName;
  player: ResolvedPlayer;
};

type AliasRow = {
  aliasNormalized: string;
  player: ResolvedPlayer;
};

type ResolveClient = {
  alias: {
    findMany: (args: {
      where: { aliasNormalized: { in: string[] } };
      include: { player: true };
    }) => Promise<AliasRow[]>;
  };
};

export async function resolvePlayers(
  parsedNames: ParsedName[],
  client: ResolveClient
): Promise<{ resolved: ResolvedAttendee[]; unresolved: ParsedName[] }> {
  const normalizedNames = [...new Set(parsedNames.map((p) => p.normalized))];

  const aliasRows = await client.alias.findMany({
    where: { aliasNormalized: { in: normalizedNames } },
    include: { player: true }
  });

  const aliasMap = new Map<string, ResolvedPlayer>();
  for (const row of aliasRows) {
    if (row.player.active) {
      aliasMap.set(row.aliasNormalized, row.player);
    }
  }

  const resolved: ResolvedAttendee[] = [];
  const unresolved: ParsedName[] = [];
  const seenPlayerIds = new Set<number>();

  for (const item of parsedNames) {
    const player = aliasMap.get(item.normalized);
    if (!player) {
      unresolved.push(item);
      continue;
    }
    if (seenPlayerIds.has(player.id)) {
      continue;
    }
    seenPlayerIds.add(player.id);
    resolved.push({ input: item, player });
  }

  return { resolved, unresolved };
}
