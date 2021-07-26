const crypto = require('crypto');
const log4js = require('log4js');
const _ = require('lodash');

const config = require('../config');
const httpClient = require('../http-client');

const logger = log4js.getLogger(global.loggerName);

/**
 * 
 * @param {*} req The Incoming Request Object
 * @param {*} data The data to encrypt
 */
async function encryptText(req, data) {
    data = data.toString();
    var options = {
        url: config.baseUrlSEC + '/enc/' + config.app + '/encrypt',
        method: 'POST',
        headers: {
            'txnId': req ? req.headers[global.txnIdHeader] : '',
            'user': req ? req.headers[global.userHeader] : '',
            'Content-Type': 'application/json',
        },
        body: { data },
        json: true
    };
    try {
        const res = await httpClient.httpRequest(options);
        if (!res) {
            logger.error(`[${req.headers[global.txnIdHeader]}] Security service down`);
            throw new Error('Security service down');
        }
        if (res.statusCode === 200) {
            return {
                value: res.body.data,
                checksum: crypto.createHash('md5').update(data).digest('hex')
            };
        } else {
            logger.error(`[${req.headers[global.txnIdHeader]}] Error response code from security service :: `, res.statusCode);
            logger.error(`[${req.headers[global.txnIdHeader]}] Error response from security service :: `, res.body);
            throw new Error('Error encrypting text');
        }
    } catch (e) {
        logger.error(`[${req.headers[global.txnIdHeader]}] Error requesting Security service`, e);
        throw e;
    }
}

/**
 * 
 * @param {*} req The Incoming Request Object
 * @param {*} data The data to decrypt
 */
async function decryptText(req, data) {
    if (!data) {
        data = req;
        req = undefined;
    }
    var options = {
        url: config.baseUrlSEC + '/enc/' + config.app + '/decrypt',
        method: 'POST',
        headers: {
            'txnId': req ? req.headers[global.txnIdHeader] : '',
            'user': req ? req.headers[global.userHeader] : '',
            'Content-Type': 'application/json',
        },
        body: { data },
        json: true
    };
    try {
        const res = await httpClient.httpRequest(options);
        if (!res) {
            logger.error(`[${req.headers[global.txnIdHeader]}] Security service down`);
            throw new Error('Security service down');
        }
        if (res.statusCode === 200) {
            return res.body.data;
        } else {
            throw new Error('Error decrypting text');
        }
    } catch (e) {
        logger.error(`[${req ? req.headers[global.txnIdHeader] : ''}] Error requesting Security service :: `, e.message ? e.message : (e.body ? e.body : e));
        throw e;
    }
}

/**
 * 
 * @param {*} req The Incoming Request Object
 * @param {string} path The Path for Geojson type field
 * @param {string} address The details of user input to search for
 */
async function getGeoDetails(req, path, address) {
    address = typeof address === 'string' ? address : address.userInput;
    const options = {
        url: 'https://maps.googleapis.com/maps/api/geocode/json',
        method: 'GET',
        json: true,
        qs: {
            address,
            key: config.googleKey
        }
    };
    try {
        const res = await httpClient.httpRequest(options);
        if (!res) {
            logger.error(`[${req.headers[global.txnIdHeader]}] Google API service is down`);
            throw new Error('Google API service is down');
        }
        if (res.statusCode === 200) {
            const body = res.body;
            const geoObj = {};
            geoObj.geometry = {};
            geoObj.geometry.type = 'Point';
            geoObj.userInput = address;
            let aptLocation = null;
            if (_.isEmpty(body.results[0])) {
                return { key: path, geoObj: { userInput: address } };
            } else {
                aptLocation = !_.isEmpty(body.results) && !_.isEmpty(body.results[0]) ? body.results[0] : null;
                const typeMapping = {
                    'locality': 'town',
                    'administrative_area_level_2': 'district',
                    'administrative_area_level_1': 'state',
                    'postal_code': 'pincode',
                    'country': 'country'
                };
                if (aptLocation) {
                    const addrComp = aptLocation.address_components;
                    Object.keys(typeMapping).forEach(key => {
                        const temp = addrComp.find(comp => comp.types && comp.types.indexOf(key) > -1);
                        if (temp) geoObj[typeMapping[key]] = temp.long_name;
                    });
                    geoObj.geometry.coordinates = [aptLocation.geometry.location.lng, aptLocation.geometry.location.lat];
                    geoObj.formattedAddress = aptLocation.formatted_address;
                }
                const resObj = {};
                resObj.key = path;
                resObj.geoObj = geoObj;
                return resObj;
            }
        } else {
            logger.error(`[${req.headers[global.txnIdHeader]}] Goolgle Maps API returned 400`, res.body.error_message);
            return { key: path, geoObj: { userInput: address } };
        }
    } catch (e) {
        logger.error(`[${req.headers[global.txnIdHeader]}] Error requesting Goolgle Maps API :: `, e.message);
        throw e;
    }
}


