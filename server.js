const express = require('express')
const { getSharedVariable, setSharedVariable, deleteSharedVariable } = require('./utils/shared_variables')
const { SPOTIFY_LOGIN_STATE, SPOTIFY_LOGIN_CODE } = require('./utils/constants')
const localstorage = require('./utils/localstorage')

function init() {
    const app = express()

    app.get('/spotify_login', (req, res) => {
        if (req.query.state === getSharedVariable(SPOTIFY_LOGIN_STATE)) {
            deleteSharedVariable(SPOTIFY_LOGIN_STATE)
            localstorage.setItem(SPOTIFY_LOGIN_CODE, req.query.code)
            res.send('Logado!')
        } else {
            res.send("Não logado")
        }
    })

    app.get('/hello', (req, res) => {
        res.send("Hello world")
    })

    app.listen(process.env.SERVER_PORT, () => {
        console.log(`Server UP on port ${process.env.SERVER_PORT}`)
    })
}

module.exports = {
    init
}