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

function helpComand(bot, msg){
    return {
        name: Utils.command("processador") + " [@mention]",
        value: "Envia uma mensagem saudável para o membro, mostrando o que pode acontecer com o processador",
        inline: false
    }
}

module.exports = {
    run, canHandle, helpComand
}