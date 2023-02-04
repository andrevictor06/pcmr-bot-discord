const { expect, test } = require("@jest/globals")
const { run } = require("../../functions/music_play")
const Utils = require("../../utils/Utils")
const { setSharedVariable, AUDIO_QUEUE_NAME, sharedVariableExists, MUSIC_QUEUE_NAME, clearSharedVariables, getSharedVariable } = require("../../utils/shared_variables")
const { joinVoiceChannel, createAudioPlayer, AudioPlayerStatus } = require("@discordjs/voice")
const playdl = require('play-dl')

jest.mock('@discordjs/voice')
jest.mock('play-dl')
jest.useFakeTimers()

beforeEach(() => {
    clearSharedVariables()
})

describe("play", () => {
    test("não deveria iniciar a música quando o usuário não estiver em um canal de voz", () => {
        const send = jest.fn()
        const message = {
            content: Utils.command("play"),
            channel: { send },
            member: {
                voice: {}
            }
        }

        run(null, message)

        expect(send).toBeCalledTimes(1)
        expect(send).toHaveBeenCalledWith("Cadê o canal de voz?")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })

    test("não deveria iniciar a música quando bot não tiver as permissões", () => {
        const send = jest.fn()
        const has = jest.fn(str => false)
        const permissionsFor = jest.fn(() => {
            return { has }
        })
        const message = {
            content: Utils.command("play"),
            client: {
                user: {}
            },
            channel: { send },
            member: {
                voice: {
                    channel: { permissionsFor }
                }
            }
        }

        run(null, message)

        expect(send).toBeCalledTimes(1)
        expect(send).toHaveBeenCalledWith("Tô sem permissão, fala com o corno do adm!")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })

    test("não deveria iniciar a música quando o usuário não informar a música", () => {
        const send = jest.fn()
        const has = jest.fn(str => true)
        const permissionsFor = jest.fn(() => {
            return { has }
        })
        const message = {
            content: Utils.command("play"),
            client: {
                user: {}
            },
            channel: { send },
            member: {
                voice: {
                    channel: { permissionsFor }
                }
            }
        }

        run(null, message)

        expect(send).toBeCalledTimes(1)
        expect(send).toHaveBeenCalledWith("Cadê a música man?")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })

    test("não deveria tocar uma música quando tiver um áudio tocando", () => {
        const send = jest.fn()
        const has = jest.fn(str => true)
        const permissionsFor = jest.fn(() => {
            return { has }
        })
        const message = {
            content: Utils.command("play") + " musica",
            client: {
                user: {}
            },
            channel: { send },
            member: {
                voice: {
                    channel: { permissionsFor }
                }
            }
        }
        setSharedVariable(AUDIO_QUEUE_NAME, {})

        run(null, message)

        expect(send).toBeCalledTimes(1)
        expect(send).toHaveBeenCalledWith("Tem um áudio tocando man, calma ae")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })

    test("deveria tocar uma música com link de parâmetro", async () => {
        const url = "https://www.youtube.com/watch?v=kijpcUv-b8M"
        const send = jest.fn()
        const has = jest.fn(str => true)
        const permissionsFor = jest.fn(() => {
            return { has }
        })
        const subscribe = jest.fn()
        const on = jest.fn(() => createAudioPlayer)
        const play = jest.fn()
        const message = {
            content: Utils.command("play") + " " + url,
            client: {
                user: {}
            },
            channel: { send },
            member: {
                voice: {
                    channel: {
                        permissionsFor,
                        guild: {
                            id: "id",
                            voiceAdapterCreator: {}
                        },
                        members: [1]
                    }
                }
            }
        }
        joinVoiceChannel.mockImplementation(() => {
            return { subscribe }
        })
        createAudioPlayer.mockImplementation(() => {
            return {
                on,
                state: AudioPlayerStatus.Idle,
                play
            }
        })
        playdl.stream.mockImplementation(async () => {
            return { stream: {} }
        })
        playdl.video_basic_info.mockImplementation(async () => {
            return {
                video_details: {
                    url,
                    title: 'titulo'
                }
            }
        })

        await run(null, message)

        expect(play).toBeCalledTimes(1)
        expect(send).toBeCalledTimes(1)
        expect(on).toBeCalledTimes(2)
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("deveria tocar uma música com texto", async () => {
        const url = "https://www.youtube.com/watch?v=kijpcUv-b8M"
        const send = jest.fn()
        const has = jest.fn(str => true)
        const permissionsFor = jest.fn(() => {
            return { has }
        })
        const subscribe = jest.fn()
        const on = jest.fn(() => createAudioPlayer)
        const play = jest.fn()
        const message = {
            content: Utils.command("play") + " queen",
            client: {
                user: {}
            },
            channel: { send },
            member: {
                voice: {
                    channel: {
                        permissionsFor,
                        guild: {
                            id: "id",
                            voiceAdapterCreator: {}
                        },
                        members: [1]
                    }
                }
            }
        }
        joinVoiceChannel.mockImplementation(() => {
            return { subscribe }
        })
        createAudioPlayer.mockImplementation(() => {
            return {
                on,
                state: AudioPlayerStatus.Idle,
                play
            }
        })
        playdl.stream.mockImplementation(async () => {
            return { stream: {} }
        })
        playdl.video_basic_info.mockImplementation(async () => {
            return {
                video_details: {
                    url,
                    title: 'titulo'
                }
            }
        })
        playdl.search.mockImplementation(async () => {
            return [{ url }]
        })

        await run(null, message)

        expect(play).toBeCalledTimes(1)
        expect(send).toBeCalledTimes(1)
        expect(on).toBeCalledTimes(2)
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeTruthy()
    })

    test("deveria tocar uma música com link de playlist", async () => {
        const url = "https://www.youtube.com/watch?v=u9Dg-g7t2l4&list=PLX8S4ptxX3CHezw1JDnwAH7CZLFGpj0z-"
        const videos = [{ url }, { url }, { url }]
        const send = jest.fn()
        const has = jest.fn(str => true)
        const permissionsFor = jest.fn(() => {
            return { has }
        })
        const subscribe = jest.fn()
        const on = jest.fn(() => createAudioPlayer)
        const play = jest.fn()
        const message = {
            content: Utils.command("play") + " " + url,
            client: {
                user: {}
            },
            channel: { send },
            member: {
                voice: {
                    channel: {
                        permissionsFor,
                        guild: {
                            id: "id",
                            voiceAdapterCreator: {}
                        },
                        members: [1]
                    }
                }
            }
        }
        joinVoiceChannel.mockImplementation(() => {
            return { subscribe }
        })
        createAudioPlayer.mockImplementation(() => {
            return {
                on,
                state: AudioPlayerStatus.Idle,
                play
            }
        })
        playdl.stream.mockImplementation(async () => {
            return { stream: {} }
        })
        playdl.video_basic_info.mockImplementation(async () => {
            return {
                video_details: {
                    url,
                    title: 'titulo'
                }
            }
        })
        playdl.playlist_info.mockImplementation(() => {
            return {
                all_videos: async () => {
                    return videos
                }
            }
        })

        await run(null, message)

        expect(play).toBeCalledTimes(1)
        expect(send).toBeCalledTimes(2)
        expect(on).toBeCalledTimes(2)
        expect(getSharedVariable(MUSIC_QUEUE_NAME).songs.length).toEqual(videos.length - 1)
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
        const send = jest.fn()
        const removeAllListeners = jest.fn()
        const destroy = jest.fn()
        const stop = jest.fn()
        const message = {
            content: Utils.command("stop"),
            channel: { send }
        }
        const serverQueue = {
            player: { removeAllListeners, stop },
            connection: { destroy }
        }
        setSharedVariable(MUSIC_QUEUE_NAME, serverQueue)

        await run(null, message)

        expect(send).toBeCalledTimes(1)
        expect(removeAllListeners).toBeCalledTimes(1)
        expect(destroy).toBeCalledTimes(1)
        expect(stop).toBeCalledTimes(1)
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })
})

describe("skip", () => {
    test("não deveria executar se o comando play não estiver rodando", () => {
        const send = jest.fn()
        const message = {
            content: Utils.command("skip"),
            channel: { send }
        }

        run(null, message)

        expect(send).toBeCalledTimes(1)
        expect(send).toHaveBeenCalledWith("Nem tô na sala man")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })
})

describe("next", () => {
    test("não deveria executar se o comando play não estiver rodando", () => {
        const send = jest.fn()
        const message = {
            content: Utils.command("next"),
            channel: { send }
        }

        run(null, message)

        expect(send).toBeCalledTimes(1)
        expect(send).toHaveBeenCalledWith("Nem tô na sala man")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })
})

describe("current", () => {
    test("não deveria executar se o comando play não estiver rodando", () => {
        const send = jest.fn()
        const message = {
            content: Utils.command("current"),
            channel: { send }
        }

        run(null, message)

        expect(send).toBeCalledTimes(1)
        expect(send).toHaveBeenCalledWith("Nem tô na sala man")
        expect(sharedVariableExists(MUSIC_QUEUE_NAME)).toBeFalsy()
    })
})