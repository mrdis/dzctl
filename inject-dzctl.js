
var injected_dzctl;
(function () {

    function showid(id, pin) {
        div = document.createElement('div')
        div.innerText = `ID: ${id} - PIN: ${pin}`;
        div.style.position = 'fixed';
        div.style.right = 0;
        div.style.bottom = 0;
        div.style.zIndex = 1000;
        document.getElementsByTagName('body')[0].appendChild(div)
    }

    function clickSelector(selector) {
        const elem = document.querySelector(selector)
        if (elem && elem.click)
            elem.click()
    }

    function process(command, params) {
        const handlers = {
            clickOn: function (selectorId) {
                const selectors = {
                    togglePlay: '#page_player > div > div.player-controls > ul > li:nth-child(3) > button',
                    next: '#page_player > div > div.player-controls > ul > li:nth-child(5) > div > button',
                    toggleMute: '#page_player > div > div.player-options > ul > li:nth-child(1) > ul > li:nth-child(4) > div > button'
                }
                const selector = selectors[selectorId]
                if (selector) {
                    clickSelector(selector)
                }
            },
            search: function (text) {
                console.log("search", text)

                function setNativeValue(element, value) {
                    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
                    const prototype = Object.getPrototypeOf(element);
                    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;

                    if (valueSetter && valueSetter !== prototypeValueSetter) {
                        prototypeValueSetter.call(element, value);
                    } else {
                        valueSetter.call(element, value);
                    }
                }

                // Trigger search
                const searchBox = document.querySelector('#topbar-search')
                if (!searchBox) return
                setNativeValue(searchBox, text)
                searchBox.dispatchEvent(new Event('input', { bubbles: true }));
                const form = document.querySelector('#page_topbar > div.topbar-search > div > form')
                form.requestSubmit()

                // Update status
                checkStatus()
            },
            navigate : function(path){
                const link = document.querySelector("a[href='"+path+"']");
                if(!link){
                    console.log("Could not navigate to "+path+" no links found")
                    return
                }
                link.click()
            }
        }
        if (handlers[command])
            handlers[command](params)
        else
            console.log("Unknown command", command)
    }


    function tojo(o) {
        return JSON.parse(JSON.stringify(o))
    }
    function getCurrentSearch() {
        const currentSearch = {}
        // Scrape tracks
        const tracksSelector = //'#page_naboo_search > div.search-results > div > div > div.datagrid > div > div.datagrid-cell.cell-title > div > a > span'
                               '#page_naboo_search > div.search-results > div > div > div.datagrid > div.datagrid-row.song > div.datagrid-cell.cell-title > div > a';
        const tracksLinks = Array.from(document.querySelectorAll(tracksSelector))
        currentSearch.tracks = tracksLinks.map(function(link){
            return { title : link.firstChild.innerText, path : link.pathname }
        })
        // TODO scrape albums
        // TODO scrape artists
        return currentSearch
    }
    function getStatus() {
        const currentSong = tojo(dzPlayer.getCurrentSong());
        const trackList = tojo(dzPlayer.getTrackList());
        const currentSearch = getCurrentSearch();
        return {
            currentSong,
            trackList,
            currentSearch
        }
    }
    function checkStatus() {
        var newStatus = getStatus();
        if (JSON.stringify(newStatus) != JSON.stringify(status)) {
            console.log("Status changed")
            status = newStatus
            peerctl.update(status)
        }
    }
    function init2() {
        peerctl = new PeerCtlServer()
        peerctl.on('ready', function (info) {
            showid(info.id, info.pin)
            statusInterval = setInterval(checkStatus, 1000)
        })
        peerctl.on('command', function (data) {
            process(data.command, data.params)
        })
        peerctl.listen("dzctl")
    }






    var div
    var status
    var peerctl
    var statusInterval

    // Support re-invoking the bookmarklet by unloading if already loaded
    if (injected_dzctl && injected_dzctl.unload)
        injected_dzctl.unload()
    injected_dzctl = {
        unload: function () {
            document.getElementsByTagName('body')[0].removeChild(div)
            peerctl.disconnect()
            peerctl = undefined
            clearInterval(statusInterval)
            status = {}
        }
    }










    function inject(src, callback) {
        const script = document.createElement('script')
        script.type = 'text/javascript'
        script.async = true
        script.onload = function () {
            if (typeof callback === 'function') callback()
        }
        script.src = src
        document.getElementsByTagName('head')[0].appendChild(script)
    }
    function injectScripts(peerctl_script_src) {
        inject('https://unpkg.com/peerjs@1.3.1/dist/peerjs.min.js', function () {
            inject(peerctl_script_src + '/../peerctl-srv.js', function () {
                init2()
            })
        })
    }


    window.peerctl_injected = function (script_src) {
        injectScripts(script_src)
    }

})()
