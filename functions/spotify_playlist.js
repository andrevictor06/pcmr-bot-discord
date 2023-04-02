const { MUSIC_PLAY_SONG_EVENT, SPOTIFY_LOGIN_STATE, SPOTIFY_LOGIN_CODE, SPOTIFY_TOKEN, SPOTIFY_TOKEN_EXPIRATION, SPOTIFY_REFRESH_TOKEN } = require('../utils/constants')
const events = require('../utils/events');
const { setSharedVariable } = require('../utils/shared_variables');
const utils = require('../utils/Utils')
const { default: axios } = require('axios')
const { randomUUID } = require('crypto');
const querystring = require('querystring')
const localStorage = require('../utils/localstorage')

const spotifyEndpoint = 'https://api.spotify.com/v1'

async function getAuthToken() {
    const refreshToken = localStorage.getItem(SPOTIFY_REFRESH_TOKEN)
    if (refreshToken) {
        const tokenExpirationEpoch = localStorage.getItem(SPOTIFY_TOKEN_EXPIRATION)
        if (epochTimeInSecond() >= Number.parseInt(tokenExpirationEpoch ? tokenExpirationEpoch : 0)) {
            const response = await refreshAccessToken(refreshToken)
            saveNewCredentials(response)
            return response.data.access_token
        }
        return localStorage.getItem(SPOTIFY_TOKEN)
    } else {
        console.log('Autenticando...')
        const response = await authenticate()
        saveNewCredentials(response)
        return response.data.access_token
    }
}

function saveNewCredentials(response) {
    console.log(response.data)
    localStorage.setItem(SPOTIFY_TOKEN, response.data.access_token)
    localStorage.setItem(SPOTIFY_REFRESH_TOKEN, response.data.refresh_token)
    localStorage.setItem(SPOTIFY_TOKEN_EXPIRATION, epochTimeInSecond() + response.data.expires_in)
}

function deleteCredentials() {
    localStorage.removeItem(SPOTIFY_LOGIN_CODE)
    localStorage.removeItem(SPOTIFY_TOKEN)
    localStorage.removeItem(SPOTIFY_REFRESH_TOKEN)
    localStorage.removeItem(SPOTIFY_TOKEN_EXPIRATION)
}

function authenticate() {
    return axios.post(
        'https://accounts.spotify.com/api/token',
        {
            grant_type: 'authorization_code',
            redirect_uri: `${process.env.SPOTIFY_CALLBACK_URL}/spotify_login`,
            code: localStorage.getItem(SPOTIFY_LOGIN_CODE)
        },
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')
            }
        }
    )
}

function refreshAccessToken(refreshToken) {
    return axios.post(
        'https://accounts.spotify.com/api/token',
        {
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        },
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')
            }
        }
    )
}

async function search(q) {
    return axios.get(
        `${spotifyEndpoint}/search`,
        {
            headers: {
                Authorization: `Bearer ${await getAuthToken()}`
            },
            params: {
                q,
                type: 'track',
                limit: 1
            }
        }
    )
}

async function addToPlaylist(track) {
    return axios.post(
        `${spotifyEndpoint}/playlists/${process.env.SPOTIFY_URSAL_PLAYLIST_ID}/tracks`,
        {
            uris: [track.uri]
        },
        {
            headers: {
                Authorization: `Bearer ${await getAuthToken()}`
            }
        }
    )
}

async function init(bot) {
    events.event(MUSIC_PLAY_SONG_EVENT)
        .subscribe({
            next: song => tryAddSongToSpotifyPlaylist(bot, song),
            error: () => utils.logError(bot, error, __filename)
        })
}

async function tryAddSongToSpotifyPlaylist(bot, song) {
    try {
        console.log(song.video_details.music)
        const info = song.video_details?.music[0]
        if (!info) {
            console.log('Música sem info')
            return
        }
        const response = await search(info.song)
        console.log(response.data)
        const track = response.data?.tracks?.items[0]
        console.log(track.uri)
        await addToPlaylist(track)
    } catch (error) {
        error = error && error.response.data ? error.response.data : error
        utils.logError(bot, error, __filename)
    }
}

function epochTimeInSecond() {
    return Number.parseInt(new Date().getTime() / 1000)
}

function run(bot, msg) {
    const state = randomUUID()
    const scope = 'playlist-modify-private playlist-modify-public'
    const qs = querystring.stringify({
        response_type: 'code',
        client_id: process.env.SPOTIFY_CLIENT_ID,
        scope,
        redirect_uri: `${process.env.SPOTIFY_CALLBACK_URL}/spotify_login`,
        state
    })
    setSharedVariable(SPOTIFY_LOGIN_STATE, state)
    deleteCredentials()
    bot.users.cache.get(msg.author.id).send(`https://accounts.spotify.com/authorize?${qs}`)
}

function canHandle(bot, msg) {
    return msg.content.startsWith(utils.command('spotify_login'))
}

function helpComand(bot, msg) {
    return {
        name: utils.command("spotify_login"),
        value: "Realiza login no spotify",
        inline: false
    }
}

module.exports = {
    init,
    run,
    canHandle,
    helpComand
}