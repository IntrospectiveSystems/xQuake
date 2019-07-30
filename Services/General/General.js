//# sourceURL=General
(function General() {
	var RAD2DEG  = 57.29577951308;
	var DEG2RAD = 0.01745329251994;
//	var geocon = require('ecef-projector');

	//-----------------------------------------------------dispatch
	var dispatch = {
		Setup: Setup,
		Start: Start,
		GetServices: GetServices
	};

	return {
		dispatch: dispatch
	};

	//-----------------------------------------------------Setup
	function Setup(com, fun) {
		console.log('--General/Setup');
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Start
	function Start(com, fun) {
		console.log('--General/Start');
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------LInk
	// Add receiver to distro list
	function GetServices(com, fun) {
		com.Services = {};
		com.Services.Encode = encode;
		com.Services.Decode = decode;
		com.Services.Vector = ecef;
		com.Services.Gaussian = gaussian1;
		com.Services.Sig = sig;
		com.Services.Normal = normal;
		com.Services.ECEF = ecef;
		com.Services.Geo = geo;
		com.Services.Delta = delta;
		com.Services.Azimuth = azimuth;
		com.Services.RotX = rotx;
		com.Services.RotY = roty;
		com.Services.RotZ = rotz;
		if(fun)
			fun(null, com);

		//-----------------------------------------------------decode
		// Convert NEIC time format to seconds
		// Node.js Date routine assumes time is being set in
		// local time zone, so the time zone is subtracted
		// to provide correct UTC value. This may seem reversed.
		function decode(str) {
			var yr = parseInt(str.substr(0, 4));
			var mo = parseInt(str.substr(4, 2))-1;
			var da = parseInt(str.substr(6, 2));
			var hr = parseInt(str.substr(8, 2));
			var mn = parseInt(str.substr(10, 2));
			var sx = 0;
			var sc = 0;
			var ms = 0;
			if (str.length > 12) {
				sx = parseFloat(str.substr(12, 6));
				sc = Math.floor(sx);
				ms = Math.floor(1000.0 * (sx - sc));
			}
			var dt = new Date(yr, mo, da, hr, mn, sc, ms);
			var tzoff = 60000 *dt.getTimezoneOffset(); // (msec)
			var t = dt.getTime() - tzoff;
			//	var chk = encode(t);
			//	console.log('Check', str, chk);
			return 0.001*t;
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

		//-------------------------------------------------vector
		// Calculate geocentric unit vector from geographic
		// latitude and longitude
		// DEPRECATED
		function vector(obj) {
			let lat = Math.atan(0.993277*Math.tan(DEG2RAD*obj.Lat));
			let lon = DEG2RAD*obj.Lon;
			obj.Z = Math.sin(lat);
			let rxy = Math.cos(lat);
			obj.X = rxy*Math.cos(lon);
			obj.Y = rxy*Math.sin(lon);
		}

		//-------------------------------------------------gaussian
		// Generate normal random number from a gaussian
		// distribution giving average and standard deviation
		function gaussian1(avg, std) {
			let fac, rsq, v1, v2, x;
			do {
				v1 = 2 * Math.random() - 1;
				v2 = 2 * Math.random() - 1;
				rsq = v1 * v1 + v2 * v2;
			} while (rsq >= 1.0);

			fac = Math.sqrt(-2.0 * Math.log(rsq) / rsq);
			x = std * fac * v1 + avg;
			return x;
		}

		//-------------------------------------------------gaussian
		// Generate normal random number from a gaussian
		// distribution giving average and standard deviation
		function gaussian2(avg, std) {
			let u = Math.random();
			let v = Math.random();
			let x = Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
			return std*x + avg;
		}

		//-------------------------------------------------sig
		// Service that calculates an unnormalized normal
		// distribution such that sig(0, ...) = 1.0;
		function sig(x, sigma) {
			return Math.exp(-0.5*x*x/sigma/sigma);
		}

		//-------------------------------------------------normal
		// Standard normalized Gaussian probability density
		// function (AKA bell shapped curve)
		function normal(x, sigma) {
			return 0.398942*Math.exp(-0.5*x*x/sigma/sigma)/sigma;
		}

		//-------------------------------------------------ecef
		// Gevent obj in the form
		// {
		//		dLat,	// Geodetic coordinates
		//		dLon,
		//		 ...
		// }
		// Add new attributes X, Y, and Z which are the
		// components of an Earth Centered Earth Fixed (ECEF)
		// unit fector.
		function ecef(obj) {
			let lat = Math.atan(0.993277*Math.tan(DEG2RAD*obj.Lat));
			let lon = DEG2RAD*obj.Lon;
			let rxy = Math.cos(lat);
			obj.X = rxy*Math.cos(lon);
			obj.Y = rxy*Math.sin(lon);
			obj.Z = Math.sin(lat);
		}

		//-------------------------------------------------geo
		// Convert R, X, Y, and Z in obj to Geodetic (map)
		// coordinates in obj.Lat, obj.Lon, obj.Elv
		function geo(obj) {
			let lat = Math.asin(obj.Z);
			obj.Lat = RAD2DEG * Math.atan(Math.tan(lat) / 0.993277);
			obj.Lon = RAD2DEG * Math.atan2(obj.Y, obj.X);
		}

		//-------------------------------------------------delta
		// Calculate the distance between two point along
		// along a great circle in degrees.
		// ECEF must have been called on both for this to
		// work properly
		// Inpute objects are of the form
		// {
		//		X,	// Geocentric unit vector
		//		Y.
		//		Z
		// }
		function delta(geo1, geo2) {
			let dot = geo1.X*geo2.X + geo1.Y*geo2.Y + geo1.Z*geo2.Z;
			if(dot > 1) {
				dot = 1;
			}
//			console.log('dot', dot);
			let deg = RAD2DEG*Math.acos(dot);
			return deg;
		}

		//-------------------------------------------------azimuth
		// Calculate the azimuth between two points in degrees.
		// ECEF must have been called on both for this to
		// work properly
		// Inpute objects are of the form
		// {
		//		X,	// Geocentric unit vector
		//		Y.
		//		Z
		// }
		function azimuth(geo1, geo2) {
			let qx = geo1.X;
			let qy = geo1.Y;
			let qz = geo1.Z;
			let sx = geo2.X;
			let sy = geo2.Y;
			let sz = geo2.Z;
			// Normal to great circle
			let qsx = qy * sz - sy * qz;
			let qsy = qz * sx - sz * qx;
			let qsz = qx * sy - sx * qy;
			// Vector points along great circle
			let ax = qsy * qz - qy * qsz;
			let ay = qsz * qx - qz * qsx;
			let az = qsx * qy - qx * qsy;
			let r = Math.sqrt(ax * ax + ay * ay + az * az);
			ax /= r;
			ay /= r;
			az /= r;
			// North tangent vector
			let nx = -Math.sin(DEG2RAD * geo1.Lat) * Math.cos(DEG2RAD * geo1.Lon);
			let ny = -Math.sin(DEG2RAD * geo1.Lat) * Math.sin(DEG2RAD * geo1.Lon);
			let nz = Math.cos(DEG2RAD * geo1.Lat);
			// East tangent vector
			let ex = -Math.sin(DEG2RAD * geo1.Lon);
			let ey = Math.cos(DEG2RAD * geo1.Lon);
			let ez = 0.0;
			let n = ax * nx + ay * ny + az * nz;
			let e = ax * ex + ay * ey + az * ez;
			let azm = Math.atan2(e, n);
			if (azm < 0.0)
				azm += 2.0*Math.PI;
			return RAD2DEG*azm;
		}

		//-------------------------------------------------rotx
		// Apply rotation about x axis (in degrees) to geo point
		// recalculating Lat, Lon, and vector coordinates.
		function rotx(geo, deg) {
			let ang = DEG2RAD * deg;
			let sn = Math.sin(ang);
			let cs = Math.cos(ang);
			let y = geo.Y;
			let z = geo.Z;
			geo.Y = cs*y - sn*z;
			geo.Z = sn*y + cs*z;
		}
		
		//-------------------------------------------------rotx
		// Apply rotation about x axis (in degrees) to geo point
		// recalculating Lat, Lon, and vector coordinates.
		function roty(geo, deg) {
			let ang = DEG2RAD * deg;
			let sn = Math.sin(ang);
			let cs = Math.cos(ang);
			let x = geo.X;
			let z = geo.Z;
			geo.X = cs*x + sn*z;
			geo.Z = -sn*x + cs*z;
//			console.log(sn, cs, x, z, geo.X, geo.Z);
		}
		
		//-------------------------------------------------rotx
		// Apply rotation about x axis (in degrees) to geo point
		// recalculating Lat, Lon, and vector coordinates.
		function rotz(geo, deg) {
			let ang = DEG2RAD * deg;
			let sn = Math.sin(ang);
			let cs = Math.cos(ang);
			let x = geo.X;
			let y = geo.Y;
			geo.X = cs*x - sn*y;
			geo.Y = sn*x + cs*y;
		}
		
	}

})();