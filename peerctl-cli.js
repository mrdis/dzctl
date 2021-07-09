function PeerCtlClient() {
    this.handlers = {
        status: [],
        connected: [],
        disconnected: []
    }
    this.peer = undefined
    this.conn = undefined
    this.connected = false
}
PeerCtlClient.prototype._emit = function (event, payload) {
    const handlers = this.handlers[event] || []
    for (const h of handlers)
        h(payload)
}

PeerCtlClient.prototype.on = function (event, handler) {
    this.handlers[event].push(handler)
}

PeerCtlClient.prototype.connect = function (prefix,id,pin) {
    var _this = this
    this.peer = new Peer();
    this.peer.on('open', function() {
        const serverid = `${prefix}-${id}`
        _this.conn = _this.peer.connect(`${prefix}-${id}`);
        _this.conn.on('open', function () {
            // Send pin as first message to authenticate
            _this.conn.send(pin);
        });
        _this.conn.on('close', function () {
            console.log("Disconnected")
            _this._emit("disconnected")
        })
        _this.conn.on('data', function (data) {
            if(!_this.connected){
                console.log("Connected")
                _this.connected = true
                _this._emit("connected")
            }
            if(data.status){
                _this._emit("status",data.status)
            }
        })
    });
}
PeerCtlClient.prototype.send = function (command,params) {
    this.conn.send({command,params})
}