const Utils = require("../utils/Utils")

function run(bot, msg) {
    let user = process.env.ID_MEMBER_JUNIO
    const userMention = Utils.getMentions(msg)
    if (userMention) {
        user = userMention
    }   
    const item = Utils.getRandomProcessador()
    msg.channel.send({content: user, files:[item]})
    msg.delete()
    
}

function canHandle(bot, msg) {
    return msg.content.startsWith(Utils.command("processador"))
}

function helpComand(bot, msg){
    return {
        name: Utils.command("processador") + " [@mention]",
        value: "Envia uma mensagem saudável para o membro, mostrando o que pode acontecer com o processador do seu PC Master Race",
        inline: false
    }
}

module.exports = {
    run, canHandle, helpComand
}