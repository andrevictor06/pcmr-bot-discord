const Utils = require('../utils/Utils')
const { default: axios } = require('axios')
const path = require('path')
const fs = require('fs')
const sharp = require('sharp');
const { ExpectedError } = require('../utils/expected_error');

let stickers
const stickersFolderPath = path.resolve(process.env.PASTA_FIGURINHAS)
const defaultImageExtension = ".jpg"

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
    const stickersJson = localStorage.getItem("figurinhas")
    stickers = stickersJson ? JSON.parse(stickersJson) : {}
}

async function run(bot, msg) {
    if (Utils.containsCommand(msg, commands)) {
        return Utils.executeCommand(bot, msg, commands)
    }

    const stickerName = Object.keys(stickers).find(value => msg.content == value)
    if (stickerName) {
        msg.channel.send({
            files: [stickers[stickerName]]
        })
        msg.delete()
    }
}

async function createSticker(bot, msg) {
    checkStickersFolderSizeLimit()
    const args = Utils.parseArgs(msg)
    if (!args.mainParam) {
        throw new ExpectedError("Cadê o nome da figurinha?")
    }
    if (!msg.attachments || msg.attachments.size == 0) {
        throw new ExpectedError("Cadê a imagem?")
    }
    const attachment = getFirstAttachment(msg)
    if (attachment.contentType != "image/png" && attachment.contentType != "image/jpeg") {
        throw new ExpectedError("Tem certeza que isso é uma imagem?")
    }
    const stickerName = prepareStickerName(args.mainParam)
    const response = await axios.get(attachment.url, { responseType: 'stream' })
    return saveSticker(msg, response.data, stickerName)
}

function saveSticker(msg, data, stickerName) {
    return new Promise((resolve, reject) => {
        const imagePath = createImagePath(stickerName)
        data
            .pipe(compressImage())
            .pipe(fs.createWriteStream(imagePath))
            .on("finish", () => {
                try {
                    stickers[stickerName] = imagePath
                    localStorage.setItem("figurinhas", JSON.stringify(stickers))
                    msg.reply(`Figurinha ${stickerName} criada!`)
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
    localStorage.setItem("figurinhas", JSON.stringify(stickers))
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

function getFirstAttachment(msg) {
    return msg.attachments.values().next().value
}

function prepareStickerName(name) {
    return name.toUpperCase().replace(/ /, "_")
}

function createImagePath(stickerName) {
    return path.resolve(stickersFolderPath, stickerName + defaultImageExtension)
}

function compressImage() {
    return sharp()
        .resize(150)
        .jpeg()
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