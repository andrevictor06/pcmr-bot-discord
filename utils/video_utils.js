const pathToFfmpeg = require('ffmpeg-static')
const ffmpeg = require('fluent-ffmpeg')

function mp4ToGif(options) {
    let command = ffmpeg()
        .setFfmpegPath(pathToFfmpeg)
        .input(options.stream)
        .addOption("-filter_complex", "fps=10,scale=720:-1")
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
    mp4ToGif
}