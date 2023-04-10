const Utils = require("../utils/Utils")

function run(bot, msg) {
    let user = process.env.ID_MEMBER_JUNIO
    const userMention = Utils.getMentions(msg)
    if (userMention) {
        user = userMention
    }
    msg.channel.send(`${user}, Vai comprar a ***** do PC e vem jogar direito com a gente!`)
    msg.delete()
}

function canHandle(bot, msg) {
    return Utils.startWithCommand(msg, 'comprapc')
}

function helpComand(bot, msg) {
    return {
        name: Utils.command("comprapc") + " [@mention]",
        value: "Envia uma mensagem saudável para o membro, avisando de atualizar o seu PC Master Race",
        inline: false
    }
}

module.exports = {
    run, canHandle, helpComand
}