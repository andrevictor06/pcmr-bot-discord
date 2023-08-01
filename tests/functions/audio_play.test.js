const { default: axios, AxiosHeaders } = require('axios')
const fs = require("fs")
const path = require('path')
const { clearSharedVariables, sharedVariableExists } = require("../../utils/shared_variables")
const { MUSIC_QUEUE_NAME, AUDIO_QUEUE_NAME } = require('../../utils/constants')
const utils = require('../../utils/Utils')
const { mockMessage, mockBot, mockEventInteraction, mockAudioPlayer, mockVoiceConnection, mockQueueObject, clearFolder, mockAxiosHeaders } = require('../utils_test')
const { init, run, canHandle } = require('../../functions/audio_play')
const { joinVoiceChannel, AudioPlayerStatus } = require("@discordjs/voice")
const { ExpectedError } = require("../../utils/expected_error")
const { randomUUID } = require('crypto')

const audioFolderPath = path.resolve(process.env.PASTA_AUDIO)
const defaultImageExtension = ".mp3"

beforeEach(async () => {
    if (fs.existsSync(audioFolderPath)) {
        clearFolder(audioFolderPath)
    }
    init(mockBot())
    fs.copyFileSync(
        path.resolve("assets", "dilera-mamaco.mp3"),
        path.resolve(audioFolderPath, "dilera-mamaco.mp3")
    )
})

afterEach(() => {
    clearSharedVariables()
    jest.resetAllMocks()
    jest.restoreAllMocks()
})

