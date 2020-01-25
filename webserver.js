exports.start = function(config, device_list){
  const haml = require('hamljs');
  const fs = require('fs');

  const express = require('express');
  const app = express();
  const port = config.port_webserver

  var data = {
    config: config,
    list: JSON.stringify(device_list)
  };
  
  app.get('/', function (req, res) {
    var hamlView = fs.readFileSync('views/home.haml', 'utf8');
    res.end(haml.render(hamlView, {locals: data}) )
  })

  app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));

  app.listen(port, () => console.log(`listening on port ${port}!`))
}