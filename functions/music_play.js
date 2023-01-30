const { joinVoiceChannel, AudioPlayerStatus, createAudioResource, StreamType, createAudioPlayer } = require('@discordjs/voice')
const ytdl = require("ytdl-core")
const Utils = require("../utils/Utils")

let serverQueue = null
let timeoutId = null

async function play(message) {
    const args = message.content.split(" ")

    const voiceChannel = message.member.voice.channel
    if (!voiceChannel)
        return message.channel.send("You need to be in a voice channel to play music!")

    const permissions = voiceChannel.permissionsFor(message.client.user)
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send("I need the permissions to join and speak in your voice channel!")
    }

    try {
        const song = await ytdl.getInfo(args[1])

        if (serverQueue) {
            serverQueue.songs.push(song)
            console.log(serverQueue.player.state)
            if (serverQueue.player.state.status == AudioPlayerStatus.Idle) {
                playSong(serverQueue.songs.shift())
            } else {
                message.channel.send(`${song.videoDetails.title} has been added to the queue!`)
            }
        } else {
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
            serverQueue.songs.push(song)
            serverQueue.connection.subscribe(serverQueue.player)
            serverQueue.player = serverQueue.player

            serverQueue.player
                .on(AudioPlayerStatus.Idle, () => playSong(serverQueue.songs.shift()))
                .on("error", error => console.error(error))
                .on(AudioPlayerStatus.Paused, state => {
                    console.log(state)
                    // serverQueue.textChannel.send(`Parado **${song.title}**`)
                })

            playSong(serverQueue.songs.shift())
        }
    } catch (err) {
        console.log(err)
        serverQueue = null
        return message.channel.send(err)
    }
}

function playSong(song) {
    if (song) {
        clearDelayedStopTimeout()
        const audioFormats = ytdl.filterFormats(song.formats, 'audioonly')
        const selectedFormat = audioFormats
            .filter(format => format.audioBitrate != null)
            .sort((format1, format2) => format1.audioBitrate - format2.audioBitrate)
            .find(element => element.audioBitrate >= 64)

        const stream = ytdl(song.videoDetails.video_url, { highWaterMark: 10485760, dlChunkSize: 5242880, format: selectedFormat })
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
    }, 10000)
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
            playSong(serverQueue.songs.shift())
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

function helpComand(bot, msg){
    return [
        {
            name: Utils.command("play") + " [url-musica-yt]",
            value: "Inicia ou coloca em fila a musica informada",
            inline: false
        },
        {
            name: Utils.command("stop"),
            value: "Para a execução de musica",
            inline: false
        },
        {
            name: Utils.command("skip"),
            value: "Pula para a proxima musica",
            inline: false
        }
    ]
}

module.exports = {
    run, canHandle, helpComand
}