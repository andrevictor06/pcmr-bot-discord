const request = require('request').defaults({ encoding: null })
const Utils = require("../utils/Utils")

function run(bot, msg) {

    const params = msg.content.split("--")
    params.shift()

    var artist = "Arthur Aguiar"
    var song = "Fora da"
    var apikey = "One"

    params.forEach(element => {
        if (element.startsWith("mus ")) {
            song = element.substring(4)
        }
        if (element.startsWith("art ")) {
            artist = element.substring(4)
        }
        if (element.startsWith("apikey ")) {
            apikey = element.substring(7)
        }
    })
    request.get(`https://api.vagalume.com.br/search.php?art=${artist}&mus=${song}&apikey=${apikey}`, (error, response, body) => {

        if (!error && response.statusCode === 200) {
            let responseText = JSON.parse(Buffer.from(body).toString('utf8'))
            if (responseText && responseText.mus) {

                let template_musica = "```" + responseText.mus[0].text + "```"

                let template_header = "" +
                    `>>> Música: **${responseText.mus[0].name}**\nArtista: **${responseText.art.name}**\nLink: **${responseText.mus[0].url}**`

                let template =
                    `${template_header}

                ${template_musica}
                `
                return msg.reply(template)
            } else {
                return msg.reply(responseText.type)
            }
        }
    })
}

function canHandle(bot, msg) {
    return msg.content.startsWith(Utils.command("letra "))
}

function helpComand(bot, msg){
    return {
        name: Utils.command("letra -mus=[nome-musica] -art=[nome-artista]"),
        value: "Consulta a letra da música informada",
        url:"https://www.vagalume.com.br/",
        inline: false
    }
}

module.exports = {
    run, canHandle, helpComand
}