(function Content() {

	//-----------------------------------------------------dispatch
	var dispatch = {
		SetPar: SetPar,
		Activate: Activate
	};

	return {
		dispatch: dispatch
	};

	function SetPar(par) {
		par.Height = 100;
		par.Width = 50;
	}

	function Activate() {
		console.log('This is Walter!');
//		console.log(JSON.stringify(this.Par, null, 2));
		var Vlt = this.Vlt;
		var view = Vlt.View;
		view.Renderer.backgroundColor = 0xFF0000;
		view.Renderer.render(view.Stage);
	}

})();
