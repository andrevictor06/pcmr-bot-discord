const Utils = require("../utils/Utils")

function run(bot, msg) {
    let user = "<@!320933526554017793>"
    let message = ""
    try {
        const item = Utils.getRandomPlacaMae()
        message = user + ", " + item
    } catch (ex) {
        console.log(ex, " ex")
        message = user + ", " + "Erro ao selecionar a Placa mãe!"
    }
    msg.delete();
    return msg.channel.send(message)
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