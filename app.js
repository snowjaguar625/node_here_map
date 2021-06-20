var createError = require('http-errors');
var session = require('express-session');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var connect = require('connect');
// var cors = require('cors');
var sassMiddleware = require('node-sass-middleware')
var pug = require('pug');
require('dotenv').config();

var srcPath = __dirname + '/scss/base';
var destPath = __dirname + '/public/stylesheets';

var indexRouter = require('./routes/index');
var loginVerifyMiddleware = require('./routes/loginVerifyMiddleware');
var loginRouter = require('./routes/login');
var usersRouter = require('./routes/users');
var example3Route = require('./routes/example3');
var example31Route = require('./routes/example31');
var example31JpRoute = require('./routes/example31_jp');

var app = express();

// view engine setup
app.set('views', [path.join(__dirname, 'views'), path.join(__dirname, 'views/examples'), path.join(__dirname, 'views/examples/v31') ]);
app.set('view engine', 'pug');


app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  // res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(session({secret: 'rrrccccmmmmm',saveUninitialized: true,resave: true}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sassMiddleware({
  src: srcPath,
  dest: destPath,
  debug: true,
  outputStyle: 'expanded',
})
);
// app.use('/styles', express.static(path.join(__dirname, '/public/stylesheets/base')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));
app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist/'));


// app.use(loginVerifyMiddleware);
app.use('/', indexRouter);
app.use('/login', loginRouter);
app.use('/users', usersRouter);
app.use('/examples/v3', example3Route);
app.use('/examples/v3.1', example31Route);
app.use('/examples/v3.1_jp', example31JpRoute);


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
