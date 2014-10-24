

var http = false, tcp = false
if ( process.argv.length > 2 ) {
    process.argv.forEach(function (val, index, array) {
        switch(val)
        {
            case "http":
                http = true
                break;
            case "tcp":
                tcp = true
                break
        }
    });
} else {
    http = true;
    tcp = true;
}

if ( http ) {

var express = require('express')
var app = express();

	app.set('port', (process.env.PORT || 5000))
	app.use(express.static(__dirname + '/public'))

	app.get('/', function(request, response) {
		response.send('Hello Joe!')
	});

	app.listen(app.get('port'), function() {
		console.log("Node app is running at localhost:" + app.get('port'))
	});

}

// TCP socket stuff
if ( tcp ) {
  var client;


  var info = {
    server: {
      host: 'pinheads-wedontneedroads-1.c.influxdb.com',
      port: 8086,
      username: 'root',
      password: 'c73d5a8b1b07d17b'
    },
    db: {
      name: 'pushsmart',
      username: 'root',
      password: 'c73d5a8b1b07d17b'
    },
    series: {
      name: 'response_time'
    }
  };

var ruppells_sockets_port = process.env.RUPPELLS_SOCKETS_LOCAL_PORT || 1337;

var influx = require('influx');

	var inFluxDBGetData = false;

	var pushsmartdata_buffer;


	 var util = require('util');
	// var duplexEmitter = require('duplex-emitter');
    net = require('net');

	var tcpserver = net.createServer();

    tcpserver.on('connection', function(socket) {
	var pushsmartuid = "";
	var pushsmartinitflag = false;

	var interval=false;

		console.log("Socket connected " + ruppells_sockets_port + "\n");
		socket.write("Welcome Joe oct 23, 2014 18:20:00 \n");
		inFluxDBGetData = true;

		//socket.setEncoding('utf8'). 

		   tcpserver.getConnections(function(error, count){
			console.log('current tcp connections = ' + count);
		   });

			socket.on('end', function() {
				inFluxDBGetData = false;
				console.log("server disconnected ...");
			});

			socket.on('close', function() {
				inFluxDBGetData = false;

				if(interval != false)
				{
					clearInterval(interval);
					interval = false;
				}
				console.log("socket closed");
			});

   

			socket.on('error', function(error) {
				inFluxDBGetData = false;
				console.log("socket  error", error);
				if(interval != false)
				{
					clearInterval(interval);
					interval = false;
				}
				socket.end();
				socket.destroy();
			});

			socket.on('data', function(data) {
				pushsmartdata_buffer = data;

				if(pushsmartinitflag == false)
				{
					// check data length
					   if(data.length == 40)
					   {		//probably a iOS UID from iNax
								pushsmartuid = data;
						}

						pushsmartinitflag = true;
				}
				console.log("socket got data \n\r" + pushsmartdata_buffer + " length = " + data.length);
				//socket.write("socket got data \n\r");
			});


			/********* start  inFluxDB interval write ****************** */
			
			   interval = setInterval(function() {
			     // if SeaSmart is pushing data to TCP Server then this
				 // will write it out back (echo) to connected client
			     //socket.write(pushsmartdata_buffer);
			   
			    //socket.write('hello joe' +  Date.now() + "\n\r");
				var client = influx({host : info.server.host, port: info.server.port, username: info.server.username, password : info.server.password, database : info.db.name});

			    client.query('select psvalue from "deviceid:001EC0B415C2.sensor:tcp.source:0.instance:0.type:pushsmart.parameter:raw.HelmSmart" where time > now() - 2m limit 1000', function(err, influxresults){
				if (err) {
					console.log("Cannot write data", err);
					
				}	  
		 
				console.log("Got data: from ->" + pushsmartuid + ": " + influxresults[0].points.length);
		
				for(i=0; i<influxresults[0].points.length; i++)
				{
				    // get data base PushSmart record and write it out to connected client
					point = influxresults[0].points[i];
					socket.write(point[2] + '\n\r');
				}
			
				})

				

		    }, 5000);

			
	      /********* end of inFluxDB interval write ****************** */

	});

	tcpserver.on('close', function() {

		console.log("tcpserver connection closed");
	});

	tcpserver.on('error', function() {

		console.log("tcpserver connection error");
	});

/*
	tcpserver.on('connection', function(stream) {
	
		//var peer = duplexEmitter(stream);
		  var interval =
		  setInterval(function() {
			//peer.emit('hello', Date.now());
			//stream.write('hello joe' +  Date.now() + "\n");

		  // Get data from inFluxDB Server
		  if(inFluxDBGetData == true)
		  {
			  var client = influx({host : info.server.host, port: info.server.port, username: info.server.username, password : info.server.password, database : info.db.name});

			  client.query('select psvalue from "deviceid:001EC0B415C2.sensor:tcp.source:0.instance:0.type:pushsmart.parameter:raw.HelmSmart" where time > now() - 2m limit 1000', function(err, influxresults){
				if (err) {
					console.log("Cannot write data", err);
					//stream.write("Cannot get series data \n");
				}	  
		 
				console.log("Got data: ", influxresults[0].points.length);
		
				for(i=0; i<influxresults[0].points.length; i++)
				{
					point = influxresults[0].points[i];
				   //console.log(point[2] + '\n\r');
					//socket.write(point[2] + '\n\r');
					//peer.emit('', Date.now());
					//peer.emit(point[2] + '\n\r');
					stream.write(point[2] + '\n\r');
					//peer.emit(point[2]);
				}
			

				})
			}

		  }, 5000);
	});
*/
	tcpserver.maxConnections = 20;

	tcpserver.listen(ruppells_sockets_port);
    console.log("TCP listening on " + ruppells_sockets_port);

}