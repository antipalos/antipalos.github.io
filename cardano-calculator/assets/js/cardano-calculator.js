function detectBrowserLocale () {
    if (navigator.languages && navigator.languages.length) {
        // latest versions of Chrome and Firefox set this correctly
        return navigator.languages[0]
    } else if (navigator.userLanguage) {
        // IE only
        return navigator.userLanguage
    } else {
        // latest versions of Chrome, Firefox, and Safari set this correctly
        return navigator.language
    }
}

function escapeRegExp(str) {
    // noinspection RegExpRedundantEscape
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function isValidLocale(loc) {
    try {
        (1000).toLocaleString(loc);
        return true;
    } catch (err) {
        return false;
    }
}

function getSeparatorsByLocale(locale) {
    let orderStr = (1000).toLocaleString(locale);
    let order = orderStr.length > 4 ? orderStr.substr(1,1) : '';
    let decimal = (1.1).toLocaleString(locale).substr(1,1);
    return Object.freeze({
        order: order,
        order_reg: new RegExp(escapeRegExp(order), 'g'),
        decimal: decimal,
        decimal_reg: new RegExp(escapeRegExp(decimal), 'g')
    })
}

function frmt(num, scale = 6) {
    return Number(num.toFixed(scale)).toLocaleString(window.CardanoCalculatorLocale.locale, {
        'maximumFractionDigits': scale
    })
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
    let parsedValue = param.parse(el.val()
        .replace(window.CardanoCalculatorLocale.separators.order_reg, '')
        .replace(window.CardanoCalculatorLocale.separators.decimal_reg, '.'));
    if (shift) {
        parsedValue += ((param.step || 1) * shift);
        el.val(frmt(parsedValue, param.scale));
    }
    param.value = parsedValue;
    return parsedValue
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

function initCleave(delimiter = ',', decimalMark = '.') {
    Object.values(window.CardanoCalculatorParams).forEach(function (p) {
        if (p.is_cleave) {
            new Cleave($('#inp_' + p.id), {
                delimiter: delimiter,
                numeral: true,
                numeralThousandsGroupStyle: 'thousand',
                numeralDecimalScale: p.scale,
                numeralDecimalMark: decimalMark
            });
        }
    });
    $('.inp-param.cleave-num').keydown(function() {
        let char = event.which || event.keyCode;
        if (char === 38 || char === 40) {
            shift = 39 - char;
            paramUpdate(this, shift);
        }
    });
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
                initCleave(
                    window.CardanoCalculatorLocale.separators.order,
                    window.CardanoCalculatorLocale.separators.decimal
                );
                initInputFieldEvents();
                updateCalculations();
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
    function checkLocale(loc, source) {
        if (loc) {
            if (isValidLocale(loc)) {
                console.log('Valid locale found in %s: %s', source, loc);
                return loc;
            }
            console.error('Invalid locale in %s: %s', source, loc);
        }
        return null;
    }
    function selectLocales() {
        let defaultLocale = 'en';
        let locales = [
            checkLocale($.urlParam('loc'), 'url'),
            checkLocale(detectBrowserLocale(), 'browser'),
            defaultLocale
        ].filter((v,i,a) => v && a.indexOf(v) === i);
        if (locales.length === 1) {
            console.log('Default locale is used: ' + defaultLocale)
        }
        return locales;
    }
    let locales = selectLocales();
    window.CardanoCalculatorLocaleList = Object.freeze(locales.map((loc) => {
        return Object.freeze({
            locale: loc,
            separators: getSeparatorsByLocale(loc)
        });
    }));
    console.log('Available locales:', window.CardanoCalculatorLocaleList);
    if (window.CardanoCalculatorLocaleList.length > 1) {
        $('#locale-selector-div').css('display', 'inline');
        $.each(window.CardanoCalculatorLocaleList, function (idx, loc) {
            $('#locale-selector').append($('<option></option>').text(loc.locale));
        });
    }
    window.CardanoCalculatorLocale = window.CardanoCalculatorLocaleList[0];
}

$.urlParam = function(name, def = null){
    let parse = new RegExp('[\?&]' + name + '=([^&#]*)').exec(location.href);
    return parse ? parse[1] : def;
};

$(function() {

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
