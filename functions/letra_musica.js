const { default: axios } = require('axios')
const Utils = require("../utils/Utils")

async function run(bot, msg) {
    const args = Utils.parseArgs(msg)

    const response = await axios.get(
        'https://api.vagalume.com.br/search.php',
        {
            params: {
                art: args.params.art,
                mus: args.params.mus,
                apikey: args.params.apikey || "One"
            }
        }
    )
    if (response.data.mus) {
        const template_musica = "```" + response.data.mus[0].text + "```"
        const template_header = "" +
            `>>> Música: **${response.data.mus[0].name}**\nArtista: **${response.data.art.name}**\nLink: **${response.data.mus[0].url}**`
        const template =
            `${template_header}

        ${template_musica}
        `
        return msg.reply(template)
    } else {
        return msg.reply(response.data.type)
    }
}

function canHandle(bot, msg) {
    return msg.content.startsWith(Utils.command("letra "))
}

function helpComand(bot, msg) {
    return {
        name: Utils.command("letra --mus [nome-musica] --art [nome-artista]"),
        value: "Consulta a letra da música informada",
        url: "https://www.vagalume.com.br/",
        inline: false
    }
}

module.exports = {
    run, canHandle, helpComand
}