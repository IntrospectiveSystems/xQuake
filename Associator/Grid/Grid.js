//# sourceURL=Sites
(function SiteList() {

	//-----------------------------------------------------dispatch
	let dispatch = {
		Setup: Setup,
		Start: Start,
		Pick: Pick,
		Hypo: Hypo
	};

	return {
		dispatch: dispatch
	};

	//-----------------------------------------------------Setup
	function Setup(com, fun) {
		console.log('--Grid/Setup');
		let Par = this.Par;
		let par = {
			"Lat": [36.4472, 36.4472],
			"Lon": [-98.7867, -98.7867],
			"Z": 5,
			"Nucleate": 5,
			"Stations": 10,
			"Resolution": 10.0

		};
		for(let key in par)
			Par[key] = par[key];
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Start
	function Start(com, fun) {
		console.log("--Grid/Start");
		let Par = this.Par;
		let Vlt = this.Vlt;
		let that = this;
		let w = {};
		w.Cmd = 'GetServices';
		this.send(w, Par.Unit, function(err, r) {
			console.log('Grid/Services', Object.keys(r.Services));
			if('Services' in r) {
				Vlt.Services = r.Services;
				let q = {};
				q.Cmd = 'Subscribe';
				q.Pid = Par.Pid;
				q.Commands = [
					"Hypo",
					"Pick"
				];
				that.send(q, Par.Unit);
				generate();
			}
			if(fun)
				fun(null, com);
		});

		function generate() {
			console.log('..generate');
			let geo = {};
			geo.Lat = 19.4016;
			geo.Lon = -155.2838;
			Vlt.Services.Vector(geo);
//			let sites = Vlt.Services.SiteList(100, 19.4061, -155.2838);
//			console.log('sites.length', sites.length);
//			for(let i=0; i<sites.length; i++) {
//				let site = sites[i];
//				console.log(site.Delta.toFixed(6), site.Site);
//			}
			Vlt.nRing1 = 0;
			Vlt.mRing = 100;
			Vlt.Ring = new Array(Vlt.nRing);
			Vlt.Sites = {};
			let lat0 = 0.5*(Par.Lat[0] + Par.Lat[1]);
			let h = 111.111/Par.Resolution;	// Grid height degrees
			let w = h / Math.cos(Math.PI*lat0/180.0);
			let diflat = Par.Lat[1] - Par.Lat[1];
			let diflon = Par.Lon[1] - Par.Lon[1];
			Vlt.nRow = Math.floor(diflat/h) + 1;
			h = diflat/Vlt.nRow;
			Vlt.nCol = Math.floor(diflon/w) + 1;
			w = diflon/Vlt.nCol;
			Vlt.Nodes = [];
			let site;
			for(let irow=0; irow<Vlt.nRow; irow++) {
				for(let icol=0; icol<Vlt.nCol; icol++) {
					let node = {};
					node.Lat = Par.Lat[0] + irow*h;
					node.Lon = Par.Lon[0] + icol*w;
					Vlt.Services.Vector(node);
					node.Sites = [];
					let sites = Vlt.Services.SiteList(Par.Stations, node.Lat, node.Lon);
					console.log('sites.length', sites.length);
					for(let i=0; i<sites.length; i++) {
						let obj = sites[i];
						if(obj.Site in Vlt.Sites) {
							site = Vlt.Sites[obj.Site];
						} else {
							site = {};
							for(let key in obj)
								site[key] = obj[key];
							site.Nodes = [];
						}
						node.Sites.push(site);
						obj = {};
						obj.Node = Vlt.Nodes.length;
						obj.T = Vlt.Services.TravelTime('P', site.Delta, site.Z);
						site.Nodes.push(obj);
					//	console.log('...Site...', JSON.stringify(site, null, 2));
					}
				//	console.log('///Node///', JSON.stringify(node, null, 2));
					Vlt.Nodes.push(node);
				}
			}
		}
	}

	function Pick(com, fun) {
		console.log('Grid/Pick', com.T, com.Site);
		let Par = this.Par;
		let Vlt = this.Vlt;
		if('Services' in Vlt)
			Vlt.Services.Stream(com);
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Pick
	function Hypo(com, fun) {
		console.log('Grid/Hypo', com.T, com.Site);
		let Vlt = this.Vlt;
		if('Services' in Vlt)
			Vlt.Services.Stream(com);
		if(fun)
			fun(null, com);
	}

})();
