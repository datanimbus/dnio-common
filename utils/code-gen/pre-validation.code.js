const _ = require('lodash');

function genrateCode(data) {
	let schema = data.definition;
	if (typeof schema === 'string') {
		schema = JSON.parse(schema);
	}
	const idDetails = schema.find(attr => attr.key == '_id');
	if (idDetails.counter != null) idDetails.counter = parseInt(idDetails.counter);
	if (idDetails.padding != null) idDetails.padding = parseInt(idDetails.padding);
	const code = [];
	code.push('const { MongoClient } = require(\'mongodb\');');
	code.push('const log4js = require(\'log4js\');');
	code.push('const _ = require(\'lodash\');');
	code.push('');
	code.push('const config = require(\'../../config\');');
	code.push('const commonUtils = require(\'../../utils/common.utils\');');
	code.push('');
	code.push('const logger = log4js.getLogger(global.loggerName);');
	code.push('');


	code.push(`async function generateId(req, newData, oldData) {`);
	code.push(`	const client = await MongoClient.connect(config.mongoDataUrl, config.mongoDataOptions);`);
	code.push(`	const counterCol = client.db(config.namespace + '-${data.app}').collection('counters');`);
	if (idDetails.counter) {
		code.push(` try {`);
		code.push(`		await counterCol.insert({ _id: '${data.collectionName}', next: ${idDetails.counter} });`);
		code.push(`		logger.info('Counter Value Initialised');`);
		code.push(`	} catch (err) {`);
		code.push(`		logger.warn('Counter Value Exists');`);
		code.push(`	}`);
	}
	code.push(`	try {`);
	code.push(`		let id = null;`);
	code.push(`		let doc = await counterCol.findOneAndUpdate({ _id: '${data.collectionName}' }, { $inc: { next: 1 } }, { upsert: true, returnDocument: 'after' });`);
	if (idDetails.padding) {
		code.push(`		id = '${idDetails.prefix || ''}' + _.padStart((doc.value.next + ''), ${idDetails.padding || 0}, '0') + '${idDetails.suffix || ''}';`);
	} else {
		code.push(`		id = '${idDetails.prefix || ''}' + doc.value.next + '${idDetails.suffix || ''}';`);
	}
	code.push(`		newData._id = id;`);
	code.push(`	} catch (err) {`);
	code.push(`		throw err;`);
	code.push(`	} finally {`);
	code.push(`		await client.close(true);`);
	code.push(`	}`);
	code.push(`}`);
	code.push(``);
	code.push(`function rand(_i) {`);
	code.push(`	var i = Math.pow(10, _i - 1);`);
	code.push(`	var j = Math.pow(10, _i) - 1;`);
	code.push(`	return ((Math.floor(Math.random() * (j - i + 1)) + i));`);
	code.push(`};`);






	/**------------------------ UNIQUE ----------------------- */
	code.push('/**');
	code.push(' * @param {*} req The Incomming Request Object');
	code.push(' * @param {*} newData The New Document Object');
	code.push(' * @param {*} oldData The Old Document Object');
	code.push(' * @returns {Promise<object>} Returns Promise of null if no validation error, else and error object with invalid paths');
	code.push(' */');
	code.push('async function validateUnique(req, newData, oldData) {');
	code.push('\tconst errors = {};');
	code.push('\tconst client = await MongoClient.connect(config.mongoDataUrl, config.mongoDataOptions);');
	code.push(`\tconst col = client.db(config.namespace + '-${data.app}').collection('${data.collectionName}');`);
	code.push('\tlet val;');
	code.push('\ttry {');
	parseSchemaForUnique(schema);
	code.push('\t} catch(err) {');
	code.push('\t\tlogger.error(\'validateUnique\', err);');
	code.push('\t\terrors[\'global\'] = err;');
	code.push('\t} finally {');
	code.push('\t\tawait client.close(true);');
	code.push('\t\treturn Object.keys(errors).length > 0 ? errors : null;');
	code.push('\t}');
	code.push('}');
	code.push('');

	/**------------------------ SECURE FIELD ENCRYPT ----------------------- */
	code.push('/**');
	code.push(' * @param {*} req The Incomming Request Object');
	code.push(' * @param {*} newData The New Document Object');
	code.push(' * @param {*} oldData The Old Document Object');
	code.push(' * @returns {Promise<object>} Returns Promise of null if no validation error, else and error object with invalid paths');
	code.push(' */');
	code.push('async function encryptSecureFields(req, newData, oldData) {');
	code.push('\tconst errors = {};');
	parseSchemaForEncryption(schema);
	code.push('\treturn Object.keys(errors).length > 0 ? errors : null;');
	code.push('}');
	code.push('');
	/**------------------------ FIX BOOLEAN ----------------------- */
	code.push('/**');
	code.push(' * @param {*} req The Incoming Request Object');
	code.push(' * @param {*} newData The New Document Object');
	code.push(' * @param {*} oldData The Old Document Object');
	code.push(' * @returns {Promise<object>} Returns Promise of null if no validation error, else and error object with invalid paths');
	code.push(' */');
	code.push('function fixBoolean(req, newData, oldData) {');
	code.push('\tconst errors = {};');
	code.push('\tconst trueBooleanValues = global.trueBooleanValues;');
	code.push('\tconst falseBooleanValues = global.falseBooleanValues;');
	parseSchemaForBoolean(schema);
	code.push('\treturn Object.keys(errors).length > 0 ? errors : null;');
	code.push('}');
	code.push('');
	/**------------------------ ENRICH GEOJSON ----------------------- */
	code.push('/**');
	code.push(' * @param {*} req The Incomming Request Object');
	code.push(' * @param {*} newData The New Document Object');
	code.push(' * @param {*} oldData The Old Document Object');
	code.push(' * @returns {Promise<object>} Returns Promise of null if no validation error, else and error object with invalid paths');
	code.push(' */');
	code.push('async function enrichGeojson(req, newData, oldData) {');
	code.push('\tconst errors = {};');
	parseSchemaForGeojson(schema);
	code.push('\treturn Object.keys(errors).length > 0 ? errors : null;');
	code.push('}');
	code.push('');

	/**----------------------- DATE FIELDS HANDLING------------------- */

	code.push('/**');
	code.push(' * @param {*} req The Incomming Request Object');
	code.push(' * @param {*} newData The New Document Object');
	code.push(' * @param {*} oldData The Old Document Object');
	code.push(' * @returns {Promise<object>} Returns Promise of null if no validation error, else and error object with invalid paths');
	code.push(' */');
	code.push('async function validateDateFields(req, newData, oldData) {');
	code.push('\tlet txnId = req.headers[\'txnid\'];');
	code.push('\tconst errors = {};');
	parseSchemaForDateFields(schema);
	code.push('\treturn Object.keys(errors).length > 0 ? errors : null;');
	code.push('}');
	code.push('');

	/**------------------------ EXPORTS ----------------------- */

	/**------------------------ METHODS ----------------------- */
	code.push('module.exports = async function(req, item) {');
	code.push('\tlet errors = {};');
	code.push('\terrors = await validateUnique(req, item.data, item.oldData);');
	code.push('\tif (errors && Object.keys(errors).length > 0) return errors;');
	code.push('\terrors = await encryptSecureFields(req, item.data, item.oldData);');
	code.push('\tif (errors && Object.keys(errors).length > 0) return errors;');
	code.push('\terrors = await fixBoolean(req, item.data, item.oldData);');
	code.push('\tif (errors && Object.keys(errors).length > 0) return errors;');
	code.push('\terrors = await enrichGeojson(req, item.data, item.oldData);');
	code.push('\tif (errors && Object.keys(errors).length > 0) return errors;');
	code.push('\terrors = await validateDateFields(req, item.data, item.oldData);');
	code.push('\tif (errors && Object.keys(errors).length > 0) return errors;');
	code.push('\tif (item.operation == \'POST\' && !item.data._id) await generateId(req, item.data, item.oldData)');
	code.push('};');


	return code.join('\n');
	// fs.writeFileSync(path.join(process.cwd(), `generated`, `special-fields.utils.js`), code.join(`\n`), `utf-8`);


	function parseSchemaForUnique(schema, parentKey) {
		schema.forEach(def => {
			let key = def.key;
			const path = parentKey ? parentKey + '.' + key : key;
			if (key != '_id' && def.properties) {
				if (def.type == 'Object') {
					parseSchemaForUnique(def.definition, path);
				} else if (def.type == 'Array') {
					// code.push(`\t if((_.get(newData,'${path}')||[]).length !== (_.get(newData,'${path}')||[]).length) {`);
					// code.push(`\t\t errors.${path} = true;`);
					// code.push(`\t }`);
					// code.push(`\t for(let i=0;i<newData.${path};i++){`);
					// code.push(`\t\t const item = newData.${path}[i];`);
					// parseSchemaForUnique(def.definition, path);
					// code.push(`\t }`);
				} else {
					if (def.properties.unique) {
						code.push(`\tval = _.get(newData, '${path}');`);
						code.push('\tif (val) {');
						code.push(`\t\tlet query = { '${path}': val };`);
						code.push('\t\tif(oldData) query[\'_id\'] = {\'$ne\': oldData._id};');
						code.push('\t\tconst doc = await col.find(query, { session }).collation({ locale: \'en\', strength: 2 }).toArray();');
						code.push('\t\tif (doc && doc.length > 0) {');
						code.push(`\t\t\terrors['${path}'] = '${path} field should be unique';`);
						code.push('\t\t}');
						code.push('\t}');
					}
				}
			}
		});
	}

	function parseSchemaForEncryption(schema, parentKey) {
		schema.forEach(def => {
			let key = def.key;
			const path = parentKey ? parentKey + '.' + key : key;
			if (key != '_id' && def.properties) {
				if (def.properties.password && def.type != 'Array') {
					code.push(`\tlet ${_.camelCase(path + '.value')}New = _.get(newData, '${path}.value')`);
					code.push(`\tlet ${_.camelCase(path + '.value')}Old = _.get(oldData, '${path}.value')`);
					code.push(`\tif (${_.camelCase(path + '.value')}New && ${_.camelCase(path + '.value')}New != ${_.camelCase(path + '.value')}Old) {`);
					code.push('\t\ttry {');
					code.push(`\t\t\tconst doc = await commonUtils.encryptText(req, ${_.camelCase(path + '.value')}New);`);
					code.push('\t\t\tif (doc) {');
					code.push(`\t\t\t\t_.set(newData, '${path}', doc);`);
					code.push('\t\t\t}');
					code.push('\t\t} catch (e) {');
					code.push(`\t\t\terrors['${path}'] = e.message ? e.message : e;`);
					code.push('\t\t}');
					code.push('\t}');
				} else if (def.type == 'Object') {
					parseSchemaForEncryption(def.definition, path);
				} else if (def.type == 'Array') {
					if (def.definition[0].properties.password) {
						code.push(`\tlet ${_.camelCase(path)}New = _.get(newData, '${path}') || [];`);
						code.push(`\tlet ${_.camelCase(path)}Old = _.get(oldData, '${path}') || [];`);
						code.push(`\tif (${_.camelCase(path)}New && Array.isArray(${_.camelCase(path)}New) && ${_.camelCase(path)}New.length > 0) {`);
						code.push(`\t\tlet promises = ${_.camelCase(path)}New.map(async (item, i) => {`);
						code.push('\t\t\ttry {');
						code.push(`\t\t\t\tif (item && item.value && !${_.camelCase(path)}Old.find(e => e.value == item.value)) {`);
						code.push('\t\t\t\t\tconst doc = await commonUtils.encryptText(req, item.value);');
						code.push('\t\t\t\t\tif (doc) {');
						code.push('\t\t\t\t\t\t_.assign(item, doc);');
						code.push('\t\t\t\t\t}');
						code.push('\t\t\t\t}');
						code.push('\t\t\t} catch (e) {');
						code.push(`\t\t\t\terrors['${path}.' + i] = e.message ? e.message : e;`);
						code.push('\t\t\t}');
						code.push('\t\t});');
						code.push('\t\tpromises = await Promise.all(promises);');
						code.push('\t\tpromises = null;');
						code.push('\t}');
					} else if (def.definition[0].type == 'Object') {
						code.push(`\tlet ${_.camelCase(path)}New = _.get(newData, '${path}') || [];`);
						code.push(`\tlet ${_.camelCase(path)}Old = _.get(oldData, '${path}') || [];`);
						code.push(`\tif (${_.camelCase(path)}New && Array.isArray(${_.camelCase(path)}New) && ${_.camelCase(path)}New.length > 0) {`);
						code.push(`\t\tlet promises = ${_.camelCase(path)}New.map(async (newData, i) => {`);
						code.push(`\t\t\tlet oldData = _.find(${_.camelCase(path)}Old, newData);`);
						parseSchemaForEncryption(def.definition[0].definition, '');
						code.push('\t\t});');
						code.push('\t\tpromises = await Promise.all(promises);');
						code.push('\t\tpromises = null;');
						code.push('\t}');
					}
				}
			}
		});
	}

	function parseSchemaForBoolean(schema, parentKey) {
		schema.forEach(def => {
			let key = def.key;
			const path = parentKey ? parentKey + '.' + key : key;
			if (key != '_id' && def) {
				if (def.type == 'Boolean') {
					code.push(`\tlet ${_.camelCase(path)} = _.get(newData, '${path}')`);
					code.push('\ttry {');
					code.push(`\t\tif (typeof ${_.camelCase(path)} == 'number' || typeof ${_.camelCase(path)} == 'boolean') {`);
					code.push(`\t\t\t${_.camelCase(path)} = ${_.camelCase(path)}.toString();`);
					code.push('\t\t}');
					code.push(`\t\tif (typeof ${_.camelCase(path)} == 'string') {`);
					code.push(`\t\t\t${_.camelCase(path)} = ${_.camelCase(path)}.toLowerCase();`);
					code.push(`\t\t\tif (_.indexOf(trueBooleanValues, ${_.camelCase(path)}) > -1) {`);
					code.push(`\t\t\t\t_.set(newData, '${path}', true);`);
					code.push(`\t\t\t} else if (_.indexOf(falseBooleanValues, ${_.camelCase(path)}) > -1) {`);
					code.push(`\t\t\t\t_.set(newData, '${path}', false);`);
					code.push('\t\t\t} else {');
					code.push('\t\t\t\tthrow new Error(\'Invalid Boolean Value\');');
					code.push('\t\t\t}');
					code.push('\t\t}');
					code.push('\t} catch (e) {');
					code.push(`\t\terrors['${path}'] = e.message ? e.message : e;`);
					code.push('\t}');
					code.push(`\t_.set(newData, '${path}', ${_.camelCase(path)});`);
				} else if (def.type == 'Object') {
					parseSchemaForBoolean(def.definition, path);
				} else if (def.type == 'Array') {
					if (def.definition[0].type == 'Boolean') {
						code.push(`\tlet ${_.camelCase(path)} = _.get(newData, '${path}') || [];`);
						code.push(`\tif (${_.camelCase(path)} && Array.isArray(${_.camelCase(path)}) && ${_.camelCase(path)}.length > 0) {`);
						code.push(`\t\t${_.camelCase(path)} = ${_.camelCase(path)}.map((item, i) => {`);
						code.push('\t\t\ttry {');
						code.push('\t\t\t\tif (typeof item == \'number\' || typeof item == \'boolean\') {');
						code.push('\t\t\t\t\titem = item.toString();');
						code.push('\t\t\t\t}');
						code.push('\t\t\t\tif (typeof item == \'string\' && _.indexOf(trueBooleanValues, item.toLowerCase()) > -1) {');
						code.push('\t\t\t\t\treturn true;');
						code.push('\t\t\t\t} else if (typeof item == \'string\' && _.indexOf(falseBooleanValues, item.toLowerCase()) > -1){');
						code.push('\t\t\t\t\treturn false;');
						code.push('\t\t\t\t} else {');
						code.push('\t\t\t\t\tthrow new Error(\'Invalid Boolean Value\');');
						code.push('\t\t\t\t}');
						code.push('\t\t\t} catch (e) {');
						code.push(`\t\t\t\terrors['${path}.' + i] = e.message ? e.message : e;`);
						code.push('\t\t\t\treturn false;');
						code.push('\t\t\t}');
						code.push('\t\t});');
						code.push('\t}');
						code.push(`\t_.set(newData, '${path}', ${_.camelCase(path)});`);
					} else if (def.definition[0].type == 'Object') {
						code.push(`\tlet ${_.camelCase(path)} = _.get(newData, '${path}') || [];`);
						code.push(`\tif (${_.camelCase(path)} && Array.isArray(${_.camelCase(path)}) && ${_.camelCase(path)}.length > 0) {`);
						code.push(`\t\t${_.camelCase(path)}.forEach((newData, i) => {`);
						parseSchemaForBoolean(def.definition[0].definition, '');
						code.push('\t\t});');
						code.push('\t}');
						code.push(`\t_.set(newData, '${path}', ${_.camelCase(path)});`);
					}
				}
			}
		});
	}

	function parseSchemaForGeojson(schema, parentKey) {
		schema.forEach(def => {
			let key = def.key;
			const path = parentKey ? parentKey + '.' + key : key;
			if (key != '_id' && def.properties) {
				if (def.type == 'Geojson' || def.properties.geoType) {
					code.push(`\tlet ${_.camelCase(path)}New = _.get(newData, '${path}')`);
					code.push(`\tlet ${_.camelCase(path)}Old = _.get(oldData, '${path}')`);
					code.push(`\tif (${_.camelCase(path)}New && !_.isEqual(${_.camelCase(path)}New,${_.camelCase(path)}Old)) {`);
					code.push('\t\ttry {');
					code.push(`\t\t\tconst doc = await commonUtils.getGeoDetails(req, '${_.camelCase(path)}', ${_.camelCase(path)}New);`);
					code.push('\t\t\tif (doc) {');
					code.push(`\t\t\t\t_.set(newData, '${path}', doc.geoObj);`);
					code.push('\t\t\t}');
					code.push('\t\t} catch (e) {');
					code.push(`\t\t\t// errors['${path}'] = e.message ? e.message : e;`);
					code.push('\t\t}');
					code.push('\t}');
				} else if (def.type == 'Object') {
					parseSchemaForGeojson(def.definition, path);
				} else if (def.type == 'Array') {
					if (def.definition[0].type == 'Geojson' || def.definition[0].properties.geoType) {
						code.push(`\tlet ${_.camelCase(path)}New = _.get(newData, '${path}') || [];`);
						code.push(`\tlet ${_.camelCase(path)}Old = _.get(oldData, '${path}') || [];`);
						code.push(`\tif (${_.camelCase(path)}New && Array.isArray(${_.camelCase(path)}New) && ${_.camelCase(path)}New.length > 0) {`);
						code.push(`\t\tlet promises = ${_.camelCase(path)}New.map(async (item, i) => {`);
						code.push(`\t\t\tif (!_.find(${_.camelCase(path)}Old, item)) {`);
						code.push('\t\t\t\ttry {');
						code.push(`\t\t\t\t\tconst doc = await commonUtils.getGeoDetails(req, '${_.camelCase(path)}', item);`);
						code.push('\t\t\t\t\tif (doc) {');
						code.push('\t\t\t\t\t\t_.assign(item, doc.geoObj);');
						code.push('\t\t\t\t\t}');
						code.push('\t\t\t\t} catch (e) {');
						code.push(`\t\t\t\t\t// errors['${path}.' + i] = e.message ? e.message : e;`);
						code.push('\t\t\t\t}');
						code.push('\t\t\t}');
						code.push('\t\t});');
						code.push('\t\tpromises = await Promise.all(promises);');
						code.push('\t\tpromises = null;');
						code.push('\t}');
					} else if (def.definition[0].type == 'Object') {
						code.push(`\tlet ${_.camelCase(path)}New = _.get(newData, '${path}') || [];`);
						code.push(`\tlet ${_.camelCase(path)}Old = _.get(oldData, '${path}') || [];`);
						code.push(`\tif (${_.camelCase(path)}New && Array.isArray(${_.camelCase(path)}New) && ${_.camelCase(path)}New.length > 0) {`);
						code.push(`\t\tlet promises = ${_.camelCase(path)}New.map(async (newData, i) => {`);
						code.push(`\t\t\tlet oldData = _.find(${_.camelCase(path)}Old, newData);`);
						parseSchemaForGeojson(def.definition[0].definition, '');
						code.push('\t\t});');
						code.push('\t\tpromises = await Promise.all(promises);');
						code.push('\t\tpromises = null;');
						code.push('\t}');
					}
				}
			}
		});
	}

	function parseSchemaForDateFields(schema, parentKey) {
		schema.forEach(def => {
			let key = def.key;
			const path = parentKey ? parentKey + '.' + key : key;
			if (key != '_id' && def.properties) {
				if (def.type == 'Object' && def['properties']['dateType']) {
					code.push(`\tlet ${_.camelCase(path)}DefaultTimezone = ` + (def['properties']['defaultTimezone'] ? `'${def['properties']['defaultTimezone']}'` : undefined) + ';');
					code.push(`\tlet ${_.camelCase(path)}SupportedTimezones = ${def['properties']['supportedTimezones'] ? JSON.stringify(def['properties']['supportedTimezones']) : '[]'};`);
					code.push(`\tlet ${_.camelCase(path)}New = _.get(newData, '${path}')`);
					code.push(`\tlet ${_.camelCase(path)}Old = _.get(oldData, '${path}')`);
					code.push(`\tif (typeof ${_.camelCase(path)}New === 'string') {`);
					code.push(`\t\t${_.camelCase(path)}New = {`);
					code.push(`\t\t\trawData: ${_.camelCase(path)}New`);
					code.push('\t\t};');
					code.push('\t}');
					code.push(`\tif (typeof ${_.camelCase(path)}Old === 'string') {`);
					code.push(`\t\t${_.camelCase(path)}Old = {`);
					code.push(`\t\t\trawData: ${_.camelCase(path)}Old`);
					code.push('\t\t};');
					code.push('\t}');
					code.push(`\tif (!_.isEqual(${_.camelCase(path)}New, ${_.camelCase(path)}Old)) {`);
					code.push('\t\ttry {');
					code.push(`\t\t\t${_.camelCase(path)}New = commonUtils.getFormattedDate(txnId, ${_.camelCase(path)}New, ${_.camelCase(path)}DefaultTimezone, ${_.camelCase(path)}SupportedTimezones);`);
					// _.set(newData, 'time', timeNew);
					code.push(`\t\t\t_.set(newData, '${path}', ${_.camelCase(path)}New);`);
					code.push('\t\t} catch (e) {');
					code.push(`\t\t\terrors['${path}'] = e.message ? e.message : e;`);
					code.push('\t\t}');
					code.push('\t}');
				} else if (def.type == 'Object') {
					parseSchemaForDateFields(def.definition, path);
				} else if (def.type == 'Array') {
					if (def.definition[0]['properties'] && def.definition[0]['properties']['dateType']) {
						code.push(`\tlet ${_.camelCase(path)}DefaultTimezone = ` + (def.definition[0]['properties']['defaultTimezone'] ? `'${def.definition[0]['properties']['defaultTimezone']}'` : undefined) + ';');
						code.push(`\tlet ${_.camelCase(path)}SupportedTimezones = ${def.definition[0]['properties']['supportedTimezones'] ? JSON.stringify(def.definition[0]['properties']['supportedTimezones']) : '[]'};`);
						code.push(`\tlet ${_.camelCase(path)}New = _.get(newData, '${path}') || [];`);
						code.push(`\tlet ${_.camelCase(path)}Old = _.get(oldData, '${path}') || [];`);
						code.push(`\tif (${_.camelCase(path)}New && Array.isArray(${_.camelCase(path)}New) && ${_.camelCase(path)}New.length > 0 && !_.isEqual(${_.camelCase(path)}New, ${_.camelCase(path)}Old)) {`);
						code.push(`\t\t${_.camelCase(path)}New = ${_.camelCase(path)}New.map((item, i) => {`);
						code.push('\t\t\ttry {');
						code.push(`\t\t\t\treturn commonUtils.getFormattedDate(txnId, item, ${_.camelCase(path)}DefaultTimezone, ${_.camelCase(path)}SupportedTimezones);`);
						code.push('\t\t\t} catch (e) {');
						code.push(`\t\t\t\terrors['${path}.' + i] = e.message ? e.message : e;`);
						code.push('\t\t\t}');
						code.push('\t\t});');
						code.push(`\t\t_.set(newData, '${path}', ${_.camelCase(path)}New);`);
						code.push('\t}');
					} else if (def.definition[0]['type'] == 'Object') {
						code.push(`\tlet ${_.camelCase(path)}New = _.get(newData, '${path}') || [];`);
						code.push(`\tlet ${_.camelCase(path)}Old = _.get(oldData, '${path}') || [];`);
						code.push(`\tif (${_.camelCase(path)}New && Array.isArray(${_.camelCase(path)}New) && ${_.camelCase(path)}New.length > 0) {`);
						code.push(`\t\tlet promises = ${_.camelCase(path)}New.map(async (newData, i) => {`);
						code.push(`\t\t\tlet oldData = _.find(${_.camelCase(path)}Old, newData);`);
						parseSchemaForDateFields(def.definition[0].definition, '');
						code.push('\t\t});');
						code.push('\t\tpromises = await Promise.all(promises);');
						code.push('\t\tpromises = null;');
						code.push('\t}');
					}
				}
			}
		});
	}
}


module.exports.genrateCode = genrateCode;