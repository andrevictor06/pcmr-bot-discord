const schedule = require('node-schedule');

function initJob(bot){
    return schedule.scheduleJob(getSchedule(), ()=> run(bot));
}

function getSchedule(){
    return "0 59 23 * * *";
}

function run(bot){
    bot.channels.fetch(process.env.ID_CHANNEL_UPGOOGLE).then( channel => { 
        channel.send("<@&1007421639014756372> https://media.tenor.co/0LT-R-NaHuwAAAAC/monkey-sleep.gif");
    });
}

module.exports = {
    initJob
}