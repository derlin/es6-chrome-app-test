const ASNL_TOKENS = {
    INT   : 73,  // I
    STRUCT: 123, // {
    UINT  : 85,  // U
    STRING: 34,  // "
    PROMPT: 62   // >
};


// ------------------------------------------- classes

function parseAsnl( buffer ){
    var result = _parseAsnl( buffer );
    if( buffer.length != result.len + 2 ){ // 2 == type field + size field
        console.log( "parseAsnl -- error: incorrect length " + result.len, buffer );
        return null;
    }

    return result;
}


class AsnlStruct {

    constructor( array, length ){
        this.array = array;
        this.len = length || -1;
    }

    toAsnl(){
        var values = [];
        this.array.map( ( asnl_obj ) =>{
            values = values.concat( asnl_obj.toAsnl() );
        } );

        var meta = [ASNL_TOKENS.STRUCT, values.length];
        return meta.concat( values );
    }

    static fromAsnl( buffer ){
        console.log( "parsing STRUCT ", buffer );
        var len = buffer[0];
        var cursor = 1;
        var values = [];

        while( cursor < len + 1 ){
            // get next type
            var obj = _parseAsnl( buffer.slice( cursor ) );
            if( !obj ){
                console.log( "error parsing object | cursor: " + cursor, buffer );
                return null;
            }
            console.log( "  struct: parsed", obj );
            values.push( obj );

            // add len + type field + size field
            cursor += obj.len + 2;
        }

        if(cursor != len+1){
            console.log( "ERROR: wrong struct size | cursor: " + cursor, buffer );
            return null;
        }

        return new AsnlStruct( values, len );
    }

}

class AsnlInt {

    constructor( value, len ){
        this.value = value;
        this.len = len;
    }

    toAsnl(){
        var meta = [ASNL_TOKENS.INT, this.len];
        return meta.concat( intToByteArray( this.value, this.len ) );
    }

    static fromAsnl( buffer ){
        var len = buffer[0];
        console.log( "parsing INT of size " + len, buffer );
        var value = byteArrayToInt( buffer.slice( 1 ), len + 1 );
        return new AsnlInt( value, len );
    }
}

class AsnlUint {

    constructor( value, len ){
        this.value = value;
        this.len = len;
    }

    toAsnl(){
        var meta = [ASNL_TOKENS.UINT, this.len];
        return meta.concat( intToByteArray( this.value, this.len ) );
    }

    static fromAsnl( buffer ){
        var len = buffer[0];
        console.log( "parsing UINT of size " + len, buffer );
        var value = byteArrayToInt( buffer.slice( 1 ), len );
        if( value < 0 ){
            value = ~value + 1; // two's complement
        }
        return new AsnlUint( len, value );
    }
}

class AsnlString {
    constructor( value ){
        this.value = value;
        this.len = value.length;
    }

    toAsnl(){
        var bytes = this.value.split( '' ).map( ( c ) => c.charCodeAt( 0 ) );
        var meta = [ASNL_TOKENS.STRING, this.len];
        return meta.concat( bytes );
    }

    static fromAsnl( buffer ){
        var len = buffer[0];
        console.log( "parsing STRING of size " + len, buffer );
        var charArray = buffer.slice( 1, len + 1 ).map( ( b ) => String.fromCharCode( b ) );
        return new AsnlString( charArray.join( "" ) );
    }
}

// ------------------------------------ utilities

function intToByteArray( num, len ){
    var bytes = [];
    for( var i = 0; i < len; i++ ){
        bytes.push( num & 0xFF );
        num >>= 8;
    }
    return bytes.reverse();
}

function byteArrayToInt( buffer, len ){
    var int = 0;
    if( !buffer instanceof Uint8Array ){
        buffer = new Uint8Array( buffer );
    }

    for( var i = 0; i < len; i++ ){
        int <<= 8;
        int |= buffer[i];
    }

    return int;
}

function asnlTypeToClass( type ){
    switch( type ){
        case ASNL_TOKENS.INT:
            return AsnlInt;
        case ASNL_TOKENS.UINT:
            return AsnlUint;
        case ASNL_TOKENS.STRING:
            return AsnlString;
        case ASNL_TOKENS.STRUCT:
            return AsnlStruct;
        default:
            return null;
    }
}


function _parseAsnl( buffer ){
    var asnlClass = asnlTypeToClass( buffer[0] );
    if( !asnlClass ){
        console.log( "parseAsnl -- error: first char not an asnl type" );
        return null;
    }

    return asnlClass.fromAsnl( buffer.slice( 1 ) );
}


// ------------------------------------- export

//export {ASNL_TYPES, AsnlInt, AsnlString, AsnlUint, AsnlStruct};