const { default: axios } = require('axios');
const Utils = require("../utils/Utils")

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
            console.log(response.data, " dowloaded")
            message.channel.send("Sala no Watch2Gether criada com sucesso!! Para participar acesse: https://w2g.tv/rooms/" + response.data.streamkey)
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
        message.channel.send("Vídeo adicionado no Watch2Gether com sucesso!! Para participar acesse: https://w2g.tv/rooms/" + args[1])
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