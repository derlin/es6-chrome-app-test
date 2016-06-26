import BoundInput from './BoundInput.js';
require( 'spectrum' );

class ColorBoundInput extends BoundInput {

    constructor( asnlOffset, selector, serialCommand ){
        super( asnlOffset, selector, serialCommand );
        this.input.spectrum( {} );
    }


    set( asnlArray ){
        var i = asnlArray[this.offset].value;
        this.savedValue = i.toString( 16 );
        this.input.spectrum( "set", this.savedValue );

    }

    get(){
        var value = this.input.spectrum( "get" ).toHex();
        return parseInt( value, 16 );
    }
}

export default ColorBoundInput;