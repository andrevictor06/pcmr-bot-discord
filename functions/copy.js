const Utils = require("../utils/Utils")

function run(bot, msg) {
    msg.channel.send("TESTE WEBHOOK")
}

function canHandle(bot, msg) {
    return Utils.startWithCommand(msg, 'copy')
}

module.exports = {
    run, canHandle
}