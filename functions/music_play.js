const { joinVoiceChannel, AudioPlayerStatus, createAudioResource, createAudioPlayer } = require('@discordjs/voice')
const Utils = require("../utils/Utils")
const { ExpectedError } = require('../utils/expected_error')
const playdl = require('play-dl');
const { MUSIC_QUEUE_NAME, AUDIO_QUEUE_NAME, sharedVariableExists, setSharedVariable, getSharedVariable, deleteSharedVariable } = require("../utils/shared_variables")

let timeoutId = null
let inactivityIntervalId = null

const commands = {
    play: {
        fn: play,
        help: {
            name: Utils.command("play") + " [url-yt/termo]",
            value: "Inicia ou coloca em fila a música informada",
            inline: false
        }
    },
    stop: {
        fn: stop,
        help: {
            name: Utils.command("stop"),
            value: "Para a execução de música",
            inline: false
        }
    },
    skip: {
        fn: skip,
        help: {
            name: Utils.command("skip"),
            value: "Pula para a proxima música",
            inline: false
        }
    },
    queue: {
        fn: queue,
        help: {
            name: Utils.command("queue"),
            value: "Mostra quantas músicas estão na fila",
            inline: false
        }
    },
    current: {
        fn: currentSong,
        help: {
            name: Utils.command("current"),
            value: "Mostra a música que está tocando",
            inline: false
        }
    },
    next: {
        fn: nextSong,
        help: {
            name: Utils.command("next"),
            value: "Mostra a próxima música na fila",
            inline: false
        }
    }
}

async function play(bot, message) {
    try {
        Utils.checkVoiceChannelPreConditions(message)

        const args = message.content.split(" ")
        if (args.length == 1) throw new ExpectedError("Cadê a música man?")

        const firstTime = !sharedVariableExists(MUSIC_QUEUE_NAME)
        if (firstTime) {
            createServerQueue(bot, message, message.member.voice.channel)
        }

        const url = await getURL(bot, args)
        if (!url) throw new ExpectedError("Achei nada man")

        const isIdle = playerIsIdle()
        await addToQueue(url, message, !firstTime && !isIdle)
        if (firstTime || isIdle) {
            return next(bot)
        }
    } catch (error) {
        Utils.logError(bot, error, __filename)
        message.channel.send(Utils.getMessageError(error))
    }
}

async function getURL(bot, args) {
    if (Utils.isValidHttpUrl(args[1])) {
        const url = new URL(args[1])
        if (url.searchParams.has("list")) {
            try {
                const playlistInfo = await playdl.playlist_info(args[1], { incomplete: true })
                const videos = await playlistInfo.all_videos()
                return videos.filter(v => v.url != null).map(v => v.url)
            } catch (error) {
                Utils.logError(bot, error, __filename)
            }
        }

        return args[1]
    }

    const search = args.slice(1).join(" ")
    const result = await playdl.search(search, { source: { youtube: 'video' }, limit: 1 })
    if (result && result.length > 0) {
        return result[0].url
    }
    return null
}

async function addToQueue(songURL, message, showAddedMessage = false) {
    const serverQueue = getSharedVariable(MUSIC_QUEUE_NAME)
    if (Array.isArray(songURL)) {
        serverQueue.songs = serverQueue.songs.concat(songURL)
        message.channel.send(`Adicionei ${songURL.length} músicas na fila!`)
    } else {
        const basicInfo = await loadSongInfo(songURL)
        serverQueue.songs.push(basicInfo)
        if (showAddedMessage) {
            message.channel.send(`**${basicInfo.video_details.title}** foi adicionada na fila!`)
        }
    }
}

function createServerQueue(bot, message, voiceChannel) {
    if (sharedVariableExists(AUDIO_QUEUE_NAME)) throw new ExpectedError("Tem um áudio tocando man, calma ae")
    const serverQueue = {
        player: createAudioPlayer(),
        textChannel: message.channel,
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
    serverQueue.connection.subscribe(serverQueue.player)

    serverQueue.player
        .on(AudioPlayerStatus.Idle, () => next(bot))
    serverQueue.player.on("error", error => {
        Utils.logError(bot, error, __filename)
        serverQueue.textChannel.send(Utils.getMessageError(error))
    })
    setSharedVariable(MUSIC_QUEUE_NAME, serverQueue)

    inactivityIntervalId = setInterval(() => {
        if (!serverQueue) {
            clearInactivityInterval()
        }

        if (!serverQueue.voiceChannel.members || serverQueue.voiceChannel.members.size == 0) {
            delayedStop(bot)
        }
    }, 60000)
}

async function playSong(bot, song) {
    const serverQueue = getSharedVariable(MUSIC_QUEUE_NAME)
    try {
        if (!song) {
            serverQueue.currentSong = null
            return delayedStop(bot)
        }
        clearDelayedStopTimeout()

        const songWithInfo = await loadSongInfo(song)
        const stream = await playdl.stream(songWithInfo.video_details.url, { quality: 1 })
        const resource = createAudioResource(stream.stream, { inputType: stream.type })

        serverQueue.player.play(resource)
        serverQueue.currentSong = songWithInfo
        serverQueue.textChannel.send(`Tocando: **${songWithInfo.video_details.title}**`)
    } catch (error) {
        Utils.logError(bot, error, __filename)
        serverQueue.textChannel.send(Utils.getMessageError(error))
        return next(bot)
    }
}

function clearDelayedStopTimeout() {
    if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
    }
}

