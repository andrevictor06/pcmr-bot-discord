const { joinVoiceChannel, createAudioResource, createAudioPlayer, AudioPlayerStatus } = require('@discordjs/voice')
const Utils = require("../utils/Utils")
const fs = require('fs')
const path = require("path")
const musicPlay = require('./music_play')

let serverQueue = null
let hasListener = false

function stop(shouldDesconect) {
    serverQueue.player.removeAllListeners()
    serverQueue.player.stop(true)
    if (shouldDesconect) {
        serverQueue.connection.destroy()
    }
    serverQueue = null
}

async function play(bot, msg, audio) {
    try {
        const musicQueue = musicPlay.getServerQueue()
        if (musicQueue && musicQueue.player.state.status != AudioPlayerStatus.Paused) {
            musicQueue.player.pause(true)
        }
        if (!serverQueue) {
            createServerQueue(msg)
        }
        if (serverQueue && serverQueue.player.state.status != AudioPlayerStatus.Idle) {
            serverQueue.player.off(AudioPlayerStatus.Idle, idleListener)
            serverQueue.player.stop(true)
            serverQueue.player.on(AudioPlayerStatus.Idle, idleListener)
        }

        const audioPath = path.resolve("audio", audio)
        const resource = createAudioResource(fs.createReadStream(audioPath))
        serverQueue.player.play(resource)
    } catch (error) {
        logError(bot, error)
    }
}

function createServerQueue(msg) {
    const voiceChannel = msg.member.voice.channel
    const musicQueue = musicPlay.getServerQueue()
    serverQueue = {
        player: createAudioPlayer(),
        textChannel: msg.channel,
        voiceChannel: musicQueue
            ? musicQueue.voiceChannel
            : voiceChannel,
        connection: musicQueue
            ? musicQueue.connection
            : joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            }),
        songs: [],
        volume: 5,
        playing: true
    }
    serverQueue.connection.subscribe(serverQueue.player)
    serverQueue.player.on(AudioPlayerStatus.Idle, idleListener)
}

function idleListener() {
    const musicQueue = musicPlay.getServerQueue()
    if (musicQueue) {
        serverQueue.connection.subscribe(musicQueue.player)
        musicQueue.player.unpause()
    }
    stop(!musicQueue)
}

async function logError(bot, error) {
    console.error(error)
    const channel = await bot.channels.fetch(process.env.ID_CHANNEL_LOG_BOT)
    const errorContent = error.stack ? error.stack : error
    channel.send({ content: '> Erro no audio_play.js\n```' + errorContent + '```' })
}

function run(bot, msg) {
    const audios = fs.readdirSync("./audio")
    const buttons = audios.map(audio => {
        return {
            type: 1,
            components: [
                {
                    type: 2,
                    label: getAudioName(audio),
                    style: 1,
                    custom_id: "btn_audio_" + audio,
                }
            ]
        }
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
                    event.update({
                        content: `Playing ${getAudioName(audio)}`,
                        components: []
                    })
                }
            } catch (error) {
                logError(bot, error)
            }
        })
    }
}

function getAudioName(audio) {
    return audio.split("-").join(" ").replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase())
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