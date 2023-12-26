const path = require('path');
const express = require('express');
const morgan = require('morgan');
// eslint-disable-next-line import/no-extraneous-dependencies
const { rateLimit } = require('express-rate-limit');
// eslint-disable-next-line import/no-extraneous-dependencies
const helmet = require('helmet');
// eslint-disable-next-line import/no-extraneous-dependencies
const mongoSanitize = require('express-mongo-sanitize');
// eslint-disable-next-line import/no-extraneous-dependencies
const xss = require('xss-clean');
// eslint-disable-next-line import/no-extraneous-dependencies
const hpp = require('hpp');

const cors = require('cors');
// eslint-disable-next-line import/no-extraneous-dependencies
const compression = require('compression');

const AppError = require('./utils/appError');
const globalErrorHanlder = require('./controllers/errorController');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoute');
const bookingRouter = require('./routes/bookingRoutes');

const app = express();
app.set('view engine', 'pug'); // template engine specifying that is pug
app.set('views', path.join(__dirname, 'views')); // views located in

//serving static files in my file system in folder public
app.use('/public', express.static(path.join(__dirname, 'public')));
//Global middlewares
//Security HTTP headers
app.use(helmet());

app.use(cors());

//development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
//LIMIT requests from same IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'To many requests from this IP, please try again after an hour',
});
app.use(limiter);
//body parser reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

//Data sanitization against NO SQL query injection
app.use(mongoSanitize());
// Data sanitization against XSS
app.use(xss());
//Prevent parameter pollution like passing sort field multiple times
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);
app.use(compression());
//Owr own custom middleware
app.use((req, res, next) => {
  next();
});
app.get('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
app.all('*', (req, res, next) => {
  // all methods with different endpoints will come here
  // res
  //   .status(404)
  //   .json({ status: 'fail', message: `Can't find ${req.originalUrl}` });
  // const err = new Error(`can't find ${req.originalUrl}`);
  // err.statusCode = 404;
  // err.status = 'fail';
  next(new AppError(`Can't find ${req.originalUrl}`, 404));
});
app.use(globalErrorHanlder);

module.exports = app;
