// Basic XMPP bot for HipChat using node.js

var _version = '0.3';

var sys = require('sys');
var util = require('util');
var xmpp = require('node-xmpp');
var local_settings = require('./local_settings.json');

util.log('Welcome to HipChatbot version ' + _version);

var message_functions = [];

// Chat Modules
var score = require('./score_tracker.js');
var weather = require('./weather.js');
var toilet = require('./toilet.js');

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

// Functions

function handle_group_message(cl, message, from, room_to) {
  score.handle_group_message(cl, message, from, room_to);
  weather.handle_group_message(cl, message, from, room_to);
  toilet.handle_group_message(cl, message, from, room_to);
}


// Log all data received
//cl.on('data', function(d) {
//  util.log("[data in] " + d);
//});


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
  }

  // cl.send(new xmpp.Element('presence', { to: humor_jid+'/'+room_nick }).
  //   c('x', { xmlns: 'http://jabber.org/protocol/muc' })
  // );

  // send keepalive data or server will disconnect us after 150s of inactivity
  setInterval(function() {
    cl.send(new xmpp.Message({}));
  }, 30000);
});

cl.on('stanza', function(stanza) {
  // don't log error stanzas
  var from = stanza.attrs.from;
  if (stanza.attrs.type == 'error') {
    //util.log('[error] ' + stanza);
    return;
  }

  // ignore everything that isn't a room message
  if (!stanza.is('message') || (!stanza.attrs.type == 'groupchat')) {
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
  var room_to = room_from_jid + '@conf.hipchat.com' + '/' + room_nick;

  handle_group_message(cl, message, from, room_to);
});
