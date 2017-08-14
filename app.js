const builder = require('botbuilder');
const express = require('express');
const bodyParser = require('body-parser');
var azure = require('azure-storage');
const server = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs');


const blobSvc = azure.createBlobService();
const connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.listen(process.env.port || process.env.PORT || 3978, '::', () => {
    app.address = 'localhost';
    app.port = '3978';
    console.log("Server listening at", 'http://' + app.address + ":" + app.port);
});
app.post('/api/messages', connector.listen());
app.post('/api/blob', uploadFile);

function uploadFile(request, response) {
    // parse a file upload
    var mime = require('mime');
    var formidable = require('formidable');
    var util = require('util');

    var form = new formidable.IncomingForm();

    var dir = !!process.platform.match(/^win/) ? '\\uploads\\' : '/uploads/';

    form.uploadDir = __dirname + dir;
    form.keepExtensions = true;
    form.maxFieldsSize = 10 * 1024 * 1024;
    form.maxFields = 1000;
    form.multiples = false;

    form.parse(request, function (err, fields, files) {
        var file = util.inspect(files);

        response.writeHead(200, getHeaders('Content-Type', 'application/json'));

        var fileName = file.split('path:')[1].split('\',')[0].split(dir)[1].toString().replace(/\\/g, '').replace(/\//g, '');
        var fileURL = 'https://lilian.blob.core.windows.net/video-msg/' + fileName;
        var path = './uploads/' + fileName;

        blobSvc.createBlockBlobFromLocalFile('video-msg', fileName, path, function (error, result, response) {
            if (!error) {
                console.log("Upload to blob successfull");
                if (savedAddress) {
                    var card = new builder.VideoCard()
                        .title('You have a message!')
                        .media([
                            { url: fileURL }
                        ]);

                    var reply = new builder.Message()
                        .address(savedAddress)
                        .addAttachment(card);

                    bot.send(reply);
                }

            } else {
                res.status(500).send({ error: error });
            }
        });

        console.log('fileURL: ', fileURL);
        response.write(JSON.stringify({
            fileURL: fileURL
        }));
        response.end();
    });
}

function getHeaders(opt, val) {
    try {
        var headers = {};
        //headers["Access-Control-Allow-Origin"] = "https://secure.seedocnow.com";
        headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
        headers["Access-Control-Allow-Credentials"] = true;
        headers["Access-Control-Max-Age"] = '86400'; // 24 hours
        headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";

        if (opt) {
            headers[opt] = val;
        }

        return headers;
    } catch (e) {
        return {};
    }
}

var savedAddress = null;

var bot = new builder.UniversalBot(connector, [
    function (session, results) {
        savedAddress = session.message.address;
        session.send("Hi");
    }
]);