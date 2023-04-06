const express = require('express')
const router = express.Router()
const spotify = require('../functions/spotify_playlist')
const utils = require('../utils/Utils')
const { ExpectedError } = require('../utils/expected_error')

function init(bot) {
    router.get('/login', async (req, res) => {
        try {
            await spotify.authenticate(req.query.code, req.query.state)
            res.send('Login realizado com sucesso!')
        } catch (error) {
            const message = error instanceof ExpectedError ? error.message : 'Não foi possível logar'
            utils.logError(bot, error, __filename)
            res.send(message)
        }
    })
}

module.exports = {
    router,
    init
}