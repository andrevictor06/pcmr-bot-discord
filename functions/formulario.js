const fs = require('fs')
const Utils = require("../utils/Utils")
const { ActionRowBuilder, Events, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js')

function run(bot, msg) {
    console.log("Veio");
    msg.reply({
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        label: "Abrir Modal",
                        style: 1,
                        custom_id: Utils.command("form2"),
                    }
                ]
            }
        ]
    })
    bot.addInteractionCreate(Utils.command("form2"), criarFormulario)
    /*
    msg.client.on("interactionCreate", async interaction => {
        if (!interaction.isChatInputCommand()) return;
    
        if (interaction.commandName === 'ping') {
            // Create the modal
            const modal = new ModalBuilder()
                .setCustomId('myModal')
                .setTitle('My Modal');
    
            // Add components to modal
    
            // Create the text input components
            const favoriteColorInput = new TextInputBuilder()
                .setCustomId('favoriteColorInput')
                // The label is the prompt the user sees for this input
                .setLabel("What's your favorite color?")
                // Short means only a single line of text
                .setStyle(TextInputStyle.Short);
    
            const hobbiesInput = new TextInputBuilder()
                .setCustomId('hobbiesInput')
                .setLabel("What's some of your favorite hobbies?")
                // Paragraph means multiple lines of text.
                .setStyle(TextInputStyle.Paragraph);
    
            // An action row only holds one text input,
            // so you need one action row per text input.
            const firstActionRow = new ActionRowBuilder().addComponents(favoriteColorInput);
            const secondActionRow = new ActionRowBuilder().addComponents(hobbiesInput);
    
            // Add inputs to the modal
            modal.addComponents(firstActionRow, secondActionRow);
            console.log("TESSSSSSSTE");
            // Show the modal to the user
            await interaction.showModal(modal);
        }
    });*/
}

async function criarFormulario(interaction){
    console.log(interaction, " event");
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId('add-custom-expression')
        .setTitle('Adicionar uma nova Expressão');

    // Add components to modal

    // Create the text input components
    const favoriteColorInput = new TextInputBuilder()
        .setCustomId('texto')
        // The label is the prompt the user sees for this input
        .setLabel("Qual o texto base?")
        // Short means only a single line of text
        .setStyle(TextInputStyle.Short);

    const hobbiesInput = new TextInputBuilder()
        .setCustomId('response')
        .setLabel("Qual o texto a ser respondido?")
        // Paragraph means multiple lines of text.
        .setStyle(TextInputStyle.Paragraph);

    // An action row only holds one text input,
    // so you need one action row per text input.
    const firstActionRow = new ActionRowBuilder().addComponents(favoriteColorInput);
    const secondActionRow = new ActionRowBuilder().addComponents(hobbiesInput);

    // Add inputs to the modal
    modal.addComponents(firstActionRow, secondActionRow);
    console.log("TESSSSSSSTE");
    // Show the modal to the user
    await interaction.showModal(modal);
}

function canHandle(bot, msg) {
    return Utils.startWithCommand(msg, "form")
}

function helpComand(bot, msg) {
    return {
        name: Utils.command("form"),
        value: "Formulario de criação de comandos personalizados",
        inline: false
    }
}

module.exports = {
    run, canHandle, helpComand
}