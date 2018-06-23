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
}

const Utils = Object.freeze(new UtilsConstructor());
