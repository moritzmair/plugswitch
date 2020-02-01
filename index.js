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

var basic_rate =  config_file.basic_rate;
var price_threshold = config_file.always_turn_on_below*10;

var epex_data = new Object();



refresh_epex();
setInterval(function(){ refresh_epex(); }, 1000*60*60*5);
setInterval(function(){ decide_switch(epex_data); }, 1000*60);

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
      cheapest_hours = identify_cheapest_hours();
      for(var i = 0, len = list.length; i < len; i++){
        switch_state = list[i].switch.state;
        if((marketprice < price_threshold || cheapest_hours.includes(current_hour)) && switch_state == 0){
          turn_switch(sid, list[i].identifier, 1);
          send_notification_telegram('Lade in folgenden Stunden: '+cheapest_hours.join(', ')+'\nSchalte '+list[i].name+' ein\nPreis pro KWH: '+(marketprice/10+basic_rate)+' Cent\nMarktpreis pro KWH: '+(marketprice/10)+' Cent\nTemperatur '+list[i].temperature.celsius/10+' °C');
          console.log('switched on '+list[i].name);
        }
        else if((marketprice > price_threshold+1 && !cheapest_hours.includes(current_hour)) && switch_state == 1){
          turn_switch(sid, list[i].identifier, 0);
          send_notification_telegram('Lade in folgenden Stunden: '+cheapest_hours.join(', ')+'\nSchalte '+list[i].name+' aus\nPreis pro KWH: '+(marketprice/10+basic_rate)+' Cent\nMarktpreis pro KWH: '+(marketprice/10)+' Cent\nTemperatur '+list[i].temperature.celsius/10+' °C');
          console.log('switched off '+list[i].name);
        }
      }
    });
  });
}

function refresh_epex(){
  https.get(url, function(res){
    var body = '';

    res.on('data', function(chunk){
      body += chunk;
    });

    res.on('end', function(){
      var response = JSON.parse(body);
      console.log("Got a new epec data: ", response.data);
      epex_data = response;
    });
  }).on('error', function(e){
    console.log("Got an error: ", e);
  });
}

function identify_cheapest_hours(){
  cheapest_hours = new Array();
  remaining_epex = new Array();
  //get timestamp of next event where battery needs to be full
  var needs_to_be_full = new Date();
  if(d.getHours() <= config_file.turn_on_until_24h){
    needs_to_be_full.setHours(config_file.turn_on_until_24h);
  }else{
    needs_to_be_full.setHours(config_file.turn_on_until_24h);
    needs_to_be_full.setDate(needs_to_be_full.getDate() + 1);
  }

  console.log("needs to be full at " + needs_to_be_full)
  
  for(var i = 0, len = epex_data.data.length; i < len; i++){
    if(epex_data.data[i].start_timestamp < needs_to_be_full && epex_data.data[i].start_timestamp > config_file.hours_to_turn_on_after){
      var date = new Date(epex_data.data[i].start_timestamp);
      remaining_epex.push(epex_data.data[i])
    }
  }

  remaining_epex = remaining_epex.sort(function(a, b){return a.marketprice - b.marketprice});

  for(var i= 0; i < config_file.hours_to_turn_on; i++){
    var cheap_date = new Date(remaining_epex[i].start_timestamp)
    cheapest_hours.push(cheap_date.getHours());
  }

  console.log(cheapest_hours)

  return cheapest_hours
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
