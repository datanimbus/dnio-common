const router = require('express').Router();
const log4js = require('log4js');

const preProcessor = require('../utils/pre-processor.utils');
const transactionUtils = require('../utils/transaction.utils');

const logger = log4js.getLogger(global.loggerName);

router.use(preProcessor.basicValidation);
router.use(preProcessor.canDoTransaction);
router.use(preProcessor.initCodeGen);
router.use(preProcessor.preHookValidation);
router.use(preProcessor.schemaValidation);
router.use(preProcessor.specialFieldsValidation);

router.post('/', async (req, res) => {
	try {
		const payload = req.body;
		const result = await transactionUtils.executeTransaction(req, payload);
		if (result.every(e => e.statusCode == 200)) {
			res.status(200).json(result);
		} else {
			res.status(400).json(result);
		}
	} catch (err) {
		logger.error(err);
		res.status(500).json({ message: err.message });
	}
});

module.exports = router;