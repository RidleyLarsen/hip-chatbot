var util = require('util');
var xmpp = require('node-xmpp');

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

function toilet_query(cl, message, from, room_to) {
    var toilet_pos = message.indexOf('@toilet');
    var tp_pos = message.indexOf('@tp');
    if (toilet_pos === 0 || tp_pos === 0) {

        var request = require("request");

        var url = "http://192.168.10.47/status";

        request({
            url: url,
            json: true
        }, function (error, response, body) {

            if (!error && response.statusCode === 200) {
                chars = {
                    false: "(successful)", // Unicode: "Check mark" String.fromCharCode(0x2713),
                    true: "(failed)" // Unicode: "No Entry" String.fromCharCode(0xD83D,0xDEAB),
                };
                send_message('Mens: ' + chars[body.mens_occupied] + ', Womens: ' + chars[body.womens_occupied], cl, from, room_to);
            }
            else {
                util.log(error);
                util.log(response.statusCode);
            }
        });


    }
}

var handle_group_message = function(cl, message, from, room_to) {
  toilet_query(cl, message, from, room_to);
};

exports.handle_group_message = handle_group_message;
