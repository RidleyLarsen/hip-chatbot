var util = require('util');
var request = require('request'); // github.com/mikeal/request
var xmpp = require('node-xmpp');

// !weather <zip code>
// ex: !weather 84790
function weather_query_zip(cl, message, from, room_to) {
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
}

var handle_group_message = function(cl, message, from, room_to) {
  weather_query_zip(cl, message, from, room_to);
};

exports.handle_group_message = handle_group_message;
