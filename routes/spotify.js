const express = require('express')
const router = express.Router()
const { getSharedVariable, deleteSharedVariable } = require('../utils/shared_variables')
const { SPOTIFY_LOGIN_STATE } = require('../utils/constants')
const spotify = require('../functions/spotify_playlist')
const utils = require('../utils/Utils')

function init(bot) {
    router.get('/login', async (req, res) => {
        try {
            if (req.query.state !== getSharedVariable(SPOTIFY_LOGIN_STATE)) throw new Error('Código State inválido')
            deleteSharedVariable(SPOTIFY_LOGIN_STATE)
            await spotify.authenticate(req.query.code)
            res.send('Logado!')
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