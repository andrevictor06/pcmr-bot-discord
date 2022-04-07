const ytdl = require("ytdl-core");
const request = require('request').defaults({ encoding: null });

const LAST_WATCH = "seuxv2botpwmbrp90e";

async function createWatch(message) {
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
                "bg_opacity": "75"
            })
        }, ( error, response, body)=>{
            if (!error && response.statusCode == 200) {
                dowloaded = JSON.parse(Buffer.from(body).toString('utf8'));
                message.channel.send( "Sala no Watch2Gether criada com sucesso!! Para participar acesse: https://w2g.tv/rooms/" + dowloaded.streamkey);
            }
        });
        
    }
}

async function addWatch(message) {
    const args = message.content.split(" ");
    if( args[2] ){
        request.post({
            url:"https://w2g.tv/rooms/" + args [1] + "/playlists/current/playlist_items/sync_update",
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "w2g_api_key": process.env.W2G_API_KEY,
                "add_items": [
                    {"url": args[2]}
                ]
            })
        }, ( error, response, body)=>{
            if (!error && response.statusCode == 200) {
                message.channel.send( "Vídeo adicionado no Watch2Gether com sucesso!! Para participar acesse: https://w2g.tv/rooms/" + args [1]);
            }
        });
    }
}

async function execute(message) {
    const args = message.content.split(" ");
    if( args[2] ){
        addWatch(message);
    }else{
        createWatch(message);
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