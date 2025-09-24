const getEnv = require('./getEnv');
const path = require('path');
const dotenv = require('dotenv');

// function setEnv() {
//   const env = getEnv();
//   console.log(`detected ${env} env! loading ${env}.env`);
//   dotenv.config({ path: path.join(__dirname, `../.env.${env}`) });
// }

function setEnv() {
  const env = getEnv();
  console.log(`detected ${env} env!, setting up configration for ${env} env!`);
  require('dotenv').config({ path: `${__dirname}/${env}.env` });
}

module.exports = setEnv;
