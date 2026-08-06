const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const {
  getOverview,
  getEngineers,
  createEngineer,
  getAllTrips,
  getTripDetail,
  reviewTrip,
  deleteTrip,
} = require('../controllers/adminController');

router.use(auth, adminOnly); // every route below requires a logged-in admin

router.get('/overview', getOverview);
router.get('/engineers', getEngineers);
router.post('/engineers', createEngineer);
router.get('/trips', getAllTrips);
router.get('/trips/:id', getTripDetail);
router.patch('/trips/:id/review', reviewTrip);
router.delete('/trips/:id', deleteTrip);

module.exports = router;
