const path = require('path');
const log4js = require('log4js');
const AJV = require('ajv');
const _ = require('lodash');

const roleModel = require('../models/role.model');
const dataServiceModel = require('../models/data-service.model');
const codeGen = require('./code-gen');

const logger = log4js.getLogger(global.loggerName);
const schemaValidator = new AJV();

async function patchUserData(req, res, next) {
    try {
        req.user = await roleModel.getUser(req);
        next();
    } catch (err) {
        logger.error('patchUserData :: ', err);
        res.status(500).json({ message: err.message });
    }
}

async function basicValidation(req, res, next) {
    try {
        let errors = [];
        req.body.forEach((item, index) => {
            if ((item.operation === 'PUT' || item.operation === 'DELETE')) {
                let isInvalid = true;
                if (item.filter && !_.isEmpty(item.filter)) {
                    isInvalid = false;
                }
                if (isInvalid) {
                    errors.push({ item, index, error: 'Filter was not provided for ' + item.operation + ' operation' });
                }
            }
            if (!item.data) {
                errors.push({ item, index, error: 'Data was not provided for ' + item.operation + ' operation' });
            }
            if (['PUT', 'POST', 'DELETE'].indexOf(item.operation) == -1) {
                errors.push({ item, index, error: 'Only PUT/POST/DELETE is supported in a transaction' });
            }
            if (!item.dataService) {
                errors.push({ item, index, error: 'Data Service was not provided' });
            } else if (!item.dataService.app) {
                errors.push({ item, index, error: 'Data Service App was not provided' });
            } else if (!item.dataService.name) {
                errors.push({ item, index, error: 'Data Service Name was not provided' });
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
                    if (!cacheMap[data.dataService.name]) {
                        cacheMap[data.dataService.name] = {};
                    }
                    if (typeof cacheMap[data.dataService.name].managePermission !== 'boolean') {
                        if (!(req.user && req.user.isSuperAdmin)) {
                            cacheMap[data.dataService.name].managePermission = await roleModel.hasManagePermission(req, data.dataService);
                        } else {
                            cacheMap[data.dataService.name].managePermission = true;
                        }
                    }
                    if (typeof cacheMap[data.dataService.name].workflowEnabled !== 'boolean') {
                        cacheMap[data.dataService.name].workflowEnabled = await roleModel.isPreventedByWorkflow(req, data.dataService);
                    }
                    managePermission = (cacheMap[data.dataService.name].managePermission || false);
                    workflowEnabled = (cacheMap[data.dataService.name].workflowEnabled || false);
                    logger.debug(`Manage Permission :: ${managePermission} :: Workflow Enabled :: ${workflowEnabled}`);
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
            if (all.some(e => e.workflowEnabled)) {
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
    const servicesFilter = _.uniqBy(req.body.map(e => e.dataService), 'name');
    let services;
    try {
        logger.debug('Filter To Search Services :', servicesFilter);
        services = await dataServiceModel.findAllService({ $or: servicesFilter });
        if (servicesFilter.length !== services.length) {
            return res.status(400).json({ message: 'One or more data services are invalid' });
        }
        if (!services.every(e => e.status == 'Active')) {
            return res.status(400).json({ message: 'One or more data services are offline' });
        }
        logger.debug('Services Found:', services.length);
        logger.trace('Services :', services);
        const allServiceIds = _.uniq(_.concat(services.map(e => e._id), _.flattenDeep(services.map(e => (e.relatedSchemas.outgoing || []).map(eo => eo.service)))));

        /**
         * @description Make another DB call only if relation exists.
         */
        if (allServiceIds.length != servicesFilter.length) {
            services = await dataServiceModel.findAllService({ _id: { $in: allServiceIds } });
        }

        const all = [];
        await services.reduce(async (prev, srvc) => {
            await prev;
            const temp = await codeGen.generateCode(srvc, schemaValidator);
            all.push(temp);
            return;
        }, Promise.resolve());
        logger.trace('After Code Gen :', all);
        let app;
        let promises = req.body.map(async (e) => {
            const temp = [];
            const srvc = _.find(all, e.dataService);
            logger.debug('Service Filetred :', srvc);
            e.dataService = _.cloneDeep(srvc);
            app = srvc.app;
            temp.push(e);
            if (srvc.relatedSchemas.outgoing && srvc.relatedSchemas.outgoing.length > 0) {
                const payloads = await require(path.join(srvc.folderPath, 'cascade-payload.js')).createCascadePayload(req, e.data);
                payloads.forEach(pl => {
                    const t = all.find(s => s._id === pl.dataService);
                    pl.dataService = t;
                    temp.push(pl);
                });
            }
            return temp;
        });
        promises = await Promise.all(promises);
        const body = _.flatten(promises);
        req.body = { body, app };
        next();
    } catch (err) {
        services.map(e => codeGen.removeOldFolder(e));
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
        logger.error('preHookValidation :: ', err);
        res.status(500).json({ message: err.message });
    }
}

async function schemaValidation(req, res, next) {
    try {
        function cleanData(item) {
            delete item.oldData;
            delete item.temp;
            const srvcId = item.dataService._id;
            const srvcName = item.dataService.name;
            const srvcApp = item.dataService.app;
            delete item.dataService;
            item.dataService = {
                _id: srvcId,
                name: srvcName,
                app: srvcApp
            };
        }
        const errors = [];
        let promises = req.body.body.map(async (item) => {
            const temp = await dataServiceModel.patchOldRecord(item);
            if (temp.oldData) {
                let tempOldData = JSON.parse(JSON.stringify(temp.oldData));
                item.data = _.merge(temp.oldData, item.data);
                temp.oldData = tempOldData;
            }
            if (item.operation === 'PUT' && !item.upsert && !temp.oldData) {
                logger.info('Clean Data Called for Upsert Flag');
                cleanData(item);
                errors.push({ item, errors: { message: 'Document does not exists.' } });
            }

            logger.trace('Schema Validation', item);

            // State Model Code
            if (item.dataService.stateModel && item.dataService.stateModel.enabled) {
                let newStateValue = _.get(item.data, item.dataService.stateModel.attribute);
                if (item.operation === 'POST') {
                    if (newStateValue && !item.dataService.stateModel.initialStates.includes(newStateValue)) {
                        cleanData(item);
                        errors.push({ item, errors: { message: 'Record is not in initial state.' } });
                    }
                    if (!newStateValue) {
                        _.set(item.data, item.dataService.stateModel.attribute, item.dataService.stateModel.initialStates[0]);
                    }
                }

                if (item.operation === 'PUT') {
                    if (!temp.oldData) {
                        if (newStateValue && !item.dataService.stateModel.initialStates.includes(newStateValue)) {
                            logger.info('Clean Data Called for initialStates');
                            cleanData(item);
                            errors.push({ item, errors: { message: 'Record is not in initial state.' } });
                        }
                        if (!newStateValue) {
                            _.set(item.data, item.dataService.stateModel.attribute, item.dataService.stateModel.initialStates[0]);
                        }
                    } else {
                        let oldStateValue = _.get(temp.oldData, item.dataService.stateModel.attribute);
                        let oldState = item.dataService.stateModel.states[oldStateValue];
                        if (newStateValue != oldStateValue && (!oldState || !oldState.includes(newStateValue))) {
                            logger.info('Clean Data Called For State transition');
                            cleanData(item);
                            errors.push({ item, errors: { message: 'State transition is not allowed.' } });
                        }
                    }
                }
            }
            // let flag = schemaValidator.validate(require(path.join(item.dataService.folderPath, 'schema.json')), item.data);
            // let flag = schemaValidator.validate(schemaValidator.getSchema(item.dataService._id).schema, item.data);
            // if (!flag) {
            //     cleanData(item);
            //     logger.debug('Validation Error Messages:');
            //     logger.debug(JSON.stringify(errors));
            //     errors.push({ item, errors: schemaValidator.errors.map(e => e.message) });
            // }

            // let validationErrors = require(path.join(item.dataService.folderPath, 'schema-validation.js')).validateSchema(item.data);
            // if (validationErrors) {
            //     cleanData(item);
            //     logger.debug('Validation Error Messages:');
            //     logger.debug(JSON.stringify(validationErrors));
            //     errors.push({ item, errors: validationErrors.map(e => e.message) });
            // }

            let validationErrors = await require(path.join(item.dataService.folderPath, 'model-validation.js')).validateModel(item.data);
            if (validationErrors && validationErrors.errors) {
                logger.info('Clean Data Called at validationErrors');
                cleanData(item);
                logger.debug('Validation Error Messages:');
                logger.debug(JSON.stringify(validationErrors));
                errors.push({ item, errors: validationErrors.errors });
            }

            return item;
        });
        promises = await Promise.all(promises);
        if (errors && errors.length > 0) {
            return res.status(400).json({ errors, message: 'Schema Validation Failed' });
        }
        next();
    } catch (err) {
        logger.error('schemaValidation :: ', err);
        res.status(500).json({ message: err.message });
    }
}

async function specialFieldsValidation(req, res, next) {
    try {
        let promises = req.body.body.map(item => require(path.join(item.dataService.folderPath, 'pre-validation.js'))(req, item));
        promises = await Promise.all(promises);
        if (!_.isEmpty(promises.filter(e => e))) {
            return res.status(400).json({ message: 'Validation Error', errors: promises });
        }
        promises = null;
        next();
    } catch (err) {
        logger.error('specialFieldsValidation :: ', err);
        res.status(500).json({ message: err.message });
    }
}

module.exports = {
    patchUserData,
    basicValidation,
    initCodeGen,
    canDoTransaction,
    preHookValidation,
    schemaValidation,
    specialFieldsValidation
};