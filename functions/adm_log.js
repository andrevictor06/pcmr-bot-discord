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
    const logPath = path.resolve(process.env.PATH_LOG)
    const message = {};
    const logs = []
    fs.readdirSync(logPath).forEach(file => {
        logs.push({
            log: file,
            type: 1,
            components: [
                {
                    type: 2,
                    label: file,
                    style: 1,
                    custom_id: process.env.ENVIRONMENT + "adm_log" + file,
                }
            ]
        })
    })
    if( ! logs){
        msg.reply({
            content: "Não tem log, corno"
        })
    }else{
        if( logs.length == 1){
            msg.reply({
                content: "Ta na mão, corno",
                files:[path.resolve(logPath, logs[0].log)]
            })    
        }else{
            msg.reply({
                content: "Tem esses logs, corno",
                components:logs
            })

            bot.on('interactionCreate', async (event) => {
                try {
                    const customId = event.customId
                    if (customId.startsWith(process.env.ENVIRONMENT + "adm_log")) {
                        let log = customId.split(process.env.ENVIRONMENT + "adm_log")[1]
                        event.update({
                            content: `Ta na mão, corno`,
                            files: [path.resolve(logPath, log)],
                            components: []
                        })
                    }
                } catch (error) {
                    Utils.logError(bot, error, __filename)
                    event.update({
                        content: Utils.getMessageError(error),
                        components: []
                    })
                }
            })
        }
    }
}
module.exports = {
    run, canHandle, helpComand
}