/**
 * Created with JetBrains WebStorm.
 * User: hermenegildoromero
 * Date: 07/07/16
 * Time: 09:17
 * To change this template use File | Settings | File Templates.
 */

app.controller('reportCtrl', function ($scope, connection, $compile, reportService, $routeParams, $timeout, $rootScope, bsLoadingOverlayService, c3Charts,
    reportModel, widgetsCommon, $location, PagerService, gettext) {
    $scope.promptsBlock = 'partials/report/partials/promptsBlock.html';
    $scope.dateModal = 'partials/report/modals/dateModal.html';
    $scope.linkModal = 'partials/report/modals/linkModal.html';
    $scope.repeaterTemplate = 'partials/report/partials/repeater.html';
    $scope.publishModal = 'partials/report/modals/publishModal.html';
    $scope.columnFormatModal = 'partials/report/modals/columnFormatModal.html';
    $scope.columnSignalsModal = 'partials/report/modals/columnSignalsModal.html';
    $scope.dropArea = 'partials/report/partials/drop-area.html';
    $scope.reportNameModal = 'partials/report/modals/reportNameModal.html';
    $scope.dashListModal = 'partials/report/modals/dashboardListModal.html';
    $scope.filterPromptModal = 'partials/report/modals/filter-prompt-modal.html';
    $scope.settingsTemplate = 'partials/widgets/common.html';
    $scope.discardChangesModal = 'partials/modals/discardChangesModal.html';
    $scope.tabs = {selected: 'elements'};

    /*
    *   selectedReport is the report object which is currently being viewed/edited
    *   This object should contain only what is saved in the database
    */
    $scope.selectedReport = {};

    $scope.gettingData = false;
    $scope.showSQL = false;

    $scope.rows = [];

    // Each report uses a unique layer
    $scope.selectedReport.selectedLayerID = undefined;

    $scope.layers = [];
    // We don't need the layers here, we just fetch them so we can get the rootItem

    $scope.mode = 'view';
    /*
    *   The different modes are
    * view
    * new
    * edit
    * add - for creating a report from a dashboard
    */

    $scope.isForDash = false;
    $scope.hasChanges = false;

    // The number of lines to fetch
    $scope.selectedRecordLimit = { value: 500 };

    // Contains all of the elements made available by the layer
    $scope.rootItem = {};

    // Style
    $scope.textAlign = widgetsCommon.textAlign;
    $scope.fontSizes = widgetsCommon.fontSizes;
    $scope.fontWeights = widgetsCommon.fontWeights;
    $scope.fontStyles = widgetsCommon.fontStyles;
    $scope.colors = widgetsCommon.colors;
    $scope.signalOptions = widgetsCommon.signalOptions;

    /*
    *   Initialisation
    */

    $scope.initReportView = async function () {
        $scope.selectedReport = await reportModel.getReport($routeParams.reportID, false);
        $scope.initPrompts();
        $scope.$digest();
        $scope.repaintWithPrompts();
        $scope.mode = 'view';
    };

    $scope.initReportEdit = async function () {
        if (/dashboards/.test($location.path())) {
            return;
        }

        $scope.showOverlay('OVERLAY_reportLayout');

        await $scope.initLayers();

        if (/reports\/new/.test($location.path())) {
            $scope.mode = 'add';
            $scope.selectedReport = new reportModel.Report(false, $scope.layers[0]._id);
        } else if (/explore/.test($location.path())) {
            $scope.mode = 'explore';
            $scope.selectedReport = new reportModel.Report(false, $scope.layers[0]._id);
        } else {
            $scope.selectedReport = await reportModel.getReport($routeParams.reportID, false);
            var layer = $scope.layers.find(l => l._id === $scope.selectedReport.selectedLayerID);
            $scope.rootItem = layer.rootItem;
            $scope.mode = 'edit';
        }

        $scope.hideOverlay('OVERLAY_reportLayout');

        await $scope.refresh();
    };

    /*
    *   Note - report editing from dashboard
    * The report editor is accessible from the dashboard editor
    * In the code, this is done by including the report edit template in the dashbiard edit template
    * reportCtrl is then the controller of that template, and the $scope inherits from the dashboard $scope
    * Communication between the report and dashboard interface is done through events and through the service reportService
    */

    $scope.$on('newReportForDash', function (event, args) {
        $scope.mode = 'add';
        $scope.isForDash = true;

        $scope.initLayers().then(() => {
            $scope.selectedReport = new reportModel.Report(false, $scope.layers[0]._id);
        });
        console.log($scope.isForDash);
    });

    $scope.$on('loadReportStrucutureForDash', async function (event, args) {
        var report = args.report;
        console.log(report);
        await $scope.initLayers();

        $scope.selectedReport = report;
        $scope.mode = 'edit';
        $scope.isForDash = true;

        await $scope.initLayers();
        $scope.initForm();
    });

    $scope.initLayers = async function () {
        $scope.layers = await reportModel.getLayers();
        $scope.rootItem = $scope.layers[0].rootItem;
    };

    /*
    *   Note - prompts
    * Filters have the option to be set as "run time filters"
    * There will then be fields to enter the values for these filters when viewing the report and dashboard
    * These fields are called "prompts". They need to be handled separately from the report display, both in report view and dashboard view
    */

    $scope.initPrompts = function () {
        $scope.prompts = {};

        for (var filter of $scope.selectedReport.properties.filters) {
            if (filter.filterPrompt) {
                var prompt = {};
                for (const i in filter) {
                    prompt[i] = filter[i];
                }
                prompt.criterion = {};
                $scope.prompts[prompt.id + prompt.filterType] = prompt;
            }
        }
    };

    /*
    * Getters and setters
    */

    $scope.repaintWithPrompts = function () {
        var filterCriteria = {};
        for (const i in $scope.prompts) {
            filterCriteria[i] = $scope.prompts[i].criterion;
        }

        $scope.$broadcast('repaint', {
            fetchData: true,
            filterCriteria: filterCriteria
        });
    };

    /*
    *   A lot of the getters below are probably useless, but were left just to be sure not to break anything
    */

    $scope.getPrompts = function () {
        return $scope.prompts && Object.values($scope.prompts);
    };

    $scope.getSQLPanel = function () {
        $scope.showSQL = !$scope.showSQL;
    };

    $scope.removeItem = function (item, collection) {
        var id = collection.indexOf(item);
        collection.splice(id, 1);
    };

    $scope.showOverlay = function (referenceId) {
        bsLoadingOverlayService.start({
            referenceId: referenceId
        });
    };

    $scope.hideOverlay = function (referenceId) {
        bsLoadingOverlayService.stop({
            referenceId: referenceId
        });
    };

    $scope.stringVariables = [
        {value: 'toUpper', label: 'To Upper'},
        {value: 'toLower', label: 'To Lower'}
    ];

    if ($routeParams.extra === 'intro') {
        $timeout(function () { $scope.showIntro(); }, 1000);
    }

    $scope.changeLayer = function (selectedLayerID) {
        $scope.selectedReport.selectedLayerID = selectedLayerID;
        var layer = $scope.layers.find(l => l._id === $scope.selectedReport.selectedLayerID);
        $scope.rootItem = layer.rootItem;
    };

    $scope.getQuery = function () {
        return $scope.selectedReport.query;
    };

    $scope.getReport = function (hashedID) {
        return $scope.selectedReport;
    };

    $scope.getReportColumnDefs = function (reportID) {
        return $scope.selectedReport.properties.columnDefs;
    };

    $scope.getView = function (item) {
        if (item) {
            return 'nestable_item.html';
        }
        return null;
    };

    /*
    *   Modals and navigation buttons
    */

    $scope.goBack = function (confirm) {
        if (confirm) {
            $scope.dismissModal('#discardChangesModal');
        }

        if (!confirm && $scope.hasChanges) {
            $('#discardChangesModal').modal('show');
        } else {
            if ($scope.isForDash) {
                $scope.$emit('closeEditor');
            } else {
                $location.path('/reports');
            }
        }
    };

    $scope.reportName = function () {
        if ($scope.mode === 'add') {
            $('#theReportNameModal').modal('show');
        } else {
            $scope.reportNameSave();
        }
    };

    $scope.reportNameSave = async function () {
        $scope.selectedReport.generateQuery();
        // the query is generated before saving the report
        // This way, the report in the database has a query object which is ready for use

        if ($scope.isForDash) {
            reportService.addReport($scope.selectedReport);
            $scope.dismissModal('#theReportNameModal');
            $scope.$emmit('closeEditor');
        } else {
            await reportModel.saveAsReport($scope.selectedReport, $scope.mode);

            $scope.dismissModal('#theReportNameModal');

            $scope.$apply(() => $location.path('/reports'));
        }
    };

    $scope.saveForDash = function () {
        $scope.$emit('closeEditor', { updatedReport: $scope.selectedReport });
    };

    $scope.pushToDash = function () {
        var params = {};

        connection.get('/api/dashboardsv2/find-all', params, function (data) {
            $scope.dashboards = data;
            $('#dashListModal').modal('show');
        });
    };

    $scope.reportPushed2Dash = function (dashboardID) {
        $scope.dismissModal('#dashListModal');

        reportService.addReport($scope.selectedReport);
        $location.path('/dashboards/push/' + dashboardID);
    };

    $scope.publishReport = function () {
        $scope.objectToPublish = $scope.selectedReport;
        $('#publishModal').modal('show');
    };

    $scope.unPublish = async function () {
        await connection.post('/api/reports/unpublish', {_id: $scope.selectedReport._id});
        $scope.selectedReport.isPublic = false;
        $scope.$digest();
        $('#publishModal').modal('hide');
    };

    $scope.selectThisFolder = async function (folderID) {
        await connection.post('/api/reports/publish-report', {_id: $scope.selectedReport._id, parentFolder: folderID});
        $scope.selectedReport.parentFolder = folderID;
        $scope.selectedReport.isPublic = true;
        $scope.$digest();
        $('#publishModal').modal('hide');
    };

    $scope.showFilterModal = function (filter) {
        $scope.selectedFilter = filter;
        $('#filterPromptsModal').modal('show');
    };

    $scope.confirmFilterModal = function () {
        $('#filterPromptsModal').modal('hide');
        $scope.selectedFilter.filterPrompt = !$scope.selectedFilter.filterPrompt;
    };

    $scope.dismissModal = function (modalId) {
        /*
        * Clears the modal backdrop instantly
        * use this function if you want to leave the page after closing the modal
        * If you don't, the modal animation won't have time to complete and you'll arrive at your destination with a greyed-out background
        */

        $('.modal-backdrop').remove();
        $(modalId).modal('hide');
    };

    /*
    *   Report edition
    */

    $scope.refresh = async function () {
        /*
        *   The general global refresh function, which re-calculates and re-fetches everything
        *
        * For now, this function is only executed on initialisation and when the "refresh" button is pressed
        * It's possible to add it after some changes, or to trigger it automatically in some situations
        * This would make the report edition more fluid, but more costly in terms of database access
        */

        $scope.selectedReport.generateQuery();

        if (['chart-line', 'chart-donut', 'chart-pie', 'gauge'].indexOf($scope.selectedReport.reportType) >= 0) {
            reportModel.initChart($scope.selectedReport);
        }

        const params = {
            mode: $scope.mode,
            selectedRecordLimit: $scope.selectedRecordLimit.value
        };

        const result = await reportModel.fetchData($scope.selectedReport.query, params);

        if (result.errorToken) {
            $scope.errorToken = result.errorToken;
        }

        $scope.sql = result.sql;
        $scope.time = result.time;

        $scope.$broadcast('repaint', { fetchData: false });

        $scope.$digest();

        $scope.$broadcast('updateFilters', {query: $scope.selectedReport.query});
    };

    $scope.onDropOnFilter = function (data, event, type, group) {
        var item = data['json/custom-object'];
        event.stopPropagation();
        item.criterion = {
            text1: '',
            text2: '',
            textList: []
        };
        if ($scope.selectedReport.properties.filters.length > 0) {
            item.conditionType = 'and';
            item.conditionLabel = 'AND';
        }
        $scope.selectedReport.properties.filters.push(item);
        $scope.onDropField(item, 'filter');

        $scope.selectedReport.generateQuery();
        $scope.$broadcast('updateFilters', {query: $scope.selectedReport.query});
    };

    $scope.onDropField = function (newItem, role, forbidAggregation) {
        // A field is added to one of the the query-building drop areas

        $scope.sql = undefined;
        $scope.hasChanges = true;

        if (role === 'order') {
            reportModel.toOrder(newItem);
        }

        if (role === 'filter') {
            reportModel.toFilter(newItem);
        }

        if (newItem.aggregation && forbidAggregation) {
            if (typeof newItem.originalLabel === 'undefined') {
                newItem.originalLabel = newItem.elementLabel;
            }
            delete (newItem.aggregation);
            newItem.id = reportModel.changeColumnId(newItem.id, 'raw');
            newItem.elementLabel = newItem.originalLabel;
            newItem.objectLabel = newItem.originalLabel;
        }

        $scope.selectedReport.properties.connectedComponent = newItem.component;
    };

    $scope.onRemoveFilter = function (filterIndex) {
        var filter = $scope.selectedReport.properties.filters.splice(filterIndex, 1)[0];
        $scope.onRemoveField(filter, 'filter');
    };

    $scope.onRemoveField = function (item, role) {
        $scope.sql = undefined;
        $scope.hasChanges = true;

        var empty = true;

        for (const columnList of [
            $scope.selectedReport.properties.columns,
            $scope.selectedReport.properties.xkeys,
            $scope.selectedReport.properties.ykeys,
            $scope.selectedReport.properties.pivotKeys.columns,
            $scope.selectedReport.properties.pivotKeys.rows,
            $scope.selectedReport.properties.order,
            $scope.selectedReport.properties.filters
        ]) {
            if (columnList.length > 0) {
                empty = false;
                break;
            }
        }
        $scope.selectedReport.empty = empty;

        if ($scope.selectedReport.empty) {
            $scope.selectedReport.properties.connectedComponent = undefined;
        }
    };

    $scope.toColumnObject = function (ngModelItem) {
        return new reportModel.Column(ngModelItem);
    };

    $scope.autoChooseArea = function (item, chooseColumn) {
        return $scope.selectedReport.autoChooseArea(item, chooseColumn);
    };

    $scope.autoFill = function (ngModelItem) {
        const newItem = $scope.toColumnObject(ngModelItem);
        var choice = $scope.autoChooseArea(newItem);
        newItem.zone = choice.zone;

        if (newItem.aggregation && (newItem.zone === 'pcol' || newItem.zone === 'prow')) {
            if (typeof newItem.originalLabel === 'undefined') {
                newItem.originalLabel = newItem.elementLabel;
            }
            delete (newItem.aggregation);
            newItem.elementLabel = newItem.originalLabel;
            newItem.objectLabel = newItem.originalLabel;
        }

        var found = false;
        for (const item of choice.propertyBind) {
            if (item.elementID === newItem.elementID) { found = true; }
        }
        if (!found) {
            choice.propertyBind.push(newItem);
        }

        $scope.onDropField(newItem, choice.role, choice.forbidAggregation);
    };

    $scope.onDragOver = function (event) {
        // ...
    };

    $scope.filterChanged = function (elementID, values) {
    };

    $scope.setHeight = function (element, height, correction) {
        height = (height === 'full') ? $(document).height() : height;

        if (correction) height = height + correction;

        $('#' + element).css('height', height);
    };

    $scope.getButtonFilterPromptMessage = function (filter) {
        if (filter.filterPrompt) { return 'Select to deactivate the runtime'; } else { return 'Make this filter appear in the report interface.'; }
    };

    $scope.changeReportType = function (newReportType) {
        $scope.hasChanges = true;
        $scope.$broadcast('clearReport');
        $scope.selectedReport.changeReportType(newReportType);
    };

    $scope.isUsable = function (item) {
        // Answer whether an element can be added to the report
        // Elements which can't be joined to the currently used elements can't be used

        return $scope.selectedReport &&
            item.component !== -1 &&
            ($scope.selectedReport.properties.connectedComponent === undefined || // connectedComponent can be 0, which is why we can't just test it's truthyness
            item.component === undefined ||
            item.component === $scope.selectedReport.properties.connectedComponent);
    };

    $scope.chartColumnTypeOptions = c3Charts.chartColumnTypeOptions;

    $scope.chartSectorTypeOptions = c3Charts.chartSectorTypeOptions;

    $scope.changeChartColumnType = function (column, type) {
        $scope.hasChanges = true;
        column.type = type;
        c3Charts.changeChartColumnType($scope.selectedReport.properties.chart, column);
    };

    $scope.changeChartSectorType = function (column, type) {
        $scope.hasChanges = true;
        if (type === 'pie') { $scope.selectedReport.reportType = 'chart-pie'; }
        if (type === 'donut') { $scope.selectedReport.reportType = 'chart-donut'; }
        reportModel.repaintReport($scope.selectedReport, $scope.mode);
    };

    $scope.changeColumnStyle = function (columnIndex, hashedID) {
        $scope.hasChanges = true;
        reportModel.changeColumnStyle($scope.selectedReport, columnIndex, hashedID);
        $scope.selectedColumn = reportModel.selectedColumn();
        $scope.selectedColumnHashedID = reportModel.selectedColumnHashedID();
        $scope.selectedColumnIndex = reportModel.selectedColumnIndex();
    };

    $scope.changeColumnSignals = function (columnIndex, hashedID) {
        $scope.hasChanges = true;
        reportModel.changeColumnSignals($scope.selectedReport, columnIndex, hashedID);
        $scope.selectedColumn = reportModel.selectedColumn();
        $scope.selectedColumnHashedID = reportModel.selectedColumnHashedID();
        $scope.selectedColumnIndex = reportModel.selectedColumnIndex();
    };

    $scope.changeColumnColor = function (color) {
        if ($scope.selectedColumn.columnStyle) { $scope.selectedColumn.columnStyle.color = color; }
    };

    $scope.changeColumnBackgroundColor = function (color) {
        if ($scope.selectedColumn.columnStyle) { $scope.selectedColumn.columnStyle['background-color'] = color; }
    };

    $scope.setColumnFormat = function () {
        $scope.$broadcast('repaint');
    };

    $scope.orderColumn = function (columnIndex, desc, hashedID) {
        reportModel.orderColumn($scope.selectedReport, columnIndex, desc, hashedID);
    };

    $scope.aggregationChoosed = function (column, option) {
        $scope.hasChanges = true;
        reportModel.setAggregation(column, option);
    };

    $scope.hideColumn = function (column, hidden) {
        column['hidden'] = hidden;
    };

    $scope.stackBars = function (column, stacked) {
        column.doNotStack = !stacked;
        c3Charts.changeStack($scope.selectedReport.properties.chart);
    };

    $scope.saveToExcel = function (reportHash) {
        reportModel.saveToExcel($scope, reportHash);
    };

    $scope.setDatePatternFilterType = function (filter, option) {
        filter.searchValue = option.value;
        filter.filterText1 = option.value;
        filter.filterLabel1 = option.label;
    };

    $scope.getElementProperties = function (element, elementID) {
        $scope.selectedElement = element;
        $scope.tabs.selected = 'settings';
    };

    $scope.onChangeElementProperties = function () {

    };

    $scope.previewAvailable = function () {
        return $scope.selectedReport && $scope.selectedReport.properties &&
        ($scope.selectedReport.properties.columns.length > 0 || ($scope.selectedReport.properties.ykeys.length > 0 &&
            ($scope.selectedReport.properties.xkeys.length > 0 ||
                ($scope.selectedReport.properties.pivotKeys.columns.length > 0 && $scope.selectedReport.properties.pivotKeys.rows.length > 0))));
    };

    $scope.gridGetMoreData = function (reportID) {
        $scope.navigation.page += 1;
        reportModel.getReportDataNextPage($scope.selectedReport, $scope.navigation.page);
    };

    $scope.setSortType = function (field, type) {
        field.sortType = type;
    };

    $scope.chooseRecordLimit = function () {
        if ($scope.selectedRecordLimit.value > 0) {
            $scope.selectedReport.properties.recordLimit = $scope.selectedRecordLimit.value;
        }
    };

    $scope.forgetRecordLimit = function () {
        $scope.selectedRecordLimit.value = $scope.selectedReport.properties.recordLimit;
        delete $scope.selectedReport.properties.recordLimit;
    };

    $scope.hideErrorMessage = function () {
        $scope.selectedReport.hideErrorMessage = true;
    };

    /*
    *   Other
    */

    $scope.fieldsAggregations = {
        'number': [
            {name: gettext('Sum'), value: 'sum'},
            {name: gettext('Avg'), value: 'avg'},
            {name: gettext('Min'), value: 'min'},
            {name: gettext('Max'), value: 'max'},
            {name: gettext('Count'), value: 'count'},
            {name: gettext('Raw'), value: 'raw'}
        ],
        'date': [
            {name: gettext('Year'), value: 'year'},
            {name: gettext('Month'), value: 'month'},
            {name: gettext('Day'), value: 'day'},
            {name: gettext('Count'), value: 'count'},
            {name: gettext('Raw'), value: 'raw'}
            /* {name: 'Semester', value: 'semester'},
            {name: 'Quarter', value: 'quarter'},
            {name: 'Trimester', value: 'trimester'} */
        ],
        'string': [
            {name: gettext('Count'), value: 'count'},
            {name: gettext('Raw'), value: 'raw'}
        ]
    };

    $scope.IntroOptions = {
        // IF width > 300 then you will face problems with mobile devices in responsive mode
        steps: [
            {
                element: '#dataObjectsIntroBlock',
                html: '<div><h3>' +
                gettext('The layer catalog') +
                '</h3><span style="font-weight:bold;">' +
                gettext('Access here the different data elements of every layer that you have access on') +
                '</span><br/><span>' +
                gettext('Select elements and drag and drop them over the query design zone, depending if the element is going to be used as a column result (columns area), as a filter (filters area) or as an element to order by the results of the query (order by area)') +
                '</span></div>',
                width: '300px',
                height: '250px'
            },
            {
                element: '#selectLayer',
                html: '<div><h3>' +
                gettext('The layer selector') +
                '</h3><span style="font-weight:bold;">' +
                gettext('Select here the layer where your query will be based on.') +
                '</span><br/><span>' +
                gettext('One query can only be baes in just one layer, you can not mix elements from different layers in the same query') +
                '</span></div>',
                width: '300px',
                height: '250px',
                areaColor: 'transparent',
                areaLineColor: '#8DC63F'

            },
            {
                element: '#reportType',
                html: '<div><h3>' +
                gettext('Report Type selector') +
                '</h3><span style="font-weight:bold;">' +
                gettext('Click over one of the different report types to change the visualization of the data you choose') +
                '</span><br/><span></span></div>',
                width: '300px',
                areaColor: 'transparent',
                height: '180px'
            },
            {
                element: '#dropArea',
                html: '<div><h3>' +
                gettext('Results area') +
                '</h3><span style="font-weight:bold;color:#8DC63F"></span> <span style="font-weight:bold;">' +
                gettext('As you define the query draging and droping in the areas above, the results of the query will appear here') +
                '</span><br/><span></span></div>',
                width: '300px',
                height: '150px',
                areaColor: 'transparent',
                areaLineColor: '#fff'
            },
            {
                element: '#queryRefresh',
                html: '<div><h3>' +
                gettext('Query refresh') +
                '</h3><span style="font-weight:bold;color:#8DC63F"></span> <span style="font-weight:bold;">' +
                gettext('Use this button to refresh the results') +
                '</span><br/><span>' +
                gettext('After building your query, refresh to view the report.') +
                '</span></div>',
                width: '300px',
                height: '150px',
                areaColor: 'transparent',
                areaLineColor: '#fff',
                horizontalAlign: 'right'
            },
            {
                element: '#columnsDropzone',
                html: '<div><h3>' +
                gettext('Columns / results drop zone') +
                '</h3><span style="font-weight:bold;">' +
                gettext('Drop here the elements you want to have in the results of the query') +
                '</span><br/><span>' +
                gettext('A query must hold at least one element here to be executed') +
                '</span></div>',
                width: '300px',
                height: '180px'
            },
            {
                element: '#orderByDropzone',
                html: '<div><h3>' +
                gettext('Order By drop zone') +
                '</h3><span style="font-weight:bold;color:#8DC63F"></span> <span style="font-weight:bold;">' +
                gettext('Drop here the elements that you want to use to order the results of the query') +
                '</span><br/><span>' +
                gettext('The elements you drop in here do not necessarily have to be in the columns/results area, a query can be ordered by elements that do not appear in the results') +
                '</span></div>',
                width: '300px',
                height: '250px'
            },
            {
                element: '#filtersDropzone',
                html: '<div><h3>' +
                gettext('Filters drop zone') +
                '</h3><span style="font-weight:bold;color:#8DC63F"></span> <span style="font-weight:bold;">' +
                'Drop here the elements that you want to use to filter the results of the query' +
                '</span><br/><span>' +
                'The elements you drop in here do not necessarily have to be in the columns/results area, a query can be filtered by elements that do not appear in the results' +
                '</span></div>',
                width: '300px',
                height: '250px',
                areaColor: 'transparent',
                areaLineColor: '#fff'
            }

        ]
    };
});
