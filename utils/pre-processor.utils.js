const path = require('path');
const log4js = require('log4js');
const AJV = require('ajv');
const _ = require('lodash');

const roleModel = require('../models/role.model');
const dataServiceModel = require('../models/data-service.model');
const codeGen = require('./code-gen');

const logger = log4js.getLogger(global.loggerName);
const schemaValidator = new AJV();


async function basicValidation(req, res, next) {
    try {
        let errors = [];
        req.body.forEach((item, index) => {
            if ((item.operation === 'PUT' || item.operation === 'DELETE') && !item.data._id) {
                errors.push({ item, index, error: 'ID was not provided for ' + item.operation + ' operation' });
            }
            if (['PUT', 'POST', 'DELETE'].indexOf(item.operation) == -1) {
                errors.push({ item, index, error: 'Only PUT/POST/DELETE is supported in a transaction' });
            }
            if (!item.dataService) {
                errors.push({ item, index, error: 'Data Service was not provided' });
            }
        });
        if (errors.length > 0) {
            return res.status(400).json({ errors, message: 'Payload Validation Failed' });
        }
        next();
    } catch (err) {
        logger.error('basicValidation :: ', err);
        res.status(500).json({ message: err.message });
    }
}


async function canDoTransaction(req, res, next) {
    let cacheMap = {};
    try {
        const body = req.body;
        if (Array.isArray(body)) {
            const all = await Promise.all(body.map(async (data) => {
                try {
                    let managePermission;
                    let workflowEnabled;
                    if (!cacheMap[data.dataService]) {
                        cacheMap[data.dataService].managePermission = await roleModel.hasManagePermission(req, { _id: data.dataService });
                        cacheMap[data.dataService].workflowEnabled = await roleModel.isPreventedByWorkflow(req, { _id: data.dataService });
                    }
                    managePermission = cacheMap[data.dataService].managePermission;
                    workflowEnabled = cacheMap[data.dataService].workflowEnabled;
                    return {
                        dataService: data.dataService,
                        managePermission,
                        workflowEnabled
                    };
                } catch (err) {
                    logger.error('hasManagePermission', data.dataService, err);
                    return {
                        dataService: data.dataService,
                        managePermission: false,
                        workflowEnabled: false
                    };
                }
            }));
            if (!all.every(e => e.managePermission)) {
                return res.status(400).json({ message: 'No manage permission in atleast one Data Service', errors: all });
            }
            if (!all.includes(e => e.workflowEnabled)) {
                return res.status(400).json({ message: 'Skip Review is required in one of the Data Service', errors: all });
            }
            next();
        } else {
            res.status(400).json({ message: 'Invalid Transaction Request Body' });
        }
    } catch (err) {
        logger.error('canDoTransaction :: ', err);
        res.status(500).json({ message: err.message });
    } finally {
        cacheMap = null;
    }
}

async function initCodeGen(req, res, next) {
    try {
        const serviceIds = _.uniq(req.body.map(e => e.dataService));
        const services = await dataServiceModel.findAllService({ _id: { $in: serviceIds } });
        if (serviceIds.length !== services.length) {
            return res.status(400).json({ message: 'One or more data service ID(s) are invalid' });
        }
        const all = await Promise.all(services.map((srvc) => codeGen.generateCode(srvc)));
        const body = req.body.map(e => {
            const srvc = services.find(s => s._id === e.dataService);
            e.dataService = srvc;
            return e;
        });
        req.body = { body, app: req.query.app };
        next();
    } catch (err) {
        logger.error('initCodeGen :: ', err);
        res.status(500).json({ message: err.message });
    }
}

async function preHookValidation(req, res, next) {
    try {
        let promises = req.body.body.map(item => require(path.join(item.dataService.folderPath, 'pre-hook.js'))(req, item));
        promises = await Promise.all(promises);
        req.body.body = promises;
        promises = null;
        next();
    } catch (err) {
        logger.error('initCodeGen :: ', err);
        res.status(500).json({ message: err.message });
    }
}

async function schemaValidation(req, res, next) {
    try {
        const errors = [];
        let promises = req.body.body.map(async (item) => {
            item.app = req.body.app;
            const temp = await dataServiceModel.patchOldRecord(item);
            if (temp.oldData) {
                item.data = _.merge(temp.oldData, item.data);
            }
            if (!schemaValidator.validate(require(path.join(item.dataService.folderPath, 'schema.json')), item.data)) {
                delete item.oldData;
                errors.push({ item, errors: schemaValidator.errors });
            }
            return item;
        });
        promises = await Promise.all(promises);
        if (errors && errors.length > 0) {
            return res.status(400).json({ errors, message: 'Schema Validation Failed' });
        }
        next();
    } catch (err) {
        logger.error('initCodeGen :: ', err);
        res.status(500).json({ message: err.message });
    }
}

async function specialFieldsValidation(req, res, next) {
    try {
        let promises = req.body.body.map(item => require(path.join(item.dataService.folderPath, 'pre-validation.js'))(req, item.data, item.oldData));
        promises = await Promise.all(promises);
        if (!_.isEmpty(promises.filter(e => e))) {
            return res.status(400).json({ message: 'Validation Error', errors: promises });
        }
        promises = null;
        next();
    } catch (err) {
        logger.error('initCodeGen :: ', err);
        res.status(500).json({ message: err.message });
    }
}


module.exports = {
    basicValidation,
    initCodeGen,
    canDoTransaction,
    preHookValidation,
    schemaValidation,
    specialFieldsValidation
};