/**
 * @using {Array.prototype}
 */
( function using ( proto ) {

	/**
	 * edb.Array
	 * @extends {edb.Type} ...although not really...
	 */
	edb.Array = gui.Class.create ( "edb.Array", proto, {


		// Native ...............................................................................
		
		/**
		 * Push.
		 */
		push : function() {
			var res = proto.push.apply ( this, arguments );
			Array.forEach ( arguments, function ( arg ) {
				edb.Array._onchange ( this, 1, arg );
			}, this );
			return res;
		},
		
		/**
		 * Pop.
		 */
		pop : function () {
			var res = proto.pop.apply ( this, arguments );
			edb.Array._onchange ( this, 0, res );
			return res;
		},
		
		/**
		 * Shift.
		 */
		shift : function () {
			var res = proto.shift.apply ( this, arguments );
			edb.Array._onchange ( this, 0, res );
			return res;
		},

		/**
		 * Unshift.
		 */
		unshift : function () {
			var res = proto.unshift.apply ( this, arguments );
			Array.forEach ( arguments, function ( arg ) {
				edb.Array._onchange ( this, 1, arg );
			}, this );
			return res;
		},

		/**
		 * Splice.
		 */
		splice : function () {
			var res = proto.splice.apply ( this, arguments );
			var add = [].slice.call ( arguments, 2 );
			res.forEach ( function ( r ) {
				edb.Array._onchange ( this, 0, r );
			}, this );
			add.forEach ( function ( a ) {
				edb.Array._onchange ( this, 1, a );
			}, this );
			return res;
		},


		// Custom ...............................................................................

		/**
		 * The content type can be declared as:
		 *
		 * 1. An edb.Type constructor function (my.ns.MyType)
		 * 2. A filter function to accept JSON (for analysis) and return an edb.Type constructor.
		 * @type {function} Type constructor or filter function
		 */
		$of : null,

		/**
		 * Secret constructor.
		 */
		$onconstruct : function () {
			edb.Type.underscoreinstanceid ( this ); // iOS bug...
			if ( arguments.length ) {
				// accept one argument (an array) or use Arguments object as an array
				var args = [];
				if ( gui.Type.isArray ( arguments [ 0 ])) {
					args = arguments [ 0 ];
				} else {
					Array.forEach ( arguments, function ( arg ) {
						args.push ( arg );
					});
				}
				var type = this.$of;
				if ( gui.Type.isFunction ( type )) {
					args = args.map ( function ( o ) {
						if ( o !== undefined ) { // why can o be undefined in Firefox?
							if ( !o._instanceid ) { // TODO: underscore depends on iPad glitch, does it still glitch?
								var Type = type;//	type constructor or... 
								if ( !gui.Type.isConstructor ( Type )) { // ... filter function?
									Type = type ( o );
								}
								o = new Type ( o );
							}
						}
						return o;
					});
				} else {
					args = args.map ( function ( o ) {
						if ( !edb.Type.isInstance ( o )) {
							switch ( gui.Type.of ( o )) {
								case "object" : 
									return new edb.Object ( o );
								case "array" :
									return new edb.Array ( o );
								default :
									return o;
							}
						}
					});
				}

				args.forEach ( function ( arg ) {
					Array.prototype.push.call ( this, arg ); // bypassing broadcast mechanism
				}, this );
			}

			// proxy methods and invoke non-secret constructor
			edb.Array.approximate ( this );
			this.onconstruct.call ( this, arguments );
		},

		/**
		 * Create true array without expando properties, recursively 
		 * normalizing nested EDB types. This is the type of object 
		 * you would typically transmit to the server. 
		 * @returns {Array}
		 */
		$normalize : function () {
			return Array.map ( this, function ( thing ) {
				if ( edb.Type.isInstance ( thing )) {
					return thing.$normalize ();
				}
				return thing;
			});
		}
		
		
	}, {}, { // Static .........................................................................

		/**
		 * @param {edb.Array} array
		 */
		_onaccess : function ( array ) {},

		/**
		 * Register change summary for publication in next tick.
		 * @param {edb.Array} array
		 * @param {number} type
		 * @param {object} item
		 */
		_onchange : function ( array, type, item ) {
			type = {
				0 : edb.ArrayChange.TYPE_REMOVED,
				1 : edb.ArrayChange.TYPE_ADDED
			}[ type ];
			// console.log ( array, type, item ); TODO :)
		},

		/**
		 * Simplistic proxy mechanism. 
		 * @param {object} handler The object that intercepts properties (the edb.Array)
		 * @param {object} proxy The object whose properties are being intercepted (raw JSON data)
		 */
		approximate : function ( handler, proxy ) {
			var def = null;
			proxy = proxy || Object.create ( null );	
			this._definitions ( handler ).forEach ( function ( key ) {
				def = handler [ key ];
				switch ( gui.Type.of ( def )) {
					case "function" :
						break;
					case "object" :
					case "array" :
						console.warn ( "TODO: complex stuff on edb.Array :)" );
						break;
					default :
						if ( !gui.Type.isDefined ( proxy [ key ])) {
							proxy [ key ] = handler [ key ];
						}
						break;
				}
			});
			
			/* 
			 * Handler intercepts all accessors for simple properties.
			 */
			gui.Object.nonmethods ( proxy ).forEach ( function ( key ) {
				Object.defineProperty ( handler, key, {
					enumerable : true,
					configurable : true,
					get : edb.Type.getter ( function () {
						return proxy [ key ];
					}),
					set : edb.Type.setter ( function ( value ) {
						proxy [ key ] = value;
					})
				});
			});
		},

		/**
		 * Collect list of definitions to transfer from proxy to handler.
		 * @param {object} handler
		 * @returns {Array<String>}
		 */
		_definitions : function ( handler ) {
			var keys = [];
			for ( var key in handler ) {
				if ( this._define ( key )) {
					keys.push ( key );
				}
			}
			return keys;
		},

		/**
		 * Should define given property?
		 * @param {String} key
		 * @returns {boolean}
		 */
		_define : function ( key ) {
			if ( !gui.Type.isNumber ( gui.Type.cast ( key ))) {
				if ( !gui.Type.isDefined ( Array.prototype [ key ])) {
					if ( !gui.Type.isDefined ( edb.Type.prototype [ key ])) {
						if ( !key.startsWith ( "_" )) {
							return true;
						}
					}
				}
			}
			return false;
		}

	});

}( Array.prototype ));

