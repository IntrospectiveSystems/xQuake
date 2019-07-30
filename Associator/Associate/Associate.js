//# sourceURL=Associate
(function Associate() {
	let Svc = {};
	fs = require('fs');

	//-----------------------------------------------------dispatch
	let dispatch = {
		Setup,
		Start
	};

	return {
		dispatch: dispatch
	};

	async function Setup(_com, fun) {
		log.i('--Associate/Setup');
		let Vlt = this.Vlt;
		Vlt.Sites = new Map();
		if(fun)
			fun();
	}

	//-----------------------------------------------------Start
	async function Start(_com, fun) {
		log.i('--Associate/Start');
		let Par = this.Par;
		let Vlt = this.Vlt;
		let that = this;
		if ('Services' in Par) {
			for (let is = 0; is < Par.Services.length; is++) {
				let pid = Par.Services[is];
				await service(pid);
			}
		}
		Svc.Subscribe('Engage', this, Engage);
		Svc.Subscribe('Pick', this, Pick);
		let file = Svc.GetArg('Associate');
		console.log('file', file);
		let path = Par.Data + '/' + file;
		console.log('path', path);
		let jsn = fs.readFileSync(path).toString();
		Vlt.Assoc = JSON.parse(jsn);
		console.log(JSON.stringify(Vlt.Assoc, null, 2));
		generate(Vlt.Assoc);
		if(fun)
			fun();

		async function service(pid) {
			return new Promise((resolve, _reject) => {
				let q = {};
				q.Cmd = 'GetServices';
				that.sendLocal(q, pid, async function (_err, r) {
					log.i('r', JSON.stringify(r));
					if ('Services' in r) {
						for(let key in r.Services) {
							Svc[key] = r.Services[key];
						}
					}
					resolve();
				});
			});
		}

		function generate(assoc) {
		//	console.log('Triggers', JSON.stringify(assoc, null, 2));
			let keys = Object.keys(assoc.Triggers);
		//	console.log('*****', JSON.stringify(keys));
			for(let i=0; i<keys.length; i++) {
				let name = keys[i];
				let trg = assoc.Triggers[name];
				let type = trg.Type;
				switch(type) {
				case 'Grid':
					grid(trg);
					break;
				default:
					log.i(' ** Bad trigger type', type);
					break;
				}
			}
/*			let hist = [];
			for(let i=0; i<41; i++) {
				hist.push(0);
			}
			let hist1 = 0;
			let hist2 = 4;
			let step = 1;
			for(let ihist=0; ihist<1000; ihist++) {
				let x = Svc.Gaussian(20, 2);
				kx = Math.round(x);
				if(kx < 0)
					kx = 0;
				if(kx > 40)
					kx = 40;
				hist[kx]++;
			}
			let str = '';
			let val;
			for(let j=0; j<41; j++) {
				let hst = ' ';
				val = hist1 + j*step;
				for(let k=0; k<=hist[j]; k++) {
					hst += '*';
				}
				str += val.toFixed() + hst + '\n';
			}
			console.log(str); */

			function grid(trg) {
				console.log('Trig', JSON.stringify(trg, null, 2));
				trg.Nodes = [];
				let rows = trg.Rows;
				let cols = trg.Cols;
				let lat = trg.Lat;
				let lon = trg.Lon;
				let dep = trg.Dep;
				let diflat = trg.Resolution/111.111;
				let diflon = diflat/Math.acos(Math.PI*lat/180.0);
				let lat0 = lat - 0.5*(rows-1)*diflat;
				let lon0 = lon - 0.5*(cols-1)*diflon;
				for(let irow=0; irow<rows; irow++) {
					for(let icol=0; icol<cols; icol++) {
						node = {};
						node.Lat = lat0 + irow*diflat;
						node.Lon = lon0 + icol*diflon;
						node.Dep = dep;
						Svc.Vector(node);
						trg.Nodes.push(node);
					}
				}
				console.log('Nodes', JSON.stringify(trg, null, 2));
			}
		}
	}

	function Engage(_com) {
		log.i('--Associate/Engage');
	}

	function Pick(pck) {
		log.i('--Associate.Pick', JSON.stringify(pck));
		let Vlt = this.Vlt;
		if(!Vlt.Sites.has(pck.Site)) {
			addSite(pck);
		}
		associate(pck);

		function addSite(pck) {
			let site = {};
			site.Site = pck.Site;
			site.Lat = pck.Lat;
			site.Lon = pck.Lon;
			site.Elv = pck.Elv;
			Svc.Vector(site);
			Vlt.Sites.set(pck.Site, site);
			assign();
			console.log('Adding', JSON.stringify(site));

			//---------------------------------------------assign
			// Trundle through all triggers and associate new
			// site with any node that passes certain tests
			function assign() {
				let keys = Object.keys(Vlt.Assoc.Triggers);
				for(let ikey = 0; ikey<keys.length; ikey++) {
					let key = keys[ikey];
					let trg = Vlt.Assoc.Triggers[key];
					let type = trg.Type;
					switch(type) {
					case 'Grid':
						grid(trg);
						break;
					default:
						log.i(' ** Bad trigger type', type);
						break;
					}
				}

				function grid(trg) {
					let nodes = trg.Nodes;
					let x1 = site.X;
					let y1 = site.Y;
					let z1 = site.Z;
					let dotcut = Math.cos(Math.PI*trg.Range/111.111/180.0);
					for(let inode=0; inode<nodes.length; inode++) {
						let node = trg.Nodes[inode];
						let x2 = node.X;
						let y2 = node.Y;
						let z2 = node.Z;
						let dot = x1*x2 + y1*y2 + z1*z2;
						if(dot > dotcut) {
							console.log('Dot', dot, dotcut);
						}
					}
				}
			}
		}

		function associate(pck) {

		}
	}

})();
