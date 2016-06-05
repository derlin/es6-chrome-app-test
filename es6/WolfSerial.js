import * as asnl from'./Asnl.js';

var WolfSerialState = {
    NOT_CONNECTED : 0,
    CONNECTED     : 1,
    WOLF_CONNECTED: 2
};

class WolfSerial {

    constructor(){
        this.connectionInfo = null;
        this.state = WolfSerialState.NOT_CONNECTED;
        this.events = {
            onConnect     : new chrome.Event(),
            onArduinoReady: new chrome.Event(),
            onDisconnect  : new chrome.Event()
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
                self.state = WolfSerialState.CONNECTED;
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
                self.state = WolfSerialState.NOT_CONNECTED;
                self.events.onDisconnect.dispatch();
                self._in.idx = 0;
                resolve();
            } );

        } );
    }


    initiateArduinoTalk(){
        this._boundOnReceiveListener = this._promptListener.bind( this );
        chrome.serial.onReceive.addListener( this._boundOnReceiveListener );
        this.resetArduino();
    }


    _promptListener( receiveInfo ){
        if( this.connectionInfo.connectionId != receiveInfo.connectionId )return;

        var self = this;
        var ab = new Uint8Array( receiveInfo.data );
        console.log( "prompt listener ", ab );

        for( var i = 0; i < ab.length; i++ ){
            if( ab[i] == asnl.ASNL_TOKENS.ENQ_IN ){
                self._send( [asnl.ASNL_TOKENS.ENQ_OUT] ).then( ( sendInfo ) =>{
                    console.log( "enq sent ", sendInfo );
                    self.state = WolfSerialState.WOLF_CONNECTED;
                    chrome.serial.onReceive.removeListener( self._boundOnReceiveListener );
                    self._boundOnReceiveListener = self._onReceive.bind( self );
                    chrome.serial.onReceive.addListener( self._boundOnReceiveListener );
                    self.events.onArduinoReady.dispatch();
                }, () => console.log );
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
                resolve( msg );
                this._in.idx = 0;
            }
        }
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


    _send( array ){
        var self = this;
        return new Promise( ( resolve, reject ) =>{
            chrome.serial.send( self.connectionInfo.connectionId, array2ab( array ),// arrayBuffer.buffer,
                ( sendInfo ) =>{
                    console.log( "SENT ", sendInfo );
                    if( sendInfo.error ){
                        console.log( "send error" );
                        reject( sendInfo.error );
                    }else{
                        resolve( sendInfo.bytesSent );
                    }
                } );
        } );
    }


    setPin( pin ){
        var self = this;
        return new Promise( function( resolve, reject ){
            var msg = new asnl.AsnlStruct( [new asnl.AsnlInt( "p".charCodeAt( 0 ), 1 ), new asnl.AsnlString( pin )] ).toAsnl();
            self._send( msg ).then( () => self._receiveQueue.push( resolve ), reject );
        } );
    }

    setDi( di ){
        var self = this;
        return new Promise( function( resolve, reject ){
            var msg = new asnl.AsnlStruct( [new asnl.AsnlInt( "i".charCodeAt( 0 ), 1 ), new asnl.AsnlInt( di, 2)] ).toAsnl();
            self._send( msg ).then( () => self._receiveQueue.push( resolve ), reject );
        } );
    }

    setDf( df ){
        var self = this;
        return new Promise( function( resolve, reject ){
            var msg = new asnl.AsnlStruct( [new asnl.AsnlInt( "f".charCodeAt( 0 ), 1 ), new asnl.AsnlInt( df, 2)] ).toAsnl();
            self._send( msg ).then( () => self._receiveQueue.push( resolve ), reject );
        } );
    }

    dump(){
        var self = this;
        return new Promise( function( resolve, reject ){
            var msg = new asnl.AsnlStruct( [new asnl.AsnlInt( "d".charCodeAt( 0 ), 1 )] ).toAsnl();
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