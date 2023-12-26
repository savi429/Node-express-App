const mongoose = require('mongoose');
const fs = require('fs');
const dotenv = require('dotenv');
const Tour = require('../../models/tourModel');

dotenv.config({ path: './../../.env' });
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

const connectToDatabase = async () => {
  try {
    await mongoose.connect(DB, {});
  } catch (err) {
    console.log('failed to connect to database');
  }
};
connectToDatabase();

const tours = fs.readFileSync('./tours.json', 'utf-8');

const importData = async () => {
  try {
    await Tour.create(tours);
  } catch (err) {
    console.log('failed to store data in db');
  }
};

const deleteData = async () => {
  try {
    await Tour.deleteMany();
  } catch (err) {
    console.log('failed to delete all records from collection');
  }
};
