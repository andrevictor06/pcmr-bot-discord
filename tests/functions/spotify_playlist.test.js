const { clearSharedVariables, getSharedVariable } = require("../../utils/shared_variables")
const { mockMessage, mockBot } = require("../utils_test")
const { randomUUID } = require('crypto');
const { run } = require('../../functions/spotify_playlist')
const querystring = require('querystring');
const { SPOTIFY_LOGIN_STATE } = require("../../utils/constants");

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
        const state = getSharedVariable(SPOTIFY_LOGIN_STATE)
        const qs = querystring.stringify({
            response_type: 'code',
            client_id: process.env.SPOTIFY_CLIENT_ID,
            scope,
            redirect_uri: process.env.SPOTIFY_CALLBACK_URL,
            state
        })
        expect(directSend).toBeCalledWith(`https://accounts.spotify.com/authorize?${qs}`)
    })
})