const request = require('request').defaults({ encoding: null });

async function createThreads(channel, message){
    /*console.log(message.channel.threads);
    console.log();*/
    const thread = await message.startThread({
        name: 'food-talk',
        autoArchiveDuration: 60,
        reason: 'Needed a separate thread for food',
    });
    /*const thread = await channel.threads.create({
        name: 'food-talk',
        autoArchiveDuration: 60,
        reason: 'Needed a separate thread for food',
    });
    return thread;*/
}

function run( bot, msg ){
    if(msg.content.trim().startsWith("/run")){
        bot.channels.fetch('956197177623969832').then( channel => {

            channel.messages.fetch({limit: 100}).then(messages => {
                //Iterate through the messages here with the variable "messages".
                let encontrou = false;
                messages.forEach((message) => {
                    if( message.content.trim().startsWith("https://www.twitch.tv/")){
                        const url = message.content.trim().split(" ")[0].trim();
                        request.get({
                            url: url,
                            method: 'GET'
                        }, function( error, response, body){
                            if (!error && response.statusCode == 200) {
                                const data = Buffer.from(body).toString('utf8');
                                if( data.toString().includes(`"isLiveBroadcast":true`)){
                                    if( ! encontrou ){
                                        createThreads(channel, message);
                                        encontrou = true;
                                    }
                                    console.log(url);
                                }
                            }
                        });
                    }                        
                });
              });
        });
    }else{
        bot.channels.fetch('956197177623969832').then( channel => { 
            channel.send(msg.content);
        });
    }
}

function canHandle( bot, msg ){
    return ( msg.channel.id == '813916705222295582' && msg.content.trim().startsWith("https://www.twitch.tv/"))
            || msg.content.trim().startsWith("/run");
}

module.exports =  {
   run, canHandle 
}
