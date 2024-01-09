const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const log4js = require('log4js');

const schemaUtils = require('../schema.utils');
const definitionUtils = require('../definition.utils');
const preValidationCode = require('./pre-validation.code');
const preHookCode = require('./pre-hook.code');
const postHookCode = require('./post-hook.code');
const transValidationCode = require('./trans-validation.code');
const cascadeCode = require('./cascade.code');
const schemaValidationCode = require('./schema-validation.code');
const modelValidationCode = require('./model.code');
const globalDefHelper = require('./globalDefinitionHelper');

const logger = log4js.getLogger(global.loggerName);

const generatedCodePath = path.join(process.cwd(), 'generatedCode');
// mkdirp.sync(generatedCodePath);


async function generateCode(srvc, schemaValidator) {
	const serviceFolder = path.join(generatedCodePath, srvc._id + '_' + srvc.version);
	srvc.folderPath = serviceFolder;
	logger.info('Folder Path Configured:', srvc.folderPath);
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
	srvc['definition'] = globalDefHelper(srvc);
	const schemaJSON = schemaUtils.convertToJSONSchema(srvc);
	const schemaDefinition = definitionUtils.generateDefinition(srvc);
	schemaValidator.removeSchema(srvc._id);
	schemaValidator.addSchema(schemaJSON, srvc._id);
	fs.writeFileSync(path.join(serviceFolder, 'definition.js'), schemaDefinition);
	fs.writeFileSync(path.join(serviceFolder, 'schema.json'), JSON.stringify(schemaJSON, null, 2));
	fs.writeFileSync(path.join(serviceFolder, 'pre-hook.js'), preHookCode.genrateCode(srvc));
	fs.writeFileSync(path.join(serviceFolder, 'pre-validation.js'), preValidationCode.genrateCode(srvc));
	fs.writeFileSync(path.join(serviceFolder, 'post-hook.js'), postHookCode.genrateCode(srvc));
	fs.writeFileSync(path.join(serviceFolder, 'cascade-payload.js'), cascadeCode.genrateCode(srvc));
	fs.writeFileSync(path.join(serviceFolder, 'schema-validation.js'), schemaValidationCode.genrateCode(srvc));
	fs.writeFileSync(path.join(serviceFolder, 'model-validation.js'), modelValidationCode.genrateCode(srvc));
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