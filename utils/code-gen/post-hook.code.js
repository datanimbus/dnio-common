const _ = require('lodash');

function genrateCode(data) {
    let postHooks = (data.webHooks || []);
    const code = [];
    code.push('const { MongoClient } = require(\'mongodb\');');
    code.push('const log4js = require(\'log4js\');');
    code.push('const uuid = require(\'uuid/v1\');');
    code.push('const _ = require(\'lodash\');');
    code.push('');
    code.push('const config = require(\'../../config\');');
    code.push('const { sendToQueue } = require(\'../../queue\');');
    code.push('');
    code.push('const logger = log4js.getLogger(global.loggerName);');

    /**------------------------ METHOD ----------------------- */
    code.push('/**');
    code.push(' * @param {*} req The Incomming Request Object');
    code.push(' * @param {*} newData The New Document Object');
    code.push(' * @param {*} oldData The Old Document Object');
    code.push(' * @param {*} oldData The Old Document Object');
    code.push(' * @returns {Promise<void>} Returns Promise of null');
    code.push(' */');
    code.push('async function callAllPostHooks(req, newData, oldData, item) {');
    if (postHooks && postHooks.length > 0) {
        code.push(`\tlogger.trace(\`Mongo Connection details :: \${config.mongoLogUrl} \`)`);
        code.push(`\tconst client = await MongoClient.connect(config.mongoLogUrl);`);
        code.push(`\tconst db = client.db(config.mongoLogsOptions.dbName);`);
        code.push(`\tconst headers = {};`);
        code.push(`\theaders['Data-Stack-DS-Name'] = '${data.name}';`);
        (data.headers || []).forEach(item => {
            code.push(`\theaders['${item.header}'] = '${item.value}'`);
        });
        code.push(`\tlet docId = newData._id || (oldData ? oldData._id : null) || null;`);
        code.push(`\tlet txnId = req.headers[global.txnIdHeader];`);
        // code.push(`\tlet userId = req.headers[global.userHeader];`);
        code.push(`\tlet userId = req.user ? req.user._id : req.headers[global.userHeader];`);
        code.push(`\tconst postHookLog = {};`);
        code.push(`\tpostHookLog.user = userId;`);
        code.push(`\tpostHookLog.txnId = txnId;`);
        code.push(`\tpostHookLog.status = 'Pending';`);
        code.push(`\tpostHookLog.message = null;`);
        code.push(`\tpostHookLog.retry = 0;`);
        code.push(`\tpostHookLog.operation = item.operation;`);
        code.push(`\tpostHookLog.type = 'PostHook';`);
        code.push(`\tpostHookLog.trigger = {};`);
        code.push(`\tpostHookLog.trigger.source = 'postSave';`);
        code.push(`\tpostHookLog.trigger.simulate = false;`);
        code.push(`\tpostHookLog.service = {`);
        code.push(`\t	id: '${data._id}',`);
        code.push(`\t	name: '${data.name}'`);
        code.push(`\t};`);
        code.push(`\tpostHookLog.callbackUrl = '/api/c/${data.app}${data.api}/utils/callback';`);
        code.push(`\tpostHookLog.headers = headers;`);
        code.push(`\tpostHookLog.properties = headers;`);
        code.push(`\tpostHookLog.docId = docId;`);
        code.push(`\tpostHookLog.logs = [];`);
        code.push(`\tpostHookLog.data = {};`);
        code.push(`\tpostHookLog.data.old = oldData ? JSON.parse(JSON.stringify(oldData)) : null;`);
        code.push(`\tpostHookLog.data.new = newData ? JSON.parse(JSON.stringify(newData)) : null;`);
        code.push(`\tpostHookLog._metadata = {};`);
        code.push(`\tpostHookLog._metadata.createdAt = new Date();`);
        code.push(`\tpostHookLog._metadata.lastUpdated = new Date();`);
        code.push(`\tpostHookLog._metadata.version = {};`);
        code.push(`\tpostHookLog._metadata.version.release = '${process.env.RELEASE || 'dev'}';`);
        code.push(`\tlet streamingPayload,temp;`);


        postHooks.forEach(hook => {
            code.push(`\tstreamingPayload = {`);
            code.push(`\t\tcollection: '${data.app}.hook',`);
            code.push(`\t\ttxnId: txnId,`);
            code.push(`\t\tretry: 0`);
            code.push(`\t};`);

            code.push(`\ttemp = JSON.parse(JSON.stringify(postHookLog));`);
            code.push(`\ttemp['_id'] = uuid();`);
            code.push(`\ttemp.callbackUrl = \`\${ temp.callbackUrl }/\${ temp._id }\`;`);
            code.push(`\tstreamingPayload['_id'] = temp['_id'];`);
            code.push(`\ttemp['name'] = '${hook.name}';`);
            code.push(`\ttemp['url'] = '${hook.url}';`);
            code.push(`\ttemp['hookType'] = ('${hook.type}' || 'external');;`);
            code.push(`\ttemp['refId'] = '${hook.refId}';`);
            code.push(`\tif (${!data.disableInsights} && temp && temp._id) {`);
            code.push(`\t\ttemp._metadata = {};`);
            code.push(`\t\ttemp._metadata.createdAt = new Date();`);
            code.push(`\t\ttemp._metadata.lastUpdated = new Date();`);
            code.push(`\t\ttry {`);
            code.push(`\t\t\tawait db.collection(\`${data.app}.hook\`).insertOne(JSON.parse(JSON.stringify(temp)));`);
            code.push(`\t\t\tlogger.debug(\`[\${txnId}] Post-Hook log :: \${newData._id}\`);`);
            code.push(`\t\t\tsendToQueue(streamingPayload);`);
            code.push(`\t\t} catch(err) {`);
            code.push(`\t\t\tlogger.error(\`[\${txnId}] Post-Hook log :: \${newData._id} :: \${err.message}\`);`);
            code.push(`\t\t}`);
            code.push(`\t}`);
        });
        code.push(`\tclient.close(true);`);
    }
    code.push('\treturn;');
    code.push('}');
    code.push('');

    /**------------------------ EXPORTS ----------------------- */

    /**------------------------ METHODS ----------------------- */
    code.push('module.exports = async function(req, item) {');
    code.push('\tawait callAllPostHooks(req, item.data, item.oldData, item);');
    code.push('};');


    return code.join('\n');
}


module.exports.genrateCode = genrateCode;