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

    String.prototype.contains = function (x) {
        return this.indexOf(x) > -1;
    };

    Number.prototype.between = function (a,b) {
        return this >= a && this <= b;
    };

    Number.prototype.betweex = function (a,b) {
        return this > a && this < b;
    };
}

const Utils = Object.freeze(new UtilsConstructor());
