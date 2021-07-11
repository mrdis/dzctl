function PeerCtlClient() {
    this.handlers = {
        status: [],
        connecting : [],
        connected: [],
        disconnected: []
    }
    this.peerId = undefined
    this.pin = undefined
    this.peer = undefined
    this.conn = undefined
    this.connected = false
    this.connectionTrials = 0
}
PeerCtlClient.prototype._emit = function (event, payload) {
    const handlers = this.handlers[event] || []
    for (const h of handlers)
        h(payload)
}

PeerCtlClient.prototype._connect = function () {
    var _this = this
    _this._emit('connecting')
    this.peer = new Peer();
    this.peer.on('error', function(err) {
        console.log(err.type,err)
        _this.peer.destroy()
        _this._reconnect()
    })
    this.peer.on('open', function() {
        _this.conn = _this.peer.connect(_this.peerId);
        _this.conn.on('open', function () {
            // Send pin as first message to authenticate
            _this.conn.send(_this.pin);
        });
        _this.conn.on('close', function () {
            console.log("Disconnected")
            _this.connected = false
            _this._emit("connecting")
            _this._reconnect()
        })
        _this.conn.on('data', function (data) {
            if(!_this.connected){
                console.log("Connected")
                _this.connected = true
                _this.connectionTrials = 0
                _this._emit("connected")
            }
            if(data.status){
                _this._emit("status",data.status)
            }
        })
    });
}
PeerCtlClient.prototype._reconnect = function () {
    var _this = this
    if(this.connectionTrials==10){
        this.connectionTrials = 0
        _this._emit("disconnected")
        return
    }
    var delay = 2 << this.connectionTrials;
    // Exponential backoff up to 2 minutes
    if(delay > 120) delay = 120
    delay *= 1000
    setTimeout(function(){
        _this.connectionTrials += 1
        _this._connect()
    },delay)
}

PeerCtlClient.prototype.on = function (event, handler) {
    this.handlers[event].push(handler)
}

PeerCtlClient.prototype.connect = function (prefix,id,pin) {
    this.peerId = `${prefix}-${id}`
    this.pin = pin
    this._connect()
}
PeerCtlClient.prototype.send = function (command,params) {
    this.conn.send({command,params})
}