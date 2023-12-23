const fs = require('fs')
const path = require('path')
const { Client, GatewayIntentBits } = require("discord.js")
const Utils = require("./utils/Utils")
const SharedVariables = require('./utils/shared_variables')
const { runAudioPlay } = require('./functions/audio_play')
const { ExpectedError } = require('./utils/expected_error')

function init() {
    const bot = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildModeration,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildPresences,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildScheduledEvents,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.GuildWebhooks
        ]
    })

    initBotCommands(bot)
    applyListeners(bot)
    startJobs(bot)
    bot.login(process.env.TOKEN_DISCORD)
    return bot
}

function initBotCommands(bot) {
    bot.functions = []
    bot.object_functions = {}
    fs.readdirSync("./functions").forEach(fnFile => {
        const fn = require("./functions/" + fnFile)
        if (fn.init) {
            fn.init(bot)
        }
        bot.functions.push(fn)
        bot.object_functions[fnFile] = fn
    })


    bot.getFunction = (func) => {
        if(func){
            return bot.object_functions[func]
        }
        return null
    }
}

function startJobs(bot) {
    const jobs = fs.readdirSync("./schedule")
    jobs.forEach(jobFile => {
        const job = require("./schedule/" + jobFile);
        job.initJob(bot)
    });
}

function applyListeners(bot) {
    bot.on('interactionCreate', async (event) => {
        try {
            const func = SharedVariables.getSharedVariable(event.customId)
            if (func) {
                await func(event)
            }
        } catch (error) {
            Utils.logError(bot, error, __filename)
            event.reply({
                content: Utils.getMessageError(error),
                components: []
            })
        }
    })

    bot.addInteractionCreate = (customId, func) => {
        SharedVariables.setSharedVariable(customId, func)
    }

    bot.on("messageCreate", msg => {
        bot.functions.forEach(async (fn) => {
            try {
                if (fn.canHandle(bot, msg))
                    await fn.run(bot, msg)
            } catch (error) {
                Utils.logError(bot, error, __filename)
                if (error instanceof ExpectedError) {
                    msg.reply(Utils.getMessageError(error))
                } else {
                    msg.channel.send(Utils.getMessageError(error))
                }
            }
        })
    })

    bot.on('ready', async () => {
        try {
            if (process.env.ENVIRONMENT === "PRD") {
                if (process.env.ID_CHANNEL_LOG_BOT) {
                    const date = new Date().toISOString().slice(0, 10)
                    const channel_log_bot = bot.channels.cache.get(process.env.ID_CHANNEL_LOG_BOT)
                    channel_log_bot.send({
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
                    bot.addInteractionCreate(process.env.ENVIRONMENT + "adm_log" + date, (event) => {
                        const customId = event.customId
                        const logPath = path.resolve(process.env.PATH_LOG)

                        const log = customId.split(process.env.ENVIRONMENT + "adm_log")[1]

                        const files = []
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

            bot.getFunction('audio_play.js').createTopic(bot)

            console.log(`Logged in as ${bot.user.tag}!`);
        } catch (error) { Utils.logError(bot, error, __filename) }        
    })

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

                    setTimeout(
                        () => runAudioPlay(bot, newState.channelId, Utils.getRandomFromArray(['dilera-mamaco.mp3', 'sergio-malandro-mamaco.mp3'])),
                        process.env.MAMACO_AUDIO_DELAY_MS
                    )
                }
            } catch (error) { Utils.logError(bot, error, __filename) }
        });
    }
}

module.exports = {
    init
}