const https = require('https');

var login_data = require('./login_details.js');

var fritz = require('fritzapi');

var url = 'https://api.awattar.de/v1/marketdata';

var d = new Date();
var current_hour = d.getHours();

perform_request();

setInterval(function(){ perform_request(); }, 10*1000*60);

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
  if(marketprice < 20 || current_hour == 2 || current_hour == 3 || current_hour == 4){
    fritz.getSessionID(login_data.user, login_data.password).then(function(sid) {
      turn_all_switches_on(sid);
    });
  }else{
    fritz.getSessionID(login_data.user, login_data.password).then(function(sid) {
      turn_all_switches_off(sid);
    });
  }
}

function turn_all_switches_on(sid){
  fritz.getSwitchList(sid).then(function(ains){
    ains.each
    for (var i = 0, len = ains.length; i < len; i++) {
      console.log('turning on ' + ains[i]);
      fritz.setSwitchOn(sid, ains[i]);
    }
  });
}

function turn_all_switches_off(sid){
  fritz.getSwitchList(sid).then(function(ains){
    ains.each
    for (var i = 0, len = ains.length; i < len; i++) {
      console.log('turning off ' + ains[i]);
      fritz.setSwitchOff(sid, ains[i]);
    }
  });
}