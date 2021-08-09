const path = require('path');
const { MongoClient } = require('mongodb');
const log4js = require('log4js');
const _ = require('lodash');

const config = require('../config');

const logger = log4js.getLogger(global.loggerName);


async function executeTransaction(req, payload) {
    const dbname = config.namespace + '-' + payload.app;
    const client = await MongoClient.connect(config.mongoDataUrl, config.mongoDataOptions);
    logger.info('Connected to DB : ', dbname);
    const dataDB = client.db(dbname);
    let session;
    try {
        session = client.startSession();
        logger.info('Session Started : ', dbname);
        session.startTransaction(config.transactionOptions);
        const results = [];
        await payload.body.reduce(async (prev, item) => {
            try {
                await prev;
                let status;
                let result;
                let id = item.data._id;
                item.data._metadata = {
                    deleted: false,
                    lastUpdated: new Date(),
                    version: {
                        release: config.release
                    }
                };
                if (item.operation === 'POST') {
                    item.data._metadata.createdAt = new Date();
                    item.data._metadata.version.document = 1;
                    status = await dataDB.collection(item.dataService.collectionName).insert(item.data, { session });
                    id = status.insertedIds['0'];
                } else if (item.operation === 'PUT') {
                    delete item.data._id;
                    const oldData = await dataDB.collection(item.dataService.collectionName).findOne({ _id: id }, { session });
                    item.oldData = JSON.parse(JSON.stringify(oldData));
                    item.data = _.merge(oldData, item.data);
                    status = await dataDB.collection(item.dataService.collectionName).findOneAndUpdate({ _id: id }, { $set: item.data }, { session, upsert: item.upsert });
                    status = await dataDB.collection(item.dataService.collectionName).findOneAndUpdate({ _id: id }, { $inc: { '_metadata.version.document': 1 } }, { session, returnDocument: 'after' });
                } else if (item.operation === 'DELETE') {
                    status = await dataDB.collection(item.dataService.collectionName).findOneAndDelete({ _id: item.data._id }, { session });
                }
                if (item.operation === 'POST') {
                    result = await dataDB.collection(item.dataService.collectionName).findOne({ _id: id }, { session });
                    item.newData = result;
                } else if (item.operation === 'PUT') {
                    result = status.value;
                    item.newData = result;
                } else {
                    result = { message: 'Docuemnt Deleted Successfully' };
                    item.newData = null;
                }
                results.push({ statusCode: 200, body: result });
            } catch (err) {
                logger.error(err);
                if (err && typeof err === 'object') {
                    results.push({ statusCode: 400, body: err.message });
                } else {
                    results.push({ statusCode: 400, body: err });
                }
            } finally {
                return;
            }
        }, Promise.resolve());
        if (!results.every(e => e.statusCode == 200)) {
            await session.abortTransaction();
            logger.error('Transaction Aborted');
        } else {
            await session.commitTransaction();
            try {
                let promises = payload.body.map(item => require(path.join(item.dataService.folderPath, 'post-hook.js'))(req, item));
                promises = await Promise.all(promises);
                promises = null;
            } catch (err) {
                logger.error('Post-Hook Trigger :: ', err);
            }
        }
        return results;
    } catch (e) {
        logger.error('Transaction Error ', e);
        await session.abortTransaction();
        logger.error('Transaction Aborted');
        logger.error('Error in  executeTransaction :: ', e);
        throw e;
    } finally {
        session.endSession();
        logger.info('Session Ended : ', dbname);
        await client.close(true);
        logger.info('Disconnected DB : ', dbname);
    }
}

module.exports.executeTransaction = executeTransaction;