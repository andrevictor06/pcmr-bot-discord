const { joinVoiceChannel, AudioPlayerStatus, createAudioResource, createAudioPlayer, VoiceConnectionStatus } = require('@discordjs/voice')
const Utils = require("../utils/Utils")
const { ExpectedError } = require('../utils/expected_error')
const playdl = require('play-dl');
const { sharedVariableExists, setSharedVariable, getSharedVariable, deleteSharedVariable } = require("../utils/shared_variables")
const { MUSIC_QUEUE_NAME, AUDIO_QUEUE_NAME, MUSIC_TIMEOUT_ID, MUSIC_INTERVAL_ID, PLAYLIST_CALLBACK_AUDIO_STATUS_IDLE, SPOTIFY_PLAYLIST_TRACKS, RANDOM_PLAYLIST_ACTIVE } = require('../utils/constants')
const spotify = require('./spotify_playlist')

const musicQueueThreadName = "músicas_na_fila"
const commands = {
    play: {
        fn: play,
        help: {
            name: Utils.command("play") + " [url-yt/termo] [--times (número de repetições)]",
            value: "Inicia ou coloca em fila a música informada",
            inline: false
        }
    },
    stop: {
        fn: stop,
        help: {
            name: Utils.command("stop"),
            value: "Para a execução de música",
            inline: false
        }
    },
    skip: {
        fn: skip,
        help: {
            name: Utils.command("skip"),
            value: "Pula para a proxima música",
            inline: false
        }
    },
    queue: {
        fn: queue,
        help: {
            name: Utils.command("queue"),
            value: "Mostra quantas músicas estão na fila",
            inline: false
        }
    },
    current: {
        fn: currentSong,
        help: {
            name: Utils.command("current"),
            value: "Mostra a música que está tocando",
            inline: false
        }
    },
    next: {
        fn: nextSong,
        help: {
            name: Utils.command("next"),
            value: "Mostra a próxima música na fila",
            inline: false
        }
    },
    random: {
        fn: randomSong,
        help: {
            name: Utils.command("random"),
            value: "Inicia uma playlist aleatoria com base na PlayList Ursal no Spotify",
            inline: false
        }
    }
}

async function randomSong(bot, message) {

    let musicas = getSharedVariable(SPOTIFY_PLAYLIST_TRACKS)
    if( musicas ){
        let id_spotify_escolhida = Utils.getRandomFromArray(musicas)
        let track = await spotify.searchDataTrack(id_spotify_escolhida)

        if(track){
            message.channel.send(`${track.stringify()}`)
            console.log(track, " track");
            
            message.channel.send(`${Utils.command("play")} ${track.name} ${track.artists?.map(u => u.name).join(', ')}`)
            setSharedVariable(RANDOM_PLAYLIST_ACTIVE, true)
        }
    }
}

async function play(bot, message) {
    Utils.checkVoiceChannelPreConditions(message)

    const parsedArgs = Utils.parseArgs(message)
    if (parsedArgs.mainParam == null || parsedArgs.mainParam == "") throw new ExpectedError("Cadê a música man?")

    const url = await getURL(bot, parsedArgs)
    if (!url) throw new ExpectedError("Achei nada man")

    const firstTime = !sharedVariableExists(MUSIC_QUEUE_NAME)
    if (firstTime) {
        createServerQueue(bot, message, message.member.voice.channel)
    }

    const isIdle = playerIsIdle()
    try {
        await addToQueue(url, message, parsedArgs, !firstTime && !isIdle)
    } catch (error) {
        if (firstTime) delayedStop(bot, message)
        throw error
    }
    if (firstTime || isIdle) {
        return next(bot)
    }
}

async function getURL(bot, args) {
    if (Utils.isValidHttpUrl(args.mainParam)) {
        if (!Utils.isYoutubeURL(args.mainParam)) throw new ExpectedError("Essa url não é do youtube não man")
        const url = new URL(args.mainParam)
        if (url.searchParams.has("list")) {
            try {
                const playlistInfo = await playdl.playlist_info(args.mainParam, { incomplete: true })
                const videos = await playlistInfo.all_videos()
                return videos.filter(v => v.url != null).map(v => v.url)
            } catch (error) {
                Utils.logError(bot, error, __filename)
            }
        }

        return args.mainParam
    }

    const result = await playdl.search(args.mainParam, { source: { youtube: 'video' }, limit: 1 })
    if (result && result.length > 0) {
        return result[0].url
    }
    return null
}

async function addToQueue(songURL, message, parsedArgs, showAddedMessage = false) {
    const serverQueue = getSharedVariable(MUSIC_QUEUE_NAME)
    if (Array.isArray(songURL)) {
        serverQueue.songs = serverQueue.songs.concat(songURL)
        message.channel.send(`Adicionei ${songURL.length} músicas na fila!`)
    } else {
        const basicInfo = await loadSongInfo(songURL)
        const times = parsedArgs.params.times != null && parsedArgs.params.times > 0 ? parsedArgs.params.times : 1
        for (let i = 0; i < times; i++) {
            serverQueue.songs.push(basicInfo)
        }
        if (showAddedMessage && times == 1) {
            message.channel.send(`**${basicInfo.video_details.title}** foi adicionada na fila!`)
        }
        if (times > 1) {
            message.channel.send(`**${basicInfo.video_details.title}** foi adicionada ${times} vezes na fila!`)
        }
    }
}