/**
 * @param {string} txnId The txnID of the request
 * @param {object} data Options 
 * @param {object} data.hook The Hook Data
 * @param {string} data.hook.url Hook URL
 * @param {string} data.hook.name Hook Name
 * @param {string} data.hook.type Type of Hook
 * @param {string} data.hook.failMessage The Custom Error Message
 * @param {object} data.payload The Payload that needs to be sent
 * @param {string} data.headers Additional Headers
 * @param {string} data.txnId The TxnId of the Request
 */
function invokeHook(data) {
    let timeout = (process.env.HOOK_CONNECTION_TIMEOUT && parseInt(process.env.HOOK_CONNECTION_TIMEOUT)) || 30;
    data.payload.properties = data.payload.properties || commonUtils.generateProperties(data.txnId);
    let headers = data.headers || commonUtils.generateHeaders(data.txnId);
    headers['Content-Type'] = 'application/json';
    headers['TxnId'] = data.txnId;
    var options = {
        url: data.hook.url,
        method: 'POST',
        headers: headers,
        json: true,
        body: data.payload,
        timeout: timeout * 1000
    };
    if (typeof process.env.TLS_REJECT_UNAUTHORIZED === 'string' && process.env.TLS_REJECT_UNAUTHORIZED.toLowerCase() === 'false') {
        options.insecure = true;
        options.rejectUnauthorized = false;
    }
    return httpClient.httpRequest(options)
        // .then(res => res)
        .catch(err => {
            logger.error(`Error requesting hook :: ${options.url} :: ${err.message}`);
            const message = data.hook.failMessage ? data.hook.failMessage : `Pre-save "${data.hook.name}" down! Unable to proceed.`;
            throw ({
                message: message,
                response: err.response
            });
        });
}

/**
 * @param {string} txnId The txnID of the request
 * @param {object} data Options 
 * @param {object} data.hook The Hook Data
 * @param {string} data.hook.url Hook URL
 * @param {string} data.hook.name Hook Name
 * @param {string} data.hook.type Type of Hook
 * @param {string} data.hook.failMessage The Custom Error Message
 * @param {object} data.payload The Payload that needs to be sent
 * @param {string} data.headers Additional Headers
 * @param {string} data.txnId The TxnId of the Request
 */
function invokeFunction(data, req) {
    let timeout = (process.env.HOOK_CONNECTION_TIMEOUT && parseInt(process.env.HOOK_CONNECTION_TIMEOUT)) || 30;
    data.payload.properties = data.payload.properties || commonUtils.generateProperties(data.txnId);
    let headers = data.headers || commonUtils.generateHeaders(data.txnId);
    headers['Content-Type'] = 'application/json';
    headers['TxnId'] = data.txnId;
    headers['Authorization'] = req.headers['authorization'];
    var options = {
        url: config.baseUrlGW + data.hook.url,
        method: 'POST',
        headers: headers,
        json: true,
        body: data.payload,
        timeout: timeout * 1000
    };
    if (typeof process.env.TLS_REJECT_UNAUTHORIZED === 'string' && process.env.TLS_REJECT_UNAUTHORIZED.toLowerCase() === 'false') {
        options.insecure = true;
        options.rejectUnauthorized = false;
    }
    return httpClient.httpRequest(options)
        // .then(res => res)
        .catch(err => {
            logger.error(`Error requesting function :: ${options.url} :: ${err.message}`);
            const message = data.hook.failMessage ? data.hook.failMessage : `Pre-save "${data.hook.name}" down! Unable to proceed.`;
            throw ({
                message: message,
                response: err.response
            });
        });
}

function mergeCustomizer(objValue, srcValue) {
    if (_.isArray(objValue)) {
        return srcValue;
    }
}


module.exports = {
    encryptText,
    decryptText,
    getGeoDetails,
    invokeHook,
    invokeFunction,
    mergeCustomizer
}