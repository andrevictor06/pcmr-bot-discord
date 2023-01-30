const ytdl = require("ytdl-core")
const Utils = require("../utils/Utils")

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

function resetarRevorve() {
    revorve = [false, false, false, false, false, false]
    revorve[indiceRandomico()] = true
}


async function obrigadoamatar(bot, msg) {
    try {
        if (msg.mentions.users.size > 0) {
            for (let member of msg.mentions.users) {
                let member_obj = await msg.guild.members.cache.get(member[1].id)
                member_obj.timeout(10000, "CORNO")
            }
        } else {
            msg.member.timeout(10000, "CORNO")
        }
        if (msg.content.startsWith(process.env.CARACTER_DEFAULT_FUNCTION + "500conto")) {
            msg.channel.send(process.env.CARACTER_DEFAULT_FUNCTION + "stop")
        }
        if (msg.content.startsWith("+play")) {
            msg.channel.send("+stop")
        }
        if (msg.content.startsWith("-play")) {
            msg.channel.send("-stop")
        }
    } catch (error) { }

    msg.channel.send("Foi de arrasta pra cima")
}
function roletaRussa(bot, msg) {
    resetarRevorve()
    if (roda()) {
        obrigadoamatar(bot, msg)
    } else {
        msg.channel.send("Cu virado pra lua")
    }
}
async function run(bot, msg) {
    try {
        const args = msg.content.split(" ")
        if (args.length > 1) {
            const songInfo = await ytdl.getInfo(args[1])
            if (songInfo.videoDetails.title.includes("Manoel Gomes")) {
                roletaRussa(bot, msg)
            }
        }
    } catch (error) {
        console.log(error)
    }
}

function canHandle(bot, msg) {
    return false
    return msg.content.startsWith(Utils.command("500conto"))
        || msg.content.startsWith(Utils.command("play ")) || msg.content.startsWith(Utils.command("play "))
}

module.exports = {
    run, canHandle
}