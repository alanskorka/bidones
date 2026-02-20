CREATE TABLE "players" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "canonical_name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX "players_canonical_name_key" ON "players"("canonical_name");

CREATE TABLE "aliases" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "player_id" INTEGER NOT NULL,
  "alias_normalized" TEXT NOT NULL,
  CONSTRAINT "aliases_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "aliases_alias_normalized_key" ON "aliases"("alias_normalized");
CREATE INDEX "aliases_player_id_idx" ON "aliases"("player_id");

CREATE TABLE "carry_log" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "date" TEXT NOT NULL,
  "player_id" INTEGER NOT NULL,
  "raw_list_text" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "carry_log_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "carry_log_date_key" ON "carry_log"("date");
CREATE INDEX "carry_log_player_id_idx" ON "carry_log"("player_id");
