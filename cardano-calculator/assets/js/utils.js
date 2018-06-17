function UtilsConstructor() {

    this.detectBrowserLocale = function() {

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
    };

    this.escapeRegExp = function(str) {
        // noinspection RegExpRedundantEscape
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    };

    this.isValidLocale = function(loc) {
        try {
            (1000).toLocaleString(loc);
            return true;
        } catch (err) {
            return false;
        }
    };

    this.arrayIfNot = function(x) {
        return Array.isArray(x) ? x : [x];
    };

    this.yieldWhile = function(f) {
        let res = [];
        while (true) {
            m = f();
            if (m) res.push(m);
            else return res;
        }
    };

    this.urlParam = function(name, def = null){
        let regExp = new RegExp('[\?&]' + name + '=([^&#]*)', "g");
        let res = Utils.yieldWhile(() => regExp.exec(location.href)).map((v) => v[1]);
        return res ? res.length > 1 ? res : res[0] : def;
    };
}

const Utils = Object.freeze(new UtilsConstructor());
