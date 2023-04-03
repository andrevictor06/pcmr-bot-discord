const express = require('express')
const { getSharedVariable, deleteSharedVariable } = require('./utils/shared_variables')
const { SPOTIFY_LOGIN_STATE, SPOTIFY_LOGIN_CALLBACK_EVENT } = require('./utils/constants')
const events = require('./utils/events')

function init() {
    const app = express()

    app.get('/spotify_login', (req, res) => {
        if (req.query.state === getSharedVariable(SPOTIFY_LOGIN_STATE)) {
            deleteSharedVariable(SPOTIFY_LOGIN_STATE)
            events.emit(SPOTIFY_LOGIN_CALLBACK_EVENT, req.query.code)
            res.send('Logado!')
        } else {
            res.send("Não logado")
        }
    })

    app.listen(process.env.SERVER_PORT, () => {
        console.log(`Server UP on port ${process.env.SERVER_PORT}`)
    })
}

module.exports = {
    init
}