function createServerQueue(bot, message, voiceChannel) {
    if (sharedVariableExists(AUDIO_QUEUE_NAME)) throw new ExpectedError("Tem um áudio tocando man, calma ae")
    const serverQueue = {
        player: createAudioPlayer(),
        textChannel: message.channel,
        voiceChannel,
        connection: joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        }),
        songs: [],
        volume: 5,
        playing: true
    }
    serverQueue.connection.subscribe(serverQueue.player)

    serverQueue.player.on(AudioPlayerStatus.Idle, () =>{
        if (sharedVariableExists(PLAYLIST_CALLBACK_AUDIO_STATUS_IDLE) && getSharedVariable(MUSIC_QUEUE_NAME).songs == 0){
            getSharedVariable(PLAYLIST_CALLBACK_AUDIO_STATUS_IDLE)(bot, message, voiceChannel)
        }

        if (sharedVariableExists(RANDOM_PLAYLIST_ACTIVE) && getSharedVariable(MUSIC_QUEUE_NAME).songs == 0){
            randomSong(bot, message)
        }

        next(bot)
    })
    serverQueue.player.on("error", error => {
        Utils.logError(bot, error, __filename)
        serverQueue.textChannel.send(Utils.getMessageError(error))
    })
    serverQueue.connection.on('stateChange', (oldState, newState) => {
        if (oldState.status === VoiceConnectionStatus.Ready && newState.status === VoiceConnectionStatus.Connecting) {
            serverQueue.connection.configureNetworking()
        }
    })
    
    
    setSharedVariable(MUSIC_QUEUE_NAME, serverQueue)

    const inactivityIntervalId = setInterval(() => {
        if (!sharedVariableExists(MUSIC_QUEUE_NAME)) {
            clearInactivityInterval()
        }

        const serverQueue = getSharedVariable(MUSIC_QUEUE_NAME)
        if (!serverQueue.voiceChannel.members || serverQueue.voiceChannel.members.size == 0) {
            delayedStop(bot)
        }
    }, 60000)
    setSharedVariable(MUSIC_INTERVAL_ID, inactivityIntervalId)
}

async function playSong(bot, song) {
    const serverQueue = getSharedVariable(MUSIC_QUEUE_NAME)
    try {
        if (!song) {
            serverQueue.currentSong = null
            return delayedStop(bot)
        }
        clearDelayedStopTimeout()

        const songWithInfo = await loadSongInfo(song)
        const source = await playdl.stream(songWithInfo.video_details.url, { quality: 1 })
        const resource = createAudioResource(source.stream, { inputType: source.type })

        serverQueue.player.play(resource)
        serverQueue.currentSong = songWithInfo
        serverQueue.textChannel.send(`Tocando: **${songWithInfo.video_details.title}**`)
        spotify.tryAddSongToSpotifyPlaylist(bot, songWithInfo)

        Utils.setPresenceBot(bot, { name: songWithInfo.video_details.title, url: songWithInfo.video_details.url, type: 1 })
    } catch (error) {
        Utils.logError(bot, error, __filename)
        serverQueue.textChannel.send(Utils.getMessageError(error))
        return next(bot)
    }
}

function clearDelayedStopTimeout() {
    const timeoutId = getSharedVariable(MUSIC_TIMEOUT_ID)
    if (timeoutId) {
        clearTimeout(timeoutId)
        deleteSharedVariable(MUSIC_TIMEOUT_ID)
    }
}

function clearInactivityInterval() {
    const inactivityIntervalId = getSharedVariable(MUSIC_INTERVAL_ID)
    if (inactivityIntervalId) {
        clearInterval(inactivityIntervalId);
        deleteSharedVariable(MUSIC_INTERVAL_ID)
    }
}

function delayedStop(bot, message) {
    const timeoutId = setTimeout(() => stop(bot, message), 60000)
    setSharedVariable(MUSIC_TIMEOUT_ID, timeoutId)
}

function playerIsIdle() {
    return getSharedVariable(MUSIC_QUEUE_NAME).player.state.status == AudioPlayerStatus.Idle && sharedVariableExists(MUSIC_TIMEOUT_ID)
}

