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


module.exports = router;