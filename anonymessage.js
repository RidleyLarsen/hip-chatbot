var util = require('util');
var xmpp = require('node-xmpp');

message_types = {
    'break': 'Someone thinks this chat belongs in the break room.',
    'nsfw': 'Someone thinks this chat is not work-appropriate.',
    'test': 'Someone thinks this belongs in the chatbot testing room.'
};

function send_message(text, cl, from, to) { // add 'cl' param
    var type;
    if (from.indexOf("chat.hipchat.com") > 0) {
      type = 'chat';
      to = from;
    }
    else if (from.indexOf('conf.hipchat.com') > 0) {
      type = 'groupchat';
    }
    cl.send(new xmpp.Element('message', { to: to, type: type }).
      c('body').t(text)
    );
}

function handle_message(cl, message, from, room_to) {
    var reg = /!\w+/i;
    if (reg.test(message) && message.search(reg) === 0) {
        var msg_type = message.match(reg)[0].substr(1);
        var room_type = 2 + msg_type.length;
        for (var i = local_settings.room_jids.length - 1; i >= 0; i--) {
            if (local_settings.room_jids[i].search(room_type)) {
                room_to = local_settings.room_jids[i];
                break;
            }
        }
        send_message(message_types[msg_type], cl, from, room_to);
    }
}

var handle_group_message = function(cl, message, from, room_to) {
  handle_message(cl, message, from, room_to);
};

exports.handle_group_message = handle_group_message;
