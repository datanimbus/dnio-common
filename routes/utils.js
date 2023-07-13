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
        const swagger = {
            openapi: '3.0.0',
            info: {
                version: require('../package.json').version,
                title: 'Common APIs'
            },
            servers: [{ 'url': 'http://localhost:3000/api/a/common' }],
            paths: {},
            components: {}
        };

        let schemas = {}
        let securitySchemes = {};

        schemas['txnPayload'] = {
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

        securitySchemes['bearerAuth'] = {
            'type': 'http',
            'scheme': 'bearer',
            'bearerFormat': 'JWT'
        };

        swagger.components.securitySchemes = securitySchemes
        swagger.components.schemas = schemas;

        swagger.paths['/txn'] = {
            'x-swagger-router-controller': 'handleTransaction',
            post: {
                description: `Do CRUD Operation on Data Services using Transactions`,
                operationId: `handleTransaction`,
                requestBody: {
                    description: `Payload of Transaction`,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: `#/components/schemas/txnPayload`
                            }
                        }
                    }
                },
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
                },
                security: [
                    {
                        "bearerAuth": []
                    }
                ]
            }
        };
        let basePath = req.query.basePath ? req.query.basePath : '/api/a/common';
        logger.debug(`[${txnId}] Swagger servers :: [{ 'url': http://${req.query.host}${basePath} }]`);
        swagger.servers = [{ 'url': `http://${req.query.host}${basePath}` }];
        //addAuthHeader(swagger.paths, req.query.token);
        res.status(200).json(swagger);
    } catch (err) {
        logger.error(err);
        res.status(500).json({ message: err.message });
    }
});


// function addAuthHeader(paths, jwt) {
//     Object.keys(paths).forEach(path => {
//         Object.keys(paths[path]).forEach(method => {
//             if (typeof paths[path][method] == 'object' && paths[path][method]['parameters']) {
//                 let authObj = paths[path][method]['parameters'].find(obj => obj.name == 'authorization');
//                 if (authObj) authObj.default = jwt;
//             }
//         });
//     });
// }


module.exports = router;