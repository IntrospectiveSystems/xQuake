//# sourceURL=Rogue
(function Rogue() {
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
		log.i('--Rogue/Step');
		if(fun)
			fun();
	}
	
	//-----------------------------------------------------Start
	async function Start(_com, fun) {
		log.i('--Rogue/Start');
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
		log.i('--Rogue/Engage');
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
			console.log('brick', bricks[i]);
			path = pckdir + '/' + brick + '.brick';
			await process(path);
		}
		setTimeout(function() {
			log.i('Dispatching hypo', JSON.stringify(hypo));
			Svc.Dispatch(hypo);
			for(let i=0; i<picks.length; i++) {
				let msg = picks[i];
				shipit(msg);
			}
			let rpt = {};
			rpt.Cmd = 'Report';
			Svc.Dispatch(rpt);
		}, 12000);

		function shipit(msg) {
			if(!('Type' in msg)) {
				return;
			}
			switch(msg.Type) {
				case 'Pick':
					msg.Cmd = 'Pick';
					console.log('=====' + JSON.stringify(msg));
					Svc.Dispatch(msg);
					break;
				default:
					return;
			}
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

	function EngageOld(_com, _err) {
		log.i('--Rogue/Engage');
		let fs = require('fs');
		let readline = require('readline');
		let td1 = new Date().getTime()/1000;
		var ngot = 0;
		var got = [];
		let brick;
		let pckdir;
		let picks = {};
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
		let hypo = rogues[rogue];
		let parts = hypo.split(',');
		if(parts.length !== 5) {
			console.log(' ** Rogue length not 5');
			return;
		}
		let org = Svc.Decode(parts[0]);
		console.log('Org', org);
		let t1 = org - Svc.GetParam('Before');
		console.log('T1', t1);
		let t2 = org + Svc.GetParam('After');
		console.log('T2', t2);

		pckdir = Svc.GetArg('Picks');
		let epoch = pckdir + '/' + parts[0].substr(0, 6) + '.epoch';
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
				let key = pid.substr(24);
				if(pid.substr(0, 24) !== brick) {
					nrd = 0;
					brick = pid.substr(0, 24);
					picks = {};
					path = pckdir + '/' + brick + '.brick';
					console.log(path, key);
					var rd = readline.createInterface({
						input: fs.createReadStream(path)
					});
					rd.on('line', function(line) {
						obj = JSON.parse(line);
						let newkey = obj.Pid.substr(24);
						picks[newkey] = line;
						if(nrd%10000 === 0) {
							console.log(nrd, key, line);
						}
						nrd++;
					});
					rd.on('close', function() {
						console.log(nrd, 'lines read');
					})
				}
				got.push(picks[key]);
			}
		}
		let td2 = new Date().getTime()/1000;
		let lapse = td2 - td1;
		console.log('got', ngot, 'in', lapse.toFixed(2), 'seconds');
		for(let j=0; j<ngot; j++) {
			console.log(j, JSON.stringify(got[j]));
		}
	}

})();
