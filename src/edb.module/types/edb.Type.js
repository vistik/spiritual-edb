/**
 * Mixin methods and properties common to both {edb.Object} and {edb.Array}
 */
edb.Type = function () {};
edb.Type.prototype = {
	
	/**
	 * Primary storage key (serverside or localstorage).
	 * @type {String}
	 */
	$primarykey : "id",
		
	/**
	 * Instance key (clientside session only).
	 * TODO: Safari on iPad would exceed call stack when this property was prefixed with "$" 
	 * because all getters would call $sub which would then get $instancekey (ie. overflow).
	 * Why was this only the case only for Safari iPad?
	 * @type {String}
	 */
	_instanceid : null,
	
	/**
	 * Called after $onconstruct (by gui.Class convention).
	 * @TODO instead use $onconstruct consistantly throughout types?
	 */
	onconstruct : function () {},
	
	/**
	 * Serialize to JSON string without private and expando properties.
	 * @todo Declare $normalize as a method stub here (and stull work in subclass)
	 * @param {function} filter
	 * @param {String|number} tabber
	 * @returns {String}
	 */
	$stringify : function ( filter, tabber ) {
		return JSON.stringify ( this.$normalize (), filter, tabber );
	}
};


// Static ......................................................................

/*
 * Dispatch a getter broadcast before base function.
 */
edb.Type.getter = gui.Combo.before ( function () {
	gui.Broadcast.dispatchGlobal ( this, edb.BROADCAST_GETTER, this._instanceid );
});

/*
 * Dispatch a setter broadcast after base function.
 */
edb.Type.setter = gui.Combo.after ( function () {
	gui.Broadcast.dispatchGlobal ( this, edb.BROADCAST_SETTER, this._instanceid );
});

/*
 * Dispatch a setter broadcast after base function.
 *
edb.Type.setter = gui.Combo.before ( function ( value ) {
		console.log ( value );
	}) ( gui.Combo.after ( function () {
		gui.Broadcast.dispatchGlobal ( this, edb.BROADCAST_SETTER, this._instanceid );
	}
));
*/

edb.Type.xxxsetter = function ( key, base ) {
	return ( function () {
		var oldval = undefined;
		return function ( newval ) {
			base.apply ( this, arguments );
			console.log ( this._instanceid, {
				object: this,
				name: key,
				type: "updated",
  			oldValue: oldval,
  			newValue : newval
			});
			gui.Broadcast.dispatchGlobal ( this, edb.BROADCAST_SETTER, this._instanceid );
			oldval = newval;
		};
	}());
};

/*
edb.Type.setbefore = gui.Combo.before ( function ( value ) {
	console.log ( value );
});

edb.Type.setafter = gui.Combo.after ( function ( value ) {
	console.log ( value );
	gui.Broadcast.dispatchGlobal ( this, edb.BROADCAST_SETTER, this._instanceid );
});
*/

/**
 * Decorate getter methods on prototype.
 * @param {object} proto Prototype to decorate
 * @param {Array<String>} methods List of method names
 * @returns {object}
 */
edb.Type.decorateGetters = function ( proto, methods ) {
	methods.forEach ( function ( method ) {
		proto [ method ] = edb.Type.getter ( proto [ method ]);
	});
	return proto;
};

/**
 * Decorate setter methods on prototype.
 * @param {object} proto Prototype to decorate
 * @param {Array<String>} methods List of method names
 * @returns {object}
 */
edb.Type.decorateSetters = function ( proto, methods ) {
	methods.forEach ( function ( method ) {
		proto [ method ] = edb.Type.setter ( proto [ method ]);
	});
	return proto;
};

/**
 * Redefine the $instanceid to start with an underscore 
 * because of some iOS weirdness (does it still apply?)
 * @param {edb.Type} instance
 */
edb.Type.underscoreinstanceid = function ( instance ) {
	Object.defineProperty ( instance, "_instanceid", {
		value: instance.$instanceid
	});
};

/**
 * Is type instance?
 * @param {object} o
 * @returns {boolean}
 */
edb.Type.isInstance = function ( o ) {
	if ( gui.Type.isComplex ( o )) {
		return ( o instanceof edb.Object ) || ( o instanceof edb.Array );
	}
	return false;
};

/**
 * Lookup edb.Type constructor for argument (if not already an edb.Type).
 * @TODO Confirm that it is actually an edb.Type thing...
 * @param {Window|WebWorkerGlobalScope} arg
 * @param {function|string} arg
 * @returns {function} 
 */
edb.Type.lookup = function ( context, arg ) {	
	var type = null;
	switch ( gui.Type.of ( arg )) {
		case "function" :
			type = arg; // @TODO: confirm
			break;
		case "string" :
			type = gui.Object.lookup ( arg, context );
			break;
		case "object" :
			console.error ( this + ": expected edb.Type constructor (not an object)" );
			break;
	}
	if ( !type ) {
		throw new TypeError ( "The type \"" + arg + "\" does not exist" );
	}
	return type;
};