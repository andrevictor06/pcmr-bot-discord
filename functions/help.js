const fs = require('fs')
const Utils = require("../utils/Utils")

function run(bot, msg) {
    let comands = ""
    let fields = []
    fs.readdirSync("./functions").forEach(fnFile => {
        try {
            const fn = require("../functions/" + fnFile)
            const help = fn.helpComand(bot, msg)
            if (Array.isArray(help)) {
                for (let h of help) {
                    fields.push(h)
                }
            } else {
                fields.push(fn.helpComand(bot, msg))
            }
        } catch (error) {
            console.log(fnFile)
        }
    })

    const exampleEmbed = {
        color: 0x0099ff,
        author: {
            name: process.env.APP_NAME,
            icon_url: process.env.APP_ICON,
        },
        description: 'Lista dos comandos disponíveis neste servidor Discord',
        fields: fields,
        timestamp: new Date().toISOString()
    }

    msg.reply({ embeds: [exampleEmbed] })
}

function canHandle(bot, msg) {
    return Utils.startWithCommand(msg, "help")
}


function helpComand(bot, msg) {
    return {
        name: Utils.command("help"),
        value: "Lista os comandos disponíveis neste servidor Discord",
        inline: false
    }
}

module.exports = {
    run, canHandle, helpComand
}