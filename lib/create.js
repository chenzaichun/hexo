var moment = require('moment'),
  fs = require('graceful-fs'),
  async = require('async'),
  path = require('path'),
  swig = require('swig'),
  yaml = require('yamljs'),
  _ = require('lodash'),
  util = require('./util'),
  file = util.file,
  yfm = util.yfm,
  config = hexo.config,
  defaultLayout = config.defaultLayout ? config.defaultLayout : 'post',
  newPostName = config.new_post_name ? config.new_post_name : ':title.md',
  sourceDir = hexo.source_dir,
  scaffoldDir = hexo.scaffold_dir;

var escape = function(str){
  return str.toString().toLowerCase()
    .replace(/\s/g, '-')
    .replace(/\\|\/|<|>|:|"|\||\?|\*/g, '');
};

// Default scaffolds
var scaffolds = {
  post: [
    'title: {{ title }}',
    'date: {{ date }}',
    'tags:',
    '---'
  ].join('\n') + '\n',
  page: [
    'title: {{ title }}',
    'date: {{ date }}',
    '---'
  ].join('\n') + '\n',
  normal: [
    'layout: {{ layout }}',
    'title: {{ title }}',
    'date: {{ date }}',
    'tags:',
    '---'
  ].join('\n') + '\n'
};

module.exports = function(){
  var args = _.toArray(arguments),
    callback = args.pop(),
    data = args.shift(),
    replace = args.length ? args[0] : false,
    title = data.title,
    slug = data.slug ? data.slug : data.title,
    layout = data.layout || defaultLayout,
    date = moment(data.date) || moment(),
    target = sourceDir;

  if (layout === 'page'){
    target += escape(slug) + '/index.md';
  } else {
    var filename = newPostName
      .replace(':year', date.year())
      .replace(':month', date.format('MM'))
      .replace(':day', date.format('DD'))
      .replace(':title', escape(slug));

    if (!path.extname(filename)) filename += '.md';

    target += (layout === 'draft' ? '_drafts/' : '_posts/') + filename;
  }

  async.waterfall([
    // Check whether the target exists
    function(next){
      if (replace) return next();

      fs.exists(target, function(exist){
        if (!exist) return next();
        // If target exists, check the parent folder to rename the target. e.g. target-1.md
        var parent = path.dirname(target);

        fs.exists(parent, function(exist){
          if (!exist) return next();

          fs.readdir(parent, function(err, files){
            if (err) return callback(err);
            var extname = path.extname(target),
              basename = path.basename(target, extname),
              regex = new RegExp('^' + basename + '-?(\\d+)?'),
              max = 0;

            files.forEach(function(item){
              var match = path.basename(item, path.extname(item)).match(regex);

              if (match){
                var num = match[1];

                if (num){
                  if (num >= max){
                    max = parseInt(num) + 1;
                  }
                } else {
                  if (max == 0){
                    max = 1;
                  }
                }
              }
            });

            if (max > 0) target = target.substring(0, target.length - extname.length) + '-' + max + extname;
            next();
          });
        });
      });
    },
    // Load the scaffold
    function(next){
      fs.exists(scaffoldDir, function(exist){
        if (!exist) return next(null, undefined);
        file.dir(scaffoldDir, function(files){
          for (var i=0, len=files.length; i<len; i++){
            var item = files[i];
            if (path.basename(item, path.extname(item)) === layout){
              var scaffold = scaffoldDir + item;
              break;
            }
          }

          if (!scaffold){
            next(null, undefined);
          } else {
            file.read(scaffold, next);
          }
        });
      })
    },
    // Use the default scaffold if the scaffold not exists
    function(scaffold, next){
      if (!scaffold){
        if (layout === 'post' || layout === 'draft'){
          scaffold = scaffolds.post;
        } else if (layout === 'page'){
          scaffold = scaffolds.page;
        } else {
          scaffold = scaffolds.normal;
        }
      }

      next(null, scaffold);
    },
    // Write content
    function(scaffold, next){
      var firstData = swig.compile(scaffold)({layout: layout, title: title, date: date}),
        header = yfm(firstData),
        content = header._content;

      delete header._content;

      var meta = _.merge(header, _.omit(data, 'content'));
      if (!meta.layout) delete meta.layout;
      if (meta.date) meta.date = date.format('YYYY-MM-DD HH:mm:ss');

      for (var i in meta){
        if (meta[i] === null || typeof meta[i] === 'undefined') meta[i] = '';
      }

      var result = yaml.stringify(meta, 2) + '---\n' + content + (data.content ? '\n' + data.content : '');

      file.write(target, result, function(err){
        if (err) return callback(err);
        callback(null, target);
      });
    }
  ]);
};