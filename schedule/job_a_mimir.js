const schedule = require('node-schedule');

function initJob(bot){
    return schedule.scheduleJob(getSchedule(), ()=> run(bot))
}

function getSchedule(){
    return process.env.SCHEDULE_A_MIMIR
}

function run(bot){
    bot.channels.fetch(process.env.ID_CHANNEL_UPGOOGLE).then( channel => { 
        channel.send({files: ["./assets/monkey-sleep.gif"]})
    });
}

module.exports = {
    initJob
}