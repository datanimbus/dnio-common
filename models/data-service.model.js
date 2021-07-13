async function findOneService(filter) {
    try {
        const record = await global.authorDB.collection('services').findOne(filter);
        return record;
    } catch (err) {
        throw err;
    }
};
async function findAllService(filter) {
    try {
        const records = await global.authorDB.collection('services').find(filter).toArray()
        return records;
    } catch (err) {
        throw err;
    }
};


module.exports ={
    findOneService,
    findAllService
};