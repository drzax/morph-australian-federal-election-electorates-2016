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
					electorateCode TEXT,
					electorateState TEXT,
					electorateName TEXT,
					margin REAL
				)`, (err) => err ? reject(err) : resolve(conn));
	});
});

url('http://www.abc.net.au/news/federal-election-2016/guide/electorates/')
	.then((html) => {
		var $;
		$ = cheerio.load(html);
		$('#electoratestable tbody tr').each(function() {
			var $tr, data, electorateCodeMatch;
			$tr = $(this);
			data = {};

			electorateCodeMatch = $tr.find('.electorate a').attr('href').match(/([a-z]+)\/$/);

			data.$partyCode = $tr.find('.party span').text().trim().split(' ')[0].toLowerCase();
			// data.$partyName = $tr.find('.party span').attr('title').trim();
			data.$electorateName = $tr.find('.electorate a').text().replace('(*)','').trim();
			data.$electorateCode = (electorateCodeMatch) ? electorateCodeMatch[1] : null;
			data.$electorateState = $tr.find('.electorate').text().replace('(*)','').match(/\((.+)\)/)[1];
			data.$margin = $tr.find('.margin').text().trim();

			db.then(function(db) {
				db.run("INSERT INTO data (partyCode, electorateCode, electorateState, electorateName, margin) VALUES ($partyCode, $electorateCode, $electorateState, $electorateName, $margin)", data, (global.gc) ? global.gc : null);
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
