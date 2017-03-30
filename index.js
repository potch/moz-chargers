var cheerio = require('cheerio');
var express = require('express');
var http = require('http');
var request = require('request');

var status = {};
var statusCount;

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
  console.log('fetching updates...');
  statusCount = 0;
  
  fetch(0, function (err, req, body) {
    if (err) {
      console.error(err);
    } else {
      var s = parseStatus(body);
      status.station1 = s;
    }
    statusCount++;
    if (statusCount === 3) { updateSlack(); }
  });
  fetch(1, function (err, req, body) {
    if (err) {
      console.error(err);
    } else {
      var s = parseStatus(body);
      status.station2 = s;
    }
    statusCount++;
    if (statusCount === 3) { updateSlack(); }
  });
  fetch(2, function (err, req, body) {
    if (err) {
      console.error(err);
    } else {
      var s = parseStatus(body);
      status.station3 = s;
    }
    statusCount++;
    if (statusCount === 3) { updateSlack(); }
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

function createMessage() {
  var message = {};
  message.fallback = "Status of Mountain View EV Chargers (left to right)";
  message.text = "Status of Mountain View EV Chargers (from left to right looking from the building entrance)";
  message.fields = [];
  Object.keys(status).forEach(function(station) {
    Object.keys(status[station]).forEach(function(charger, i) {
      var title = station + ' charger' + (i+1);
      if (station === 'station3' && (i === 1)) {
        title += ' (disablity placard)';
      }
      message.fields.push({title: title, value: status[station][charger], short: true});
    })
  });
  // since the statues for each station come back in any order
  message.fields.sort(function(a, b) {return a.title > b.title});
  // add the statuses to the fallback
  message.fields.forEach(function(field) {
    message.fallback += ' ' + field.value;
  });
  console.log(JSON.stringify(message))
  return message;
}

/**
  Post to slack endpoint the status of the chargers
 */
function updateSlack() {
  request({
    method: 'post',
    url: process.env.ENDPOINT,
    headers: {
      'Content-Type': "application/json"
    },
    body: JSON.stringify(createMessage())
  }, function() { console.log('posted to slack');});
}

function parseStatus(body) {
  var obj = {};
  var $ = cheerio.load(body);
  var rows;
  
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
