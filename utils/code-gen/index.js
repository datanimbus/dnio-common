const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const log4js = require('log4js');;

const config = require('../../config');
const schemaUtils = require('../schema.utils');
const preValidationCode = require('./pre-validation.code');
const preHookCode = require('./pre-hook.code');
const postHookCode = require('./post-hook.code');
const transValidationCode = require('./trans-validation.code');

const logger = log4js.getLogger(global.loggerName);

const generatedCodePath = path.join(process.cwd(), 'generatedCode');
mkdirp.sync(generatedCodePath);


function generateCode(srvc) {
    const serviceFolder = path.join(generatedCodePath, srvc._id + '_' + srvc.version);
    if (fs.existsSync(serviceFolder)) {
        logger.info('Code Exists :: Skipping Code Generation');
        return null;
    }
    removeOldFolder(srvc);
    logger.info('New Version :: Generating Code');
    mkdirp.sync(serviceFolder);
    fs.writeFileSync(path.join(serviceFolder, 'schema.json'), JSON.stringify(schemaUtils.convertToJSONSchema(srvc.definition), null, 2));
    fs.writeFileSync(path.join(serviceFolder, 'pre-hook.js'), preHookCode.genrateCode(srvc));
    fs.writeFileSync(path.join(serviceFolder, 'pre-validation.js'), preValidationCode.genrateCode(srvc));
    fs.writeFileSync(path.join(serviceFolder, 'post-hook.js'), postHookCode.genrateCode(srvc));
}


function removeOldFolder(srvc) {
    const folderList = fs.readdirSync(generatedCodePath);
    const folderToDelete = folderList.find(e => e.startsWith(srvc._id));
    if (folderToDelete) {
        logger.info('New Version :: Cleaning Old Code');
        fs.rmSync(path.join(generatedCodePath, folderToDelete), { recursive: true, force: true });
    }
}


module.exports.generateCode = generateCode;