const fs = require('fs')
const path = require('path')
const express = require('express')

function init(bot) {
    const app = express()

    initRoutes(app, bot)

    app.listen(process.env.SERVER_PORT, () => {
        console.log(`Server UP on port ${process.env.SERVER_PORT}`)
    })
}

function initRoutes(app, bot) {
    try {
        fs.readdirSync("./routes").forEach((file) => {
            const route = require(path.join(__dirname, 'routes', file))
    
            if (typeof route.init === 'function') {
                route.init(bot)
            } else {
                log.warn(`A rota ${file} não possui uma função 'init'.`)
            }
            
            const routePath = '/' + path.basename(file, path.extname(file))
            app.use(routePath, route.router)
        })
    } catch (error) { Utils.logError(bot, error, __filename) }
}

module.exports = {
    init
}