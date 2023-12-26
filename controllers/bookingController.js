// eslint-disable-next-line import/no-extraneous-dependencies
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const catchAsync = require('../utils/catchAsync');
const Tour = require('../models/tourModel');

exports.createSession = catchAsync(async (req, res, next) => {
  //1) get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);
  //2) create session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card', 'wallets'],
    line_items: [
      {
        name: `${tour.name}`,
        description: tour.summary,
        price: tour.price * 100,
        currency: 'usd',
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${req.protocol}://${req.get('host')}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
  });
  //3) send session to front end
  res.status(200).json({ status: 'success', session });
  //Frontend logic
  //   const clientSession = await axios.get(
  //     `http://127.0.0.1/api/v1/bookings/checkout-session/${tourId}`,
  //   );
  //   const stripe = await loadStripe('pk_test_TYooMQauvdEDq54NiTphI7jx');
  //   await stripe.redirectToCheckout({ sessionId: clientSession.data.session.id });
  //4) create checkout page + carge the credit card using sesion in FE
});
