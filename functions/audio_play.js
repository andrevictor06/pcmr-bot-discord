const { joinVoiceChannel, AudioPlayerStatus, createAudioResource, StreamType, createAudioPlayer } = require('@discordjs/voice')
const { join } = require('node:path')
const ytdl = require("ytdl-core")
const queue = new Map()
const Utils = require("../utils/Utils")


async function execute(message, serverQueue) {
    const args = message.content.split(" ")

    const voiceChannel = message.member.voice.channel
    if (!voiceChannel)
        return message.channel.send("You need to be in a voice channel to play music!")

    const permissions = voiceChannel.permissionsFor(message.client.user)
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send("I need the permissions to join and speak in your voice channel!")
    }

    const songInfo = await ytdl.getInfo(args[1])
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
    }

    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        }

        queue.set(message.guild.id, queueContruct)

        queueContruct.songs.push(song)

        try {
            const player = createAudioPlayer()

            var connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            })

            connection.subscribe(player)
            //connection.voice.setSelfDeaf(true)
            queueContruct.connection = connection

            play(message.guild, queueContruct.songs[0], player, message)
        } catch (err) {
            +
            console.log(err)
            queue.delete(message.guild.id)
            return message.channel.send(err)
        }
    } else {
        serverQueue.songs.push(song)
        return message.channel.send(`${song.title} has been added to the queue!`)
    }
}

function play(guild, song, player, message) {

    const serverQueue = queue.get(guild.id)
    if (!song) {
        stop(guild, serverQueue, message)
        return
    }

    const stream = ytdl(song.url, { filter: 'audioonly' })

    console.log(join(__dirname, '/audio/tema-de-abertura-do-esporte-espetacular.mp3'))
    const resource = createAudioResource(join(__dirname, '/audio/tema-de-abertura-do-esporte-espetacular.mp3'))
    player.play(resource)

    player.on(AudioPlayerStatus.Idle, () => {
        serverQueue.songs.shift()
        play(guild, serverQueue.songs[0], player, message)
    }).on("error", error => console.error(error))
        .on(AudioPlayerStatus.Paused, () => {
            serverQueue.textChannel.send(`Parado **${song.title}**`)
        })

    /*

    console.log("serverQueue ", serverQueue)
    const dispatcher = serverQueue.connection
        .play(ytdl(song.url, { filter: 'audioonly' }))
        .on("finish", () => {
            serverQueue.songs.shift()
            play(guild, serverQueue.songs[0])
        })
        .on("error", error => console.error(error))*/
    //dispatcher.setVolumeLogarithmic(serverQueue.volume / 5)
    serverQueue.textChannel.send(`Start playing: **${song.title}**`)
}

function stop(guild, serverQueue, message) {
    if (serverQueue && serverQueue.voiceChannel) {
        const connection = joinVoiceChannel({
            channelId: message.member.voice.channel.id,
            guildId: message.member.guild.id,
            adapterCreator: message.channel.guild.voiceAdapterCreator
        })
        connection.destroy()
    }
    if (guild) {
        queue.delete(guild.id)
    }

}

function run(bot, msg) {
    const serverQueue = queue.get(msg.guild.id)

    if (msg.content.startsWith(process.env.CARACTER_DEFAULT_FUNCTION + "audio ")) {
        execute(msg, serverQueue)
    }

    if (msg.content.startsWith(process.env.CARACTER_DEFAULT_FUNCTION + "audio")) {
        stop(msg.guild, serverQueue, msg)
    }
}

function canHandle(bot, msg) {
    return msg.content.startsWith(Utils.command("audio "))
}

module.exports = {
    run, canHandle
}