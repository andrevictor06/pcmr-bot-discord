const { joinVoiceChannel, AudioPlayerStatus, createAudioResource, createAudioPlayer } = require('@discordjs/voice')
const ytdl = require("ytdl-core")
const Utils = require("../utils/Utils")
const ytsr = require('ytsr')
const ytpl = require('ytpl')

const oneMB = 1048576
let serverQueue = null
let timeoutId = null
let inactivityIntervalId = null

const commands = {
    play: {
        fn: play,
        help: {
            name: Utils.command("play") + " [url-yt,termo]",
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

async function play(message) {
    const voiceChannel = message.member.voice.channel
    if (!voiceChannel)
        return message.channel.send("You need to be in a voice channel to play music!")

    const permissions = voiceChannel.permissionsFor(message.client.user)
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send("I need the permissions to join and speak in your voice channel!")
    }

    try {
        const info = await getURL(message)
        if (!info) {
            return message.channel.send("Music not found!")
        }

        if (!serverQueue) {
            createServerQueue(message, voiceChannel)
        }

        addToQueue(info, message)
        if (playerIsIdle()) {
            next()
        }
    } catch (err) {
        console.log(err)
        if (serverQueue) stop()
        return message.channel.send(err)
    }
}

async function getURL(message) {
    const args = message.content.split(" ")
    if (Utils.isValidHttpUrl(args[1])) {
        const url = new URL(args[1])
        if (url.searchParams.has("list")) {
            const playlist = await ytpl(url.searchParams.get("list"), { limit: 30 })
            return playlist.items.map(item => item.url)
        }

        return args[1]
    }

    const search = args.slice(1).join(" ")
    const filter = (await ytsr.getFilters(search)).get('Type').get('Video')
    const searchResults = await ytsr(filter.url, { limit: 1 })
    if (searchResults.results > 0) {
        return searchResults.items[0].url
    }
    return null
}

async function addToQueue(songURL, message) {
    if (Array.isArray(songURL)) {
        serverQueue.songs = serverQueue.songs.concat(songURL)
        message.channel.send(`Added ${songURL.length} songs to the queue!`)
    } else {
        serverQueue.songs.push(songURL)
        const basicInfo = await ytdl.getBasicInfo(songURL)
        if (!playerIsIdle()) message.channel.send(`${basicInfo.videoDetails.title} has been added to the queue!`)
    }
}

function createServerQueue(message, voiceChannel) {
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
        .on(AudioPlayerStatus.Idle, () => next())
        .on("error", error => console.error(error))

    inactivityIntervalId = setInterval(() => {
        if (!serverQueue) {
            clearInactivityInterval()
        }

        if (!serverQueue.voiceChannel.members || serverQueue.voiceChannel.members.size == 0) {
            delayedStop()
        }
    }, 60000)
}

async function playSong(songURL) {
    if (songURL) {
        clearDelayedStopTimeout()
        const song = await ytdl.getInfo(songURL)
        if (!song) {
            serverQueue.textChannel.send(`Song with URL ${songURL} not found! Skipping...`)
            return next()
        }
        const lowerBitrateFormat = ytdl.filterFormats(song.formats, 'audioonly')
            .filter(format => format.audioBitrate != null)
            .sort((format1, format2) => format1.audioBitrate - format2.audioBitrate)
            .find(format => format.audioBitrate >= 60 && format.audioBitrate <= 128)

        const stream = ytdl(song.videoDetails.video_url, {
            highWaterMark: Number(lowerBitrateFormat.contentLength) + oneMB,
            dlChunkSize: 3145728,
            format: lowerBitrateFormat
        })
        const resource = createAudioResource(stream)
        serverQueue.player.play(resource)
        serverQueue.currentSong = song
        return serverQueue.textChannel.send(`Start playing: **${song.videoDetails.title}**`)
    } else {
        delayedStop()
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

function delayedStop() {
    timeoutId = setTimeout(() => stop(), 30000)
}

function stop() {
    if (serverQueue) {
        serverQueue.textChannel.send("Bye!")
        clearInactivityInterval()
        clearDelayedStopTimeout()
        serverQueue.player.removeAllListeners()
        stopPlayer()
        serverQueue.connection.destroy()
    }
    serverQueue = null
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

function next() {
    playSong(serverQueue.songs.shift())
}

function queue(message) {
    if (serverQueue && serverQueue.songs.length > 0) {
        message.channel.send(`There is **${serverQueue.songs.length}** songs in the queue!`)
    }
}

function currentSong(message) {
    if (serverQueue) {
        message.channel.send(`Current song: ${serverQueue.currentSong.videoDetails.video_url}`)
    }
}

async function nextSong(message) {
    if (serverQueue) {
        if (serverQueue.songs.length > 0) {
            const basicInfo = await ytdl.getBasicInfo(serverQueue.songs[0])
            message.channel.send(`Next song: ${basicInfo.videoDetails.video_url}`)
        } else {
            message.channel.send("Queue is **empty**")
        }
    }
}

function playerIsIdle() {
    if (!serverQueue) return false
    return serverQueue.player.state.status == AudioPlayerStatus.Idle
}

function stopPlayer() {
    if (serverQueue) {
        serverQueue.player.stop(true)
    }
}

function run(bot, msg) {
    Utils.executeCommand(msg, commands)
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