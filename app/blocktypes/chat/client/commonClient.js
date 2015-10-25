// TODO: figure how to make this common for all modules

module.exports.controlToggle = function( block , key, text_on, text_off, default_state ) {

  default_state = typeof default_state !== 'undefined' ? default_state : false;



  var $button = $('<a>', { class:"btn btn-sm", href:'#', html:'placeholder' } );

  // toggle display mode
  var toggle = function( mode ) {

    if( mode !== default_state ) {

      $button.html('<span class="text-warning"><span class="glyphicon glyphicon-unchecked"></span> ' + text_off + '</span>');

    } else {

      $button.html('<span class="text-warning"><span class="glyphicon glyphicon-check"></span> ' + text_on + '</span>');

    }

  }

  $button.click( function() {

    var k = block.config[ key ];
    toggle( !k );
    block.rpc('$updateFrontends', key , ! k );

  } );

  block.on('change:' + key , function( value ) { // would it be cleaner to use block.config[ key ]

    toggle( value );

  });

  // initialize state
  toggle( block.config[ key ] );


  // add button to main menu
  $button.appendTo( block.$minibar );

};

module.exports.controlTextField = function( block, key, text, $dom ) { // todo: get rid of DOM-variable, i.e. construct and add the variable here.

  $dom.attr('title', text );
  $dom.on('click', function() { // should we use $(this) ?
    $dom.attr('contenteditable', true);
    $dom.focus();
    return false;
  });

  $dom.on('keydown', function(ev) {

    if (ev.which == 27) { // Esc, cancel edit
      $dom.text( block.config[key] );
      $dom.blur();
      return false;
    }
    if (ev.which == 13) { // Return, save
      $dom.blur();
      return false;
    }
  });

  $dom.on('blur', function() { // or el.onblur =

    $dom.attr('contenteditable', null);
    var text = $dom.text();
    if ( text == block.config[ key ] ) return;
    if ( text === '-') return;
    var data = {};
    data[ key ] = text;
    block.$setConfig( data );
    block.rpc( '$updateFrontends', key , text );

    return false;
  });

}
