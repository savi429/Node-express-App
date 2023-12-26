// eslint-disable-next-line import/no-extraneous-dependencies
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);
// Connect to MongoDB Atlas
async function connectToDatabase() {
  try {
    await mongoose.connect(DB, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('Error connecting to MongoDB Atlas:', error.message);
  }
}
// Connect to MongoDB Atlas
connectToDatabase();

console.log(process.env.NODE_ENV);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`server running on port: ${PORT}`);
});
