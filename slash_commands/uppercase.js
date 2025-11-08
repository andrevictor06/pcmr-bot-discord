const Utils = require("../utils/Utils")
const fs = require('fs')
const path = require("path")
const { SlashCommandBuilder } = require('discord.js');

function data(bot) {
    
    return new SlashCommandBuilder()
    .setName('uppercase')
    .setDescription('Envia um texto em MAIÚSCULAS')
    .addStringOption(option =>
      option
        .setName('texto')
        .setDescription('Textopara enviar em maiúsculas')
        .setRequired(true)
    )
}

async function execute(bot, event) {
    const texto = event.options.getString('texto');
    const textoMaiusculo = texto.toUpperCase();

    await event.reply({
      content: textoMaiusculo,
      allowedMentions: { repliedUser: false }
    });
}


module.exports = {
    data, execute
}