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
global.activeRequest = 0;

// global.logger = logger;

const app = express();

app.use(express.json({ inflate: true, limit: config.MaxJSONSize }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    if (req.path.split('/').indexOf('live') == -1 && req.path.split('/').indexOf('ready') == -1) {
        logger.info(req.method, req.path, req.query);
        logger.trace(`[${req.get(global.txnIdHeader)}] req.path : ${req.path}`);
        logger.trace(`[${req.get(global.txnIdHeader)}] req.headers : ${JSON.stringify(req.headers)} `);
    }
    global.activeRequest++;
    res.on('close', function () {
        global.activeRequest--;
        if (req.path.split('/').indexOf('live') == -1 && req.path.split('/').indexOf('ready') == -1) {
            logger.debug(`[${req.get(global.txnIdHeader)}] Request completed for ${req.originalUrl}`);
        }
    });
    next();
});

app.use(preProcessor.patchUserData);

app.use('/api/common', require('./routes'));

const server = app.listen(config.port, () => {
    logger.info('HTTP Server Listening on PORT:', config.port);
});

const httpsServer = https.createServer({
    cert: fs.readFileSync(path.join(process.cwd(), 'keys', 'txn.crt')),
    key: fs.readFileSync(path.join(process.cwd(), 'keys', 'txn.key'))
}, app).listen(config.httpsPort, () => {
    logger.info('HTTPs Server Listening on PORT:', config.httpsPort);
});


process.on('SIGTERM', () => {
    try {
        // Handle Request for 15 sec then stop recieving
        setTimeout(() => {
            global.stopServer = true;
        }, 15000);
        logger.info('Process Kill Request Recieved');
        const intVal = setInterval(() => {
            // Waiting For all pending requests to finish;
            if (global.activeRequest === 0) {
                // Closing Express Server;
                httpsServer.close(() => {
                    logger.info('HTTPs Server Stopped.');
                });
                server.close(() => {
                    logger.info('HTTP Server Stopped.');
                    process.exit(0);
                });
                clearInterval(intVal);
            } else {
                logger.info('Waiting for request to complete, Active Requests:', global.activeRequest);
            }
        }, 2000);
    } catch (e) {
        logger.error('SIGTERM Handler', e);
        process.exit(0);
    }
});