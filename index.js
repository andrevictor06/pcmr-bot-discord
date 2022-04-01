require('dotenv/config');
const Discord = require("discord.js");
const bot = new Discord.Client();

const UploadGoogleDrive = require( "./function/upload_googledrive");
const HistoryTwitch     = require( "./function/history_twitch");
const Processador       = require( "./function/processador");
const ComprarPC         = require( "./function/comprar_pc");
const Avatar            = require( "./function/avatar");
const Placa             = require("./function/placa.js");



const functions = [
  Placa,
  HistoryTwitch,
  ComprarPC,
  Processador,
  Avatar,
  UploadGoogleDrive
]

bot.on("message", msg =>{
  functions.forEach( (fn) => {
    if( fn.canHandle(bot, msg))
      fn.run(bot, msg);
  });
});

bot.login(process.env.TOKEN_DISCORD);//process.env.TOKEN_DISCORD API