module.exports = {
    disable: true,
    // If the SQL test database is unavailable, disable all the tests which need it

    client: 'mysql',
    // possiblities are 'mysql', 'pg', 'oracledb' and 'mssql'

    connection: {
        host: 'localhost',
        user: 'user',
        password: 'password',
        database: 'database'
    }
};
