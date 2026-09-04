require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const PREFIX = "-";

if (!process.env.TOKEN) {
  console.error("Missing TOKEN in .env");
  process.exit(1);
}

if (!process.env.INVITE) {
  console.error("Missing INVITE in .env");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Prevent repeated requests from the same user
const cooldowns = new Map();
const COOLDOWN = 60 * 1000;

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log("Bot is online.");
});

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content
      .slice(PREFIX.length)
      .trim()
      .split(/\s+/);

    const command = args.shift()?.toLowerCase();

    if (command !== "invite") return;

    const embed = new EmbedBuilder()
      .setTitle("Server Invite")
      .setDescription(
        "Click the button below to request the server invite in your DMs."
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

client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isButton()) return;
    if (interaction.customId !== "request_server_invite") return;

    const userId = interaction.user.id;
    const now = Date.now();
    const lastRequest = cooldowns.get(userId);

    if (lastRequest && now - lastRequest < COOLDOWN) {
      const remaining = Math.ceil(
        (COOLDOWN - (now - lastRequest)) / 1000
      );

      return interaction.reply({
        content: `Please wait ${remaining} seconds before requesting another invite.`,
        ephemeral: true,
      });
    }

    cooldowns.set(userId, now);

    await interaction.deferReply({
      ephemeral: true,
    });

    try {
      await interaction.user.send(
        `You requested the server invite:\n${process.env.INVITE}`
      );

      await interaction.editReply({
        content: "The invite was sent to your DMs.",
      });
    } catch (error) {
      console.error("DM failed:", error);

      await interaction.editReply({
        content:
          "I couldn't DM you. Please make sure your Discord settings allow DMs.",
      });
    }
  } catch (error) {
    console.error("Interaction error:", error);
  }
});

client.on("error", (error) => {
  console.error("Discord error:", error);
});

client.on("warn", (warning) => {
  console.warn("Discord warning:", warning);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

client
  .login(process.env.TOKEN)
  .catch((error) => {
    console.error("Login failed:", error.message);
    process.exit(1);
  });
