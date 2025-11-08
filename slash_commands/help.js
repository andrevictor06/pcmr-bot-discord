const Utils = require("../utils/Utils")
const fs = require('fs')
const path = require("path")
const { SlashCommandBuilder } = require('discord.js');

function data(bot) {
    
    return new SlashCommandBuilder()
    .setName('help')
    .setDescription('Visualizar todos os comandos disponíveis')
}

async function execute(bot, event) {
      const fields = getHelpCommands(bot)
      const exampleEmbed = {
        color: 0x0099ff,
        author: {
            name: process.env.APP_NAME,
            icon_url: process.env.APP_ICON,
        },
        description: 'Lista dos comandos disponíveis neste servidor Discord',
        fields: fields,
        timestamp: new Date().toISOString()
    }

    event.reply({ embeds: [exampleEmbed] })
}

function getHelpCommands(bot){
    
    let fields = []
    bot.slash_commands.forEach(fnFile => {
        try {
            const data = fnFile.data(bot)
            fields.push({
              name: data.name||"",
              value: data.description||""              
            })
        } catch (error) {
            Utils.logError(bot, error, __filename)
        }
    })
    return fields
}

module.exports = {
    data, execute
}