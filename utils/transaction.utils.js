const { MongoClient } = require('mongodb');
const log4js = require('log4js');

const config = require('../config');

const logger = log4js.getLogger(global.loggerName);


async function executeTransaction(payload) {
    const dbname = config.namespace + '-' + payload.app;
    const client = await MongoClient.connect(config.mongoDataUrl, config.mongoDataOptions);
    logger.info('Connected to ', dbname);
    const dataDB = client.db(dbname);
    let session;
    try {
        session = client.startSession();
        session.startTransaction(config.transactionOptions);
        let promises = payload.body.map(async (item) => {
            try {
                let status;
                if (item.operation === 'POST') {
                    status = await dataDB.collection(item.dataService.collectionName).insert(item.data, { session });
                } else if (item.operation === 'PUT') {
                    status = await dataDB.collection(item.dataService.collectionName).findOneAndUpdate({ _id: item.data._id }, item.data, { session, upsert: item.upsert });
                } else if (item.operation === 'DELETE') {
                    status = await dataDB.collection(item.dataService.collectionName).findOneAndDelete({ _id: item.data._id }, { session });
                }
                return { statusCode: 200, body: status };
            } catch (err) {
                logger.error(err);
                return { statusCode: 400, body: err };
            }
        });
        promises = await Promise.all(promises);
        if (!promises.every(e => e.statusCode == 200)) {
            await session.abortTransaction();
            logger.error('Transaction Aborted');
        } else {
            await session.commitTransaction();
        }
        return promises;
    } catch (e) {
        logger.error('Transaction Error ', e);
        session.abortTransaction();
        logger.error('Transaction Aborted');
        logger.error('Error in  executeTransaction :: ', e);
        throw e;
    } finally {
        session.endSession();
        logger.info('Session Ended ', dbname);
        client.close(true);
        logger.info('Disconnected ', dbname);
    }
}

module.exports.executeTransaction = executeTransaction;