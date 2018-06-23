function frmt(num, scale = 6) {
    return window.CardanoCalculatorLocale.frmt(num, scale);
}

function isNewValuesAllowedForParam(oldValue, newValue, param) {
    if (oldValue < param.min) {
        if (newValue < oldValue) {
            return false;
        }
    } else if (oldValue > param.max) {
        if (newValue > oldValue) {
            return false;
        }
    } else if (newValue < param.min || newValue > param.max) {
        return false;
    }
    return true;
}

function parseParamIntoContext(el, shift = 0) {
    let id = el.attr('id');
    if (!id.startsWith("inp_")) {
        return null;
    }
    param = window.CardanoCalculatorParams[id.substr(4)];
    if (!param) {
        return null;
    }
    let localeSeparators = window.CardanoCalculatorLocale.separators;
    let parsedValue = param.parse(el.val()
        .replace(localeSeparators.order_reg, '')
        .replace(localeSeparators.decimal_reg, '.') || '0');
    if (shift) {
        let newValue = parsedValue + ((param.step || 1) * shift);
        if (!isNewValuesAllowedForParam(parsedValue, newValue, param)) {
            return;
        }
        parsedValue = newValue;
    }
    if (shift || (localeSeparators.weird_order && param.is_cleave && param.scale === 0)) {
        el.val(frmt(parsedValue, param.scale));
    }
    param.value = parsedValue;
    return parsedValue
}

function initNumpad() {

    $('.nmpd-wrapper').remove();

    let delimiter = window.CardanoCalculatorLocale ? window.CardanoCalculatorLocale.separators.order : ',',
    decimalMark = window.CardanoCalculatorLocale ? window.CardanoCalculatorLocale.separators.decimal : '.';

    $.fn.numpad.defaults.gridTpl = '<div class="modal-content"></div>';
    $.fn.numpad.defaults.backgroundTpl = '<div class="modal-backdrop in"></div>';
    $.fn.numpad.defaults.displayTpl = '<input type="text" class="form-control">';
    $.fn.numpad.defaults.rowTpl = '<div class="row mb-2"></div>';
    $.fn.numpad.defaults.displayCellTpl = '<div class="col-12"></div>';
    $.fn.numpad.defaults.cellTpl = '<div class="col-3"></div>';
    $.fn.numpad.defaults.buttonNumberTpl =  '<button type="button" class="btn btn-default"></button>';
    $.fn.numpad.defaults.buttonFunctionTpl = '<button type="button" class="btn" style="width: 100%;"></button>';
    $.fn.numpad.defaults.textDone = 'Done'; // TODO: tranlate button
    $.fn.numpad.defaults.textDelete = 'Del'; // TODO: tranlate button
    $.fn.numpad.defaults.textClear = 'Clear'; // TODO: tranlate button
    $.fn.numpad.defaults.textCancel = 'Cancel'; // TODO: tranlate button
    $.fn.numpad.defaults.decimalSeparator = decimalMark;
    $.fn.numpad.defaults.hidePlusMinusButton = true;
    $.fn.numpad.defaults.positionY = 'bottom';

    $('.inp-param').each(function() {

        let target = $(this);
        let isCleaveField = target.hasClass('cleave-num');

        target.numpad({
            hideDecimalButton: !isCleaveField,
            onKeypadCreate: function() {

                $(this).find('.done').addClass('btn-primary');

            },
            onKeypadOpen: function() {

                let el = $(this).find('.nmpd-display');
                el.attr('readonly', true);

            },
            onKeypadClose: function() {

                let el = $(this).find('.nmpd-display');

                if (isCleaveField) {

                    let unformatted = accounting.unformat(el.val(), decimalMark);
                    let formatted = accounting.formatNumber(unformatted, 2, delimiter, decimalMark);

                    target.val(formatted);

                }

            },
            onChange: function() {

                let el = $(this).find('.nmpd-display');

                if (isCleaveField) {
                    // TODO: format numpads display field
                }

            }
        });

    });

}

