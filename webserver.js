
class Webserver {
  constructor(config) {
    this.config = config;
  }

  refresh_parameters(list, awattar_response){
    this.data = {
      config: this.config,
      list: list,
      marketprice: awattar_response.data[0].marketprice,
      awattar_data: awattar_response.data
    };
    this.server.close();
    this.start();
  }
  
  start(){
    const haml = require('hamljs');
    const fs = require('fs');

    const express = require('express');
    const app = express();

    const port = this.config.port_webserver

    const data = this.data
    
    app.get('/', function (req, res) {
      var hamlView = fs.readFileSync('views/home.haml', 'utf8');
      res.end(haml.render(hamlView, {locals: data}) )
    })
  
    app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
  
    this.server = app.listen(port, () => console.log(`listening on port ${port}!`));
  }
}

module.exports = Webserver;