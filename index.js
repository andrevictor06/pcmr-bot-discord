const fs = require('fs');
require('dotenv/config');
const { Client, Intents } = require("discord.js");

const bot = new Client({
    intents: [
        Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_BANS,
        Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_SCHEDULED_EVENTS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_WEBHOOKS
    ]
})
const functions = []

function listenMessages() {
    fs.readdirSync("./functions")
        .forEach(fnFile => {
            const fn = require("./functions/" + fnFile);
            functions.push(fn)
        })
    bot.on("message", msg => {
        functions.forEach((fn) => {
            if (fn.canHandle(bot, msg))
                fn.run(bot, msg)
        });
    });
}

function startJobs() {
    const jobs = fs.readdirSync("./schedule")
    jobs.forEach(jobFile => {
        const job = require("./schedule/" + jobFile);
        job.initJob(bot)
    });
}

listenMessages()
startJobs()
bot.login(process.env.TOKEN_DISCORD);

bot.on('ready', () => {
    try {
        if(process.env.ID_CHANNEL_LOG_BOT){
            bot.channels.fetch(process.env.ID_CHANNEL_LOG_BOT).then(channel => {
                channel.send({content: "Bot iniciado em: " + new Date().toLocaleString("pt-BR")})
            })
            console.log(`Logged in as ${bot.user.tag}!`);
        }

    } catch (error) {}
});

