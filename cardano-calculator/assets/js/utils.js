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

const Utils = Object.freeze({
    detectBrowserLocale: detectBrowserLocale
});
