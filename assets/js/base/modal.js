(function($){
  var $document = $(document);

  var defaults = {
    selector: '',
    speed: 300
  };

  $.fn.modal = function(options){
    var options = $.extend(defaults, options);
    var selector = $(options.selector);
    var isShowing = false;

    var hide = function(){
      selector.fadeOut(options.speed).trigger('hide');
      $document.off('keydown', listenKey);
      isShowing = false;
    };

    var listenKey = function(e){
      var key = e.which || e.keyCode;
      if (key == 27) hide();
    };

    selector.on('click', '.close, .back', function(e){
      e.preventDefault();
      hide();
    });

    this.on('click', function(e){
      e.preventDefault();
      selector.fadeIn(options.speed).trigger('show');
      $document.on('keydown', listenKey);
      isShowing = true;
    });
  };
})(jQuery);