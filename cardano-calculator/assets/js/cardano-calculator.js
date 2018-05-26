function frmt(num, scale = 6) {
    return Number(num.toFixed(scale)).toLocaleString('en-US', {
        'maximumFractionDigits': scale
    })
}

function parseHash(hash) {
    let sLocationAndParams = hash.split(/\?(.+)/);
    let sLocation = sLocationAndParams[0];
    if (sLocation.startsWith('#')) {
        sLocation = sLocation.substr(1)
    }
    let result = {
        'location': sLocation
    };
    if (sLocationAndParams.length > 1) {
        result['params'] = {};
        let sParamStr = sLocationAndParams[1];
        let sParams = sParamStr.split('&');
        for (let i = 0; i < sParams.length; i++) {
            let sParamPair = sParams[i].split(/=(.*)/);
            let value = sParamPair.length > 1 ? sParamPair[1] : true;
            if (result.params[sParamPair[0]]) {
                let oldValue = result.params[sParamPair[0]];
                if (Array.isArray(oldValue)) {
                    oldValue += value;
                } else {
                    result.params[sParamPair[0]] = [oldValue, value]
                }
            } else {
                result.params[sParamPair[0]] = value;
            }
        }
    }
    return result;
}

function commify(numStr) {
    let len = numStr.indexOf('.') || numStr.length;
    for (let i = len - 3; i > 0; i -= 3) {
        numStr = numStr.slice(0, i) + ',' + numStr.slice(i);
    }
    return numStr;
}

function parseParamIntoContext(el, shift = 0) {
    let id = el.attr('id');
    if (!id.startsWith("inp_")) {
        return null;
    }
    param = id.substr(4);
    valtype = el.attr('valtype');
    parser = valtype === 'int' ? parseInt : valtype === 'float' ? parseFloat : (x) => x;
    let parsedValue = parser(el.val().replace(/,/g, ''));
    if (shift) {
        parsedValue += shift;
        el.val(commify(frmt(parsedValue, valtype === 'float' ? 1 : 0)));
    }
    window.CardanoCalculatorParams[param] = parsedValue;
    return parsedValue

}

function markError(id, msg) {
    let el = $('#inp_' + id).parent();
    el.attr('err-tip', msg);
    el.addClass('err-inp');
    return msg;
}

function updateCalculations() {
    let inputs = $('.inp-param').parent();
    inputs.removeAttr('err-tip');
    inputs.removeClass('err-inp');
    let userStake = window.CardanoCalculatorParams.STAKE;
    let totalStake = window.CardanoCalculatorParams.TOTAL_STAKE;
    let negativeErrors = Object.entries(window.CardanoCalculatorParams).map(function(e) {
        let el = $('#inp_' + e[0]),
            min = parseInt(el.attr('min')),
            max = parseInt(el.attr('max'));
        if (e[1] < min) {
            return markError(e[0], 'Cannot be less than ' + min);
        } else if (e[1] > max) {
            return markError(e[0], 'Cannot be more than ' + max);
        }
    }).filter((x) => x);
    if (negativeErrors.length > 0) {
        return;
    }
    if (userStake > totalStake) {
        return (markError('STAKE', 'Stake cannot be greater than TOTAL stake'),
            markError('TOTAL_STAKE', 'Total stake cannot be less than user stake'));
    }
    let year = window.CardanoCalculatorParams.YEAR - 2019;
    let infl = (window.CardanoCalculatorParams.INFL / 100);
    let txEpoch = window.CardanoCalculatorParams.TX_EPOCH;
    let txSize = window.CardanoCalculatorParams.TX_SIZE;
    let tax = (window.CardanoCalculatorParams.TAX / 100);
    let poolFee = (window.CardanoCalculatorParams.POOL_FEE / 100);
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

function initParamsContext() {
    window['CardanoCalculatorParams'] = {};
    $('.inp-param').each(function() {
        parseParamIntoContext($(this))
    });
    updateCalculations()
}

$(function() {

    initParamsContext();

    $('.inp-param').on("change paste keyup", function() {
        paramUpdate(this)
    });

    $('.cleave-num').each(function() {
        let cleave = new Cleave(this, {
            numeral: true,
            numeralThousandsGroupStyle: 'thousand'
        });
    });

    $('.inp-param.cleave-num').keydown(function() {
        let char = event.which || event.keyCode;
        if (char === 38 || char === 40) {
            shift = 39 - char;
            paramUpdate(this, shift);
        }
    });

    $(document).on('click', '.activate-tab', function(e) {

        e.preventDefault();

        var target = this.href.split('#');

        (target[1]) ? $('.nav a').filter('[href="#' + target[1] + '"]').tab('show') : null;

        window.scrollTo(0, 0);

    });

});
