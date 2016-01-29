/**
 * Module dependencies.
 */

var express        = require('express'),
    path           = require('path'),<% if (viewEngine === 'hbs') { %>
    hbs            = require('express-hbs'),<% } %>
    logger         = require('morgan'),
    helmet         = require('helmet'),
    bodyParser     = require('body-parser'),
    compress       = require('compression'),
    favicon        = require('static-favicon'),
    methodOverride = require('method-override'),
    errorHandler   = require('errorhandler'),
    config         = require('./config'),
    routes         = require('./routes'),
    https          = require('https'),
    fs             = require('fs'),
    expressEnforcesSSL = require('express-enforces-ssl'),
    contentLength = require('express-content-length-validator'),
    hpp = require('hpp'),
    sessions = require('client-sessions'),
    csrf = require('csurf');



var app = express();

<% if (viewEngine === 'hbs') { %>/**
 * A simple if condtional helper for handlebars
 *
 * Usage:
 *   {{#ifvalue env value='development'}}
 *     do something marvellous
 *   {{/ifvalue}}
 * For more information, check out this gist: https://gist.github.com/pheuter/3515945
 */
hbs.registerHelper('ifvalue', function (conditional, options) {
  if (options.hash.value === conditional) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});<% } %>

/**
 * Express configuration.
 */
app.set('port', config.server.port);<% if (viewEngine === 'hbs') { %>
app.engine('hbs', hbs.express3());<% } %>
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', '<%= viewEngine %>');
app.enable('trust proxy');

app
  .use(compress())
  .use(favicon())
  .use(expressEnforcesSSL())
  .use(contentLength.validateMax({
    max: 10485760, // 10MB
    status: 413,
    message: 'Payload Too Large'
  }))
  .use(helmet.xssFilter()) // only X-XSS-Protection header
  .use(helmet.frameguard('deny'))
  .use(helmet.dnsPrefetchControl())
  .use(helmet.hsts({
    maxAge: 7776000000,
    force: true
  })) // ninetyDaysInMilliseconds
  .use(helmet.csp({
    directives: {
      defaultSrc: ['\'self\'', config.server.address],
      scriptSrc: ['\'self\'', config.server.cdn],
      styleSrc: [config.server.cdn],
      imgSrc: [config.server.cdn, 'data:'],
      sandbox: ['allow-forms', 'allow-same-origin', 'allow-scripts'],
      reportUri: '/report-violation',
      objectSrc: [] // An empty array allows nothing through
    },
    reportOnly: false,
    setAllHeaders: false,
    disableAndroid: false
  }))
  .use(helmet.hidePoweredBy())
  .use(helmet.ieNoOpen())
  .use(helmet.noSniff())
  .use(sessions({
    cookieName: 'session',
    secret: 'blierga2314dsfg78_!deeblargblarg',
    duration: 24 * 60 * 60 * 1000, // how long the session will stay valid in ms
    activeDuration: 1000 * 60 * 5 // if expiresIn < activeDuration, the session will be extended by activeDuration milliseconds
  }))
  /*.use(helmet.publicKeyPins({
    maxAge: 7776000000,
    sha256s: ['AbCdEf123=', 'ZyXwVu456='],
  }))*/
  .use(logger('dev'))
  .use(bodyParser.urlencoded({
    extended: true
  }))
  .use(bodyParser.json({type: ['json','application/csp-report']}))
  .use(hpp()) // use after bodyParser
  .use(methodOverride())
  .use(express.static(path.join(__dirname, 'public')))
  .use(routes.indexRouter);

  app.post('/report-violation', function( req, res) {
    // save CSP violation for further analysis
    res.status(204).end();
  });

  var csrfProtection = csrf();
  app.post('/*', csrfProtection, function( req, res, next ) {
    next();
  });

  app.get('/form', csrfProtection, function(req, res) {
    // pass the csrfToken to the view
    res.render('form', { csrfToken: req.csrfToken() });
  });

  app.post('/process', csrfProtection, function(req, res) {
    res.send('data is being processed');
  });

  app.use(function (req, res) {
    res.status(404).render('404', {title: 'Not Found :('});
  });

if (app.get('env') === 'development') {
  app.use(errorHandler());
}

app.use(function (err, req, res, next) {
  if (err.code !== 'EBADCSRFTOKEN') {
    return next(err);
  }
  res.status(403);
  res.send('Bad token');
});

https.createServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
  passphrase: 'test'
}, app).listen(app.get('port'), function () {
  console.log('Express server listening on secure port ' + app.get('port'));
});

