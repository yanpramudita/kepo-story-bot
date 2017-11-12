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
    case 'follow':
      return handleFollow(event.source);
    default:
      return handleUnknown(event.source);
  }
};


const handleMessage = (message, source) => {
  switch (message.type) {
    case 'text':
      return instagramAgent.searchUserByUsername(message.text)
        .then((users) => {
          if(_.isEmpty(users)){
            return sendText(source.userId, 'Yah kita ga nemu username kek gitu nih, coba yang lain deh.');
          }
          return Bluebird.all([
            sendCarousel(
              source.userId,
              util.format('Data user %s', message.text),
              generateColumnsFromUsers(users)
            ),
            sendText(source.userId, 'NB: Kalo ada error, coba add bot ini dulu.')
          ]);
        });
    default:
      return handleUnknown(source);
  }
};

const generateColumnsFromUsers = (users) => {
  return _.map(_.take(users,10), (user) => {
    return {
      thumbnailImageUrl: user.profile_pic_url,
      title: util.format('%s%s',user.username, user.is_verified ? ' \u2714' : ''),
      text: util.format('Mau kepoin storynya %s?', _.isEmpty(user.full_name) ? 'doi' : user.full_name),
      actions: [
        generatePostbackAction(
          util.format('Kepo!'),
          util.format('action=getStories&id=%s&username=%s&is_private=%s',
            user.pk, user.username, user.is_private
          )
        )
      ]
    };
  });
}

const handleUnknown = (source) => {
  return sendText(
    source.userId,
    'Yah, aku ga ngerti apa yang kamu maksud :( coba chat username yang mau kamu kepoin.'
  );
};

const handleFollow = (source) => {
  return sendText(
    source.userId,
    'Hai!\nMakasih udah add akun kita. Coba ketik username temen kamu (misal: awkarin) buat mulai kepoin doi!\n\nPS: Ga bakal ketahuan kok :)'
  );
};

const handlePostback = (postback, source) => {
  const postbackData = qs.parse(postback.data);

  switch (postbackData.action) {
    case 'getStories':
      if(postbackData.is_private === 'true'){
        return sendText(
          source.userId,
          util.format(
            'yah ignya %s di-private :( kita belum bisa ngepoin yang private-private nih.',
            postbackData.username
          )
        );
      }
      return getStories(postbackData, source);
    default:
      return handleUnknown(source);
  }
};

const getStories = (postbackData, source) => {
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

const sendCarousel = (userId, altText, columns) => {
  return sendTemplate(userId, altText, {
    type: 'carousel',
    columns: columns
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
