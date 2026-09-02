import type { Game } from "./config.js";

export type Pick = "W" | "L";
export type ScorePrediction = { michScore: number; opponentScore: number };

export function isLocked(game: Game, now = new Date()): boolean {
  return game.lockAt !== null && now >= new Date(game.lockAt);
}

export function record(picks: Map<string, Pick>): { wins: number; losses: number } {
  let wins = 0;
  for (const pick of picks.values()) if (pick === "W") wins += 1;
  return { wins, losses: picks.size - wins };
}

export function locationLabel(game: Game): string {
  if (game.location === "home") return `vs. ${game.opponent}`;
  if (game.location === "away") return `at ${game.opponent}`;
  return `vs. ${game.opponent} (neutral)`;
}
