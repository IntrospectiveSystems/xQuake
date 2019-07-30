//# sourceURL=Sites
(function Site() {
	var RAD2DEG  = 57.29577951308;
	var DEG2RAD = 0.01745329251994;
	var TWOPI = 6.283185307179586;

	//-----------------------------------------------------dispatch
	var dispatch = {
		Setup: Setup,
		Start: Start,
		GetServices: GetServices,
		GetSite: GetSite,
	};

	return {
		dispatch: dispatch
	};

	function getSite(sites, scnl) {
		var site = sites.get(scnl);
		if(!site) {
			var parts = scnl.split('.');
			var scnl2 = parts[0] + '.*.' + parts[2] + '.*';
			site = sites.get(scnl2);
		//	console.log(scnl, '=>', scnl2, site);
		}
		return site;
	}

	//-----------------------------------------------------vector
	// Calculate geocentric unit vector from geographic
	// latitude and longitude
	function vector(obj) {
		var lat = Math.atan(0.993277*Math.tan(DEG2RAD*obj.Lat));
		var lon = DEG2RAD*obj.Lon;
		obj.Z = Math.sin(lat);
		var rxy = Math.cos(lat);
		obj.X = rxy*Math.cos(lon);
		obj.Y = rxy*Math.sin(lon);
	}

	//-----------------------------------------------------Setup
	function Setup(com, fun) {
		console.log('--Site/Setup');
		var Par = this.Par;
		var Vlt = this.Vlt;
		Vlt.Sites = new Map();
		var fs = this.require('fs');
		var readline = this.require('readline');
		console.log('Par', JSON.stringify(Par, null, 2));
		var nline = 0;
		let path = 'site.txt';
		var rl = readline.createInterface({
			input: fs.createReadStream(path)
		});

		rl.on('line', function (line) {
			//	var obj = JSON.parse(line);
			//	//	console.log(JSON.stringify(obj, null, 2));
			var parts = line.split(/\s+/);
			console.log(nline, JSON.stringify(parts));
		//	let site = {};
		//	site.Site = parts[0];
		//	site.Lat = parseFloat(parts[1]);
		//	site.Lon = parseFloat(parts[2]);
		//	site.Elv = parseInt(parts[3]);
			//	console.log(site);
		//	vector(site);
		//	Vlt.Sites.set(site.Site, site);
			nline++;
			//	if(nline < 4)
			//		console.log(JSON.stringify(site, null, 2));
		});

		rl.on('close', function () {
			console.log(nline, 'stations processed');
			fun();
		});
	}

	//-----------------------------------------------------Start
	function Start(com, fun) {
		console.log("--Site/Start");
		var Par = this.Par;
		let Vlt = this.Vlt;
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------LInk
	// Add receiver to distro list
	function GetServices(com, fun) {
		console.log(' --Services/GetServices');
		let Vlt = this.Vlt;
		com.Services = {};
		com.Services.GetSite = getsite;
		if (fun)
			fun(null, com);

		// Retrieve information for a specific site
		function getsite(scnl) {
			let site = getSite(Vlt.Sites, scnl);
			if(site) {
				let obj = {};
				for(key in site)
					obj[key] = site[key];
				vector(obj);
				return obj;
			}
		}
	}

	//-----------------------------------------------------getSite
	// Get site information by SCNL
	// Cmd: getSite
	// SCNL: <string> Site name in SCNL order
	//
	// Returns
	// Site: {
	//	Site: <string> SCNL
	//	Lat: <float> Geographic latitude
	//	Lon: <float> Geocentric longitude
	//	Elv: < float> Elevation (m)
	function GetSite(com, fun) {
		var Vlt = this.Vlt;
		var sites = Vlt.Sites;
		var site = getSite(sites, com.Site);
		if(site) {
			com.Lat = site.Lat;
			com.Lon = site.Lon;
			com.Elv = site.Elv;
			vector(com);
			if(fun)
				fun(null, com);
			return;
		}
	//	console.log('Site <' + com.Site + '> unknwon');
		if(fun)
			fun('Unknonw');
	}

})();
