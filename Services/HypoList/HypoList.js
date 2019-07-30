//# sourceURL=HypoList
(function HypoList() {
	let Svc = {};

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
		console.log('--HypoList/Setup');
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
		console.log('-HypoList/Start');
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
		console.log(' --HypoList/GetServices');
		let Vlt = this.Vlt;
		let Svc = this.Svc;
		com.Services = {};
		com.Services.AddHypo = addHypo;
		com.Services.GetHypo = getHypo;
		com.Services.GetHypoList = getHypoList;
		if(fun)
			fun(null, com);

		//-------------------------------------------------addHypo
		function addHypo(hyp) {
			if(Vlt.iHypo2 - Vlt.iHypo1 >= Vlt.mHypos) {
				// Delete this hypo from index
			}
			let hypo = {};
			hypo.Type = 'Hypo';
			hypo.Site = hyp.Site;
			hypo.Pid = hyp.Pid;
			hypo.iHypo = Vlt.iHypo2;
			hypo.T = hyp.T;
			hypo.Lat = hyp.Lat;
			hypo.Lon = hyp.Lon;
			hypo.Elv = hyp.Elv;
			hypo.Depth = hyp.Depth;
			if('Sig' in hyp) {
				hypo.Sig = hyp.Sig;
			}
			if('Place' in hyp) {
				hypo.Place = hyp.Place;
			}
			hypo.Picks = hyp.Picks;
			Svc.ECEF(hypo);
			Vlt.Hypo[Vlt.iHypo2%Vlt.mHypos] = hypo;
			Vlt.iHypo2++;
			if(Vlt.iHypo2 - Vlt.iHypo1 >= Vlt.mHypos)
				Vlt.iHypo1++;
			let ixhypo = {};
			ixhypo.iHypo = Vlt.iHypo2-1;
			ixhypo.T = hypo.T;
			let last = Vlt.IxHypo.length - 1;
			if(last < 0 || hypo.T > Vlt.IxHypo[last].T) {
				Vlt.IxHypo.push(ixhypo);
			//	dump();
				return hypo.iHypo;
			}
			if(hypo.T < Vlt.IxHypo[0].T) {
				Vlt.IxHypo.unshift(ixhypo);
			//	dump();
				return hypo.iHypo;
		}
			let ix = find(hypo.T);
			Vlt.IxHypo.splice(ix, 0, ixhypo);
			return hypo.iHypo;
			//	dump();

			function dump() {
				for(let i=0; i<Vlt.IxHypo.length; i++) {
					let obj = Vlt.IxHypo[i];
				//	let dt = Svc.Encode(obj.T);
					console.log(i, obj.T);
				}
			}
		}

		function getHypo(ihypo) {
			if(ihypo < Vlt.iHypo1 || ihypo >= Vlt.iHypo2) {
				return;
			}
			let hypo = Vlt.Hypo[ihypo%Vlt.mHypos];
			return hypo;
		}

		function getHypoList(t1, t2) {
//			console.log('..getHypoList');
			if(Vlt.IxHypo < 1) {
//				console.log('Yes we have no bananas');
				return;
			}
			list = [];
			let i1 = find(t1);
			let i2 = find(t2) + 1;
//			console.log(i1, i2);
			for(i=i1; i<i2; i++) {
				let ixhypo = Vlt.IxHypo[i];
				let ihypo = ixhypo.iHypo;
				if(ihypo >= Vlt.iHypo1 && ihypo < Vlt.iHypo2)
					list.push(Vlt.Hypo[ihypo]);
			}
			return list;
		}

		function find(hypot) {
			let last = Vlt.IxHypo.length - 1;
			let t;
			let i = 0;
			let i1 = 0;
			let i2 = last;
			let t1 = Vlt.IxHypo[0].T;
			let t2 = Vlt.IxHypo[last].T;
			let done = false;
			while(!done) {
				i = Math.floor((i2 + i1)/2);
				t = Vlt.IxHypo[i].T;
				if(i2 - i1 < 2)
					done = true;
				if(t <= hypot) {
					i1 = i;
					t1 = t;
				} else {
					i2 = i;
					t2 = t;
				}
			}
			return i2;
		}

	}

})();