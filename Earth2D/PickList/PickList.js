//# sourceURL=PickList
Viewify(class PickList {

	async Setup(com, fun) {
		await this.asuper(com);
		log.v('Loading Picklist...');
		this.Vlt.div = this.Par.$.PickList;
		log.i(this.Vlt.div);
		this.Vlt.div.css('overflow', 'auto');
		this.Vlt.div.css('color', 'black');	
		if (fun) {
			fun(null, com);
		}	
	}

	Start(com, fun) {
		log.i("--PickList/Start");
		let q = {};
		q.Cmd = 'Register';
		q.Name = 'PickList';
		q.Pid = this.Par.Pid;
		log.i('  Par:' + JSON.stringify(this.Par));
		this.send(q, this.Par.Quake);

		let arr = [
			{
				Cmd: 'Pick',
				Site: 'FNO.HHZ.OK.01',
				Lat: 35.25738,
				Lon: -97.40115
			},
			{
				Cmd: 'Pick',
				Site: 'FNO.HHZ.OK.01',
				Lat: 35.25738,
				Lon: -97.40115
			},
			{
				Cmd: 'Pick',
				Site: 'FNO.HHZ.OK.01',
				Lat: 35.25738,
				Lon: -97.40115
			},
			{
				Cmd: 'Pick',
				Site: 'FNO.HHZ.OK.01',
				Lat: 35.25738,
				Lon: -97.40115
			}
		]

		for(let i in arr) {
			this.send(arr[i], this.Par.Pid);
		}

		
		if (fun)
			fun(null, com);
	}

	Pick(com, fun) {	
			let html =  com.Site + ' ' + com.Lat + ' ' + com.Lon;
	
			let elem = document.createElement('p');
			elem.style.color = 'black';
			elem.style.margin = 0;
			elem.innerHTML = html; 

			log.i(this.Vlt.div);
				
			this.Vlt.div.prepend(elem);	
			if(fun)
				fun(null, com);
	}

});