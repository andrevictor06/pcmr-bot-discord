const { default: axios } = require('axios')
const Utils = require("../utils/Utils")

async function run(bot, msg) {
    const listFiles = []
    //console.log("msg.content 2 ", msg)
    const args = msg.content.split(" ")
    if (msg.attachments) {
        msg.attachments.forEach(attachment => {
            console.log("attachment", attachment)
            listFiles.push({
                "url": attachment.url,
                "title": attachment.name
            })
        })
    }

    if (msg.embeds) {
        msg.embeds.forEach(embed => {
            // console.log("embed", embed)
            listFiles.push({
                "url": embed.url,
                "title": embed.title
            })
        })
    }

    if (args[1]) {
        const url = process.env.URL_APPLETS + "upload"
        const response = await axios.post(
            url,
            {
                files: listFiles
            },
            {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        )
        msg.channel.send(response.data)
    }
}

function canHandle(bot, msg) {
    return Utils.startWithCommand(msg, 'subreddit')
}

function helpComand(bot, msg) {
    return {
        name: Utils.command("subreddit") + " [name-subreddit]",
        value: "Meia noite te conto",
        inline: false
    }
}

module.exports = {
    run, canHandle, helpComand
}