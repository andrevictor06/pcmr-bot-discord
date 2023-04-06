const fs = require("fs")
const path = require('path')
const { clearSharedVariables, MUSIC_QUEUE_NAME } = require("../../utils/shared_variables")
const utils = require('../../utils/Utils')
const { mockMessage, mockBot, mockEventInteraction, mockAudioPlayer, mockVoiceConnection, mockQueueObject } = require('../utils_test')
const { run } = require('../../functions/audio_play')
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
        const audios = fs.readdirSync(path.resolve('audio'))
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

    test("deveria tocar um áudio com sucesso", async () => {
        const bot = mockBot()
        const message = mockMessage('audio')
        const audios = fs.readdirSync(path.resolve('audio'))
        const audioButtonId = process.env.ENVIRONMENT + "btn_audio_" + audios[0]
        const event = mockEventInteraction(audioButtonId, bot)
        const player = mockAudioPlayer()
        const connection = mockVoiceConnection()

        await run(bot, message)

        const playAudio = bot.addInteractionCreate.mock.calls[0][1]
        playAudio(event)

        expect(connection.subscribe).toBeCalledTimes(1)
        expect(joinVoiceChannel).toBeCalledTimes(1)
        expect(player.play).toBeCalledTimes(1)
        expect(player.on).toBeCalledTimes(2)
        expect(player.on).toHaveBeenNthCalledWith(1, AudioPlayerStatus.Idle, expect.any(Function))
        expect(player.on).toHaveBeenNthCalledWith(2, "error", expect.any(Function))
    })

    test("deveria tocar um áudio com sucesso mesmo se tiver tocando uma música", async () => {
        const bot = mockBot()
        const message = mockMessage('audio')
        const audios = fs.readdirSync(path.resolve('audio'))
        const audioButtonId = process.env.ENVIRONMENT + "btn_audio_" + audios[0]
        const event = mockEventInteraction(audioButtonId, bot)
        const player = mockAudioPlayer()
        const musicQueue = mockQueueObject(MUSIC_QUEUE_NAME, event.member.voice.channel.id)

        await run(bot, message)

        const playAudio = bot.addInteractionCreate.mock.calls[0][1]
        playAudio(event)

        expect(musicQueue.connection.subscribe).toBeCalledTimes(1)
        expect(musicQueue.player.pause).toBeCalledTimes(1)
        expect(joinVoiceChannel).toBeCalledTimes(0)
        expect(player.play).toBeCalledTimes(1)
        expect(player.on).toBeCalledTimes(2)
        expect(player.on).toHaveBeenNthCalledWith(1, AudioPlayerStatus.Idle, expect.any(Function))
        expect(player.on).toHaveBeenNthCalledWith(2, "error", expect.any(Function))
    })

    test("deveria ocorrer um erro ao tentar tocar um áudio quando o bot já estiver tocando música em outra sala", async () => {
        const bot = mockBot()
        const message = mockMessage('audio')
        const audios = fs.readdirSync(path.resolve('audio'))
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

})