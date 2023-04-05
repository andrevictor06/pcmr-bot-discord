const { clearSharedVariables, getSharedVariable } = require("../../utils/shared_variables")
const { mockMessage, mockBot } = require("../utils_test")
const { randomUUID } = require('crypto');
const { run, authenticate } = require('../../functions/spotify_playlist')
const querystring = require('querystring');
const { SPOTIFY_LOGIN_STATE, SPOTIFY_BASE_URL, SPOTIFY_TOKEN, SPOTIFY_REFRESH_TOKEN, SPOTIFY_TOKEN_EXPIRATION, SPOTIFY_PLAYLIST_TRACKS, SPOTIFY_AUTH_URL } = require("../../utils/constants");
const { default: axios } = require('axios')
const utils = require('../../utils/Utils')

afterEach(() => {
    clearSharedVariables()
    jest.resetAllMocks()
})

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

        await authenticate(authorizationCode)

        expect(localStorage.getItem(SPOTIFY_TOKEN)).toBe(responseData.access_token)
        expect(localStorage.getItem(SPOTIFY_REFRESH_TOKEN)).toBe(responseData.refresh_token)
        expect(localStorage.getItem(SPOTIFY_TOKEN_EXPIRATION)).toBeGreaterThan(utils.nowInSeconds())
    })
})