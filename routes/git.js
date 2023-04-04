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
                    color: 0xFF00FF,
                    author: {
                        name: `${payload.sender.login}`,
                        icon_url: payload.sender.avatar_url,
                        url: payload.sender.html_url
                    },
                    title: `${payload.pull_request.title || ""} `,
                    url: payload.pull_request.html_url,
                    description: `${payload.pull_request.body || ""}`,

                    fields: [
                        { name: '\u200B', value: '\u200B' },
                        {
                            name: "Pull Request", value: `${payload.pull_request.html_url}`,
                        },
                        {
                            name: "Files changed", value: `${payload.pull_request.html_url}/files`,
                        }
                    ],
                    image: { url: `https://opengraph.githubassets.com/${payload.pull_request.head.sha}/${payload.pull_request.head.user.login}/${payload.pull_request.head.repo.name}/pull/${payload.number}`},
                    timestamp: new Date(payload.pull_request.created_at).toISOString()    
                }   
                
                channel.send({ content: `<@&${process.env.ID_MEMBER_DEV_PCMR_BOT}>\n**Abrirão um PR para me atualizar!!!!**\n**Alguém aceita ae, na moralzinha!!!!**`,  embeds: [exampleEmbed] }) 
            }
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