//# sourceURL=Seed

/**
 * This the basic prototype module that can be used as a starting
 * point for developing other modules
 * 
 * Parameters required
 * 
 * Services provided
 *	None
 *
 * Services required
 * 	Agent/Subscribe: Subscribe to messages dispatched from other agents
 * 
 */
class Seed {

	/** Setup
	 * Method necessary for the initial setup of the class. Standard in xGraph systems.
	 * @param {Object} com The communication coming from the orchestrator.
	 * @param {Function} fun The function that send the callback to the place the come came from.
	 */
	Setup(com, fun) {
		log.i('--Seed/Setup');
		let Vlt = this.Vlt;
		Vlt.Sell = 0.0;
		Vlt.Buy = 0.0;
		fun(null, com);
	}

	/** Start
	 * Method for starting the module instance of this class. Standard in most xGraph systems.
	 * @param {Object} com The communication coming from the orchestrator.
	 * @param {Function} fun The function that send the callback to the place the come came from.
	 */
	async Start(com, fun) {
		log.i('--Seed/Start');
		this.Svc = await this.getServices();
		let Svc = this.Svc;
		Svc.Subscribe('Engage', this, this.Engage);
		fun(null, com);
	}

	/** Engage
	 * This method is called by the agent to add the unit to the distributed system. It is also
	 * a place where the unit gathers params that were in the deploy command, and the first
	 * moment that the instance of this class can use any of it's services.
	 * @param {Object} _com Currently unused input
	 */
	Engage(com) {
		log.i('--Seed/Engage');
		let Vlt = this.Vlt;
		Vlt.Agent = com.Agent;
	}

}
