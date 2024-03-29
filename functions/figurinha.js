const Utils = require('../utils/Utils')
const { default: axios } = require('axios')
const path = require('path')
const fs = require('fs')
const sharp = require('sharp')
const { ExpectedError } = require('../utils/expected_error')
const { STICKERS } = require('../utils/constants')
const { mp4ToGif } = require('../utils/media_utils')

let stickers
const stickersFolderPath = path.resolve(process.env.PASTA_FIGURINHAS)
const defaultImageExtension = ".png"
const allowedContentTypes = ["image/png", "image/jpeg", "image/gif", "video/mp4"]
const stickerMaxSize = parseInt(process.env.FIGURINHA_MAX_SIZE)

const commands = {
    figurinha: {
        fn: createSticker,
        help: {
            name: Utils.command("figurinha") + " [nome figurinha] [--url url da imagem/gif/video]",
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
        fs.mkdirSync(stickersFolderPath, { recursive: true })
    }
    const stickersJson = localStorage.getItem(STICKERS)
    stickers = stickersJson ? JSON.parse(stickersJson) : {}
}

async function run(bot, msg) {
    if (Utils.containsCommand(msg, commands)) {
        return Utils.executeCommand(bot, msg, commands)
    }

    const normalizedContent = Utils.normalizeString(msg.content)
    const stickerName = Object.keys(stickers).find(value => value == normalizedContent)
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
    if (!args.mainParam) throw new ExpectedError("Cadê o nome da figurinha?")

    let messageToFindAttachment = msg
    if (msg.reference?.messageId) {
        messageToFindAttachment = await msg.channel.messages.fetch(msg.reference.messageId)
    }
    const url = args.params.url || Utils.getFirstAttachmentFrom(messageToFindAttachment, allowedContentTypes, stickerMaxSize)?.url
    if (!url) throw new ExpectedError("Cadê a imagem?")

    const response = await axios.get(url, { responseType: 'stream' })
    Utils.checkContentLengthAndType(response, allowedContentTypes, stickerMaxSize)
    return saveSticker(args, msg, response)
}

function saveSticker(args, msg, response) {
    return new Promise(async (resolve, reject) => {
        try {
            let contentType = response.headers.get("Content-Type")
            const stickerName = Utils.normalizeString(args.mainParam)
            const progessMessage = await msg.reply("Processando...")

            let stream
            if (contentType == "video/mp4") {
                stream = mp4ToGif({
                    input: response.data,
                    width: 250
                })
                contentType = "image/gif"
            } else {
                stream = response.data.pipe(resizeImage(contentType))
            }
            const imagePath = createImagePath(stickerName, contentType)
            stream
                .pipe(fs.createWriteStream(imagePath))
                .on("finish", () => {
                    try {
                        stickers[stickerName] = imagePath
                        localStorage.setItem(STICKERS, JSON.stringify(stickers))
                        progessMessage.edit({
                            content: `Figurinha **${args.mainParam}** criada!`,
                            files: [imagePath]
                        })
                        resolve()
                    } catch (error) {
                        reject(error)
                    }
                })
                .on("error", reject)
        } catch (error) {
            reject(error)
        }
    })
}

function listStickers(bot, msg) {
    const stickersNames = Object.keys(stickers)
    if (!stickersNames || stickersNames.length == 0) {
        throw new ExpectedError("Nenhuma figurinha por enquanto")
    }
    const template =
        `
        >>> Para visualizar todas as figurinhas, acesse: **${process.env.URL_SITE}/figurinhas**\nLista de figurinhas:\n\n**${stickersNames.reduce((p, v) => p + "\n" + v)}**
    `

    msg.reply({ content: template, embeds: [] })
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

module.exports = {
    init, run, canHandle, helpComand
}