let Layouts = Object.freeze({
    TABLE: {
        name: 'TABLE',
        template: 'assets/hbs/calc_table.hbs',
        init: function() {},
        destroy: function () {},
        markError: function(id,msg) {
            let el = $('#inp_' + id);
            el.addClass('err-inp');
            el.tooltip('hide');
            let parent = el.parent();
            parent.attr('title',msg);
            parent.tooltip('show');
            return msg;
        },
        clearErrors: function () {
            let inputs = $('.inp-param');
            inputs.removeClass('err-inp');
            inputs.parent().tooltip('dispose');
            $(document.activeElement).tooltip('show');
        }
    },
    SWIPER: {
        name: 'SWIPER',
        template: 'assets/hbs/calc_swiper.hbs',
        init: function () {
            initSwiper();
        },
        destroy: function () {
            if (window.CardanoCalculatorSwiper) {
                window.CardanoCalculatorSwiper.destroy();
                window.CardanoCalculatorSwiper = null;
            }
        },
        markError: function(id,msg) {
            let el = $('#inp_' + id);
            el.parent().find('.invalid-feedback').text(msg);
            el.addClass('is-invalid');
            return msg;
        },
        clearErrors: function () {
            let inputs = $('.inp-param');
            inputs.parent().find('.invalid-feedback').text('');
            inputs.removeClass('is-invalid');
        }
    }
});

function updateCalculations() {
    window.CardanoCalculatorLayout.clearErrors();
    let markError = window.CardanoCalculatorLayout.markError;
    let negativeErrors = Object.values(window.CardanoCalculatorParams).map(function(p) {
        if (p.value < p.min) {
            return markError(p.id, 'Cannot be less than ' + p.min);
        } else if (p.value > p.max) {
            return markError(p.id, 'Cannot be more than ' + p.max);
        }
    }).filter((x) => x);
    if (negativeErrors.length > 0) {
        return;
    }
    let userStake = window.CardanoCalculatorParams.STAKE.value;
    let totalStake = window.CardanoCalculatorParams.TOTAL_STAKE.value;
    if (userStake > totalStake) {
        return (markError('STAKE', 'Stake cannot be greater than TOTAL stake'),
            markError('TOTAL_STAKE', 'Total stake cannot be less than user stake'));
    }
    let year = window.CardanoCalculatorParams.YEAR.value - 2019;
    let infl = (window.CardanoCalculatorParams.INFL.value / 100);
    let txEpoch = window.CardanoCalculatorParams.TX_EPOCH.value;
    let txSize = window.CardanoCalculatorParams.TX_SIZE.value;
    let tax = (window.CardanoCalculatorParams.TAX.value / 100);
    let poolFee = (window.CardanoCalculatorParams.POOL_FEE.value / 100);
    let initialTotalSupply = 31112484646;
    let initialReserve = 13887515354;
    let txFeeFixed = 0.155381;
    let txFeePerByte = 0.000043946;
    let userShare = userStake / totalStake;
    let reserveAtYearStart = initialReserve * Math.pow((1 - infl), year);
    let issuedAtYearStart = initialReserve - reserveAtYearStart;
    let supplyAtYearStart = initialTotalSupply + issuedAtYearStart;
    if (totalStake > supplyAtYearStart) {
        return markError('TOTAL_STAKE', 'Total stake cannot be greater than total supply for this year')
    }
    $('#ctx_STAKE').text(frmt(userShare * 100) + '%');
    $('#ctx_YEAR').text(frmt(supplyAtYearStart, 3) + ' ADA total (' + frmt(reserveAtYearStart, 3) + ' ADA in reserve)');
    let issuedThisYear = reserveAtYearStart * infl;
    let supplyInflation = (issuedThisYear * 100) / supplyAtYearStart;
    $('#ctx_INFL').text(frmt(issuedThisYear, 3) + ' ADA issued (' + frmt(supplyInflation) + '% inflation)');
    let stakedShare = (totalStake * 100) / supplyAtYearStart;
    $('#ctx_TOTAL_STAKE').text(frmt(stakedShare) + '%');
    let tpb = txEpoch / 21600;
    let tps = tpb / 20;
    $('#ctx_TX_EPOCH').text(frmt(tps) + ' tps');
    let txFee = txFeeFixed + (txSize * txFeePerByte);
    let blockReward = ((issuedThisYear / (73 * 21600)) + (tpb * txFee)) * (1 - tax);
    $('#ctx_TX_SIZE').text(frmt(txFee) + ' avg fee (' + frmt(blockReward) + ' avg block reward)');
    let txFeeYearly = txEpoch * 73 * txFee;
    let untaxedRewardAtYearStart = issuedAtYearStart + (txFeeYearly * year);
    let untaxedRewardThisYear = issuedThisYear + txFeeYearly;
    let taxAtYearStart = untaxedRewardAtYearStart * tax;
    let taxThisYear = untaxedRewardThisYear * tax;
    $('#ctx_TAX').text(frmt(taxAtYearStart, 3) + ' ADA in treasury (+ ' + frmt(taxThisYear, 3) + ' ADA added this year)');
    let taxedRewardAtYearStart = untaxedRewardAtYearStart - taxAtYearStart;
    let taxedRewardThisYear = untaxedRewardThisYear - taxThisYear;
    let userRewardAtYearStart = taxedRewardAtYearStart * userShare;
    let userRewardThisYear = taxedRewardThisYear * userShare;
    let poolFeeAtYearStart = userRewardAtYearStart * poolFee;
    let poolFeeThisYear = userRewardThisYear * poolFee;
    $('#ctx_POOL_FEE').text(frmt(poolFeeThisYear) + ' ADA yearly');
    let resultAtYearStart = userRewardAtYearStart - poolFeeAtYearStart;
    let resultThisYear = userRewardThisYear - poolFeeThisYear;
    let resultAtYearEnd = resultAtYearStart + resultThisYear;
    $('#resultAtYearStart').text(frmt(resultAtYearStart) + ' ADA');
    $('#ctx_resultAtYearStart').text('(' + frmt((resultAtYearStart * 100) / userStake, 3) + '%)');
    $('#resultThisYear').text(frmt(resultThisYear) + ' ADA');
    $('#ctx_resultThisYear').text('(' + frmt((resultThisYear * 100) / userStake, 3) + '%)');
    $('#resultAtYearEnd').text(frmt(resultAtYearEnd) + ' ADA');
    $('#ctx_resultAtYearEnd').text('(' + frmt((resultAtYearEnd * 100) / userStake, 3) + '%)');
}

