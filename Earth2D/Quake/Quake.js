//# sourceURL=Quake
(function Quake() {
	//-----------------------------------------------------dispatch
	var dispatch = {
		Setup,
		Start,
		Pick,
		Register,
		"Idle.KeyDown.p": Action
	};

	return {
		dispatch: dispatch
	};

	//-----------------------------------------------------Setup
	function Setup(com, fun) {
		console.log('--Quake/Setup');
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Start
	function Start(com, fun) {
		console.log("--Quake/Start");
		let Par = this.Par;
		let Vlt = this.Vlt;
		Vlt.Registry = {};
		var q = {};
		q.Cmd = 'Subscribe';
		q.Pid = Par.Pid;
		q.Commands = [];
		q.Commands.push('Pick');
		q.Commands.push('Idle.KeyDown.p');
		this.send(q, Par.EVE3D, function(err, r) {
			if('View' in r) {
				console.log(' ***** GOT VIEW *****');
				Vlt.View = r.View;
			}
			return;
		});
		if(fun)
			fun(null, com);
	}

	// Pick from server
	function Pick(com, fun) {
		console.log('Pick:' + com.Site, com.Lat, com.Lon);
	//	console.log('Pick:' + JSON.stringify(com));
		let Vlt = this.Vlt;
		if('Picks' in Vlt && 'View' in Vlt) {
			Vlt.iPick++;
			if (Vlt.iPick >= Vlt.Picks.length)
				Vlt.iPick = 0;
			Vlt.Picks[Vlt.iPick].position.set(com.Lon, com.Lat, 0.0);
			if('PickList' in Vlt.Registry) {
				this.send(com, Vlt.Registry['PickList']);
			}
		} else {
			Vlt.iPick = 0;
			Vlt.Picks = [];
			let geo = new THREE.SphereGeometry(0.2, 6, 6);
			let mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
			let sphere = new THREE.Mesh(geo, mat);
			for (let i = 0; i < 100; i++) {
				let obj3d = sphere.clone();
				obj3d.position.set(0, 0, -1);
				Vlt.Picks.push(obj3d);
				Vlt.View.Scene.add(obj3d);
			}		
			Vlt.Picks[Vlt.iPick].position.set(com.Lon, com.Lat, 0.0);
		}
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Register
	function Register(com, fun) {
		log.i('--Register', JSON.stringify(com));
		if('Name' in com && 'Pid' in com) {
			this.Vlt.Registry[com.Name] = com.Pid;
		}
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------PickList
	function Action(com, fun) {
		console.log('--Quake/Action', com.Cmd);
		switch(com.Cmd) {
		case 'Idle.KeyDown.p':
			let par = {};
			par.Quake = this.Par.Pid;
			this.genModule({
				"Module": "xGraph.Popup",
				"Par": {
					Left: 100,
					Top: 100,
					ModuleDefinition: {
						Module: "xQuake.Earth2D.PickList",
						Par: par
					},
					"Width": 240,
					"Height": 200
				}
			}, () => { });
			break;
		}
		if(fun)
			fun(null, com);
	}

})();
