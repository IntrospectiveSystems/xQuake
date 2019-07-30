//# sourceURL=Validate

/**
 * This the basic prototype module that can be used as a starting
 * point for developing other modules
 * 
 * Parameters required
 * 
 * Services provided
 *	None
 *
 * Services required
 * 	Agent/Subscribe: Subscribe to messages dispatched from other agents
 * 
 */
class Validate {

	/** Setup
	 * Method necessary for the initial setup of the class. Standard in xGraph systems.
	 * @param {Object} com The communication coming from the orchestrator.
	 * @param {Function} fun The function that send the callback to the place the come came from.
	 */
	Setup(com, fun) {
		log.i('--Validate/Setup');
		let Vlt = this.Vlt;
		fun(null, com);
	}

	/** Start
	 * Method for starting the module instance of this class. Standard in most xGraph systems.
	 * @param {Object} com The communication coming from the orchestrator.
	 * @param {Function} fun The function that send the callback to the place the come came from.
	 */
	async Start(com, fun) {
		log.i('--Validate/Start');
		this.Svc = await this.getServices();
		let Vlt = this.Vlt;
		let Svc = this.Svc;
		Svc.Subscribe('Engage', this, this.Engage);
		Svc.Subscribe('Ready', this, this.Ready);
		fun(null, com);
	}

	/** Engage
	 * This method is called by the agent to add the unit to the distributed system. It is also
	 * a place where the unit gathers params that were in the deploy command, and the first
	 * moment that the instance of this class can use any of it's services.
	 * @param {Object} _com Currently unused input
	 */
	Engage(com) {
		log.i('--Validate/Engage');
		let Vlt = this.Vlt;
		let Svc = this.Svc;
		Vlt.Agent = com.Agent;
		Vlt.Data = Svc.GetArg('TestData');
		Vlt.Folder = Svc.GetParam('Test');
		Vlt.Dir = Vlt.Data + '/' + Vlt.Folder;
		Vlt.Sites = {};
		if('Range' in Vlt.Agent) {
			Vlt.Range = Vlt.Agent.Range;
		}
		console.log('Vlt.Dir is', Vlt.Dir);
//		let fs = this.require('fs');
		let rdlines = require('n-readlines');
		sites();
//		picks();
		let serial = 0;
		Vlt.CheckTimer = setInterval(function() {
			serial++;
			console.log('--Check', serial);
			Svc.Dispatch({Cmd: 'Check', Serial: serial});
		}, 1000);
		console.log('done');

		function sites() {
			let path = Vlt.Dir + '/' + Vlt.Folder + '_stationlist.txt';
			console.log('path', path);
			const rd = new rdlines(path);
			let n = 0;
			let t1 = 0.001*Date.now();
			let line;
			let obj;
			while (line = rd.next()) {
				obj = JSON.parse(line);
				Vlt.Sites[obj.Site] = obj;
				n++;
			}
			let t2 = 0.001*Date.now();
			console.log('Read', n, 'records in', t2-t1, 'seconds');
		}
		
		function picks() {
			let path = Vlt.Dir + '/' + Vlt.Folder + '.gpick';
			console.log('path', path);
			const rd = new rdlines(path);
			let n = 0;
			let t1 = 0.001*Date.now();
			let line;
			let buff;
			let obj;
			let scnl;
			let bad = {};
			while (buff = rd.next()) {
				let line = buff.toString();
				if(line.length < 16) {
					continue;
				}
				let parts = line.split(/\s+/);
				scnl = parts[3] + '.' + parts[4] + '.' + parts[5] + '.' + parts[6];
				if(!(scnl in Vlt.Sites)) {
					if(scnl in bad) {
						bad[scnl]++;
					} else {
						bad[scnl] = 1;
					}
				}
				n++;
			}
			let t2 = 0.001*Date.now();
			console.log('Read', n, 'records in', t2-t1, 'seconds');
			console.log('Bad', JSON.stringify(bad, null, 2));
		}
		
	}

	Ready(_com) {
		console.log('++Ready++');
		let Vlt = this.Vlt;
		let Svc = this.Svc;
		let rdlines = require('n-readlines');
		clearInterval(Vlt.CheckTimer);
		let path = Vlt.Dir + '/' + Vlt.Folder + '.gpick';
		let rdpick = new rdlines(path);
		path = Vlt.Dir + '/' + Vlt.Folder + '_Actual.csv';
		let rdhypo = new rdlines(path);
//		let n = 0;
		let pid = 0;
		let t1 = 0.001*Date.now();
		let t2 = t1;
		let Actual = true;
		let MaxPick = 0;
		if(Actual === false) {
			pid = 0;
			Svc.Subscribe('Idle', this, hypos);
			hypos({Cmd:'Idle'});
		} else {
			pid = 0;
			MaxPick = 10000;
			Svc.Subscribe('Idle', this, idle);
			idle({Cmd:'Idle'});
		}

		function hypos(_com) {
			let buff;
			let line;
			while (buff = rdhypo.next()) {
				pid++;
				line = buff.toString();
				if(line.length < 16) {
					continue;
				}
				let parts = line.split(';');
				if(parts[0] === 'time') {
					continue;
				}
				let dt = new Date(parts[0]);
				let t = 0.001*dt.getTime();
				let time = Svc.Encode(t);
				let hypo = {};
				hypo.Cmd = 'Hypo';
				hypo.Pid = pid.toString();
				hypo.T = t;
				hypo.Lat = parseFloat(parts[1]);
				hypo.Lon = parseFloat(parts[2]);
				hypo.Depth = parseFloat(parts[3]);
				hypo.Mag = parseFloat(parts[4]);
				hypo.Dmin = parseFloat(parts[5]);
				hypo.Place = parts[7];
				console.log(time, JSON.stringify(hypo));
				Svc.Dispatch(hypo);
				return;
			}
			console.log(' ** End of Hypos **');
			pid = 0;
			Svc.Subscribe('Idle', this, idle);
			idle({Cmd:'Idle'});
		}
		
		function idle(_com) {
			if(pid > 0 && pid%1000 === 0) {
				t2 = 0.001*Date.now();
				console.log(pid, t2-t1, pid/(t2-t1));
			}
			if(MaxPick > 0 && pid >= MaxPick) {
				let t2 = 0.001*Date.now();
				console.log('Read', pid, 'records in', t2-t1, 'seconds at', pid/(t2-t1), 'picks per second');
				Svc.Dispatch({Cmd:'Score'});
				return;
			}
			let line;
			let buff;
			let scnl;
			while (buff = rdpick.next()) {
				pid++;
				if('Range' in Vlt) {
					if(pid < Vlt.Range[0]) {
						continue;
					}
					if(pid >= Vlt.Range[1]) {
						break;
					}
				}
				line = buff.toString();
				if(line.length < 16) {
					continue;
				}
				let parts = line.split(/\s+/);
				scnl = parts[3] + '.' + parts[4] + '.' + parts[5] + '.' + parts[6];
				if(scnl in Vlt.Sites) {
					let site = Vlt.Sites[scnl];
					let pick = {};
					pick.Type = 'Pick';
					pick.Pid = pid.toString();
					pick.Site = scnl;
					pick.T = Svc.Decode(parts[7]);
					pick.Lat = site.Lat;
					pick.Lon = site.Lon;
					pick.Elv = site.Elv;
					Svc.Dispatch(pick);
					return;
				}
			}
			t2 = 0.001*Date.now();
			console.log('Processed', pid, 'picks in', t2-t1, 'seconds at', pid/(t2-t1), 'PPS');
			Svc.Dispatch({Cmd:'Score'});
		}
	}
}
