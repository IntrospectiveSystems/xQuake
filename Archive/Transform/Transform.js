//# sourceURL=Transform.js
(function Transform() {
//	const printf = require('printf');
	const fs = require('fs');

	var Brick;		// File name of current brick (24 char hex)
	var iOff;		// Offset in bytes in current brick
	var iOffMax;	// Maximum brick size (bytes)
	var nOut;
	var Log;
	var nTotal;
	var nInput;
	var T1;
	var T2;
	var Fd;

	//-----------------------------------------------------dispatch
	var dispatch = {
		Setup: Setup,
		Start: Start
	};

	return {
		dispatch: dispatch
	};

	async function Setup(com, fun) {
		console.log('--Transform/Setup');
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Start
	async function Start(com, fun) {
		console.log('--Transform/Start');
		let Par = this.Par;
		let that = this;
		if('BrickSize' in Par)
			iOffMax = Par.BrickSize;
		else
			iOffMax = 100000000;
		let dirIn = Par.From;
		let dirOut = Par.To;
		let iSerial = 0;
		nTotal = 0;
		nInput = 0;
		let str;
		Log = dirOut + '/' + 'Journal.log';
		newBrick.call(that);
		let dt = new Date();
		str = encode(0.001*dt.getTime()).substr(0, 14);
		str += ':------------------------------------------------------------';
		Logger(str);
		let files = fs.readdirSync(dirIn);
		for(ifile=0; ifile<files.length; ifile++) {
			let file = files[ifile];
			let parts = file.split('.');
			if(parts.length < 2 || parts[parts.length-1] !== 'brick') {
				continue;
			}
			console.log('>>>>', file);
			let t1 = new Date().getTime();
			await brick(file);
			let t2 = new Date().getTime();
			console.log('    ', file, 'Processed in', 0.001*(t2-t1));
		}
		if(Fd) {
			close();
		}
		if(fun)
			fun(null, com);
		
		async function brick(file) {
			let path = dirIn + '/' + file;
			let nrd = 0;
			let line;
			let rdlines = require('n-readlines');
			return new Promise(async (resolve, _reject) => {				
				const rd = new rdlines(path);
				while (line = rd.next()) {
					nrd++;
					nInput++;
					let obj = JSON.parse(line);
					if('Pid' in obj) {
						delete obj.Pid;
					}
					await message(obj);
				}
				console.log('nrd', nrd);
				resolve();
			});
		}
	
		async function message(msg) {
			return new Promise(async (resolve, _reject) => {				
				let dt = new Date(msg.Time);
				let t = dt.getTime();
				dx = new Date(t);
				let stime = t.toString();
				let time = parseFloat(stime.substr(0, 10) + '.' + stime.substr(10));
				if(time < T1) {
					T1 = time;
				}
				if(time > T2) {
					T2 = time;
				}
				nOut++;
				nTotal ++;
	
				let datum = {};
				datum.Type = 'Datum';
	//					datum.Serial = iSerial++;
				datum.T = time;
				datum.Format = 'ANSS';
				datum.Encoding = 'JSON';
				datum.Datum = msg;
				await output(datum);
	
				let site = msg.Site.Station + '.' + msg.Site.Channel + '.' + msg.Site.Network + '.';
				if('Location' in msg.Site)
					site += msg.Site.Location;
				else
					site += '--';
				let pck = {};
				pck.Type = 'Pick';
	//			pck.Serial = iSerial++;
				pck.T = time;
				if('Source' in msg) {
					pck.Source = msg.Source.AgencyID;
				}
				pck.Provenance = [datum.Pid];
				pck.Site = site;
				await output(pck);
				if(iOff > iOffMax) {
					await newBrick.call(that);
				}
				resolve();
			});

		}
		
		async function output(obj) {
			return new Promise((resolve, _reject) => {
				obj.Pid = genpid();
				var rec = JSON.stringify(obj) + '\n';
				iOff += rec.length;
				fs.write(Fd, rec, async function(err, _nwrite, _str) {
					if(err) {
						console.log(' ** Error in write:' + err);
						process.exit(13);
					}
//					console.log(obj.Type, rec.length, nwrite, err);
					resolve();
				})
			});
		}

		//-----------------------------------------------------newBrick
		async function newBrick() {
			if(Fd) {
				close();
			}
			var Par = this.Par;
			Brick = this.genPid().substr(0, 24);
			console.log('<<<<', Brick + '.brick');
			Par.Brick = Brick;
			iOff = 0;
			var path = dirOut + '/' + Brick + '.brick';
			Fd = fs.openSync(path, 'w');
			nOut = 0;
			T1 = 1.0e30;
			T2 = 0;
		}

		function close() {
			console.log('///close');
			fs.closeSync(Fd);
			let s = Brick + ' ' + encode(T1) + ' ' + encode(T2)
				+ ' N:' + nOut + ' Input:' + nInput + ' Total:' + nTotal + ' Size:' + iOff;
			Logger(s);
			Fd = null;
		}

		//-----------------------------------------------------genpid
		function genpid() {
			let hex = iOff.toString(16).toUpperCase();
			let tmp = '00000000' + hex;
			let pid = Brick + tmp.substr(-8);
			return pid;
		}
		
	}

	//-----------------------------------------------------Logger
	function Logger(str) {
		console.log(str);
		fs.appendFileSync(Log, str + '\n');
	}

	//-----------------------------------------------------encode
	// Opposite of encode()
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

})();