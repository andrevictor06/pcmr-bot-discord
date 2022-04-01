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
    "https://tecnoblog.net/meiobit/wp-content/uploads/2015/07/20150723elhdszu-634x475.jpg",
    "https://i.imgur.com/W2NFfpZ.jpeg"
]

const listaProcessadores = [
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQlZ7S6-O2_HKhxuZLSskmm6Cawut27VRgIMA&usqp=CAU",
  "https://linustechtips.com/uploads/monthly_2019_10/20191013_072750.jpg.f8d0bd9a6355ba6ab5e9542ff07a0bf3.jpg",
  "https://i.ytimg.com/vi/YUcbiIUZck0/maxresdefault.jpg",
  "https://gizmodo.uol.com.br/wp-content/blogs.dir/8/files/2020/10/cooler-cpu-amdryzen.jpg",
  "https://i.imgur.com/cz8nReE.jpg",
  "https://i.ytimg.com/vi/ab-rx7t42yo/maxresdefault.jpg"
]

function between(min, max) {  
    return Math.floor(
      Math.random() * (max - min) + min
    )
  }

bot.on("message", msg =>{
  let user = "<@!320933526554017793>";
    if(msg.content.startsWith("/placa") || msg.content.startsWith("/praca")){
      let message = "";
      try{
        let item = lista[between(0, lista.length)] ;
        
        if( ! item){
          item = lista[0];
        }
        message = user + ", " + item;
      }catch( ex ){
        console.log(ex, " ex")
        message = user + ", " + lista[0];
      }
      msg.delete();
      return msg.channel.send(message);
    }
    
    if (msg.content.trim().startsWith("https://www.twitch.tv/")) {
      console.log(msg)
      return msg.channel.send(msg.content);
    }

    if (msg.content.startsWith("/comprapc")) {
      const withoutPrefix = msg.content.slice("/avatar".length);
	    const split = withoutPrefix.split(/ +/);
	    const command = split[0];
	    const args = split.slice(1);
      // 
      if (args[0]) {
        const user = getMention(args[0]);
        if (!user) {
          return msg.reply('Please use a proper mention if you want to see someone elses avatar.');
        }
        msg.delete();
        return msg.channel.send(`${user}, Vai comprar a ***** do PC e vem jogar direito com a gente!`);
      }
      msg.delete();
      return msg.channel.send(`<@!320933526554017793>, Vai comprar a ***** do PC e vem jogar direito com a gente!`);
    }
    if(msg.content.startsWith("/processador") ){
      let message = "";
      try{
        let item = listaProcessadores[between(0, listaProcessadores.length)] ;
        
        if( ! item){
          item = listaProcessadores[0];
        }
        message = "<@!320933526554017793>, " + item;
      }catch( ex ){
        console.log(ex, " ex")
        message = "<@!320933526554017793>, " + listaProcessadores[0];
      }
      msg.delete();
      return msg.channel.send(message);
    }

    if (msg.content.startsWith("/avatar")) {
      const withoutPrefix = msg.content.slice("/avatar".length);
	    const split = withoutPrefix.split(/ +/);
	    const command = split[0];
	    const args = split.slice(1);

      if (args[0]) {
        const user = getUserFromMention(args[0]);
        if (!user) {
          return msg.reply('Please use a proper mention if you want to see someone elses avatar.');
        }
        msg.delete();
        return msg.channel.send(`${user.username}'s avatar: ${user.displayAvatarURL({ dynamic: true })}`);
      }
      msg.delete();
      return msg.channel.send(`${msg.author.username}, your avatar: ${msg.author.displayAvatarURL({ dynamic: true })}`);
    }
});
function getMention(mention) {
	if (!mention) return;
	  
  return mention;
}

function getUserFromMention(mention) {
	if (!mention) return;

	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		if (mention.startsWith('!')) {
			mention = mention.slice(1);
		}

		return bot.users.cache.get(mention);
	}
}


//process.env.TOKEN_DISCORD API
bot.login(process.env.TOKEN_DISCORD);

module.exports = (req, res) => {
  const { name = 'World' } = req.query;
  res.send(`Hello ${name}!`);
};