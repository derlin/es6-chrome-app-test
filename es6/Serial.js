class Serial {

    constructor( connectionInfo ){
        this.events = {
            onReceive      : new chrome.Event(),
            onReceivedError: new chrome.Event(),
            onSendError    : new chrome.Event()
        };

        this._connectionInfo = connectionInfo;
        this._receptionBuffer = new ArrayBuffer(255);
        this._asnlTokenLength = -1;

        var boundOnReceive = this._onReceive.bind(this);
        var boundOnReceiveError = this._onReceiveError.bind(this);
        chrome.serial.onReceive.addListener( boundOnReceive );
        chrome.serial.onReceiveError.addListener( boundOnReceiveError );

        console.log("serial created ", this._connectionInfo);
    }

    _onReceive( receiveInfo ){
        console.log("RECEIVE ", receiveInfo);
        if(this._asnlTokenLength < 0){
            // new token

        }
    }

    _onReceiveError( errorInfo ){
        if( errorInfo.connectionId === this.connectionId ){
            this.events.onReceivedError.dispatch( errorInfo.error );
        }
    }

    send( buffer ){
        let self = this;
        return new Promise( ( resolve, reject ) =>{
            if( !buffer instanceof Uint8Array ) buffer = new Uint8Array( buffer );
            chrome.serial.send(
                self._connectionInfo.connectionId,
                buffer,
                ( sendInfo ) =>{
                    if( sendInfo.error ){
                        self.events.onSendError.dispatch( sendInfo.error );
                        reject( sendInfo.error );
                    }else{
                        resolve( sendInfo.bytesSent );
                    }
                } );
        } );
    }

    finalize(){
        chrome.serial.onReceive.removeListener( this._onReceive );
        chrome.serial.onReceiveError.removeListener( this._onReceiveError );
    }

}

export default Serial;