/* global jsPlumb: false */

app.controller('dataSourceCtrl', function ($scope, connection, $routeParams, dataSourceNameModal, datasourceModel, $timeout, PagerService, $http, Constants, gettextCatalog) {
    $scope.activeForm = 'partials/data-source/source_wizard_index.html';
    $scope.selectedCollections = [];
    $scope.pager = {};

    if ($routeParams.extra === 'intro') {
        $timeout(function () { $scope.showIntro(); }, 1000);
    }

    $scope.IntroOptions = {
        // IF width > 300 then you will face problems with mobile devices in responsive mode
        steps: [
            {
                element: '#parentIntro',
                html: '<div><h3>' +
                gettextCatalog.getString('Data sources') +
                '</h3><span style="font-weight:bold;color:#8DC63F"></span> <span style="font-weight:bold;">' +
                gettextCatalog.getString('Data sources are connections to the databases you are going to generate reports for.') +
                '</span><br/><span>' +
                gettextCatalog.getString('Create and manage here the connections to databases that holds the data you want to be able to create reports using Urungi.') +
                '</span><br/><span>' +
                gettextCatalog.getString('At least one data source must be defined, unless you do not define some data source you and your users will not be able to create reports.') +
                '</span></div>',
                width: '500px',
                objectArea: false,
                verticalAlign: 'top',
                height: '250px'
            },
            {
                element: '#newDataSourceBtn',
                html: '<div><h3>' +
                gettextCatalog.getString('New datasource') +
                '</h3><span style="font-weight:bold;">' +
                gettextCatalog.getString('Click here to create a new datasource.') +
                '</span><br/><span></span></div>',
                width: '300px',
                height: '150px',
                areaColor: 'transparent',
                horizontalAlign: 'right',
                areaLineColor: '#fff'
            },
            {
                element: '#datasourceList',
                html: '<div><h3>' +
                gettextCatalog.getString('List of data sources') +
                '</h3><span style="font-weight:bold;">' +
                gettextCatalog.getString('Here all the data sources (database connections) will be listed.') +
                '</span><br/><span>' +
                gettextCatalog.getString('You can edit the connection details for every data source, delete a data source or activate/deactivate a datasource.') +
                '</span></div>',
                width: '300px',
                areaColor: 'transparent',
                areaLineColor: '#fff',
                verticalAlign: 'top',
                height: '180px'

            },
            {
                element: '#datasourceListItem',
                html: '<div><h3>' +
                gettextCatalog.getString('Data source') +
                '</h3><span style="font-weight:bold;">' +
                gettextCatalog.getString('This is one data source.') +
                '</span><br/><span></span></div>',
                width: '300px',
                areaColor: 'transparent',
                areaLineColor: '#72A230',
                height: '180px'

            },
            {
                element: '#datasourceListItemName',
                html: '<div><h3>' +
                gettextCatalog.getString('Data source name & type') +
                '</h3><span style="font-weight:bold;">' +
                gettextCatalog.getString('The name for the data source and the type of connection (end database).') +
                '</span><br/><span>' +
                gettextCatalog.getString('You can setup the name you want for data sources.') +
                '</span></div>',
                width: '300px',
                areaColor: 'transparent',
                areaLineColor: '#fff',
                height: '180px'

            },
            {
                element: '#datasourceListItemDetails',
                html: '<div><h3>' +
                gettextCatalog.getString('Data source connection details') +
                '</h3><span style="font-weight:bold;">' +
                gettextCatalog.getString('The main connection details for the data source.') +
                '</span><br/><span></span></div>',
                width: '300px',
                areaColor: 'transparent',
                areaLineColor: '#fff',
                height: '180px'

            },
            {
                element: '#parentIntro',
                html: '<div><h3>' +
                gettextCatalog.getString('Next Step') +
                '</h3><span style="font-weight:bold;color:#8DC63F"></span> <span style="font-weight:bold;">' +
                gettextCatalog.getString('Layers') +
                '</span><br/><br/><br/>' +
                gettextCatalog.getString('Layers') +
                '(<a href="https://en.wikipedia.org/wiki/Semantic_layer" target="_blank">semantic layers</a>)' +
                gettextCatalog.getString(' allow your users to access and understand your data without any knowledge of SQL or how the database is structured in tables and fields...') +
                '<br/><br/><span> <a class="btn btn-info pull-right" href="/#/layer/intro">' +
                gettextCatalog.getString('Go to layers and continue tour') +
                '</a></span></div>',
                width: '500px',
                objectArea: false,
                verticalAlign: 'top',
                height: '250px'
            }
        ]
    };

    init();

    function init () {
        if ($routeParams.newDataSource) {
            if ($routeParams.newDataSource === 'true') {
                $scope._dataSource = {};
                $scope._dataSource.connection = {};
                $scope._dataSource.packetSize = 500;
                $scope._dataSource.status = 1;
                $scope._dataSource.type = 'MySQL';

                $scope.mode = 'add';
            }
        } else {
            if ($routeParams.dataSourceID) {
                connection.get('/api/data-sources/find-one', {id: $routeParams.dataSourceID}, function (data) {
                    $scope._dataSource = data.item;
                });
            };
        }
    };

    $scope.save = function () {
        if ($scope.mode === 'add') {
            var data = $scope._dataSource;
            connection.post('/api/data-sources/create', data, function (data) {
                window.history.back();
            });
        } else {
            connection.post('/api/data-sources/update/' + $scope._dataSource._id, $scope._dataSource, function (result) {
                if (result.result === 1) {
                    window.history.back();
                }
            });
        }
    };

    $scope.upload = function (file) {
        if (file) {
            $scope._dataSource.connection.file = file.name;

            var fd = new FormData();

            fd.append('file', file);

            $http.post('/api/data-sources/upload-config-file', fd, {
                transformRequest: angular.identity,
                headers: {'Content-Type': undefined}
            })
                .success(angular.bind(this, function (data, status, headers, config) {
                    if (data.result === 1) {
                        $scope.fileUploadSuccess = true;
                        $scope.fileUploadMessage = 'File uploaded successfully';
                    } else {
                        $scope.fileUploadSuccess = false;
                        $scope.fileUploadMessage = 'File upload failed [' + data.msg + ']';
                    }
                }))
                .error(function (data, status) {
                    $scope.fileUploadSuccess = false;
                    $scope.fileUploadMessage = 'File upload failed [' + data.msg + ']';
                });
        }
    };

    $scope.enableTestConnection = function () {
        if (!$scope._dataSource) {
            return false;
        }

        if ($scope._dataSource.type !== 'BIGQUERY' &&
            // ($scope._dataSource.connection.host && $scope._dataSource.connection.port && $scope._dataSource.connection.database)
            ($scope._dataSource.connection.host && $scope._dataSource.connection.database)
        ) { return true; }

        if ($scope._dataSource.type === 'BIGQUERY' &&
            ($scope._dataSource.connection.database && $scope._dataSource.connection.file && $scope.fileUploadSuccess)
        ) { return true; }

        return false;
    };

    $scope.doTestConnection = function () {
        $scope.testConnection = {};
        var data = {};
        $scope.testingConnection = true;
        data.type = $scope._dataSource.type;
        data.host = $scope._dataSource.connection.host;
        data.port = $scope._dataSource.connection.port;
        data.database = $scope._dataSource.connection.database;
        data.userName = $scope._dataSource.connection.userName;
        data.password = $scope._dataSource.connection.password;

        if ($scope._dataSource.connection.file) data.file = $scope._dataSource.connection.file;

        console.log('calling');
        connection.post('/api/data-sources/testConnection', data, function (result) {
            console.log(result);
            if (result.result === 1) {
                $scope.testConnection = {result: 1, message: 'Successful database connection.'};
                $scope.testingConnection = false;
            } else {
                $scope.testConnection = {result: 0, message: 'Database connection failed.', errorMessage: result.msg};
                $scope.testingConnection = false;
            }
        });
    };

    $scope.getDataSources = function (page, search, fields) {
        var params = {};

        params.page = (page) || 1;

        if (search) {
            $scope.search = search;
        } else if (page === 1) {
            $scope.search = '';
        }
        if ($scope.search) {
            params.search = $scope.search;
        }

        if (fields) params.fields = fields;

        datasourceModel.getDataSources(params, function (data) {
            $scope.items = data.items;
            $scope.page = data.page;
            $scope.pages = data.pages;
            $scope.pager = PagerService.GetPager($scope.items.length, data.page, 10, data.pages);
        });
    };

    $scope.elementTypes = [
        {name: 'String', value: 'string'},
        {name: 'Number', value: 'number'},
        {name: 'Object', value: 'object'},
        {name: 'Date', value: 'date'},
        {name: 'Array', value: 'array'},
        {name: 'Boolean', value: 'boolean'}
    ];

    $scope.edit = function () {
        if ($routeParams.dataSourceID) {
            connection.get('/api/data-sources/find-one', {id: $routeParams.dataSourceID}, function (data) {
                $scope._dataSource = data.item;

                connection.post('/api/data-sources/testMongoConnection', $scope._dataSource.connection, function (result) {
                    var collections = [];

                    for (var i in result.items) {
                        collections.push(result.items[i].name);
                    }

                    var params = {
                        host: $scope._dataSource.connection.host,
                        port: $scope._dataSource.connection.port,
                        database: $scope._dataSource.connection.database,
                        collections: collections
                    };

                    $scope.loadingNewCollections = true;

                    connection.post('/api/data-sources/getMongoSchemas', params, function (result) {
                        $scope.schemas = [];

                        for (const i in result.items) {
                            var found = false;

                            if (!found) {
                                result.items[i].isNew = true;

                                for (const e in result.items[i].elements) {
                                    result.items[i].elements[e].isNew = true;
                                }

                                $scope.schemas.push(result.items[i]);
                            }
                        }

                        $scope.loadingNewCollections = false;
                    });
                });
            });
        }
    };
});

