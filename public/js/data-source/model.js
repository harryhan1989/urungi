app.service('datasourceModel', function ($http, $q, $filter, connection) {
    this.getDataSources = function (params, done) {
        connection.get('/api/data-sources/find-all', params, function (data) {
            if (data.result === 1) {
                for (const dts of data.items) {
                    reformat(dts);
                }
            }
            done(data);
        });
    };

    this.reformat = reformat;

    function reformat (dts) {
        /*
        *   The format of datasources was changed
        *   This function tests if the datasource is stored under the old format, and updates it to the new format
        *   It is mostly useful during development, and should be deleted for a final release of urungi
        */

        if (dts.params && dts.params.length > 0) {
            dts.connection = dts.params[0].connection;
            dts.schema = dts.params[0].schema;
            dts.packetSize = dts.params[0].packetSize;
        }
    }

    this.getEntitiesSchema = function (datasourceID, entity, done) {
        var data = {};
        data.datasourceID = datasourceID;
        data.entity = entity;

        connection.get('/api/data-sources/getEntitySchema', data, function (result) {
            if (result.result === 1) {
                done(result);
            }
        });
    };

    this.getSqlQuerySchema = function (datasourceID, collection, done) {
        var data = {};
        data.datasourceID = datasourceID;
        data.collection = collection;

        connection.get('/api/data-sources/getsqlQuerySchema', data, function (result) {
            if (result.result === 1) {
                done(result);
            }
        });
    };
});
