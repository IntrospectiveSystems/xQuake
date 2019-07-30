// #sourcsURL='Snarf'
(function Snarf() {
	let Svc = {};

	//-----------------------------------------------------dispatch
	var dispatch = {
		Setup,
		Start,
		Engage
	};

	return {
		dispatch: dispatch
	};

	function Setup(com, fun) {
		console.log('--Snarf/Setup');
		if(fun)
			fun(null, com);
	}

	async function Start(com, fun) {
		str = '\n';
		log.i('--Snarf/Start');
		var Par = this.Par;
		var Vlt = this.Vlt;
		var async = this.require('async');
		var kafka = this.require('kafka-node');
		var that = this;
		var Par = this.Par;
		// Collect services
		if ('Services' in Par) {
			for (let is = 0; is < Par.Services.length; is++) {
				let pid = Par.Services[is];
				await service(pid);
			}
			async function service(pid) {
				return new Promise((resolve, reject) => {
					let q = {};
					q.Cmd = 'GetServices';
					that.sendLocal(q, pid, async function (err, r) {
						console.log('r', JSON.stringify(r));
						if ('Services' in r) {
							for(key in r.Services) {
								Svc[key] = r.Services[key];
							}
						}
						resolve();
					});
				});
			}
		}
		Svc.Subscribe('Engage', this, Engage);

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
					let timer = setInterval(function() {
						if('Agent' in Vlt) {
							clearInterval(timer);
							Run.call(that);
						}
					}, 200);
					if(fun)
						fun(err);
				}

				function offsets(topic, func) {
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
							console.log(topic, ifirst, ilast);
							func();
						});
					}
				}
			});
		});
	}

	async function Engage(com) {
		console.log('--Snarf/Engage');
		let Vlt = this.Vlt;
		Vlt.Agent = com.Agent;
	}

	function Run() {
		let Vlt = this.Vlt;
		let agent = Vlt.Agent;
		let topics = {};
		console.log('Agent', JSON.stringify(agent, null, 2));
		if('Topics' in agent) {
			for(let i=0; i<agent.Topics.length; i++) {
				let obj = agent.Topics[i];
				topics[obj.Topic] = obj;
			}
		} else {
			topics = Vlt.Topics;
		}

		// Cr3ate linke to Kafka servier on AWS
		console.log('Topics', JSON.stringify(Vlt.Topics, null, 2));
		let payloads = [];
		for(let topic in Vlt.Topics) {
			if(topic in topics) {
				let obj = Vlt.Topics[topic];
				var payload = {};
				payload.topic = topic;
				payload.partition = 0;
				payload.offset = obj.Last;
				payloads.push(payload);
			}
		}
		let options = {};
		options.autoCommit = false;
		options.encoding = 'utf8';
		options.fromOffset = true;
		let consumer = new Vlt.Kafka.Consumer(
			Vlt.Client, payloads, options);
		consumer.on('message', parse);

		function parse(message) {
			let msg = JSON.parse(message.value);
		//	console.log('MSG:' + JSON.stringify(msg, null, 2));
			if('Type' in msg && msg.Type === 'Heartbeat') {
				return;
			}
			if(!('Time' in msg)) {
				return;
			}
			let dt = new Date(msg.Time);
			let t = dt.getTime();
			let src;
			if('Source' in msg) {
				src = msg.Source.AgencyID;
			} else {
				src = 'NA';
				console.log('NA:' + JSON.stringify(msg));
			}
			let site = msg.Site.Station + '.' + msg.Site.Channel + '.' + msg.Site.Network + '.';
			if('Location' in msg.Site)
				site += msg.Site.Location;
			else
				site += '--';
		//	console.log(src + ':' + Svc.Encode(t) + ' ' + site, message.topic);
			if(src === 'NA')
				console.log(' ** Unknown Source:' + site + ', Topic:' + message.topic);
			let pick = {};
			pick.Cmd = 'Pick';
			pick.Src = src;
			pick.Site = site;
			pick.T = t;
			Svc.Dispatch(pick);
		}
	}

})();
