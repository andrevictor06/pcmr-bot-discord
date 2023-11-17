const { joinVoiceChannel, createAudioResource, createAudioPlayer, AudioPlayerStatus } = require('@discordjs/voice')
const Utils = require("../utils/Utils")
const fs = require('fs')
const path = require("path")
const { ExpectedError } = require('../utils/expected_error')
const { setSharedVariable, getSharedVariable, deleteSharedVariable } = require("../utils/shared_variables")
const { AUDIO_QUEUE_NAME, MUSIC_QUEUE_NAME } = require('../utils/constants')
const { default: axios } = require('axios')
const playdl = require('play-dl')
const { convertToMp3 } = require('../utils/media_utils')

const allowedContentTypes = ["audio/mpeg"]
const audioMaxSize = parseInt(process.env.AUDIO_MAX_SIZE)
const audioMaxSeconds = parseInt(process.env.AUDIO_MAX_SECONDS)
const commands = {
    audio: {
        fn: audio,
        help: {
            name: Utils.command("audio") + " [nome do audio] [--url url do audio ou do youtube] [--start tempo em segundos] [--end tempo em segundos]",
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
    const audioPath = path.isAbsolute(audio) ? audio : path.resolve("audio", audio)
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
    event.update(event.message.components)
    /*event.update({
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
    })*/
}

async function eventStopAudio(event) {
    stop()
    event.update({
        content: 'Parei man',
        components: []
    })
}

async function listAudios(bot, msg) {
    if (!fs.existsSync(process.env.PASTA_AUDIO)) return msg.reply("Sem áudios por enquanto")

    const audios = fs.readdirSync("./audio")
    if (audios.length == 0) return msg.reply("Sem áudios por enquanto")

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
    if (args.params.start < 0 || args.params.end < 0) throw new ExpectedError("E esses tempos negativos aí man?")
    if (args.params?.start > args.params?.end) throw new ExpectedError("O tempo final precisa ser > tempo inicial")
    if (args.params?.end - args.params?.start > audioMaxSeconds) throw new ExpectedError(`O áudio não pode ter mais que ${audioMaxSeconds}s de duração man`)

    let messageToFindAttachment = msg
    if (msg.reference?.messageId) {
        messageToFindAttachment = await msg.channel.messages.fetch(msg.reference.messageId)
    }
    const url = args.params.url || Utils.getFirstAttachmentFrom(messageToFindAttachment, allowedContentTypes, audioMaxSize)?.url
    if (!url) throw new ExpectedError("Cadê o áudio?")

    let stream
    const audioName = Utils.normalizeString(args.mainParam)
    const start = args.params.start || 0
    const end = args.params.end || start + audioMaxSeconds
    if (Utils.isYoutubeURL(url)) {
        const ytSource = await playdl.stream(url, { quality: 1, discordPlayerCompatibility: true })
        Utils.checkContentLength(ytSource.content_length, audioMaxSize)
        stream = ytSource.stream
    } else {
        const response = await axios.get(url, { responseType: 'stream' })
        Utils.checkContentLengthAndType(response, allowedContentTypes, audioMaxSize)
        stream = response.data
    }
    const audioPath = path.resolve(audioFolderPath, audioName + defaultAudioExtension)
    const progessMessage = await msg.reply("Processando...")
    return new Promise((resolve, reject) => {
        try {
            convertToMp3({
                input: stream,
                bitrate: 128,
                sampleRate: 48000,
                start,
                end
            })
                .pipe(fs.createWriteStream(audioPath))
                .on("finish", () => {
                    try {
                        progessMessage.edit(`Áudio ${audioName} criado!`)
                        msg.react("✅")
                        resolve()
                    } catch (error) {
                        reject(error)
                    }
                })
                .on("error", reject)
        } catch (error) {
            reject(error)
        }
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
    return path.basename(audio, path.extname(audio))
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
        play(bot, { member: { voice: { channel: channel } } }, path.resolve("assets", audio))
    })
}

function checkAudioFolderSizeLimit() {
    const stats = fs.statSync(audioFolderPath)
    if (stats.size > parseInt(process.env.PASTA_AUDIO_LIMITE)) {
        throw new ExpectedError("Tamanho limite da pasta atingido!")
    }
}

function init(bot) {
    if (!fs.existsSync(audioFolderPath)) {
        fs.mkdirSync(audioFolderPath, { recursive: true })
    }
}

module.exports = {
    init, run, canHandle, helpComand, runAudioPlay
}