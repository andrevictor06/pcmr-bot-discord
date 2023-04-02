const { MUSIC_PLAY_SONG_EVENT, SPOTIFY_LOGIN_STATE, SPOTIFY_LOGIN_CODE, SPOTIFY_TOKEN, SPOTIFY_TOKEN_EXPIRATION, SPOTIFY_REFRESH_TOKEN, SPOTIFY_AUTH_URL, SPOTIFY_BASE_URL, SPOTIFY_PLAYLIST_TRACKS } = require('../utils/constants')
const events = require('../utils/events');
const { setSharedVariable, getSharedVariable } = require('../utils/shared_variables');
const utils = require('../utils/Utils')
const { default: axios } = require('axios')
const { randomUUID } = require('crypto');
const querystring = require('querystring')
const localStorage = require('../utils/localstorage');

const commands = {
    spotify_login: {
        fn: spotifyLogin,
        help: {
            name: utils.command("spotify_login"),
            value: "Realiza login no spotify",
            inline: false
        }
    },
    spotify_cache: {
        fn: spotifyCache,
        help: {
            name: utils.command("spotify_cache"),
            value: "Realiza cache das músicas da playlist URSAL no spotify",
            inline: false
        }
    }
}

async function getAuthToken() {
    const refreshToken = localStorage.getItem(SPOTIFY_REFRESH_TOKEN)
    if (refreshToken) {
        const tokenExpirationEpoch = localStorage.getItem(SPOTIFY_TOKEN_EXPIRATION)
        if (epochTimeInSecond() >= Number.parseInt(tokenExpirationEpoch ? tokenExpirationEpoch : 0)) {
            console.log('Atualizando token...')
            const response = await refreshAccessToken(refreshToken)
            saveNewCredentials(response)
            return response.data.access_token
        }
        console.log('Retornando token do cache...')
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
        SPOTIFY_AUTH_URL,
        {
            grant_type: 'authorization_code',
            redirect_uri: process.env.SPOTIFY_CALLBACK_URL,
            code: localStorage.getItem(SPOTIFY_LOGIN_CODE)
        },
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: 'Basic ' + basicAuth()
            }
        }
    )
}

function refreshAccessToken(refreshToken) {
    return axios.post(
        SPOTIFY_AUTH_URL,
        {
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        },
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: 'Basic ' + basicAuth()
            }
        }
    )
}

async function search(q) {
    return axios.get(
        `${SPOTIFY_BASE_URL}/search`,
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

async function getAllTracksFromPlaylist(limit, offset = 0, tracks = []) {
    const response = await axios.get(
        `${SPOTIFY_BASE_URL}/playlists/${process.env.SPOTIFY_URSAL_PLAYLIST_ID}/tracks`,
        {
            headers: {
                Authorization: `Bearer ${await getAuthToken()}`
            },
            params: {
                fields: `items.track.id`,
                limit,
                offset
            }
        }
    )
    if (response.data?.items && response.data.items.length > 0) {
        return getAllTracksFromPlaylist(
            limit,
            limit + offset,
            tracks.concat(response.data.items.map(i => i.track.id))
        )
    }
    return tracks
}

async function addToPlaylist(track) {
    return axios.post(
        `${SPOTIFY_BASE_URL}/playlists/${process.env.SPOTIFY_URSAL_PLAYLIST_ID}/tracks`,
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

async function tryAddSongToSpotifyPlaylist(bot, song) {
    try {
        console.log(song.video_details.music)
        const info = song.video_details?.music[0]
        if (!info) {
            console.log('Música sem info')
            return
        }
        const tracksCache = getSharedVariable(SPOTIFY_PLAYLIST_TRACKS)
        if (!tracksCache) throw new Error('Não foi realizado o cache das músicas')

        const trackSearchResponse = await search(`track:${info.song} artist:${info.artist}`)
        console.log(trackSearchResponse.data)
        if (trackSearchResponse.data?.tracks?.items && trackSearchResponse.data.tracks.items[0]) {
            const track = trackSearchResponse.data.tracks.items[0];
            if (tracksCache.includes(track.id)) {
                console.log('Música já existe na playlist')
                return
            }
            await addToPlaylist(track)
        }
    } catch (error) {
        error = error && error.response?.data ? error.response.data : error
        utils.logError(bot, error, __filename)
    }
}

async function init(bot) {
    loadTracksCache()
    events.event(MUSIC_PLAY_SONG_EVENT)
        .subscribe({
            next: song => tryAddSongToSpotifyPlaylist(bot, song),
            error: () => utils.logError(bot, error, __filename)
        })
}

function loadTracksCache() {
    const tracksStr = localStorage.getItem(SPOTIFY_PLAYLIST_TRACKS)
    if (tracksStr) {
        setSharedVariable(SPOTIFY_PLAYLIST_TRACKS, JSON.parse(tracksStr))
    }
}

function epochTimeInSecond() {
    return Number.parseInt(new Date().getTime() / 1000)
}

function basicAuth() {
    return Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')
}

function spotifyLogin(bot, msg) {
    const state = randomUUID()
    const scope = 'playlist-modify-private playlist-modify-public'
    const qs = querystring.stringify({
        response_type: 'code',
        client_id: process.env.SPOTIFY_CLIENT_ID,
        scope,
        redirect_uri: process.env.SPOTIFY_CALLBACK_URL,
        state
    })
    setSharedVariable(SPOTIFY_LOGIN_STATE, state)
    deleteCredentials()
    bot.users.cache.get(msg.author.id).send(`https://accounts.spotify.com/authorize?${qs}`)
}

async function spotifyCache(bot, msg) {
    const tracks = await getAllTracksFromPlaylist(50)
    localStorage.setItem(SPOTIFY_PLAYLIST_TRACKS, JSON.stringify(tracks))
    loadTracksCache()
    msg.reply(`Cache das ${tracks.length} músicas da playlist do spotify realizado!`)
}

function run(bot, msg) {
    return utils.executeCommand(bot, msg, commands)
}

function canHandle(bot, msg) {
    return utils.containsCommand(msg, commands)
}

function helpComand(bot, msg) {
    return Object.values(commands)
        .map(value => value.help)
        .filter(value => value != null)
}

module.exports = {
    init,
    run,
    canHandle,
    helpComand
}