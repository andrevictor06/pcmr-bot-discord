const { joinVoiceChannel, createAudioPlayer, AudioPlayerStatus } = require("@discordjs/voice")
const { setSharedVariable, MUSIC_QUEUE_NAME } = require("../utils/shared_variables")
const Utils = require("../utils/Utils")
const playdl = require('play-dl')

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
        },
        reply: jest.fn()
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

function mockQueueObject(queueName) {
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
    setSharedVariable(queueName, serverQueue)
    return serverQueue
}

function mockBot() {
    const listeners = new Map()
    const on = jest.fn((eventName, fn) => {
        if (!listeners.has(eventName)) {
            listeners.set(eventName, [])
        }
        const functions = listeners.get(eventName)
        functions.push(fn)

    })
    return {
        on: jest.fn((eventName, fn) => {
            if (!listeners.has(eventName)) {
                listeners.set(eventName, [])
            }
            const functions = listeners.get(eventName)
            functions.push(fn)

        }),
        listeners: jest.fn(eventName => {
            if (!listeners.has(eventName)) return []
            return listeners.get(eventName)
        }),
        user: {
            setActivity: jest.fn()
        },
        addInteractionCreate: on
    }
}

function mockEventInteraction(customId) {
    return {
        customId,
        update: jest.fn()
    }
}

function mockPlaydlStream() {
    playdl.stream.mockImplementation(async () => ({ stream: {} }))
}

module.exports = {
    mockAudioPlayer,
    mockBasicInfo,
    mockMessage,
    mockPlaylistInfo,
    mockVoiceConnection,
    mockQueueObject,
    mockBot,
    mockEventInteraction,
    mockPlaydlStream
}