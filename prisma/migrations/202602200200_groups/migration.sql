PRAGMA foreign_keys=OFF;

CREATE TABLE "teams" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");

INSERT INTO "teams" ("name", "active") VALUES ('Hebraica', true);

CREATE TABLE "new_players" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "team_id" INTEGER NOT NULL,
  "canonical_name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_players" ("id", "team_id", "canonical_name", "active")
SELECT "id", 1, "canonical_name", "active" FROM "players";

DROP TABLE "players";
ALTER TABLE "new_players" RENAME TO "players";
CREATE UNIQUE INDEX "players_team_id_canonical_name_key" ON "players"("team_id", "canonical_name");
CREATE INDEX "players_team_id_idx" ON "players"("team_id");

CREATE TABLE "new_aliases" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "team_id" INTEGER NOT NULL,
  "player_id" INTEGER NOT NULL,
  "alias_normalized" TEXT NOT NULL,
  CONSTRAINT "aliases_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "aliases_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_aliases" ("id", "team_id", "player_id", "alias_normalized")
SELECT a."id", p."team_id", a."player_id", a."alias_normalized"
FROM "aliases" a
JOIN "players" p ON p."id" = a."player_id";

DROP TABLE "aliases";
ALTER TABLE "new_aliases" RENAME TO "aliases";
CREATE UNIQUE INDEX "aliases_team_id_alias_normalized_key" ON "aliases"("team_id", "alias_normalized");
CREATE INDEX "aliases_team_id_idx" ON "aliases"("team_id");
CREATE INDEX "aliases_player_id_idx" ON "aliases"("player_id");

CREATE TABLE "new_carry_log" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "team_id" INTEGER NOT NULL,
  "date" TEXT NOT NULL,
  "player_id" INTEGER NOT NULL,
  "raw_list_text" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "carry_log_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "carry_log_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_carry_log" ("id", "team_id", "date", "player_id", "raw_list_text", "created_at")
SELECT c."id", p."team_id", c."date", c."player_id", c."raw_list_text", c."created_at"
FROM "carry_log" c
JOIN "players" p ON p."id" = c."player_id";

DROP TABLE "carry_log";
ALTER TABLE "new_carry_log" RENAME TO "carry_log";
CREATE UNIQUE INDEX "carry_log_team_id_date_key" ON "carry_log"("team_id", "date");
CREATE INDEX "carry_log_team_id_idx" ON "carry_log"("team_id");
CREATE INDEX "carry_log_player_id_idx" ON "carry_log"("player_id");

PRAGMA foreign_keys=ON;