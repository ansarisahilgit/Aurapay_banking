require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const seedDemoUsers = require('./utils/seed');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  await seedDemoUsers();
  app.listen(PORT, () => console.log(`Banking API listening on ${PORT}`));
}
start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
