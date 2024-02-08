const Utils = require("../utils/Utils")
const musica_play = require('./music_play')

const { setSharedVariable} = require("../utils/shared_variables")
const { PLAYLIST_CALLBACK_AUDIO_STATUS_IDLE } = require('../utils/constants')

function sortearMusicaSpotify(){

    const lista = [
        
        {
            id: 'teste',
            name: 'monki flip',
            artists: [
                {
                    name: ''
                }
            ]
        },
        {
            id: 'teste',
            name: 'Crash Bandicoot dançando ',
            artists: [
                {
                    name: 'AI AI AI Bota Bota Bota'
                }
            ]
        },
        /*{
            id: 'teste',
            name: 'Can´t Get Over',
            artists: [
                {
                    name: 'KASINO'
                }
            ]
        },
        {
            id: 'teste',
            name: 'stay With Me',
            artists: [
                {
                    name: 'miki matsubara'
                }
            ]
        },
        {
            id: 'teste',
            name: 'BAILE DE FAVELA',
            artists: [
                {
                    name: 'METALEIRO'
                }
            ]
        }*/
    ]

    return Utils.getRandomFromArray(lista)
}

function runMusicaSpotify(bot, msg, voiceChannel){
    const musica = sortearMusicaSpotify()
    if( musica.name ){
        msg.content = `${process.env.CARACTER_DEFAULT_FUNCTION}play ${musica.name} ${musica.artists.map(x=>x.name + " ")}`
        musica_play.play(bot, msg)
    }
}

function run(bot, msg) {
    setSharedVariable(PLAYLIST_CALLBACK_AUDIO_STATUS_IDLE, runMusicaSpotify)
    runMusicaSpotify(bot, msg)
}

function canHandle(bot, msg) {
    return Utils.startWithCommand(msg, "playlist")
}


function helpComand(bot, msg) {
    return {
        name: Utils.command("playlist"),
        value: "Inicia a playlist URSAL em loop",
        inline: false
    }
}

module.exports = {
    run, canHandle, helpComand
}