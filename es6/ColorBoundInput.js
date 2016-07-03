import BoundInput from './BoundInput.js';
require( 'spectrum' );

class ColorBoundInput extends BoundInput {

    constructor( asnlOffset, selector, serialCommand ){
        super( asnlOffset, selector, serialCommand );
        this.input.spectrum( {} );
    }


    set( asnlArray ){
        var i = asnlArray[this.offset].value;
        this.input.spectrum( "set", i.toString(16) );
        this.savedValue = this.get();

    }

    isValid(){
        return true;
    }

    get(){
        var value = this.input.spectrum( "get" ).toHex();
        return parseInt( value, 16 );
    }
}

export default ColorBoundInput;