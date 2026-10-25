const { getDashboard } = require("../services/dashboard.service");
const { asyncHandler } = require("../middleware/async.middleware");

const getDailyDashboard = asyncHandler(async (req, res) => {
  const dashboard = await getDashboard(req.user.id, req.query.date);
  return res.json({ success: true, data: { dashboard } });
});

module.exports = { getDailyDashboard };
