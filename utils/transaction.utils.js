const { MongoClient } = require('mongodb');
const log4js = require('log4js');

const config = require('../config');

const logger = log4js.getLogger(global.loggerName);


async function executeTransaction(payload) {
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
                if (item.operation === 'POST') {
                    status = await dataDB.collection(item.dataService.collectionName).insert(item.data, { session });
                } else if (item.operation === 'PUT') {
                    let id = item.data._id;
                    delete item.data._id;
                    status = await dataDB.collection(item.dataService.collectionName).findOneAndUpdate({ _id: id }, { $set: item.data }, { session, upsert: item.upsert });
                } else if (item.operation === 'DELETE') {
                    status = await dataDB.collection(item.dataService.collectionName).findOneAndDelete({ _id: item.data._id }, { session });
                }
                results.push({ statusCode: 200, body: status });
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