const Utils = require("../utils/Utils")
const fs = require('fs')
const path = require("path")

function canHandle(bot, msg) {
    return msg.channel.id == process.env.ID_CHANNEL_LOG_BOT && msg.content.startsWith(Utils.command("adm_log"))
}

function helpComand(bot, msg) {
    return {
        name: Utils.command("adm_log"),
        value: "Retorna o log do sistema",
        inline: false
    }
}

function run(bot, msg){
    const audioPath = path.resolve(process.env.PATH_LOG)
    msg.reply({
        content: "Ta na mão, corno",
        files:[audioPath]
    })
}
module.exports = {
    run, canHandle, helpComand
}