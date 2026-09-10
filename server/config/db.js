const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

let isConnected = false;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 4000,
    });
    isConnected = true;
    console.log(`[POLARIS] MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[POLARIS] MongoDB connection error: ${error.message}`);
    console.warn(`\n================================================================`);
    console.warn(`[POLARIS] ⚠️ MongoDB is not accessible at: ${MONGO_URI}`);
    console.warn(`[POLARIS] 💡 To resolve this, choose one of the following:`);
    console.warn(`  1. MongoDB Atlas (Cloud): Set MONGO_URI in 'server/.env' to your Atlas URI:`);
    console.warn(`     MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/polaris?retryWrites=true&w=majority`);
    console.warn(`  2. Local MongoDB: Start the local service (e.g. run 'mongod' or 'net start MongoDB')`);
    console.warn(`[POLARIS] The server will stay online and retry connecting every 10s...`);
    console.warn(`================================================================\n`);

    // Retry connection periodically without crashing nodemon
    setTimeout(() => {
      if (!isConnected) {
        connectDB();
      }
    }, 10000);
  }
};

module.exports = connectDB;
