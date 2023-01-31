const { joinVoiceChannel, createAudioResource, createAudioPlayer } = require('@discordjs/voice')
const queue = new Map()
const Utils = require("../utils/Utils")
const fs = require('fs')
const path = require("path")


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

async function play(bot, msg) {
    try {
        let serverQueue = queue.get(msg.guild.id)
        const message = msg
        const voiceChannel = message.member.voice.channel
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
        
        const caminho_audio = path.resolve("audio","yamete-kudasai.mp3")
        const resource = await createAudioResource(fs.createReadStream(caminho_audio))
        
        serverQueue.player.play(resource);
        return serverQueue.textChannel.send(`Start playing: `)
    } catch (error) {
        logError(error)
    }
}


async function logError(error) {
    console.error(error)
    /*const channel = await discordBot.channels.fetch(process.env.ID_CHANNEL_LOG_BOT)
    const errorContent = error.stack ? error.stack : error
    channel.send({ content: '> Erro no AudioPlayer\n```' + errorContent + '```' })*/
}

function run(bot, msg) {
    const serverQueue = queue.get(msg.guild.id)
    if (msg.content.startsWith(Utils.command("audio "))) {
        play(bot, msg)
    }
}

function canHandle(bot, msg) {
    return msg.content.startsWith(Utils.command("audio "))
}

function helpComand(bot, msg){
    return {
        name: Utils.command("audio") + " [name-audio]",
        value: "Inicia um audio",
        inline: false
    }
}

module.exports = {
    run, canHandle, helpComand
}