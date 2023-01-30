const Utils = require("../utils/Utils")

function run(bot, msg) {
    msg.channel.send("TESTE WEBHOOK")
}

function canHandle(bot, msg) {
    return msg.content.startsWith(Utils.command("copy "))
}

module.exports = {
    run, canHandle
}