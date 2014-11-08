

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
      name: 'pushsmart-final',
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
	var pushsmartdeviceid = "";
	var pushsmartinitflag = false;

	var interval=false;

		console.log("Socket connected " + ruppells_sockets_port + "\r\n");
		socket.write("Connected to PushSmart TCP Server \r\n");
		inFluxDBGetData = true;

		//socket.setEncoding('utf8'). 
		get_pushsmart_data(socket, pushsmartuid );

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
				console.log('on_data:got somthing ' + data.length + '\r\n');
				
				if(pushsmartinitflag == false)
				{
					// check data length
					   if(data.length == 40)
					   {		//probably a iOS UID from iNax
							pushsmartuid = data;
							console.log('pushsmartinit:' + pushsmartuid + '\r\n');
							// need to put in UID check here to be sure all characters are Hex types.
							
							var client = influx({host : info.server.host, port: info.server.port, username: info.server.username, password : info.server.password, database : info.db.name});
							
							querystr = 'select deviceid from "deviceuid:' + pushsmartuid + '.tcpserver:PushSmart.HelmSmart"  limit 1';
							console.log('pushsmartinit:' + querystr + '\r\n');
							
							client.query(querystr , function(err, influxresults)
							{
								if (err) {
								console.log("Cannot write data", err);
								}	  
		 
								console.log("pushsmartinit:Got data from ->" + pushsmartuid + ": " + influxresults[0].points.length + '\r\n');
		
			
								// get data base PushSmart record and write it out to connected client
								point = influxresults[0].points[0];
								//console.log('deviceid:' + point[2] + '\r\n');
								pushsmartdeviceid = point[2]
								console.log('deviceid:' + pushsmartdeviceid + '\r\n');
								pushsmartinitflag = true;
							});
							
							
						}

						
				}
				console.log("socket got data \r\n" + pushsmartdata_buffer + " length = " + data.length);
				//socket.write("socket got data \r\n");
			});


			/********* start  inFluxDB interval write ****************** */
		
			   interval = setInterval(function() {

			   
			     // if SeaSmart is pushing data to TCP Server then this
				 // will write it out back (echo) to connected client
			     //socket.write(pushsmartdata_buffer);

				 get_pushsmart_data(socket, pushsmartdeviceid );

			   /*
			    //socket.write('hello joe' +  Date.now() + "\r\n");
				var client = influx({host : info.server.host, port: info.server.port, username: info.server.username, password : info.server.password, database : info.db.name});

			    client.query('select psvalue from "deviceid:001EC0B415C2.sensor:tcp.source:0.instance:0.type:pushsmart.parameter:raw.HelmSmart" where time > now() - 2m limit 300', function(err, influxresults){
				if (err) {
					console.log("Cannot write data", err);
					
				}	  
		 
				console.log("Got data: from ->" + pushsmartuid + ": " + influxresults[0].points.length);
		
				for(i=0; i<influxresults[0].points.length; i++)
				{
				    // get data base PushSmart record and write it out to connected client
					point = influxresults[0].points[i];
					socket.write(point[2] + '\r\n');
				}
			
				})
				*/
				

		    }, 30000);
			
			
	      /********* end of inFluxDB interval write ****************** */

	});

	tcpserver.on('close', function() {

		console.log("tcpserver connection closed");
	});

	tcpserver.on('error', function() {

		console.log("tcpserver connection error");
	});


	tcpserver.maxConnections = 20;

	tcpserver.listen(ruppells_sockets_port);
    console.log("TCP listening on " + ruppells_sockets_port);

}

function get_pushsmart_data(mysocket, pushsmartdeviceid )
{
	// if SeaSmart is pushing data to TCP Server then this
	// will write it out back (echo) to connected client
	//socket.write(pushsmartdata_buffer);
	if(pushsmartdeviceid == "")
		return;
			   
	var client = influx({host : info.server.host, port: info.server.port, username: info.server.username, password : info.server.password, database : info.db.name});
	
	querystr = 'select psvalue from "deviceid:' + pushsmartdeviceid + '.sensor:tcp.source:0.instance:0.type:pushsmart.parameter:raw.HelmSmart" where time > now() - 2m limit 500'

	client.query(querystr, function(err, influxresults){
		if (err) {
			console.log("Cannot write data", err);
					
		}	  
		 
	console.log("get_pushsmart_data: Got data from ->" + pushsmartdeviceid + ": " + influxresults[0].points.length);
		
		for(i=0; i<influxresults[0].points.length; i++)
		{
			// get data base PushSmart record and write it out to connected client
			point = influxresults[0].points[i];
			mysocket.write(point[2] + '\r\n');
		}
			
	})
}