//# sourceURL=Index
(function Index() {

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
//		var dt = new Date(yr, mo, da, hr, mn, sc, ms);
//		var tzoff = 60000 *dt.getTimezoneOffset(); // (msec)
//		var t = dt.getTime() - tzoff;
		var t = 0.001 * Date.UTC(yr, mo, da, hr, mn, sc, ms);
		//	var chk = encode(t);
		//	console.log('Check', str, chk);
		return t;
	}

	//-----------------------------------------------------encode
	// Opposite of decode()
	function encode(t) {
		var dt = new Date(1000*t);
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
		console.log("--Index/Setup");
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
		console.log("--Index/Start");
		let fs = this.require('fs');
		let rdlines = require('n-readlines');
		let Par = this.Par;
		let dir = Par.Archive;
		let YrMo = {};
		let YrMoDa = {};
		let Index = [];
		console.log('dir', dir);

		// Scanning all bricks and organizing by year and month
		let files = fs.readdirSync(dir);
		for(let ifile=0; ifile<files.length; ifile++) {
			let file = files[ifile];
			var path = dir + '/' + file;
			if (fs.lstatSync(path).isDirectory()) {
				continue;
			}
			var parts = file.split('.');
			if(parts.length !== 2) {
				continue;
			}
			if(parts[1] !== 'brick') {
				continue;
			}
			brick1(path);
			console.log(JSON.stringify(YrMo, null, 2));
		}

		// Assemble entries and write out YrMo epoch files
		for(let key in YrMo) {
			Index = [];
			let yrmo = YrMo[key];
			let bricks = yrmo.Bricks;
			for(let ibrick=0; ibrick<bricks.length; ibrick++) {
				let brick = bricks[ibrick];
			//	let path = dir + '/' + brick;
				brick2(brick, key);
			}
			Index.sort(function (a, b) {
				return a.T - b.T;
			});
			var sindex = JSON.stringify(Index, null, 2);
			var path = Par.Archive + '/' + key + '.epoch';
			console.log('File info:', path, sindex.length);
			fs.writeFileSync(path, sindex);
		}

		// Create Index summary
		console.log('All done');
		let kind = Object.keys(YrMoDa);
		kind.sort(function (a, b) {
			return a.T - b.T;
		});
		let str = '';
		for(var i=0; i<kind.length; i++) {
			let k = kind[i];
			str += k + ' ' + YrMoDa[k] + '\n';
		}
		var path = dir + '/Index.txt';
		fs.writeFileSync(path, str);		

		if(fun) {
			fun(null, com);
		}

		async function brick1(path) {
			console.log('Path:' + path);
			let q;
			let nline = 0;
			const rd = new rdlines(path);
			while (line = rd.next()) {
				obj = JSON.parse(line);
				if(obj.Type !== 'Pick') {
					continue;
				}
				var yrmo = encode(obj.T).substr(0, 6);
				if(!(yrmo in YrMo)) {
					q = {};
					q.Bricks = [];
					q.N = 0;
					YrMo[yrmo] = q;
				}
				q = YrMo[yrmo];
				if(q.Bricks.indexOf(path) < 0)
					q.Bricks.push(path);
				q.N++;
				var yrmoda = encode(obj.T).substr(0, 8);
				if(yrmoda in YrMoDa) {
					YrMoDa[yrmoda]++;
				} else {
					YrMoDa[yrmoda] = 1;
				}
				nline++;
			}
		}

		// Scan all bricks that have data for YrMo.epoch
		function brick2(path, key) {
			console.log('brick2', path, key);
			let nbrk = 0;
			const rd = new rdlines(path);
			while (line = rd.next()) {
				let obj = JSON.parse(line);
				if(obj.Type !== 'Pick') {
					continue;
				}
				let t = obj.T;
				let yrmo = encode(t).substr(0,6);
				if(yrmo === key) {
					var q = {};
					let sss = t.toFixed(3);
					q.T = parseFloat(sss);
					q.Pid = obj.Pid;
					Index.push(q);
					nbrk++
				}
			}
			console.log('  Brick:' + path, nbrk);
		}

	}
/*
	function StartXXX(com, fun) {
		console.log("--Index/Start");
		var fs = this.require('fs');
		var async = this.require('async');
		var readline = this.require('readline');
		var Par = this.Par;
		var dir = Par.Archive;
		var YrMo = {};
		var YrMoDa = {};
		console.log('dir', dir);
		var files = fs.readdirSync(dir);
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
			console.log('File:' + path);
			brick(path, func);
		}, function(_err) {
			console.log(JSON.stringify(YrMo, null, 2));
			index();
		});

		function brick(path, func)  {
			var nline = 0;
			var obj;
			var q;
			var rd = readline.createInterface({
				input: fs.createReadStream(path)
				obj = JSON.parse(line);
				if(obj.Type !== 'Pick') {
					return;
				}
//				var dt = new Date(obj.Time);
//				var yrmo = encode(dt.getTime()).substr(0, 6);
				var yrmo = encode(obj.T).substr(0, 6);
				if(!(yrmo in YrMo)) {
					q = {};
					q.Bricks = [];
					q.N = 0;
					YrMo[yrmo] = q;
				}
				q = YrMo[yrmo];
				if(q.Bricks.indexOf(path) < 0)
					q.Bricks.push(path);
				q.N++;
//				var yrmoda = encode(dt.getTime()).substr(0, 8);
				var yrmoda = encode(obj.T).substr(0, 8);
				if(yrmoda in YrMoDa) {
					YrMoDa[yrmoda]++;
				} else {
					YrMoDa[yrmoda] = 1;
				}
				nline++;
			});
			rd.on('line', function(line) {
				obj = JSON.parse(line);
				if(obj.Type !== 'Pick') {
					return;
				}
//				var dt = new Date(obj.Time);
//				var yrmo = encode(dt.getTime()).substr(0, 6);
				var yrmo = encode(obj.T).substr(0, 6);
				if(!(yrmo in YrMo)) {
					q = {};
					q.Bricks = [];
					q.N = 0;
					YrMo[yrmo] = q;
				}
				q = YrMo[yrmo];
				if(q.Bricks.indexOf(path) < 0)
					q.Bricks.push(path);
				q.N++;
//				var yrmoda = encode(dt.getTime()).substr(0, 8);
				var yrmoda = encode(obj.T).substr(0, 8);
				if(yrmoda in YrMoDa) {
					YrMoDa[yrmoda]++;
				} else {
					YrMoDa[yrmoda] = 1;
				}
				nline++;
			});
			rd.on('close', function() {
				console.log(nline, 'items in brick');
				func();
			})
		}

		function index() {
			var Index = [];
			var Key;
			var keys = Object.keys(YrMo);
			var bricks;
			async.eachSeries(keys, function(key, func) {
				console.log('\n------------------------------------------------------------');
				Key = key
				Index = [];
				bricks = YrMo[key].Bricks;
				async.eachSeries(bricks, brick, function(err) {
					Index.sort(function (a, b) {
						return a.T - b.T;
					});
					console.log('Epoch:' + Key, Index.length);
//					for(var i=0; i<10; i++) {
//						var obj = Index[i];
//						console.log(i, encode(Math.round(1000*obj.T)), obj.Pid);
//						console.log(i, (obj.T).toFixed(2), obj.Pid);
//					}
					var str = JSON.stringify(Index, null, 2);
//					var path = Par.Archive + '/' + Key + '.epoch';
					var path = Par.Archive + '/' + Key + '.epoch';
					console.log('File info:', path, str.length);
					fs.writeFileSync(path, str);
					console.log('------------------------------------------------------------\n');
					func();
				});
			},
			function(_err) {
				console.log('All done');
				let kind = Object.keys(YrMoDa);
				kind.sort(function (a, b) {
					return a.T - b.T;
				});
				let str = '';
				for(var i=0; i<kind.length; i++) {
					let k = kind[i];
					str += k + ' ' + YrMoDa[k] + '\n';
				}
				var path = dir + '/Index.txt';
				fs.writeFileSync(path, str);		
				if(fun)
					fun(null, com);
			});

			function brick(path, func) {
				let nbrk = 0;
				var rd = readline.createInterface({
					input: fs.createReadStream(path)
				});
				rd.on('line', function(line) {
					obj = JSON.parse(line);
					if(obj.Type !== 'Pick') {
						return;
					}
//					var dt = new Date(obj.Time);
//					var t = dt.getTime();
					let t = obj.T;
					yrmo = encode(t).substr(0,6);
					if(yrmo == Key) {
						var q = {};
						let sss = t.toFixed(3);
						q.T = parseFloat(sss);
						q.Pid = obj.Pid;
						Index.push(q);
						nbrk++
					}
				});
				rd.on('close', function() {
					console.log('  Brick:' + path, nbrk);
					func();
				})
			}
		}
	}
*/
})();
