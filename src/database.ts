import { dirname, resolve } from "node:path";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import type { Pick } from "./predictions.js";

export type StoredPick = { gameId: string; pick: Pick };
export type CommunityRow = { gameId: string; wins: number; losses: number; total: number };
type Row = StoredPick & { guildId: string; season: number; userId: string; updatedAt: string };
type Data = { version: 1; predictions: Row[] };

export class PredictionStore {
  private readonly path: string;
  private data: Data;

  constructor(path: string) {
    this.path = resolve(path);
    mkdirSync(dirname(this.path), { recursive: true });
    try {
      this.data = JSON.parse(readFileSync(this.path, "utf8")) as Data;
      if (this.data.version !== 1 || !Array.isArray(this.data.predictions)) throw new Error("Invalid data shape");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      this.data = { version: 1, predictions: [] };
      this.flush();
    }
  }

  private flush(): void {
    const temporary = `${this.path}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(this.data, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    renameSync(temporary, this.path);
  }

  private async flushAsync(): Promise<void> {
    const temporary = `${this.path}.tmp`;
    await writeFile(temporary, `${JSON.stringify(this.data, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    renameSync(temporary, this.path);
  }

  getUserPicks(guildId: string, season: number, userId: string): StoredPick[] {
    return this.data.predictions
      .filter((row) => row.guildId === guildId && row.season === season && row.userId === userId)
      .map(({ gameId, pick }) => ({ gameId, pick }));
  }

  async saveUserPicks(guildId: string, season: number, userId: string, picks: StoredPick[]): Promise<void> {
    const timestamp = new Date().toISOString();
    for (const item of picks) {
      const existing = this.data.predictions.find((row) =>
        row.guildId === guildId && row.season === season && row.userId === userId && row.gameId === item.gameId
      );
      if (existing) {
        existing.pick = item.pick;
        existing.updatedAt = timestamp;
      } else {
        this.data.predictions.push({ guildId, season, userId, ...item, updatedAt: timestamp });
      }
    }
    await this.flushAsync();
  }

  community(guildId: string, season: number): CommunityRow[] {
    const totals = new Map<string, CommunityRow>();
    for (const row of this.data.predictions) {
      if (row.guildId !== guildId || row.season !== season) continue;
      const total = totals.get(row.gameId) ?? { gameId: row.gameId, wins: 0, losses: 0, total: 0 };
      if (row.pick === "W") total.wins += 1;
      else total.losses += 1;
      total.total += 1;
      totals.set(row.gameId, total);
    }
    return [...totals.values()];
  }

  participantCount(guildId: string, season: number): number {
    return new Set(this.data.predictions
      .filter((row) => row.guildId === guildId && row.season === season)
      .map((row) => row.userId)).size;
  }
}
