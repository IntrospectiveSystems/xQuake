//# sourceURL=Picks
(function Picks() {
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
		console.log('--Picks/Setup');
		let Par = this.Par;
		let Vlt = this.Vlt;
		Vlt.iPick1 = 0;
		Vlt.iPick2 = 0;
		if('nPicks' in Par) {
			Vlt.mPicks = Par.mPicks;
		} else {
			Vlt.mPicks = 10000;
		}
		Vlt.Pick = [];
		Vlt.Pick.length = Vlt.mPicks;
		Vlt.IxPick = [];
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Start
	async function Start(com, fun) {
		console.log('-Picks/Setup');
		let Par = this.Par;
		let that = this;
		// Collect services
		if ('Services' in Par) {
			for (let is = 0; is < Par.Services.length; is++) {
				let pid = Par.Services[is];
				await service(pid);
			}
		}

		// Gather services from each individual module
		async function service(pid) {
			return new Promise((resolve, _reject) => {
				let q = {};
				q.Cmd = 'GetServices';
				that.sendLocal(q, pid, async function (_err, r) {
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

		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------GetServices
	// Add receiver to distro list
	function GetServices(com, fun) {
		console.log(' --Picks/GetServices');
		let Vlt = this.Vlt;
		com.Services = {};
		com.Services.AddPick = addPick;
		com.Services.Dump = dump;
		if(fun)
			fun(null, com);

		//-------------------------------------------------addPick
		function addPick(pck) {
			console.log('=================================');
			if(Vlt.iPick2 - Vlt.iPick1 >= Vlt.mPicks) {
				// Delete oldest pick from index
			}
			let pick = {};
			pick.Type = 'Pick';
			pick.Site = pck.Site;
			pick.Pid = pck.Pid;
			pick.T = pck.T;
			pick.Lat = pck.Lat;
			pick.Lon = pck.Lon;
			pick.Elv = pck.Elv;
			Svc.ECEF(pick);
			Vlt.Pick[Vlt.iPick2%Vlt.mPicks] = pick;
			Vlt.iPick2++;
			if(Vlt.iPick2 - Vlt.iPick1 >= Vlt.mPicks)
				Vlt.iPick1++;
			let ixpick = {};
			ixpick.iPick = Vlt.iPick2-1;
			ixpick.T = pick.T;
			let last = Vlt.IxPick.length - 1;
			if(last < 0 || pick.T > Vlt.IxPick[last].T) {
				Vlt.IxPick.push(ixpick);
				return;
			}
			if(pick.T < Vlt.IxPick[0].T) {
				Vlt.IxPick.unshift(ixpick);
				return;
			}
			let ix = find(pick.T);
			Vlt.IxPick.splice(ix, 0, ixpick);
//			dump();

			//.............................................find
			// Returns index in IxPick of the next entry with
			// time greater than pickt
			function find(pickt) {
				let t;
				let i = 0;
				let i1 = 0;
				let i2 = last;
				let t1 = Vlt.IxPick[0].T;
				let t2 = Vlt.IxPick[last].T;
				let done = false;
				while(!done) {
					i = Math.floor((i2 + i1)/2);
					t = Vlt.IxPick[i].T;
					if(i2 - i1 < 2)
						done = true;
					if(t <= pickt) {
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

		function dump() {
			for(let i=0; i<Vlt.IxPick.length; i++) {
				let obj = Vlt.IxPick[i];
			//	let dt = Svc.Encode(obj.T);
				console.log(i, obj.T);
			}
		}
	}

})();