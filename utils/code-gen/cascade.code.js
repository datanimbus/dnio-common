const _ = require('lodash');

function genrateCode(config) {
    let schema = config.definition;
    if (typeof schema === 'string') {
        schema = JSON.parse(schema);
    }
    const code = [];

    code.push('const log4js = require(\'log4js\');');
    code.push('const _ = require(\'lodash\');');
    code.push('');
    code.push('const config = require(\'../../config\');');
    code.push('const commonUtils = require(\'../../utils/common.utils\');');
    code.push('const transValidation = require(\'./trans-validation\');');
    code.push('');
    code.push('const logger = log4js.getLogger(global.loggerName);');


    /**------------------------ CREATE CASCADE PAYLOAD ----------------------- */
    code.push('/**');
    code.push(' * @param {*} req The Incomming Request Object');
    code.push(' * @param {*} newData The New Document Object');
    code.push(' * @returns {object[]} Returns related data payloads');
    code.push(' */');
    code.push('async function createCascadePayload(req, newData) {');
    code.push('\tconst payloads = [];');
    parseSchemaForCascade(schema);
    code.push('\treturn payloads;');
    code.push('}');
    code.push('');



    /**------------------------ EXPORTS ----------------------- */

    /**------------------------ METHODS ----------------------- */
    code.push('module.exports.createCascadePayload = createCascadePayload;');


    return code.join('\n');

    function parseSchemaForCascade(schema, parentKey) {
        schema.forEach(def => {
            let key = def.key;
            const path = parentKey ? parentKey + '.' + key : key;
            if (key != '_id' && def.properties) {
                if (def.properties.relatedTo) {
                    code.push(`\tlet ${_.camelCase(path)} = _.get(newData, '${path}');`);
                    code.push(`\tif (${_.camelCase(path)} && commonUtils.hasRelationCascadeData(${_.camelCase(path)})) {`);
                    code.push(`\t\tlet id = ${_.camelCase(path)}._id;`);
                    code.push('\t\tlet payload = {};');
                    code.push(`\t\tpayload.operation = ${_.camelCase(path)}._id ? 'PUT' : 'POST';`);
                    code.push(`\t\tpayload.dataService = '${def.properties.relatedTo}';`);
                    code.push(`\t\tpayload.upsert = ${_.camelCase(path)}._id ? true : false;`);
                    code.push(`\t\tpayload.data = JSON.parse(JSON.stringify(${_.camelCase(path)}));`);
                    code.push(`\t\tpayload.temp = true;`);
                    code.push(`\t\tif (!id) {`);
                    code.push(`\t\t\tid = await transValidation.genrateDocumentId('${def.properties.relatedTo}');`);
                    code.push(`\t\t\tpayload.data._id = id;`);
                    code.push(`\t\t}`);
                    code.push(`\t\t_.set(newData, '${path}', { _id: id });`);
                    code.push(`\t\tpayloads.push(payload);`);
                    code.push('\t}');
                } else if (def.type == 'Object') {
                    parseSchemaForRelation(def.definition, path);
                } else if (def.type == 'Array') {
                    if (def.definition[0].properties.relatedTo) {
                        code.push(`\tlet ${_.camelCase(path)} = _.get(newData, '${path}') || [];`);
                        code.push(`\tif (${_.camelCase(path)} && Array.isArray(${_.camelCase(path)}) && ${_.camelCase(path)}.length > 0) {`);
                        code.push(`\t\tlet promises = ${_.camelCase(path)}.map(async (item, i) => {`);
                        code.push('\t\t\tif (commonUtils.hasRelationCascadeData(item)) {');
                        code.push(`\t\t\t\tlet id = item._id;`);
                        code.push('\t\t\t\tlet payload = {};');
                        code.push(`\t\t\t\tpayload.operation = item._id ? 'PUT' : 'POST';`);
                        code.push(`\t\t\t\tpayload.dataService = '${def.properties.relatedTo}';`);
                        code.push(`\t\t\t\tpayload.upsert = item._id ? true : false;`);
                        code.push(`\t\t\t\tpayload.data = JSON.parse(JSON.stringify(item));`);
                        code.push(`\t\t\t\tpayload.temp = true;`);
                        code.push(`\t\t\t\tif (!id) {`);
                        code.push(`\t\t\t\t\tid = await transValidation.genrateDocumentId('${def.properties.relatedTo}');`);
                        code.push(`\t\t\t\t\tpayload.data._id = id;`);
                        code.push(`\t\t\t\t}`);
                        code.push(`\t\t\t\t_.set(item, '_id', id);`);
                        code.push(`\t\t\t\tpayloads.push(payload);`);
                        code.push('\t\t\t}');
                        code.push('\t\t});');
                        code.push('\t}');
                    } else if (def.definition[0].type == 'Object') {
                        code.push(`\tlet ${_.camelCase(path)} = _.get(newData, '${path}') || [];`);
                        code.push(`\tif (${_.camelCase(path)} && Array.isArray(${_.camelCase(path)}) && ${_.camelCase(path)}.length > 0) {`);
                        code.push(`\t\tlet promises = ${_.camelCase(path)}.map(async (newData, i) => {`);
                        parseSchemaForRelation(def.definition[0].definition, '');
                        code.push('\t\t});');
                        code.push('\t}');
                    }
                }
            }
        });
    }
}


module.exports.genrateCode = genrateCode;