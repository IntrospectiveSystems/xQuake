//# sourceURL=Trav
(function Trav() {

	//-----------------------------------------------------dispatch
	let dispatch = {
		Setup: Setup,
		Start: Start,
		GetServices: GetServices
//		T: T,
//		Phase: Phase,
//		HypoResiduals: HypoResiduals
	};

	return {
		dispatch: dispatch
	};

	//-----------------------------------------------------T
	function interpolate(obj, delta, z) {
		if(delta < obj.dMin || delta >= obj.dMax)
			return;
		if(z <= obj.zMin || z >= obj.zMax)
			return;
		let nd = obj.nD;
		let d = (delta-obj.dMin)/obj.dInc;
		let zzz = (z - obj.zMin)/obj.zInc;
		let trv = obj.Trv;
		return tinterp(trv, d, zzz, nd);

		function tinterp(arr, x, y, stride) {
			let ix = Math.floor(x);
			let iy = Math.floor(y);
			let fracx = x - ix;
			let fracy = y - iy;
			let ix0 = iy*stride + ix;
			let t00 = arr[ix0];
			let t01 = arr[ix0+1];
			let t10 = arr[ix0 + stride];
			let t11 = arr[ix0 + stride + 1];
			let top = t00 + fracx*(t01 - t00);
			let bot = t10 + fracx*(t11 - t10);
			let t = top + fracy*(bot - top);
			return t;
		}

	}

	//-----------------------------------------------------phase
	// Return string represting phase of matrix element
	// closest to provided values
	function phase(obj, d, z) {
		let ixd = Math.round((d - obj.dMin)/obj.dInc);
		let ixz = Math.round((z - obj.zMin)/obj.zInc);
		let ix = obj.nD*ixz + ixd;
		let iray = obj.Phs[ix];
		return obj.Ray[iray];
	}

	//-----------------------------------------------------Setup
	async function Setup(com, fun) {
		console.log('--Trav/Setup');
		let fs = this.require('fs');
		let JSZip = this.require('jszip');
	//	let async = this.reauire('async');
		let zipjs = new JSZip();
		let Par = this.Par;
		let Vlt = this.Vlt;
		let that = this;
		console.log('Par', JSON.stringify(Par, null, 2));
		let dir = Par.Data + '/';
		Vlt.Branch = [];
		Vlt.Phase = {};
		let path = '';
		let data = null;
		let little = true;
		for(let ibranch=0; ibranch<Par.Branch.length; ibranch++) {
			let obj = {};
			obj.Name = Par.Branch[ibranch];
			await readzip(obj);
			Vlt.Branch.push(obj);
			Vlt.Phase[obj.Name] = obj;
		}
//		if(false) {
//			unittest(Vlt.Branch[0]);
//			for(let del=0; del<180; del++)
//				await phasetest(del, 50);
//		}
		if(fun)
			fun(null, com);

		function unittest(obj) {
			let d0 = 100.0;
			let z0 = 50.0;
			let lst = 0;
			for(let inc = 0.0; inc <= 1.0; inc += 0.1) {
				let del = d0 + inc;
				let zzz = z0;
				let ttt = interpolate(obj, del, zzz);
				console.log(del.toFixed(2), zzz.toFixed(2), ttt.toFixed(2), (ttt-lst).toFixed(2));
				lst = ttt;
			}
		}

		async function phasetest(d, z) {
			return new Promise((resolve, reject) => {
				let q = {};
				q.Cmd = 'Phase';
				q.D = d;
				q.Z = z;
				q.Tobs = 0;
				that.send(q, Par.Pid, function(err, r) {
					if('Phase' in r)
						console.log(r.D.toFixed(2), r.Z.toFixed(2), r.Tcal.toFixed(2), r.Phase);
					else
						console.log(r.D.toFixed(2), r.Z.toFixed(2), 'no result.');
					resolve();
				});
			});
		}

		async function readzip(obj) {
			return new Promise((resolve, reject) => {
				path = dir + obj.Name + '.zip';
				console.log('path', path);
				data = fs.readFileSync(path);
				if(!data) {
					console.log(' ** Cannot read', path);
					reject();
				}
				zipjs.loadAsync(data).then(async function(zip) {
					await head(obj, zip);
					console.log('Head return');
					await branch(obj, zip);
					await trav(obj, zip);
					await ray(obj, zip);
					resolve();
				});
			});
		}

		// Process Head.bin
		// This file is used to determine whether the produces was
		// little or big endian for decoding of Trav.bin later
		async function head(_obj, zip) {
			console.log('..head');
			return new Promise((resolve, _reject) => {
				zip.file('Head.bin').async('uint8array').then(function(bytes) {
					console.log('bytes.length', bytes.length);
					if(bytes[7] === 1)
						little = false;
					for(let i=0; i<bytes.length; i++)
						console.log(i, bytes[i]);
					console.log('Resolving');
					resolve();
				});
			});
		}

		// Process Branch.json
		// The Branch.json file has the information that was used by GenXTT to
		// construct the rest of the files Head.bin, Branch.json, Trav.bin
		// and Ray.bin
		async function branch(obj, zip) {
			console.log('..branch');
			return new Promise((resolve, _reject) => {
				zip.file('Branch.json').async('string').then(function(str) {
					let jsn = JSON.parse(str);
					console.log('Branch.json', JSON.stringify(jsn, null, 2));
					obj.Ray = jsn.Ray.slice(0);
					obj.dMin = jsn.Delta[0];
					obj.dInc = jsn.Delta[1];
					obj.dMax = jsn.Delta[2];
					obj.nD = Math.floor((obj.dMax - obj.dMin + 0.00))/obj.dInc;
					obj.dInc = (obj.dMax - obj.dMin) / obj.nD;
					obj.zMin = jsn.Depth[0];
					obj.zInc = jsn.Depth[1];
					obj.zMax = jsn.Depth[2];
					obj.nZ = Math.floor((obj.zMax - obj.zMin + 0.01))/obj.zInc;
					obj.zInc = (obj.zMax - obj.zMin) / obj.nZ;
					console.log('obj', JSON.stringify(obj, null, 2));
					resolve();
				});
			});
		}

		// Process Trav.bin
		// These are the actual traveltimes with delta columns and
		// depth rows
		async function trav(obj, zip) {
			console.log('..trav');
			return new Promise((resolve, _reject) => {
				zip.file('Trav.bin').async('arraybuffer').then(function(bin) {
					let buf = new Buffer(bin);
					let ntrv = obj.nD * obj.nZ;
					obj.Trv= new Float64Array(ntrv);
					for(let itrv=0; itrv<ntrv; itrv++) {
						if(little)
							obj.Trv[itrv] = buf.readDoubleLE(8*itrv);
						else
							obj.Trv[itrv] = buf.readDoubleBE(8*itrv);
					//	if(itrv < 100)
					//		console.log(itrv, obj.Trv[itrv].toFixed(2));
					}
					resolve();
				});
			});
		}

		// Process Ray.bin
		// This is a byte array with the same structure as Trav.bin but
		// each entry is an index into the Ray array in Branch.json
		async function ray(obj, zip) {
			console.log('..ray');
			return new Promise((resolve, reject) => {
				zip.file('Ray.bin').async('uint8array').then(function(bytes) {
					obj.Phs = new Uint8Array(bytes);
					resolve();
				});
			});
		}

	}

	//-----------------------------------------------------Start
	function Start(com, fun) {
		console.log("--Trav/Start");
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------LInk
	// Add receiver to distro list
	function GetServices(com, fun) {
		console.log(' --Trav/GetServices');
		Vlt = this.Vlt;
		com.Services = {};
		com.Services.TravelTime = traveltime;
		com.Services.T = traveltime;
		com.Services.Phase = phase;
		if (fun)
			fun(null, com);

		function t(phs, delta, z) {
			return traveltime(Vlt, phs, delta, z);
		}

		function assoc(delta, z, tobs) {
			return associate(Vlt, delta, z, tobs)
		}

		// Calculte traveltime for a given phase from delta in degrees
		// Returns null if not phase table exists or parameters out of range
		// Assi,es ECEF cirremt pm bptj ju[ amd pck]
		function traveltime(phs, delta, depth) {
			if(phs in Vlt.Phase) {
				let obj = Vlt.Phase[phs];
				let t = interpolate(obj, delta, depth);
				if(t)
					return t;
			} else {
				console.log('Phase', phs, 'not available');
			}
		}

		// Calculate the nearest arriving phase to observed travel time
		// Returns an object with the original parameters with
		// Returns object {
		//   Delta <Float>
		//   Z <Float>
		//   Phase <string>
		//   Tcal: <float>
		//   Tobs: <float>
		// If no fit null is returned
		function phase(delta, z, tobs) {
			let resmin = 1.0e30;
			let objbest;
			let trvbest;
			for(let iray=0; iray<vlt.Branch.length; iray++) {
				let obj = vlt.Branch[iray];
				if(delta < obj.dMin || delta >= obj.dMax)
					continue;
				if(z < obj.zMin || z >= obj.zMax)
					continue;
				let tcal = interpolate(obj, delta, z);
				if(!tcal || tcal < 0)
					continue;
				let res = tcal - tobs;
				if(res < 0)
					res = -res;
				if(res < resmin) {
					resmin = res;
					trvbest = tcal;
					objbest = obj;
				}
			}
			if(resmin < 10) {
				let assoc = {};
				assoc.Delta = delta;
				assoc.Z = z;
				assoc.Tcal = trvbest;
				assoc.Phase = phase(objbest, delta, z);
				return assoc;
			}
		}

	}


	//-----------------------------------------------------T
	// Calculate a single travel time
	// Cmd: "T"
	// Phase: <string> Phase for calculation
	// D: <float> Distance in degrees
	// Z: <float> Depth in km
	// returns
	// Tcal: Travel time in seconds
	function T(com, fun) {
		let Vlt = this.Vlt;
		let delta = com.D;
		let z = com.Z;
		if(com.Phase in Vlt.Phase) {
			let obj = Vlt.Phase[com.Phase];
			let t = interpolate(obj, delta, z);
			if(t)
				Com.Tcal = t;
		}
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Phase
	// Associate the closest phase to given D, Z, and Tobs
	// Cmd: "T"
	// Tobs: <float> Observed travel time
	// D: <float> Distance in degrees
	// Z: <float> Depth in km
	// returns
	// Phase: <string> Phase of best fit
	// Tcal: <float> Travel time in seconds
	// Tres; <float> Travel time residual (Tcal - Tobs)
	function Phase(com, fun) {
		let Vlt = this.Vlt;
		let delta = com.D;
		let z = com.Z;
		let resmin = 1.0e30;
		let objbest;
		let raybest;
		let trvbest;
		if('Tobs' in com) {
			for(let iray=0; iray<Vlt.Branch.length; iray++) {
				let obj = Vlt.Branch[iray];
				if(delta < obj.dMin || delta >= obj.dMax)
					continue;
				if(z < obj.zMin || z >= obj.zMax)
					continue;
				let tcal = interpolate(obj, delta, z);
				if(!tcal || tcal < 0)
					continue;
				let res = tcal - com.Tobs;
				if(res < 0)
					res = -res;
				if(res < resmin) {
					resmin = res;
					trvbest = tcal;
					objbest = obj;
				}
			}
			if(resmin < 100000) {
				com.Tcal = trvbest;
				com.Phase = phase(objbest, delta, z);
			}
		}
		if(fun)
			fun(null, com);
	}
	//-----------------------------------------------------Hypo
	// Calculate travel times and residulas for Hypo in sec
	// Cmd: 'HypoResiduals'
	// Hypo: {} Hypocenter object
	// Picsk: [] Array of data itmes
	// Hypocenter should first be processed with Sites:Delta
	// to calculate distance
	function HypoResiduals(com, fun) {
	//	console.log('HypoResiduals');
		let async = this.require('async');
	//	console.log(com);
		let Vlt = this.Vlt;
		let hyp = {};
		hyp.Lat = com.Lat;
		hyp.Lon = com.Lon;
		let picks = com.Data;
		let d;
		let z = com.Z;
		let tcal;
		let tobs;
		let res;
		let torg = com.T;
		for(let i=0; i<picks.length; i++) {
			let pick = picks[i];
		//	console.log(pick);
			pick.Phase = Vlt.Phase;
			if('Dis' in pick) {
				d = pick.Dis;
				tcal = interpolate(Vlt, d, z);
				tobs = pick.T - torg;
				pick.Res = tobs - tcal;
			//	pick.Res = pick.T - tcal - torg;
				pick.Trav = tcal;
			//	console.log(tobs, '-', tcal, '+', pick.Res);
			//	console.log(pick.T, torg, tobs);
			} else {
			//	console.log('Bad doggie!');
				pick.Res = null;
			}
		}
		async.setImmediate(function () {
			fun(null, com);
		});
	}

})();