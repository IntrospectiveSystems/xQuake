//# sourceURL=Locate
(function Locate() {
	let printf = require('printf');
	let Golden = require('minimize-golden-section-1d');
	let DeepCopy = require('deepcopy');
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
		console.log('--Locate/Setup');
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
		console.log('-Locate/Start');
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
		console.log(' --Locate/GetServices');
		let Vlt = this.Vlt;
		let that = this;
		com.Services = {};
		com.Services.Locate = locate;
		com.Services.Summary = summary;
		if(fun)
			fun(null, com);

		//-------------------------------------------------report
		function locate(hypo, sigt, niter) {
		//	console.log('..Locate/locate');
			let Svc = that.Svc;
			let pcktmp = Svc.GetPicks(hypo.Picks);
			let picks = DeepCopy(pcktmp);
			let npicks = picks.length;
			let sigbest = 0.0;
			let a = 10*sigt;
			let b = 1;
			let dt = new Date();
			let t1 = 0.001*dt.getTime();
			for(iter=0; iter<niter; iter++) {
				let hyp = {};
				for(let key in hypo) {
					switch(key) {
					case 'Picks':
						break;
					default:
						hyp[key] = hypo[key];
					}
				}
				let sigdis = (b-a)*iter/niter + a;
				sigsum = iterate(iter, hyp, sigdis);
				if(iter === 0) {
					sigbest = sigsum;
				}
				if(sigsum > sigbest) {
					sigbest = sigsum;
					for(let key in hyp) {
						switch(key) {
						case 'Picks':
							break;
						default:
							hypo[key] = hyp[key];
						}
					}
					hypo.Sig = sigbest;
					console.log('*' + iter, sigsum.toFixed(4), sigdis);
				}
			}
			dt = new Date();
			let t2 = 0.001*dt.getTime();
//			console.log('Elapsed time for', n, 'iterations', t2-t1);
			summary.call(this, hypo);

			function iterate(iter, hyp, sigdis) {
			//	sigdis = 0.2;
			//	let sigtime = 10.0*sigdis;
				let sigtime = sigt;
				let deglat = 1/111.2;	// Degrees per km of lat
				let deglon = deglat*Math.cos(hyp.Lat*Math.PI/180);
				let dx = Svc.Gaussian(0.0, sigdis);
				let dy = Svc.Gaussian(0.0, sigdis);
				let dz = 0.1 * Svc.Gaussian(0.0, sigdis);
				if(iter > 0) {
					hyp.Lat += deglat*dx;
					hyp.Lon += deglon*dy;
					hyp.Depth += dz;
					if(hyp.Depth < 1) {
						hyp.Depth = 1;
					}
				}
				golden.call(this, hyp, sigtime);
				sigsum = 0.0;
				for(i=0; i<picks.length; i++) {
					let pick = picks[i];
					if('Res' in pick) {
						sigsum += Svc.Sig(pick.Res, sigtime);
					}
				}
				return sigsum;

				function golden(hypo, sigtime) {
					Svc.ECEF(hypo);
					let tbest = Golden(test, {tolerance:1.e-4, guess:0});
					hypo.T += tbest;
					for(ipick=0; ipick<npicks; ipick++) {
						let pick = picks[ipick];
						let delta = Svc.Delta(hypo, pick);
						let tcal = hypo.T + Svc.T('P', delta, hypo.Depth);
						pick.Res = pick.T - tcal;
					}
		
					function test(toff) {
						let sigsum = 0;
						for(let ipick=0; ipick<npicks; ipick++) {
							let pick = picks[ipick];
							let delta = Svc.Delta(hypo, pick);
							let tcal = hypo.T + Svc.T('P', delta, hypo.Depth) + toff;
							let res = pick.T - tcal;
							sigsum += Svc.Sig(res, sigtime);
						}
						return -sigsum;
					}
				}
			}
		}

		//-------------------------------------------------summary
		function summary(hypo) {
			let Svc = that.Svc;
			let str = '';
			let picks = Svc.GetPicks(hypo.Picks);
			let npicks = picks.length;
			let pks = [];
			for(let ipick=0; ipick<npicks; ipick++) {
				let pick = picks[ipick];
				pk = {};
				pk.Pid = pick.Pid;
				pk.Site = pick.Site;
				pk.Delta = Svc.Delta(hypo, pick);
				let tcal = hypo.T + Svc.T('P', pk.Delta, hypo.Depth);
				pk.Res = pick.T - tcal;
				pks.push(pk);
			}
			pks.sort(function(a, b) {
				return a.Delta - b.Delta;
			});
			let sorg = Svc.Encode(hypo.T);
			let sig = 0;
			if('Sig' in hypo) {
				sig = hypo.Sig;
			}
			str += printf("\nHypo:%16s%9.4f%10.4f%7.2f (%.2f)", sorg, hypo.Lat, hypo.Lon, hypo.Depth, sig);
			str += '\n';
			for(ipk=0; ipk<npicks; ipk++) {
				let pk = pks[ipk];
				str += printf("%16s %7.2f %6.2f\n", pk.Site, pk.Delta, pk.Res);
			}
			console.log(str);
		}

	}

})();