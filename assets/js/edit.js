//= require plugins/jquery.autosize-min
//= require base/modal

(function($){
  $('textarea').autosize();
  $('#edit-delete-button').modal({selector: '#delete-post-modal'});
})(jQuery);