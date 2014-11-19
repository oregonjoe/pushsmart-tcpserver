

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
	var pushsmartinterval = 0;
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
					try{
						tcp_json = JSON.parse(data)
						myAppType = tcp_json.app;
						} 
					catch (e) 
					{
							console.log("Not a JSON object", e);
					}
					if(myAppType == "NMEAremoteBETA")
					{
							try{
								tcp_json = JSON.parse(data)
								myDeviceID = tcp_json.deviceiOSUID;
								console.log('pushsmartinit: JSON app = ' + myAppType + ' deviceiOSUID = ' + myDeviceID + ' \r\n');
								pushsmartdeviceid = myDeviceID;
								pushsmartinterval = 2;
							
								if(pushsmartuid.length == 40)
							   {		//probably a iOS UID from iNax
									//pushsmartuid = data;
									console.log('pushsmartinit:' + pushsmartuid + '\r\n');
									// need to put in UID check here to be sure all characters are Hex types.
									//var isHex = pushsmartuid.match("[0-9A-F]+");
									PSUIDstr = toString(pushsmartuid);
									//if(PSUIDstr.match(/^[0-9A-F]{40}&/i) == null)
									if(PSUIDstr.match(/[0-9A-F]+/i) == null)
									{
										console.log('pushsmartinit: error .... DUID invalid Hex String \r\n');
										return
									}
									
									console.log('pushsmartinit: valid Hex string\r\n');
									
									var client = influx({host : info.server.host, port: info.server.port, username: info.server.username, password : info.server.password, database : info.db.name});
									
									querystr = 'select deviceid, interval from "deviceuid:' + pushsmartuid + '.tcpserver:PushSmart.HelmSmart"  limit 1';
									console.log('pushsmartinit:' + querystr + '\r\n');
									
									client.query(querystr , function(err, influxresults)
									{
										if (err) {
										console.log("Cannot write data", err);
										}	  
				 
										console.log("pushsmartinit:Got data from ->" + pushsmartuid + ": " + influxresults[0].points.length + '\r\n');
				
										try{
										// get data base PushSmart record and write it out to connected client
										point = influxresults[0].points[0];
										//console.log('deviceid:' + point[2] + '\r\n');
										pushsmartdeviceid = point[2];
										pushsmartinterval = point[3];
										console.log('deviceid:' + pushsmartdeviceid + ' interval:' + pushsmartinterval + '\r\n');
										pushsmartinitflag = true;
										
										get_pushsmart_data(socket, pushsmartdeviceid, pushsmartinterval );
										} 
										catch (e) 
										{
												console.log("pushsmartinit:Error in inFluxDB select deviceid", e);
										}
										
									});
									
									
								}
							} 
							catch (e) 
							{
									console.log("Not a JSON object", e);
							}
					}
					else{
					try{
								tcp_json = JSON.parse(data)
								
								myAppType = tcp_json.app;
								myDeviceID = tcp_json.deviceid;
								console.log('pushsmartinit: JSON app = ' + myAppType + ' DeviceID = ' + myDeviceID + ' \r\n');
								pushsmartdeviceid = myDeviceID;
								pushsmartinterval = 2;
							
								pushsmartinitflag = true;
								get_pushsmart_data(socket, pushsmartdeviceid, pushsmartinterval );
							} 
							catch (e) 
							{
									console.log("Not a JSON object", e);
							}
					}
				}
				if(pushsmartinitflag == false)
				{	
					   if(data.length == 40)
					   {		//probably a iOS UID from iNax
							pushsmartuid = data;
							console.log('pushsmartinit:' + pushsmartuid + '\r\n');
							// need to put in UID check here to be sure all characters are Hex types.
							//var isHex = pushsmartuid.match("[0-9A-F]+");
							PSUIDstr = toString(pushsmartuid);
							//if(PSUIDstr.match(/^[0-9A-F]{40}&/i) == null)
							if(PSUIDstr.match(/[0-9A-F]+/i) == null)
							{
								console.log('pushsmartinit: error .... DUID invalid Hex String \r\n');
								return
							}
							
							console.log('pushsmartinit: valid Hex string\r\n');
							
							var client = influx({host : info.server.host, port: info.server.port, username: info.server.username, password : info.server.password, database : info.db.name});
							
							querystr = 'select deviceid, interval from "deviceuid:' + pushsmartuid + '.tcpserver:PushSmart.HelmSmart"  limit 1';
							console.log('pushsmartinit:' + querystr + '\r\n');
							
							client.query(querystr , function(err, influxresults)
							{
								if (err) {
								console.log("Cannot write data", err);
								}	  
		 
								console.log("pushsmartinit:Got data from ->" + pushsmartuid + ": " + influxresults[0].points.length + '\r\n');
		
								try{
								// get data base PushSmart record and write it out to connected client
								point = influxresults[0].points[0];
								//console.log('deviceid:' + point[2] + '\r\n');
								pushsmartdeviceid = point[2];
								pushsmartinterval = point[3];
								console.log('deviceid:' + pushsmartdeviceid + ' interval:' + pushsmartinterval + '\r\n');
								pushsmartinitflag = true;
								
								get_pushsmart_data(socket, pushsmartdeviceid, pushsmartinterval );
								} 
								catch (e) 
								{
										console.log("pushsmartinit:Error in inFluxDB select deviceid", e);
								}
								
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

				 get_pushsmart_data(socket, pushsmartdeviceid, pushsmartinterval );

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

function get_pushsmart_data(mysocket, pushsmartdeviceid, pushsmartinterval )
{
	// if SeaSmart is pushing data to TCP Server then this
	// will write it out back (echo) to connected client
	//socket.write(pushsmartdata_buffer);
	if(pushsmartdeviceid == "")
		return;
	
var queryinterval = "1m";
	
	if(pushsmartinterval == 0)
		queryinterval = "1m";
	else if (pushsmartinterval == 1)
		queryinterval = "1m";
	else if (pushsmartinterval == 2)
		queryinterval = "2m";
	else if (pushsmartinterval == 3)
		queryinterval = "3m";
	else if (pushsmartinterval == 4)
		queryinterval = "4m";
	else if (pushsmartinterval == 5)
		queryinterval = "5m";
	else if (pushsmartinterval == 6)
		queryinterval = "10m";
	else if (pushsmartinterval == 7)
		queryinterval = "15m";
	else if (pushsmartinterval == 8)
		queryinterval = "30m";	
	else if (pushsmartinterval == 9)
		queryinterval = "60m";
	else 
		queryinterval = "1m";
		
		
	var client = influx({host : info.server.host, port: info.server.port, username: info.server.username, password : info.server.password, database : info.db.name});
	
	//querystr = 'select psvalue from "deviceid:' + pushsmartdeviceid + '.sensor:tcp.source:0.instance:0.type:pushsmart.parameter:raw.HelmSmart" where time > now() - 2m limit 500'
	querystr = 'select psvalue from "deviceid:' + pushsmartdeviceid + '.sensor:tcp.source:0.instance:0.type:pushsmart.parameter:raw.HelmSmart" where time > now() - '+ queryinterval + ' limit 1000'

	client.query(querystr, function(err, influxresults){
		if (err) {
			console.log("Cannot write data", err);
					
		}	  
		 
	console.log("get_pushsmart_data: Got data from ->" + pushsmartdeviceid + ": " + influxresults[0].points.length);
		
		try{
				for(i=0; i<influxresults[0].points.length; i++)
				{
					// get data base PushSmart record and write it out to connected client
					point = influxresults[0].points[i];
					mysocket.write(point[2] + '\r\n');
				}
			} 
			catch (e) 
			{
				console.log("get_pushsmart_data:Error in inFluxDB select psvalue", e);
			}
			
	})
}