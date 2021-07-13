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


const app = express();
const logger = log4js.getLogger(global.loggerName);

app.use(express.json({ inflate: true }));
app.use(express.urlencoded({ extended: true }));

app.use(preProcessor.canDoTransaction);
app.use(preProcessor.initCodeGen);

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
