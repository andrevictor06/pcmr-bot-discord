const express = require('express')
const router = express.Router()
const utils = require('../utils/Utils')
const { ExpectedError } = require('../utils/expected_error')
const fs = require('fs')
const path = require("path")
function init(bot) {
    
    router.get('/all', async (req, res) => {
        try {
            const figurinhas = fs.readdirSync(path.resolve("images", "figurinhas"))
            res.send(figurinhas)
        } catch (error) {
            const message = error instanceof ExpectedError ? error.message : 'Não foi possível recuperar as figurinhas'
            utils.logError(bot, error, __filename)
            res.send(message)
        }
    })
}

module.exports = {
    router,
    init
}