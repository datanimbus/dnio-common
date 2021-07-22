if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const fs = require('fs');
const path = require('path');
const https = require('https');
const log4js = require('log4js');
const express = require('express');

const config = require('./config');
const dbFactory = require('./db-factory');
const preProcessor = require('./utils/pre-processor.utils');

const LOGGER_NAME = config.isK8sEnv() ? `[${config.hostname}] [COMMON v${config.imageTag}]` : `[COMMON v${config.imageTag}]`
const logger = log4js.getLogger(LOGGER_NAME);
logger.level = process.env.LOG_LEVEL || 'info';

// global.logger = logger;

const app = express();

app.use(express.json({ inflate: true }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    logger.info(req.method, req.path, req.query);
    next();
});

app.use(preProcessor.patchUserData);

app.use('/api/common', require('./routes'));

app.listen(config.port, () => {
    logger.info('HTTP Server Listening on PORT:', config.port);
});

https.createServer({
    cert: fs.readFileSync(path.join(process.cwd(), 'keys', 'txn.crt')),
    key: fs.readFileSync(path.join(process.cwd(), 'keys', 'txn.key'))
}, app).listen(config.httpsPort, () => {
    logger.info('HTTPs Server Listening on PORT:', config.httpsPort);
});
