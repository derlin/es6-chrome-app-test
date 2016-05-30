class Serial {

    constructor( connectionInfo ){
        this.connectionId = connectionInfo.connectionId;
        this.onRead = new chrome.Event();
        this.onError = new chrome.Event();

        // this.boundOnReceive = this._onReceive.bind(this);
        // this.boundOnReceiveError = this._onReceiveError.bind(this);

        chrome.serial.onReceive.addListener( this._onReceive );
        chrome.serial.onReceiveError.addListener( this._onReceiveError );
    }

    _onReceive( receiveInfo ){

    }

    _onReceiveError( errorInfo ){
        if( errorInfo.connectionId === this.connectionId ){
            this.onError.dispatch( errorInfo.error );
        }
    }

    send( msg ){
        return new Promise( ( resolve, reject ) =>{
            chrome.serial.send( this.connectionId, this.str2ab( msg ), ( sendInfo ) =>{
                if( sendInfo.error ) reject( sendInfo.error );
                else resolve( sendInfo.bytesSent );
            } );
        } );
    }

    /* Interprets an ArrayBuffer as UTF-8 encoded string data. */
    static ab2str( buf ){
        var bufView = new Uint8Array( buf );
        var encodedString = String.fromCharCode.apply( null, bufView );
        return decodeURIComponent( escape( encodedString ) );
    };

    /* Converts a string to UTF-8 encoding in a Uint8Array; returns the array buffer. */
    static str2ab( str ){
        var encodedString = unescape( encodeURIComponent( str ) );
        var bytes = new Uint8Array( encodedString.length );
        for( var i = 0; i < encodedString.length; ++i ){
            bytes[i] = encodedString.charCodeAt( i );
        }
        return bytes.buffer;
    };
}

export default Serial;