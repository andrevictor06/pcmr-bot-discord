const fs = require('fs');
const Utils = require("../utils/Utils")

function run(bot, msg) {
    let comands = "";
    let fields = [];
    fs.readdirSync("./functions") .forEach(fnFile => {
        try {
            const fn = require("../functions/" + fnFile)
            fields.push(fn.helpComand(bot, msg))
        } catch (error) { 
            console.log( fnFile);
        } 
    })

    const exampleEmbed = {
        color: 0x0099ff,
        author: {
            name: process.env.APP_NAME,
            icon_url: 'https://cdn.discordapp.com/avatars/823658438252560415/558bb7d5c70a215a7f50da83c959bc35.webp'
        },
        description: 'Lista dos comandos disponíveis neste servidor Discord',
        fields: fields,
        timestamp: new Date().toISOString()
    };
    
    msg.reply({embeds: [exampleEmbed]})
}

function canHandle(bot, msg) {
    return msg.content.startsWith(Utils.command("help"))
}


function helpComand(bot, msg){
    return {
        name: Utils.command("help"),
        value: "Lista os comandos disponíveis neste servidor Discord",
        inline: false
    }
}

module.exports = {
    run, canHandle, helpComand
}