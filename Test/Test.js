//# sourceURL=Test
(function Test() {
	var geocon = require('ecef-projector');

	//-----------------------------------------------------dispatch
	let dispatch = {
		Setup: Setup,
		Start: Start
	};

	return {
		dispatch: dispatch
	};

	//-----------------------------------------------------Setup
	function Setup(com, fun) {
		console.log("--Test/Setup");
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Start
	function Start(com, fun) {
		console.log("--Test/Start");
		test();

		function test() {
			let obj = {};
			for(let lat=-90; lat<90.01; lat += 10) {
				obj.Lon = 110.0;
				obj.Elv = 0.0;
				obj.Lat = lat;
				console.log(obj.Lat.toFixed(4), obj.Lon.toFixed(4), obj.Elv.toFixed(2));
				ecef(obj);
				obj.Lat = 0;
				obj.Lon = 0;
				obj.Elv = 0;
				geo(obj);
				console.log(obj.Lat.toFixed(4), obj.Lon.toFixed(4), obj.Elv.toFixed(2), obj.R.toFixed(2));
				console.log('----');
			}
			console.log('..test');

			//-------------------------------------------------ecef
			// Convert Lat, Lon, and Elv in obj into Earth Centered
			// Earth Fixed coordinates in obj.R, obj.X, obj.Y,
			// and obj.Z. (X, Y, Z) is unit vector.
			function ecef(obj) {
				let xyz = geocon.project(obj.Lat, obj.Lon, obj.Elv);
				let x = xyz[0];
				let y = xyz[1];
				let z = xyz[2];
				obj.R = Math.sqrt(x*x + y*y + z*z);
				obj.X = x/obj.R;
				obj.Y = y/obj.R;
				obj.Z = z/obj.R;
			}

			//-------------------------------------------------geo
			// Convert R, X, Y, and Z in obj to Geodetic (map)
			// coordinates in obj.Lat, obj.Lon, obj.Elv
			function geo(obj) {
				let x = obj.R*obj.X;
				let y = obj.R*obj.Y;
				let z = obj.R*obj.Z;
				let gps = geocon.unproject(x, y, z);
				obj.Lat = gps[0];
				obj.Lon = gps[1];
				obj.Elv = gps[2];
			}
		}
	}

})();
