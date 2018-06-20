function LocalesConstructor() {

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

    this.isValidLocale = function(loc) {
        try {
            (1000).toLocaleString(loc);
            return true;
        } catch (err) {
            return false;
        }
    };

    function getDigitsByLocale(locale) {
        let map = {};
        let digits = [];
        for (let i = 0; i < 10; i++) {
            let a = '' + i;
            let b = (i).toLocaleString(locale);
            if (a !== b) {
                map[b] = a;
                digits.push(b);
            }
        }
        let reg = new RegExp('[' + digits.join('') + ']', 'g');
        return Object.freeze({
            isEmpty: digits.length === 0,
            map: Object.freeze(map),
            reg: reg,
            fixString: function(s) {
                return digits.length === 0 ? s
                    : s.replace(reg, (c) => map[c] || c);
            }
        });
    }

    function getSeparatorsByLocale(locale, digits = getDigitsByLocale(locale)) {
        let orderStr = (111111).toLocaleString(locale);
        let orderSeparators = digits.fixString(orderStr).replace(/1/g, '');
        let order = orderSeparators.length > 0 ? orderSeparators.charAt(0) : '';
        let decimal = (1.1).toLocaleString(locale).substr(1,1);
        return Object.freeze({
            weird_order: orderSeparators.length !== 1,
            order: order,
            order_reg: new RegExp(Utils.escapeRegExp(order), 'g'),
            decimal: decimal,
            decimal_reg: new RegExp(Utils.escapeRegExp(decimal), 'g')
        })
    }

    this.frmt = function(num, scale = 6, loc) {
        let number = Number(num.toFixed(scale));
        let formatted = number.toLocaleString(loc.locale, {'maximumFractionDigits': scale});
        return loc.digits.fixString(formatted);
    };

    function checkLocale(loc, source) {
        if (loc) {
            if (Locales.isValidLocale(loc)) {
                console.log('Valid locale found in %s: %s', source, loc);
                return loc;
            }
            console.error('Invalid locale in %s: %s', source, loc);
        }
        return null;
    }

    function getUrlLocales() {
        let validator = (x) => checkLocale(x, 'url');
        let locs1 = Utils.urlParamsArray('loc!').map(validator).filter((x) => x);
        let locs2 = Utils.urlParamsArray('loc').map(validator).filter((x) => x);
        if (locs1.length > 0) {
            console.log('Storing the URL locale: ' + locs1[0]);
            Cookies.set('locale', locs1[0]);
        }
        return locs1.concat(locs2);
    }

    this.createLocaleContext = function(defaultLocale = 'en') {
        let cookieLocale = checkLocale(Cookies.get('locale'), 'cookies');
        let locales = getUrlLocales().concat([
            cookieLocale,
            checkLocale(this.detectBrowserLocale(), 'browser'),
            defaultLocale
        ]).filter((v,i,a) => v && a.indexOf(v) === i);
        if (locales.length === 1) {
            console.log('Default locale is used: ' + defaultLocale)
        }
        return Object.freeze(locales.map((loc) => {
            let digits = getDigitsByLocale(loc);
            return Object.freeze({
                locale: loc,
                digits: digits,
                separators: getSeparatorsByLocale(loc, digits),
                frmt: function (num, scale = 6) {
                    return Locales.frmt(num, scale, this);
                }
            });
        }));
    };
}

const Locales = Object.freeze(new LocalesConstructor());