app.directive('postRender', [ '$timeout', function ($timeout) {
    var def = {
        restrict: 'A',
        terminal: true,
        transclude: true,
        link: function (scope, element, attrs) {
            $timeout(scope.redraw, 0); // Calling a scoped method
        }
    };
    return def;
}]);

// directives link user interactions with $scope behaviours
// now we extend html with <div plumb-item>, we can define a template <> to replace it with "proper" html, or we can
// replace it with something more sophisticated, e.g. setting jsPlumb arguments and attach it to a double-click
// event
app.directive('plumbItem', function () {
    return {
        replace: true,
        controller: 'PlumbCtrl',
        link: function (scope, element, attrs) {
            jsPlumb.makeTarget(element, {
                anchor: 'Continuous',
                maxConnections: 2,
            });
            jsPlumb.draggable(element, {
                containment: 'parent'
            });

            // this should actually done by a AngularJS template and subsequently a controller attached to the dbl-click event
            element.bind('dblclick', function (e) {
                jsPlumb.detachAllConnections($(this));
                $(this).remove();
                // stop event propagation, so it does not directly generate a new state
                e.stopPropagation();
                // we need the scope of the parent, here assuming <plumb-item> is part of the <plumbApp>
                scope.$parent.removeState(attrs.identifier);
                scope.$parent.$digest();
            });
        }
    };
});

//
// This directive should allow an element to be dragged onto the main canvas. Then after it is dropped, it should be
// painted again on its original position, and the full module should be displayed on the dragged to location.
//
app.directive('plumbMenuItem', function () {
    return {
        replace: true,
        controller: 'PlumbCtrl',
        link: function (scope, element, attrs) {
            jsPlumb.draggable(element, {
                containment: element.parent().parent()
            });
        }
    };
});

app.directive('plumbConnect', function () {
    return {
        replace: true,
        link: function (scope, element, attrs) {
            jsPlumb.makeSource(element, {
                parent: $(element).parent(),
                // anchor: 'Continuous',
                paintStyle: {
                    strokeStyle: '#225588',
                    fillStyle: 'transparent',
                    radius: 7,
                    lineWidth: 2
                },
            });
        }
    };
});
