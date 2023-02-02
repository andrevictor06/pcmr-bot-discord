const { joinVoiceChannel, AudioPlayerStatus, createAudioResource, createAudioPlayer } = require('@discordjs/voice')
const Utils = require("../utils/Utils")
const audioPlay = require('./audio_play')
const { ExpectedError } = require('../utils/expected_error')
const playdl = require('play-dl');

let serverQueue = null
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
        const firstTime = !serverQueue
        if (firstTime) {
            createServerQueue(bot, message, message.member.voice.channel)
        }

        const url = await getURL(bot, message)
        if (!url) throw new ExpectedError("Nothing found!")

        await addToQueue(url, message, firstTime)
        if (firstTime || playerIsIdle()) {
            next(bot)
        }
    } catch (error) {
        Utils.logError(bot, error, __filename)
        message.channel.send(Utils.getMessageError(error))
    }
}

async function getURL(bot, message) {
    const args = message.content.split(" ")
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

async function addToQueue(songURL, message, firstTime = false) {
    if (Array.isArray(songURL)) {
        serverQueue.songs = serverQueue.songs.concat(songURL)
        message.channel.send(`Added ${songURL.length} songs to the queue!`)
    } else {
        const basicInfo = await loadSongInfo(songURL)
        serverQueue.songs.push(basicInfo)
        if (!firstTime) {
            message.channel.send(`**${basicInfo.video_details.title}** has been added to the queue!`)
        }
    }
}

function createServerQueue(bot, message, voiceChannel) {
    if (audioPlay.getServerQueue()) throw new Error("An audio is running!")
    serverQueue = {
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
        .on("error", error => {
            Utils.logError(bot, error, __filename)
            message.channel.send(Utils.getMessageError(error))
        })

    inactivityIntervalId = setInterval(() => {
        if (!serverQueue) {
            clearInactivityInterval()
        }

        if (!serverQueue.voiceChannel.members || serverQueue.voiceChannel.members.size == 0) {
            delayedStop(bot, message)
        }
    }, 60000)
}

async function playSong(bot, song) {
    try {
        if (!song) return delayedStop(bot)
        clearDelayedStopTimeout()

        const songWithInfo = await loadSongInfo(song)
        const stream = await playdl.stream(songWithInfo.video_details.url, { quality: 1 })
        const resource = createAudioResource(stream.stream, { inputType: stream.type })

        serverQueue.player.play(resource)
        serverQueue.currentSong = songWithInfo
        serverQueue.textChannel.send(`Start playing: **${songWithInfo.video_details.title}**`)
    } catch (error) {
        Utils.logError(bot, error, __filename)
        serverQueue.textChannel.send(Utils.getMessageError(error))
        next(bot)
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
    return serverQueue.player.state.status == AudioPlayerStatus.Idle && serverQueue.songs.length == 0
}

function stop(bot, message) {
    try {
        if (serverQueue) {
            if (audioPlay.getServerQueue()) throw new ExpectedError("An audio is running!")
            clearInactivityInterval()
            clearDelayedStopTimeout()
            serverQueue.player.removeAllListeners()
            stopPlayer()
            serverQueue.connection.destroy()
            serverQueue.textChannel.send("Falou man")
        }
        serverQueue = null
    } catch (error) {
        if (message) {
            message.channel.send(Utils.getMessageError(error))
        }
    }
}

function skip() {
    if (serverQueue) {
        if (serverQueue.songs.length > 0) {
            stopPlayer()
        } else {
            serverQueue.textChannel.send("Queue is **empty**")
        }
    }
}

function next(bot) {
    playSong(bot, serverQueue.songs.shift())
}

function queue(bot, message) {
    if (serverQueue && serverQueue.songs.length > 0) {
        message.channel.send(`There is **${serverQueue.songs.length}** songs in the queue!`)
    }
}

function currentSong(bot, message) {
    if (serverQueue) {
        message.channel.send(`Current song: ${serverQueue.currentSong.video_details.url}`)
    }
}

async function nextSong(bot, message) {
    if (serverQueue) {
        if (serverQueue.songs.length > 0) {
            try {
                const songWithInfo = await loadSongInfo(serverQueue.songs[0])
                message.channel.send(`Next song: ${songWithInfo.video_details.url}`)
            } catch (error) {
                Utils.logError(error)
                message.channel.send(Utils.getMessageError(error))
            }
        } else {
            message.channel.send("Queue is **empty**")
        }
    }
}

async function loadSongInfo(possibleSongInfo) {
    if (typeof possibleSongInfo == 'string') {
        const songWithInfo = await playdl.video_basic_info(possibleSongInfo)
        if (!songWithInfo) throw new ExpectedError("Fail to load song info")
        return songWithInfo
    }
    return possibleSongInfo
}

function stopPlayer() {
    if (serverQueue) {
        serverQueue.player.stop(true)
    }
}

function run(bot, msg) {
    Utils.executeCommand(bot, msg, commands)
}

function canHandle(bot, msg) {
    return Utils.containsCommand(msg, commands)
}

function helpComand(bot, msg) {
    return Object.values(commands)
        .map(value => value.help)
        .filter(value => value != null)
}

function getServerQueue() {
    return serverQueue
}

module.exports = {
    run, canHandle, helpComand, getServerQueue
}