

function run(bot, msg) {
    msg.channel.send("TESTE WEBHOOK");
}

function canHandle(bot, msg) {
    return (msg.content.startsWith("/copy ") || msg.content.startsWith("*copy "));
}

module.exports = {
    run, canHandle
}