// This is a template for a Node.js scraper on morph.io (https://morph.io)
var fs = require('fs');
var path = require('path');
var cheerio = require("cheerio");
var request = require("request");
var sqlite3 = require("sqlite3").verbose();

var db;

// Delete existing data
try {
	fs.unlinkSync(path.join(__dirname, 'data.sqlite'));
} catch(e) {}

// Setup the DB
db = new Promise((resolve, reject) => {
	var conn = new sqlite3.Database("data.sqlite");
	conn.serialize(() => {
		conn.run(`CREATE TABLE IF NOT EXISTS data
				(
					partyCode TEXT,
					partyName TEXT,
					name TEXT,
					familyName TEXT,
					givenName TEXT,
					sitting INT,
					electorateCode TEXT,
					electorateState TEXT,
					electorateName TEXT,
					electorateChamber TEXT
				)`, (err) => err ? reject(err) : resolve(conn));
	});
});

url('http://www.abc.net.au/news/federal-election-2016/guide/candidates/')
	.then((html) => {
		var $;
		$ = cheerio.load(html);
		$('#candidatestable tbody tr').each(function() {
			var $tr, data, electorateCodeMatch;
			$tr = $(this);
			data = {};

			electorateCodeMatch = $tr.find('.electorate a').attr('href').match(/([a-z]+)\/$/);

			data.$partyCode = $tr.find('.party span').text().trim();
			data.$partyName = $tr.find('.party span').attr('title').trim();
			data.$name = $tr.find('.candidate').text().replace(/\(.*$/,'').trim();
			data.$familyName = $tr.find('.candidate .familyname').text().trim();
			data.$givenName = data.$name.replace(data.$familyName,'').trim();
			data.$sitting = $tr.find('.candidate').text().indexOf('(Sitting MP)') > -1;
			data.$electorateCode = (electorateCodeMatch) ? electorateCodeMatch[1] : null;
			data.$electorateState = $tr.find('.electorate').text().replace('(*)','').match(/\((.+)\)/)[1];
			data.$electorateName = $tr.find('.electorate a').text().replace('Senate - ','').replace('(*)','').trim();
			data.$electorateChamber = ($tr.find('.electorate a').text().indexOf('Senate') >= 0) ? 'senate' : 'house';

			db.then(function(db) {
				db.run("INSERT INTO data (partyCode, partyName, name, familyName, givenName, sitting, electorateCode, electorateState, electorateName, electorateChamber) VALUES ($partyCode, $partyName, $name, $familyName, $givenName, $sitting, $electorateCode, $electorateState, $electorateName, $electorateChamber)", data, (global.gc) ? global.gc : null);
			}, handleErr);

		});
	})
	.catch(handleErr);

function url(url) {
	return new Promise((resolve, reject) => {
		request(url, function (err, res, body) {
			if (err) return reject(err);
			if (res.statusCode !== 200) return reject(new Error(`Error fetching URL ${url}`));
			resolve(body);
		});
	});
}

function handleErr(err) {
	setImmediate(()=>{
		throw err;
	});
}
