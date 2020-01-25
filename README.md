# plugswitch

## What is this about?

This will switch on or off a fritz power plug according to the price of the electricity company awattar: https://www.awattar.de/tariffs/hourly

Using the fritzapi by andig -> https://github.com/andig/fritzapi

## Setup
* ```git clone https://github.com/moritzmair/plugswitch.git```
* ```cd plugswitch```
* ```npm install```
* ```cp config.js.example config.js```
* ```nano config.js``` (enter your login data here)

## Start Server
* ```node index.js```

## How to run on a server
It is a good idea to use this script on a raspberry pi, to run it you could use pm2:
* ```npm install pm2```
* ```pm2 startup``` (to autostart pm2 on boot)
* ```pm2 start index.js```
* ```pm2 save``` (to save that the line above should always be started on startup)
* view logs with ```pm2 log```

## Found a bug/need a feature?
Please use the Issue tracker on bitbucket: https://github.com/moritzmair/plugswitch/issues