# Michigan Season Predictor

A Discord bot for Michigan Football Focus. Members privately choose a win or loss for every game, then the bot saves the ballot and calculates server-wide predictions.

## Commands

- `/predict` — submit picks or edit unlocked games
- `/mypicks` — privately view saved picks
- `/community` — publicly display win/loss percentages and the average predicted record

## Important before launch

The supplied `schedule.json` contains the 11 opponents from the original request. A normal regular season has 12 games, so **verify the complete schedule before inviting users**. Add the missing game if necessary. Set each `lockAt` to an ISO 8601 kickoff timestamp with a UTC offset, for example:

```json
"lockAt": "2026-09-05T12:00:00-04:00"
```

Leaving `lockAt` as `null` means that game's picks never lock.

## 1. Create the Discord application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and select **New Application**.
2. Name it `Michigan Season Predictor`.
3. Open **Bot**, create the bot, and reset/copy its token. Never post this token or commit it to Git.
4. Open **OAuth2 → URL Generator**. Check `bot` and `applications.commands`.
5. Bot permissions needed: `Send Messages`, `Embed Links`, and `Use Application Commands`.
6. Open the generated URL and invite the bot to your server.

## 2. Configure and run locally

Node.js 20 or newer is required.

```bash
cp .env.example .env
npm install
```

Fill in `.env`:

- `DISCORD_TOKEN`: token from the Bot page
- `DISCORD_CLIENT_ID`: Application ID from General Information
- `DISCORD_GUILD_ID`: server ID for instant command registration during testing
- `DATABASE_PATH`: keep the default locally

Turn on Discord Developer Mode to copy the server ID: **User Settings → Advanced → Developer Mode**, then right-click the server.

Register commands and start:

```bash
npm run register
npm run dev
```

Test `/predict`, `/mypicks`, and `/community` inside the server.

## 3. Deploy

The included Dockerfile works with Railway, Render, Fly.io, or another always-on Docker host. This is not a web app, so Vercel serverless hosting is the wrong runtime: a Discord gateway bot needs a persistent process.

For production:

1. Push this folder to a private GitHub repository.
2. Create a Docker service on your host.
3. Add `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, and `DATABASE_PATH=/data/predictions.json` as environment variables.
4. Attach a persistent volume mounted at `/data`. Without that volume, redeploying can erase predictions.
5. Initially keep `DISCORD_GUILD_ID` set and run `npm run register` once.
6. When ready for multiple servers, remove `DISCORD_GUILD_ID` and run `npm run register` to register globally.

## Editing the schedule safely

- Every `id` must be unique and should never change after users submit picks.
- You can fix an opponent's display name without losing picks.
- Add games before collecting ballots. Adding a game later makes earlier ballots incomplete until those members run `/predict` again.
- Do not remove games after submissions unless you also intend to ignore that stored data.
- Restart the bot after editing `schedule.json`.

## Data behavior

- Predictions are isolated by Discord server, season, member, and game.
- Re-running `/predict` starts with existing picks and replaces only unlocked choices.
- Locked picks remain unchanged.
- A partially completed or cancelled ballot is not saved.
- Community percentages use every saved pick for that game.

## Production warning

The atomic JSON store is appropriate for one bot process and this light workload, but the data file must live on persistent storage. If the community grows significantly or you later run multiple bot replicas, migrate to Postgres first; multiple processes must not write to the same JSON file.
