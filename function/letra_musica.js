const request = require('request').defaults({ encoding: null });

function run( bot, msg ){

    console.log( msg.content);
    const params = msg.content.split("--")
    params.shift();

    var artist = "Arthur Aguiar";
    var song   = "Fora da";
    var apikey   = "One";

    params.forEach(element => {
        if( element.startsWith("mus ")){
            song = element.substring(4)
        }
        if( element.startsWith("art ")){
            artist = element.substring(4)
        }
        if( element.startsWith("apikey ")){
            apikey = element.substring(7)
        }
    });
    console.log( `https://api.vagalume.com.br/search.php?art=${artist}&mus=${song}&apikey=${apikey}`);
    request.get(`https://api.vagalume.com.br/search.php?art=${artist}&mus=${song}&apikey=${apikey}`, ( error, response, body)=>{
        if( ! error && response.statusCode === 200){
            let responseText = JSON.parse(Buffer.from(body).toString('utf8'));
            
            if( responseText && responseText.mus){
                console.log(responseText);
            
                let template_musica= "```" + responseText.mus[0].text + "```"
                
                let template_header= "" + 
                `>>> Música: **${responseText.mus[0].name}**\nArtista: **${responseText.art.name}**\nLink: **${responseText.mus[0].url}**`

                let template = 
                `${ template_header}

                ${ template_musica}
                `

                return msg.reply(template);
            }
        }
    });

/*    const withoutPrefix = msg.content.slice("/avatar".length);
	const split         = withoutPrefix.split(/ +/);
	const args = split.slice(1);

    if (args[0]) {
        const user = getUserFromMention(bot, args[0]);
        if (!user) {
          return msg.reply('Please use a proper mention if you want to see someone elses avatar.');
        }
        msg.delete();
        return msg.channel.send(`${user.username}'s avatar: ${user.displayAvatarURL({ dynamic: true })}`);
    }
    msg.delete();
    return msg.channel.send(`${msg.author.username}, your avatar: ${msg.author.displayAvatarURL({ dynamic: true })}`);*/
}

function canHandle( bot, msg ){
    return (msg.content.startsWith(process.env.CARACTER_DEFAULT_FUNCTION + "letra "));
}

module.exports =  {
   run, canHandle 
}
