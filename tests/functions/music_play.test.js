const { run } = require("../../functions/music_play")
const sharedVariables = require("../../utils/shared_variables")
const { setSharedVariable, AUDIO_QUEUE_NAME, sharedVariableExists, MUSIC_QUEUE_NAME, clearSharedVariables, getSharedVariable, MUSIC_TIMEOUT_ID, MUSIC_INTERVAL_ID } = sharedVariables
const { AudioPlayerStatus, joinVoiceChannel } = require("@discordjs/voice")
const { mockAudioPlayer, mockBasicInfo, mockMessage, mockPlaylistInfo, mockVoiceConnection, mockQueueObject, mockBot } = require("../utils_test")
const playdl = require('play-dl')
const { ExpectedError } = require("../../utils/expected_error")

afterEach(() => {
    clearSharedVariables()
    jest.resetAllMocks()
    jest.restoreAllMocks()
})

//TODO: Cenários de teste para setInterval e setTimeout

describe("play", () => {
    test("não deveria iniciar a música quando o usuário não estiver em um canal de voz", async () => {
        const message = mockMessage("play")
        delete message.member.voice.channel

        expect.hasAssertions()
        try {
            await run(mockBot(), message)
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
            expect(error.message).toEqual("Cadê o canal de voz?")
            expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
        }
    })

    test("não deveria iniciar a música quando bot não tiver as permissões", async () => {
        const message = mockMessage("play")
        message.member.voice.channel.permissionsFor().has.mockImplementation(() => false)

        expect.hasAssertions()
        try {
            await run(mockBot(), message)
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
            expect(error.message).toEqual("Tô sem permissão, fala com o corno do adm!")
            expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
        }
    })

    test("não deveria iniciar a música quando o usuário não informar a música", async () => {
        const message = mockMessage("play")

        expect.hasAssertions()
        try {
            await run(mockBot(), message)
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
            expect(error.message).toEqual("Cadê a música man?")
            expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
        }
    })

    test("não deveria tocar uma música quando tiver um áudio tocando", async () => {
        const url = "https://www.youtube.com/watch?v=kijpcUv-b8M"
        const message = mockMessage("play", url)
        mockBasicInfo(url, "titulo")
        setSharedVariable(AUDIO_QUEUE_NAME, {})

        expect.hasAssertions()
        try {
            await run(mockBot(), message)
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
            expect(error.message).toEqual("Tem um áudio tocando man, calma ae")
            expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
        }
    })

    test("deveria tocar uma música com link de parâmetro", async () => {
        const url = "https://www.youtube.com/watch?v=kijpcUv-b8M"
        const player = mockAudioPlayer()
        const message = mockMessage("play", url)
        const bot = mockBot()
        const musicTitle = "titulo"
        const connection = mockVoiceConnection()
        mockBasicInfo(url, musicTitle)
        playdl.stream.mockImplementation(async () => ({ stream: {} }))

        await run(bot, message)

        expect(connection.subscribe).toBeCalledTimes(1)
        expect(joinVoiceChannel).toBeCalledTimes(1)
        expect(player.play).toBeCalledTimes(1)
        expect(message.channel.send).toBeCalledTimes(1)
        expect(player.on).toBeCalledTimes(2)
        expect(player.on).toHaveBeenNthCalledWith(1, AudioPlayerStatus.Idle, expect.any(Function))
        expect(player.on).toHaveBeenNthCalledWith(2, "error", expect.any(Function))
        expect(bot.user.setActivity).toBeCalledTimes(1)
        expect(bot.user.setActivity).toBeCalledWith(musicTitle, expect.objectContaining({ url, type: 1 }))
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("deveria adicionar música na fila quando tiver uma música tocando", async () => {
        const url = "https://www.youtube.com/watch?v=kijpcUv-b8M"
        const message = mockMessage("play", url)
        const musicQueue = mockQueueObject(MUSIC_QUEUE_NAME)
        mockBasicInfo(url, "titulo")
        musicQueue.player.state.status = AudioPlayerStatus.Playing
        playdl.stream.mockImplementation(async () => ({ stream: {} }))

        await run(mockBot(), message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(musicQueue.player.play).toBeCalledTimes(0)
        expect(musicQueue.songs.length).toEqual(1)
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("deveria tocar uma música com texto", async () => {
        const url = "https://www.youtube.com/watch?v=kijpcUv-b8M"
        const player = mockAudioPlayer()
        const message = mockMessage("play", "queen")
        const connection = mockVoiceConnection()
        mockBasicInfo(url, "queen")
        playdl.stream.mockImplementation(async () => ({ stream: {} }))
        playdl.search.mockImplementation(async () => ([{ url }, { url: "random text" }]))

        await run(mockBot(), message)

        expect(joinVoiceChannel).toBeCalledTimes(1)
        expect(connection.subscribe).toBeCalledTimes(1)
        expect(player.play).toBeCalledTimes(1)
        expect(playdl.stream).toBeCalledWith(url, { quality: 1 })
        expect(message.channel.send).toBeCalledTimes(1)
        expect(player.on).toBeCalledTimes(2)
        expect(player.on).toHaveBeenNthCalledWith(1, AudioPlayerStatus.Idle, expect.any(Function))
        expect(player.on).toHaveBeenNthCalledWith(2, "error", expect.any(Function))
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("deveria tocar uma música com link de playlist", async () => {
        const url = "https://www.youtube.com/watch?v=u9Dg-g7t2l4&list=PLX8S4ptxX3CHezw1JDnwAH7CZLFGpj0z-"
        const videos = [{ url }, { url }, { url }]
        const player = mockAudioPlayer()
        const message = mockMessage("play", url)
        mockVoiceConnection()
        mockBasicInfo(url, "titulo")
        mockPlaylistInfo(url, videos)
        playdl.stream.mockImplementation(async () => ({ stream: {} }))

        await run(mockBot(), message)

        expect(player.play).toBeCalledTimes(1)
        expect(message.channel.send).toBeCalledTimes(2)
        expect(player.on).toBeCalledTimes(2)
        expect(player.on).toHaveBeenNthCalledWith(1, AudioPlayerStatus.Idle, expect.any(Function))
        expect(player.on).toHaveBeenNthCalledWith(2, "error", expect.any(Function))
        expect(getSharedVariable(MUSIC_QUEUE_NAME).songs.length).toEqual(videos.length - 1)
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("não deveria dar erro quando o link com id de playlist estiver quebrado", async () => {
        const url = "https://www.youtube.com/watch?v=u9Dg-g7t2l4&list=PLX8S4ptxX3CHezw1JDnwAH7CZLFGpj0z-"
        const player = mockAudioPlayer()
        const message = mockMessage("play", url)
        mockVoiceConnection()
        mockBasicInfo(url, "titulo")
        playdl.playlist_info.mockImplementation(() => { throw new Error("Erro fake ao buscar info da playlist") })
        playdl.stream.mockImplementation(async () => ({ stream: {} }))

        await run(mockBot(), message)

        expect(player.play).toBeCalledTimes(1)
        expect(message.channel.send).toBeCalledTimes(1)
        expect(player.on).toBeCalledTimes(2)
        expect(player.on).toHaveBeenNthCalledWith(1, AudioPlayerStatus.Idle, expect.any(Function))
        expect(player.on).toHaveBeenNthCalledWith(2, "error", expect.any(Function))
        expect(getSharedVariable(MUSIC_QUEUE_NAME).songs.length).toEqual(0)
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("deveria adicionar todas as músicas de uma playlist quando tiver uma música tocando", async () => {
        const url = "https://www.youtube.com/watch?v=u9Dg-g7t2l4&list=PLX8S4ptxX3CHezw1JDnwAH7CZLFGpj0z-"
        const videos = [{ url }, { url }, { url }]
        const message = mockMessage("play", url)
        const musicQueue = mockQueueObject(MUSIC_QUEUE_NAME)
        musicQueue.player.state.status = AudioPlayerStatus.Playing
        mockPlaylistInfo(url, videos)
        playdl.stream.mockImplementation(async () => ({ stream: {} }))

        await run(mockBot(), message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(musicQueue.player.play).toBeCalledTimes(0)
        expect(getSharedVariable(MUSIC_QUEUE_NAME).songs.length).toEqual(videos.length)
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })
})

describe("stop", () => {
    test("não deveria executar se o comando play não estiver rodando", async () => {
        const message = mockMessage("stop")

        await run(mockBot(), message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Nem tô na sala man")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })

    test("deveria parar com sucesso", async () => {
        const message = mockMessage("stop")
        const musicQueue = mockQueueObject(MUSIC_QUEUE_NAME)
        const bot = mockBot()

        await run(bot, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(musicQueue.player.removeAllListeners).toBeCalledTimes(1)
        expect(musicQueue.connection.destroy).toBeCalledTimes(1)
        expect(musicQueue.player.stop).toBeCalledTimes(1)
        expect(bot.user.setActivity).toBeCalledTimes(1)
        expect(bot.user.setActivity).toBeCalledWith(process.env.CARACTER_DEFAULT_FUNCTION + "help", expect.objectContaining({ type: "LISTENING" }))
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })

    test("deveria limpar o interval e o timeout quando existirem", async () => {
        const message = mockMessage("stop")
        const timeoutId = "timeout"
        const intervalId = "interval"
        mockQueueObject(MUSIC_QUEUE_NAME)
        const bot = mockBot()
        setSharedVariable(MUSIC_TIMEOUT_ID, timeoutId)
        setSharedVariable(MUSIC_INTERVAL_ID, intervalId)

        await run(bot, message)

        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
        expect(sharedVariableExists(MUSIC_TIMEOUT_ID)).toBeFalsy()
        expect(sharedVariableExists(MUSIC_INTERVAL_ID)).toBeFalsy()
    })

    test("não deveria desconectar quando tiver um áudio rodando", async () => {
        const message = mockMessage("stop")
        const musicQueue = mockQueueObject(MUSIC_QUEUE_NAME)
        setSharedVariable(AUDIO_QUEUE_NAME, {})

        await run(mockBot(), message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(musicQueue.player.removeAllListeners).toBeCalledTimes(1)
        expect(musicQueue.connection.destroy).toBeCalledTimes(0)
        expect(musicQueue.player.stop).toBeCalledTimes(1)
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })
})

describe("skip", () => {
    test("não deveria executar se o comando play não estiver rodando", async () => {
        const message = mockMessage("skip")

        await run(mockBot(), message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Nem tô na sala man")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })

    test("não deveria executar não existir mais músicas na fila", async () => {
        const message = mockMessage("skip")
        mockQueueObject(MUSIC_QUEUE_NAME)

        await run(mockBot(), message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Fila tá vazia man")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("não deveria executar quando um áudio estiver tocando", async () => {
        const message = mockMessage("skip")
        mockQueueObject(MUSIC_QUEUE_NAME)
        setSharedVariable(AUDIO_QUEUE_NAME, {})

        await run(mockBot(), message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Tem um áudio tocando man, calma ae")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("deveria parar o player quando existirem músicas na fila", async () => {
        const message = mockMessage("skip")
        const musicQueue = mockQueueObject(MUSIC_QUEUE_NAME)
        musicQueue.songs.push("url")

        await run(mockBot(), message)

        expect(musicQueue.player.stop).toBeCalledTimes(1)
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })
})

describe("next", () => {
    test("não deveria executar se o comando play não estiver rodando", async () => {
        const message = mockMessage("next")

        await run(mockBot(), message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Nem tô na sala man")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })

    test("não deveria dar erro quando a fila estiver vazia", async () => {
        const message = mockMessage("next")
        mockQueueObject(MUSIC_QUEUE_NAME)

        await run(mockBot(), message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Fila tá vazia man")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("deveria retornar o link da próxima música com sucesso", async () => {
        const urls = ["url1", "url2"]
        const message = mockMessage("next")
        const musicQueue = mockQueueObject(MUSIC_QUEUE_NAME)
        musicQueue.songs = musicQueue.songs.concat(urls)
        playdl.video_basic_info.mockImplementation(async url => {
            if (!urls.includes(url)) return mockBot()
            return {
                video_details: { url }
            }
        })

        await run(mockBot(), message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith(`Próxima música: ${urls[0]}`)
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })
})

describe("current", () => {
    test("não deveria executar se o comando play não estiver rodando", async () => {
        const message = mockMessage("current")

        await run(mockBot(), message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Nem tô na sala man")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })

    test("não deveria dar erro quando a fila estiver vazia", async () => {
        const message = mockMessage("current")
        mockQueueObject(MUSIC_QUEUE_NAME)

        await run(mockBot(), message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Tem nada tocando man")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("deveria retornar o link música que está tocando com sucesso", async () => {
        const urls = ["url1", "url2", "url3"]
        const message = mockMessage("current")
        const musicQueue = mockQueueObject(MUSIC_QUEUE_NAME)
        const currentSong = urls.shift()
        musicQueue.currentSong = {
            video_details: {
                url: currentSong
            }
        }
        musicQueue.songs = musicQueue.songs.concat(urls)

        await run(mockBot(), message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith(`Tá tocando isso aqui: ${currentSong}`)
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })
})