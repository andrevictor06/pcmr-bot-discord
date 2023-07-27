const fs = require("fs")
const path = require('path')
const { clearSharedVariables, sharedVariableExists } = require("../../utils/shared_variables")
const { MUSIC_QUEUE_NAME, AUDIO_QUEUE_NAME } = require('../../utils/constants')
const utils = require('../../utils/Utils')
const { mockMessage, mockBot, mockEventInteraction, mockAudioPlayer, mockVoiceConnection, mockQueueObject } = require('../utils_test')
const { run, canHandle } = require('../../functions/audio_play')
const { joinVoiceChannel, AudioPlayerStatus } = require("@discordjs/voice")
const { ExpectedError } = require("../../utils/expected_error")

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

    test("deveria dar erro se não for enviado o áudio", async () => {
        expect.hasAssertions()
        try {
            await run(mockBot(), mockMessage("audio", "nome do audio"))
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
        }
    })

    test("deveria dar erro o tempo inical for maior que o final", async () => {
        expect.hasAssertions()
        try {
            await run(mockBot(), mockMessage("audio", "nome do audio", "--start 4", "--end 2"))
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
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