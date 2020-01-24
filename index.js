var login_data = require('./login_details.js');

var Fritz = require('fritzapi').Fritz;

var f = new Fritz(login_data.user, login_data.password, login_data.ip);

f.getSwitchList().then(function(ains){
  console.log(f.getSID());
  console.log(ains);
});