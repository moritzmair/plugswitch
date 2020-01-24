# plugswitch

## what is this about?

This will switch on or off a fritz power plug according to the price of the electricity company awattar: https://www.awattar.de/tariffs/hourly

At the moment configuration is done completly manually. Will consider working on this in the future.

## Setup
* git clone https://github.com/moritzmair/plugswitch.git
* cd plugswitch
* npm install
* cp login_details.js.example login_details.js
* nano login_details.js (enter your login data here)

## Start Server
* node index.js