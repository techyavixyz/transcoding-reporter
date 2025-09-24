function getEnv() {
    const { NAMESPACE_JK } = process.env;
    if (!NAMESPACE_JK) return 'local';
    return NAMESPACE_JK;
  }
  
  module.exports = getEnv;
  