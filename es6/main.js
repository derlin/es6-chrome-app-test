var $ = require( "jquery" );
$.fn.shape = require( 'semantic-ui-shape' );
window.$ = $;

import WolfSerial from './WolfSerial.js';
import StatusText from './StatusText.js';

var toastr = require( 'toastr' );
toastr.options.closeMethod = 'fadeOut';
toastr.options.closeDuration = 300;

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

// ------ init

shaper.shape( {} );
portPicker.on( 'change', portSelectedChanged );
btnConnect.on( 'click', connect );
btnDisconnect.on( 'click', disconnect );
btnRescan.on( 'click', rescan );
btnSubmit.on( 'click', submit );
inputs.on( 'keyup', inputChanged );
rescan();


// ----- serial events

serial.events.onConnect.addListener( () =>{
    status.update( "initiating talk with the Arduino", "orange", "sign in" );
    serial.initiateArduinoTalk();
} );

serial.events.onArduinoReady.addListener( () =>{
    status.update( "connected", "green", "linkify" );
    inputs.prop( 'disabled', true );
    shaper.flip();
    serial.dump().then( initForm );
} );


serial.events.onDisconnect.addListener( () =>{
    status.update( "disconnected", "", "unlink" );
    shaper.flip();
    rescan();
} );

serial.events.onError.addListener( ( error ) =>{
    console.log( "ERROR", error );
    switch( error.type ){
        case WolfSerial.ErrorTypes.SERIAL:
            disconnect();
            setTimeout( () => toastr.error( error.msg ), 1000 );
            break;

        case WolfSerial.ErrorTypes.ARDUINO:
            status.update( "connection failed", "", "unlink" );
            break;

        default:
            toastr.error( error.msg );

    }
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
        () =>{
        }, // see the connect event
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
        lastDump = {
            pin: struct.value[0].value,
            df : struct.value[1].value,
            di : struct.value[2].value
        };
        inputPin.val( lastDump.pin );
        inputDi.val( lastDump.di );
        inputDf.val( lastDump.df );
        inputs.prop( "disabled", false );
        inputChanged(); // check new values
    }
}

function inputChanged(){
    var valid = true;
    $.each( inputs, ( idx, input ) =>{
        valid = valid && input.validity.valid;
    } );

    btnSubmit.uiXXable( valid );
}


// ---------- submit

function submit(){
    if( inputPin.val() == lastDump.pin &&
        inputDi.val() == lastDump.di &&
        inputDf.val() == lastDump.df ){
        toastr.info( "no changes to save." );
        return;
    }

    serial.setPin( inputPin.val() ).then( ( results ) => submitCallback( results, "pin", inputPin.val() ) );
    serial.setDi( inputDi.val() ).then( ( results ) => submitCallback( results, " di", inputDi.val() ) );
    serial.setDf( inputDf.val() ).then( ( results ) => submitCallback( results, " df", inputDf.val() ) );
}

var submitErrors = [];
var submitCnt = 0;

function submitCallback( result, cmd, val ){
    console.log( result );
    if( result.value == 0 ) submitErrors.push( cmd );
    else lastDump[cmd] =
        submitCnt++;
    if( submitCnt == 3 ){
        submitCnt = 0;
        if( submitErrors.length == 0 ){
            toastr.success( "arduino updated." );
            lastDump[cmd] = val;
        }else{
            toastr.error( "some commands failed : " + errors.join( ", " ) + "..." );
            submitErrors = [];
        }
    }
}

