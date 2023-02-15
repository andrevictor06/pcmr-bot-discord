const Utils = require("../utils/Utils")

function run(bot, msg) {
    let user = process.env.ID_MEMBER_JUNIO
    const userMention = Utils.getMentions(msg)
    if (userMention) {
        user = userMention
    }   
    let message = ""
    try {
        const item = Utils.getRandomPlacaMae()
        message = {content: user, files:[item]}
    } catch (ex) {
        message = user + ", " + "Erro ao selecionar a Placa mãe!"
    }
    msg.channel.send(message)
    msg.delete()
}

function canHandle(bot, msg) {
    return msg.content.startsWith(Utils.command("placa")) || msg.content.startsWith(Utils.command("praca"))
}


function helpComand(bot, msg){
    return {
        name: Utils.command("placa") + " [@mention]",
        value: "Envia uma mensagem saudável para o membro, mostrando o que pode acontecer com a placa mãe",
        inline: false
    }
}

module.exports = {
    run, canHandle, helpComand
}