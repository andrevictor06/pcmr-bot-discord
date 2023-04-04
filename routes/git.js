const express = require('express')
const router = express.Router()
const spotify = require('../functions/spotify_playlist')
const utils = require('../utils/Utils')

function init(bot) {
    router.post('/git', async (req, res) => {
        try {
            console.log(req, " req");
            const channel = await bot.channels.fetch(process.env.ID_CHANNEL_LOG_BOT)
            channel.send({ content: ` ${ JSON.stringify(req.body)} ` })

            res.send('Requisição aceita')
        } catch (error) {
            utils.logError(bot, error, __filename)
            res.send('Requisição não aceita')
        }
    })
}

module.exports = {
    router,
    init
}