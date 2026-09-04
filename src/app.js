import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

const PREFIX = "-";
const TOKEN = process.env.TOKEN;
const INVITE = process.env.INVITE;

// ==============================
// STARTUP CHECKS
// ==============================

console.log("Starting TitanBot...");

if (!TOKEN) {
  console.error("❌ ERROR: TOKEN is missing.");
  console.error("Add TOKEN to your environment variables.");
  process.exit(1);
}

if (!INVITE) {
  console.error("❌ ERROR: INVITE is missing.");
  console.error("Add INVITE to your environment variables.");
  process.exit(1);
}

// ==============================
// CLIENT
// ==============================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ==============================
// READY
// ==============================

client.once("ready", () => {
  console.log("================================");
  console.log("TitanBot started successfully");
  console.log(`Logged in as: ${client.user.tag}`);
  console.log(`Prefix: ${PREFIX}`);
  console.log("Status: ONLINE");
  console.log("================================");
});

// ==============================
// COMMANDS
// ==============================

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const content = message.content.slice(PREFIX.length).trim();

    if (!content) return;

    const args = content.split(/\s+/);
    const command = args.shift()?.toLowerCase();

    if (command !== "invite") return;

    const embed = new EmbedBuilder()
      .setTitle("Server Invite")
      .setDescription(
        "Click the button below if you want the server invite sent to your DMs."
      );

    const button = new ButtonBuilder()
      .setCustomId("request_server_invite")
      .setLabel("Get Invite")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await message.reply({
      embeds: [embed],
      components: [row],
    });
  } catch (error) {
    console.error("Command error:", error);
  }
});

// ==============================
// BUTTONS
// ==============================

client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isButton()) return;

    if (interaction.customId !== "request_server_invite") {
      return;
    }

    await interaction.deferReply({
      ephemeral: true,
    });

    try {
      await interaction.user.send(
        `You requested the server invite:\n${INVITE}`
      );

      await interaction.editReply({
        content: "✅ The invite was sent to your DMs.",
      });
    } catch (error) {
      console.error("DM error:", error);

      await interaction.editReply({
        content:
          "❌ I couldn't send you a DM. Check your Discord privacy settings.",
      });
    }
  } catch (error) {
    console.error("Interaction error:", error);

    try {
      if (interaction.deferred) {
        await interaction.editReply({
          content: "❌ Something went wrong. Please try again.",
        });
      } else if (!interaction.replied) {
        await interaction.reply({
          content: "❌ Something went wrong. Please try again.",
          ephemeral: true,
        });
      }
    } catch (replyError) {
      console.error("Interaction reply error:", replyError);
    }
  }
});

// ==============================
// DISCORD ERRORS
// ==============================

client.on("error", (error) => {
  console.error("Discord client error:", error);
});

client.on("warn", (warning) => {
  console.warn("Discord warning:", warning);
});

// ==============================
// PROCESS ERRORS
// ==============================

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

// ==============================
// LOGIN
// ==============================

console.log("Connecting to Discord...");

try {
  await client.login(TOKEN);
} catch (error) {
  console.error("❌ Discord login failed.");
  console.error(error);
  process.exit(1);
}
