//# sourceURL=Sites
(function SiteList() {
	var RAD2DEG  = 57.29577951308;
	var DEG2RAD = 0.01745329251994;
	var geocon = require('ecef-projector');

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
		console.log('--Services/Setup');
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Start
	function Start(com, fun) {
		console.log('--Services/Start');
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------LInk
	// Add receiver to distro list
	function GetServices(com, fun) {
		console.log(' --Services/GetServices');
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
/*		function ecef(obj) {
			let elv;
			if('Elv' in obj)
				elv = obj.Elv;
			if('Depth' in obj)
				elv = -1000.0 * obj.Depth;
			if(!elv)
				return;
			let xyz = geocon.project(obj.Lat, obj.Lon, elv);
			let x = xyz[0];
			let y = xyz[1];
			let z = xyz[2];d
			obj.R = Math.sqrt(x*x + y*y + z*z);
			obj.X = x/obj.R;
			obj.Y = y/obj.R;
			obj.Z = z/obj.R;
		} */

		//-------------------------------------------------geo
		// Convert R, X, Y, and Z in obj to Geodetic (map)
		// coordinates in obj.Lat, obj.Lon, obj.Elv
		function geo(obj) {
			let lat = Math.asin(obj.Z);
			obj.Lat = RAD2DEG * Math.atan(Math.tan(lat) / 0.993277);
			obj.Lon = RAD2DEG * Math.atan2(obj.Y, obj.X);
		}
/*		function geo(obj) {
			let x = obj.R*obj.X;
			let y = obj.R*obj.Y;
			let z = obj.R*obj.Z;
			let gps = geocon.unproject(x, y, z);
			obj.Lat = gps[0];
			obj.Lon = gps[1];
			obj.Elv = gps[2];
	} */

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
		// Calculate the azimuth between two point.
		// ECEF must have been called on both for this to
		// work properly
		// Inpute objects are of the form
		// {
		//		X,	// Geocentric unit vector
		//		Y.
		//		Z
		// }
		function azimuth(geo1, geo2) {
			return 0.0;
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
/*

#include <math.h>
#include "geo.h"

namespace traveltime {
#define RAD2DEG  57.29577951308
#define DEG2RAD	0.01745329251994
#define TWOPI 6.283185307179586

//	CGeo: Base class for GIS objects.
CGeo::CGeo() {
}

CGeo::CGeo(CGeo *geo) {
	dLat = geo->dLat;
	dLon = geo->dLon;
	dRad = geo->dRad;
	dX = geo->dX;
	dY = geo->dY;
	dZ = geo->dZ;
	dT = geo->dT;
	iTag = geo->iTag;
}

CGeo::~CGeo() {
}

void CGeo::Clone(CGeo *geo) {
	dLat = geo->dLat;
	dLon = geo->dLon;
	dRad = geo->dRad;
	uX = dX = geo->dX;
	uY = dY = geo->dY;
	uZ = dZ = geo->dZ;
	dT = geo->dT;
	iTag = geo->iTag;
}

// Converts geographic latitude into geocentric latitude.
void CGeo::setGeographic(double lat, double lon, double r) {
	dLat = RAD2DEG * atan(0.993277 * tan(DEG2RAD * lat));
	dLon = lon;
	dRad = r;
	dZ = r * sin(DEG2RAD * dLat);
	double rxy = r * cos(DEG2RAD * dLat);
	dX = rxy * cos(DEG2RAD * dLon);
	dY = rxy * sin(DEG2RAD * dLon);
	double rr = sqrt(dX * dX + dY * dY + dZ * dZ);
	uX = dX / rr;
	uY = dY / rr;
	uZ = dZ / rr;
}

void CGeo::getGeographic(double *lat, double *lon, double *r) {
	*lat = RAD2DEG * atan(tan(DEG2RAD * dLat) / 0.993277);
	*lon = dLon;
	*r = dRad;
}

// Initialize geocentric coordinates
void CGeo::setGeocentric(double lat, double lon, double r) {
	dLat = lat;
	dLon = lon;
	dRad = r;
	dZ = r * sin(DEG2RAD * dLat);
	double rxy = r * cos(DEG2RAD * dLat);
	dX = rxy * cos(DEG2RAD * dLon);
	dY = rxy * sin(DEG2RAD * dLon);
	double rr = sqrt(dX * dX + dY * dY + dZ * dZ);
	uX = dX / rr;
	uY = dY / rr;
	uZ = dZ / rr;
}

void CGeo::getGeocentric(double *lat, double *lon, double *r) {
	*lat = dLat;
	*lon = dLon;
	*r = dRad;
}

void CGeo::setCart(double x, double y, double z) {
	dX = x;
	dY = y;
	dZ = z;
	dRad = sqrt(x * x + y * y + z * z);
	double rxy = sqrt(x * x + y * y);
	dLat = RAD2DEG * atan2(z, rxy);
	dLon = RAD2DEG * atan2(y, x);
	double rr = sqrt(dX * dX + dY * dY + dZ * dZ);
	uX = dX / rr;
	uY = dY / rr;
	uZ = dZ / rr;
}

// Calculate the distance in radians to a given geographic object
double CGeo::Delta(CGeo *geo) {
	double dlt;
	double dot = uX * geo->uX + uY * geo->uY + uZ * geo->uZ;
	if (dot < 1.0)
		dlt = acos(dot);
	else
		dlt = 0.0;
	return dlt;
}

// Calculate the azimuth in radians to a given geographic object
double CGeo::Azimuth(CGeo *geo) {
	// Station radial normal vector
	double sx = cos(DEG2RAD * geo->dLat) * cos(DEG2RAD * geo->dLon);
	double sy = cos(DEG2RAD * geo->dLat) * sin(DEG2RAD * geo->dLon);
	double sz = sin(DEG2RAD * geo->dLat);
	// Quake radial normal vector
	double qx = cos(DEG2RAD * dLat) * cos(DEG2RAD * dLon);
	double qy = cos(DEG2RAD * dLat) * sin(DEG2RAD * dLon);
	double qz = sin(DEG2RAD * dLat);
	// Normal to great circle
	double qsx = qy * sz - sy * qz;
	double qsy = qz * sx - sz * qx;
	double qsz = qx * sy - sx * qy;
	// Vector points along great circle
	double ax = qsy * qz - qy * qsz;
	double ay = qsz * qx - qz * qsx;
	double az = qsx * qy - qx * qsy;
	double r = sqrt(ax * ax + ay * ay + az * az);
	ax /= r;
	ay /= r;
	az /= r;
	// North tangent vector
	double nx = -sin(DEG2RAD * dLat) * cos(DEG2RAD * dLon);
	double ny = -sin(DEG2RAD * dLat) * sin(DEG2RAD * dLon);
	double nz = cos(DEG2RAD * dLat);
	// East tangent vector
	double ex = -sin(DEG2RAD * dLon);
	double ey = cos(DEG2RAD * dLon);
	double ez = 0.0;
	double n = ax * nx + ay * ny + az * nz;
	double e = ax * ex + ay * ey + az * ez;
	double azm = atan2(e, n);
	if (azm < 0.0)
		azm += TWOPI;
	return azm;
}

int CGeo::Intersect(CGeo *in1, double r1, CGeo *in2, double r2, CGeo *in3,
		double r3, CGeo *out1, CGeo *out2) {
	double s;
	double xd, yd, zd;
	double xs, ys, zs;
	double a1, b1, c1, d1;
	double a2, b2, c2, d2;
	double a3, b3, c3, d3;

	// Calculate the plane containing the intersection points between spheres 1 and 2
	// in the form a1*x + b1*y + c1*z - d1;
	xd = in2->dX - in1->dX;
	yd = in2->dY - in1->dY;
	zd = in2->dZ - in1->dZ;
	double r12 = sqrt(xd * xd + yd * yd + zd * zd);
	s = -0.5 * (r2 * r2 - r1 * r1 - r12 * r12) / r12;
	a1 = xd / r12;
	b1 = yd / r12;
	c1 = zd / r12;
	xs = in1->dX + a1 * s;
	ys = in1->dY + b1 * s;
	zs = in1->dZ + c1 * s;
	d1 = a1 * xs + b1 * ys + c1 * zs;

	// Calculate the plane containing the intersection points between spheres 1
	// and 3 in the form a2*x + b2*y + c2*z - d2;
	xd = in3->dX - in1->dX;
	yd = in3->dY - in1->dY;
	zd = in3->dZ - in1->dZ;
	double r13 = sqrt(xd * xd + yd * yd + zd * zd);
	s = -0.5 * (r3 * r3 - r1 * r1 - r13 * r13) / r13;
	a2 = xd / r13;
	b2 = yd / r13;
	c2 = zd / r13;
	xs = in1->dX + a2 * s;
	ys = in1->dY + b2 * s;
	zs = in1->dZ + c2 * s;
	d2 = a2 * xs + b2 * ys + c2 * zs;

	// Calculate the plane containing all three sphere centers
	// in the form a3*x + b3*y + c3*z - d3. This is done by finding the equation
	// of a plane with normal obtained from the cross product of the vector from
	// center of sphere 1 to 2 and three respectively. Center of sphere one is
	// arbitrarily picked as the origin.
	a3 = b1 * c2 - c1 * b2;
	b3 = c1 * a2 - a1 * c2;
	c3 = a1 * b2 - b1 * a2;
	d3 = a3 * in1->dX + b3 * in1->dY + c3 * in1->dZ;

	// The intersection of these three points is a point on a line containing the
	// two solution points. Calculate the parametric form of this line using the
	// first two planes, then use the quadratic distance to the third sphere
	// center to calculate the possibly two points of intersection of three
	// spheres.
	double bb1 = a2 * b1 - a1 * b2;
	double cc1 = a2 * c1 - a1 * c2;
	double dd1 = a2 * d1 - a1 * d2;
	double bb2 = a3 * b1 - a1 * b3;
	double cc2 = a3 * c1 - a1 * c3;
	double dd2 = a3 * d1 - a1 * d3;

	// Solve system of three equations to calculate a point on the line passing
	// through both solutions (if any) of the problem.
	double zp = (bb2 * dd1 - bb1 * dd2) / (bb2 * cc1 - bb1 * cc2);
	double yp = (dd1 - cc1 * zp) / bb1;
	double xp = (d1 - c1 * zp - b1 * yp) / a1;

	// Find two points on the line that satisfy the distance from one of the
	// three centers - in this case sphere 1 is chosen.
	xd = xp - in1->dX;
	yd = yp - in1->dY;
	zd = zp - in1->dZ;
	double a = a3 * a3 + b3 * b3 + c3 * c3;
	double b = 2.0 * (a3 * xd + b3 * yd + c3 * zd);
	double c = xd * xd + yd * yd + zd * zd - r1 * r1;
	double rad = b * b - 4 * a * c;
	if (rad <= 0.0) {
		return 0;
	}
	double root = sqrt(rad);
	double s1 = 0.5 * (root - b) / a;
	double s2 = 0.5 * (-root - b) / a;
	double x1 = xp + s1 * a3;
	double y1 = yp + s1 * b3;
	double z1 = zp + s1 * c3;
	out1->setCart(x1, y1, z1);
	xd = x1 - in1->dX;
	yd = y1 - in1->dY;
	zd = z1 - in1->dZ;
	double x2 = xp + s2 * a3;
	double y2 = yp + s2 * b3;
	double z2 = zp + s2 * c3;
	out2->setCart(x2, y2, z2);
	xd = x2 - in1->dX;
	yd = y2 - in1->dY;
	zd = z2 - in1->dZ;

	return 2;
}

void CGeo::Check(char *str, CGeo* geo, double r, double x, double y, double z) {
	double xd = x - geo->dX;
	double yd = y - geo->dY;
	double zd = z - geo->dZ;
}
}
*/