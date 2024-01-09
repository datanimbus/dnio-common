const mongooseDataType = ['String', 'Number', 'Date', 'Boolean', 'Object', 'Array'];
const systemGlobalSchema = require('../system-definition.utils.js');

function expandSchemaWithSystemGlobalDef(schema, simpleDate) {
	schema = schema.map(attribute => {
		if (attribute.key !== 'properties' && attribute.key !== '_id') {
			if (mongooseDataType.indexOf(attribute['type']) == -1 || (attribute['properties'] && attribute['properties']['dateType'] && !simpleDate)) {
				let sysDef = systemGlobalSchema[attribute['type']];
				if (sysDef) {
					sysDef.key = attribute.key;
					let properties = attribute['properties'];
					attribute = JSON.parse(JSON.stringify(sysDef));
					if (properties) attribute['properties'] = JSON.parse(JSON.stringify(properties));
				}
			}
			if (attribute['definition'] && !(attribute['properties'] && attribute['properties']['dateType']))
				attribute['definition'] = expandSchemaWithSystemGlobalDef(attribute['definition'], simpleDate);
		}
		return attribute;
	});
	return schema;
}

module.exports = (serviceDocument) => {
	return expandSchemaWithSystemGlobalDef(serviceDocument['definition'], serviceDocument.simpleDate);
};