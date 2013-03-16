var term = require('term'),
  extend = require('../../extend');

extend.console.register('new', 'Create a new article', function(args, callback){
  if (!args._.length){
    console.log('Usage: hexo new [layout] <title>');
    return false;
  }

  require('../../create')({title: args._.pop(), layout: args._.pop()}, function(err, target){
    if (err) throw err;
    console.log('File created at %s', target.bold);
    hexo.emit('new', target);
    callback();
  });
});