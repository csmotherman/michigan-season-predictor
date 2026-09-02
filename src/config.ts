import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const EnvSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1).optional(),
  DATABASE_PATH: z.string().default("./data/predictions.json"),
  TIMEZONE: z.string().default("America/Detroit")
});

const GameSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  opponent: z.string().min(1),
  location: z.enum(["home", "away", "neutral"]),
  lockAt: z.string().datetime({ offset: true }).nullable()
});

const ScheduleSchema = z.object({
  season: z.number().int(),
  team: z.string().min(1),
  games: z.array(GameSchema).min(1).max(25)
}).superRefine((value, ctx) => {
  const ids = value.games.map((game) => game.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "Game IDs must be unique" });
});

export const env = EnvSchema.parse(process.env);
export const schedule = ScheduleSchema.parse(
  JSON.parse(readFileSync(resolve("schedule.json"), "utf8"))
);
export type Game = z.infer<typeof GameSchema>;
