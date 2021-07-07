
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

            // Click on the item with the given selector id
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

            // Search for the given text
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

                // Write into search box
                const searchBox = document.querySelector('#topbar-search')
                if (!searchBox) return
                setNativeValue(searchBox, text)
                searchBox.dispatchEvent(new Event('input', { bubbles: true }));

                // Trigger search
                const form = document.querySelector('#page_topbar > div.topbar-search > div > form')
                form.requestSubmit()

                // Update status
                checkStatus()
            },

            // Click on an anchor with the given href
            navigate : function(path){
                const link = document.querySelector("a[href='"+path+"']");
                if(!link){
                    console.log("Could not navigate to "+path+" no links found")
                    return
                }
                link.click()
            },

            // Click on a button with the given selector
            play : function(playid){
                const button = document.querySelector(playid);
                if(!button){
                    console.log("Could not play "+playid+", no buttons found")
                    return
                }
                button.click()
            },

            // Scroll an item with the given selector into view
            scroll : function(selector){
                const item = document.querySelector(selector);
                if(!item){
                    console.log("Could not scroll to "+selector+", no item found")
                    return
                }
                item.scrollIntoView()
            },
        }

        if (handlers[command])
            handlers[command](params)
        else
            console.log("Unknown command", command)
    }

    // Transform an object into a plain JSON object
    function tojo(o) {
        return JSON.parse(JSON.stringify(o))
    }

    // Retrieve main navigation items
    function getMainNavi(){
        const naviSelector = '#page_sidebar > div.sidebar-nav.nano.has-scrollbar > div.nano-content > div > ul > li > a'
        const naviLinks = Array.from(document.querySelectorAll(naviSelector))
        return naviLinks.map(function(link){
            return {
                path : link.pathname,
                html : link.innerHTML
            }
        })        
    }

    // Scrape the list of playlists
    function getPlaylists() {
        const selLi = '#page_profile > div.naboo-catalog-content-wrapper > div > div > section > div > ul > li'          
        const selPlay = 'figure > ul > li:nth-child(1) > button'
        const selLink = 'div > div.heading-4 > a'
        const playlists = Array.from(document.querySelectorAll(selLi)).map(function(li){
            const link = li.querySelector(selLink)
            if(!link)return
            const play = li.querySelector(selPlay)
            // Mark button adding a special classname
            const playid = link.pathname.replaceAll("/","_")
            play.classList.add(playid)
            return {
                name : link.innerText,
                path : link.pathname,
                play : "button."+playid
            }
        })
        return playlists
    }

    /*
    function getAllTracks(){
        // Only visible tracks are loaded on the dom, get them from internal react state
        const selList = '#page_naboo_playlist > div.catalog-content > div > div:nth-child(2) > div > div.datagrid'
        const list = document.querySelector(selList)
        if(!list)return
        function getReactState(elem){
            const result = Object.getOwnPropertyNames(elem).filter(function(propName){
                return propName.match("reactInternalInstance")
            })
            if(result.length>0)
                return elem[result[0]]
            return null
        }
        const listState = getReactState(list)
        const tracks = tojo(listState.memoizedProps.children[0].props.items)

        return tracks
    }
    */

    // Scrape visible tracks
    function getTracks(){
        const setPlistItems = '#page_naboo_playlist > div.catalog-content > div > div > div > div.datagrid > div > div.datagrid-row.song'
        const selAlbumItems = '#page_naboo_album > div > div > div.datagrid-container > div.datagrid > div.datagrid-row.song'
        const selTitle = 'div.datagrid-cell.cell-title > div > a'
        const selPlay  = 'div:nth-child(1) > div > a'
        var items = document.querySelectorAll(setPlistItems)
        if(items.length==0)
            items = document.querySelectorAll(selAlbumItems)
        const tracks = Array.from(items).map(function(item){
            const title = item.querySelector(selTitle)
            const play = item.querySelector(selPlay)
            if(!title)return
            // Mark button adding a special classname
            const playid = title.pathname.replaceAll("/","_")
            play.classList.add(playid)
            return {
                name : title.firstChild.innerText,
                play : "a."+playid,
                scroll : "a."+playid
            }
        })
        return tracks
    }

    // Scrape current search results
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
        const albumSelector = '#page_naboo_search > div.search-results > div:nth-child(4) > ul > li:nth-child(1) > div > div.heading-4 > a'

        // TODO scrape artists
        return currentSearch
    }

    // Build full status object
    function getStatus() {
        const currentSong = tojo(dzPlayer.getCurrentSong());
        const trackList = tojo(dzPlayer.getTrackList());
        const currentSearch = getCurrentSearch();
        const navi = getMainNavi();
        const playlists = getPlaylists();
        const tracks = getTracks()
        return {
            navi,
            currentSong,
            trackList,
            currentSearch,
            playlists,
            tracks
        }
    }

    // Recalc status and dispatch it if changed
    function checkStatus() {
        var newStatus = getStatus();
        if (JSON.stringify(newStatus) != JSON.stringify(status)) {
            console.log("Status changed")
            status = newStatus
            peerctl.update(status)
        }
    }

    // Create server peer
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



    // Global state
    // Div with connection params
    var div
    // Scraped status
    var status
    // Peer controller object
    var peerctl
    // Status refresh timmer
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

    // Injection logic
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

    // This function is invoked when the bookmarklet finished loading this script
    // Here we inject all other required scripts and then start
    window.peerctl_injected = function (script_src) {
        injectScripts(script_src)
    }

})()
