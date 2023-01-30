const schedule = require('node-schedule');

function initJob(bot){
    return schedule.scheduleJob(getSchedule(), ()=> run(bot))
}

function getSchedule(){
    return process.env.SCHEDULE_DOMINGAO_NOITE
}

function run(bot){
    bot.channels.fetch(process.env.ID_CHANNEL_UPGOOGLE).then( channel => { 
        channel.send({files: ["./images/domingo_a_noite.png"]})
    });
}

module.exports = {
    initJob
}