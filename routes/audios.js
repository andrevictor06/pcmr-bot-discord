const express = require('express')
const router = express.Router()
const utils = require('../utils/Utils')
const { ExpectedError } = require('../utils/expected_error')
const fs = require('fs')
const path = require("path")

function init(bot) {
    router.get('/', async (req, res) => {
        try {
            const audios = fs.readdirSync(path.resolve("audio"))
            res.send(audios)
        } catch (error) {
            const message = error instanceof ExpectedError ? error.message : 'Não foi possível recuperar os áudios'
            utils.logError(bot, error, __filename)
            res.send(message)
        }
    })
}

module.exports = {
    router,
    init
}