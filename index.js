'use strict';

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');

var record = null; // important: install SOX on Mac (brew install sox)
const Speech = require('@google-cloud/speech');

const PORT = process.env.PORT || 3000;
const DEBUGMODE = false;

var soc = null;

// -- speech recognition API
const speech_projectId = 'speech-demo-1317';
const speech_credentials = 'speech-demo-e03376f2d954.json';
var speech = null;
var recognizeStream = null;
const sampleRateHertz = 16000;
const speech_request = {
  config: {
    encoding: 'LINEAR16',
    sampleRateHertz: sampleRateHertz,
    languageCode: 'en-US'
  },
  interimResults: false,
  singleUtterance: false
};

// -- labels
var labels = [];
var labels_file = "data/categories.txt";

// -- define the static paths
app.use('/css', express.static(__dirname + '/www/css'));
app.use('/fonts', express.static(__dirname + '/www/fonts'));
app.use('/js', express.static(__dirname + '/www/js'));
app.use('/data', express.static(__dirname + '/www/data'));

// -- serve the index.html file
app.get('/', function(req,res)
{
	res.sendFile(__dirname + '/www/index.html');
});

// -- catch any other request
app.get('*', function(req,res)
{
	res.redirect('/');
});

// -- start http server
// -------------------------------------------------------------------
http.listen(PORT, function()
{
  console.log('listening on PORT ' + PORT);
  //if(DEBUGMODE == false) initSpeechToText();
});

// -- get dataset labels
// -------------------------------------------------------------------
function listLabels()
{
   fs.readFile(labels_file, 'utf8', (err, data) => {
      if (err) throw err;
      //console.log(data);
      labels = data.split('\n');
      let test_id = Math.round(Math.random() * (labels.length - 1));
      console.log("Labels loaded. Test (" + test_id + "): " + labels[test_id]);
   });
}
listLabels(); // load, read and parse labels

// -- init Speech To Text
// -------------------------------------------------------------------
function initSpeechToText()
{
  // -- init Google speech API connector with the credentials
  speech = Speech({
      projectId: speech_projectId,
      keyFilename: speech_credentials
  });

  // -- function that sends the mic stream to the speech to text API
  recognizeStream = speech.streamingRecognize(speech_request)
      .on('error', console.error)
      .on('data', (data) => processSTT(data)); // -- if we have data, let's process it

  // -- then start the mic stream
  startMicStream ();
}

// -- start streaming from mic
// -------------------------------------------------------------------
function startMicStream ()
{
  console.log("MIC :: START");

  soc.emit("processing_on");

  record = null;
  record = require('node-record-lpcm16');

  // -- start recording and send the mic input to the Speech API
  // -- options: https://www.npmjs.com/package/node-record-lpcm16#options
  record
      .start({
         sampleRateHertz: sampleRateHertz,
         threshold: 0,
         verbose: false,
         recordProgram: 'rec', // "rec" || "arecord" || "sox"
         silence: '3.0'
      })
      .on('error', console.error)
      .pipe(recognizeStream);

  //console.log('Listening, press Ctrl+C to stop.');
}

// -- stop streaming from mic
// -------------------------------------------------------------------
function stopMicStream()
{
  console.log("MIC :: STOP");
  if(record !== null) record.stop();
  //record = null;
}

// -- listen to IO connection
// -------------------------------------------------------------------
io.on('connection', function(socket)
{
   console.log('New socket client connected: ' + socket.id);

   soc = socket;

   socket.on('start_talking', () => {
      console.log("start_talking");
      //startMicStream();
      initSpeechToText();
   });

   socket.on('stop_talking', () => {
      console.log("stop_talking");
      stopMicStream();
   });

   socket.on('disconnect', () => {
      console.log('Socket client disconnected: ' + this.id);
      stopMicStream();
   });
});

// -- process String To Text
// -------------------------------------------------------------------
function processSTT(data)
{
   if(data.results[0] && data.results[0].alternatives[0])
   {
      var msg = " " + data.results[0].alternatives[0].transcript + " ";
      console.log("USER SAID --> " + msg);

      // -- first, stop the mic stream
      stopMicStream();

      var msg_html = "";

      // -- look for labels
      var found = false;
      var label_match = "";
      var label_pos = 0;
      labels.forEach(label => {
         var pos = msg.search(label);
         if( pos !== -1 )
         {
            console.log(label + " -> " + pos);
            found = true;
            label_match = label;
            label_pos = pos;
         }
      });
      if(found == false)
      {
         console.log("not found");
         if(soc !== null) soc.emit("processing_off");
         msg_html = msg;
      }
      else
      {
         msg_html = msg.substring(0, (label_pos - 1)) 
            + " <span class='bg-success text-white'>&nbsp;" 
            + msg.substring(label_pos, (label_pos + label_match.length)) 
            + "&nbsp;</span> " 
            + msg.substring((label_pos + label_match.length + 1), (msg.length - 1));
      }

      if(soc !== null)
      {
         soc.emit("msg", msg_html);
         
         if(found == true)
         {
            soc.emit("keyword", label_match);
         }
      }
   }
   else
   {
      console.log("*** time limit reached ***");
   }
}