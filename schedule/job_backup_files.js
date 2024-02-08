const schedule = require('node-schedule');
const AdmZip = require("adm-zip");
const google_drive = require("../utils/google_drive")
const path = require('path');
const fs = require('fs');
function initJob(bot){
    return schedule.scheduleJob(getSchedule(), ()=> run(bot))
}

function getSchedule(){
    return process.env.SCHEDULE_BACKUP_FILES
}

function run(bot){
    if (process.env.ENVIRONMENT === "PRD")
        createZipBackup(bot);
}

function createZipBackup(bot){
    const name_zip = `BKP_${process.env.ENVIRONMENT}_${process.env.APP_NAME} ${((new Date()).toLocaleString().split("/").join("_").split(":").join("_"))}.zip`
    const zip = new AdmZip();
    const file_name = path.resolve('.backup', name_zip)
    
    zip.addLocalFolder(path.resolve('audio'), "audio");
    zip.addLocalFolder(path.resolve('images'), "images");
    zip.addLocalFile(path.resolve('.localstorage', 'figurinhas'), ".localstorage");
    zip.writeZip(file_name);
    
    uploadFileOnDrive(bot, name_zip, fs.createReadStream(file_name))

}

async function uploadFileOnDrive(bot, fileName, content){
    const fileMetadata = {
        name: fileName
    };

    const media = {
        body: content
    }
    google_drive.uploadFileOnDrive(bot, fileMetadata, media, enviarMensagemSalaDEV)
}

function enviarMensagemSalaDEV(bot, data, err){
    if(err){
        bot.channels.fetch(process.env.ID_CHANNEL_LOG_BOT).then( channel => { 
            channel.send({ content: "Erro no processo do backup: " + err})
        });    
        return false;
    }

    bot.channels.fetch(process.env.ID_CHANNEL_LOG_BOT).then( channel => { 
        channel.send({
            embeds: [{
                title: "Backup concluído com sucesso",
                timestamp: new Date().toISOString(),
                url: data.data.webViewLink
            }]})
    });
}

module.exports = {
    initJob,
    run
}