const Discord = require("discord.js");

const bot = new Discord.Client();

const lista = [
    "https://i.i.cbsi.com/cnwk.1d/i/tim//2010/07/06/Damaged_Falcon_NW_610x406_610x406.jpg",
    "https://support.cyberpowerpc.com/hc/article_attachments/360028078513/broken_PCI_01.jpg",
    "https://pbs.twimg.com/media/EWOQ55PXQAAFghT.jpg",
    "https://storage-asset.msi.com/global/picture/image/feature/mb/RWD_Img/Z170/BAZOOKA/multi_gpu01.jpg",
    "https://www.cclonline.com/images/articles/1792_brokenslot.png?width=1600&format=jpg",
    "https://h30434.www3.hp.com/t5/image/serverpage/image-id/254464i8E06E2C0756F0AAD/image-size/medium?v=1.0&px=400",
    "https://linustechtips.com/uploads/monthly_2018_08/15350564627742120147877.jpg.f7065233bc1fec7996df12d0bc92776d.jpg",
    "https://linustechtips.com/uploads/monthly_2016_03/IMG_20151111_205053-2.jpg.5478631829ab6adc6ee2929fa837e85a.jpg",
    "https://tecnoblog.net/meiobit/wp-content/uploads/2015/07/20150723elhdszu-634x475.jpg"
]

function between(min, max) {  
    return Math.floor(
      Math.random() * (max - min) + min
    )
  }
  
bot.login(process.env.TOKEN_DISCORD);

bot.on("message", msg =>{
    if(msg.content === "/placa"){
        msg.reply( lista[between(0, lista.length +1)] );
    }
});

