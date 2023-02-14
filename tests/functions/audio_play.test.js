const { run } = require("../../functions/audio_play")
const { mockMessage, mockBot, mockEventInteraction, mockPlaydlStream, mockAudioPlayer, mockVoiceConnection } = require("../utils_test")
const fs = require("fs")
const { clearSharedVariables } = require("../../utils/shared_variables")

afterEach(() => {
    clearSharedVariables()
    jest.resetAllMocks()
})

describe("audio", () => {

    test("deveria retornar a lista de áudios disponíveis", async () => {
        const message = mockMessage("audio")
        const audios = fs.readdirSync("./audio")
        const bot = mockBot()

        await run(bot, message)

        const callArgs = message.reply.mock.lastCall[0]
        expect(callArgs.components).toBeTruthy()
        expect(callArgs.components).toHaveLength(audios.length)
        expect(bot.on).toHaveBeenCalledTimes(1)
        for (let i = 0; i < audios.length; i++) {
            const button = callArgs.components[i]
            const audio = audios[i]
            expect(button.components[0].custom_id).toMatch(audio)
        }
    })

})