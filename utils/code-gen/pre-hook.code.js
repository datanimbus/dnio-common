const _ = require('lodash');

function genrateCode(data) {
	let preHooks = (data.preHooks || []);
	const code = [];
	code.push('const { MongoClient } = require(\'mongodb\');');
	code.push('const crypto = require(\'crypto\');');
	code.push('const log4js = require(\'log4js\');');
	code.push('const _ = require(\'lodash\');');
	code.push('');
	code.push('const config = require(\'../../config\');');
	code.push('const httpClient = require(\'../../http-client\');');
	code.push('const commonUtils = require(\'../../utils/common.utils\');');
	code.push('');
	code.push('const logger = log4js.getLogger(global.loggerName);');

	/**------------------------ UNIQUE ----------------------- */
	code.push('/**');
	code.push(' * @param {*} req The Incomming Request Object');
	code.push(' * @param {*} newData The New Document Object');
	code.push(' * @param {*} oldData The Old Document Object');
	code.push(' * @returns {Promise<object>} Returns Promise of null if no validation error, else and error object with invalid paths');
	code.push(' */');
	code.push('async function callAllPreHooks(req, newData, oldData, options) {');
	if (preHooks && preHooks.length > 0) {
		code.push(`\tconst client = await MongoClient.connect(config.mongoLogUrl, config.mongoLogsOptions);`);
		code.push(`\tconst db = client.db(config.mongoLogsOptions.dbName);`);
		code.push(`\tconst headers = {};`);
		code.push(`\theaders['Data-Stack-DS-Name'] = '${data.name}';`);
		(data.headers || []).forEach(item => {
			code.push(`\theaders['${item.header}'] = '${item.value}'`);
		});
		code.push(`\tlet docId = newData._id || (oldData ? oldData._id : null) || null;`);
		code.push(`\tlet payload;`);
		code.push(`\tlet txnId = req.headers[global.txnIdHeader];`);
		code.push(`\toptions['type'] = 'PreHook';`);
		code.push(`\tpayload = {};`);
		code.push(`\tpayload.trigger = {};`);
		code.push(`\tpayload.operation = options.operation;`);
		code.push(`\tpayload.txnId = req.headers[global.txnIdHeader];`);
		code.push(`\tpayload.user = req.headers[global.userHeader];`);
		code.push(`\tpayload.trigger.source = options.source;`);
		code.push(`\tpayload.trigger.simulate = options.simulate;`);
		code.push(`\tpayload.service = {`);
		code.push(`\t	id: '${data._id}',`);
		code.push(`\t	name: '${data.name}'`);
		code.push(`\t};`);
		code.push(`\tpayload.app = '${data.app}';`);
		code.push(`\tpayload.docId = docId;`);
		code.push(`\tpayload.properties = headers;`);
		code.push(`\tlet preHookLog = {};`);
		code.push(`\tpreHookLog.trigger = {};`);
		code.push(`\tpreHookLog.txnId = txnId;`);
		code.push(`\tpreHookLog.headers = headers;`);
		code.push(`\tpreHookLog.properties = headers;`);
		code.push(`\tpreHookLog._id = crypto.randomBytes(16).toString('hex');`);
		code.push(`\tpreHookLog.user = req.headers[global.userHeader];`);
		code.push(`\tpreHookLog.txnId = req.headers[global.txnIdHeader];`);
		code.push(`\tpreHookLog.status = 'Initiated';`);
		code.push(`\tpreHookLog.retry = 0;`);
		code.push(`\tpreHookLog.docId = docId;`);
		code.push(`\tpreHookLog.data = {};`);
		code.push(`\tpreHookLog.operation = options.operation;`);
		code.push(`\tpreHookLog.type = options.type;`);
		code.push(`\tpreHookLog.trigger.source = options.source;`);
		code.push(`\tpreHookLog.trigger.simulate = options.simulate;`);
		code.push(`\tpreHookLog.service = {`);
		code.push(`\t	id: '${data._id}',`);
		code.push(`\t	name: '${data.name}'`);
		code.push(`\t};`);

		preHooks.forEach(hook => {
			code.push(`\tpayload.name = '${hook.name}';`);
			code.push(`\tpayload.data = JSON.parse(JSON.stringify(newData));`);
			code.push(`\tpreHookLog.name = '${hook.name}';`);
			code.push(`\tpreHookLog.url = '${hook.url}';`);
			code.push(`\tpreHookLog.data.old = JSON.parse(JSON.stringify(newData));`);
			code.push(`\toldData = newData;`);
			code.push(`\ttry {`);
			if (hook.type === 'function') {
				code.push(`\t\tresp = await commonUtils.invokeFunction({ txnId, hook: ${JSON.stringify(hook)}, payload, headers }, req);`);
			} else {
				code.push(`\t\tresp = await commonUtils.invokeHook({ txnId, hook: ${JSON.stringify(hook)}, payload, headers });`);
			}
			code.push(`\t\tnewData = _.mergeWith(oldData, resp.body.data, commonUtils.mergeCustomizer);`);
			code.push(`\t\tnewData._metadata = oldData._metadata;`);
			code.push(`\t\tpreHookLog.data.new = JSON.parse(JSON.stringify(newData));`);
			code.push(`\t\tpreHookLog.status = 'Success';`);
			code.push(`\t\tpreHookLog.statusCode = resp.statusCode;`);
			code.push(`\t\tpreHookLog.response = {};`);
			code.push(`\t\tpreHookLog.response.headers = resp.headers;`);
			code.push(`\t\tpreHookLog.response.body = resp.body;`);
			code.push(`\t} catch (err) {`);
			code.push(`\t\tlogger.error(\`[\${txnId}] PreHook :: ${hook.name} :: \${err.message}\`);`);
			code.push(`\t\tpreHookLog.message = err.message;`);
			code.push(`\t\tpreHookLog.status = 'Error';`);
			code.push(`\t\tif (err.response) {`);
			code.push(`\t\t\tpreHookLog.status = 'Fail';`);
			code.push(`\t\t\tpreHookLog.statusCode = err.response.statusCode;`);
			code.push(`\t\t\tpreHookLog.response = {};`);
			code.push(`\t\t\tpreHookLog.response.headers = err.response.headers;`);
			code.push(`\t\t\tpreHookLog.response.body = err.response.body;`);
			code.push(`\t\t}`);
			code.push(`\t\tthrow preHookLog;`);
			code.push(`\t} finally {`);
			code.push(`\t\tif (${!data.disableInsights} && preHookLog && preHookLog._id) {`);
			code.push(`\t\t\ttry {`);
			code.push(`\t\t\t\tawait db.collection(\`${data.app}.hook\`).insertOne(JSON.parse(JSON.stringify(preHookLog)));`);
			code.push(`\t\t\t\tlogger.debug(\`[\${txnId}] Pre-Hook log :: \${newData._id}\`);`);
			code.push(`\t\t\t} catch(err) {`);
			code.push(`\t\t\t\tlogger.error(\`[\${txnId}] Pre-Hook log :: \${newData._id} :: \${err.message}\`);`);
			code.push(`\t\t\t}`);
			code.push(`\t\t}`);
			code.push(`\t}`);
		});
		code.push(`\tclient.close(true);`);
	}
	code.push('\treturn newData;');
	code.push('}');
	code.push('');

	/**------------------------ EXPORTS ----------------------- */

	/**------------------------ METHODS ----------------------- */
	code.push('module.exports = async function(req, item) {');
	code.push('\tconst options = {};');
	code.push('\toptions[\'simulate\'] = false;');
	code.push('\toptions[\'source\'] = \'pre-hook\';');
	code.push('\toptions[\'operation\'] = item.operation;');
	code.push('\tlet newData = await callAllPreHooks(req, item.data, item.oldData, options);');
	code.push('\titem.data = newData;');
	code.push('\treturn item;');
	code.push('};');


	return code.join('\n');
}


module.exports.genrateCode = genrateCode;