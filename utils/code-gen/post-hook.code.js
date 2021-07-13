const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const crypto = require('crypto');

const config = require('../../config');
const queueMgmt = require('../../queue');
const commonUtils = require('../common.utils');

const logger = global.logger;

function prepPostHooks(_data) {
	let txnId = _data.txnId;
	logger.trace(`[${txnId}] PostHook :: ${JSON.stringify(_data)}`);
	let postHooks = [];
	try {
		postHooks = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'hooks.json'), 'utf-8')).webHooks;
	} catch (e) {
		logger.error(`[${txnId}] PostHook :: Parser error :: ${e.message}`);
		throw e;
	}
	if (!postHooks) {
		postHooks = [];
	}
	let operation = 'POST';
	let docId = _data.new._id;
	if (_data.old && _data.new) operation = 'PUT';
	if (_data.old && !_data.new) {
		operation = 'DELETE';
		docId = _data.old._id;
	}
	logger.info(`[${txnId}] PostHook :: ${docId} :: ${postHooks.length} found`);
	postHooks = postHooks.map(_d => {
		if (_d.type === 'function') {
			_d.url = config.baseUrlGW + _d.url;
		}
		logger.info(`[${txnId}] PostHook :: ${docId} :: ${_d.name} - ${_d.url} `);
		return _d;
	});
	let postHookLog = {
		txnId: txnId,
		user: _data.user,
		status: 'Pending',
		message: null,
		retry: 0,
		operation: operation,
		type: 'PostHook',
		trigger: {
			source: 'postSave',
			simulate: false,
		},
		service: {
			id: config.serviceId,
			name: config.serviceName
		},
		callbackUrl: `/api/c/${config.app}${config.serviceEndpoint}/utils/callback`,
		headers: commonUtils.generateHeaders(txnId),
		properties: commonUtils.generateProperties(txnId),
		docId: docId,
		data: {
			old: _data.old,
			new: _data.new
		},
		logs: [],
		scheduleTime: null,
		_metadata: {
			createdAt: new Date(),
			lastUpdated: new Date(),
			version: {
				release: process.env.RELEASE || 'dev'
			},
			disableInsights: config.disableInsights
		}
	};
	let streamingPayload = {
		collection: `${config.app}.hook`,
		txnId: txnId,
		retry: 0
	};
	return postHooks.reduce(function (_prev, _curr) {
		return _prev.then(() => {
			postHookLog['_id'] = crypto.randomBytes(16).toString('hex');
			postHookLog.callbackUrl = `${postHookLog.callbackUrl}/${postHookLog._id}`;
			streamingPayload['_id'] = postHookLog['_id'];
			postHookLog['name'] = _curr.name;
			postHookLog['url'] = _curr.url;
			postHookLog['hookType'] = (_curr.type || 'external');
			postHookLog['refId'] = _curr.refId;
			insertHookLog('PostHook', txnId, postHookLog);
			queueMgmt.sendToQueue(streamingPayload);
		});
	}, Promise.resolve());
}


async function insertHookLog(_type, _txnId, _data) {
	try {
		logger.trace(`[${_txnId}] ${_type} log :: ${JSON.stringify(_data)}`);
		await global.logsDB.collection(`${config.app}.hook`).insertOne(_data);
		logger.debug(`[${_txnId}] ${_type} log :: ${_data._id}`)
	} catch (err) {
		logger.error(`[${_txnId}] ${_type} log :: ${_data._id} :: ${err.message}`)
	}
}


module.exports = {
	prepPostHooks,
	insertHookLog
};