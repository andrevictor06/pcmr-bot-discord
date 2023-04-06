const { run } = require("../../functions/music_play")
const sharedVariables = require("../../utils/shared_variables")
const { setSharedVariable, AUDIO_QUEUE_NAME, sharedVariableExists, MUSIC_QUEUE_NAME, clearSharedVariables, getSharedVariable, MUSIC_TIMEOUT_ID, MUSIC_INTERVAL_ID } = sharedVariables
const { AudioPlayerStatus, joinVoiceChannel } = require("@discordjs/voice")
const { mockAudioPlayer, mockBasicInfo, mockMessage, mockPlaylistInfo, mockVoiceConnection, mockQueueObject, mockBot, mockPlaydlStream, fakeYtUrl } = require("../utils_test")
const playdl = require('play-dl')
const { ExpectedError } = require("../../utils/expected_error")
const utils = require("../../utils/Utils")
const path = require("path")

beforeEach(() => {
    jest.spyOn(global, 'setTimeout')
})

afterEach(() => {
    clearSharedVariables()
    jest.resetAllMocks()
    jest.restoreAllMocks()
})

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
        const url = fakeYtUrl()
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
        const url = fakeYtUrl()
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
        expect(getSharedVariable(MUSIC_QUEUE_NAME).songs).toHaveLength(0)
    })

    test("deveria adicionar música na fila quando tiver uma música tocando", async () => {
        const url = fakeYtUrl()
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
        const url = fakeYtUrl()
        const player = mockAudioPlayer()
        const search = "queen somebody to love"
        const message = mockMessage("play", search)
        const connection = mockVoiceConnection()
        mockBasicInfo(url, search)
        playdl.stream.mockImplementation(async () => ({ stream: {} }))
        playdl.search.mockImplementation(async (searchParam) => {
            if (search == searchParam) {
                return [{ url }]
            }
            return null
        })

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
        expect(getSharedVariable(MUSIC_QUEUE_NAME).songs).toHaveLength(0)
    })

    test("deveria tocar uma música com link de playlist", async () => {
        const url = fakeYtUrl(true)
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
        const url = fakeYtUrl(true)
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
        const url = fakeYtUrl(true)
        const videos = [{ url: fakeYtUrl() }, { url: fakeYtUrl() }, { url: fakeYtUrl() }]
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

    test("deveria repetir uma música quando for passado o parâmetro --times", async () => {
        const url = fakeYtUrl()
        const times = 5
        const player = mockAudioPlayer()
        const search = "queen somebody to love"
        const message = mockMessage("play", search, `--times ${times}`)
        const connection = mockVoiceConnection()
        mockBasicInfo(url, search)
        playdl.stream.mockImplementation(async () => ({ stream: {} }))
        playdl.search.mockImplementation(async (searchParam) => {
            if (search == searchParam) {
                return [{ url }]
            }
            return null
        })

        await run(mockBot(), message)

        expect(joinVoiceChannel).toBeCalledTimes(1)
        expect(connection.subscribe).toBeCalledTimes(1)
        expect(player.play).toBeCalledTimes(1)
        expect(playdl.stream).toBeCalledWith(url, { quality: 1 })
        expect(message.channel.send).toBeCalledTimes(2)
        expect(player.on).toBeCalledTimes(2)
        expect(player.on).toHaveBeenNthCalledWith(1, AudioPlayerStatus.Idle, expect.any(Function))
        expect(player.on).toHaveBeenNthCalledWith(2, "error", expect.any(Function))
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
        expect(getSharedVariable(MUSIC_QUEUE_NAME).songs).toHaveLength(times - 1)
    })

    test("deveria tocar somente uma vez quando o parâmetro --times for zero", async () => {
        const url = fakeYtUrl()
        const times = 0
        const player = mockAudioPlayer()
        const search = "queen somebody to love"
        const message = mockMessage("play", search, `--times ${times}`)
        const connection = mockVoiceConnection()
        mockBasicInfo(url, search)
        playdl.stream.mockImplementation(async () => ({ stream: {} }))
        playdl.search.mockImplementation(async (searchParam) => {
            if (search == searchParam) {
                return [{ url }]
            }
            return null
        })

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
        expect(getSharedVariable(MUSIC_QUEUE_NAME).songs).toHaveLength(0)
    })

    test("deveria aplicar um delayedStop quando ocorrer algum erro ao tentar adicionar a música na fila", async () => {
        const url = fakeYtUrl()
        const message = mockMessage("play", url)
        mockAudioPlayer()
        mockVoiceConnection()
        playdl.video_basic_info.mockImplementation(() => {
            throw new Error("Fake error")
        })

        expect.hasAssertions()
        try {
            await run(mockBot(), message)
        } catch (error) {
            expect(error).toBeInstanceOf(Error)
            expect(error.message).toContain("Fake error")
            expect(sharedVariableExists(MUSIC_TIMEOUT_ID)).toBeTruthy()
            expect(setTimeout).toBeCalledTimes(1)
        }
    })

    test('deveria aplicar um delayedStop quando não tiver mais músicas para tocar', async () => {
        const url = fakeYtUrl()
        const message = mockMessage("play", url)
        const bot = mockBot()
        const player = mockAudioPlayer()
        mockVoiceConnection()
        mockBasicInfo(url, "titulo")
        mockPlaydlStream()

        await run(bot, message)
        const idleFn = player.listeners.get(AudioPlayerStatus.Idle)[0]
        idleFn()

        const musicQueue = getSharedVariable(MUSIC_QUEUE_NAME)
        expect(musicQueue.currentSong).toBeNull()
        expect(sharedVariableExists(MUSIC_TIMEOUT_ID)).toBeTruthy()
        expect(setTimeout).toBeCalledTimes(1)
    })

    test('não deveria parar de executar se ocorrer um erro ao tentar tocar uma música', async () => {
        jest.spyOn(utils, 'logError')
        const url = fakeYtUrl()
        const message = mockMessage("play", url)
        const bot = mockBot()
        mockAudioPlayer()
        mockVoiceConnection()
        mockBasicInfo(url, "titulo")

        await run(bot, message)

        const musicQueue = getSharedVariable(MUSIC_QUEUE_NAME)
        expect(musicQueue.currentSong).toBeNull()
        expect(sharedVariableExists(MUSIC_TIMEOUT_ID)).toBeTruthy()
        expect(setTimeout).toBeCalledTimes(1)
        expect(utils.logError).toBeCalledTimes(1)
        expect(utils.logError).toHaveBeenNthCalledWith(1, bot, expect.any(Error), path.resolve("functions", "music_play.js"))
    })

    test('deveria dar erro quando a url não for do youtube', async () => {
        const url = fakeYtUrl().replace("youtube", "google")
        const message = mockMessage("play", url)
        const bot = mockBot()

        expect.hasAssertions()
        try {
            await run(bot, message)
        } catch (error) {
            expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
            expect(error).toBeInstanceOf(ExpectedError)
            expect(error.message).toEqual("Essa url não é do youtube não man")
        }
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
        expect(bot.user.setActivity).toBeCalledWith(utils.command("help"), expect.objectContaining({ type: "LISTENING" }))
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

    test("deveria deletar o tópico de músicas na fila quando existir", async () => {
        const message = mockMessage("stop")
        message.channel.threads.create({
            name: "músicas_na_fila"
        })
        mockQueueObject(MUSIC_QUEUE_NAME)

        await run(mockBot(), message)

        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
        expect(message.channel.threads.cache).toHaveLength(0)
    })

    test('deveria executar o delayedStop com sucesso', async () => {
        jest.spyOn(utils, 'logError')
        const url = fakeYtUrl()
        const message = mockMessage("play", url)
        const bot = mockBot()
        const player = mockAudioPlayer()
        mockVoiceConnection()
        mockBasicInfo(url, "titulo")
        mockPlaydlStream()

        await run(bot, message)
        const [idleFn] = player.listeners.get(AudioPlayerStatus.Idle)
        idleFn()
        const [timeoutFunction] = setTimeout.mock.lastCall
        timeoutFunction()

        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
        expect(sharedVariableExists(MUSIC_TIMEOUT_ID)).toBeFalsy()
        expect(setTimeout).toBeCalledTimes(1)
        expect(utils.logError).toBeCalledTimes(1)
        expect(utils.logError).toHaveBeenNthCalledWith(1, bot, expect.any(Error), path.resolve("functions", "spotify_playlist.js"))
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
        const urls = [fakeYtUrl(), fakeYtUrl()]
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
        const urls = [fakeYtUrl(), fakeYtUrl(), fakeYtUrl()]
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

describe("queue", () => {
    test("não deveria executar se o comando play não estiver rodando", async () => {
        const message = mockMessage("queue")

        await run(mockBot(), message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Nem tô na sala man")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })

    test("deveria informar quando a fila estiver vazia", async () => {
        const message = mockMessage("queue")
        mockQueueObject(MUSIC_QUEUE_NAME)

        expect.hasAssertions()
        try {
            await run(mockBot(), message)
        } catch (error) {
            expect(error).toBeInstanceOf(ExpectedError)
            expect(error.message).toEqual("Fila tá vazia man")
        }
    })

    test("deveria retornar a fila de músicas com sucesso", async () => {
        const urls = []
        for (let i = 0; i < 10; i++) {
            urls.push(`url${i}`)
        }
        playdl.video_basic_info.mockImplementation(url => {
            if (urls.includes(url)) return { video_details: { url, title: "titulo" } }
            return null
        })
        const message = mockMessage("queue")
        const musicQueue = mockQueueObject(MUSIC_QUEUE_NAME)
        musicQueue.songs = musicQueue.songs.concat(urls)

        await run(mockBot(), message)

        expect(message.channel.threads.cache).toHaveLength(1)
        const thread = message.channel.threads.cache[0]
        expect(thread.delete).toBeCalledTimes(0)
        expect(thread.send).toBeCalledTimes(3)
        expect(musicQueue.songs).toEqual(urls.map(url => ({ video_details: { url, title: "titulo" } })))
        expect(playdl.video_basic_info).toBeCalledTimes(urls.length)
    })

    test("deveria retornar a fila de músicas com sucesso deletando o tópico anterior", async () => {
        const song1 = {
            video_details: { url: fakeYtUrl(), title: "titulo1" }
        }
        const song2 = mockBasicInfo(fakeYtUrl(), "titulo2")
        const song3 = {
            video_details: { url: fakeYtUrl(), title: "titulo3" }
        }
        const urls = [song1, song2.video_details.url, song3]
        const message = mockMessage("queue")
        message.channel.threads.create({
            name: "músicas_na_fila"
        })
        const musicQueue = mockQueueObject(MUSIC_QUEUE_NAME)
        musicQueue.songs = musicQueue.songs.concat(urls)

        await run(mockBot(), message)

        expect(message.channel.threads.cache).toHaveLength(1)
        const thread = message.channel.threads.cache[0]
        expect(thread.send).toBeCalledTimes(2)
        expect(musicQueue.songs).toEqual([song1, song2, song3])
    })
})