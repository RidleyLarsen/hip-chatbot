// Basic XMPP bot example for HipChat using node.js
// To use:
//  1. Set config variables
//  2. Run `node hipchat_bot.js`
//  3. Send a message like "!weather 94085" in the room with the bot


var request = require('request'); // github.com/mikeal/request
var sys = require('sys');
var util = require('util');
var xmpp = require('node-xmpp');
var local_settings = require('./local_settings.json');

// Config (get details from https://www.hipchat.com/account/xmpp)

var jid = local_settings.jid;
var password = local_settings.password;
var room_jids = local_settings.room_jids;
var room_nick = local_settings.room_nick;

var cl = new xmpp.Client({
  jid: jid + '/bot',
  password: password
});

util.inspect(cl);

/// functions

function getWordAt(str, pos) {
    str = String(str);
    pos = Number(pos) >>> 0;
    var left = str.slice(0, pos+1).search(/\S+$/);
    var right = str.slice(pos).search(/\s/);

    if  (right < 0) {
        return str.slice(left, str.length);
    }
    return str.slice(left, right+pos);
}

function getWordWithoutScoreAt(str, pos) {
  result = getWordAt(str, pos);
  return result.slice(0, result.length - 2);
}


// Log all data received
//cl.on('data', function(d) {
//  util.log("[data in] " + d);
//});

var databaseUrl = "mydb"; // "username:password@example.com/mydb"
var collections = ["objects"];
var db = require("mongojs").connect(databaseUrl, collections);
util.log(db, collections, databaseUrl)
util.inspect(collections)
// Once connected, set available presence and join room
cl.on('online', function() {
  util.log("We're online!");

  // set ourselves as online
  cl.send(new xmpp.Element('presence', { type: 'available' }).
    c('show').t('chat')
   );

  // join room (and request no chat history)
  for (var i = room_jids.length - 1; i >= 0; i--) {
     cl.send(new xmpp.Element('presence', { to: room_jids[i] + '/' + room_nick }).
       c('x', { xmlns: 'http://jabber.org/protocol/muc' }));
  };

  // cl.send(new xmpp.Element('presence', { to: humor_jid+'/'+room_nick }).
  //   c('x', { xmlns: 'http://jabber.org/protocol/muc' })
  // );

  // send keepalive data or server will disconnect us after 150s of inactivity
  setInterval(function() {
    cl.send(new xmpp.Message({}));
  }, 30000);
});

