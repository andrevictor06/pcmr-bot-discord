const { default: axios } = require('axios');
const Utils = require("../utils/Utils")
const playdl = require('play-dl');
const { ExpectedError } = require('../utils/expected_error');

async function getInfoVideo(url) {
    const result = await playdl.search(url, { source: { youtube: 'video' }, limit: 1 })
    if (result && result.length > 0) {
        return result[0]
    }
    return {"title": url, "url": url, "thumbnails":[{"url":url}]}
    //throw new ExpectedError('Não achei os metadados do vídeo')
}

async function sendMessageChannel(message, url_video, id_w2g) {
    const video_basic_info = await getInfoVideo(url_video)    
    
    const exampleEmbed = {
        author: {
            name: `Watch2Gether`,
            icon_url: "https://w2g.tv/assets/256.f5817612.png"
        },
        title: `Vídeo adicionado no Watch2Gether com sucesso!!`,
        url: `https://w2g.tv/rooms/${id_w2g}`,

        fields: [
            {
                name: "Acesse a sala:", value: `https://w2g.tv/rooms/${id_w2g}`
            },
            {
                name: video_basic_info.title, value: video_basic_info.url
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

async function createWatch(message, args) {
    if (args.mainParam) {
        const response = await axios.post(
            "https://api.w2g.tv/rooms/create.json",
            {
                w2g_api_key: process.env.W2G_API_KEY,
                share: args.mainParam,
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

        await sendMessageChannel(message, args.mainParam, response.data.streamkey)
    }
}

async function addWatch(message, args) {
    if (args.params.id_sala) {
        await axios.post(
            "https://w2g.tv/rooms/" + args.params.id_sala + "/playlists/current/playlist_items/sync_update",
            {
                w2g_api_key: process.env.W2G_API_KEY,
                add_items: [
                    { url: args.mainParam }
                ]
            },
            {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        )

        await sendMessageChannel(message, args.mainParam, args.params.id_sala)
    }
}

async function run(bot, msg) {
    msg.suppressEmbeds(true)
    const args = Utils.parseArgs(msg)
    if (args.params.id_sala) {
        await addWatch(msg, args)
    } else {
        await createWatch(msg, args)
    }
}

function canHandle(bot, msg) {
    return Utils.startWithCommand(msg, 'video')
}

function helpComand(bot, msg) {
    return {
        name: Utils.command("video") + " [url-video] [--id_sala]",
        value: "Abre uma sala no Watch2Gether com o vídeo informado",
        inline: false
    }
}

module.exports = {
    run, canHandle, helpComand
}