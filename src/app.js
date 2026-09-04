require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    PermissionsBitField
} = require("discord.js");

/*
==================================================
CONFIG
==================================================
*/

const PREFIX = process.env.PREFIX || "-";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Channel
    ]
});

/*
==================================================
STORAGE
==================================================
*/

// Users who opted into promotional DMs
const promoOptIn = new Set();

// Promo message for each server
const promoMessages = new Map();

// Cooldowns
const cooldowns = new Map();

// Confirmation requests
const confirmations = new Map();

/*
==================================================
SETTINGS
==================================================
*/

const BOOST_COOLDOWN = 60 * 60 * 1000;
const INVITE_COOLDOWN = 5 * 60 * 1000;
const DM_DELAY = 1500;

/*
==================================================
HELPERS
==================================================
*/

function makeEmbed(title, description) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

function hasCooldown(userId, command) {
    const key = `${userId}:${command}`;
    const expires = cooldowns.get(key);

    if (!expires) {
        return false;
    }

    if (Date.now() >= expires) {
        cooldowns.delete(key);
        return false;
    }

    return true;
}

function setCooldown(userId, command, duration) {
    const key = `${userId}:${command}`;

    cooldowns.set(
        key,
        Date.now() + duration
    );
}

function isStaff(member) {
    return member.permissions.has(
        PermissionsBitField.Flags.ManageGuild
    );
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function validDiscordInvite(invite) {
    return /^https?:\/\/(www\.)?(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]+$/i.test(
        invite
    );
}

/*
==================================================
READY
==================================================
*/

client.once("ready", () => {
    console.log("================================");
    console.log("VC+ IS ONLINE");
    console.log(`Bot: ${client.user.tag}`);
    console.log(`Prefix: ${PREFIX}`);
    console.log(`Servers: ${client.guilds.cache.size}`);
    console.log("================================");

    client.user.setPresence({
        activities: [
            {
                name: `${PREFIX}help`,
                type: 0
            }
        ],
        status: "online"
    });
});

/*
==================================================
MESSAGE HANDLER
==================================================
*/

client.on("messageCreate", async message => {
    try {
        if (message.author.bot) return;

        if (!message.guild) return;

        if (!message.content.startsWith(PREFIX)) {
            return;
        }

        const input = message.content
            .slice(PREFIX.length)
            .trim();

        if (!input) return;

        const args = input.split(/\s+/);

        const command = args
            .shift()
            .toLowerCase();

        /*
        ==========================================
        HELP
        ==========================================
        */

        if (command === "help") {
            return message.reply({
                embeds: [
                    makeEmbed(
                        "vc+ commands",
                        [
                            "**general**",
                            `\`${PREFIX}help\` — show commands`,
                            `\`${PREFIX}inv <invite>\` — show server invite`,
                            `\`${PREFIX}boost\` — show boost message`,
                            "",
                            "**promo**",
                            `\`${PREFIX}promo optin\` — opt into promo DMs`,
                            `\`${PREFIX}promo optout\` — opt out`,
                            `\`${PREFIX}promo status\` — check status`,
                            `\`${PREFIX}promo message <text>\` — set promo`,
                            `\`${PREFIX}promo send\` — prepare promo`,
                            `\`${PREFIX}promo send confirm\` — send promo`
                        ].join("\n")
                    )
                ]
            });
        }

        /*
        ==========================================
        -INV
        ==========================================
        */

        if (command === "inv") {
            const invite = args[0];

            if (!invite) {
                return message.reply({
                    embeds: [
                        makeEmbed(
                            "invalid usage",
                            `use:\n\`${PREFIX}inv https://discord.gg/yourinvite\``
                        )
                    ]
                });
            }

            if (!validDiscordInvite(invite)) {
                return message.reply({
                    embeds: [
                        makeEmbed(
                            "invalid invite",
                            "please provide a valid Discord invite link."
                        )
                    ]
                });
            }

            if (
                hasCooldown(
                    message.author.id,
                    "inv"
                )
            ) {
                return message.reply(
                    "you already used this command recently."
                );
            }

            setCooldown(
                message.author.id,
                "inv",
                INVITE_COOLDOWN
            );

            return message.reply({
                embeds: [
                    makeEmbed(
                        "server invite",
                        [
                            "pull up and join the community.",
                            "",
                            `**invite:** ${invite}`
                        ].join("\n")
                    )
                ]
            });
        }

        /*
        ==========================================
        -BOOST
        ==========================================
        */

        if (command === "boost") {
            if (
                hasCooldown(
                    message.author.id,
                    "boost"
                )
            ) {
                return message.reply(
                    "you already used this command recently."
                );
            }

            setCooldown(
                message.author.id,
                "boost",
                BOOST_COOLDOWN
            );

            return message.reply({
                embeds: [
                    makeEmbed(
                        "support the server",
                        [
                            "enjoying the community?",
                            "",
                            "consider boosting the server to support us.",
                            "",
                            "every boost helps."
                        ].join("\n")
                    )
                ]
            });
        }

        /*
        ==========================================
        PROMO COMMAND
        ==========================================
        */

        if (command === "promo") {
            const subcommand = args
                .shift()
                ?.toLowerCase();

            /*
            --------------------------------------
            OPT IN
            --------------------------------------
            */

            if (subcommand === "optin") {
                promoOptIn.add(
                    message.author.id
                );

                return message.reply({
                    embeds: [
                        makeEmbed(
                            "promo enabled",
                            [
                                "you are now opted in to promotional DMs.",
                                "",
                                `use \`${PREFIX}promo optout\` anytime to stop them.`
                            ].join("\n")
                        )
                    ]
                });
            }

            /*
            --------------------------------------
            OPT OUT
            --------------------------------------
            */

            if (subcommand === "optout") {
                promoOptIn.delete(
                    message.author.id
                );

                return message.reply({
                    embeds: [
                        makeEmbed(
                            "promo disabled",
                            "you will no longer receive promotional DMs."
                        )
                    ]
                });
            }

            /*
            --------------------------------------
            STATUS
            --------------------------------------
            */

            if (subcommand === "status") {
                const optedIn = promoOptIn.has(
                    message.author.id
                );

                return message.reply({
                    embeds: [
                        makeEmbed(
                            "promo status",
                            `you are currently **${
                                optedIn
                                    ? "opted in"
                                    : "opted out"
                            }**.`
                        )
                    ]
                });
            }

            /*
            --------------------------------------
            SET MESSAGE
            --------------------------------------
            */

            if (subcommand === "message") {
                if (!isStaff(message.member)) {
                    return message.reply(
                        "you need **Manage Server** to use this command."
                    );
                }

                const text = args.join(" ").trim();

                if (!text) {
                    return message.reply(
                        `usage: \`${PREFIX}promo message <text>\``
                    );
                }

                promoMessages.set(
                    message.guild.id,
                    text
                );

                return message.reply({
                    embeds: [
                        makeEmbed(
                            "promo message saved",
                            [
                                "**message:**",
                                "",
                                text
                            ].join("\n")
                        )
                    ]
                });
            }

            /*
            --------------------------------------
            SEND
            --------------------------------------
            */

            if (subcommand === "send") {
                if (!isStaff(message.member)) {
                    return message.reply(
                        "you need **Manage Server** to use this command."
                    );
                }

                const promo =
                    promoMessages.get(
                        message.guild.id
                    );

                if (!promo) {
                    return message.reply(
                        `set a message first with \`${PREFIX}promo message <text>\``
                    );
                }

                if (
                    args[0]?.toLowerCase() ===
                    "confirm"
                ) {
                    return sendPromo(
                        message,
                        promo
                    );
                }

                confirmations.set(
                    message.author.id,
                    {
                        guildId:
                            message.guild.id,
                        expires:
                            Date.now() + 30000
                    }
                );

                return message.reply({
                    embeds: [
                        makeEmbed(
                            "promo confirmation",
                            [
                                "this will DM members who have explicitly opted in.",
                                "",
                                `run \`${PREFIX}promo send confirm\` within 30 seconds to continue.`
                            ].join("\n")
                        )
                    ]
                });
            }

            /*
            --------------------------------------
            PROMO HELP
            --------------------------------------
            */

            return message.reply({
                embeds: [
                    makeEmbed(
                        "promo commands",
                        [
                            `\`${PREFIX}promo optin\``,
                            `\`${PREFIX}promo optout\``,
                            `\`${PREFIX}promo status\``,
                            `\`${PREFIX}promo message <text>\``,
                            `\`${PREFIX}promo send\``,
                            `\`${PREFIX}promo send confirm\``
                        ].join("\n")
                    )
                ]
            });
        }
    } catch (error) {
        console.error(
            "MESSAGE HANDLER ERROR:",
            error
        );

        if (
            !message.replied &&
            !message.deferred
        ) {
            await message.reply(
                "something went wrong while running that command."
            ).catch(() => {});
        }
    }
});

/*
==================================================
PROMO SENDER
==================================================
*/

async function sendPromo(message, promo) {
    const confirmation =
        confirmations.get(
            message.author.id
        );

    if (!confirmation) {
        return message.reply(
            `run \`${PREFIX}promo send\` first.`
        );
    }

    if (
        confirmation.guildId !==
        message.guild.id
    ) {
        confirmations.delete(
            message.author.id
        );

        return message.reply(
            "that confirmation is invalid."
        );
    }

    if (
        Date.now() >
        confirmation.expires
    ) {
        confirmations.delete(
            message.author.id
        );

        return message.reply(
            "your confirmation expired."
        );
    }

    confirmations.delete(
        message.author.id
    );

    const members =
        await message.guild.members.fetch();

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    const status =
        await message.reply({
            embeds: [
                makeEmbed(
                    "promo sending",
                    "starting..."
                )
            ]
        });

    for (const [, member] of members) {
        if (member.user.bot) {
            skipped++;
            continue;
        }

        if (!promoOptIn.has(member.id)) {
            skipped++;
            continue;
        }

        try {
            await member.send({
                embeds: [
                    makeEmbed(
                        message.guild.name,
                        [
                            promo,
                            "",
                            "you received this because you opted in to promotional messages.",
                            "",
                            `use \`${PREFIX}promo optout\` in the server to stop receiving these messages.`
                        ].join("\n")
                    )
                ]
            });

            sent++;
        } catch {
            failed++;
        }

        await sleep(DM_DELAY);

        if (
            (sent + failed) % 10 ===
            0
        ) {
            await status.edit({
                embeds: [
                    makeEmbed(
                        "promo sending",
                        [
                            `**sent:** ${sent}`,
                            `**failed:** ${failed}`,
                            `**skipped:** ${skipped}`
                        ].join("\n")
                    )
                ]
            }).catch(() => {});
        }
    }

    return status.edit({
        embeds: [
            makeEmbed(
                "promo complete",
                [
                    `**sent:** ${sent}`,
                    `**failed:** ${failed}`,
                    `**skipped:** ${skipped}`,
                    "",
                    "only opted-in members were contacted."
                ].join("\n")
            )
        ]
    });
}

/*
==================================================
ERROR HANDLING
==================================================
*/

client.on(
    "error",
    error => {
        console.error(
            "DISCORD ERROR:",
            error
        );
    }
);

process.on(
    "unhandledRejection",
    error => {
        console.error(
            "UNHANDLED REJECTION:",
            error
        );
    }
);

process.on(
    "uncaughtException",
    error => {
        console.error(
            "UNCAUGHT EXCEPTION:",
            error
        );
    }
);

/*
==================================================
LOGIN
==================================================
*/

if (!process.env.TOKEN) {
    console.error(
        "TOKEN is missing from .env"
    );

    process.exit(1);
}

client.login(
    process.env.TOKEN
);
