"use strict";
const bcrypt = require('bcrypt');

// Compare
async function compare(str, hash) {
  try {
    var ok = await bcrypt.compare(str, hash);

    if (ok === true) {
      return({result:true});
    } else {
      return({result:false});
    }
  } catch (e) {
    return({result:false, info:"Internal Error", errorCode: 1205, error:e});
  }
}

// Hash
async function hash(str) {
  const saltRound = 10;
  try {
    var salt = await bcrypt.genSalt(saltRound);
    try {
      var hash = await bcrypt.hash(str, salt);
      return({result:true, hash:hash});
    } catch (e) {
      return({result:false, info:"Internal Error", errorCode: 1204, error:e});
    }
  } catch (e) {
    return({result:false, info:"Internal Error", errorCode: 1206, error:e});
  }
}

module.exports = {
  hash: hash,
  compare: compare
}
