const Utils = require('../utils/Utils')
const { default: axios } = require('axios')
const path = require('path')
const fs = require('fs')
const sharp = require('sharp');
const { ExpectedError } = require('../utils/expected_error');
const { STICKERS } = require('../utils/constants');

let stickers
const stickersFolderPath = path.resolve(process.env.PASTA_FIGURINHAS)
const defaultImageExtension = ".png"

const commands = {
    figurinha: {
        fn: createSticker,
        help: {
            name: Utils.command("figurinha") + " [nome figurinha]",
            value: "Cadastra uma nova figurinha",
            inline: false
        }
    },
    listar_figurinhas: {
        fn: listStickers,
        help: {
            name: Utils.command("listar_figurinhas"),
            value: "Lista todas as figurinhas cadastradas",
            inline: false
        }
    },
    deletar_figurinha: {
        fn: deleteSticker,
        help: {
            name: Utils.command("deletar_figurinha") + " [nome figurinha]",
            value: "Remove uma figurinhha",
            inline: false
        }
    }
}

async function init(bot) {
    if (!fs.existsSync(stickersFolderPath)) {
        fs.mkdirSync(stickersFolderPath)
    }
    const stickersJson = localStorage.getItem(STICKERS)
    stickers = stickersJson ? JSON.parse(stickersJson) : {}
}

async function run(bot, msg) {
    if (Utils.containsCommand(msg, commands)) {
        return Utils.executeCommand(bot, msg, commands)
    }

    const stickerName = Object.keys(stickers).find(value => msg.content == value)
    if (stickerName) {
        sendSticker(bot, msg, stickerName)
    }
}

async function sendSticker(bot, msg, stickerName) {
    const messagePayload = {
        content: `**${msg.member.nickname}** enviou:`,
        files: [stickers[stickerName]]
    }
    if (msg.reference?.messageId) {
        const msgToReply = await msg.channel.messages.fetch(msg.reference.messageId)
        msgToReply.reply(messagePayload)
    } else {
        msg.channel.send(messagePayload)
    }
    msg.delete()
}

async function createSticker(bot, msg) {
    checkStickersFolderSizeLimit()
    const args = Utils.parseArgs(msg)
    if (!args.mainParam) {
        throw new ExpectedError("Cadê o nome da figurinha?")
    }
    let url
    if (args.params.url) {
        url = args.params.url
    } else {
        let messageToFindAttachment = msg
        if (msg.reference?.messageId) {
            messageToFindAttachment = await msg.channel.messages.fetch(msg.reference.messageId)
        }
        // TODO: testar verificação por tamanho
        url = Utils.getFirstAttachmentFrom(messageToFindAttachment, ["image/png", "image/jpeg", "image/gif"], parseInt(process.env.FIGURINHA_MAX_SIZE))?.url
    }
    if (!url) throw new ExpectedError("Cadê a imagem?")
    const stickerName = Utils.normalizeString(args.mainParam)
    const response = await axios.get(url, { responseType: 'stream' })
    checkContentType(response.headers['content-type'])
    return saveSticker(msg, response.data, stickerName, response.headers['content-type'])
}

function saveSticker(msg, data, stickerName, contentType) {
    return new Promise((resolve, reject) => {
        const imagePath = createImagePath(stickerName, contentType)
        data
            .pipe(resizeImage(contentType))
            .pipe(fs.createWriteStream(imagePath))
            .on("finish", () => {
                try {
                    stickers[stickerName] = imagePath
                    localStorage.setItem(STICKERS, JSON.stringify(stickers))
                    msg.reply({
                        content: `Figurinha **${stickerName}** criada!`,
                        files: [imagePath]
                    })
                    resolve()
                } catch (error) {
                    reject(error)
                }
            })
            .on("error", error => {
                Utils.logError(error)
                resolve()
            })
    })
}

function listStickers(bot, msg) {
    const stickersNames = Object.keys(stickers)
    if (!stickersNames || stickersNames.length == 0) {
        throw new ExpectedError("Nenhuma figurinha por enquanto")
    }
    msg.reply("Lista de figurinhas:\n\n" + stickersNames.reduce((p, v) => p + "\n" + v))
}

async function deleteSticker(bot, msg) {
    const args = Utils.parseArgs(msg)
    if (!args.mainParam) {
        throw new ExpectedError("Cadê o nome da figurinha?")
    }
    const stickerPath = stickers[args.mainParam]
    if (!stickerPath) {
        throw new ExpectedError("Não achei essa figurinha")
    }
    fs.rmSync(stickerPath)
    delete stickers[args.mainParam]
    localStorage.setItem(STICKERS, JSON.stringify(stickers))
    msg.reply(`Figurinha ${args.mainParam} deletada!`)
}

function canHandle(bot, msg) {
    return true
}

function helpComand(bot, msg) {
    return Object.values(commands)
        .map(value => value.help)
        .filter(value => value != null)
}

function createImagePath(stickerName, contentType) {
    const extension = contentType == "image/gif"
        ? ".gif"
        : defaultImageExtension
    return path.resolve(stickersFolderPath, stickerName + extension)
}

function resizeImage(contentType) {
    return contentType == "image/gif"
        ? sharp({ animated: true }).resize(250).gif()
        : sharp().resize(175).png()

}

function checkStickersFolderSizeLimit() {
    const stats = fs.statSync(stickersFolderPath)
    if (stats.size > parseInt(process.env.PASTA_FIGURINHAS_LIMITE)) {
        throw new ExpectedError("Tamanho limite da pasta atingido!")
    }
}

function checkContentType(contentType) {
    if (!["image/png", "image/jpeg", "image/gif"].includes(contentType)) {
        throw new ExpectedError("Tem certeza que isso é uma imagem?")
    }
}

module.exports = {
    init, run, canHandle, helpComand
}