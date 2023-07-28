const express = require('express')
const router = express.Router()
const utils = require('../utils/Utils')
const { ExpectedError } = require('../utils/expected_error')
const fs = require('fs')
const path = require("path")
const helpComand = require("../functions/help")

function init(bot) {
    router.get('/', async (req, res) => {
        try {
            const comandos = helpComand.getHelpCommands(bot, null)
            res.send(comandos)
        } catch (error) {
            const message = error instanceof ExpectedError ? error.message : 'Não foi possível recuperar os comandos'
            utils.logError(bot, error, __filename)
            res.send(message)
        }
    })
}

module.exports = {
    router,
    init
}