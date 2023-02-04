const path = require('path');
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

LISTA_IMAGENS_PROCESSADORES = [
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQlZ7S6-O2_HKhxuZLSskmm6Cawut27VRgIMA&usqp=CAU",
    "https://linustechtips.com/uploads/monthly_2019_10/20191013_072750.jpg.f8d0bd9a6355ba6ab5e9542ff07a0bf3.jpg",
    "https://gizmodo.uol.com.br/wp-content/blogs.dir/8/files/2020/10/cooler-cpu-amdryzen.jpg",
    "https://i.imgur.com/cz8nReE.jpg",
    "https://i.ytimg.com/vi/ab-rx7t42yo/maxresdefault.jpg"
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
    const lista = LISTA_IMAGENS_PROCESSADORES;
    let item = lista[between(0, lista.length)];

    if (!item) {
        item = lista[0];
    }
    return item;
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

function getMessageError(error) {
    const message = error.message ? error.message : error
    if (error instanceof ExpectedError) {
        return message
    }
    return `Unexpected error: ${message}`
}

async function logError(bot, error, filename) {
    console.error(error)
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

    const permissions = voiceChannel.permissionsFor(message.client.user)
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        throw new ExpectedError("Tô sem permissão, fala com o corno do adm!")
    }
}


function chunkArray(arr, len) {

    var chunks = [],
        i = 0,
        n = arr.length;

    while (i < n) {
        chunks.push(arr.slice(i, i += len));
    }

    return chunks;
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
    chunkArray
}
