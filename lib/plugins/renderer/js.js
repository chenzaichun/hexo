var extend = require('../../extend'),
  fs = require('graceful-fs'),
  async = require('async'),
  path = require('path'),
  cache = {},
  regexMain = /\/\/=\s*(.*?)\s+(.*)/g,
  regexTmp = /\/\/= hexo_tmp (\d)+/g;

var compile = function(data, options, callback){
  var source = data.path,
    sourceDir = path.dirname(source),
    content = data.text,
    cache = options.cache,
    arr = [],
    result = [],
    i = 0;

  content = content.replace(regexMain, function(match, type, path){
    arr.push([type, path]);
    result.push(i);
    return '//= hexo_tmp ' + i++;
  });

  if (!i) return callback(null, content);

  async.forEach(result, function(i, next){
    var item = arr[i],
      type = item[0];

    var sourcePath = path.resolve(sourceDir, item[1]);
    if (sourcePath.substr(sourcePath.length - 3, 3) !== '.js') sourcePath += '.js';

    if (type === 'require'){
      if (options.cache && cache.hasOwnProperty(sourcePath)){
        result[i] = cache[sourcePath];
      } else {
        fs.readFile(sourcePath, 'utf8', function(err, txt){
          if (err) return callback(err);
          compile({path: sourcePath, text: txt}, {cache: cache}, function(err, compiled){
            if (err) return callback(err);
            if (options.cache) cache[sourcePath] = compiled;
            result[i] = compiled;
            next();
          });
        });
      }
  //} else if (type === 'require_tree'){
    } else {
      result[i] = null;
      next();
    }
  }, function(err){
    if (err) return callback(err);
    content = content.replace(regexTmp, function(match, i){
      return result[i] ? result[i] : '';
    });
    callback(null, content);
  });
}

extend.renderer.register('js', 'js', compile);