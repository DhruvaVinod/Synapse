const express = require('express');
const router = express.Router();
const {
  getAllComplaints,
  createComplaint,
  getStats,
  updateComplaint,
  adminLogin,
} = require('./controller');
const { translateText } = require('./translationService');

router.get('/complaints',       getAllComplaints);
router.post('/complaints',      createComplaint);
router.patch('/complaints/:id', updateComplaint);
router.get('/stats',            getStats);
router.post('/admin/login',     adminLogin);

router.post('/translate', async (req, res) => {
  const { text, sourceLang, targetLang } = req.body;
  const translatedText = await translateText(text, sourceLang, targetLang);
  res.json({ translatedText });
});

module.exports = router;