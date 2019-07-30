//# sourceURL=Server
(function Server() {
	let Svc = {};

	//-----------------------------------------------------dispatch
	var dispatch = {
		Setup: Setup,
		Start: Start
	};

	return {
		dispatch: dispatch
	};

	//-----------------------------------------------------Setup
	function Setup(com, fun) {
		console.log('--Earth2D/Server/Setup');
		let Vlt = this.Vlt;
		Vlt.Initialized = false;
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Start
	async function Start(com, fun) {
		console.log("--Earth2D/Server/Start");
		var Par = this.Par;
		let Vlt = this.Vlt;
		let that = this;

		// Collect services
		if ('Services' in Par) {
			for (let is = 0; is < Par.Services.length; is++) {
				let pid = Par.Services[is];
				await service(pid);
			}
		}

		// Subscribe to message types
		Svc.Subscribe('Pick', that, pick);
		if(fun)
			fun(null, com);

		// Gather services from each individual module
		async function service(pid) {
			return new Promise((resolve, reject) => {
				let q = {};
				q.Cmd = 'GetServices';
				that.sendLocal(q, pid, async function (err, r) {
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

		//-----------------------------------------------------Pick
		function pick(pck) {		
			var Vlt = this.Vlt;
			let Par = this.Par;
			let dt = Svc.Encode(pck.T);
		//	console.log(dt, pck.Site, pck.Lat.toFixed(4), pck.Lon.toFixed(4));
			let q = {
				"Cmd": "Pick",
				"Site": pck.Site,
				"T": pck.T,
				"Lat": pck.Lat,
				"Lon": pck.Lon
			}
			this.send(q, Par.Server);
		}

	}
		
})();
