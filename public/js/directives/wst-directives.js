function attrDefault ($el, data_var, default_val) {
    if (typeof $el.data(data_var) !== 'undefined') {
        return $el.data(data_var);
    }

    return default_val;
}

angular.module('urungi.directives', [])
    .directive('spinner', function () {
        return {
            restrict: 'AC',
            link: function (scope, el, attr) {
                var $ig = angular.element(el);
                var $dec = $ig.find('[data-type="decrement"]');
                var $inc = $ig.find('[data-type="increment"]');
                var $inp = $ig.find('.form-control');

                var step = attrDefault($ig, 'step', 1);
                var min = attrDefault($ig, 'min', 0);
                var max = attrDefault($ig, 'max', 0);
                var umm = min < max;

                $dec.on('click', function (ev) {
                    ev.preventDefault();

                    var num = Number($inp.val()) - step;

                    if (umm && num <= min) {
                        num = min;
                    }

                    $inp.val(num);
                });

                $inc.on('click', function (ev) {
                    ev.preventDefault();

                    var num = Number($inp.val()) + step;

                    if (umm && num >= max) {
                        num = max;
                    }

                    $inp.val(num);
                });
            }

        };
    }).directive('erDraggable', function () {
        return {
            restrict: 'A',
            link: function (scope, elem, attr, ctrl) {
                elem.draggable({
                    containment: elem.parent().parent()
                }, {
                    stop: function (event, ui) {
                    // jqSimpleConnect.repaintAll();

                    }
                });
            }
        };
    }).directive('datepicker', function () {
        return {
            restrict: 'AC',
            link: function (scope, el, attr) {
                if (!jQuery.isFunction(jQuery.fn.datepicker)) { return false; }

                var $this = angular.element(el);
                var opts = {
                    format: attrDefault($this, 'format', 'mm/dd/yyyy'),
                    startDate: attrDefault($this, 'startDate', ''),
                    endDate: attrDefault($this, 'endDate', ''),
                    daysOfWeekDisabled: attrDefault($this, 'disabledDays', ''),
                    startView: attrDefault($this, 'startView', 0)
                };
                var $n = $this.next();
                var $p = $this.prev();

                $this.datepicker(opts);

                if ($n.is('.input-group-addon') && $n.has('a')) {
                    $n.on('click', function (ev) {
                        ev.preventDefault();

                        $this.datepicker('show');
                    });
                }

                if ($p.is('.input-group-addon') && $p.has('a')) {
                    $p.on('click', function (ev) {
                        ev.preventDefault();

                        $this.datepicker('show');
                    });
                }
            }
        };
    })
    .directive('wstAlias', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var splits = attrs['wstAlias'].trim().split(/\s+as\s+/);
                scope.$watch(splits[0], function (val) {
                    scope.$eval(splits[1] + '=(' + splits[0] + ')');
                });
            }
        };
    })
    .directive('languageSelect', ['language', function (language) {
        return {
            templateUrl: 'partials/directives/languageSelect.html',
            link: function ($scope) {
                const languageLabels = {
                    'en': 'English',
                    'fr': 'Français',
                };

                $scope.availableLanguages = [];
                for (const code of language.getAvailableLanguages()) {
                    $scope.availableLanguages.push({
                        code: code,
                        label: (code in languageLabels) ? languageLabels[code] : code,
                    });
                }

                const currentLanguage = language.getCurrentLanguage();
                $scope.currentLanguage = $scope.availableLanguages.find(l => {
                    return l.code === currentLanguage;
                });

                $scope.languageChanged = function (choice) {
                    language.setCurrentLanguage(choice.code);
                };
            }
        };
    }]);
