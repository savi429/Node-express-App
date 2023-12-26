// eslint-disable-next-line import/no-extraneous-dependencies
const { promisify } = require('util');
// eslint-disable-next-line import/no-extraneous-dependencies
const crypto = require('crypto');
// eslint-disable-next-line import/no-extraneous-dependencies
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    maxAge: +new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * (24 * 60 * 60 * 1000),
    ),
    httpOnly: true, //avaid cross site scripting attacks
  };
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }
  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  //1) check if email and password exists
  if (!email || !password) {
    next(new AppError('Email and password required', 400));
  }
  //2) check id email and password correct
  const user = await User.findOne({ email }).select('+password');

  //3) if everything ok send jwt token
  if (!user || !(await user.correctPassword(password, user.password))) {
    next(new AppError('Incorrect email or password!', 401));
  }
  if (user) {
    createSendToken(user, 200, res);
  }
};

exports.protect = catchAsync(async (req, res, next) => {
  //1) get token from req and check it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // if (req.headers.cookie && req.headers.cookie.startsWith('jwt')) {
  //   token = req.headers.cookie.split('=')[1];
  // }
  // if (!token) {
  //   return next(
  //     new AppError('You are not logged in please loggin to access', 401),
  //   );
  // }
  //2) token verification
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //3) check user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('User Belongs to this token doesnt exist', 401));
  }
  //4) check the user changed the password after jwt was issued
  const isPasswordChanged = await currentUser.changedPasswordAfter(decoded.iat);
  if (isPasswordChanged) {
    return next(
      new AppError('User recently changed password please login again', 401),
    );
  }
  req.user = currentUser;
  //grant access to protected routes
  next();
});

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to do this action', 403),
      );
    }
    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) get user based on email does user exists or not
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('Email does not exist', 404));
  }
  //2) generate random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  //3) send it to user email

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host',
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError('There was an error sending the mail. Try again later', 500),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) get user based on token
  const encryptToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: encryptToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  //2) set new password if token not expired and there is a user set ne password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  //3) update changepassword property for user
  //4) log the user in send jwt
  createSendToken(user, 200, res);

  // const token = signToken(user._id);
  // res.status(200).json({ status: 'success', token });
});

//password update for logged in user he need to send current and new confirm passwrod
exports.updatePassword = catchAsync(async (req, res, next) => {
  if (
    !req.body.password ||
    !req.body.currentPassword ||
    !req.body.passwordConfirm
  ) {
    return next(
      new AppError(
        'Please provide password confirm password and new password',
        400,
      ),
    );
  }
  //1) get user from collection
  const user = await User.findById(req.user.id).select('+password');
  //2) Check id posted current password correct
  if (
    !user ||
    !(await user.correctPassword(req.body.currentPassword, user.password))
  ) {
    return next(new AppError(`your current password is wrong`, 401));
  }
  //3) get new and confirm password save
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //4) Log user in , send token
  createSendToken(user, 200, res);

  // const token = signToken(req.use.id);
  // res.status(200).json({ status: 'success', token });
});