function paramUpdate(e, shift = 0) {
    if (parseParamIntoContext($(e), shift) != null) {
        updateCalculations();
    }
}

function selectTab(url) {
    let target = url ? url.split('#') : null;
    if (target[1] && target[1] !== window.CardanoCalculatorState.tab) {
        $('.nav a').filter('[href="#' + target[1] + '"]').tab('show');
        window.scrollTo(0, 0);
        history.pushState("", document.title, url);
        window.CardanoCalculatorState.tab = target[1]
    }
}

function initTooltips() {
    $('[data-toggle="tooltip"]').tooltip();
}

function initSwiper() {
    window['CardanoCalculatorSwiper'] = new Swiper('.swiper-container', {
        loop: false,
        autoHeight: true,
        simulateTouch: false,
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
            renderBullet: function (index, className) {

                let swiperWrapper       = $('.swiper-wrapper');
                let slide               = swiperWrapper.find('.swiper-slide')[index];
                let parameterGroupName  = $(slide).data('parametergroup');

                return '<span class="' + className + '">' + parameterGroupName + '</span>';

            }
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev'
        }
    });
    if (!window.CardanoCalcSwiperKeysListener) {
        window['CardanoCalcSwiperKeysListener'] = function() {
            let char = event.which || event.keyCode;
            if ((char === 37 || char === 39) && window.CardanoCalculatorSwiper && !event.shiftKey && $('#calculator-tab').hasClass('active')) {
                let el = document.activeElement;
                if (!el || el.tagName !== 'INPUT') {
                    if (char === 37) {
                        window.CardanoCalculatorSwiper.slidePrev();
                    } else if (char === 39) {
                        window.CardanoCalculatorSwiper.slideNext();
                    }
                }
            }
        };
        $(window).keydown(window.CardanoCalcSwiperKeysListener);
    }
}

