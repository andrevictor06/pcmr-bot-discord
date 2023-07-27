const { joinVoiceChannel, createAudioResource, createAudioPlayer, AudioPlayerStatus } = require('@discordjs/voice')
const Utils = require("../utils/Utils")
const fs = require('fs')
const path = require("path")
const { ExpectedError } = require('../utils/expected_error')
const { setSharedVariable, getSharedVariable, deleteSharedVariable } = require("../utils/shared_variables")
const { AUDIO_QUEUE_NAME, MUSIC_QUEUE_NAME } = require('../utils/constants')
const { default: axios } = require('axios')
const { MP3Cutter } = require('mp3-cutter')

const commands = {
    audio: {
        fn: audio,
        help: {
            name: Utils.command("audio") + " [nome do audio] [--start tempo em segundos] [--end tempo em segundos]",
            value: "Lista os audios disponiveis ou cria um novo áudio",
            inline: false
        }
    },
    deletar_audio: {
        fn: deleteAudio,
        help: {
            name: Utils.command("deletar_audio") + " nome_do_audio",
            value: "Lista os audios disponiveis ou cria um novo áudio",
            inline: false
        }
    }
}
const audioFolderPath = path.resolve(process.env.PASTA_AUDIO)
const defaultAudioExtension = ".mp3"

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
    let serverQueue = getSharedVariable(AUDIO_QUEUE_NAME)
    if (serverQueue && serverQueue.player.state.status != AudioPlayerStatus.Idle) {
        serverQueue.player.off(AudioPlayerStatus.Idle, stop)
        serverQueue.player.stop(true)
        serverQueue.player.on(AudioPlayerStatus.Idle, stop)
    }
    if (!serverQueue) {
        serverQueue = createServerQueue(bot, msg)
    }
    const audioPath = path.resolve("audio", audio)
    const resource = createAudioResource(fs.createReadStream(audioPath, { highWaterMark: 1024 * 1024 }))
    serverQueue.player.play(resource)
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
    serverQueue.player.on(AudioPlayerStatus.Idle, stop)
    serverQueue.player.on("error", error => {
        Utils.logError(bot, error, __filename)
        msg.channel.send(Utils.getMessageError(error))
    })
    setSharedVariable(AUDIO_QUEUE_NAME, serverQueue)
    return serverQueue
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
        content: 'Parei man',
        components: []
    })
}

async function listAudios(bot, msg) {
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

async function audio(bot, msg) {
    const args = Utils.parseArgs(msg)
    if (args.mainParam) {
        return saveAudio(bot, msg, args)
    }
    return listAudios(bot, msg)

}

async function saveAudio(bot, msg, args) {
    checkAudioFolderSizeLimit()
    if (!args.mainParam) throw new ExpectedError("Cadê o nome do áudio?")
    if (args.params?.start > args.params?.end) throw new ExpectedError("O tempo final precisa ser > tempo inicial")

    let messageToFindAttachment = msg
    if (msg.reference?.messageId) {
        messageToFindAttachment = await msg.channel.messages.fetch(msg.reference.messageId)
    }
    const attachment = Utils.getFirstAttachmentFrom(messageToFindAttachment, ["audio/mpeg"], parseInt(process.env.AUDIO_MAX_SIZE))
    const url = attachment?.url
    if (!url) throw new ExpectedError("Cadê o áudio?")

    const audioName = Utils.normalizeString(args.mainParam)
    const audioPath = path.resolve(audioFolderPath, audioName + defaultAudioExtension)
    const response = await axios.get(url, { responseType: 'stream' })

    return new Promise((resolve, reject) => {
        const start = args.params.start || 0
        const end = args.params.end || 30
        response.data
            .pipe(new MP3Cutter({ start, end }))
            .pipe(fs.createWriteStream(audioPath))
            .on("finish", () => {
                try {
                    msg.reply(`Áudio ${audioName} criado!`)
                    resolve()
                } catch (error) {
                    reject(error)
                }
            })
            .on("error", error => {
                Utils.logError(error)
                resolve()
            })
    })
}

function deleteAudio(bot, msg) {
    const args = Utils.parseArgs(msg)
    if (!args.mainParam) throw new ExpectedError("Cadê o nome do áudio?")

    const audios = fs.readdirSync(audioFolderPath)
    for (let audio of audios) {
        const audioName = path.basename(audio, path.extname(audio))
        if (audioName == args.mainParam) {
            fs.rmSync(path.resolve(audioFolderPath, audio))
            msg.reply(`Áudio ${args.mainParam} removido!`)
            return
        }
    }
    throw new ExpectedError("Não achei o áudio man")
}

function run(bot, msg) {
    return Utils.executeCommand(bot, msg, commands)
}

function getAudioName(audio) {
    return audio.split("-").join(" ").replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase())
}

function canHandle(bot, msg) {
    return Utils.containsCommand(msg, commands)
}

function helpComand(bot, msg) {
    return Object.values(commands)
        .map(value => value.help)
        .filter(value => value != null)
}

function runAudioPlay(bot, channelId, audio) {
    bot.channels.fetch(channelId).then(channel => {
        play(bot, { member: { voice: { channel: channel } } }, audio)
    })
}

function checkAudioFolderSizeLimit() {
    const stats = fs.statSync(audioFolderPath)
    if (stats.size > parseInt(process.env.PASTA_AUDIO_LIMITE)) {
        throw new ExpectedError("Tamanho limite da pasta atingido!")
    }
}

module.exports = {
    run, canHandle, helpComand, runAudioPlay
}