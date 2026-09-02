import { SlashCommandBuilder } from "discord.js";

export const commands = [
  new SlashCommandBuilder().setName("predict").setDescription("Submit or edit your Michigan season picks"),
  new SlashCommandBuilder().setName("mypicks").setDescription("View your saved Michigan season picks"),
  new SlashCommandBuilder().setName("community").setDescription("View the server's Michigan season predictions"),
  new SlashCommandBuilder().setName("score").setDescription("Predict the final score for a game")
].map((command) => command.toJSON());
