require('dotenv/config');
const { Client, Intents } = require("discord.js");
const bot = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const UploadGoogleDrive = require("./function/upload_googledrive");
const HistoryTwitch     = require("./function/history_twitch");
const Processador       = require("./function/processador");
const ComprarPC         = require("./function/comprar_pc");
const MusicPlay         = require("./function/music_play");
const VideoPlay         = require("./function/video_play");
const Avatar            = require("./function/avatar");
const Placa             = require("./function/placa");
const Copy              = require("./function/copy");

const functions = [
  UploadGoogleDrive,
  HistoryTwitch,
  Processador,
  ComprarPC,
  MusicPlay,
  VideoPlay,
  Avatar,
  Placa,
  Copy
]


bot.on("message", msg =>{
  functions.forEach( (fn) => {
    if( fn.canHandle(bot, msg))
      fn.run(bot, msg);
  });
});

bot.login(process.env.TOKEN_DISCORD);//process.env.TOKEN_DISCORD API