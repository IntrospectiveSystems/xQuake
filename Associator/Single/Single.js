//# sourceURL=Single
(function Single() {
	let Svc = {};

	//-----------------------------------------------------dispatch
	let dispatch = {
		Setup,
		Start
	};

	return {
		dispatch: dispatch
	};

	async function Setup(_com, fun) {
		log.i('--Single/Setup');
		if(fun)
			fun();
	}

	//-----------------------------------------------------Start
	async function Start(_com, fun) {
		log.i('--Single/Start');
		let Par = this.Par;
		let that = this;
		if ('Services' in Par) {
			for (let is = 0; is < Par.Services.length; is++) {
				let pid = Par.Services[is];
				await service(pid);
			}
		}
		Svc.Subscribe('Engage', this, Engage);
		Svc.Subscribe('Pick', this, Pick);
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

	}

	function Engage(_com) {
		log.i('--Single/Engage');
	}

	function Pick(com) {
		log.i('--Single.Pick', JSON.stringify(com));
	}

})();