function initCleave(loc) {
    let delimiter = loc ? loc.separators.order : ',',
        decimalMark = loc ? loc.separators.decimal : '.';
    Object.values(window.CardanoCalculatorParams).forEach(function (p) {
        if (p.is_cleave) {
            let el = $('#inp_' + p.id);
            p.cleave = new Cleave(el, {
                delimiter: p.scale > 0 ? '' : delimiter,
                numeral: true,
                numeralThousandsGroupStyle: 'thousand',
                numeralDecimalScale: p.scale,
                numeralDecimalMark: decimalMark
            });
            el.val(frmt(p.value, p.scale));
        }
    });
    if (!window.CardanoCalcCleaveKeysListener) {
        window['CardanoCalcCleaveKeysListener'] = function() {
            let char = event.which || event.keyCode;
            if (char === 38 || char === 40) {
                shift = 39 - char;
                paramUpdate(this, shift);
            }
        };
        $('.inp-param.cleave-num').keydown(window.CardanoCalcCleaveKeysListener);
    }
}

function restartCleave(loc) {
    Object.values(window.CardanoCalculatorParams).forEach(function (p) {
        if (p.cleave) {
            p.cleave.destroy();
            p.cleave = null;
            $('#inp_' + p.id).val(p.value.toLocaleString(loc.locale));
        }
    });
    initCleave(loc);
}

function initInputFieldEvents() {
    $('.inp-param').on("change paste keyup", function() {
        paramUpdate(this);
    });
    let decimalSeparators = ['.', ',', '\''];
    $('.inp-param[valtype=float]').on("keyup", function(e) {
        let decimal = window.CardanoCalculatorLocale.separators.decimal;
        if (decimalSeparators.indexOf(e.key) > -1 && e.key !== decimal) {
            let el = $(this), val = el.val();
            if (!val.includes(decimal)) {
                el.val(val + decimal);
            }
        }
    });
}

function toggleLayoutSwitcher(layoutName) {
    $('#layout-switcher input').prop('checked', false).parent().removeClass('active');
    $('#layout-switcher input[layout=' + layoutName + ']').prop('checked', true).parent().addClass('active');
}

function initLayout(layoutName) {
    if (layoutName && Object.keys(Layouts).indexOf(layoutName) > -1) {
        window.CardanoCalculatorLayout = Layouts[layoutName];
    } else {
        let w = window.innerWidth;
        window.CardanoCalculatorLayout = w < 768 ? Layouts.SWIPER : Layouts.TABLE;
    }
    return window.CardanoCalculatorLayout.template;
}

function loadHandlebarsPartials(filemap = {}, callback) {
    let keys = Object.keys(filemap);
    (function loadPartial(idx) {
        if (idx >= keys.length) {
            if (callback) {
                return callback();
            }
            return null;
        }
        let key = keys[idx];
        $.ajax({
            url: filemap[key],
            cache: true,
            success: function(partialContent) {
                Handlebars.registerPartial(key, partialContent);
                loadPartial(idx + 1)
            }
        });
    })(0);
}

function initParams(paramsData) {
    window.CardanoCalculatorParamGroups = paramsData;
    let flatParams = [].concat.apply([], paramsData.groups.map((g) => g.params));
    window.CardanoCalculatorParams = flatParams.reduce((r, p) => {r[p.id] = p;return r;}, {});
    flatParams.forEach((p) => {
        if (p.value_type === 'float') {
            p.parse = parseFloat;
            p.scale = 1;
        } else if (p.value_type === 'int') {
            p.parse = parseInt;
            p.scale = 0;
        } else {
            p.parse = (x) => x;
            p.scale = 0;
        }
    });
}

