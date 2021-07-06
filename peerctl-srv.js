
function PeerCtlServer() {
    this.handlers = {
        ready: [],
        command: []
    }
    this.status = {}
    this.peer = undefined
    this.connections = []
}

PeerCtlServer.prototype._emit = function (event, payload) {
    const handlers = this.handlers[event] || []
    for (const h of handlers)
        h(payload)
}
PeerCtlServer.prototype._dispatch = function (message) {
    this.connections = this.connections.filter(function (c) { return c.open })
    for (var c of this.connections)
        c.send(message)
}

PeerCtlServer.prototype.on = function (event, handler) {
    this.handlers[event].push(handler)
}

PeerCtlServer.prototype.listen = function (prefix) {
    var _this = this
    // Allocate or retrieve id and pin
    var id = localStorage.getItem(`peerctl-${prefix}-id`);
    if (!id) {
        id = '' + Math.floor(100000 + Math.random() * 900000);
        localStorage.setItem(`peerctl-${prefix}-id`, id);
    }
    var pin = localStorage.getItem(`peerctl-${prefix}-pin`);
    if (!pin) {
        pin = '' + Math.floor(1000 + Math.random() * 9000);
        localStorage.setItem(`peerctl-${prefix}-pin`, pin);
    }
    // Crete peer
    const requestedid = `${prefix}-${id}`
    this.peer = new Peer(requestedid);
    // Handle peer created
    this.peer.on('open', function (assignedid) {
        if (assignedid !== requestedid) {
            console.log("Could not create peer with given id, retrying with a different one")
            // Could not assing requested id, retry
            localStorage.removeItem(`peerctl-${prefix}-id`);
            init();
            return
        }
        // Ready, emit event
        _this._emit("ready", { id, pin })
    });
    // Handle incoming connections
    this.peer.on('connection', function (conn) {
        conn.dzctl_authenticated = false
        console.log("new connection, waiting authentication")
        conn.on('data', function (data) {
            if (!conn.dzctl_authenticated) {
                if (data === pin) {
                    console.log("Auth OK")
                    conn.dzctl_authenticated = true;
                    conn.send({ status: _this.status })
                    _this.connections.push(conn)
                } else {
                    console.log("Auth failed")
                    conn.close()
                }
            } else if (data.command) {
                _this._emit("command", { command: data.command, params: data.params })
            }
        });
    });
}


PeerCtlServer.prototype.update = function (status) {
    this.status = status
    this._dispatch({ status })
}

PeerCtlServer.prototype.disconnect = function () {
    this.peer.disconnect()
}

