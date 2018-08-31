/* global XLSX: false, Blob: false, datenum: false */

app.service('reportModel', function (bsLoadingOverlayService, connection, uuid2, FileSaver) {
    this.Report = function (data, layerID) {
        /*
        *   the report object
        * This constructor serves to validate the report object, make sure no fields are missing, and set a central standard for the report object structure
        * Pass an object as the data argument to copy that object into a clean report object
        * Pass no argument to create a new report object
        */
        if (data) {
            this.draft = data.draft || true;
            this.badgeStatus = data.badgeStatus || 0;
            this.exportable = data.exportable || true;
            this.badgeMode = data.badgeMode || 1;

            this.selectedLayerID = data.selectedLayerID || layerID;
            this.reportType = data.reportType || 'grid';

            this.properties = {};
            let prop;
            if (data.properties) {
                prop = data.properties;
            } else {
                prop = {};
                noty({ text: 'Report properties not found', tmeout: 3500, type: 'warning' });
            }

            this.properties.xkeys = prop.xkeys || [];
            this.properties.ykeys = prop.ykeys || [];
            this.properties.columns = prop.columns || [];

            this.properties.pivotKeys = {};
            if (prop.pivotKeys) {
                this.properties.pivotKeys.columns = prop.pivotKeys.columns || [];
                this.properties.pivotKeys.rows = prop.pivotKeys.rows || [];
            } else {
                this.properties.pivotKeys.columns = [];
                this.properties.pivotKeys.rows = [];
            }

            this.properties.order = prop.order || [];
            this.properties.filters = prop.filter || [];

            this.query = data.query || {};

            let style;
            if (data.style) {
                style = data.style;
            } else {
                style = {};
            }

            this.style = {};

            this.style.backgroundColor = style.backgroundColor || '#FFFFFF';
            this.style.height = style.height || 400;
            this.style.headerHeight = style.headerHeight || 60;
            this.style.rowHeight = style.rowHeight || 35;
            this.style.headerBackgroundColor = style.headerBackgroundColor || '#FFFFFF';
            this.style.headerBottomLineWidth = style.headerBottomLineWidth || 4;
            this.style.headerBottomLineColor = style.headerBottomLineColor || '#999999';
            this.style.rowBorderColor = style.rowBorderColor || '#CCCCCC';
            this.style.rowBottomLineWidth = style.rowBottomLineWidth || 2;
            this.style.columnLineWidht = style.columnLineWidth || 0;
        } else {
            this.draft = true;
            this.badgeStatus = 0;
            this.exportable = true;
            this.badgeMode = 1;

            this.selectedLayerID = layerID;

            this.properties = {};

            this.properties.xkeys = [];
            this.properties.ykeys = [];
            this.properties.columns = [];
            this.properties.order = [];
            this.properties.pivotKeys = {};
            this.properties.pivotKeys.columns = [];
            this.properties.pivotKeys.rows = [];
            this.properties.order = [];
            this.properties.filters = [];
            this.reportType = 'grid';

            this.style = {};

            this.style.backgroundColor = '#FFFFFF';
            this.style.height = 400;
            this.style.headerHeight = 60;
            this.style.rowHeight = 35;
            this.style.headerBackgroundColor = '#FFFFFF';
            this.style.headerBottomLineWidth = 4;
            this.style.headerBottomLineColor = '#999999';
            this.style.rowBorderColor = '#CCCCCC';
            this.style.rowBottomLineWidth = 2;
            this.style.columnLineWidht = 0;
        }
    };

    this.Report.prototype.generateQuery = function () {
        const layerID = this.selectedLayerID;

        var query = {
            layerID: layerID,
            columns: [],
            order: [],
            filters: [],
        };

        const prop = this.properties;
        for (const columnList of [
            prop.columns,
            prop.xkeys,
            prop.ykeys,
            prop.pivotKeys.columns,
            prop.pivotKeys.rows
        ]) {
            for (const c of columnList) {
                query.columns.push(c);
            }
        }

        for (const o of prop.order) {
            query.order.push(o);
        }

        for (const f of prop.filters) {
            query.filters.push(f);
        }

        if (this.reportType === 'pivot') {
            for (const c in prop.ykeys) {
                query.columns.push(countColumn(c));
            }
        }

        function countColumn (col) {
            return {
                aggregation: 'count',
                collectionID: col.collectionID,
                datasourceID: col.datasourceID,
                elementID: col.elementID,
                elementLabel: col.elementLabel,
                elementName: col.elementName,
                elementType: col.elementName,
                filterPrompt: false,
                id: col.id + 'ptc',
                layerID: col.layerID,
                objectLabel: col.objectLabel + ' count'
            };
        }

        if (prop.recordLimit) {
            query.recordLimit = prop.recordLimit;
        }

        query.layerID = this.selectedLayerID;

        this.query = query;
    };

    this.Report.prototype.changeReportType = function (newReportType) {
        this.countYKeys = false;
        var movedColumns = [];

        function moveContent (a, b) {
            b.push.apply(b, a.splice(0));
        }

        const report = this;
        switch (newReportType) {
        case 'grid':
            report.reportType = 'grid';
            moveContent(report.properties.xkeys, movedColumns);
            moveContent(report.properties.ykeys, movedColumns);
            moveContent(report.properties.pivotKeys.columns, movedColumns);
            moveContent(report.properties.pivotKeys.rows, movedColumns);
            break;

        case 'vertical-grid':
            report.reportType = 'vertical-grid';
            moveContent(report.properties.xkeys, movedColumns);
            moveContent(report.properties.ykeys, movedColumns);
            moveContent(report.properties.pivotKeys.columns, movedColumns);
            moveContent(report.properties.pivotKeys.rows, movedColumns);
            break;

        case 'pivot':
            moveContent(report.properties.xkeys, movedColumns);
            moveContent(report.properties.columns, movedColumns);
            report.query.countYKeys = true;
            report.reportType = 'pivot';
            break;

        case 'chart-bar':
            moveContent(report.properties.columns, movedColumns);
            moveContent(report.properties.pivotKeys.columns, movedColumns);
            moveContent(report.properties.pivotKeys.rows, movedColumns);
            report.reportType = 'chart-bar';
            break;

        case 'chart-line':
            moveContent(report.properties.columns, movedColumns);
            moveContent(report.properties.pivotKeys.columns, movedColumns);
            moveContent(report.properties.pivotKeys.rows, movedColumns);
            report.reportType = 'chart-line';
            break;

        case 'chart-area':
            moveContent(report.properties.columns, movedColumns);
            moveContent(report.properties.pivotKeys.columns, movedColumns);
            moveContent(report.properties.pivotKeys.rows, movedColumns);
            report.reportType = 'chart-area';
            break;

        case 'chart-donut':
            moveContent(report.properties.columns, movedColumns);
            moveContent(report.properties.pivotKeys.columns, movedColumns);
            moveContent(report.properties.pivotKeys.rows, movedColumns);
            report.reportType = 'chart-donut';
            break;

        case 'indicator':
            moveContent(report.properties.columns, movedColumns);
            moveContent(report.properties.xkeys, movedColumns);
            moveContent(report.properties.pivotKeys.columns, movedColumns);
            moveContent(report.properties.pivotKeys.rows, movedColumns);
            report.reportType = 'indicator';
            if (!report.properties.style) { report.properties.style = 'style1'; }
            if (!report.style.backgroundColor) { report.style.backgroundColor = '#fff'; }
            if (!report.properties.reportIcon) { report.properties.reportIcon = 'fa-bolt'; }
            if (!report.properties.mainFontColor) { report.properties.mainFontColor = '#000000'; }
            if (!report.properties.descFontColor) { report.properties.descFontColor = '#CCCCCC'; }
            break;

        case 'vectorMap':
            moveContent(report.properties.columns, movedColumns);
            moveContent(report.properties.xkeys, movedColumns);
            moveContent(report.properties.pivotKeys.columns, movedColumns);
            moveContent(report.properties.pivotKeys.rows, movedColumns);
            report.reportType = 'vectorMap';
            break;

        case 'gauge':
            moveContent(report.properties.columns, movedColumns);
            moveContent(report.properties.xkeys, movedColumns);
            moveContent(report.properties.pivotKeys.columns, movedColumns);
            moveContent(report.properties.pivotKeys.rows, movedColumns);
            report.reportType = 'gauge';

            if (!report.properties.lines) { report.properties.lines = 20; } // The number of lines to draw    12
            if (!report.properties.angle) { report.properties.angle = 15; } // The length of each line
            if (!report.properties.lineWidth) { report.properties.lineWidth = 44; } // The line thickness
            if (!report.properties.pointerLength) { report.properties.pointerLength = 70; }
            if (!report.properties.pointerStrokeWidth) { report.properties.pointerStrokeWidth = 35; }
            if (!report.properties.pointerColor) { report.properties.pointerColor = '#000000'; }
            if (!report.properties.limitMax) { report.properties.limitMax = 'false'; } // If true, the pointer will not go past the end of the gauge
            if (!report.properties.colorStart) { report.properties.colorStart = '#6FADCF'; } // Colors
            if (!report.properties.colorStop) { report.properties.colorStop = '#8FC0DA'; } // just experiment with them
            if (!report.properties.strokeColor) { report.properties.strokeColor = '#E0E0E0'; } // to see which ones work best for you
            if (!report.properties.generateGradient) { report.properties.generateGradient = true; }
            if (!report.properties.minValue) { report.properties.minValue = 0; }
            if (!report.properties.maxValue) { report.properties.maxValue = 100; }
            if (!report.properties.animationSpeed) { report.properties.animationSpeed = 32; }
            break;

        default:
            noty({ msg: 'report type does not exist', timeout: 2000, type: 'error' });
            break;
        }

        // The columns in dropzones which become hidden are moved to new dropzones
        // This ensures that there are no hidden columns in the query, which results in strange behaviour
        for (const col of movedColumns) {
            const choice = this.autoChooseArea(col, true);
            col.zone = choice.zone;
            // queryModel.updateColumnField(col, 'zone', choice.zone);
            choice.propertyBind.push(col);
            if (choice.forbidAggregation) {
                setAggregation(col, {name: 'Raw', value: 'raw'});
            }
        }
    };

    this.Report.prototype.autoChooseArea = function (item, chooseColumn) {
        var choice;

        switch (this.reportType) {
        case 'grid':
        case 'vertical-grid':
            choice = {
                propertyBind: this.properties.columns,
                zone: 'columns',
                role: 'column'
            };
            break;

        case 'pivot':
            if (this.properties.pivotKeys.rows.length === 0) {
                choice = {
                    propertyBind: this.properties.pivotKeys.rows,
                    zone: 'prow',
                    role: 'column',
                    forbidAggregation: true
                };
            } else {
                if (this.properties.pivotKeys.columns.length === 0) {
                    choice = {
                        propertyBind: this.properties.pivotKeys.columns,
                        zone: 'pcol',
                        role: 'column',
                        forbidAggregation: true
                    };
                } else {
                    choice = {
                        propertyBind: this.properties.ykeys,
                        zone: 'ykeys',
                        role: 'column'
                    };
                }
            }
            break;

        case 'chart-bar':
        case 'chart-line':
        case 'chart-area':
        case 'chart-pie':
        case 'chart-donut':
            if (this.properties.xkeys.length === 0) {
                choice = {
                    propertyBind: this.properties.xkeys,
                    zone: 'xkeys',
                    role: 'column'
                };
            } else {
                if (this.properties.ykeys.length === 0 || this.properties.order.length > 0 || chooseColumn) {
                    choice = {
                        propertyBind: this.properties.ykeys,
                        zone: 'ykeys',
                        role: 'column'
                    };
                } else {
                    choice = {
                        propertyBind: this.properties.order,
                        zone: 'order',
                        role: 'order'
                    };
                }
            }
            break;

        case 'indicator':
        case 'vectorMap':
        case 'gauge':
            choice = {
                propertyBind: this.properties.ykeys,
                zone: 'ykeys',
                role: 'column'
            };
            break;
        }

        return choice;
    };

    /*
    *   Controller getters and setters
    */

    this.getReport = async function (id, isLinked) {
        const data = await connection.get('/api/reports/get-report/' + id, {id: id, mode: 'preview', linked: isLinked});
        return new this.Report(data.item);
    };

    this.getLayers = async function () {
        var data = await connection.get('/api/layers/get-layers', {});
        if (data.result !== 1) {
            throw new Error(data.msg);
        }

        var layers = data.items;

        for (var layer of layers) {
            layer.rootItem = {
                elementLabel: '',
                elementRole: 'root',
                elements: layer.objects
            };
            calculateIdForAllElements(layer.rootItem.elements);
        }

        return layers;
    };

    this.fetchData = async function (query, params) {
        /*
        * Fetches all of the data associated to the report's query, and stores it in report.query.data
        */

        if (query.columns.length === 0) {
            return {};
        }

        var request = {};

        if (!params) {
            params = {};
        }

        if (params.page !== undefined) {
            request.page = params.page;
        } else {
            request.page = 1;
        }

        request.query = query;

        if (!query.recordLimit && params.selectedRecordLimit) {
            request.query.recordLimit = params.selectedRecordLimit;
        }

        if (params.filterCriteria) {
            for (const filter of request.query.filters) {
                if (params.filterCriteria[filter.id + filter.filterType]) {
                    filter.criterion = params.filterCriteria[filter.id + filter.filterType];
                }
            }
        }

        var result = await connection.post('/api/reports/get-data', request);

        if (result.warnings) {
            for (const w of result.warnings) {
                noty({text: w.msg, timeout: 3000, type: 'warning'});
            }
        }

        if (result.result === 0) {
            noty({text: result.msg, timeout: 3000, type: 'error'});
            return {
                data: [],
                sql: result.sql,
                errorToken: result
            };
        }

        var data = result.data;

        processDates(data);

        query.data = result.data;

        return {
            data: data,
            sql: result.sql,
            time: result.time,
            warnings: result.warnings
        };
    };

    function processDates (data) {
        for (const item of data) {
            for (const key in item) {
                if (typeof item[key] === 'string') {
                    var a = /\/Date\((\d*)\)\//.exec(item[key]);
                    if (a) {
                        item[key] = new Date(+a[1]);
                    }
                }
            }
        }
    }

    function setAggregation (column, option) {
        if (typeof column.originalLabel === 'undefined') {
            column.originalLabel = column.elementLabel;
        }

        if (option.value === 'raw') {
            delete (column.aggregation);
            column.elementLabel = column.originalLabel;
            column.objectLabel = column.originalLabel;
            column.id = changeColumnId(column.id, 'raw');
        } else {
            column.aggregation = option.value;
            column.elementLabel = column.originalLabel + ' (' + option.name + ')';
            column.objectLabel = column.originalLabel + ' (' + option.name + ')';
            column.id = changeColumnId(column.id, option.value);
        }
    };

    this.setAggregation = setAggregation;

    this.initChart = function (report) {
        var chart = {
            id: 'Chart' + uuid2.newguid(),
            dataPoints: [],
            dataColumns: [],
            datax: {},
            height: 300,
            query: report.query,
            queryName: null
        };

        switch (report.reportType) {
        case 'chart-line':
            chart.type = 'line';
            break;
        case 'chart-donut':
            chart.type = 'donut';
            break;
        case 'chart-pie':
            chart.type = 'pie';
            break;
        case 'gauge':
            chart.type = 'gauge';
            break;
        }

        if (['chart-line', 'chart-donut', 'chart-pie'].indexOf(report.reportType) >= 0 &&
            report.properties.xkeys.length > 0 && report.properties.ykeys.length > 0) {
            chart.dataColumns = report.properties.ykeys;

            const dataAxisInfo = report.properties.xkeys[0];
            chart.dataAxis = {
                elementName: dataAxisInfo.elementName,
                queryName: 'query1',
                elementLabel: dataAxisInfo.objectLabel,
                id: dataAxisInfo.id,
                type: 'bar',
                color: '#000000'};

            if (report.properties.xkeys.length > 1) {
                const stackDimensionInfo = report.properties.xkeys[1];
                chart.stackDimension = {
                    elementName: stackDimensionInfo.elementName,
                    queryName: 'query1',
                    elementLabel: stackDimensionInfo.objectLabel,
                    id: stackDimensionInfo.id,
                    type: 'bar',
                    color: '#000000'};
            }
        }

        if (report.reportType === 'gauge') {
            chart.dataColumns = report.properties.ykeys;
        }

        report.properties.chart = chart;
    };

    this.getColumnId = function (element) {
        return getColumnId(element);
    };

    function changeColumnId (oldId, newAggregation) {
        return oldId.substring(0, oldId.length - 3) + newAggregation.substring(0, 3);
    };

    this.changeColumnId = changeColumnId;

    function getColumnId (element) {
        /*
        * The id of a column (column.id) differs from the id of the element which that column uses (column.elementID)
        * this allows for multiple columns which use the same element, for example to use different aggregations
        */

        var columnId;

        var aggregation = element.aggregation || element.defaultAggregation;

        if (!aggregation) {
            columnId = 'e' + element.elementID.toLowerCase() + 'raw';
        } else {
            columnId = 'e' + element.elementID.toLowerCase() + aggregation.substring(0, 3);
        }

        return columnId;
    }

    function calculateIdForAllElements (elements) {
        for (var element of elements) {
            if (element.elementRole === 'dimension') {
                element.id = getColumnId(element);
            }

            if (element.elements) { calculateIdForAllElements(element.elements); }
        }
    };

    /*
    *   The column object
    */

    /*
    *   Columns objects represent an element getting fetched with a given aggregation in a given slot.
    *
    * Columns are passed around a lot, converted to JSON and used in draggable object data and in requests.
    * As such, they should be simple javascript objects. No fundtions, no weird objects, just basic javascript data.
    *
    */

    this.Column = function (element) {
        /*
        *   Takes an element object as argument, and returns a column object
        *
        * Elements are created in the layer, and are all of the thigns you can fetch
        * Each column corresponds to a single element, but contains additional information such as display parameters and aggregation
        */

        var agg;
        var aggLabel = '';

        if (element.aggregation) {
            agg = element.aggregation;
            aggLabel = ' (' + element.aggregation + ')';
        }

        if (element.defaultAggregation) {
            agg = element.defaultAggregation;
            aggLabel = ' (' + element.defaultAggregation + ')';
        }

        this.elementName = element.elementName;
        this.objectLabel = element.elementLabel + aggLabel;
        this.id = element.id;
        this.elementLabel = element.elementLabel;
        this.collectionID = element.collectionID;
        this.elementID = element.elementID;
        this.elementType = element.elementType;
        this.format = element.format;
        this.isCustom = element.isCustom;
        this.expression = element.expression;
        this.arguments = element.arguments;
        this.component = element.component;
        this.aggregation = agg;

        // The following fields shouldn't be necessary, but are kept to make sure nothing breaks
        this.datasourceID = element.datasourceID;
        this.layerID = element.layerID;
    };

    this.toOrder = function (column) {
        column.sortType = 1;
    };

    this.toFilter = function (column) {
        column.filterType = 'equal';
        column.filterPrompt = false;
        column.filterTypeLabel = 'equal';
        column.values = [];
    };

    var selectedColumn;

    this.selectedColumn = function () {
        return selectedColumn;
    };

    var selectedColumnHashedID;

    this.selectedColumnHashedID = function () {
        return selectedColumnHashedID;
    };

    var selectedColumnIndex;

    this.selectedColumnIndex = function () {
        return selectedColumnIndex;
    };

    this.changeColumnStyle = function (report, columnIndex, hashedID) {
        selectedColumn = report.properties.columns[columnIndex];
        selectedColumnHashedID = hashedID;
        selectedColumnIndex = columnIndex;

        if (!selectedColumn.columnStyle) { selectedColumn.columnStyle = {color: '#000', 'background-color': '#EEEEEE', 'text-align': 'left', 'font-size': '12px', 'font-weight': 'normal', 'font-style': 'normal'}; }

        $('#columnFormatModal').modal('show');
    };

    this.changeColumnSignals = function (report, columnIndex, hashedID) {
        selectedColumn = report.properties.columns[columnIndex];
        selectedColumnHashedID = hashedID;
        selectedColumnIndex = columnIndex;

        if (!selectedColumn.signals) { selectedColumn.signals = []; }
        $('#columnSignalsModal').modal('show');
    };

    this.orderColumn = function (report, columnIndex, desc) {
        var theColumn = report.query.columns[columnIndex];
        if (desc) {
            theColumn.sortType = 1;
        } else {
            theColumn.sortType = -1;
        }
        report.query.order = [];
        report.query.order.push(theColumn);
    };

    this.saveAsReport = async function (report, mode) {
        // Cleaning up the report object

        // var clonedReport = clone(report);
        // Is this necessary ? It causes c3 to crash, so I will remove it until I find a reason for it
        var clonedReport = report;
        if (clonedReport.properties.chart) {
            clonedReport.properties.chart.chartCanvas = undefined;
            clonedReport.properties.chart.data = undefined;
            // clonedReport.properties.chart.query = undefined;
        }
        if (clonedReport.query.data) { clonedReport.query.data = undefined; }
        clonedReport.parentDiv = undefined;

        var result;

        if (mode === 'add') {
            result = await connection.post('/api/reports/create', clonedReport);
        } else {
            result = await connection.post('/api/reports/update/' + report._id, clonedReport);
        }

        if (result.result === 1) {
            await new Promise(resolve => setTimeout(resolve, 400));
        }
    };

    this.duplicateReport = async function (duplicateOptions) {
        const params = { id: duplicateOptions.report._id };
        var newReport = (await connection.get('/api/reports/find-one', params)).item;

        delete newReport._id;
        delete newReport.createdOn;
        newReport.reportName = duplicateOptions.newName;

        const data = await connection.post('/api/reports/create', newReport);
        if (data.result !== 1) {
            // TODO indicate error
        }
    };

    this.saveToExcel = function ($scope, reportHash) {
        var wopts = { bookType: 'xlsx', bookSST: false, type: 'binary' };
        var ws_name = $scope.selectedReport.reportName;

        var wb = new Workbook();
        var ws = sheet_from_array_of_arrays($scope, reportHash);

        wb.SheetNames.push(ws_name);
        wb.Sheets[ws_name] = ws;

        var wbout = XLSX.write(wb, wopts);

        function s2ab (s) {
            var buf = new ArrayBuffer(s.length);
            var view = new Uint8Array(buf);
            for (let i = 0; i !== s.length; ++i) {
                view[i] = s.charCodeAt(i) & 0xFF;
            }

            return buf;
        }

        FileSaver.saveAs(new Blob([s2ab(wbout)], {type: ''}), ws_name + '.xlsx');
    };

    function Workbook () {
        if (!(this instanceof Workbook)) return new Workbook();
        this.SheetNames = [];
        this.Sheets = {};
    }

    function sheet_from_array_of_arrays ($scope, reportHash) {
        var data = $scope.selectedReport.query.data;
        var report = $scope.selectedReport;
        var ws = {};
        var range = {s: {c: 10000000, r: 10000000}, e: { c: 0, r: 0 }};
        for (var i = 0; i < report.properties.columns.length; i++) {
            if (range.s.r > 0) range.s.r = 0;
            if (range.s.c > i) range.s.c = i;
            if (range.e.r < 0) range.e.r = 0;
            if (range.e.c < i) range.e.c = i;

            var cell = { v: report.properties.columns[i].objectLabel };
            var cell_ref = XLSX.utils.encode_cell({c: i, r: 0});
            if (typeof cell.v === 'number') cell.t = 'n';
            else if (typeof cell.v === 'boolean') cell.t = 'b';
            else if (cell.v instanceof Date) {
                cell.t = 'n'; cell.z = XLSX.SSF._table[14];
                cell.v = datenum(cell.v);
            } else cell.t = 's';

            ws[cell_ref] = cell;
        }

        for (let R = 0; R !== data.length; ++R) {
            for (let i = 0; i < report.properties.columns.length; i++) {
                // var elementName = report.properties.columns[i].collectionID.toLowerCase()+'_'+report.properties.columns[i].elementName;
                var elementID = 'wst' + report.properties.columns[i].elementID.toLowerCase();
                var elementName = elementID.replace(/[^a-zA-Z ]/g, '');

                if (report.properties.columns[i].aggregation) {
                    // elementName = report.properties.columns[i].collectionID.toLowerCase()+'_'+report.properties.columns[i].elementName+report.properties.columns[i].aggregation;
                    elementID = 'wst' + report.properties.columns[i].elementID.toLowerCase() + report.properties.columns[i].aggregation;
                    elementName = elementID.replace(/[^a-zA-Z ]/g, '');
                }
                if (range.s.r > R + 1) range.s.r = R + 1;
                if (range.s.c > i) range.s.c = i;
                if (range.e.r < R + 1) range.e.r = R + 1;
                if (range.e.c < i) range.e.c = i;

                let cell;
                if (report.properties.columns[i].elementType === 'number' && data[R][elementName]) {
                    cell = { v: Number(data[R][elementName]) };
                } else {
                    cell = { v: data[R][elementName] };
                }
                cell_ref = XLSX.utils.encode_cell({c: i, r: R + 1});
                if (typeof cell.v === 'number') cell.t = 'n';
                else if (typeof cell.v === 'boolean') cell.t = 'b';
                else if (cell.v instanceof Date) {
                    cell.t = 'n'; cell.z = XLSX.SSF._table[14];
                    cell.v = datenum(cell.v);
                } else cell.t = 's';

                cell.s = { fill: { fgColor: { rgb: 'FFFF0000' } } };

                ws[cell_ref] = cell;
            }
        }
        if (range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);

        return ws;
    }

    this.getReportContainerHTML = function (reportID) {
        // returns a container for the report, to be inserted in the dashboard html

        var containerID = 'REPORT_CONTAINER_' + reportID;

        var html = '<div page-block  class="container-fluid featurette ndContainer"  ndType="container" style="height:100%;padding:0px;">' +
                        '<div page-block class="col-md-12 ndContainer" ndType="column" style="height:100%;padding:0px;">' +
                            '<div page-block class="container-fluid" id="' + containerID +
                             '" report-view report="getReport(\'' + reportID + '\')" style="padding:0px;position: relative;height: 100%;"></div>' +
                        '</div>' +
                    '</div>';

        return html;
    };

    this.getPromptHTML = function (prompt) {
        var html = '<div id="PROMPT_' + prompt.promptID + '" page-block class="ndContainer" ndType="ndPrompt"><nd-prompt is-prompt="true" filter="prompts[\'' + prompt.promptID + '\']" on-change="promptChanged" ></nd-prompt></div>';

        return html;
    };
});
