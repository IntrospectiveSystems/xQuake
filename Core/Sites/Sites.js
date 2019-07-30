//# sourceURL=Sites
(function Sites() {
	let Svc = {};

	//-----------------------------------------------------dispatch
	var dispatch = {
		Setup: Setup,
		Start: Start,
	//	Assemble: Assemble,
		GetServices: GetServices
	//	GetSite: GetSite,
	//	GetSiteList: GetSiteList,
	//	Delta: Delta,
	//	HypoDelta: HypoDelta
	};

	return {
		dispatch: dispatch
	};

	//-----------------------------------------------------Setup
	function Setup(com, fun) {
		console.log('--Sites/Setup');
		let Vlt = this.Vlt;
		Vlt.Sites = new Map();
		Vlt.Stations = new Map();
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Start
	async function Start(com, fun) {
		console.log("--Sites/Start");
		var Par = this.Par;
		let that = this;

		// Collect services
		if ('Services' in Par) {
			for (let is = 0; is < Par.Services.length; is++) {
				let pid = Par.Services[is];
				await service(pid);
			}
		}

		// Subscribe to message types
		Svc.Subscribe('Hypo', that, hypo);
		Svc.Subscribe('Pick', that, pick);
		Svc.Subscribe('Report', that, report);
		Svc.Subscribe('Engage', that, engage);
		if(fun)
			fun(null, com);

		// Gather services from each individual module
		async function service(pid) {
			return new Promise((resolve, reject) => {
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

		//-----------------------------------------------------engage
		function engage(agent) {
			console.log('..engage', JSON.stringify(agent, null, 2));
			// Load station data
			let sitelists = Svc.GetParam('StationLists');
			if(sitelists) {
				console.log('StationLists', JSON.stringify(sitelists, null, 2));
				loadStationData.call(this, sitelists, function(err) {
				});
			} else {
				console.log(' ** No station lists found in Scene');
			}console.log
		}

		//-----------------------------------------------------Hypo
		// This is just a pass through for rogue testing
		function hypo(hyp) {
			log.i('Sites/Hypo', JSON.stringify(hyp));
			Svc.Dispatch(hyp);
		}

		//-----------------------------------------------------Pick
		function pick(pck) {		
		//	console.log('Sites/Pick', pck.T, pck.Src, pck.Site);
			var Vlt = this.Vlt;
			let chr = ' ';
			let str = (pck.T).toString();
			let parts = str.split('.');
			let stime;
			if(parts.length === 2) {
				let st = parseInt(parts[0] + parts[1]);
				stime = Svc.Encode(st);
			} else {
				stime = 'NADA';
			}
			var site = Vlt.Sites.get(pck.Site);
			if(!site) {
				let scnl = pck.Site.split('.');
				let sta = scnl[0];
				site = Vlt.Stations.get(sta);
				chr = '*';
			}
			if(site) {
				pck.Lat = site.Lat;
				pck.Lon = site.Lon;
				pck.Elv = site.Elv;
				console.log(pck.Src + chr, stime, pck.Site, pck.Lat.toFixed(4), pck.Lon.toFixed(4));
				Svc.Dispatch(pck);
			} else {
				console.log(pck.Src + ' ', stime, pck.Site, 'Not on station list');
			}
		}

		function report(rpt) {
			console.log('..Sites/Report');
			Svc.Dispatch(rpt);
		}

	}
/*
	//-----------------------------------------------------Assemble
	// Assemble an array of the nearest N sites to a given
	// point (Lat, Lon)
	// Cmd: 'Assemble'
	// TBD: If Stations list present, select most frequent component
	//   Lat: <float> Latitude
	//   Lon: <float> Longitude
	//   N: Number of nearest stations
	//   Stations: [] >arrau pf stromgs? Camdodate SCM: (optional)
	//     [MWC, AAB, XYZ, ..., ]
	//   Networks: [] <array of strings>
	//     [NN,US,NC...]
	// Returns...
	//   Sites: {} <arrah of strings> SCNL of sites selected
	//     [MWC.NN.EHZ.--'
	function Assemble(com, fun) {
		console.log('==SiteList/Assemble');
		var Vlt = this.Vlt;
		var Slct = [];
		var N = com.N;
		var dotmin = 100;
		var dotmax = -100;
		var org = {Lat:com.Lat, Lon:com.Lon};
		Svc.ECEF(org);
		var X = org.X;
		var Y = org.Y;
		var Z = org.Z;
		var stations;
		var networks;
		if('Stations' in com)
			stations = com.Stations;
		if('Networks' in com)
			networks = com.Networks;
		var parts;
		Vlt.Sites.forEach(function(site) {
			if(stations || networks)
				parts = site.Site.split('.');
			if(stations && stations.indexOf[parts[0]] < 0)
				return;
			if(networks && networks.indexOf[parts[1]] < 0)
				return;
			addsite(site);
		});
//		console.log('Slct', Slct);
		com.Sites = [];
		for(var i=0; i<Slct.length; i++) {
			var slct = Slct[i];
			var site = Vlt.Sites.get(slct.Site);
			obj = {};
			obj.Site = site.Site;
			obj.Lat = site.Lat;
			obj.Lon = site.Lon;
			obj.Elv = site.Elv;
			obj.Dis = RAD2DEG*Math.acos(slct.Dot);
			if('Count' in site)
				obj.Count = site.Count;
			com.Sites.push(obj);
		}
//		console.log(JSON.stringify(com.Sites, null, 2));
		if(fun)
			fun(null, com);

		function addsite(site) {
			var obj = {};
			obj.Lat = site.Lat;
			obj.Lon = site.Lon;
			Svc.ECEF(obj);
			dot = X*obj.X + Y*obj.Y + Z*obj.Z;
			if(Slct.length < N) {
				add();
				return;
			}
			if(dot > dotmin)
				add();
			return;

			function add() {
				var slct = {};
				slct.Site = site.Site;
				slct.Dot = dot;
				Slct.push(slct);
				Slct.sort(function(a, b) {
					return b.Dot - a.Dot;
				});
				if(Slct.length > N)
					Slct.pop();
				dotmax = Slct[0].Dot;
				dotmin = Slct[Slct.length-1].Dot;
			}
		}
	}
*/
	//-----------------------------------------------------LInk
	// Add receiver to distro list
	function GetServices(com, fun) {
		console.log(' --Sites/GetServices');
		let Vlt = this.Vlt;
		com.Services = {};
		com.Services.GetSite = getsite;
		com.Services.SiteList = sitelist;
		if (fun)
			fun(null, com);

		// Retrieve information for a specific site
		function getsite(scnl) {
			let site = getSite(Vlt.Sites, scnl);
			if(site) {
				let obj = {};
				for(key in site)
					obj[key] = site[key];
				Svc.ECEF(obj);
				return obj;
			}
		}

		// Retrieve sorted list of stations from a given point
		// Inputs
		//   n: Number of sites in distance sorted list from nearest to furthest
		//   lat: Latitude of point
		//   lon: Longitude of point
		// Returns
		//   Array of sites in order of increasing distance
		function sitelist(n, lat, lon) {
			let geo = {};
			geo.Lat = lat;
			geo.Lon = lon;
			Svc.ECEF(geo);
			let sites = [];
			let site;
			for(let obj of Vlt.Sites.values()) {
				site = {};
				for(let attr in obj)
					site[attr] = obj[attr];
				site.Dot =  dot(site, geo);
				sites.push(site);
			}
			sites.sort(function(a, b) {
				if(a.Dot < b.Dot)
					return 1;
				if(a.Dot > b.Dot)
					return -1;
				return 0;
			});
			if(sites.length > n)
				sites.length = n;
			for(let i=0; i<sites.length; i++) {
				site = sites[i];
				site.Delta = 180.0*Math.acos(site.Dot)/Math.PI;
			}
			return sites;

			function dot(a, b) {
				return a.X*b.X + a.Y*b.Y + a.Z*b.Z;
			}
		}

		//-----------------------------------------------------getSite
		// Get site information by SCNL
		// scnl: <string> Site name in SCNL order
		//
		// Returns
		// Site: {
		//	Site: <string> SCNL
		//	Lat: <float> Geographic latitude
		//	Lon: <float> Geocentric longitude
		//	Elv: < float> Elevation (m)
		function getSite(scnl) {
			var Vlt = this.Vlt;
			var sites = Vlt.Sites;
			var site = getSite(sites, scnl);
			if(site) {
				return site;
			}
			console.log('Site <' + com.Site + '> unknwon');
		}

	}
/*
	//-----------------------------------------------------GetSiteList
	// Return a list of sites in com.SiteList that match
	// a user provided filter
	function GetSiteList(com, fun) {
		console.log('--SiteList/GetSiteList');
		let Vlt = this.Vlt;
		let sites = [];
		Vlt.Sites.forEach(function(site) {
			let scnl = site.Site.split('.');
			if('Networks' in com) {
				if(com.Networks.indexOf(scnl[2]) >= 0) {
					sites.push(site);
				//	console.log('Site', scnl, JSON.stringify(site));
				}
			}
		});
		com.SiteList = sites;
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Delta
	// Calculate distance for Hypo object in degrees
	// Cmd: "Delta"
	// Site: <string> SCNL
	// Lat: <float> Degrees
	// Lon: <float> Degrees
	// Returns
	// Dis: <float> Degrees
	function Delta() {
		var Vlt = this.Vlt;
		var sites = Vlt.Sites;
		var scnl = com.Site;
		var hyp = {};
		hyp.Lat = com.Lat;
		hyp.Lon = com.Lon;
		Svc.ECEF(hyp);
		var site = sites.get(scnl);
		if(!site) {
			console.log(' ** Unknown station' + scnl);
			if(fun)
				fun(null, com);
			return;
		}
		var dot = hyp.X*site.X + hyp.Y*site.Y + hyp.Z*site.Z;
		com.Dis = RAD2DEG * Math.acos(dot);
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Delta
	// Calculate distance for Hypo object in degrees
	function HypoDelta(com, fun) {
		var Vlt = this.Vlt;
		var sites = Vlt.Sites;
		var hyp = {};
		hyp.Lat = com.Lat;
		hyp.Lon = com.Lon;
		Svc.ECEF(hyp);
	//	console.log('hyp', hyp);
		var picks = com.Data;
		for(var i=0; i<picks.length; i++) {
			var pick = picks[i];
			var scnl = pick.Site;
		//	var site = sites.get(scnl);
			var site = getSite(sites, scnl);
			if(site) {
				var dot = hyp.X*site.X + hyp.Y*site.Y + hyp.Z*site.Z;
				pick.Dis = RAD2DEG*Math.acos(dot);
			}
		}
		if(fun)
			fun(null, com);
	}
*/
	//-----------------------------------------------------Setup
	function loadStationData(sitelists, fun) {
		console.log('--loadStationData');
		var Par = this.Par;
		var Vlt = this.Vlt;
		var fs = this.require('fs');
		var readline = this.require('readline');
		var async = this.require('async');
		let dir = Svc.GetArg('Data');
		console.log('Data', dir);
		async.eachSeries(sitelists, function(obj, func) {
			if('Use' in obj && !obj.Use) {
				func();
				return;
			}
			let path = dir + '/' + obj.Path;
			switch(obj.Format) {
			case 'Active':
				is(path, func);
				break;
			case 'NEIC':
				neic(path, func);
				break;
			case 'NCAL':
				ncal(path, func);
				break;
			case 'NN':
				nn(path, func);
				break;
			case 'SCSN':
				scsn(path, func);
				break;
			case 'PB':
				pb(path, func);
				break;
			case 'SCEDC':
				scedc(path, func);
				break;
			case 'ISC':
				isc(path, func);
				break;
			default:
				console.log(' ** ERR:Unknonw format -', obj.Format);
				func();
				break;
			}
		}, function(err) {
			Vlt.Sites.forEach(function(obj, site) {
				let scnl = site.split('.');
				let sta = scnl[0];
				Vlt.Stations.set(sta, obj);
			});
			if(fun)
				fun(err);
		});

		function test() {
			console.log('Confused Koala');
			let str = 'Dizzy Sauirrel\n';
			let r;
			let r2;
			let del;
/*			for(del=0; del<=10; del+=1) {
				let drad = Math.PI*del/180;
				r = 2*Math.sin(drad/2);
				r2 = r*r;
				str += 'Delta:' + del + ', ' + r2.toFixed(4) + '\n';
			} */
			let c = 1.0;
			let b = 0.001;
			let a = (1+4*b)*(1000-4*c)/(4*b);
			let denom = 1 - 1/(1+4*b) + 1/(1 + b*(1000-4));
			a = (1000 - 4*c)/denom;
			str += 'a:' + a.toFixed(4) + '\n';
			str += 'b:' + b.toFixed(4) + '\n';
			str += 'c:' + c.toFixed(4) + '\n';
			for(del=0; del<180; del+=1) {
				let drad = Math.PI*del/180.0;
				r = 2*Math.sin(drad/2);
				r2 = r*r;
				let x = a*b*r2/(1+b*r2) + c*r2;
				x += a/(1+b*(1000-r2));
				let q = r2*180/4;
				str += del.toFixed(2) + ' ' + q.toFixed(2) + ' ' + r2.toFixed(6) + ' ' + x.toFixed(2) + '\n';
			}

/*			for(let ix = 0; ix<1000; ix++) {
				r2 = 0.000004*ix*ix;
				r = Math.sqrt(r2);
				del = 180*2*Math.asin(0.5*r)/Math.PI;
				console.log(ix, r.toFixed(2), del.toFixed(2));
				str += ix + ' ' + r.toFixed(4) + ' ' + del.toFixed(4) + '\n';
			} */
			console.log(str);
		}

		function is(path, func) {
			console.log('..nn');
			var nline = 0;
			var rl = readline.createInterface({
				input: fs.createReadStream(path)
			});

			rl.on('line', function (line) {
				//	var obj = JSON.parse(line);
				//	//	console.log(JSON.stringify(obj, null, 2));
				var parts = line.split(',');
				let site = {};
				site.Site = parts[0];
				site.Lat = parseFloat(parts[1]);
				site.Lon = parseFloat(parts[2]);
				site.Elv = parseInt(parts[3]);
				//	console.log(site);
				Svc.ECEF(site);
				Vlt.Sites.set(site.Site, site);
				nline++;
				//	if(nline < 4)
				//		console.log(JSON.stringify(site, null, 2));
			});

			rl.on('close', function () {
				console.log(nline, 'stations processed');
				func();
			});
		}

		function neic(path, func) {
			console.log('..neic');
			var nline = 0;
			var rl = readline.createInterface({
				input: fs.createReadStream(path)
			});

			rl.on('line', function (line) {
			//	console.log(line);
				var obj = JSON.parse(line);
			//	console.log(JSON.stringify(obj, null, 2));
				var site = {};
				site.Site = obj.Site;
				site.Lat = obj.Lat;
				site.Lon = obj.Lon;
				site.Elv = obj.Elv;
				Svc.ECEF(site);
				Vlt.Sites.set(site.Site, site);
				nline++;
				if(nline < 4)
					console.log(JSON.stringify(site, null, 2));
			});

			rl.on('close', function () {
				console.log(nline, 'stations processed');
				func();
			});
		}

		function ncal(path, func) {
			console.log('..ncal');
			var nline = 0;
			var rl = readline.createInterface({
				input: fs.createReadStream(path)
			});

			rl.on('line', function (line) {
			//	var obj = JSON.parse(line);
			//	//	console.log(JSON.stringify(obj, null, 2));
				var site = {};
				var n = line.substr(0,2);
				var s = line.substr(3,5).trim();
				var l = line.substr(9,2);
				var c = line.substr(12,3);
				var scnl = s + '.' + c + '.' + n + '.' + l;
				site.Site = scnl;
				site.Lat = parseFloat(line.substr(39,8));
				site.Lon = parseFloat(line.substr(48,9));
				site.Elv = parseInt(line.substr(58,4));
			//	console.log(site);
				Svc.ECEF(site);
				Vlt.Sites.set(site.Site, site);
				nline++;
				if(nline < 4)
					console.log(JSON.stringify(site, null, 2));
			});

			rl.on('close', function () {
				console.log(nline, 'stations processed');
				func();
			});
		}

		function nn(path, func) {
			console.log('..nn');
			var nline = 0;
			var rl = readline.createInterface({
				input: fs.createReadStream(path)
			});

			rl.on('line', function (line) {
				//	var obj = JSON.parse(line);
				//	//	console.log(JSON.stringify(obj, null, 2));
				var parts = line.split(',');
				var site = {};
				var n = parts[1];
				var s = parts[0];
				var l = '*';
				var c = '*';
				var scnl = s + '.' + c + '.' + n + '.' + l;
				site.Site = scnl;
				site.Lat = parseFloat(parts[2]);
				site.Lon = parseFloat(parts[3]);
				site.Elv = parseInt(parts[4]);
			//	console.log(site);
				Svc.ECEF(site);
				Vlt.Sites.set(site.Site, site);
				nline++;
			//	if(nline < 4)
			//		console.log(JSON.stringify(site, null, 2));
			});

			rl.on('close', function () {
				console.log(nline, 'stations processed');
				func();
			});
		}

		// Generic csv format site,lat,lon,elev (elev optional)
		function pb(path, func) {
			console.log('..pb');
			var nline = 0;
			var rl = readline.createInterface({
				input: fs.createReadStream(path)
			});

			rl.on('line', function (line) {
				//	var obj = JSON.parse(line);
				//	//	console.log(JSON.stringify(obj, null, 2));
				var parts = line.split(',');
				var site = {};
				site.Site = parts[0] + '.EHZ.PB.--';
				site.Lat = parseFloat(parts[1]);
				site.Lon = parseFloat(parts[2]);
				if(parts.length > 3)
					site.Elv = parseInt(parts[3]);
			//	console.log(site);
				Svc.ECEF(site);
				Vlt.Sites.set(site.Site, site);
				nline++;
				if(nline < 4)
					console.log(JSON.stringify(site, null, 2));
			});

			rl.on('close', function () {
				console.log(nline, 'stations processed');
				func();
			});
		}

		function scsn(path, func) {
			console.log('..scsn');
			var nline = 0;
			var rl = readline.createInterface({
				input: fs.createReadStream(path)
			});

			rl.on('line', function (line) {
				//	var obj = JSON.parse(line);
				//	//	console.log(JSON.stringify(obj, null, 2));
				if(line.charAt(0) == '#') {
					return;
				}
				var site = {};
				var n = line.substr(0,2);
				var s = line.substr(4,5).trim();
				var l = line.substr(15,2);
				var c = line.substr(10,3);
				var scnl = s + '.' + c + '.' + n + '.' + l;
				site.Site = scnl;
				site.Lat = parseFloat(line.substr(50,9));
				site.Lon = parseFloat(line.substr(60,10));
				site.Elv = parseInt(line.substr(71,5));
			//	console.log(site);
				Svc.ECEF(site);
				Vlt.Sites.set(site.Site, site);
				nline++;
				if(nline < 4)
					console.log(JSON.stringify(site, null, 2));
			});

			rl.on('close', function () {
				console.log(nline, 'stations processed');
				func();
			});

		}

		function scedc(path, func) {
			console.log('..scedc');
			var nline = 0;
			var rl = readline.createInterface({
				input: fs.createReadStream(path)
			});

			rl.on('line', function (line) {
				//	var obj = JSON.parse(line);
				//	//	console.log(JSON.stringify(obj, null, 2));
				if(line.charAt(0) === '#')
					return;
				var site = {};
				var n = line.substr(0,2);
				var s = line.substr(4,5).trim();
				var c = line.substr(10,3);
				var l = line.substr(15,2);
				var scnl = s + '.' + c + '.' + n + '.' + l;
				site.Site = scnl;
				site.Lat = parseFloat(line.substr(50,9));
				site.Lon = parseFloat(line.substr(60,10));
				site.Elv = parseInt(line.substr(71,5));
				site.Desc = line.substr(18,32).trim();
				//	console.log(site);
				Svc.ECEF(site);
				Vlt.Sites.set(site.Site, site);
				nline++;
				if(nline < 4)
					console.log(JSON.stringify(site, null, 2));
			});

			rl.on('close', function () {
				console.log(nline, 'stations processed');
				func();
			});
		}

		function isc(path, func) {
			let count = 0;
			let maxcnt = 1000;
			let state = 0;
			let data = fs.readFileSync(path);
			if(data) {
				parse(data.toString());
			} else {
				log.e(' ** ISC:Cannot read file', path);
			}

			function parse(data) {
				var htmlparser = require("htmlparser2");
				var parser = new htmlparser.Parser({
					onopentag: function(name, attribs){
						let keys = Object.keys(attribs);
						if(name === 'a' && keys.length === 1 && keys[0] === 'href') {
							state = 1;
						}
					},
					ontext: function(text){
						let bad = false;
						switch(state) {
						case 1:
							site = text;
							state = 2;
							break;
						case 2:
							let parts = text.split('\n');
							if(parts.length > 1) {
								let loc1 = parts[0].substr(0, 54).trim();
								let loc2 = parts[1].trim();
								let loc = loc1 + ', ' + loc2;
								let lat = parseFloat(text.substr(53, 10));
								if(lat < -90 || lat > 90)
									bad = true;
								let lon = parseFloat(text.substr(64, 10));
								if(lon < -180 || lon > 180)
									bad = true;
								let elv = parseFloat(text.substr(77,7));
								if(!elv)
									elv = 0.0;
							//	if(count < maxcnt || bad) {
							//		if(bad)
							//			console.log(count, site, lat, lon, elv, loc, '***** BAD *****');
							//		else
							//			console.log(count, site, lat, lon, elv, loc);
							//	}
								if(!bad) {
									let sta = {};
									sta.Site = site;
									sta.Lat = lat;
									sta.Lon = lon;
									sta.Elv = elv;
									sta.Loc = loc;
									//	console.log(site);
									Svc.ECEF(sta);
									Vlt.Stations.set(site, sta);
								}
							} else {
							//	console.log(' ** Bad parts', parts.length);
							//	for(let j=0; j<parts.length; j++)
							//		console.log(j, '[' + parts[j] + ']');
							}
							state = 0;
							break;
						}
				},
					onclosetag: function(tagname){
						count++;
					}
				}, {decodeEntities: true});
				parser.write(data);
				parser.end();
				console.log('count', count);
				func();
			}
		}

	}

})();
