var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var connect = require('connect');
var sassMiddleware = require('node-sass-middleware')

var srcPath = __dirname + '/sass/base';
var destPath = __dirname + '/public/stylesheets';

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var example31Route = require('./routes/example31');
var examplesV31SimpleMap = require('./routes/examples/v31/simple_map');
var examplesV31SimpleRoute = require('./routes/examples/v31/simple_routing');
var examplesV31SimpleGeoCoding = require('./routes/examples/v31/simple_geocoding');

var app = express();

// view engine setup
app.set('views', [path.join(__dirname, 'views'), path.join(__dirname, 'views/examples'), path.join(__dirname, 'views/examples/v31') ]);
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));
app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist/'));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/examples/v3.1', example31Route);
app.use('/examples/v3.1/simple_routing', examplesV31SimpleRoute);
app.use('/examples/v3.1/simple_map', examplesV31SimpleMap);
app.use('/examples/v3.1/simple_geocoding', examplesV31SimpleGeoCoding);

app.use(sassMiddleware({
      src: srcPath,
      dest: destPath,
      debug: true,
      outputStyle: 'expanded',
  })
);
//app.use('/styles', express.static(path.join(__dirname, '/public/stylesheets/base')));


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
