const express = require('express'),
    config = require('./config'),
    cluster = require('cluster');


const startServer = () =>{
    config.init()
        .then(() => {
            if(cluster.isMaster){
                const workers = config.getSettings().workers;
                console.log('starting ' + workers + ' workers.');
                for(let i = 0; i < workers; i++){
                    cluster.fork();
                }
            }else{
                const app = express();
                config.initExpress(app);
                require('./api').loadRoutes(app);
            }
        })
        .catch((err) => {
            if (err) {
                console.error('init', err);
                throw err;
            }
        });
};

startServer();













