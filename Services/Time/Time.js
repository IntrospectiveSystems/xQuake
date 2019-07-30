//# sourceURL=Time
class Time {

	/** Setup
	 * Method necessary for the initial setup of the class. Standard in xGraph systems.
	 * @param {Object} com The communication coming from the orchestrator.
	 * @param {Function} fun The function that send the callback to the place the come came from.
	 */
	//-----------------------------------------------------Setup
	Setup(com, fun) {
		console.log('--Time/Setup');
		if(fun) {
			fun(null, com);
		}
	}

	/** Start
	 * Method for starting the module instance of this class. Standard in most xGraph systems.
	 * @param {Object} com The communication coming from the orchestrator.
	 * @param {Function} fun The function that send the callback to the place the come came from.
	 */
	//-----------------------------------------------------Start
	async Start(com, fun) {
		console.log('--Time/Start');
		this.Svc = await this.getServices();
		if(fun)
			fun(null, com);
	}

	/** GetServices
	 * This method must be called using sendlocal and can only be used withing the
	 * current system.
	 * @param {object} com the commuincation coming from from within current system
	 * @param {string} com.Cmd 'GetServices'
	 * @param {object}  com.Services an array of {string:function} pairs returned
	 * @param {function} fun callback returning com with populated Services object
	 */
	GetServices(com, fun) {
		console.log(' --Clock/GetServices');
		com.Services = {};
		com.Services.Encode = encode;
		com.Services.Decode = decode;
		if(fun) {
			fun(null, com);
		}

		//-------------------------------------------------decode
		// Converts time in the form yyyymmddhhmmss.sss
		// to epoch floating seconds. Tunezibe us bit
		// taken into account
		//
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
			return 0.001*t;
		}

		//-----------------------------------------------------encode
		// Reverse of decode, converts time in seconds into
		// string format yyyymmddhhmmss.sss
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
	}

}