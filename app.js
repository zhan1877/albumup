const express = require('express'),
    mysql = require('mysql'),
    conf = require('./config'),
    fs = require('fs'),
    bparse = require('body-parser');
    http = express();

var parsed = JSON.parse(fs.readFileSync('./config.json'));
http.listen(7654);
http.set('views', __dirname + '/static');
http.set('view engine', 'ejs');
http.use(express.json({limit: '1mb'}));
http.use(express.urlencoded({extended:true, limit: '1mb'}));

http.get('/results/:path', async function(req, res) {
    try {
        var path = req.params.path;
        var response = await db_query("SELECT url, num FROM images WHERE url = ?", [path]);
        if (response.length == 0) return res.status(404).send("Album not found");
        res.render('results', {url: path, count:response.length});
    } catch (e) {
        console.log(e);
    }
});

http.post('/tsave/:path/:title', async function(req, res) {
    try {
        var path = req.params.path;
        var title = req.params.title;
        var response = await db_query("SELECT url FROM titles WHERE url = ?", [path]);
        if (response.length != 0) 
            return res.status(500).send("URL Unavailable");
        var result = await db_query("INSERT INTO titles (url, title) VALUES (?, ?)", [path, title]);
        return res.status(200).send("Title saved");
    }
    catch(e) {
        console.log(e);
    }
});

http.get('/tget/:path', async function(req, res) {
    var path = req.params.path;
    var result = await db_query("SELECT title FROM titles WHERE url = ?", [path]);
    if (result.length == 0)
        return res.status(404).send("Album not found");
    res.end(result[0].title);
});

http.post('/save/:path/:num', async function(req, res) {
    try {
        var path = req.params.path;
        var num = req.params.num;
        var data = req.body.data;
        var result = await db_query("INSERT INTO images (url, data, num) values (?, ?, ?)", [path, data, num]);
        return res.status(200).send("Successfully saved");
    }
    catch(e) {
        console.log(e);
    }
});

http.get('/get/:path/:num', async function(req, res) {
    var path = req.params.path;
    var num = req.params.num;
    var result = await db_query("SELECT data FROM images WHERE url = ? AND num = ?", [path, num]);
    if (result.length == 0) 
        return res.status(404).send("URL not found");
    res.end(result[0].data);
});

http.get('/check/:path', async function(req, res) {
    var path = req.params.path;
    var result = await db_query("SELECT url FROM images WHERE url = ?", [path]);
    if (result.length == 0)
        return res.status(200).send("URL Available");
    return res.status(500).send("URL Unavailable");
});


http.use(express.static(__dirname + '/static'));
http.use(function(req, res, next) {
    res.writeHead(302, {Location: 'https://' + req.headers.host + '/404.html'});
    res.end();
});
connect();
//Shut down

var shutdown_routine = function() {
//    require('./kdb').disconnect();
    console.log('Server shutdown');
    process.exit();
};
process.on('SIGINT', shutdown_routine);

function connect() {
    con = mysql.createConnection({
        host : conf.mysql.host,
        port : conf.mysql.port,
        user : conf.mysql.user,
        password : conf.mysql.password,
        database : conf.mysql.database,
    });
}

function db_query(qstr, qarg) {
    return new Promise(function(resolve, reject) {
        con.query(qstr, qarg, function (err, result, fields) {
            if (err) 
                return reject(err);
            else 
                return resolve(result);
        });
    });
}