function initCalcLayout(layoutName = Cookies.get('layout')) {
    if (window.CardanoCalculatorLayout) {
        window.CardanoCalculatorLayout.destroy();
    }
    function initTemplate(templateFile, dataContent) {
        $.ajax({
            url: templateFile,
            cache: true,
            success: function (templateContent) {
                let template = Handlebars.compile(templateContent);
                let renderedHtml = template(dataContent);
                $('#calc-row').html(renderedHtml);
                initTooltips();
                if (window.CardanoCalculatorLayout) {
                    window.CardanoCalculatorLayout.init();
                    toggleLayoutSwitcher(window.CardanoCalculatorLayout.name);
                }
                initCleave(window.CardanoCalculatorLocale);
                initInputFieldEvents();
                updateCalculations();
                ($.isMobile) ? initNumpad() : null;
            }
        });
    }
    function initParamsJson(dataFile, templateFile) {
        $.getJSON(dataFile, function(dataContent) {
            initParams(dataContent);
            initTemplate(templateFile, dataContent);
        });
    }
    let templateFile = initLayout(layoutName);
    if (window.CardanoCalculatorParamGroups) {
        initTemplate(templateFile, window.CardanoCalculatorParamGroups);
    } else {
        initParamsJson('assets/calc_parameters.json', templateFile);
    }
}

function initLocale() {
    window.CardanoCalculatorLocaleList = Locales.createLocaleContext();
    console.log('Available locales:', window.CardanoCalculatorLocaleList);
    function setCurrentLocale(loc) {
        window.CardanoCalculatorLocale = loc;
        if (!loc.digits.isEmpty) {
            console.log('Non-arabic numeral system is detected. Using mapping:', loc.digits.map);
        }
    }
    if (window.CardanoCalculatorLocaleList.length > 0) {
        let locSelector = $('#locale-selector');
        if (window.CardanoCalculatorLocaleList.length === 1) {
            locSelector.attr('disabled', true);
        }
        $.each(window.CardanoCalculatorLocaleList, function (idx, loc) {
            locSelector.append($('<option></option>')
                .attr('key', loc.locale)
                .text(loc.locale + ': ' + loc.frmt(loc.separators.weird_order ? 1234567.8 : 1234.5, 1)));
        });
        locSelector.change(function (e) {
            let selectedLocaleName = $(this).children('option:selected').attr('key');
            let selectedLocale = window.CardanoCalculatorLocaleList
                .filter((x) => x.locale === selectedLocaleName)[0];
            if (selectedLocale) {
                console.log('New locale selected:', selectedLocale);
                Cookies.set('locale', selectedLocaleName);
                setCurrentLocale(selectedLocale);
                restartCleave(selectedLocale);
                initNumpad();
                updateCalculations();
            }
        });
    }
    setCurrentLocale(window.CardanoCalculatorLocaleList[0]);
}

$(function() {

    $.isMobile = (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) ? true : false;

    initLocale();

    Handlebars.registerHelper('str', function (str) {
        return Array.isArray(str) ? str.join(' ') : str;
    });

    loadHandlebarsPartials({
        'calc-header': 'assets/hbs/partial/calc_header.hbs',
        'calc-alert': 'assets/hbs/partial/calc_alert.hbs',
        'calc-result': 'assets/hbs/partial/calc_result.hbs',
    }, initCalcLayout);

    window['CardanoCalculatorState'] = {};
    window['CardanoCalculatorParams'] = {};

    selectTab(location.href);

    $('#layout-switcher input').change(function () {
        let layoutName = $(this).attr('layout');
        initCalcLayout(layoutName);
        Cookies.set('layout', layoutName);
    });

    $(document).on('click', '.activate-tab', function(e) {
        e.preventDefault();
        selectTab(this.href);
    });
});

$(window).bind('hashchange', function() {
    selectTab(location.href);
});
