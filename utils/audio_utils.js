const pathToFfmpeg = require('ffmpeg-static')
const ffmpeg = require('fluent-ffmpeg')

function convertToMp3(options) {
    let command = ffmpeg()
        .setFfmpegPath(pathToFfmpeg)
        .input(options.stream)
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

module.exports = {
    convertToMp3
}