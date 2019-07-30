//# sourceURL=Nucleate
(function Nucleate() {
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
	function Setup(_com, fun) {
		console.log('--Nucleate/Setup');
		if(fun)
			fun();
	}

	//-----------------------------------------------------Start
	async function Start(com, fun) {
		console.log('-Nucleate/Start');
		this.Svc = await this.getServices();
		let Vlt = this.Vlt;
		Vlt.Traps = [];
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------GetServices
	// Add receiver to distro list
	function GetServices(com, fun) {
		console.log(' --Nucleate/GetServices');
		let Vlt = this.Vlt;
		let that = this;
		com.Services = {};
		com.Services.Nucleate = nucleate;
		com.Services.AddTrap = addTrap;
		if(fun)
			fun(null, com);

		/** AddTrap
		 * Add event detection trap to trap Array
		 * @param {object} trap Object containing trap parameters
		 * @param {float} trap.Use Boolean determing whether trap is used
		 * @param {float} trap.Delta Length of hex side
		 * @param {float} trap.Z Distance between trap nodes (degrees)
		 * @param {float} trap.Iter Iterations
		 * @param {float} trap.N Number of phases needed
		 * @param {float} trap.Thresh Trigger threshold
		 */
		function addTrap(trap) {
			console.log('...trap');
			let Svc = that.Svc;
			let trp = {};
			for(let key in trap) {
				trp[key] = trap[key];
			}
			trp.T = Svc.T('P', trap.Delta, 1);	// T associated with delta
			let grid = [];
			hex(trap.Delta, 0);
			hex(1.866*trap.Delta, 30);
			hex(2*trap.Delta, 0);
			trp.Grid = grid;
			Vlt.Traps.push(trp);

			function hex(delta, ioff) {
				console.log('...hex');
				for(idep=0; idep<trp.Z.length; idep++) {
					let depth = trp.Z[idep];
					let t = Svc.T('P', delta, depth);
					console.log('range', t, delta, depth, trp.T);
					for(i=0; i<=360; i+=60) {
						let obj = {X:1, Y:0, Z:0};
						if(i > 0) {
							Svc.RotY(obj, delta);
							Svc.RotX(obj, i+ioff);
						}
						obj.Depth = depth;
						obj.T = t;
						grid.push(obj);
					}				
				}
			}
		}

		//-------------------------------------------------nucleate
		function nucleate(pick) {
			let Svc = that.Svc;
			console.log('Nucleate', JSON.stringify(pick));
			let list = [];;
			let trap;
			let Hypo;
			let Sig = 0.0;
			for(let itrap=0; itrap<Vlt.Traps.length; itrap++) {
				trap = Vlt.Traps[itrap];
				list = genlist();
				if(list === undefined) {
					continue;
				}
				trigger();
				if(Hypo) {
					for(ihyp=0; ihyp<3; ihyp++) {
						let npicks = Hypo.Picks.length;
				//		Svc.Locate(Hypo, 5, 1000);
						Svc.Locate(Hypo, 1, 1000);
						prune();
						let s = 'Prune' + ihyp + ':';
						for(let ipk=0; ipk<Hypo.Picks.length; ipk++) {
							let pk = Svc.GetPick(Hypo.Picks[ipk]);
							s += pk.Site + ' ';
						}
						console.log(s);
						if(Hypo.Picks.length < trap.N) {
							Hypo = undefined;
							break;
						}
						if(Hypo.Picks.length === npicks) {
							return Hypo;
						}
					}
				}
			}

			function trigger() {
				let grid = trap.Grid;
				let n = grid.length;
				for(igrid=0; igrid<n; igrid++) {
					let grd = grid[igrid];
					let obj = {};
					for(let key in grd) {
						obj[key] = grd[key];
					}
					let lat = 180*Math.asin(pick.Z)/Math.PI;
					let lon = pick.Lon;
					Svc.RotY(obj, -lat);
					Svc.RotZ(obj, lon);
					Svc.Geo(obj);
					let delta = Svc.Delta(pick, obj);
					let torg = pick.T - Svc.T('P', delta, obj.Depth);
					let pcks = [];
					let tsig = trap.T;
					let sum = 0.0;
					for(let ilist=0; ilist<list.length; ilist++) {
						let pck = list[ilist];
						let dcal = Svc.Delta(pck, obj);
						let tcal = Svc.T('P', dcal, obj.Depth);
						let res = torg + tcal - pick.T;
						if(Math.abs(res) < tsig) {
							pcks.push(pck);
							let sig = Svc.Sig(res, tsig);
							sum += sig;
						}
					}
					if(pcks.length >= trap.N && sum > Sig) {
						iGrid = igrid;
						Sig = sum;
						let pid = that.genPid();
						pid = pid.substr(0, 6); // Kludge
						Hypo = {};
						Hypo.Pid = pid;
						Hypo.T = torg;
						Hypo.Lat = obj.Lat;
						Hypo.Lon = obj.Lon;
						Hypo.Depth = obj.Depth;
						Hypo.Sig = Sig;
						Svc.ECEF(Hypo);
						Hypo.Picks = [];
						for(let i=0; i<pcks.length; i++) {
							let pck = pcks[i];
							Hypo.Picks.push(pck.iPick);
						}
					}
				}
			}

			function prune() {
				let pcks = Svc.GetPicks(Hypo.Picks);
				Hypo.Picks = [];
				for(let ipck=0; ipck<pcks.length; ipck++) {
					let pck = pcks[ipck];
					let dcal = Svc.Delta(pck, Hypo);
					let tcal = Svc.T('P', dcal, Hypo.Depth);
					let res = Hypo.T + tcal - pck.T;
					if(Math.abs(res) < 3.0) {
						Hypo.Picks.push(pck.iPick);
					}
				}
			}

			function genlist() {
				let sector = [[],[],[],[],[],[]];
				let waifs = Svc.GetWaifs(pick.T-trap.T, pick.T+6000);
				if(waifs.length < trap.N) {
					return;
				}
				let arr = [];
				for(let ipck=0; ipck<waifs.length; ipck++) {
					let pck = waifs[ipck];
					if('Nets' in trap) {
						let scnl = pck.Site;
						let parts = scnl.split('.');
						if(trap.Nets.indexOf(parts[2]) < 0) {
							continue;
						}
					}
					let obj = {};
					obj.dis = Svc.Delta(pick, pck);
				//	console.log(pck.Site, obj.dis);
					if(obj.dis < trap.DeltaMax) {
						if(obj.dis < 0.0001) {
							obj.azm = 0.0;
						} else {
							obj.azm = Svc.Azimuth(pick, pck);
						}
						obj.iwaif = ipck;
						arr.push(obj);
					}
				}
				if(arr.length > 0) {
					let s = 'list:';
					for(let i=0; i<arr.length; i++) {
						let q = arr[i];
						let iw = q.iwaif;
						let pk = waifs[iw];
						s += q.dis.toFixed(2) + ':' + pk.Site + ' ';
					}
					console.log(s);
				}
				if(arr.length < trap.N) {
					return;
				}
				arr.sort(function(a, b) {
					return a.dis - b.dis;
				});
				for(let ipck=0; ipck<arr.length; ipck++) {
					let obj = arr[ipck];
					let azm = obj.azm;
					let isctr = Math.floor(azm/60.0);
					if(isctr < 0 || isctr > 5) {
						console.log(' ** Bad sector', azm, isctr);
					} else {
						sector[isctr].push(obj);
					}
				}
				let list = [];
				let isctr = 0;
				while(list.length < arr.length) {
					isctr = (isctr+1)%6;
					if(sector[isctr].length > 0) {
						let obj = sector[isctr].shift();
						let iwaif = obj.iwaif;
						list.push(waifs[iwaif]);
					}
				}
				return list;
			}
		}
	}

})();