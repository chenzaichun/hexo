var express = require('express'),
  term = require('term'),
  path = require('path'),
  async = require('async'),
  fs = require('graceful-fs'),
  _ = require('lodash'),
  extend = require('../../extend'),
  route = require('../../route'),
  model = require('../../model'),
  posts = model.posts,
  render = require('../../render'),
  util = require('../../util'),
  file = util.file,
  yfm = util.yfm,
  config = hexo.config,
  publicDir = hexo.public_dir,
  sourceDir = hexo.source_dir,
  assetDir = hexo.core_dir + 'assets/';

var randomPass = function(length){
  var text = '0123456789abcdefghijklmnopqrstuvwxyz',
    total = text.length,
    result = '';

  for (var i=0; i<length; i++){
    result += text.substr(parseInt(Math.random() * total), 1);
  }

  return result;
};

extend.console.register('server', 'Run server', function(args){
  var app = express(),
    admin = args.a || args.admin ? true : false,
    statics = args.s || args.static ? true : false,
    log = args.l || args.log,
    port = args.p || args.port || config.port,
    generate = require('../../generate'),
    create = require('../../create');

  app.set('views', hexo.core_dir + 'views');
  app.set('view engine', 'ejs');
  app.locals.config = config;
  app.locals.version = hexo.version;
  app.locals.layout = '../layout';
  if (!hexo.debug) app.locals.cache = true;
  app.locals.site = model;
  app.engine('ejs', render.renderFile);

  app.use(function(req, res, next){
    res.set('X-Powered-By', 'Hexo');
    next();
  });

  app.resource = function(){
    var args = _.toArray(arguments),
      path = args.shift(),
      obj = args.pop();

    if (obj.index) app.get.apply(app, [].concat(path + '.:format?', args, obj.index));
    if (obj.new) app.get.apply(app, [].concat(path + '/new.:format?', args, obj.new));
    if (obj.create) app.post.apply(app, [].concat(path + '.:format?', args, obj.create));
    if (obj.show) app.get.apply(app, [].concat(path + '/:id.:format?', args, obj.show));
    if (obj.edit) app.get.apply(app, [].concat(path + '/:id/edit.:format?', args, obj.edit));
    if (obj.update) app.put.apply(app, [].concat(path + '/:id.:format?', args, obj.update));
    if (obj.destroy) app.del.apply(app, [].concat(path + '/:id.:format?', args, obj.destroy));

    _.difference(Object.keys(obj), ['index', 'new', 'create', 'show', 'edit', 'update', 'destroy']).forEach(function(item){
      app.get.apply(app, [].concat(path + '/:id/' + item + '.:format?'), args, obj[item]);
    });

    return this;
  };

  if (log){
    app.use(express.logger(log));
  } else if (config.logger){
    if (config.logger_format) app.use(express.logger(config.logger_format));
    else app.use(express.logger());
  } else if (hexo.debug){
    app.use(express.logger());
  }

  var startServer = function(){
    app.use(config.root, express.static(publicDir));

    if (config.root !== '/'){
      app.get('/', function(req, res){
        res.redirect(config.root);
      });
    }

    app.use(function(req, res){
      res.status(404).end('404 Not Found');
    });

    app.listen(port, function(){
      console.log('Hexo is running at %s. Press Ctrl+C to stop.', ('http://localhost:' + port + config.root).bold);
      if (admin && !statics) console.log('Admin password: %s', adminPass.bold);
      hexo.emit('server');
    });
  };

  if (statics){
    app.use(express.compress());

    async.waterfall([
      function(next){
        if (args.g || args.generate) return next(null, true);
        fs.exists(publicDir, function(exist){
          next(null, !exist);
        });
      },
      function(generate, next){
        if (!generate) return next();
        hexo.call('generate', next);
      }
    ], startServer);

    return;
  }

  if (admin){
    var adminPass = config.admin_pass || randomPass(8);

    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser('nAL1o1D5wlBn96T'));
    app.use(express.session());
    app.use(require('connect-flash')());

    app.get('/admin/login', function(req, res, next){
      if (req.session.authed){
        next();
      } else {
        res.render('login', {layout: false, error: req.flash('error')});
      }
    });

    app.post('/admin/login', function(req, res, next){
      var pass = req.body.pass;
      if (pass === adminPass){
        req.session.authed = true;
        res.redirect('/admin');
      } else {
        req.flash('error', 1);
        res.redirect('/admin/login');
      }
    });

    var login = function(req, res, next){
      if (hexo.debug || req.session.authed) return next();
      res.redirect('/admin/login');
    };

    app.get('/admin', login, function(req, res, next){
      res.redirect('/admin/posts');
    });

    app.resource('/admin/posts', login, {
      index: function(req, res, next){
        res.render('posts/index', {page: posts.sort('date', -1), message: req.flash('message')});
      },
      create: function(req, res, next){
        create(req.body, function(err){
          if (err) throw err;
          res.redirect('/admin/posts');
        });
      },
      edit: function(req, res, next){
        var id = req.params.id,
          data = posts.get(id);

        if (!data) return next();

        file.read(data.full_path, function(err, result){
          if (err) throw err;
          res.render('posts/edit', {page: data, raw: result, message: req.flash('message')});
        });
      },
      update: function(req, res, next){
        var id = req.params.id,
          data = posts.get(id);

        if (!data) return next();

        file.write(data.full_path, req.body.content, function(err, result){
          if (err) throw err;
          req.flash('message', 1);
          res.redirect('/admin/posts/' + id + '/edit');
        });
      },
      destroy: function(req, res, next){
        var id = req.params.id,
          data = posts.get(id);

        if (!data) return next();

        fs.unlink(data.full_path, function(err){
          if (err) throw err;
          req.flash('message', 2);
          res.redirect('/admin/posts');
        });
      }
    });

    app.use('/admin', express.static(hexo.core_dir + 'public'));

    app.use('/admin/js', function(req, res, next){
      var path = req.params[0].substring(9);
      render.render({path: assetDir + 'js/' + path}, {cache: false}, function(err, result){
        if (err) throw err;
        if (result){
          res.end(result);
        } else {
          next();
        }
      });
    });

    app.use('/admin/css', function(req, res, next){
      var path = req.params[0].substring(10),
        source = assetDir + 'css/' + path;
      render.render({path: source.substring(0, source.length - 3) + 'styl'}, function(err, result){
        if (err) throw err;
        if (result){
          res.end(result);
        } else {
          fs.exists(source, function(exist){
            if (!exist) return next();
            var rs = fs.createReadStream(source);
            res.pipe(rs);
          });
        }
      });
    });
  }

  app.get(config.root + '*', function(req, res, next){
    var uri = route.format(req.params[0]),
      target = route.get(uri);

    if (!target) return next();

    target(function(err, result){
      if (err) throw new Error('Route Error: ' + uri);

      res.type(path.extname(uri));

      if (result.readable){
        result.pipe(res).on('error', function(err){
          if (err) next();
        });
      } else {
        res.end(result);
      }
    });
  });

  console.log('Loading.');
  generate({watch: true}, startServer);
});