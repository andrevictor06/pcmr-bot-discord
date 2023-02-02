const { joinVoiceChannel, createAudioResource, createAudioPlayer, AudioPlayerStatus } = require('@discordjs/voice')
const Utils = require("../utils/Utils")
const fs = require('fs')
const path = require("path")
const { ExpectedError } = require('../utils/expected_error')

let serverQueue = null
let hasListener = false

// TODO: ta_pegando_fogo_bixo.mp3

function stop() {
    if (!serverQueue) throw new ExpectedError("Já parei man")
    const musicQueue = getMusicPlay().getServerQueue()
    if (musicQueue) {
        serverQueue.connection.subscribe(musicQueue.player)
        musicQueue.player.unpause()
    }
    if (serverQueue) {
        serverQueue.player.removeAllListeners()
        serverQueue.player.stop(true)
        if (!musicQueue) {
            serverQueue.connection.destroy()
        }
    }
    serverQueue = null
}

async function play(bot, msg, audio) {
    Utils.checkVoiceChannelPreConditions(msg)
    const musicQueue = getMusicPlay().getServerQueue()

    if (musicQueue) {
        const currentVoiceChannel = msg.member.voice.channel
        if (musicQueue.voiceChannel.id != currentVoiceChannel.id) {
            throw new ExpectedError("I'm running in another voice channel!")
        }
        if (musicQueue.player.state.status != AudioPlayerStatus.Paused) {
            musicQueue.player.pause(true)
        }
    }
    if (!serverQueue) {
        createServerQueue(bot, msg)
    }
    if (serverQueue && serverQueue.player.state.status != AudioPlayerStatus.Idle) {
        serverQueue.player.off(AudioPlayerStatus.Idle, stop)
        serverQueue.player.stop(true)
        serverQueue.player.on(AudioPlayerStatus.Idle, stop)
    }

    const audioPath = path.resolve("audio", audio)
    const resource = createAudioResource(fs.createReadStream(audioPath, { highWaterMark: 1024 * 1024 }))
    serverQueue.player.play(resource)
}

function createServerQueue(bot, msg) {
    const musicQueue = getMusicPlay().getServerQueue()
    const voiceChannel = musicQueue ? musicQueue.voiceChannel : msg.member.voice.channel
    const connection = musicQueue
        ? musicQueue.connection
        : joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        })
    serverQueue = {
        player: createAudioPlayer(),
        textChannel: msg.channel,
        voiceChannel,
        connection,
        songs: [],
        volume: 5,
        playing: true
    }
    serverQueue.connection.subscribe(serverQueue.player)
    serverQueue.player
        .on(AudioPlayerStatus.Idle, stop)
        .on("error", error => {
            Utils.logError(bot, error, __filename)
            msg.channel.send(Utils.getMessageError(error))
        })
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
                    custom_id: process.env.ENVIRONMENT + "btn_audio_" + audio,
                }
            ]
        }
    })

    msg.reply({ "components": buttons })

    if (!hasListener) {
        hasListener = true
        bot.on('interactionCreate', async (event) => {
            try {
                const customId = event.customId
                if (customId.startsWith(process.env.ENVIRONMENT + "btn_audio_")) {
                    let audio = customId.split(process.env.ENVIRONMENT + "btn_audio_")[1]
                    await play(bot, msg, audio)
                    event.update({
                        content: `Playing ${getAudioName(audio)}`,
                        components: [
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 2,
                                        label: "Para ae, na moral!",
                                        style: 1,
                                        custom_id: process.env.ENVIRONMENT + "btn_stop_audio",
                                    }
                                ]
                            }
                        ]
                    })
                }

                if (customId === process.env.ENVIRONMENT + "btn_stop_audio") {
                    stop()
                    event.update({
                        content: `Parei man`,
                        components: []
                    })
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

function getAudioName(audio) {
    return audio.split("-").join(" ").replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase())
}

function getServerQueue() {
    return serverQueue
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

function getMusicPlay() {
    return require('./music_play')
}

module.exports = {
    run, canHandle, helpComand, getServerQueue
}