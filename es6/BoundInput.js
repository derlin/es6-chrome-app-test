var $ = require( 'jquery' );

class BoundInput {

    constructor( asnlOffset, selector, serialCommand ){
        this.offset = asnlOffset;
        this.input = $( selector );
        this.savedValue = undefined;
        this.command = serialCommand;
    }

    id(){
        return this.offset;
    }

    set( asnlArray ){
        this.savedValue = asnlArray[this.offset].value;
        this.input.val( this.savedValue );
    }

    get(){
        return this.input.val();
    }

    save(){
        this.savedValue = this.get();
    }

    hasChanged(){
        return this.savedValue != this.get();
    }

    isValid(){
        return this.input[0].validity.valid;
    }

    serialCommand(){
        return this.command;
    }


}


export default BoundInput;