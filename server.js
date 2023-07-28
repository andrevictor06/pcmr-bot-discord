const fs = require('fs')
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const helmet = require("helmet")
const cors = require("cors")
const hpp = require('hpp')
const Utils = require("./utils/Utils")
const bcrypt = require('bcrypt');

function init(bot) {
    const app = express()
    if (process.env.ENVIRONMENT == "DES") {
        app.use(helmet({ crossOriginResourcePolicy: false }))
        app.use(cors())
        app.use('/images/figurinhas', express.static("images/figurinhas"))
        app.use('/bot/audios', express.static("audio"))
    } else {
        //app.use(checkTokenBearer)
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

function checkTokenBearer(req, res, next){
    let token = req.headers['x-acess-token'] || req.headers['authorization']
    if( ! token){
        return res.status(401).send({"message": "Token não informado."})
    }

    if(token.startsWith("Bearer ")){
        token = token.substr(7)
    }

    if(token){
        if( bcrypt.compareSync(process.env.TOKEN_SECRET_PASSWORD, token)){
            next()
        }else{
            return res.status(401).send({"message": "Token inválido."})
        }
    }else{
        return res.status(401).send({"message": "Token inválido."})
    }
}

module.exports = {
    init
}