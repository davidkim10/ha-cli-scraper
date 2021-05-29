const clc = require('cli-color');

const error = clc.red;
const info = clc.cyanBright;
const notice = clc.yellowBright;
const success = clc.green;

module.exports = {
  clc,
  error,
  info,
  notice,
  success,
};
