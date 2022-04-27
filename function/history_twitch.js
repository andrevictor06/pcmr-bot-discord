const request = require('request').defaults({ encoding: null });

async function createThreads(channel, message){
    const cache = channel.threads.cache.find(x => x.name === 'quem-esta-online');
    if( cache)
        return cache;

    return await channel.threads.create({
        name: 'quem-esta-online',
        autoArchiveDuration: 60,
        reason: 'Quem está online?',
    });
}

async function sendMessageThread(channel, message){
    const thread = channel.threads.cache.find(x => x.name === 'quem-esta-online');
    if(thread)
        thread.send({ content: message.content})
}

function run( bot, msg ){
    let criouTopico = false;
    if(msg.content.trim().startsWith("/ttlive")){
        bot.channels.fetch('956197177623969832').then( channel => {

            channel.messages.fetch({limit: 100}).then(messages => {
                //Iterate through the messages here with the variable "messages".
                messages.forEach((message) => {
                
                    if( message.content.trim().startsWith("https://www.twitch.tv/")){
                        if( !criouTopico){
                            criouTopico= true;
                            createThreads(channel, message);
                        }

                        setTimeout(() => {
                            const url = message.content.trim().split(" ")[0].trim();
                            request.get({
                                url: url,
                                method: 'GET'
                            }, function( error, response, body){
                                if (!error && response.statusCode == 200) {
                                    const data = Buffer.from(body).toString('utf8');
                                    if( data.toString().includes(`"isLiveBroadcast":true`)){
                                        sendMessageThread(channel, message );
                                    }
                                }
                            });    
                        }, 3000);
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
    
            || ( msg.channel.id == "956197177623969832" && msg.content.trim().startsWith("/ttlive") );
}

module.exports =  {
   run, canHandle 
}
