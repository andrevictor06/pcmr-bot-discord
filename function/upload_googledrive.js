const request = require('request').defaults({ encoding: null });

function run( bot, msg ){
    const url = process.env.URL_APPLETS;
    request.get(url, function( error, response, body){
        if (!error && response.statusCode == 200) {
            const data = JSON.parse(Buffer.from(body).toString('utf8'));
            if( data.applets){
                data.applets.forEach(element => {
                    msg.channel.send( "\```json \n " + JSON.stringify(element) + "\```");
                });
            }
        }
    });
}

function canHandle( bot, msg ){
    return (msg.content.startsWith("/upload"));
}

module.exports =  {
   run, canHandle 
}
