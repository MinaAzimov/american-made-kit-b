/*!
 * ScrollMagic v2.0.5 (2015-04-29)
 * The javascript library for magical scroll interactions.
 * (c) 2015 Jan Paepke (@janpaepke)
 * Project Website: http://scrollmagic.io
 * 
 * @version 2.0.5
 * @license Dual licensed under MIT license and GPL.
 * @author Jan Paepke - e-mail@janpaepke.de
 *
 * @file Debug Extension for ScrollMagic.
 */
/**
 * This plugin was formerly known as the ScrollMagic debug extension.
 *
 * It enables you to add visual indicators to your page, to be able to see exactly when a scene is triggered.
 *
 * To have access to this extension, please include `plugins/debug.addIndicators.js`.
 * @mixin debug.addIndicators
 */
(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['ScrollMagic'], factory);
	} else if (typeof exports === 'object') {
		// CommonJS
		factory(require('scrollmagic'));
	} else {
		// no browser global export needed, just execute
		factory(root.ScrollMagic || (root.jQuery && root.jQuery.ScrollMagic));
	}
}(this, function (ScrollMagic) {
	"use strict";
	var NAMESPACE = "debug.addIndicators";

	var
	console = window.console || {},
		err = Function.prototype.bind.call(console.error || console.log ||
		function () {}, console);
	if (!ScrollMagic) {
		err("(" + NAMESPACE + ") -> ERROR: The ScrollMagic main module could not be found. Please make sure it's loaded before this plugin or use an asynchronous loader like requirejs.");
	}

	// plugin settings
	var
	FONT_SIZE = "0.85em",
		ZINDEX = "9999",
		EDGE_OFFSET = 15; // minimum edge distance, added to indentation

	// overall vars
	var
	_util = ScrollMagic._util,
		_autoindex = 0;



	ScrollMagic.Scene.extend(function () {
		var
		Scene = this,
			_indicator;

		var log = function () {
			if (Scene._log) { // not available, when main source minified
				Array.prototype.splice.call(arguments, 1, 0, "(" + NAMESPACE + ")", "->");
				Scene._log.apply(this, arguments);
			}
		};

		/**
		 * Add visual indicators for a ScrollMagic.Scene.  
		 * @memberof! debug.addIndicators#
		 *
		 * @example
		 * // add basic indicators
		 * scene.addIndicators()
		 *
		 * // passing options
		 * scene.addIndicators({name: "pin scene", colorEnd: "#FFFFFF"});
		 *
		 * @param {object} [options] - An object containing one or more options for the indicators.
		 * @param {(string|object)} [options.parent=undefined] - A selector, DOM Object or a jQuery object that the indicators should be added to.  
		 If undefined, the controller's container will be used.
		 * @param {number} [options.name=""] - This string will be displayed at the start and end indicators of the scene for identification purposes. If no name is supplied an automatic index will be used.
		 * @param {number} [options.indent=0] - Additional position offset for the indicators (useful, when having multiple scenes starting at the same position).
		 * @param {string} [options.colorStart=green] - CSS color definition for the start indicator.
		 * @param {string} [options.colorEnd=red] - CSS color definition for the end indicator.
		 * @param {string} [options.colorTrigger=blue] - CSS color definition for the trigger indicator.
		 */
		Scene.addIndicators = function (options) {
			if (!_indicator) {
				var
				DEFAULT_OPTIONS = {
					name: "",
					indent: 0,
					parent: undefined,
					colorStart: "green",
					colorEnd: "red",
					colorTrigger: "blue",
				};

				options = _util.extend({}, DEFAULT_OPTIONS, options);

				_autoindex++;
				_indicator = new Indicator(Scene, options);

				Scene.on("add.plugin_addIndicators", _indicator.add);
				Scene.on("remove.plugin_addIndicators", _indicator.remove);
				Scene.on("destroy.plugin_addIndicators", Scene.removeIndicators);

				// it the scene already has a controller we can start right away.
				if (Scene.controller()) {
					_indicator.add();
				}
			}
			return Scene;
		};

		/**
		 * Removes visual indicators from a ScrollMagic.Scene.
		 * @memberof! debug.addIndicators#
		 *
		 * @example
		 * // remove previously added indicators
		 * scene.removeIndicators()
		 *
		 */
		Scene.removeIndicators = function () {
			if (_indicator) {
				_indicator.remove();
				this.off("*.plugin_addIndicators");
				_indicator = undefined;
			}
			return Scene;
		};

	});


/*
	 * ----------------------------------------------------------------
	 * Extension for controller to store and update related indicators
	 * ----------------------------------------------------------------
	 */
	// add option to globally auto-add indicators to scenes
	/**
	 * Every ScrollMagic.Controller instance now accepts an additional option.  
	 * See {@link ScrollMagic.Controller} for a complete list of the standard options.
	 * @memberof! debug.addIndicators#
	 * @method new ScrollMagic.Controller(options)
	 * @example
	 * // make a controller and add indicators to all scenes attached
	 * var controller = new ScrollMagic.Controller({addIndicators: true});
	 * // this scene will automatically have indicators added to it
	 * new ScrollMagic.Scene()
	 *                .addTo(controller);
	 *
	 * @param {object} [options] - Options for the Controller.
	 * @param {boolean} [options.addIndicators=false] - If set to `true` every scene that is added to the controller will automatically get indicators added to it.
	 */
	ScrollMagic.Controller.addOption("addIndicators", false);
	// extend Controller
	ScrollMagic.Controller.extend(function () {
		var
		Controller = this,
			_info = Controller.info(),
			_container = _info.container,
			_isDocument = _info.isDocument,
			_vertical = _info.vertical,
			_indicators = { // container for all indicators and methods
				groups: []
			};

		var log = function () {
			if (Controller._log) { // not available, when main source minified
				Array.prototype.splice.call(arguments, 1, 0, "(" + NAMESPACE + ")", "->");
				Controller._log.apply(this, arguments);
			}
		};
		if (Controller._indicators) {
			log(2, "WARNING: Scene already has a property '_indicators', which will be overwritten by plugin.");
		}

		// add indicators container
		this._indicators = _indicators;
/*
			needed updates:
			+++++++++++++++
			start/end position on scene shift (handled in Indicator class)
			trigger parameters on triggerHook value change (handled in Indicator class)
			bounds position on container scroll or resize (to keep alignment to bottom/right)
			trigger position on container resize, window resize (if container isn't document) and window scroll (if container isn't document)
		*/

		// event handler for when associated bounds markers need to be repositioned
		var handleBoundsPositionChange = function () {
			_indicators.updateBoundsPositions();
		};

		// event handler for when associated trigger groups need to be repositioned
		var handleTriggerPositionChange = function () {
			_indicators.updateTriggerGroupPositions();
		};

		_container.addEventListener("resize", handleTriggerPositionChange);
		if (!_isDocument) {
			window.addEventListener("resize", handleTriggerPositionChange);
			window.addEventListener("scroll", handleTriggerPositionChange);
		}
		// update all related bounds containers
		_container.addEventListener("resize", handleBoundsPositionChange);
		_container.addEventListener("scroll", handleBoundsPositionChange);


		// updates the position of the bounds container to aligned to the right for vertical containers and to the bottom for horizontal
		this._indicators.updateBoundsPositions = function (specificIndicator) {
			var // constant for all bounds
			groups = specificIndicator ? [_util.extend({}, specificIndicator.triggerGroup, {
				members: [specificIndicator]
			})] : // create a group with only one element
			_indicators.groups,
				// use all
				g = groups.length,
				css = {},
				paramPos = _vertical ? "left" : "top",
				paramDimension = _vertical ? "width" : "height",
				edge = _vertical ? _util.get.scrollLeft(_container) + _util.get.width(_container) - EDGE_OFFSET : _util.get.scrollTop(_container) + _util.get.height(_container) - EDGE_OFFSET,
				b, triggerSize, group;
			while (g--) { // group loop
				group = groups[g];
				b = group.members.length;
				triggerSize = _util.get[paramDimension](group.element.firstChild);
				while (b--) { // indicators loop
					css[paramPos] = edge - triggerSize;
					_util.css(group.members[b].bounds, css);
				}
			}
		};

		// updates the positions of all trigger groups attached to a controller or a specific one, if provided
		this._indicators.updateTriggerGroupPositions = function (specificGroup) {
			var // constant vars
			groups = specificGroup ? [specificGroup] : _indicators.groups,
				i = groups.length,
				container = _isDocument ? document.body : _container,
				containerOffset = _isDocument ? {
					top: 0,
					left: 0
				} : _util.get.offset(container, true),
				edge = _vertical ? _util.get.width(_container) - EDGE_OFFSET : _util.get.height(_container) - EDGE_OFFSET,
				paramDimension = _vertical ? "width" : "height",
				paramTransform = _vertical ? "Y" : "X";
			var // changing vars
			group, elem, pos, elemSize, transform;
			while (i--) {
				group = groups[i];
				elem = group.element;
				pos = group.triggerHook * Controller.info("size");
				elemSize = _util.get[paramDimension](elem.firstChild.firstChild);
				transform = pos > elemSize ? "translate" + paramTransform + "(-100%)" : "";

				_util.css(elem, {
					top: containerOffset.top + (_vertical ? pos : edge - group.members[0].options.indent),
					left: containerOffset.left + (_vertical ? edge - group.members[0].options.indent : pos)
				});
				_util.css(elem.firstChild.firstChild, {
					"-ms-transform": transform,
					"-webkit-transform": transform,
					"transform": transform
				});
			}
		};

		// updates the label for the group to contain the name, if it only has one member
		this._indicators.updateTriggerGroupLabel = function (group) {
			var
			text = "trigger" + (group.members.length > 1 ? "" : " " + group.members[0].options.name),
				elem = group.element.firstChild.firstChild,
				doUpdate = elem.textContent !== text;
			if (doUpdate) {
				elem.textContent = text;
				if (_vertical) { // bounds position is dependent on text length, so update
					_indicators.updateBoundsPositions();
				}
			}
		};

		// add indicators if global option is set
		this.addScene = function (newScene) {

			if (this._options.addIndicators && newScene instanceof ScrollMagic.Scene && newScene.controller() === Controller) {
				newScene.addIndicators();
			}
			// call original destroy method
			this.$super.addScene.apply(this, arguments);
		};

		// remove all previously set listeners on destroy
		this.destroy = function () {
			_container.removeEventListener("resize", handleTriggerPositionChange);
			if (!_isDocument) {
				window.removeEventListener("resize", handleTriggerPositionChange);
				window.removeEventListener("scroll", handleTriggerPositionChange);
			}
			_container.removeEventListener("resize", handleBoundsPositionChange);
			_container.removeEventListener("scroll", handleBoundsPositionChange);
			// call original destroy method
			this.$super.destroy.apply(this, arguments);
		};
		return Controller;

	});

/*
	 * ----------------------------------------------------------------
	 * Internal class for the construction of Indicators
	 * ----------------------------------------------------------------
	 */
	var Indicator = function (Scene, options) {
		var
		Indicator = this,
			_elemBounds = TPL.bounds(),
			_elemStart = TPL.start(options.colorStart),
			_elemEnd = TPL.end(options.colorEnd),
			_boundsContainer = options.parent && _util.get.elements(options.parent)[0],
			_vertical, _ctrl;

		var log = function () {
			if (Scene._log) { // not available, when main source minified
				Array.prototype.splice.call(arguments, 1, 0, "(" + NAMESPACE + ")", "->");
				Scene._log.apply(this, arguments);
			}
		};

		options.name = options.name || _autoindex;

		// prepare bounds elements
		_elemStart.firstChild.textContent += " " + options.name;
		_elemEnd.textContent += " " + options.name;
		_elemBounds.appendChild(_elemStart);
		_elemBounds.appendChild(_elemEnd);

		// set public variables
		Indicator.options = options;
		Indicator.bounds = _elemBounds;
		// will be set later
		Indicator.triggerGroup = undefined;

		// add indicators to DOM
		this.add = function () {
			_ctrl = Scene.controller();
			_vertical = _ctrl.info("vertical");

			var isDocument = _ctrl.info("isDocument");

			if (!_boundsContainer) {
				// no parent supplied or doesnt exist
				_boundsContainer = isDocument ? document.body : _ctrl.info("container"); // check if window/document (then use body)
			}
			if (!isDocument && _util.css(_boundsContainer, "position") === 'static') {
				// position mode needed for correct positioning of indicators
				_util.css(_boundsContainer, {
					position: "relative"
				});
			}

			// add listeners for updates
			Scene.on("change.plugin_addIndicators", handleTriggerParamsChange);
			Scene.on("shift.plugin_addIndicators", handleBoundsParamsChange);

			// updates trigger & bounds (will add elements if needed)
			updateTriggerGroup();
			updateBounds();

			setTimeout(function () { // do after all execution is finished otherwise sometimes size calculations are off
				_ctrl._indicators.updateBoundsPositions(Indicator);
			}, 0);

			log(3, "added indicators");
		};

		// remove indicators from DOM
		this.remove = function () {
			if (Indicator.triggerGroup) { // if not set there's nothing to remove
				Scene.off("change.plugin_addIndicators", handleTriggerParamsChange);
				Scene.off("shift.plugin_addIndicators", handleBoundsParamsChange);

				if (Indicator.triggerGroup.members.length > 1) {
					// just remove from memberlist of old group
					var group = Indicator.triggerGroup;
					group.members.splice(group.members.indexOf(Indicator), 1);
					_ctrl._indicators.updateTriggerGroupLabel(group);
					_ctrl._indicators.updateTriggerGroupPositions(group);
					Indicator.triggerGroup = undefined;
				} else {
					// remove complete group
					removeTriggerGroup();
				}
				removeBounds();

				log(3, "removed indicators");
			}
		};

/*
		 * ----------------------------------------------------------------
		 * internal Event Handlers
		 * ----------------------------------------------------------------
		 */

		// event handler for when bounds params change
		var handleBoundsParamsChange = function () {
			updateBounds();
		};

		// event handler for when trigger params change
		var handleTriggerParamsChange = function (e) {
			if (e.what === "triggerHook") {
				updateTriggerGroup();
			}
		};

/*
		 * ----------------------------------------------------------------
		 * Bounds (start / stop) management
		 * ----------------------------------------------------------------
		 */

		// adds an new bounds elements to the array and to the DOM
		var addBounds = function () {
			var v = _ctrl.info("vertical");
			// apply stuff we didn't know before...
			_util.css(_elemStart.firstChild, {
				"border-bottom-width": v ? 1 : 0,
				"border-right-width": v ? 0 : 1,
				"bottom": v ? -1 : options.indent,
				"right": v ? options.indent : -1,
				"padding": v ? "0 8px" : "2px 4px",
			});
			_util.css(_elemEnd, {
				"border-top-width": v ? 1 : 0,
				"border-left-width": v ? 0 : 1,
				"top": v ? "100%" : "",
				"right": v ? options.indent : "",
				"bottom": v ? "" : options.indent,
				"left": v ? "" : "100%",
				"padding": v ? "0 8px" : "2px 4px"
			});
			// append
			_boundsContainer.appendChild(_elemBounds);
		};

		// remove bounds from list and DOM
		var removeBounds = function () {
			_elemBounds.parentNode.removeChild(_elemBounds);
		};

		// update the start and end positions of the scene
		var updateBounds = function () {
			if (_elemBounds.parentNode !== _boundsContainer) {
				addBounds(); // Add Bounds elements (start/end)
			}
			var css = {};
			css[_vertical ? "top" : "left"] = Scene.triggerPosition();
			css[_vertical ? "height" : "width"] = Scene.duration();
			_util.css(_elemBounds, css);
			_util.css(_elemEnd, {
				display: Scene.duration() > 0 ? "" : "none"
			});
		};

/*
		 * ----------------------------------------------------------------
		 * trigger and trigger group management
		 * ----------------------------------------------------------------
		 */

		// adds an new trigger group to the array and to the DOM
		var addTriggerGroup = function () {
			var triggerElem = TPL.trigger(options.colorTrigger); // new trigger element
			var css = {};
			css[_vertical ? "right" : "bottom"] = 0;
			css[_vertical ? "border-top-width" : "border-left-width"] = 1;
			_util.css(triggerElem.firstChild, css);
			_util.css(triggerElem.firstChild.firstChild, {
				padding: _vertical ? "0 8px 3px 8px" : "3px 4px"
			});
			document.body.appendChild(triggerElem); // directly add to body
			var newGroup = {
				triggerHook: Scene.triggerHook(),
				element: triggerElem,
				members: [Indicator]
			};
			_ctrl._indicators.groups.push(newGroup);
			Indicator.triggerGroup = newGroup;
			// update right away
			_ctrl._indicators.updateTriggerGroupLabel(newGroup);
			_ctrl._indicators.updateTriggerGroupPositions(newGroup);
		};

		var removeTriggerGroup = function () {
			_ctrl._indicators.groups.splice(_ctrl._indicators.groups.indexOf(Indicator.triggerGroup), 1);
			Indicator.triggerGroup.element.parentNode.removeChild(Indicator.triggerGroup.element);
			Indicator.triggerGroup = undefined;
		};

		// updates the trigger group -> either join existing or add new one
/*	
		 * Logic:
		 * 1 if a trigger group exist, check if it's in sync with Scene settings – if so, nothing else needs to happen
		 * 2 try to find an existing one that matches Scene parameters
		 * 	 2.1 If a match is found check if already assigned to an existing group
		 *			 If so:
		 *       A: it was the last member of existing group -> kill whole group
		 *       B: the existing group has other members -> just remove from member list
		 *	 2.2 Assign to matching group
		 * 3 if no new match could be found, check if assigned to existing group
		 *   A: yes, and it's the only member -> just update parameters and positions and keep using this group
		 *   B: yes but there are other members -> remove from member list and create a new one
		 *   C: no, so create a new one
		 */
		var updateTriggerGroup = function () {
			var
			triggerHook = Scene.triggerHook(),
				closeEnough = 0.0001;

			// Have a group, check if it still matches
			if (Indicator.triggerGroup) {
				if (Math.abs(Indicator.triggerGroup.triggerHook - triggerHook) < closeEnough) {
					// _util.log(0, "trigger", options.name, "->", "no need to change, still in sync");
					return; // all good
				}
			}
			// Don't have a group, check if a matching one exists
			// _util.log(0, "trigger", options.name, "->", "out of sync!");
			var
			groups = _ctrl._indicators.groups,
				group, i = groups.length;
			while (i--) {
				group = groups[i];
				if (Math.abs(group.triggerHook - triggerHook) < closeEnough) {
					// found a match!
					// _util.log(0, "trigger", options.name, "->", "found match");
					if (Indicator.triggerGroup) { // do I have an old group that is out of sync?
						if (Indicator.triggerGroup.members.length === 1) { // is it the only remaining group?
							// _util.log(0, "trigger", options.name, "->", "kill");
							// was the last member, remove the whole group
							removeTriggerGroup();
						} else {
							Indicator.triggerGroup.members.splice(Indicator.triggerGroup.members.indexOf(Indicator), 1); // just remove from memberlist of old group
							_ctrl._indicators.updateTriggerGroupLabel(Indicator.triggerGroup);
							_ctrl._indicators.updateTriggerGroupPositions(Indicator.triggerGroup);
							// _util.log(0, "trigger", options.name, "->", "removing from previous member list");
						}
					}
					// join new group
					group.members.push(Indicator);
					Indicator.triggerGroup = group;
					_ctrl._indicators.updateTriggerGroupLabel(group);
					return;
				}
			}

			// at this point I am obviously out of sync and don't match any other group
			if (Indicator.triggerGroup) {
				if (Indicator.triggerGroup.members.length === 1) {
					// _util.log(0, "trigger", options.name, "->", "updating existing");
					// out of sync but i'm the only member => just change and update
					Indicator.triggerGroup.triggerHook = triggerHook;
					_ctrl._indicators.updateTriggerGroupPositions(Indicator.triggerGroup);
					return;
				} else {
					// _util.log(0, "trigger", options.name, "->", "removing from previous member list");
					Indicator.triggerGroup.members.splice(Indicator.triggerGroup.members.indexOf(Indicator), 1); // just remove from memberlist of old group
					_ctrl._indicators.updateTriggerGroupLabel(Indicator.triggerGroup);
					_ctrl._indicators.updateTriggerGroupPositions(Indicator.triggerGroup);
					Indicator.triggerGroup = undefined; // need a brand new group...
				}
			}
			// _util.log(0, "trigger", options.name, "->", "add a new one");
			// did not find any match, make new trigger group
			addTriggerGroup();
		};
	};

/*
	 * ----------------------------------------------------------------
	 * Templates for the indicators
	 * ----------------------------------------------------------------
	 */
	var TPL = {
		start: function (color) {
			// inner element (for bottom offset -1, while keeping top position 0)
			var inner = document.createElement("div");
			inner.textContent = "start";
			_util.css(inner, {
				position: "absolute",
				overflow: "visible",
				"border-width": 0,
				"border-style": "solid",
				color: color,
				"border-color": color
			});
			var e = document.createElement('div');
			// wrapper
			_util.css(e, {
				position: "absolute",
				overflow: "visible",
				width: 0,
				height: 0
			});
			e.appendChild(inner);
			return e;
		},
		end: function (color) {
			var e = document.createElement('div');
			e.textContent = "end";
			_util.css(e, {
				position: "absolute",
				overflow: "visible",
				"border-width": 0,
				"border-style": "solid",
				color: color,
				"border-color": color
			});
			return e;
		},
		bounds: function () {
			var e = document.createElement('div');
			_util.css(e, {
				position: "absolute",
				overflow: "visible",
				"white-space": "nowrap",
				"pointer-events": "none",
				"font-size": FONT_SIZE
			});
			e.style.zIndex = ZINDEX;
			return e;
		},
		trigger: function (color) {
			// inner to be above or below line but keep position
			var inner = document.createElement('div');
			inner.textContent = "trigger";
			_util.css(inner, {
				position: "relative",
			});
			// inner wrapper for right: 0 and main element has no size
			var w = document.createElement('div');
			_util.css(w, {
				position: "absolute",
				overflow: "visible",
				"border-width": 0,
				"border-style": "solid",
				color: color,
				"border-color": color
			});
			w.appendChild(inner);
			// wrapper
			var e = document.createElement('div');
			_util.css(e, {
				position: "fixed",
				overflow: "visible",
				"white-space": "nowrap",
				"pointer-events": "none",
				"font-size": FONT_SIZE
			});
			e.style.zIndex = ZINDEX;
			e.appendChild(w);
			return e;
		},
	};

}));
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJ2ZW5kb3IvcGx1Z2lucy9kZWJ1Zy5hZGRJbmRpY2F0b3JzLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICogU2Nyb2xsTWFnaWMgdjIuMC41ICgyMDE1LTA0LTI5KVxuICogVGhlIGphdmFzY3JpcHQgbGlicmFyeSBmb3IgbWFnaWNhbCBzY3JvbGwgaW50ZXJhY3Rpb25zLlxuICogKGMpIDIwMTUgSmFuIFBhZXBrZSAoQGphbnBhZXBrZSlcbiAqIFByb2plY3QgV2Vic2l0ZTogaHR0cDovL3Njcm9sbG1hZ2ljLmlvXG4gKiBcbiAqIEB2ZXJzaW9uIDIuMC41XG4gKiBAbGljZW5zZSBEdWFsIGxpY2Vuc2VkIHVuZGVyIE1JVCBsaWNlbnNlIGFuZCBHUEwuXG4gKiBAYXV0aG9yIEphbiBQYWVwa2UgLSBlLW1haWxAamFucGFlcGtlLmRlXG4gKlxuICogQGZpbGUgRGVidWcgRXh0ZW5zaW9uIGZvciBTY3JvbGxNYWdpYy5cbiAqL1xuLyoqXG4gKiBUaGlzIHBsdWdpbiB3YXMgZm9ybWVybHkga25vd24gYXMgdGhlIFNjcm9sbE1hZ2ljIGRlYnVnIGV4dGVuc2lvbi5cbiAqXG4gKiBJdCBlbmFibGVzIHlvdSB0byBhZGQgdmlzdWFsIGluZGljYXRvcnMgdG8geW91ciBwYWdlLCB0byBiZSBhYmxlIHRvIHNlZSBleGFjdGx5IHdoZW4gYSBzY2VuZSBpcyB0cmlnZ2VyZWQuXG4gKlxuICogVG8gaGF2ZSBhY2Nlc3MgdG8gdGhpcyBleHRlbnNpb24sIHBsZWFzZSBpbmNsdWRlIGBwbHVnaW5zL2RlYnVnLmFkZEluZGljYXRvcnMuanNgLlxuICogQG1peGluIGRlYnVnLmFkZEluZGljYXRvcnNcbiAqL1xuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG5cdGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcblx0XHQvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG5cdFx0ZGVmaW5lKFsnU2Nyb2xsTWFnaWMnXSwgZmFjdG9yeSk7XG5cdH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG5cdFx0Ly8gQ29tbW9uSlNcblx0XHRmYWN0b3J5KHJlcXVpcmUoJ3Njcm9sbG1hZ2ljJykpO1xuXHR9IGVsc2Uge1xuXHRcdC8vIG5vIGJyb3dzZXIgZ2xvYmFsIGV4cG9ydCBuZWVkZWQsIGp1c3QgZXhlY3V0ZVxuXHRcdGZhY3Rvcnkocm9vdC5TY3JvbGxNYWdpYyB8fCAocm9vdC5qUXVlcnkgJiYgcm9vdC5qUXVlcnkuU2Nyb2xsTWFnaWMpKTtcblx0fVxufSh0aGlzLCBmdW5jdGlvbiAoU2Nyb2xsTWFnaWMpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cdHZhciBOQU1FU1BBQ0UgPSBcImRlYnVnLmFkZEluZGljYXRvcnNcIjtcblxuXHR2YXJcblx0Y29uc29sZSA9IHdpbmRvdy5jb25zb2xlIHx8IHt9LFxuXHRcdGVyciA9IEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kLmNhbGwoY29uc29sZS5lcnJvciB8fCBjb25zb2xlLmxvZyB8fFxuXHRcdGZ1bmN0aW9uICgpIHt9LCBjb25zb2xlKTtcblx0aWYgKCFTY3JvbGxNYWdpYykge1xuXHRcdGVycihcIihcIiArIE5BTUVTUEFDRSArIFwiKSAtPiBFUlJPUjogVGhlIFNjcm9sbE1hZ2ljIG1haW4gbW9kdWxlIGNvdWxkIG5vdCBiZSBmb3VuZC4gUGxlYXNlIG1ha2Ugc3VyZSBpdCdzIGxvYWRlZCBiZWZvcmUgdGhpcyBwbHVnaW4gb3IgdXNlIGFuIGFzeW5jaHJvbm91cyBsb2FkZXIgbGlrZSByZXF1aXJlanMuXCIpO1xuXHR9XG5cblx0Ly8gcGx1Z2luIHNldHRpbmdzXG5cdHZhclxuXHRGT05UX1NJWkUgPSBcIjAuODVlbVwiLFxuXHRcdFpJTkRFWCA9IFwiOTk5OVwiLFxuXHRcdEVER0VfT0ZGU0VUID0gMTU7IC8vIG1pbmltdW0gZWRnZSBkaXN0YW5jZSwgYWRkZWQgdG8gaW5kZW50YXRpb25cblxuXHQvLyBvdmVyYWxsIHZhcnNcblx0dmFyXG5cdF91dGlsID0gU2Nyb2xsTWFnaWMuX3V0aWwsXG5cdFx0X2F1dG9pbmRleCA9IDA7XG5cblxuXG5cdFNjcm9sbE1hZ2ljLlNjZW5lLmV4dGVuZChmdW5jdGlvbiAoKSB7XG5cdFx0dmFyXG5cdFx0U2NlbmUgPSB0aGlzLFxuXHRcdFx0X2luZGljYXRvcjtcblxuXHRcdHZhciBsb2cgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoU2NlbmUuX2xvZykgeyAvLyBub3QgYXZhaWxhYmxlLCB3aGVuIG1haW4gc291cmNlIG1pbmlmaWVkXG5cdFx0XHRcdEFycmF5LnByb3RvdHlwZS5zcGxpY2UuY2FsbChhcmd1bWVudHMsIDEsIDAsIFwiKFwiICsgTkFNRVNQQUNFICsgXCIpXCIsIFwiLT5cIik7XG5cdFx0XHRcdFNjZW5lLl9sb2cuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogQWRkIHZpc3VhbCBpbmRpY2F0b3JzIGZvciBhIFNjcm9sbE1hZ2ljLlNjZW5lLiAgXG5cdFx0ICogQG1lbWJlcm9mISBkZWJ1Zy5hZGRJbmRpY2F0b3JzI1xuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiAvLyBhZGQgYmFzaWMgaW5kaWNhdG9yc1xuXHRcdCAqIHNjZW5lLmFkZEluZGljYXRvcnMoKVxuXHRcdCAqXG5cdFx0ICogLy8gcGFzc2luZyBvcHRpb25zXG5cdFx0ICogc2NlbmUuYWRkSW5kaWNhdG9ycyh7bmFtZTogXCJwaW4gc2NlbmVcIiwgY29sb3JFbmQ6IFwiI0ZGRkZGRlwifSk7XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdIC0gQW4gb2JqZWN0IGNvbnRhaW5pbmcgb25lIG9yIG1vcmUgb3B0aW9ucyBmb3IgdGhlIGluZGljYXRvcnMuXG5cdFx0ICogQHBhcmFtIHsoc3RyaW5nfG9iamVjdCl9IFtvcHRpb25zLnBhcmVudD11bmRlZmluZWRdIC0gQSBzZWxlY3RvciwgRE9NIE9iamVjdCBvciBhIGpRdWVyeSBvYmplY3QgdGhhdCB0aGUgaW5kaWNhdG9ycyBzaG91bGQgYmUgYWRkZWQgdG8uICBcblx0XHQgSWYgdW5kZWZpbmVkLCB0aGUgY29udHJvbGxlcidzIGNvbnRhaW5lciB3aWxsIGJlIHVzZWQuXG5cdFx0ICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLm5hbWU9XCJcIl0gLSBUaGlzIHN0cmluZyB3aWxsIGJlIGRpc3BsYXllZCBhdCB0aGUgc3RhcnQgYW5kIGVuZCBpbmRpY2F0b3JzIG9mIHRoZSBzY2VuZSBmb3IgaWRlbnRpZmljYXRpb24gcHVycG9zZXMuIElmIG5vIG5hbWUgaXMgc3VwcGxpZWQgYW4gYXV0b21hdGljIGluZGV4IHdpbGwgYmUgdXNlZC5cblx0XHQgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMuaW5kZW50PTBdIC0gQWRkaXRpb25hbCBwb3NpdGlvbiBvZmZzZXQgZm9yIHRoZSBpbmRpY2F0b3JzICh1c2VmdWwsIHdoZW4gaGF2aW5nIG11bHRpcGxlIHNjZW5lcyBzdGFydGluZyBhdCB0aGUgc2FtZSBwb3NpdGlvbikuXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IFtvcHRpb25zLmNvbG9yU3RhcnQ9Z3JlZW5dIC0gQ1NTIGNvbG9yIGRlZmluaXRpb24gZm9yIHRoZSBzdGFydCBpbmRpY2F0b3IuXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IFtvcHRpb25zLmNvbG9yRW5kPXJlZF0gLSBDU1MgY29sb3IgZGVmaW5pdGlvbiBmb3IgdGhlIGVuZCBpbmRpY2F0b3IuXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IFtvcHRpb25zLmNvbG9yVHJpZ2dlcj1ibHVlXSAtIENTUyBjb2xvciBkZWZpbml0aW9uIGZvciB0aGUgdHJpZ2dlciBpbmRpY2F0b3IuXG5cdFx0ICovXG5cdFx0U2NlbmUuYWRkSW5kaWNhdG9ycyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG5cdFx0XHRpZiAoIV9pbmRpY2F0b3IpIHtcblx0XHRcdFx0dmFyXG5cdFx0XHRcdERFRkFVTFRfT1BUSU9OUyA9IHtcblx0XHRcdFx0XHRuYW1lOiBcIlwiLFxuXHRcdFx0XHRcdGluZGVudDogMCxcblx0XHRcdFx0XHRwYXJlbnQ6IHVuZGVmaW5lZCxcblx0XHRcdFx0XHRjb2xvclN0YXJ0OiBcImdyZWVuXCIsXG5cdFx0XHRcdFx0Y29sb3JFbmQ6IFwicmVkXCIsXG5cdFx0XHRcdFx0Y29sb3JUcmlnZ2VyOiBcImJsdWVcIixcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRvcHRpb25zID0gX3V0aWwuZXh0ZW5kKHt9LCBERUZBVUxUX09QVElPTlMsIG9wdGlvbnMpO1xuXG5cdFx0XHRcdF9hdXRvaW5kZXgrKztcblx0XHRcdFx0X2luZGljYXRvciA9IG5ldyBJbmRpY2F0b3IoU2NlbmUsIG9wdGlvbnMpO1xuXG5cdFx0XHRcdFNjZW5lLm9uKFwiYWRkLnBsdWdpbl9hZGRJbmRpY2F0b3JzXCIsIF9pbmRpY2F0b3IuYWRkKTtcblx0XHRcdFx0U2NlbmUub24oXCJyZW1vdmUucGx1Z2luX2FkZEluZGljYXRvcnNcIiwgX2luZGljYXRvci5yZW1vdmUpO1xuXHRcdFx0XHRTY2VuZS5vbihcImRlc3Ryb3kucGx1Z2luX2FkZEluZGljYXRvcnNcIiwgU2NlbmUucmVtb3ZlSW5kaWNhdG9ycyk7XG5cblx0XHRcdFx0Ly8gaXQgdGhlIHNjZW5lIGFscmVhZHkgaGFzIGEgY29udHJvbGxlciB3ZSBjYW4gc3RhcnQgcmlnaHQgYXdheS5cblx0XHRcdFx0aWYgKFNjZW5lLmNvbnRyb2xsZXIoKSkge1xuXHRcdFx0XHRcdF9pbmRpY2F0b3IuYWRkKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBTY2VuZTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogUmVtb3ZlcyB2aXN1YWwgaW5kaWNhdG9ycyBmcm9tIGEgU2Nyb2xsTWFnaWMuU2NlbmUuXG5cdFx0ICogQG1lbWJlcm9mISBkZWJ1Zy5hZGRJbmRpY2F0b3JzI1xuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiAvLyByZW1vdmUgcHJldmlvdXNseSBhZGRlZCBpbmRpY2F0b3JzXG5cdFx0ICogc2NlbmUucmVtb3ZlSW5kaWNhdG9ycygpXG5cdFx0ICpcblx0XHQgKi9cblx0XHRTY2VuZS5yZW1vdmVJbmRpY2F0b3JzID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKF9pbmRpY2F0b3IpIHtcblx0XHRcdFx0X2luZGljYXRvci5yZW1vdmUoKTtcblx0XHRcdFx0dGhpcy5vZmYoXCIqLnBsdWdpbl9hZGRJbmRpY2F0b3JzXCIpO1xuXHRcdFx0XHRfaW5kaWNhdG9yID0gdW5kZWZpbmVkO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIFNjZW5lO1xuXHRcdH07XG5cblx0fSk7XG5cblxuLypcblx0ICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQgKiBFeHRlbnNpb24gZm9yIGNvbnRyb2xsZXIgdG8gc3RvcmUgYW5kIHVwZGF0ZSByZWxhdGVkIGluZGljYXRvcnNcblx0ICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQgKi9cblx0Ly8gYWRkIG9wdGlvbiB0byBnbG9iYWxseSBhdXRvLWFkZCBpbmRpY2F0b3JzIHRvIHNjZW5lc1xuXHQvKipcblx0ICogRXZlcnkgU2Nyb2xsTWFnaWMuQ29udHJvbGxlciBpbnN0YW5jZSBub3cgYWNjZXB0cyBhbiBhZGRpdGlvbmFsIG9wdGlvbi4gIFxuXHQgKiBTZWUge0BsaW5rIFNjcm9sbE1hZ2ljLkNvbnRyb2xsZXJ9IGZvciBhIGNvbXBsZXRlIGxpc3Qgb2YgdGhlIHN0YW5kYXJkIG9wdGlvbnMuXG5cdCAqIEBtZW1iZXJvZiEgZGVidWcuYWRkSW5kaWNhdG9ycyNcblx0ICogQG1ldGhvZCBuZXcgU2Nyb2xsTWFnaWMuQ29udHJvbGxlcihvcHRpb25zKVxuXHQgKiBAZXhhbXBsZVxuXHQgKiAvLyBtYWtlIGEgY29udHJvbGxlciBhbmQgYWRkIGluZGljYXRvcnMgdG8gYWxsIHNjZW5lcyBhdHRhY2hlZFxuXHQgKiB2YXIgY29udHJvbGxlciA9IG5ldyBTY3JvbGxNYWdpYy5Db250cm9sbGVyKHthZGRJbmRpY2F0b3JzOiB0cnVlfSk7XG5cdCAqIC8vIHRoaXMgc2NlbmUgd2lsbCBhdXRvbWF0aWNhbGx5IGhhdmUgaW5kaWNhdG9ycyBhZGRlZCB0byBpdFxuXHQgKiBuZXcgU2Nyb2xsTWFnaWMuU2NlbmUoKVxuXHQgKiAgICAgICAgICAgICAgICAuYWRkVG8oY29udHJvbGxlcik7XG5cdCAqXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc10gLSBPcHRpb25zIGZvciB0aGUgQ29udHJvbGxlci5cblx0ICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5hZGRJbmRpY2F0b3JzPWZhbHNlXSAtIElmIHNldCB0byBgdHJ1ZWAgZXZlcnkgc2NlbmUgdGhhdCBpcyBhZGRlZCB0byB0aGUgY29udHJvbGxlciB3aWxsIGF1dG9tYXRpY2FsbHkgZ2V0IGluZGljYXRvcnMgYWRkZWQgdG8gaXQuXG5cdCAqL1xuXHRTY3JvbGxNYWdpYy5Db250cm9sbGVyLmFkZE9wdGlvbihcImFkZEluZGljYXRvcnNcIiwgZmFsc2UpO1xuXHQvLyBleHRlbmQgQ29udHJvbGxlclxuXHRTY3JvbGxNYWdpYy5Db250cm9sbGVyLmV4dGVuZChmdW5jdGlvbiAoKSB7XG5cdFx0dmFyXG5cdFx0Q29udHJvbGxlciA9IHRoaXMsXG5cdFx0XHRfaW5mbyA9IENvbnRyb2xsZXIuaW5mbygpLFxuXHRcdFx0X2NvbnRhaW5lciA9IF9pbmZvLmNvbnRhaW5lcixcblx0XHRcdF9pc0RvY3VtZW50ID0gX2luZm8uaXNEb2N1bWVudCxcblx0XHRcdF92ZXJ0aWNhbCA9IF9pbmZvLnZlcnRpY2FsLFxuXHRcdFx0X2luZGljYXRvcnMgPSB7IC8vIGNvbnRhaW5lciBmb3IgYWxsIGluZGljYXRvcnMgYW5kIG1ldGhvZHNcblx0XHRcdFx0Z3JvdXBzOiBbXVxuXHRcdFx0fTtcblxuXHRcdHZhciBsb2cgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoQ29udHJvbGxlci5fbG9nKSB7IC8vIG5vdCBhdmFpbGFibGUsIHdoZW4gbWFpbiBzb3VyY2UgbWluaWZpZWRcblx0XHRcdFx0QXJyYXkucHJvdG90eXBlLnNwbGljZS5jYWxsKGFyZ3VtZW50cywgMSwgMCwgXCIoXCIgKyBOQU1FU1BBQ0UgKyBcIilcIiwgXCItPlwiKTtcblx0XHRcdFx0Q29udHJvbGxlci5fbG9nLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdFx0XHR9XG5cdFx0fTtcblx0XHRpZiAoQ29udHJvbGxlci5faW5kaWNhdG9ycykge1xuXHRcdFx0bG9nKDIsIFwiV0FSTklORzogU2NlbmUgYWxyZWFkeSBoYXMgYSBwcm9wZXJ0eSAnX2luZGljYXRvcnMnLCB3aGljaCB3aWxsIGJlIG92ZXJ3cml0dGVuIGJ5IHBsdWdpbi5cIik7XG5cdFx0fVxuXG5cdFx0Ly8gYWRkIGluZGljYXRvcnMgY29udGFpbmVyXG5cdFx0dGhpcy5faW5kaWNhdG9ycyA9IF9pbmRpY2F0b3JzO1xuLypcblx0XHRcdG5lZWRlZCB1cGRhdGVzOlxuXHRcdFx0KysrKysrKysrKysrKysrXG5cdFx0XHRzdGFydC9lbmQgcG9zaXRpb24gb24gc2NlbmUgc2hpZnQgKGhhbmRsZWQgaW4gSW5kaWNhdG9yIGNsYXNzKVxuXHRcdFx0dHJpZ2dlciBwYXJhbWV0ZXJzIG9uIHRyaWdnZXJIb29rIHZhbHVlIGNoYW5nZSAoaGFuZGxlZCBpbiBJbmRpY2F0b3IgY2xhc3MpXG5cdFx0XHRib3VuZHMgcG9zaXRpb24gb24gY29udGFpbmVyIHNjcm9sbCBvciByZXNpemUgKHRvIGtlZXAgYWxpZ25tZW50IHRvIGJvdHRvbS9yaWdodClcblx0XHRcdHRyaWdnZXIgcG9zaXRpb24gb24gY29udGFpbmVyIHJlc2l6ZSwgd2luZG93IHJlc2l6ZSAoaWYgY29udGFpbmVyIGlzbid0IGRvY3VtZW50KSBhbmQgd2luZG93IHNjcm9sbCAoaWYgY29udGFpbmVyIGlzbid0IGRvY3VtZW50KVxuXHRcdCovXG5cblx0XHQvLyBldmVudCBoYW5kbGVyIGZvciB3aGVuIGFzc29jaWF0ZWQgYm91bmRzIG1hcmtlcnMgbmVlZCB0byBiZSByZXBvc2l0aW9uZWRcblx0XHR2YXIgaGFuZGxlQm91bmRzUG9zaXRpb25DaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRfaW5kaWNhdG9ycy51cGRhdGVCb3VuZHNQb3NpdGlvbnMoKTtcblx0XHR9O1xuXG5cdFx0Ly8gZXZlbnQgaGFuZGxlciBmb3Igd2hlbiBhc3NvY2lhdGVkIHRyaWdnZXIgZ3JvdXBzIG5lZWQgdG8gYmUgcmVwb3NpdGlvbmVkXG5cdFx0dmFyIGhhbmRsZVRyaWdnZXJQb3NpdGlvbkNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdF9pbmRpY2F0b3JzLnVwZGF0ZVRyaWdnZXJHcm91cFBvc2l0aW9ucygpO1xuXHRcdH07XG5cblx0XHRfY29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgaGFuZGxlVHJpZ2dlclBvc2l0aW9uQ2hhbmdlKTtcblx0XHRpZiAoIV9pc0RvY3VtZW50KSB7XG5cdFx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCBoYW5kbGVUcmlnZ2VyUG9zaXRpb25DaGFuZ2UpO1xuXHRcdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIiwgaGFuZGxlVHJpZ2dlclBvc2l0aW9uQ2hhbmdlKTtcblx0XHR9XG5cdFx0Ly8gdXBkYXRlIGFsbCByZWxhdGVkIGJvdW5kcyBjb250YWluZXJzXG5cdFx0X2NvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKFwicmVzaXplXCIsIGhhbmRsZUJvdW5kc1Bvc2l0aW9uQ2hhbmdlKTtcblx0XHRfY29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIiwgaGFuZGxlQm91bmRzUG9zaXRpb25DaGFuZ2UpO1xuXG5cblx0XHQvLyB1cGRhdGVzIHRoZSBwb3NpdGlvbiBvZiB0aGUgYm91bmRzIGNvbnRhaW5lciB0byBhbGlnbmVkIHRvIHRoZSByaWdodCBmb3IgdmVydGljYWwgY29udGFpbmVycyBhbmQgdG8gdGhlIGJvdHRvbSBmb3IgaG9yaXpvbnRhbFxuXHRcdHRoaXMuX2luZGljYXRvcnMudXBkYXRlQm91bmRzUG9zaXRpb25zID0gZnVuY3Rpb24gKHNwZWNpZmljSW5kaWNhdG9yKSB7XG5cdFx0XHR2YXIgLy8gY29uc3RhbnQgZm9yIGFsbCBib3VuZHNcblx0XHRcdGdyb3VwcyA9IHNwZWNpZmljSW5kaWNhdG9yID8gW191dGlsLmV4dGVuZCh7fSwgc3BlY2lmaWNJbmRpY2F0b3IudHJpZ2dlckdyb3VwLCB7XG5cdFx0XHRcdG1lbWJlcnM6IFtzcGVjaWZpY0luZGljYXRvcl1cblx0XHRcdH0pXSA6IC8vIGNyZWF0ZSBhIGdyb3VwIHdpdGggb25seSBvbmUgZWxlbWVudFxuXHRcdFx0X2luZGljYXRvcnMuZ3JvdXBzLFxuXHRcdFx0XHQvLyB1c2UgYWxsXG5cdFx0XHRcdGcgPSBncm91cHMubGVuZ3RoLFxuXHRcdFx0XHRjc3MgPSB7fSxcblx0XHRcdFx0cGFyYW1Qb3MgPSBfdmVydGljYWwgPyBcImxlZnRcIiA6IFwidG9wXCIsXG5cdFx0XHRcdHBhcmFtRGltZW5zaW9uID0gX3ZlcnRpY2FsID8gXCJ3aWR0aFwiIDogXCJoZWlnaHRcIixcblx0XHRcdFx0ZWRnZSA9IF92ZXJ0aWNhbCA/IF91dGlsLmdldC5zY3JvbGxMZWZ0KF9jb250YWluZXIpICsgX3V0aWwuZ2V0LndpZHRoKF9jb250YWluZXIpIC0gRURHRV9PRkZTRVQgOiBfdXRpbC5nZXQuc2Nyb2xsVG9wKF9jb250YWluZXIpICsgX3V0aWwuZ2V0LmhlaWdodChfY29udGFpbmVyKSAtIEVER0VfT0ZGU0VULFxuXHRcdFx0XHRiLCB0cmlnZ2VyU2l6ZSwgZ3JvdXA7XG5cdFx0XHR3aGlsZSAoZy0tKSB7IC8vIGdyb3VwIGxvb3Bcblx0XHRcdFx0Z3JvdXAgPSBncm91cHNbZ107XG5cdFx0XHRcdGIgPSBncm91cC5tZW1iZXJzLmxlbmd0aDtcblx0XHRcdFx0dHJpZ2dlclNpemUgPSBfdXRpbC5nZXRbcGFyYW1EaW1lbnNpb25dKGdyb3VwLmVsZW1lbnQuZmlyc3RDaGlsZCk7XG5cdFx0XHRcdHdoaWxlIChiLS0pIHsgLy8gaW5kaWNhdG9ycyBsb29wXG5cdFx0XHRcdFx0Y3NzW3BhcmFtUG9zXSA9IGVkZ2UgLSB0cmlnZ2VyU2l6ZTtcblx0XHRcdFx0XHRfdXRpbC5jc3MoZ3JvdXAubWVtYmVyc1tiXS5ib3VuZHMsIGNzcyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0Ly8gdXBkYXRlcyB0aGUgcG9zaXRpb25zIG9mIGFsbCB0cmlnZ2VyIGdyb3VwcyBhdHRhY2hlZCB0byBhIGNvbnRyb2xsZXIgb3IgYSBzcGVjaWZpYyBvbmUsIGlmIHByb3ZpZGVkXG5cdFx0dGhpcy5faW5kaWNhdG9ycy51cGRhdGVUcmlnZ2VyR3JvdXBQb3NpdGlvbnMgPSBmdW5jdGlvbiAoc3BlY2lmaWNHcm91cCkge1xuXHRcdFx0dmFyIC8vIGNvbnN0YW50IHZhcnNcblx0XHRcdGdyb3VwcyA9IHNwZWNpZmljR3JvdXAgPyBbc3BlY2lmaWNHcm91cF0gOiBfaW5kaWNhdG9ycy5ncm91cHMsXG5cdFx0XHRcdGkgPSBncm91cHMubGVuZ3RoLFxuXHRcdFx0XHRjb250YWluZXIgPSBfaXNEb2N1bWVudCA/IGRvY3VtZW50LmJvZHkgOiBfY29udGFpbmVyLFxuXHRcdFx0XHRjb250YWluZXJPZmZzZXQgPSBfaXNEb2N1bWVudCA/IHtcblx0XHRcdFx0XHR0b3A6IDAsXG5cdFx0XHRcdFx0bGVmdDogMFxuXHRcdFx0XHR9IDogX3V0aWwuZ2V0Lm9mZnNldChjb250YWluZXIsIHRydWUpLFxuXHRcdFx0XHRlZGdlID0gX3ZlcnRpY2FsID8gX3V0aWwuZ2V0LndpZHRoKF9jb250YWluZXIpIC0gRURHRV9PRkZTRVQgOiBfdXRpbC5nZXQuaGVpZ2h0KF9jb250YWluZXIpIC0gRURHRV9PRkZTRVQsXG5cdFx0XHRcdHBhcmFtRGltZW5zaW9uID0gX3ZlcnRpY2FsID8gXCJ3aWR0aFwiIDogXCJoZWlnaHRcIixcblx0XHRcdFx0cGFyYW1UcmFuc2Zvcm0gPSBfdmVydGljYWwgPyBcIllcIiA6IFwiWFwiO1xuXHRcdFx0dmFyIC8vIGNoYW5naW5nIHZhcnNcblx0XHRcdGdyb3VwLCBlbGVtLCBwb3MsIGVsZW1TaXplLCB0cmFuc2Zvcm07XG5cdFx0XHR3aGlsZSAoaS0tKSB7XG5cdFx0XHRcdGdyb3VwID0gZ3JvdXBzW2ldO1xuXHRcdFx0XHRlbGVtID0gZ3JvdXAuZWxlbWVudDtcblx0XHRcdFx0cG9zID0gZ3JvdXAudHJpZ2dlckhvb2sgKiBDb250cm9sbGVyLmluZm8oXCJzaXplXCIpO1xuXHRcdFx0XHRlbGVtU2l6ZSA9IF91dGlsLmdldFtwYXJhbURpbWVuc2lvbl0oZWxlbS5maXJzdENoaWxkLmZpcnN0Q2hpbGQpO1xuXHRcdFx0XHR0cmFuc2Zvcm0gPSBwb3MgPiBlbGVtU2l6ZSA/IFwidHJhbnNsYXRlXCIgKyBwYXJhbVRyYW5zZm9ybSArIFwiKC0xMDAlKVwiIDogXCJcIjtcblxuXHRcdFx0XHRfdXRpbC5jc3MoZWxlbSwge1xuXHRcdFx0XHRcdHRvcDogY29udGFpbmVyT2Zmc2V0LnRvcCArIChfdmVydGljYWwgPyBwb3MgOiBlZGdlIC0gZ3JvdXAubWVtYmVyc1swXS5vcHRpb25zLmluZGVudCksXG5cdFx0XHRcdFx0bGVmdDogY29udGFpbmVyT2Zmc2V0LmxlZnQgKyAoX3ZlcnRpY2FsID8gZWRnZSAtIGdyb3VwLm1lbWJlcnNbMF0ub3B0aW9ucy5pbmRlbnQgOiBwb3MpXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRfdXRpbC5jc3MoZWxlbS5maXJzdENoaWxkLmZpcnN0Q2hpbGQsIHtcblx0XHRcdFx0XHRcIi1tcy10cmFuc2Zvcm1cIjogdHJhbnNmb3JtLFxuXHRcdFx0XHRcdFwiLXdlYmtpdC10cmFuc2Zvcm1cIjogdHJhbnNmb3JtLFxuXHRcdFx0XHRcdFwidHJhbnNmb3JtXCI6IHRyYW5zZm9ybVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0Ly8gdXBkYXRlcyB0aGUgbGFiZWwgZm9yIHRoZSBncm91cCB0byBjb250YWluIHRoZSBuYW1lLCBpZiBpdCBvbmx5IGhhcyBvbmUgbWVtYmVyXG5cdFx0dGhpcy5faW5kaWNhdG9ycy51cGRhdGVUcmlnZ2VyR3JvdXBMYWJlbCA9IGZ1bmN0aW9uIChncm91cCkge1xuXHRcdFx0dmFyXG5cdFx0XHR0ZXh0ID0gXCJ0cmlnZ2VyXCIgKyAoZ3JvdXAubWVtYmVycy5sZW5ndGggPiAxID8gXCJcIiA6IFwiIFwiICsgZ3JvdXAubWVtYmVyc1swXS5vcHRpb25zLm5hbWUpLFxuXHRcdFx0XHRlbGVtID0gZ3JvdXAuZWxlbWVudC5maXJzdENoaWxkLmZpcnN0Q2hpbGQsXG5cdFx0XHRcdGRvVXBkYXRlID0gZWxlbS50ZXh0Q29udGVudCAhPT0gdGV4dDtcblx0XHRcdGlmIChkb1VwZGF0ZSkge1xuXHRcdFx0XHRlbGVtLnRleHRDb250ZW50ID0gdGV4dDtcblx0XHRcdFx0aWYgKF92ZXJ0aWNhbCkgeyAvLyBib3VuZHMgcG9zaXRpb24gaXMgZGVwZW5kZW50IG9uIHRleHQgbGVuZ3RoLCBzbyB1cGRhdGVcblx0XHRcdFx0XHRfaW5kaWNhdG9ycy51cGRhdGVCb3VuZHNQb3NpdGlvbnMoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvLyBhZGQgaW5kaWNhdG9ycyBpZiBnbG9iYWwgb3B0aW9uIGlzIHNldFxuXHRcdHRoaXMuYWRkU2NlbmUgPSBmdW5jdGlvbiAobmV3U2NlbmUpIHtcblxuXHRcdFx0aWYgKHRoaXMuX29wdGlvbnMuYWRkSW5kaWNhdG9ycyAmJiBuZXdTY2VuZSBpbnN0YW5jZW9mIFNjcm9sbE1hZ2ljLlNjZW5lICYmIG5ld1NjZW5lLmNvbnRyb2xsZXIoKSA9PT0gQ29udHJvbGxlcikge1xuXHRcdFx0XHRuZXdTY2VuZS5hZGRJbmRpY2F0b3JzKCk7XG5cdFx0XHR9XG5cdFx0XHQvLyBjYWxsIG9yaWdpbmFsIGRlc3Ryb3kgbWV0aG9kXG5cdFx0XHR0aGlzLiRzdXBlci5hZGRTY2VuZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHRcdH07XG5cblx0XHQvLyByZW1vdmUgYWxsIHByZXZpb3VzbHkgc2V0IGxpc3RlbmVycyBvbiBkZXN0cm95XG5cdFx0dGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0X2NvbnRhaW5lci5yZW1vdmVFdmVudExpc3RlbmVyKFwicmVzaXplXCIsIGhhbmRsZVRyaWdnZXJQb3NpdGlvbkNoYW5nZSk7XG5cdFx0XHRpZiAoIV9pc0RvY3VtZW50KSB7XG5cdFx0XHRcdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwicmVzaXplXCIsIGhhbmRsZVRyaWdnZXJQb3NpdGlvbkNoYW5nZSk7XG5cdFx0XHRcdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwic2Nyb2xsXCIsIGhhbmRsZVRyaWdnZXJQb3NpdGlvbkNoYW5nZSk7XG5cdFx0XHR9XG5cdFx0XHRfY29udGFpbmVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgaGFuZGxlQm91bmRzUG9zaXRpb25DaGFuZ2UpO1xuXHRcdFx0X2NvbnRhaW5lci5yZW1vdmVFdmVudExpc3RlbmVyKFwic2Nyb2xsXCIsIGhhbmRsZUJvdW5kc1Bvc2l0aW9uQ2hhbmdlKTtcblx0XHRcdC8vIGNhbGwgb3JpZ2luYWwgZGVzdHJveSBtZXRob2Rcblx0XHRcdHRoaXMuJHN1cGVyLmRlc3Ryb3kuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XHR9O1xuXHRcdHJldHVybiBDb250cm9sbGVyO1xuXG5cdH0pO1xuXG4vKlxuXHQgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdCAqIEludGVybmFsIGNsYXNzIGZvciB0aGUgY29uc3RydWN0aW9uIG9mIEluZGljYXRvcnNcblx0ICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQgKi9cblx0dmFyIEluZGljYXRvciA9IGZ1bmN0aW9uIChTY2VuZSwgb3B0aW9ucykge1xuXHRcdHZhclxuXHRcdEluZGljYXRvciA9IHRoaXMsXG5cdFx0XHRfZWxlbUJvdW5kcyA9IFRQTC5ib3VuZHMoKSxcblx0XHRcdF9lbGVtU3RhcnQgPSBUUEwuc3RhcnQob3B0aW9ucy5jb2xvclN0YXJ0KSxcblx0XHRcdF9lbGVtRW5kID0gVFBMLmVuZChvcHRpb25zLmNvbG9yRW5kKSxcblx0XHRcdF9ib3VuZHNDb250YWluZXIgPSBvcHRpb25zLnBhcmVudCAmJiBfdXRpbC5nZXQuZWxlbWVudHMob3B0aW9ucy5wYXJlbnQpWzBdLFxuXHRcdFx0X3ZlcnRpY2FsLCBfY3RybDtcblxuXHRcdHZhciBsb2cgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoU2NlbmUuX2xvZykgeyAvLyBub3QgYXZhaWxhYmxlLCB3aGVuIG1haW4gc291cmNlIG1pbmlmaWVkXG5cdFx0XHRcdEFycmF5LnByb3RvdHlwZS5zcGxpY2UuY2FsbChhcmd1bWVudHMsIDEsIDAsIFwiKFwiICsgTkFNRVNQQUNFICsgXCIpXCIsIFwiLT5cIik7XG5cdFx0XHRcdFNjZW5lLl9sb2cuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0b3B0aW9ucy5uYW1lID0gb3B0aW9ucy5uYW1lIHx8IF9hdXRvaW5kZXg7XG5cblx0XHQvLyBwcmVwYXJlIGJvdW5kcyBlbGVtZW50c1xuXHRcdF9lbGVtU3RhcnQuZmlyc3RDaGlsZC50ZXh0Q29udGVudCArPSBcIiBcIiArIG9wdGlvbnMubmFtZTtcblx0XHRfZWxlbUVuZC50ZXh0Q29udGVudCArPSBcIiBcIiArIG9wdGlvbnMubmFtZTtcblx0XHRfZWxlbUJvdW5kcy5hcHBlbmRDaGlsZChfZWxlbVN0YXJ0KTtcblx0XHRfZWxlbUJvdW5kcy5hcHBlbmRDaGlsZChfZWxlbUVuZCk7XG5cblx0XHQvLyBzZXQgcHVibGljIHZhcmlhYmxlc1xuXHRcdEluZGljYXRvci5vcHRpb25zID0gb3B0aW9ucztcblx0XHRJbmRpY2F0b3IuYm91bmRzID0gX2VsZW1Cb3VuZHM7XG5cdFx0Ly8gd2lsbCBiZSBzZXQgbGF0ZXJcblx0XHRJbmRpY2F0b3IudHJpZ2dlckdyb3VwID0gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gYWRkIGluZGljYXRvcnMgdG8gRE9NXG5cdFx0dGhpcy5hZGQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRfY3RybCA9IFNjZW5lLmNvbnRyb2xsZXIoKTtcblx0XHRcdF92ZXJ0aWNhbCA9IF9jdHJsLmluZm8oXCJ2ZXJ0aWNhbFwiKTtcblxuXHRcdFx0dmFyIGlzRG9jdW1lbnQgPSBfY3RybC5pbmZvKFwiaXNEb2N1bWVudFwiKTtcblxuXHRcdFx0aWYgKCFfYm91bmRzQ29udGFpbmVyKSB7XG5cdFx0XHRcdC8vIG5vIHBhcmVudCBzdXBwbGllZCBvciBkb2VzbnQgZXhpc3Rcblx0XHRcdFx0X2JvdW5kc0NvbnRhaW5lciA9IGlzRG9jdW1lbnQgPyBkb2N1bWVudC5ib2R5IDogX2N0cmwuaW5mbyhcImNvbnRhaW5lclwiKTsgLy8gY2hlY2sgaWYgd2luZG93L2RvY3VtZW50ICh0aGVuIHVzZSBib2R5KVxuXHRcdFx0fVxuXHRcdFx0aWYgKCFpc0RvY3VtZW50ICYmIF91dGlsLmNzcyhfYm91bmRzQ29udGFpbmVyLCBcInBvc2l0aW9uXCIpID09PSAnc3RhdGljJykge1xuXHRcdFx0XHQvLyBwb3NpdGlvbiBtb2RlIG5lZWRlZCBmb3IgY29ycmVjdCBwb3NpdGlvbmluZyBvZiBpbmRpY2F0b3JzXG5cdFx0XHRcdF91dGlsLmNzcyhfYm91bmRzQ29udGFpbmVyLCB7XG5cdFx0XHRcdFx0cG9zaXRpb246IFwicmVsYXRpdmVcIlxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gYWRkIGxpc3RlbmVycyBmb3IgdXBkYXRlc1xuXHRcdFx0U2NlbmUub24oXCJjaGFuZ2UucGx1Z2luX2FkZEluZGljYXRvcnNcIiwgaGFuZGxlVHJpZ2dlclBhcmFtc0NoYW5nZSk7XG5cdFx0XHRTY2VuZS5vbihcInNoaWZ0LnBsdWdpbl9hZGRJbmRpY2F0b3JzXCIsIGhhbmRsZUJvdW5kc1BhcmFtc0NoYW5nZSk7XG5cblx0XHRcdC8vIHVwZGF0ZXMgdHJpZ2dlciAmIGJvdW5kcyAod2lsbCBhZGQgZWxlbWVudHMgaWYgbmVlZGVkKVxuXHRcdFx0dXBkYXRlVHJpZ2dlckdyb3VwKCk7XG5cdFx0XHR1cGRhdGVCb3VuZHMoKTtcblxuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7IC8vIGRvIGFmdGVyIGFsbCBleGVjdXRpb24gaXMgZmluaXNoZWQgb3RoZXJ3aXNlIHNvbWV0aW1lcyBzaXplIGNhbGN1bGF0aW9ucyBhcmUgb2ZmXG5cdFx0XHRcdF9jdHJsLl9pbmRpY2F0b3JzLnVwZGF0ZUJvdW5kc1Bvc2l0aW9ucyhJbmRpY2F0b3IpO1xuXHRcdFx0fSwgMCk7XG5cblx0XHRcdGxvZygzLCBcImFkZGVkIGluZGljYXRvcnNcIik7XG5cdFx0fTtcblxuXHRcdC8vIHJlbW92ZSBpbmRpY2F0b3JzIGZyb20gRE9NXG5cdFx0dGhpcy5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoSW5kaWNhdG9yLnRyaWdnZXJHcm91cCkgeyAvLyBpZiBub3Qgc2V0IHRoZXJlJ3Mgbm90aGluZyB0byByZW1vdmVcblx0XHRcdFx0U2NlbmUub2ZmKFwiY2hhbmdlLnBsdWdpbl9hZGRJbmRpY2F0b3JzXCIsIGhhbmRsZVRyaWdnZXJQYXJhbXNDaGFuZ2UpO1xuXHRcdFx0XHRTY2VuZS5vZmYoXCJzaGlmdC5wbHVnaW5fYWRkSW5kaWNhdG9yc1wiLCBoYW5kbGVCb3VuZHNQYXJhbXNDaGFuZ2UpO1xuXG5cdFx0XHRcdGlmIChJbmRpY2F0b3IudHJpZ2dlckdyb3VwLm1lbWJlcnMubGVuZ3RoID4gMSkge1xuXHRcdFx0XHRcdC8vIGp1c3QgcmVtb3ZlIGZyb20gbWVtYmVybGlzdCBvZiBvbGQgZ3JvdXBcblx0XHRcdFx0XHR2YXIgZ3JvdXAgPSBJbmRpY2F0b3IudHJpZ2dlckdyb3VwO1xuXHRcdFx0XHRcdGdyb3VwLm1lbWJlcnMuc3BsaWNlKGdyb3VwLm1lbWJlcnMuaW5kZXhPZihJbmRpY2F0b3IpLCAxKTtcblx0XHRcdFx0XHRfY3RybC5faW5kaWNhdG9ycy51cGRhdGVUcmlnZ2VyR3JvdXBMYWJlbChncm91cCk7XG5cdFx0XHRcdFx0X2N0cmwuX2luZGljYXRvcnMudXBkYXRlVHJpZ2dlckdyb3VwUG9zaXRpb25zKGdyb3VwKTtcblx0XHRcdFx0XHRJbmRpY2F0b3IudHJpZ2dlckdyb3VwID0gdW5kZWZpbmVkO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIHJlbW92ZSBjb21wbGV0ZSBncm91cFxuXHRcdFx0XHRcdHJlbW92ZVRyaWdnZXJHcm91cCgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJlbW92ZUJvdW5kcygpO1xuXG5cdFx0XHRcdGxvZygzLCBcInJlbW92ZWQgaW5kaWNhdG9yc1wiKTtcblx0XHRcdH1cblx0XHR9O1xuXG4vKlxuXHRcdCAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0XHQgKiBpbnRlcm5hbCBFdmVudCBIYW5kbGVyc1xuXHRcdCAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0XHQgKi9cblxuXHRcdC8vIGV2ZW50IGhhbmRsZXIgZm9yIHdoZW4gYm91bmRzIHBhcmFtcyBjaGFuZ2Vcblx0XHR2YXIgaGFuZGxlQm91bmRzUGFyYW1zQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0dXBkYXRlQm91bmRzKCk7XG5cdFx0fTtcblxuXHRcdC8vIGV2ZW50IGhhbmRsZXIgZm9yIHdoZW4gdHJpZ2dlciBwYXJhbXMgY2hhbmdlXG5cdFx0dmFyIGhhbmRsZVRyaWdnZXJQYXJhbXNDaGFuZ2UgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0aWYgKGUud2hhdCA9PT0gXCJ0cmlnZ2VySG9va1wiKSB7XG5cdFx0XHRcdHVwZGF0ZVRyaWdnZXJHcm91cCgpO1xuXHRcdFx0fVxuXHRcdH07XG5cbi8qXG5cdFx0ICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRcdCAqIEJvdW5kcyAoc3RhcnQgLyBzdG9wKSBtYW5hZ2VtZW50XG5cdFx0ICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRcdCAqL1xuXG5cdFx0Ly8gYWRkcyBhbiBuZXcgYm91bmRzIGVsZW1lbnRzIHRvIHRoZSBhcnJheSBhbmQgdG8gdGhlIERPTVxuXHRcdHZhciBhZGRCb3VuZHMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHR2YXIgdiA9IF9jdHJsLmluZm8oXCJ2ZXJ0aWNhbFwiKTtcblx0XHRcdC8vIGFwcGx5IHN0dWZmIHdlIGRpZG4ndCBrbm93IGJlZm9yZS4uLlxuXHRcdFx0X3V0aWwuY3NzKF9lbGVtU3RhcnQuZmlyc3RDaGlsZCwge1xuXHRcdFx0XHRcImJvcmRlci1ib3R0b20td2lkdGhcIjogdiA/IDEgOiAwLFxuXHRcdFx0XHRcImJvcmRlci1yaWdodC13aWR0aFwiOiB2ID8gMCA6IDEsXG5cdFx0XHRcdFwiYm90dG9tXCI6IHYgPyAtMSA6IG9wdGlvbnMuaW5kZW50LFxuXHRcdFx0XHRcInJpZ2h0XCI6IHYgPyBvcHRpb25zLmluZGVudCA6IC0xLFxuXHRcdFx0XHRcInBhZGRpbmdcIjogdiA/IFwiMCA4cHhcIiA6IFwiMnB4IDRweFwiLFxuXHRcdFx0fSk7XG5cdFx0XHRfdXRpbC5jc3MoX2VsZW1FbmQsIHtcblx0XHRcdFx0XCJib3JkZXItdG9wLXdpZHRoXCI6IHYgPyAxIDogMCxcblx0XHRcdFx0XCJib3JkZXItbGVmdC13aWR0aFwiOiB2ID8gMCA6IDEsXG5cdFx0XHRcdFwidG9wXCI6IHYgPyBcIjEwMCVcIiA6IFwiXCIsXG5cdFx0XHRcdFwicmlnaHRcIjogdiA/IG9wdGlvbnMuaW5kZW50IDogXCJcIixcblx0XHRcdFx0XCJib3R0b21cIjogdiA/IFwiXCIgOiBvcHRpb25zLmluZGVudCxcblx0XHRcdFx0XCJsZWZ0XCI6IHYgPyBcIlwiIDogXCIxMDAlXCIsXG5cdFx0XHRcdFwicGFkZGluZ1wiOiB2ID8gXCIwIDhweFwiIDogXCIycHggNHB4XCJcblx0XHRcdH0pO1xuXHRcdFx0Ly8gYXBwZW5kXG5cdFx0XHRfYm91bmRzQ29udGFpbmVyLmFwcGVuZENoaWxkKF9lbGVtQm91bmRzKTtcblx0XHR9O1xuXG5cdFx0Ly8gcmVtb3ZlIGJvdW5kcyBmcm9tIGxpc3QgYW5kIERPTVxuXHRcdHZhciByZW1vdmVCb3VuZHMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRfZWxlbUJvdW5kcy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKF9lbGVtQm91bmRzKTtcblx0XHR9O1xuXG5cdFx0Ly8gdXBkYXRlIHRoZSBzdGFydCBhbmQgZW5kIHBvc2l0aW9ucyBvZiB0aGUgc2NlbmVcblx0XHR2YXIgdXBkYXRlQm91bmRzID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKF9lbGVtQm91bmRzLnBhcmVudE5vZGUgIT09IF9ib3VuZHNDb250YWluZXIpIHtcblx0XHRcdFx0YWRkQm91bmRzKCk7IC8vIEFkZCBCb3VuZHMgZWxlbWVudHMgKHN0YXJ0L2VuZClcblx0XHRcdH1cblx0XHRcdHZhciBjc3MgPSB7fTtcblx0XHRcdGNzc1tfdmVydGljYWwgPyBcInRvcFwiIDogXCJsZWZ0XCJdID0gU2NlbmUudHJpZ2dlclBvc2l0aW9uKCk7XG5cdFx0XHRjc3NbX3ZlcnRpY2FsID8gXCJoZWlnaHRcIiA6IFwid2lkdGhcIl0gPSBTY2VuZS5kdXJhdGlvbigpO1xuXHRcdFx0X3V0aWwuY3NzKF9lbGVtQm91bmRzLCBjc3MpO1xuXHRcdFx0X3V0aWwuY3NzKF9lbGVtRW5kLCB7XG5cdFx0XHRcdGRpc3BsYXk6IFNjZW5lLmR1cmF0aW9uKCkgPiAwID8gXCJcIiA6IFwibm9uZVwiXG5cdFx0XHR9KTtcblx0XHR9O1xuXG4vKlxuXHRcdCAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0XHQgKiB0cmlnZ2VyIGFuZCB0cmlnZ2VyIGdyb3VwIG1hbmFnZW1lbnRcblx0XHQgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdFx0ICovXG5cblx0XHQvLyBhZGRzIGFuIG5ldyB0cmlnZ2VyIGdyb3VwIHRvIHRoZSBhcnJheSBhbmQgdG8gdGhlIERPTVxuXHRcdHZhciBhZGRUcmlnZ2VyR3JvdXAgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHR2YXIgdHJpZ2dlckVsZW0gPSBUUEwudHJpZ2dlcihvcHRpb25zLmNvbG9yVHJpZ2dlcik7IC8vIG5ldyB0cmlnZ2VyIGVsZW1lbnRcblx0XHRcdHZhciBjc3MgPSB7fTtcblx0XHRcdGNzc1tfdmVydGljYWwgPyBcInJpZ2h0XCIgOiBcImJvdHRvbVwiXSA9IDA7XG5cdFx0XHRjc3NbX3ZlcnRpY2FsID8gXCJib3JkZXItdG9wLXdpZHRoXCIgOiBcImJvcmRlci1sZWZ0LXdpZHRoXCJdID0gMTtcblx0XHRcdF91dGlsLmNzcyh0cmlnZ2VyRWxlbS5maXJzdENoaWxkLCBjc3MpO1xuXHRcdFx0X3V0aWwuY3NzKHRyaWdnZXJFbGVtLmZpcnN0Q2hpbGQuZmlyc3RDaGlsZCwge1xuXHRcdFx0XHRwYWRkaW5nOiBfdmVydGljYWwgPyBcIjAgOHB4IDNweCA4cHhcIiA6IFwiM3B4IDRweFwiXG5cdFx0XHR9KTtcblx0XHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodHJpZ2dlckVsZW0pOyAvLyBkaXJlY3RseSBhZGQgdG8gYm9keVxuXHRcdFx0dmFyIG5ld0dyb3VwID0ge1xuXHRcdFx0XHR0cmlnZ2VySG9vazogU2NlbmUudHJpZ2dlckhvb2soKSxcblx0XHRcdFx0ZWxlbWVudDogdHJpZ2dlckVsZW0sXG5cdFx0XHRcdG1lbWJlcnM6IFtJbmRpY2F0b3JdXG5cdFx0XHR9O1xuXHRcdFx0X2N0cmwuX2luZGljYXRvcnMuZ3JvdXBzLnB1c2gobmV3R3JvdXApO1xuXHRcdFx0SW5kaWNhdG9yLnRyaWdnZXJHcm91cCA9IG5ld0dyb3VwO1xuXHRcdFx0Ly8gdXBkYXRlIHJpZ2h0IGF3YXlcblx0XHRcdF9jdHJsLl9pbmRpY2F0b3JzLnVwZGF0ZVRyaWdnZXJHcm91cExhYmVsKG5ld0dyb3VwKTtcblx0XHRcdF9jdHJsLl9pbmRpY2F0b3JzLnVwZGF0ZVRyaWdnZXJHcm91cFBvc2l0aW9ucyhuZXdHcm91cCk7XG5cdFx0fTtcblxuXHRcdHZhciByZW1vdmVUcmlnZ2VyR3JvdXAgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRfY3RybC5faW5kaWNhdG9ycy5ncm91cHMuc3BsaWNlKF9jdHJsLl9pbmRpY2F0b3JzLmdyb3Vwcy5pbmRleE9mKEluZGljYXRvci50cmlnZ2VyR3JvdXApLCAxKTtcblx0XHRcdEluZGljYXRvci50cmlnZ2VyR3JvdXAuZWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKEluZGljYXRvci50cmlnZ2VyR3JvdXAuZWxlbWVudCk7XG5cdFx0XHRJbmRpY2F0b3IudHJpZ2dlckdyb3VwID0gdW5kZWZpbmVkO1xuXHRcdH07XG5cblx0XHQvLyB1cGRhdGVzIHRoZSB0cmlnZ2VyIGdyb3VwIC0+IGVpdGhlciBqb2luIGV4aXN0aW5nIG9yIGFkZCBuZXcgb25lXG4vKlx0XG5cdFx0ICogTG9naWM6XG5cdFx0ICogMSBpZiBhIHRyaWdnZXIgZ3JvdXAgZXhpc3QsIGNoZWNrIGlmIGl0J3MgaW4gc3luYyB3aXRoIFNjZW5lIHNldHRpbmdzIOKAkyBpZiBzbywgbm90aGluZyBlbHNlIG5lZWRzIHRvIGhhcHBlblxuXHRcdCAqIDIgdHJ5IHRvIGZpbmQgYW4gZXhpc3Rpbmcgb25lIHRoYXQgbWF0Y2hlcyBTY2VuZSBwYXJhbWV0ZXJzXG5cdFx0ICogXHQgMi4xIElmIGEgbWF0Y2ggaXMgZm91bmQgY2hlY2sgaWYgYWxyZWFkeSBhc3NpZ25lZCB0byBhbiBleGlzdGluZyBncm91cFxuXHRcdCAqXHRcdFx0IElmIHNvOlxuXHRcdCAqICAgICAgIEE6IGl0IHdhcyB0aGUgbGFzdCBtZW1iZXIgb2YgZXhpc3RpbmcgZ3JvdXAgLT4ga2lsbCB3aG9sZSBncm91cFxuXHRcdCAqICAgICAgIEI6IHRoZSBleGlzdGluZyBncm91cCBoYXMgb3RoZXIgbWVtYmVycyAtPiBqdXN0IHJlbW92ZSBmcm9tIG1lbWJlciBsaXN0XG5cdFx0ICpcdCAyLjIgQXNzaWduIHRvIG1hdGNoaW5nIGdyb3VwXG5cdFx0ICogMyBpZiBubyBuZXcgbWF0Y2ggY291bGQgYmUgZm91bmQsIGNoZWNrIGlmIGFzc2lnbmVkIHRvIGV4aXN0aW5nIGdyb3VwXG5cdFx0ICogICBBOiB5ZXMsIGFuZCBpdCdzIHRoZSBvbmx5IG1lbWJlciAtPiBqdXN0IHVwZGF0ZSBwYXJhbWV0ZXJzIGFuZCBwb3NpdGlvbnMgYW5kIGtlZXAgdXNpbmcgdGhpcyBncm91cFxuXHRcdCAqICAgQjogeWVzIGJ1dCB0aGVyZSBhcmUgb3RoZXIgbWVtYmVycyAtPiByZW1vdmUgZnJvbSBtZW1iZXIgbGlzdCBhbmQgY3JlYXRlIGEgbmV3IG9uZVxuXHRcdCAqICAgQzogbm8sIHNvIGNyZWF0ZSBhIG5ldyBvbmVcblx0XHQgKi9cblx0XHR2YXIgdXBkYXRlVHJpZ2dlckdyb3VwID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0dmFyXG5cdFx0XHR0cmlnZ2VySG9vayA9IFNjZW5lLnRyaWdnZXJIb29rKCksXG5cdFx0XHRcdGNsb3NlRW5vdWdoID0gMC4wMDAxO1xuXG5cdFx0XHQvLyBIYXZlIGEgZ3JvdXAsIGNoZWNrIGlmIGl0IHN0aWxsIG1hdGNoZXNcblx0XHRcdGlmIChJbmRpY2F0b3IudHJpZ2dlckdyb3VwKSB7XG5cdFx0XHRcdGlmIChNYXRoLmFicyhJbmRpY2F0b3IudHJpZ2dlckdyb3VwLnRyaWdnZXJIb29rIC0gdHJpZ2dlckhvb2spIDwgY2xvc2VFbm91Z2gpIHtcblx0XHRcdFx0XHQvLyBfdXRpbC5sb2coMCwgXCJ0cmlnZ2VyXCIsIG9wdGlvbnMubmFtZSwgXCItPlwiLCBcIm5vIG5lZWQgdG8gY2hhbmdlLCBzdGlsbCBpbiBzeW5jXCIpO1xuXHRcdFx0XHRcdHJldHVybjsgLy8gYWxsIGdvb2Rcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0Ly8gRG9uJ3QgaGF2ZSBhIGdyb3VwLCBjaGVjayBpZiBhIG1hdGNoaW5nIG9uZSBleGlzdHNcblx0XHRcdC8vIF91dGlsLmxvZygwLCBcInRyaWdnZXJcIiwgb3B0aW9ucy5uYW1lLCBcIi0+XCIsIFwib3V0IG9mIHN5bmMhXCIpO1xuXHRcdFx0dmFyXG5cdFx0XHRncm91cHMgPSBfY3RybC5faW5kaWNhdG9ycy5ncm91cHMsXG5cdFx0XHRcdGdyb3VwLCBpID0gZ3JvdXBzLmxlbmd0aDtcblx0XHRcdHdoaWxlIChpLS0pIHtcblx0XHRcdFx0Z3JvdXAgPSBncm91cHNbaV07XG5cdFx0XHRcdGlmIChNYXRoLmFicyhncm91cC50cmlnZ2VySG9vayAtIHRyaWdnZXJIb29rKSA8IGNsb3NlRW5vdWdoKSB7XG5cdFx0XHRcdFx0Ly8gZm91bmQgYSBtYXRjaCFcblx0XHRcdFx0XHQvLyBfdXRpbC5sb2coMCwgXCJ0cmlnZ2VyXCIsIG9wdGlvbnMubmFtZSwgXCItPlwiLCBcImZvdW5kIG1hdGNoXCIpO1xuXHRcdFx0XHRcdGlmIChJbmRpY2F0b3IudHJpZ2dlckdyb3VwKSB7IC8vIGRvIEkgaGF2ZSBhbiBvbGQgZ3JvdXAgdGhhdCBpcyBvdXQgb2Ygc3luYz9cblx0XHRcdFx0XHRcdGlmIChJbmRpY2F0b3IudHJpZ2dlckdyb3VwLm1lbWJlcnMubGVuZ3RoID09PSAxKSB7IC8vIGlzIGl0IHRoZSBvbmx5IHJlbWFpbmluZyBncm91cD9cblx0XHRcdFx0XHRcdFx0Ly8gX3V0aWwubG9nKDAsIFwidHJpZ2dlclwiLCBvcHRpb25zLm5hbWUsIFwiLT5cIiwgXCJraWxsXCIpO1xuXHRcdFx0XHRcdFx0XHQvLyB3YXMgdGhlIGxhc3QgbWVtYmVyLCByZW1vdmUgdGhlIHdob2xlIGdyb3VwXG5cdFx0XHRcdFx0XHRcdHJlbW92ZVRyaWdnZXJHcm91cCgpO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0SW5kaWNhdG9yLnRyaWdnZXJHcm91cC5tZW1iZXJzLnNwbGljZShJbmRpY2F0b3IudHJpZ2dlckdyb3VwLm1lbWJlcnMuaW5kZXhPZihJbmRpY2F0b3IpLCAxKTsgLy8ganVzdCByZW1vdmUgZnJvbSBtZW1iZXJsaXN0IG9mIG9sZCBncm91cFxuXHRcdFx0XHRcdFx0XHRfY3RybC5faW5kaWNhdG9ycy51cGRhdGVUcmlnZ2VyR3JvdXBMYWJlbChJbmRpY2F0b3IudHJpZ2dlckdyb3VwKTtcblx0XHRcdFx0XHRcdFx0X2N0cmwuX2luZGljYXRvcnMudXBkYXRlVHJpZ2dlckdyb3VwUG9zaXRpb25zKEluZGljYXRvci50cmlnZ2VyR3JvdXApO1xuXHRcdFx0XHRcdFx0XHQvLyBfdXRpbC5sb2coMCwgXCJ0cmlnZ2VyXCIsIG9wdGlvbnMubmFtZSwgXCItPlwiLCBcInJlbW92aW5nIGZyb20gcHJldmlvdXMgbWVtYmVyIGxpc3RcIik7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vIGpvaW4gbmV3IGdyb3VwXG5cdFx0XHRcdFx0Z3JvdXAubWVtYmVycy5wdXNoKEluZGljYXRvcik7XG5cdFx0XHRcdFx0SW5kaWNhdG9yLnRyaWdnZXJHcm91cCA9IGdyb3VwO1xuXHRcdFx0XHRcdF9jdHJsLl9pbmRpY2F0b3JzLnVwZGF0ZVRyaWdnZXJHcm91cExhYmVsKGdyb3VwKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gYXQgdGhpcyBwb2ludCBJIGFtIG9idmlvdXNseSBvdXQgb2Ygc3luYyBhbmQgZG9uJ3QgbWF0Y2ggYW55IG90aGVyIGdyb3VwXG5cdFx0XHRpZiAoSW5kaWNhdG9yLnRyaWdnZXJHcm91cCkge1xuXHRcdFx0XHRpZiAoSW5kaWNhdG9yLnRyaWdnZXJHcm91cC5tZW1iZXJzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHRcdC8vIF91dGlsLmxvZygwLCBcInRyaWdnZXJcIiwgb3B0aW9ucy5uYW1lLCBcIi0+XCIsIFwidXBkYXRpbmcgZXhpc3RpbmdcIik7XG5cdFx0XHRcdFx0Ly8gb3V0IG9mIHN5bmMgYnV0IGknbSB0aGUgb25seSBtZW1iZXIgPT4ganVzdCBjaGFuZ2UgYW5kIHVwZGF0ZVxuXHRcdFx0XHRcdEluZGljYXRvci50cmlnZ2VyR3JvdXAudHJpZ2dlckhvb2sgPSB0cmlnZ2VySG9vaztcblx0XHRcdFx0XHRfY3RybC5faW5kaWNhdG9ycy51cGRhdGVUcmlnZ2VyR3JvdXBQb3NpdGlvbnMoSW5kaWNhdG9yLnRyaWdnZXJHcm91cCk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIF91dGlsLmxvZygwLCBcInRyaWdnZXJcIiwgb3B0aW9ucy5uYW1lLCBcIi0+XCIsIFwicmVtb3ZpbmcgZnJvbSBwcmV2aW91cyBtZW1iZXIgbGlzdFwiKTtcblx0XHRcdFx0XHRJbmRpY2F0b3IudHJpZ2dlckdyb3VwLm1lbWJlcnMuc3BsaWNlKEluZGljYXRvci50cmlnZ2VyR3JvdXAubWVtYmVycy5pbmRleE9mKEluZGljYXRvciksIDEpOyAvLyBqdXN0IHJlbW92ZSBmcm9tIG1lbWJlcmxpc3Qgb2Ygb2xkIGdyb3VwXG5cdFx0XHRcdFx0X2N0cmwuX2luZGljYXRvcnMudXBkYXRlVHJpZ2dlckdyb3VwTGFiZWwoSW5kaWNhdG9yLnRyaWdnZXJHcm91cCk7XG5cdFx0XHRcdFx0X2N0cmwuX2luZGljYXRvcnMudXBkYXRlVHJpZ2dlckdyb3VwUG9zaXRpb25zKEluZGljYXRvci50cmlnZ2VyR3JvdXApO1xuXHRcdFx0XHRcdEluZGljYXRvci50cmlnZ2VyR3JvdXAgPSB1bmRlZmluZWQ7IC8vIG5lZWQgYSBicmFuZCBuZXcgZ3JvdXAuLi5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0Ly8gX3V0aWwubG9nKDAsIFwidHJpZ2dlclwiLCBvcHRpb25zLm5hbWUsIFwiLT5cIiwgXCJhZGQgYSBuZXcgb25lXCIpO1xuXHRcdFx0Ly8gZGlkIG5vdCBmaW5kIGFueSBtYXRjaCwgbWFrZSBuZXcgdHJpZ2dlciBncm91cFxuXHRcdFx0YWRkVHJpZ2dlckdyb3VwKCk7XG5cdFx0fTtcblx0fTtcblxuLypcblx0ICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQgKiBUZW1wbGF0ZXMgZm9yIHRoZSBpbmRpY2F0b3JzXG5cdCAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0ICovXG5cdHZhciBUUEwgPSB7XG5cdFx0c3RhcnQ6IGZ1bmN0aW9uIChjb2xvcikge1xuXHRcdFx0Ly8gaW5uZXIgZWxlbWVudCAoZm9yIGJvdHRvbSBvZmZzZXQgLTEsIHdoaWxlIGtlZXBpbmcgdG9wIHBvc2l0aW9uIDApXG5cdFx0XHR2YXIgaW5uZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuXHRcdFx0aW5uZXIudGV4dENvbnRlbnQgPSBcInN0YXJ0XCI7XG5cdFx0XHRfdXRpbC5jc3MoaW5uZXIsIHtcblx0XHRcdFx0cG9zaXRpb246IFwiYWJzb2x1dGVcIixcblx0XHRcdFx0b3ZlcmZsb3c6IFwidmlzaWJsZVwiLFxuXHRcdFx0XHRcImJvcmRlci13aWR0aFwiOiAwLFxuXHRcdFx0XHRcImJvcmRlci1zdHlsZVwiOiBcInNvbGlkXCIsXG5cdFx0XHRcdGNvbG9yOiBjb2xvcixcblx0XHRcdFx0XCJib3JkZXItY29sb3JcIjogY29sb3Jcblx0XHRcdH0pO1xuXHRcdFx0dmFyIGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRcdC8vIHdyYXBwZXJcblx0XHRcdF91dGlsLmNzcyhlLCB7XG5cdFx0XHRcdHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG5cdFx0XHRcdG92ZXJmbG93OiBcInZpc2libGVcIixcblx0XHRcdFx0d2lkdGg6IDAsXG5cdFx0XHRcdGhlaWdodDogMFxuXHRcdFx0fSk7XG5cdFx0XHRlLmFwcGVuZENoaWxkKGlubmVyKTtcblx0XHRcdHJldHVybiBlO1xuXHRcdH0sXG5cdFx0ZW5kOiBmdW5jdGlvbiAoY29sb3IpIHtcblx0XHRcdHZhciBlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0XHRlLnRleHRDb250ZW50ID0gXCJlbmRcIjtcblx0XHRcdF91dGlsLmNzcyhlLCB7XG5cdFx0XHRcdHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG5cdFx0XHRcdG92ZXJmbG93OiBcInZpc2libGVcIixcblx0XHRcdFx0XCJib3JkZXItd2lkdGhcIjogMCxcblx0XHRcdFx0XCJib3JkZXItc3R5bGVcIjogXCJzb2xpZFwiLFxuXHRcdFx0XHRjb2xvcjogY29sb3IsXG5cdFx0XHRcdFwiYm9yZGVyLWNvbG9yXCI6IGNvbG9yXG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBlO1xuXHRcdH0sXG5cdFx0Ym91bmRzOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHR2YXIgZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdFx0X3V0aWwuY3NzKGUsIHtcblx0XHRcdFx0cG9zaXRpb246IFwiYWJzb2x1dGVcIixcblx0XHRcdFx0b3ZlcmZsb3c6IFwidmlzaWJsZVwiLFxuXHRcdFx0XHRcIndoaXRlLXNwYWNlXCI6IFwibm93cmFwXCIsXG5cdFx0XHRcdFwicG9pbnRlci1ldmVudHNcIjogXCJub25lXCIsXG5cdFx0XHRcdFwiZm9udC1zaXplXCI6IEZPTlRfU0laRVxuXHRcdFx0fSk7XG5cdFx0XHRlLnN0eWxlLnpJbmRleCA9IFpJTkRFWDtcblx0XHRcdHJldHVybiBlO1xuXHRcdH0sXG5cdFx0dHJpZ2dlcjogZnVuY3Rpb24gKGNvbG9yKSB7XG5cdFx0XHQvLyBpbm5lciB0byBiZSBhYm92ZSBvciBiZWxvdyBsaW5lIGJ1dCBrZWVwIHBvc2l0aW9uXG5cdFx0XHR2YXIgaW5uZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRcdGlubmVyLnRleHRDb250ZW50ID0gXCJ0cmlnZ2VyXCI7XG5cdFx0XHRfdXRpbC5jc3MoaW5uZXIsIHtcblx0XHRcdFx0cG9zaXRpb246IFwicmVsYXRpdmVcIixcblx0XHRcdH0pO1xuXHRcdFx0Ly8gaW5uZXIgd3JhcHBlciBmb3IgcmlnaHQ6IDAgYW5kIG1haW4gZWxlbWVudCBoYXMgbm8gc2l6ZVxuXHRcdFx0dmFyIHcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRcdF91dGlsLmNzcyh3LCB7XG5cdFx0XHRcdHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG5cdFx0XHRcdG92ZXJmbG93OiBcInZpc2libGVcIixcblx0XHRcdFx0XCJib3JkZXItd2lkdGhcIjogMCxcblx0XHRcdFx0XCJib3JkZXItc3R5bGVcIjogXCJzb2xpZFwiLFxuXHRcdFx0XHRjb2xvcjogY29sb3IsXG5cdFx0XHRcdFwiYm9yZGVyLWNvbG9yXCI6IGNvbG9yXG5cdFx0XHR9KTtcblx0XHRcdHcuYXBwZW5kQ2hpbGQoaW5uZXIpO1xuXHRcdFx0Ly8gd3JhcHBlclxuXHRcdFx0dmFyIGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRcdF91dGlsLmNzcyhlLCB7XG5cdFx0XHRcdHBvc2l0aW9uOiBcImZpeGVkXCIsXG5cdFx0XHRcdG92ZXJmbG93OiBcInZpc2libGVcIixcblx0XHRcdFx0XCJ3aGl0ZS1zcGFjZVwiOiBcIm5vd3JhcFwiLFxuXHRcdFx0XHRcInBvaW50ZXItZXZlbnRzXCI6IFwibm9uZVwiLFxuXHRcdFx0XHRcImZvbnQtc2l6ZVwiOiBGT05UX1NJWkVcblx0XHRcdH0pO1xuXHRcdFx0ZS5zdHlsZS56SW5kZXggPSBaSU5ERVg7XG5cdFx0XHRlLmFwcGVuZENoaWxkKHcpO1xuXHRcdFx0cmV0dXJuIGU7XG5cdFx0fSxcblx0fTtcblxufSkpOyJdLCJmaWxlIjoidmVuZG9yL3BsdWdpbnMvZGVidWcuYWRkSW5kaWNhdG9ycy5qcyJ9
