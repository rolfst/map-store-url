const Promise = require('bluebird');
const allSettings = require('./settings');
const bodyParser = require('body-parser');
const compression = require('compression');
const _ = require('lodash');
const redis = require('metrological-redis');
const redisInit = Promise.promisify(redis.init, {context: redis});
const fs = require('fs');
const expressRequestLogger = require('express-request-logger');
let settings = {}, env, elasticsearch;

const init = () => {
    env = process.env.NODE_ENV || 'dev';

    let baseSettings = allSettings['all'];
    let envSettings = null;

    if(allSettings[env])
        envSettings = allSettings[env];
    else{
        envSettings = allSettings.dev;
        env = 'dev';
    }

    settings = _.merge(baseSettings, envSettings);


    const log4js = require('log4js');

    if(settings.log4js) {
        log4js.configure(settings.log4js);
    }

    return redisInit(null);
};


const initExpress = (app) => {
    app.use(compression());
    app.use(bodyParser.json());
    app.disable('x-powered-by');

    //trust nginx ssl certs
    app.enable('trust proxy');
    if(settings.forceSSL)
        app.use((req,res,next) => {
            //send 403 if not ssl
            if(!req.secure)
                res.send(403);
            else
                next();
        });

    // Add express request logging.
    expressRequestLogger.configure(
        app,
        {projectName: "connect"}
    );

    app.use((req, res, next) => {
        if (res.rLog) {
            if (req.url == '/' && req.method == 'GET') {
                // Ignore nagios calls.
                res.rLog.ignore();
            }
        }
        next();
    });

    const port = settings.port;
    server = app.listen(port,() => {
        console.info('Listening on ' + port);
    }).on('error', (e) => {
        console.error(e);
    });

    process.on('uncaughtException', (exception) => {
        const os = require('os');
        const interfaces = os.networkInterfaces();
        const addresses = [];
        _.forEach(interfaces, (k) => {
            _.forEach(interfaces[k], (k2) =>{
                const address = interfaces[k][k2];
                if (address.family === 'IPv4' && !address.internal) {
                    addresses.push(address.address);
                }
            })
        })

        console.error('uncaughtException', addresses, exception);
        throw exception;
    });


    //init db's
    getElasticsearch();

};


const getSettings = () => {
    return settings;
};

const getEnv = () => {
    return env;
};

const getOperators = function(){
  return settings.operators || [];
};

const getCountryWhitelist = function(){
    return settings.countryWhitelist || [];
};

const getElasticsearch = function(){
    if(elasticsearch)
        return elasticsearch;

    const client = require('elasticsearch');
    elasticsearch = new client.Client(settings.esCluster);
    return elasticsearch;
};



module.exports = {
    getSettings: getSettings,
    init: init,
    initExpress: initExpress,
    getEnv: getEnv,
    getOperators: getOperators,
    getCountryWhitelist: getCountryWhitelist,
    getElasticsearch: getElasticsearch
};
