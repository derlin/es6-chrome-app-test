class PortManager {

    constructor(){
        this._connectionInfo = null;
        this._events = {
            onConnect   : new chrome.Event(),
            onDisconnect: new chrome.Event()
        };
        this._ports = null;
    }

    scanPorts(){
        let self = this;
        return new Promise( ( resolve ) =>{
            chrome.serial.getDevices( ( ports ) =>{
                self._ports = ports.filter( p => !p.path.match( /[Bb]luetooth/ ) );
                resolve( ports );
            } );
        } );
    }

    getPorts(){
        return this._ports;
    }


    connect( selectedPort ){
        let self = this;
        return new Promise( ( resolve, reject ) =>{

            let connect = () => chrome.serial.connect( selectedPort, ( connectionInfo ) =>{
                this._ifChromeError( reject, () =>{
                    self._connectionInfo = connectionInfo;
                    self._events.onConnect.dispatch( connectionInfo );
                    resolve();
                } );
            } );

            if( self._connectionInfo ){
                chrome.serial.disconnect( self._connectionInfo.connectionId, () =>{
                    this._ifChromeError( reject, connect )
                } );

            }else{
                connect();
            }
        } );
    }

    disconnect(){
        let self = this;
        return new Promise( ( resolve ) =>{
            chrome.serial.disconnect( self._connectionInfo.connectionId, () =>{
                self._connectionInfo = null;
                self._events.onDisconnect.dispatch();
                resolve();
            } );

        } );
    }

    getInfo(){
        return this._connectionInfo;
    }

    _ifChromeError( reject, proceed ){
        if( chrome.runtime.lastError ){
            reject( chrome.runtime.lastError.message );
        }else{
            proceed();
        }
    }
}

export default PortManager;