import { REST, Routes } from "discord.js";
import { commands } from "./commands.js";
import { env } from "./config.js";

const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
if (env.DISCORD_GUILD_ID) {
  await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID), { body: commands });
  console.log("Registered commands in the test server.");
} else {
  await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: commands });
  console.log("Registered commands globally. Discord may take up to an hour to show them.");
}
