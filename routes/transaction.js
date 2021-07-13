const router = require('express').Router();
const log4js = require('log4js');

const transactionUtils = require('../utils/transaction.utils');

const logger = log4js.getLogger(global.loggerName);

router.post('/', async (req, res) => {
    try {
        const payload = req.body;
        const result = await transactionUtils.executeTransaction(payload);
        res.status(200).json(result);
    } catch (err) {
        logger.error(err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;