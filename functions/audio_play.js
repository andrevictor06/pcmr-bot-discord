const { joinVoiceChannel, createAudioResource, createAudioPlayer, AudioPlayerStatus } = require('@discordjs/voice')
const Utils = require("../utils/Utils")
const fs = require('fs')
const path = require("path")
const { ExpectedError } = require('../utils/expected_error')
const { MUSIC_QUEUE_NAME, AUDIO_QUEUE_NAME, setSharedVariable, getSharedVariable, deleteSharedVariable, sharedVariableExists } = require("../utils/shared_variables")
//teste
function stop() {
    const serverQueue = getSharedVariable(AUDIO_QUEUE_NAME)
    if (!serverQueue) throw new ExpectedError("Já parei man")
    const musicQueue = getSharedVariable(MUSIC_QUEUE_NAME)
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
    deleteSharedVariable(AUDIO_QUEUE_NAME)
}

async function play(bot, msg, audio) {
    Utils.checkVoiceChannelPreConditions(msg)
    const musicQueue = getSharedVariable(MUSIC_QUEUE_NAME)

    if (musicQueue) {
        const currentVoiceChannel = msg.member.voice.channel
        if (musicQueue.voiceChannel.id != currentVoiceChannel.id) {
            throw new ExpectedError("I'm running in another voice channel!")
        }
        if (musicQueue.player.state.status != AudioPlayerStatus.Paused) {
            musicQueue.player.pause(true)
        }
    }
    if (!sharedVariableExists(AUDIO_QUEUE_NAME)) {
        createServerQueue(bot, msg)
    }
    const serverQueue = getSharedVariable(AUDIO_QUEUE_NAME)
    if (serverQueue && serverQueue.player.state.status != AudioPlayerStatus.Idle) {
        serverQueue.player.off(AudioPlayerStatus.Idle, stop)
        serverQueue.player.stop(true)
        serverQueue.player.on(AudioPlayerStatus.Idle, stop)
    }
    if (serverQueue) {
        const audioPath = path.resolve("audio", audio)
        const resource = createAudioResource(fs.createReadStream(audioPath, { highWaterMark: 1024 * 1024 }))
        serverQueue.player.play(resource)
    }
}

function createServerQueue(bot, msg) {
    const musicQueue = getSharedVariable(MUSIC_QUEUE_NAME)
    const voiceChannel = musicQueue ? musicQueue.voiceChannel : msg.member.voice.channel
    const connection = musicQueue
        ? musicQueue.connection
        : joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        })
    const serverQueue = {
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
    setSharedVariable(AUDIO_QUEUE_NAME, serverQueue)
}

async function eventPlayAudio(event) {
    let audio = event.customId.split(process.env.ENVIRONMENT + "btn_audio_")[1]
    await play(event.client, event, audio)

    event.client.addInteractionCreate(process.env.ENVIRONMENT + "btn_stop_audio", eventStopAudio)
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

async function eventStopAudio(event) {
    stop()
    event.update({
        content: `Parei man`,
        components: []
    })
}

async function run(bot, msg) {
    const audios = fs.readdirSync("./audio")

    Utils.chunkArray(audios, 5).forEach(list => {
        const buttons = list.map(audio => {
            bot.addInteractionCreate(process.env.ENVIRONMENT + "btn_audio_" + audio, eventPlayAudio)
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
    })
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