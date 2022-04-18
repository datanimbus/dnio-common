const router = require('express').Router();
const log4js = require('log4js');

const codeGen = require('../utils/code-gen');

const logger = log4js.getLogger(global.loggerName);

router.post('/clean', async (req, res) => {
    try {
        codeGen.cleanGeneratedFiles();
        res.status(200).json({ message: 'Cleaning All Generated Projects' });
    } catch (err) {
        logger.error(err);
        res.status(500).json({ message: err.message });
    }
});

router.put('/clean/:srvcId', async (req, res) => {
    try {
        codeGen.removeOldFolder(req.params.srvcId);
        res.status(200).json({ message: 'Cleaning All Generated Projects' });
    } catch (err) {
        logger.error(err);
        res.status(500).json({ message: err.message });
    }
});


router.get('/swagger', async (req, res) => {
    const txnId = req.header(global.txnIdHeader);
    try {
        const basePath = '/api/a/common';
        const swagger = {
            swagger: '2.0',
            info: {
                version: require('../package.json').version,
                title: 'Common APIs'
            },
            host: 'localhost:3000',
            basePath: basePath,
            schemes: ['http'],
            consumes: ['application/json', 'multipart/form-data'],
            produces: ['application/json', 'text/plain'],
            paths: {},
            definitions: {}
        };
        swagger.definitions['txnPayload'] = {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    'dataService': {
                        type: 'object',
                        description: 'Data Service Details',
                        properties: {
                            app: {
                                type: 'string',
                                description: 'The Data Service App'
                            },
                            name: {
                                type: 'string',
                                description: 'The Data Service Name'
                            }
                        }
                    },
                    'operation': {
                        type: 'string',
                        description: 'The operation on Document PUT/POST/DELETE'
                    },
                    'upsert': {
                        type: 'boolean',
                        default: false,
                        description: 'For PUT operations'
                    },
                    'data': {
                        type: 'object',
                        description: 'The Data Service Document'
                    }
                }
            }
        };
        swagger.paths['/txn'] = {
            'x-swagger-router-controller': 'handleTransaction',
            post: {
                description: `Do CUD Operation on Data Services using Transactions`,
                operationId: `handleTransaction`,
                parameters: [
                    {
                        name: 'data',
                        in: 'body',
                        description: `Payload of Transaction`,
                        schema: {
                            $ref: `#/definitions/txnPayload`
                        }
                    },
                    {
                        name: 'authorization',
                        in: 'header',
                        type: 'string',
                        description: 'The JWT token for req validation'
                    }
                ],
                responses: {
                    '200': {
                        description: 'The new documents if PUT/POST and message if DELETE'
                    },
                    '400': {
                        description: 'Bad parameters'
                    },
                    '500': {
                        description: 'Internal server error'
                    }
                }
            }
        };
        swagger.host = req.query.host;
        logger.debug(`[${txnId}] Swagger host :: ${swagger.host}`);
        swagger.basePath = req.query.basePath ? req.query.basePath : swagger.basePath;
        logger.debug(`[${txnId}] Swagger basePath :: ${swagger.basePath}`);
        addAuthHeader(swagger.paths, req.query.token);
        res.status(200).json(swagger);
    } catch (err) {
        logger.error(err);
        res.status(500).json({ message: err.message });
    }
});


function addAuthHeader(paths, jwt) {
    Object.keys(paths).forEach(path => {
        Object.keys(paths[path]).forEach(method => {
            if (typeof paths[path][method] == 'object' && paths[path][method]['parameters']) {
                let authObj = paths[path][method]['parameters'].find(obj => obj.name == 'authorization');
                if (authObj) authObj.default = jwt;
            }
        });
    });
}


module.exports = router;