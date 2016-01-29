var config = {
  development: {
    server: {
      port: 3000,
      address: 'localhost',
      cdn: 'localhost:3000'
    }
  },
  testing: {
    server: {
      port: 3001,
      address: 'localhost',
      cdn: 'localhost'
    }
  },
  production: {
    server: {
      port: 8080,
      address: 'localhost',
      cdn: 'localhost'
    }
  }
};

module.exports = config[process.env.NODE_ENV] || config.development;
