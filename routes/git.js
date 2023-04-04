const express = require('express')
const router = express.Router()
const { getSharedVariable, deleteSharedVariable } = require('../utils/shared_variables')
const { SPOTIFY_LOGIN_STATE } = require('../utils/constants')
const spotify = require('../functions/spotify_playlist')
const utils = require('../utils/Utils')

function init(bot) {
    router.post('/git', async (req, res) => {
        try {
            console.log( " entrou ");
            const channel = await bot.channels.fetch(process.env.ID_CHANNEL_LOG_BOT)
            channel.send({ content: ` ${ JSON.stringify(req.body)} ` })
        } catch (error) {
            utils.logError(bot, error, __filename)
            res.send('Não logado!')
        }
    })
}

module.exports = {
    router,
    init
}