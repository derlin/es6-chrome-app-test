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

$.fn.uiXXable = function( enable ){
    if( enable ){
        $( this ).uiEnable();
    }else{
        $( this ).uiDisable();
    }
};

import WolfSerial from './WolfSerial.js';
import StatusText from './StatusText.js';


// ----- vars

var serial = new WolfSerial();

var shaper = $( ".shape" );
shaper.flip = () =>{
    shaper.shape( "flip over" );
};


var status = new StatusText( ".ui.status", "not connected", "", "unlink" );


var portPicker = $( "#port-picker" );
var btnConnect = $( "#connect-button" );
var btnRescan = $( "#rescan-button" );

var btnDisconnect = $( "#disconnect-button" );
var btnSubmit = $( "#submit-button" );
var inputs = $( 'input' );
var inputPin = $( 'input[name="pincode"]' );
var inputDi = $( 'input[name="di"]' );
var inputDf = $( 'input[name="df"]' );
var lastDump = null;

var dimmer = $( '#dimmer' );
var dimmerText = dimmer.find( '.status' );
var dimmerBtn = dimmer.find( '.button' );

var consoleArea = {
    clear : () =>{
        $( '#console' ).html( "" );
    },
    update: ( text ) =>{
        $('#console').html( `<span>${text}<br /></span>` );
    },
    append: ( text ) =>{
        $( '#console' ).append( `<span>${text}<br /></span>` );
    }
};

// ------ init

shaper.shape( {} );
portPicker.on( 'change', portSelectedChanged );
btnConnect.on( 'click', connect );
btnDisconnect.on( 'click', disconnect );
btnRescan.on( 'click', rescan );
btnSubmit.on( 'click', submit );
dimmerBtn.on( 'click', () => dimmer.hide() );
inputs.on( 'keyup', inputChanged );
rescan();


// ----- serial events

serial.events.onConnect.addListener( () =>{
    status.update( "initiating talk with the Arduino", "orange", "sign in" );
    serial.initiateArduinoTalk();
} );

serial.events.onArduinoReady.addListener( () =>{
    status.update( "connected", "green", "linkify" );
    consoleArea.clear();
    inputs.prop( 'disabled', true );
    shaper.flip();
    serial.dump().then( initForm );
} );


serial.events.onDisconnect.addListener( () =>{
    status.update( "disconnected", "", "unlink" );
    shaper.flip();
    rescan();
} );


// -------- port picker management

function rescan(){
    btnConnect.uiDisable();
    btnRescan.uiDisable();
    serial.scanPorts().then( createPortPicker );
}
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
    btnConnect.uiXXable( portPicker.val() );
}

// ---------- connect/disconnect

function connect(){
    status.update( "connecting", "teal", "spinner" );
    serial.connect( portPicker.val() ).then(
        ( connectionInfo ) =>{

        },
        ( error ) => status.update( error, "red", "warning circle" )
    );
}

function disconnect(){
    serial.disconnect();
}


// ------------- form management

function initForm( asnlDump ){
    console.log( "dump result", asnlDump );
    var error = asnlDump.value[0];
    var struct = asnlDump.value[1];

    if( error.value == 0 ){
        status.update( "error getting info from Arduino", "red", "warning circle" );
    }else{
        lastDump = struct.value;
        inputPin.val( lastDump[0].value );
        inputDi.val( lastDump[1].value );
        inputDf.val( lastDump[2].value );
        inputs.prop( "disabled", false );
        inputChanged(); // check new values
    }
}

function inputChanged(){
    var valid = true;
    $.each( inputs, ( idx, input ) =>{
        console.log( input, input.validity, valid );
        valid = valid && input.validity.valid;
    } );

    btnSubmit.uiXXable( valid );
}


// ---------- submit

function submit(){
    if( inputPin.val() == lastDump[0].value &&
        inputDi.val() == lastDump[1].value &&
        inputDf.val() == lastDump[2].value ){
        consoleArea.update( "no changes" );
        return;
    }

    var cb = ( result, cmd ) =>{
        console.log( result );
        var err = result.value;
        consoleArea.append( `set ${cmd} : ` + (err == 0 ? 'failed' : 'success.') );
    };

    consoleArea.clear();
    serial.setPin( inputPin.val() ).then( ( results ) => cb( results, "pin" ) );
    serial.setDi( inputDi.val() ).then( ( results ) => cb( results, " di" ) );
    serial.setDf( inputDf.val() ).then( ( results ) => cb( results, " df" ) );

}

