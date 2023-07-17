const { default: axios } = require('axios')
const { init, run, canHandle } = require('../../functions/figurinha')
const { ExpectedError } = require('../../utils/expected_error')
const { mockBot, mockMessage } = require('../utils_test')
const fs = require('fs')
const path = require('path')
const { STICKERS } = require('../../utils/constants')
const { randomUUID } = require('crypto')

const stickersTestFolder = path.resolve(process.env.PASTA_FIGURINHAS)
const defaultImageExtension = ".png"

function clearStickersTestFolder(p = stickersTestFolder) {
    if (fs.statSync(p).isDirectory()) {
        fs.readdirSync(p).forEach(file => clearStickersTestFolder(path.resolve(p, file)))
        fs.rmdirSync(p)
    } else {
        fs.rmSync(p)
    }
}

beforeEach(async () => {
    if (fs.existsSync(stickersTestFolder)) {
        clearStickersTestFolder()
    }
    localStorage.clear()
    await init(mockBot())
})

describe("figurinha", () => {
    test("deveria executar o canHandle corretamente", () => {
        expect(canHandle(mockBot(), mockMessage('figurinha'))).toBeTruthy()
    })

    test("não deveria criar uma figurinha se não for informado o nome", async () => {
        expect.hasAssertions()
        try {
            await run(mockBot(), mockMessage("figurinha", ""))
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
        }
    })

    test("não deveria criar uma figurinha se não for enviada uma imagem", async () => {
        expect.hasAssertions()
        try {
            await run(mockBot(), mockMessage("figurinha", "nome figurinha"))
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
        }
    })

    test("não deveria criar uma figurinha se o anexo não for uma imagem", async () => {
        expect.hasAssertions()
        try {
            const message = mockMessage("figurinha", "nome figurinha")
            const attachment = {
                contentType: "application/json"
            }
            message.attachments = new Map([
                ["1", attachment]
            ])
            await run(mockBot(), message)
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
        }
    })

    test("deveria criar uma figurinha com sucesso", async () => {
        const message = mockMessage("figurinha", "João")
        const attachment = {
            url: path.resolve("images", "domingo_a_noite.png"),
            name: "domingo_a_noite.png",
            contentType: "image/png"
        }
        message.attachments = new Map([
            ["1", attachment]
        ])
        axios.get.mockImplementation((url, options) => {
            expect(url).toEqual(attachment.url)
            expect(options).toMatchObject({
                responseType: 'stream'
            })

            const response = {
                data: fs.createReadStream(attachment.url),
                headers: {
                    "content-type": attachment.contentType
                }
            }
            return response
        })

        await run(mockBot(), message)

        const stickersJson = localStorage.getItem(STICKERS)
        expect(stickersJson).toBeTruthy()

        const stickers = JSON.parse(stickersJson)
        expect(stickers).toMatchObject({
            "joao": path.resolve(stickersTestFolder, "joao" + defaultImageExtension)
        })

        const files = fs.readdirSync(stickersTestFolder)
        expect(files).toBeTruthy()
        expect(files).toHaveLength(1)
        expect(files[0]).toEqual("joao" + defaultImageExtension)

        expect(message.reply).toBeCalledTimes(1)
    })

    test("deveria criar uma figurinha com sucesso utilizando a imagem da mensagem original", async () => {
        const message = mockMessage("figurinha", "João")
        message.reference = {
            messageId: randomUUID()
        }
        const attachment = {
            url: path.resolve("images", "domingo_a_noite.png"),
            name: "domingo_a_noite.png",
            contentType: "image/png"
        }
        const repliedMessage = mockMessage("mensagme")
        repliedMessage.attachments = new Map([
            ["1", attachment]
        ])
        message.channel.messages.fetch.mockImplementation(messageId => {
            expect(messageId).toEqual(message.reference.messageId)
            return repliedMessage
        })
        axios.get.mockImplementation((url, options) => {
            expect(url).toEqual(attachment.url)
            expect(options).toMatchObject({
                responseType: 'stream'
            })

            const response = {
                data: fs.createReadStream(attachment.url),
                headers: {
                    "content-type": attachment.contentType
                }
            }
            return response
        })

        await run(mockBot(), message)

        expect(message.channel.messages.fetch).toBeCalledTimes(1)

        const stickersJson = localStorage.getItem(STICKERS)
        expect(stickersJson).toBeTruthy()

        const stickers = JSON.parse(stickersJson)
        expect(stickers).toMatchObject({
            "joao": path.resolve(stickersTestFolder, "joao" + defaultImageExtension)
        })

        const files = fs.readdirSync(stickersTestFolder)
        expect(files).toBeTruthy()
        expect(files).toHaveLength(1)
        expect(files[0]).toEqual("joao" + defaultImageExtension)

        expect(message.reply).toBeCalledTimes(1)
    })

    test("deveria criar uma figurinha com sucesso a partir de uma URL", async () => {
        const imageUrl = path.resolve("images", "domingo_a_noite.png")
        const message = mockMessage("figurinha", "João", "--url " + imageUrl)
        axios.get.mockImplementation((url, options) => {
            expect(url).toEqual(imageUrl)
            expect(options).toMatchObject({
                responseType: 'stream'
            })

            const response = {
                data: fs.createReadStream(imageUrl),
                headers: {
                    "content-type": "image/png"
                }
            }
            return response
        })

        await run(mockBot(), message)

        const stickersJson = localStorage.getItem(STICKERS)
        expect(stickersJson).toBeTruthy()

        const stickers = JSON.parse(stickersJson)
        expect(stickers).toMatchObject({
            "joao": path.resolve(stickersTestFolder, "joao" + defaultImageExtension)
        })

        const files = fs.readdirSync(stickersTestFolder)
        expect(files).toBeTruthy()
        expect(files).toHaveLength(1)
        expect(files[0]).toEqual("joao" + defaultImageExtension)

        expect(message.reply).toBeCalledTimes(1)
    })

    test("deveria criar uma figurinha de gif com sucesso", async () => {
        const message = mockMessage("figurinha", "nome figurinha")
        const attachment = {
            url: path.resolve("images", "monkey-sleep.gif"),
            name: "monkey-sleep.gif",
            contentType: "image/gif"
        }
        message.attachments = new Map([
            ["1", attachment]
        ])
        axios.get.mockImplementation((url, options) => {
            expect(url).toEqual(attachment.url)
            expect(options).toMatchObject({
                responseType: 'stream'
            })

            const response = {
                data: fs.createReadStream(attachment.url),
                headers: {
                    "content-type": attachment.contentType
                }
            }
            return response
        })

        await run(mockBot(), message)

        const stickersJson = localStorage.getItem(STICKERS)
        expect(stickersJson).toBeTruthy()

        const stickers = JSON.parse(stickersJson)
        expect(stickers).toMatchObject({
            "nome_figurinha": path.resolve(stickersTestFolder, "nome_figurinha.gif")
        })

        const files = fs.readdirSync(stickersTestFolder)
        expect(files).toBeTruthy()
        expect(files).toHaveLength(1)
        expect(files[0]).toEqual("nome_figurinha.gif")

        expect(message.reply).toBeCalledTimes(1)
    })

    test("deveria enviar a figurinha corretamente", async () => {
        const stickerName = "nome_figurinha"
        const stickerPath = path.resolve(stickersTestFolder, stickerName + ".png")
        const bot = mockBot()
        const message = mockMessage(undefined, stickerName)
        const figurinhas = {}
        figurinhas[stickerName] = stickerPath
        localStorage.setItem(STICKERS, JSON.stringify(figurinhas))
        fs.copyFileSync(
            path.resolve("images", "domingo_a_noite.png"),
            stickerPath
        )

        await init(bot)
        await run(bot, message)

        expect(message.channel.send).toBeCalledTimes(1)

        const botMessage = message.channel.send.mock.lastCall[0]
        expect(botMessage).toMatchObject({
            files: [stickerPath]
        })

        expect(message.delete).toBeCalledTimes(1)
    })

    test("deveria dar reply na mensagem original ao mandar a figurinha", async () => {
        const stickerName = "nome_figurinha"
        const stickerPath = path.resolve(stickersTestFolder, stickerName + ".png")
        const bot = mockBot()
        const message = mockMessage(undefined, stickerName)
        const messageToBeReplied = mockMessage("original message")
        message.reference = {
            messageId: randomUUID()
        }
        message.channel.messages.fetch.mockImplementation(messageId => {
            expect(messageId).toEqual(message.reference.messageId)
            return messageToBeReplied
        })
        const figurinhas = {}
        figurinhas[stickerName] = stickerPath
        localStorage.setItem(STICKERS, JSON.stringify(figurinhas))
        fs.copyFileSync(
            path.resolve("images", "domingo_a_noite.png"),
            stickerPath
        )

        await init(bot)
        await run(bot, message)

        expect(messageToBeReplied.reply).toBeCalledTimes(1)
        expect(messageToBeReplied.reply.mock.lastCall[0]).toMatchObject({
            files: [stickerPath]
        })
        expect(message.delete).toBeCalledTimes(1)
    })

    test("deveria dar erro ao tentar criar uma figurinha quando a pasta tiver atingido o limite", async () => {
        process.env.PASTA_FIGURINHAS_LIMITE = 10

        expect.hasAssertions()

        try {
            await run(mockBot(), mockMessage("figurinha", "nome figurinha"))
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
        }
    })
})

