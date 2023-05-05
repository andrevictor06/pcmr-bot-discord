const { default: axios } = require('axios')
const Utils = require("../utils/Utils")
const { parse } = require('node-html-parser');

async function search_vagalume(args){
    return axios.get(
        'https://api.vagalume.com.br/search.php',
        {
            params: {
                art: args.params.art,
                mus: args.params.mus,
                apikey: args.params.apikey || "One"
            }
        }
    )
}

async function search_letras_mus(args){
    return await axios.get(Utils.replaceAll(`https://solr.sscdn.co/letras/m1/?q=${args.params.art} ${args.params.mus}`, " ", "%20"))
}

async function search_letras_mus_completa(dns, url){
    return await axios.get(`https://www.letras.mus.br/${dns}/${url}`)
}

async function run(bot, msg) {
    const args = Utils.parseArgs(msg)

    let response = await search_vagalume(args)
    let info_letra = {}
    
    if ( ! response.data.mus) {
        let response_letras = await search_letras_mus(args);
        if( response_letras.data){
            json = JSON.parse(response_letras.data.substring(10, response_letras.data.lastIndexOf(")")))
            musica = json.response.docs[0]
            
            response_letras = await search_letras_mus_completa(musica.dns, musica.url)
            if(response_letras.data){
                
                let html = parse(response_letras.data)
                info_letra.musica = musica.txt
                info_letra.artista = musica.art
                info_letra.link = `https://www.letras.mus.br/${musica.dns}/${musica.url}`
                info_letra.letra = html.querySelector(".cnt-letra").innerHTML.trim()
                info_letra.letra = Utils.replaceAll(info_letra.letra, "<p>", "\n")
                info_letra.letra = Utils.replaceAll(info_letra.letra, "</p>", "\n")
                info_letra.letra = Utils.replaceAll(info_letra.letra, "<br>", "\n")
            }
        }
        //console.log(response_letras);
    }else{
        info_letra.musica = response.data.mus[0].name
        info_letra.artista = response.data.art.name
        info_letra.link = response.data.mus[0].url
        info_letra.letra = response.data.mus[0].text
    }
    if (info_letra.musica) {
        const limit = 4090
        let musica = info_letra.letra
        if(musica.length > limit){
            musica = musica.substring(0, limit)
        }

        const template_header = "" +
            `>>> Música: **${info_letra.musica}**\nArtista: **${info_letra.artista }**\nLink: **${info_letra.link}**`
        const template =
            `${template_header}
        `

        return msg.reply({content: template,
            embeds: [{
                description: "```" + musica + "```"
            }]
        })
    } else {
        return msg.reply(response.data.type)
    }
}

function canHandle(bot, msg) {
    return Utils.startWithCommand(msg, 'letra')
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