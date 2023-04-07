const { default: axios } = require('axios')
const Utils = require("../utils/Utils")

async function createThreads(channel, message) {
    const cache = channel.threads.cache.find(x => x.name === 'quem-esta-online')
    if (cache)
        await cache.delete()

    return await channel.threads.create({
        name: 'quem-esta-online',
        autoArchiveDuration: 60,
        reason: 'Quem está online?',
    })
}

async function sendMessageThread(channel, message) {
    const thread = channel.threads.cache.find(x => x.name === 'quem-esta-online')
    if (thread)
        thread.send({ content: (message.content) ? message.content : message })
}

function run(bot, msg) {
    let criouTopico = false
    if (msg.content.trim().startsWith(process.env.CARACTER_DEFAULT_FUNCTION + "ttlive")) {
        const hashLive = {}
        bot.channels.fetch(process.env.ID_CHANNEL_ATWITCH).then(channel => {

            channel.messages.fetch({ limit: 100 }).then(messages => {
                //Iterate through the messages here with the variable "messages".
                messages.forEach((message) => {

                    if (message.content.trim().startsWith("https://www.twitch.tv/")) {
                        const url = message.content.trim().split(" ")[0].trim()
                        if (!hashLive[url]) {
                            hashLive[url] = url

                            if (!criouTopico) {
                                criouTopico = true
                                createThreads(channel, message)
                            }

                            setTimeout(async () => {
                                try {
                                    const response = await axios.get(url)
                                    if (response.data.includes('"isLiveBroadcast":true')) {
                                        sendMessageThread(channel, url)
                                    }
                                } catch (error) {
                                    console.error(error)
                                }
                            }, 3000)
                        }
                    }
                })
            })
        })
    } else {
        bot.channels.fetch(process.env.ID_CHANNEL_ATWITCH).then(channel => {
            channel.send(msg.content)
        })
    }
}

function canHandle(bot, msg) {
    return msg.channel.id == process.env.ID_CHANNEL_UPGOOGLE && msg.content.trim().startsWith("https://www.twitch.tv/")

        || msg.channel.id == process.env.ID_CHANNEL_ATWITCH && msg.content.trim().startsWith(Utils.command("ttlive"))
}

function helpComand(bot, msg) {
    return {
        name: Utils.command("ttlive"),
        value: "Consulta se os canais Twitch selecionados estão online",
        inline: false
    }
}

module.exports = {
    run, canHandle, helpComand
}