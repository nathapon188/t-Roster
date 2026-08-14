const express = require('express');
const router = express.Router();
const store = require('../store');

router.get('/', (req, res) => {
  try {
    res.json(store.readShifts());
  } catch (error) {
    console.error('❌ READ ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/text', (req, res) => {
  try {
    res.type('text/plain; charset=utf-8').send(store.toText(store.readShifts()));
  } catch (error) {
    console.error('❌ READ ERROR:', error.message);
    res.status(500).type('text/plain').send(`Error: ${error.message}`);
  }
});

// Replaces the whole roster and rewrites shifts.json + shifts.txt.
router.put('/', (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Body must be a JSON array of shifts' });
    }
    res.json(store.writeShifts(req.body));
  } catch (error) {
    console.error('❌ WRITE ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
