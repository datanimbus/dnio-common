'use strict';

const fs = require('fs');
const path = require('path');
const log4js = require('log4js');
const crypto = require('crypto');
const { Worker } = require('worker_threads');

const config = require('../config');
const httpClient = require('../http-client');

const logger = log4js.getLogger(global.loggerName);

async function encryptText(req, app, data) {
	const txnId = req && req.headers ? req.headers['txnId'] : '';
	const keys = await getKeys(app);
	return await executeCipher(txnId, 'encrypt', data, keys);
}


async function decryptText(req, app, data) {
	const txnId = req && req.headers ? req.headers['txnId'] : '';
	const keys = await getKeys(app);
	return await executeCipher(txnId, 'decrypt', data, keys);
}

function md5(text) {
	return crypto.createHash('md5').update(text).digest('hex');
}

/**
 * 
 * @param {string} txnId The txnId of the current request
 * @param {string} text The text data to send in thread for encryption/decryption
 */
function executeCipher(txnId, action, text, keys) {
	const baseKey = keys.baseKey;
	const baseCert = keys.baseCert;
	const encryptionKey = keys.encryptionKey;
	logger.debug(`[${txnId}] Exec. thread :: cipher`);
	return new Promise((resolve, reject) => {
		let responseSent = false;
		const filePath = path.join(__dirname, '../threads', 'cipher.js');
		if (!fs.existsSync(filePath)) {
			logger.error(`[${txnId}] Exec. thread :: cipher :: INVALID_FILE`);
			return reject(new Error('INVALID_FILE'));
		}
		const worker = new Worker(filePath, {
			workerData: {
				text,
				baseKey,
				baseCert,
				encryptionKey,
				action
			}
		});
		worker.on('message', function (data) {
			responseSent = true;
			worker.terminate();
			resolve(data);
		});
		worker.on('error', reject);
		worker.on('exit', code => {
			if (!responseSent) {
				logger.error(`[${txnId}] Exec. thread :: cipher :: Worker stopped with exit code ${code}`);
				reject(new Error(`Worker stopped with exit code ${code}`));
			}
		});
	});
}

async function getKeys(app) {
	try {
		logger.trace('Ping USER service');
		const options = {
			url: config.baseUrlUSR + '/' + app + '/keys',
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
			json: true
		};
		const res = await httpClient.httpRequest(options);
		if (res.statusCode === 200) {
			const body = res.body;
			logger.trace('Found Keys', body);
			return body;
		} else {
			throw new Error('User Service not found');
		}
	} catch (err) {
		logger.error(err);
		throw err;
	}
}

module.exports.encryptText = encryptText;
module.exports.decryptText = decryptText;
module.exports.md5 = md5;
module.exports.executeCipher = executeCipher;