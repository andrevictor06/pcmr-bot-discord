const express = require('express')
const router = express.Router()
const utils = require('../utils/Utils')

function init(bot) {
    router.post('/', async (req, res) => {
        try {
            let payload = req.body


            if( payload.action && payload.pull_request && payload.action === "opened"){
                const channel = await bot.channels.fetch(process.env.ID_CHANNEL_DEV_BOT)

                const exampleEmbed = {
                    color: 0x0099ff,
                    author: {
                        name: payload.sender.login,
                        icon_url: payload.sender.avatar_url,
                        url: payload.sender.html_url
                    },

                    title: 'Abrirão um PR pra Atualizar o Bot!!!!',
                    url: payload.pull_request.html_url,
                    description: payload.pull_request.title,
                    timestamp: new Date(payload.pull_request.created_at).toISOString()    
                }   
                
                channel.send({ embeds: [exampleEmbed] }) 
            }

            
            //msg.reply({ embeds: [exampleEmbed] })
            res.send('Requisição aceita')
        } catch (error) {
            utils.logError(bot, error, __filename)
            res.send('Requisição não aceita')
        }
    })
}

module.exports = {
    router,
    init
}