cl.on('stanza', function(stanza) {
  // always log error stanzas
  var from = stanza.attrs.from;
  if (stanza.attrs.type == 'error') {
    // util.log('[error] ' + stanza);
    return;
  }

  // ignore everything that isn't a room message
  if (!stanza.is('message') || !stanza.attrs.type == 'groupchat') {
    return;
  }

  // ignore messages we sent
  if (from.slice(from.indexOf('/') + 1, from.length) == room_nick) {
    return;
  }

  var body = stanza.getChild('body');
  // message without body is probably a topic change
  if (!body) {
    return;
  }
  var message = body.getText();

  var room_from_jid = from.slice(0, from.indexOf("@"));
  var room_to = room_from_jid + '@conf.hipchat.com' + '/' + room_nick

  // console.log('message from: ' + from + '. message text:' + message);
  plus_plus_pos = message.indexOf('++');
  // find plus plusses
  if (plus_plus_pos > 0) {
    console.log('this message has a ++ in it.');
    name = getWordWithoutScoreAt(message, plus_plus_pos);
    console.log('name:', name);
    db.objects.find({'name': name}, function(err, objects) {
      if (err) {
        console.log(err);
      }
      reason_obj = {
        'up': true,
        'from': from.slice(from.indexOf('/') + 1, from.length),
        'reason': message,
        'date': new Date(),
      }
      // console.log('reason obj', reason_obj);
      // console.log('objects', objects);
      if(objects.length === 0){
        console.log('[Awesome] no objects found. creating one.');
        obj = {
          'name': name,
          'score': 1,
          'reasons': [reason_obj],
        };
        db.objects.save(obj);
        cl.send(new xmpp.Element('message', { to: room_to, type: 'groupchat' }).
          c('body').t('[Awesome! new item! ' + name + ' now at ' + obj.score + '!]')
        );
      }
      else objects.forEach(function(obj) {
        console.log('object found:', obj);
        obj.score++;
        if (obj.reasons) {
            obj.reasons.push(reason_obj);
        }
        else {
            obj.reasons = [reason_obj];
        }
        db.objects.update({'name': name}, {$set: {'score': obj.score, reasons: obj.reasons}});
        cl.send(new xmpp.Element('message', { to: room_to, type: 'groupchat' }).
          c('body').t('[Awesome! ' + name + ' now at ' + obj.score + '!]')
        );
      });
    });
  }
  minus_minus_pos = message.indexOf('--');
  // find plus plusses
  if (minus_minus_pos > 0) {
    console.log('this message has a -- in it.');
    name = getWordWithoutScoreAt(message, minus_minus_pos);
    console.log('name:', name);
    db.objects.find({'name': name}, function(err, objects) {
      if (err) {
        console.log(err);
      }
      reason_obj = {
        'up': false,
        'from': from.slice(from.indexOf('/') + 1, from.length),
        'reason': message,
        'date': new Date(),
      }
      console.log('reason obj', reason_obj);
      console.log('objects', objects);
      if(objects.length === 0){
        console.log('[woot] no objects found. creating one.');
        obj = {
          'name': name,
          'score': -1,
          'reasons': [reason_obj],
        };
        db.objects.save(obj);
        cl.send(new xmpp.Element('message', { to: room_to, type: 'groupchat' }).
          c('body').t('[ouch! bad start! ' + name + ' now at ' + obj.score + '!]')
        );
      }
      else objects.forEach(function(obj) {
        console.log('object found:', obj);
        obj.score--;
        if (obj.reasons) {
            obj.reasons.push(reason_obj);
        }
        else {
            obj.reasons = [reason_obj];
        }
        db.objects.update({'name': name}, {$set: {'score': obj.score, reasons: obj.reasons}});
        cl.send(new xmpp.Element('message', { to: room_to, type: 'groupchat' }).
          c('body').t('[ouch! ' + name + ' now at ' + obj.score + '!]')
        );
      });
    });
  }

  if (message.indexOf('@score') === 0) {
    name = getWordAt(message, 7);
    db.objects.find({'name': name}, function(err, objects) {
      if (err) {
        console.log(err);
      }
      if(objects.length === 0) {
        cl.send(new xmpp.Element('message', { to: room_to, type: 'groupchat' }).
          c('body').t('[woot: ' + name + ' not found.]')
        );
      }
      else objects.forEach(function(obj) {
        cl.send(new xmpp.Element('message', { to: room_to, type: 'groupchat' }).
          c('body').t('[woot: score for ' + name + ' is: ' + obj.score + '.]')
        );
      });
    });
  }

  // Look for messages like "!weather 94085"
  if (message.indexOf('!weather') === 0) {
    var search = message.substring(9);
    util.log('Fetching weather for: "' + search + '"');

    // hit Yahoo API
    var query = 'select item from weather.forecast where location = "'+search+'"';
    var uri = 'http://query.yahooapis.com/v1/public/yql?format=json&q='+encodeURIComponent(query);
    request({'uri': uri}, function(error, response, body) {
      body = JSON.parse(body);
      var item = body.query.results.channel.item;
      if (!item.condition) {
        response = item.title;
      } else {
        response = item.title+': '+item.condition.temp+' degrees and '+item.condition.text;
      }

      // send response
      cl.send(new xmpp.Element('message', { to: room_to, type: 'groupchat' }).
        c('body').t(response)
      );
    });
  }
});
