const { joinVoiceChannel, AudioPlayerStatus, createAudioResource, createAudioPlayer } = require('@discordjs/voice')
const ytdl = require("ytdl-core")
const Utils = require("../utils/Utils")
const ytsr = require('ytsr');

let serverQueue = null
let timeoutId = null

async function play(message) {
    const voiceChannel = message.member.voice.channel
    if (!voiceChannel)
        return message.channel.send("You need to be in a voice channel to play music!")

    const permissions = voiceChannel.permissionsFor(message.client.user)
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send("I need the permissions to join and speak in your voice channel!")
    }

    try {
        const song = await getSongInfo(message)
        if (!song) {
            return message.channel.send("Music not found!")
        }

        if (serverQueue) {
            addToQueue(song)
        } else {
            createServerQueue(message, voiceChannel)
            playSong(song)
        }
    } catch (err) {
        console.log(err)
        if (serverQueue) stop()
        return message.channel.send(err)
    }
}

async function getSongInfo(message) {
    const args = message.content.split(" ")
    if (Utils.isValidHttpUrl(args[1])) {
        return await ytdl.getInfo(args[1])
    }

    const search = args.slice(1).join(" ")
    const filter = (await ytsr.getFilters(search)).get('Type').get('Video')
    const searchResults = await ytsr(filter.url, { limit: 1 });
    if (searchResults.results > 0) {
        return await ytdl.getInfo(searchResults.items[0].url)
    }
    return null
}

function addToQueue(song) {
    serverQueue.songs.push(song)
    if (serverQueue.player.state.status == AudioPlayerStatus.Idle) {
        playSong(serverQueue.songs.shift())
    } else {
        serverQueue.textChannel.send(`${song.videoDetails.title} has been added to the queue!`)
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
        .on(AudioPlayerStatus.Idle, () => playSong(serverQueue.songs.shift()))
        .on("error", error => console.error(error))
        .on(AudioPlayerStatus.Paused, state => {
            console.log(state)
            // serverQueue.textChannel.send(`Parado **${song.title}**`)
        })
}

function playSong(song) {
    if (song) {
        clearDelayedStopTimeout()
        const lowerBitrateFormat = ytdl.filterFormats(song.formats, 'audioonly')
            .filter(format => format.audioBitrate != null)
            .sort((format1, format2) => format1.audioBitrate - format2.audioBitrate)
            .find(element => element.audioBitrate >= 60)

        const stream = ytdl(song.videoDetails.video_url, { highWaterMark: 10485760, dlChunkSize: 5242880, format: lowerBitrateFormat })
        const resource = createAudioResource(stream)
        serverQueue.player.play(resource)
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

function delayedStop() {
    timeoutId = setTimeout(() => {
        stop()
        timeoutId = null
    }, 30000)
}

function stop() {
    if (serverQueue && serverQueue.connection) {
        serverQueue.connection.destroy()
    }
    serverQueue = null
}

function skip() {
    if (serverQueue) {
        const song = serverQueue.songs.shift()
        if (song) {
            playSong(song)
        } else {
            stop()
        }
    }
}

function run(bot, msg) {
    if (Utils.startWithCommand(msg, "play")) {
        play(msg)
    }

    if (Utils.startWithCommand(msg, "stop")) {
        stop()
    }

    if (Utils.startWithCommand(msg, "skip")) {
        skip()
    }
}

function canHandle(bot, msg) {
    return Utils.startWithCommand(msg, "play") || Utils.startWithCommand(msg, "stop") || Utils.startWithCommand(msg, "skip")
}

module.exports = {
    run, canHandle
}