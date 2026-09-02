import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits
} from "discord.js";
import { env, schedule } from "./config.js";
import { PredictionStore } from "./database.js";
import { isLocked, locationLabel, record, type Pick } from "./predictions.js";

type Session = { guildId: string; userId: string; index: number; picks: Map<string, Pick>; touchedAt: number };
const sessions = new Map<string, Session>();
const store = new PredictionStore(env.DATABASE_PATH);
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const SESSION_MS = 30 * 60 * 1000;

function key(guildId: string, userId: string): string { return `${guildId}:${userId}`; }
function editableGames() { return schedule.games.filter((game) => !isLocked(game)); }

function picker(session: Session) {
  const games = editableGames();
  const game = games[session.index];
  if (!game) return null;
  const current = session.picks.get(game.id);
  return {
    embeds: [new EmbedBuilder()
      .setColor(0x00274c)
      .setTitle(`🏈 ${schedule.team} ${schedule.season} Predictor`)
      .setDescription(`**Game ${session.index + 1} of ${games.length}**\n${locationLabel(game)}\n\nChoose Michigan's result.${current ? `\nCurrent pick: **${current === "W" ? "WIN" : "LOSS"}**` : ""}`)
      .setFooter({ text: "Your choices are private until you share them." })],
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`pick:${game.id}:W`).setLabel("WIN").setEmoji("✅").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`pick:${game.id}:L`).setLabel("LOSS").setEmoji("❌").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("pick:cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
    )]
  };
}

function picksEmbed(userId: string, picks: Map<string, Pick>, title = "Season Prediction") {
  const lines = schedule.games.map((game) => {
    const pick = picks.get(game.id);
    const icon = pick === "W" ? "✅" : pick === "L" ? "❌" : "➖";
    return `${icon} ${locationLabel(game)}${isLocked(game) ? " 🔒" : ""}`;
  });
  const result = record(new Map([...picks].filter(([id]) => schedule.games.some((game) => game.id === id))));
  return new EmbedBuilder().setColor(0xffcb05).setTitle(`🏈 ${title}`)
    .setDescription(lines.join("\n"))
    .addFields({ name: "Predicted record", value: `**${result.wins}-${result.losses}**`, inline: true })
    .setFooter({ text: `Picks by <@${userId}> • ${schedule.season}` });
}

async function startPredict(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) return interaction.reply({ content: "Use this command inside a server.", flags: 64 });
  const games = editableGames();
  if (!games.length) return interaction.reply({ content: "All predictions are locked.", flags: 64 });
  const existing = new Map(store.getUserPicks(interaction.guildId, schedule.season, interaction.user.id).map((x) => [x.gameId, x.pick]));
  const session: Session = { guildId: interaction.guildId, userId: interaction.user.id, index: 0, picks: existing, touchedAt: Date.now() };
  sessions.set(key(session.guildId, session.userId), session);
  await interaction.reply({ ...picker(session)!, flags: 64 });
}

async function handlePick(interaction: ButtonInteraction) {
  if (!interaction.guildId) return;
  const sessionKey = key(interaction.guildId, interaction.user.id);
  const session = sessions.get(sessionKey);
  if (!session || Date.now() - session.touchedAt > SESSION_MS) {
    sessions.delete(sessionKey);
    return interaction.update({ content: "This prediction session expired. Run `/predict` again.", embeds: [], components: [] });
  }
  if (interaction.customId === "pick:cancel") {
    sessions.delete(sessionKey);
    return interaction.update({ content: "Prediction cancelled. Your previously saved picks were not changed.", embeds: [], components: [] });
  }
  const [, gameId, choice] = interaction.customId.split(":");
  const game = schedule.games.find((item) => item.id === gameId);
  if (!game || isLocked(game) || (choice !== "W" && choice !== "L")) {
    return interaction.update({ content: "That game is no longer available. Run `/predict` again.", embeds: [], components: [] });
  }
  session.picks.set(gameId!, choice);
  session.index += 1;
  session.touchedAt = Date.now();
  const next = picker(session);
  if (next) return interaction.update(next);

  const lockedExisting = store.getUserPicks(session.guildId, schedule.season, session.userId)
    .filter((item) => schedule.games.some((itemGame) => itemGame.id === item.gameId && isLocked(itemGame)));
  const editable = editableGames().map((item) => ({ gameId: item.id, pick: session.picks.get(item.id)! })).filter((item) => item.pick);
  await store.saveUserPicks(session.guildId, schedule.season, session.userId, [...lockedExisting, ...editable]);
  sessions.delete(sessionKey);
  return interaction.update({ content: "Your picks are saved.", embeds: [picksEmbed(session.userId, session.picks, `${interaction.user.displayName}'s Prediction`)], components: [] });
}

async function myPicks(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) return interaction.reply({ content: "Use this command inside a server.", flags: 64 });
  const picks = new Map(store.getUserPicks(interaction.guildId, schedule.season, interaction.user.id).map((x) => [x.gameId, x.pick]));
  if (!picks.size) return interaction.reply({ content: "You have no saved picks yet. Run `/predict`.", flags: 64 });
  return interaction.reply({ embeds: [picksEmbed(interaction.user.id, picks, "Your Michigan Picks")], flags: 64 });
}

async function community(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) return interaction.reply({ content: "Use this command inside a server.", flags: 64 });
  const rows = new Map(store.community(interaction.guildId, schedule.season).map((row) => [row.gameId, row]));
  const users = store.participantCount(interaction.guildId, schedule.season);
  if (!users) return interaction.reply("No predictions have been submitted yet. Be first with `/predict`.");
  const lines = schedule.games.map((game) => {
    const row = rows.get(game.id);
    if (!row?.total) return `➖ **${locationLabel(game)}:** no picks`;
    const winPct = Math.round((row.wins / row.total) * 100);
    return `${winPct >= 50 ? "✅" : "⚠️"} **${locationLabel(game)}:** ${winPct}% W / ${100 - winPct}% L`;
  });
  const averageWins = [...rows.values()].reduce((sum, row) => sum + row.wins / row.total, 0);
  const gamesWithPicks = [...rows.values()].filter((row) => row.total > 0).length;
  const avgLosses = gamesWithPicks - averageWins;
  const embed = new EmbedBuilder().setColor(0x00274c).setTitle(`🏟️ ${schedule.team} Community Prediction`)
    .setDescription(lines.join("\n"))
    .addFields(
      { name: "Average record", value: `**${averageWins.toFixed(1)}-${avgLosses.toFixed(1)}**`, inline: true },
      { name: "Participants", value: `**${users}**`, inline: true }
    ).setFooter({ text: `${interaction.guild?.name ?? "Server"} • ${schedule.season}` });
  return interaction.reply({ embeds: [embed] });
}

client.once(Events.ClientReady, (ready) => console.log(`Ready as ${ready.user.tag}`));
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isButton() && interaction.customId.startsWith("pick:")) return await handlePick(interaction);
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === "predict") return await startPredict(interaction);
    if (interaction.commandName === "mypicks") return await myPicks(interaction);
    if (interaction.commandName === "community") return await community(interaction);
  } catch (error) {
    console.error(error);
    const message = { content: "Something went wrong. Please try again.", flags: 64 };
    if (interaction.isRepliable()) {
      if (interaction.replied || interaction.deferred) await interaction.followUp(message);
      else await interaction.reply(message);
    }
  }
});

await client.login(env.DISCORD_TOKEN);
