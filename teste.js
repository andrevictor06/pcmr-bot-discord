const path = require('path')

console.log(path.isAbsolute('audio.mp3'))
console.log(path.isAbsolute(path.resolve('/audio')))