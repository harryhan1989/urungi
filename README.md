# Urungi

Lightweight Business Intelligence tool for reporting MongoDB, PostgreSQL, MySQL
and others, see [Supported databases](#supported-databases)


## Supported databases

- PostgreSQL
- MySQL
- MS SQL Server
- Oracle

Google Big Query might be supported, but to be honest we haven't tried it recently and it's probably broken.

## Requirements

- [nodejs](https://nodejs.org)
- [npm](https://www.npmjs.com)
- [bower](http://bower.io)
- [MongoDB](https://www.mongodb.org)

## Installation

1. Install the requirements listed above
2. Clone the github repository

    ```
    git clone https://github.com/biblibre/urungi.git
    cd urungi
    ```

3. Download and install dependencies

    ```
    npm install
    bower install
    ```


## Configuration

Urungi uses [config](https://www.npmjs.com/package/config) to manage its
configuration files.

You can change the configuration by creating a file in `config/` directory named
`local-{env}.js` (where {env} is one of: `production`, `development`) and
overriding any properties defined in `config/default.js`

More info at https://github.com/lorenwest/node-config/wiki/Configuration-Files


## Oracle connections

If you are going to use oracle connections, first you need to install in your
server the Oracle instant client and then run:

    npm install oracledb

More info at https://github.com/oracle/node-oracledb


## Starting up the Urungi server

1. Launch the server

    ```
    npm start
    ```

2. Point your browser to your ip/server name (eg. http://localhost:8080)
3. Enter the credentials

    - Username: `administrator`
    - Password: `widestage`

4. Enjoy!!!


## Tests

[![Build Status](https://travis-ci.org/biblibre/Urungi.svg?branch=master)](https://travis-ci.org/biblibre/Urungi)

To run the tests:

    npm test

To run a single test suite:

    npm test test/file-name.js

Some of the tests need a SQL database to connect to. Setup this database, then put all of the connection information in the sql_db field of your config file.
To disable tests which require a sql database, set this field to false
To run the tests on multiple databases (to test for all clients for example), set the field to an array of database config objects.

## License

[GPL 3.0](https://opensource.org/licenses/GPL-3.0)
