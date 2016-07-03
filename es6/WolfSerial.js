import * as asnl from'./Asnl.js';

const ARDUINO_CONNECT_TIMEOUT = 3000; // 3 seconds

class WolfSerial {


    static States = {
        NOT_CONNECTED : 0,
        CONNECTED     : 1,
        WOLF_CONNECTED: 2
    };

    static ErrorTypes = {
        ARDUINO: "arduino error",
        SERIAL : "chrome serial error",
        SEND   : "send error"
    };

    static Commands = {
        Dump: {nice: "dump current values", code: "d".charCodeAt( 0 )},
        Save: {nice: "save to EEPROM", code: "s".charCodeAt( 0 )},
        Quit: {nice: "Quit configuration mode", code: "x".charCodeAt( 0 )},
    };

    static SetCommands = {
        DI      : {nice: "set DI", code: "i".charCodeAt( 0 ), asnl: ( val ) => new asnl.AsnlInt( val, 2 )},
        DF      : {nice: "set DF", code: "f".charCodeAt( 0 ), asnl: ( val ) => new asnl.AsnlInt( val, 2 )},
        PIN     : {nice: "set pin", code: "p".charCodeAt( 0 ), asnl: ( val ) => new asnl.AsnlString( val )},
        ColorOn : {nice: "set color ON", code: "l".charCodeAt( 0 ), asnl: ( val ) => new asnl.AsnlInt( val, 4 )},
        ColorOff: {nice: "set color OFF", code: "m".charCodeAt( 0 ), asnl: ( val ) => new asnl.AsnlInt( val, 4 )},
        TicksOn : {nice: "set ticks ON", code: "1".charCodeAt( 0 ), asnl: ( val ) => new asnl.AsnlInt( val, 2 )},
        TicksOff: {nice: "set ticks OFF", code: "0".charCodeAt( 0 ), asnl: ( val ) => new asnl.AsnlInt( val, 2 )},
    };

    constructor(){
        this.connectionInfo = null;
        this.state = WolfSerial.States.NOT_CONNECTED;
        this.events = {
            onConnect     : new chrome.Event(),
            onDisconnect  : new chrome.Event(),
            onArduinoReady: new chrome.Event(),
            onError       : new chrome.Event()
        };

        this._in = {
            buffer    : new Uint8Array( 255 ),
            nextLength: 0,
            idx       : 0,
        };

        this._receiveQueue = [];

    }


    scanPorts(){
        return new Promise( ( resolve ) =>{
            chrome.serial.getDevices( ( ports ) =>{
                ports = ports.filter( p => !p.path.match( /[Bb]luetooth/ ) );
                resolve( ports );
            } );
        } );
    }


    connect( portPath ){
        var self = this;
        return new Promise( ( resolve, reject ) =>{
            // only one connection at a time
            if( self.state ){
                reject( "already connected" );
                return;
            }

            // try to connect
            chrome.serial.connect( portPath, ( connectionInfo ) =>{
                // check error
                if( chromeError( reject ) )  return;
                // connection ok
                self.connectionInfo = connectionInfo;
                self.state = WolfSerial.States.CONNECTED;
                // listen to errors
                self._boundOnReceiveErrorListener = self._onError.bind( self );
                chrome.serial.onReceiveError.addListener( self._boundOnReceiveErrorListener );

                self.events.onConnect.dispatch();
                resolve();
            } );

        } );
    }

    disconnect(){
        var self = this;
        return new Promise( ( resolve ) =>{
            chrome.serial.disconnect( self.connectionInfo.connectionId, () =>{
                chrome.serial.onReceive.removeListener( self._boundOnReceiveListener );
                chrome.serial.onReceiveError.removeListener( self._boundOnReceiveErrorListener );
                self.state = WolfSerial.States.NOT_CONNECTED;
                self.events.onDisconnect.dispatch();
                self._in.idx = 0;
                resolve();
            } );

        } );
    }


    initiateArduinoTalk(){
        var self = this;
        // add arduino prompt (ENQ) listener
        self._boundOnReceiveListener = self._promptListener.bind( self );
        chrome.serial.onReceive.addListener( self._boundOnReceiveListener );

        // set a timeout in case the arduino does not send an  ENQ
        self._arduinoConnectionTimeout = setTimeout( () =>{
            self.events.onError.dispatch( {
                type: WolfSerial.ErrorTypes.ARDUINO,
                msg : "Connection timeout, arduino not responding"
            } );
            clearTimeout( self._arduinoConnectionTimeout );
            self._arduinoConnectionTimeout = null;
            self.disconnect();
        }, ARDUINO_CONNECT_TIMEOUT );

        // reset the arduino
        this.resetArduino();
    }


