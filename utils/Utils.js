const path = require('path')
const fs = require('fs')
const { ExpectedError } = require('./expected_error')


LISTA_IMAGENS_PLACAS_MAE = [
    "https://support.cyberpowerpc.com/hc/article_attachments/360028078513/broken_PCI_01.jpg",
    "https://pbs.twimg.com/media/EWOQ55PXQAAFghT.jpg",
    "https://storage-asset.msi.com/global/picture/image/feature/mb/RWD_Img/Z170/BAZOOKA/multi_gpu01.jpg",
    "https://www.cclonline.com/images/articles/1792_brokenslot.png?width=1600&format=jpg",
    "https://h30434.www3.hp.com/t5/image/serverpage/image-id/254464i8E06E2C0756F0AAD/image-size/medium?v=1.0&px=400",
    "https://linustechtips.com/uploads/monthly_2018_08/15350564627742120147877.jpg.f7065233bc1fec7996df12d0bc92776d.jpg",
    "https://linustechtips.com/uploads/monthly_2016_03/IMG_20151111_205053-2.jpg.5478631829ab6adc6ee2929fa837e85a.jpg",
    "https://tecnoblog.net/meiobit/wp-content/uploads/2015/07/20150723elhdszu-634x475.jpg",
    "https://i.imgur.com/W2NFfpZ.jpeg"
]


function between(min, max) {
    return Math.floor(
        Math.random() * (max - min) + min
    )
}

function getRandomPlacaMae() {

    const lista = LISTA_IMAGENS_PLACAS_MAE;
    let item = lista[between(0, lista.length)];

    if (!item) {
        item = lista[0];
    }
    return item;
}

function getRandomProcessador() {
    const lista = fs.readdirSync(path.resolve("assets", "processador"))
    const item = getRandomFromArray(lista)
    return path.resolve("assets", "processador", item);
}

function command(commandName) {
    return process.env.CARACTER_DEFAULT_FUNCTION + commandName
}

function startWithCommand(msg, commandName) {
    if (!msg.content) return false
    const possibleCommand = msg.content.split(' ')
    return possibleCommand[0] == command(commandName)
}

function containsCommand(msg, commands) {
    for (const command in commands) {
        if (startWithCommand(msg, command)) return true
    }
    return false
}

function executeCommand(bot, msg, commands) {
    for (const command in commands) {
        if (startWithCommand(msg, command)) {
            return commands[command].fn(bot, msg)
        }
    }
}

function isValidHttpUrl(string) {
    let url;
    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function getMessageError(error) {
    const message = error.message ? error.message : error
    if (error instanceof ExpectedError) {
        return message
    }
    return `Unexpected error: ${message}`
}

async function logError(bot, error, filename) {
    console.error(error);
    if (!(error instanceof ExpectedError) && process.env.ENVIRONMENT === "PRD") {
        const channel = await bot.channels.fetch(process.env.ID_CHANNEL_LOG_BOT)
        const errorContent = error.stack ? error.stack : error
        channel.send({ content: '> Erro no ' + path.basename(filename) + '\n```' + errorContent + '```' })
    }
}

function checkVoiceChannelPreConditions(message) {
    const voiceChannel = message.member.voice.channel
    if (!voiceChannel)
        throw new ExpectedError("Cadê o canal de voz?")

    if (message.client) {
        const permissions = voiceChannel.permissionsFor(message.client.user)
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
            throw new ExpectedError("Tô sem permissão, fala com o corno do adm!")
        }
    }
}


function chunkArray(arr, len) {
    const chunks = []
    let i = 0
    const n = arr.length;

    while (i < n) {
        chunks.push(arr.slice(i, i += len));
    }

    return chunks;
}

function setPresenceBot(bot, presence) {
    bot.user.setActivity(presence.name, { url: presence.url, type: presence.type })
}

function setPresenceBotDefault(bot) {
    bot.user.setActivity(command("help"), { type: "LISTENING" })
}

function parseArgs(message) {
    if (!message || message.content == null || message.content == "") throw new ExpectedError("Mensagem inválida")
    const pieces = message.content.split(" ")
    const command = pieces.shift()
    const parsedArgs = {
        command,
        mainParam: "",
        params: {}
    }
    for (let i = 0; i < pieces.length; i++) {
        const str = pieces[i]
        if (str.startsWith("--")) {
            const argName = str.replace("--", "")
            const paramValue = []
            for (let j = i + 1; j < pieces.length; j++) {
                const el = pieces[j]
                if (el.startsWith("--")) {
                    break
                } else {
                    paramValue.push(el)
                    pieces[j] = ""
                }
            }
            parsedArgs.params[argName] = paramValue.join(" ")
            pieces[i] = ""
        }
    }
    parsedArgs.mainParam = pieces.filter(el => el != "").join(" ").trim()
    return parsedArgs
}

function getMentions(mensagem) {

    if (mensagem && mensagem.mentions) {
        const mentions = []
        if (mensagem.mentions.everyone) {
            mentions.push("@everyone")
        }
        if (mensagem.mentions.users.size) {
            mensagem.mentions.users.forEach(element => {
                mentions.push(`<@!${element.id}>`)
            });
        }
        if (mensagem.mentions.roles.size) {
            mensagem.mentions.roles.forEach(element => {
                mentions.push(`<@&${element.id}>`)
            });
        }

        return mentions.join(" ")
    }
}

function getRandomFromArray(array) {
    if (!array || array.length == 0)
        return null

    return array[between(0, array.length)]
}

function nowInSeconds() {
    return Math.trunc(new Date().getTime() / 1000)
}

function getFirstAttachmentFrom(msg, allowedContentTypes, maxSize) {
    if (msg.attachments?.size == null || msg.attachments.size == 0) return null
    const attachment = msg.attachments.values().next().value
    checkContentType(attachment.contentType, allowedContentTypes)
    checkContentLength(attachment.size, maxSize)
    return attachment
}

function checkContentLengthAndType(axiosResponse, allowedContentTypes, maxContentLength) {
    checkContentType(axiosResponse.headers.get("Content-Type"), allowedContentTypes)
    checkContentLength(axiosResponse.headers.get("Content-Length"), maxContentLength)
}

function checkContentType(contentType, allowedContentTypes) {
    const message = "Formato de arquivo não permitido"
    if (Array.isArray(allowedContentTypes)) {
        if (!allowedContentTypes.includes(contentType)) {
            throw new ExpectedError(message)
        }
    } else if (contentType != allowedContentTypes) {
        throw new ExpectedError(message)
    }
}

function checkContentLength(contentLength, maxContentLength) {
    if (maxContentLength && contentLength > maxContentLength) {
        throw new ExpectedError("Arquivo muito grande man, não consigo")
    }
}

function normalizeString(str) {
    return str
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ /g, "_")
        .toLowerCase()
}

module.exports = {
    getRandomPlacaMae,
    getRandomProcessador,
    command,
    startWithCommand,
    isValidHttpUrl,
    containsCommand,
    executeCommand,
    getMessageError,
    logError,
    checkVoiceChannelPreConditions,
    chunkArray,
    setPresenceBot,
    setPresenceBotDefault,
    getMentions,
    parseArgs,
    getRandomFromArray,
    nowInSeconds,
    replaceAll,
    getFirstAttachmentFrom,
    normalizeString,
    checkContentLengthAndType
}
