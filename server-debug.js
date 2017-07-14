const express = require('express'),
    config = require('./config');


const startServer = () => {
    const app = express();
    config.init()
    .then(() => {
        config.initExpress(app);
        require('./api').loadRoutes(app);
    })
    .catch((err) => {
        console.error('init', err);
    });
};

startServer();

