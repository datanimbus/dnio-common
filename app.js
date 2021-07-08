if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const fs = require('fs');
const path = require('path');
const log4js = require('log4js');
const express = require('express');

const config = require('./config');



const app = express();
const logger = log4js.getLogger();

app.use(express.json({ inflate: true }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/common', require('./routes'));

app.listen(config.port, () => {
    logger.info('HTTP Server Listening on PORT:', config.port);
});
