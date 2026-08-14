require('dotenv').config();

const express = require('express');
const cors = require('cors');

const shiftsRoute = require('./routes/shifts');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/shifts', shiftsRoute);

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});
