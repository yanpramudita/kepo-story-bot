const line = require('@line/bot-sdk');
const _ = require('lodash');
const util = require('util');
const qs = require('querystring');
const Bluebird = require('bluebird');

const instagramAgent = require('./instagram_agent');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

const handleEvent = module.exports.handleEvent = (event) => {
  switch (event.type) {
    case 'message':
      return handleMessage(event.message, event.source);
    case 'postback':
      return handlePostback(event.postback, event.source);
    default:
      return handleUnknown(event.source);
  }
};


const handleMessage = (message, source) => {
  switch (message.type) {
    case 'text':
      return instagramAgent.getUserID(message.text)
        .then((user) => {
          if(_.isUndefined(user)){
            return sendText(source.userId, 'Username tidak ditemukan');
          }
          return Bluebird.all([
            sendButtons(
              source.userId,
              util.format('Data user %s', user.username),
              user.profile_pic_url_hd,
              user.full_name,
              util.format('Mau kepo story %s?',
                user.username
              ),
              [
                generatePostbackAction(
                  util.format('Kepo!'),
                  util.format('action=getStories&id=%s&username=%s',
                    user.id, user.username
                  )
                )
              ]
            ),
            sendText(source.userId, 'NB: Kalo ada error, coba add bot ini dulu.')
          ])
        });
    default:
      return handleUnknown(source);
  }
};

const handleUnknown = (source) => {
  return sendText(
    source.userId,
    'Yah, aku ga ngerti apa yang kamu maksud :( coba chat username yang mau kamu kepoin.'
  );
};

const handlePostback = (postback, source) => {
  const postbackData = qs.parse(postback.data);
  switch (postbackData.action) {
    case 'getStories':
      return sendText(
        source.userId,
        util.format('lagi kepoin story %s...', postbackData.username)
      )
      .then(() => instagramAgent.getStories(postbackData.id))
      .then((stories) => {
        if(_.isEmpty(stories)){
          return sendText(
            source.userId,
            'doi belum bikin story nih'
          );
        }
        return Bluebird.map(
          _.chunk(stories,5),
          (story) => {
            return client.pushMessage(source.userId, story);
          }
        )
        .then(() => sendText(
          source.userId,
          util.format(
            'selesai kepoin story %s!\nChat username lain untuk lanjut kepo',
            postbackData.username
          )
        ));
      });
    default:
      return handleUnknown(source);
  }
};

const sendText = (userId, text) => {
  return client.pushMessage(userId, {
    type: 'text',
    text: text
  });
};

const sendTemplate = (userId, altText, template) => {
  return client.pushMessage(userId, {
    type: 'template',
    altText: altText,
    template: template
  });
};

const sendButtons = (userId, altText, thumbnailImageUrl, title, text, actions) => {
  return sendTemplate(userId, altText, {
    type: 'buttons',
    thumbnailImageUrl: thumbnailImageUrl,
    title: title,
    text: text,
    actions: actions
  });
};

const generatePostbackAction = (label, data) => {
  return {
    type: 'postback',
    label: label,
    data: data
  };
};

const middleware = module.exports.middleware = line.middleware(config);
