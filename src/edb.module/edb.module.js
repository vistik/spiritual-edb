/*
 * Register module.
 */
window.edb.EDBModule = gui.module ( "edb", {
	
	/**
	 * CSS selector for currently focused form field.
	 * @TODO: Support links and buttons as well
	 * @TODO: Migrate to (future) EDBMLModule
	 * @type {String}
	 */
	fieldselector : null,

	/*
	 * Extending {gui.Spirit}
	 */
	mixins : {
		
		/**
		 * Handle input.
		 * @param {edb.Input} input
		 */
		oninput : function ( input ) {},

		/**
		 * Handle changes.
		 * @param {Array<edb.ObjectChange|edb.ArrayChange>}
		 */
		onchange : function ( changes ) {}
	},
	
	/*
	 * Register default plugins for all spirits.
	 */
	plugins : {
		script : edb.ScriptPlugin,
		input : edb.InputPlugin,
		output : edb.OutputPlugin
	},
	
	/*
	 * Channeling spirits to CSS selectors.
	 */
	channels : [
		[ "script[type='text/edbml']", "edb.ScriptSpirit" ],
		[ "link[rel='service']", "edb.ServiceSpirit" ]
	],

	/**
	 * Context spiritualized.
	 * @param {Window} context
	 */
	onafterspiritualize : function ( context ) {
		context.document.addEventListener ( "focusin", this, true );
		context.document.addEventListener ( "focusout", this, true );
	},

	/**
	 * Handle event.
	 * @param {Event} e
	 */
	handleEvent : function ( e ) {
		switch ( e.type ) {
			case "focusin" :
				this.fieldselector = this._fieldselector ( e.target );
				break;
			case "focusout" :
				this.fieldselector = null;
				break;
		}
		// console.log ( e.target.ownerDocument.querySelector ( this.fieldselector ));
	},


	// Private ...................................................

	/**
	 * Compute selector for form field. We scope it to 
	 * nearest element ID or fallback to document body.
	 * @param {Element} element
	 */
	_fieldselector : function ( elm ) {
		var index = -1;
		var parts = [];
		while ( elm !== null ) {
			if ( elm.id ) {
				parts.push ( "#" + elm.id );
				elm = null;
			} else {
				index = gui.DOMPlugin.ordinal ( elm ) + 1;
				parts.push ( ">" + elm.localName + ":nth-child(" + index + ")" );
				elm = elm.parentNode;
			}
		}
		return parts.reverse ().join ( "" );
	}

});