function clearInactivityInterval() {
    if (inactivityIntervalId) {
        clearInterval(inactivityIntervalId);
        inactivityIntervalId = null
    }
}

function delayedStop(bot, message) {
    timeoutId = setTimeout(() => stop(bot, message), 60000)
}

function playerIsIdle() {
    return getSharedVariable(MUSIC_QUEUE_NAME).player.state.status == AudioPlayerStatus.Idle && timeoutId
}

function stop(bot, message) {
    try {
        const serverQueue = getSharedVariable(MUSIC_QUEUE_NAME)
        if (serverQueue) {
            clearInactivityInterval()
            clearDelayedStopTimeout()
            serverQueue.player.removeAllListeners()
            stopPlayer()
            const textChannel = message && message.channel ? message.channel : serverQueue.textChannel
            if (sharedVariableExists(AUDIO_QUEUE_NAME)) {
                textChannel.send("Parei as músicas aqui man")
            } else {
                serverQueue.connection.destroy()
                textChannel.send("Falou man")
            }
        }

        deleteSharedVariable(MUSIC_QUEUE_NAME)
    } catch (error) {
        Utils.logError(error)
        if (message) {
            message.channel.send(Utils.getMessageError(error))
        }
    }
}

function skip(bot, message) {
    if (sharedVariableExists(AUDIO_QUEUE_NAME)) return message.channel.send("Tem um áudio tocando man, calma ae")

    if (getSharedVariable(MUSIC_QUEUE_NAME).songs.length > 0) {
        stopPlayer()
    } else {
        message.channel.send("Fila tá vazia man")
    }
}

function next(bot) {
    return playSong(bot, getSharedVariable(MUSIC_QUEUE_NAME).songs.shift())
}

function queue(bot, message) {
    const serverQueue = getSharedVariable(MUSIC_QUEUE_NAME)
    if (serverQueue.songs.length > 0) {
        message.channel.send(`Tem **${serverQueue.songs.length}** música(s) na fila!`)
    } else {
        message.channel.send("Fila tá vazia man")
    }
}

function currentSong(bot, message) {
    const serverQueue = getSharedVariable(MUSIC_QUEUE_NAME)
    if (serverQueue.currentSong) {
        message.channel.send(`Tá tocando isso aqui: ${serverQueue.currentSong.video_details.url}`)
    } else {
        message.channel.send("Tem nada tocando man")
    }
}

async function nextSong(bot, message) {
    const serverQueue = getSharedVariable(MUSIC_QUEUE_NAME)
    try {
        if (serverQueue.songs.length > 0) {
            const songWithInfo = await loadSongInfo(serverQueue.songs[0])
            message.channel.send(`Próxima música: ${songWithInfo.video_details.url}`)
        } else {
            message.channel.send("Fila tá vazia man")
        }
    } catch (error) {
        Utils.logError(error)
        message.channel.send(Utils.getMessageError(error))
    }
}

async function loadSongInfo(possibleSongInfo) {
    if (typeof possibleSongInfo == 'string') {
        const songWithInfo = await playdl.video_basic_info(possibleSongInfo)
        if (!songWithInfo) throw new ExpectedError("Não consegui achar a música man")
        return songWithInfo
    }
    return possibleSongInfo
}

function stopPlayer() {
    const serverQueue = getSharedVariable(MUSIC_QUEUE_NAME)
    if (!serverQueue) throw new ExpectedError("Opa, tem nada tocando man")

    serverQueue.player.stop(true)
}

function run(bot, msg) {
    if (!Utils.startWithCommand(msg, "play") && !sharedVariableExists(MUSIC_QUEUE_NAME)) return msg.channel.send("Nem tô na sala man")

    return Utils.executeCommand(bot, msg, commands)
}

function canHandle(bot, msg) {
    return Utils.containsCommand(msg, commands)
}

function helpComand(bot, msg) {
    return Object.values(commands)
        .map(value => value.help)
        .filter(value => value != null)
}

module.exports = {
    run, canHandle, helpComand
}