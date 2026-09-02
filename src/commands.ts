import { SlashCommandBuilder } from "discord.js";

export const commands = [
  new SlashCommandBuilder().setName("predict").setDescription("Submit or edit your Michigan season picks"),
  new SlashCommandBuilder().setName("mypicks").setDescription("View your saved Michigan season picks"),
  new SlashCommandBuilder().setName("community").setDescription("View the server's Michigan season predictions"),
  new SlashCommandBuilder()
    .setName("score")
    .setDescription("Predict the final score for Michigan vs. Western Michigan")
    .addIntegerOption((option) =>
      option.setName("michigan").setDescription("Michigan's final score").setMinValue(0).setMaxValue(100).setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName("opponent").setDescription("Western Michigan's final score").setMinValue(0).setMaxValue(100).setRequired(true)
    )
].map((command) => command.toJSON());
