// Score Tracker Module for Hip-Chatbot
// (C) 2014 Ridley Larsen
// MIT License

var util = require('util');
var xmpp = require('node-xmpp');

var databaseUrl = "mydb"; // "username:password@example.com/mydb"
var collections = ["objects"];
var db = require("mongojs").connect(databaseUrl, collections);

util.log(db, collections, databaseUrl);
util.inspect(collections);

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

  // If the message is something like this:
  //
  // ToiletPi is up (Ridley++), everybody go check it out!
  //
  // ...we want the name to end up as "ridley" and not "(ridley)".

  parens = result.match(/\([^\s]+[+-]{2}\)/);

  if (parens) {
    result = parens[0].slice(1, -1);
  }

  return result.replace(/\+\+|\-\-/g, "").toLowerCase();
}

// <object>++
// ex: (chompy)++
function score_handle_plus(cl, message, from, room_to) {
  plus_plus_pos = message.search(/[^\s]\+\+/);
  // find plus plusses
  if (plus_plus_pos > 0) {
    //console.log('this message has a ++ in it.');
    name = getWordWithoutScoreAt(message, plus_plus_pos);
    //console.log('name:', name);
    db.objects.find({'name': name}, function(err, objects) {
      if (err) {
        console.log(err);
      }
      reason_obj = {
        'up': true,
        'from': from.slice(from.indexOf('/') + 1, from.length),
        'reason': message,
        'date': new Date(),
      };
      // console.log('reason obj', reason_obj);
      // console.log('objects', objects);
      if(objects.length === 0){
        //console.log('[Awesome] no objects found. creating one.');
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
        //console.log('object found:', obj);
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
}

// <object>--
// ex: creepy_bunny--
function score_handle_minus(cl, message, from, room_to) {
  minus_minus_pos = message.search(/[^\s]--/);
  if (minus_minus_pos > 0) {
    //console.log('this message has a -- in it.');
    name = getWordWithoutScoreAt(message, minus_minus_pos);
    //console.log('name:', name);
    db.objects.find({'name': name}, function(err, objects) {
      if (err) {
        console.log(err);
      }
      reason_obj = {
        'up': false,
        'from': from.slice(from.indexOf('/') + 1, from.length),
        'reason': message,
        'date': new Date(),
      };
      //console.log('reason obj', reason_obj);
      //console.log('objects', objects);
      if(objects.length === 0){
        //console.log('[woot] no objects found. creating one.');
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
        //console.log('object found:', obj);
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
}

// @score <object>
// ex: @score brian
function score_query(cl, message, from, room_to) {
  if (message.indexOf('@score') === 0) {
    name = getWordAt(message, 7);
    db.objects.find({'name': new RegExp('^' + name, 'i')}, {}, {limit: 5}, function(err, objects) {
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
          c('body').t('[woot: score for ' + obj.name + ' is: ' + obj.score + '.]')
        );
      });
    });
  }
}

// @import <object>
// ex: @import brian
function import_score(cl, message, from, room_to) {
  if (message.indexOf('@import') === 0) {
    return; // don't remove this line. partychat scores have already been imported.
    message_split = message.split(' ');
    name = message_split[1];
    score = Number(message_split[2]);
    if (isNaN(score + 1)) {
      return;
    }
    db.objects.find({'name': name}, {}, {limit: 5}, function(err, objects) {
      if (err) {
        console.log(err);
      }
      if(objects.length === 0) {
        cl.send(new xmpp.Element('message', { to: room_to, type: 'groupchat' }).
          c('body').t('[woot: ' + name + ' not found.]')
        );
      }
      else objects.forEach(function(obj) {
        if (obj.scores_imported === true) {
          cl.send(new xmpp.Element('message', { to: room_to, type: 'groupchat' }).
            c('body').t('[error: scores for ' + obj.name + ' already imported.]')
          );
          return;
        }
        obj.score += score;
        reason_obj ={
          'up': true,
          'from': from.slice(from.indexOf('/') + 1, from.length),
          'reason': "Imported from PartyChat",
          'date': new Date(),
        };
        if (obj.reasons) {
            obj.reasons.push(reason_obj);
        }
        else {
            obj.reasons = [reason_obj];
        }
        db.objects.update({'name': name}, {$set: {'score': obj.score, reasons: obj.reasons, scores_imported: true}});
        cl.send(new xmpp.Element('message', { to: room_to, type: 'groupchat' }).
          c('body').t('[woot: score for ' + obj.name + ' is: ' + obj.score + '.]')
        );
      });
    });
  }
}

var handle_group_message = function(cl, message, from, room_to) {
  score_query(cl, message, from, room_to);
  score_handle_minus(cl, message, from, room_to);
  score_handle_plus(cl, message, from, room_to);
  import_score(cl, message, from, room_to);
};
exports.handle_group_message = handle_group_message;
