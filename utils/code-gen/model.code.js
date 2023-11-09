const _ = require('lodash');

function genrateCode(config) {
    let schema = config.definition;
    if (typeof schema === 'string') {
        schema = JSON.parse(schema);
    }
    const code = [];
    code.push('const fs = require(\'fs\');');
    code.push('const log4js = require(\'log4js\');');
    code.push('const mongoose = require(\'mongoose\');');
    code.push('const _ = require(\'lodash\');');
    code.push('');
    code.push('const { definition } = require(\'./definition.js\');');
    code.push('');
    code.push('const logger = log4js.getLogger(global.loggerName);');
    code.push(`if (!global.modalInit || !global.modalInit['${schema._id}']) {`);
    code.push(`\tglobal.modalInit['${schema._id}'] = true;`);
    code.push('\tconst schema = new mongoose.Schema(definition);');
    code.push(`\tconst model = mongoose.model('${schema._id}', schema);`);
    code.push('}');
    code.push('/**');
    code.push(' * @param {*} data The data to be validated');
    code.push(' * @returns {object[]} Returns related data payloads');
    code.push(' */');
    code.push('async function validateModel(data) {');
    code.push(`\tlet error = null;`);
    code.push(`\ttry {`);
    code.push(`\t\tlogger.debug('${schema._id}', data);`);
    code.push(`\t\tconst model = mongoose.model('${schema._id}');`);
    code.push(`\t\tconst document = new model(data);`);
    code.push(`\t\tawait document.validate();`);
    code.push(`\t} catch (err) {`);
    code.push(`\t\tlogger.error(err);`);
    code.push(`\t\terror = err;`);
    code.push(`\t} finally {`);
    code.push(`\t\treturn error;`);
    code.push(`\t}`);
    code.push('}');
    code.push('');



    /**------------------------ EXPORTS ----------------------- */

    /**------------------------ METHODS ----------------------- */
    code.push('module.exports.validateModel = validateModel;');

    return code.join('\n');
}


module.exports.genrateCode = genrateCode;