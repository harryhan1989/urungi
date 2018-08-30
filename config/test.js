module.exports = {
    url: 'http://localhost:8080/',
    ip: '127.0.0.1',
    port: 8080,
    db: 'mongodb://localhost:27017/widestage_test',
    sql_db: {
        client: 'mysql',
        // possiblities are 'mysql', 'pg', 'oracledb' and 'mssql'

        connection: {
            host: 'localhost',
            user: 'koha',
            password: 'koha',
            database: 'QueryTests'
        }
    }
};
