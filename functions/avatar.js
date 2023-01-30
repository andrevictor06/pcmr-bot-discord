const Utils = require("../utils/Utils")

function getUserFromMention(bot, mention) {
    if (!mention) return

    if (mention.startsWith('<@') && mention.endsWith('>')) {
        mention = mention.slice(2, -1)

        if (mention.startsWith('!')) {
            mention = mention.slice(1)
        }

        return bot.users.cache.get(mention)
    }
}

function run(bot, msg) {
    const withoutPrefix = msg.content.slice("/avatar".length)
    const split = withoutPrefix.split(/ +/)
    const args = split.slice(1)

    if (args[0]) {
        const user = getUserFromMention(bot, args[0])
        if (!user) {
            return msg.reply('Please use a proper mention if you want to see someone elses avatar.')
        }
        msg.delete()
        return msg.channel.send(`${user.username}'s avatar: ${user.displayAvatarURL({ dynamic: true })}`)
    }
    msg.delete()
    return msg.channel.send(`${msg.author.username}, your avatar: ${msg.author.displayAvatarURL({ dynamic: true })}`)
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
