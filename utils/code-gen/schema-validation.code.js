const _ = require('lodash');

function genrateCode(config) {
	let schema = config.definition;
	if (typeof schema === 'string') {
		schema = JSON.parse(schema);
	}
	const code = [];

	code.push('const fs = require(\'fs\');');
	code.push('const log4js = require(\'log4js\');');
	code.push('const AJV = require(\'ajv\');');
	code.push('const _ = require(\'lodash\');');
	code.push('');
	// code.push('const config = require(\'../../config\');');
	// code.push('const commonUtils = require(\'../../utils/common.utils\');');
	// code.push('const transValidation = require(\'./trans-validation\');');
	code.push('');
	code.push('const logger = log4js.getLogger(global.loggerName);');
	code.push('const schemaValidator = new AJV();');

	code.push('/**');
	code.push(' * @param {*} data The data to be validated');
	code.push(' * @returns {object[]} Returns related data payloads');
	code.push(' */');
	code.push('function validateSchema(data) {');
	code.push(`\tconst schema_${config._id} = fs.readFileSync('./schema.json');`);
	code.push(`\tconst validator = schemaValidator.compile(schema_${config._id});`);
	code.push('\tconst valid = validator(data)');
	code.push('\tif (!valid) {');
	code.push('\t\tlogger.debug(\'Validation Errors:\');');
	code.push('\t\tlogger.debug(validator.errors);');
	code.push('\t\treturn validator.errors;');
	code.push('\t}');
	code.push('\treturn false;');
	code.push('}');
	code.push('');



	/**------------------------ EXPORTS ----------------------- */

	/**------------------------ METHODS ----------------------- */
	code.push('module.exports.validateSchema = validateSchema;');

	return code.join('\n');
}


module.exports.genrateCode = genrateCode;