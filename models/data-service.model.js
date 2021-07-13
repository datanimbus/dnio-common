const { MongoClient } = require('mongodb');
const log4js = require('log4js');
const config = require('../config');

const logger = log4js.getLogger(global.loggerName);

async function patchOldRecord(payload) {
    if (!(payload.operation === 'PUT' || payload.operation === 'DELETE')) {
        return payload;
    }
    const dbname = config.namespace + '-' + payload.app;
    const client = await MongoClient.connect(config.mongoDataUrl, config.mongoDataOptions);
    logger.info('Connected to ', dbname);
    const dataDB = client.db(dbname);
    const collection = dataDB.collection(payload.dataService.collectionName);
    try {
        const doc = await collection.findOne({ _id: payload.data._id });
        if (doc) {
            payload.oldData = doc;
        }
        return payload;
    } catch (err) {
        logger.error(err);
        throw err;
    } finally {
        client.close(true);
    }
}


async function findOneService(filter) {
    try {
        const record = await global.authorDB.collection('services').findOne(filter);
        return record;
    } catch (err) {
        logger.error(err);
        throw err;
    }
};
async function findAllService(filter) {
    try {
        const records = await global.authorDB.collection('services').find(filter).toArray()
        return records;
    } catch (err) {
        logger.error(err);
        throw err;
    }
};


module.exports = {
    findOneService,
    findAllService,
    patchOldRecord
};