const superagent = require('superagent');
const Bluebird = require('bluebird');
const async = require('async')
const util = require('util');
const cookie = require('cookie');
const _ = require('lodash');

const IG_USERNAME = process.env.IG_USERNAME;
const IG_PASSWORD = process.env.IG_PASSWORD;

const agent = superagent.agent();

const openPage = () => {
  return new Bluebird((resolve, reject) => {
    agent
     .get('https://www.instagram.com/accounts/login/')
     .set('User-Agent','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36')
     .withCredentials()
     .end(function(err, res){
        if (err || !res.ok) {
          return reject(err);
        } else {
          const cookies = _.reduce(res.header['set-cookie'], (all, object) => {
            return _.extend(all, cookie.parse(object));
          }, {})
          return resolve(cookies);
       }
     });
  });
}

const login = (cookies) => {
  return new Bluebird((resolve, reject) => {
    agent
     .post('https://www.instagram.com/accounts/login/ajax/')
     .type('form')
     .set('User-Agent','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36')
     .set('Origin', 'https://www.instagram.com')
     .set('X-Instagram-AJAX', 1)
     .set('Accept', '*/*')
     .set('X-Requested-With', 'XMLHttpRequest')
     .set('X-CSRFToken', cookies.csrftoken)
     .set('Referer', 'https://www.instagram.com/')
     .set('Accept-Encoding', 'gzip, deflate, br')
     .set('Accept-Language', 'en-US,en;q=0.8')
     .set('Cookie', util.format(
       'mid=%s; csrftoken=%s; rur=%s',
       cookies.mid, cookies.csrftoken, cookies.rur)
     )
     .send({username: IG_USERNAME, password: IG_PASSWORD})
     .withCredentials()
     .end(function(err, res){
       if (err || !res.ok) {
         return reject(err);
       } else {
         if(!res.body.authenticated){
            return reject(new Error("Cannot Login"));
         }
         const cookies = _.reduce(res.header['set-cookie'], (all, object) => {
           return _.extend(all, cookie.parse(object));
         }, {})
         return resolve(cookies);
       }
     });
  });
}

const logout = (cookies) => {
  return new Bluebird((resolve, reject) => {
    agent
     .post('https://www.instagram.com/accounts/logout/')
     .type('form')
     .set('User-Agent','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36')
     .set('Origin', 'https://www.instagram.com')
     .set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8')
     .set('Referer', 'https://www.instagram.com/')
     .set('Accept-Encoding', 'gzip, deflate, br')
     .set('Accept-Language', 'en-US,en;q=0.8')
     .set('Upgrade-Insecure-Requests', 1)
     .set('Cookie', util.format('mid=%s; csrftoken=%s; rur=%s; sessionid=%s; ds_user_id=%s', cookies.mid, cookies.csrftoken, cookies.rur, cookies.sessionid, cookies.ds_user_id))
     .send({csrfmiddlewaretoken: cookies.csrftoken})
     .withCredentials()
     .end(function(err, res){
       if (err || !res.ok) {
         return reject(err);
       } else {
         const cookies = _.reduce(res.header['set-cookie'], function(all, object) {
           return _.extend(all, cookie.parse(object));
         }, {})
         return resolve(cookies);
       }
     });
  });
}

const getUserID = (username) => {
  return new Bluebird((resolve, reject) => {
    agent
     .get(util.format('https://www.instagram.com/%s/?__a=1', username))
     .set('User-Agent','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36')
     .end(function(err, res){
        if (err || !res.ok) {
          if(res.status == 404){
            return resolve({});
          }
          return reject(err);
        } else {
          return resolve(res.body.user);
       }
     });
   });
}

const getStories = (userId, cookies) => {
  return new Bluebird((resolve, reject) => {
    agent
     .get(util.format('https://i.instagram.com/api/v1/feed/user/%s/story/', userId))
     .set('User-Agent','Instagram 10.26.0 (iPhone7,2; iOS 10_1_1; en_US; en-US; scale=2.00; gamut=normal; 750x1334) AppleWebKit/420+')
     .set('Accept', '*/*')
     .set('Referer', 'https://www.instagram.com/')
     .set('Accept-Encoding', 'gzip, deflate, br')
     .set('Accept-Language', 'en-US,en;q=0.8')
     .set('Cookie', util.format('sessionid=%s; ds_user_id=%s; csrftoken=%s', cookies.sessionid, cookies.ds_user_id, cookies.csrftoken))
     .withCredentials()
     .end(function(err, res){
        if (err || !res.ok) {
          return reject(err);
        } else {
          if(_.isUndefined(res.body.reel) || _.isNull(res.body.reel)){
            return resolve([]);
          }
          return resolve(_.map(res.body.reel.items, (item) => {
            return {
              type: item.media_type,
              media: item.media_type == 1 ? _.head(item.image_versions2.candidates) : _.head(item.video_versions)
            };
          }));
       }
     });
   });
}

const main = () => {
  let cookies;
  Bluebird.resolve()
    .then(() => openPage())
    .then((firstCookie) => {
      cookies = firstCookie;
      return login(cookies);
    })
    .then((loginCookie) => {
      cookies = loginCookie;
      return getUserID('someusername');
    })
    .then((userResult) => {
      return getStories(userResult.id, cookies);
    })
    .then((medias) => console.log(medias))
    .catch((error) => {
      console.error(error);
    })
    .finally(() => logout(cookies))
}

main();
