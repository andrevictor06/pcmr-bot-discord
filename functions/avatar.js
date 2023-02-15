const Utils = require("../utils/Utils")

function run(bot, msg) {
    msg.delete()
    if( msg && msg.mentions && msg.mentions.users.size){
        msg.mentions.users.forEach(element => {
            const usercache = bot.users.cache.get(element.id);
            if(usercache){
                msg.channel.send({ content: `${usercache.username} avatar: `, files:[usercache.displayAvatarURL({ dynamic: true })]})
            }
        });
    }else{
        msg.channel.send({ content: `${msg.author.username} avatar: `, files:[msg.author.displayAvatarURL({ dynamic: true })]})
    }
}

function canHandle(bot, msg) {
    return msg.content.startsWith(Utils.command("avatar"))
}

function helpComand(bot, msg){
    return {
        name: Utils.command("avatar") + " [@mention]",
        value: "Mostra o avatar do membro no Discord, é possível selecionar outro membro",
        inline: false
    }
}

module.exports = {
    run, canHandle, helpComand
}
