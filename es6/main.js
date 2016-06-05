var $ = require( "jquery" );
$.fn.shape = require( 'semantic-ui-shape' );
window.$ = $;

// ------------------ jquery semantic buttons

$.fn.uiDisable = function(){
    $( this[0] ).addClass( "disabled" );
};

$.fn.uiEnable = function(){
    $( this[0] ).removeClass( "disabled" );
};

$.fn.uiToggle = function(){
    if( $( this[0] ).hasClass( "disabled" ) ){
        $( this ).uiDisable();
    }else{
        $( this ).uiEnable();
    }
};

import WolfSerial from './WolfSerial.js';
import StatusText from './StatusText.js';

// ----------------------------------------------------

var serial = new WolfSerial();
var portPicker = $( "#port-picker" );
var btnConnect = $( "#connect-button" );
var btnDisconnect = $( "#disconnect-button" );
var btnRescan = $( "#rescan-button" );
var shaper = $( ".shape" );


var status = new StatusText( ".ui.status", "not connected", "", "unlink" );

var DEFAULT_TRANSITION = "flip over";


serial.events.onArduinoReady.addListener( () =>{
    console.log( "arduino ready" );
    serial.setPin( "123" ).then( ( res ) =>{
        console.log( "set pin ", res.toString() );
        serial.dump().then( ( res ) => console.log( "dump ", res.toString() ) );
    } );
} );

serial.events.onConnect.addListener( () =>{
    console.log( "connect event received" );
} );

serial.events.onDisconnect.addListener( () =>{
    console.log( "disconnect event received" );
} );
// ----------------------------------------------------

shaper.shape( {} );
portPicker.on( 'change', portSelectedChanged );
btnConnect.on( 'click', connect );
btnDisconnect.on( 'click', disconnect );
btnRescan.on( 'click', rescan );
rescan();


function createPortPicker( ports ){
    portPicker.html( "" ); // clear
    ports.forEach( ( port ) =>{
        // add ports
        var option = `<option value='${ port.path }'>${ port.displayName ? port.displayName + ' (' + port.path + ')' : port.path }</option>`;
        portPicker.append( $( option ) );
    } );

    btnRescan.uiEnable();
    if( ports.length > 0 )   btnConnect.uiEnable();

}

function portSelectedChanged(){
    if( portPicker.val() ){
        btnConnect.uiEnable();
    }else{
        btnConnect.uiDisable();
    }
}

function rescan(){
    btnConnect.uiDisable();
    btnRescan.uiDisable();
    serial.scanPorts().then( createPortPicker );
}


function connect(){
    status.update( "connecting", "teal", "spinner" );
    serial.connect( portPicker.val() ).then(
        ( connectionInfo ) =>{
            shaper.shape( DEFAULT_TRANSITION );
            status.update( "connected", "green", "linkify" );
            serial.initiateArduinoTalk();
        },
        ( error ) => status.update( error, "red", "warning circle" )
    );
}

function disconnect(){
    if( serial != null ){
        status.update( "disconnected", "", "unlink" );
        serial.disconnect();
        shaper.shape( DEFAULT_TRANSITION );
    }
}
// ----------------------------------------------------



