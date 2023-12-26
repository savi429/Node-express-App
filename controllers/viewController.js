const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');

exports.getHomePage = catchAsync(async (req, res, next) => {
  const tours = await Tour.find();
  res.status(200).render('pug', tours);
});
