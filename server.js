const fs = require('fs')
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const helmet = require("helmet")
const cors = require("cors")
const hpp = require('hpp')
const Utils = require("./utils/Utils")

function init(bot) {
    const app = express()
    if (process.env.ENVIRONMENT == "DES") {
        app.use(helmet({ crossOriginResourcePolicy: false }))
        app.use(cors())
        app.use('/images/figurinhas', express.static("images/figurinhas"))
    } else {
        app.use(helmet())
    }
    app.use(bodyParser.json())
    app.use(hpp())

    initRoutes(app, bot)

    app.listen(process.env.SERVER_PORT, () => {
        console.log(`Server UP on port ${process.env.SERVER_PORT}`)
    })
}

function initRoutes(app, bot) {
    try {
        fs.readdirSync("./routes").forEach((file) => {
            const route = require(path.join(__dirname, 'routes', file))

            if (route.init) {
                route.init(bot)
            } else {
                console.log(`A rota ${file} não possui uma função 'init'.`)
            }

            const routePath = '/bot/' + path.basename(file, path.extname(file))
            app.use(routePath, route.router)
        })
    } catch (error) { Utils.logError(bot, error, __filename) }
}

module.exports = {
    init
}