function stop(bot, message) {
    try {
        const serverQueue = getSharedVariable(MUSIC_QUEUE_NAME)
        if (serverQueue) {
            clearInactivityInterval()
            clearDelayedStopTimeout()
            serverQueue.player.removeAllListeners()
            stopPlayer(bot)
            const textChannel = message && message.channel ? message.channel : serverQueue.textChannel
            if (sharedVariableExists(AUDIO_QUEUE_NAME)) {
                textChannel.send("Parei as músicas aqui man")
            } else {
                serverQueue.connection.destroy()
                textChannel.send("Falou man")
            }
            deleteThread(message)
        }
        deleteSharedVariable(RANDOM_PLAYLIST_ACTIVE)
        deleteSharedVariable(MUSIC_QUEUE_NAME)
        deleteSharedVariable(PLAYLIST_CALLBACK_AUDIO_STATUS_IDLE)
    } catch (error) {
        Utils.logError(bot, error, __filename)
        if (message) {
            message.channel.send(Utils.getMessageError(error))
        }
    }
}

function skip(bot, message) {
    if (sharedVariableExists(AUDIO_QUEUE_NAME)) return message.channel.send("Tem um áudio tocando man, calma ae")

    if ( sharedVariableExists(PLAYLIST_CALLBACK_AUDIO_STATUS_IDLE) || getSharedVariable(MUSIC_QUEUE_NAME).songs.length > 0) {
        stopPlayer(bot)
    } else {
        message.channel.send("Fila tá vazia man")
    }
}

function next(bot) {
    return playSong(bot, getSharedVariable(MUSIC_QUEUE_NAME).songs.shift())
}

async function queue(bot, message) {
    const serverQueue = getSharedVariable(MUSIC_QUEUE_NAME)
    if (!serverQueue.songs || serverQueue.songs.length == 0) throw new ExpectedError("Fila tá vazia man")

    await createThread(message)
    await sendMessageThread(message.channel, { content: `Tem **${serverQueue.songs.length}** música(s) na fila!` })
    await loadAllSongsInfo()
    Utils.chunkArray(serverQueue.songs, 5).forEach(async (chunk, chunckIndex) => {
        const components = chunk.map((song, index) => {
            return {
                type: 2,
                label: `[${index + (chunckIndex * 5) + 1}] ${song.video_details.title}`.slice(0, 80),
                url: song.video_details.url,
                style: 5
            }
        })
        sendMessageThread(message.channel, {
            content: "---",
            components: [
                {
                    type: 1,
                    components
                }
            ]
        })
    })

}

function currentSong(bot, message) {
    const serverQueue = getSharedVariable(MUSIC_QUEUE_NAME)
    if (serverQueue.currentSong) {
        message.channel.send(`Tá tocando isso aqui: ${serverQueue.currentSong.video_details.url}`)
    } else {
        message.channel.send("Tem nada tocando man")
    }
}

async function nextSong(bot, message) {
    const serverQueue = getSharedVariable(MUSIC_QUEUE_NAME)

    if (serverQueue.songs.length > 0) {
        const songWithInfo = await loadSongInfo(serverQueue.songs[0])
        message.channel.send(`Próxima música: ${songWithInfo.video_details.url}`)
    } else {
        message.channel.send("Fila tá vazia man")
    }
}

async function loadSongInfo(possibleSongInfo) {
    if (typeof possibleSongInfo == 'string') {
        const songWithInfo = await playdl.video_basic_info(possibleSongInfo)
        if (!songWithInfo) throw new ExpectedError("Não consegui achar a música man")
        return songWithInfo
    }
    return possibleSongInfo
}

function stopPlayer(bot) {
    const serverQueue = getSharedVariable(MUSIC_QUEUE_NAME)
    if (!serverQueue) throw new ExpectedError("Opa, tem nada tocando man")

    serverQueue.player.stop(true)

    Utils.setPresenceBotDefault(bot)
}

async function deleteThread(message) {
    if (message && message.channel) {
        const cache = message.channel.threads.cache.find(x => x.name === musicQueueThreadName)
        if (cache)
            await cache.delete()
    }
}

async function createThread(message) {
    await deleteThread(message)

    return await message.channel.threads.create({
        name: musicQueueThreadName,
        autoArchiveDuration: 60,
        reason: 'Fila de músicas',
    })
}

async function sendMessageThread(channel, message) {
    const thread = channel.threads.cache.find(x => x.name === musicQueueThreadName)
    if (thread)
        thread.send(message)
}

async function loadAllSongsInfo() {
    const serverQueue = getSharedVariable(MUSIC_QUEUE_NAME)
    const promises = []
    for (let i = 0; i < serverQueue.songs.length; i++) {
        promises.push(
            new Promise(async resolve => {
                serverQueue.songs[i] = await loadSongInfo(serverQueue.songs[i])
                resolve(true)
            })
        )
    }
    await Promise.all(promises)
}

async function run(bot, msg) {
    if ( (!Utils.startWithCommand(msg, "play") && !Utils.startWithCommand(msg, "random")) && !sharedVariableExists(MUSIC_QUEUE_NAME)) return msg.channel.send("Nem tô na sala man")

    return await Utils.executeCommand(bot, msg, commands)
}

function canHandle(bot, msg) {
    return Utils.containsCommand(msg, commands)
}

function helpComand(bot, msg) {
    return Object.values(commands)
        .map(value => value.help)
        .filter(value => value != null)
}

module.exports = {
    run, canHandle, helpComand, play
}