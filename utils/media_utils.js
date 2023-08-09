const pathToFfmpeg = require('ffmpeg-static')
const ffmpeg = require('fluent-ffmpeg')

function convertToMp3(options) {
    let command = ffmpeg()
        .setFfmpegPath(pathToFfmpeg)
        .input(options.input)
        .noVideo()
        .audioBitrate(options.bitrate)
        .addOption("-ar " + options.sampleRate)
        .outputFormat("mp3")

    if (options.start != null) {
        command = command.seek(options.start)
    }
    if (options.end != null) {
        command = command.duration(options.end - options.start)
    }
    return command.pipe()
}

function mp4ToGif(options) {
    let command = ffmpeg()
        .setFfmpegPath(pathToFfmpeg)
        .input(options.input)
        .addOption("-filter_complex", `fps=8,scale=${options.width || 200}:-1`)
        .outputFormat("gif")

    if (options.start != null) {
        command = command.seek(options.start)
    }
    if (options.end != null) {
        command = command.duration(options.end - options.start)
    }
    return command.pipe()
}

module.exports = {
    convertToMp3,
    mp4ToGif
}