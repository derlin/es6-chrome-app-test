var $ = require( 'jquery' );

class StatusText {

    constructor( selector, msg, color, icon ){
        this.element = $( selector );
        console.log(this.element);
        this.update( msg, color, icon );
    }


    update( msg, color, icon ){
        if( icon ) this.element.html( `<i class="${icon} icon"></i> ${msg}` );
        else this.element.html( msg );

        if( this.color ) this.element.removeClass( this.color );
        this.color = color;
        this.element.addClass( this.color );
    }

    clear(){
        this.element.html( "" ).removeClass( this.color );
    }
}

export default StatusText;