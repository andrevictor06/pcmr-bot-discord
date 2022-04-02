const request = require('request').defaults({ encoding: null });

function run( bot, msg ){
    const args = msg.content.split(" ");
    const url = process.env.URL_APPLETS + "subreddit/" + args[1];
    console.log(url);
    request.post(url, function( error, response, body){
        if (!error && response.statusCode == 200) {
            const data = Buffer.from(body).toString('utf8');
            msg.channel.send( data );
        }
    });
}

function canHandle( bot, msg ){
    return (msg.content.startsWith("/subreddit "));
}

module.exports =  {
   run, canHandle 
}
