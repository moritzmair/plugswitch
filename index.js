// Author: Moritz Mair
// 
// Please do not change anything in this file. Use the config.json file to configure

const https = require('https');
const fetch = require("node-fetch");
const fs = require('fs');

var cron = require('node-cron');

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

//can be deleted?
var d = new Date();

var price_threshold = config_file.always_turn_on_below*10;

var epex_data = new Object();

var cheapest_hours = new Array();

refresh_epex();

cron.schedule('12 14 * * *', () => {
  // run every day at 14:12
  refresh_epex();
});

setInterval(function(){ decide_switch(); }, 1000*60);

function decide_switch(){
  marketprice = find_current_marketprice();
  fritz.getSessionID(config_file.fritzboxuser, config_file.fritzboxpassword).then(function(sid) {
    fritz.getDeviceList(sid).then(function(list){
      if(!config_file.fritz_ains.includes(list.identifier)){
        return;
      }
      d = new Date();
      server.refresh_parameters(list, epex_data, marketprice, cheapest_hours);
      var man_turn_on_until = server.get_man_turn_on_until();
      for(var i = 0, len = list.length; i < len; i++){
        switch_state = list[i].switch.state;
        if(marketprice < price_threshold || cheapest_hours.includes(d.getHours()) || man_turn_on_until > d){
          if(switch_state == 0){
            turn_switch(sid, list[i].identifier, 1);
            send_notification_telegram('Schalte '+list[i].name+' ein\nPreis pro KWH: '+(marketprice/10.0+config_file.basic_rate)+' Cent\nMarktpreis pro KWH: '+(marketprice/10.0)+' Cent\nTemperatur: '+list[i].temperature.celsius/10+' °C\nGesamtverbrauch bisher: '+list[i].powermeter.energy/1000+' KWH');
            console.log('switched on '+list[i].name);
            console.log(list);
          }
        }
        else if(switch_state == 1){
          turn_switch(sid, list[i].identifier, 0);
          send_notification_telegram('Schalte '+list[i].name+' aus\nPreis pro KWH: '+(marketprice/10.0+config_file.basic_rate)+' Cent\nMarktpreis pro KWH: '+(marketprice/10.0)+' Cent\nTemperatur: '+list[i].temperature.celsius/10+' °C\nGesamtverbrauch bisher: '+list[i].powermeter.energy/1000+' KWH');
          console.log('switched off '+list[i].name);
          console.log(list);
        }
      }
    });
  });
}

function find_current_marketprice(){
  current_timestamp = Date.now();
  for(var i = 0, len = epex_data.data.length; i < len; i++){
    if(epex_data.data[i].start_timestamp <= current_timestamp && epex_data.data[i].end_timestamp > current_timestamp){
      return epex_data.data[i].marketprice;
    }
  }
  return false;
}

function refresh_epex(){
  https.get(url, function(res){
    var body = '';

    res.on('data', function(chunk){
      body += chunk;
    });

    res.on('end', function(){
      var response = JSON.parse(body);
      console.log("refreshed epec data");
      epex_data = response;
      decide_switch();
      send_notification_telegram('Lade in folgenden Stunden: '+identify_cheapest_hours(Date.now()).join(', '));
    });
  }).on('error', function(e){
    console.log("Got an error: ", e);
  });
}

function identify_cheapest_hours(now){
  remaining_epex = new Array();
  date_now = new Date(now);

  //get timestamp of next event where battery needs to be full
  var needs_to_be_full = new Date(now);
  var hours_to_turn_on = config_file.hours_to_turn_on;
  needs_to_be_full.setMinutes(0);
  needs_to_be_full.setHours(config_file.turn_on_until_24h);
  if(date_now.getHours() > config_file.turn_on_until_24h){
    needs_to_be_full.setDate(needs_to_be_full.getDate() + 1);
  }
  
  var do_not_turn_on_before = new Date(now);
  do_not_turn_on_before.setMinutes(0);
  do_not_turn_on_before.setHours(config_file.hours_to_turn_on_after);
  if(date_now.getHours() <= config_file.turn_on_until_24h){
    do_not_turn_on_before.setDate(do_not_turn_on_before.getDate() - 1);
  }
  
  console.log("turn on from");
  console.log(do_not_turn_on_before);
  console.log("until");
  console.log(needs_to_be_full);
  
  for(var i = 0, len = epex_data.data.length; i < len; i++){
    if(epex_data.data[i].end_timestamp < needs_to_be_full && epex_data.data[i].start_timestamp > do_not_turn_on_before){
      remaining_epex.push(epex_data.data[i])
    }
  }

  remaining_epex = remaining_epex.sort(function(a, b){return a.marketprice - b.marketprice});

  if(hours_to_turn_on > remaining_epex.length){
    console.log('can only turn on for ' + remaining_epex.length + ' due to hours in config file or market data is not loaded yet')
    hours_to_turn_on = remaining_epex.length;
  }

  cheapest_hours = new Array();
  
  for(var i= 0; i < hours_to_turn_on; i++){
    var cheap_date = new Date(remaining_epex[i].start_timestamp)
    cheapest_hours.push(cheap_date.getHours());
  }

  return cheapest_hours;
}

function turn_switch(sid, identifier, state){
  if(state == 1){
    fritz.setSwitchOn(sid, identifier);
  }else{
    fritz.setSwitchOff(sid, identifier);
  }
}

function send_notification_telegram(msg){
  const params = new URLSearchParams();
  params.append('secret', config_file.mercuriusbot_secret);
  params.append('message', msg);
  console.log('send via telegram: '+msg);
  fetch('https://www.mercuriusbot.io/api/notify', { method: 'POST', body: params });
}

Date.prototype.addHours = function(h) {
  this.setTime(this.getTime() + (h*60*60*1000));
  return this;
}