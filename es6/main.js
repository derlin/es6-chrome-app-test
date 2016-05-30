// jQuery for all

let $ = require( "jquery" );
$.fn.shape = require( 'semantic-ui-shape' );
import PortManager from './PortManager.js';
import StatusText from './StatusText.js';

var pm = new PortManager();
var select = $( "#port-picker" );
var btnConnect = $( "#connect-button" );
var btnRescan = $( "#rescan-button" );
var status = new StatusText( ".ui.status", "not connected", "", "unlink" );
var shape = $( ".shape" );

let DEFAULT_TRANSITION = "flip over";

shape.shape( {debug: false, duration: 1000} );


select.on( 'change', selectChanged );
btnConnect.on( 'click', connect );
btnRescan.on( 'click', rescan );
rescan();


function createPortPicker( ports ){
    select.html( "" ); // clear
    ports.forEach( ( port ) =>{
        // add ports
        var option = `<option value='${ port.displayName || port.path }'>${ port.path }</option>`;
        select.append( $( option ) );
    } );
    btnRescan.removeClass( "disabled" );
    btnConnect.removeClass( "disabled" );
}

function selectChanged(){
    if( select.val() ){
        btnConnect.removeClass( "disabled" );
    }else{
        btnConnect.addClass( "disabled" );
    }
}

function rescan(){
    btnConnect.addClass( "disabled" );
    btnRescan.addClass( "disabled" );
    pm.eligiblePorts().then( createPortPicker );
}

function connect(){
    status.update( "connecting", "teal", "spinner" );
    pm.openPort( select.val() ).then(
        () => $( 'shape' ).shape( DEFAULT_TRANSITION ),
        ( error ) => status.update( error, "red", "warning circle" )
    );
}


//
// $( ".flip-btn" ).on( "click", e =>{
//
//     $( ".shape" ).shape( 'flip over' );
//     console.log( "flip" );
// } );

