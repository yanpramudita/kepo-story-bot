const express = require('express');
const router = express.Router();
const Bluebird = require('bluebird');

const lineBot = require('../utils/line_bot');

router.post('/webhook', lineBot.middleware, (req, res) => {
  Bluebird
    .all(req.body.events.map(lineBot.handleEvent))
    .then(() => res.json({}));
});

module.exports = router;
