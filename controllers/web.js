const express = require('express');
const _ = require('lodash');
const Bluebird = require('bluebird');

const instagramAgent = require('../utils/instagram_agent');

const router = express.Router();

router.get('/', function(req, res) {
  res.send('<h1>Hello, world!</h1>');
});

router.get('/get/:username/details', function(req, res) {
  instagramAgent.getUserID(req.params.username)
    .then((user) => {
      if(_.isUndefined(user)){
        return Bluebird.reject(404);
      }
      res.json(user)
    })
    .catch((err) => {
      if(err == 404){
        return sendNotFound(req, res);
      }
      return sendError(req, res, err);
    });
});

router.get('/get/:username/stories', function(req, res) {
  instagramAgent.getUserID(req.params.username)
    .then((user) => {
      if(_.isUndefined(user)){
        return Bluebird.reject(404);
      }
      return Bluebird.resolve(user);
    })
    .then((user) => instagramAgent.getStories(user.id))
    .then((stories) => {
      res.json(stories)
    })
    .catch((err) => {
      if(err == 404){
        return sendNotFound(req, res);
      }
      return sendError(req, res, err);
    });
});

router.get('/search/user', function(req, res) {
  if(_.isUndefined(req.query.username)){
    return sendBadRequest(req,res);
  }

  instagramAgent.searchUserByUsername(req.query.username)
    .then((users) => {
      res.json(users)
    })
    .catch((err) => {
      return sendError(req, res);
    });
});

function sendNotFound(req, res) {
  return res.status(404).json({
    status: 404,
    message: "Not Found"
  });
}

function sendBadRequest(req, res) {
  return res.status(400).json({
    status: 400,
    message: "Bad Request"
  });
}

function sendError(req, res, err) {
  console.error(err);
  return res.status(500).json({
    status: 500,
    message: "Internal Server Error"
  });
}

module.exports = router;
