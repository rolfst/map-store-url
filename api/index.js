const Promise = require('bluebird');
const _ = require('lodash');
const moment = require('moment');
const redis = require('metrological-redis');
const ExpressRedisFirewall = require('redis-ip-useragent-firewall');
const config = require('../config');
const settings = config.getSettings();
const redisReadClient = redis.getReadClient();
const redisWriteClient = redis.getWriteClient();
const readClient = Promise.promisifyAll(redisReadClient);
const writeClient = Promise.promisifyAll(redisWriteClient);

const loadRoutes = (app) => {
    app.post('/code', handleGenerateConnectCode);
    app.get('/code/:connectKey', handleConsumeConnectCode);

    app.all('*', (req,res) => res.status(404).end());
};

module.exports = {
    loadRoutes: loadRoutes
};

const generateKey = () => Date.now().toString().slice(settings.keySpace);

const storeInRedis = async (container) => {
    let key = generateKey();

    if(!container.connectKey){
        container.connectKey = key;
    }
    const allowedToWrite = await writeClient.setnxAsync(`${settings.connectRedisSequenceKey}-${key}`, JSON.stringify(container));
    if (allowedToWrite) {
		container.counter = moment().valueOf();
        await writeClient.expireAsync(`${settings.connectRedisSequenceKey}-${key}`, settings.connectKeyTTL);
        return container;
    }
    container.connectKey = null;

    return storeInRedis(container);
};

/* 
 * Handles the generation of a connect code.
 * @param request
 * @param response
 * @return object with connectKey and url
 */
const handleGenerateConnectCode = (request, response) => {
    const params = _.merge(request.query, request.body, request.params);
    const options = settings.firewallOptions;
    const fw = new ExpressRedisFirewall(redisReadClient, options);
    const isRequestAllowed = Promise.promisify(fw.middleware, {context: fw });
    let urlToStore = params.url;

    return isRequestAllowed(request, response)
        .then(() => {
            return storeInRedis({ url: urlToStore }).then((result) => response.json(result));
        })
        .catch((err) => {
            console.log(err);
            throw err;
        });
};

/**
 * Handles the return of a stored url 
 * @param request
 * @param response
 * @return object with url
 */
const handleConsumeConnectCode = (request, response) => {
    const params = _.merge(request.query, request.body, request.params);

    return readClient.getAsync(`${settings.connectRedisSequenceKey}-${params.connectKey}`)
        .then((container) => {
            if(!container) throw new Error('No url stored');

            return response.json(JSON.parse(container));
        })
        .catch((err) => response.status(404).send());
};

