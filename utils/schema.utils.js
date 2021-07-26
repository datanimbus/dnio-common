
/**
 * 
 * @param {array} srvc The Data.Stack Data Service JSON
 */
function convertToJSONSchema(srvc) {
    const definition = srvc.definition
    const tempSchema = {
        $schema: "http://json-schema.org/draft-07/schema#",
        // $id: `http://appveen.com/${srvc._id}.schema.json`,
        title: srvc.name,
        description: `A ${srvc.name} in the catalog`,
        type: "object"
    };
    const converted = getProperties(definition);
    tempSchema.properties = converted.properties;
    tempSchema.required = converted.required;
    return tempSchema;
}


function getProperties(definition) {
    const required = [];
    const properties = {};
    definition.forEach(def => {
        let dataKey = def.key;
        const dataTypes = [];
        let dataType = def.type;
        if (def.type.toLowerCase() === "date") {
            dataType = "string";
        }
        if (def.type.toLowerCase() === "user"
            || def.type.toLowerCase() === "geojson"
            || def.type.toLowerCase() === "file"
            || def.type.toLowerCase() === "date") {
            dataType = "object";
        }
        dataTypes.push(dataType.toLowerCase());
        if (!def.properties.required) {
            dataTypes.push("null");
        }
        properties[dataKey] = {
            type: dataTypes,
            description: def.properties.description
        };
        if (def.type === "Object") {
            if (def.properties.relatedTo) {
                const userSchema = getRelationSchema();
                properties[dataKey].properties = userSchema.properties;
                properties[dataKey].required = userSchema.required;
            } else if (def.properties.geoType) {
                const geoSchema = getGeoJSONSchema();
                properties[dataKey].properties = geoSchema.properties;
                properties[dataKey].required = geoSchema.required;
            } else if (def.properties.dateType) {
                const dateSchema = getDateSchema();
                properties[dataKey].properties = dateSchema.properties;
                properties[dataKey].required = dateSchema.required;
            } else {
                const converted = getProperties(def.definition);
                properties[dataKey].properties = converted.properties;
                properties[dataKey].required = converted.required;
            }
        } else if (def.type === "Array") {
            properties[dataKey].items = {};
            properties[dataKey].items.type = def.definition[0].type.toLowerCase();
            if (def.definition[0].type === "Object") {
                const converted = getProperties(def.definition[0].definition);
                properties[dataKey].items.properties = converted.properties;
                properties[dataKey].items.required = converted.required;
            } else {
                const validations = getValidations(def.definition[0]);
                Object.assign(properties[dataKey].items, validations);
            }
        } else if (def.type === "Date") {
            const dateSchema = getDateSchema();
            properties[dataKey].properties = dateSchema.properties;
            properties[dataKey].required = dateSchema.required;
        } else if (def.type === "User") {
            const userSchema = getRelationSchema();
            properties[dataKey].properties = userSchema.properties;
            properties[dataKey].required = userSchema.required;
        } else if (def.type === "Geojson") {
            const geoSchema = getGeoJSONSchema();
            properties[dataKey].properties = geoSchema.properties;
            properties[dataKey].required = geoSchema.required;
        } else if (def.type === "File") {
            const fileSchema = getFileSchema();
            properties[dataKey].properties = fileSchema.properties;
            properties[dataKey].required = fileSchema.required;
        } else {
            const validations = getValidations(def);
            Object.assign(properties[dataKey], validations);
        }
        if (def.properties.required) {
            required.push(dataKey);
        }
    });
    return {
        properties,
        required
    };
}

function getValidations(def) {
    const properties = {};
    if (def.properties.min != null && def.properties.min != undefined) {
        properties.minimum = def.properties.min;
    }
    if (def.properties.max != null && def.properties.max != undefined) {
        properties.maximum = def.properties.max;
    }
    if (def.properties.minlength != null && def.properties.minlength != undefined) {
        properties.minLength = def.properties.minlength;
    }
    if (def.properties.maxlength != null && def.properties.maxlength != undefined) {
        properties.maxLength = def.properties.maxlength;
    }
    if (def.properties.pattern != null && def.properties.pattern != undefined) {
        properties.pattern = def.properties.pattern;
    }
    if (def.properties.enum != null && def.properties.enum != undefined) {
        properties.enum = def.properties.enum;
    }
    if (def.properties.precision != null && def.properties.precision != undefined) {
        if (def.properties.precision > 0) {
            const decimals = new Array(def.properties.precision);
            decimals.fill(0);
            decimals.pop();
            decimals.push(1);
            decimals.unshift(".");
            decimals.unshift(0);
            properties.multipleOf = parseFloat(decimals.join(""));
        } else {
            properties.type = "integer";
        }
    }
    return properties;
}

function getDateSchema() {
    const required = [];
    const properties = {
        raw: {
            type: ['string', 'null']
        },
        tzData: {
            type: ['string', 'null']
        },
        tzInfo: {
            type: ['string', 'null']
        },
        unix: {
            type: ['number', 'null']
        },
        utc: {
            type: ['string', 'null']
        }
    };
    return { required, properties };
}

function getRelationSchema() {
    const required = ['_id'];
    const properties = {
        _id: {
            type: ['string', 'null']
        }
    };
    return { required, properties };
}

function getGeoJSONSchema() {
    const required = [];
    const properties = {
        userInput: {
            type: ["string", "null"]
        },
        formattedAddress: {
            type: "string"
        },
        geometry: {
            type: "object",
            properties: {
                type: {
                    type: "string"
                },
                coordinates: {
                    type: "array",
                    items: {
                        type: "number"
                    }
                }
            },
            required: [
                "coordinates",
                "type"
            ]
        },
        town: {
            type: "string"
        },
        district: {
            type: "string"
        },
        state: {
            type: "string"
        },
        pincode: {
            type: "string"
        },
        country: {
            type: "string"
        }
    };
    return { required, properties };
}

function getFileSchema() {
    const required = [
        "length",
        "chunkSize",
        "uploadDate",
        "filename",
        "md5",
        "contentType",
        "metadata"
    ];
    const properties = {
        _id: {
            type: ["string", "null"]
        },
        length: {
            type: "integer"
        },
        chunkSize: {
            type: "integer"
        },
        uploadDate: {
            type: "string"
        },
        filename: {
            type: "string"
        },
        md5: {
            type: "string"
        },
        contentType: {
            type: "string"
        },
        metadata: {
            type: "object",
            properties: {
                filename: {
                    type: "string"
                }
            },
            required: [
                "filename"
            ]
        }
    };
    return { required, properties };
}

module.exports.convertToJSONSchema = convertToJSONSchema;