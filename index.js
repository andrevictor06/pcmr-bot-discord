const fs = require('fs');
require('dotenv/config');
const Utils = require("./utils/Utils")
const { Client, Intents } = require("discord.js");
const SharedVariables = require('./utils/shared_variables');
const { runAudioPlay } = require('./functions/audio_play');
const bot = new Client({
    intents: [
        Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_BANS,
        Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_SCHEDULED_EVENTS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_WEBHOOKS
    ]
})
bot.functions = [];

function listenMessages() {
    fs.readdirSync("./functions").forEach(fnFile => {
        bot.functions.push(require("./functions/" + fnFile))
    })

    bot.on("messageCreate", msg => {
        bot.functions.forEach(async (fn) => {
            try {
                if (fn.canHandle(bot, msg))
                    await fn.run(bot, msg)
            } catch (error) {
                Utils.logError(bot, error, __filename)
                msg.channel.send(Utils.getMessageError(error))
            }
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
        if (process.env.ENVIRONMENT === "PRD") {
            if (process.env.ID_CHANNEL_LOG_BOT) {
                bot.channels.fetch(process.env.ID_CHANNEL_LOG_BOT).then(channel => {
                    channel.send({ content: "Bot iniciado em: " + new Date().toLocaleString("pt-BR") })
                })
            }

            Utils.setPresenceBotDefault(bot)
        }
        console.log(`Logged in as ${bot.user.tag}!`);
    } catch (error) { }
});

if(process.env.HABILITA_VOICE_STATE_UPDATE_LISTENER){
    bot.on('voiceStateUpdate', (oldState, newState) => {
        try {
            
            if( newState.id !== process.env.ID_MEMBER_PCMR_BOT && newState.channelId === process.env.ID_VOICE_CHANNEL_GAME_PLAY){
                if(newState.channelId){
                    runAudioPlay(bot, newState.channelId, `olha-o-macaco.mp3`)
                }    
            }
        } catch (error) { }
    });    
}

bot.addInteractionCreate = function (customId, func) {
    if (!SharedVariables.sharedVariableExists(customId)) {
        bot.on('interactionCreate', async (event) => {
            try {
                SharedVariables.setSharedVariable(customId, func)
                if (event.customId && event.customId === customId) {
                    await func(event)
                }
            } catch (error) {
                Utils.logError(bot, error, __filename)
                event.update({
                    content: Utils.getMessageError(error),
                    components: []
                })
            }
        })
    }
}