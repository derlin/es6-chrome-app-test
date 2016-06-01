import * as asnl from'./Asnl.js';

class Serial {

    constructor( connectionInfo ){
        this.events = {
            onReceive      : new chrome.Event(),
            onReceivedError: new chrome.Event(),
            onSendError    : new chrome.Event()
        };

        this._connectionInfo = connectionInfo;
        this._cid = connectionInfo.connectionId;

        this._in = {
            buffer    : new Uint8Array( 255 ),
            nextLength: 0,
            idx       : 0,
            waitPrompt: true
        };

        this._registerListeners();
        this.resetArduino();
        console.log( "serial created ", this._connectionInfo );
    }

    // -------------------------------------- chrome serial listeners

    _registerListeners(){
        this._boundOnReceive = this._onReceive.bind( this );
        this._boundOnReceiveError = this._onReceiveError.bind( this );
        chrome.serial.onReceive.addListener( this._boundOnReceive );
        chrome.serial.onReceiveError.addListener( this._boundOnReceiveError );
    }

    _unregisterListeners(){
        chrome.serial.onReceive.removeListener( this._boundOnReceive );
        chrome.serial.onReceiveError.removeListener( this._boundOnReceiveError );
    }

    // ----------------------------------------- send/receive

    _onReceive( receiveInfo ){
        console.log( "RECEIVE ", receiveInfo );
        if( this._cid != receiveInfo.connectionId ){
            console.log( "not for us..." );
            return;
        }

        var ab = new Uint8Array( receiveInfo.data );
        console.log( ab );

        if( this._in.waitPrompt ){
            if( ab[0] == asnl.ASNL_TOKENS.ENQ_IN ){
                console.log( "ENQ received, sending ENQ_OUT" );
                this.send( [asnl.ASNL_TOKENS.ENQ_OUT] ).then( () =>{
                    this._in.waitPrompt = false;
                    var msg = new asnl.AsnlStruct( [new asnl.AsnlInt( "d".charCodeAt( 0 ), 1 )] );
                    this.send( msg.toAsnl() );
                } );
            }
            return;
        }

        for( var i = 0; i < ab.byteLength; i++ ){
            this._in.buffer[this._in.idx++] = ab[i];
            if( this._in.idx == 2 ){
                console.log( "next length ", ab[i] );
                this._in.nextLength = ab[i] + 2;
            }

            if( this._in.idx >= 2 && this._in.idx == this._in.nextLength ){
                var msgBytes = this._in.buffer.slice( 0, this._in.nextLength );
                var msg = asnl.parseAsnl( msgBytes );
                console.log( msg );
                this.events.onReceive.dispatch( msg );
                this._in.idx = 0;
            }
        }
    }

    _onReceiveError( errorInfo ){
        console.log( "RECEIVE ERROR ", errorInfo );
        if( errorInfo.connectionId === this._cid ){
            this.events.onReceivedError.dispatch( errorInfo.error );
        }
    }

    send( arrayMsg ){
        var self = this;
        console.log( self._cid + " sending ", arrayMsg );
        return new Promise( ( resolve, reject ) =>{
            chrome.serial.send( self._cid, array2ab( arrayMsg ),// arrayBuffer.buffer,
                ( sendInfo ) =>{
                    console.log( "SENT ", sendInfo );
                    if( sendInfo.error ){
                        console.log( "send error" );
                        self.events.onSendError.dispatch( sendInfo.error );
                        reject( sendInfo.error );
                    }else{
                        resolve( sendInfo.bytesSent );
                    }
                } );
        } );
    }

    resetArduino(){
        var cid = this._cid;
        chrome.serial.setControlSignals( cid, {'dtr': false}, () =>
            chrome.serial.setControlSignals( cid, {'dtr': true}, () =>{
            } ) );

    }


    // --------------------------------------- other

    finalize(){
        this._unregisterListeners();
    }

}

function array2ab( array ){
    var buf = new ArrayBuffer( array.length );
    var bufView = new Uint8Array( buf );
    for( var i = 0; i < array.length; i++ ){
        bufView[i] = array[i];
    }
    console.log( bufView.buffer );
    return bufView.buffer;
}


function str2ab( str ){
    var buf = new ArrayBuffer( str.length );
    var bufView = new Uint8Array( buf );
    for( var i = 0; i < str.length; i++ ){
        bufView[i] = str.charCodeAt( i );
    }
    return buf;
}

export default Serial;