
function run( bot, msg ){
    bot.channels.fetch('956197177623969832').then( channel => { 
        channel.send(msg.content);
    });
}

function canHandle( bot, msg ){
    return ( msg.channel.id == '813916705222295582' && msg.content.trim().startsWith("https://www.twitch.tv/"));
}

module.exports =  {
   run, canHandle 
}
