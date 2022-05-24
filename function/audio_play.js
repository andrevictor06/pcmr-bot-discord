const ytdl = require("ytdl-core");
const queue = new Map();

async function execute(message, serverQueue) {
    const args = message.content.split(" ");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send("You need to be in a voice channel to play music!");

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send("I need the permissions to join and speak in your voice channel!");
    }

    const songInfo = await ytdl.getInfo(args[1]);
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
    };

    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };

        queue.set(message.guild.id, queueContruct);

        queueContruct.songs.push(song);

        try {
            var connection = await voiceChannel.join();
            connection.voice.setSelfDeaf(true);
            queueContruct.connection = connection;
            play(message.guild, queueContruct.songs[0], message);
        } catch (err) {+
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        return message.channel.send(`${song.title} has been added to the queue!`);
    }
}

function play(guild, song, message) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        stop(guild, serverQueue, message);
        return;
    }

    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

function stop(guild, serverQueue, message) {
    if (serverQueue && serverQueue.voiceChannel) {
        const connection = joinVoiceChannel({
            channelId: message.member.voice.channel.id,
            guildId: message.member.guild.id,
            adapterCreator: message.channel.guild.voiceAdapterCreator
        })
        connection.destroy();
        //serverQueue.voiceChannel.leave();
    }
    if (guild) {
        queue.delete(guild.id);
    }

}

function run(bot, msg) {
    const serverQueue = queue.get(msg.guild.id);

    if (msg.content.startsWith("/video ") || msg.content.startsWith("*video ")) {
        execute(msg, serverQueue)
    }

    if (msg.content.startsWith("/videostop")) {
        stop(msg.guild, serverQueue, msg);
    }
}

function canHandle(bot, msg) {
    return (msg.content.startsWith("/video ") || msg.content.startsWith("*video ") || msg.content.startsWith("/videostop"));
}

module.exports = {
    run, canHandle
}