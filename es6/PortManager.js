class PortManager {

    constructor(){
        this.connectionId = -1;
    }

    eligiblePorts(){
        return new Promise( ( resolve ) =>{
            chrome.serial.getDevices( ( ports ) =>{
                ports = ports.filter( p => !p.path.match( /[Bb]luetooth/ ) );
                resolve( ports );
            } );
        } );
    }


    openPort( selectedPort ){
        let self = this;
        return new Promise( ( resolve, reject ) =>{

            let connect = () => chrome.serial.connect( selectedPort, () =>{
                this._ifChromeError( reject, resolve );
            } );

            if( self.connectionId != -1 ){
                chrome.serial.disconnect( self.connectionId, () =>{
                    this._ifChromeError( reject, connect )
                } );

            }else{
                connect();
            }
        } );
    }

    disconnect(){
        return new Promise( ( resolve ) =>{
            let self = this;
            chrome.serial.disconnect( self.connectionId, () =>{
                self.connectionId = -1;
                resolve();
            } );

        } );
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