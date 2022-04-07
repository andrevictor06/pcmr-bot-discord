const ytdl = require("ytdl-core");
const request = require('request').defaults({ encoding: null });

async function execute(message) {
    const args = message.content.split(" ");
    if( args [1] ){
        request.post({
            url:"https://w2g.tv/rooms/create.json",
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "w2g_api_key": process.env.W2G_API_KEY,
                "share": args [1],
                "bg_color": "#000000",
                "bg_opacity": "100"
            })
        }, ( error, response, body)=>{
            if (!error && response.statusCode == 200) {
                dowloaded = JSON.parse(Buffer.from(body).toString('utf8'));
                message.channel.send( "Sala no Watch2Gether criada com sucesso!! Para participar acesse: https://w2g.tv/rooms/" + dowloaded.streamkey);
                //console.log("W2G: Here is your room! \n https://w2g.tv/rooms/" + dowloaded.streamkey);
            }
           /* .then(response => response.json())
            .then(function (data) {
                console.log("W2G: Here is your room! \n https://w2g.tv/rooms/" + data.streamkey);
            });*/
        });
        
    }
}


function run(bot, msg) {
    if (msg.content.startsWith("/video ") || msg.content.startsWith("*video ")) {
        execute(msg)
    }
}

function canHandle(bot, msg) {
    return (msg.content.startsWith("/video ") || msg.content.startsWith("*video "));
}

module.exports = {
    run, canHandle
}