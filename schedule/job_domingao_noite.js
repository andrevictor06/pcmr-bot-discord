const schedule = require('node-schedule');

function initJob(bot){
    return schedule.scheduleJob(getSchedule(), ()=> run(bot));
}

function getSchedule(){
    return "0 50 23 * * 0";
}

function run(bot){
    bot.channels.fetch(process.env.ID_CHANNEL_UPGOOGLE).then( channel => { 
        channel.send("https://cdn.discordapp.com/attachments/813916705222295582/1068548770872164372/326216116_1243898222830586_4785144180055174509_n.png");
    });
}

module.exports = {
    initJob
}