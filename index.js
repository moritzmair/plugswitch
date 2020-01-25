// Author: Moritz Mair
// 
// Please do not change anything in this file. Use the config.js file to configure

const https = require('https');
const fetch = require("node-fetch");

if(typeof URLSearchParams === 'undefined'){
  URLSearchParams = require('url').URLSearchParams;
}

var config_file = require('./config.js');

var fritz = require('fritzapi');

var url = 'https://api.awattar.de/v1/marketdata';

var d = new Date();
var current_hour = d.getHours();

var price_threshold = config_file.price_threshold * 10
var basic_rate =  config_file.basic_rate

perform_request();

setInterval(function(){ perform_request(); }, 12*1000*60);

function perform_request(){
  https.get(url, function(res){
    var body = '';

    res.on('data', function(chunk){
      body += chunk;
    });

    res.on('end', function(){
      var response = JSON.parse(body);
      console.log("Got a response: ", response.data[0]);
      decide_switch(response.data[0].marketprice)
    });
  }).on('error', function(e){
    console.log("Got an error: ", e);
  });
}

function decide_switch(marketprice){
  fritz.getSessionID(config_file.user, config_file.password).then(function(sid) {
    fritz.getDeviceList(sid).then(function(list){
      for(var i = 0, len = list.length; i < len; i++){
        switch_state = list[i].switch.state;
        if((marketprice < price_threshold || current_hour == 2 || current_hour == 3 || current_hour == 4) && switch_state == 0){
          turn_switch(sid, list[i].identifier, 1);
          send_notification_telegram('Schalte '+list[i].name+' ein\nPreis pro KWH: '+(marketprice/10+basic_rate)+' Cent\nMarktpreis pro KWH: '+(marketprice/10)+' Cent\nTemperatur '+list[i].temperature.celsius/10+' °C');
          console.log('switched on '+list[i].name);
        }
        else if((marketprice > price_threshold+1 && current_hour != 2 && current_hour != 3 && current_hour != 4) && switch_state == 1){
          turn_switch(sid, list[i].identifier, 0);
          send_notification_telegram('Schalte '+list[i].name+' aus\nPreis pro KWH: '+(marketprice/10+basic_rate)+' Cent\nMarktpreis pro KWH: '+(marketprice/10)+' Cent\nTemperatur '+list[i].temperature.celsius/10+' °C');
          console.log('switched off '+list[i].name);
        }
      }
    });
  });
}

function turn_switch(sid, identifier, state){
  if(state == 1){
    fritz.setSwitchOn(sid, identifier);
  }else{
    fritz.setSwitchOff(sid, identifier);
  }
}

function send_notification_telegram(msg,price){
  const params = new URLSearchParams();
  params.append('secret', config_file.iot_bot_secret);
  params.append('message', msg);
  fetch('https://www.mercuriusbot.io/api/notify', { method: 'POST', body: params });
}