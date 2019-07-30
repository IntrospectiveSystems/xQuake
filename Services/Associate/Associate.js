//# sourceURL=Associate
(function Associate() {
	let printf = require('printf');

	//-----------------------------------------------------dispatch
	var dispatch = {
		Setup: Setup,
		Start: Start,
		GetServices: GetServices
	};

	return {
		dispatch: dispatch
	};

	//-----------------------------------------------------Setup
	function Setup(com, fun) {
		console.log('--Associate/Setup');
		let Par = this.Par;
		let Vlt = this.Vlt;
		Vlt.iHypo1 = 0;
		Vlt.iHypo2 = 0;
		if('nHypos' in Par) {
			Vlt.mHypos = Par.mHypos;
		} else {
			Vlt.mHypos = 10000;
		}
		Vlt.Hypo = [];
		Vlt.Hypo.length = Vlt.mHypos;
		Vlt.IxHypo = [];
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Start
	async function Start(com, fun) {
		console.log('-Associate/Start');
		this.Svc = await this.getServices();
		let Svc = this.Svc;
		let Par = this.Par;
		let that = this;
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------GetServices
	// Add receiver to distro list
	function GetServices(com, fun) {
		let Svc = this.Svc;
		console.log(' --Associate/GetServices');
		let Vlt = this.Vlt;
		let that = this;
		com.Services = {};
		com.Services.Associate = associate;
		com.Services.Scavenge = scavenge;
		com.Services.Report = report;
		if(fun)
			fun(null, com);

		//-------------------------------------------------associate
		function associate(pick, sig) {
			let Svc = that.Svc;
			let list = Svc.GetHypoList(pick.T - 900, pick.T);
			let ihypo = -1;
			let rbest = sig;
			if(list && list.length > 0) {
				for(ihyp=0; ihyp<list.length; ihyp++) {
					let hypo = list[ihyp];
//					console.log(JSON.stringify(hypo));
					let delta = Svc.Delta(hypo, pick);
					let tcal = Svc.T('P', delta,  hypo.Depth);
					if(tcal) {
						let tobs = pick.T - hypo.T;
						let res = tobs - tcal;
						let ares = Math.abs(res);
						if(ares < rbest) {
							rbest = ares;
							ihypo = hypo.iHypo;
						}
					//	console.log(tcal, tobs, res, rbest, ihypo);
					}
				}
			}
			return ihypo;
		}

		/** Scavenge
		 * Examine unassociated picks for inclusion into hypocenter
		 * @param {object} hypo Hypocenter to enrich with waifs
		 * @param {float} rescut Residual cutoff for association
		 * Return: Number of picks added to solution
		 */
		function scavenge(hypo, rescut) {
			let n=0;
			let waifs = Svc.GetWaifs(pick.T-trap.T, pick.T+6000);
			for(let i=0; i<waifs.length; i++) {
				let pick = waifs[i];
				let delta = Svc.Delta(hypo, pick);
				let tcal = Svc.T('P', delta, hypo.Depth);
				let tobs = pick.T - hypo.T;
				let res = tobs - tcal;
				let ares = Math.abs(res);
				if(ares < rescut) {
					hypo.Picks.push(pick.iPick);
					n++;
				}
			}
			return n;
		}

		//-------------------------------------------------report
		function report(hypo) {
			console.log('..Associate/report');
			console.log(JSON.stringify(hypo, null, 2));
			let picks = Svc.GetPicks(hypo.Picks);
			let str = '';
			let org = Svc.Encode(hypo.T);
			str += printf("Hypo %s %9.4f %10.4f%7.2f\n", org, hypo.Lat, hypo.Lon, hypo.Depth);
			for(let i=0; i<picks.length; i++) {
				console.log(JSON.stringify(picks[i]));
			}
			for(let i=0; i<picks.length; i++) {
				let pick = picks[i];
				let delta = Svc.Delta(hypo, pick);
				let tcal = Svc.T('P', delta, hypo.Depth);
				if(tcal) {
					let tobs = pick.T - hypo.T;
					let res = tobs - tcal;
					str += printf("%-14s %6.2f %6.2f\n", pick.Site, delta, res);
				} else {
					str += printf("%-14s %6.2f %6.2f\n", pick.Site, 'out of range');
				}
			}
			console.log(str);
		}

	}

})();