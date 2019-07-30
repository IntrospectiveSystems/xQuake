// #sourcsURL='Snarf'
(function Controller() {

	//-----------------------------------------------------dispatch
	var dispatch = {
		Setup: Setup,
		Start: Start,
		Connect: Connect,
		Engage: Engage
	};

	return {
		dispatch: dispatch
	};

	function Setup(com, fun) {
		str = '\n';
		log.i('--Kafka.Client/Setup');
		if(fun)
			fun(null, com);
	}

	function Start(com, fun) {
		log.i(' -- Kafka.Client/Start');
		if(fun)
			fun(null, com);
	}

	function Connect(com, fun) {
		log.i(' -- Kafka.Client/Connect');
		var Par = this.Par;
		var Vlt = this.Vlt;
		var that = this;
		var async = this.require('async');
		var kafka = this.require('kafka-node');
		var Par = this.Par;
		Vlt.Topic = 'Dev-RayPicker-1';
		Vlt.Format = 1;
		Vlt.Kafka = kafka;
		Vlt.Client = new kafka.Client("34.195.1.99:2181");
		Vlt.Topics = {};
		var Offset = new kafka.Offset(Vlt.Client);
		if('Topics' in Par) {
			check = true;
			console.log('Selected topics', Par.Topics);
		}
		var client = Vlt.Client;
		client.once('connect', function () {
			client.loadMetadataForTopics([], function (err, results) {
				if(err) {
					console.log(' ** ERR:' + err);
					if(fun)
						fun(err);
					return;
				}
				var topics = Object.keys(results[1].metadata);
				console.log('Topics', topics);
				async.eachSeries(topics, offsets, pau);

				function pau(err) {
					com.Topics = Vlt.Topics;
					if(fun)
						fun(err, com);
				}

				function offsets(topic, func) {
					switch(topic) {
						case 'Dev-RayPicker-1':
						case 'pickNC-edge':
						case 'pick-edge':
						case 'pickBK-edge':
							break;
						default:
							func();
							return;
					}
					var ifirst;
					var ilast;
					first();

					function first() {
						Offset.fetchEarliestOffsets([topic], function (err, offsets) {
							if (err) {
								console.log(' ** ERR:Earliest - ' + err);
								func(err);
								return;
							}
							ifirst = offsets[topic][0];
							last();
						});
					}

					function last() {
						Offset.fetchLatestOffsets([topic], function (err, offsets) {
							if (err) {
								console.log(' ** ERR:Latest - ' + err);
								func(err);
								return;
							}
							ilast = offsets[topic][0];
							var obj = {};
							obj.First = ifirst;
							obj.Last = ilast;
							Vlt.Topics[topic] = obj;
							//	console.log(topic, ifirst, ilast);
							func();
						});
					}
				}
			});
		});
	}

	async function Engage(com, fun) {
		log.i(' -- Kafka.Client/Engage');
		console.log('com', JSON.stringify(com, null, 2));
		var Par = this.Par;
		var Vlt = this.Vlt;
		Vlt.Func = com.Func;
		Vlt.Pid = com.Pid;
		Vlt.Paused = false;
		Vlt.Sendng = false;
		Vlt.Fifo = [];
		var that = this;
		var payloads = [];
//		var topic = Par.Topic;
		let topic = com.Topic;
		let offset = com.First;
		if(!(topic in Vlt.Topics)) {
			console.log(' ** ERR:Topic <' + topic + '> invalid');
			fun('Invalid topic');
			return;
		}
		var obj = Vlt.Topics[topic];
		if (obj.First >= obj.Last) {
			console.log(' ** ERR:Yes y')
		}
		var first = obj.First;
		var last = obj.Last;
		var lost = first - offset;
		var dt = new Date();
		var str = 'Harvest run ';
		str += encode(dt.getTime());
		str += ' Topic:' + topic;
		str += ' First:' + first;
		str += ' Offset:' + offset;
		str += ' Last:' + last;
		if(lost > 0)
			str += ' Lost:' + (first - offset);
		console.log(str);
		var payload = {};
		payload.topic = topic;
		payload.partition = 0;
		payload.offset = (first > offset) ? first : offset;
		var options = {};
		options.autoCommit = false;
		options.encoding = 'utf8';
		options.fromOffset = true;
		payloads.push(payload);
		console.log('payload', JSON.stringify(payload, null, 2));
		// Note: This assumes only one topic
		Vlt.Consumer = new Vlt.Kafka.Consumer(
			Vlt.Client, payloads, options);
		setInterval(async function() {
			if(!Vlt.Sending && Vlt.Fifo.length > 0) {
				Vlt.Sending = true;
				sending();
			}
		}, 100);
		if(fun)
			fun(null, com);

		async function sending() {
			while(Vlt.Fifo.length > 0) {
				var message = Vlt.Fifo.shift();
				await ship(message);
				if(Vlt.Paused && Vlt.Fifo.length < 100) {
					console.log(' ** Kafka resuming');
					Vlt.Consumer.resume();
					Vlt.Paused = false;
				}
			}
			Vlt.Sending = false;
		}

		async function ship(msg) {
			return new Promise((resolve, reject) => {
				let q = {};
				q.Cmd = 'Message';
				q.Off = msg.offset;
				q.Msg = msg.value;
				that.send(q, Vlt.Pid, function(err, r) {
					resolve();
				});
			});
		}

//		var hex = Par.iSerial.toString(16).toUpperCase();
		Vlt.Consumer.on('message', function (message) {
//			console.log(message.value);
//			var msg = JSON.parse(message.value);
//			Vlt.Func(message.offset, message.value);
//			var offset = message.offset;
//			var msg = JSON.parse(message.value);
			Vlt.Fifo.push(message);
			if(!Vlt.Paused && Vlt.Fifo.length > 200) {
				console.log(' ** Kafka paused');
				Vlt.Consumer.pause();
				Vlt.Paused = true;
			}
		});

		Vlt.Consumer.on('error', function (error) {
			log.e('Kafka error:' + error);
			process.exit(1);
		});

		Vlt.Consumer.on('offsetOutOfRange', function (error) {
			log.e('Kafka offsetOutOfRange:' + JSON.stringify(error, null, 2));
			process.exit(2);
		});
	}

	//-----------------------------------------------------encode
	// Opposite of encode()
	function encode(t) {
		var dt = new Date(t);
		var yr = dt.getUTCFullYear();
		var mo = dt.getUTCMonth() + 1;
		var da = dt.getUTCDate();
		var hr = dt.getUTCHours();
		var mn = dt.getUTCMinutes();
		var sc = dt.getUTCSeconds();
		var ms = dt.getUTCMilliseconds();
		var s = '';
		s += yr;
		if (mo < 10)
			s += '0';
		s += mo;
		if (da < 10)
			s += '0';
		s += da;
		if (hr < 10)
			s += '0';
		s += hr;
		if (mn < 10)
			s += '0';
		s += mn;
		if (sc < 10)
			s += '0';
		s += sc;
		s += '.';
		if (ms < 10)
			s += '00';
		else
		if (s < 100)
			s += '0';
		s += ms;
		if (s.length < 18)
			s += '0';
		return s;
	}

})();
