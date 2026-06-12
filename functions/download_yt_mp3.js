const Utils = require("../utils/Utils")
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { play } = require("./audio_play");
const { getYouTube } = require("../utils/google_youtube");

const configPath = './.localstorage/ytmp3.config.json';
let config;
const commands = {
    mp3: {
        fn: downloadMP3,
        help: {
            name: Utils.command("mp3") + " [url-yt]",
            value: "Baixa o video Youtube em formato MP3",
            inline: false
        }
    },
    'update-saver-mp3': {
        fn: updateApiKey,
        help: {
            name: Utils.command("update-saver-mp3") + " [api-key]",
            value: "Atualiza os dados de Acesso para Download MP3",
            inline: false
        }
    },
}


function init() {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(configPath)) {
    const defaultConfig = {
      OCEAN_SAVER_API_KEY: '',
      OCEAN_SAVER_API_URL: 'https://p.oceansaver.in/ajax/download.php?copyright=0&format=mp3'
    };
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
  }
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.error('Erro ao carregar ytmp3.config.json:', error);
    process.exit(1);
  }
}

init()

async function downloadMP3(bot, msg, commands){
  
    const args = msg.content.trim().split(/\s+/);
    const youtubeSearch = args[1];
    const yt =  await getYouTube()
    const list = await yt.search.list({part: "snippet", maxResults: 1, q: youtubeSearch, type:"video"})
    
    const youtubeUrl = `https://music.youtube.com/watch?v=${list.data.items[0].id.videoId}`
    if (!youtubeUrl.startsWith('https:')) {
      return msg.reply('Por favor, forneça uma URL válida do YouTube.');
    }

    const apiUrl = `${config.OCEAN_SAVER_API_URL}&url=${encodeURIComponent(youtubeUrl)}&api=${config.OCEAN_SAVER_API_KEY}`;
    try {
      const response = await axios.get(apiUrl);
      const data = response.data;

      if (!data.success || !data.id) {
        return msg.reply('Erro ao iniciar o download: ' + (data.error || 'Resposta inválida.'));
      }

      // Agora, polling para o progresso
      const id = data.id;
      msg.reply(`Processando o download... ID: ${id}. Aguarde. ${youtubeUrl}` );

      const pollInterval = setInterval(async () => {
        try {
          const progressResponse = await axios.get(data.progress_url);
          const progressData = progressResponse.data;
          if (progressData.text === 'Finished') {
            clearInterval(pollInterval);
            
            msg.reply(`Download pronto! Clique para baixar: ${progressData.download_url}`);
            await play(bot, msg, progressData.download_url)
          }else{
            msg.reply(`Carregando o arquivo! Está em ${progressData.progress}%`);
          }
        } catch (error) {
          clearInterval(pollInterval);
          msg.reply('Erro ao verificar progresso: ' + error.message);
        }
      }, 5000); // Verifica a cada 5 segundos

    } catch (error) {
      msg.reply('Erro ao chamar a API: ' + error.message);
    }
}

// Função para atualizar a API key no config.json
function updateApiKey(bot, msg, commands) {
    const args = msg.content.trim().split(/\s+/);
  
    config.OCEAN_SAVER_API_KEY = args[1];
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    msg.channel.send('API key atualizada com sucesso.')
}

async function run(bot, msg) {
    return await Utils.executeCommand(bot, msg, commands)
}

function canHandle(bot, msg) {
    return Utils.containsCommand(msg, commands)
}

function helpComand(bot, msg) {
    return Object.values(commands)
        .map(value => value.help)
        .filter(value => value != null)
}

module.exports = {
    run, canHandle, helpComand
}