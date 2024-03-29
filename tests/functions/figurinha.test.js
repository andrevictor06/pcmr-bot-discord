const { default: axios } = require('axios')
const { init, run, canHandle } = require('../../functions/figurinha')
const { ExpectedError } = require('../../utils/expected_error')
const { mockBot, mockMessage, clearFolder, mockAxiosHeaders } = require('../utils_test')
const fs = require('fs')
const path = require('path')
const { STICKERS } = require('../../utils/constants')
const { randomUUID } = require('crypto')

const stickersTestFolder = path.resolve(process.env.PASTA_FIGURINHAS)
const defaultImageExtension = ".png"

beforeEach(async () => {
    if (fs.existsSync(stickersTestFolder)) {
        clearFolder(stickersTestFolder)
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
        const imagePath = path.resolve("assets", "domingo_a_noite.png")
        const attachment = {
            url: imagePath,
            name: "domingo_a_noite.png",
            contentType: "image/png",
            size: fs.statSync(imagePath).size
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
                headers: mockAxiosHeaders({
                    "Content-Type": attachment.contentType,
                    "Content-Length": attachment.size
                })
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
        expect(message.repliedMessage().edit).toBeCalledTimes(1)
    })

    test("deveria criar uma figurinha com sucesso a partir de um video mp4", async () => {
        const message = mockMessage("figurinha", "João")
        const videoPath = path.resolve("tests", "files", "video.mp4")
        const attachment = {
            url: videoPath,
            name: "video.mp4",
            contentType: "video/mp4",
            size: fs.statSync(videoPath).size
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
                headers: mockAxiosHeaders({
                    "Content-Type": attachment.contentType,
                    "Content-Length": attachment.size
                })
            }
            return response
        })

        await run(mockBot(), message)

        const stickersJson = localStorage.getItem(STICKERS)
        expect(stickersJson).toBeTruthy()

        const stickers = JSON.parse(stickersJson)
        expect(stickers).toMatchObject({
            "joao": path.resolve(stickersTestFolder, "joao.gif")
        })

        const files = fs.readdirSync(stickersTestFolder)
        expect(files).toBeTruthy()
        expect(files).toHaveLength(1)
        expect(files[0]).toEqual("joao.gif")

        expect(message.reply).toBeCalledTimes(1)
        expect(message.repliedMessage().edit).toBeCalledTimes(1)
    })

    test("deveria dar erro ao tentar processar uma imagem maior que o limite definido", async () => {
        expect.hasAssertions()

        const message = mockMessage("figurinha", "João")
        const attachment = {
            url: path.resolve("assets", "domingo_a_noite.png"),
            name: "domingo_a_noite.png",
            contentType: "image/png",
            size: 100 * 1024 * 1024
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
                headers: mockAxiosHeaders({
                    "Content-Type": attachment.contentType,
                    "Content-Length": attachment.size
                })
            }
            return response
        })

        try {
            await run(mockBot(), message)
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
        }
    })

    test("deveria criar uma figurinha com sucesso utilizando a imagem da mensagem original", async () => {
        const message = mockMessage("figurinha", "João")
        message.reference = {
            messageId: randomUUID()
        }
        const imagePath = path.resolve("assets", "domingo_a_noite.png")
        const attachment = {
            url: imagePath,
            name: "domingo_a_noite.png",
            contentType: "image/png",
            size: fs.statSync(imagePath).size
        }
        const repliedMessage = mockMessage("mensagem")
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
                headers: mockAxiosHeaders({
                    "Content-Type": attachment.contentType,
                    "Content-Length": attachment.size
                })
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
        const imageUrl = path.resolve("assets", "domingo_a_noite.png")
        const message = mockMessage("figurinha", "João", "--url " + imageUrl)
        axios.get.mockImplementation((url, options) => {
            expect(url).toEqual(imageUrl)
            expect(options).toMatchObject({
                responseType: 'stream'
            })

            const response = {
                data: fs.createReadStream(imageUrl),
                headers: mockAxiosHeaders({
                    "Content-Type": "image/png",
                    "Content-Length": fs.statSync(imageUrl).size
                })
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
        expect(message.repliedMessage().edit).toBeCalledTimes(1)
    })

    test("deveria criar uma figurinha de gif com sucesso", async () => {
        const message = mockMessage("figurinha", "nome figurinha")
        const imagePath = path.resolve("assets", "monkey-sleep.gif")
        const attachment = {
            url: path.resolve("assets", "monkey-sleep.gif"),
            name: "monkey-sleep.gif",
            contentType: "image/gif",
            size: fs.statSync(imagePath).size
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
                headers: mockAxiosHeaders({
                    "Content-Type": attachment.contentType,
                    "Content-Length": attachment.size
                })
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
            path.resolve("assets", "domingo_a_noite.png"),
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
            path.resolve("assets", "domingo_a_noite.png"),
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
            path.resolve("assets", "domingo_a_noite.png"),
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