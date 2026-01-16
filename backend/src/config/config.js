require('dotenv').config();

const config = {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    dialectOptions: {
        ssl: process.env.DB_SSL === 'true' ? { require: true, rejectUnauthorized: false } : false
    }
};

module.exports = {
    development: config,
    test: config,
    production: config
};
