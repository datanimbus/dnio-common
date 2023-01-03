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
const cascadeCode = require('./cascade.code');

const logger = log4js.getLogger(global.loggerName);

const generatedCodePath = path.join(process.cwd(), 'generatedCode');
// mkdirp.sync(generatedCodePath);


async function generateCode(srvc, schemaValidator) {
    const serviceFolder = path.join(generatedCodePath, srvc._id + '_' + srvc.version);
    srvc.folderPath = serviceFolder;
    if (fs.existsSync(serviceFolder)) {
        schemaValidator.removeSchema(srvc._id);
        if (!schemaValidator.getSchema(srvc._id)) {
            schemaValidator.addSchema(require(path.join(srvc.folderPath, 'schema.json')), srvc._id);
        }
        logger.info('Code Exists :: Skipping Code Generation');
        return srvc;
    }
    removeOldFolder(srvc._id);
    logger.info('New Version :: Generating Code');
    mkdirp.sync(serviceFolder);
    const schemaJSON = schemaUtils.convertToJSONSchema(srvc);
    schemaValidator.removeSchema(srvc._id);
    schemaValidator.addSchema(schemaJSON, srvc._id);
    fs.writeFileSync(path.join(serviceFolder, 'schema.json'), JSON.stringify(schemaJSON, null, 2));
    fs.writeFileSync(path.join(serviceFolder, 'pre-hook.js'), preHookCode.genrateCode(srvc));
    fs.writeFileSync(path.join(serviceFolder, 'pre-validation.js'), preValidationCode.genrateCode(srvc));
    fs.writeFileSync(path.join(serviceFolder, 'post-hook.js'), postHookCode.genrateCode(srvc));
    fs.writeFileSync(path.join(serviceFolder, 'cascade-payload.js'), cascadeCode.genrateCode(srvc));
    fs.writeFileSync(path.join(serviceFolder, 'trans-validation.js'), await transValidationCode.genrateCode(srvc));
    return srvc;
}


function removeOldFolder(srvcId) {
    const folderList = fs.readdirSync(generatedCodePath);
    const folderToDelete = folderList.find(e => e.startsWith(srvcId));
    if (folderToDelete) {
        logger.info('New Version :: Cleaning Old Code');
        fs.rmSync(path.join(generatedCodePath, folderToDelete), { recursive: true, force: true });
    }
}


function cleanGeneratedFiles() {
    const folderList = fs.readdirSync(generatedCodePath);
    folderList.forEach(folder => {
        fs.rmSync(path.join(generatedCodePath, folder), { recursive: true, force: true });
    });
}

module.exports.generateCode = generateCode;
module.exports.cleanGeneratedFiles = cleanGeneratedFiles;
module.exports.removeOldFolder = removeOldFolder;