// Author: Moritz Mair
// 
// Please do not change anything in this file. Use the config.js file to configure

const https = require('https');
const fetch = require("node-fetch");
const fs = require('fs');

if(typeof URLSearchParams === 'undefined'){
  URLSearchParams = require('url').URLSearchParams;
}

let rawdata = fs.readFileSync('config.json');
let config_file = JSON.parse(rawdata);

var Webserver = require('./webserver.js');

server = new Webserver(config_file)
server.start();

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
      decide_switch(response)
    });
  }).on('error', function(e){
    console.log("Got an error: ", e);
  });
}

function decide_switch(awattar_response){
  marketprice = awattar_response.data[0].marketprice
  fritz.getSessionID(config_file.fritzboxuser, config_file.fritzboxpassword).then(function(sid) {
    fritz.getDeviceList(sid).then(function(list){
      server.refresh_parameters(list, awattar_response)
      for(var i = 0, len = list.length; i < len; i++){
        switch_state = list[i].switch.state;
        if((marketprice < price_threshold || current_hour == 2 || current_hour == 3 || current_hour == 4) && switch_state == 0){
          turn_switch(sid, list[i].identifier, 1);
          send_notification_telegram('Schalte '+list[i].name+' ein\nPreis pro KWH: '+(marketprice/10+basic_rate)+' Cent\nMarktpreis pro KWH: '+(marketprice/10)+' Cent\nTemperatur '+list[i].temperature.celsius/10+' °C');
          console.log('switched on '+list[i].name);
          decide_switch(awattar_response);
        }
        else if((marketprice > price_threshold+1 && current_hour != 2 && current_hour != 3 && current_hour != 4) && switch_state == 1){
          turn_switch(sid, list[i].identifier, 0);
          send_notification_telegram('Schalte '+list[i].name+' aus\nPreis pro KWH: '+(marketprice/10+basic_rate)+' Cent\nMarktpreis pro KWH: '+(marketprice/10)+' Cent\nTemperatur '+list[i].temperature.celsius/10+' °C');
          console.log('switched off '+list[i].name);
          decide_switch(awattar_response);
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
  params.append('secret', config_file.mercuriusbot_secret);
  params.append('message', msg);
  fetch('https://www.mercuriusbot.io/api/notify', { method: 'POST', body: params });
}