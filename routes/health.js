const router = require('express').Router();
const log4js = require('log4js');

const logger = log4js.getLogger(global.loggerName);

router.get('/live', async (req, res) => {
    try {
        res.status(200).json({ message: 'Server is up and running' });
    } catch (err) {
        logger.error(err);
        res.status(500).json({ message: err.message });
    }
});

router.get('/ready', async (req, res) => {
    try {
        if (!global.authorDB) {
            logger.error('[Not Ready] MongoDB Not Connected');
            return res.status(400).json({ message: 'MongoDB Not Connected' });
        }
        if (!global.isTransactionAllowed) {
            logger.error('[Not Ready] MongoDB Transactions Not Allowed');
            return res.status(400).json({ message: 'MongoDB Transactions Not Allowed' });
        }
        if (!global.client || !global.client.nc || !global.client.nc.connected) {
            logger.error('[Not Ready] NATS Not Connected');
            return res.status(400).json({ message: 'NATS Not Connected' });
        }
        res.status(200).json({ message: 'Application is ready' });
    } catch (err) {
        logger.error(err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;