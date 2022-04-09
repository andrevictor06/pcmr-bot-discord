const request = require('request').defaults({ encoding: null });

function run( bot, msg ){
    const listFiles = [];
    //console.log("msg.content 2 ", msg);
    const args = msg.content.split(" ");
    if( msg.attachments){
        msg.attachments.forEach(attachment => {            
            console.log("attachment", attachment);
            listFiles.push({
                "url" :     attachment.url,
                "title":    attachment.name
            })
        });  
    }

    if( msg.embeds){
        msg.embeds.forEach(embed => {
           // console.log("embed", embed);
            listFiles.push({
                "url" :  embed.url,
                "title": embed.title
            });
        });
    }

    const req_body = {
        "files" : listFiles
    }
    if( args[1]){
        const url = process.env.URL_APPLETS + "upload";
        request.post({
            url: url,
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req_body)
        }, function( error, response, body){
            if (!error && response.statusCode == 200) {
                const data = Buffer.from(body).toString('utf8');
                msg.channel.send( data );
            }
        });
    }
}

function canHandle( bot, msg ){
    return (msg.content.startsWith("/subreddit"));
}

module.exports =  {
   run, canHandle 
}
