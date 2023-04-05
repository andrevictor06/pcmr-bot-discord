const { MUSIC_PLAY_SONG_EVENT, SPOTIFY_LOGIN_STATE, SPOTIFY_TOKEN, SPOTIFY_TOKEN_EXPIRATION, SPOTIFY_REFRESH_TOKEN, SPOTIFY_AUTH_URL, SPOTIFY_BASE_URL, SPOTIFY_PLAYLIST_TRACKS } = require('../utils/constants')
const events = require('../utils/events');
const { setSharedVariable, getSharedVariable } = require('../utils/shared_variables')
const utils = require('../utils/Utils')
const { default: axios } = require('axios')
const { randomUUID } = require('crypto')
const querystring = require('querystring')

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
    const tokenExpirationEpoch = localStorage.getItem(SPOTIFY_TOKEN_EXPIRATION)
    if (!tokenExpirationEpoch) throw new Error('Não estou logado no spotify!')
    if (utils.nowInSeconds() >= Number.parseInt(tokenExpirationEpoch)) {
        console.log('Atualizando token...')
        const refreshToken = localStorage.getItem(SPOTIFY_REFRESH_TOKEN)
        const response = await refreshAccessToken(refreshToken)
        saveCredentials(response)
        return response.data.access_token
    }
    console.log('Retornando token do cache...')
    return localStorage.getItem(SPOTIFY_TOKEN)
}

function saveCredentials(response) {
    console.log('Salvando tokens...')
    localStorage.setItem(SPOTIFY_TOKEN, response.data.access_token)
    if (response.data.refresh_token) {
        localStorage.setItem(SPOTIFY_REFRESH_TOKEN, response.data.refresh_token)
    }
    localStorage.setItem(SPOTIFY_TOKEN_EXPIRATION, utils.nowInSeconds() + response.data.expires_in)
}

function deleteCredentials() {
    localStorage.removeItem(SPOTIFY_TOKEN)
    localStorage.removeItem(SPOTIFY_REFRESH_TOKEN)
    localStorage.removeItem(SPOTIFY_TOKEN_EXPIRATION)
}

async function authenticate(code) {
    const response = await axios.post(
        SPOTIFY_AUTH_URL,
        {
            grant_type: 'authorization_code',
            redirect_uri: process.env.SPOTIFY_CALLBACK_URL,
            code
        },
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: 'Basic ' + basicAuth()
            }
        }
    )
    saveCredentials(response)
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

async function getAllTracksFromPlaylist(limit, offset = 0) {
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
    if (response.data?.items?.length > 0) {
        const tracks = await getAllTracksFromPlaylist(
            limit,
            limit + offset
        )
        return response.data.items
            .map(i => i.track.id)
            .concat(tracks)
    }
    return []
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
        let q = song.video_details?.title
        const info = song.video_details?.music?.at(0)
        if (info) {
            q = `track:${info.song} artist:${info.artist}`
        }
        if (!q) {
            console.log('Texto de pesquisa vazio!')
            return
        }
        console.log('Consulta', q)
        const tracksCache = getSharedVariable(SPOTIFY_PLAYLIST_TRACKS)
        if (!tracksCache) throw new Error('Não foi realizado o cache das músicas')

        const trackSearchResponse = await search(q)
        const track = trackSearchResponse.data?.tracks?.items?.at(0)
        if (track) {
            if (tracksCache.includes(track.id)) {
                console.log('Música já existe na playlist')
                return
            }
            await addToPlaylist(track)
            tracksCache.push(track.id)
            saveTracksCache(tracksCache)
            console.log('Adicionei na playlist e atualizei o cache')
        } else {
            console.log('Música não encontrada no spotify')
        }
    } catch (error) {
        error = error.response?.data ? error.response.data : error
        utils.logError(bot, error, __filename)
    }
}

async function init(bot) {
    loadTracksCache()
    events.event(MUSIC_PLAY_SONG_EVENT)
        .subscribe({
            next: song => tryAddSongToSpotifyPlaylist(bot, song)
        })
}

function loadTracksCache() {
    const tracksStr = localStorage.getItem(SPOTIFY_PLAYLIST_TRACKS)
    if (tracksStr) {
        setSharedVariable(SPOTIFY_PLAYLIST_TRACKS, JSON.parse(tracksStr))
    }
}

function saveTracksCache(tracks) {
    localStorage.setItem(SPOTIFY_PLAYLIST_TRACKS, JSON.stringify(tracks))
}

async function reloadTracksCache() {
    const tracks = await getAllTracksFromPlaylist(50)
    saveTracksCache(tracks)
    setSharedVariable(SPOTIFY_PLAYLIST_TRACKS, tracks)
    console.log('Cache atualizado')
    return tracks
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
    const tracks = await reloadTracksCache()
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
    helpComand,
    authenticate
}