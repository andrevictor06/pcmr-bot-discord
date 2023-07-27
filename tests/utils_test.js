const { joinVoiceChannel, createAudioPlayer, AudioPlayerStatus } = require("@discordjs/voice")
const { setSharedVariable } = require("../utils/shared_variables")
const Utils = require("../utils/Utils")
const playdl = require('play-dl')
const fs = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')

function mockMessage(command, ...params) {
    const has = jest.fn(() => true)
    const cache = []
    const content = params && params.length > 0 ? params.join(" ") : ""
    return {
        content: command ? Utils.command(command) + " " + content : content,
        client: {
            user: {}
        },
        channel: {
            send: jest.fn(),
            threads: {
                create: jest.fn(thread => {
                    thread.send = jest.fn()
                    cache.push(thread)
                    const index = cache.length - 1
                    thread.delete = jest.fn(() => {
                        cache.splice(index, 1)
                    })
                }),
                cache
            },
            messages: {
                fetch: jest.fn()
            }
        },
        member: {
            voice: {
                channel: {
                    id: randomUUID(),
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
        reply: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
    }
}

function mockVoiceConnection(autoMock = true) {
    const connection = {
        subscribe: jest.fn(),
        destroy: jest.fn(),
        on: jest.fn()
    }
    if (autoMock) joinVoiceChannel.mockImplementation(() => connection)
    return connection
}

function mockAudioPlayer(state = AudioPlayerStatus.Idle, autoMock = true) {
    const listeners = new Map()
    const on = jest.fn((eventName, fn) => {
        if (!listeners.has(eventName)) {
            listeners.set(eventName, [])
        }
        const functions = listeners.get(eventName)
        functions.push(fn)

    })
    const off = jest.fn((eventName, fn) => {
        listeners.delete(eventName)
    })
    const player = {
        on,
        off,
        state,
        play: jest.fn(),
        listeners,
        removeAllListeners: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        unpause: jest.fn()
    }
    if (autoMock) createAudioPlayer.mockImplementation(() => player)
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

function mockQueueObject(queueName, voiceChannelId = randomUUID()) {
    const serverQueue = {
        player: mockAudioPlayer(AudioPlayerStatus.Idle, false),
        connection: mockVoiceConnection(false),
        songs: [],
        currentSong: null,
        textChannel: {
            send: jest.fn()
        },
        voiceChannel: {
            id: voiceChannelId
        }
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
        on,
        listeners: jest.fn(eventName => {
            if (!listeners.has(eventName)) return []
            return listeners.get(eventName)
        }),
        user: {
            setActivity: jest.fn()
        },
        addInteractionCreate: on,
        users: {
            cache: new Map()
        }
    }
}

function mockEventInteraction(customId, bot = null) {
    const message = mockMessage('')
    message.customId = customId
    message.client = bot
    return message
}

function mockPlaydlStream() {
    playdl.stream.mockImplementation(async () => ({ stream: {} }))
}

function fakeYtUrl(withPlaylistParam = false) {
    const fakeIdVideo = randomStr(11)
    let url = `https://www.youtube.com/watch?v=${fakeIdVideo}`
    if (withPlaylistParam) {
        url += `&list=${randomStr(20)}`
    }
    return url
}

function randomStr(size) {
    const letters = 'abcdefghijklmnopqrstuvxwyz'
    let randomStr = ''
    while (randomStr.length < size) {
        const randomIndex = Math.floor((Math.random() * letters.length))
        let letter = letters[randomIndex]
        if (Math.floor(Math.random() * 5) == 1) {
            letter = letter.toUpperCase()
        }
        randomStr += letter
    }
    return randomStr
}

function clearFolder(p) {
    if (fs.statSync(p).isDirectory()) {
        fs.readdirSync(p).forEach(file => clearFolder(path.resolve(p, file)))
        fs.rmdirSync(p)
    } else {
        fs.rmSync(p)
    }
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
    mockPlaydlStream,
    fakeYtUrl,
    clearFolder
}