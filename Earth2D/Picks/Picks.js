//# sourceURL=Picks
(function Picks() {
	//-----------------------------------------------------dispatch
	var dispatch = {
		Setup,
		Start,
		Pick
	};

	return {
		dispatch: dispatch
	};

	//-----------------------------------------------------Setup
	function Setup(com, fun) {
		console.log('--Picks/Setup');
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Start
	function Start(com, fun) {
		console.log("--Picks/Start");
		let Par = this.Par;
		let Vlt = this.Vlt;
		var q = {};
		q.Cmd = 'Subscribe';
		q.Pid = Par.Pid;
		q.Commands = [];
		q.Commands.push('Pick');
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
		console.log('Pick:' + JSON.stringify(com));
		let Vlt = this.Vlt;
		if('Picks' in Vlt && 'View' in Vlt) {
			Vlt.iPick++;
			if (Vlt.iPick >= Vlt.Picks.length)
				Vlt.iPick = 0;
			Vlt.Picks[Vlt.iPick].position.set(com.Lon, com.Lat, 0.0);
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

})();
