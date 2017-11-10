const express = require('express');
const router = express.Router();
const instagramAgent = require('../utils/instagram_agent');

router.get('/user/get/:username', function(req, res) {
  instagramAgent.getUserID(req.params.username)
    .then((user) => {
      res.json(user)
    });
});

router.get('/stories/get/:user_id', function(req, res) {
  instagramAgent.getStories(req.params.user_id)
    .then((stories) => {
      res.json(stories)
    });
});

module.exports = router;
