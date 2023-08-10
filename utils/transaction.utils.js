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
        let results = [];
        await payload.body.reduce(async (prev, item) => {
            let oneResult = { temp: (item.temp || false) };
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
                // if (item.operation === 'POST' || item.operation === 'PUT') {
                //     await require(path.join(item.dataService.folderPath, 'trans-validation.js')).createCascadeData(req, item, dataDB, session);
                // }
                const errors = await require(path.join(item.dataService.folderPath, 'trans-validation.js')).validateUnique(req, item.data, item.oldData, dataDB, session);
                if (errors) {
                    throw { message: errors };
                }
                if (item.operation === 'POST') {
                    item.data._metadata.createdAt = new Date();
                    item.data._metadata.version.document = 1;
                    status = await dataDB.collection(item.dataService.collectionName).insert(item.data, { session });
                    id = status.insertedIds['0'];
                } else if (item.operation === 'PUT') {
                    delete item.data._id;
                    // const oldData = await dataDB.collection(item.dataService.collectionName).findOne({ _id: id }, { session });
                    // item.oldData = JSON.parse(JSON.stringify(oldData));
                    item.data = _.merge(item.oldData, item.data);
                    require(path.join(item.dataService.folderPath, 'trans-validation.js')).validateCreateOnly(req, item.data, item.oldData);
                    if (_.has(item.data, '$inc') || _.has(item.data, '$mul')) {
                        status = await dataDB.collection(item.dataService.collectionName).findOneAndUpdate({ _id: id, '_metadata.version.document': item.oldData._metadata.version.document }, item.data, { session });
                    } else {
                        status = await dataDB.collection(item.dataService.collectionName).findOneAndUpdate({ _id: id, '_metadata.version.document': item.oldData._metadata.version.document }, { $set: item.data }, { session, upsert: item.upsert });
                    }
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
                oneResult.statusCode = 200;
                oneResult.body = result;
            } catch (err) {
                logger.error(err);
                if (err && typeof err === 'object') {
                    oneResult.statusCode = 400;
                    oneResult.body = { message: err.message };
                } else {
                    oneResult.statusCode = 400;
                    oneResult.body = { message: err };
                }
            } finally {
                results.push(oneResult);
                return;
            }
        }, Promise.resolve());
        if (!results.every(e => e.statusCode == 200)) {
            await session.abortTransaction();
            results = results.map(e => {
                let temp = e;
                if (e.statusCode == 200) {
                    temp.body = { message: 'Operation Aborted' }
                }
                return temp;
            });
            logger.error('Transaction Aborted');
        } else {
            let promises = payload.body.filter(e => !e.temp).map(item => require(path.join(item.dataService.folderPath, 'trans-validation.js')).validateRelation(req, item, dataDB, session));
            promises = await Promise.all(promises);
            if (promises.filter(e => e).length > 0) {
                results = promises.filter(e => e).map(e => { return { statusCode: 400, body: e }; });
                await session.abortTransaction();
                logger.error('Transaction Aborted');
            } else {
                await session.commitTransaction();
                try {
                    promises = payload.body.map(item => require(path.join(item.dataService.folderPath, 'post-hook.js'))(req, item));
                    promises = await Promise.all(promises);
                    promises = null;
                } catch (err) {
                    logger.error('Post-Hook Trigger :: ', err);
                }
            }
        }
        return results.filter(e => !e.temp).map(e => {
            delete e.temp;
            return e;
        });
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