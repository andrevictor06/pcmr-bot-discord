const { clearSharedVariables, getSharedVariable, setSharedVariable, sharedVariableExists } = require("../../utils/shared_variables")
const { mockMessage, mockBot } = require("../utils_test")
const { randomUUID } = require('crypto');
const { run, authenticate, init } = require('../../functions/spotify_playlist')
const querystring = require('querystring');
const { SPOTIFY_LOGIN_STATE, SPOTIFY_BASE_URL, SPOTIFY_TOKEN, SPOTIFY_REFRESH_TOKEN, SPOTIFY_TOKEN_EXPIRATION, SPOTIFY_PLAYLIST_TRACKS, SPOTIFY_AUTH_URL, MUSIC_PLAY_SONG_EVENT, SPOTIFY_LISTENER_FINISHED_EVENT } = require("../../utils/constants");
const { default: axios } = require('axios')
const utils = require('../../utils/Utils')
const events = require('../../utils/events');
const { ExpectedError } = require("../../utils/expected_error");

afterEach(() => {
    clearSharedVariables()
    localStorage.clear()
    jest.resetAllMocks()
    events.reset()
})

function mockAddToPlaylist(token) {
    axios.post.mockImplementation((url, body, config) => {
        expect(url).toBe(`${SPOTIFY_BASE_URL}/playlists/${process.env.SPOTIFY_URSAL_PLAYLIST_ID}/tracks`)
        // expect(body).toMatchObject({
        //     uris: expect.arrayContaining([trackId])
        // })
        expect(config).toMatchObject({
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        return {
            data: {}
        }
    })
}

function mockSearchTrack(token, id, q, returnItems = true) {
    axios.get.mockImplementation((url, config) => {
        expect(url).toBe(`${SPOTIFY_BASE_URL}/search`)
        expect(config).toMatchObject({
            headers: {
                Authorization: `Bearer ${token}`
            },
            params: {
                q,
                type: 'track',
                limit: 1
            }
        })
        if (!returnItems) {
            return {
                data: {
                    tracks: {
                        items: []
                    }
                }
            }
        }
        return {
            data: {
                tracks: {
                    items: [
                        {
                            id
                        }
                    ]
                }
            }
        }
    })
}

describe('spotify_login', () => {
    test('deveria retornar o link de login corretamente', async () => {
        const authorId = randomUUID()
        const directSend = jest.fn()
        const message = mockMessage('spotify_login')
        message.author = {
            id: authorId
        }
        const bot = mockBot()
        bot.users.cache.set(authorId, { send: directSend })
        const scope = 'playlist-modify-private playlist-modify-public'

        await run(bot, message)

        expect(directSend).toBeCalledTimes(1)
        const qs = querystring.stringify({
            response_type: 'code',
            client_id: process.env.SPOTIFY_CLIENT_ID,
            scope,
            redirect_uri: process.env.SPOTIFY_CALLBACK_URL,
            state: getSharedVariable(SPOTIFY_LOGIN_STATE)
        })
        expect(directSend).toBeCalledWith(`https://accounts.spotify.com/authorize?${qs}`)
    })
})

describe('spotify_cache', () => {
    test('deveria realizar o cache das músicas corretamente', async () => {
        const message = mockMessage('spotify_cache')
        const bot = mockBot()
        const expectedUrl = `${SPOTIFY_BASE_URL}/playlists/${process.env.SPOTIFY_URSAL_PLAYLIST_ID}/tracks`
        const token = randomUUID()
        const refreshToken = randomUUID()
        localStorage.setItem(SPOTIFY_TOKEN, token)
        localStorage.setItem(SPOTIFY_REFRESH_TOKEN, refreshToken)
        localStorage.setItem(SPOTIFY_TOKEN_EXPIRATION, utils.nowInSeconds() + 3600)
        const tracks = []
        for (let i = 0; i < 200; i++) {
            tracks.push({
                track: {
                    id: randomUUID()
                }
            })
        }
        axios.get.mockImplementation((url, config) => {
            expect(url).toBe(expectedUrl)
            expect(config).toMatchObject({
                headers: {
                    Authorization: `Bearer ${token}`
                },
                params: {
                    fields: `items.track.id`
                }
            })
            return {
                data: {
                    items: tracks.slice(config.params.offset, config.params.offset + config.params.limit)
                }
            }
        })

        await run(bot, message)

        const tracksCache = JSON.parse(localStorage.getItem(SPOTIFY_PLAYLIST_TRACKS))
        expect(tracksCache).toBeTruthy()
        expect(tracksCache).toHaveLength(tracks.length)
        expect(tracksCache).toEqual(expect.arrayContaining(tracks.map(i => i.track.id)))
    })
})

describe('authenticate', () => {
    test('deveria autenticar com sucesso', async () => {
        const authorizationCode = randomUUID()
        const state = randomUUID()
        setSharedVariable(SPOTIFY_LOGIN_STATE, state)
        const responseData = {
            access_token: randomUUID(),
            refresh_token: randomUUID(),
            expires_in: 3600
        }
        axios.post.mockImplementation((url, body, config) => {
            expect(url).toBe(SPOTIFY_AUTH_URL)
            expect(body).toMatchObject({
                grant_type: 'authorization_code',
                redirect_uri: process.env.SPOTIFY_CALLBACK_URL,
                code: authorizationCode
            })
            expect(config).toMatchObject({
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')
                }
            })
            return {
                data: responseData
            }
        })

        await authenticate(authorizationCode, state)

        expect(localStorage.getItem(SPOTIFY_TOKEN)).toBe(responseData.access_token)
        expect(localStorage.getItem(SPOTIFY_REFRESH_TOKEN)).toBe(responseData.refresh_token)
        expect(localStorage.getItem(SPOTIFY_TOKEN_EXPIRATION)).toBeGreaterThan(utils.nowInSeconds())
        expect(sharedVariableExists(SPOTIFY_LOGIN_STATE)).toBeFalsy()
    })

    test('não deveria autenticar quando o código state for diferente', async () => {
        const authorizationCode = randomUUID()
        setSharedVariable(SPOTIFY_LOGIN_STATE, randomUUID())

        expect.hasAssertions()
        try {
            await authenticate(authorizationCode, randomUUID())
        } catch (error) {
            expect(error).toBeTruthy()
            expect(error).toBeInstanceOf(ExpectedError)
        }

    })

    test('não deveria autenticar quando o código state não existir', async () => {
        const authorizationCode = randomUUID()

        expect.hasAssertions()
        try {
            await authenticate(authorizationCode, randomUUID())
        } catch (error) {
            expect(error).toBeTruthy()
            expect(error).toBeInstanceOf(ExpectedError)
        }

    })
})

describe('play song event', () => {
    test('deveria adicionar uma música com sucesso na playlist buscando somente pelo titulo do video', done => {
        const song = {
            video_details: {
                title: 'Titulo'
            }
        }
        const token = randomUUID()
        const tokenExpiration = utils.nowInSeconds() + 3600
        const trackId = randomUUID()
        localStorage.setItem(SPOTIFY_TOKEN, token)
        localStorage.setItem(SPOTIFY_TOKEN_EXPIRATION, tokenExpiration)
        localStorage.setItem(SPOTIFY_PLAYLIST_TRACKS, JSON.stringify([]))
        mockSearchTrack(token, trackId, song.video_details.title)
        mockAddToPlaylist(token)

        init(mockBot())
        events.event(SPOTIFY_LISTENER_FINISHED_EVENT)
            .subscribe({
                next: () => {
                    try {
                        const actualCache = JSON.parse(localStorage.getItem(SPOTIFY_PLAYLIST_TRACKS))
                        expect(actualCache).toHaveLength(1)
                        expect(actualCache).toContain(trackId)
                        expect(axios.post).toBeCalledTimes(1)
                        done()
                    } catch (error) {
                        done(error)
                    }
                }
            })
        events.emit(MUSIC_PLAY_SONG_EVENT, song)
    })

    test('deveria adicionar uma música com sucesso na playlist buscando pela música e artista', done => {
        const songTitle = 'Música'
        const artist = 'Artista'
        const song = {
            video_details: {
                title: 'Titulo',
                music: [
                    {
                        song: songTitle,
                        artist
                    }
                ]
            }
        }
        const token = randomUUID()
        const tokenExpiration = utils.nowInSeconds() + 3600
        const trackId = randomUUID()
        localStorage.setItem(SPOTIFY_TOKEN, token)
        localStorage.setItem(SPOTIFY_TOKEN_EXPIRATION, tokenExpiration)
        localStorage.setItem(SPOTIFY_PLAYLIST_TRACKS, JSON.stringify([]))
        mockSearchTrack(token, trackId, `track:${songTitle} artist:${artist}`)
        mockAddToPlaylist(token)

        init(mockBot())
        events.event(SPOTIFY_LISTENER_FINISHED_EVENT)
            .subscribe({
                next: () => {
                    try {
                        const actualCache = JSON.parse(localStorage.getItem(SPOTIFY_PLAYLIST_TRACKS))
                        expect(actualCache).toHaveLength(1)
                        expect(actualCache).toContain(trackId)
                        expect(axios.post).toBeCalledTimes(1)
                        done()
                    } catch (error) {
                        done(error)
                    }
                }
            })

        events.emit(MUSIC_PLAY_SONG_EVENT, song)
    })

    test('não deveria adicionar uma música quando não encontrar no spotify', done => {
        const songTitle = 'Música'
        const artist = 'Artista'
        const song = {
            video_details: {
                title: 'Titulo',
                music: [
                    {
                        song: songTitle,
                        artist
                    }
                ]
            }
        }
        const token = randomUUID()
        const tokenExpiration = utils.nowInSeconds() + 3600
        const trackId = randomUUID()
        localStorage.setItem(SPOTIFY_TOKEN, token)
        localStorage.setItem(SPOTIFY_TOKEN_EXPIRATION, tokenExpiration)
        localStorage.setItem(SPOTIFY_PLAYLIST_TRACKS, JSON.stringify([]))
        mockSearchTrack(token, trackId, `track:${songTitle} artist:${artist}`, false)
        mockAddToPlaylist(token)

        init(mockBot())
        events.event(SPOTIFY_LISTENER_FINISHED_EVENT)
            .subscribe({
                next: () => {
                    try {
                        const actualCache = JSON.parse(localStorage.getItem(SPOTIFY_PLAYLIST_TRACKS))
                        expect(actualCache).toHaveLength(0)
                        expect(axios.post).toBeCalledTimes(0)
                        done()
                    } catch (error) {
                        done(error)
                    }
                }
            })

        events.emit(MUSIC_PLAY_SONG_EVENT, song)
    })

    test('não deveria adicionar uma música na playlist quando ela já existir', done => {
        const songTitle = 'Música'
        const artist = 'Artista'
        const song = {
            video_details: {
                title: 'Titulo',
                music: [
                    {
                        song: songTitle,
                        artist
                    }
                ]
            }
        }
        const token = randomUUID()
        const tokenExpiration = utils.nowInSeconds() + 3600
        const trackId = randomUUID()
        localStorage.setItem(SPOTIFY_TOKEN, token)
        localStorage.setItem(SPOTIFY_TOKEN_EXPIRATION, tokenExpiration)
        localStorage.setItem(SPOTIFY_PLAYLIST_TRACKS, JSON.stringify([trackId]))
        mockSearchTrack(token, trackId, `track:${songTitle} artist:${artist}`)
        mockAddToPlaylist(token)

        init(mockBot())
        events.event(SPOTIFY_LISTENER_FINISHED_EVENT)
            .subscribe({
                next: () => {
                    try {
                        const actualCache = JSON.parse(localStorage.getItem(SPOTIFY_PLAYLIST_TRACKS))
                        expect(actualCache).toHaveLength(1)
                        expect(actualCache).toContain(trackId)
                        expect(axios.post).toBeCalledTimes(0)
                        done()
                    } catch (error) {
                        done(error)
                    }
                }
            })

        events.emit(MUSIC_PLAY_SONG_EVENT, song)
    })

    test('não deveria adicionar uma música na playlist quando não existir cache', done => {
        jest.spyOn(utils, 'logError')
        const songTitle = 'Música'
        const artist = 'Artista'
        const song = {
            video_details: {
                title: 'Titulo',
                music: [
                    {
                        song: songTitle,
                        artist
                    }
                ]
            }
        }

        init(mockBot())
        events.event(SPOTIFY_LISTENER_FINISHED_EVENT)
            .subscribe({
                next: () => {
                    try {
                        const actualCache = localStorage.getItem(SPOTIFY_PLAYLIST_TRACKS)
                        expect(actualCache).toBeFalsy()
                        expect(utils.logError).toBeCalledTimes(1)
                        done()
                    } catch (error) {
                        done(error)
                    }
                }
            })

        events.emit(MUSIC_PLAY_SONG_EVENT, song)
    })

    test('não deveria adicionar uma música na playlist quando a pesquisa for vazia', done => {
        jest.spyOn(utils, 'logError')
        const song = {
            video_details: {}
        }

        init(mockBot())
        events.event(SPOTIFY_LISTENER_FINISHED_EVENT)
            .subscribe({
                next: () => {
                    try {
                        const actualCache = localStorage.getItem(SPOTIFY_PLAYLIST_TRACKS)
                        expect(actualCache).toBeFalsy()
                        expect(utils.logError).toBeCalledTimes(0)
                        done()
                    } catch (error) {
                        done(error)
                    }
                }
            })

        events.emit(MUSIC_PLAY_SONG_EVENT, song)
    })

    test('deveria dar refresh no token quando o mesmo estiver expirado', done => {
        const song = {
            video_details: {
                title: 'Titulo'
            }
        }
        const tokenExpiration = utils.nowInSeconds() - 3600
        const refreshToken = randomUUID()
        const responseData = {
            access_token: randomUUID(),
            expires_in: 3600
        }
        const trackId = randomUUID()
        localStorage.setItem(SPOTIFY_REFRESH_TOKEN, refreshToken)
        localStorage.setItem(SPOTIFY_TOKEN_EXPIRATION, tokenExpiration)
        localStorage.setItem(SPOTIFY_PLAYLIST_TRACKS, JSON.stringify([]))
        mockSearchTrack(responseData.access_token, trackId, song.video_details.title)
        axios.post.mockImplementation((url, body, config) => {
            if (url === SPOTIFY_AUTH_URL) {
                expect(body).toMatchObject({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                })
                expect(config).toMatchObject({
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Authorization: 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')
                    }
                })
                return {
                    data: responseData
                }
            } else {
                expect(config).toMatchObject({
                    headers: {
                        Authorization: `Bearer ${responseData.access_token}`
                    }
                })
                return {
                    data: {}
                }
            }
        })

        init(mockBot())
        events.event(SPOTIFY_LISTENER_FINISHED_EVENT)
            .subscribe({
                next: () => {
                    try {
                        const actualCache = JSON.parse(localStorage.getItem(SPOTIFY_PLAYLIST_TRACKS))
                        expect(actualCache).toHaveLength(1)
                        expect(actualCache).toContain(trackId)
                        expect(axios.post).toBeCalledTimes(2)
                        expect(localStorage.getItem(SPOTIFY_TOKEN)).toBe(responseData.access_token)
                        expect(localStorage.getItem(SPOTIFY_TOKEN_EXPIRATION)).toBeGreaterThan(utils.nowInSeconds())
                        expect(localStorage.getItem(SPOTIFY_REFRESH_TOKEN)).toBe(refreshToken)
                        done()
                    } catch (error) {
                        done(error)
                    }
                }
            })

        events.emit(MUSIC_PLAY_SONG_EVENT, song)
    })

    test('deveria atualizar o refresh token quando vir no response', done => {
        const song = {
            video_details: {
                title: 'Titulo'
            }
        }
        const tokenExpiration = utils.nowInSeconds() - 3600
        const refreshToken = randomUUID()
        const responseData = {
            access_token: randomUUID(),
            refresh_token: randomUUID(),
            expires_in: 3600
        }
        const trackId = randomUUID()
        localStorage.setItem(SPOTIFY_REFRESH_TOKEN, refreshToken)
        localStorage.setItem(SPOTIFY_TOKEN_EXPIRATION, tokenExpiration)
        localStorage.setItem(SPOTIFY_PLAYLIST_TRACKS, JSON.stringify([]))
        mockSearchTrack(responseData.access_token, trackId, song.video_details.title)
        axios.post.mockImplementation((url, body, config) => {
            if (url === SPOTIFY_AUTH_URL) {
                expect(body).toMatchObject({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                })
                expect(config).toMatchObject({
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Authorization: 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')
                    }
                })
                return {
                    data: responseData
                }
            } else {
                expect(config).toMatchObject({
                    headers: {
                        Authorization: `Bearer ${responseData.access_token}`
                    }
                })
                return {
                    data: {}
                }
            }
        })

        init(mockBot())
        events.event(SPOTIFY_LISTENER_FINISHED_EVENT)
            .subscribe({
                next: () => {
                    try {
                        const actualCache = JSON.parse(localStorage.getItem(SPOTIFY_PLAYLIST_TRACKS))
                        expect(actualCache).toHaveLength(1)
                        expect(actualCache).toContain(trackId)
                        expect(axios.post).toBeCalledTimes(2)
                        expect(localStorage.getItem(SPOTIFY_TOKEN)).toBe(responseData.access_token)
                        expect(localStorage.getItem(SPOTIFY_TOKEN_EXPIRATION)).toBeGreaterThan(utils.nowInSeconds())
                        expect(localStorage.getItem(SPOTIFY_REFRESH_TOKEN)).toBe(responseData.refresh_token)
                        done()
                    } catch (error) {
                        done(error)
                    }
                }
            })

        events.emit(MUSIC_PLAY_SONG_EVENT, song)
    })

    test('deveria dar erro quando não existir token expiration no localstorage', done => {
        jest.spyOn(utils, 'logError')
        const song = {
            video_details: {
                title: 'Titulo'
            }
        }
        const refreshToken = randomUUID()
        localStorage.setItem(SPOTIFY_REFRESH_TOKEN, refreshToken)
        localStorage.setItem(SPOTIFY_PLAYLIST_TRACKS, JSON.stringify([]))

        init(mockBot())
        events.event(SPOTIFY_LISTENER_FINISHED_EVENT)
            .subscribe({
                next: () => {
                    try {
                        const actualCache = JSON.parse(localStorage.getItem(SPOTIFY_PLAYLIST_TRACKS))
                        expect(actualCache).toHaveLength(0)
                        expect(axios.post).toBeCalledTimes(0)
                        expect(localStorage.getItem(SPOTIFY_TOKEN_EXPIRATION)).toBeFalsy()
                        expect(utils.logError).toBeCalledTimes(1)
                        done()
                    } catch (error) {
                        done(error)
                    }
                }
            })

        events.emit(MUSIC_PLAY_SONG_EVENT, song)
    })
})