var $ = require( "jquery" );
$.fn.shape = require( 'semantic-ui-shape' );
window.$ = $;


import PortManager from './PortManager.js';
import StatusText from './StatusText.js';


// ----------------------------------------------------

var pm = new PortManager();
var portPicker = $( "#port-picker" );
var btnConnect = $( "#connect-button" );
var btnRescan = $( "#rescan-button" );
var shaper = $( ".shape" );

var status = new StatusText( ".ui.status", "not connected", "", "unlink" );

var DEFAULT_TRANSITION = "flip over";

// ----------------------------------------------------

shaper.shape( {} );
portPicker.on( 'change', portSelectedChanged );
btnConnect.on( 'click', connect );
btnRescan.on( 'click', rescan );
rescan();


function createPortPicker( ports ){
    portPicker.html( "" ); // clear
    ports.forEach( ( port ) =>{
        // add ports
        var option = `<option value='${ port.path }'>${ port.displayName ? port.displayName + ' (' + port.path + ')' : port.path }</option>`;
        portPicker.append( $( option ) );
    } );

    btnRescan.removeClass( "disabled" );
    if( ports.length > 0 )   btnConnect.removeClass( "disabled" );

}

function portSelectedChanged(){
    if( portPicker.val() ){
        btnConnect.removeClass( "disabled" );
    }else{
        btnConnect.addClass( "disabled" );
    }
}

function rescan(){
    btnConnect.addClass( "disabled" );
    btnRescan.addClass( "disabled" );
    pm.scanPorts().then( createPortPicker );
}


function connect(){
    status.update( "connecting", "teal", "spinner" );
    pm.connect( portPicker.val() ).then(
        () =>{
            shaper.shape( DEFAULT_TRANSITION );
            status.update( "connected", "green", "linkify" )
        },
        ( error ) => status.update( error, "red", "warning circle" )
    );
}

// ----------------------------------------------------



