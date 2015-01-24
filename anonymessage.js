var util = require('util');
var xmpp = require('node-xmpp');
var local_settings = require('./local_settings.json');

message_types = {
    'break': 'Someone thinks this chat belongs in the break room.',
    'nsfw': 'Someone thinks this chat is not work-appropriate.',
    'test': 'Someone thinks this belongs in the chatbot testing room.'
};

function send_message(text, cl, from, to) { // add 'cl' param
    console.log("sending message", text, cl, from, to);
    cl.send(new xmpp.Element('message', { to: to, type: "groupchat" }).
      c('body').t(text)
    );
}

function handle_message(cl, message, from, room_to) {
    var reg = /!\w+/i;
    if (reg.test(message) && message.search(reg) === 0) {
        var msg_type = message.match(reg)[0].substr(1);
        console.log('Message: ', message, ' Type: ', msg_type)
        var room_type = 2 + msg_type.length;
        for (var i = local_settings.room_jids.length - 1; i >= 0; i--) {
            if (local_settings.room_jids[i].search(room_type) > -1) {
                room_to = local_settings.room_jids[i];
                console.log('found a room_to: ', room_to)
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
