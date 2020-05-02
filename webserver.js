
class Webserver {
  constructor(config) {
    this.config = config;
    this.data = {man_turn_on_until: new Date}
  }

  refresh_parameters(list, awattar_response, marketprice, cheapest_hours){
    this.data = {
      config: this.config,
      list: list,
      marketprice: marketprice,
      awattar_data: awattar_response.data,
      cheapest_hours: cheapest_hours,
      man_turn_on_until: this.data.man_turn_on_until
    };
    this.server.close();
    this.start_server();
  }

  get_man_turn_on_until(){
    return this.data.man_turn_on_until;
  }
  
  start(){
    console.log(`server will listen on port ${this.config.port_webserver}!`);
    this.start_server();
  }

  start_server(){
    const haml = require('hamljs');
    const fs = require('fs');

    const express = require('express');
    const app = express();

    const port = this.config.port_webserver

    const data = this.data

    var webserver = this
    
    app.get('/', function (req, res) {
      if(req.query.turn_on_hours){
        var man_turn_on_until = new Date();
        man_turn_on_until.addHours(req.query.turn_on_hours)
        webserver.data.man_turn_on_until = man_turn_on_until;
      }
      var hamlView = fs.readFileSync('views/home.haml', 'utf8');
      res.end(haml.render(hamlView, {locals: data}) )
    })
  
    app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
  
    this.server = app.listen(port);
  }
}

module.exports = Webserver;