const Utils = require("../utils/Utils")

function run(bot, msg) {
    let message = ""
    try {
        const item = Utils.getRandomProcessador()
        message = "<@!320933526554017793>, " + item
    } catch (ex) {
        console.log(ex, " ex")
        message = "<@!320933526554017793>, Erro ao selecionar o Processador!"
    }
    msg.delete();
    msg.channel.send(message)
}

function canHandle(bot, msg) {
    return msg.content.startsWith(Utils.command("processador"))
}

module.exports = {
    run, canHandle
}
