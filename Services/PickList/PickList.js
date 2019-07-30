//# sourceURL=PickList
(function PickList() {
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
		console.log('--PickList/Setup');
		let Par = this.Par;
		let Vlt = this.Vlt;
		Vlt.iPick1 = 0;
		Vlt.iPick2 = 0;
		if('nPicks' in Par) {
			Vlt.mPicks = Par.mPicks;
		} else {
			Vlt.mPicks = 10000;
		}
		Vlt.mPicks = 100000;
		Vlt.Pick = [];
		Vlt.Pick.length = Vlt.mPicks;
		Vlt.IxPick = [];
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Start
	async function Start(com, fun) {
		console.log('-PickList/Start');
		this.Svc = await this.getServices();
		let keys = Object.keys(this.Svc);
		console.log('PickList Svc', JSON.stringify(keys));
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------GetServices
	// Add receiver to distro list
	function GetServices(com, fun) {
		console.log(' --PickList/GetServices');
		let Vlt = this.Vlt;
		let Svc = this.Svc;
		com.Services = {};
		com.Services.AddPick = addPick;
		com.Services.GetPick = getPick;
		com.Services.GetPicks = getPicks;
		com.Services.GetPickList = getPickList;
		com.Services.GetWaifs = getWaifs;
		com.Services.Dump = dump;
		if(fun)
			fun(null, com);

		//-------------------------------------------------addPick
		function addPick(pick) {
			if(Vlt.iPick2 - Vlt.iPick1 >= Vlt.mPicks) {
				// Delete oldest pick from index
			}
/*			let pick = {};
			pick.Type = 'Pick';
			pick.Site = pck.Site;
			pick.Pid = pck.Pid;
			pick.iPick = Vlt.iPick2;
			pick.T = pck.T;
			pick.Lat = pck.Lat;
			pick.Lon = pck.Lon;
			pick.Elv = pck.Elv;
			Svc.ECEF(pick); */
			pick.iPick = Vlt.iPick2;
			Vlt.Pick[Vlt.iPick2%Vlt.mPicks] = pick;
			Vlt.iPick2++;
			if(Vlt.iPick2 - Vlt.iPick1 >= Vlt.mPicks)
				Vlt.iPick1++;
			let ixpick = {};
			ixpick.iPick = pick.iPick;
			ixpick.T = pick.T;
			let last = Vlt.IxPick.length - 1;
			if(last < 0 || pick.T > Vlt.IxPick[last].T) {
				Vlt.IxPick.push(ixpick);
				return ixpick.iPick;
			}
			if(pick.T < Vlt.IxPick[0].T) {
				Vlt.IxPick.unshift(ixpick);
				return ixpick.iPick;
			}
			let ix = find(pick.T);
			Vlt.IxPick.splice(ix, 0, ixpick);
//			dump();
			return ixpick.iPick;

		}

		//.............................................getPick
		// Retrieve single pick by pick index
		function getPick(ipick) {
//			console.log('getPick', ipick, Vlt.iPick1, Vlt.iPick2);
			if(ipick >= Vlt.iPick1 && ipick < Vlt.iPick2) {
				return Vlt.Pick[ipick%Vlt.mPicks];
			}
		}

		//---------------------------------------------getPicks
		// Same as getPick but takes an array of pick
		// indices and returns an array of pick opbjects
		function getPicks(ipicks) {			
			let picks = [];
			for(i=0; i<ipicks.length; i++) {
				let pick = getPick(ipicks[i]);
				if(pick) {
					picks.push(pick);
				}
			}
			return picks;
		}

		function getPickList(t1, t2) {
//			console.log('..getPickList', t1, t2);
			if(Vlt.IxPick < 1) {
				console.log('Yes we have no bananas');
				return;
			}
			list = [];
			let i1 = find(t1);
			let i2 = find(t2) + 1;
//			console.log(i1, i2);
			for(i=i1; i<i2; i++) {
				let ixpick = Vlt.IxPick[i];
				let ipick = ixpick.iPick;
				if(ipick >= Vlt.iPick1 && ipick < Vlt.iPick2)
					list.push(Vlt.Pick[ipick]);
			}
			return list;
		}

		function getWaifs(t1, t2) {
//			console.log('..getPickList', t1, t2);
			if(Vlt.IxPick < 1) {
				console.log('Yes we have no bananas');
				return;
			}
			list = [];
			let i1 = find(t1);
			let i2 = find(t2) + 1;
//			console.log(i1, i2);
			for(i=i1; i<i2; i++) {
				let ixpick = Vlt.IxPick[i];
				let ipick = ixpick.iPick;
				if(ipick >= Vlt.iPick1 && ipick < Vlt.iPick2) {
					let pick = Vlt.Pick[ipick];
					if('iHypo' in pick) {
						continue;
					}
					list.push(pick);
				}
			}
			return list;
		}
			
		//.............................................find
		// Returns index in IxPick of the next entry with
		// time greater than pickt
		function find(pickt) {
			let last = Vlt.IxPick.length - 1;
			let t;
			let i = 0;
			let i1 = 0;
			let i2 = last;
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

		function dump() {
			for(let i=0; i<Vlt.IxPick.length; i++) {
				let obj = Vlt.IxPick[i];
			//	let dt = Svc.Encode(obj.T);
				console.log(i, obj.T);
			}
		}
	}

})();