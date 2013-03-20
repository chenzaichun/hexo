(function($){
  $('.form').each(function(){
    var $required = $(this).find('.required');
    $(this).on('submit', function(e){
      $required.each(function(){
        if (!$(this).val()){
          e.preventDefault();
          $(this).addClass('error').one('keydown', function(){
            $(this).removeClass('error');
          });
        }
      });
    });
  });
})(jQuery);