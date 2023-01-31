const { joinVoiceChannel, createAudioResource, createAudioPlayer, AudioPlayerStatus } = require('@discordjs/voice')
const Utils = require("../utils/Utils")
const fs = require('fs')
const path = require("path")
const musicPlay = require('./music_play')

let serverQueue = null
let discordBot = null
let hasListener = false

function stop(serverQueue) {
    serverQueue.player.removeAllListeners()
    serverQueue.player.stop(true)
    serverQueue.connection.destroy()
}

async function play(bot, msg, audio) {
    try {
        const voiceChannel = msg.member.voice.channel
        if (!serverQueue) {
            serverQueue = {
                player: createAudioPlayer(),
                textChannel: msg.channel,
                voiceChannel: voiceChannel,
                connection: joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: voiceChannel.guild.id,
                    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                }),
                songs: [],
                volume: 5,
                playing: true
            }

            serverQueue.player.on(AudioPlayerStatus.Idle, () => {
                const musicQueue = musicPlay.getServerQueue()
                if (musicQueue) {
                    console.log("Resuming")
                    serverQueue.connection.subscribe(musicQueue.player)
                    musicQueue.player.unpause()
                } else {
                    stop(serverQueue)
                }
            })
        }

        const musicQueue = musicPlay.getServerQueue()
        if (musicQueue) {
            console.log("Pausing")
            musicQueue.player.pause(true)
            serverQueue.connection.subscribe(serverQueue.player)
        }
        if (serverQueue) {
            serverQueue.player.stop(true)
        }

        const audioPath = path.resolve("audio", audio)
        const resource = createAudioResource(fs.createReadStream(audioPath))

        serverQueue.player.play(resource)
    } catch (error) {
        logError(error)
    }
}

async function logError(error) {
    console.error(error)
    const channel = await discordBot.channels.fetch(process.env.ID_CHANNEL_LOG_BOT)
    const errorContent = error.stack ? error.stack : error
    channel.send({ content: '> Erro no AudioPlayer\n```' + errorContent + '```' })
}

function run(bot, msg) {
    const audios = fs.readdirSync("./audio")
    let buttons = []
    audios.forEach(audio => {
        let label = audio.split("-").join(" ").replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase())
        buttons.push({
            "type": 1,
            "components": [
                {
                    "type": 2,
                    "label": label,
                    "style": 1,
                    "custom_id": "btn_audio_" + audio,
                    "audio_name": audio
                }
            ]
        })
    })

    msg.reply({ "components": buttons })

    if (!hasListener) {
        hasListener = true
        bot.on('interactionCreate', (event) => {
            try {
                const customId = event.customId
                if (customId.startsWith("btn_audio_")) {
                    let audio = customId.split("btn_audio_")[1]
                    play(bot, msg, audio)
                }
                return true
            } catch (error) { console.log(error) }
        })
    }
}

function canHandle(bot, msg) {
    return msg.content.startsWith(Utils.command("audio"))
}

function helpComand(bot, msg) {
    return {
        name: Utils.command("audio"),
        value: "Lista os audios disponiveis",
        inline: false
    }
}

module.exports = {
    run, canHandle, helpComand
}