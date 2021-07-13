
const log4js = require('log4js');
const roleModel = require('../models/role.model');
const dataServiceModel = require('../models/data-service.model');
const codeGen = require('./code-gen');

const logger = log4js.getLogger(global.loggerName);

async function canDoTransaction(req, res, next) {
    let cacheMap = {};
    try {
        const body = req.body;
        if (Array.isArray(body)) {
            const all = await Promise.all(body.map(async (data) => {
                try {
                    let managePermission;
                    let workflowEnabled;
                    if (!cacheMap[data.serviceId]) {
                        cacheMap[data.serviceId].managePermission = await roleModel.hasManagePermission(req, { _id: data.serviceId });
                        cacheMap[data.serviceId].workflowEnabled = await roleModel.isPreventedByWorkflow(req, { _id: data.serviceId });
                    }
                    managePermission = cacheMap[data.serviceId].managePermission;
                    workflowEnabled = cacheMap[data.serviceId].workflowEnabled;
                    return {
                        serviceId: data.serviceId,
                        managePermission,
                        workflowEnabled
                    };
                } catch (err) {
                    logger.error('hasManagePermission', data.serviceId, err);
                    return {
                        serviceId: data.serviceId,
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
        const services = await dataServiceModel.findAllService({ _id: { $in: req.body.map(e => e.serviceId) } });
        const all = await Promise.all(services.map((srvc) => codeGen.generateCode(srvc)));
        next();
    } catch (err) {
        logger.error('initCodeGen :: ', err);
        res.status(500).json({ message: err.message });
    }
}


module.exports = {
    initCodeGen,
    canDoTransaction
};