const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  PORT: process.env.PORT || 8002,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/polaris',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'polaris_access_dev_secret_2026',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'polaris_refresh_dev_secret_2026',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
};
