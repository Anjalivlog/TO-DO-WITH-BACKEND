const accessModel = require('../models/accessModel');

const rateLimiting = async (req, res, next) => {
    console.log(req.session.id);

    const sid = req.session.id;
    try {
        const accessDb = await accessModel.findOne({ sessionId: sid });
        console.log(accessDb);
        console.log("hiiiiiiiiiiiiiiiiii");

        //this is first req, create an entry in db
        if (!accessDb) {
            const accessObj = new accessModel({ sessionID: sid, time: Date.now() });
            await accessObj.save();
            next();
            return;
        }

        const diff = (Date.now() - accessDb.time) / 1000;
        console.log(diff);

        if (diff < 1) {
            return res.status(400).json('Too many request, please wait some time');
        }

        const db = await accessModel.findOneAndUpdate(
            { sessionID: sid },
            { time: Date.now() }
        );

        next();
    } catch (error) {
        return res.status(500).json(error);
    }
};

module.exports = rateLimiting;
