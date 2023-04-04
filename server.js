const express = require('express');
const spotifyRoutes = require('./routes/spotify');

function init(bot) {
    const app = express();

    initRoutes(app, bot);

    app.listen(process.env.SERVER_PORT, () => {
        console.log(`Server UP on port ${process.env.SERVER_PORT}`);
    });
}

function initRoutes(app, bot) {
    spotifyRoutes.init(bot);
    app.use('/spotify', spotifyRoutes.router);
}

module.exports = {
    init
}