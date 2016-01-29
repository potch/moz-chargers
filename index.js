var cheerio = require('cheerio');
var express = require('express');
var http = require('http');
var request = require('request');

var status = {};

var app = express();
app.set('port', (process.env.PORT || 8000));
app.use(express.static(__dirname + '/static'));
var server = http.createServer(app);

app.get('/', function(req, res) {
  res.redirect('/index.html');
});

app.get('/status', function (req, res) {
  res.json(status);
});

setInterval(updateStatus, 1000 * 60 * 5);

function updateStatus(d, cb) {
  fetch(0, function (err, req, body) {
    if (err) {
      console.error(err);
    } else {
      var s = parseStatus(body);
      status.station1 = s;
    }
  });
  fetch(1, function (err, req, body) {
    if (err) {
      console.error(err);
    } else {
      var s = parseStatus(body);
      status.station2 = s;
    }
  });
  fetch(2, function (err, req, body) {
    if (err) {
      console.error(err);
    } else {
      var s = parseStatus(body);
      status.station3 = s;
    }
  });
}

var chargerIDs = [
  97797,
  97645,
  113379
];

function fetch(n, cb) {
  request({
    method: 'post',
    url: 'https://na.chargepoint.com/maps/getMarkerDetails',
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    },
    formData: {
      deviceId: chargerIDs[n],
      level1: 1,
      level2: 1,
      levelDC: 1
    }
  }, cb);
}

function parseStatus(body) {
  var obj = {};
  var $ = cheerio.load(body);
  rows = $('div').html().split('<br>');
  rows = rows.map(function (r) {
    return cheerio.load(r);
  });
  rows = rows.filter(function ($) {
    return $('strong').text().indexOf('Port') > -1;
  });
  rows.forEach(function ($) {
    var parts = $('strong');
    var slug = parts.eq(0).text().replace(/[^\w]/g, '').toLowerCase();
    var val = $('strong i').text().toLowerCase();
    obj[slug] = val;
  });
  return obj;
}

updateStatus();

server.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