describe("listar_figurinhas", () => {
    test("deveria executar o canHandle corretamente", () => {
        expect(canHandle(mockBot(), mockMessage('listar_figurinhas'))).toBeTruthy()
    })

    test("não deveria dar erro quando não existirem figurinhas salvas", async () => {
        const message = mockMessage("listar_figurinhas")
        expect.hasAssertions()

        try {
            await run(mockBot(), message)
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
        }
    })

    test("deveria retornar os nomes das figurinhas cadastradas", async () => {
        const bot = mockBot()
        const message = mockMessage("listar_figurinhas")
        const figurinhas = {
            "figurinha": "caminho da figurinha"
        }
        localStorage.setItem(STICKERS, JSON.stringify(figurinhas))

        await init(bot)
        await run(bot, message)

        expect(message.reply).toBeCalledTimes(1)
    })
})

describe("deletar_figurinha", () => {
    test("deveria executar o canHandle corretamente", () => {
        expect(canHandle(mockBot(), mockMessage('deletar_figurinha'))).toBeTruthy()
    })

    test("deveria dar erro se não for informado o nome da figurinha", async () => {
        expect.hasAssertions()

        try {
            await run(mockBot(), mockMessage("deletar_figurinha"))
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
        }
    })

    test("deveria dar erro se a figurinha não existir", async () => {
        expect.hasAssertions()

        try {
            await run(mockBot(), mockMessage("deletar_figurinha", "nome figurinha"))
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
        }
    })

    test("deveria deletar a figurinha corretamente", async () => {
        const stickerName = "nome_figurinha"
        const stickerPath = path.resolve(stickersTestFolder, stickerName + ".png")
        const bot = mockBot()
        const message = mockMessage("deletar_figurinha", stickerName)
        const figurinhas = {}
        figurinhas[stickerName] = stickerPath
        localStorage.setItem(STICKERS, JSON.stringify(figurinhas))
        fs.copyFileSync(
            path.resolve("images", "domingo_a_noite.png"),
            stickerPath
        )

        await init(bot)
        await run(bot, message)

        expect(fs.existsSync(stickerPath)).toBeFalsy()

        const stickers = JSON.parse(localStorage.getItem(STICKERS))
        expect(Object.keys(stickers)).toHaveLength(0)

        expect(message.reply).toBeCalledTimes(1)
    })
})