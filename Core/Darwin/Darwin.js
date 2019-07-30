//# sourceURL=Darwin
class Darwin {
//	let printf = require('printf');

	async Setup(_com, fun) {
		log.i('--Darwin/Setup');
		let Vlt = this.Vlt;
		Vlt.Assoc = 0;
		Vlt.Waif = 0;
		Vlt.nPicks = 0;
		if(fun) {
			fun();
		}
	}

	//-----------------------------------------------------Start
	async Start(_com, fun) {
		log.i('--Darwin/Start');
		let Par = this.Par;
		let that = this;
		this.Svc = await this.getServices();
		let Svc = this.Svc;
		Svc.Subscribe('Engage', this, this.Engage);
		Svc.Subscribe('Pick', this, this.Pick);
		Svc.Subscribe('Hypo', this, this.Hypo);
		Svc.Subscribe('Score', this, this.Score);
		Svc.Subscribe('Report', this, this.Report);
		Svc.Subscribe('Check', this, function(com) {
			console.log('Check received', com.Serial);
			Svc.Dispatch({Cmd: 'Ready'}, com.From);
		});
		if(fun) {
			fun();
		}
	}

	Engage(com) {
		let Vlt = this.Vlt;
		let Svc = this.Svc;
		Vlt.Agent = com.Agent;
		log.i('--Darwin/Engage');
		console.log('Darwin/Agent', JSON.stringify(com));
		let keys = Object.keys(this.Par);
		console.log('Darwin/Pars', JSON.stringify(keys));
		if('Traps' in Vlt.Agent) {
			Vlt.Traps = Vlt.Agent.Traps;
			for(let itrap=0; itrap<Vlt.Traps.length; itrap++) {
				let trap = Vlt.Traps[itrap];
				if('Use' in trap && trap.Use === false) {
					continue;
				}
				Svc.AddTrap(trap);
			}
		} else {
			console.log(' ** No event traps provided');
			process.exit(77);
		}
	}

	Hypo(hyp) {
		let Vlt = this.Vlt;
		let Svc = this.Svc;
		Svc.ECEF(hyp);
		let hypo = {};
		hypo.Pid = hyp.Pid;
		hypo.T = hyp.T;
		hypo.Lat = hyp.Lat;
		hypo.Lon = hyp.Lon;
		hypo.Depth = hyp.Depth;
		if('Place' in hyp) {
			hypo.Place = hyp.Place;
		}
		hypo.Picks = [];
		Svc.ECEF(hypo);
		Vlt.Hypo = hypo;
		Svc.AddHypo(hypo);
		this.Svc.Dispatch({Cmd:'Idle'}, hyp.From);
	}

	Pick(pck) {
	//	console.log('Darwin', JSON.stringify(pck));
		let Vlt = this.Vlt;
		let Svc = this.Svc;
		Vlt.nPicks++;
		Svc.ECEF(pck);
		let pick = {};
		pick.Type = 'Pick';
		pick.Pid = pck.Pid;
		pick.Site = pck.Site;
		pick.T = pck.T;
		pick.Lat = pck.Lat;
		pick.Lon = pck.Lon;
		pick.Elv = pck.Elv;
		Svc.ECEF(pick);
		let ipick = Svc.AddPick(pick);
		pick.iPick = ipick;
		let ihypo = Svc.Associate(pick, 1.5);
//		ihypo = -1;
		if(ihypo > -1) {
			let hypo = Svc.GetHypo(ihypo);
			pick.iHypo = ihypo;
			pick.Code = 'A';
			let picks = hypo.Picks;
			picks.push(ipick);
			if(picks.length < 5) {
				console.log('## Summary');
				Svc.Summary(hypo);
			} else {
				console.log('## Locate');
				Svc.Locate(hypo, 1, 1000);
			}
			Vlt.Assoc++;
		} else {
			let hypo = Svc.Nucleate(pick);
			if(hypo) {
				console.log('Nucleated', JSON.stringify(hypo));
				let ihypo = Svc.AddHypo(hypo);
				let picks = Svc.GetPicks(hypo.Picks);
				Vlt.Assoc += picks.length;
				Vlt.Waif -= picks.length - 1;
				for(let i=0; i<picks.length; i++) {
					let pck = picks[i];
					pck['iHypo'] = ihypo;
					pck['Code'] = 'N';
				}
			} else {
			//	console.log('Waif', pick.Site);
				Vlt.Waif++;
			}
		}
		this.Svc.Dispatch({Cmd:'Idle'}, pck.From);
	}

	Score() {
		console.log('--Darwin/Score');
		let Vlt = this.Vlt;
		let Svc = this.Svc;
		let fs = require('fs');
		let printf = require('printf');
		let list = Svc.GetHypoList(0, 1.0e12);
		if(list === undefined) {
			console.log('No events to score');
			return;
		}
		console.log('list.length is', list.length);
		let str = '';
		for(let i=0; i<list.length; i++) {
			let hypo = list[i];
			if(i === 0) {
				console.log(i, JSON.stringify(hypo));
			}
			let tim = Svc.Encode(hypo.T);
			let place = '';
			if('Place' in hypo) {
				place = hypo.Place;
			}
			let sig = 0.0;
			if('Sig' in hypo) {
				sig = hypo.Sig;
			}
			str += printf(' %+6s %s%10.4f%9.4f%6.1f (%.2f) %s\n',
				hypo.Pid, tim, hypo.Lat, hypo.Lon, hypo.Depth, sig, place);
			let picks = hypo.Picks;
			let lines = [];
			for(let iph=0; iph<picks.length; iph++) {
				let ipick = picks[iph];
				let pick = Svc.GetPick(ipick);
				if(!pick) {
					console.log('No pick for ipick =', ipick);
					continue;
				}
				let delta;
				let azimuth;
				try {
					delta = Svc.Delta(hypo, pick);
					azimuth = Svc.Azimuth(hypo, pick);
				}
				catch(err) {
					delta = Svc.Delta(hypo, pick);
					console.error(err);
					console.log(JSON.stringify(hypo));
					console.log(JSON.stringify(pick));
					continue;
				}
				let tcal = Svc.T('P', delta,  hypo.Depth);
				let tobs = pick.T - hypo.T;
				let res = tobs - tcal;
				let tim = Svc.Encode(pick.T);
				let code = ' ';
				if('Code' in pick) {
					code = pick.Code;
				}
				let line = {};
				line.dis = delta;
				line.str = printf('%s%+6s %s%16s %7.2f%7.1f%7.2f',
					code, pick.Pid, tim, pick.Site, delta, azimuth, res);
				lines.push(line);
			}
			lines.sort(function(a, b) {
				return a.dis - b.dis;
			});
			for(let i=0; i<lines.length; i++) {
				str += lines[i].str + '\n';
			}
			str += '\n';
		}
	//	console.log(str);
		str += 'Assoc:' + Vlt.Assoc + ' Waif:' + Vlt.Waif + ' Total:' + Vlt.nPicks + '\n';
		fs.writeFileSync('../../Score.log', str);
	}

	Report(rpt) {
		log.i('--Darwin/Report');
//		Svc.Nucleate();
/*		let list = Svc.GetHypoList(0, 1.0e12);
		console.log('list.length is', list.length);
		for(let i=0; i<list.length; i++) {
			let hypo = list[i];
			let sigma = 1.0;
			Svc.Locate(hypo, sigma);
		} */
	}

};
