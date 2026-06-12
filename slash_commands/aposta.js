const Utils = require("../utils/Utils")
const fs = require('fs')
const path = require("path")
const {
  Client, GatewayIntentBits, SlashCommandBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, StringSelectMenuBuilder,
  Events, EmbedBuilder
} = require('discord.js');

const COMMAND_APOSTAR = 'apostar';
let teams = [];

// Carregar times do arquivo
function loadTeams() {
  try {    
    const data = fs.readFileSync('./.localstorage/teams.json', 'utf8');
    teams = JSON.parse(data).teams;
  } catch (err) {
    console.error('Erro ao carregar teams.json', err);
  }
}

function apostar(interaction){
    
    const modal = new ModalBuilder()
      .setCustomId('modal_aposta_copa')
      .setTitle('⚽ Aposta - Copa do Mundo 2026');

    // Time da Casa
    const timeCasaInput = new TextInputBuilder()
      .setCustomId('time_casa')
      .setLabel('Código do Time da Casa (ex: BRA)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('BRA')
      .setMinLength(3)
      .setMaxLength(3)
      .setRequired(true);

    // Time Visitante
    const timeForaInput = new TextInputBuilder()
      .setCustomId('time_fora')
      .setLabel('Código do Time Visitante (ex: ARG)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('ARG')
      .setMinLength(3)
      .setMaxLength(3)
      .setRequired(true);

    // Gols Casa
    const golsCasaInput = new TextInputBuilder()
      .setCustomId('gols_casa')
      .setLabel('Gols - Time da Casa')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('2')
      .setRequired(true);

    // Gols Fora
    const golsForaInput = new TextInputBuilder()
      .setCustomId('gols_fora')
      .setLabel('Gols - Time Visitante')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('1')
      .setRequired(true);

    // Observação
    const obsInput = new TextInputBuilder()
      .setCustomId('observacao')
      .setLabel('Observação (opcional)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    const rows = [
      new ActionRowBuilder().addComponents(timeCasaInput),
      new ActionRowBuilder().addComponents(timeForaInput),
      new ActionRowBuilder().addComponents(golsCasaInput),
      new ActionRowBuilder().addComponents(golsForaInput),
      new ActionRowBuilder().addComponents(obsInput)
    ];

    modal.addComponents(...rows);

    interaction.showModal(modal);

}

function modal_aposta_copa(interaction){
    const codeCasa = interaction.fields.getTextInputValue('time_casa').toUpperCase().trim();
    const codeFora = interaction.fields.getTextInputValue('time_fora').toUpperCase().trim();
    const golsCasa = interaction.fields.getTextInputValue('gols_casa');
    const golsFora = interaction.fields.getTextInputValue('gols_fora');
    const observacao = interaction.fields.getTextInputValue('observacao') || 'Nenhuma';

    // Validação dos times
    const timeCasa = teams.find(t => t.code.toUpperCase() === codeCasa);
    const timeFora = teams.find(t => t.code.toUpperCase() === codeFora);

    if (!timeCasa) {
        return interaction.reply({ 
        content: `❌ Time da casa **${codeCasa}** não encontrado. Use o código correto (ex: BRA, MEX, USA).`, 
        ephemeral: true 
        });
    }

    if (!timeFora) {
        return interaction.reply({ 
        content: `❌ Time visitante **${codeFora}** não encontrado.`, 
        ephemeral: true 
        });
    }

    const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ Aposta Registrada!')
        .setDescription(`**${interaction.user.tag}**`)
        .addFields(
        { name: '🏠 Time da Casa', value: `${timeCasa.code} - ${timeCasa.name} (${timeCasa.group})`, inline: true },
        { name: '🚩 Time Visitante', value: `${timeFora.code} - ${timeFora.name} (${timeFora.group})`, inline: true },
        { name: 'Placar', value: `**${golsCasa} × ${golsFora}**`, inline: false },
        { name: 'Observação', value: observacao }
        )
        .setTimestamp();

    interaction.reply({ embeds: [embed]});
}

function helpComand(bot, msg) {
    return {
        name: Utils.command(COMMAND_APOSTAR),
        value: "Casa de Apostas desse servidor Discord: 100% confiaveis. CONFIA",
        inline: false
    }
}

async function init(bot){
    loadTeams()
    
    bot.addInteractionCreate("modal_aposta_copa", modal_aposta_copa)
    
}

function data(bot) {
    return new SlashCommandBuilder()
    .setName(COMMAND_APOSTAR)
    .setDescription('Casa de Apostas desse servidor Discord: 100% confiaveis. CONFIA')
}

async function execute(bot, event) {
    apostar(event)
}

module.exports = {
    data, execute, helpComand, init
}