//# sourceURL=PopHTML.js
(
	/**
	 * The PopHTML entity is the Apex and only entity of the PopHTML Module.
	 * This entity requres its Setup function invoked during the Setup phase of Nexus startup as well as
	 * its Start function invoked during the Start phase of Nexus' startup.
	 */
	function _PopHTML() {

		let dispatch = {
			Setup,
			Start,
			Cleanup,
			GetCanvas,
			ImageCapture,
			Resize,
			Render,
			DOMLoaded
		};

		//Using views we must inject basic functionality via the viewify script.
		//We no longer need to build divs in our view class just access the existing
		//div from this.Vlt.div. The div is already appended to the body.
		return Viewify(dispatch, "3.1");

		/**
		 * Create the Pixi renderer (autodetected) and Stage and append the rendered canvas to the div
		 * @param {Object} com 
		 * @param {Function} fun 
		 */
		function Setup(com, fun) {
			log.i("-Pop2D/Setup");

			// /**
			//  * we hoist the setup command to the Viewify.js script
			//  */
			this.super(com, (err, cmd) => {
				//we access the existing div
				console.log('..super.err', err);
				console.log('..super.cmd', cmd);
				console.log('..this.Vlt', this.Vlt);
				let div = this.Vlt.div;
				div.css("overflow", 'auto');
				fun(null, com);
			});
		}

		/**
		 * Retreives the data from this.Par.Source if defined. Also subscribes 
		 * to the server to allow for server communications to reach this module.
		 * If there was a controller defined we also register with that controller.
		 * @param {Object} com 
		 * @param {Function} fun 
		 */
		function Start(com, fun) {
			log.i("--Pop2D/Start");
			var Par = this.Par;
			var str = Par.Content;
			var Vlt = this.Vlt;
			var disp  = eval(str);
			Vlt.Content = disp.dispatch;
			Vlt.Content.Activate.call(this);
			Vlt.Animal = 'Badger';
//			var disp = eval(str);
//			console.log(disp, typeof(disp));
//			disp.dispatch.Activate.call(this);
			if (fun)
				fun(null, com);
		}

		function Cleanup(com, fun) {
			console.log('--PopupHTML/Cleanup');
			var Vlt = this.Vlt;
			console.log('Vlt.Animal =', Vlt.Animal);
			if('Cleanup' in Vlt.Content)
				Vlt.Content.Cleanup.call(this);
			if(fun)
				fun(null, com);
		}

		// /**
		//  * Propagate a DomLoaded Event to children views. We append the canvas to the div.
		//  * @param {Object} com 
		//  * @param {Function} fun 
		//  */
		function DOMLoaded(com, fun) {
			log.v("--Pop2D/DOMLoaded");
			let div = this.Vlt.div;
			this.super(com, fun);
		}

		// /**
		//  * Cascade a render down the DOM tree of views
		//  * @param {Object} com 
		//  * @param {Function} fun 
		//  */
		function Render(com, fun) {
			log.v("--PopHTML/Render", this.Par.Pid.substr(30));
			this.Vlt.div.children().detach();
			this.Vlt.div.append(this.Vlt.Html);
			this.super(com, fun);
		}

		// /**
		//  * Sent when a resize event occurs on the div. 
		//  * @param {Object} com 
		//  * @param {Function} fun 
		//  */
		function Resize(com, fun) {
			this.super(com, (err, cmd) => {
				fun(null, com);
			});
		}

		function ImageCapture(com, fun) {
			if(fun)
				fun(null, com);
		}

		function GetCanvas(com, fun) {
			if(fun)
				fun(null, com);
		}

	})();
