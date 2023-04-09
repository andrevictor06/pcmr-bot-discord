const path = require('path')
require('dotenv/config')
const { LocalStorage } = require('node-localstorage')
const server = require('./server')
const bot = require('./bot')

localStorage = new LocalStorage(path.resolve('.localstorage/'))
const botInstance = bot.init()
server.init(botInstance)