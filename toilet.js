var util = require('util');
var xmpp = require('node-xmpp');

function toilet_query(cl, message, from, room_to) {
    var toilet_pos = message.indexOf('@toilet');
    var tp_pos = message.indexOf('@tp');
    if (toilet_pos === 0 || tp_pos === 0) {

        var request = require("request");

        var url = "http://tp.velocitywebworks.com/status";

        request({
            url: url,
            json: true
        }, function (error, response, body) {

            if (!error && response.statusCode === 200) {
                chars = {
                    false: String.fromCharCode(0x2713), // Check mark
                    true: String.fromCharCode(0xD83D,0xDEAB),
                };
                util.log(body.mens_occupied); // Print the json response
                util.log(body.womens_occupied);
                cl.send(new xmpp.Element('message', { to: room_to, type: 'groupchat' }).
                  c('body').t('Mens: ' + chars[body.mens_occupied] + ', Womens: ' + chars[body.womens_occupied])
                );
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