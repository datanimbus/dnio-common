const router = require('express').Router();


router.use('/txn', require('./transaction'));


module.exports = router;