/*
 * Overloading array methods.
 * @using {edb.Array.prototype}
 */
( function using ( proto ) {

	"use strict";

	/*
	 * Mixin methods and properties common 
	 * to both {edb.Object} and {edb.Array}
	 */
	gui.Object.extend ( proto, edb.Type.prototype );

	/*
	 * Dispatch a broadcast whenever the list is inspected or traversed.
	 */
	edb.Type.decorateGetters ( proto, [
		"filter", 
		"forEach", 
		"every", 
		"map", 
		"some", 
		"indexOf", 
		"lastIndexOf"
	]);

	/*
	 * Dispatch a broadcast whenever the list changes content or structure.
	 */
	edb.Type.decorateSetters ( proto, [
		"push", // add
		"unshift", // add
		"splice", // add or remove
		"pop", // remove
		"shift", // remove
		"reverse" // reversed (copies???????)
	]);
	
	/*
	 * TODO: This is wrong on so many...
	 * @param {edb.Array} other
	 */
	proto.concat = function ( other ) {
		var clone = new this.constructor (); // must not construct() the instance!
		this.forEach ( function ( o ) {
			clone.push ( o );
		});
		other.forEach ( function ( o ) {
			clone.push ( o );
		});
		return clone;
	};

	// @TODO "sort", "reverse", "join"
	
}( edb.Array.prototype ));
