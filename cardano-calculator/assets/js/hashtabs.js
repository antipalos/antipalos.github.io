function __HashTabsConstructor() {

    let _tabsSelector = '.hashtab';
    let _linksSelector = '.hashlink';

    function selectTab(url) {
        let target = url ? url.split('#') : null;
        if (target[1] && target[1] !== this.tab) {
            $(_tabsSelector).filter('[href="#' + target[1] + '"]').tab('show');
            window.scrollTo(0, 0);
            history.pushState("", document.title, url);
            this.tab = target[1]
        }
    }

    this.bind = function ({tabsSelector = _tabsSelector, linksSelector = _linksSelector, init = true} = {}) {
        _tabsSelector = tabsSelector;
        _linksSelector = linksSelector;
        $(document).on('click', tabsSelector + ', ' + linksSelector, function(e) {
            e.preventDefault();
            selectTab(this.href);
        });
        $(window).bind('hashchange', function() {
            selectTab(location.href);
        });
        if (init) {
            selectTab(location.href);
        }
    };
}

const HashTabs = Object.freeze(new __HashTabsConstructor());
