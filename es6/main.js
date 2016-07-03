// TODO : submit button + colors grey + x on quit

var $ = require( "jquery" );
$.fn.shape = require( 'semantic-ui-shape' );
window.$ = $;

import WolfSerial from './WolfSerial.js';
import StatusText from './StatusText.js';
import BoundInput from './BoundInput.js';
import ColorBoundInput from './ColorBoundInput.js';

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
shaper.state = 0; // 0 = init, 1 = connected panel

shaper.welcomePanel = () =>{
    if(shaper.state != 0) {
        shaper.shape( "flip over" );
        shaper.state = 0;
    }
};

shaper.connectPanel = () =>{
    if(shaper.state != 1) {
        shaper.shape( "flip over" );
        shaper.state = 1;
    }
};


var status = new StatusText( ".ui.status", "not connected", "", "unlink" );

var portPicker = $( "#port-picker" );
var btnConnect = $( "#connect-button" );
var btnRescan = $( "#rescan-button" );

var btnDisconnect = $( "#disconnect-button" );
var btnSubmit = $( "#submit-button" );

var $inputs = $( 'input' );
var offset = 0;
var inputs = [
    new BoundInput( offset++, 'input[name="pincode"]', WolfSerial.SetCommands.PIN ),
    new BoundInput( offset++, 'input[name="di"]', WolfSerial.SetCommands.DI ),
    new BoundInput( offset++, 'input[name="df"]', WolfSerial.SetCommands.DF ),
    new ColorBoundInput( offset++, 'input[name="idle_color_on"]', WolfSerial.SetCommands.ColorOn ),
    new ColorBoundInput( offset++, 'input[name="idle_color_off"]', WolfSerial.SetCommands.ColorOff ),
    new BoundInput( offset++, 'input[name="idle_ticks_on"]', WolfSerial.SetCommands.TicksOn ),
    new BoundInput( offset++, 'input[name="idle_ticks_off"]', WolfSerial.SetCommands.TicksOff ),
];

// ------ init

shaper.shape( {} );
portPicker.on( 'change', portSelectedChanged );
btnConnect.on( 'click', connect );
btnDisconnect.on( 'click', disconnect );
btnRescan.on( 'click', rescan );
btnSubmit.on( 'click', submit );
$inputs.on( 'change', inputChanged );
rescan();


// ----- serial events

serial.events.onConnect.addListener( () =>{
    status.update( "initiating talk with the Arduino", "orange", "sign in" );
    serial.initiateArduinoTalk();
} );

serial.events.onArduinoReady.addListener( () =>{
    status.update( "connected", "green", "linkify" );
    shaper.connectPanel();
    serial.ask( WolfSerial.Commands.Dump ).then( initForm );
} );


serial.events.onDisconnect.addListener( () =>{
    status.update( "disconnected", "", "unlink" );
    shaper.welcomePanel();
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
        inputs.forEach( input => input.set( struct.value ) );
        inputChanged(); // check new values
    }
}

function inputChanged(){
    var valid = true;
    var changed = false;

    inputs.forEach( input =>{
        valid = valid && input.isValid();
        changed = changed || input.hasChanged();
    } );

    btnSubmit.uiXXable( valid && changed ); // TODO
}


// ---------- submit


function submit(){
    processInput( inputs[0] );
}

function processInput( input ){
    console.log( "processing input ", input );
    // input didn't change: skip it
    if( !input.hasChanged() ){
        // if last input of the list
        if( input.id() == inputs.length - 1 ){
            // everything went fine, send the save command
            save();
        }else{
            // some more inputs, launch the next one
            processInput( inputs[input.id() + 1] );
        }
        return;
    }

    // input changed: launch the update
    serial.set( input.serialCommand(), input.get() ).then( result =>{

        // if an error, abort.
        if( result.value == 0 ){
            console.log( "error", input.serialCommand().nice );
            toastr.error( "command " + input.serialCommand().nice + " failed : " + e + ". Aborting." );
            return;
        }
        console.log( "ok", input.serialCommand().nice );

        // if last input of the list
        if( input.id() == inputs.length - 1 ){
            // everything went fine, send the save command
            save();
        }else{
            // some more inputs, launch the next one
            processInput( inputs[input.id() + 1] );
        }
    }, ( e ) =>{ // send error
        // abort
        toastr.error( "command " + input.serialCommand().nice + " failed : " + e + ". Aborting." );
    } );
}


function save(){
    serial.ask( WolfSerial.Commands.Save ).then( result =>{
            if( result.value == 0 ){
                toastr.error( "Final save command failed..." );
            }else{
                // finally, everything ok:
                inputs.forEach( input => input.save() );
                toastr.success( "Arduino updated." );
                inputChanged();
            }
        }
    );
}

