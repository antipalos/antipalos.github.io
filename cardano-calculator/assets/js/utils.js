function UtilsConstructor() {

    this.escapeRegExp = function(str) {
        // noinspection RegExpRedundantEscape
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    };

    this.yieldWhile = function(f) {
        let res = [];
        while (true) {
            m = f();
            if (m) res.push(m);
            else return res;
        }
    };

    this.urlParamsArray = function(name, def = null){
        let regExp = new RegExp('[\?&]' + name + '=([^&#]*)', "g");
        let res = Utils.yieldWhile(() => regExp.exec(location.href)).map((v) => v[1]);
        return res || def;
    };

    Array.prototype.contains = function (x) {
        return this.indexOf(x) > -1;
    };

    Array.prototype.flat = function() {
        return [].concat.apply([], this);
    };

    String.prototype.contains = function (x) {
        return this.indexOf(x) > -1;
    };

    Number.prototype.between = function (a,b) {
        return this >= a && this <= b;
    };

    Number.prototype.betweex = function (a,b) {
        return this > a && this < b;
    };

    this.repeated = function (f, {interval = 300, firstDelay = false, minInterval = 100, intervalStep = 50, counterStep = 10} = {}) {
        if (!firstDelay) {
            f()
        }
        let context = {id: null, counter: 0, interval: interval};
        context.id = setInterval(function fun() {
            f();
            if (context.interval > minInterval && ++context.counter % counterStep === 0) {
                clearInterval(context.id);
                context.interval -= intervalStep;
                context.id = setInterval(fun, context.interval);
            }
        }, interval);
        return {isCancel: true, cancel: () => clearInterval(context.id)};
    };

    this.stopRepeated = function (cancel) {
        if (cancel && cancel.cancel && cancel.isCancel) {
            cancel.cancel();
        }
    };

    this.repeater = function(f, params) {
        let _this = this;
        return {
            start: function () {
                this.repeaterCancelObject = _this.repeated(f, params);
            },
            stop: function () {
                _this.stopRepeated(this.repeaterCancelObject);
            }
        };
    };

    this.safeNull = function(x, def) {
        return (x === undefined || x === null) ? def : x;
    };
}

const Utils = Object.freeze(new UtilsConstructor());
