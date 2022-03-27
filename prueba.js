const moment = require('moment-timezone');

console.log(moment().tz("America/Monterrey").isDST())