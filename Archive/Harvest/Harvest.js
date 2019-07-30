//# sourceURL=Harvest.js
(function Harvest() {
	var Topics;
	var Done;
	var Brick;		// File name of current brick (24 char hex)
	var First;		// First offset in topic
	var Last; 		// Lsat offset in topic
	var Offset;		// Current offset in Kafka topic
	var iOff;		// Offset in bytes in current brick
	var iOffMax;	// Maximum brick size (bytes)
	var nOut;
	var Log;
	var nIgnore;
	var nTotal;
	var nLost;
	var T1;
	var T2;
	var Fd;
	var fs;

	//-----------------------------------------------------dispatch
	var dispatch = {
		Setup: Setup,
		Start: Start,
		Message: Message
	};

	return {
		dispatch: dispatch
	};

	async function Setup(com, fun) {
		console.log('--Harvest/Setup');
		if(fun)
			fun(null, com);
	}

	function Start(com, fun) {
		log.v('--Harvest/Start');
		var Par = this.Par;
		Done = false;
		Log = Par.Chron + '/' + 'Journal.log';
		Topics = {};
		nOut = 0;
		nIgnore = 0;
		nTotal = 0;
		nLost = 0;
		T1 = 1.0e30;
		T2 = 0;
		var that = this;
		fs = this.require('fs');
		var printf = this.require('printf');
		var dt = new Date();
		var str = encode(dt.getTime()).substr(0, 14);
		str += ':------------------------------------------------------------';
		Logger(str);
		var connect = {};
		connect.Cmd = 'Connect';
		this.send(connect, Par.Kafka, function(err, r) {
			if('Topics' in r) {
				Topics = r.Topics;
				console.log('Topics', JSON.stringify(r.Topics, null, 2));
				for(var key in r.Topics) {
					var obj = r.Topics[key];
					str = printf('%20s%10d%10d', key, obj.First, obj.Last);
					Logger(str);
				}
			}
			console.log('Harvest/Par', JSON.stringify(Par, null, 2));
			var topic;
			if('Topic' in Par && Par.Topic in Topics) {
				topic = Topics[Par.Topic];
				First = topic.First;
				Last = topic.Last-1;
//				Last = First + 10; // KLUDGE KLUDGE KLUDGE KLUDGE KLUDGE
			} else {
				Logger(' ** No topic <' + Par.Topic + '> found on Kafka broker');
				fun('Topic not found');
				return;
			}
			if('BrickSize' in Par)
				iOffMax = Par.BrickSize;
			else
				iOffMax = 400000; // During testing only
//			iOffMax = 2000; // KLUDGE KLUDGE KLUDGE KLUDGE KLUDGE KLUDGE
			if('Brick' in Par) {
				Brick = Par.Brick;
				Offset = Par.Offset + 1;
//				Last = Offset + 10; // KLUDGE KLUDGE KLUDGE KLUDGE KLUDGE
				if(Offset < First)
					nLost = First - Offset;
				iOff = Par.iOff;
				var path = Par.Chron + '/' + Brick + '.brick';
				if(fs.existsSync(path)) {
					var stat = fs.statSync(path);
					if(iOff > stat.size) {
						var str = '';
						str += '***********************************************\n';
						str += ' ** Serious system error               **\n';
						str += '    iOff = ' + iOff;
						str += '    File size is ' + stat.size + '\n';
						str += ' ** File size cannot be less than iOff **\n';
						str += '***********************************************\n';
						Logger(str);
						process.exit(13);
						return;
					}
					if(iOff < stat.size) {
						fs.truncateSync(path, iOff);
						console.log(' ***** File truncated from', stat.size, 'to', iOff, '*****');
					}
					Fd = fs.openSync(path, 'a');
				} else {
					newBrick.call(that);
					Offset = First;
				}
			} else {
				newBrick.call(that);
				Offset = 0;
			}
			var str = Brick + ' ' + First + ' ' + Offset + ' ' + iOff;
//			Logger('Debug:' + str);
			var q = {};
			q.Cmd = 'Engage';
			q.Topic = Par.Topic;
			q.First = Offset;
			q.Last = Last;
//			q.Func = Mess;
			q.Pid = Par.Pid;
//			console.log('Q', JSON.stringify(q, null, 2));
			that.send(q, Par.Kafka, function(err, r) {
				fun();
			});
		});
	}

	//-----------------------------------------------------Logger
	function Logger(str) {
		console.log(str);
		fs.appendFileSync(Log, str + '\n');
	}

	//-----------------------------------------------------newBrick
	async function newBrick() {
		if(Fd)
//			fs.closeSynch(Fd);
			await close();
		var Par = this.Par;
		Brick = this.genPid().substr(0, 24);
		Par.Brick = Brick;
		iOff = 0;
		var path = Par.Chron + '/' + Brick + '.brick';
		Fd = fs.openSync(path, 'w');
		nOut = 0;
		T1 = 1.0e30;
		T2 = 0;
	}

	//-----------------------------------------------------Message
	async function Message(com, fun) {
		if(Done) {
			console.log('Done', com.Off);
			return;
		}
		var Par = this.Par;
		var Vlt = this.Vlt;
		var that = this;
		if(!('Count' in Vlt))
			Vlt.Count = 0;
		Vlt.Count++;
		if(Vlt.Count %1000 === 0)
			console.log(Vlt.Count, com.Off, Last);
//		console.log(JSON.stringify(com));
		let off = com.Off;
		let msg = com.Msg;
		let pck = JSON.parse(msg);
		let site = pck.Site.Station + '.' + pck.Site.Channel + '.' + pck.Site.Network + '.';
		if('Location' in pck.Site)
			site += pck.Site.Location;
		else
			site += '--';
		if(!Fd)
			newBrick.call(this);
		let dt = new Date(pck.Time);
		let t = dt.getTime();
//		let time = encode(t);
//		console.log(off, time, site);
		if(!('Time' in pck)) {
			nIgnore++;
			fun(null, com);
			return;
		}
		if(t < T1)
			T1 = t;
		if(t > T2)
			T2 = t;
		var hex = iOff.toString(16).toUpperCase();
		var tmp = '00000000' + hex;
		var pid = Brick + tmp.substr(-8);
		pck.Pid = pid;
//		pck.Length = msg.length; // KLUDGE KLUDGE KLUDGE KLUDGE KLUDGE
//		pck.Offset = off; // KLUDGE KLUDGE KLUDGE KLUDGE KLUDGE
//		pck.iOff = iOff; // KLUDGE KLUDGE KLUDGE KLUDGE KLUDGE
		var rec = JSON.stringify(pck) + '\n';
		var nrec = rec.length;
		await write(rec);
//		fs.writeSync(Fd, rec, iOff);
		iOff += nrec;
		nOut++;
		if(iOff > iOffMax)
			await close();
		if(off >= Last) {
			console.log('Process pau');
			Done = true;
			if(Fd)
				await close();
			await save();
			process.exit(777);
		}
		if(fun)
			fun(null, com);

		async function write(rec) {
			return new Promise((resolve, reject) => {
				fs.write(Fd, rec, function(err) {
					if(err) {
						console.log(' ** Error in write:' + err);
						process.exit(13);
					}
					resolve();
				})
			});
		}

		async function close() {
			console.log('///close');
			return new Promise((resolve, reject) => {
				nTotal += nOut;
				var str = Brick + ' ' + encode(T1) + ' ' + encode(T2)
					+ ' N:' + nOut + ' Total:' + nTotal + ' Size:' + iOff + nrec;
				Logger(str);
//				Logger('Last pid:' + pid + ' Last offset:' + off);
				Fd = null;
				Par.Brick = null;
				resolve();
			});
		}

		async function save() {
			console.log('///save');
			if(Brick) {
				Par.Brick = Brick;
				Par.Offset = off;
				Par.iOff = iOff;
			}
			console.log('save.Par', JSON.stringify(Par, null, 2));
			return new Promise((resolve, reject) => {
				that.save(function(err) {
					var str = 'Total harvested:' + nTotal;
					str += ' Ignored:' + nIgnore;
					str += ' Lost:' + nLost;
					Logger(str);
					resolve();
				});
			});
		}
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

})();