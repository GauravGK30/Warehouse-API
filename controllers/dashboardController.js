const productModel = require("../models/productModel");

const getDashboardSummary = async (req, res, next) => {
    try {
        const summary = await productModel.getDashboardSummary(
            req.user.warehouseId
        );

        res.json({ summary });
    } catch (err) {
        next(err);
    }
};

const getRecentActivity = async (req, res, next) => {
    try {
        const activities = await productModel.getRecentActivity(
            req.user.warehouseId
        );

        res.json({ activities });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getDashboardSummary,
    getRecentActivity
};