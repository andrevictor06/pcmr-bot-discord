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

async function play(bot, msg, audio) {
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
        
        const caminho_audio = path.resolve("audio", audio)
        const resource = await createAudioResource(fs.createReadStream(caminho_audio))
        
        serverQueue.player.play(resource);
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

let hasListener = false;

function run(bot, msg) {
    const audios = fs.readdirSync("./audio")
    let buttons = []
    audios.forEach(audio => {
        let label = audio.split("-").join(" ").replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());
        buttons.push({
            "type": 1,
            "components": [
                {
                    "type": 2,
                    "label": label,
                    "style": 1,
                    "custom_id": "btn_audio_" + audio,
                    "audio_name": audio
                }
            ]
        })
    });
    
    msg.reply( { "components": buttons})

    if( ! hasListener){
        hasListener = true
        bot.on('interactionCreate', (event) => {
            try {
                const customId = event.customId
                if(customId.startsWith("btn_audio_")){
                    let audio = customId.split("btn_audio_")[1]
                    play(bot, msg, audio)
                }
                return true
            } catch (error) {console.log(error)}
        })
    }
    

}

function canHandle(bot, msg) {
    return msg.content.startsWith(Utils.command("audio"))
}

function helpComand(bot, msg){
    return {
        name: Utils.command("audio"),
        value: "Lista os audios disponiveis",
        inline: false
    }
}

module.exports = {
    run, canHandle, helpComand
}