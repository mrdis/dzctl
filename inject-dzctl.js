
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
                if(form.requestSubmit){
                    form.requestSubmit()
                }else{
                    const button = document.querySelector('#page_topbar > div.topbar-search > div > form > button.topbar-search-submit')
                    if(button)button.click()
                }

                

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

            // Go back in history
            back : function(){
                history.back()
            }
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

    function getFlow() {
        const selFlow = '#page_content > div.page-wrapper > div.page-content > div.channel > section > div > div > div > div > ul > li.thumbnail-col.flow'
        const flow = document.querySelector(selFlow)
        if(!flow)return
        const selImg  = 'figure > div > img'
        const selBut  = 'figure > ul > li > button'
        const img = flow.querySelector(selImg)
        const but = flow.querySelector(selBut)
        const playid = "flow"
        but.classList.add(playid)
        return {
            "name" : "Flow",
            play : "button."+playid,
            img : img.src
        }
    }

    // Scrape the list of playlists
    function getPlaylists(root) {
        if(!root)root = document
  
        const selLi = 'li.thumbnail-col'
        const items = root.querySelectorAll(selLi)

        const selPlay = 'figure > ul > li:nth-child(1) > button'
        const selLink = 'div > div.heading-4 > a'
        const selLink2 = 'a'
        const selImg  = 'figure > div > img'
        const selTitle = 'figure > div > p.title-text'
        const playlists = Array.from(items).map(function(li,index){
            const link = li.querySelector(selLink) || li.querySelector(selLink2)
            const play = li.querySelector(selPlay)
            const title = li.querySelector(selTitle)
            if(!link && !title)return
            // Mark button adding a special classname
            var playid
            if(play){
                playid = link ? link.pathname.replace(/\//g,"_") : 'playid_'+index 
                play.classList.add(playid)
            }
            const img = li.querySelector(selImg)
            return {
                name : title ? title.innerText : link.innerText,
                path : link ? link.pathname : '',
                play : play ? "button."+playid : '',
                img  : img ? img.src : "",
            }
        })
        const flow = getFlow()
        if(flow)
            playlists.unshift(flow)
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
        const selRowSong = 'div.datagrid-row.song'
        const items = document.querySelectorAll(selRowSong)            
        const selTitle = 'div.datagrid-cell.cell-title > div > a'
        const selPlay  = 'div:nth-child(1) > div > a'
        const tracks = Array.from(items).map(function(item){
            const title = item.querySelector(selTitle)
            const play = item.querySelector(selPlay)
            if(!title)return
            // Mark button adding a special classname
            const playid = title.pathname.replace(/\//g,"_")
            play.classList.add(playid)
            return {
                name : title.firstChild.innerText,
                play : "a."+playid,
                scroll : "a."+playid
            }
        })
        return tracks
    }

    function getSections() {
        const selSections = 'section.user-section'
        const selChannels = 'section.channel-section'
        const items = document.querySelectorAll(selSections+' , '+selChannels)
        const selTitle = 'h2'
        const selLink = 'h2 > a'
        const selSubTitle = 'aside div.heading-3'
        const selDesc = 'aside div.heading-4'
        const sections = Array.from(items).map(function(item){
            const title = item.querySelector(selTitle)
            const link =  item.querySelector(selLink)
            const subTitle = item.querySelector(selSubTitle)
            const desc = item.querySelector(selDesc)
            return {
                title : title?title.innerText:'',
                path : link?link.pathname : '',
                subtitle : subTitle?subTitle.innerText:'',
                desc : desc?desc.innerText:'',
                playlists : getPlaylists(item)
            }
        })
        return sections
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
        const tracks = getTracks()
        const sections = getSections()
        return {
            navi,
            currentSong,
            trackList,
            currentSearch,
            tracks,
            sections
        }
    }

    // Recalc status and dispatch it if changed
    function checkStatus() {
        var newStatus = JSON.stringify(getStatus());
        // Remove unicode chars that are not handled well by BinaryPack, used by PeerJs...
        newStatus = newStatus.replace(/[\u0100-\uFFFF]+/g,"")
        if (newStatus != status) {
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
            peerctl.destroy()
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