    resetArduino(){
        var self = this;
        return new Promise( ( resolve, reject ) =>{
            // check connection
            if( !self.state ){
                reject( "not connected !" );
                return;
            }

            var cid = this.connectionInfo.connectionId;
            // unset dtr
            chrome.serial.setControlSignals( cid, {'dtr': false}, () =>
                // reset dtr
                chrome.serial.setControlSignals( cid, {'dtr': true}, () =>{
                    if( !chromeError( reject ) ) resolve();
                } )
            );
        } );

    }

    // ----------------------------------------------------

    _onError( errorInfo ){
        if( this.connectionInfo.connectionId != errorInfo.connectionId ) return;
        this.events.onError.dispatch( {type: WolfSerial.ErrorTypes.SERIAL, msg: errorInfo.error} );
    }

    _promptListener( receiveInfo ){
        if( this.connectionInfo.connectionId != receiveInfo.connectionId ) return;

        var self = this;
        var ab = new Uint8Array( receiveInfo.data );

        for( var i = 0; i < ab.length; i++ ){
            if( ab[i] == asnl.ASNL_TOKENS.ENQ_IN ){
                // ENQ received, answer it
                self._send( [asnl.ASNL_TOKENS.ENQ_OUT] ).then( ( sendInfo ) =>{
                    // answer sent properly
                    console.log( "enq sent ", sendInfo );

                    // clear the arduino connect timeout
                    clearTimeout( self._arduinoConnectionTimeout );
                    self._arduinoConnectionTimeout = null;

                    // set the "normal" receiver
                    chrome.serial.onReceive.removeListener( self._boundOnReceiveListener );
                    self._boundOnReceiveListener = self._onReceive.bind( self );
                    chrome.serial.onReceive.addListener( self._boundOnReceiveListener );

                    // dispatch the connection event
                    self.state = WolfSerial.States.WOLF_CONNECTED;
                    self.events.onArduinoReady.dispatch();

                }, ( error ) => self.events.onError.dispatch( {type: WolfSerial.ErrorTypes.SEND, msg: error} ) );
                return;
            }
        }
    }

    _onReceive( receiveInfo ){
        if( this.connectionInfo.connectionId != receiveInfo.connectionId )return;

        var ab = new Uint8Array( receiveInfo.data );
        console.log( "      RECEIVE ", ab );

        for( var i = 0; i < ab.byteLength; i++ ){
            this._in.buffer[this._in.idx++] = ab[i];
            if( this._in.idx == 2 ){
                console.log( "next length ", ab[i] );
                this._in.nextLength = ab[i] + 2;
            }

            if( this._in.idx >= 2 && this._in.idx == this._in.nextLength ){
                var msgBytes = this._in.buffer.slice( 0, this._in.nextLength );
                var msg = asnl.parseAsnl( msgBytes );
                var resolve = this._receiveQueue.shift();
                if(resolve) resolve( msg );
                this._in.idx = 0;
            }
        }
    }


    _send( array ){
        var self = this;
        return new Promise( ( resolve, reject ) =>{
            chrome.serial.send( self.connectionInfo.connectionId, array2ab( array ),// arrayBuffer.buffer,
                ( sendInfo ) =>{
                    console.log( "SENT ", sendInfo );
                    if( sendInfo.error ){
                        console.log( "send error", sendInfo );

                        reject( sendInfo.error );
                    }else{
                        resolve( sendInfo.bytesSent );
                    }
                } );
        } );
    }

    // ----------------------------------------------------

    set( setCommand, value ){
        var self = this;
        return new Promise( function( resolve, reject ){
            var msg = new asnl.AsnlStruct( [new asnl.AsnlInt( setCommand.code, 1 ), setCommand.asnl( value )] ).toAsnl();
            self._send( msg ).then( () => self._receiveQueue.push( resolve ), reject );
        } );
    }

    ask( command ){
        var self = this;
        return new Promise( function( resolve, reject ){
            var msg = new asnl.AsnlStruct( [new asnl.AsnlInt( command.code, 1 )] ).toAsnl();
            self._send( msg ).then( () => self._receiveQueue.push( resolve ), reject );
        } );
    }


    // ----------------------------------------------------
}


function array2ab( array ){
    var buf = new ArrayBuffer( array.length );
    var bufView = new Uint8Array( buf );
    for( var i = 0; i < array.length; i++ ){
        bufView[i] = array[i];
    }
    return bufView.buffer;
}

function chromeError( reject ){
    if( chrome.runtime.lastError ){
        reject( chrome.runtime.lastError.message );
        return true;
    }
    return false;
}


export default WolfSerial;
