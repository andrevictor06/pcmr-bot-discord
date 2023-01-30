const Utils = require("../utils/Utils")

function getMention(mention) {
    if (!mention) return

    return mention
}


function run(bot, msg) {
    const withoutPrefix = msg.content.slice("/avatar".length)
    const split = withoutPrefix.split(/ +/)
    const args = split.slice(1)

    if (args[0]) {
        const user = getMention(args[0])
        if (!user) {
            return msg.reply('Please use a proper mention if you want to see someone elses avatar.')
        }
        msg.delete()
        return msg.channel.send(`${user}, Vai comprar a ***** do PC e vem jogar direito com a gente!`)
    }
    msg.delete()
    msg.channel.send(`<@!320933526554017793>, Vai comprar a ***** do PC e vem jogar direito com a gente!`)
}

function canHandle(bot, msg) {
    return msg.content.startsWith(Utils.command("comprapc"))
}

module.exports = {
    run, canHandle
}
