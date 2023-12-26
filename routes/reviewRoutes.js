const express = require('express');
const {
  getAllReviews,
  createReview,
  deleteReview,
  updateReview,
  setTourUserIds,
} = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });
//POST /reviews
//GET /reviews
//POST /tours/23343dsdsfewr/reviews
//GET /tours/23343dsdsfewr/reviews
router.use(authController.protect);
router
  .route('/')
  .get(getAllReviews)
  .post(authController.restrictTo('user'), setTourUserIds, createReview);
router
  .route('/:id')
  .patch(authController.restrictTo('user'), updateReview)
  .delete(authController.restrictTo('user'), deleteReview);

module.exports = router;
