const { joinVoiceChannel, getVoiceConnection} = require("@discordjs/voice")
const Discord = require("discord.js");
let revorve = [false, false, false, false, false, false]
const qtd = 6

function roda() {
    return revorve[indiceRandomico()]
    /*if (morreu) {
        console.log('Foi de arrasta pra cima')
    } else {
        console.log('Cu virado pra lua')
    }*/
}

function indiceRandomico() {
    const indice = Math.floor(Math.random() * qtd)
    console.log('Óia o indice ' + indice)
    return indice
}

function resetarRevorve(){
    revorve = [false, false, false, false, false, false]
    revorve[indiceRandomico()] = true
}


async function obrigadoamatar(bot, msg) {
    try {
        if(msg.mentions.users.size > 0 ){
            for (let member of msg.mentions.users) {
                let member_obj = await msg.guild.members.cache.get(member)
                member_obj.timeout(60000, "CORNO")
            }
        }else{
            msg.member.timeout(60000, "CORNO")   
        }
    } catch (error) {
        
    }

    /**/

    msg.channel.send("Foi de arrasta pra cima")
}

async function run(bot, msg) {
    try {
        resetarRevorve();
        if(roda()){    
            obrigadoamatar(bot, msg);
        }else{
            msg.channel.send("Cu virado pra lua")
        }
    } catch (error) { }
}

function canHandle(bot, msg) {
    return (msg.content.startsWith(process.env.CARACTER_DEFAULT_FUNCTION + "500conto"));
}

module.exports = {
    run, canHandle
}