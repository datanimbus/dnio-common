const _ = require('lodash');

const dataServiceModel = require('../../models/data-service.model');

async function genrateCode(config) {
	let schema = config.definition;
	if (typeof schema === 'string') {
		schema = JSON.parse(schema);
	}
	const relatedServiceIds = _.uniq(config.relatedSchemas.outgoing.map(e => e.service));
	const code = [];

	code.push('const log4js = require(\'log4js\');');
	code.push('const _ = require(\'lodash\');');
	code.push('');
	code.push('const config = require(\'../../config\');');
	code.push('');
	code.push('const logger = log4js.getLogger(global.loggerName);');
	code.push('const serviceFunctionMap = {};');

	relatedServices = await dataServiceModel.findAllService({ _id: { $in: relatedServiceIds } });

	code.push(`serviceFunctionMap['USER'] = async function(req, id, dataDB, session) {`);
	code.push(`\ttry {`);
	code.push(`\t\tlet doc = await global.authorDB.collection('userMgmt.users').findOne({ _id: id });`);
	code.push(`\t\tif (doc) {`);
	code.push(`\t\t\tdoc._href = \`/api/a/rbac/user/\${doc._id}\`;`);
	code.push(`\t\t}`);
	code.push(`\t\treturn doc;`);
	code.push(`\t} catch (e) {`);
	code.push(`\t\tlogger.error('[serviceFunctionMap] [USER]', e);`);
	code.push(`\t\tthrow e;`);
	code.push(`\t}`);
	code.push(`};`);

	relatedServices.map(srvc => {
		code.push(`serviceFunctionMap['SRVC_${srvc._id}'] = async function(req, id, dataDB, session) {`);
		code.push(`\ttry {`);
		code.push(`\t\tlet doc = await dataDB.collection('${srvc.collectionName}').findOne({ _id: id }, { session });`);
		code.push(`\t\tif (doc) {`);
		code.push(`\t\t\tdoc._href = \`/api/c/${srvc.app}${srvc.api}/\${doc._id}\`;`);
		code.push(`\t\t}`);
		code.push(`\t\treturn doc;`);
		code.push(`\t} catch (e) {`);
		code.push(`\t\tlogger.error('[serviceFunctionMap] [SRVC_${srvc._id}]', e);`);
		code.push(`\t\tthrow e;`);
		code.push(`\t}`);
		code.push(`};`);
	});


	/**------------------------ CREATE ONLY ----------------------- */
	code.push('/**');
	code.push(' * @param {*} req The Incomming Request Object');
	code.push(' * @param {*} newData The New Document Object');
	code.push(' * @param {*} oldData The Old Document Object');
	code.push(' * @param {boolean} [forceRemove] Will remove all createOnly field');
	code.push(' * @returns {object | null} Returns null if no validation error, else and error object with invalid paths');
	code.push(' */');
	code.push('function validateCreateOnly(req, newData, oldData, forceRemove) {');
	code.push('\tconst errors = {};');
	code.push('\tif (oldData) {');
	parseSchemaForCreateOnly(schema);
	code.push('\t}');
	code.push('\treturn Object.keys(errors).length > 0 ? errors : null;');
	code.push('}');
	code.push('');

	/**------------------------ RELATION VALIDATION ----------------------- */
	code.push('/**');
	code.push(' * @param {*} req The Incomming Request Object');
	code.push(' * @param {*} newData The New Document Object');
	code.push(' * @param {*} oldData The Old Document Object');
	code.push(' * @returns {Promise<object>} Returns Promise of null if no validation error, else and error object with invalid paths');
	code.push(' */');
	code.push('async function validateRelation(req, item, dataDB, session) {');
	code.push('\tconst errors = {};');
	code.push('\tconst oldData = item.oldData;');
	code.push('\tconst newData = item.newData;');
	parseSchemaForRelation(schema);
	code.push('\treturn Object.keys(errors).length > 0 ? errors : null;');
	code.push('}');
	code.push('');



	/**------------------------ EXPORTS ----------------------- */

	/**------------------------ METHODS ----------------------- */
	code.push('module.exports.validateCreateOnly = validateCreateOnly;');
	code.push('module.exports.validateRelation = validateRelation;');


	return code.join('\n');
	// fs.writeFileSync(path.join(process.cwd(), `generated`, `special-fields.utils.js`), code.join(`\n`), `utf-8`);

	function parseSchemaForRelation(schema, parentKey) {
		schema.forEach(def => {
			let key = def.key;
			const path = parentKey ? parentKey + '.' + key : key;
			if (key != '_id' && def.properties) {
				if ((def.properties.relatedTo || def.type == 'User') && def.type != 'Array') {
					code.push(`\tlet ${_.camelCase(path + '._id')} = _.get(newData, '${path}._id')`);
					code.push(`\tif (${_.camelCase(path + '._id')}) {`);
					code.push('\t\ttry {');
					if (def.properties.relatedTo) {
						code.push(`\t\t\tconst doc = await serviceFunctionMap['SRVC_${def.properties.relatedTo}'](req, ${_.camelCase(path + '._id')}, dataDB, session);`);
					} else {
						code.push(`\t\t\tconst doc = await serviceFunctionMap['USER'](req, ${_.camelCase(path + '._id')}, dataDB, session);`);
					}
					code.push('\t\t\t\tif (!doc) {');
					code.push(`\t\t\t\t\terrors['${path}'] = ${_.camelCase(path + '._id')} + ' not found';`);
					code.push('\t\t\t\t} else {');
					code.push(`\t\t\t\t\t_.set(newData, '${path}._href', doc._href);`);
					code.push('\t\t\t\t}');
					code.push('\t\t} catch (e) {');
					code.push(`\t\t\terrors['${path}'] = e.message ? e.message : e;`);
					code.push('\t\t}');
					code.push('\t}');
				} else if (def.type == 'Object') {
					parseSchemaForRelation(def.definition, path);
				} else if (def.type == 'Array') {
					if (def.definition[0].properties.relatedTo || def.definition[0].type == 'User') {
						code.push(`\tlet ${_.camelCase(path)} = _.get(newData, '${path}') || [];`);
						code.push(`\tif (${_.camelCase(path)} && Array.isArray(${_.camelCase(path)}) && ${_.camelCase(path)}.length > 0) {`);
						code.push(`\t\tlet promises = ${_.camelCase(path)}.map(async (item, i) => {`);
						code.push('\t\t\ttry {');
						if (def.definition[0].properties.relatedTo) {
							code.push(`\t\t\t\tconst doc = await serviceFunctionMap['SRVC_${def.definition[0].properties.relatedTo}'](req, item._id, dataDB, session);`);
						} else {
							code.push('\t\t\t\tconst doc = await serviceFunctionMap[\'USER\'](req, item._id, dataDB, session);');
						}
						code.push('\t\t\t\t\tif (!doc) {');
						code.push(`\t\t\t\t\t\terrors['${path}.' + i] = item._id + ' not found';`);
						code.push('\t\t\t\t\t} else {');
						code.push('\t\t\t\t\t\titem._href = doc._href;');
						code.push('\t\t\t\t\t}');
						code.push('\t\t\t} catch (e) {');
						code.push(`\t\t\t\terrors['${path}.' + i] = e.message ? e.message : e;`);
						code.push('\t\t\t}');
						code.push('\t\t});');
						code.push('\t\tpromises = await Promise.all(promises);');
						code.push('\t\tpromises = null;');
						code.push('\t}');
					} else if (def.definition[0].type == 'Object') {
						code.push(`\tlet ${_.camelCase(path)} = _.get(newData, '${path}') || [];`);
						code.push(`\tif (${_.camelCase(path)} && Array.isArray(${_.camelCase(path)}) && ${_.camelCase(path)}.length > 0) {`);
						code.push(`\t\tlet promises = ${_.camelCase(path)}.map(async (newData, i) => {`);
						parseSchemaForRelation(def.definition[0].definition, '');
						code.push('\t\t});');
						code.push('\t\tpromises = await Promise.all(promises);');
						code.push('\t\tpromises = null;');
						code.push('\t}');
					}
				}
			}
		});
	}

	function parseSchemaForCreateOnly(schema, parentKey) {
		schema.forEach(def => {
			let key = def.key;
			const path = parentKey ? parentKey + '.' + key : key;
			if (key != '_id' && def.properties) {
				if (def.type == 'Object') {
					parseSchemaForCreateOnly(def.definition, path);
				} else if (def.type == 'Array' && def.properties && def.properties.createOnly) {
					code.push('\t\tif (!forceRemove) {');
					code.push(`\t\t\tif (_.differenceWith((_.get(newData, '${path}')||[]), (_.get(oldData, '${path}')||[]), _.isEqual)) {`);
					// code.push(`\t\t\t\terrors['${path}'] = '${path} field cannot be updated, Violation of Create Only';`);
					// code.push(`\t\t\tdelete newData['${path}'];`);
					code.push(`\t\t\t\t\t_.set(newData, '${path}', _.get(oldData, '${path}'));`);
					code.push('\t\t\t}');
					code.push('\t\t} else {');
					// code.push(`\t\t\tdelete newData['${path}'];`);
					code.push(`\t\t\t\t\t_.set(newData, '${path}', _.get(oldData, '${path}'));`);
					code.push('\t\t}');
				} else {
					if (def.properties.createOnly) {
						code.push('\t\tif (!forceRemove) {');
						code.push(`\t\t\tif (_.get(newData, '${path}') !== _.get(oldData, '${path}')) {`);
						// code.push(`\t\t\t\terrors['${path}'] = '${path} field cannot be updated, Violation of Create Only';`);
						// code.push(`\t\t\tdelete newData['${path}'];`);
						code.push(`\t\t\t\t\t_.set(newData, '${path}', _.get(oldData, '${path}'));`);
						code.push('\t\t\t}');
						code.push('\t\t} else {');
						// code.push(`\t\t\tdelete newData['${path}'];`);
						code.push(`\t\t\t\t\t_.set(newData, '${path}', _.get(oldData, '${path}'));`);
						code.push('\t\t}');
					}
				}
			}
		});
	}
}


module.exports.genrateCode = genrateCode;