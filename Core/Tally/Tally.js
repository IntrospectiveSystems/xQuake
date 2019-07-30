//# sourceURL=Tally
(function Tally() {
	let Svc = {};

	//-----------------------------------------------------dispatch
	let dispatch = {
		Setup,
		Start
	};

	return {
		dispatch: dispatch
	};

	async function Setup(_com, fun) {
		log.i('--Tally/Step');
		if(fun)
			fun();
	}
	
	//-----------------------------------------------------Start
	async function Start(_com, fun) {
		log.i('--Tally/Start');
		let Par = this.Par;
		let that = this;
		if ('Services' in Par) {
			for (let is = 0; is < Par.Services.length; is++) {
				let pid = Par.Services[is];
				await service(pid);
			}
		}
		console.log(Svc, JSON.stringify(Object.keys(Svc)));
		Svc.Subscribe('Engage', this, Engage);
		if(fun)
			fun();

		async function service(pid) {
			return new Promise((resolve, _reject) => {
				let q = {};
				q.Cmd = 'GetServices';
				that.sendLocal(q, pid, async function (_err, r) {
					log.i('r', JSON.stringify(r));
					if ('Services' in r) {
						for(let key in r.Services) {
							Svc[key] = r.Services[key];
							console.log('Svc', key);
						}
					}
					resolve();
				});
			});
		}

	}

	async function Engage(_com, _err) {
		log.i('--Tally/Engage');
		let fs = require('fs');
		let rdlines = require('n-readlines');
		let printf = require('printf');
		let td1 = new Date().getTime()/1000;
		let pid;
		let pids = [];
		var ngot = 0;
		var got = [];
		let brick;
		let Sources = [];
		let Tally = new Map();
		let bricks = [];
		let pckdir = Svc.GetArg('Picks');
		let picks = [];
		let epochs = [];
		let tmp;
		tmp = Svc.GetParam('T1');
		let t1 = Svc.Decode(tmp);
		console.log('T1', tmp, Svc.Encode(t1));
		tmp = Svc.GetParam('T2');
		let t2 = Svc.Decode(tmp);
		console.log('T2', tmp, Svc.Encode(t2));
//		let epoch = Svc.GetParam('Epoch');
//		epochs.push(epoch);
		let files = fs.readdirSync(pckdir);
		let indx;
		for(let ifile=0; ifile<files.length; ifile++) {
			let file=files[ifile];
			let path = pckdir + '/' + file;
			if (!fs.lstatSync(path).isDirectory()) {
				let parts = path.split('.');
//				console.log('parts', parts);
				if(parts.length === 2 && parts[1] === 'epoch') {
					console.log('+++', path);
					let rec = fs.readFileSync(path);
					let arr = JSON.parse(rec);
					let narr = arr.length;
					console.log(narr, t1, arr[0].T, arr[narr-1].T, t2);
					if(arr[0].T > t2 || arr[narr-1].T < t1) {
						continue;
					}
					for(let i=0; i<narr; i++) {
						indx = arr[i];
						let t = indx.T;
						if(t < t1) {
							continue;
						}
						if(t > t2) {
							break;
						}
						brick = indx.Pid.substr(0, 24);
						if(bricks.indexOf(brick) < 0) {
							bricks.push(brick);
						}
					}
				}
			}
		}
		console.log('Length of bricks is', bricks.length);
		for(let i=0; i<bricks.length; i++) {
			brick = bricks[i];
			console.log('brick', brick);
			path = pckdir + '/' + brick + '.brick';
			process(path);
		}
		console.log('Sources', JSON.stringify(Sources));
		let str = '\n';
		let keys = [];
		Tally.forEach(function (_value, key, _map) {
			keys.push(key);
		});
		keys.sort(function(a, b) {
			return a < b ? -1 : 1;
		});
		for(ikey=0; ikey<keys.length; ikey++) {
			let key = keys[ikey];
			let value = Tally.get(key);
			str += key + ' ';
			for(let i=0; i<Sources.length; i++) {
				let nsrc;
				let src = Sources[i];
				if(src in value) {
					nsrc = value[src];
				} else {
					nsrc = 0;
				}
				str += printf('%8d:%s', nsrc, src);
			}					
			str += '\n';
		}
/*		Tally.forEach(function (value, key, _map) {
			console.log('Tally', key, value);
			str += key + ' ';
			for(let i=0; i<Sources.length; i++) {
				let nsrc;
				let src = Sources[i];
				if(src in value) {
					nsrc = value[src];
				} else {
					nsrc = 0;
				}
				str += printf('%8d:%s', nsrc, src);
			}					
			str += '\n';
		}); */
		console.log(str);

		function process(path) {
			let nrd = 0;
			const rd = new rdlines(path);
			while (line = rd.next()) {
				obj = JSON.parse(line);
				pid = obj.Pid;
				if('T' in obj && obj.Type === 'Pick') {
					let t = obj.T;
					let dat = Svc.Encode(t);
					if(nrd%100000 === 0)
						console.log(nrd, dat, line);
					if(t >= t1 && t <= t2) {
						let key = dat.substr(0, 8);
						if(!Tally.has(key)) {
							Tally.set(key, {});
						}
						let src = 'NA';
						if('Source' in obj) {
							src = obj.Source;
						}
						if(Sources.indexOf(src) < 0) {
							Sources.push(src);
						}
						let tally = Tally.get(key);
						if(!(src in tally)) {
							tally[src] = 0;
						}
						tally[src]++;
						Tally.set(key, tally);
					}
				}
				nrd++;
			}
		}

		async function processQQQ(path) {
			let nrd = 0;
			console.log('process', path);
			return new Promise((resolve, reject) => {
				var rd = readline.createInterface({
					input: fs.createReadStream(path)
				});
				rd.on('line', function(line) {
				//	if(nrd < 10)
				//		console.log(nrd, line);
					obj = JSON.parse(line);
					pid = obj.Pid;
					if('Time' in obj && obj.Type === 'Pick') {
					//	let dt = new Date(obj.Time);
					//	let t = 0.001*dt.getTime();
						let t = obj.Time;
						let dat = Svc.Encode(t);
						if(nrd%100000 === 0)
							console.log(nrd, dat, line);
						if(t >= t1 && t <= t2) {
							let key = dat.substr(0, 8);
							if(!Tally.has(key)) {
								Tally.set(key, {});
							}
							let src = 'NA';
							if('Source' in obj) {
								src = obj.Source;
							}
							if(Sources.indexOf(src) < 0) {
								Sources.push(src);
							}
							let tally = Tally.get(key);
							if(!(src in tally)) {
								tally[src] = 0;
							}
							tally[src]++;
							Tally.set(key, tally);
						}
					}
					nrd++;
				});
				rd.on('error', function() {
					console.log(' ** ERROR **');
					reject();
				})
				rd.on('close', function() {
					console.log(nrd, 'lines read');
					console.log('Length of Tally is', Tally.size);
					resolve();
				})
			});
		}

		async function processxxx(path) {
			console.log('..process', path);
			let npids = pids.length;
			if(npids > 10) {
				npids = 10;
			}
			for(let i=0; i<npids; i++)
				console.log(i, pids[i]);
			let nrd = 0;
			return new Promise((resolve, _reject) => {
				var rd = readline.createInterface({
					input: fs.createReadStream(path)
				});
				rd.on('line', function(line) {
					obj = JSON.parse(line);
					pid = obj.Pid;
					//	if(nrd < 10)
					//		console.log(nrd, pid, line);
					nrd++;
					if(nrd < 10) {
						console.log(nrd, site, JSON.stringify(obj));
					}	
					if(pids.indexOf(pid) >= 0) {
						//	console.log(nline, line);
						let dt = new Date(msg.Time);
						let t = dt.getTime();
						let src;
						if('Source' in msg) {
							src = msg.Source.AgencyID;
						} else {
							src = 'NA';
						}
						let site = msg.Site.Station + '.' + msg.Site.Channel + '.' + msg.Site.Network + '.';
						if('Location' in msg.Site)
							site += msg.Site.Location;
						else
							site += '--';
					}
				});
				rd.on('close', function() {
					console.log(nrd, 'lines read');
					console.log('Length of picks is', picks.length);
					resolve();
				})
			});
		}

	}

	async function Engagexxx(_com, _err) {
		log.i('--Tally/Engage');
		let fs = require('fs');
		let readline = require('readline');
		let td1 = new Date().getTime()/1000;
		let pid;
		let pids = [];
		var ngot = 0;
		var got = [];
		let brick;
		let bricks = [];
		let pckdir;
		let picks = [];
		let epochs = [];
		let rogues = Svc.GetParam('Rogues');
		if(!rogues) {
			console.log(' ** No rogues to play with');
			return;
		}
		let rogue = Svc.GetArg('Rogue');
		if(!rogue) {
			console.log(' ** Rogue not in list');
			return;
		}
		let hyp = rogues[rogue];
		let parts = hyp.split(',');
		if(parts.length !== 5) {
			console.log(' ** Rogue length not 5');
			return;
		}
		let org = Svc.Decode(parts[0]);
		let hypo = {};
		hypo.Cmd = 'Hypo';
		hypo.Pid = this.genPid();
		hypo.T = org;
		hypo.Lat = parseFloat(parts[1]);
		hypo.Lon = parseFloat(parts[2]);
		hypo.Depth = parseFloat(parts[3]);
		hypo.Mag = parseFloat(parts[4]);
		console.log('Parts', JSON.stringify(parts));
		console.log('Hypo', JSON.stringify(hypo));
		console.log('Org', org);
		let t1 = org - Svc.GetParam('Before');
		console.log('T1', t1);
		let t2 = org + Svc.GetParam('After');
		console.log('T2', t2);
		let epoch = parts[0].substr(0, 6) + '.epoch';
		if(!(epoch in epochs))
			epochs.push(epoch);
		console.log('epochs', JSON.stringify(epochs, null, 2));

		pckdir = Svc.GetArg('Picks');
		for(let i=0; i<epochs.length; i++) {
			let epoch = pckdir + '/' + epochs[i];
			pckdir = Svc.GetArg('Picks');
			console.log('Epoch', epoch);
			var nline = 0;
			let rec = fs.readFileSync(epoch);
			let arr = JSON.parse(rec);
			console.log('Epoch length = ', arr.length);
			for(let i=0; i<arr.length; i++) {
				let indx = arr[i];
				nline++;
				if(i < 10) {
					console.log(nline, indx.T, indx);
				}
				let t = indx.T;
				if(t > t1 && t < t2) {
					ngot++;
					pid = indx.Pid;
					pids.push(pid);
				}
			}
		}
		console.log('Length of pids is', pids.length);
		for(let i=0; i<pids.length; i++) {
			pid = pids[i];
			brick = pid.substr(0, 24);
			if(bricks.indexOf(brick) < 0) {
				bricks.push(brick);
			}
		}
		console.log('Length of bricks is', bricks.length);
		for(let i=0; i<bricks.length; i++) {
			brick = bricks[i];
			console.log('brick', brick);
			path = pckdir + '/' + brick + '.brick';
			await process(path);
		}
		setTimeout(function() {
			log.i('Dispatching hypo', JSON.stringify(hypo));
			Svc.Dispatch(hypo);
			for(let i=0; i<picks.length; i++) {
				let msg = picks[i];
				str = parse(msg);
			//	let str = msg;
			//	console.log(JSON.stringify(str, null, 2));
			}
			let rpt = {};
			rpt.Cmd = 'Report';
			Svc.Dispatch(rpt);
		}, 12000);

		function parse(msg) {
		//	let msg = JSON.parse(message.value);
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
			let pid = msg.Pid;
			let pick = {};
			pick.Cmd = 'Pick';
			pick.Src = src;
			pick.Site = site;
//			pick.T = t;
//			pick.T = Svc.Encode(t);
			str = t.toString();
			pick.T = parseFloat(str.substr(0, 10) + '.' + str.substr(10));
			pick.Pid = pid;
			Svc.Dispatch(pick);
		//	console.log('Pick', JSON.stringify(pick));
			return pick;
		}

		async function process(path) {
			for(let i=0; i<pids.length; i++)
				console.log(i, pids[i]);
			let nrd = 0;
			console.log('process', path);
			return new Promise((resolve, _reject) => {
				var rd = readline.createInterface({
					input: fs.createReadStream(path)
				});
				rd.on('line', function(line) {
					obj = JSON.parse(line);
					pid = obj.Pid;
				//	if(nrd < 10)
				//		console.log(nrd, pid, line);
					if(pids.indexOf(pid) >= 0) {
					//	console.log(nline, line);
						picks.push(obj);	
					}
					nrd++;
				});
				rd.on('close', function() {
					console.log(nrd, 'lines read');
					console.log('Length of picks is', picks.length);
					resolve();
				})
			});
		}
	}

})();
