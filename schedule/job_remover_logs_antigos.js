const schedule = require('node-schedule');
const Utils = require("../utils/Utils")
const fs = require('fs')
const path = require("path")

function initJob(bot){
    return schedule.scheduleJob(getSchedule(), ()=> run(bot))
}

function getSchedule(){
    return process.env.SCHEDULE_REMOVER_LOGS_ANTIGOS
}

function run(bot){
    removerLogs(process.env.PATH_LOG)
    removerLogs(process.env.PATH_LOG_SITE)
    removerLogs(process.env.PATH_BACKUP_FILES)
}

function removerLogs(path_resolve){
    const logPath = path.resolve(path_resolve)
    const path_logs = fs.readdirSync(logPath)
    
    var date = new Date();
    date.setDate(date.getDate() - 1);
    path_logs.forEach(file =>{
        const logFile = path.resolve(logPath, file)
        const stat = fs.statSync( logFile )
        if( stat.mtime.getTime() < date.getTime()){
            fs.unlinkSync(logFile)
        }
    })
}

module.exports = {
    initJob
}