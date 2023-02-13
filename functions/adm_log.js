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
    createThreads(msg.channel, msg)

    const logPath = path.resolve(process.env.PATH_LOG)
    
    const path_logs = fs.readdirSync(logPath)
    if( path_logs.length == 0){
        msg.reply({
            content: "Não tem log, corno"
        })
    }else{
        if( path_logs.length == 1){
            msg.reply({
                content: "Ta na mão, corno",
                files:[path.resolve(logPath, path_logs[0])]
            })    
        }else{
            Utils.chunkArray(path_logs, 5).forEach( list =>{
                const logs = []
                list.forEach((log)=>{
                    logs.push({
                        type: 1,
                        components: [
                            {
                                type: 2,
                                label: log,
                                style: 1,
                                custom_id: process.env.ENVIRONMENT + "adm_log" + log,
                            }
                        ]
                    })
                })

                setTimeout(() => {
                    sendMessageThread(msg.channel, {
                        content: "Tem esses logs, corno",
                        components:logs
                    })
                }, 3000)
            })
            
            bot.on('interactionCreate', async (event) => {
                try {
                    const customId = event.customId
                    if (customId.startsWith(process.env.ENVIRONMENT + "adm_log")) {
                        let log = customId.split(process.env.ENVIRONMENT + "adm_log")[1]
                        event.reply({
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

async function createThreads(channel, message) {
    const cache = channel.threads.cache.find(x => x.name === 'adm_logs')
    if (cache)
        await cache.delete()

    return await channel.threads.create({
        name: 'adm_logs',
        autoArchiveDuration: 60,
        reason: 'Logs do sistema',
    })
}

async function sendMessageThread(channel, message) {
    const thread = channel.threads.cache.find(x => x.name === 'adm_logs')
    if (thread)
        thread.send(message)
}

module.exports = {
    run, canHandle, helpComand
}