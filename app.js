const express = require('express');
const bodyParser = require('body-parser');
const instagramAgent = require('./utils/instagram_agent');
const Bluebird = require('bluebird');

const app = express();
const port = process.env.PORT || 3000;

Bluebird.resolve()
  .then(() => instagramAgent.openPage())
  .then(() =>  instagramAgent.login())
  .then(() => {
    app.use(require('./controllers'));

    app.listen(port, () => {
      console.log('Listening on port ' + port);
    });
  })