describe("audio", () => {
    test("deveria retornar a lista de áudios disponíveis", async () => {
        jest.spyOn(utils, 'chunkArray')
        const chunksSize = 5
        const bot = mockBot()
        const message = mockMessage('audio')
        const audios = fs.readdirSync(path.resolve(process.env.PASTA_AUDIO))
        const audioButtonId = process.env.ENVIRONMENT + "btn_audio_" + audios[0]

        await run(bot, message)

        expect(bot.addInteractionCreate).toBeCalledTimes(audios.length)
        expect(bot.addInteractionCreate).toHaveBeenNthCalledWith(1, audioButtonId, expect.any(Function))
        expect(message.reply).toBeCalledTimes(Math.ceil(audios.length / chunksSize))
        const replyMessage = message.reply.mock.calls[0][0]
        expect(replyMessage).toBeTruthy()
        expect(Array.isArray(replyMessage.components)).toBeTruthy()
        const button = replyMessage.components[0]
        expect(button).toMatchObject({
            type: 1,
            components: [
                {
                    type: 2,
                    label: expect.any(String),
                    style: 1,
                    custom_id: audioButtonId,
                }
            ]
        })
    })

    test("não deveria dar erro a pasta de áudio não existir", async () => {
        const message = mockMessage('audio')
        clearFolder(audioFolderPath)

        await run(mockBot(), message)

        expect(message.reply).toBeCalledTimes(1)
    })

    test("não deveria dar erro se não existir nenhum áudio", async () => {
        const message = mockMessage('audio')

        await run(mockBot(), message)

        expect(message.reply).toBeCalledTimes(1)
    })

    test("deveria dar erro se não for enviado o áudio", async () => {
        expect.hasAssertions()
        try {
            await run(mockBot(), mockMessage("audio", "nome do audio"))
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
        }
    })

    test("deveria dar erro o tempo inical for maior que o final", async () => {
        jest.spyOn(utils, 'getFirstAttachmentFrom')
        expect.hasAssertions()
        try {
            await run(mockBot(), mockMessage("audio", "nome do audio", "--start 4", "--end 2"))
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
            expect(utils.getFirstAttachmentFrom).toBeCalledTimes(0)
        }
    })

    test("deveria dar erro se o tempo final - tempo inicial for maior que 30s", async () => {
        jest.spyOn(utils, 'getFirstAttachmentFrom')
        expect.hasAssertions()
        try {
            await run(mockBot(), mockMessage("audio", "nome do audio", "--start 5", "--end 50"))
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
            expect(utils.getFirstAttachmentFrom).toBeCalledTimes(0)
        }
    })

    test("deveria dar erro tempo inicial for negativo", async () => {
        jest.spyOn(utils, 'getFirstAttachmentFrom')
        expect.hasAssertions()
        try {
            await run(mockBot(), mockMessage("audio", "nome do audio", "--start -5", "--end 50"))
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
            expect(utils.getFirstAttachmentFrom).toBeCalledTimes(0)
        }
    })

    test("deveria dar erro tempo final for negativo", async () => {
        jest.spyOn(utils, 'getFirstAttachmentFrom')
        expect.hasAssertions()
        try {
            await run(mockBot(), mockMessage("audio", "nome do audio", "--start 5", "--end -50"))
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
            expect(utils.getFirstAttachmentFrom).toBeCalledTimes(0)
        }
    })

    test("deveria dar erro se o anexo não for um mp3", async () => {
        expect.hasAssertions()
        try {
            const message = mockMessage("audio", "nome audio")
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

    test("deveria dar erro se o anexo for muito grande", async () => {
        expect.hasAssertions()
        try {
            const message = mockMessage("audio", "nome audio")
            const attachment = {
                contentType: "audio/mpeg",
                size: 100 * 1024 * 1024
            }
            message.attachments = new Map([
                ["1", attachment]
            ])
            await run(mockBot(), message)
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
        }
    })

    test("deveria salvar um áudio com sucesso", async () => {
        const message = mockMessage("audio", "monki flip")
        const audioPath = path.resolve("assets", "dilera-mamaco.mp3")
        const attachment = {
            url: audioPath,
            name: "dilera-mamaco.mp3",
            contentType: "audio/mpeg",
            size: fs.statSync(audioPath).size
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

        const files = fs.readdirSync(audioFolderPath)
        expect(files).toBeTruthy()
        expect(files.find(v => v == "monki_flip.mp3")).toBeDefined()

        expect(message.reply).toBeCalledTimes(1)
    })

    test("deveria salvar um áudio com sucesso utilizando o áudio da mensagem original", async () => {
        const message = mockMessage("audio", "monki flip")
        message.reference = {
            messageId: randomUUID()
        }
        const audioPath = path.resolve("assets", "dilera-mamaco.mp3")
        const attachment = {
            url: audioPath,
            name: "dilera-mamaco.mp3",
            contentType: "audio/mpeg",
            size: fs.statSync(audioPath).size
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

        const files = fs.readdirSync(audioFolderPath)
        expect(files).toBeTruthy()
        expect(files.find(v => v == "monki_flip.mp3")).toBeDefined()

        expect(message.reply).toBeCalledTimes(1)
    })

    test("deveria executar o canHandle corretamente", () => {
        expect(canHandle(mockBot(), mockMessage('audio'))).toBeTruthy()
    })

    test("deveria dar erro ao tentar criar uma figurinha quando a pasta tiver atingido o limite", async () => {
        process.env.PASTA_AUDIO_LIMITE = 10

        expect.hasAssertions()

        try {
            await run(mockBot(), mockMessage("audio", "nome audio"))
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
        }
    })
})

describe('play audio', () => {
    test("deveria tocar um áudio com sucesso", async () => {
        jest.spyOn(fs, 'createReadStream')
        const bot = mockBot()
        const message = mockMessage('audio')
        const audios = fs.readdirSync(path.resolve(process.env.PASTA_AUDIO))
        const audio = audios[0]
        const audioButtonId = process.env.ENVIRONMENT + "btn_audio_" + audio
        const event = mockEventInteraction(audioButtonId, bot)
        const player = mockAudioPlayer()
        const connection = mockVoiceConnection()

        await run(bot, message)

        const playAudio = bot.addInteractionCreate.mock.calls[0][1]
        await playAudio(event)

        expect(connection.subscribe).toBeCalledTimes(1)
        expect(joinVoiceChannel).toBeCalledTimes(1)
        expect(player.play).toBeCalledTimes(1)
        expect(player.on).toBeCalledTimes(2)
        expect(player.on).toHaveBeenNthCalledWith(1, AudioPlayerStatus.Idle, expect.any(Function))
        expect(player.on).toHaveBeenNthCalledWith(2, "error", expect.any(Function))
        expect(fs.createReadStream).toBeCalledTimes(1)
        expect(fs.createReadStream).toHaveBeenNthCalledWith(1, path.resolve('audio', audio), expect.anything())
        expect(bot.addInteractionCreate).lastCalledWith(process.env.ENVIRONMENT + "btn_stop_audio", expect.any(Function))
    })

    test("deveria tocar um áudio com sucesso mesmo se estiver tocando outro áudio", async () => {
        jest.spyOn(fs, 'createReadStream')
        const bot = mockBot()
        const message = mockMessage('audio')
        const audios = fs.readdirSync(path.resolve(process.env.PASTA_AUDIO))
        const audio = audios[0]
        const audioButtonId = process.env.ENVIRONMENT + "btn_audio_" + audio
        const event = mockEventInteraction(audioButtonId, bot)
        const audioQueue = mockQueueObject(AUDIO_QUEUE_NAME, event.member.voice.channel.id)

        await run(bot, message)

        const playAudio = bot.addInteractionCreate.mock.calls[0][1]
        await playAudio(event)

        expect(audioQueue.connection.subscribe).toBeCalledTimes(0)
        expect(joinVoiceChannel).toBeCalledTimes(0)
        expect(audioQueue.player.off).toBeCalledTimes(1)
        expect(audioQueue.player.stop).toBeCalledTimes(1)
        expect(audioQueue.player.on).toBeCalledTimes(1)
        expect(audioQueue.player.play).toBeCalledTimes(1)
        expect(fs.createReadStream).toBeCalledTimes(1)
        expect(fs.createReadStream).toHaveBeenNthCalledWith(1, path.resolve('audio', audio), expect.anything())
        expect(bot.addInteractionCreate).lastCalledWith(process.env.ENVIRONMENT + "btn_stop_audio", expect.any(Function))
    })

    test("deveria tocar um áudio com sucesso mesmo se tiver tocando uma música", async () => {
        const bot = mockBot()
        const message = mockMessage('audio')
        const audios = fs.readdirSync(path.resolve(process.env.PASTA_AUDIO))
        const audioButtonId = process.env.ENVIRONMENT + "btn_audio_" + audios[0]
        const event = mockEventInteraction(audioButtonId, bot)
        const player = mockAudioPlayer()
        const musicQueue = mockQueueObject(MUSIC_QUEUE_NAME, event.member.voice.channel.id)

        await run(bot, message)

        const playAudio = bot.addInteractionCreate.mock.calls[0][1]
        await playAudio(event)

        expect(musicQueue.connection.subscribe).toBeCalledTimes(1)
        expect(musicQueue.player.pause).toBeCalledTimes(1)
        expect(joinVoiceChannel).toBeCalledTimes(0)
        expect(player.play).toBeCalledTimes(1)
        expect(player.on).toBeCalledTimes(2)
        expect(player.on).toHaveBeenNthCalledWith(1, AudioPlayerStatus.Idle, expect.any(Function))
        expect(player.on).toHaveBeenNthCalledWith(2, "error", expect.any(Function))
        expect(bot.addInteractionCreate).lastCalledWith(process.env.ENVIRONMENT + "btn_stop_audio", expect.any(Function))
    })

    test("deveria ocorrer um erro ao tentar tocar um áudio quando o bot já estiver tocando música em outra sala", async () => {
        const bot = mockBot()
        const message = mockMessage('audio')
        const audios = fs.readdirSync(path.resolve(process.env.PASTA_AUDIO))
        const audioButtonId = process.env.ENVIRONMENT + "btn_audio_" + audios[0]
        const event = mockEventInteraction(audioButtonId, bot)
        mockAudioPlayer()
        mockQueueObject(MUSIC_QUEUE_NAME)

        await run(bot, message)

        expect.hasAssertions()
        try {
            const playAudio = bot.addInteractionCreate.mock.calls[0][1]
            await playAudio(event)
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
        }
    })

    test("deveria executar o canHandle corretamente", () => {
        expect(canHandle(mockBot(), mockMessage('audio'))).toBeTruthy()
    })
})

describe('stop audio', () => {
    test("deveria parar de tocar um audio quando o usuário clicar no botão de parar", async () => {
        const bot = mockBot()
        const message = mockMessage('audio')
        const audios = fs.readdirSync(path.resolve(process.env.PASTA_AUDIO))
        const audio = audios[0]
        const audioButtonId = process.env.ENVIRONMENT + "btn_audio_" + audio
        const event = mockEventInteraction(audioButtonId, bot)
        const player = mockAudioPlayer()
        const connection = mockVoiceConnection()

        await run(bot, message)

        const playAudio = bot.addInteractionCreate.mock.calls[0][1]
        await playAudio(event)

        const stopAudio = bot.addInteractionCreate.mock.lastCall[1]
        await stopAudio(event)

        expect(player.removeAllListeners).toBeCalledTimes(1)
        expect(player.stop).toBeCalledTimes(1)
        expect(connection.destroy).toBeCalledTimes(1)
        expect(sharedVariableExists(AUDIO_QUEUE_NAME)).toBeFalsy()
    })

    test("deveria desconectar da sala quando o áudio terminar de tocar", async () => {
        const bot = mockBot()
        const message = mockMessage('audio')
        const audios = fs.readdirSync(path.resolve(process.env.PASTA_AUDIO))
        const audio = audios[0]
        const audioButtonId = process.env.ENVIRONMENT + "btn_audio_" + audio
        const event = mockEventInteraction(audioButtonId, bot)
        const player = mockAudioPlayer()
        const connection = mockVoiceConnection()

        await run(bot, message)

        const playAudio = bot.addInteractionCreate.mock.calls[0][1]
        await playAudio(event)

        const idleFunction = player.listeners.get(AudioPlayerStatus.Idle)[0]
        await idleFunction()

        expect(player.removeAllListeners).toBeCalledTimes(1)
        expect(player.stop).toBeCalledTimes(1)
        expect(connection.destroy).toBeCalledTimes(1)
        expect(sharedVariableExists(AUDIO_QUEUE_NAME)).toBeFalsy()
    })

    test("deveria parar de tocar o audio e voltar a música quando o usuário clicar no botão de parar", async () => {
        const bot = mockBot()
        const message = mockMessage('audio')
        const audios = fs.readdirSync(path.resolve(process.env.PASTA_AUDIO))
        const audio = audios[0]
        const audioButtonId = process.env.ENVIRONMENT + "btn_audio_" + audio
        const event = mockEventInteraction(audioButtonId, bot)
        const player = mockAudioPlayer()
        const musicQueue = mockQueueObject(MUSIC_QUEUE_NAME, event.member.voice.channel.id)

        await run(bot, message)

        const playAudio = bot.addInteractionCreate.mock.calls[0][1]
        await playAudio(event)

        const stopAudio = bot.addInteractionCreate.mock.lastCall[1]
        await stopAudio(event)

        expect(musicQueue.connection.subscribe).toBeCalledTimes(2)
        expect(musicQueue.player.unpause).toBeCalledTimes(1)
        expect(player.removeAllListeners).toBeCalledTimes(1)
        expect(player.stop).toBeCalledTimes(1)
        expect(musicQueue.connection.destroy).toBeCalledTimes(0)
        expect(sharedVariableExists(AUDIO_QUEUE_NAME)).toBeFalsy()
    })

    test("deveria voltar a tocar a música quando o áudio terminar de tocar", async () => {
        const bot = mockBot()
        const message = mockMessage('audio')
        const audios = fs.readdirSync(path.resolve(process.env.PASTA_AUDIO))
        const audio = audios[0]
        const audioButtonId = process.env.ENVIRONMENT + "btn_audio_" + audio
        const event = mockEventInteraction(audioButtonId, bot)
        const player = mockAudioPlayer()
        const musicQueue = mockQueueObject(MUSIC_QUEUE_NAME, event.member.voice.channel.id)

        await run(bot, message)

        const playAudio = bot.addInteractionCreate.mock.calls[0][1]
        await playAudio(event)

        const idleFunction = player.listeners.get(AudioPlayerStatus.Idle)[0]
        await idleFunction()

        expect(musicQueue.connection.subscribe).toBeCalledTimes(2)
        expect(musicQueue.player.unpause).toBeCalledTimes(1)
        expect(player.removeAllListeners).toBeCalledTimes(1)
        expect(player.stop).toBeCalledTimes(1)
        expect(musicQueue.connection.destroy).toBeCalledTimes(0)
        expect(sharedVariableExists(AUDIO_QUEUE_NAME)).toBeFalsy()
    })

    test("deveria ocorrer um erro quando o usuário clicar no botão de parar e não tiver nenhum áudio tocando", async () => {
        const bot = mockBot()
        const message = mockMessage('audio')
        const audios = fs.readdirSync(path.resolve(process.env.PASTA_AUDIO))
        const audio = audios[0]
        const audioButtonId = process.env.ENVIRONMENT + "btn_audio_" + audio
        const event = mockEventInteraction(audioButtonId, bot)
        mockAudioPlayer()
        mockQueueObject(MUSIC_QUEUE_NAME, event.member.voice.channel.id)

        await run(bot, message)

        const playAudio = bot.addInteractionCreate.mock.calls[0][1]
        await playAudio(event)

        try {
            const stopAudio = bot.addInteractionCreate.mock.lastCall[1]
            await stopAudio(event)
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
        }
    })
})

describe("deletar_audio", () => {
    test("deveria executar o canHandle corretamente", () => {
        expect(canHandle(mockBot(), mockMessage('deletar_audio'))).toBeTruthy()
    })

    test("deveria dar erro se não for informado o nome áudio", async () => {
        expect.hasAssertions()

        try {
            await run(mockBot(), mockMessage("deletar_audio"))
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
        }
    })

    test("deveria dar erro se o áudio não existir", async () => {
        expect.hasAssertions()

        try {
            await run(mockBot(), mockMessage("deletar_audio", "nome figurinha"))
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
        }
    })

    test("deveria deletar o áudio corretamente", async () => {
        const audioName = "monki_flip"
        const audioPath = path.resolve(audioFolderPath, audioName + defaultImageExtension)
        const bot = mockBot()
        const message = mockMessage("deletar_audio", audioName)
        fs.copyFileSync(
            path.resolve("assets", "dilera-mamaco.mp3"),
            audioPath
        )

        await run(bot, message)

        expect(fs.existsSync(audioPath)).toBeFalsy()
        expect(message.reply).toBeCalledTimes(1)
    })
})
