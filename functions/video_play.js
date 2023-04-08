const { default: axios } = require('axios');
const Utils = require("../utils/Utils")
const playdl = require('play-dl');

async function getInfoVideo(url){
    const result = await playdl.search(url, { source: { youtube: 'video' }, limit: 1 })
    if (result && result.length > 0) {
        return result[0]
    }
    return null
}

async function sendMessageChannel( message, url_video, id_w2g){
    const video_basic_info = await getInfoVideo(url_video)
    const exampleEmbed = {
        author: {
            name: `Watch2Gether`,
            icon_url: "https://w2g.tv/assets/256.f5817612.png"
        },
        title: `Vídeo adicionado no Watch2Gether com sucesso!!`,
        url: `https://w2g.tv/rooms/${id_w2g}`,

        fields:[
            {
                name: "Acesse a sala:", value: `https://w2g.tv/rooms/${id_w2g}`
            },
            {
                name: video_basic_info.title  , value: video_basic_info.url
            }
        ],
        image: {
            url: video_basic_info.thumbnails[0].url
        }
    }

    message.channel.send({
        embeds: [exampleEmbed] 
    })
}

async function createWatch(message) {
    const args = message.content.split(" ")
    if (args[1]) {
        try {
            const response = await axios.post(
                "https://api.w2g.tv/rooms/create.json",
                {
                    w2g_api_key: process.env.W2G_API_KEY,
                    share: args[1],
                    bg_color: "#000000",
                    bg_opacity: "75"
                },
                {
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            )
            
            await sendMessageChannel(message, args[1], response.data.streamkey)
        } catch (error) {
            message.channel.send("Erro ao criar a sala!")
            throw error
        }
    }
}

async function addWatch(message) {
    const args = message.content.split(" ")
    if (args[2]) {
        await axios.post(
            "https://w2g.tv/rooms/" + args[1] + "/playlists/current/playlist_items/sync_update",
            {
                w2g_api_key: process.env.W2G_API_KEY,
                add_items: [
                    { url: args[2] }
                ]
            },
            {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        )

        await sendMessageChannel(message, args[2], args[1])
    }
}

async function execute(message) {
    const args = message.content.split(" ")
    if (args[2]) {
        addWatch(message)
    } else {
        createWatch(message)
    }
}


function run(bot, msg) {
    msg.suppressEmbeds(true)
    execute(msg)
}

function canHandle(bot, msg) {
    return msg.content.startsWith(Utils.command("video "))
}

function helpComand(bot, msg) {
    return {
        name: Utils.command("video") + " [url-video]",
        value: "Abre uma sala no Watch2Gether com o vídeo informado",
        inline: false
    }
}

module.exports = {
    run, canHandle, helpComand
}