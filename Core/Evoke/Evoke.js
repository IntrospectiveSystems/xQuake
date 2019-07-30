// #sourcsURL='Evoke'
(function Evoke() {

	//-----------------------------------------------------dispatch
	var dispatch = {
		Start: Start,
		Evoke: Evoke
//		Activate: Activate
	};

	return {
		dispatch: dispatch
	};

	function Start(com, fun) {
		log.i(' -- Evoke/Start');
		var Par = this.Par;
		var Vlt = this.Vlt;
		Vlt.Started = false;

		var q = {};
		q.Cmd = 'Subscribe';
		q.Pid = Par.Pid;
		q.Command = 'Evoke';
		this.send(q, Par.Unit, function(err, r) {
			if (err)	log.v('err', err);
			log.v('r', typeof r, JSON.stringify(r, null, 2));
		});
		fun();
	}

	function Evoke(com, fun) {
		log.v(' -- Seed/HTML/Evoke/Evoke');
		var snippet = {};
//		com.Snippet = '"' + start + '"';
		var Vlt = this.Vlt;
		var Par = this.Par;
		var par = {};
		var mod = {};
		mod.Module = 'xSim.Widgets.Pop2D';
		mod.Par = par;
		var that = this;
		this.getFile('Content.js', function(err, data) {
			if(err) {
				fun(err);
				return;
			}
			var buf = new Buffer(data);
//			par.Content = buf.toString('base64');
			par.Content = buf.toString();
			var disp = eval(par.Content);
			if('SetPar' in disp.dispatch) {
				console.log(disp, typeof(disp));
				disp.dispatch.SetPar(par);
			}
			com.Mod = mod;
			if(fun)
				fun(null, com);
			if(!Vlt.Started) {
				setTimeout(function() {
					var q = {};
					q.Cmd = 'StartSimulation';
					that.send(q, Par.Unit);
					Vlt.Started = true;
				}, 1000);
			}
			return;
		});
	}

})();
