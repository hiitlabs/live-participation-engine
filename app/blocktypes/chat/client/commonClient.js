// TODO: figure how to make this common for all modules

module.exports.controlToggle = function( block , key, text_on, text_off ) {


  var $button = $('<a>', { class:"btn btn-sm", href:'#', html:'placeholder' } );

  // toggle display mode
  var toggle = function( mode ) {

    if( mode ) {

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
