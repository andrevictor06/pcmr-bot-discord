const { run } = require("../../functions/music_play")
const { setSharedVariable, AUDIO_QUEUE_NAME, sharedVariableExists, MUSIC_QUEUE_NAME, clearSharedVariables, getSharedVariable } = require("../../utils/shared_variables")
const { joinVoiceChannel, createAudioPlayer, AudioPlayerStatus } = require("@discordjs/voice")
const Utils = require("../../utils/Utils")
const playdl = require('play-dl')

jest.mock('@discordjs/voice')
jest.mock('play-dl')
jest.useFakeTimers()

afterEach(() => {
    clearSharedVariables()
    jest.resetAllMocks()
})

function mockMessage(command, ...params) {
    const has = jest.fn(() => true)
    return {
        content: Utils.command(command) + (params && params.length > 0 ? " " + params.join(" ") : ""),
        client: {
            user: {}
        },
        channel: {
            send: jest.fn()
        },
        member: {
            voice: {
                channel: {
                    permissionsFor: jest.fn(() => {
                        return { has }
                    }),
                    guild: {
                        id: "id",
                        voiceAdapterCreator: {}
                    },
                    members: [{}]
                }
            }
        }
    }
}

function mockVoiceConnection() {
    const connection = { subscribe: jest.fn() }
    joinVoiceChannel.mockImplementation(() => connection)
    return connection
}

function mockAudioPlayer(state = AudioPlayerStatus.Idle) {
    const player = {
        on: jest.fn(),
        state,
        play: jest.fn()
    }
    createAudioPlayer.mockImplementation(() => player)
    return player
}

function mockBasicInfo(url, title) {
    const basicInfo = {
        video_details: { url, title }
    }
    playdl.video_basic_info.mockImplementation(async (urlParam) => {
        if (urlParam != url) throw new Error()
        return basicInfo
    })
    return basicInfo
}

function mockPlaylistInfo(url, videos) {
    const playlistInfo = {
        all_videos: async () => {
            return videos
        }
    }
    playdl.playlist_info.mockImplementation(async (urlParam) => {
        if (urlParam != url) throw new Error()
        return playlistInfo
    })
    return playlistInfo
}

function mockMusicQueue() {
    const serverQueue = {
        player: {
            removeAllListeners: jest.fn(),
            play: jest.fn(),
            stop: jest.fn(),
            state: {
                status: AudioPlayerStatus.Idle
            }
        },
        connection: {
            destroy: jest.fn()
        },
        songs: [],
        currentSong: null
    }
    setSharedVariable(MUSIC_QUEUE_NAME, serverQueue)
    return serverQueue
}

