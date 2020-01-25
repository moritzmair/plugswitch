class Webserver {
  constructor(config) {
    this.config = config;

    this.device_list = {}
  }
  
  start(){
    const haml = require('hamljs');
    const fs = require('fs');

    const express = require('express');
    const app = express();

    const port = this.config.port_webserver

    var data = {
      config: this.config,
      list: JSON.stringify(this.device_list)
    };
    
    app.get('/', function (req, res) {
      var hamlView = fs.readFileSync('views/home.haml', 'utf8');
      res.end(haml.render(hamlView, {locals: data}) )
    })
  
    app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
  
    app.listen(port, () => console.log(`listening on port ${port}!`))
  }
}

module.exports = Webserver;