//# sourceURL=Sift
(function Sift() {

	//-----------------------------------------------------dispatch
	var dispatch = {
		Setup: Setup,
		Start: Start
	};

	return {
		dispatch: dispatch
	};

	//-----------------------------------------------------decode
	// Convert NEIC time format to seconds
	// Node.js Date routine assumes time is being set in
	// local time zone, so the time zone is subtracted
	// to provide correct UTC value. This may seem reversed.
	function decode(str) {
		var yr = parseInt(str.substr(0, 4));
		var mo = parseInt(str.substr(4, 2))-1;
		var da = parseInt(str.substr(6, 2));
		var hr = parseInt(str.substr(8, 2));
		var mn = parseInt(str.substr(10, 2));
		var sx = 0;
		var sc = 0;
		var ms = 0;
		if (str.length > 12) {
			sx = parseFloat(str.substr(12, 6));
			sc = Math.floor(sx);
			ms = Math.floor(1000.0 * (sx - sc));
		}
		var dt = new Date(yr, mo, da, hr, mn, sc, ms);
		var tzoff = 60000 *dt.getTimezoneOffset(); // (msec)
		var t = dt.getTime() - tzoff;
		//	var chk = encode(t);
		//	console.log('Check', str, chk);
		return t;
	}

	//-----------------------------------------------------encode
	// Opposite of encode()
	function encode(t) {
		var dt = new Date(t);
		var yr = dt.getUTCFullYear();
		var mo = dt.getUTCMonth() + 1;
		var da = dt.getUTCDate();
		var hr = dt.getUTCHours();
		var mn = dt.getUTCMinutes();
		var sc = dt.getUTCSeconds();
		var ms = dt.getUTCMilliseconds();
		var s = '';
		s += yr;
		if (mo < 10)
			s += '0';
		s += mo;
		if (da < 10)
			s += '0';
		s += da;
		if (hr < 10)
			s += '0';
		s += hr;
		if (mn < 10)
			s += '0';
		s += mn;
		if (sc < 10)
			s += '0';
		s += sc;
		s += '.';
		if (ms < 10)
			s += '00';
		else
		if (s < 100)
			s += '0';
		s += ms;
		if (s.length < 18)
			s += '0';
		return s;
	}

	//-----------------------------------------------------Setup
	function Setup(com, fun) {
		console.log("--Sift/Setup");
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Logger
	function Logger(str) {
		console.log(str);
		var path = this.Par.Archive + '/journal.txt';
		var fs = this.require('fs');
		fs.appendFileSync(path, str + '\n');
	}

	//-----------------------------------------------------Start
	function Start(com, fun) {
		console.log("--Sift/Start");
		var Par = this.Par;
		var that = this;
		var fs = this.require('fs');
		var async = this.require('async');
		var readline = this.require('readline');
		var dir = Par.Archive;
		var YrMo = {};
		var nline = 0;
		console.log('dir', dir);
		var files = fs.readdirSync(dir);
		let Sites = {};
		let Sort = [];
		let nSites = 0;
		async.eachSeries(files, function(file, func) {
			var path = dir + '/' + file;
			if (fs.lstatSync(path).isDirectory()) {
				func();
				return;
			}
			var parts = file.split('.');
			if(parts.length !== 2) {
				func();
				return;
			}
			if(parts[1] !== 'brick') {
				func();
				return;
			}
			console.log('File:' + file);
			brick(path, func);
		}, sites);

		function sites(err) {
			let keys = Object.keys(Sites);
			nSites = keys.length;
			async.eachSeries(keys, function(key, func) {
				var obj = Sites[key];
				var q = {};
				q.Cmd = 'GetSite';
				q.Site = obj.Site;
				that.send(q, Par.Sites, function(err, r) {
					if(err) {
					//	console.log('err', err);
						console.log(obj.Site, obj.N, 'not on station list');
						async.setImmediate(function() {
							func(null);
						});
					} else {
						obj.Lat = r.Lat;
						obj.Lon = r.Lon;
						obj.Elv = r.Elv;
						obj.X = r.X;
						obj.Y = r.Y;
						obj.Z = r.Z;
						Sort.push(obj);
						func(null);
					}
				});
			}, sift);
		}

		function sift(err) {
			network();
			let str = '';
			for(var i=0; i<Sort.length; i++) {
				var obj = Sort[i];
				console.log(obj.Site, obj.N);
				str += obj.Site + ',';
				str += obj.Lat.toFixed(4) + ',' + obj.Lon.toFixed(4) + ',' + obj.Elv.toFixed(2) + ',';
				str += obj.X.toFixed(8) + ',' + obj.Y.toFixed(8) + ',' + obj.Z.toFixed(8) + ',';
				str += obj.N + '\n';
			}
			fs.writeFileSync('ActiveStations.csv', str);
			console.log(nSites, 'active sites');
			console.log(Sort.length, 'on station list');
			console.log(nSites - Sort.length, 'not found');
			console.log(nline, 'items scaned');
			if(fun)
				fun(null, com);

			function count() {
				Sort.sort(function(a, b) {
					if(a.N > b.N)
						return 1;
					if(a.N < b.N)
						return -1;
					return 0;
				});
			}

			function network() {
				Sort.sort(function(a, b) {
					if(a.Network > b.Network)
						return 1;
					if(a.Network < b.Network)
						return -1;
					return 0;
				});
			}
		}

		function brick(path, func)  {
			var obj;
			var q;
			var obj;
			var rd = readline.createInterface({
				input: fs.createReadStream(path)
			});
			rd.on('line', function(line) {
				jsn = JSON.parse(line);
				var dt = new Date(jsn.Time);
				var t = dt.getTime();
				var site = jsn.Site;
				var loc = '--';
				if('Location' in site)
					loc = site.Location;
				let scnl = site.Station + '.' + site.Channel + '.' + site.Network + '.' + loc;
				if(scnl in Sites) {
					obj = Sites[scnl];
					obj.N++;
					if(t < obj.T1)
						obj.T1 = jsn.Time;
					if(t > obj.T2)
						obj.T2 = jsn.Time;
				} else {
					obj = {};
					obj.Site = scnl;
					obj.Network = site.Network;
					obj.N = 1;
					obj.T1 = t;
					obj.T2 = t;
					Sites[scnl] = obj;
				}
				nline++;
			});
			rd.on('close', function() {
				func();
			})
		}
	}

})();