describe("play", () => {
    test("não deveria iniciar a música quando o usuário não estiver em um canal de voz", async () => {
        const message = mockMessage("play")
        delete message.member.voice.channel

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Cadê o canal de voz?")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })

    test("não deveria iniciar a música quando bot não tiver as permissões", async () => {
        const message = mockMessage("play")
        message.member.voice.channel.permissionsFor().has.mockImplementation(() => false)

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Tô sem permissão, fala com o corno do adm!")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })

    test("não deveria iniciar a música quando o usuário não informar a música", async () => {
        const message = mockMessage("play")

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Cadê a música man?")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })

    test("não deveria tocar uma música quando tiver um áudio tocando", async () => {
        const message = mockMessage("play", "musica")
        setSharedVariable(AUDIO_QUEUE_NAME, {})

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Tem um áudio tocando man, calma ae")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })

    test("deveria tocar uma música com link de parâmetro", async () => {
        const url = "https://www.youtube.com/watch?v=kijpcUv-b8M"
        const player = mockAudioPlayer()
        const message = mockMessage("play", url)
        mockVoiceConnection()
        mockBasicInfo(url, "titulo")
        playdl.stream.mockImplementation(async () => ({ stream: {} }))

        await run(null, message)

        expect(player.play).toBeCalledTimes(1)
        expect(message.channel.send).toBeCalledTimes(1)
        expect(player.on).toBeCalledTimes(2)
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("deveria adicionar música na fila quando tiver uma música tocando", async () => {
        const url = "https://www.youtube.com/watch?v=kijpcUv-b8M"
        const message = mockMessage("play", url)
        const musicQueue = mockMusicQueue()
        mockBasicInfo(url, "titulo")
        musicQueue.player.state.status = AudioPlayerStatus.Playing
        playdl.stream.mockImplementation(async () => ({ stream: {} }))

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(musicQueue.player.play).toBeCalledTimes(0)
        expect(musicQueue.songs.length).toEqual(1)
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("deveria tocar uma música com texto", async () => {
        const url = "https://www.youtube.com/watch?v=kijpcUv-b8M"
        const player = mockAudioPlayer()
        const message = mockMessage("play", "queen")
        mockVoiceConnection()
        mockBasicInfo(url, "queen")
        playdl.stream.mockImplementation(async () => ({ stream: {} }))
        playdl.search.mockImplementation(async () => ([{ url }, { url: "random text" }]))

        await run(null, message)

        expect(player.play).toBeCalledTimes(1)
        expect(playdl.stream).toBeCalledWith(url, { quality: 1 })
        expect(message.channel.send).toBeCalledTimes(1)
        expect(player.on).toBeCalledTimes(2)
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

        await run(null, message)

        expect(player.play).toBeCalledTimes(1)
        expect(message.channel.send).toBeCalledTimes(2)
        expect(player.on).toBeCalledTimes(2)
        expect(getSharedVariable(MUSIC_QUEUE_NAME).songs.length).toEqual(videos.length - 1)
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("deveria adicionar todas as músicas de uma playlist quando tiver uma música tocando", async () => {
        const url = "https://www.youtube.com/watch?v=u9Dg-g7t2l4&list=PLX8S4ptxX3CHezw1JDnwAH7CZLFGpj0z-"
        const videos = [{ url }, { url }, { url }]
        const message = mockMessage("play", url)
        const musicQueue = mockMusicQueue()
        musicQueue.player.state.status = AudioPlayerStatus.Playing
        mockPlaylistInfo(url, videos)
        playdl.stream.mockImplementation(async () => ({ stream: {} }))

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(musicQueue.player.play).toBeCalledTimes(0)
        expect(getSharedVariable(MUSIC_QUEUE_NAME).songs.length).toEqual(videos.length)
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })
})

describe("stop", () => {
    test("não deveria executar se o comando play não estiver rodando", async () => {
        const send = jest.fn()
        const message = {
            content: Utils.command("stop"),
            channel: { send }
        }

        await run(null, message)

        expect(send).toBeCalledTimes(1)
        expect(send).toHaveBeenCalledWith("Nem tô na sala man")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })

    test("deveria parar com sucesso", async () => {
        const message = mockMessage("stop")
        const musicQueue = mockMusicQueue()

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(musicQueue.player.removeAllListeners).toBeCalledTimes(1)
        expect(musicQueue.connection.destroy).toBeCalledTimes(1)
        expect(musicQueue.player.stop).toBeCalledTimes(1)
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })

    test("não deveria desconectar quando tiver um áudio rodando", async () => {
        const message = mockMessage("stop")
        const musicQueue = mockMusicQueue()
        setSharedVariable(AUDIO_QUEUE_NAME, {})

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(musicQueue.player.removeAllListeners).toBeCalledTimes(1)
        expect(musicQueue.connection.destroy).toBeCalledTimes(0)
        expect(musicQueue.player.stop).toBeCalledTimes(1)
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })

    test("não deveria parar de funcionar quando ocorrer algum erro", async () => {
        const message = mockMessage("stop")
        const musicQueue = mockMusicQueue()
        musicQueue.player.removeAllListeners.mockImplementation(() => { throw new Error() })
        setSharedVariable(AUDIO_QUEUE_NAME, {})

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Unexpected error: Error")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })
})

describe("skip", () => {
    test("não deveria executar se o comando play não estiver rodando", async () => {
        const message = mockMessage("skip")

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Nem tô na sala man")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })

    test("não deveria executar não existir mais músicas na fila", async () => {
        const message = mockMessage("skip")
        mockMusicQueue()

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Fila tá vazia man")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("não deveria executar quando um áudio estiver tocando", async () => {
        const message = mockMessage("skip")
        mockMusicQueue()
        setSharedVariable(AUDIO_QUEUE_NAME, {})

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Tem um áudio tocando man, calma ae")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("não deveria parar de funcionar quando ocorrer algum erro", async () => {
        const message = mockMessage("skip")
        const musicQueue = mockMusicQueue()
        musicQueue.songs.push("url")
        musicQueue.player.stop.mockImplementation(() => { throw new Error() })

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Unexpected error: Error")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("deveria parar o player quando existirem músicas na fila", async () => {
        const message = mockMessage("skip")
        const musicQueue = mockMusicQueue()
        musicQueue.songs.push("url")

        await run(null, message)

        expect(musicQueue.player.stop).toBeCalledTimes(1)
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })
})

describe("next", () => {
    test("não deveria executar se o comando play não estiver rodando", async () => {
        const message = mockMessage("next")

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Nem tô na sala man")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })

    test("não deveria dar erro quando a fila estiver vazia", async () => {
        const message = mockMessage("next")
        mockMusicQueue()

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Fila tá vazia man")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("deveria retornar o link da próxima música com sucesso", async () => {
        const urls = ["url1", "url2"]
        const message = mockMessage("next")
        const musicQueue = mockMusicQueue()
        musicQueue.songs = musicQueue.songs.concat(urls)
        playdl.video_basic_info.mockImplementation(async url => {
            if (!urls.includes(url)) return null
            return {
                video_details: { url }
            }
        })

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith(`Próxima música: ${urls[0]}`)
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("não deveria parar de funcionar ocorrer algum erro", async () => {
        const urls = ["url1", "url2"]
        const message = mockMessage("next")
        const musicQueue = mockMusicQueue()
        musicQueue.songs = musicQueue.songs.concat(urls)
        playdl.video_basic_info.mockImplementation(async _ => {
            throw new Error()
        })

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Unexpected error: Error")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })
})

describe("current", () => {
    test("não deveria executar se o comando play não estiver rodando", async () => {
        const message = mockMessage("current")

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Nem tô na sala man")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })

    test("não deveria dar erro quando a fila estiver vazia", async () => {
        const message = mockMessage("current")
        mockMusicQueue()

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Tem nada tocando man")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("deveria retornar o link música que está tocando com sucesso", async () => {
        const urls = ["url1", "url2", "url3"]
        const message = mockMessage("current")
        const musicQueue = mockMusicQueue()
        const currentSong = urls.shift()
        musicQueue.currentSong = {
            video_details: {
                url: currentSong
            }
        }
        musicQueue.songs = musicQueue.songs.concat(urls)

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith(`Tá tocando isso aqui: ${currentSong}`)
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("não deveria parar de funcionar quando ocorrer algum erro", async () => {
        const message = mockMessage("current")
        const musicQueue = mockMusicQueue()
        musicQueue.currentSong = {}

        await run(null, message)

        expect(message.channel.send).toBeCalledTimes(1)
        expect(message.channel.send).toHaveBeenCalledWith("Unexpected error: Cannot read properties of undefined (reading 'url')")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })
})