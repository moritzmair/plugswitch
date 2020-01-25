exports.start = function(config){
  const haml = require('hamljs');
  const fs = require('fs');

  const express = require('express');
  const app = express();
  const port = config.port_webserver

  var data = {
    config: config
  };
  
  app.get('/', function (req, res) {
    var hamlView = fs.readFileSync('views/home.haml', 'utf8');
    res.end(haml.render(hamlView, {locals: data}) )
  })

  app.listen(port, () => console.log(`listening on port ${port}!`))
}