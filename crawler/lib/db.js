import mongoose from 'mongoose';
import Promise from 'bluebird';

export function setup(config=null) {
  if (!config) 
    config = require('./config').default;
  mongoose.Promise = Promise;
  mongoose.connect(config.mongo.uri, config.mongo.options);
  mongoose.connection.on('error', (err) => {
    console.error(err);
    process.exit(-1);
  });
};
