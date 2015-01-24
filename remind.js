var util = require('util');
var xmpp = require('node-xmpp');
var nodemailer = require('nodemailer');
var schedule = require('node-schedule');

var databaseUrl = "mydb"; // "username:password@example.com/mydb"
var collections = ["numbers"];
var db = require("mongojs").connect(databaseUrl, collections);

var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'vwebchat@gmail.com',
        pass: 'the chatbot'
    }
});

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

function remind_query(cl, message, from, room_to) {
    var email_pos = message.indexOf('@email');
    if (email_pos === 0) {
        // setup e-mail data with unicode symbols
        var mailOptions = {
            from: 'Chatbot <vwebchat@gmail.com>', // sender address
            to: '', // list of receivers
            subject: '', // Subject line
            text: 'Hello world ✔', // plaintext body
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, function(error, info){
            if(error){
                console.log(error);
            }else{
                console.log('Message sent: ' + info.response);
                send_message('Great! I\' ll remind you.', cl, from, room_to);
            }
        });
    }
}

var handle_group_message = function(cl, message, from, room_to) {
  remind_query(cl, message, from, room_to);
};

exports.handle_group_message = handle_group_message;
