const fs = require('fs');
const path = require('path')
require('dotenv/config');
const Utils = require("./utils/Utils")
const { Client, Intents } = require("discord.js");
const SharedVariables = require('./utils/shared_variables');
const { runAudioPlay } = require('./functions/audio_play');
const server = require('./server')
const { LocalStorage } = require('node-localstorage')
localStorage = new LocalStorage(path.resolve('.localstorage/'))

const bot = new Client({
    intents: [
        Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_BANS,
        Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_SCHEDULED_EVENTS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_WEBHOOKS
    ]
})
bot.functions = [];

function listenMessages() {
    fs.readdirSync("./functions").forEach(fnFile => {
        const fn = require("./functions/" + fnFile)
        if (fn.init) {
            fn.init(bot)
        }
        bot.functions.push(fn)
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

bot.on('ready', () => {
    try {
        if (process.env.ENVIRONMENT === "PRD") {
            if (process.env.ID_CHANNEL_LOG_BOT) {
                let date = new Date();
                date = `${date.getFullYear()}-${date.getMonth().toString().padStart(2, '0')}-${date.getDay().toString().padStart(2, '0')}`
                bot.channels.fetch(process.env.ID_CHANNEL_LOG_BOT).then(channel => {
                    channel.send({ 
                        embeds: [{
                            title: "Bot iniciado",
                            timestamp: new Date().toISOString()
                        }],
                        components: [
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 2,
                                        style: 1,
                                        label: "Logs",
                                        custom_id: process.env.ENVIRONMENT + "adm_log" + date
                                    }
                                ]
                            }
                        ],
                    })
                })
                
                bot.addInteractionCreate(process.env.ENVIRONMENT + "adm_log" + date, (event)=>{
                    const customId = event.customId
                    const logPath = path.resolve(process.env.PATH_LOG)
                    
                    let log = customId.split(process.env.ENVIRONMENT + "adm_log")[1]
                    
                    let files = []
                    files.push(path.resolve(logPath, `log_pcmr_${log}.log`))
                    files.push(path.resolve(logPath, `log_pcmr_error_${log}.log`))
                    
                    event.reply({
                        content: `Ta na mão, corno`,
                        files: files,
                        components: []
                    })
                })
            }

            Utils.setPresenceBotDefault(bot)
        }
        console.log(`Logged in as ${bot.user.tag}!`);
    } catch (error) { Utils.logError(bot, error, __filename) }
});

if (process.env.HABILITA_VOICE_STATE_UPDATE_LISTENER) {
    bot.on('voiceStateUpdate', (oldState, newState) => {
        try {
            if (
                newState.channelId
                && newState.id !== process.env.ID_MEMBER_PCMR_BOT && newState.channelId === process.env.ID_VOICE_CHANNEL_GAME_PLAY
                && (oldState.channel == null || newState.channelId != oldState.channelId)
            ) {
                const musicQueue = SharedVariables.getSharedVariable(SharedVariables.MUSIC_QUEUE_NAME)
                if (musicQueue && musicQueue.voiceChannel.id !== process.env.ID_VOICE_CHANNEL_GAME_PLAY) return

                runAudioPlay(bot, newState.channelId, Utils.getRandomFromArray([`dilera-mamaco.mp3`, `sergio-malandro-mamaco.mp3`]))
            }
        } catch (error) { Utils.logError(bot, error, __filename) }
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

server.init(bot)
bot.login(process.env.TOKEN_DISCORD);