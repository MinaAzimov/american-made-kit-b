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
 * @file ScrollMagic main library.
 */
/**
 * @namespace ScrollMagic
 */
(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(factory);
	} else if (typeof exports === 'object') {
		// CommonJS
		module.exports = factory();
	} else {
		// Browser global
		root.ScrollMagic = factory();
	}
}(this, function () {
	"use strict";

	var ScrollMagic = function () {
		_util.log(2, '(COMPATIBILITY NOTICE) -> As of ScrollMagic 2.0.0 you need to use \'new ScrollMagic.Controller()\' to create a new controller instance. Use \'new ScrollMagic.Scene()\' to instance a scene.');
	};

	ScrollMagic.version = "2.0.5";

	// TODO: temporary workaround for chrome's scroll jitter bug
	window.addEventListener("mousewheel", function () {});

	// global const
	var PIN_SPACER_ATTRIBUTE = "data-scrollmagic-pin-spacer";

	/**
	 * The main class that is needed once per scroll container.
	 *
	 * @class
	 *
	 * @example
	 * // basic initialization
	 * var controller = new ScrollMagic.Controller();
	 *
	 * // passing options
	 * var controller = new ScrollMagic.Controller({container: "#myContainer", loglevel: 3});
	 *
	 * @param {object} [options] - An object containing one or more options for the controller.
	 * @param {(string|object)} [options.container=window] - A selector, DOM object that references the main container for scrolling.
	 * @param {boolean} [options.vertical=true] - Sets the scroll mode to vertical (`true`) or horizontal (`false`) scrolling.
	 * @param {object} [options.globalSceneOptions={}] - These options will be passed to every Scene that is added to the controller using the addScene method. For more information on Scene options see {@link ScrollMagic.Scene}.
	 * @param {number} [options.loglevel=2] Loglevel for debugging. Note that logging is disabled in the minified version of ScrollMagic.
	 ** `0` => silent
	 ** `1` => errors
	 ** `2` => errors, warnings
	 ** `3` => errors, warnings, debuginfo
	 * @param {boolean} [options.refreshInterval=100] - Some changes don't call events by default, like changing the container size or moving a scene trigger element.  
	 This interval polls these parameters to fire the necessary events.  
	 If you don't use custom containers, trigger elements or have static layouts, where the positions of the trigger elements don't change, you can set this to 0 disable interval checking and improve performance.
	 *
	 */
	ScrollMagic.Controller = function (options) {
/*
	 * ----------------------------------------------------------------
	 * settings
	 * ----------------------------------------------------------------
	 */
		var
		NAMESPACE = 'ScrollMagic.Controller',
			SCROLL_DIRECTION_FORWARD = 'FORWARD',
			SCROLL_DIRECTION_REVERSE = 'REVERSE',
			SCROLL_DIRECTION_PAUSED = 'PAUSED',
			DEFAULT_OPTIONS = CONTROLLER_OPTIONS.defaults;

/*
	 * ----------------------------------------------------------------
	 * private vars
	 * ----------------------------------------------------------------
	 */
		var
		Controller = this,
			_options = _util.extend({}, DEFAULT_OPTIONS, options),
			_sceneObjects = [],
			_updateScenesOnNextCycle = false,
			// can be boolean (true => all scenes) or an array of scenes to be updated
			_scrollPos = 0,
			_scrollDirection = SCROLL_DIRECTION_PAUSED,
			_isDocument = true,
			_viewPortSize = 0,
			_enabled = true,
			_updateTimeout, _refreshTimeout;

/*
	 * ----------------------------------------------------------------
	 * private functions
	 * ----------------------------------------------------------------
	 */

		/**
		 * Internal constructor function of the ScrollMagic Controller
		 * @private
		 */
		var construct = function () {
			for (var key in _options) {
				if (!DEFAULT_OPTIONS.hasOwnProperty(key)) {
					log(2, "WARNING: Unknown option \"" + key + "\"");
					delete _options[key];
				}
			}
			_options.container = _util.get.elements(_options.container)[0];
			// check ScrollContainer
			if (!_options.container) {
				log(1, "ERROR creating object " + NAMESPACE + ": No valid scroll container supplied");
				throw NAMESPACE + " init failed."; // cancel
			}
			_isDocument = _options.container === window || _options.container === document.body || !document.body.contains(_options.container);
			// normalize to window
			if (_isDocument) {
				_options.container = window;
			}
			// update container size immediately
			_viewPortSize = getViewportSize();
			// set event handlers
			_options.container.addEventListener("resize", onChange);
			_options.container.addEventListener("scroll", onChange);

			_options.refreshInterval = parseInt(_options.refreshInterval) || DEFAULT_OPTIONS.refreshInterval;
			scheduleRefresh();

			log(3, "added new " + NAMESPACE + " controller (v" + ScrollMagic.version + ")");
		};

		/**
		 * Schedule the next execution of the refresh function
		 * @private
		 */
		var scheduleRefresh = function () {
			if (_options.refreshInterval > 0) {
				_refreshTimeout = window.setTimeout(refresh, _options.refreshInterval);
			}
		};

		/**
		 * Default function to get scroll pos - overwriteable using `Controller.scrollPos(newFunction)`
		 * @private
		 */
		var getScrollPos = function () {
			return _options.vertical ? _util.get.scrollTop(_options.container) : _util.get.scrollLeft(_options.container);
		};

		/**
		 * Returns the current viewport Size (width vor horizontal, height for vertical)
		 * @private
		 */
		var getViewportSize = function () {
			return _options.vertical ? _util.get.height(_options.container) : _util.get.width(_options.container);
		};

		/**
		 * Default function to set scroll pos - overwriteable using `Controller.scrollTo(newFunction)`
		 * Make available publicly for pinned mousewheel workaround.
		 * @private
		 */
		var setScrollPos = this._setScrollPos = function (pos) {
			if (_options.vertical) {
				if (_isDocument) {
					window.scrollTo(_util.get.scrollLeft(), pos);
				} else {
					_options.container.scrollTop = pos;
				}
			} else {
				if (_isDocument) {
					window.scrollTo(pos, _util.get.scrollTop());
				} else {
					_options.container.scrollLeft = pos;
				}
			}
		};

		/**
		 * Handle updates in cycles instead of on scroll (performance)
		 * @private
		 */
		var updateScenes = function () {
			if (_enabled && _updateScenesOnNextCycle) {
				// determine scenes to update
				var scenesToUpdate = _util.type.Array(_updateScenesOnNextCycle) ? _updateScenesOnNextCycle : _sceneObjects.slice(0);
				// reset scenes
				_updateScenesOnNextCycle = false;
				var oldScrollPos = _scrollPos;
				// update scroll pos now instead of onChange, as it might have changed since scheduling (i.e. in-browser smooth scroll)
				_scrollPos = Controller.scrollPos();
				var deltaScroll = _scrollPos - oldScrollPos;
				if (deltaScroll !== 0) { // scroll position changed?
					_scrollDirection = (deltaScroll > 0) ? SCROLL_DIRECTION_FORWARD : SCROLL_DIRECTION_REVERSE;
				}
				// reverse order of scenes if scrolling reverse
				if (_scrollDirection === SCROLL_DIRECTION_REVERSE) {
					scenesToUpdate.reverse();
				}
				// update scenes
				scenesToUpdate.forEach(function (scene, index) {
					log(3, "updating Scene " + (index + 1) + "/" + scenesToUpdate.length + " (" + _sceneObjects.length + " total)");
					scene.update(true);
				});
				if (scenesToUpdate.length === 0 && _options.loglevel >= 3) {
					log(3, "updating 0 Scenes (nothing added to controller)");
				}
			}
		};

		/**
		 * Initializes rAF callback
		 * @private
		 */
		var debounceUpdate = function () {
			_updateTimeout = _util.rAF(updateScenes);
		};

		/**
		 * Handles Container changes
		 * @private
		 */
		var onChange = function (e) {
			log(3, "event fired causing an update:", e.type);
			if (e.type == "resize") {
				// resize
				_viewPortSize = getViewportSize();
				_scrollDirection = SCROLL_DIRECTION_PAUSED;
			}
			// schedule update
			if (_updateScenesOnNextCycle !== true) {
				_updateScenesOnNextCycle = true;
				debounceUpdate();
			}
		};

		var refresh = function () {
			if (!_isDocument) {
				// simulate resize event. Only works for viewport relevant param (performance)
				if (_viewPortSize != getViewportSize()) {
					var resizeEvent;
					try {
						resizeEvent = new Event('resize', {
							bubbles: false,
							cancelable: false
						});
					} catch (e) { // stupid IE
						resizeEvent = document.createEvent("Event");
						resizeEvent.initEvent("resize", false, false);
					}
					_options.container.dispatchEvent(resizeEvent);
				}
			}
			_sceneObjects.forEach(function (scene, index) { // refresh all scenes
				scene.refresh();
			});
			scheduleRefresh();
		};

		/**
		 * Send a debug message to the console.
		 * provided publicly with _log for plugins
		 * @private
		 *
		 * @param {number} loglevel - The loglevel required to initiate output for the message.
		 * @param {...mixed} output - One or more variables that should be passed to the console.
		 */
		var log = this._log = function (loglevel, output) {
			if (_options.loglevel >= loglevel) {
				Array.prototype.splice.call(arguments, 1, 0, "(" + NAMESPACE + ") ->");
				_util.log.apply(window, arguments);
			}
		};
		// for scenes we have getters for each option, but for the controller we don't, so we need to make it available externally for plugins
		this._options = _options;

		/**
		 * Sort scenes in ascending order of their start offset.
		 * @private
		 *
		 * @param {array} ScenesArray - an array of ScrollMagic Scenes that should be sorted
		 * @return {array} The sorted array of Scenes.
		 */
		var sortScenes = function (ScenesArray) {
			if (ScenesArray.length <= 1) {
				return ScenesArray;
			} else {
				var scenes = ScenesArray.slice(0);
				scenes.sort(function (a, b) {
					return a.scrollOffset() > b.scrollOffset() ? 1 : -1;
				});
				return scenes;
			}
		};

		/**
		 * ----------------------------------------------------------------
		 * public functions
		 * ----------------------------------------------------------------
		 */

		/**
		 * Add one ore more scene(s) to the controller.  
		 * This is the equivalent to `Scene.addTo(controller)`.
		 * @public
		 * @example
		 * // with a previously defined scene
		 * controller.addScene(scene);
		 *
		 * // with a newly created scene.
		 * controller.addScene(new ScrollMagic.Scene({duration : 0}));
		 *
		 * // adding multiple scenes
		 * controller.addScene([scene, scene2, new ScrollMagic.Scene({duration : 0})]);
		 *
		 * @param {(ScrollMagic.Scene|array)} newScene - ScrollMagic Scene or Array of Scenes to be added to the controller.
		 * @return {Controller} Parent object for chaining.
		 */
		this.addScene = function (newScene) {
			if (_util.type.Array(newScene)) {
				newScene.forEach(function (scene, index) {
					Controller.addScene(scene);
				});
			} else if (newScene instanceof ScrollMagic.Scene) {
				if (newScene.controller() !== Controller) {
					newScene.addTo(Controller);
				} else if (_sceneObjects.indexOf(newScene) < 0) {
					// new scene
					_sceneObjects.push(newScene); // add to array
					_sceneObjects = sortScenes(_sceneObjects); // sort
					newScene.on("shift.controller_sort", function () { // resort whenever scene moves
						_sceneObjects = sortScenes(_sceneObjects);
					});
					// insert Global defaults.
					for (var key in _options.globalSceneOptions) {
						if (newScene[key]) {
							newScene[key].call(newScene, _options.globalSceneOptions[key]);
						}
					}
					log(3, "adding Scene (now " + _sceneObjects.length + " total)");
				}
			} else {
				log(1, "ERROR: invalid argument supplied for '.addScene()'");
			}
			return Controller;
		};

		/**
		 * Remove one ore more scene(s) from the controller.  
		 * This is the equivalent to `Scene.remove()`.
		 * @public
		 * @example
		 * // remove a scene from the controller
		 * controller.removeScene(scene);
		 *
		 * // remove multiple scenes from the controller
		 * controller.removeScene([scene, scene2, scene3]);
		 *
		 * @param {(ScrollMagic.Scene|array)} Scene - ScrollMagic Scene or Array of Scenes to be removed from the controller.
		 * @returns {Controller} Parent object for chaining.
		 */
		this.removeScene = function (Scene) {
			if (_util.type.Array(Scene)) {
				Scene.forEach(function (scene, index) {
					Controller.removeScene(scene);
				});
			} else {
				var index = _sceneObjects.indexOf(Scene);
				if (index > -1) {
					Scene.off("shift.controller_sort");
					_sceneObjects.splice(index, 1);
					log(3, "removing Scene (now " + _sceneObjects.length + " left)");
					Scene.remove();
				}
			}
			return Controller;
		};

		/**
		 * Update one ore more scene(s) according to the scroll position of the container.  
		 * This is the equivalent to `Scene.update()`.  
		 * The update method calculates the scene's start and end position (based on the trigger element, trigger hook, duration and offset) and checks it against the current scroll position of the container.  
		 * It then updates the current scene state accordingly (or does nothing, if the state is already correct) – Pins will be set to their correct position and tweens will be updated to their correct progress.  
		 * _**Note:** This method gets called constantly whenever Controller detects a change. The only application for you is if you change something outside of the realm of ScrollMagic, like moving the trigger or changing tween parameters._
		 * @public
		 * @example
		 * // update a specific scene on next cycle
		 * controller.updateScene(scene);
		 *
		 * // update a specific scene immediately
		 * controller.updateScene(scene, true);
		 *
		 * // update multiple scenes scene on next cycle
		 * controller.updateScene([scene1, scene2, scene3]);
		 *
		 * @param {ScrollMagic.Scene} Scene - ScrollMagic Scene or Array of Scenes that is/are supposed to be updated.
		 * @param {boolean} [immediately=false] - If `true` the update will be instant, if `false` it will wait until next update cycle.  
		 This is useful when changing multiple properties of the scene - this way it will only be updated once all new properties are set (updateScenes).
		 * @return {Controller} Parent object for chaining.
		 */
		this.updateScene = function (Scene, immediately) {
			if (_util.type.Array(Scene)) {
				Scene.forEach(function (scene, index) {
					Controller.updateScene(scene, immediately);
				});
			} else {
				if (immediately) {
					Scene.update(true);
				} else if (_updateScenesOnNextCycle !== true && Scene instanceof ScrollMagic.Scene) { // if _updateScenesOnNextCycle is true, all connected scenes are already scheduled for update
					// prep array for next update cycle
					_updateScenesOnNextCycle = _updateScenesOnNextCycle || [];
					if (_updateScenesOnNextCycle.indexOf(Scene) == -1) {
						_updateScenesOnNextCycle.push(Scene);
					}
					_updateScenesOnNextCycle = sortScenes(_updateScenesOnNextCycle); // sort
					debounceUpdate();
				}
			}
			return Controller;
		};

		/**
		 * Updates the controller params and calls updateScene on every scene, that is attached to the controller.  
		 * See `Controller.updateScene()` for more information about what this means.  
		 * In most cases you will not need this function, as it is called constantly, whenever ScrollMagic detects a state change event, like resize or scroll.  
		 * The only application for this method is when ScrollMagic fails to detect these events.  
		 * One application is with some external scroll libraries (like iScroll) that move an internal container to a negative offset instead of actually scrolling. In this case the update on the controller needs to be called whenever the child container's position changes.
		 * For this case there will also be the need to provide a custom function to calculate the correct scroll position. See `Controller.scrollPos()` for details.
		 * @public
		 * @example
		 * // update the controller on next cycle (saves performance due to elimination of redundant updates)
		 * controller.update();
		 *
		 * // update the controller immediately
		 * controller.update(true);
		 *
		 * @param {boolean} [immediately=false] - If `true` the update will be instant, if `false` it will wait until next update cycle (better performance)
		 * @return {Controller} Parent object for chaining.
		 */
		this.update = function (immediately) {
			onChange({
				type: "resize"
			}); // will update size and set _updateScenesOnNextCycle to true
			if (immediately) {
				updateScenes();
			}
			return Controller;
		};

		/**
		 * Scroll to a numeric scroll offset, a DOM element, the start of a scene or provide an alternate method for scrolling.  
		 * For vertical controllers it will change the top scroll offset and for horizontal applications it will change the left offset.
		 * @public
		 *
		 * @since 1.1.0
		 * @example
		 * // scroll to an offset of 100
		 * controller.scrollTo(100);
		 *
		 * // scroll to a DOM element
		 * controller.scrollTo("#anchor");
		 *
		 * // scroll to the beginning of a scene
		 * var scene = new ScrollMagic.Scene({offset: 200});
		 * controller.scrollTo(scene);
		 *
		 * // define a new scroll position modification function (jQuery animate instead of jump)
		 * controller.scrollTo(function (newScrollPos) {
		 *	$("html, body").animate({scrollTop: newScrollPos});
		 * });
		 * controller.scrollTo(100); // call as usual, but the new function will be used instead
		 *
		 * // define a new scroll function with an additional parameter
		 * controller.scrollTo(function (newScrollPos, message) {
		 *  console.log(message);
		 *	$(this).animate({scrollTop: newScrollPos});
		 * });
		 * // call as usual, but supply an extra parameter to the defined custom function
		 * controller.scrollTo(100, "my message");
		 *
		 * // define a new scroll function with an additional parameter containing multiple variables
		 * controller.scrollTo(function (newScrollPos, options) {
		 *  someGlobalVar = options.a + options.b;
		 *	$(this).animate({scrollTop: newScrollPos});
		 * });
		 * // call as usual, but supply an extra parameter containing multiple options
		 * controller.scrollTo(100, {a: 1, b: 2});
		 *
		 * // define a new scroll function with a callback supplied as an additional parameter
		 * controller.scrollTo(function (newScrollPos, callback) {
		 *	$(this).animate({scrollTop: newScrollPos}, 400, "swing", callback);
		 * });
		 * // call as usual, but supply an extra parameter, which is used as a callback in the previously defined custom scroll function
		 * controller.scrollTo(100, function() {
		 *	console.log("scroll has finished.");
		 * });
		 *
		 * @param {mixed} scrollTarget - The supplied argument can be one of these types:
		 * 1. `number` -> The container will scroll to this new scroll offset.
		 * 2. `string` or `object` -> Can be a selector or a DOM object.  
		 *  The container will scroll to the position of this element.
		 * 3. `ScrollMagic Scene` -> The container will scroll to the start of this scene.
		 * 4. `function` -> This function will be used for future scroll position modifications.  
		 *  This provides a way for you to change the behaviour of scrolling and adding new behaviour like animation. The function receives the new scroll position as a parameter and a reference to the container element using `this`.  
		 *  It may also optionally receive an optional additional parameter (see below)  
		 *  _**NOTE:**  
		 *  All other options will still work as expected, using the new function to scroll._
		 * @param {mixed} [additionalParameter] - If a custom scroll function was defined (see above 4.), you may want to supply additional parameters to it, when calling it. You can do this using this parameter – see examples for details. Please note, that this parameter will have no effect, if you use the default scrolling function.
		 * @returns {Controller} Parent object for chaining.
		 */
		this.scrollTo = function (scrollTarget, additionalParameter) {
			if (_util.type.Number(scrollTarget)) { // excecute
				setScrollPos.call(_options.container, scrollTarget, additionalParameter);
			} else if (scrollTarget instanceof ScrollMagic.Scene) { // scroll to scene
				if (scrollTarget.controller() === Controller) { // check if the controller is associated with this scene
					Controller.scrollTo(scrollTarget.scrollOffset(), additionalParameter);
				} else {
					log(2, "scrollTo(): The supplied scene does not belong to this controller. Scroll cancelled.", scrollTarget);
				}
			} else if (_util.type.Function(scrollTarget)) { // assign new scroll function
				setScrollPos = scrollTarget;
			} else { // scroll to element
				var elem = _util.get.elements(scrollTarget)[0];
				if (elem) {
					// if parent is pin spacer, use spacer position instead so correct start position is returned for pinned elements.
					while (elem.parentNode.hasAttribute(PIN_SPACER_ATTRIBUTE)) {
						elem = elem.parentNode;
					}

					var
					param = _options.vertical ? "top" : "left",
						// which param is of interest ?
						containerOffset = _util.get.offset(_options.container),
						// container position is needed because element offset is returned in relation to document, not in relation to container.
						elementOffset = _util.get.offset(elem);

					if (!_isDocument) { // container is not the document root, so substract scroll Position to get correct trigger element position relative to scrollcontent
						containerOffset[param] -= Controller.scrollPos();
					}

					Controller.scrollTo(elementOffset[param] - containerOffset[param], additionalParameter);
				} else {
					log(2, "scrollTo(): The supplied argument is invalid. Scroll cancelled.", scrollTarget);
				}
			}
			return Controller;
		};

		/**
		 * **Get** the current scrollPosition or **Set** a new method to calculate it.  
		 * -> **GET**:
		 * When used as a getter this function will return the current scroll position.  
		 * To get a cached value use Controller.info("scrollPos"), which will be updated in the update cycle.  
		 * For vertical controllers it will return the top scroll offset and for horizontal applications it will return the left offset.
		 *
		 * -> **SET**:
		 * When used as a setter this method prodes a way to permanently overwrite the controller's scroll position calculation.  
		 * A typical usecase is when the scroll position is not reflected by the containers scrollTop or scrollLeft values, but for example by the inner offset of a child container.  
		 * Moving a child container inside a parent is a commonly used method for several scrolling frameworks, including iScroll.  
		 * By providing an alternate calculation function you can make sure ScrollMagic receives the correct scroll position.  
		 * Please also bear in mind that your function should return y values for vertical scrolls an x for horizontals.
		 *
		 * To change the current scroll position please use `Controller.scrollTo()`.
		 * @public
		 *
		 * @example
		 * // get the current scroll Position
		 * var scrollPos = controller.scrollPos();
		 *
		 * // set a new scroll position calculation method
		 * controller.scrollPos(function () {
		 *	return this.info("vertical") ? -mychildcontainer.y : -mychildcontainer.x
		 * });
		 *
		 * @param {function} [scrollPosMethod] - The function to be used for the scroll position calculation of the container.
		 * @returns {(number|Controller)} Current scroll position or parent object for chaining.
		 */
		this.scrollPos = function (scrollPosMethod) {
			if (!arguments.length) { // get
				return getScrollPos.call(Controller);
			} else { // set
				if (_util.type.Function(scrollPosMethod)) {
					getScrollPos = scrollPosMethod;
				} else {
					log(2, "Provided value for method 'scrollPos' is not a function. To change the current scroll position use 'scrollTo()'.");
				}
			}
			return Controller;
		};

		/**
		 * **Get** all infos or one in particular about the controller.
		 * @public
		 * @example
		 * // returns the current scroll position (number)
		 * var scrollPos = controller.info("scrollPos");
		 *
		 * // returns all infos as an object
		 * var infos = controller.info();
		 *
		 * @param {string} [about] - If passed only this info will be returned instead of an object containing all.  
		 Valid options are:
		 ** `"size"` => the current viewport size of the container
		 ** `"vertical"` => true if vertical scrolling, otherwise false
		 ** `"scrollPos"` => the current scroll position
		 ** `"scrollDirection"` => the last known direction of the scroll
		 ** `"container"` => the container element
		 ** `"isDocument"` => true if container element is the document.
		 * @returns {(mixed|object)} The requested info(s).
		 */
		this.info = function (about) {
			var values = {
				size: _viewPortSize,
				// contains height or width (in regard to orientation);
				vertical: _options.vertical,
				scrollPos: _scrollPos,
				scrollDirection: _scrollDirection,
				container: _options.container,
				isDocument: _isDocument
			};
			if (!arguments.length) { // get all as an object
				return values;
			} else if (values[about] !== undefined) {
				return values[about];
			} else {
				log(1, "ERROR: option \"" + about + "\" is not available");
				return;
			}
		};

		/**
		 * **Get** or **Set** the current loglevel option value.
		 * @public
		 *
		 * @example
		 * // get the current value
		 * var loglevel = controller.loglevel();
		 *
		 * // set a new value
		 * controller.loglevel(3);
		 *
		 * @param {number} [newLoglevel] - The new loglevel setting of the Controller. `[0-3]`
		 * @returns {(number|Controller)} Current loglevel or parent object for chaining.
		 */
		this.loglevel = function (newLoglevel) {
			if (!arguments.length) { // get
				return _options.loglevel;
			} else if (_options.loglevel != newLoglevel) { // set
				_options.loglevel = newLoglevel;
			}
			return Controller;
		};

		/**
		 * **Get** or **Set** the current enabled state of the controller.  
		 * This can be used to disable all Scenes connected to the controller without destroying or removing them.
		 * @public
		 *
		 * @example
		 * // get the current value
		 * var enabled = controller.enabled();
		 *
		 * // disable the controller
		 * controller.enabled(false);
		 *
		 * @param {boolean} [newState] - The new enabled state of the controller `true` or `false`.
		 * @returns {(boolean|Controller)} Current enabled state or parent object for chaining.
		 */
		this.enabled = function (newState) {
			if (!arguments.length) { // get
				return _enabled;
			} else if (_enabled != newState) { // set
				_enabled = !! newState;
				Controller.updateScene(_sceneObjects, true);
			}
			return Controller;
		};

		/**
		 * Destroy the Controller, all Scenes and everything.
		 * @public
		 *
		 * @example
		 * // without resetting the scenes
		 * controller = controller.destroy();
		 *
		 * // with scene reset
		 * controller = controller.destroy(true);
		 *
		 * @param {boolean} [resetScenes=false] - If `true` the pins and tweens (if existent) of all scenes will be reset.
		 * @returns {null} Null to unset handler variables.
		 */
		this.destroy = function (resetScenes) {
			window.clearTimeout(_refreshTimeout);
			var i = _sceneObjects.length;
			while (i--) {
				_sceneObjects[i].destroy(resetScenes);
			}
			_options.container.removeEventListener("resize", onChange);
			_options.container.removeEventListener("scroll", onChange);
			_util.cAF(_updateTimeout);
			log(3, "destroyed " + NAMESPACE + " (reset: " + (resetScenes ? "true" : "false") + ")");
			return null;
		};

		// INIT
		construct();
		return Controller;
	};

	// store pagewide controller options
	var CONTROLLER_OPTIONS = {
		defaults: {
			container: window,
			vertical: true,
			globalSceneOptions: {},
			loglevel: 2,
			refreshInterval: 100
		}
	};
/*
 * method used to add an option to ScrollMagic Scenes.
 */
	ScrollMagic.Controller.addOption = function (name, defaultValue) {
		CONTROLLER_OPTIONS.defaults[name] = defaultValue;
	};
	// instance extension function for plugins
	ScrollMagic.Controller.extend = function (extension) {
		var oldClass = this;
		ScrollMagic.Controller = function () {
			oldClass.apply(this, arguments);
			this.$super = _util.extend({}, this); // copy parent state
			return extension.apply(this, arguments) || this;
		};
		_util.extend(ScrollMagic.Controller, oldClass); // copy properties
		ScrollMagic.Controller.prototype = oldClass.prototype; // copy prototype
		ScrollMagic.Controller.prototype.constructor = ScrollMagic.Controller; // restore constructor
	};


	/**
	 * A Scene defines where the controller should react and how.
	 *
	 * @class
	 *
	 * @example
	 * // create a standard scene and add it to a controller
	 * new ScrollMagic.Scene()
	 *		.addTo(controller);
	 *
	 * // create a scene with custom options and assign a handler to it.
	 * var scene = new ScrollMagic.Scene({
	 * 		duration: 100,
	 *		offset: 200,
	 *		triggerHook: "onEnter",
	 *		reverse: false
	 * });
	 *
	 * @param {object} [options] - Options for the Scene. The options can be updated at any time.  
	 Instead of setting the options for each scene individually you can also set them globally in the controller as the controllers `globalSceneOptions` option. The object accepts the same properties as the ones below.  
	 When a scene is added to the controller the options defined using the Scene constructor will be overwritten by those set in `globalSceneOptions`.
	 * @param {(number|function)} [options.duration=0] - The duration of the scene. 
	 If `0` tweens will auto-play when reaching the scene start point, pins will be pinned indefinetly starting at the start position.  
	 A function retuning the duration value is also supported. Please see `Scene.duration()` for details.
	 * @param {number} [options.offset=0] - Offset Value for the Trigger Position. If no triggerElement is defined this will be the scroll distance from the start of the page, after which the scene will start.
	 * @param {(string|object)} [options.triggerElement=null] - Selector or DOM object that defines the start of the scene. If undefined the scene will start right at the start of the page (unless an offset is set).
	 * @param {(number|string)} [options.triggerHook="onCenter"] - Can be a number between 0 and 1 defining the position of the trigger Hook in relation to the viewport.  
	 Can also be defined using a string:
	 ** `"onEnter"` => `1`
	 ** `"onCenter"` => `0.5`
	 ** `"onLeave"` => `0`
	 * @param {boolean} [options.reverse=true] - Should the scene reverse, when scrolling up?
	 * @param {number} [options.loglevel=2] - Loglevel for debugging. Note that logging is disabled in the minified version of ScrollMagic.
	 ** `0` => silent
	 ** `1` => errors
	 ** `2` => errors, warnings
	 ** `3` => errors, warnings, debuginfo
	 * 
	 */
	ScrollMagic.Scene = function (options) {

/*
	 * ----------------------------------------------------------------
	 * settings
	 * ----------------------------------------------------------------
	 */

		var
		NAMESPACE = 'ScrollMagic.Scene',
			SCENE_STATE_BEFORE = 'BEFORE',
			SCENE_STATE_DURING = 'DURING',
			SCENE_STATE_AFTER = 'AFTER',
			DEFAULT_OPTIONS = SCENE_OPTIONS.defaults;

/*
	 * ----------------------------------------------------------------
	 * private vars
	 * ----------------------------------------------------------------
	 */

		var
		Scene = this,
			_options = _util.extend({}, DEFAULT_OPTIONS, options),
			_state = SCENE_STATE_BEFORE,
			_progress = 0,
			_scrollOffset = {
				start: 0,
				end: 0
			},
			// reflects the controllers's scroll position for the start and end of the scene respectively
			_triggerPos = 0,
			_enabled = true,
			_durationUpdateMethod, _controller;

		/**
		 * Internal constructor function of the ScrollMagic Scene
		 * @private
		 */
		var construct = function () {
			for (var key in _options) { // check supplied options
				if (!DEFAULT_OPTIONS.hasOwnProperty(key)) {
					log(2, "WARNING: Unknown option \"" + key + "\"");
					delete _options[key];
				}
			}
			// add getters/setters for all possible options
			for (var optionName in DEFAULT_OPTIONS) {
				addSceneOption(optionName);
			}
			// validate all options
			validateOption();
		};

/*
 * ----------------------------------------------------------------
 * Event Management
 * ----------------------------------------------------------------
 */

		var _listeners = {};
		/**
		 * Scene start event.  
		 * Fires whenever the scroll position its the starting point of the scene.  
		 * It will also fire when scrolling back up going over the start position of the scene. If you want something to happen only when scrolling down/right, use the scrollDirection parameter passed to the callback.
		 *
		 * For details on this event and the order in which it is fired, please review the {@link Scene.progress} method.
		 *
		 * @event ScrollMagic.Scene#start
		 *
		 * @example
		 * scene.on("start", function (event) {
		 * 	console.log("Hit start point of scene.");
		 * });
		 *
		 * @property {object} event - The event Object passed to each callback
		 * @property {string} event.type - The name of the event
		 * @property {Scene} event.target - The Scene object that triggered this event
		 * @property {number} event.progress - Reflects the current progress of the scene
		 * @property {string} event.state - The current state of the scene `"BEFORE"` or `"DURING"`
		 * @property {string} event.scrollDirection - Indicates which way we are scrolling `"PAUSED"`, `"FORWARD"` or `"REVERSE"`
		 */
		/**
		 * Scene end event.  
		 * Fires whenever the scroll position its the ending point of the scene.  
		 * It will also fire when scrolling back up from after the scene and going over its end position. If you want something to happen only when scrolling down/right, use the scrollDirection parameter passed to the callback.
		 *
		 * For details on this event and the order in which it is fired, please review the {@link Scene.progress} method.
		 *
		 * @event ScrollMagic.Scene#end
		 *
		 * @example
		 * scene.on("end", function (event) {
		 * 	console.log("Hit end point of scene.");
		 * });
		 *
		 * @property {object} event - The event Object passed to each callback
		 * @property {string} event.type - The name of the event
		 * @property {Scene} event.target - The Scene object that triggered this event
		 * @property {number} event.progress - Reflects the current progress of the scene
		 * @property {string} event.state - The current state of the scene `"DURING"` or `"AFTER"`
		 * @property {string} event.scrollDirection - Indicates which way we are scrolling `"PAUSED"`, `"FORWARD"` or `"REVERSE"`
		 */
		/**
		 * Scene enter event.  
		 * Fires whenever the scene enters the "DURING" state.  
		 * Keep in mind that it doesn't matter if the scene plays forward or backward: This event always fires when the scene enters its active scroll timeframe, regardless of the scroll-direction.
		 *
		 * For details on this event and the order in which it is fired, please review the {@link Scene.progress} method.
		 *
		 * @event ScrollMagic.Scene#enter
		 *
		 * @example
		 * scene.on("enter", function (event) {
		 * 	console.log("Scene entered.");
		 * });
		 *
		 * @property {object} event - The event Object passed to each callback
		 * @property {string} event.type - The name of the event
		 * @property {Scene} event.target - The Scene object that triggered this event
		 * @property {number} event.progress - Reflects the current progress of the scene
		 * @property {string} event.state - The current state of the scene - always `"DURING"`
		 * @property {string} event.scrollDirection - Indicates which way we are scrolling `"PAUSED"`, `"FORWARD"` or `"REVERSE"`
		 */
		/**
		 * Scene leave event.  
		 * Fires whenever the scene's state goes from "DURING" to either "BEFORE" or "AFTER".  
		 * Keep in mind that it doesn't matter if the scene plays forward or backward: This event always fires when the scene leaves its active scroll timeframe, regardless of the scroll-direction.
		 *
		 * For details on this event and the order in which it is fired, please review the {@link Scene.progress} method.
		 *
		 * @event ScrollMagic.Scene#leave
		 *
		 * @example
		 * scene.on("leave", function (event) {
		 * 	console.log("Scene left.");
		 * });
		 *
		 * @property {object} event - The event Object passed to each callback
		 * @property {string} event.type - The name of the event
		 * @property {Scene} event.target - The Scene object that triggered this event
		 * @property {number} event.progress - Reflects the current progress of the scene
		 * @property {string} event.state - The current state of the scene `"BEFORE"` or `"AFTER"`
		 * @property {string} event.scrollDirection - Indicates which way we are scrolling `"PAUSED"`, `"FORWARD"` or `"REVERSE"`
		 */
		/**
		 * Scene update event.  
		 * Fires whenever the scene is updated (but not necessarily changes the progress).
		 *
		 * @event ScrollMagic.Scene#update
		 *
		 * @example
		 * scene.on("update", function (event) {
		 * 	console.log("Scene updated.");
		 * });
		 *
		 * @property {object} event - The event Object passed to each callback
		 * @property {string} event.type - The name of the event
		 * @property {Scene} event.target - The Scene object that triggered this event
		 * @property {number} event.startPos - The starting position of the scene (in relation to the conainer)
		 * @property {number} event.endPos - The ending position of the scene (in relation to the conainer)
		 * @property {number} event.scrollPos - The current scroll position of the container
		 */
		/**
		 * Scene progress event.  
		 * Fires whenever the progress of the scene changes.
		 *
		 * For details on this event and the order in which it is fired, please review the {@link Scene.progress} method.
		 *
		 * @event ScrollMagic.Scene#progress
		 *
		 * @example
		 * scene.on("progress", function (event) {
		 * 	console.log("Scene progress changed to " + event.progress);
		 * });
		 *
		 * @property {object} event - The event Object passed to each callback
		 * @property {string} event.type - The name of the event
		 * @property {Scene} event.target - The Scene object that triggered this event
		 * @property {number} event.progress - Reflects the current progress of the scene
		 * @property {string} event.state - The current state of the scene `"BEFORE"`, `"DURING"` or `"AFTER"`
		 * @property {string} event.scrollDirection - Indicates which way we are scrolling `"PAUSED"`, `"FORWARD"` or `"REVERSE"`
		 */
		/**
		 * Scene change event.  
		 * Fires whenvever a property of the scene is changed.
		 *
		 * @event ScrollMagic.Scene#change
		 *
		 * @example
		 * scene.on("change", function (event) {
		 * 	console.log("Scene Property \"" + event.what + "\" changed to " + event.newval);
		 * });
		 *
		 * @property {object} event - The event Object passed to each callback
		 * @property {string} event.type - The name of the event
		 * @property {Scene} event.target - The Scene object that triggered this event
		 * @property {string} event.what - Indicates what value has been changed
		 * @property {mixed} event.newval - The new value of the changed property
		 */
		/**
		 * Scene shift event.  
		 * Fires whenvever the start or end **scroll offset** of the scene change.
		 * This happens explicitely, when one of these values change: `offset`, `duration` or `triggerHook`.
		 * It will fire implicitly when the `triggerElement` changes, if the new element has a different position (most cases).
		 * It will also fire implicitly when the size of the container changes and the triggerHook is anything other than `onLeave`.
		 *
		 * @event ScrollMagic.Scene#shift
		 * @since 1.1.0
		 *
		 * @example
		 * scene.on("shift", function (event) {
		 * 	console.log("Scene moved, because the " + event.reason + " has changed.)");
		 * });
		 *
		 * @property {object} event - The event Object passed to each callback
		 * @property {string} event.type - The name of the event
		 * @property {Scene} event.target - The Scene object that triggered this event
		 * @property {string} event.reason - Indicates why the scene has shifted
		 */
		/**
		 * Scene destroy event.  
		 * Fires whenvever the scene is destroyed.
		 * This can be used to tidy up custom behaviour used in events.
		 *
		 * @event ScrollMagic.Scene#destroy
		 * @since 1.1.0
		 *
		 * @example
		 * scene.on("enter", function (event) {
		 *        // add custom action
		 *        $("#my-elem").left("200");
		 *      })
		 *      .on("destroy", function (event) {
		 *        // reset my element to start position
		 *        if (event.reset) {
		 *          $("#my-elem").left("0");
		 *        }
		 *      });
		 *
		 * @property {object} event - The event Object passed to each callback
		 * @property {string} event.type - The name of the event
		 * @property {Scene} event.target - The Scene object that triggered this event
		 * @property {boolean} event.reset - Indicates if the destroy method was called with reset `true` or `false`.
		 */
		/**
		 * Scene add event.  
		 * Fires when the scene is added to a controller.
		 * This is mostly used by plugins to know that change might be due.
		 *
		 * @event ScrollMagic.Scene#add
		 * @since 2.0.0
		 *
		 * @example
		 * scene.on("add", function (event) {
		 * 	console.log('Scene was added to a new controller.');
		 * });
		 *
		 * @property {object} event - The event Object passed to each callback
		 * @property {string} event.type - The name of the event
		 * @property {Scene} event.target - The Scene object that triggered this event
		 * @property {boolean} event.controller - The controller object the scene was added to.
		 */
		/**
		 * Scene remove event.  
		 * Fires when the scene is removed from a controller.
		 * This is mostly used by plugins to know that change might be due.
		 *
		 * @event ScrollMagic.Scene#remove
		 * @since 2.0.0
		 *
		 * @example
		 * scene.on("remove", function (event) {
		 * 	console.log('Scene was removed from its controller.');
		 * });
		 *
		 * @property {object} event - The event Object passed to each callback
		 * @property {string} event.type - The name of the event
		 * @property {Scene} event.target - The Scene object that triggered this event
		 */

		/**
		 * Add one ore more event listener.  
		 * The callback function will be fired at the respective event, and an object containing relevant data will be passed to the callback.
		 * @method ScrollMagic.Scene#on
		 *
		 * @example
		 * function callback (event) {
		 * 		console.log("Event fired! (" + event.type + ")");
		 * }
		 * // add listeners
		 * scene.on("change update progress start end enter leave", callback);
		 *
		 * @param {string} names - The name or names of the event the callback should be attached to.
		 * @param {function} callback - A function that should be executed, when the event is dispatched. An event object will be passed to the callback.
		 * @returns {Scene} Parent object for chaining.
		 */
		this.on = function (names, callback) {
			if (_util.type.Function(callback)) {
				names = names.trim().split(' ');
				names.forEach(function (fullname) {
					var
					nameparts = fullname.split('.'),
						eventname = nameparts[0],
						namespace = nameparts[1];
					if (eventname != "*") { // disallow wildcards
						if (!_listeners[eventname]) {
							_listeners[eventname] = [];
						}
						_listeners[eventname].push({
							namespace: namespace || '',
							callback: callback
						});
					}
				});
			} else {
				log(1, "ERROR when calling '.on()': Supplied callback for '" + names + "' is not a valid function!");
			}
			return Scene;
		};

		/**
		 * Remove one or more event listener.
		 * @method ScrollMagic.Scene#off
		 *
		 * @example
		 * function callback (event) {
		 * 		console.log("Event fired! (" + event.type + ")");
		 * }
		 * // add listeners
		 * scene.on("change update", callback);
		 * // remove listeners
		 * scene.off("change update", callback);
		 *
		 * @param {string} names - The name or names of the event that should be removed.
		 * @param {function} [callback] - A specific callback function that should be removed. If none is passed all callbacks to the event listener will be removed.
		 * @returns {Scene} Parent object for chaining.
		 */
		this.off = function (names, callback) {
			if (!names) {
				log(1, "ERROR: Invalid event name supplied.");
				return Scene;
			}
			names = names.trim().split(' ');
			names.forEach(function (fullname, key) {
				var
				nameparts = fullname.split('.'),
					eventname = nameparts[0],
					namespace = nameparts[1] || '',
					removeList = eventname === '*' ? Object.keys(_listeners) : [eventname];
				removeList.forEach(function (remove) {
					var
					list = _listeners[remove] || [],
						i = list.length;
					while (i--) {
						var listener = list[i];
						if (listener && (namespace === listener.namespace || namespace === '*') && (!callback || callback == listener.callback)) {
							list.splice(i, 1);
						}
					}
					if (!list.length) {
						delete _listeners[remove];
					}
				});
			});
			return Scene;
		};

		/**
		 * Trigger an event.
		 * @method ScrollMagic.Scene#trigger
		 *
		 * @example
		 * this.trigger("change");
		 *
		 * @param {string} name - The name of the event that should be triggered.
		 * @param {object} [vars] - An object containing info that should be passed to the callback.
		 * @returns {Scene} Parent object for chaining.
		 */
		this.trigger = function (name, vars) {
			if (name) {
				var
				nameparts = name.trim().split('.'),
					eventname = nameparts[0],
					namespace = nameparts[1],
					listeners = _listeners[eventname];
				log(3, 'event fired:', eventname, vars ? "->" : '', vars || '');
				if (listeners) {
					listeners.forEach(function (listener, key) {
						if (!namespace || namespace === listener.namespace) {
							listener.callback.call(Scene, new ScrollMagic.Event(eventname, listener.namespace, Scene, vars));
						}
					});
				}
			} else {
				log(1, "ERROR: Invalid event name supplied.");
			}
			return Scene;
		};

		// set event listeners
		Scene.on("change.internal", function (e) {
			if (e.what !== "loglevel" && e.what !== "tweenChanges") { // no need for a scene update scene with these options...
				if (e.what === "triggerElement") {
					updateTriggerElementPosition();
				} else if (e.what === "reverse") { // the only property left that may have an impact on the current scene state. Everything else is handled by the shift event.
					Scene.update();
				}
			}
		}).on("shift.internal", function (e) {
			updateScrollOffset();
			Scene.update(); // update scene to reflect new position
		});

		/**
		 * Send a debug message to the console.
		 * @private
		 * but provided publicly with _log for plugins
		 *
		 * @param {number} loglevel - The loglevel required to initiate output for the message.
		 * @param {...mixed} output - One or more variables that should be passed to the console.
		 */
		var log = this._log = function (loglevel, output) {
			if (_options.loglevel >= loglevel) {
				Array.prototype.splice.call(arguments, 1, 0, "(" + NAMESPACE + ") ->");
				_util.log.apply(window, arguments);
			}
		};

		/**
		 * Add the scene to a controller.  
		 * This is the equivalent to `Controller.addScene(scene)`.
		 * @method ScrollMagic.Scene#addTo
		 *
		 * @example
		 * // add a scene to a ScrollMagic Controller
		 * scene.addTo(controller);
		 *
		 * @param {ScrollMagic.Controller} controller - The controller to which the scene should be added.
		 * @returns {Scene} Parent object for chaining.
		 */
		this.addTo = function (controller) {
			if (!(controller instanceof ScrollMagic.Controller)) {
				log(1, "ERROR: supplied argument of 'addTo()' is not a valid ScrollMagic Controller");
			} else if (_controller != controller) {
				// new controller
				if (_controller) { // was associated to a different controller before, so remove it...
					_controller.removeScene(Scene);
				}
				_controller = controller;
				validateOption();
				updateDuration(true);
				updateTriggerElementPosition(true);
				updateScrollOffset();
				_controller.info("container").addEventListener('resize', onContainerResize);
				controller.addScene(Scene);
				Scene.trigger("add", {
					controller: _controller
				});
				log(3, "added " + NAMESPACE + " to controller");
				Scene.update();
			}
			return Scene;
		};

		/**
		 * **Get** or **Set** the current enabled state of the scene.  
		 * This can be used to disable this scene without removing or destroying it.
		 * @method ScrollMagic.Scene#enabled
		 *
		 * @example
		 * // get the current value
		 * var enabled = scene.enabled();
		 *
		 * // disable the scene
		 * scene.enabled(false);
		 *
		 * @param {boolean} [newState] - The new enabled state of the scene `true` or `false`.
		 * @returns {(boolean|Scene)} Current enabled state or parent object for chaining.
		 */
		this.enabled = function (newState) {
			if (!arguments.length) { // get
				return _enabled;
			} else if (_enabled != newState) { // set
				_enabled = !! newState;
				Scene.update(true);
			}
			return Scene;
		};

		/**
		 * Remove the scene from the controller.  
		 * This is the equivalent to `Controller.removeScene(scene)`.
		 * The scene will not be updated anymore until you readd it to a controller.
		 * To remove the pin or the tween you need to call removeTween() or removePin() respectively.
		 * @method ScrollMagic.Scene#remove
		 * @example
		 * // remove the scene from its controller
		 * scene.remove();
		 *
		 * @returns {Scene} Parent object for chaining.
		 */
		this.remove = function () {
			if (_controller) {
				_controller.info("container").removeEventListener('resize', onContainerResize);
				var tmpParent = _controller;
				_controller = undefined;
				tmpParent.removeScene(Scene);
				Scene.trigger("remove");
				log(3, "removed " + NAMESPACE + " from controller");
			}
			return Scene;
		};

		/**
		 * Destroy the scene and everything.
		 * @method ScrollMagic.Scene#destroy
		 * @example
		 * // destroy the scene without resetting the pin and tween to their initial positions
		 * scene = scene.destroy();
		 *
		 * // destroy the scene and reset the pin and tween
		 * scene = scene.destroy(true);
		 *
		 * @param {boolean} [reset=false] - If `true` the pin and tween (if existent) will be reset.
		 * @returns {null} Null to unset handler variables.
		 */
		this.destroy = function (reset) {
			Scene.trigger("destroy", {
				reset: reset
			});
			Scene.remove();
			Scene.off("*.*");
			log(3, "destroyed " + NAMESPACE + " (reset: " + (reset ? "true" : "false") + ")");
			return null;
		};


		/**
		 * Updates the Scene to reflect the current state.  
		 * This is the equivalent to `Controller.updateScene(scene, immediately)`.  
		 * The update method calculates the scene's start and end position (based on the trigger element, trigger hook, duration and offset) and checks it against the current scroll position of the container.  
		 * It then updates the current scene state accordingly (or does nothing, if the state is already correct) – Pins will be set to their correct position and tweens will be updated to their correct progress.
		 * This means an update doesn't necessarily result in a progress change. The `progress` event will be fired if the progress has indeed changed between this update and the last.  
		 * _**NOTE:** This method gets called constantly whenever ScrollMagic detects a change. The only application for you is if you change something outside of the realm of ScrollMagic, like moving the trigger or changing tween parameters._
		 * @method ScrollMagic.Scene#update
		 * @example
		 * // update the scene on next tick
		 * scene.update();
		 *
		 * // update the scene immediately
		 * scene.update(true);
		 *
		 * @fires Scene.update
		 *
		 * @param {boolean} [immediately=false] - If `true` the update will be instant, if `false` it will wait until next update cycle (better performance).
		 * @returns {Scene} Parent object for chaining.
		 */
		this.update = function (immediately) {
			if (_controller) {
				if (immediately) {
					if (_controller.enabled() && _enabled) {
						var
						scrollPos = _controller.info("scrollPos"),
							newProgress;

						if (_options.duration > 0) {
							newProgress = (scrollPos - _scrollOffset.start) / (_scrollOffset.end - _scrollOffset.start);
						} else {
							newProgress = scrollPos >= _scrollOffset.start ? 1 : 0;
						}

						Scene.trigger("update", {
							startPos: _scrollOffset.start,
							endPos: _scrollOffset.end,
							scrollPos: scrollPos
						});

						Scene.progress(newProgress);
					} else if (_pin && _state === SCENE_STATE_DURING) {
						updatePinState(true); // unpin in position
					}
				} else {
					_controller.updateScene(Scene, false);
				}
			}
			return Scene;
		};

		/**
		 * Updates dynamic scene variables like the trigger element position or the duration.
		 * This method is automatically called in regular intervals from the controller. See {@link ScrollMagic.Controller} option `refreshInterval`.
		 * 
		 * You can call it to minimize lag, for example when you intentionally change the position of the triggerElement.
		 * If you don't it will simply be updated in the next refresh interval of the container, which is usually sufficient.
		 *
		 * @method ScrollMagic.Scene#refresh
		 * @since 1.1.0
		 * @example
		 * scene = new ScrollMagic.Scene({triggerElement: "#trigger"});
		 * 
		 * // change the position of the trigger
		 * $("#trigger").css("top", 500);
		 * // immediately let the scene know of this change
		 * scene.refresh();
		 *
		 * @fires {@link Scene.shift}, if the trigger element position or the duration changed
		 * @fires {@link Scene.change}, if the duration changed
		 *
		 * @returns {Scene} Parent object for chaining.
		 */
		this.refresh = function () {
			updateDuration();
			updateTriggerElementPosition();
			// update trigger element position
			return Scene;
		};

		/**
		 * **Get** or **Set** the scene's progress.  
		 * Usually it shouldn't be necessary to use this as a setter, as it is set automatically by scene.update().  
		 * The order in which the events are fired depends on the duration of the scene:
		 *  1. Scenes with `duration == 0`:  
		 *  Scenes that have no duration by definition have no ending. Thus the `end` event will never be fired.  
		 *  When the trigger position of the scene is passed the events are always fired in this order:  
		 *  `enter`, `start`, `progress` when scrolling forward  
		 *  and  
		 *  `progress`, `start`, `leave` when scrolling in reverse
		 *  2. Scenes with `duration > 0`:  
		 *  Scenes with a set duration have a defined start and end point.  
		 *  When scrolling past the start position of the scene it will fire these events in this order:  
		 *  `enter`, `start`, `progress`  
		 *  When continuing to scroll and passing the end point it will fire these events:  
		 *  `progress`, `end`, `leave`  
		 *  When reversing through the end point these events are fired:  
		 *  `enter`, `end`, `progress`  
		 *  And when continuing to scroll past the start position in reverse it will fire:  
		 *  `progress`, `start`, `leave`  
		 *  In between start and end the `progress` event will be called constantly, whenever the progress changes.
		 * 
		 * In short:  
		 * `enter` events will always trigger **before** the progress update and `leave` envents will trigger **after** the progress update.  
		 * `start` and `end` will always trigger at their respective position.
		 * 
		 * Please review the event descriptions for details on the events and the event object that is passed to the callback.
		 * 
		 * @method ScrollMagic.Scene#progress
		 * @example
		 * // get the current scene progress
		 * var progress = scene.progress();
		 *
		 * // set new scene progress
		 * scene.progress(0.3);
		 *
		 * @fires {@link Scene.enter}, when used as setter
		 * @fires {@link Scene.start}, when used as setter
		 * @fires {@link Scene.progress}, when used as setter
		 * @fires {@link Scene.end}, when used as setter
		 * @fires {@link Scene.leave}, when used as setter
		 *
		 * @param {number} [progress] - The new progress value of the scene `[0-1]`.
		 * @returns {number} `get` -  Current scene progress.
		 * @returns {Scene} `set` -  Parent object for chaining.
		 */
		this.progress = function (progress) {
			if (!arguments.length) { // get
				return _progress;
			} else { // set
				var
				doUpdate = false,
					oldState = _state,
					scrollDirection = _controller ? _controller.info("scrollDirection") : 'PAUSED',
					reverseOrForward = _options.reverse || progress >= _progress;
				if (_options.duration === 0) {
					// zero duration scenes
					doUpdate = _progress != progress;
					_progress = progress < 1 && reverseOrForward ? 0 : 1;
					_state = _progress === 0 ? SCENE_STATE_BEFORE : SCENE_STATE_DURING;
				} else {
					// scenes with start and end
					if (progress < 0 && _state !== SCENE_STATE_BEFORE && reverseOrForward) {
						// go back to initial state
						_progress = 0;
						_state = SCENE_STATE_BEFORE;
						doUpdate = true;
					} else if (progress >= 0 && progress < 1 && reverseOrForward) {
						_progress = progress;
						_state = SCENE_STATE_DURING;
						doUpdate = true;
					} else if (progress >= 1 && _state !== SCENE_STATE_AFTER) {
						_progress = 1;
						_state = SCENE_STATE_AFTER;
						doUpdate = true;
					} else if (_state === SCENE_STATE_DURING && !reverseOrForward) {
						updatePinState(); // in case we scrolled backwards mid-scene and reverse is disabled => update the pin position, so it doesn't move back as well.
					}
				}
				if (doUpdate) {
					// fire events
					var
					eventVars = {
						progress: _progress,
						state: _state,
						scrollDirection: scrollDirection
					},
						stateChanged = _state != oldState;

					var trigger = function (eventName) { // tmp helper to simplify code
						Scene.trigger(eventName, eventVars);
					};

					if (stateChanged) { // enter events
						if (oldState !== SCENE_STATE_DURING) {
							trigger("enter");
							trigger(oldState === SCENE_STATE_BEFORE ? "start" : "end");
						}
					}
					trigger("progress");
					if (stateChanged) { // leave events
						if (_state !== SCENE_STATE_DURING) {
							trigger(_state === SCENE_STATE_BEFORE ? "start" : "end");
							trigger("leave");
						}
					}
				}

				return Scene;
			}
		};


		/**
		 * Update the start and end scrollOffset of the container.
		 * The positions reflect what the controller's scroll position will be at the start and end respectively.
		 * Is called, when:
		 *   - Scene event "change" is called with: offset, triggerHook, duration 
		 *   - scroll container event "resize" is called
		 *   - the position of the triggerElement changes
		 *   - the controller changes -> addTo()
		 * @private
		 */
		var updateScrollOffset = function () {
			_scrollOffset = {
				start: _triggerPos + _options.offset
			};
			if (_controller && _options.triggerElement) {
				// take away triggerHook portion to get relative to top
				_scrollOffset.start -= _controller.info("size") * _options.triggerHook;
			}
			_scrollOffset.end = _scrollOffset.start + _options.duration;
		};

		/**
		 * Updates the duration if set to a dynamic function.
		 * This method is called when the scene is added to a controller and in regular intervals from the controller through scene.refresh().
		 * 
		 * @fires {@link Scene.change}, if the duration changed
		 * @fires {@link Scene.shift}, if the duration changed
		 *
		 * @param {boolean} [suppressEvents=false] - If true the shift event will be suppressed.
		 * @private
		 */
		var updateDuration = function (suppressEvents) {
			// update duration
			if (_durationUpdateMethod) {
				var varname = "duration";
				if (changeOption(varname, _durationUpdateMethod.call(Scene)) && !suppressEvents) { // set
					Scene.trigger("change", {
						what: varname,
						newval: _options[varname]
					});
					Scene.trigger("shift", {
						reason: varname
					});
				}
			}
		};

		/**
		 * Updates the position of the triggerElement, if present.
		 * This method is called ...
		 *  - ... when the triggerElement is changed
		 *  - ... when the scene is added to a (new) controller
		 *  - ... in regular intervals from the controller through scene.refresh().
		 * 
		 * @fires {@link Scene.shift}, if the position changed
		 *
		 * @param {boolean} [suppressEvents=false] - If true the shift event will be suppressed.
		 * @private
		 */
		var updateTriggerElementPosition = function (suppressEvents) {
			var
			elementPos = 0,
				telem = _options.triggerElement;
			if (_controller && telem) {
				var
				controllerInfo = _controller.info(),
					containerOffset = _util.get.offset(controllerInfo.container),
					// container position is needed because element offset is returned in relation to document, not in relation to container.
					param = controllerInfo.vertical ? "top" : "left"; // which param is of interest ?
				// if parent is spacer, use spacer position instead so correct start position is returned for pinned elements.
				while (telem.parentNode.hasAttribute(PIN_SPACER_ATTRIBUTE)) {
					telem = telem.parentNode;
				}

				var elementOffset = _util.get.offset(telem);

				if (!controllerInfo.isDocument) { // container is not the document root, so substract scroll Position to get correct trigger element position relative to scrollcontent
					containerOffset[param] -= _controller.scrollPos();
				}

				elementPos = elementOffset[param] - containerOffset[param];
			}
			var changed = elementPos != _triggerPos;
			_triggerPos = elementPos;
			if (changed && !suppressEvents) {
				Scene.trigger("shift", {
					reason: "triggerElementPosition"
				});
			}
		};

		/**
		 * Trigger a shift event, when the container is resized and the triggerHook is > 1.
		 * @private
		 */
		var onContainerResize = function (e) {
			if (_options.triggerHook > 0) {
				Scene.trigger("shift", {
					reason: "containerResize"
				});
			}
		};

		var _validate = _util.extend(SCENE_OPTIONS.validate, {
			// validation for duration handled internally for reference to private var _durationMethod
			duration: function (val) {
				if (_util.type.String(val) && val.match(/^(\.|\d)*\d+%$/)) {
					// percentage value
					var perc = parseFloat(val) / 100;
					val = function () {
						return _controller ? _controller.info("size") * perc : 0;
					};
				}
				if (_util.type.Function(val)) {
					// function
					_durationUpdateMethod = val;
					try {
						val = parseFloat(_durationUpdateMethod());
					} catch (e) {
						val = -1; // will cause error below
					}
				}
				// val has to be float
				val = parseFloat(val);
				if (!_util.type.Number(val) || val < 0) {
					if (_durationUpdateMethod) {
						_durationUpdateMethod = undefined;
						throw ["Invalid return value of supplied function for option \"duration\":", val];
					} else {
						throw ["Invalid value for option \"duration\":", val];
					}
				}
				return val;
			}
		});

		/**
		 * Checks the validity of a specific or all options and reset to default if neccessary.
		 * @private
		 */
		var validateOption = function (check) {
			check = arguments.length ? [check] : Object.keys(_validate);
			check.forEach(function (optionName, key) {
				var value;
				if (_validate[optionName]) { // there is a validation method for this option
					try { // validate value
						value = _validate[optionName](_options[optionName]);
					} catch (e) { // validation failed -> reset to default
						value = DEFAULT_OPTIONS[optionName];
						var logMSG = _util.type.String(e) ? [e] : e;
						if (_util.type.Array(logMSG)) {
							logMSG[0] = "ERROR: " + logMSG[0];
							logMSG.unshift(1); // loglevel 1 for error msg
							log.apply(this, logMSG);
						} else {
							log(1, "ERROR: Problem executing validation callback for option '" + optionName + "':", e.message);
						}
					} finally {
						_options[optionName] = value;
					}
				}
			});
		};

		/**
		 * Helper used by the setter/getters for scene options
		 * @private
		 */
		var changeOption = function (varname, newval) {
			var
			changed = false,
				oldval = _options[varname];
			if (_options[varname] != newval) {
				_options[varname] = newval;
				validateOption(varname); // resets to default if necessary
				changed = oldval != _options[varname];
			}
			return changed;
		};

		// generate getters/setters for all options
		var addSceneOption = function (optionName) {
			if (!Scene[optionName]) {
				Scene[optionName] = function (newVal) {
					if (!arguments.length) { // get
						return _options[optionName];
					} else {
						if (optionName === "duration") { // new duration is set, so any previously set function must be unset
							_durationUpdateMethod = undefined;
						}
						if (changeOption(optionName, newVal)) { // set
							Scene.trigger("change", {
								what: optionName,
								newval: _options[optionName]
							});
							if (SCENE_OPTIONS.shifts.indexOf(optionName) > -1) {
								Scene.trigger("shift", {
									reason: optionName
								});
							}
						}
					}
					return Scene;
				};
			}
		};

		/**
		 * **Get** or **Set** the duration option value.
		 * As a setter it also accepts a function returning a numeric value.  
		 * This is particularly useful for responsive setups.
		 *
		 * The duration is updated using the supplied function every time `Scene.refresh()` is called, which happens periodically from the controller (see ScrollMagic.Controller option `refreshInterval`).  
		 * _**NOTE:** Be aware that it's an easy way to kill performance, if you supply a function that has high CPU demand.  
		 * Even for size and position calculations it is recommended to use a variable to cache the value. (see example)  
		 * This counts double if you use the same function for multiple scenes._
		 *
		 * @method ScrollMagic.Scene#duration
		 * @example
		 * // get the current duration value
		 * var duration = scene.duration();
		 *
		 * // set a new duration
		 * scene.duration(300);
		 *
		 * // use a function to automatically adjust the duration to the window height.
		 * var durationValueCache;
		 * function getDuration () {
		 *   return durationValueCache;
		 * }
		 * function updateDuration (e) {
		 *   durationValueCache = window.innerHeight;
		 * }
		 * $(window).on("resize", updateDuration); // update the duration when the window size changes
		 * $(window).triggerHandler("resize"); // set to initial value
		 * scene.duration(getDuration); // supply duration method
		 *
		 * @fires {@link Scene.change}, when used as setter
		 * @fires {@link Scene.shift}, when used as setter
		 * @param {(number|function)} [newDuration] - The new duration of the scene.
		 * @returns {number} `get` -  Current scene duration.
		 * @returns {Scene} `set` -  Parent object for chaining.
		 */

		/**
		 * **Get** or **Set** the offset option value.
		 * @method ScrollMagic.Scene#offset
		 * @example
		 * // get the current offset
		 * var offset = scene.offset();
		 *
		 * // set a new offset
		 * scene.offset(100);
		 *
		 * @fires {@link Scene.change}, when used as setter
		 * @fires {@link Scene.shift}, when used as setter
		 * @param {number} [newOffset] - The new offset of the scene.
		 * @returns {number} `get` -  Current scene offset.
		 * @returns {Scene} `set` -  Parent object for chaining.
		 */

		/**
		 * **Get** or **Set** the triggerElement option value.
		 * Does **not** fire `Scene.shift`, because changing the trigger Element doesn't necessarily mean the start position changes. This will be determined in `Scene.refresh()`, which is automatically triggered.
		 * @method ScrollMagic.Scene#triggerElement
		 * @example
		 * // get the current triggerElement
		 * var triggerElement = scene.triggerElement();
		 *
		 * // set a new triggerElement using a selector
		 * scene.triggerElement("#trigger");
		 * // set a new triggerElement using a DOM object
		 * scene.triggerElement(document.getElementById("trigger"));
		 *
		 * @fires {@link Scene.change}, when used as setter
		 * @param {(string|object)} [newTriggerElement] - The new trigger element for the scene.
		 * @returns {(string|object)} `get` -  Current triggerElement.
		 * @returns {Scene} `set` -  Parent object for chaining.
		 */

		/**
		 * **Get** or **Set** the triggerHook option value.
		 * @method ScrollMagic.Scene#triggerHook
		 * @example
		 * // get the current triggerHook value
		 * var triggerHook = scene.triggerHook();
		 *
		 * // set a new triggerHook using a string
		 * scene.triggerHook("onLeave");
		 * // set a new triggerHook using a number
		 * scene.triggerHook(0.7);
		 *
		 * @fires {@link Scene.change}, when used as setter
		 * @fires {@link Scene.shift}, when used as setter
		 * @param {(number|string)} [newTriggerHook] - The new triggerHook of the scene. See {@link Scene} parameter description for value options.
		 * @returns {number} `get` -  Current triggerHook (ALWAYS numerical).
		 * @returns {Scene} `set` -  Parent object for chaining.
		 */

		/**
		 * **Get** or **Set** the reverse option value.
		 * @method ScrollMagic.Scene#reverse
		 * @example
		 * // get the current reverse option
		 * var reverse = scene.reverse();
		 *
		 * // set new reverse option
		 * scene.reverse(false);
		 *
		 * @fires {@link Scene.change}, when used as setter
		 * @param {boolean} [newReverse] - The new reverse setting of the scene.
		 * @returns {boolean} `get` -  Current reverse option value.
		 * @returns {Scene} `set` -  Parent object for chaining.
		 */

		/**
		 * **Get** or **Set** the loglevel option value.
		 * @method ScrollMagic.Scene#loglevel
		 * @example
		 * // get the current loglevel
		 * var loglevel = scene.loglevel();
		 *
		 * // set new loglevel
		 * scene.loglevel(3);
		 *
		 * @fires {@link Scene.change}, when used as setter
		 * @param {number} [newLoglevel] - The new loglevel setting of the scene. `[0-3]`
		 * @returns {number} `get` -  Current loglevel.
		 * @returns {Scene} `set` -  Parent object for chaining.
		 */

		/**
		 * **Get** the associated controller.
		 * @method ScrollMagic.Scene#controller
		 * @example
		 * // get the controller of a scene
		 * var controller = scene.controller();
		 *
		 * @returns {ScrollMagic.Controller} Parent controller or `undefined`
		 */
		this.controller = function () {
			return _controller;
		};

		/**
		 * **Get** the current state.
		 * @method ScrollMagic.Scene#state
		 * @example
		 * // get the current state
		 * var state = scene.state();
		 *
		 * @returns {string} `"BEFORE"`, `"DURING"` or `"AFTER"`
		 */
		this.state = function () {
			return _state;
		};

		/**
		 * **Get** the current scroll offset for the start of the scene.  
		 * Mind, that the scrollOffset is related to the size of the container, if `triggerHook` is bigger than `0` (or `"onLeave"`).  
		 * This means, that resizing the container or changing the `triggerHook` will influence the scene's start offset.
		 * @method ScrollMagic.Scene#scrollOffset
		 * @example
		 * // get the current scroll offset for the start and end of the scene.
		 * var start = scene.scrollOffset();
		 * var end = scene.scrollOffset() + scene.duration();
		 * console.log("the scene starts at", start, "and ends at", end);
		 *
		 * @returns {number} The scroll offset (of the container) at which the scene will trigger. Y value for vertical and X value for horizontal scrolls.
		 */
		this.scrollOffset = function () {
			return _scrollOffset.start;
		};

		/**
		 * **Get** the trigger position of the scene (including the value of the `offset` option).  
		 * @method ScrollMagic.Scene#triggerPosition
		 * @example
		 * // get the scene's trigger position
		 * var triggerPosition = scene.triggerPosition();
		 *
		 * @returns {number} Start position of the scene. Top position value for vertical and left position value for horizontal scrolls.
		 */
		this.triggerPosition = function () {
			var pos = _options.offset; // the offset is the basis
			if (_controller) {
				// get the trigger position
				if (_options.triggerElement) {
					// Element as trigger
					pos += _triggerPos;
				} else {
					// return the height of the triggerHook to start at the beginning
					pos += _controller.info("size") * Scene.triggerHook();
				}
			}
			return pos;
		};

		var
		_pin, _pinOptions;

		Scene.on("shift.internal", function (e) {
			var durationChanged = e.reason === "duration";
			if ((_state === SCENE_STATE_AFTER && durationChanged) || (_state === SCENE_STATE_DURING && _options.duration === 0)) {
				// if [duration changed after a scene (inside scene progress updates pin position)] or [duration is 0, we are in pin phase and some other value changed].
				updatePinState();
			}
			if (durationChanged) {
				updatePinDimensions();
			}
		}).on("progress.internal", function (e) {
			updatePinState();
		}).on("add.internal", function (e) {
			updatePinDimensions();
		}).on("destroy.internal", function (e) {
			Scene.removePin(e.reset);
		});
		/**
		 * Update the pin state.
		 * @private
		 */
		var updatePinState = function (forceUnpin) {
			if (_pin && _controller) {
				var
				containerInfo = _controller.info(),
					pinTarget = _pinOptions.spacer.firstChild; // may be pin element or another spacer, if cascading pins
				if (!forceUnpin && _state === SCENE_STATE_DURING) { // during scene or if duration is 0 and we are past the trigger
					// pinned state
					if (_util.css(pinTarget, "position") != "fixed") {
						// change state before updating pin spacer (position changes due to fixed collapsing might occur.)
						_util.css(pinTarget, {
							"position": "fixed"
						});
						// update pin spacer
						updatePinDimensions();
					}

					var
					fixedPos = _util.get.offset(_pinOptions.spacer, true),
						// get viewport position of spacer
						scrollDistance = _options.reverse || _options.duration === 0 ? containerInfo.scrollPos - _scrollOffset.start // quicker
						: Math.round(_progress * _options.duration * 10) / 10; // if no reverse and during pin the position needs to be recalculated using the progress
					// add scrollDistance
					fixedPos[containerInfo.vertical ? "top" : "left"] += scrollDistance;

					// set new values
					_util.css(_pinOptions.spacer.firstChild, {
						top: fixedPos.top,
						left: fixedPos.left
					});
				} else {
					// unpinned state
					var
					newCSS = {
						position: _pinOptions.inFlow ? "relative" : "absolute",
						top: 0,
						left: 0
					},
						change = _util.css(pinTarget, "position") != newCSS.position;

					if (!_pinOptions.pushFollowers) {
						newCSS[containerInfo.vertical ? "top" : "left"] = _options.duration * _progress;
					} else if (_options.duration > 0) { // only concerns scenes with duration
						if (_state === SCENE_STATE_AFTER && parseFloat(_util.css(_pinOptions.spacer, "padding-top")) === 0) {
							change = true; // if in after state but havent updated spacer yet (jumped past pin)
						} else if (_state === SCENE_STATE_BEFORE && parseFloat(_util.css(_pinOptions.spacer, "padding-bottom")) === 0) { // before
							change = true; // jumped past fixed state upward direction
						}
					}
					// set new values
					_util.css(pinTarget, newCSS);
					if (change) {
						// update pin spacer if state changed
						updatePinDimensions();
					}
				}
			}
		};

		/**
		 * Update the pin spacer and/or element size.
		 * The size of the spacer needs to be updated whenever the duration of the scene changes, if it is to push down following elements.
		 * @private
		 */
		var updatePinDimensions = function () {
			if (_pin && _controller && _pinOptions.inFlow) { // no spacerresize, if original position is absolute
				var
				after = (_state === SCENE_STATE_AFTER),
					before = (_state === SCENE_STATE_BEFORE),
					during = (_state === SCENE_STATE_DURING),
					vertical = _controller.info("vertical"),
					pinTarget = _pinOptions.spacer.firstChild,
					// usually the pined element but can also be another spacer (cascaded pins)
					marginCollapse = _util.isMarginCollapseType(_util.css(_pinOptions.spacer, "display")),
					css = {};

				// set new size
				// if relsize: spacer -> pin | else: pin -> spacer
				if (_pinOptions.relSize.width || _pinOptions.relSize.autoFullWidth) {
					if (during) {
						_util.css(_pin, {
							"width": _util.get.width(_pinOptions.spacer)
						});
					} else {
						_util.css(_pin, {
							"width": "100%"
						});
					}
				} else {
					// minwidth is needed for cascaded pins.
					css["min-width"] = _util.get.width(vertical ? _pin : pinTarget, true, true);
					css.width = during ? css["min-width"] : "auto";
				}
				if (_pinOptions.relSize.height) {
					if (during) {
						// the only padding the spacer should ever include is the duration (if pushFollowers = true), so we need to substract that.
						_util.css(_pin, {
							"height": _util.get.height(_pinOptions.spacer) - (_pinOptions.pushFollowers ? _options.duration : 0)
						});
					} else {
						_util.css(_pin, {
							"height": "100%"
						});
					}
				} else {
					// margin is only included if it's a cascaded pin to resolve an IE9 bug
					css["min-height"] = _util.get.height(vertical ? pinTarget : _pin, true, !marginCollapse); // needed for cascading pins
					css.height = during ? css["min-height"] : "auto";
				}

				// add space for duration if pushFollowers is true
				if (_pinOptions.pushFollowers) {
					css["padding" + (vertical ? "Top" : "Left")] = _options.duration * _progress;
					css["padding" + (vertical ? "Bottom" : "Right")] = _options.duration * (1 - _progress);
				}
				_util.css(_pinOptions.spacer, css);
			}
		};

		/**
		 * Updates the Pin state (in certain scenarios)
		 * If the controller container is not the document and we are mid-pin-phase scrolling or resizing the main document can result to wrong pin positions.
		 * So this function is called on resize and scroll of the document.
		 * @private
		 */
		var updatePinInContainer = function () {
			if (_controller && _pin && _state === SCENE_STATE_DURING && !_controller.info("isDocument")) {
				updatePinState();
			}
		};

		/**
		 * Updates the Pin spacer size state (in certain scenarios)
		 * If container is resized during pin and relatively sized the size of the pin might need to be updated...
		 * So this function is called on resize of the container.
		 * @private
		 */
		var updateRelativePinSpacer = function () {
			if (_controller && _pin && // well, duh
			_state === SCENE_STATE_DURING && // element in pinned state?
			( // is width or height relatively sized, but not in relation to body? then we need to recalc.
			((_pinOptions.relSize.width || _pinOptions.relSize.autoFullWidth) && _util.get.width(window) != _util.get.width(_pinOptions.spacer.parentNode)) || (_pinOptions.relSize.height && _util.get.height(window) != _util.get.height(_pinOptions.spacer.parentNode)))) {
				updatePinDimensions();
			}
		};

		/**
		 * Is called, when the mousewhel is used while over a pinned element inside a div container.
		 * If the scene is in fixed state scroll events would be counted towards the body. This forwards the event to the scroll container.
		 * @private
		 */
		var onMousewheelOverPin = function (e) {
			if (_controller && _pin && _state === SCENE_STATE_DURING && !_controller.info("isDocument")) { // in pin state
				e.preventDefault();
				_controller._setScrollPos(_controller.info("scrollPos") - ((e.wheelDelta || e[_controller.info("vertical") ? "wheelDeltaY" : "wheelDeltaX"]) / 3 || -e.detail * 30));
			}
		};

		/**
		 * Pin an element for the duration of the tween.  
		 * If the scene duration is 0 the element will only be unpinned, if the user scrolls back past the start position.  
		 * Make sure only one pin is applied to an element at the same time.
		 * An element can be pinned multiple times, but only successively.
		 * _**NOTE:** The option `pushFollowers` has no effect, when the scene duration is 0._
		 * @method ScrollMagic.Scene#setPin
		 * @example
		 * // pin element and push all following elements down by the amount of the pin duration.
		 * scene.setPin("#pin");
		 *
		 * // pin element and keeping all following elements in their place. The pinned element will move past them.
		 * scene.setPin("#pin", {pushFollowers: false});
		 *
		 * @param {(string|object)} element - A Selector targeting an element or a DOM object that is supposed to be pinned.
		 * @param {object} [settings] - settings for the pin
		 * @param {boolean} [settings.pushFollowers=true] - If `true` following elements will be "pushed" down for the duration of the pin, if `false` the pinned element will just scroll past them.  
		 Ignored, when duration is `0`.
		 * @param {string} [settings.spacerClass="scrollmagic-pin-spacer"] - Classname of the pin spacer element, which is used to replace the element.
		 *
		 * @returns {Scene} Parent object for chaining.
		 */
		this.setPin = function (element, settings) {
			var
			defaultSettings = {
				pushFollowers: true,
				spacerClass: "scrollmagic-pin-spacer"
			};
			settings = _util.extend({}, defaultSettings, settings);

			// validate Element
			element = _util.get.elements(element)[0];
			if (!element) {
				log(1, "ERROR calling method 'setPin()': Invalid pin element supplied.");
				return Scene; // cancel
			} else if (_util.css(element, "position") === "fixed") {
				log(1, "ERROR calling method 'setPin()': Pin does not work with elements that are positioned 'fixed'.");
				return Scene; // cancel
			}

			if (_pin) { // preexisting pin?
				if (_pin === element) {
					// same pin we already have -> do nothing
					return Scene; // cancel
				} else {
					// kill old pin
					Scene.removePin();
				}

			}
			_pin = element;

			var
			parentDisplay = _pin.parentNode.style.display,
				boundsParams = ["top", "left", "bottom", "right", "margin", "marginLeft", "marginRight", "marginTop", "marginBottom"];

			_pin.parentNode.style.display = 'none'; // hack start to force css to return stylesheet values instead of calculated px values.
			var
			inFlow = _util.css(_pin, "position") != "absolute",
				pinCSS = _util.css(_pin, boundsParams.concat(["display"])),
				sizeCSS = _util.css(_pin, ["width", "height"]);
			_pin.parentNode.style.display = parentDisplay; // hack end.
			if (!inFlow && settings.pushFollowers) {
				log(2, "WARNING: If the pinned element is positioned absolutely pushFollowers will be disabled.");
				settings.pushFollowers = false;
			}
			window.setTimeout(function () { // wait until all finished, because with responsive duration it will only be set after scene is added to controller
				if (_pin && _options.duration === 0 && settings.pushFollowers) {
					log(2, "WARNING: pushFollowers =", true, "has no effect, when scene duration is 0.");
				}
			}, 0);

			// create spacer and insert
			var
			spacer = _pin.parentNode.insertBefore(document.createElement('div'), _pin),
				spacerCSS = _util.extend(pinCSS, {
					position: inFlow ? "relative" : "absolute",
					boxSizing: "content-box",
					mozBoxSizing: "content-box",
					webkitBoxSizing: "content-box"
				});

			if (!inFlow) { // copy size if positioned absolutely, to work for bottom/right positioned elements.
				_util.extend(spacerCSS, _util.css(_pin, ["width", "height"]));
			}

			_util.css(spacer, spacerCSS);
			spacer.setAttribute(PIN_SPACER_ATTRIBUTE, "");
			_util.addClass(spacer, settings.spacerClass);

			// set the pin Options
			_pinOptions = {
				spacer: spacer,
				relSize: { // save if size is defined using % values. if so, handle spacer resize differently...
					width: sizeCSS.width.slice(-1) === "%",
					height: sizeCSS.height.slice(-1) === "%",
					autoFullWidth: sizeCSS.width === "auto" && inFlow && _util.isMarginCollapseType(pinCSS.display)
				},
				pushFollowers: settings.pushFollowers,
				inFlow: inFlow,
				// stores if the element takes up space in the document flow
			};

			if (!_pin.___origStyle) {
				_pin.___origStyle = {};
				var
				pinInlineCSS = _pin.style,
					copyStyles = boundsParams.concat(["width", "height", "position", "boxSizing", "mozBoxSizing", "webkitBoxSizing"]);
				copyStyles.forEach(function (val) {
					_pin.___origStyle[val] = pinInlineCSS[val] || "";
				});
			}

			// if relative size, transfer it to spacer and make pin calculate it...
			if (_pinOptions.relSize.width) {
				_util.css(spacer, {
					width: sizeCSS.width
				});
			}
			if (_pinOptions.relSize.height) {
				_util.css(spacer, {
					height: sizeCSS.height
				});
			}

			// now place the pin element inside the spacer	
			spacer.appendChild(_pin);
			// and set new css
			_util.css(_pin, {
				position: inFlow ? "relative" : "absolute",
				margin: "auto",
				top: "auto",
				left: "auto",
				bottom: "auto",
				right: "auto"
			});

			if (_pinOptions.relSize.width || _pinOptions.relSize.autoFullWidth) {
				_util.css(_pin, {
					boxSizing: "border-box",
					mozBoxSizing: "border-box",
					webkitBoxSizing: "border-box"
				});
			}

			// add listener to document to update pin position in case controller is not the document.
			window.addEventListener('scroll', updatePinInContainer);
			window.addEventListener('resize', updatePinInContainer);
			window.addEventListener('resize', updateRelativePinSpacer);
			// add mousewheel listener to catch scrolls over fixed elements
			_pin.addEventListener("mousewheel", onMousewheelOverPin);
			_pin.addEventListener("DOMMouseScroll", onMousewheelOverPin);

			log(3, "added pin");

			// finally update the pin to init
			updatePinState();

			return Scene;
		};

		/**
		 * Remove the pin from the scene.
		 * @method ScrollMagic.Scene#removePin
		 * @example
		 * // remove the pin from the scene without resetting it (the spacer is not removed)
		 * scene.removePin();
		 *
		 * // remove the pin from the scene and reset the pin element to its initial position (spacer is removed)
		 * scene.removePin(true);
		 *
		 * @param {boolean} [reset=false] - If `false` the spacer will not be removed and the element's position will not be reset.
		 * @returns {Scene} Parent object for chaining.
		 */
		this.removePin = function (reset) {
			if (_pin) {
				if (_state === SCENE_STATE_DURING) {
					updatePinState(true); // force unpin at position
				}
				if (reset || !_controller) { // if there's no controller no progress was made anyway...
					var pinTarget = _pinOptions.spacer.firstChild; // usually the pin element, but may be another spacer (cascaded pins)...
					if (pinTarget.hasAttribute(PIN_SPACER_ATTRIBUTE)) { // copy margins to child spacer
						var
						style = _pinOptions.spacer.style,
							values = ["margin", "marginLeft", "marginRight", "marginTop", "marginBottom"];
						margins = {};
						values.forEach(function (val) {
							margins[val] = style[val] || "";
						});
						_util.css(pinTarget, margins);
					}
					_pinOptions.spacer.parentNode.insertBefore(pinTarget, _pinOptions.spacer);
					_pinOptions.spacer.parentNode.removeChild(_pinOptions.spacer);
					if (!_pin.parentNode.hasAttribute(PIN_SPACER_ATTRIBUTE)) { // if it's the last pin for this element -> restore inline styles
						// TODO: only correctly set for first pin (when cascading) - how to fix?
						_util.css(_pin, _pin.___origStyle);
						delete _pin.___origStyle;
					}
				}
				window.removeEventListener('scroll', updatePinInContainer);
				window.removeEventListener('resize', updatePinInContainer);
				window.removeEventListener('resize', updateRelativePinSpacer);
				_pin.removeEventListener("mousewheel", onMousewheelOverPin);
				_pin.removeEventListener("DOMMouseScroll", onMousewheelOverPin);
				_pin = undefined;
				log(3, "removed pin (reset: " + (reset ? "true" : "false") + ")");
			}
			return Scene;
		};


		var
		_cssClasses, _cssClassElems = [];

		Scene.on("destroy.internal", function (e) {
			Scene.removeClassToggle(e.reset);
		});
		/**
		 * Define a css class modification while the scene is active.  
		 * When the scene triggers the classes will be added to the supplied element and removed, when the scene is over.
		 * If the scene duration is 0 the classes will only be removed if the user scrolls back past the start position.
		 * @method ScrollMagic.Scene#setClassToggle
		 * @example
		 * // add the class 'myclass' to the element with the id 'my-elem' for the duration of the scene
		 * scene.setClassToggle("#my-elem", "myclass");
		 *
		 * // add multiple classes to multiple elements defined by the selector '.classChange'
		 * scene.setClassToggle(".classChange", "class1 class2 class3");
		 *
		 * @param {(string|object)} element - A Selector targeting one or more elements or a DOM object that is supposed to be modified.
		 * @param {string} classes - One or more Classnames (separated by space) that should be added to the element during the scene.
		 *
		 * @returns {Scene} Parent object for chaining.
		 */
		this.setClassToggle = function (element, classes) {
			var elems = _util.get.elements(element);
			if (elems.length === 0 || !_util.type.String(classes)) {
				log(1, "ERROR calling method 'setClassToggle()': Invalid " + (elems.length === 0 ? "element" : "classes") + " supplied.");
				return Scene;
			}
			if (_cssClassElems.length > 0) {
				// remove old ones
				Scene.removeClassToggle();
			}
			_cssClasses = classes;
			_cssClassElems = elems;
			Scene.on("enter.internal_class leave.internal_class", function (e) {
				var toggle = e.type === "enter" ? _util.addClass : _util.removeClass;
				_cssClassElems.forEach(function (elem, key) {
					toggle(elem, _cssClasses);
				});
			});
			return Scene;
		};

		/**
		 * Remove the class binding from the scene.
		 * @method ScrollMagic.Scene#removeClassToggle
		 * @example
		 * // remove class binding from the scene without reset
		 * scene.removeClassToggle();
		 *
		 * // remove class binding and remove the changes it caused
		 * scene.removeClassToggle(true);
		 *
		 * @param {boolean} [reset=false] - If `false` and the classes are currently active, they will remain on the element. If `true` they will be removed.
		 * @returns {Scene} Parent object for chaining.
		 */
		this.removeClassToggle = function (reset) {
			if (reset) {
				_cssClassElems.forEach(function (elem, key) {
					_util.removeClass(elem, _cssClasses);
				});
			}
			Scene.off("start.internal_class end.internal_class");
			_cssClasses = undefined;
			_cssClassElems = [];
			return Scene;
		};

		// INIT
		construct();
		return Scene;
	};

	// store pagewide scene options
	var SCENE_OPTIONS = {
		defaults: {
			duration: 0,
			offset: 0,
			triggerElement: undefined,
			triggerHook: 0.5,
			reverse: true,
			loglevel: 2
		},
		validate: {
			offset: function (val) {
				val = parseFloat(val);
				if (!_util.type.Number(val)) {
					throw ["Invalid value for option \"offset\":", val];
				}
				return val;
			},
			triggerElement: function (val) {
				val = val || undefined;
				if (val) {
					var elem = _util.get.elements(val)[0];
					if (elem) {
						val = elem;
					} else {
						throw ["Element defined in option \"triggerElement\" was not found:", val];
					}
				}
				return val;
			},
			triggerHook: function (val) {
				var translate = {
					"onCenter": 0.5,
					"onEnter": 1,
					"onLeave": 0
				};
				if (_util.type.Number(val)) {
					val = Math.max(0, Math.min(parseFloat(val), 1)); //  make sure its betweeen 0 and 1
				} else if (val in translate) {
					val = translate[val];
				} else {
					throw ["Invalid value for option \"triggerHook\": ", val];
				}
				return val;
			},
			reverse: function (val) {
				return !!val; // force boolean
			},
			loglevel: function (val) {
				val = parseInt(val);
				if (!_util.type.Number(val) || val < 0 || val > 3) {
					throw ["Invalid value for option \"loglevel\":", val];
				}
				return val;
			}
		},
		// holder for  validation methods. duration validation is handled in 'getters-setters.js'
		shifts: ["duration", "offset", "triggerHook"],
		// list of options that trigger a `shift` event
	};
/*
 * method used to add an option to ScrollMagic Scenes.
 * TODO: DOC (private for dev)
 */
	ScrollMagic.Scene.addOption = function (name, defaultValue, validationCallback, shifts) {
		if (!(name in SCENE_OPTIONS.defaults)) {
			SCENE_OPTIONS.defaults[name] = defaultValue;
			SCENE_OPTIONS.validate[name] = validationCallback;
			if (shifts) {
				SCENE_OPTIONS.shifts.push(name);
			}
		} else {
			ScrollMagic._util.log(1, "[static] ScrollMagic.Scene -> Cannot add Scene option '" + name + "', because it already exists.");
		}
	};
	// instance extension function for plugins
	// TODO: DOC (private for dev)
	ScrollMagic.Scene.extend = function (extension) {
		var oldClass = this;
		ScrollMagic.Scene = function () {
			oldClass.apply(this, arguments);
			this.$super = _util.extend({}, this); // copy parent state
			return extension.apply(this, arguments) || this;
		};
		_util.extend(ScrollMagic.Scene, oldClass); // copy properties
		ScrollMagic.Scene.prototype = oldClass.prototype; // copy prototype
		ScrollMagic.Scene.prototype.constructor = ScrollMagic.Scene; // restore constructor
	};


	/**
	 * TODO: DOCS (private for dev)
	 * @class
	 * @private
	 */

	ScrollMagic.Event = function (type, namespace, target, vars) {
		vars = vars || {};
		for (var key in vars) {
			this[key] = vars[key];
		}
		this.type = type;
		this.target = this.currentTarget = target;
		this.namespace = namespace || '';
		this.timeStamp = this.timestamp = Date.now();
		return this;
	};

/*
 * TODO: DOCS (private for dev)
 */

	var _util = ScrollMagic._util = (function (window) {
		var U = {},
			i;

		/**
		 * ------------------------------
		 * internal helpers
		 * ------------------------------
		 */

		// parse float and fall back to 0.
		var floatval = function (number) {
			return parseFloat(number) || 0;
		};
		// get current style IE safe (otherwise IE would return calculated values for 'auto')
		var _getComputedStyle = function (elem) {
			return elem.currentStyle ? elem.currentStyle : window.getComputedStyle(elem);
		};

		// get element dimension (width or height)
		var _dimension = function (which, elem, outer, includeMargin) {
			elem = (elem === document) ? window : elem;
			if (elem === window) {
				includeMargin = false;
			} else if (!_type.DomElement(elem)) {
				return 0;
			}
			which = which.charAt(0).toUpperCase() + which.substr(1).toLowerCase();
			var dimension = (outer ? elem['offset' + which] || elem['outer' + which] : elem['client' + which] || elem['inner' + which]) || 0;
			if (outer && includeMargin) {
				var style = _getComputedStyle(elem);
				dimension += which === 'Height' ? floatval(style.marginTop) + floatval(style.marginBottom) : floatval(style.marginLeft) + floatval(style.marginRight);
			}
			return dimension;
		};
		// converts 'margin-top' into 'marginTop'
		var _camelCase = function (str) {
			return str.replace(/^[^a-z]+([a-z])/g, '$1').replace(/-([a-z])/g, function (g) {
				return g[1].toUpperCase();
			});
		};

		/**
		 * ------------------------------
		 * external helpers
		 * ------------------------------
		 */

		// extend obj – same as jQuery.extend({}, objA, objB)
		U.extend = function (obj) {
			obj = obj || {};
			for (i = 1; i < arguments.length; i++) {
				if (!arguments[i]) {
					continue;
				}
				for (var key in arguments[i]) {
					if (arguments[i].hasOwnProperty(key)) {
						obj[key] = arguments[i][key];
					}
				}
			}
			return obj;
		};

		// check if a css display type results in margin-collapse or not
		U.isMarginCollapseType = function (str) {
			return ["block", "flex", "list-item", "table", "-webkit-box"].indexOf(str) > -1;
		};

		// implementation of requestAnimationFrame
		// based on https://gist.github.com/paulirish/1579671
		var
		lastTime = 0,
			vendors = ['ms', 'moz', 'webkit', 'o'];
		var _requestAnimationFrame = window.requestAnimationFrame;
		var _cancelAnimationFrame = window.cancelAnimationFrame;
		// try vendor prefixes if the above doesn't work
		for (i = 0; !_requestAnimationFrame && i < vendors.length; ++i) {
			_requestAnimationFrame = window[vendors[i] + 'RequestAnimationFrame'];
			_cancelAnimationFrame = window[vendors[i] + 'CancelAnimationFrame'] || window[vendors[i] + 'CancelRequestAnimationFrame'];
		}

		// fallbacks
		if (!_requestAnimationFrame) {
			_requestAnimationFrame = function (callback) {
				var
				currTime = new Date().getTime(),
					timeToCall = Math.max(0, 16 - (currTime - lastTime)),
					id = window.setTimeout(function () {
						callback(currTime + timeToCall);
					}, timeToCall);
				lastTime = currTime + timeToCall;
				return id;
			};
		}
		if (!_cancelAnimationFrame) {
			_cancelAnimationFrame = function (id) {
				window.clearTimeout(id);
			};
		}
		U.rAF = _requestAnimationFrame.bind(window);
		U.cAF = _cancelAnimationFrame.bind(window);

		var
		loglevels = ["error", "warn", "log"],
			console = window.console || {};

		console.log = console.log ||
		function () {}; // no console log, well - do nothing then...
		// make sure methods for all levels exist.
		for (i = 0; i < loglevels.length; i++) {
			var method = loglevels[i];
			if (!console[method]) {
				console[method] = console.log; // prefer .log over nothing
			}
		}
		U.log = function (loglevel) {
			if (loglevel > loglevels.length || loglevel <= 0) loglevel = loglevels.length;
			var now = new Date(),
				time = ("0" + now.getHours()).slice(-2) + ":" + ("0" + now.getMinutes()).slice(-2) + ":" + ("0" + now.getSeconds()).slice(-2) + ":" + ("00" + now.getMilliseconds()).slice(-3),
				method = loglevels[loglevel - 1],
				args = Array.prototype.splice.call(arguments, 1),
				func = Function.prototype.bind.call(console[method], console);
			args.unshift(time);
			func.apply(console, args);
		};

		/**
		 * ------------------------------
		 * type testing
		 * ------------------------------
		 */

		var _type = U.type = function (v) {
			return Object.prototype.toString.call(v).replace(/^\[object (.+)\]$/, "$1").toLowerCase();
		};
		_type.String = function (v) {
			return _type(v) === 'string';
		};
		_type.Function = function (v) {
			return _type(v) === 'function';
		};
		_type.Array = function (v) {
			return Array.isArray(v);
		};
		_type.Number = function (v) {
			return !_type.Array(v) && (v - parseFloat(v) + 1) >= 0;
		};
		_type.DomElement = function (o) {
			return (
			typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
			o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName === "string");
		};

		/**
		 * ------------------------------
		 * DOM Element info
		 * ------------------------------
		 */
		// always returns a list of matching DOM elements, from a selector, a DOM element or an list of elements or even an array of selectors
		var _get = U.get = {};
		_get.elements = function (selector) {
			var arr = [];
			if (_type.String(selector)) {
				try {
					selector = document.querySelectorAll(selector);
				} catch (e) { // invalid selector
					return arr;
				}
			}
			if (_type(selector) === 'nodelist' || _type.Array(selector)) {
				for (var i = 0, ref = arr.length = selector.length; i < ref; i++) { // list of elements
					var elem = selector[i];
					arr[i] = _type.DomElement(elem) ? elem : _get.elements(elem); // if not an element, try to resolve recursively
				}
			} else if (_type.DomElement(selector) || selector === document || selector === window) {
				arr = [selector]; // only the element
			}
			return arr;
		};
		// get scroll top value
		_get.scrollTop = function (elem) {
			return (elem && typeof elem.scrollTop === 'number') ? elem.scrollTop : window.pageYOffset || 0;
		};
		// get scroll left value
		_get.scrollLeft = function (elem) {
			return (elem && typeof elem.scrollLeft === 'number') ? elem.scrollLeft : window.pageXOffset || 0;
		};
		// get element height
		_get.width = function (elem, outer, includeMargin) {
			return _dimension('width', elem, outer, includeMargin);
		};
		// get element width
		_get.height = function (elem, outer, includeMargin) {
			return _dimension('height', elem, outer, includeMargin);
		};

		// get element position (optionally relative to viewport)
		_get.offset = function (elem, relativeToViewport) {
			var offset = {
				top: 0,
				left: 0
			};
			if (elem && elem.getBoundingClientRect) { // check if available
				var rect = elem.getBoundingClientRect();
				offset.top = rect.top;
				offset.left = rect.left;
				if (!relativeToViewport) { // clientRect is by default relative to viewport...
					offset.top += _get.scrollTop();
					offset.left += _get.scrollLeft();
				}
			}
			return offset;
		};

		/**
		 * ------------------------------
		 * DOM Element manipulation
		 * ------------------------------
		 */

		U.addClass = function (elem, classname) {
			if (classname) {
				if (elem.classList) elem.classList.add(classname);
				else elem.className += ' ' + classname;
			}
		};
		U.removeClass = function (elem, classname) {
			if (classname) {
				if (elem.classList) elem.classList.remove(classname);
				else elem.className = elem.className.replace(new RegExp('(^|\\b)' + classname.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
			}
		};
		// if options is string -> returns css value
		// if options is array -> returns object with css value pairs
		// if options is object -> set new css values
		U.css = function (elem, options) {
			if (_type.String(options)) {
				return _getComputedStyle(elem)[_camelCase(options)];
			} else if (_type.Array(options)) {
				var
				obj = {},
					style = _getComputedStyle(elem);
				options.forEach(function (option, key) {
					obj[option] = style[_camelCase(option)];
				});
				return obj;
			} else {
				for (var option in options) {
					var val = options[option];
					if (val == parseFloat(val)) { // assume pixel for seemingly numerical values
						val += 'px';
					}
					elem.style[_camelCase(option)] = val;
				}
			}
		};

		return U;
	}(window || {}));

	ScrollMagic.Scene.prototype.addIndicators = function () {
		ScrollMagic._util.log(1, '(ScrollMagic.Scene) -> ERROR calling addIndicators() due to missing Plugin \'debug.addIndicators\'. Please make sure to include plugins/debug.addIndicators.js');
		return this;
	}
	ScrollMagic.Scene.prototype.removeIndicators = function () {
		ScrollMagic._util.log(1, '(ScrollMagic.Scene) -> ERROR calling removeIndicators() due to missing Plugin \'debug.addIndicators\'. Please make sure to include plugins/debug.addIndicators.js');
		return this;
	}
	ScrollMagic.Scene.prototype.setTween = function () {
		ScrollMagic._util.log(1, '(ScrollMagic.Scene) -> ERROR calling setTween() due to missing Plugin \'animation.gsap\'. Please make sure to include plugins/animation.gsap.js');
		return this;
	}
	ScrollMagic.Scene.prototype.removeTween = function () {
		ScrollMagic._util.log(1, '(ScrollMagic.Scene) -> ERROR calling removeTween() due to missing Plugin \'animation.gsap\'. Please make sure to include plugins/animation.gsap.js');
		return this;
	}
	ScrollMagic.Scene.prototype.setVelocity = function () {
		ScrollMagic._util.log(1, '(ScrollMagic.Scene) -> ERROR calling setVelocity() due to missing Plugin \'animation.velocity\'. Please make sure to include plugins/animation.velocity.js');
		return this;
	}
	ScrollMagic.Scene.prototype.removeVelocity = function () {
		ScrollMagic._util.log(1, '(ScrollMagic.Scene) -> ERROR calling removeVelocity() due to missing Plugin \'animation.velocity\'. Please make sure to include plugins/animation.velocity.js');
		return this;
	}

	return ScrollMagic;
}));
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJ2ZW5kb3IvU2Nyb2xsTWFnaWMuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBTY3JvbGxNYWdpYyB2Mi4wLjUgKDIwMTUtMDQtMjkpXG4gKiBUaGUgamF2YXNjcmlwdCBsaWJyYXJ5IGZvciBtYWdpY2FsIHNjcm9sbCBpbnRlcmFjdGlvbnMuXG4gKiAoYykgMjAxNSBKYW4gUGFlcGtlIChAamFucGFlcGtlKVxuICogUHJvamVjdCBXZWJzaXRlOiBodHRwOi8vc2Nyb2xsbWFnaWMuaW9cbiAqIFxuICogQHZlcnNpb24gMi4wLjVcbiAqIEBsaWNlbnNlIER1YWwgbGljZW5zZWQgdW5kZXIgTUlUIGxpY2Vuc2UgYW5kIEdQTC5cbiAqIEBhdXRob3IgSmFuIFBhZXBrZSAtIGUtbWFpbEBqYW5wYWVwa2UuZGVcbiAqXG4gKiBAZmlsZSBTY3JvbGxNYWdpYyBtYWluIGxpYnJhcnkuXG4gKi9cbi8qKlxuICogQG5hbWVzcGFjZSBTY3JvbGxNYWdpY1xuICovXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcblx0aWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuXHRcdC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cblx0XHRkZWZpbmUoZmFjdG9yeSk7XG5cdH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG5cdFx0Ly8gQ29tbW9uSlNcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcblx0fSBlbHNlIHtcblx0XHQvLyBCcm93c2VyIGdsb2JhbFxuXHRcdHJvb3QuU2Nyb2xsTWFnaWMgPSBmYWN0b3J5KCk7XG5cdH1cbn0odGhpcywgZnVuY3Rpb24gKCkge1xuXHRcInVzZSBzdHJpY3RcIjtcblxuXHR2YXIgU2Nyb2xsTWFnaWMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0X3V0aWwubG9nKDIsICcoQ09NUEFUSUJJTElUWSBOT1RJQ0UpIC0+IEFzIG9mIFNjcm9sbE1hZ2ljIDIuMC4wIHlvdSBuZWVkIHRvIHVzZSBcXCduZXcgU2Nyb2xsTWFnaWMuQ29udHJvbGxlcigpXFwnIHRvIGNyZWF0ZSBhIG5ldyBjb250cm9sbGVyIGluc3RhbmNlLiBVc2UgXFwnbmV3IFNjcm9sbE1hZ2ljLlNjZW5lKClcXCcgdG8gaW5zdGFuY2UgYSBzY2VuZS4nKTtcblx0fTtcblxuXHRTY3JvbGxNYWdpYy52ZXJzaW9uID0gXCIyLjAuNVwiO1xuXG5cdC8vIFRPRE86IHRlbXBvcmFyeSB3b3JrYXJvdW5kIGZvciBjaHJvbWUncyBzY3JvbGwgaml0dGVyIGJ1Z1xuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNld2hlZWxcIiwgZnVuY3Rpb24gKCkge30pO1xuXG5cdC8vIGdsb2JhbCBjb25zdFxuXHR2YXIgUElOX1NQQUNFUl9BVFRSSUJVVEUgPSBcImRhdGEtc2Nyb2xsbWFnaWMtcGluLXNwYWNlclwiO1xuXG5cdC8qKlxuXHQgKiBUaGUgbWFpbiBjbGFzcyB0aGF0IGlzIG5lZWRlZCBvbmNlIHBlciBzY3JvbGwgY29udGFpbmVyLlxuXHQgKlxuXHQgKiBAY2xhc3Ncblx0ICpcblx0ICogQGV4YW1wbGVcblx0ICogLy8gYmFzaWMgaW5pdGlhbGl6YXRpb25cblx0ICogdmFyIGNvbnRyb2xsZXIgPSBuZXcgU2Nyb2xsTWFnaWMuQ29udHJvbGxlcigpO1xuXHQgKlxuXHQgKiAvLyBwYXNzaW5nIG9wdGlvbnNcblx0ICogdmFyIGNvbnRyb2xsZXIgPSBuZXcgU2Nyb2xsTWFnaWMuQ29udHJvbGxlcih7Y29udGFpbmVyOiBcIiNteUNvbnRhaW5lclwiLCBsb2dsZXZlbDogM30pO1xuXHQgKlxuXHQgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdIC0gQW4gb2JqZWN0IGNvbnRhaW5pbmcgb25lIG9yIG1vcmUgb3B0aW9ucyBmb3IgdGhlIGNvbnRyb2xsZXIuXG5cdCAqIEBwYXJhbSB7KHN0cmluZ3xvYmplY3QpfSBbb3B0aW9ucy5jb250YWluZXI9d2luZG93XSAtIEEgc2VsZWN0b3IsIERPTSBvYmplY3QgdGhhdCByZWZlcmVuY2VzIHRoZSBtYWluIGNvbnRhaW5lciBmb3Igc2Nyb2xsaW5nLlxuXHQgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnZlcnRpY2FsPXRydWVdIC0gU2V0cyB0aGUgc2Nyb2xsIG1vZGUgdG8gdmVydGljYWwgKGB0cnVlYCkgb3IgaG9yaXpvbnRhbCAoYGZhbHNlYCkgc2Nyb2xsaW5nLlxuXHQgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnMuZ2xvYmFsU2NlbmVPcHRpb25zPXt9XSAtIFRoZXNlIG9wdGlvbnMgd2lsbCBiZSBwYXNzZWQgdG8gZXZlcnkgU2NlbmUgdGhhdCBpcyBhZGRlZCB0byB0aGUgY29udHJvbGxlciB1c2luZyB0aGUgYWRkU2NlbmUgbWV0aG9kLiBGb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiBTY2VuZSBvcHRpb25zIHNlZSB7QGxpbmsgU2Nyb2xsTWFnaWMuU2NlbmV9LlxuXHQgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMubG9nbGV2ZWw9Ml0gTG9nbGV2ZWwgZm9yIGRlYnVnZ2luZy4gTm90ZSB0aGF0IGxvZ2dpbmcgaXMgZGlzYWJsZWQgaW4gdGhlIG1pbmlmaWVkIHZlcnNpb24gb2YgU2Nyb2xsTWFnaWMuXG5cdCAqKiBgMGAgPT4gc2lsZW50XG5cdCAqKiBgMWAgPT4gZXJyb3JzXG5cdCAqKiBgMmAgPT4gZXJyb3JzLCB3YXJuaW5nc1xuXHQgKiogYDNgID0+IGVycm9ycywgd2FybmluZ3MsIGRlYnVnaW5mb1xuXHQgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnJlZnJlc2hJbnRlcnZhbD0xMDBdIC0gU29tZSBjaGFuZ2VzIGRvbid0IGNhbGwgZXZlbnRzIGJ5IGRlZmF1bHQsIGxpa2UgY2hhbmdpbmcgdGhlIGNvbnRhaW5lciBzaXplIG9yIG1vdmluZyBhIHNjZW5lIHRyaWdnZXIgZWxlbWVudC4gIFxuXHQgVGhpcyBpbnRlcnZhbCBwb2xscyB0aGVzZSBwYXJhbWV0ZXJzIHRvIGZpcmUgdGhlIG5lY2Vzc2FyeSBldmVudHMuICBcblx0IElmIHlvdSBkb24ndCB1c2UgY3VzdG9tIGNvbnRhaW5lcnMsIHRyaWdnZXIgZWxlbWVudHMgb3IgaGF2ZSBzdGF0aWMgbGF5b3V0cywgd2hlcmUgdGhlIHBvc2l0aW9ucyBvZiB0aGUgdHJpZ2dlciBlbGVtZW50cyBkb24ndCBjaGFuZ2UsIHlvdSBjYW4gc2V0IHRoaXMgdG8gMCBkaXNhYmxlIGludGVydmFsIGNoZWNraW5nIGFuZCBpbXByb3ZlIHBlcmZvcm1hbmNlLlxuXHQgKlxuXHQgKi9cblx0U2Nyb2xsTWFnaWMuQ29udHJvbGxlciA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4vKlxuXHQgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdCAqIHNldHRpbmdzXG5cdCAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0ICovXG5cdFx0dmFyXG5cdFx0TkFNRVNQQUNFID0gJ1Njcm9sbE1hZ2ljLkNvbnRyb2xsZXInLFxuXHRcdFx0U0NST0xMX0RJUkVDVElPTl9GT1JXQVJEID0gJ0ZPUldBUkQnLFxuXHRcdFx0U0NST0xMX0RJUkVDVElPTl9SRVZFUlNFID0gJ1JFVkVSU0UnLFxuXHRcdFx0U0NST0xMX0RJUkVDVElPTl9QQVVTRUQgPSAnUEFVU0VEJyxcblx0XHRcdERFRkFVTFRfT1BUSU9OUyA9IENPTlRST0xMRVJfT1BUSU9OUy5kZWZhdWx0cztcblxuLypcblx0ICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQgKiBwcml2YXRlIHZhcnNcblx0ICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQgKi9cblx0XHR2YXJcblx0XHRDb250cm9sbGVyID0gdGhpcyxcblx0XHRcdF9vcHRpb25zID0gX3V0aWwuZXh0ZW5kKHt9LCBERUZBVUxUX09QVElPTlMsIG9wdGlvbnMpLFxuXHRcdFx0X3NjZW5lT2JqZWN0cyA9IFtdLFxuXHRcdFx0X3VwZGF0ZVNjZW5lc09uTmV4dEN5Y2xlID0gZmFsc2UsXG5cdFx0XHQvLyBjYW4gYmUgYm9vbGVhbiAodHJ1ZSA9PiBhbGwgc2NlbmVzKSBvciBhbiBhcnJheSBvZiBzY2VuZXMgdG8gYmUgdXBkYXRlZFxuXHRcdFx0X3Njcm9sbFBvcyA9IDAsXG5cdFx0XHRfc2Nyb2xsRGlyZWN0aW9uID0gU0NST0xMX0RJUkVDVElPTl9QQVVTRUQsXG5cdFx0XHRfaXNEb2N1bWVudCA9IHRydWUsXG5cdFx0XHRfdmlld1BvcnRTaXplID0gMCxcblx0XHRcdF9lbmFibGVkID0gdHJ1ZSxcblx0XHRcdF91cGRhdGVUaW1lb3V0LCBfcmVmcmVzaFRpbWVvdXQ7XG5cbi8qXG5cdCAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0ICogcHJpdmF0ZSBmdW5jdGlvbnNcblx0ICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQgKi9cblxuXHRcdC8qKlxuXHRcdCAqIEludGVybmFsIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIG9mIHRoZSBTY3JvbGxNYWdpYyBDb250cm9sbGVyXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHR2YXIgY29uc3RydWN0ID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0Zm9yICh2YXIga2V5IGluIF9vcHRpb25zKSB7XG5cdFx0XHRcdGlmICghREVGQVVMVF9PUFRJT05TLmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdFx0XHRsb2coMiwgXCJXQVJOSU5HOiBVbmtub3duIG9wdGlvbiBcXFwiXCIgKyBrZXkgKyBcIlxcXCJcIik7XG5cdFx0XHRcdFx0ZGVsZXRlIF9vcHRpb25zW2tleV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdF9vcHRpb25zLmNvbnRhaW5lciA9IF91dGlsLmdldC5lbGVtZW50cyhfb3B0aW9ucy5jb250YWluZXIpWzBdO1xuXHRcdFx0Ly8gY2hlY2sgU2Nyb2xsQ29udGFpbmVyXG5cdFx0XHRpZiAoIV9vcHRpb25zLmNvbnRhaW5lcikge1xuXHRcdFx0XHRsb2coMSwgXCJFUlJPUiBjcmVhdGluZyBvYmplY3QgXCIgKyBOQU1FU1BBQ0UgKyBcIjogTm8gdmFsaWQgc2Nyb2xsIGNvbnRhaW5lciBzdXBwbGllZFwiKTtcblx0XHRcdFx0dGhyb3cgTkFNRVNQQUNFICsgXCIgaW5pdCBmYWlsZWQuXCI7IC8vIGNhbmNlbFxuXHRcdFx0fVxuXHRcdFx0X2lzRG9jdW1lbnQgPSBfb3B0aW9ucy5jb250YWluZXIgPT09IHdpbmRvdyB8fCBfb3B0aW9ucy5jb250YWluZXIgPT09IGRvY3VtZW50LmJvZHkgfHwgIWRvY3VtZW50LmJvZHkuY29udGFpbnMoX29wdGlvbnMuY29udGFpbmVyKTtcblx0XHRcdC8vIG5vcm1hbGl6ZSB0byB3aW5kb3dcblx0XHRcdGlmIChfaXNEb2N1bWVudCkge1xuXHRcdFx0XHRfb3B0aW9ucy5jb250YWluZXIgPSB3aW5kb3c7XG5cdFx0XHR9XG5cdFx0XHQvLyB1cGRhdGUgY29udGFpbmVyIHNpemUgaW1tZWRpYXRlbHlcblx0XHRcdF92aWV3UG9ydFNpemUgPSBnZXRWaWV3cG9ydFNpemUoKTtcblx0XHRcdC8vIHNldCBldmVudCBoYW5kbGVyc1xuXHRcdFx0X29wdGlvbnMuY29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgb25DaGFuZ2UpO1xuXHRcdFx0X29wdGlvbnMuY29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIiwgb25DaGFuZ2UpO1xuXG5cdFx0XHRfb3B0aW9ucy5yZWZyZXNoSW50ZXJ2YWwgPSBwYXJzZUludChfb3B0aW9ucy5yZWZyZXNoSW50ZXJ2YWwpIHx8IERFRkFVTFRfT1BUSU9OUy5yZWZyZXNoSW50ZXJ2YWw7XG5cdFx0XHRzY2hlZHVsZVJlZnJlc2goKTtcblxuXHRcdFx0bG9nKDMsIFwiYWRkZWQgbmV3IFwiICsgTkFNRVNQQUNFICsgXCIgY29udHJvbGxlciAodlwiICsgU2Nyb2xsTWFnaWMudmVyc2lvbiArIFwiKVwiKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogU2NoZWR1bGUgdGhlIG5leHQgZXhlY3V0aW9uIG9mIHRoZSByZWZyZXNoIGZ1bmN0aW9uXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHR2YXIgc2NoZWR1bGVSZWZyZXNoID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKF9vcHRpb25zLnJlZnJlc2hJbnRlcnZhbCA+IDApIHtcblx0XHRcdFx0X3JlZnJlc2hUaW1lb3V0ID0gd2luZG93LnNldFRpbWVvdXQocmVmcmVzaCwgX29wdGlvbnMucmVmcmVzaEludGVydmFsKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogRGVmYXVsdCBmdW5jdGlvbiB0byBnZXQgc2Nyb2xsIHBvcyAtIG92ZXJ3cml0ZWFibGUgdXNpbmcgYENvbnRyb2xsZXIuc2Nyb2xsUG9zKG5ld0Z1bmN0aW9uKWBcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdHZhciBnZXRTY3JvbGxQb3MgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4gX29wdGlvbnMudmVydGljYWwgPyBfdXRpbC5nZXQuc2Nyb2xsVG9wKF9vcHRpb25zLmNvbnRhaW5lcikgOiBfdXRpbC5nZXQuc2Nyb2xsTGVmdChfb3B0aW9ucy5jb250YWluZXIpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBSZXR1cm5zIHRoZSBjdXJyZW50IHZpZXdwb3J0IFNpemUgKHdpZHRoIHZvciBob3Jpem9udGFsLCBoZWlnaHQgZm9yIHZlcnRpY2FsKVxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0dmFyIGdldFZpZXdwb3J0U2l6ZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdHJldHVybiBfb3B0aW9ucy52ZXJ0aWNhbCA/IF91dGlsLmdldC5oZWlnaHQoX29wdGlvbnMuY29udGFpbmVyKSA6IF91dGlsLmdldC53aWR0aChfb3B0aW9ucy5jb250YWluZXIpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBEZWZhdWx0IGZ1bmN0aW9uIHRvIHNldCBzY3JvbGwgcG9zIC0gb3ZlcndyaXRlYWJsZSB1c2luZyBgQ29udHJvbGxlci5zY3JvbGxUbyhuZXdGdW5jdGlvbilgXG5cdFx0ICogTWFrZSBhdmFpbGFibGUgcHVibGljbHkgZm9yIHBpbm5lZCBtb3VzZXdoZWVsIHdvcmthcm91bmQuXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHR2YXIgc2V0U2Nyb2xsUG9zID0gdGhpcy5fc2V0U2Nyb2xsUG9zID0gZnVuY3Rpb24gKHBvcykge1xuXHRcdFx0aWYgKF9vcHRpb25zLnZlcnRpY2FsKSB7XG5cdFx0XHRcdGlmIChfaXNEb2N1bWVudCkge1xuXHRcdFx0XHRcdHdpbmRvdy5zY3JvbGxUbyhfdXRpbC5nZXQuc2Nyb2xsTGVmdCgpLCBwb3MpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdF9vcHRpb25zLmNvbnRhaW5lci5zY3JvbGxUb3AgPSBwb3M7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmIChfaXNEb2N1bWVudCkge1xuXHRcdFx0XHRcdHdpbmRvdy5zY3JvbGxUbyhwb3MsIF91dGlsLmdldC5zY3JvbGxUb3AoKSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0X29wdGlvbnMuY29udGFpbmVyLnNjcm9sbExlZnQgPSBwb3M7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogSGFuZGxlIHVwZGF0ZXMgaW4gY3ljbGVzIGluc3RlYWQgb2Ygb24gc2Nyb2xsIChwZXJmb3JtYW5jZSlcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdHZhciB1cGRhdGVTY2VuZXMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoX2VuYWJsZWQgJiYgX3VwZGF0ZVNjZW5lc09uTmV4dEN5Y2xlKSB7XG5cdFx0XHRcdC8vIGRldGVybWluZSBzY2VuZXMgdG8gdXBkYXRlXG5cdFx0XHRcdHZhciBzY2VuZXNUb1VwZGF0ZSA9IF91dGlsLnR5cGUuQXJyYXkoX3VwZGF0ZVNjZW5lc09uTmV4dEN5Y2xlKSA/IF91cGRhdGVTY2VuZXNPbk5leHRDeWNsZSA6IF9zY2VuZU9iamVjdHMuc2xpY2UoMCk7XG5cdFx0XHRcdC8vIHJlc2V0IHNjZW5lc1xuXHRcdFx0XHRfdXBkYXRlU2NlbmVzT25OZXh0Q3ljbGUgPSBmYWxzZTtcblx0XHRcdFx0dmFyIG9sZFNjcm9sbFBvcyA9IF9zY3JvbGxQb3M7XG5cdFx0XHRcdC8vIHVwZGF0ZSBzY3JvbGwgcG9zIG5vdyBpbnN0ZWFkIG9mIG9uQ2hhbmdlLCBhcyBpdCBtaWdodCBoYXZlIGNoYW5nZWQgc2luY2Ugc2NoZWR1bGluZyAoaS5lLiBpbi1icm93c2VyIHNtb290aCBzY3JvbGwpXG5cdFx0XHRcdF9zY3JvbGxQb3MgPSBDb250cm9sbGVyLnNjcm9sbFBvcygpO1xuXHRcdFx0XHR2YXIgZGVsdGFTY3JvbGwgPSBfc2Nyb2xsUG9zIC0gb2xkU2Nyb2xsUG9zO1xuXHRcdFx0XHRpZiAoZGVsdGFTY3JvbGwgIT09IDApIHsgLy8gc2Nyb2xsIHBvc2l0aW9uIGNoYW5nZWQ/XG5cdFx0XHRcdFx0X3Njcm9sbERpcmVjdGlvbiA9IChkZWx0YVNjcm9sbCA+IDApID8gU0NST0xMX0RJUkVDVElPTl9GT1JXQVJEIDogU0NST0xMX0RJUkVDVElPTl9SRVZFUlNFO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIHJldmVyc2Ugb3JkZXIgb2Ygc2NlbmVzIGlmIHNjcm9sbGluZyByZXZlcnNlXG5cdFx0XHRcdGlmIChfc2Nyb2xsRGlyZWN0aW9uID09PSBTQ1JPTExfRElSRUNUSU9OX1JFVkVSU0UpIHtcblx0XHRcdFx0XHRzY2VuZXNUb1VwZGF0ZS5yZXZlcnNlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gdXBkYXRlIHNjZW5lc1xuXHRcdFx0XHRzY2VuZXNUb1VwZGF0ZS5mb3JFYWNoKGZ1bmN0aW9uIChzY2VuZSwgaW5kZXgpIHtcblx0XHRcdFx0XHRsb2coMywgXCJ1cGRhdGluZyBTY2VuZSBcIiArIChpbmRleCArIDEpICsgXCIvXCIgKyBzY2VuZXNUb1VwZGF0ZS5sZW5ndGggKyBcIiAoXCIgKyBfc2NlbmVPYmplY3RzLmxlbmd0aCArIFwiIHRvdGFsKVwiKTtcblx0XHRcdFx0XHRzY2VuZS51cGRhdGUodHJ1ZSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRpZiAoc2NlbmVzVG9VcGRhdGUubGVuZ3RoID09PSAwICYmIF9vcHRpb25zLmxvZ2xldmVsID49IDMpIHtcblx0XHRcdFx0XHRsb2coMywgXCJ1cGRhdGluZyAwIFNjZW5lcyAobm90aGluZyBhZGRlZCB0byBjb250cm9sbGVyKVwiKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBJbml0aWFsaXplcyByQUYgY2FsbGJhY2tcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdHZhciBkZWJvdW5jZVVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdF91cGRhdGVUaW1lb3V0ID0gX3V0aWwuckFGKHVwZGF0ZVNjZW5lcyk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIEhhbmRsZXMgQ29udGFpbmVyIGNoYW5nZXNcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdHZhciBvbkNoYW5nZSA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRsb2coMywgXCJldmVudCBmaXJlZCBjYXVzaW5nIGFuIHVwZGF0ZTpcIiwgZS50eXBlKTtcblx0XHRcdGlmIChlLnR5cGUgPT0gXCJyZXNpemVcIikge1xuXHRcdFx0XHQvLyByZXNpemVcblx0XHRcdFx0X3ZpZXdQb3J0U2l6ZSA9IGdldFZpZXdwb3J0U2l6ZSgpO1xuXHRcdFx0XHRfc2Nyb2xsRGlyZWN0aW9uID0gU0NST0xMX0RJUkVDVElPTl9QQVVTRUQ7XG5cdFx0XHR9XG5cdFx0XHQvLyBzY2hlZHVsZSB1cGRhdGVcblx0XHRcdGlmIChfdXBkYXRlU2NlbmVzT25OZXh0Q3ljbGUgIT09IHRydWUpIHtcblx0XHRcdFx0X3VwZGF0ZVNjZW5lc09uTmV4dEN5Y2xlID0gdHJ1ZTtcblx0XHRcdFx0ZGVib3VuY2VVcGRhdGUoKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0dmFyIHJlZnJlc2ggPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoIV9pc0RvY3VtZW50KSB7XG5cdFx0XHRcdC8vIHNpbXVsYXRlIHJlc2l6ZSBldmVudC4gT25seSB3b3JrcyBmb3Igdmlld3BvcnQgcmVsZXZhbnQgcGFyYW0gKHBlcmZvcm1hbmNlKVxuXHRcdFx0XHRpZiAoX3ZpZXdQb3J0U2l6ZSAhPSBnZXRWaWV3cG9ydFNpemUoKSkge1xuXHRcdFx0XHRcdHZhciByZXNpemVFdmVudDtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0cmVzaXplRXZlbnQgPSBuZXcgRXZlbnQoJ3Jlc2l6ZScsIHtcblx0XHRcdFx0XHRcdFx0YnViYmxlczogZmFsc2UsXG5cdFx0XHRcdFx0XHRcdGNhbmNlbGFibGU6IGZhbHNlXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9IGNhdGNoIChlKSB7IC8vIHN0dXBpZCBJRVxuXHRcdFx0XHRcdFx0cmVzaXplRXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkV2ZW50XCIpO1xuXHRcdFx0XHRcdFx0cmVzaXplRXZlbnQuaW5pdEV2ZW50KFwicmVzaXplXCIsIGZhbHNlLCBmYWxzZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdF9vcHRpb25zLmNvbnRhaW5lci5kaXNwYXRjaEV2ZW50KHJlc2l6ZUV2ZW50KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0X3NjZW5lT2JqZWN0cy5mb3JFYWNoKGZ1bmN0aW9uIChzY2VuZSwgaW5kZXgpIHsgLy8gcmVmcmVzaCBhbGwgc2NlbmVzXG5cdFx0XHRcdHNjZW5lLnJlZnJlc2goKTtcblx0XHRcdH0pO1xuXHRcdFx0c2NoZWR1bGVSZWZyZXNoKCk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFNlbmQgYSBkZWJ1ZyBtZXNzYWdlIHRvIHRoZSBjb25zb2xlLlxuXHRcdCAqIHByb3ZpZGVkIHB1YmxpY2x5IHdpdGggX2xvZyBmb3IgcGx1Z2luc1xuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge251bWJlcn0gbG9nbGV2ZWwgLSBUaGUgbG9nbGV2ZWwgcmVxdWlyZWQgdG8gaW5pdGlhdGUgb3V0cHV0IGZvciB0aGUgbWVzc2FnZS5cblx0XHQgKiBAcGFyYW0gey4uLm1peGVkfSBvdXRwdXQgLSBPbmUgb3IgbW9yZSB2YXJpYWJsZXMgdGhhdCBzaG91bGQgYmUgcGFzc2VkIHRvIHRoZSBjb25zb2xlLlxuXHRcdCAqL1xuXHRcdHZhciBsb2cgPSB0aGlzLl9sb2cgPSBmdW5jdGlvbiAobG9nbGV2ZWwsIG91dHB1dCkge1xuXHRcdFx0aWYgKF9vcHRpb25zLmxvZ2xldmVsID49IGxvZ2xldmVsKSB7XG5cdFx0XHRcdEFycmF5LnByb3RvdHlwZS5zcGxpY2UuY2FsbChhcmd1bWVudHMsIDEsIDAsIFwiKFwiICsgTkFNRVNQQUNFICsgXCIpIC0+XCIpO1xuXHRcdFx0XHRfdXRpbC5sb2cuYXBwbHkod2luZG93LCBhcmd1bWVudHMpO1xuXHRcdFx0fVxuXHRcdH07XG5cdFx0Ly8gZm9yIHNjZW5lcyB3ZSBoYXZlIGdldHRlcnMgZm9yIGVhY2ggb3B0aW9uLCBidXQgZm9yIHRoZSBjb250cm9sbGVyIHdlIGRvbid0LCBzbyB3ZSBuZWVkIHRvIG1ha2UgaXQgYXZhaWxhYmxlIGV4dGVybmFsbHkgZm9yIHBsdWdpbnNcblx0XHR0aGlzLl9vcHRpb25zID0gX29wdGlvbnM7XG5cblx0XHQvKipcblx0XHQgKiBTb3J0IHNjZW5lcyBpbiBhc2NlbmRpbmcgb3JkZXIgb2YgdGhlaXIgc3RhcnQgb2Zmc2V0LlxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge2FycmF5fSBTY2VuZXNBcnJheSAtIGFuIGFycmF5IG9mIFNjcm9sbE1hZ2ljIFNjZW5lcyB0aGF0IHNob3VsZCBiZSBzb3J0ZWRcblx0XHQgKiBAcmV0dXJuIHthcnJheX0gVGhlIHNvcnRlZCBhcnJheSBvZiBTY2VuZXMuXG5cdFx0ICovXG5cdFx0dmFyIHNvcnRTY2VuZXMgPSBmdW5jdGlvbiAoU2NlbmVzQXJyYXkpIHtcblx0XHRcdGlmIChTY2VuZXNBcnJheS5sZW5ndGggPD0gMSkge1xuXHRcdFx0XHRyZXR1cm4gU2NlbmVzQXJyYXk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2YXIgc2NlbmVzID0gU2NlbmVzQXJyYXkuc2xpY2UoMCk7XG5cdFx0XHRcdHNjZW5lcy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGEuc2Nyb2xsT2Zmc2V0KCkgPiBiLnNjcm9sbE9mZnNldCgpID8gMSA6IC0xO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuIHNjZW5lcztcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRcdCAqIHB1YmxpYyBmdW5jdGlvbnNcblx0XHQgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdFx0ICovXG5cblx0XHQvKipcblx0XHQgKiBBZGQgb25lIG9yZSBtb3JlIHNjZW5lKHMpIHRvIHRoZSBjb250cm9sbGVyLiAgXG5cdFx0ICogVGhpcyBpcyB0aGUgZXF1aXZhbGVudCB0byBgU2NlbmUuYWRkVG8oY29udHJvbGxlcilgLlxuXHRcdCAqIEBwdWJsaWNcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIC8vIHdpdGggYSBwcmV2aW91c2x5IGRlZmluZWQgc2NlbmVcblx0XHQgKiBjb250cm9sbGVyLmFkZFNjZW5lKHNjZW5lKTtcblx0XHQgKlxuXHRcdCAqIC8vIHdpdGggYSBuZXdseSBjcmVhdGVkIHNjZW5lLlxuXHRcdCAqIGNvbnRyb2xsZXIuYWRkU2NlbmUobmV3IFNjcm9sbE1hZ2ljLlNjZW5lKHtkdXJhdGlvbiA6IDB9KSk7XG5cdFx0ICpcblx0XHQgKiAvLyBhZGRpbmcgbXVsdGlwbGUgc2NlbmVzXG5cdFx0ICogY29udHJvbGxlci5hZGRTY2VuZShbc2NlbmUsIHNjZW5lMiwgbmV3IFNjcm9sbE1hZ2ljLlNjZW5lKHtkdXJhdGlvbiA6IDB9KV0pO1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHsoU2Nyb2xsTWFnaWMuU2NlbmV8YXJyYXkpfSBuZXdTY2VuZSAtIFNjcm9sbE1hZ2ljIFNjZW5lIG9yIEFycmF5IG9mIFNjZW5lcyB0byBiZSBhZGRlZCB0byB0aGUgY29udHJvbGxlci5cblx0XHQgKiBAcmV0dXJuIHtDb250cm9sbGVyfSBQYXJlbnQgb2JqZWN0IGZvciBjaGFpbmluZy5cblx0XHQgKi9cblx0XHR0aGlzLmFkZFNjZW5lID0gZnVuY3Rpb24gKG5ld1NjZW5lKSB7XG5cdFx0XHRpZiAoX3V0aWwudHlwZS5BcnJheShuZXdTY2VuZSkpIHtcblx0XHRcdFx0bmV3U2NlbmUuZm9yRWFjaChmdW5jdGlvbiAoc2NlbmUsIGluZGV4KSB7XG5cdFx0XHRcdFx0Q29udHJvbGxlci5hZGRTY2VuZShzY2VuZSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIGlmIChuZXdTY2VuZSBpbnN0YW5jZW9mIFNjcm9sbE1hZ2ljLlNjZW5lKSB7XG5cdFx0XHRcdGlmIChuZXdTY2VuZS5jb250cm9sbGVyKCkgIT09IENvbnRyb2xsZXIpIHtcblx0XHRcdFx0XHRuZXdTY2VuZS5hZGRUbyhDb250cm9sbGVyKTtcblx0XHRcdFx0fSBlbHNlIGlmIChfc2NlbmVPYmplY3RzLmluZGV4T2YobmV3U2NlbmUpIDwgMCkge1xuXHRcdFx0XHRcdC8vIG5ldyBzY2VuZVxuXHRcdFx0XHRcdF9zY2VuZU9iamVjdHMucHVzaChuZXdTY2VuZSk7IC8vIGFkZCB0byBhcnJheVxuXHRcdFx0XHRcdF9zY2VuZU9iamVjdHMgPSBzb3J0U2NlbmVzKF9zY2VuZU9iamVjdHMpOyAvLyBzb3J0XG5cdFx0XHRcdFx0bmV3U2NlbmUub24oXCJzaGlmdC5jb250cm9sbGVyX3NvcnRcIiwgZnVuY3Rpb24gKCkgeyAvLyByZXNvcnQgd2hlbmV2ZXIgc2NlbmUgbW92ZXNcblx0XHRcdFx0XHRcdF9zY2VuZU9iamVjdHMgPSBzb3J0U2NlbmVzKF9zY2VuZU9iamVjdHMpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdC8vIGluc2VydCBHbG9iYWwgZGVmYXVsdHMuXG5cdFx0XHRcdFx0Zm9yICh2YXIga2V5IGluIF9vcHRpb25zLmdsb2JhbFNjZW5lT3B0aW9ucykge1xuXHRcdFx0XHRcdFx0aWYgKG5ld1NjZW5lW2tleV0pIHtcblx0XHRcdFx0XHRcdFx0bmV3U2NlbmVba2V5XS5jYWxsKG5ld1NjZW5lLCBfb3B0aW9ucy5nbG9iYWxTY2VuZU9wdGlvbnNba2V5XSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxvZygzLCBcImFkZGluZyBTY2VuZSAobm93IFwiICsgX3NjZW5lT2JqZWN0cy5sZW5ndGggKyBcIiB0b3RhbClcIik7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGxvZygxLCBcIkVSUk9SOiBpbnZhbGlkIGFyZ3VtZW50IHN1cHBsaWVkIGZvciAnLmFkZFNjZW5lKCknXCIpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIENvbnRyb2xsZXI7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFJlbW92ZSBvbmUgb3JlIG1vcmUgc2NlbmUocykgZnJvbSB0aGUgY29udHJvbGxlci4gIFxuXHRcdCAqIFRoaXMgaXMgdGhlIGVxdWl2YWxlbnQgdG8gYFNjZW5lLnJlbW92ZSgpYC5cblx0XHQgKiBAcHVibGljXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiAvLyByZW1vdmUgYSBzY2VuZSBmcm9tIHRoZSBjb250cm9sbGVyXG5cdFx0ICogY29udHJvbGxlci5yZW1vdmVTY2VuZShzY2VuZSk7XG5cdFx0ICpcblx0XHQgKiAvLyByZW1vdmUgbXVsdGlwbGUgc2NlbmVzIGZyb20gdGhlIGNvbnRyb2xsZXJcblx0XHQgKiBjb250cm9sbGVyLnJlbW92ZVNjZW5lKFtzY2VuZSwgc2NlbmUyLCBzY2VuZTNdKTtcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7KFNjcm9sbE1hZ2ljLlNjZW5lfGFycmF5KX0gU2NlbmUgLSBTY3JvbGxNYWdpYyBTY2VuZSBvciBBcnJheSBvZiBTY2VuZXMgdG8gYmUgcmVtb3ZlZCBmcm9tIHRoZSBjb250cm9sbGVyLlxuXHRcdCAqIEByZXR1cm5zIHtDb250cm9sbGVyfSBQYXJlbnQgb2JqZWN0IGZvciBjaGFpbmluZy5cblx0XHQgKi9cblx0XHR0aGlzLnJlbW92ZVNjZW5lID0gZnVuY3Rpb24gKFNjZW5lKSB7XG5cdFx0XHRpZiAoX3V0aWwudHlwZS5BcnJheShTY2VuZSkpIHtcblx0XHRcdFx0U2NlbmUuZm9yRWFjaChmdW5jdGlvbiAoc2NlbmUsIGluZGV4KSB7XG5cdFx0XHRcdFx0Q29udHJvbGxlci5yZW1vdmVTY2VuZShzY2VuZSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dmFyIGluZGV4ID0gX3NjZW5lT2JqZWN0cy5pbmRleE9mKFNjZW5lKTtcblx0XHRcdFx0aWYgKGluZGV4ID4gLTEpIHtcblx0XHRcdFx0XHRTY2VuZS5vZmYoXCJzaGlmdC5jb250cm9sbGVyX3NvcnRcIik7XG5cdFx0XHRcdFx0X3NjZW5lT2JqZWN0cy5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0XHRcdGxvZygzLCBcInJlbW92aW5nIFNjZW5lIChub3cgXCIgKyBfc2NlbmVPYmplY3RzLmxlbmd0aCArIFwiIGxlZnQpXCIpO1xuXHRcdFx0XHRcdFNjZW5lLnJlbW92ZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gQ29udHJvbGxlcjtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogVXBkYXRlIG9uZSBvcmUgbW9yZSBzY2VuZShzKSBhY2NvcmRpbmcgdG8gdGhlIHNjcm9sbCBwb3NpdGlvbiBvZiB0aGUgY29udGFpbmVyLiAgXG5cdFx0ICogVGhpcyBpcyB0aGUgZXF1aXZhbGVudCB0byBgU2NlbmUudXBkYXRlKClgLiAgXG5cdFx0ICogVGhlIHVwZGF0ZSBtZXRob2QgY2FsY3VsYXRlcyB0aGUgc2NlbmUncyBzdGFydCBhbmQgZW5kIHBvc2l0aW9uIChiYXNlZCBvbiB0aGUgdHJpZ2dlciBlbGVtZW50LCB0cmlnZ2VyIGhvb2ssIGR1cmF0aW9uIGFuZCBvZmZzZXQpIGFuZCBjaGVja3MgaXQgYWdhaW5zdCB0aGUgY3VycmVudCBzY3JvbGwgcG9zaXRpb24gb2YgdGhlIGNvbnRhaW5lci4gIFxuXHRcdCAqIEl0IHRoZW4gdXBkYXRlcyB0aGUgY3VycmVudCBzY2VuZSBzdGF0ZSBhY2NvcmRpbmdseSAob3IgZG9lcyBub3RoaW5nLCBpZiB0aGUgc3RhdGUgaXMgYWxyZWFkeSBjb3JyZWN0KSDigJMgUGlucyB3aWxsIGJlIHNldCB0byB0aGVpciBjb3JyZWN0IHBvc2l0aW9uIGFuZCB0d2VlbnMgd2lsbCBiZSB1cGRhdGVkIHRvIHRoZWlyIGNvcnJlY3QgcHJvZ3Jlc3MuICBcblx0XHQgKiBfKipOb3RlOioqIFRoaXMgbWV0aG9kIGdldHMgY2FsbGVkIGNvbnN0YW50bHkgd2hlbmV2ZXIgQ29udHJvbGxlciBkZXRlY3RzIGEgY2hhbmdlLiBUaGUgb25seSBhcHBsaWNhdGlvbiBmb3IgeW91IGlzIGlmIHlvdSBjaGFuZ2Ugc29tZXRoaW5nIG91dHNpZGUgb2YgdGhlIHJlYWxtIG9mIFNjcm9sbE1hZ2ljLCBsaWtlIG1vdmluZyB0aGUgdHJpZ2dlciBvciBjaGFuZ2luZyB0d2VlbiBwYXJhbWV0ZXJzLl9cblx0XHQgKiBAcHVibGljXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiAvLyB1cGRhdGUgYSBzcGVjaWZpYyBzY2VuZSBvbiBuZXh0IGN5Y2xlXG5cdFx0ICogY29udHJvbGxlci51cGRhdGVTY2VuZShzY2VuZSk7XG5cdFx0ICpcblx0XHQgKiAvLyB1cGRhdGUgYSBzcGVjaWZpYyBzY2VuZSBpbW1lZGlhdGVseVxuXHRcdCAqIGNvbnRyb2xsZXIudXBkYXRlU2NlbmUoc2NlbmUsIHRydWUpO1xuXHRcdCAqXG5cdFx0ICogLy8gdXBkYXRlIG11bHRpcGxlIHNjZW5lcyBzY2VuZSBvbiBuZXh0IGN5Y2xlXG5cdFx0ICogY29udHJvbGxlci51cGRhdGVTY2VuZShbc2NlbmUxLCBzY2VuZTIsIHNjZW5lM10pO1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtTY3JvbGxNYWdpYy5TY2VuZX0gU2NlbmUgLSBTY3JvbGxNYWdpYyBTY2VuZSBvciBBcnJheSBvZiBTY2VuZXMgdGhhdCBpcy9hcmUgc3VwcG9zZWQgdG8gYmUgdXBkYXRlZC5cblx0XHQgKiBAcGFyYW0ge2Jvb2xlYW59IFtpbW1lZGlhdGVseT1mYWxzZV0gLSBJZiBgdHJ1ZWAgdGhlIHVwZGF0ZSB3aWxsIGJlIGluc3RhbnQsIGlmIGBmYWxzZWAgaXQgd2lsbCB3YWl0IHVudGlsIG5leHQgdXBkYXRlIGN5Y2xlLiAgXG5cdFx0IFRoaXMgaXMgdXNlZnVsIHdoZW4gY2hhbmdpbmcgbXVsdGlwbGUgcHJvcGVydGllcyBvZiB0aGUgc2NlbmUgLSB0aGlzIHdheSBpdCB3aWxsIG9ubHkgYmUgdXBkYXRlZCBvbmNlIGFsbCBuZXcgcHJvcGVydGllcyBhcmUgc2V0ICh1cGRhdGVTY2VuZXMpLlxuXHRcdCAqIEByZXR1cm4ge0NvbnRyb2xsZXJ9IFBhcmVudCBvYmplY3QgZm9yIGNoYWluaW5nLlxuXHRcdCAqL1xuXHRcdHRoaXMudXBkYXRlU2NlbmUgPSBmdW5jdGlvbiAoU2NlbmUsIGltbWVkaWF0ZWx5KSB7XG5cdFx0XHRpZiAoX3V0aWwudHlwZS5BcnJheShTY2VuZSkpIHtcblx0XHRcdFx0U2NlbmUuZm9yRWFjaChmdW5jdGlvbiAoc2NlbmUsIGluZGV4KSB7XG5cdFx0XHRcdFx0Q29udHJvbGxlci51cGRhdGVTY2VuZShzY2VuZSwgaW1tZWRpYXRlbHkpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmIChpbW1lZGlhdGVseSkge1xuXHRcdFx0XHRcdFNjZW5lLnVwZGF0ZSh0cnVlKTtcblx0XHRcdFx0fSBlbHNlIGlmIChfdXBkYXRlU2NlbmVzT25OZXh0Q3ljbGUgIT09IHRydWUgJiYgU2NlbmUgaW5zdGFuY2VvZiBTY3JvbGxNYWdpYy5TY2VuZSkgeyAvLyBpZiBfdXBkYXRlU2NlbmVzT25OZXh0Q3ljbGUgaXMgdHJ1ZSwgYWxsIGNvbm5lY3RlZCBzY2VuZXMgYXJlIGFscmVhZHkgc2NoZWR1bGVkIGZvciB1cGRhdGVcblx0XHRcdFx0XHQvLyBwcmVwIGFycmF5IGZvciBuZXh0IHVwZGF0ZSBjeWNsZVxuXHRcdFx0XHRcdF91cGRhdGVTY2VuZXNPbk5leHRDeWNsZSA9IF91cGRhdGVTY2VuZXNPbk5leHRDeWNsZSB8fCBbXTtcblx0XHRcdFx0XHRpZiAoX3VwZGF0ZVNjZW5lc09uTmV4dEN5Y2xlLmluZGV4T2YoU2NlbmUpID09IC0xKSB7XG5cdFx0XHRcdFx0XHRfdXBkYXRlU2NlbmVzT25OZXh0Q3ljbGUucHVzaChTY2VuZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdF91cGRhdGVTY2VuZXNPbk5leHRDeWNsZSA9IHNvcnRTY2VuZXMoX3VwZGF0ZVNjZW5lc09uTmV4dEN5Y2xlKTsgLy8gc29ydFxuXHRcdFx0XHRcdGRlYm91bmNlVXBkYXRlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBDb250cm9sbGVyO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBVcGRhdGVzIHRoZSBjb250cm9sbGVyIHBhcmFtcyBhbmQgY2FsbHMgdXBkYXRlU2NlbmUgb24gZXZlcnkgc2NlbmUsIHRoYXQgaXMgYXR0YWNoZWQgdG8gdGhlIGNvbnRyb2xsZXIuICBcblx0XHQgKiBTZWUgYENvbnRyb2xsZXIudXBkYXRlU2NlbmUoKWAgZm9yIG1vcmUgaW5mb3JtYXRpb24gYWJvdXQgd2hhdCB0aGlzIG1lYW5zLiAgXG5cdFx0ICogSW4gbW9zdCBjYXNlcyB5b3Ugd2lsbCBub3QgbmVlZCB0aGlzIGZ1bmN0aW9uLCBhcyBpdCBpcyBjYWxsZWQgY29uc3RhbnRseSwgd2hlbmV2ZXIgU2Nyb2xsTWFnaWMgZGV0ZWN0cyBhIHN0YXRlIGNoYW5nZSBldmVudCwgbGlrZSByZXNpemUgb3Igc2Nyb2xsLiAgXG5cdFx0ICogVGhlIG9ubHkgYXBwbGljYXRpb24gZm9yIHRoaXMgbWV0aG9kIGlzIHdoZW4gU2Nyb2xsTWFnaWMgZmFpbHMgdG8gZGV0ZWN0IHRoZXNlIGV2ZW50cy4gIFxuXHRcdCAqIE9uZSBhcHBsaWNhdGlvbiBpcyB3aXRoIHNvbWUgZXh0ZXJuYWwgc2Nyb2xsIGxpYnJhcmllcyAobGlrZSBpU2Nyb2xsKSB0aGF0IG1vdmUgYW4gaW50ZXJuYWwgY29udGFpbmVyIHRvIGEgbmVnYXRpdmUgb2Zmc2V0IGluc3RlYWQgb2YgYWN0dWFsbHkgc2Nyb2xsaW5nLiBJbiB0aGlzIGNhc2UgdGhlIHVwZGF0ZSBvbiB0aGUgY29udHJvbGxlciBuZWVkcyB0byBiZSBjYWxsZWQgd2hlbmV2ZXIgdGhlIGNoaWxkIGNvbnRhaW5lcidzIHBvc2l0aW9uIGNoYW5nZXMuXG5cdFx0ICogRm9yIHRoaXMgY2FzZSB0aGVyZSB3aWxsIGFsc28gYmUgdGhlIG5lZWQgdG8gcHJvdmlkZSBhIGN1c3RvbSBmdW5jdGlvbiB0byBjYWxjdWxhdGUgdGhlIGNvcnJlY3Qgc2Nyb2xsIHBvc2l0aW9uLiBTZWUgYENvbnRyb2xsZXIuc2Nyb2xsUG9zKClgIGZvciBkZXRhaWxzLlxuXHRcdCAqIEBwdWJsaWNcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIC8vIHVwZGF0ZSB0aGUgY29udHJvbGxlciBvbiBuZXh0IGN5Y2xlIChzYXZlcyBwZXJmb3JtYW5jZSBkdWUgdG8gZWxpbWluYXRpb24gb2YgcmVkdW5kYW50IHVwZGF0ZXMpXG5cdFx0ICogY29udHJvbGxlci51cGRhdGUoKTtcblx0XHQgKlxuXHRcdCAqIC8vIHVwZGF0ZSB0aGUgY29udHJvbGxlciBpbW1lZGlhdGVseVxuXHRcdCAqIGNvbnRyb2xsZXIudXBkYXRlKHRydWUpO1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtib29sZWFufSBbaW1tZWRpYXRlbHk9ZmFsc2VdIC0gSWYgYHRydWVgIHRoZSB1cGRhdGUgd2lsbCBiZSBpbnN0YW50LCBpZiBgZmFsc2VgIGl0IHdpbGwgd2FpdCB1bnRpbCBuZXh0IHVwZGF0ZSBjeWNsZSAoYmV0dGVyIHBlcmZvcm1hbmNlKVxuXHRcdCAqIEByZXR1cm4ge0NvbnRyb2xsZXJ9IFBhcmVudCBvYmplY3QgZm9yIGNoYWluaW5nLlxuXHRcdCAqL1xuXHRcdHRoaXMudXBkYXRlID0gZnVuY3Rpb24gKGltbWVkaWF0ZWx5KSB7XG5cdFx0XHRvbkNoYW5nZSh7XG5cdFx0XHRcdHR5cGU6IFwicmVzaXplXCJcblx0XHRcdH0pOyAvLyB3aWxsIHVwZGF0ZSBzaXplIGFuZCBzZXQgX3VwZGF0ZVNjZW5lc09uTmV4dEN5Y2xlIHRvIHRydWVcblx0XHRcdGlmIChpbW1lZGlhdGVseSkge1xuXHRcdFx0XHR1cGRhdGVTY2VuZXMoKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBDb250cm9sbGVyO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBTY3JvbGwgdG8gYSBudW1lcmljIHNjcm9sbCBvZmZzZXQsIGEgRE9NIGVsZW1lbnQsIHRoZSBzdGFydCBvZiBhIHNjZW5lIG9yIHByb3ZpZGUgYW4gYWx0ZXJuYXRlIG1ldGhvZCBmb3Igc2Nyb2xsaW5nLiAgXG5cdFx0ICogRm9yIHZlcnRpY2FsIGNvbnRyb2xsZXJzIGl0IHdpbGwgY2hhbmdlIHRoZSB0b3Agc2Nyb2xsIG9mZnNldCBhbmQgZm9yIGhvcml6b250YWwgYXBwbGljYXRpb25zIGl0IHdpbGwgY2hhbmdlIHRoZSBsZWZ0IG9mZnNldC5cblx0XHQgKiBAcHVibGljXG5cdFx0ICpcblx0XHQgKiBAc2luY2UgMS4xLjBcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIC8vIHNjcm9sbCB0byBhbiBvZmZzZXQgb2YgMTAwXG5cdFx0ICogY29udHJvbGxlci5zY3JvbGxUbygxMDApO1xuXHRcdCAqXG5cdFx0ICogLy8gc2Nyb2xsIHRvIGEgRE9NIGVsZW1lbnRcblx0XHQgKiBjb250cm9sbGVyLnNjcm9sbFRvKFwiI2FuY2hvclwiKTtcblx0XHQgKlxuXHRcdCAqIC8vIHNjcm9sbCB0byB0aGUgYmVnaW5uaW5nIG9mIGEgc2NlbmVcblx0XHQgKiB2YXIgc2NlbmUgPSBuZXcgU2Nyb2xsTWFnaWMuU2NlbmUoe29mZnNldDogMjAwfSk7XG5cdFx0ICogY29udHJvbGxlci5zY3JvbGxUbyhzY2VuZSk7XG5cdFx0ICpcblx0XHQgKiAvLyBkZWZpbmUgYSBuZXcgc2Nyb2xsIHBvc2l0aW9uIG1vZGlmaWNhdGlvbiBmdW5jdGlvbiAoalF1ZXJ5IGFuaW1hdGUgaW5zdGVhZCBvZiBqdW1wKVxuXHRcdCAqIGNvbnRyb2xsZXIuc2Nyb2xsVG8oZnVuY3Rpb24gKG5ld1Njcm9sbFBvcykge1xuXHRcdCAqXHQkKFwiaHRtbCwgYm9keVwiKS5hbmltYXRlKHtzY3JvbGxUb3A6IG5ld1Njcm9sbFBvc30pO1xuXHRcdCAqIH0pO1xuXHRcdCAqIGNvbnRyb2xsZXIuc2Nyb2xsVG8oMTAwKTsgLy8gY2FsbCBhcyB1c3VhbCwgYnV0IHRoZSBuZXcgZnVuY3Rpb24gd2lsbCBiZSB1c2VkIGluc3RlYWRcblx0XHQgKlxuXHRcdCAqIC8vIGRlZmluZSBhIG5ldyBzY3JvbGwgZnVuY3Rpb24gd2l0aCBhbiBhZGRpdGlvbmFsIHBhcmFtZXRlclxuXHRcdCAqIGNvbnRyb2xsZXIuc2Nyb2xsVG8oZnVuY3Rpb24gKG5ld1Njcm9sbFBvcywgbWVzc2FnZSkge1xuXHRcdCAqICBjb25zb2xlLmxvZyhtZXNzYWdlKTtcblx0XHQgKlx0JCh0aGlzKS5hbmltYXRlKHtzY3JvbGxUb3A6IG5ld1Njcm9sbFBvc30pO1xuXHRcdCAqIH0pO1xuXHRcdCAqIC8vIGNhbGwgYXMgdXN1YWwsIGJ1dCBzdXBwbHkgYW4gZXh0cmEgcGFyYW1ldGVyIHRvIHRoZSBkZWZpbmVkIGN1c3RvbSBmdW5jdGlvblxuXHRcdCAqIGNvbnRyb2xsZXIuc2Nyb2xsVG8oMTAwLCBcIm15IG1lc3NhZ2VcIik7XG5cdFx0ICpcblx0XHQgKiAvLyBkZWZpbmUgYSBuZXcgc2Nyb2xsIGZ1bmN0aW9uIHdpdGggYW4gYWRkaXRpb25hbCBwYXJhbWV0ZXIgY29udGFpbmluZyBtdWx0aXBsZSB2YXJpYWJsZXNcblx0XHQgKiBjb250cm9sbGVyLnNjcm9sbFRvKGZ1bmN0aW9uIChuZXdTY3JvbGxQb3MsIG9wdGlvbnMpIHtcblx0XHQgKiAgc29tZUdsb2JhbFZhciA9IG9wdGlvbnMuYSArIG9wdGlvbnMuYjtcblx0XHQgKlx0JCh0aGlzKS5hbmltYXRlKHtzY3JvbGxUb3A6IG5ld1Njcm9sbFBvc30pO1xuXHRcdCAqIH0pO1xuXHRcdCAqIC8vIGNhbGwgYXMgdXN1YWwsIGJ1dCBzdXBwbHkgYW4gZXh0cmEgcGFyYW1ldGVyIGNvbnRhaW5pbmcgbXVsdGlwbGUgb3B0aW9uc1xuXHRcdCAqIGNvbnRyb2xsZXIuc2Nyb2xsVG8oMTAwLCB7YTogMSwgYjogMn0pO1xuXHRcdCAqXG5cdFx0ICogLy8gZGVmaW5lIGEgbmV3IHNjcm9sbCBmdW5jdGlvbiB3aXRoIGEgY2FsbGJhY2sgc3VwcGxpZWQgYXMgYW4gYWRkaXRpb25hbCBwYXJhbWV0ZXJcblx0XHQgKiBjb250cm9sbGVyLnNjcm9sbFRvKGZ1bmN0aW9uIChuZXdTY3JvbGxQb3MsIGNhbGxiYWNrKSB7XG5cdFx0ICpcdCQodGhpcykuYW5pbWF0ZSh7c2Nyb2xsVG9wOiBuZXdTY3JvbGxQb3N9LCA0MDAsIFwic3dpbmdcIiwgY2FsbGJhY2spO1xuXHRcdCAqIH0pO1xuXHRcdCAqIC8vIGNhbGwgYXMgdXN1YWwsIGJ1dCBzdXBwbHkgYW4gZXh0cmEgcGFyYW1ldGVyLCB3aGljaCBpcyB1c2VkIGFzIGEgY2FsbGJhY2sgaW4gdGhlIHByZXZpb3VzbHkgZGVmaW5lZCBjdXN0b20gc2Nyb2xsIGZ1bmN0aW9uXG5cdFx0ICogY29udHJvbGxlci5zY3JvbGxUbygxMDAsIGZ1bmN0aW9uKCkge1xuXHRcdCAqXHRjb25zb2xlLmxvZyhcInNjcm9sbCBoYXMgZmluaXNoZWQuXCIpO1xuXHRcdCAqIH0pO1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHttaXhlZH0gc2Nyb2xsVGFyZ2V0IC0gVGhlIHN1cHBsaWVkIGFyZ3VtZW50IGNhbiBiZSBvbmUgb2YgdGhlc2UgdHlwZXM6XG5cdFx0ICogMS4gYG51bWJlcmAgLT4gVGhlIGNvbnRhaW5lciB3aWxsIHNjcm9sbCB0byB0aGlzIG5ldyBzY3JvbGwgb2Zmc2V0LlxuXHRcdCAqIDIuIGBzdHJpbmdgIG9yIGBvYmplY3RgIC0+IENhbiBiZSBhIHNlbGVjdG9yIG9yIGEgRE9NIG9iamVjdC4gIFxuXHRcdCAqICBUaGUgY29udGFpbmVyIHdpbGwgc2Nyb2xsIHRvIHRoZSBwb3NpdGlvbiBvZiB0aGlzIGVsZW1lbnQuXG5cdFx0ICogMy4gYFNjcm9sbE1hZ2ljIFNjZW5lYCAtPiBUaGUgY29udGFpbmVyIHdpbGwgc2Nyb2xsIHRvIHRoZSBzdGFydCBvZiB0aGlzIHNjZW5lLlxuXHRcdCAqIDQuIGBmdW5jdGlvbmAgLT4gVGhpcyBmdW5jdGlvbiB3aWxsIGJlIHVzZWQgZm9yIGZ1dHVyZSBzY3JvbGwgcG9zaXRpb24gbW9kaWZpY2F0aW9ucy4gIFxuXHRcdCAqICBUaGlzIHByb3ZpZGVzIGEgd2F5IGZvciB5b3UgdG8gY2hhbmdlIHRoZSBiZWhhdmlvdXIgb2Ygc2Nyb2xsaW5nIGFuZCBhZGRpbmcgbmV3IGJlaGF2aW91ciBsaWtlIGFuaW1hdGlvbi4gVGhlIGZ1bmN0aW9uIHJlY2VpdmVzIHRoZSBuZXcgc2Nyb2xsIHBvc2l0aW9uIGFzIGEgcGFyYW1ldGVyIGFuZCBhIHJlZmVyZW5jZSB0byB0aGUgY29udGFpbmVyIGVsZW1lbnQgdXNpbmcgYHRoaXNgLiAgXG5cdFx0ICogIEl0IG1heSBhbHNvIG9wdGlvbmFsbHkgcmVjZWl2ZSBhbiBvcHRpb25hbCBhZGRpdGlvbmFsIHBhcmFtZXRlciAoc2VlIGJlbG93KSAgXG5cdFx0ICogIF8qKk5PVEU6KiogIFxuXHRcdCAqICBBbGwgb3RoZXIgb3B0aW9ucyB3aWxsIHN0aWxsIHdvcmsgYXMgZXhwZWN0ZWQsIHVzaW5nIHRoZSBuZXcgZnVuY3Rpb24gdG8gc2Nyb2xsLl9cblx0XHQgKiBAcGFyYW0ge21peGVkfSBbYWRkaXRpb25hbFBhcmFtZXRlcl0gLSBJZiBhIGN1c3RvbSBzY3JvbGwgZnVuY3Rpb24gd2FzIGRlZmluZWQgKHNlZSBhYm92ZSA0LiksIHlvdSBtYXkgd2FudCB0byBzdXBwbHkgYWRkaXRpb25hbCBwYXJhbWV0ZXJzIHRvIGl0LCB3aGVuIGNhbGxpbmcgaXQuIFlvdSBjYW4gZG8gdGhpcyB1c2luZyB0aGlzIHBhcmFtZXRlciDigJMgc2VlIGV4YW1wbGVzIGZvciBkZXRhaWxzLiBQbGVhc2Ugbm90ZSwgdGhhdCB0aGlzIHBhcmFtZXRlciB3aWxsIGhhdmUgbm8gZWZmZWN0LCBpZiB5b3UgdXNlIHRoZSBkZWZhdWx0IHNjcm9sbGluZyBmdW5jdGlvbi5cblx0XHQgKiBAcmV0dXJucyB7Q29udHJvbGxlcn0gUGFyZW50IG9iamVjdCBmb3IgY2hhaW5pbmcuXG5cdFx0ICovXG5cdFx0dGhpcy5zY3JvbGxUbyA9IGZ1bmN0aW9uIChzY3JvbGxUYXJnZXQsIGFkZGl0aW9uYWxQYXJhbWV0ZXIpIHtcblx0XHRcdGlmIChfdXRpbC50eXBlLk51bWJlcihzY3JvbGxUYXJnZXQpKSB7IC8vIGV4Y2VjdXRlXG5cdFx0XHRcdHNldFNjcm9sbFBvcy5jYWxsKF9vcHRpb25zLmNvbnRhaW5lciwgc2Nyb2xsVGFyZ2V0LCBhZGRpdGlvbmFsUGFyYW1ldGVyKTtcblx0XHRcdH0gZWxzZSBpZiAoc2Nyb2xsVGFyZ2V0IGluc3RhbmNlb2YgU2Nyb2xsTWFnaWMuU2NlbmUpIHsgLy8gc2Nyb2xsIHRvIHNjZW5lXG5cdFx0XHRcdGlmIChzY3JvbGxUYXJnZXQuY29udHJvbGxlcigpID09PSBDb250cm9sbGVyKSB7IC8vIGNoZWNrIGlmIHRoZSBjb250cm9sbGVyIGlzIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHNjZW5lXG5cdFx0XHRcdFx0Q29udHJvbGxlci5zY3JvbGxUbyhzY3JvbGxUYXJnZXQuc2Nyb2xsT2Zmc2V0KCksIGFkZGl0aW9uYWxQYXJhbWV0ZXIpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGxvZygyLCBcInNjcm9sbFRvKCk6IFRoZSBzdXBwbGllZCBzY2VuZSBkb2VzIG5vdCBiZWxvbmcgdG8gdGhpcyBjb250cm9sbGVyLiBTY3JvbGwgY2FuY2VsbGVkLlwiLCBzY3JvbGxUYXJnZXQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKF91dGlsLnR5cGUuRnVuY3Rpb24oc2Nyb2xsVGFyZ2V0KSkgeyAvLyBhc3NpZ24gbmV3IHNjcm9sbCBmdW5jdGlvblxuXHRcdFx0XHRzZXRTY3JvbGxQb3MgPSBzY3JvbGxUYXJnZXQ7XG5cdFx0XHR9IGVsc2UgeyAvLyBzY3JvbGwgdG8gZWxlbWVudFxuXHRcdFx0XHR2YXIgZWxlbSA9IF91dGlsLmdldC5lbGVtZW50cyhzY3JvbGxUYXJnZXQpWzBdO1xuXHRcdFx0XHRpZiAoZWxlbSkge1xuXHRcdFx0XHRcdC8vIGlmIHBhcmVudCBpcyBwaW4gc3BhY2VyLCB1c2Ugc3BhY2VyIHBvc2l0aW9uIGluc3RlYWQgc28gY29ycmVjdCBzdGFydCBwb3NpdGlvbiBpcyByZXR1cm5lZCBmb3IgcGlubmVkIGVsZW1lbnRzLlxuXHRcdFx0XHRcdHdoaWxlIChlbGVtLnBhcmVudE5vZGUuaGFzQXR0cmlidXRlKFBJTl9TUEFDRVJfQVRUUklCVVRFKSkge1xuXHRcdFx0XHRcdFx0ZWxlbSA9IGVsZW0ucGFyZW50Tm9kZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR2YXJcblx0XHRcdFx0XHRwYXJhbSA9IF9vcHRpb25zLnZlcnRpY2FsID8gXCJ0b3BcIiA6IFwibGVmdFwiLFxuXHRcdFx0XHRcdFx0Ly8gd2hpY2ggcGFyYW0gaXMgb2YgaW50ZXJlc3QgP1xuXHRcdFx0XHRcdFx0Y29udGFpbmVyT2Zmc2V0ID0gX3V0aWwuZ2V0Lm9mZnNldChfb3B0aW9ucy5jb250YWluZXIpLFxuXHRcdFx0XHRcdFx0Ly8gY29udGFpbmVyIHBvc2l0aW9uIGlzIG5lZWRlZCBiZWNhdXNlIGVsZW1lbnQgb2Zmc2V0IGlzIHJldHVybmVkIGluIHJlbGF0aW9uIHRvIGRvY3VtZW50LCBub3QgaW4gcmVsYXRpb24gdG8gY29udGFpbmVyLlxuXHRcdFx0XHRcdFx0ZWxlbWVudE9mZnNldCA9IF91dGlsLmdldC5vZmZzZXQoZWxlbSk7XG5cblx0XHRcdFx0XHRpZiAoIV9pc0RvY3VtZW50KSB7IC8vIGNvbnRhaW5lciBpcyBub3QgdGhlIGRvY3VtZW50IHJvb3QsIHNvIHN1YnN0cmFjdCBzY3JvbGwgUG9zaXRpb24gdG8gZ2V0IGNvcnJlY3QgdHJpZ2dlciBlbGVtZW50IHBvc2l0aW9uIHJlbGF0aXZlIHRvIHNjcm9sbGNvbnRlbnRcblx0XHRcdFx0XHRcdGNvbnRhaW5lck9mZnNldFtwYXJhbV0gLT0gQ29udHJvbGxlci5zY3JvbGxQb3MoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRDb250cm9sbGVyLnNjcm9sbFRvKGVsZW1lbnRPZmZzZXRbcGFyYW1dIC0gY29udGFpbmVyT2Zmc2V0W3BhcmFtXSwgYWRkaXRpb25hbFBhcmFtZXRlcik7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0bG9nKDIsIFwic2Nyb2xsVG8oKTogVGhlIHN1cHBsaWVkIGFyZ3VtZW50IGlzIGludmFsaWQuIFNjcm9sbCBjYW5jZWxsZWQuXCIsIHNjcm9sbFRhcmdldCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBDb250cm9sbGVyO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiAqKkdldCoqIHRoZSBjdXJyZW50IHNjcm9sbFBvc2l0aW9uIG9yICoqU2V0KiogYSBuZXcgbWV0aG9kIHRvIGNhbGN1bGF0ZSBpdC4gIFxuXHRcdCAqIC0+ICoqR0VUKio6XG5cdFx0ICogV2hlbiB1c2VkIGFzIGEgZ2V0dGVyIHRoaXMgZnVuY3Rpb24gd2lsbCByZXR1cm4gdGhlIGN1cnJlbnQgc2Nyb2xsIHBvc2l0aW9uLiAgXG5cdFx0ICogVG8gZ2V0IGEgY2FjaGVkIHZhbHVlIHVzZSBDb250cm9sbGVyLmluZm8oXCJzY3JvbGxQb3NcIiksIHdoaWNoIHdpbGwgYmUgdXBkYXRlZCBpbiB0aGUgdXBkYXRlIGN5Y2xlLiAgXG5cdFx0ICogRm9yIHZlcnRpY2FsIGNvbnRyb2xsZXJzIGl0IHdpbGwgcmV0dXJuIHRoZSB0b3Agc2Nyb2xsIG9mZnNldCBhbmQgZm9yIGhvcml6b250YWwgYXBwbGljYXRpb25zIGl0IHdpbGwgcmV0dXJuIHRoZSBsZWZ0IG9mZnNldC5cblx0XHQgKlxuXHRcdCAqIC0+ICoqU0VUKio6XG5cdFx0ICogV2hlbiB1c2VkIGFzIGEgc2V0dGVyIHRoaXMgbWV0aG9kIHByb2RlcyBhIHdheSB0byBwZXJtYW5lbnRseSBvdmVyd3JpdGUgdGhlIGNvbnRyb2xsZXIncyBzY3JvbGwgcG9zaXRpb24gY2FsY3VsYXRpb24uICBcblx0XHQgKiBBIHR5cGljYWwgdXNlY2FzZSBpcyB3aGVuIHRoZSBzY3JvbGwgcG9zaXRpb24gaXMgbm90IHJlZmxlY3RlZCBieSB0aGUgY29udGFpbmVycyBzY3JvbGxUb3Agb3Igc2Nyb2xsTGVmdCB2YWx1ZXMsIGJ1dCBmb3IgZXhhbXBsZSBieSB0aGUgaW5uZXIgb2Zmc2V0IG9mIGEgY2hpbGQgY29udGFpbmVyLiAgXG5cdFx0ICogTW92aW5nIGEgY2hpbGQgY29udGFpbmVyIGluc2lkZSBhIHBhcmVudCBpcyBhIGNvbW1vbmx5IHVzZWQgbWV0aG9kIGZvciBzZXZlcmFsIHNjcm9sbGluZyBmcmFtZXdvcmtzLCBpbmNsdWRpbmcgaVNjcm9sbC4gIFxuXHRcdCAqIEJ5IHByb3ZpZGluZyBhbiBhbHRlcm5hdGUgY2FsY3VsYXRpb24gZnVuY3Rpb24geW91IGNhbiBtYWtlIHN1cmUgU2Nyb2xsTWFnaWMgcmVjZWl2ZXMgdGhlIGNvcnJlY3Qgc2Nyb2xsIHBvc2l0aW9uLiAgXG5cdFx0ICogUGxlYXNlIGFsc28gYmVhciBpbiBtaW5kIHRoYXQgeW91ciBmdW5jdGlvbiBzaG91bGQgcmV0dXJuIHkgdmFsdWVzIGZvciB2ZXJ0aWNhbCBzY3JvbGxzIGFuIHggZm9yIGhvcml6b250YWxzLlxuXHRcdCAqXG5cdFx0ICogVG8gY2hhbmdlIHRoZSBjdXJyZW50IHNjcm9sbCBwb3NpdGlvbiBwbGVhc2UgdXNlIGBDb250cm9sbGVyLnNjcm9sbFRvKClgLlxuXHRcdCAqIEBwdWJsaWNcblx0XHQgKlxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogLy8gZ2V0IHRoZSBjdXJyZW50IHNjcm9sbCBQb3NpdGlvblxuXHRcdCAqIHZhciBzY3JvbGxQb3MgPSBjb250cm9sbGVyLnNjcm9sbFBvcygpO1xuXHRcdCAqXG5cdFx0ICogLy8gc2V0IGEgbmV3IHNjcm9sbCBwb3NpdGlvbiBjYWxjdWxhdGlvbiBtZXRob2Rcblx0XHQgKiBjb250cm9sbGVyLnNjcm9sbFBvcyhmdW5jdGlvbiAoKSB7XG5cdFx0ICpcdHJldHVybiB0aGlzLmluZm8oXCJ2ZXJ0aWNhbFwiKSA/IC1teWNoaWxkY29udGFpbmVyLnkgOiAtbXljaGlsZGNvbnRhaW5lci54XG5cdFx0ICogfSk7XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBbc2Nyb2xsUG9zTWV0aG9kXSAtIFRoZSBmdW5jdGlvbiB0byBiZSB1c2VkIGZvciB0aGUgc2Nyb2xsIHBvc2l0aW9uIGNhbGN1bGF0aW9uIG9mIHRoZSBjb250YWluZXIuXG5cdFx0ICogQHJldHVybnMgeyhudW1iZXJ8Q29udHJvbGxlcil9IEN1cnJlbnQgc2Nyb2xsIHBvc2l0aW9uIG9yIHBhcmVudCBvYmplY3QgZm9yIGNoYWluaW5nLlxuXHRcdCAqL1xuXHRcdHRoaXMuc2Nyb2xsUG9zID0gZnVuY3Rpb24gKHNjcm9sbFBvc01ldGhvZCkge1xuXHRcdFx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IC8vIGdldFxuXHRcdFx0XHRyZXR1cm4gZ2V0U2Nyb2xsUG9zLmNhbGwoQ29udHJvbGxlcik7XG5cdFx0XHR9IGVsc2UgeyAvLyBzZXRcblx0XHRcdFx0aWYgKF91dGlsLnR5cGUuRnVuY3Rpb24oc2Nyb2xsUG9zTWV0aG9kKSkge1xuXHRcdFx0XHRcdGdldFNjcm9sbFBvcyA9IHNjcm9sbFBvc01ldGhvZDtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRsb2coMiwgXCJQcm92aWRlZCB2YWx1ZSBmb3IgbWV0aG9kICdzY3JvbGxQb3MnIGlzIG5vdCBhIGZ1bmN0aW9uLiBUbyBjaGFuZ2UgdGhlIGN1cnJlbnQgc2Nyb2xsIHBvc2l0aW9uIHVzZSAnc2Nyb2xsVG8oKScuXCIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gQ29udHJvbGxlcjtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogKipHZXQqKiBhbGwgaW5mb3Mgb3Igb25lIGluIHBhcnRpY3VsYXIgYWJvdXQgdGhlIGNvbnRyb2xsZXIuXG5cdFx0ICogQHB1YmxpY1xuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogLy8gcmV0dXJucyB0aGUgY3VycmVudCBzY3JvbGwgcG9zaXRpb24gKG51bWJlcilcblx0XHQgKiB2YXIgc2Nyb2xsUG9zID0gY29udHJvbGxlci5pbmZvKFwic2Nyb2xsUG9zXCIpO1xuXHRcdCAqXG5cdFx0ICogLy8gcmV0dXJucyBhbGwgaW5mb3MgYXMgYW4gb2JqZWN0XG5cdFx0ICogdmFyIGluZm9zID0gY29udHJvbGxlci5pbmZvKCk7XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gW2Fib3V0XSAtIElmIHBhc3NlZCBvbmx5IHRoaXMgaW5mbyB3aWxsIGJlIHJldHVybmVkIGluc3RlYWQgb2YgYW4gb2JqZWN0IGNvbnRhaW5pbmcgYWxsLiAgXG5cdFx0IFZhbGlkIG9wdGlvbnMgYXJlOlxuXHRcdCAqKiBgXCJzaXplXCJgID0+IHRoZSBjdXJyZW50IHZpZXdwb3J0IHNpemUgb2YgdGhlIGNvbnRhaW5lclxuXHRcdCAqKiBgXCJ2ZXJ0aWNhbFwiYCA9PiB0cnVlIGlmIHZlcnRpY2FsIHNjcm9sbGluZywgb3RoZXJ3aXNlIGZhbHNlXG5cdFx0ICoqIGBcInNjcm9sbFBvc1wiYCA9PiB0aGUgY3VycmVudCBzY3JvbGwgcG9zaXRpb25cblx0XHQgKiogYFwic2Nyb2xsRGlyZWN0aW9uXCJgID0+IHRoZSBsYXN0IGtub3duIGRpcmVjdGlvbiBvZiB0aGUgc2Nyb2xsXG5cdFx0ICoqIGBcImNvbnRhaW5lclwiYCA9PiB0aGUgY29udGFpbmVyIGVsZW1lbnRcblx0XHQgKiogYFwiaXNEb2N1bWVudFwiYCA9PiB0cnVlIGlmIGNvbnRhaW5lciBlbGVtZW50IGlzIHRoZSBkb2N1bWVudC5cblx0XHQgKiBAcmV0dXJucyB7KG1peGVkfG9iamVjdCl9IFRoZSByZXF1ZXN0ZWQgaW5mbyhzKS5cblx0XHQgKi9cblx0XHR0aGlzLmluZm8gPSBmdW5jdGlvbiAoYWJvdXQpIHtcblx0XHRcdHZhciB2YWx1ZXMgPSB7XG5cdFx0XHRcdHNpemU6IF92aWV3UG9ydFNpemUsXG5cdFx0XHRcdC8vIGNvbnRhaW5zIGhlaWdodCBvciB3aWR0aCAoaW4gcmVnYXJkIHRvIG9yaWVudGF0aW9uKTtcblx0XHRcdFx0dmVydGljYWw6IF9vcHRpb25zLnZlcnRpY2FsLFxuXHRcdFx0XHRzY3JvbGxQb3M6IF9zY3JvbGxQb3MsXG5cdFx0XHRcdHNjcm9sbERpcmVjdGlvbjogX3Njcm9sbERpcmVjdGlvbixcblx0XHRcdFx0Y29udGFpbmVyOiBfb3B0aW9ucy5jb250YWluZXIsXG5cdFx0XHRcdGlzRG9jdW1lbnQ6IF9pc0RvY3VtZW50XG5cdFx0XHR9O1xuXHRcdFx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IC8vIGdldCBhbGwgYXMgYW4gb2JqZWN0XG5cdFx0XHRcdHJldHVybiB2YWx1ZXM7XG5cdFx0XHR9IGVsc2UgaWYgKHZhbHVlc1thYm91dF0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRyZXR1cm4gdmFsdWVzW2Fib3V0XTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGxvZygxLCBcIkVSUk9SOiBvcHRpb24gXFxcIlwiICsgYWJvdXQgKyBcIlxcXCIgaXMgbm90IGF2YWlsYWJsZVwiKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiAqKkdldCoqIG9yICoqU2V0KiogdGhlIGN1cnJlbnQgbG9nbGV2ZWwgb3B0aW9uIHZhbHVlLlxuXHRcdCAqIEBwdWJsaWNcblx0XHQgKlxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogLy8gZ2V0IHRoZSBjdXJyZW50IHZhbHVlXG5cdFx0ICogdmFyIGxvZ2xldmVsID0gY29udHJvbGxlci5sb2dsZXZlbCgpO1xuXHRcdCAqXG5cdFx0ICogLy8gc2V0IGEgbmV3IHZhbHVlXG5cdFx0ICogY29udHJvbGxlci5sb2dsZXZlbCgzKTtcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7bnVtYmVyfSBbbmV3TG9nbGV2ZWxdIC0gVGhlIG5ldyBsb2dsZXZlbCBzZXR0aW5nIG9mIHRoZSBDb250cm9sbGVyLiBgWzAtM11gXG5cdFx0ICogQHJldHVybnMgeyhudW1iZXJ8Q29udHJvbGxlcil9IEN1cnJlbnQgbG9nbGV2ZWwgb3IgcGFyZW50IG9iamVjdCBmb3IgY2hhaW5pbmcuXG5cdFx0ICovXG5cdFx0dGhpcy5sb2dsZXZlbCA9IGZ1bmN0aW9uIChuZXdMb2dsZXZlbCkge1xuXHRcdFx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IC8vIGdldFxuXHRcdFx0XHRyZXR1cm4gX29wdGlvbnMubG9nbGV2ZWw7XG5cdFx0XHR9IGVsc2UgaWYgKF9vcHRpb25zLmxvZ2xldmVsICE9IG5ld0xvZ2xldmVsKSB7IC8vIHNldFxuXHRcdFx0XHRfb3B0aW9ucy5sb2dsZXZlbCA9IG5ld0xvZ2xldmVsO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIENvbnRyb2xsZXI7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqICoqR2V0Kiogb3IgKipTZXQqKiB0aGUgY3VycmVudCBlbmFibGVkIHN0YXRlIG9mIHRoZSBjb250cm9sbGVyLiAgXG5cdFx0ICogVGhpcyBjYW4gYmUgdXNlZCB0byBkaXNhYmxlIGFsbCBTY2VuZXMgY29ubmVjdGVkIHRvIHRoZSBjb250cm9sbGVyIHdpdGhvdXQgZGVzdHJveWluZyBvciByZW1vdmluZyB0aGVtLlxuXHRcdCAqIEBwdWJsaWNcblx0XHQgKlxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogLy8gZ2V0IHRoZSBjdXJyZW50IHZhbHVlXG5cdFx0ICogdmFyIGVuYWJsZWQgPSBjb250cm9sbGVyLmVuYWJsZWQoKTtcblx0XHQgKlxuXHRcdCAqIC8vIGRpc2FibGUgdGhlIGNvbnRyb2xsZXJcblx0XHQgKiBjb250cm9sbGVyLmVuYWJsZWQoZmFsc2UpO1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtib29sZWFufSBbbmV3U3RhdGVdIC0gVGhlIG5ldyBlbmFibGVkIHN0YXRlIG9mIHRoZSBjb250cm9sbGVyIGB0cnVlYCBvciBgZmFsc2VgLlxuXHRcdCAqIEByZXR1cm5zIHsoYm9vbGVhbnxDb250cm9sbGVyKX0gQ3VycmVudCBlbmFibGVkIHN0YXRlIG9yIHBhcmVudCBvYmplY3QgZm9yIGNoYWluaW5nLlxuXHRcdCAqL1xuXHRcdHRoaXMuZW5hYmxlZCA9IGZ1bmN0aW9uIChuZXdTdGF0ZSkge1xuXHRcdFx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IC8vIGdldFxuXHRcdFx0XHRyZXR1cm4gX2VuYWJsZWQ7XG5cdFx0XHR9IGVsc2UgaWYgKF9lbmFibGVkICE9IG5ld1N0YXRlKSB7IC8vIHNldFxuXHRcdFx0XHRfZW5hYmxlZCA9ICEhIG5ld1N0YXRlO1xuXHRcdFx0XHRDb250cm9sbGVyLnVwZGF0ZVNjZW5lKF9zY2VuZU9iamVjdHMsIHRydWUpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIENvbnRyb2xsZXI7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIERlc3Ryb3kgdGhlIENvbnRyb2xsZXIsIGFsbCBTY2VuZXMgYW5kIGV2ZXJ5dGhpbmcuXG5cdFx0ICogQHB1YmxpY1xuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiAvLyB3aXRob3V0IHJlc2V0dGluZyB0aGUgc2NlbmVzXG5cdFx0ICogY29udHJvbGxlciA9IGNvbnRyb2xsZXIuZGVzdHJveSgpO1xuXHRcdCAqXG5cdFx0ICogLy8gd2l0aCBzY2VuZSByZXNldFxuXHRcdCAqIGNvbnRyb2xsZXIgPSBjb250cm9sbGVyLmRlc3Ryb3kodHJ1ZSk7XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge2Jvb2xlYW59IFtyZXNldFNjZW5lcz1mYWxzZV0gLSBJZiBgdHJ1ZWAgdGhlIHBpbnMgYW5kIHR3ZWVucyAoaWYgZXhpc3RlbnQpIG9mIGFsbCBzY2VuZXMgd2lsbCBiZSByZXNldC5cblx0XHQgKiBAcmV0dXJucyB7bnVsbH0gTnVsbCB0byB1bnNldCBoYW5kbGVyIHZhcmlhYmxlcy5cblx0XHQgKi9cblx0XHR0aGlzLmRlc3Ryb3kgPSBmdW5jdGlvbiAocmVzZXRTY2VuZXMpIHtcblx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoX3JlZnJlc2hUaW1lb3V0KTtcblx0XHRcdHZhciBpID0gX3NjZW5lT2JqZWN0cy5sZW5ndGg7XG5cdFx0XHR3aGlsZSAoaS0tKSB7XG5cdFx0XHRcdF9zY2VuZU9iamVjdHNbaV0uZGVzdHJveShyZXNldFNjZW5lcyk7XG5cdFx0XHR9XG5cdFx0XHRfb3B0aW9ucy5jb250YWluZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCBvbkNoYW5nZSk7XG5cdFx0XHRfb3B0aW9ucy5jb250YWluZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLCBvbkNoYW5nZSk7XG5cdFx0XHRfdXRpbC5jQUYoX3VwZGF0ZVRpbWVvdXQpO1xuXHRcdFx0bG9nKDMsIFwiZGVzdHJveWVkIFwiICsgTkFNRVNQQUNFICsgXCIgKHJlc2V0OiBcIiArIChyZXNldFNjZW5lcyA/IFwidHJ1ZVwiIDogXCJmYWxzZVwiKSArIFwiKVwiKTtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH07XG5cblx0XHQvLyBJTklUXG5cdFx0Y29uc3RydWN0KCk7XG5cdFx0cmV0dXJuIENvbnRyb2xsZXI7XG5cdH07XG5cblx0Ly8gc3RvcmUgcGFnZXdpZGUgY29udHJvbGxlciBvcHRpb25zXG5cdHZhciBDT05UUk9MTEVSX09QVElPTlMgPSB7XG5cdFx0ZGVmYXVsdHM6IHtcblx0XHRcdGNvbnRhaW5lcjogd2luZG93LFxuXHRcdFx0dmVydGljYWw6IHRydWUsXG5cdFx0XHRnbG9iYWxTY2VuZU9wdGlvbnM6IHt9LFxuXHRcdFx0bG9nbGV2ZWw6IDIsXG5cdFx0XHRyZWZyZXNoSW50ZXJ2YWw6IDEwMFxuXHRcdH1cblx0fTtcbi8qXG4gKiBtZXRob2QgdXNlZCB0byBhZGQgYW4gb3B0aW9uIHRvIFNjcm9sbE1hZ2ljIFNjZW5lcy5cbiAqL1xuXHRTY3JvbGxNYWdpYy5Db250cm9sbGVyLmFkZE9wdGlvbiA9IGZ1bmN0aW9uIChuYW1lLCBkZWZhdWx0VmFsdWUpIHtcblx0XHRDT05UUk9MTEVSX09QVElPTlMuZGVmYXVsdHNbbmFtZV0gPSBkZWZhdWx0VmFsdWU7XG5cdH07XG5cdC8vIGluc3RhbmNlIGV4dGVuc2lvbiBmdW5jdGlvbiBmb3IgcGx1Z2luc1xuXHRTY3JvbGxNYWdpYy5Db250cm9sbGVyLmV4dGVuZCA9IGZ1bmN0aW9uIChleHRlbnNpb24pIHtcblx0XHR2YXIgb2xkQ2xhc3MgPSB0aGlzO1xuXHRcdFNjcm9sbE1hZ2ljLkNvbnRyb2xsZXIgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRvbGRDbGFzcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHRcdFx0dGhpcy4kc3VwZXIgPSBfdXRpbC5leHRlbmQoe30sIHRoaXMpOyAvLyBjb3B5IHBhcmVudCBzdGF0ZVxuXHRcdFx0cmV0dXJuIGV4dGVuc2lvbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpIHx8IHRoaXM7XG5cdFx0fTtcblx0XHRfdXRpbC5leHRlbmQoU2Nyb2xsTWFnaWMuQ29udHJvbGxlciwgb2xkQ2xhc3MpOyAvLyBjb3B5IHByb3BlcnRpZXNcblx0XHRTY3JvbGxNYWdpYy5Db250cm9sbGVyLnByb3RvdHlwZSA9IG9sZENsYXNzLnByb3RvdHlwZTsgLy8gY29weSBwcm90b3R5cGVcblx0XHRTY3JvbGxNYWdpYy5Db250cm9sbGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjcm9sbE1hZ2ljLkNvbnRyb2xsZXI7IC8vIHJlc3RvcmUgY29uc3RydWN0b3Jcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBBIFNjZW5lIGRlZmluZXMgd2hlcmUgdGhlIGNvbnRyb2xsZXIgc2hvdWxkIHJlYWN0IGFuZCBob3cuXG5cdCAqXG5cdCAqIEBjbGFzc1xuXHQgKlxuXHQgKiBAZXhhbXBsZVxuXHQgKiAvLyBjcmVhdGUgYSBzdGFuZGFyZCBzY2VuZSBhbmQgYWRkIGl0IHRvIGEgY29udHJvbGxlclxuXHQgKiBuZXcgU2Nyb2xsTWFnaWMuU2NlbmUoKVxuXHQgKlx0XHQuYWRkVG8oY29udHJvbGxlcik7XG5cdCAqXG5cdCAqIC8vIGNyZWF0ZSBhIHNjZW5lIHdpdGggY3VzdG9tIG9wdGlvbnMgYW5kIGFzc2lnbiBhIGhhbmRsZXIgdG8gaXQuXG5cdCAqIHZhciBzY2VuZSA9IG5ldyBTY3JvbGxNYWdpYy5TY2VuZSh7XG5cdCAqIFx0XHRkdXJhdGlvbjogMTAwLFxuXHQgKlx0XHRvZmZzZXQ6IDIwMCxcblx0ICpcdFx0dHJpZ2dlckhvb2s6IFwib25FbnRlclwiLFxuXHQgKlx0XHRyZXZlcnNlOiBmYWxzZVxuXHQgKiB9KTtcblx0ICpcblx0ICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXSAtIE9wdGlvbnMgZm9yIHRoZSBTY2VuZS4gVGhlIG9wdGlvbnMgY2FuIGJlIHVwZGF0ZWQgYXQgYW55IHRpbWUuICBcblx0IEluc3RlYWQgb2Ygc2V0dGluZyB0aGUgb3B0aW9ucyBmb3IgZWFjaCBzY2VuZSBpbmRpdmlkdWFsbHkgeW91IGNhbiBhbHNvIHNldCB0aGVtIGdsb2JhbGx5IGluIHRoZSBjb250cm9sbGVyIGFzIHRoZSBjb250cm9sbGVycyBgZ2xvYmFsU2NlbmVPcHRpb25zYCBvcHRpb24uIFRoZSBvYmplY3QgYWNjZXB0cyB0aGUgc2FtZSBwcm9wZXJ0aWVzIGFzIHRoZSBvbmVzIGJlbG93LiAgXG5cdCBXaGVuIGEgc2NlbmUgaXMgYWRkZWQgdG8gdGhlIGNvbnRyb2xsZXIgdGhlIG9wdGlvbnMgZGVmaW5lZCB1c2luZyB0aGUgU2NlbmUgY29uc3RydWN0b3Igd2lsbCBiZSBvdmVyd3JpdHRlbiBieSB0aG9zZSBzZXQgaW4gYGdsb2JhbFNjZW5lT3B0aW9uc2AuXG5cdCAqIEBwYXJhbSB7KG51bWJlcnxmdW5jdGlvbil9IFtvcHRpb25zLmR1cmF0aW9uPTBdIC0gVGhlIGR1cmF0aW9uIG9mIHRoZSBzY2VuZS4gXG5cdCBJZiBgMGAgdHdlZW5zIHdpbGwgYXV0by1wbGF5IHdoZW4gcmVhY2hpbmcgdGhlIHNjZW5lIHN0YXJ0IHBvaW50LCBwaW5zIHdpbGwgYmUgcGlubmVkIGluZGVmaW5ldGx5IHN0YXJ0aW5nIGF0IHRoZSBzdGFydCBwb3NpdGlvbi4gIFxuXHQgQSBmdW5jdGlvbiByZXR1bmluZyB0aGUgZHVyYXRpb24gdmFsdWUgaXMgYWxzbyBzdXBwb3J0ZWQuIFBsZWFzZSBzZWUgYFNjZW5lLmR1cmF0aW9uKClgIGZvciBkZXRhaWxzLlxuXHQgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMub2Zmc2V0PTBdIC0gT2Zmc2V0IFZhbHVlIGZvciB0aGUgVHJpZ2dlciBQb3NpdGlvbi4gSWYgbm8gdHJpZ2dlckVsZW1lbnQgaXMgZGVmaW5lZCB0aGlzIHdpbGwgYmUgdGhlIHNjcm9sbCBkaXN0YW5jZSBmcm9tIHRoZSBzdGFydCBvZiB0aGUgcGFnZSwgYWZ0ZXIgd2hpY2ggdGhlIHNjZW5lIHdpbGwgc3RhcnQuXG5cdCAqIEBwYXJhbSB7KHN0cmluZ3xvYmplY3QpfSBbb3B0aW9ucy50cmlnZ2VyRWxlbWVudD1udWxsXSAtIFNlbGVjdG9yIG9yIERPTSBvYmplY3QgdGhhdCBkZWZpbmVzIHRoZSBzdGFydCBvZiB0aGUgc2NlbmUuIElmIHVuZGVmaW5lZCB0aGUgc2NlbmUgd2lsbCBzdGFydCByaWdodCBhdCB0aGUgc3RhcnQgb2YgdGhlIHBhZ2UgKHVubGVzcyBhbiBvZmZzZXQgaXMgc2V0KS5cblx0ICogQHBhcmFtIHsobnVtYmVyfHN0cmluZyl9IFtvcHRpb25zLnRyaWdnZXJIb29rPVwib25DZW50ZXJcIl0gLSBDYW4gYmUgYSBudW1iZXIgYmV0d2VlbiAwIGFuZCAxIGRlZmluaW5nIHRoZSBwb3NpdGlvbiBvZiB0aGUgdHJpZ2dlciBIb29rIGluIHJlbGF0aW9uIHRvIHRoZSB2aWV3cG9ydC4gIFxuXHQgQ2FuIGFsc28gYmUgZGVmaW5lZCB1c2luZyBhIHN0cmluZzpcblx0ICoqIGBcIm9uRW50ZXJcImAgPT4gYDFgXG5cdCAqKiBgXCJvbkNlbnRlclwiYCA9PiBgMC41YFxuXHQgKiogYFwib25MZWF2ZVwiYCA9PiBgMGBcblx0ICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5yZXZlcnNlPXRydWVdIC0gU2hvdWxkIHRoZSBzY2VuZSByZXZlcnNlLCB3aGVuIHNjcm9sbGluZyB1cD9cblx0ICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLmxvZ2xldmVsPTJdIC0gTG9nbGV2ZWwgZm9yIGRlYnVnZ2luZy4gTm90ZSB0aGF0IGxvZ2dpbmcgaXMgZGlzYWJsZWQgaW4gdGhlIG1pbmlmaWVkIHZlcnNpb24gb2YgU2Nyb2xsTWFnaWMuXG5cdCAqKiBgMGAgPT4gc2lsZW50XG5cdCAqKiBgMWAgPT4gZXJyb3JzXG5cdCAqKiBgMmAgPT4gZXJyb3JzLCB3YXJuaW5nc1xuXHQgKiogYDNgID0+IGVycm9ycywgd2FybmluZ3MsIGRlYnVnaW5mb1xuXHQgKiBcblx0ICovXG5cdFNjcm9sbE1hZ2ljLlNjZW5lID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcblxuLypcblx0ICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQgKiBzZXR0aW5nc1xuXHQgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdCAqL1xuXG5cdFx0dmFyXG5cdFx0TkFNRVNQQUNFID0gJ1Njcm9sbE1hZ2ljLlNjZW5lJyxcblx0XHRcdFNDRU5FX1NUQVRFX0JFRk9SRSA9ICdCRUZPUkUnLFxuXHRcdFx0U0NFTkVfU1RBVEVfRFVSSU5HID0gJ0RVUklORycsXG5cdFx0XHRTQ0VORV9TVEFURV9BRlRFUiA9ICdBRlRFUicsXG5cdFx0XHRERUZBVUxUX09QVElPTlMgPSBTQ0VORV9PUFRJT05TLmRlZmF1bHRzO1xuXG4vKlxuXHQgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdCAqIHByaXZhdGUgdmFyc1xuXHQgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdCAqL1xuXG5cdFx0dmFyXG5cdFx0U2NlbmUgPSB0aGlzLFxuXHRcdFx0X29wdGlvbnMgPSBfdXRpbC5leHRlbmQoe30sIERFRkFVTFRfT1BUSU9OUywgb3B0aW9ucyksXG5cdFx0XHRfc3RhdGUgPSBTQ0VORV9TVEFURV9CRUZPUkUsXG5cdFx0XHRfcHJvZ3Jlc3MgPSAwLFxuXHRcdFx0X3Njcm9sbE9mZnNldCA9IHtcblx0XHRcdFx0c3RhcnQ6IDAsXG5cdFx0XHRcdGVuZDogMFxuXHRcdFx0fSxcblx0XHRcdC8vIHJlZmxlY3RzIHRoZSBjb250cm9sbGVycydzIHNjcm9sbCBwb3NpdGlvbiBmb3IgdGhlIHN0YXJ0IGFuZCBlbmQgb2YgdGhlIHNjZW5lIHJlc3BlY3RpdmVseVxuXHRcdFx0X3RyaWdnZXJQb3MgPSAwLFxuXHRcdFx0X2VuYWJsZWQgPSB0cnVlLFxuXHRcdFx0X2R1cmF0aW9uVXBkYXRlTWV0aG9kLCBfY29udHJvbGxlcjtcblxuXHRcdC8qKlxuXHRcdCAqIEludGVybmFsIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIG9mIHRoZSBTY3JvbGxNYWdpYyBTY2VuZVxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0dmFyIGNvbnN0cnVjdCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdGZvciAodmFyIGtleSBpbiBfb3B0aW9ucykgeyAvLyBjaGVjayBzdXBwbGllZCBvcHRpb25zXG5cdFx0XHRcdGlmICghREVGQVVMVF9PUFRJT05TLmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdFx0XHRsb2coMiwgXCJXQVJOSU5HOiBVbmtub3duIG9wdGlvbiBcXFwiXCIgKyBrZXkgKyBcIlxcXCJcIik7XG5cdFx0XHRcdFx0ZGVsZXRlIF9vcHRpb25zW2tleV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdC8vIGFkZCBnZXR0ZXJzL3NldHRlcnMgZm9yIGFsbCBwb3NzaWJsZSBvcHRpb25zXG5cdFx0XHRmb3IgKHZhciBvcHRpb25OYW1lIGluIERFRkFVTFRfT1BUSU9OUykge1xuXHRcdFx0XHRhZGRTY2VuZU9wdGlvbihvcHRpb25OYW1lKTtcblx0XHRcdH1cblx0XHRcdC8vIHZhbGlkYXRlIGFsbCBvcHRpb25zXG5cdFx0XHR2YWxpZGF0ZU9wdGlvbigpO1xuXHRcdH07XG5cbi8qXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBFdmVudCBNYW5hZ2VtZW50XG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKi9cblxuXHRcdHZhciBfbGlzdGVuZXJzID0ge307XG5cdFx0LyoqXG5cdFx0ICogU2NlbmUgc3RhcnQgZXZlbnQuICBcblx0XHQgKiBGaXJlcyB3aGVuZXZlciB0aGUgc2Nyb2xsIHBvc2l0aW9uIGl0cyB0aGUgc3RhcnRpbmcgcG9pbnQgb2YgdGhlIHNjZW5lLiAgXG5cdFx0ICogSXQgd2lsbCBhbHNvIGZpcmUgd2hlbiBzY3JvbGxpbmcgYmFjayB1cCBnb2luZyBvdmVyIHRoZSBzdGFydCBwb3NpdGlvbiBvZiB0aGUgc2NlbmUuIElmIHlvdSB3YW50IHNvbWV0aGluZyB0byBoYXBwZW4gb25seSB3aGVuIHNjcm9sbGluZyBkb3duL3JpZ2h0LCB1c2UgdGhlIHNjcm9sbERpcmVjdGlvbiBwYXJhbWV0ZXIgcGFzc2VkIHRvIHRoZSBjYWxsYmFjay5cblx0XHQgKlxuXHRcdCAqIEZvciBkZXRhaWxzIG9uIHRoaXMgZXZlbnQgYW5kIHRoZSBvcmRlciBpbiB3aGljaCBpdCBpcyBmaXJlZCwgcGxlYXNlIHJldmlldyB0aGUge0BsaW5rIFNjZW5lLnByb2dyZXNzfSBtZXRob2QuXG5cdFx0ICpcblx0XHQgKiBAZXZlbnQgU2Nyb2xsTWFnaWMuU2NlbmUjc3RhcnRcblx0XHQgKlxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogc2NlbmUub24oXCJzdGFydFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHQgKiBcdGNvbnNvbGUubG9nKFwiSGl0IHN0YXJ0IHBvaW50IG9mIHNjZW5lLlwiKTtcblx0XHQgKiB9KTtcblx0XHQgKlxuXHRcdCAqIEBwcm9wZXJ0eSB7b2JqZWN0fSBldmVudCAtIFRoZSBldmVudCBPYmplY3QgcGFzc2VkIHRvIGVhY2ggY2FsbGJhY2tcblx0XHQgKiBAcHJvcGVydHkge3N0cmluZ30gZXZlbnQudHlwZSAtIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuXHRcdCAqIEBwcm9wZXJ0eSB7U2NlbmV9IGV2ZW50LnRhcmdldCAtIFRoZSBTY2VuZSBvYmplY3QgdGhhdCB0cmlnZ2VyZWQgdGhpcyBldmVudFxuXHRcdCAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBldmVudC5wcm9ncmVzcyAtIFJlZmxlY3RzIHRoZSBjdXJyZW50IHByb2dyZXNzIG9mIHRoZSBzY2VuZVxuXHRcdCAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBldmVudC5zdGF0ZSAtIFRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSBzY2VuZSBgXCJCRUZPUkVcImAgb3IgYFwiRFVSSU5HXCJgXG5cdFx0ICogQHByb3BlcnR5IHtzdHJpbmd9IGV2ZW50LnNjcm9sbERpcmVjdGlvbiAtIEluZGljYXRlcyB3aGljaCB3YXkgd2UgYXJlIHNjcm9sbGluZyBgXCJQQVVTRURcImAsIGBcIkZPUldBUkRcImAgb3IgYFwiUkVWRVJTRVwiYFxuXHRcdCAqL1xuXHRcdC8qKlxuXHRcdCAqIFNjZW5lIGVuZCBldmVudC4gIFxuXHRcdCAqIEZpcmVzIHdoZW5ldmVyIHRoZSBzY3JvbGwgcG9zaXRpb24gaXRzIHRoZSBlbmRpbmcgcG9pbnQgb2YgdGhlIHNjZW5lLiAgXG5cdFx0ICogSXQgd2lsbCBhbHNvIGZpcmUgd2hlbiBzY3JvbGxpbmcgYmFjayB1cCBmcm9tIGFmdGVyIHRoZSBzY2VuZSBhbmQgZ29pbmcgb3ZlciBpdHMgZW5kIHBvc2l0aW9uLiBJZiB5b3Ugd2FudCBzb21ldGhpbmcgdG8gaGFwcGVuIG9ubHkgd2hlbiBzY3JvbGxpbmcgZG93bi9yaWdodCwgdXNlIHRoZSBzY3JvbGxEaXJlY3Rpb24gcGFyYW1ldGVyIHBhc3NlZCB0byB0aGUgY2FsbGJhY2suXG5cdFx0ICpcblx0XHQgKiBGb3IgZGV0YWlscyBvbiB0aGlzIGV2ZW50IGFuZCB0aGUgb3JkZXIgaW4gd2hpY2ggaXQgaXMgZmlyZWQsIHBsZWFzZSByZXZpZXcgdGhlIHtAbGluayBTY2VuZS5wcm9ncmVzc30gbWV0aG9kLlxuXHRcdCAqXG5cdFx0ICogQGV2ZW50IFNjcm9sbE1hZ2ljLlNjZW5lI2VuZFxuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiBzY2VuZS5vbihcImVuZFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHQgKiBcdGNvbnNvbGUubG9nKFwiSGl0IGVuZCBwb2ludCBvZiBzY2VuZS5cIik7XG5cdFx0ICogfSk7XG5cdFx0ICpcblx0XHQgKiBAcHJvcGVydHkge29iamVjdH0gZXZlbnQgLSBUaGUgZXZlbnQgT2JqZWN0IHBhc3NlZCB0byBlYWNoIGNhbGxiYWNrXG5cdFx0ICogQHByb3BlcnR5IHtzdHJpbmd9IGV2ZW50LnR5cGUgLSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcblx0XHQgKiBAcHJvcGVydHkge1NjZW5lfSBldmVudC50YXJnZXQgLSBUaGUgU2NlbmUgb2JqZWN0IHRoYXQgdHJpZ2dlcmVkIHRoaXMgZXZlbnRcblx0XHQgKiBAcHJvcGVydHkge251bWJlcn0gZXZlbnQucHJvZ3Jlc3MgLSBSZWZsZWN0cyB0aGUgY3VycmVudCBwcm9ncmVzcyBvZiB0aGUgc2NlbmVcblx0XHQgKiBAcHJvcGVydHkge3N0cmluZ30gZXZlbnQuc3RhdGUgLSBUaGUgY3VycmVudCBzdGF0ZSBvZiB0aGUgc2NlbmUgYFwiRFVSSU5HXCJgIG9yIGBcIkFGVEVSXCJgXG5cdFx0ICogQHByb3BlcnR5IHtzdHJpbmd9IGV2ZW50LnNjcm9sbERpcmVjdGlvbiAtIEluZGljYXRlcyB3aGljaCB3YXkgd2UgYXJlIHNjcm9sbGluZyBgXCJQQVVTRURcImAsIGBcIkZPUldBUkRcImAgb3IgYFwiUkVWRVJTRVwiYFxuXHRcdCAqL1xuXHRcdC8qKlxuXHRcdCAqIFNjZW5lIGVudGVyIGV2ZW50LiAgXG5cdFx0ICogRmlyZXMgd2hlbmV2ZXIgdGhlIHNjZW5lIGVudGVycyB0aGUgXCJEVVJJTkdcIiBzdGF0ZS4gIFxuXHRcdCAqIEtlZXAgaW4gbWluZCB0aGF0IGl0IGRvZXNuJ3QgbWF0dGVyIGlmIHRoZSBzY2VuZSBwbGF5cyBmb3J3YXJkIG9yIGJhY2t3YXJkOiBUaGlzIGV2ZW50IGFsd2F5cyBmaXJlcyB3aGVuIHRoZSBzY2VuZSBlbnRlcnMgaXRzIGFjdGl2ZSBzY3JvbGwgdGltZWZyYW1lLCByZWdhcmRsZXNzIG9mIHRoZSBzY3JvbGwtZGlyZWN0aW9uLlxuXHRcdCAqXG5cdFx0ICogRm9yIGRldGFpbHMgb24gdGhpcyBldmVudCBhbmQgdGhlIG9yZGVyIGluIHdoaWNoIGl0IGlzIGZpcmVkLCBwbGVhc2UgcmV2aWV3IHRoZSB7QGxpbmsgU2NlbmUucHJvZ3Jlc3N9IG1ldGhvZC5cblx0XHQgKlxuXHRcdCAqIEBldmVudCBTY3JvbGxNYWdpYy5TY2VuZSNlbnRlclxuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiBzY2VuZS5vbihcImVudGVyXCIsIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdCAqIFx0Y29uc29sZS5sb2coXCJTY2VuZSBlbnRlcmVkLlwiKTtcblx0XHQgKiB9KTtcblx0XHQgKlxuXHRcdCAqIEBwcm9wZXJ0eSB7b2JqZWN0fSBldmVudCAtIFRoZSBldmVudCBPYmplY3QgcGFzc2VkIHRvIGVhY2ggY2FsbGJhY2tcblx0XHQgKiBAcHJvcGVydHkge3N0cmluZ30gZXZlbnQudHlwZSAtIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuXHRcdCAqIEBwcm9wZXJ0eSB7U2NlbmV9IGV2ZW50LnRhcmdldCAtIFRoZSBTY2VuZSBvYmplY3QgdGhhdCB0cmlnZ2VyZWQgdGhpcyBldmVudFxuXHRcdCAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBldmVudC5wcm9ncmVzcyAtIFJlZmxlY3RzIHRoZSBjdXJyZW50IHByb2dyZXNzIG9mIHRoZSBzY2VuZVxuXHRcdCAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBldmVudC5zdGF0ZSAtIFRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSBzY2VuZSAtIGFsd2F5cyBgXCJEVVJJTkdcImBcblx0XHQgKiBAcHJvcGVydHkge3N0cmluZ30gZXZlbnQuc2Nyb2xsRGlyZWN0aW9uIC0gSW5kaWNhdGVzIHdoaWNoIHdheSB3ZSBhcmUgc2Nyb2xsaW5nIGBcIlBBVVNFRFwiYCwgYFwiRk9SV0FSRFwiYCBvciBgXCJSRVZFUlNFXCJgXG5cdFx0ICovXG5cdFx0LyoqXG5cdFx0ICogU2NlbmUgbGVhdmUgZXZlbnQuICBcblx0XHQgKiBGaXJlcyB3aGVuZXZlciB0aGUgc2NlbmUncyBzdGF0ZSBnb2VzIGZyb20gXCJEVVJJTkdcIiB0byBlaXRoZXIgXCJCRUZPUkVcIiBvciBcIkFGVEVSXCIuICBcblx0XHQgKiBLZWVwIGluIG1pbmQgdGhhdCBpdCBkb2Vzbid0IG1hdHRlciBpZiB0aGUgc2NlbmUgcGxheXMgZm9yd2FyZCBvciBiYWNrd2FyZDogVGhpcyBldmVudCBhbHdheXMgZmlyZXMgd2hlbiB0aGUgc2NlbmUgbGVhdmVzIGl0cyBhY3RpdmUgc2Nyb2xsIHRpbWVmcmFtZSwgcmVnYXJkbGVzcyBvZiB0aGUgc2Nyb2xsLWRpcmVjdGlvbi5cblx0XHQgKlxuXHRcdCAqIEZvciBkZXRhaWxzIG9uIHRoaXMgZXZlbnQgYW5kIHRoZSBvcmRlciBpbiB3aGljaCBpdCBpcyBmaXJlZCwgcGxlYXNlIHJldmlldyB0aGUge0BsaW5rIFNjZW5lLnByb2dyZXNzfSBtZXRob2QuXG5cdFx0ICpcblx0XHQgKiBAZXZlbnQgU2Nyb2xsTWFnaWMuU2NlbmUjbGVhdmVcblx0XHQgKlxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogc2NlbmUub24oXCJsZWF2ZVwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHQgKiBcdGNvbnNvbGUubG9nKFwiU2NlbmUgbGVmdC5cIik7XG5cdFx0ICogfSk7XG5cdFx0ICpcblx0XHQgKiBAcHJvcGVydHkge29iamVjdH0gZXZlbnQgLSBUaGUgZXZlbnQgT2JqZWN0IHBhc3NlZCB0byBlYWNoIGNhbGxiYWNrXG5cdFx0ICogQHByb3BlcnR5IHtzdHJpbmd9IGV2ZW50LnR5cGUgLSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcblx0XHQgKiBAcHJvcGVydHkge1NjZW5lfSBldmVudC50YXJnZXQgLSBUaGUgU2NlbmUgb2JqZWN0IHRoYXQgdHJpZ2dlcmVkIHRoaXMgZXZlbnRcblx0XHQgKiBAcHJvcGVydHkge251bWJlcn0gZXZlbnQucHJvZ3Jlc3MgLSBSZWZsZWN0cyB0aGUgY3VycmVudCBwcm9ncmVzcyBvZiB0aGUgc2NlbmVcblx0XHQgKiBAcHJvcGVydHkge3N0cmluZ30gZXZlbnQuc3RhdGUgLSBUaGUgY3VycmVudCBzdGF0ZSBvZiB0aGUgc2NlbmUgYFwiQkVGT1JFXCJgIG9yIGBcIkFGVEVSXCJgXG5cdFx0ICogQHByb3BlcnR5IHtzdHJpbmd9IGV2ZW50LnNjcm9sbERpcmVjdGlvbiAtIEluZGljYXRlcyB3aGljaCB3YXkgd2UgYXJlIHNjcm9sbGluZyBgXCJQQVVTRURcImAsIGBcIkZPUldBUkRcImAgb3IgYFwiUkVWRVJTRVwiYFxuXHRcdCAqL1xuXHRcdC8qKlxuXHRcdCAqIFNjZW5lIHVwZGF0ZSBldmVudC4gIFxuXHRcdCAqIEZpcmVzIHdoZW5ldmVyIHRoZSBzY2VuZSBpcyB1cGRhdGVkIChidXQgbm90IG5lY2Vzc2FyaWx5IGNoYW5nZXMgdGhlIHByb2dyZXNzKS5cblx0XHQgKlxuXHRcdCAqIEBldmVudCBTY3JvbGxNYWdpYy5TY2VuZSN1cGRhdGVcblx0XHQgKlxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogc2NlbmUub24oXCJ1cGRhdGVcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0ICogXHRjb25zb2xlLmxvZyhcIlNjZW5lIHVwZGF0ZWQuXCIpO1xuXHRcdCAqIH0pO1xuXHRcdCAqXG5cdFx0ICogQHByb3BlcnR5IHtvYmplY3R9IGV2ZW50IC0gVGhlIGV2ZW50IE9iamVjdCBwYXNzZWQgdG8gZWFjaCBjYWxsYmFja1xuXHRcdCAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBldmVudC50eXBlIC0gVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG5cdFx0ICogQHByb3BlcnR5IHtTY2VuZX0gZXZlbnQudGFyZ2V0IC0gVGhlIFNjZW5lIG9iamVjdCB0aGF0IHRyaWdnZXJlZCB0aGlzIGV2ZW50XG5cdFx0ICogQHByb3BlcnR5IHtudW1iZXJ9IGV2ZW50LnN0YXJ0UG9zIC0gVGhlIHN0YXJ0aW5nIHBvc2l0aW9uIG9mIHRoZSBzY2VuZSAoaW4gcmVsYXRpb24gdG8gdGhlIGNvbmFpbmVyKVxuXHRcdCAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBldmVudC5lbmRQb3MgLSBUaGUgZW5kaW5nIHBvc2l0aW9uIG9mIHRoZSBzY2VuZSAoaW4gcmVsYXRpb24gdG8gdGhlIGNvbmFpbmVyKVxuXHRcdCAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBldmVudC5zY3JvbGxQb3MgLSBUaGUgY3VycmVudCBzY3JvbGwgcG9zaXRpb24gb2YgdGhlIGNvbnRhaW5lclxuXHRcdCAqL1xuXHRcdC8qKlxuXHRcdCAqIFNjZW5lIHByb2dyZXNzIGV2ZW50LiAgXG5cdFx0ICogRmlyZXMgd2hlbmV2ZXIgdGhlIHByb2dyZXNzIG9mIHRoZSBzY2VuZSBjaGFuZ2VzLlxuXHRcdCAqXG5cdFx0ICogRm9yIGRldGFpbHMgb24gdGhpcyBldmVudCBhbmQgdGhlIG9yZGVyIGluIHdoaWNoIGl0IGlzIGZpcmVkLCBwbGVhc2UgcmV2aWV3IHRoZSB7QGxpbmsgU2NlbmUucHJvZ3Jlc3N9IG1ldGhvZC5cblx0XHQgKlxuXHRcdCAqIEBldmVudCBTY3JvbGxNYWdpYy5TY2VuZSNwcm9ncmVzc1xuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiBzY2VuZS5vbihcInByb2dyZXNzXCIsIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdCAqIFx0Y29uc29sZS5sb2coXCJTY2VuZSBwcm9ncmVzcyBjaGFuZ2VkIHRvIFwiICsgZXZlbnQucHJvZ3Jlc3MpO1xuXHRcdCAqIH0pO1xuXHRcdCAqXG5cdFx0ICogQHByb3BlcnR5IHtvYmplY3R9IGV2ZW50IC0gVGhlIGV2ZW50IE9iamVjdCBwYXNzZWQgdG8gZWFjaCBjYWxsYmFja1xuXHRcdCAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBldmVudC50eXBlIC0gVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG5cdFx0ICogQHByb3BlcnR5IHtTY2VuZX0gZXZlbnQudGFyZ2V0IC0gVGhlIFNjZW5lIG9iamVjdCB0aGF0IHRyaWdnZXJlZCB0aGlzIGV2ZW50XG5cdFx0ICogQHByb3BlcnR5IHtudW1iZXJ9IGV2ZW50LnByb2dyZXNzIC0gUmVmbGVjdHMgdGhlIGN1cnJlbnQgcHJvZ3Jlc3Mgb2YgdGhlIHNjZW5lXG5cdFx0ICogQHByb3BlcnR5IHtzdHJpbmd9IGV2ZW50LnN0YXRlIC0gVGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlIHNjZW5lIGBcIkJFRk9SRVwiYCwgYFwiRFVSSU5HXCJgIG9yIGBcIkFGVEVSXCJgXG5cdFx0ICogQHByb3BlcnR5IHtzdHJpbmd9IGV2ZW50LnNjcm9sbERpcmVjdGlvbiAtIEluZGljYXRlcyB3aGljaCB3YXkgd2UgYXJlIHNjcm9sbGluZyBgXCJQQVVTRURcImAsIGBcIkZPUldBUkRcImAgb3IgYFwiUkVWRVJTRVwiYFxuXHRcdCAqL1xuXHRcdC8qKlxuXHRcdCAqIFNjZW5lIGNoYW5nZSBldmVudC4gIFxuXHRcdCAqIEZpcmVzIHdoZW52ZXZlciBhIHByb3BlcnR5IG9mIHRoZSBzY2VuZSBpcyBjaGFuZ2VkLlxuXHRcdCAqXG5cdFx0ICogQGV2ZW50IFNjcm9sbE1hZ2ljLlNjZW5lI2NoYW5nZVxuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiBzY2VuZS5vbihcImNoYW5nZVwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHQgKiBcdGNvbnNvbGUubG9nKFwiU2NlbmUgUHJvcGVydHkgXFxcIlwiICsgZXZlbnQud2hhdCArIFwiXFxcIiBjaGFuZ2VkIHRvIFwiICsgZXZlbnQubmV3dmFsKTtcblx0XHQgKiB9KTtcblx0XHQgKlxuXHRcdCAqIEBwcm9wZXJ0eSB7b2JqZWN0fSBldmVudCAtIFRoZSBldmVudCBPYmplY3QgcGFzc2VkIHRvIGVhY2ggY2FsbGJhY2tcblx0XHQgKiBAcHJvcGVydHkge3N0cmluZ30gZXZlbnQudHlwZSAtIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuXHRcdCAqIEBwcm9wZXJ0eSB7U2NlbmV9IGV2ZW50LnRhcmdldCAtIFRoZSBTY2VuZSBvYmplY3QgdGhhdCB0cmlnZ2VyZWQgdGhpcyBldmVudFxuXHRcdCAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBldmVudC53aGF0IC0gSW5kaWNhdGVzIHdoYXQgdmFsdWUgaGFzIGJlZW4gY2hhbmdlZFxuXHRcdCAqIEBwcm9wZXJ0eSB7bWl4ZWR9IGV2ZW50Lm5ld3ZhbCAtIFRoZSBuZXcgdmFsdWUgb2YgdGhlIGNoYW5nZWQgcHJvcGVydHlcblx0XHQgKi9cblx0XHQvKipcblx0XHQgKiBTY2VuZSBzaGlmdCBldmVudC4gIFxuXHRcdCAqIEZpcmVzIHdoZW52ZXZlciB0aGUgc3RhcnQgb3IgZW5kICoqc2Nyb2xsIG9mZnNldCoqIG9mIHRoZSBzY2VuZSBjaGFuZ2UuXG5cdFx0ICogVGhpcyBoYXBwZW5zIGV4cGxpY2l0ZWx5LCB3aGVuIG9uZSBvZiB0aGVzZSB2YWx1ZXMgY2hhbmdlOiBgb2Zmc2V0YCwgYGR1cmF0aW9uYCBvciBgdHJpZ2dlckhvb2tgLlxuXHRcdCAqIEl0IHdpbGwgZmlyZSBpbXBsaWNpdGx5IHdoZW4gdGhlIGB0cmlnZ2VyRWxlbWVudGAgY2hhbmdlcywgaWYgdGhlIG5ldyBlbGVtZW50IGhhcyBhIGRpZmZlcmVudCBwb3NpdGlvbiAobW9zdCBjYXNlcykuXG5cdFx0ICogSXQgd2lsbCBhbHNvIGZpcmUgaW1wbGljaXRseSB3aGVuIHRoZSBzaXplIG9mIHRoZSBjb250YWluZXIgY2hhbmdlcyBhbmQgdGhlIHRyaWdnZXJIb29rIGlzIGFueXRoaW5nIG90aGVyIHRoYW4gYG9uTGVhdmVgLlxuXHRcdCAqXG5cdFx0ICogQGV2ZW50IFNjcm9sbE1hZ2ljLlNjZW5lI3NoaWZ0XG5cdFx0ICogQHNpbmNlIDEuMS4wXG5cdFx0ICpcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIHNjZW5lLm9uKFwic2hpZnRcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0ICogXHRjb25zb2xlLmxvZyhcIlNjZW5lIG1vdmVkLCBiZWNhdXNlIHRoZSBcIiArIGV2ZW50LnJlYXNvbiArIFwiIGhhcyBjaGFuZ2VkLilcIik7XG5cdFx0ICogfSk7XG5cdFx0ICpcblx0XHQgKiBAcHJvcGVydHkge29iamVjdH0gZXZlbnQgLSBUaGUgZXZlbnQgT2JqZWN0IHBhc3NlZCB0byBlYWNoIGNhbGxiYWNrXG5cdFx0ICogQHByb3BlcnR5IHtzdHJpbmd9IGV2ZW50LnR5cGUgLSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcblx0XHQgKiBAcHJvcGVydHkge1NjZW5lfSBldmVudC50YXJnZXQgLSBUaGUgU2NlbmUgb2JqZWN0IHRoYXQgdHJpZ2dlcmVkIHRoaXMgZXZlbnRcblx0XHQgKiBAcHJvcGVydHkge3N0cmluZ30gZXZlbnQucmVhc29uIC0gSW5kaWNhdGVzIHdoeSB0aGUgc2NlbmUgaGFzIHNoaWZ0ZWRcblx0XHQgKi9cblx0XHQvKipcblx0XHQgKiBTY2VuZSBkZXN0cm95IGV2ZW50LiAgXG5cdFx0ICogRmlyZXMgd2hlbnZldmVyIHRoZSBzY2VuZSBpcyBkZXN0cm95ZWQuXG5cdFx0ICogVGhpcyBjYW4gYmUgdXNlZCB0byB0aWR5IHVwIGN1c3RvbSBiZWhhdmlvdXIgdXNlZCBpbiBldmVudHMuXG5cdFx0ICpcblx0XHQgKiBAZXZlbnQgU2Nyb2xsTWFnaWMuU2NlbmUjZGVzdHJveVxuXHRcdCAqIEBzaW5jZSAxLjEuMFxuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiBzY2VuZS5vbihcImVudGVyXCIsIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdCAqICAgICAgICAvLyBhZGQgY3VzdG9tIGFjdGlvblxuXHRcdCAqICAgICAgICAkKFwiI215LWVsZW1cIikubGVmdChcIjIwMFwiKTtcblx0XHQgKiAgICAgIH0pXG5cdFx0ICogICAgICAub24oXCJkZXN0cm95XCIsIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdCAqICAgICAgICAvLyByZXNldCBteSBlbGVtZW50IHRvIHN0YXJ0IHBvc2l0aW9uXG5cdFx0ICogICAgICAgIGlmIChldmVudC5yZXNldCkge1xuXHRcdCAqICAgICAgICAgICQoXCIjbXktZWxlbVwiKS5sZWZ0KFwiMFwiKTtcblx0XHQgKiAgICAgICAgfVxuXHRcdCAqICAgICAgfSk7XG5cdFx0ICpcblx0XHQgKiBAcHJvcGVydHkge29iamVjdH0gZXZlbnQgLSBUaGUgZXZlbnQgT2JqZWN0IHBhc3NlZCB0byBlYWNoIGNhbGxiYWNrXG5cdFx0ICogQHByb3BlcnR5IHtzdHJpbmd9IGV2ZW50LnR5cGUgLSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcblx0XHQgKiBAcHJvcGVydHkge1NjZW5lfSBldmVudC50YXJnZXQgLSBUaGUgU2NlbmUgb2JqZWN0IHRoYXQgdHJpZ2dlcmVkIHRoaXMgZXZlbnRcblx0XHQgKiBAcHJvcGVydHkge2Jvb2xlYW59IGV2ZW50LnJlc2V0IC0gSW5kaWNhdGVzIGlmIHRoZSBkZXN0cm95IG1ldGhvZCB3YXMgY2FsbGVkIHdpdGggcmVzZXQgYHRydWVgIG9yIGBmYWxzZWAuXG5cdFx0ICovXG5cdFx0LyoqXG5cdFx0ICogU2NlbmUgYWRkIGV2ZW50LiAgXG5cdFx0ICogRmlyZXMgd2hlbiB0aGUgc2NlbmUgaXMgYWRkZWQgdG8gYSBjb250cm9sbGVyLlxuXHRcdCAqIFRoaXMgaXMgbW9zdGx5IHVzZWQgYnkgcGx1Z2lucyB0byBrbm93IHRoYXQgY2hhbmdlIG1pZ2h0IGJlIGR1ZS5cblx0XHQgKlxuXHRcdCAqIEBldmVudCBTY3JvbGxNYWdpYy5TY2VuZSNhZGRcblx0XHQgKiBAc2luY2UgMi4wLjBcblx0XHQgKlxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogc2NlbmUub24oXCJhZGRcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0ICogXHRjb25zb2xlLmxvZygnU2NlbmUgd2FzIGFkZGVkIHRvIGEgbmV3IGNvbnRyb2xsZXIuJyk7XG5cdFx0ICogfSk7XG5cdFx0ICpcblx0XHQgKiBAcHJvcGVydHkge29iamVjdH0gZXZlbnQgLSBUaGUgZXZlbnQgT2JqZWN0IHBhc3NlZCB0byBlYWNoIGNhbGxiYWNrXG5cdFx0ICogQHByb3BlcnR5IHtzdHJpbmd9IGV2ZW50LnR5cGUgLSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcblx0XHQgKiBAcHJvcGVydHkge1NjZW5lfSBldmVudC50YXJnZXQgLSBUaGUgU2NlbmUgb2JqZWN0IHRoYXQgdHJpZ2dlcmVkIHRoaXMgZXZlbnRcblx0XHQgKiBAcHJvcGVydHkge2Jvb2xlYW59IGV2ZW50LmNvbnRyb2xsZXIgLSBUaGUgY29udHJvbGxlciBvYmplY3QgdGhlIHNjZW5lIHdhcyBhZGRlZCB0by5cblx0XHQgKi9cblx0XHQvKipcblx0XHQgKiBTY2VuZSByZW1vdmUgZXZlbnQuICBcblx0XHQgKiBGaXJlcyB3aGVuIHRoZSBzY2VuZSBpcyByZW1vdmVkIGZyb20gYSBjb250cm9sbGVyLlxuXHRcdCAqIFRoaXMgaXMgbW9zdGx5IHVzZWQgYnkgcGx1Z2lucyB0byBrbm93IHRoYXQgY2hhbmdlIG1pZ2h0IGJlIGR1ZS5cblx0XHQgKlxuXHRcdCAqIEBldmVudCBTY3JvbGxNYWdpYy5TY2VuZSNyZW1vdmVcblx0XHQgKiBAc2luY2UgMi4wLjBcblx0XHQgKlxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogc2NlbmUub24oXCJyZW1vdmVcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0ICogXHRjb25zb2xlLmxvZygnU2NlbmUgd2FzIHJlbW92ZWQgZnJvbSBpdHMgY29udHJvbGxlci4nKTtcblx0XHQgKiB9KTtcblx0XHQgKlxuXHRcdCAqIEBwcm9wZXJ0eSB7b2JqZWN0fSBldmVudCAtIFRoZSBldmVudCBPYmplY3QgcGFzc2VkIHRvIGVhY2ggY2FsbGJhY2tcblx0XHQgKiBAcHJvcGVydHkge3N0cmluZ30gZXZlbnQudHlwZSAtIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuXHRcdCAqIEBwcm9wZXJ0eSB7U2NlbmV9IGV2ZW50LnRhcmdldCAtIFRoZSBTY2VuZSBvYmplY3QgdGhhdCB0cmlnZ2VyZWQgdGhpcyBldmVudFxuXHRcdCAqL1xuXG5cdFx0LyoqXG5cdFx0ICogQWRkIG9uZSBvcmUgbW9yZSBldmVudCBsaXN0ZW5lci4gIFxuXHRcdCAqIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB3aWxsIGJlIGZpcmVkIGF0IHRoZSByZXNwZWN0aXZlIGV2ZW50LCBhbmQgYW4gb2JqZWN0IGNvbnRhaW5pbmcgcmVsZXZhbnQgZGF0YSB3aWxsIGJlIHBhc3NlZCB0byB0aGUgY2FsbGJhY2suXG5cdFx0ICogQG1ldGhvZCBTY3JvbGxNYWdpYy5TY2VuZSNvblxuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiBmdW5jdGlvbiBjYWxsYmFjayAoZXZlbnQpIHtcblx0XHQgKiBcdFx0Y29uc29sZS5sb2coXCJFdmVudCBmaXJlZCEgKFwiICsgZXZlbnQudHlwZSArIFwiKVwiKTtcblx0XHQgKiB9XG5cdFx0ICogLy8gYWRkIGxpc3RlbmVyc1xuXHRcdCAqIHNjZW5lLm9uKFwiY2hhbmdlIHVwZGF0ZSBwcm9ncmVzcyBzdGFydCBlbmQgZW50ZXIgbGVhdmVcIiwgY2FsbGJhY2spO1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IG5hbWVzIC0gVGhlIG5hbWUgb3IgbmFtZXMgb2YgdGhlIGV2ZW50IHRoZSBjYWxsYmFjayBzaG91bGQgYmUgYXR0YWNoZWQgdG8uXG5cdFx0ICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBBIGZ1bmN0aW9uIHRoYXQgc2hvdWxkIGJlIGV4ZWN1dGVkLCB3aGVuIHRoZSBldmVudCBpcyBkaXNwYXRjaGVkLiBBbiBldmVudCBvYmplY3Qgd2lsbCBiZSBwYXNzZWQgdG8gdGhlIGNhbGxiYWNrLlxuXHRcdCAqIEByZXR1cm5zIHtTY2VuZX0gUGFyZW50IG9iamVjdCBmb3IgY2hhaW5pbmcuXG5cdFx0ICovXG5cdFx0dGhpcy5vbiA9IGZ1bmN0aW9uIChuYW1lcywgY2FsbGJhY2spIHtcblx0XHRcdGlmIChfdXRpbC50eXBlLkZ1bmN0aW9uKGNhbGxiYWNrKSkge1xuXHRcdFx0XHRuYW1lcyA9IG5hbWVzLnRyaW0oKS5zcGxpdCgnICcpO1xuXHRcdFx0XHRuYW1lcy5mb3JFYWNoKGZ1bmN0aW9uIChmdWxsbmFtZSkge1xuXHRcdFx0XHRcdHZhclxuXHRcdFx0XHRcdG5hbWVwYXJ0cyA9IGZ1bGxuYW1lLnNwbGl0KCcuJyksXG5cdFx0XHRcdFx0XHRldmVudG5hbWUgPSBuYW1lcGFydHNbMF0sXG5cdFx0XHRcdFx0XHRuYW1lc3BhY2UgPSBuYW1lcGFydHNbMV07XG5cdFx0XHRcdFx0aWYgKGV2ZW50bmFtZSAhPSBcIipcIikgeyAvLyBkaXNhbGxvdyB3aWxkY2FyZHNcblx0XHRcdFx0XHRcdGlmICghX2xpc3RlbmVyc1tldmVudG5hbWVdKSB7XG5cdFx0XHRcdFx0XHRcdF9saXN0ZW5lcnNbZXZlbnRuYW1lXSA9IFtdO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0X2xpc3RlbmVyc1tldmVudG5hbWVdLnB1c2goe1xuXHRcdFx0XHRcdFx0XHRuYW1lc3BhY2U6IG5hbWVzcGFjZSB8fCAnJyxcblx0XHRcdFx0XHRcdFx0Y2FsbGJhY2s6IGNhbGxiYWNrXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bG9nKDEsIFwiRVJST1Igd2hlbiBjYWxsaW5nICcub24oKSc6IFN1cHBsaWVkIGNhbGxiYWNrIGZvciAnXCIgKyBuYW1lcyArIFwiJyBpcyBub3QgYSB2YWxpZCBmdW5jdGlvbiFcIik7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gU2NlbmU7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFJlbW92ZSBvbmUgb3IgbW9yZSBldmVudCBsaXN0ZW5lci5cblx0XHQgKiBAbWV0aG9kIFNjcm9sbE1hZ2ljLlNjZW5lI29mZlxuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiBmdW5jdGlvbiBjYWxsYmFjayAoZXZlbnQpIHtcblx0XHQgKiBcdFx0Y29uc29sZS5sb2coXCJFdmVudCBmaXJlZCEgKFwiICsgZXZlbnQudHlwZSArIFwiKVwiKTtcblx0XHQgKiB9XG5cdFx0ICogLy8gYWRkIGxpc3RlbmVyc1xuXHRcdCAqIHNjZW5lLm9uKFwiY2hhbmdlIHVwZGF0ZVwiLCBjYWxsYmFjayk7XG5cdFx0ICogLy8gcmVtb3ZlIGxpc3RlbmVyc1xuXHRcdCAqIHNjZW5lLm9mZihcImNoYW5nZSB1cGRhdGVcIiwgY2FsbGJhY2spO1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IG5hbWVzIC0gVGhlIG5hbWUgb3IgbmFtZXMgb2YgdGhlIGV2ZW50IHRoYXQgc2hvdWxkIGJlIHJlbW92ZWQuXG5cdFx0ICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgc3BlY2lmaWMgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBzaG91bGQgYmUgcmVtb3ZlZC4gSWYgbm9uZSBpcyBwYXNzZWQgYWxsIGNhbGxiYWNrcyB0byB0aGUgZXZlbnQgbGlzdGVuZXIgd2lsbCBiZSByZW1vdmVkLlxuXHRcdCAqIEByZXR1cm5zIHtTY2VuZX0gUGFyZW50IG9iamVjdCBmb3IgY2hhaW5pbmcuXG5cdFx0ICovXG5cdFx0dGhpcy5vZmYgPSBmdW5jdGlvbiAobmFtZXMsIGNhbGxiYWNrKSB7XG5cdFx0XHRpZiAoIW5hbWVzKSB7XG5cdFx0XHRcdGxvZygxLCBcIkVSUk9SOiBJbnZhbGlkIGV2ZW50IG5hbWUgc3VwcGxpZWQuXCIpO1xuXHRcdFx0XHRyZXR1cm4gU2NlbmU7XG5cdFx0XHR9XG5cdFx0XHRuYW1lcyA9IG5hbWVzLnRyaW0oKS5zcGxpdCgnICcpO1xuXHRcdFx0bmFtZXMuZm9yRWFjaChmdW5jdGlvbiAoZnVsbG5hbWUsIGtleSkge1xuXHRcdFx0XHR2YXJcblx0XHRcdFx0bmFtZXBhcnRzID0gZnVsbG5hbWUuc3BsaXQoJy4nKSxcblx0XHRcdFx0XHRldmVudG5hbWUgPSBuYW1lcGFydHNbMF0sXG5cdFx0XHRcdFx0bmFtZXNwYWNlID0gbmFtZXBhcnRzWzFdIHx8ICcnLFxuXHRcdFx0XHRcdHJlbW92ZUxpc3QgPSBldmVudG5hbWUgPT09ICcqJyA/IE9iamVjdC5rZXlzKF9saXN0ZW5lcnMpIDogW2V2ZW50bmFtZV07XG5cdFx0XHRcdHJlbW92ZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAocmVtb3ZlKSB7XG5cdFx0XHRcdFx0dmFyXG5cdFx0XHRcdFx0bGlzdCA9IF9saXN0ZW5lcnNbcmVtb3ZlXSB8fCBbXSxcblx0XHRcdFx0XHRcdGkgPSBsaXN0Lmxlbmd0aDtcblx0XHRcdFx0XHR3aGlsZSAoaS0tKSB7XG5cdFx0XHRcdFx0XHR2YXIgbGlzdGVuZXIgPSBsaXN0W2ldO1xuXHRcdFx0XHRcdFx0aWYgKGxpc3RlbmVyICYmIChuYW1lc3BhY2UgPT09IGxpc3RlbmVyLm5hbWVzcGFjZSB8fCBuYW1lc3BhY2UgPT09ICcqJykgJiYgKCFjYWxsYmFjayB8fCBjYWxsYmFjayA9PSBsaXN0ZW5lci5jYWxsYmFjaykpIHtcblx0XHRcdFx0XHRcdFx0bGlzdC5zcGxpY2UoaSwgMSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICghbGlzdC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdGRlbGV0ZSBfbGlzdGVuZXJzW3JlbW92ZV07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIFNjZW5lO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBUcmlnZ2VyIGFuIGV2ZW50LlxuXHRcdCAqIEBtZXRob2QgU2Nyb2xsTWFnaWMuU2NlbmUjdHJpZ2dlclxuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiB0aGlzLnRyaWdnZXIoXCJjaGFuZ2VcIik7XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBldmVudCB0aGF0IHNob3VsZCBiZSB0cmlnZ2VyZWQuXG5cdFx0ICogQHBhcmFtIHtvYmplY3R9IFt2YXJzXSAtIEFuIG9iamVjdCBjb250YWluaW5nIGluZm8gdGhhdCBzaG91bGQgYmUgcGFzc2VkIHRvIHRoZSBjYWxsYmFjay5cblx0XHQgKiBAcmV0dXJucyB7U2NlbmV9IFBhcmVudCBvYmplY3QgZm9yIGNoYWluaW5nLlxuXHRcdCAqL1xuXHRcdHRoaXMudHJpZ2dlciA9IGZ1bmN0aW9uIChuYW1lLCB2YXJzKSB7XG5cdFx0XHRpZiAobmFtZSkge1xuXHRcdFx0XHR2YXJcblx0XHRcdFx0bmFtZXBhcnRzID0gbmFtZS50cmltKCkuc3BsaXQoJy4nKSxcblx0XHRcdFx0XHRldmVudG5hbWUgPSBuYW1lcGFydHNbMF0sXG5cdFx0XHRcdFx0bmFtZXNwYWNlID0gbmFtZXBhcnRzWzFdLFxuXHRcdFx0XHRcdGxpc3RlbmVycyA9IF9saXN0ZW5lcnNbZXZlbnRuYW1lXTtcblx0XHRcdFx0bG9nKDMsICdldmVudCBmaXJlZDonLCBldmVudG5hbWUsIHZhcnMgPyBcIi0+XCIgOiAnJywgdmFycyB8fCAnJyk7XG5cdFx0XHRcdGlmIChsaXN0ZW5lcnMpIHtcblx0XHRcdFx0XHRsaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbiAobGlzdGVuZXIsIGtleSkge1xuXHRcdFx0XHRcdFx0aWYgKCFuYW1lc3BhY2UgfHwgbmFtZXNwYWNlID09PSBsaXN0ZW5lci5uYW1lc3BhY2UpIHtcblx0XHRcdFx0XHRcdFx0bGlzdGVuZXIuY2FsbGJhY2suY2FsbChTY2VuZSwgbmV3IFNjcm9sbE1hZ2ljLkV2ZW50KGV2ZW50bmFtZSwgbGlzdGVuZXIubmFtZXNwYWNlLCBTY2VuZSwgdmFycykpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRsb2coMSwgXCJFUlJPUjogSW52YWxpZCBldmVudCBuYW1lIHN1cHBsaWVkLlwiKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBTY2VuZTtcblx0XHR9O1xuXG5cdFx0Ly8gc2V0IGV2ZW50IGxpc3RlbmVyc1xuXHRcdFNjZW5lLm9uKFwiY2hhbmdlLmludGVybmFsXCIsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRpZiAoZS53aGF0ICE9PSBcImxvZ2xldmVsXCIgJiYgZS53aGF0ICE9PSBcInR3ZWVuQ2hhbmdlc1wiKSB7IC8vIG5vIG5lZWQgZm9yIGEgc2NlbmUgdXBkYXRlIHNjZW5lIHdpdGggdGhlc2Ugb3B0aW9ucy4uLlxuXHRcdFx0XHRpZiAoZS53aGF0ID09PSBcInRyaWdnZXJFbGVtZW50XCIpIHtcblx0XHRcdFx0XHR1cGRhdGVUcmlnZ2VyRWxlbWVudFBvc2l0aW9uKCk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZS53aGF0ID09PSBcInJldmVyc2VcIikgeyAvLyB0aGUgb25seSBwcm9wZXJ0eSBsZWZ0IHRoYXQgbWF5IGhhdmUgYW4gaW1wYWN0IG9uIHRoZSBjdXJyZW50IHNjZW5lIHN0YXRlLiBFdmVyeXRoaW5nIGVsc2UgaXMgaGFuZGxlZCBieSB0aGUgc2hpZnQgZXZlbnQuXG5cdFx0XHRcdFx0U2NlbmUudXBkYXRlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KS5vbihcInNoaWZ0LmludGVybmFsXCIsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHR1cGRhdGVTY3JvbGxPZmZzZXQoKTtcblx0XHRcdFNjZW5lLnVwZGF0ZSgpOyAvLyB1cGRhdGUgc2NlbmUgdG8gcmVmbGVjdCBuZXcgcG9zaXRpb25cblx0XHR9KTtcblxuXHRcdC8qKlxuXHRcdCAqIFNlbmQgYSBkZWJ1ZyBtZXNzYWdlIHRvIHRoZSBjb25zb2xlLlxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICogYnV0IHByb3ZpZGVkIHB1YmxpY2x5IHdpdGggX2xvZyBmb3IgcGx1Z2luc1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtudW1iZXJ9IGxvZ2xldmVsIC0gVGhlIGxvZ2xldmVsIHJlcXVpcmVkIHRvIGluaXRpYXRlIG91dHB1dCBmb3IgdGhlIG1lc3NhZ2UuXG5cdFx0ICogQHBhcmFtIHsuLi5taXhlZH0gb3V0cHV0IC0gT25lIG9yIG1vcmUgdmFyaWFibGVzIHRoYXQgc2hvdWxkIGJlIHBhc3NlZCB0byB0aGUgY29uc29sZS5cblx0XHQgKi9cblx0XHR2YXIgbG9nID0gdGhpcy5fbG9nID0gZnVuY3Rpb24gKGxvZ2xldmVsLCBvdXRwdXQpIHtcblx0XHRcdGlmIChfb3B0aW9ucy5sb2dsZXZlbCA+PSBsb2dsZXZlbCkge1xuXHRcdFx0XHRBcnJheS5wcm90b3R5cGUuc3BsaWNlLmNhbGwoYXJndW1lbnRzLCAxLCAwLCBcIihcIiArIE5BTUVTUEFDRSArIFwiKSAtPlwiKTtcblx0XHRcdFx0X3V0aWwubG9nLmFwcGx5KHdpbmRvdywgYXJndW1lbnRzKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogQWRkIHRoZSBzY2VuZSB0byBhIGNvbnRyb2xsZXIuICBcblx0XHQgKiBUaGlzIGlzIHRoZSBlcXVpdmFsZW50IHRvIGBDb250cm9sbGVyLmFkZFNjZW5lKHNjZW5lKWAuXG5cdFx0ICogQG1ldGhvZCBTY3JvbGxNYWdpYy5TY2VuZSNhZGRUb1xuXHRcdCAqXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiAvLyBhZGQgYSBzY2VuZSB0byBhIFNjcm9sbE1hZ2ljIENvbnRyb2xsZXJcblx0XHQgKiBzY2VuZS5hZGRUbyhjb250cm9sbGVyKTtcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7U2Nyb2xsTWFnaWMuQ29udHJvbGxlcn0gY29udHJvbGxlciAtIFRoZSBjb250cm9sbGVyIHRvIHdoaWNoIHRoZSBzY2VuZSBzaG91bGQgYmUgYWRkZWQuXG5cdFx0ICogQHJldHVybnMge1NjZW5lfSBQYXJlbnQgb2JqZWN0IGZvciBjaGFpbmluZy5cblx0XHQgKi9cblx0XHR0aGlzLmFkZFRvID0gZnVuY3Rpb24gKGNvbnRyb2xsZXIpIHtcblx0XHRcdGlmICghKGNvbnRyb2xsZXIgaW5zdGFuY2VvZiBTY3JvbGxNYWdpYy5Db250cm9sbGVyKSkge1xuXHRcdFx0XHRsb2coMSwgXCJFUlJPUjogc3VwcGxpZWQgYXJndW1lbnQgb2YgJ2FkZFRvKCknIGlzIG5vdCBhIHZhbGlkIFNjcm9sbE1hZ2ljIENvbnRyb2xsZXJcIik7XG5cdFx0XHR9IGVsc2UgaWYgKF9jb250cm9sbGVyICE9IGNvbnRyb2xsZXIpIHtcblx0XHRcdFx0Ly8gbmV3IGNvbnRyb2xsZXJcblx0XHRcdFx0aWYgKF9jb250cm9sbGVyKSB7IC8vIHdhcyBhc3NvY2lhdGVkIHRvIGEgZGlmZmVyZW50IGNvbnRyb2xsZXIgYmVmb3JlLCBzbyByZW1vdmUgaXQuLi5cblx0XHRcdFx0XHRfY29udHJvbGxlci5yZW1vdmVTY2VuZShTY2VuZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0X2NvbnRyb2xsZXIgPSBjb250cm9sbGVyO1xuXHRcdFx0XHR2YWxpZGF0ZU9wdGlvbigpO1xuXHRcdFx0XHR1cGRhdGVEdXJhdGlvbih0cnVlKTtcblx0XHRcdFx0dXBkYXRlVHJpZ2dlckVsZW1lbnRQb3NpdGlvbih0cnVlKTtcblx0XHRcdFx0dXBkYXRlU2Nyb2xsT2Zmc2V0KCk7XG5cdFx0XHRcdF9jb250cm9sbGVyLmluZm8oXCJjb250YWluZXJcIikuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgb25Db250YWluZXJSZXNpemUpO1xuXHRcdFx0XHRjb250cm9sbGVyLmFkZFNjZW5lKFNjZW5lKTtcblx0XHRcdFx0U2NlbmUudHJpZ2dlcihcImFkZFwiLCB7XG5cdFx0XHRcdFx0Y29udHJvbGxlcjogX2NvbnRyb2xsZXJcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGxvZygzLCBcImFkZGVkIFwiICsgTkFNRVNQQUNFICsgXCIgdG8gY29udHJvbGxlclwiKTtcblx0XHRcdFx0U2NlbmUudXBkYXRlKCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gU2NlbmU7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqICoqR2V0Kiogb3IgKipTZXQqKiB0aGUgY3VycmVudCBlbmFibGVkIHN0YXRlIG9mIHRoZSBzY2VuZS4gIFxuXHRcdCAqIFRoaXMgY2FuIGJlIHVzZWQgdG8gZGlzYWJsZSB0aGlzIHNjZW5lIHdpdGhvdXQgcmVtb3Zpbmcgb3IgZGVzdHJveWluZyBpdC5cblx0XHQgKiBAbWV0aG9kIFNjcm9sbE1hZ2ljLlNjZW5lI2VuYWJsZWRcblx0XHQgKlxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogLy8gZ2V0IHRoZSBjdXJyZW50IHZhbHVlXG5cdFx0ICogdmFyIGVuYWJsZWQgPSBzY2VuZS5lbmFibGVkKCk7XG5cdFx0ICpcblx0XHQgKiAvLyBkaXNhYmxlIHRoZSBzY2VuZVxuXHRcdCAqIHNjZW5lLmVuYWJsZWQoZmFsc2UpO1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtib29sZWFufSBbbmV3U3RhdGVdIC0gVGhlIG5ldyBlbmFibGVkIHN0YXRlIG9mIHRoZSBzY2VuZSBgdHJ1ZWAgb3IgYGZhbHNlYC5cblx0XHQgKiBAcmV0dXJucyB7KGJvb2xlYW58U2NlbmUpfSBDdXJyZW50IGVuYWJsZWQgc3RhdGUgb3IgcGFyZW50IG9iamVjdCBmb3IgY2hhaW5pbmcuXG5cdFx0ICovXG5cdFx0dGhpcy5lbmFibGVkID0gZnVuY3Rpb24gKG5ld1N0YXRlKSB7XG5cdFx0XHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHsgLy8gZ2V0XG5cdFx0XHRcdHJldHVybiBfZW5hYmxlZDtcblx0XHRcdH0gZWxzZSBpZiAoX2VuYWJsZWQgIT0gbmV3U3RhdGUpIHsgLy8gc2V0XG5cdFx0XHRcdF9lbmFibGVkID0gISEgbmV3U3RhdGU7XG5cdFx0XHRcdFNjZW5lLnVwZGF0ZSh0cnVlKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBTY2VuZTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogUmVtb3ZlIHRoZSBzY2VuZSBmcm9tIHRoZSBjb250cm9sbGVyLiAgXG5cdFx0ICogVGhpcyBpcyB0aGUgZXF1aXZhbGVudCB0byBgQ29udHJvbGxlci5yZW1vdmVTY2VuZShzY2VuZSlgLlxuXHRcdCAqIFRoZSBzY2VuZSB3aWxsIG5vdCBiZSB1cGRhdGVkIGFueW1vcmUgdW50aWwgeW91IHJlYWRkIGl0IHRvIGEgY29udHJvbGxlci5cblx0XHQgKiBUbyByZW1vdmUgdGhlIHBpbiBvciB0aGUgdHdlZW4geW91IG5lZWQgdG8gY2FsbCByZW1vdmVUd2VlbigpIG9yIHJlbW92ZVBpbigpIHJlc3BlY3RpdmVseS5cblx0XHQgKiBAbWV0aG9kIFNjcm9sbE1hZ2ljLlNjZW5lI3JlbW92ZVxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogLy8gcmVtb3ZlIHRoZSBzY2VuZSBmcm9tIGl0cyBjb250cm9sbGVyXG5cdFx0ICogc2NlbmUucmVtb3ZlKCk7XG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7U2NlbmV9IFBhcmVudCBvYmplY3QgZm9yIGNoYWluaW5nLlxuXHRcdCAqL1xuXHRcdHRoaXMucmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKF9jb250cm9sbGVyKSB7XG5cdFx0XHRcdF9jb250cm9sbGVyLmluZm8oXCJjb250YWluZXJcIikucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgb25Db250YWluZXJSZXNpemUpO1xuXHRcdFx0XHR2YXIgdG1wUGFyZW50ID0gX2NvbnRyb2xsZXI7XG5cdFx0XHRcdF9jb250cm9sbGVyID0gdW5kZWZpbmVkO1xuXHRcdFx0XHR0bXBQYXJlbnQucmVtb3ZlU2NlbmUoU2NlbmUpO1xuXHRcdFx0XHRTY2VuZS50cmlnZ2VyKFwicmVtb3ZlXCIpO1xuXHRcdFx0XHRsb2coMywgXCJyZW1vdmVkIFwiICsgTkFNRVNQQUNFICsgXCIgZnJvbSBjb250cm9sbGVyXCIpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIFNjZW5lO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBEZXN0cm95IHRoZSBzY2VuZSBhbmQgZXZlcnl0aGluZy5cblx0XHQgKiBAbWV0aG9kIFNjcm9sbE1hZ2ljLlNjZW5lI2Rlc3Ryb3lcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIC8vIGRlc3Ryb3kgdGhlIHNjZW5lIHdpdGhvdXQgcmVzZXR0aW5nIHRoZSBwaW4gYW5kIHR3ZWVuIHRvIHRoZWlyIGluaXRpYWwgcG9zaXRpb25zXG5cdFx0ICogc2NlbmUgPSBzY2VuZS5kZXN0cm95KCk7XG5cdFx0ICpcblx0XHQgKiAvLyBkZXN0cm95IHRoZSBzY2VuZSBhbmQgcmVzZXQgdGhlIHBpbiBhbmQgdHdlZW5cblx0XHQgKiBzY2VuZSA9IHNjZW5lLmRlc3Ryb3kodHJ1ZSk7XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge2Jvb2xlYW59IFtyZXNldD1mYWxzZV0gLSBJZiBgdHJ1ZWAgdGhlIHBpbiBhbmQgdHdlZW4gKGlmIGV4aXN0ZW50KSB3aWxsIGJlIHJlc2V0LlxuXHRcdCAqIEByZXR1cm5zIHtudWxsfSBOdWxsIHRvIHVuc2V0IGhhbmRsZXIgdmFyaWFibGVzLlxuXHRcdCAqL1xuXHRcdHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uIChyZXNldCkge1xuXHRcdFx0U2NlbmUudHJpZ2dlcihcImRlc3Ryb3lcIiwge1xuXHRcdFx0XHRyZXNldDogcmVzZXRcblx0XHRcdH0pO1xuXHRcdFx0U2NlbmUucmVtb3ZlKCk7XG5cdFx0XHRTY2VuZS5vZmYoXCIqLipcIik7XG5cdFx0XHRsb2coMywgXCJkZXN0cm95ZWQgXCIgKyBOQU1FU1BBQ0UgKyBcIiAocmVzZXQ6IFwiICsgKHJlc2V0ID8gXCJ0cnVlXCIgOiBcImZhbHNlXCIpICsgXCIpXCIpO1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fTtcblxuXG5cdFx0LyoqXG5cdFx0ICogVXBkYXRlcyB0aGUgU2NlbmUgdG8gcmVmbGVjdCB0aGUgY3VycmVudCBzdGF0ZS4gIFxuXHRcdCAqIFRoaXMgaXMgdGhlIGVxdWl2YWxlbnQgdG8gYENvbnRyb2xsZXIudXBkYXRlU2NlbmUoc2NlbmUsIGltbWVkaWF0ZWx5KWAuICBcblx0XHQgKiBUaGUgdXBkYXRlIG1ldGhvZCBjYWxjdWxhdGVzIHRoZSBzY2VuZSdzIHN0YXJ0IGFuZCBlbmQgcG9zaXRpb24gKGJhc2VkIG9uIHRoZSB0cmlnZ2VyIGVsZW1lbnQsIHRyaWdnZXIgaG9vaywgZHVyYXRpb24gYW5kIG9mZnNldCkgYW5kIGNoZWNrcyBpdCBhZ2FpbnN0IHRoZSBjdXJyZW50IHNjcm9sbCBwb3NpdGlvbiBvZiB0aGUgY29udGFpbmVyLiAgXG5cdFx0ICogSXQgdGhlbiB1cGRhdGVzIHRoZSBjdXJyZW50IHNjZW5lIHN0YXRlIGFjY29yZGluZ2x5IChvciBkb2VzIG5vdGhpbmcsIGlmIHRoZSBzdGF0ZSBpcyBhbHJlYWR5IGNvcnJlY3QpIOKAkyBQaW5zIHdpbGwgYmUgc2V0IHRvIHRoZWlyIGNvcnJlY3QgcG9zaXRpb24gYW5kIHR3ZWVucyB3aWxsIGJlIHVwZGF0ZWQgdG8gdGhlaXIgY29ycmVjdCBwcm9ncmVzcy5cblx0XHQgKiBUaGlzIG1lYW5zIGFuIHVwZGF0ZSBkb2Vzbid0IG5lY2Vzc2FyaWx5IHJlc3VsdCBpbiBhIHByb2dyZXNzIGNoYW5nZS4gVGhlIGBwcm9ncmVzc2AgZXZlbnQgd2lsbCBiZSBmaXJlZCBpZiB0aGUgcHJvZ3Jlc3MgaGFzIGluZGVlZCBjaGFuZ2VkIGJldHdlZW4gdGhpcyB1cGRhdGUgYW5kIHRoZSBsYXN0LiAgXG5cdFx0ICogXyoqTk9URToqKiBUaGlzIG1ldGhvZCBnZXRzIGNhbGxlZCBjb25zdGFudGx5IHdoZW5ldmVyIFNjcm9sbE1hZ2ljIGRldGVjdHMgYSBjaGFuZ2UuIFRoZSBvbmx5IGFwcGxpY2F0aW9uIGZvciB5b3UgaXMgaWYgeW91IGNoYW5nZSBzb21ldGhpbmcgb3V0c2lkZSBvZiB0aGUgcmVhbG0gb2YgU2Nyb2xsTWFnaWMsIGxpa2UgbW92aW5nIHRoZSB0cmlnZ2VyIG9yIGNoYW5naW5nIHR3ZWVuIHBhcmFtZXRlcnMuX1xuXHRcdCAqIEBtZXRob2QgU2Nyb2xsTWFnaWMuU2NlbmUjdXBkYXRlXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiAvLyB1cGRhdGUgdGhlIHNjZW5lIG9uIG5leHQgdGlja1xuXHRcdCAqIHNjZW5lLnVwZGF0ZSgpO1xuXHRcdCAqXG5cdFx0ICogLy8gdXBkYXRlIHRoZSBzY2VuZSBpbW1lZGlhdGVseVxuXHRcdCAqIHNjZW5lLnVwZGF0ZSh0cnVlKTtcblx0XHQgKlxuXHRcdCAqIEBmaXJlcyBTY2VuZS51cGRhdGVcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7Ym9vbGVhbn0gW2ltbWVkaWF0ZWx5PWZhbHNlXSAtIElmIGB0cnVlYCB0aGUgdXBkYXRlIHdpbGwgYmUgaW5zdGFudCwgaWYgYGZhbHNlYCBpdCB3aWxsIHdhaXQgdW50aWwgbmV4dCB1cGRhdGUgY3ljbGUgKGJldHRlciBwZXJmb3JtYW5jZSkuXG5cdFx0ICogQHJldHVybnMge1NjZW5lfSBQYXJlbnQgb2JqZWN0IGZvciBjaGFpbmluZy5cblx0XHQgKi9cblx0XHR0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uIChpbW1lZGlhdGVseSkge1xuXHRcdFx0aWYgKF9jb250cm9sbGVyKSB7XG5cdFx0XHRcdGlmIChpbW1lZGlhdGVseSkge1xuXHRcdFx0XHRcdGlmIChfY29udHJvbGxlci5lbmFibGVkKCkgJiYgX2VuYWJsZWQpIHtcblx0XHRcdFx0XHRcdHZhclxuXHRcdFx0XHRcdFx0c2Nyb2xsUG9zID0gX2NvbnRyb2xsZXIuaW5mbyhcInNjcm9sbFBvc1wiKSxcblx0XHRcdFx0XHRcdFx0bmV3UHJvZ3Jlc3M7XG5cblx0XHRcdFx0XHRcdGlmIChfb3B0aW9ucy5kdXJhdGlvbiA+IDApIHtcblx0XHRcdFx0XHRcdFx0bmV3UHJvZ3Jlc3MgPSAoc2Nyb2xsUG9zIC0gX3Njcm9sbE9mZnNldC5zdGFydCkgLyAoX3Njcm9sbE9mZnNldC5lbmQgLSBfc2Nyb2xsT2Zmc2V0LnN0YXJ0KTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdG5ld1Byb2dyZXNzID0gc2Nyb2xsUG9zID49IF9zY3JvbGxPZmZzZXQuc3RhcnQgPyAxIDogMDtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0U2NlbmUudHJpZ2dlcihcInVwZGF0ZVwiLCB7XG5cdFx0XHRcdFx0XHRcdHN0YXJ0UG9zOiBfc2Nyb2xsT2Zmc2V0LnN0YXJ0LFxuXHRcdFx0XHRcdFx0XHRlbmRQb3M6IF9zY3JvbGxPZmZzZXQuZW5kLFxuXHRcdFx0XHRcdFx0XHRzY3JvbGxQb3M6IHNjcm9sbFBvc1xuXHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRcdFNjZW5lLnByb2dyZXNzKG5ld1Byb2dyZXNzKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKF9waW4gJiYgX3N0YXRlID09PSBTQ0VORV9TVEFURV9EVVJJTkcpIHtcblx0XHRcdFx0XHRcdHVwZGF0ZVBpblN0YXRlKHRydWUpOyAvLyB1bnBpbiBpbiBwb3NpdGlvblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRfY29udHJvbGxlci51cGRhdGVTY2VuZShTY2VuZSwgZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gU2NlbmU7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFVwZGF0ZXMgZHluYW1pYyBzY2VuZSB2YXJpYWJsZXMgbGlrZSB0aGUgdHJpZ2dlciBlbGVtZW50IHBvc2l0aW9uIG9yIHRoZSBkdXJhdGlvbi5cblx0XHQgKiBUaGlzIG1ldGhvZCBpcyBhdXRvbWF0aWNhbGx5IGNhbGxlZCBpbiByZWd1bGFyIGludGVydmFscyBmcm9tIHRoZSBjb250cm9sbGVyLiBTZWUge0BsaW5rIFNjcm9sbE1hZ2ljLkNvbnRyb2xsZXJ9IG9wdGlvbiBgcmVmcmVzaEludGVydmFsYC5cblx0XHQgKiBcblx0XHQgKiBZb3UgY2FuIGNhbGwgaXQgdG8gbWluaW1pemUgbGFnLCBmb3IgZXhhbXBsZSB3aGVuIHlvdSBpbnRlbnRpb25hbGx5IGNoYW5nZSB0aGUgcG9zaXRpb24gb2YgdGhlIHRyaWdnZXJFbGVtZW50LlxuXHRcdCAqIElmIHlvdSBkb24ndCBpdCB3aWxsIHNpbXBseSBiZSB1cGRhdGVkIGluIHRoZSBuZXh0IHJlZnJlc2ggaW50ZXJ2YWwgb2YgdGhlIGNvbnRhaW5lciwgd2hpY2ggaXMgdXN1YWxseSBzdWZmaWNpZW50LlxuXHRcdCAqXG5cdFx0ICogQG1ldGhvZCBTY3JvbGxNYWdpYy5TY2VuZSNyZWZyZXNoXG5cdFx0ICogQHNpbmNlIDEuMS4wXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiBzY2VuZSA9IG5ldyBTY3JvbGxNYWdpYy5TY2VuZSh7dHJpZ2dlckVsZW1lbnQ6IFwiI3RyaWdnZXJcIn0pO1xuXHRcdCAqIFxuXHRcdCAqIC8vIGNoYW5nZSB0aGUgcG9zaXRpb24gb2YgdGhlIHRyaWdnZXJcblx0XHQgKiAkKFwiI3RyaWdnZXJcIikuY3NzKFwidG9wXCIsIDUwMCk7XG5cdFx0ICogLy8gaW1tZWRpYXRlbHkgbGV0IHRoZSBzY2VuZSBrbm93IG9mIHRoaXMgY2hhbmdlXG5cdFx0ICogc2NlbmUucmVmcmVzaCgpO1xuXHRcdCAqXG5cdFx0ICogQGZpcmVzIHtAbGluayBTY2VuZS5zaGlmdH0sIGlmIHRoZSB0cmlnZ2VyIGVsZW1lbnQgcG9zaXRpb24gb3IgdGhlIGR1cmF0aW9uIGNoYW5nZWRcblx0XHQgKiBAZmlyZXMge0BsaW5rIFNjZW5lLmNoYW5nZX0sIGlmIHRoZSBkdXJhdGlvbiBjaGFuZ2VkXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7U2NlbmV9IFBhcmVudCBvYmplY3QgZm9yIGNoYWluaW5nLlxuXHRcdCAqL1xuXHRcdHRoaXMucmVmcmVzaCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdHVwZGF0ZUR1cmF0aW9uKCk7XG5cdFx0XHR1cGRhdGVUcmlnZ2VyRWxlbWVudFBvc2l0aW9uKCk7XG5cdFx0XHQvLyB1cGRhdGUgdHJpZ2dlciBlbGVtZW50IHBvc2l0aW9uXG5cdFx0XHRyZXR1cm4gU2NlbmU7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqICoqR2V0Kiogb3IgKipTZXQqKiB0aGUgc2NlbmUncyBwcm9ncmVzcy4gIFxuXHRcdCAqIFVzdWFsbHkgaXQgc2hvdWxkbid0IGJlIG5lY2Vzc2FyeSB0byB1c2UgdGhpcyBhcyBhIHNldHRlciwgYXMgaXQgaXMgc2V0IGF1dG9tYXRpY2FsbHkgYnkgc2NlbmUudXBkYXRlKCkuICBcblx0XHQgKiBUaGUgb3JkZXIgaW4gd2hpY2ggdGhlIGV2ZW50cyBhcmUgZmlyZWQgZGVwZW5kcyBvbiB0aGUgZHVyYXRpb24gb2YgdGhlIHNjZW5lOlxuXHRcdCAqICAxLiBTY2VuZXMgd2l0aCBgZHVyYXRpb24gPT0gMGA6ICBcblx0XHQgKiAgU2NlbmVzIHRoYXQgaGF2ZSBubyBkdXJhdGlvbiBieSBkZWZpbml0aW9uIGhhdmUgbm8gZW5kaW5nLiBUaHVzIHRoZSBgZW5kYCBldmVudCB3aWxsIG5ldmVyIGJlIGZpcmVkLiAgXG5cdFx0ICogIFdoZW4gdGhlIHRyaWdnZXIgcG9zaXRpb24gb2YgdGhlIHNjZW5lIGlzIHBhc3NlZCB0aGUgZXZlbnRzIGFyZSBhbHdheXMgZmlyZWQgaW4gdGhpcyBvcmRlcjogIFxuXHRcdCAqICBgZW50ZXJgLCBgc3RhcnRgLCBgcHJvZ3Jlc3NgIHdoZW4gc2Nyb2xsaW5nIGZvcndhcmQgIFxuXHRcdCAqICBhbmQgIFxuXHRcdCAqICBgcHJvZ3Jlc3NgLCBgc3RhcnRgLCBgbGVhdmVgIHdoZW4gc2Nyb2xsaW5nIGluIHJldmVyc2Vcblx0XHQgKiAgMi4gU2NlbmVzIHdpdGggYGR1cmF0aW9uID4gMGA6ICBcblx0XHQgKiAgU2NlbmVzIHdpdGggYSBzZXQgZHVyYXRpb24gaGF2ZSBhIGRlZmluZWQgc3RhcnQgYW5kIGVuZCBwb2ludC4gIFxuXHRcdCAqICBXaGVuIHNjcm9sbGluZyBwYXN0IHRoZSBzdGFydCBwb3NpdGlvbiBvZiB0aGUgc2NlbmUgaXQgd2lsbCBmaXJlIHRoZXNlIGV2ZW50cyBpbiB0aGlzIG9yZGVyOiAgXG5cdFx0ICogIGBlbnRlcmAsIGBzdGFydGAsIGBwcm9ncmVzc2AgIFxuXHRcdCAqICBXaGVuIGNvbnRpbnVpbmcgdG8gc2Nyb2xsIGFuZCBwYXNzaW5nIHRoZSBlbmQgcG9pbnQgaXQgd2lsbCBmaXJlIHRoZXNlIGV2ZW50czogIFxuXHRcdCAqICBgcHJvZ3Jlc3NgLCBgZW5kYCwgYGxlYXZlYCAgXG5cdFx0ICogIFdoZW4gcmV2ZXJzaW5nIHRocm91Z2ggdGhlIGVuZCBwb2ludCB0aGVzZSBldmVudHMgYXJlIGZpcmVkOiAgXG5cdFx0ICogIGBlbnRlcmAsIGBlbmRgLCBgcHJvZ3Jlc3NgICBcblx0XHQgKiAgQW5kIHdoZW4gY29udGludWluZyB0byBzY3JvbGwgcGFzdCB0aGUgc3RhcnQgcG9zaXRpb24gaW4gcmV2ZXJzZSBpdCB3aWxsIGZpcmU6ICBcblx0XHQgKiAgYHByb2dyZXNzYCwgYHN0YXJ0YCwgYGxlYXZlYCAgXG5cdFx0ICogIEluIGJldHdlZW4gc3RhcnQgYW5kIGVuZCB0aGUgYHByb2dyZXNzYCBldmVudCB3aWxsIGJlIGNhbGxlZCBjb25zdGFudGx5LCB3aGVuZXZlciB0aGUgcHJvZ3Jlc3MgY2hhbmdlcy5cblx0XHQgKiBcblx0XHQgKiBJbiBzaG9ydDogIFxuXHRcdCAqIGBlbnRlcmAgZXZlbnRzIHdpbGwgYWx3YXlzIHRyaWdnZXIgKipiZWZvcmUqKiB0aGUgcHJvZ3Jlc3MgdXBkYXRlIGFuZCBgbGVhdmVgIGVudmVudHMgd2lsbCB0cmlnZ2VyICoqYWZ0ZXIqKiB0aGUgcHJvZ3Jlc3MgdXBkYXRlLiAgXG5cdFx0ICogYHN0YXJ0YCBhbmQgYGVuZGAgd2lsbCBhbHdheXMgdHJpZ2dlciBhdCB0aGVpciByZXNwZWN0aXZlIHBvc2l0aW9uLlxuXHRcdCAqIFxuXHRcdCAqIFBsZWFzZSByZXZpZXcgdGhlIGV2ZW50IGRlc2NyaXB0aW9ucyBmb3IgZGV0YWlscyBvbiB0aGUgZXZlbnRzIGFuZCB0aGUgZXZlbnQgb2JqZWN0IHRoYXQgaXMgcGFzc2VkIHRvIHRoZSBjYWxsYmFjay5cblx0XHQgKiBcblx0XHQgKiBAbWV0aG9kIFNjcm9sbE1hZ2ljLlNjZW5lI3Byb2dyZXNzXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiAvLyBnZXQgdGhlIGN1cnJlbnQgc2NlbmUgcHJvZ3Jlc3Ncblx0XHQgKiB2YXIgcHJvZ3Jlc3MgPSBzY2VuZS5wcm9ncmVzcygpO1xuXHRcdCAqXG5cdFx0ICogLy8gc2V0IG5ldyBzY2VuZSBwcm9ncmVzc1xuXHRcdCAqIHNjZW5lLnByb2dyZXNzKDAuMyk7XG5cdFx0ICpcblx0XHQgKiBAZmlyZXMge0BsaW5rIFNjZW5lLmVudGVyfSwgd2hlbiB1c2VkIGFzIHNldHRlclxuXHRcdCAqIEBmaXJlcyB7QGxpbmsgU2NlbmUuc3RhcnR9LCB3aGVuIHVzZWQgYXMgc2V0dGVyXG5cdFx0ICogQGZpcmVzIHtAbGluayBTY2VuZS5wcm9ncmVzc30sIHdoZW4gdXNlZCBhcyBzZXR0ZXJcblx0XHQgKiBAZmlyZXMge0BsaW5rIFNjZW5lLmVuZH0sIHdoZW4gdXNlZCBhcyBzZXR0ZXJcblx0XHQgKiBAZmlyZXMge0BsaW5rIFNjZW5lLmxlYXZlfSwgd2hlbiB1c2VkIGFzIHNldHRlclxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtudW1iZXJ9IFtwcm9ncmVzc10gLSBUaGUgbmV3IHByb2dyZXNzIHZhbHVlIG9mIHRoZSBzY2VuZSBgWzAtMV1gLlxuXHRcdCAqIEByZXR1cm5zIHtudW1iZXJ9IGBnZXRgIC0gIEN1cnJlbnQgc2NlbmUgcHJvZ3Jlc3MuXG5cdFx0ICogQHJldHVybnMge1NjZW5lfSBgc2V0YCAtICBQYXJlbnQgb2JqZWN0IGZvciBjaGFpbmluZy5cblx0XHQgKi9cblx0XHR0aGlzLnByb2dyZXNzID0gZnVuY3Rpb24gKHByb2dyZXNzKSB7XG5cdFx0XHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHsgLy8gZ2V0XG5cdFx0XHRcdHJldHVybiBfcHJvZ3Jlc3M7XG5cdFx0XHR9IGVsc2UgeyAvLyBzZXRcblx0XHRcdFx0dmFyXG5cdFx0XHRcdGRvVXBkYXRlID0gZmFsc2UsXG5cdFx0XHRcdFx0b2xkU3RhdGUgPSBfc3RhdGUsXG5cdFx0XHRcdFx0c2Nyb2xsRGlyZWN0aW9uID0gX2NvbnRyb2xsZXIgPyBfY29udHJvbGxlci5pbmZvKFwic2Nyb2xsRGlyZWN0aW9uXCIpIDogJ1BBVVNFRCcsXG5cdFx0XHRcdFx0cmV2ZXJzZU9yRm9yd2FyZCA9IF9vcHRpb25zLnJldmVyc2UgfHwgcHJvZ3Jlc3MgPj0gX3Byb2dyZXNzO1xuXHRcdFx0XHRpZiAoX29wdGlvbnMuZHVyYXRpb24gPT09IDApIHtcblx0XHRcdFx0XHQvLyB6ZXJvIGR1cmF0aW9uIHNjZW5lc1xuXHRcdFx0XHRcdGRvVXBkYXRlID0gX3Byb2dyZXNzICE9IHByb2dyZXNzO1xuXHRcdFx0XHRcdF9wcm9ncmVzcyA9IHByb2dyZXNzIDwgMSAmJiByZXZlcnNlT3JGb3J3YXJkID8gMCA6IDE7XG5cdFx0XHRcdFx0X3N0YXRlID0gX3Byb2dyZXNzID09PSAwID8gU0NFTkVfU1RBVEVfQkVGT1JFIDogU0NFTkVfU1RBVEVfRFVSSU5HO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIHNjZW5lcyB3aXRoIHN0YXJ0IGFuZCBlbmRcblx0XHRcdFx0XHRpZiAocHJvZ3Jlc3MgPCAwICYmIF9zdGF0ZSAhPT0gU0NFTkVfU1RBVEVfQkVGT1JFICYmIHJldmVyc2VPckZvcndhcmQpIHtcblx0XHRcdFx0XHRcdC8vIGdvIGJhY2sgdG8gaW5pdGlhbCBzdGF0ZVxuXHRcdFx0XHRcdFx0X3Byb2dyZXNzID0gMDtcblx0XHRcdFx0XHRcdF9zdGF0ZSA9IFNDRU5FX1NUQVRFX0JFRk9SRTtcblx0XHRcdFx0XHRcdGRvVXBkYXRlID0gdHJ1ZTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHByb2dyZXNzID49IDAgJiYgcHJvZ3Jlc3MgPCAxICYmIHJldmVyc2VPckZvcndhcmQpIHtcblx0XHRcdFx0XHRcdF9wcm9ncmVzcyA9IHByb2dyZXNzO1xuXHRcdFx0XHRcdFx0X3N0YXRlID0gU0NFTkVfU1RBVEVfRFVSSU5HO1xuXHRcdFx0XHRcdFx0ZG9VcGRhdGUgPSB0cnVlO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAocHJvZ3Jlc3MgPj0gMSAmJiBfc3RhdGUgIT09IFNDRU5FX1NUQVRFX0FGVEVSKSB7XG5cdFx0XHRcdFx0XHRfcHJvZ3Jlc3MgPSAxO1xuXHRcdFx0XHRcdFx0X3N0YXRlID0gU0NFTkVfU1RBVEVfQUZURVI7XG5cdFx0XHRcdFx0XHRkb1VwZGF0ZSA9IHRydWU7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChfc3RhdGUgPT09IFNDRU5FX1NUQVRFX0RVUklORyAmJiAhcmV2ZXJzZU9yRm9yd2FyZCkge1xuXHRcdFx0XHRcdFx0dXBkYXRlUGluU3RhdGUoKTsgLy8gaW4gY2FzZSB3ZSBzY3JvbGxlZCBiYWNrd2FyZHMgbWlkLXNjZW5lIGFuZCByZXZlcnNlIGlzIGRpc2FibGVkID0+IHVwZGF0ZSB0aGUgcGluIHBvc2l0aW9uLCBzbyBpdCBkb2Vzbid0IG1vdmUgYmFjayBhcyB3ZWxsLlxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoZG9VcGRhdGUpIHtcblx0XHRcdFx0XHQvLyBmaXJlIGV2ZW50c1xuXHRcdFx0XHRcdHZhclxuXHRcdFx0XHRcdGV2ZW50VmFycyA9IHtcblx0XHRcdFx0XHRcdHByb2dyZXNzOiBfcHJvZ3Jlc3MsXG5cdFx0XHRcdFx0XHRzdGF0ZTogX3N0YXRlLFxuXHRcdFx0XHRcdFx0c2Nyb2xsRGlyZWN0aW9uOiBzY3JvbGxEaXJlY3Rpb25cblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0c3RhdGVDaGFuZ2VkID0gX3N0YXRlICE9IG9sZFN0YXRlO1xuXG5cdFx0XHRcdFx0dmFyIHRyaWdnZXIgPSBmdW5jdGlvbiAoZXZlbnROYW1lKSB7IC8vIHRtcCBoZWxwZXIgdG8gc2ltcGxpZnkgY29kZVxuXHRcdFx0XHRcdFx0U2NlbmUudHJpZ2dlcihldmVudE5hbWUsIGV2ZW50VmFycyk7XG5cdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdGlmIChzdGF0ZUNoYW5nZWQpIHsgLy8gZW50ZXIgZXZlbnRzXG5cdFx0XHRcdFx0XHRpZiAob2xkU3RhdGUgIT09IFNDRU5FX1NUQVRFX0RVUklORykge1xuXHRcdFx0XHRcdFx0XHR0cmlnZ2VyKFwiZW50ZXJcIik7XG5cdFx0XHRcdFx0XHRcdHRyaWdnZXIob2xkU3RhdGUgPT09IFNDRU5FX1NUQVRFX0JFRk9SRSA/IFwic3RhcnRcIiA6IFwiZW5kXCIpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0cmlnZ2VyKFwicHJvZ3Jlc3NcIik7XG5cdFx0XHRcdFx0aWYgKHN0YXRlQ2hhbmdlZCkgeyAvLyBsZWF2ZSBldmVudHNcblx0XHRcdFx0XHRcdGlmIChfc3RhdGUgIT09IFNDRU5FX1NUQVRFX0RVUklORykge1xuXHRcdFx0XHRcdFx0XHR0cmlnZ2VyKF9zdGF0ZSA9PT0gU0NFTkVfU1RBVEVfQkVGT1JFID8gXCJzdGFydFwiIDogXCJlbmRcIik7XG5cdFx0XHRcdFx0XHRcdHRyaWdnZXIoXCJsZWF2ZVwiKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gU2NlbmU7XG5cdFx0XHR9XG5cdFx0fTtcblxuXG5cdFx0LyoqXG5cdFx0ICogVXBkYXRlIHRoZSBzdGFydCBhbmQgZW5kIHNjcm9sbE9mZnNldCBvZiB0aGUgY29udGFpbmVyLlxuXHRcdCAqIFRoZSBwb3NpdGlvbnMgcmVmbGVjdCB3aGF0IHRoZSBjb250cm9sbGVyJ3Mgc2Nyb2xsIHBvc2l0aW9uIHdpbGwgYmUgYXQgdGhlIHN0YXJ0IGFuZCBlbmQgcmVzcGVjdGl2ZWx5LlxuXHRcdCAqIElzIGNhbGxlZCwgd2hlbjpcblx0XHQgKiAgIC0gU2NlbmUgZXZlbnQgXCJjaGFuZ2VcIiBpcyBjYWxsZWQgd2l0aDogb2Zmc2V0LCB0cmlnZ2VySG9vaywgZHVyYXRpb24gXG5cdFx0ICogICAtIHNjcm9sbCBjb250YWluZXIgZXZlbnQgXCJyZXNpemVcIiBpcyBjYWxsZWRcblx0XHQgKiAgIC0gdGhlIHBvc2l0aW9uIG9mIHRoZSB0cmlnZ2VyRWxlbWVudCBjaGFuZ2VzXG5cdFx0ICogICAtIHRoZSBjb250cm9sbGVyIGNoYW5nZXMgLT4gYWRkVG8oKVxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0dmFyIHVwZGF0ZVNjcm9sbE9mZnNldCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdF9zY3JvbGxPZmZzZXQgPSB7XG5cdFx0XHRcdHN0YXJ0OiBfdHJpZ2dlclBvcyArIF9vcHRpb25zLm9mZnNldFxuXHRcdFx0fTtcblx0XHRcdGlmIChfY29udHJvbGxlciAmJiBfb3B0aW9ucy50cmlnZ2VyRWxlbWVudCkge1xuXHRcdFx0XHQvLyB0YWtlIGF3YXkgdHJpZ2dlckhvb2sgcG9ydGlvbiB0byBnZXQgcmVsYXRpdmUgdG8gdG9wXG5cdFx0XHRcdF9zY3JvbGxPZmZzZXQuc3RhcnQgLT0gX2NvbnRyb2xsZXIuaW5mbyhcInNpemVcIikgKiBfb3B0aW9ucy50cmlnZ2VySG9vaztcblx0XHRcdH1cblx0XHRcdF9zY3JvbGxPZmZzZXQuZW5kID0gX3Njcm9sbE9mZnNldC5zdGFydCArIF9vcHRpb25zLmR1cmF0aW9uO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBVcGRhdGVzIHRoZSBkdXJhdGlvbiBpZiBzZXQgdG8gYSBkeW5hbWljIGZ1bmN0aW9uLlxuXHRcdCAqIFRoaXMgbWV0aG9kIGlzIGNhbGxlZCB3aGVuIHRoZSBzY2VuZSBpcyBhZGRlZCB0byBhIGNvbnRyb2xsZXIgYW5kIGluIHJlZ3VsYXIgaW50ZXJ2YWxzIGZyb20gdGhlIGNvbnRyb2xsZXIgdGhyb3VnaCBzY2VuZS5yZWZyZXNoKCkuXG5cdFx0ICogXG5cdFx0ICogQGZpcmVzIHtAbGluayBTY2VuZS5jaGFuZ2V9LCBpZiB0aGUgZHVyYXRpb24gY2hhbmdlZFxuXHRcdCAqIEBmaXJlcyB7QGxpbmsgU2NlbmUuc2hpZnR9LCBpZiB0aGUgZHVyYXRpb24gY2hhbmdlZFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtib29sZWFufSBbc3VwcHJlc3NFdmVudHM9ZmFsc2VdIC0gSWYgdHJ1ZSB0aGUgc2hpZnQgZXZlbnQgd2lsbCBiZSBzdXBwcmVzc2VkLlxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0dmFyIHVwZGF0ZUR1cmF0aW9uID0gZnVuY3Rpb24gKHN1cHByZXNzRXZlbnRzKSB7XG5cdFx0XHQvLyB1cGRhdGUgZHVyYXRpb25cblx0XHRcdGlmIChfZHVyYXRpb25VcGRhdGVNZXRob2QpIHtcblx0XHRcdFx0dmFyIHZhcm5hbWUgPSBcImR1cmF0aW9uXCI7XG5cdFx0XHRcdGlmIChjaGFuZ2VPcHRpb24odmFybmFtZSwgX2R1cmF0aW9uVXBkYXRlTWV0aG9kLmNhbGwoU2NlbmUpKSAmJiAhc3VwcHJlc3NFdmVudHMpIHsgLy8gc2V0XG5cdFx0XHRcdFx0U2NlbmUudHJpZ2dlcihcImNoYW5nZVwiLCB7XG5cdFx0XHRcdFx0XHR3aGF0OiB2YXJuYW1lLFxuXHRcdFx0XHRcdFx0bmV3dmFsOiBfb3B0aW9uc1t2YXJuYW1lXVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFNjZW5lLnRyaWdnZXIoXCJzaGlmdFwiLCB7XG5cdFx0XHRcdFx0XHRyZWFzb246IHZhcm5hbWVcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBVcGRhdGVzIHRoZSBwb3NpdGlvbiBvZiB0aGUgdHJpZ2dlckVsZW1lbnQsIGlmIHByZXNlbnQuXG5cdFx0ICogVGhpcyBtZXRob2QgaXMgY2FsbGVkIC4uLlxuXHRcdCAqICAtIC4uLiB3aGVuIHRoZSB0cmlnZ2VyRWxlbWVudCBpcyBjaGFuZ2VkXG5cdFx0ICogIC0gLi4uIHdoZW4gdGhlIHNjZW5lIGlzIGFkZGVkIHRvIGEgKG5ldykgY29udHJvbGxlclxuXHRcdCAqICAtIC4uLiBpbiByZWd1bGFyIGludGVydmFscyBmcm9tIHRoZSBjb250cm9sbGVyIHRocm91Z2ggc2NlbmUucmVmcmVzaCgpLlxuXHRcdCAqIFxuXHRcdCAqIEBmaXJlcyB7QGxpbmsgU2NlbmUuc2hpZnR9LCBpZiB0aGUgcG9zaXRpb24gY2hhbmdlZFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtib29sZWFufSBbc3VwcHJlc3NFdmVudHM9ZmFsc2VdIC0gSWYgdHJ1ZSB0aGUgc2hpZnQgZXZlbnQgd2lsbCBiZSBzdXBwcmVzc2VkLlxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0dmFyIHVwZGF0ZVRyaWdnZXJFbGVtZW50UG9zaXRpb24gPSBmdW5jdGlvbiAoc3VwcHJlc3NFdmVudHMpIHtcblx0XHRcdHZhclxuXHRcdFx0ZWxlbWVudFBvcyA9IDAsXG5cdFx0XHRcdHRlbGVtID0gX29wdGlvbnMudHJpZ2dlckVsZW1lbnQ7XG5cdFx0XHRpZiAoX2NvbnRyb2xsZXIgJiYgdGVsZW0pIHtcblx0XHRcdFx0dmFyXG5cdFx0XHRcdGNvbnRyb2xsZXJJbmZvID0gX2NvbnRyb2xsZXIuaW5mbygpLFxuXHRcdFx0XHRcdGNvbnRhaW5lck9mZnNldCA9IF91dGlsLmdldC5vZmZzZXQoY29udHJvbGxlckluZm8uY29udGFpbmVyKSxcblx0XHRcdFx0XHQvLyBjb250YWluZXIgcG9zaXRpb24gaXMgbmVlZGVkIGJlY2F1c2UgZWxlbWVudCBvZmZzZXQgaXMgcmV0dXJuZWQgaW4gcmVsYXRpb24gdG8gZG9jdW1lbnQsIG5vdCBpbiByZWxhdGlvbiB0byBjb250YWluZXIuXG5cdFx0XHRcdFx0cGFyYW0gPSBjb250cm9sbGVySW5mby52ZXJ0aWNhbCA/IFwidG9wXCIgOiBcImxlZnRcIjsgLy8gd2hpY2ggcGFyYW0gaXMgb2YgaW50ZXJlc3QgP1xuXHRcdFx0XHQvLyBpZiBwYXJlbnQgaXMgc3BhY2VyLCB1c2Ugc3BhY2VyIHBvc2l0aW9uIGluc3RlYWQgc28gY29ycmVjdCBzdGFydCBwb3NpdGlvbiBpcyByZXR1cm5lZCBmb3IgcGlubmVkIGVsZW1lbnRzLlxuXHRcdFx0XHR3aGlsZSAodGVsZW0ucGFyZW50Tm9kZS5oYXNBdHRyaWJ1dGUoUElOX1NQQUNFUl9BVFRSSUJVVEUpKSB7XG5cdFx0XHRcdFx0dGVsZW0gPSB0ZWxlbS5wYXJlbnROb2RlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIGVsZW1lbnRPZmZzZXQgPSBfdXRpbC5nZXQub2Zmc2V0KHRlbGVtKTtcblxuXHRcdFx0XHRpZiAoIWNvbnRyb2xsZXJJbmZvLmlzRG9jdW1lbnQpIHsgLy8gY29udGFpbmVyIGlzIG5vdCB0aGUgZG9jdW1lbnQgcm9vdCwgc28gc3Vic3RyYWN0IHNjcm9sbCBQb3NpdGlvbiB0byBnZXQgY29ycmVjdCB0cmlnZ2VyIGVsZW1lbnQgcG9zaXRpb24gcmVsYXRpdmUgdG8gc2Nyb2xsY29udGVudFxuXHRcdFx0XHRcdGNvbnRhaW5lck9mZnNldFtwYXJhbV0gLT0gX2NvbnRyb2xsZXIuc2Nyb2xsUG9zKCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRlbGVtZW50UG9zID0gZWxlbWVudE9mZnNldFtwYXJhbV0gLSBjb250YWluZXJPZmZzZXRbcGFyYW1dO1xuXHRcdFx0fVxuXHRcdFx0dmFyIGNoYW5nZWQgPSBlbGVtZW50UG9zICE9IF90cmlnZ2VyUG9zO1xuXHRcdFx0X3RyaWdnZXJQb3MgPSBlbGVtZW50UG9zO1xuXHRcdFx0aWYgKGNoYW5nZWQgJiYgIXN1cHByZXNzRXZlbnRzKSB7XG5cdFx0XHRcdFNjZW5lLnRyaWdnZXIoXCJzaGlmdFwiLCB7XG5cdFx0XHRcdFx0cmVhc29uOiBcInRyaWdnZXJFbGVtZW50UG9zaXRpb25cIlxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogVHJpZ2dlciBhIHNoaWZ0IGV2ZW50LCB3aGVuIHRoZSBjb250YWluZXIgaXMgcmVzaXplZCBhbmQgdGhlIHRyaWdnZXJIb29rIGlzID4gMS5cblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdHZhciBvbkNvbnRhaW5lclJlc2l6ZSA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRpZiAoX29wdGlvbnMudHJpZ2dlckhvb2sgPiAwKSB7XG5cdFx0XHRcdFNjZW5lLnRyaWdnZXIoXCJzaGlmdFwiLCB7XG5cdFx0XHRcdFx0cmVhc29uOiBcImNvbnRhaW5lclJlc2l6ZVwiXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHR2YXIgX3ZhbGlkYXRlID0gX3V0aWwuZXh0ZW5kKFNDRU5FX09QVElPTlMudmFsaWRhdGUsIHtcblx0XHRcdC8vIHZhbGlkYXRpb24gZm9yIGR1cmF0aW9uIGhhbmRsZWQgaW50ZXJuYWxseSBmb3IgcmVmZXJlbmNlIHRvIHByaXZhdGUgdmFyIF9kdXJhdGlvbk1ldGhvZFxuXHRcdFx0ZHVyYXRpb246IGZ1bmN0aW9uICh2YWwpIHtcblx0XHRcdFx0aWYgKF91dGlsLnR5cGUuU3RyaW5nKHZhbCkgJiYgdmFsLm1hdGNoKC9eKFxcLnxcXGQpKlxcZCslJC8pKSB7XG5cdFx0XHRcdFx0Ly8gcGVyY2VudGFnZSB2YWx1ZVxuXHRcdFx0XHRcdHZhciBwZXJjID0gcGFyc2VGbG9hdCh2YWwpIC8gMTAwO1xuXHRcdFx0XHRcdHZhbCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHJldHVybiBfY29udHJvbGxlciA/IF9jb250cm9sbGVyLmluZm8oXCJzaXplXCIpICogcGVyYyA6IDA7XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoX3V0aWwudHlwZS5GdW5jdGlvbih2YWwpKSB7XG5cdFx0XHRcdFx0Ly8gZnVuY3Rpb25cblx0XHRcdFx0XHRfZHVyYXRpb25VcGRhdGVNZXRob2QgPSB2YWw7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdHZhbCA9IHBhcnNlRmxvYXQoX2R1cmF0aW9uVXBkYXRlTWV0aG9kKCkpO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRcdHZhbCA9IC0xOyAvLyB3aWxsIGNhdXNlIGVycm9yIGJlbG93XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIHZhbCBoYXMgdG8gYmUgZmxvYXRcblx0XHRcdFx0dmFsID0gcGFyc2VGbG9hdCh2YWwpO1xuXHRcdFx0XHRpZiAoIV91dGlsLnR5cGUuTnVtYmVyKHZhbCkgfHwgdmFsIDwgMCkge1xuXHRcdFx0XHRcdGlmIChfZHVyYXRpb25VcGRhdGVNZXRob2QpIHtcblx0XHRcdFx0XHRcdF9kdXJhdGlvblVwZGF0ZU1ldGhvZCA9IHVuZGVmaW5lZDtcblx0XHRcdFx0XHRcdHRocm93IFtcIkludmFsaWQgcmV0dXJuIHZhbHVlIG9mIHN1cHBsaWVkIGZ1bmN0aW9uIGZvciBvcHRpb24gXFxcImR1cmF0aW9uXFxcIjpcIiwgdmFsXTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dGhyb3cgW1wiSW52YWxpZCB2YWx1ZSBmb3Igb3B0aW9uIFxcXCJkdXJhdGlvblxcXCI6XCIsIHZhbF07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB2YWw7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvKipcblx0XHQgKiBDaGVja3MgdGhlIHZhbGlkaXR5IG9mIGEgc3BlY2lmaWMgb3IgYWxsIG9wdGlvbnMgYW5kIHJlc2V0IHRvIGRlZmF1bHQgaWYgbmVjY2Vzc2FyeS5cblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdHZhciB2YWxpZGF0ZU9wdGlvbiA9IGZ1bmN0aW9uIChjaGVjaykge1xuXHRcdFx0Y2hlY2sgPSBhcmd1bWVudHMubGVuZ3RoID8gW2NoZWNrXSA6IE9iamVjdC5rZXlzKF92YWxpZGF0ZSk7XG5cdFx0XHRjaGVjay5mb3JFYWNoKGZ1bmN0aW9uIChvcHRpb25OYW1lLCBrZXkpIHtcblx0XHRcdFx0dmFyIHZhbHVlO1xuXHRcdFx0XHRpZiAoX3ZhbGlkYXRlW29wdGlvbk5hbWVdKSB7IC8vIHRoZXJlIGlzIGEgdmFsaWRhdGlvbiBtZXRob2QgZm9yIHRoaXMgb3B0aW9uXG5cdFx0XHRcdFx0dHJ5IHsgLy8gdmFsaWRhdGUgdmFsdWVcblx0XHRcdFx0XHRcdHZhbHVlID0gX3ZhbGlkYXRlW29wdGlvbk5hbWVdKF9vcHRpb25zW29wdGlvbk5hbWVdKTtcblx0XHRcdFx0XHR9IGNhdGNoIChlKSB7IC8vIHZhbGlkYXRpb24gZmFpbGVkIC0+IHJlc2V0IHRvIGRlZmF1bHRcblx0XHRcdFx0XHRcdHZhbHVlID0gREVGQVVMVF9PUFRJT05TW29wdGlvbk5hbWVdO1xuXHRcdFx0XHRcdFx0dmFyIGxvZ01TRyA9IF91dGlsLnR5cGUuU3RyaW5nKGUpID8gW2VdIDogZTtcblx0XHRcdFx0XHRcdGlmIChfdXRpbC50eXBlLkFycmF5KGxvZ01TRykpIHtcblx0XHRcdFx0XHRcdFx0bG9nTVNHWzBdID0gXCJFUlJPUjogXCIgKyBsb2dNU0dbMF07XG5cdFx0XHRcdFx0XHRcdGxvZ01TRy51bnNoaWZ0KDEpOyAvLyBsb2dsZXZlbCAxIGZvciBlcnJvciBtc2dcblx0XHRcdFx0XHRcdFx0bG9nLmFwcGx5KHRoaXMsIGxvZ01TRyk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRsb2coMSwgXCJFUlJPUjogUHJvYmxlbSBleGVjdXRpbmcgdmFsaWRhdGlvbiBjYWxsYmFjayBmb3Igb3B0aW9uICdcIiArIG9wdGlvbk5hbWUgKyBcIic6XCIsIGUubWVzc2FnZSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBmaW5hbGx5IHtcblx0XHRcdFx0XHRcdF9vcHRpb25zW29wdGlvbk5hbWVdID0gdmFsdWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogSGVscGVyIHVzZWQgYnkgdGhlIHNldHRlci9nZXR0ZXJzIGZvciBzY2VuZSBvcHRpb25zXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHR2YXIgY2hhbmdlT3B0aW9uID0gZnVuY3Rpb24gKHZhcm5hbWUsIG5ld3ZhbCkge1xuXHRcdFx0dmFyXG5cdFx0XHRjaGFuZ2VkID0gZmFsc2UsXG5cdFx0XHRcdG9sZHZhbCA9IF9vcHRpb25zW3Zhcm5hbWVdO1xuXHRcdFx0aWYgKF9vcHRpb25zW3Zhcm5hbWVdICE9IG5ld3ZhbCkge1xuXHRcdFx0XHRfb3B0aW9uc1t2YXJuYW1lXSA9IG5ld3ZhbDtcblx0XHRcdFx0dmFsaWRhdGVPcHRpb24odmFybmFtZSk7IC8vIHJlc2V0cyB0byBkZWZhdWx0IGlmIG5lY2Vzc2FyeVxuXHRcdFx0XHRjaGFuZ2VkID0gb2xkdmFsICE9IF9vcHRpb25zW3Zhcm5hbWVdO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGNoYW5nZWQ7XG5cdFx0fTtcblxuXHRcdC8vIGdlbmVyYXRlIGdldHRlcnMvc2V0dGVycyBmb3IgYWxsIG9wdGlvbnNcblx0XHR2YXIgYWRkU2NlbmVPcHRpb24gPSBmdW5jdGlvbiAob3B0aW9uTmFtZSkge1xuXHRcdFx0aWYgKCFTY2VuZVtvcHRpb25OYW1lXSkge1xuXHRcdFx0XHRTY2VuZVtvcHRpb25OYW1lXSA9IGZ1bmN0aW9uIChuZXdWYWwpIHtcblx0XHRcdFx0XHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHsgLy8gZ2V0XG5cdFx0XHRcdFx0XHRyZXR1cm4gX29wdGlvbnNbb3B0aW9uTmFtZV07XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGlmIChvcHRpb25OYW1lID09PSBcImR1cmF0aW9uXCIpIHsgLy8gbmV3IGR1cmF0aW9uIGlzIHNldCwgc28gYW55IHByZXZpb3VzbHkgc2V0IGZ1bmN0aW9uIG11c3QgYmUgdW5zZXRcblx0XHRcdFx0XHRcdFx0X2R1cmF0aW9uVXBkYXRlTWV0aG9kID0gdW5kZWZpbmVkO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKGNoYW5nZU9wdGlvbihvcHRpb25OYW1lLCBuZXdWYWwpKSB7IC8vIHNldFxuXHRcdFx0XHRcdFx0XHRTY2VuZS50cmlnZ2VyKFwiY2hhbmdlXCIsIHtcblx0XHRcdFx0XHRcdFx0XHR3aGF0OiBvcHRpb25OYW1lLFxuXHRcdFx0XHRcdFx0XHRcdG5ld3ZhbDogX29wdGlvbnNbb3B0aW9uTmFtZV1cblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdGlmIChTQ0VORV9PUFRJT05TLnNoaWZ0cy5pbmRleE9mKG9wdGlvbk5hbWUpID4gLTEpIHtcblx0XHRcdFx0XHRcdFx0XHRTY2VuZS50cmlnZ2VyKFwic2hpZnRcIiwge1xuXHRcdFx0XHRcdFx0XHRcdFx0cmVhc29uOiBvcHRpb25OYW1lXG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIFNjZW5lO1xuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiAqKkdldCoqIG9yICoqU2V0KiogdGhlIGR1cmF0aW9uIG9wdGlvbiB2YWx1ZS5cblx0XHQgKiBBcyBhIHNldHRlciBpdCBhbHNvIGFjY2VwdHMgYSBmdW5jdGlvbiByZXR1cm5pbmcgYSBudW1lcmljIHZhbHVlLiAgXG5cdFx0ICogVGhpcyBpcyBwYXJ0aWN1bGFybHkgdXNlZnVsIGZvciByZXNwb25zaXZlIHNldHVwcy5cblx0XHQgKlxuXHRcdCAqIFRoZSBkdXJhdGlvbiBpcyB1cGRhdGVkIHVzaW5nIHRoZSBzdXBwbGllZCBmdW5jdGlvbiBldmVyeSB0aW1lIGBTY2VuZS5yZWZyZXNoKClgIGlzIGNhbGxlZCwgd2hpY2ggaGFwcGVucyBwZXJpb2RpY2FsbHkgZnJvbSB0aGUgY29udHJvbGxlciAoc2VlIFNjcm9sbE1hZ2ljLkNvbnRyb2xsZXIgb3B0aW9uIGByZWZyZXNoSW50ZXJ2YWxgKS4gIFxuXHRcdCAqIF8qKk5PVEU6KiogQmUgYXdhcmUgdGhhdCBpdCdzIGFuIGVhc3kgd2F5IHRvIGtpbGwgcGVyZm9ybWFuY2UsIGlmIHlvdSBzdXBwbHkgYSBmdW5jdGlvbiB0aGF0IGhhcyBoaWdoIENQVSBkZW1hbmQuICBcblx0XHQgKiBFdmVuIGZvciBzaXplIGFuZCBwb3NpdGlvbiBjYWxjdWxhdGlvbnMgaXQgaXMgcmVjb21tZW5kZWQgdG8gdXNlIGEgdmFyaWFibGUgdG8gY2FjaGUgdGhlIHZhbHVlLiAoc2VlIGV4YW1wbGUpICBcblx0XHQgKiBUaGlzIGNvdW50cyBkb3VibGUgaWYgeW91IHVzZSB0aGUgc2FtZSBmdW5jdGlvbiBmb3IgbXVsdGlwbGUgc2NlbmVzLl9cblx0XHQgKlxuXHRcdCAqIEBtZXRob2QgU2Nyb2xsTWFnaWMuU2NlbmUjZHVyYXRpb25cblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIC8vIGdldCB0aGUgY3VycmVudCBkdXJhdGlvbiB2YWx1ZVxuXHRcdCAqIHZhciBkdXJhdGlvbiA9IHNjZW5lLmR1cmF0aW9uKCk7XG5cdFx0ICpcblx0XHQgKiAvLyBzZXQgYSBuZXcgZHVyYXRpb25cblx0XHQgKiBzY2VuZS5kdXJhdGlvbigzMDApO1xuXHRcdCAqXG5cdFx0ICogLy8gdXNlIGEgZnVuY3Rpb24gdG8gYXV0b21hdGljYWxseSBhZGp1c3QgdGhlIGR1cmF0aW9uIHRvIHRoZSB3aW5kb3cgaGVpZ2h0LlxuXHRcdCAqIHZhciBkdXJhdGlvblZhbHVlQ2FjaGU7XG5cdFx0ICogZnVuY3Rpb24gZ2V0RHVyYXRpb24gKCkge1xuXHRcdCAqICAgcmV0dXJuIGR1cmF0aW9uVmFsdWVDYWNoZTtcblx0XHQgKiB9XG5cdFx0ICogZnVuY3Rpb24gdXBkYXRlRHVyYXRpb24gKGUpIHtcblx0XHQgKiAgIGR1cmF0aW9uVmFsdWVDYWNoZSA9IHdpbmRvdy5pbm5lckhlaWdodDtcblx0XHQgKiB9XG5cdFx0ICogJCh3aW5kb3cpLm9uKFwicmVzaXplXCIsIHVwZGF0ZUR1cmF0aW9uKTsgLy8gdXBkYXRlIHRoZSBkdXJhdGlvbiB3aGVuIHRoZSB3aW5kb3cgc2l6ZSBjaGFuZ2VzXG5cdFx0ICogJCh3aW5kb3cpLnRyaWdnZXJIYW5kbGVyKFwicmVzaXplXCIpOyAvLyBzZXQgdG8gaW5pdGlhbCB2YWx1ZVxuXHRcdCAqIHNjZW5lLmR1cmF0aW9uKGdldER1cmF0aW9uKTsgLy8gc3VwcGx5IGR1cmF0aW9uIG1ldGhvZFxuXHRcdCAqXG5cdFx0ICogQGZpcmVzIHtAbGluayBTY2VuZS5jaGFuZ2V9LCB3aGVuIHVzZWQgYXMgc2V0dGVyXG5cdFx0ICogQGZpcmVzIHtAbGluayBTY2VuZS5zaGlmdH0sIHdoZW4gdXNlZCBhcyBzZXR0ZXJcblx0XHQgKiBAcGFyYW0geyhudW1iZXJ8ZnVuY3Rpb24pfSBbbmV3RHVyYXRpb25dIC0gVGhlIG5ldyBkdXJhdGlvbiBvZiB0aGUgc2NlbmUuXG5cdFx0ICogQHJldHVybnMge251bWJlcn0gYGdldGAgLSAgQ3VycmVudCBzY2VuZSBkdXJhdGlvbi5cblx0XHQgKiBAcmV0dXJucyB7U2NlbmV9IGBzZXRgIC0gIFBhcmVudCBvYmplY3QgZm9yIGNoYWluaW5nLlxuXHRcdCAqL1xuXG5cdFx0LyoqXG5cdFx0ICogKipHZXQqKiBvciAqKlNldCoqIHRoZSBvZmZzZXQgb3B0aW9uIHZhbHVlLlxuXHRcdCAqIEBtZXRob2QgU2Nyb2xsTWFnaWMuU2NlbmUjb2Zmc2V0XG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiAvLyBnZXQgdGhlIGN1cnJlbnQgb2Zmc2V0XG5cdFx0ICogdmFyIG9mZnNldCA9IHNjZW5lLm9mZnNldCgpO1xuXHRcdCAqXG5cdFx0ICogLy8gc2V0IGEgbmV3IG9mZnNldFxuXHRcdCAqIHNjZW5lLm9mZnNldCgxMDApO1xuXHRcdCAqXG5cdFx0ICogQGZpcmVzIHtAbGluayBTY2VuZS5jaGFuZ2V9LCB3aGVuIHVzZWQgYXMgc2V0dGVyXG5cdFx0ICogQGZpcmVzIHtAbGluayBTY2VuZS5zaGlmdH0sIHdoZW4gdXNlZCBhcyBzZXR0ZXJcblx0XHQgKiBAcGFyYW0ge251bWJlcn0gW25ld09mZnNldF0gLSBUaGUgbmV3IG9mZnNldCBvZiB0aGUgc2NlbmUuXG5cdFx0ICogQHJldHVybnMge251bWJlcn0gYGdldGAgLSAgQ3VycmVudCBzY2VuZSBvZmZzZXQuXG5cdFx0ICogQHJldHVybnMge1NjZW5lfSBgc2V0YCAtICBQYXJlbnQgb2JqZWN0IGZvciBjaGFpbmluZy5cblx0XHQgKi9cblxuXHRcdC8qKlxuXHRcdCAqICoqR2V0Kiogb3IgKipTZXQqKiB0aGUgdHJpZ2dlckVsZW1lbnQgb3B0aW9uIHZhbHVlLlxuXHRcdCAqIERvZXMgKipub3QqKiBmaXJlIGBTY2VuZS5zaGlmdGAsIGJlY2F1c2UgY2hhbmdpbmcgdGhlIHRyaWdnZXIgRWxlbWVudCBkb2Vzbid0IG5lY2Vzc2FyaWx5IG1lYW4gdGhlIHN0YXJ0IHBvc2l0aW9uIGNoYW5nZXMuIFRoaXMgd2lsbCBiZSBkZXRlcm1pbmVkIGluIGBTY2VuZS5yZWZyZXNoKClgLCB3aGljaCBpcyBhdXRvbWF0aWNhbGx5IHRyaWdnZXJlZC5cblx0XHQgKiBAbWV0aG9kIFNjcm9sbE1hZ2ljLlNjZW5lI3RyaWdnZXJFbGVtZW50XG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiAvLyBnZXQgdGhlIGN1cnJlbnQgdHJpZ2dlckVsZW1lbnRcblx0XHQgKiB2YXIgdHJpZ2dlckVsZW1lbnQgPSBzY2VuZS50cmlnZ2VyRWxlbWVudCgpO1xuXHRcdCAqXG5cdFx0ICogLy8gc2V0IGEgbmV3IHRyaWdnZXJFbGVtZW50IHVzaW5nIGEgc2VsZWN0b3Jcblx0XHQgKiBzY2VuZS50cmlnZ2VyRWxlbWVudChcIiN0cmlnZ2VyXCIpO1xuXHRcdCAqIC8vIHNldCBhIG5ldyB0cmlnZ2VyRWxlbWVudCB1c2luZyBhIERPTSBvYmplY3Rcblx0XHQgKiBzY2VuZS50cmlnZ2VyRWxlbWVudChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRyaWdnZXJcIikpO1xuXHRcdCAqXG5cdFx0ICogQGZpcmVzIHtAbGluayBTY2VuZS5jaGFuZ2V9LCB3aGVuIHVzZWQgYXMgc2V0dGVyXG5cdFx0ICogQHBhcmFtIHsoc3RyaW5nfG9iamVjdCl9IFtuZXdUcmlnZ2VyRWxlbWVudF0gLSBUaGUgbmV3IHRyaWdnZXIgZWxlbWVudCBmb3IgdGhlIHNjZW5lLlxuXHRcdCAqIEByZXR1cm5zIHsoc3RyaW5nfG9iamVjdCl9IGBnZXRgIC0gIEN1cnJlbnQgdHJpZ2dlckVsZW1lbnQuXG5cdFx0ICogQHJldHVybnMge1NjZW5lfSBgc2V0YCAtICBQYXJlbnQgb2JqZWN0IGZvciBjaGFpbmluZy5cblx0XHQgKi9cblxuXHRcdC8qKlxuXHRcdCAqICoqR2V0Kiogb3IgKipTZXQqKiB0aGUgdHJpZ2dlckhvb2sgb3B0aW9uIHZhbHVlLlxuXHRcdCAqIEBtZXRob2QgU2Nyb2xsTWFnaWMuU2NlbmUjdHJpZ2dlckhvb2tcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIC8vIGdldCB0aGUgY3VycmVudCB0cmlnZ2VySG9vayB2YWx1ZVxuXHRcdCAqIHZhciB0cmlnZ2VySG9vayA9IHNjZW5lLnRyaWdnZXJIb29rKCk7XG5cdFx0ICpcblx0XHQgKiAvLyBzZXQgYSBuZXcgdHJpZ2dlckhvb2sgdXNpbmcgYSBzdHJpbmdcblx0XHQgKiBzY2VuZS50cmlnZ2VySG9vayhcIm9uTGVhdmVcIik7XG5cdFx0ICogLy8gc2V0IGEgbmV3IHRyaWdnZXJIb29rIHVzaW5nIGEgbnVtYmVyXG5cdFx0ICogc2NlbmUudHJpZ2dlckhvb2soMC43KTtcblx0XHQgKlxuXHRcdCAqIEBmaXJlcyB7QGxpbmsgU2NlbmUuY2hhbmdlfSwgd2hlbiB1c2VkIGFzIHNldHRlclxuXHRcdCAqIEBmaXJlcyB7QGxpbmsgU2NlbmUuc2hpZnR9LCB3aGVuIHVzZWQgYXMgc2V0dGVyXG5cdFx0ICogQHBhcmFtIHsobnVtYmVyfHN0cmluZyl9IFtuZXdUcmlnZ2VySG9va10gLSBUaGUgbmV3IHRyaWdnZXJIb29rIG9mIHRoZSBzY2VuZS4gU2VlIHtAbGluayBTY2VuZX0gcGFyYW1ldGVyIGRlc2NyaXB0aW9uIGZvciB2YWx1ZSBvcHRpb25zLlxuXHRcdCAqIEByZXR1cm5zIHtudW1iZXJ9IGBnZXRgIC0gIEN1cnJlbnQgdHJpZ2dlckhvb2sgKEFMV0FZUyBudW1lcmljYWwpLlxuXHRcdCAqIEByZXR1cm5zIHtTY2VuZX0gYHNldGAgLSAgUGFyZW50IG9iamVjdCBmb3IgY2hhaW5pbmcuXG5cdFx0ICovXG5cblx0XHQvKipcblx0XHQgKiAqKkdldCoqIG9yICoqU2V0KiogdGhlIHJldmVyc2Ugb3B0aW9uIHZhbHVlLlxuXHRcdCAqIEBtZXRob2QgU2Nyb2xsTWFnaWMuU2NlbmUjcmV2ZXJzZVxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogLy8gZ2V0IHRoZSBjdXJyZW50IHJldmVyc2Ugb3B0aW9uXG5cdFx0ICogdmFyIHJldmVyc2UgPSBzY2VuZS5yZXZlcnNlKCk7XG5cdFx0ICpcblx0XHQgKiAvLyBzZXQgbmV3IHJldmVyc2Ugb3B0aW9uXG5cdFx0ICogc2NlbmUucmV2ZXJzZShmYWxzZSk7XG5cdFx0ICpcblx0XHQgKiBAZmlyZXMge0BsaW5rIFNjZW5lLmNoYW5nZX0sIHdoZW4gdXNlZCBhcyBzZXR0ZXJcblx0XHQgKiBAcGFyYW0ge2Jvb2xlYW59IFtuZXdSZXZlcnNlXSAtIFRoZSBuZXcgcmV2ZXJzZSBzZXR0aW5nIG9mIHRoZSBzY2VuZS5cblx0XHQgKiBAcmV0dXJucyB7Ym9vbGVhbn0gYGdldGAgLSAgQ3VycmVudCByZXZlcnNlIG9wdGlvbiB2YWx1ZS5cblx0XHQgKiBAcmV0dXJucyB7U2NlbmV9IGBzZXRgIC0gIFBhcmVudCBvYmplY3QgZm9yIGNoYWluaW5nLlxuXHRcdCAqL1xuXG5cdFx0LyoqXG5cdFx0ICogKipHZXQqKiBvciAqKlNldCoqIHRoZSBsb2dsZXZlbCBvcHRpb24gdmFsdWUuXG5cdFx0ICogQG1ldGhvZCBTY3JvbGxNYWdpYy5TY2VuZSNsb2dsZXZlbFxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogLy8gZ2V0IHRoZSBjdXJyZW50IGxvZ2xldmVsXG5cdFx0ICogdmFyIGxvZ2xldmVsID0gc2NlbmUubG9nbGV2ZWwoKTtcblx0XHQgKlxuXHRcdCAqIC8vIHNldCBuZXcgbG9nbGV2ZWxcblx0XHQgKiBzY2VuZS5sb2dsZXZlbCgzKTtcblx0XHQgKlxuXHRcdCAqIEBmaXJlcyB7QGxpbmsgU2NlbmUuY2hhbmdlfSwgd2hlbiB1c2VkIGFzIHNldHRlclxuXHRcdCAqIEBwYXJhbSB7bnVtYmVyfSBbbmV3TG9nbGV2ZWxdIC0gVGhlIG5ldyBsb2dsZXZlbCBzZXR0aW5nIG9mIHRoZSBzY2VuZS4gYFswLTNdYFxuXHRcdCAqIEByZXR1cm5zIHtudW1iZXJ9IGBnZXRgIC0gIEN1cnJlbnQgbG9nbGV2ZWwuXG5cdFx0ICogQHJldHVybnMge1NjZW5lfSBgc2V0YCAtICBQYXJlbnQgb2JqZWN0IGZvciBjaGFpbmluZy5cblx0XHQgKi9cblxuXHRcdC8qKlxuXHRcdCAqICoqR2V0KiogdGhlIGFzc29jaWF0ZWQgY29udHJvbGxlci5cblx0XHQgKiBAbWV0aG9kIFNjcm9sbE1hZ2ljLlNjZW5lI2NvbnRyb2xsZXJcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIC8vIGdldCB0aGUgY29udHJvbGxlciBvZiBhIHNjZW5lXG5cdFx0ICogdmFyIGNvbnRyb2xsZXIgPSBzY2VuZS5jb250cm9sbGVyKCk7XG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7U2Nyb2xsTWFnaWMuQ29udHJvbGxlcn0gUGFyZW50IGNvbnRyb2xsZXIgb3IgYHVuZGVmaW5lZGBcblx0XHQgKi9cblx0XHR0aGlzLmNvbnRyb2xsZXIgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4gX2NvbnRyb2xsZXI7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqICoqR2V0KiogdGhlIGN1cnJlbnQgc3RhdGUuXG5cdFx0ICogQG1ldGhvZCBTY3JvbGxNYWdpYy5TY2VuZSNzdGF0ZVxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogLy8gZ2V0IHRoZSBjdXJyZW50IHN0YXRlXG5cdFx0ICogdmFyIHN0YXRlID0gc2NlbmUuc3RhdGUoKTtcblx0XHQgKlxuXHRcdCAqIEByZXR1cm5zIHtzdHJpbmd9IGBcIkJFRk9SRVwiYCwgYFwiRFVSSU5HXCJgIG9yIGBcIkFGVEVSXCJgXG5cdFx0ICovXG5cdFx0dGhpcy5zdGF0ZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdHJldHVybiBfc3RhdGU7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqICoqR2V0KiogdGhlIGN1cnJlbnQgc2Nyb2xsIG9mZnNldCBmb3IgdGhlIHN0YXJ0IG9mIHRoZSBzY2VuZS4gIFxuXHRcdCAqIE1pbmQsIHRoYXQgdGhlIHNjcm9sbE9mZnNldCBpcyByZWxhdGVkIHRvIHRoZSBzaXplIG9mIHRoZSBjb250YWluZXIsIGlmIGB0cmlnZ2VySG9va2AgaXMgYmlnZ2VyIHRoYW4gYDBgIChvciBgXCJvbkxlYXZlXCJgKS4gIFxuXHRcdCAqIFRoaXMgbWVhbnMsIHRoYXQgcmVzaXppbmcgdGhlIGNvbnRhaW5lciBvciBjaGFuZ2luZyB0aGUgYHRyaWdnZXJIb29rYCB3aWxsIGluZmx1ZW5jZSB0aGUgc2NlbmUncyBzdGFydCBvZmZzZXQuXG5cdFx0ICogQG1ldGhvZCBTY3JvbGxNYWdpYy5TY2VuZSNzY3JvbGxPZmZzZXRcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIC8vIGdldCB0aGUgY3VycmVudCBzY3JvbGwgb2Zmc2V0IGZvciB0aGUgc3RhcnQgYW5kIGVuZCBvZiB0aGUgc2NlbmUuXG5cdFx0ICogdmFyIHN0YXJ0ID0gc2NlbmUuc2Nyb2xsT2Zmc2V0KCk7XG5cdFx0ICogdmFyIGVuZCA9IHNjZW5lLnNjcm9sbE9mZnNldCgpICsgc2NlbmUuZHVyYXRpb24oKTtcblx0XHQgKiBjb25zb2xlLmxvZyhcInRoZSBzY2VuZSBzdGFydHMgYXRcIiwgc3RhcnQsIFwiYW5kIGVuZHMgYXRcIiwgZW5kKTtcblx0XHQgKlxuXHRcdCAqIEByZXR1cm5zIHtudW1iZXJ9IFRoZSBzY3JvbGwgb2Zmc2V0IChvZiB0aGUgY29udGFpbmVyKSBhdCB3aGljaCB0aGUgc2NlbmUgd2lsbCB0cmlnZ2VyLiBZIHZhbHVlIGZvciB2ZXJ0aWNhbCBhbmQgWCB2YWx1ZSBmb3IgaG9yaXpvbnRhbCBzY3JvbGxzLlxuXHRcdCAqL1xuXHRcdHRoaXMuc2Nyb2xsT2Zmc2V0ID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0cmV0dXJuIF9zY3JvbGxPZmZzZXQuc3RhcnQ7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqICoqR2V0KiogdGhlIHRyaWdnZXIgcG9zaXRpb24gb2YgdGhlIHNjZW5lIChpbmNsdWRpbmcgdGhlIHZhbHVlIG9mIHRoZSBgb2Zmc2V0YCBvcHRpb24pLiAgXG5cdFx0ICogQG1ldGhvZCBTY3JvbGxNYWdpYy5TY2VuZSN0cmlnZ2VyUG9zaXRpb25cblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIC8vIGdldCB0aGUgc2NlbmUncyB0cmlnZ2VyIHBvc2l0aW9uXG5cdFx0ICogdmFyIHRyaWdnZXJQb3NpdGlvbiA9IHNjZW5lLnRyaWdnZXJQb3NpdGlvbigpO1xuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge251bWJlcn0gU3RhcnQgcG9zaXRpb24gb2YgdGhlIHNjZW5lLiBUb3AgcG9zaXRpb24gdmFsdWUgZm9yIHZlcnRpY2FsIGFuZCBsZWZ0IHBvc2l0aW9uIHZhbHVlIGZvciBob3Jpem9udGFsIHNjcm9sbHMuXG5cdFx0ICovXG5cdFx0dGhpcy50cmlnZ2VyUG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHR2YXIgcG9zID0gX29wdGlvbnMub2Zmc2V0OyAvLyB0aGUgb2Zmc2V0IGlzIHRoZSBiYXNpc1xuXHRcdFx0aWYgKF9jb250cm9sbGVyKSB7XG5cdFx0XHRcdC8vIGdldCB0aGUgdHJpZ2dlciBwb3NpdGlvblxuXHRcdFx0XHRpZiAoX29wdGlvbnMudHJpZ2dlckVsZW1lbnQpIHtcblx0XHRcdFx0XHQvLyBFbGVtZW50IGFzIHRyaWdnZXJcblx0XHRcdFx0XHRwb3MgKz0gX3RyaWdnZXJQb3M7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gcmV0dXJuIHRoZSBoZWlnaHQgb2YgdGhlIHRyaWdnZXJIb29rIHRvIHN0YXJ0IGF0IHRoZSBiZWdpbm5pbmdcblx0XHRcdFx0XHRwb3MgKz0gX2NvbnRyb2xsZXIuaW5mbyhcInNpemVcIikgKiBTY2VuZS50cmlnZ2VySG9vaygpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcG9zO1xuXHRcdH07XG5cblx0XHR2YXJcblx0XHRfcGluLCBfcGluT3B0aW9ucztcblxuXHRcdFNjZW5lLm9uKFwic2hpZnQuaW50ZXJuYWxcIiwgZnVuY3Rpb24gKGUpIHtcblx0XHRcdHZhciBkdXJhdGlvbkNoYW5nZWQgPSBlLnJlYXNvbiA9PT0gXCJkdXJhdGlvblwiO1xuXHRcdFx0aWYgKChfc3RhdGUgPT09IFNDRU5FX1NUQVRFX0FGVEVSICYmIGR1cmF0aW9uQ2hhbmdlZCkgfHwgKF9zdGF0ZSA9PT0gU0NFTkVfU1RBVEVfRFVSSU5HICYmIF9vcHRpb25zLmR1cmF0aW9uID09PSAwKSkge1xuXHRcdFx0XHQvLyBpZiBbZHVyYXRpb24gY2hhbmdlZCBhZnRlciBhIHNjZW5lIChpbnNpZGUgc2NlbmUgcHJvZ3Jlc3MgdXBkYXRlcyBwaW4gcG9zaXRpb24pXSBvciBbZHVyYXRpb24gaXMgMCwgd2UgYXJlIGluIHBpbiBwaGFzZSBhbmQgc29tZSBvdGhlciB2YWx1ZSBjaGFuZ2VkXS5cblx0XHRcdFx0dXBkYXRlUGluU3RhdGUoKTtcblx0XHRcdH1cblx0XHRcdGlmIChkdXJhdGlvbkNoYW5nZWQpIHtcblx0XHRcdFx0dXBkYXRlUGluRGltZW5zaW9ucygpO1xuXHRcdFx0fVxuXHRcdH0pLm9uKFwicHJvZ3Jlc3MuaW50ZXJuYWxcIiwgZnVuY3Rpb24gKGUpIHtcblx0XHRcdHVwZGF0ZVBpblN0YXRlKCk7XG5cdFx0fSkub24oXCJhZGQuaW50ZXJuYWxcIiwgZnVuY3Rpb24gKGUpIHtcblx0XHRcdHVwZGF0ZVBpbkRpbWVuc2lvbnMoKTtcblx0XHR9KS5vbihcImRlc3Ryb3kuaW50ZXJuYWxcIiwgZnVuY3Rpb24gKGUpIHtcblx0XHRcdFNjZW5lLnJlbW92ZVBpbihlLnJlc2V0KTtcblx0XHR9KTtcblx0XHQvKipcblx0XHQgKiBVcGRhdGUgdGhlIHBpbiBzdGF0ZS5cblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdHZhciB1cGRhdGVQaW5TdGF0ZSA9IGZ1bmN0aW9uIChmb3JjZVVucGluKSB7XG5cdFx0XHRpZiAoX3BpbiAmJiBfY29udHJvbGxlcikge1xuXHRcdFx0XHR2YXJcblx0XHRcdFx0Y29udGFpbmVySW5mbyA9IF9jb250cm9sbGVyLmluZm8oKSxcblx0XHRcdFx0XHRwaW5UYXJnZXQgPSBfcGluT3B0aW9ucy5zcGFjZXIuZmlyc3RDaGlsZDsgLy8gbWF5IGJlIHBpbiBlbGVtZW50IG9yIGFub3RoZXIgc3BhY2VyLCBpZiBjYXNjYWRpbmcgcGluc1xuXHRcdFx0XHRpZiAoIWZvcmNlVW5waW4gJiYgX3N0YXRlID09PSBTQ0VORV9TVEFURV9EVVJJTkcpIHsgLy8gZHVyaW5nIHNjZW5lIG9yIGlmIGR1cmF0aW9uIGlzIDAgYW5kIHdlIGFyZSBwYXN0IHRoZSB0cmlnZ2VyXG5cdFx0XHRcdFx0Ly8gcGlubmVkIHN0YXRlXG5cdFx0XHRcdFx0aWYgKF91dGlsLmNzcyhwaW5UYXJnZXQsIFwicG9zaXRpb25cIikgIT0gXCJmaXhlZFwiKSB7XG5cdFx0XHRcdFx0XHQvLyBjaGFuZ2Ugc3RhdGUgYmVmb3JlIHVwZGF0aW5nIHBpbiBzcGFjZXIgKHBvc2l0aW9uIGNoYW5nZXMgZHVlIHRvIGZpeGVkIGNvbGxhcHNpbmcgbWlnaHQgb2NjdXIuKVxuXHRcdFx0XHRcdFx0X3V0aWwuY3NzKHBpblRhcmdldCwge1xuXHRcdFx0XHRcdFx0XHRcInBvc2l0aW9uXCI6IFwiZml4ZWRcIlxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHQvLyB1cGRhdGUgcGluIHNwYWNlclxuXHRcdFx0XHRcdFx0dXBkYXRlUGluRGltZW5zaW9ucygpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHZhclxuXHRcdFx0XHRcdGZpeGVkUG9zID0gX3V0aWwuZ2V0Lm9mZnNldChfcGluT3B0aW9ucy5zcGFjZXIsIHRydWUpLFxuXHRcdFx0XHRcdFx0Ly8gZ2V0IHZpZXdwb3J0IHBvc2l0aW9uIG9mIHNwYWNlclxuXHRcdFx0XHRcdFx0c2Nyb2xsRGlzdGFuY2UgPSBfb3B0aW9ucy5yZXZlcnNlIHx8IF9vcHRpb25zLmR1cmF0aW9uID09PSAwID8gY29udGFpbmVySW5mby5zY3JvbGxQb3MgLSBfc2Nyb2xsT2Zmc2V0LnN0YXJ0IC8vIHF1aWNrZXJcblx0XHRcdFx0XHRcdDogTWF0aC5yb3VuZChfcHJvZ3Jlc3MgKiBfb3B0aW9ucy5kdXJhdGlvbiAqIDEwKSAvIDEwOyAvLyBpZiBubyByZXZlcnNlIGFuZCBkdXJpbmcgcGluIHRoZSBwb3NpdGlvbiBuZWVkcyB0byBiZSByZWNhbGN1bGF0ZWQgdXNpbmcgdGhlIHByb2dyZXNzXG5cdFx0XHRcdFx0Ly8gYWRkIHNjcm9sbERpc3RhbmNlXG5cdFx0XHRcdFx0Zml4ZWRQb3NbY29udGFpbmVySW5mby52ZXJ0aWNhbCA/IFwidG9wXCIgOiBcImxlZnRcIl0gKz0gc2Nyb2xsRGlzdGFuY2U7XG5cblx0XHRcdFx0XHQvLyBzZXQgbmV3IHZhbHVlc1xuXHRcdFx0XHRcdF91dGlsLmNzcyhfcGluT3B0aW9ucy5zcGFjZXIuZmlyc3RDaGlsZCwge1xuXHRcdFx0XHRcdFx0dG9wOiBmaXhlZFBvcy50b3AsXG5cdFx0XHRcdFx0XHRsZWZ0OiBmaXhlZFBvcy5sZWZ0XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gdW5waW5uZWQgc3RhdGVcblx0XHRcdFx0XHR2YXJcblx0XHRcdFx0XHRuZXdDU1MgPSB7XG5cdFx0XHRcdFx0XHRwb3NpdGlvbjogX3Bpbk9wdGlvbnMuaW5GbG93ID8gXCJyZWxhdGl2ZVwiIDogXCJhYnNvbHV0ZVwiLFxuXHRcdFx0XHRcdFx0dG9wOiAwLFxuXHRcdFx0XHRcdFx0bGVmdDogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRjaGFuZ2UgPSBfdXRpbC5jc3MocGluVGFyZ2V0LCBcInBvc2l0aW9uXCIpICE9IG5ld0NTUy5wb3NpdGlvbjtcblxuXHRcdFx0XHRcdGlmICghX3Bpbk9wdGlvbnMucHVzaEZvbGxvd2Vycykge1xuXHRcdFx0XHRcdFx0bmV3Q1NTW2NvbnRhaW5lckluZm8udmVydGljYWwgPyBcInRvcFwiIDogXCJsZWZ0XCJdID0gX29wdGlvbnMuZHVyYXRpb24gKiBfcHJvZ3Jlc3M7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChfb3B0aW9ucy5kdXJhdGlvbiA+IDApIHsgLy8gb25seSBjb25jZXJucyBzY2VuZXMgd2l0aCBkdXJhdGlvblxuXHRcdFx0XHRcdFx0aWYgKF9zdGF0ZSA9PT0gU0NFTkVfU1RBVEVfQUZURVIgJiYgcGFyc2VGbG9hdChfdXRpbC5jc3MoX3Bpbk9wdGlvbnMuc3BhY2VyLCBcInBhZGRpbmctdG9wXCIpKSA9PT0gMCkge1xuXHRcdFx0XHRcdFx0XHRjaGFuZ2UgPSB0cnVlOyAvLyBpZiBpbiBhZnRlciBzdGF0ZSBidXQgaGF2ZW50IHVwZGF0ZWQgc3BhY2VyIHlldCAoanVtcGVkIHBhc3QgcGluKVxuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChfc3RhdGUgPT09IFNDRU5FX1NUQVRFX0JFRk9SRSAmJiBwYXJzZUZsb2F0KF91dGlsLmNzcyhfcGluT3B0aW9ucy5zcGFjZXIsIFwicGFkZGluZy1ib3R0b21cIikpID09PSAwKSB7IC8vIGJlZm9yZVxuXHRcdFx0XHRcdFx0XHRjaGFuZ2UgPSB0cnVlOyAvLyBqdW1wZWQgcGFzdCBmaXhlZCBzdGF0ZSB1cHdhcmQgZGlyZWN0aW9uXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vIHNldCBuZXcgdmFsdWVzXG5cdFx0XHRcdFx0X3V0aWwuY3NzKHBpblRhcmdldCwgbmV3Q1NTKTtcblx0XHRcdFx0XHRpZiAoY2hhbmdlKSB7XG5cdFx0XHRcdFx0XHQvLyB1cGRhdGUgcGluIHNwYWNlciBpZiBzdGF0ZSBjaGFuZ2VkXG5cdFx0XHRcdFx0XHR1cGRhdGVQaW5EaW1lbnNpb25zKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFVwZGF0ZSB0aGUgcGluIHNwYWNlciBhbmQvb3IgZWxlbWVudCBzaXplLlxuXHRcdCAqIFRoZSBzaXplIG9mIHRoZSBzcGFjZXIgbmVlZHMgdG8gYmUgdXBkYXRlZCB3aGVuZXZlciB0aGUgZHVyYXRpb24gb2YgdGhlIHNjZW5lIGNoYW5nZXMsIGlmIGl0IGlzIHRvIHB1c2ggZG93biBmb2xsb3dpbmcgZWxlbWVudHMuXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHR2YXIgdXBkYXRlUGluRGltZW5zaW9ucyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmIChfcGluICYmIF9jb250cm9sbGVyICYmIF9waW5PcHRpb25zLmluRmxvdykgeyAvLyBubyBzcGFjZXJyZXNpemUsIGlmIG9yaWdpbmFsIHBvc2l0aW9uIGlzIGFic29sdXRlXG5cdFx0XHRcdHZhclxuXHRcdFx0XHRhZnRlciA9IChfc3RhdGUgPT09IFNDRU5FX1NUQVRFX0FGVEVSKSxcblx0XHRcdFx0XHRiZWZvcmUgPSAoX3N0YXRlID09PSBTQ0VORV9TVEFURV9CRUZPUkUpLFxuXHRcdFx0XHRcdGR1cmluZyA9IChfc3RhdGUgPT09IFNDRU5FX1NUQVRFX0RVUklORyksXG5cdFx0XHRcdFx0dmVydGljYWwgPSBfY29udHJvbGxlci5pbmZvKFwidmVydGljYWxcIiksXG5cdFx0XHRcdFx0cGluVGFyZ2V0ID0gX3Bpbk9wdGlvbnMuc3BhY2VyLmZpcnN0Q2hpbGQsXG5cdFx0XHRcdFx0Ly8gdXN1YWxseSB0aGUgcGluZWQgZWxlbWVudCBidXQgY2FuIGFsc28gYmUgYW5vdGhlciBzcGFjZXIgKGNhc2NhZGVkIHBpbnMpXG5cdFx0XHRcdFx0bWFyZ2luQ29sbGFwc2UgPSBfdXRpbC5pc01hcmdpbkNvbGxhcHNlVHlwZShfdXRpbC5jc3MoX3Bpbk9wdGlvbnMuc3BhY2VyLCBcImRpc3BsYXlcIikpLFxuXHRcdFx0XHRcdGNzcyA9IHt9O1xuXG5cdFx0XHRcdC8vIHNldCBuZXcgc2l6ZVxuXHRcdFx0XHQvLyBpZiByZWxzaXplOiBzcGFjZXIgLT4gcGluIHwgZWxzZTogcGluIC0+IHNwYWNlclxuXHRcdFx0XHRpZiAoX3Bpbk9wdGlvbnMucmVsU2l6ZS53aWR0aCB8fCBfcGluT3B0aW9ucy5yZWxTaXplLmF1dG9GdWxsV2lkdGgpIHtcblx0XHRcdFx0XHRpZiAoZHVyaW5nKSB7XG5cdFx0XHRcdFx0XHRfdXRpbC5jc3MoX3Bpbiwge1xuXHRcdFx0XHRcdFx0XHRcIndpZHRoXCI6IF91dGlsLmdldC53aWR0aChfcGluT3B0aW9ucy5zcGFjZXIpXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0X3V0aWwuY3NzKF9waW4sIHtcblx0XHRcdFx0XHRcdFx0XCJ3aWR0aFwiOiBcIjEwMCVcIlxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIG1pbndpZHRoIGlzIG5lZWRlZCBmb3IgY2FzY2FkZWQgcGlucy5cblx0XHRcdFx0XHRjc3NbXCJtaW4td2lkdGhcIl0gPSBfdXRpbC5nZXQud2lkdGgodmVydGljYWwgPyBfcGluIDogcGluVGFyZ2V0LCB0cnVlLCB0cnVlKTtcblx0XHRcdFx0XHRjc3Mud2lkdGggPSBkdXJpbmcgPyBjc3NbXCJtaW4td2lkdGhcIl0gOiBcImF1dG9cIjtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoX3Bpbk9wdGlvbnMucmVsU2l6ZS5oZWlnaHQpIHtcblx0XHRcdFx0XHRpZiAoZHVyaW5nKSB7XG5cdFx0XHRcdFx0XHQvLyB0aGUgb25seSBwYWRkaW5nIHRoZSBzcGFjZXIgc2hvdWxkIGV2ZXIgaW5jbHVkZSBpcyB0aGUgZHVyYXRpb24gKGlmIHB1c2hGb2xsb3dlcnMgPSB0cnVlKSwgc28gd2UgbmVlZCB0byBzdWJzdHJhY3QgdGhhdC5cblx0XHRcdFx0XHRcdF91dGlsLmNzcyhfcGluLCB7XG5cdFx0XHRcdFx0XHRcdFwiaGVpZ2h0XCI6IF91dGlsLmdldC5oZWlnaHQoX3Bpbk9wdGlvbnMuc3BhY2VyKSAtIChfcGluT3B0aW9ucy5wdXNoRm9sbG93ZXJzID8gX29wdGlvbnMuZHVyYXRpb24gOiAwKVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdF91dGlsLmNzcyhfcGluLCB7XG5cdFx0XHRcdFx0XHRcdFwiaGVpZ2h0XCI6IFwiMTAwJVwiXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gbWFyZ2luIGlzIG9ubHkgaW5jbHVkZWQgaWYgaXQncyBhIGNhc2NhZGVkIHBpbiB0byByZXNvbHZlIGFuIElFOSBidWdcblx0XHRcdFx0XHRjc3NbXCJtaW4taGVpZ2h0XCJdID0gX3V0aWwuZ2V0LmhlaWdodCh2ZXJ0aWNhbCA/IHBpblRhcmdldCA6IF9waW4sIHRydWUsICFtYXJnaW5Db2xsYXBzZSk7IC8vIG5lZWRlZCBmb3IgY2FzY2FkaW5nIHBpbnNcblx0XHRcdFx0XHRjc3MuaGVpZ2h0ID0gZHVyaW5nID8gY3NzW1wibWluLWhlaWdodFwiXSA6IFwiYXV0b1wiO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gYWRkIHNwYWNlIGZvciBkdXJhdGlvbiBpZiBwdXNoRm9sbG93ZXJzIGlzIHRydWVcblx0XHRcdFx0aWYgKF9waW5PcHRpb25zLnB1c2hGb2xsb3dlcnMpIHtcblx0XHRcdFx0XHRjc3NbXCJwYWRkaW5nXCIgKyAodmVydGljYWwgPyBcIlRvcFwiIDogXCJMZWZ0XCIpXSA9IF9vcHRpb25zLmR1cmF0aW9uICogX3Byb2dyZXNzO1xuXHRcdFx0XHRcdGNzc1tcInBhZGRpbmdcIiArICh2ZXJ0aWNhbCA/IFwiQm90dG9tXCIgOiBcIlJpZ2h0XCIpXSA9IF9vcHRpb25zLmR1cmF0aW9uICogKDEgLSBfcHJvZ3Jlc3MpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdF91dGlsLmNzcyhfcGluT3B0aW9ucy5zcGFjZXIsIGNzcyk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFVwZGF0ZXMgdGhlIFBpbiBzdGF0ZSAoaW4gY2VydGFpbiBzY2VuYXJpb3MpXG5cdFx0ICogSWYgdGhlIGNvbnRyb2xsZXIgY29udGFpbmVyIGlzIG5vdCB0aGUgZG9jdW1lbnQgYW5kIHdlIGFyZSBtaWQtcGluLXBoYXNlIHNjcm9sbGluZyBvciByZXNpemluZyB0aGUgbWFpbiBkb2N1bWVudCBjYW4gcmVzdWx0IHRvIHdyb25nIHBpbiBwb3NpdGlvbnMuXG5cdFx0ICogU28gdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgb24gcmVzaXplIGFuZCBzY3JvbGwgb2YgdGhlIGRvY3VtZW50LlxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0dmFyIHVwZGF0ZVBpbkluQ29udGFpbmVyID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKF9jb250cm9sbGVyICYmIF9waW4gJiYgX3N0YXRlID09PSBTQ0VORV9TVEFURV9EVVJJTkcgJiYgIV9jb250cm9sbGVyLmluZm8oXCJpc0RvY3VtZW50XCIpKSB7XG5cdFx0XHRcdHVwZGF0ZVBpblN0YXRlKCk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFVwZGF0ZXMgdGhlIFBpbiBzcGFjZXIgc2l6ZSBzdGF0ZSAoaW4gY2VydGFpbiBzY2VuYXJpb3MpXG5cdFx0ICogSWYgY29udGFpbmVyIGlzIHJlc2l6ZWQgZHVyaW5nIHBpbiBhbmQgcmVsYXRpdmVseSBzaXplZCB0aGUgc2l6ZSBvZiB0aGUgcGluIG1pZ2h0IG5lZWQgdG8gYmUgdXBkYXRlZC4uLlxuXHRcdCAqIFNvIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIG9uIHJlc2l6ZSBvZiB0aGUgY29udGFpbmVyLlxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0dmFyIHVwZGF0ZVJlbGF0aXZlUGluU3BhY2VyID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKF9jb250cm9sbGVyICYmIF9waW4gJiYgLy8gd2VsbCwgZHVoXG5cdFx0XHRfc3RhdGUgPT09IFNDRU5FX1NUQVRFX0RVUklORyAmJiAvLyBlbGVtZW50IGluIHBpbm5lZCBzdGF0ZT9cblx0XHRcdCggLy8gaXMgd2lkdGggb3IgaGVpZ2h0IHJlbGF0aXZlbHkgc2l6ZWQsIGJ1dCBub3QgaW4gcmVsYXRpb24gdG8gYm9keT8gdGhlbiB3ZSBuZWVkIHRvIHJlY2FsYy5cblx0XHRcdCgoX3Bpbk9wdGlvbnMucmVsU2l6ZS53aWR0aCB8fCBfcGluT3B0aW9ucy5yZWxTaXplLmF1dG9GdWxsV2lkdGgpICYmIF91dGlsLmdldC53aWR0aCh3aW5kb3cpICE9IF91dGlsLmdldC53aWR0aChfcGluT3B0aW9ucy5zcGFjZXIucGFyZW50Tm9kZSkpIHx8IChfcGluT3B0aW9ucy5yZWxTaXplLmhlaWdodCAmJiBfdXRpbC5nZXQuaGVpZ2h0KHdpbmRvdykgIT0gX3V0aWwuZ2V0LmhlaWdodChfcGluT3B0aW9ucy5zcGFjZXIucGFyZW50Tm9kZSkpKSkge1xuXHRcdFx0XHR1cGRhdGVQaW5EaW1lbnNpb25zKCk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIElzIGNhbGxlZCwgd2hlbiB0aGUgbW91c2V3aGVsIGlzIHVzZWQgd2hpbGUgb3ZlciBhIHBpbm5lZCBlbGVtZW50IGluc2lkZSBhIGRpdiBjb250YWluZXIuXG5cdFx0ICogSWYgdGhlIHNjZW5lIGlzIGluIGZpeGVkIHN0YXRlIHNjcm9sbCBldmVudHMgd291bGQgYmUgY291bnRlZCB0b3dhcmRzIHRoZSBib2R5LiBUaGlzIGZvcndhcmRzIHRoZSBldmVudCB0byB0aGUgc2Nyb2xsIGNvbnRhaW5lci5cblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdHZhciBvbk1vdXNld2hlZWxPdmVyUGluID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdGlmIChfY29udHJvbGxlciAmJiBfcGluICYmIF9zdGF0ZSA9PT0gU0NFTkVfU1RBVEVfRFVSSU5HICYmICFfY29udHJvbGxlci5pbmZvKFwiaXNEb2N1bWVudFwiKSkgeyAvLyBpbiBwaW4gc3RhdGVcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRfY29udHJvbGxlci5fc2V0U2Nyb2xsUG9zKF9jb250cm9sbGVyLmluZm8oXCJzY3JvbGxQb3NcIikgLSAoKGUud2hlZWxEZWx0YSB8fCBlW19jb250cm9sbGVyLmluZm8oXCJ2ZXJ0aWNhbFwiKSA/IFwid2hlZWxEZWx0YVlcIiA6IFwid2hlZWxEZWx0YVhcIl0pIC8gMyB8fCAtZS5kZXRhaWwgKiAzMCkpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBQaW4gYW4gZWxlbWVudCBmb3IgdGhlIGR1cmF0aW9uIG9mIHRoZSB0d2Vlbi4gIFxuXHRcdCAqIElmIHRoZSBzY2VuZSBkdXJhdGlvbiBpcyAwIHRoZSBlbGVtZW50IHdpbGwgb25seSBiZSB1bnBpbm5lZCwgaWYgdGhlIHVzZXIgc2Nyb2xscyBiYWNrIHBhc3QgdGhlIHN0YXJ0IHBvc2l0aW9uLiAgXG5cdFx0ICogTWFrZSBzdXJlIG9ubHkgb25lIHBpbiBpcyBhcHBsaWVkIHRvIGFuIGVsZW1lbnQgYXQgdGhlIHNhbWUgdGltZS5cblx0XHQgKiBBbiBlbGVtZW50IGNhbiBiZSBwaW5uZWQgbXVsdGlwbGUgdGltZXMsIGJ1dCBvbmx5IHN1Y2Nlc3NpdmVseS5cblx0XHQgKiBfKipOT1RFOioqIFRoZSBvcHRpb24gYHB1c2hGb2xsb3dlcnNgIGhhcyBubyBlZmZlY3QsIHdoZW4gdGhlIHNjZW5lIGR1cmF0aW9uIGlzIDAuX1xuXHRcdCAqIEBtZXRob2QgU2Nyb2xsTWFnaWMuU2NlbmUjc2V0UGluXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiAvLyBwaW4gZWxlbWVudCBhbmQgcHVzaCBhbGwgZm9sbG93aW5nIGVsZW1lbnRzIGRvd24gYnkgdGhlIGFtb3VudCBvZiB0aGUgcGluIGR1cmF0aW9uLlxuXHRcdCAqIHNjZW5lLnNldFBpbihcIiNwaW5cIik7XG5cdFx0ICpcblx0XHQgKiAvLyBwaW4gZWxlbWVudCBhbmQga2VlcGluZyBhbGwgZm9sbG93aW5nIGVsZW1lbnRzIGluIHRoZWlyIHBsYWNlLiBUaGUgcGlubmVkIGVsZW1lbnQgd2lsbCBtb3ZlIHBhc3QgdGhlbS5cblx0XHQgKiBzY2VuZS5zZXRQaW4oXCIjcGluXCIsIHtwdXNoRm9sbG93ZXJzOiBmYWxzZX0pO1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHsoc3RyaW5nfG9iamVjdCl9IGVsZW1lbnQgLSBBIFNlbGVjdG9yIHRhcmdldGluZyBhbiBlbGVtZW50IG9yIGEgRE9NIG9iamVjdCB0aGF0IGlzIHN1cHBvc2VkIHRvIGJlIHBpbm5lZC5cblx0XHQgKiBAcGFyYW0ge29iamVjdH0gW3NldHRpbmdzXSAtIHNldHRpbmdzIGZvciB0aGUgcGluXG5cdFx0ICogQHBhcmFtIHtib29sZWFufSBbc2V0dGluZ3MucHVzaEZvbGxvd2Vycz10cnVlXSAtIElmIGB0cnVlYCBmb2xsb3dpbmcgZWxlbWVudHMgd2lsbCBiZSBcInB1c2hlZFwiIGRvd24gZm9yIHRoZSBkdXJhdGlvbiBvZiB0aGUgcGluLCBpZiBgZmFsc2VgIHRoZSBwaW5uZWQgZWxlbWVudCB3aWxsIGp1c3Qgc2Nyb2xsIHBhc3QgdGhlbS4gIFxuXHRcdCBJZ25vcmVkLCB3aGVuIGR1cmF0aW9uIGlzIGAwYC5cblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gW3NldHRpbmdzLnNwYWNlckNsYXNzPVwic2Nyb2xsbWFnaWMtcGluLXNwYWNlclwiXSAtIENsYXNzbmFtZSBvZiB0aGUgcGluIHNwYWNlciBlbGVtZW50LCB3aGljaCBpcyB1c2VkIHRvIHJlcGxhY2UgdGhlIGVsZW1lbnQuXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7U2NlbmV9IFBhcmVudCBvYmplY3QgZm9yIGNoYWluaW5nLlxuXHRcdCAqL1xuXHRcdHRoaXMuc2V0UGluID0gZnVuY3Rpb24gKGVsZW1lbnQsIHNldHRpbmdzKSB7XG5cdFx0XHR2YXJcblx0XHRcdGRlZmF1bHRTZXR0aW5ncyA9IHtcblx0XHRcdFx0cHVzaEZvbGxvd2VyczogdHJ1ZSxcblx0XHRcdFx0c3BhY2VyQ2xhc3M6IFwic2Nyb2xsbWFnaWMtcGluLXNwYWNlclwiXG5cdFx0XHR9O1xuXHRcdFx0c2V0dGluZ3MgPSBfdXRpbC5leHRlbmQoe30sIGRlZmF1bHRTZXR0aW5ncywgc2V0dGluZ3MpO1xuXG5cdFx0XHQvLyB2YWxpZGF0ZSBFbGVtZW50XG5cdFx0XHRlbGVtZW50ID0gX3V0aWwuZ2V0LmVsZW1lbnRzKGVsZW1lbnQpWzBdO1xuXHRcdFx0aWYgKCFlbGVtZW50KSB7XG5cdFx0XHRcdGxvZygxLCBcIkVSUk9SIGNhbGxpbmcgbWV0aG9kICdzZXRQaW4oKSc6IEludmFsaWQgcGluIGVsZW1lbnQgc3VwcGxpZWQuXCIpO1xuXHRcdFx0XHRyZXR1cm4gU2NlbmU7IC8vIGNhbmNlbFxuXHRcdFx0fSBlbHNlIGlmIChfdXRpbC5jc3MoZWxlbWVudCwgXCJwb3NpdGlvblwiKSA9PT0gXCJmaXhlZFwiKSB7XG5cdFx0XHRcdGxvZygxLCBcIkVSUk9SIGNhbGxpbmcgbWV0aG9kICdzZXRQaW4oKSc6IFBpbiBkb2VzIG5vdCB3b3JrIHdpdGggZWxlbWVudHMgdGhhdCBhcmUgcG9zaXRpb25lZCAnZml4ZWQnLlwiKTtcblx0XHRcdFx0cmV0dXJuIFNjZW5lOyAvLyBjYW5jZWxcblx0XHRcdH1cblxuXHRcdFx0aWYgKF9waW4pIHsgLy8gcHJlZXhpc3RpbmcgcGluP1xuXHRcdFx0XHRpZiAoX3BpbiA9PT0gZWxlbWVudCkge1xuXHRcdFx0XHRcdC8vIHNhbWUgcGluIHdlIGFscmVhZHkgaGF2ZSAtPiBkbyBub3RoaW5nXG5cdFx0XHRcdFx0cmV0dXJuIFNjZW5lOyAvLyBjYW5jZWxcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBraWxsIG9sZCBwaW5cblx0XHRcdFx0XHRTY2VuZS5yZW1vdmVQaW4oKTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0XHRfcGluID0gZWxlbWVudDtcblxuXHRcdFx0dmFyXG5cdFx0XHRwYXJlbnREaXNwbGF5ID0gX3Bpbi5wYXJlbnROb2RlLnN0eWxlLmRpc3BsYXksXG5cdFx0XHRcdGJvdW5kc1BhcmFtcyA9IFtcInRvcFwiLCBcImxlZnRcIiwgXCJib3R0b21cIiwgXCJyaWdodFwiLCBcIm1hcmdpblwiLCBcIm1hcmdpbkxlZnRcIiwgXCJtYXJnaW5SaWdodFwiLCBcIm1hcmdpblRvcFwiLCBcIm1hcmdpbkJvdHRvbVwiXTtcblxuXHRcdFx0X3Bpbi5wYXJlbnROb2RlLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7IC8vIGhhY2sgc3RhcnQgdG8gZm9yY2UgY3NzIHRvIHJldHVybiBzdHlsZXNoZWV0IHZhbHVlcyBpbnN0ZWFkIG9mIGNhbGN1bGF0ZWQgcHggdmFsdWVzLlxuXHRcdFx0dmFyXG5cdFx0XHRpbkZsb3cgPSBfdXRpbC5jc3MoX3BpbiwgXCJwb3NpdGlvblwiKSAhPSBcImFic29sdXRlXCIsXG5cdFx0XHRcdHBpbkNTUyA9IF91dGlsLmNzcyhfcGluLCBib3VuZHNQYXJhbXMuY29uY2F0KFtcImRpc3BsYXlcIl0pKSxcblx0XHRcdFx0c2l6ZUNTUyA9IF91dGlsLmNzcyhfcGluLCBbXCJ3aWR0aFwiLCBcImhlaWdodFwiXSk7XG5cdFx0XHRfcGluLnBhcmVudE5vZGUuc3R5bGUuZGlzcGxheSA9IHBhcmVudERpc3BsYXk7IC8vIGhhY2sgZW5kLlxuXHRcdFx0aWYgKCFpbkZsb3cgJiYgc2V0dGluZ3MucHVzaEZvbGxvd2Vycykge1xuXHRcdFx0XHRsb2coMiwgXCJXQVJOSU5HOiBJZiB0aGUgcGlubmVkIGVsZW1lbnQgaXMgcG9zaXRpb25lZCBhYnNvbHV0ZWx5IHB1c2hGb2xsb3dlcnMgd2lsbCBiZSBkaXNhYmxlZC5cIik7XG5cdFx0XHRcdHNldHRpbmdzLnB1c2hGb2xsb3dlcnMgPSBmYWxzZTtcblx0XHRcdH1cblx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHsgLy8gd2FpdCB1bnRpbCBhbGwgZmluaXNoZWQsIGJlY2F1c2Ugd2l0aCByZXNwb25zaXZlIGR1cmF0aW9uIGl0IHdpbGwgb25seSBiZSBzZXQgYWZ0ZXIgc2NlbmUgaXMgYWRkZWQgdG8gY29udHJvbGxlclxuXHRcdFx0XHRpZiAoX3BpbiAmJiBfb3B0aW9ucy5kdXJhdGlvbiA9PT0gMCAmJiBzZXR0aW5ncy5wdXNoRm9sbG93ZXJzKSB7XG5cdFx0XHRcdFx0bG9nKDIsIFwiV0FSTklORzogcHVzaEZvbGxvd2VycyA9XCIsIHRydWUsIFwiaGFzIG5vIGVmZmVjdCwgd2hlbiBzY2VuZSBkdXJhdGlvbiBpcyAwLlwiKTtcblx0XHRcdFx0fVxuXHRcdFx0fSwgMCk7XG5cblx0XHRcdC8vIGNyZWF0ZSBzcGFjZXIgYW5kIGluc2VydFxuXHRcdFx0dmFyXG5cdFx0XHRzcGFjZXIgPSBfcGluLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLCBfcGluKSxcblx0XHRcdFx0c3BhY2VyQ1NTID0gX3V0aWwuZXh0ZW5kKHBpbkNTUywge1xuXHRcdFx0XHRcdHBvc2l0aW9uOiBpbkZsb3cgPyBcInJlbGF0aXZlXCIgOiBcImFic29sdXRlXCIsXG5cdFx0XHRcdFx0Ym94U2l6aW5nOiBcImNvbnRlbnQtYm94XCIsXG5cdFx0XHRcdFx0bW96Qm94U2l6aW5nOiBcImNvbnRlbnQtYm94XCIsXG5cdFx0XHRcdFx0d2Via2l0Qm94U2l6aW5nOiBcImNvbnRlbnQtYm94XCJcblx0XHRcdFx0fSk7XG5cblx0XHRcdGlmICghaW5GbG93KSB7IC8vIGNvcHkgc2l6ZSBpZiBwb3NpdGlvbmVkIGFic29sdXRlbHksIHRvIHdvcmsgZm9yIGJvdHRvbS9yaWdodCBwb3NpdGlvbmVkIGVsZW1lbnRzLlxuXHRcdFx0XHRfdXRpbC5leHRlbmQoc3BhY2VyQ1NTLCBfdXRpbC5jc3MoX3BpbiwgW1wid2lkdGhcIiwgXCJoZWlnaHRcIl0pKTtcblx0XHRcdH1cblxuXHRcdFx0X3V0aWwuY3NzKHNwYWNlciwgc3BhY2VyQ1NTKTtcblx0XHRcdHNwYWNlci5zZXRBdHRyaWJ1dGUoUElOX1NQQUNFUl9BVFRSSUJVVEUsIFwiXCIpO1xuXHRcdFx0X3V0aWwuYWRkQ2xhc3Moc3BhY2VyLCBzZXR0aW5ncy5zcGFjZXJDbGFzcyk7XG5cblx0XHRcdC8vIHNldCB0aGUgcGluIE9wdGlvbnNcblx0XHRcdF9waW5PcHRpb25zID0ge1xuXHRcdFx0XHRzcGFjZXI6IHNwYWNlcixcblx0XHRcdFx0cmVsU2l6ZTogeyAvLyBzYXZlIGlmIHNpemUgaXMgZGVmaW5lZCB1c2luZyAlIHZhbHVlcy4gaWYgc28sIGhhbmRsZSBzcGFjZXIgcmVzaXplIGRpZmZlcmVudGx5Li4uXG5cdFx0XHRcdFx0d2lkdGg6IHNpemVDU1Mud2lkdGguc2xpY2UoLTEpID09PSBcIiVcIixcblx0XHRcdFx0XHRoZWlnaHQ6IHNpemVDU1MuaGVpZ2h0LnNsaWNlKC0xKSA9PT0gXCIlXCIsXG5cdFx0XHRcdFx0YXV0b0Z1bGxXaWR0aDogc2l6ZUNTUy53aWR0aCA9PT0gXCJhdXRvXCIgJiYgaW5GbG93ICYmIF91dGlsLmlzTWFyZ2luQ29sbGFwc2VUeXBlKHBpbkNTUy5kaXNwbGF5KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRwdXNoRm9sbG93ZXJzOiBzZXR0aW5ncy5wdXNoRm9sbG93ZXJzLFxuXHRcdFx0XHRpbkZsb3c6IGluRmxvdyxcblx0XHRcdFx0Ly8gc3RvcmVzIGlmIHRoZSBlbGVtZW50IHRha2VzIHVwIHNwYWNlIGluIHRoZSBkb2N1bWVudCBmbG93XG5cdFx0XHR9O1xuXG5cdFx0XHRpZiAoIV9waW4uX19fb3JpZ1N0eWxlKSB7XG5cdFx0XHRcdF9waW4uX19fb3JpZ1N0eWxlID0ge307XG5cdFx0XHRcdHZhclxuXHRcdFx0XHRwaW5JbmxpbmVDU1MgPSBfcGluLnN0eWxlLFxuXHRcdFx0XHRcdGNvcHlTdHlsZXMgPSBib3VuZHNQYXJhbXMuY29uY2F0KFtcIndpZHRoXCIsIFwiaGVpZ2h0XCIsIFwicG9zaXRpb25cIiwgXCJib3hTaXppbmdcIiwgXCJtb3pCb3hTaXppbmdcIiwgXCJ3ZWJraXRCb3hTaXppbmdcIl0pO1xuXHRcdFx0XHRjb3B5U3R5bGVzLmZvckVhY2goZnVuY3Rpb24gKHZhbCkge1xuXHRcdFx0XHRcdF9waW4uX19fb3JpZ1N0eWxlW3ZhbF0gPSBwaW5JbmxpbmVDU1NbdmFsXSB8fCBcIlwiO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gaWYgcmVsYXRpdmUgc2l6ZSwgdHJhbnNmZXIgaXQgdG8gc3BhY2VyIGFuZCBtYWtlIHBpbiBjYWxjdWxhdGUgaXQuLi5cblx0XHRcdGlmIChfcGluT3B0aW9ucy5yZWxTaXplLndpZHRoKSB7XG5cdFx0XHRcdF91dGlsLmNzcyhzcGFjZXIsIHtcblx0XHRcdFx0XHR3aWR0aDogc2l6ZUNTUy53aWR0aFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmIChfcGluT3B0aW9ucy5yZWxTaXplLmhlaWdodCkge1xuXHRcdFx0XHRfdXRpbC5jc3Moc3BhY2VyLCB7XG5cdFx0XHRcdFx0aGVpZ2h0OiBzaXplQ1NTLmhlaWdodFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gbm93IHBsYWNlIHRoZSBwaW4gZWxlbWVudCBpbnNpZGUgdGhlIHNwYWNlclx0XG5cdFx0XHRzcGFjZXIuYXBwZW5kQ2hpbGQoX3Bpbik7XG5cdFx0XHQvLyBhbmQgc2V0IG5ldyBjc3Ncblx0XHRcdF91dGlsLmNzcyhfcGluLCB7XG5cdFx0XHRcdHBvc2l0aW9uOiBpbkZsb3cgPyBcInJlbGF0aXZlXCIgOiBcImFic29sdXRlXCIsXG5cdFx0XHRcdG1hcmdpbjogXCJhdXRvXCIsXG5cdFx0XHRcdHRvcDogXCJhdXRvXCIsXG5cdFx0XHRcdGxlZnQ6IFwiYXV0b1wiLFxuXHRcdFx0XHRib3R0b206IFwiYXV0b1wiLFxuXHRcdFx0XHRyaWdodDogXCJhdXRvXCJcblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAoX3Bpbk9wdGlvbnMucmVsU2l6ZS53aWR0aCB8fCBfcGluT3B0aW9ucy5yZWxTaXplLmF1dG9GdWxsV2lkdGgpIHtcblx0XHRcdFx0X3V0aWwuY3NzKF9waW4sIHtcblx0XHRcdFx0XHRib3hTaXppbmc6IFwiYm9yZGVyLWJveFwiLFxuXHRcdFx0XHRcdG1vekJveFNpemluZzogXCJib3JkZXItYm94XCIsXG5cdFx0XHRcdFx0d2Via2l0Qm94U2l6aW5nOiBcImJvcmRlci1ib3hcIlxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gYWRkIGxpc3RlbmVyIHRvIGRvY3VtZW50IHRvIHVwZGF0ZSBwaW4gcG9zaXRpb24gaW4gY2FzZSBjb250cm9sbGVyIGlzIG5vdCB0aGUgZG9jdW1lbnQuXG5cdFx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgdXBkYXRlUGluSW5Db250YWluZXIpO1xuXHRcdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHVwZGF0ZVBpbkluQ29udGFpbmVyKTtcblx0XHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB1cGRhdGVSZWxhdGl2ZVBpblNwYWNlcik7XG5cdFx0XHQvLyBhZGQgbW91c2V3aGVlbCBsaXN0ZW5lciB0byBjYXRjaCBzY3JvbGxzIG92ZXIgZml4ZWQgZWxlbWVudHNcblx0XHRcdF9waW4uYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNld2hlZWxcIiwgb25Nb3VzZXdoZWVsT3ZlclBpbik7XG5cdFx0XHRfcGluLmFkZEV2ZW50TGlzdGVuZXIoXCJET01Nb3VzZVNjcm9sbFwiLCBvbk1vdXNld2hlZWxPdmVyUGluKTtcblxuXHRcdFx0bG9nKDMsIFwiYWRkZWQgcGluXCIpO1xuXG5cdFx0XHQvLyBmaW5hbGx5IHVwZGF0ZSB0aGUgcGluIHRvIGluaXRcblx0XHRcdHVwZGF0ZVBpblN0YXRlKCk7XG5cblx0XHRcdHJldHVybiBTY2VuZTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogUmVtb3ZlIHRoZSBwaW4gZnJvbSB0aGUgc2NlbmUuXG5cdFx0ICogQG1ldGhvZCBTY3JvbGxNYWdpYy5TY2VuZSNyZW1vdmVQaW5cblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIC8vIHJlbW92ZSB0aGUgcGluIGZyb20gdGhlIHNjZW5lIHdpdGhvdXQgcmVzZXR0aW5nIGl0ICh0aGUgc3BhY2VyIGlzIG5vdCByZW1vdmVkKVxuXHRcdCAqIHNjZW5lLnJlbW92ZVBpbigpO1xuXHRcdCAqXG5cdFx0ICogLy8gcmVtb3ZlIHRoZSBwaW4gZnJvbSB0aGUgc2NlbmUgYW5kIHJlc2V0IHRoZSBwaW4gZWxlbWVudCB0byBpdHMgaW5pdGlhbCBwb3NpdGlvbiAoc3BhY2VyIGlzIHJlbW92ZWQpXG5cdFx0ICogc2NlbmUucmVtb3ZlUGluKHRydWUpO1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtib29sZWFufSBbcmVzZXQ9ZmFsc2VdIC0gSWYgYGZhbHNlYCB0aGUgc3BhY2VyIHdpbGwgbm90IGJlIHJlbW92ZWQgYW5kIHRoZSBlbGVtZW50J3MgcG9zaXRpb24gd2lsbCBub3QgYmUgcmVzZXQuXG5cdFx0ICogQHJldHVybnMge1NjZW5lfSBQYXJlbnQgb2JqZWN0IGZvciBjaGFpbmluZy5cblx0XHQgKi9cblx0XHR0aGlzLnJlbW92ZVBpbiA9IGZ1bmN0aW9uIChyZXNldCkge1xuXHRcdFx0aWYgKF9waW4pIHtcblx0XHRcdFx0aWYgKF9zdGF0ZSA9PT0gU0NFTkVfU1RBVEVfRFVSSU5HKSB7XG5cdFx0XHRcdFx0dXBkYXRlUGluU3RhdGUodHJ1ZSk7IC8vIGZvcmNlIHVucGluIGF0IHBvc2l0aW9uXG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHJlc2V0IHx8ICFfY29udHJvbGxlcikgeyAvLyBpZiB0aGVyZSdzIG5vIGNvbnRyb2xsZXIgbm8gcHJvZ3Jlc3Mgd2FzIG1hZGUgYW55d2F5Li4uXG5cdFx0XHRcdFx0dmFyIHBpblRhcmdldCA9IF9waW5PcHRpb25zLnNwYWNlci5maXJzdENoaWxkOyAvLyB1c3VhbGx5IHRoZSBwaW4gZWxlbWVudCwgYnV0IG1heSBiZSBhbm90aGVyIHNwYWNlciAoY2FzY2FkZWQgcGlucykuLi5cblx0XHRcdFx0XHRpZiAocGluVGFyZ2V0Lmhhc0F0dHJpYnV0ZShQSU5fU1BBQ0VSX0FUVFJJQlVURSkpIHsgLy8gY29weSBtYXJnaW5zIHRvIGNoaWxkIHNwYWNlclxuXHRcdFx0XHRcdFx0dmFyXG5cdFx0XHRcdFx0XHRzdHlsZSA9IF9waW5PcHRpb25zLnNwYWNlci5zdHlsZSxcblx0XHRcdFx0XHRcdFx0dmFsdWVzID0gW1wibWFyZ2luXCIsIFwibWFyZ2luTGVmdFwiLCBcIm1hcmdpblJpZ2h0XCIsIFwibWFyZ2luVG9wXCIsIFwibWFyZ2luQm90dG9tXCJdO1xuXHRcdFx0XHRcdFx0bWFyZ2lucyA9IHt9O1xuXHRcdFx0XHRcdFx0dmFsdWVzLmZvckVhY2goZnVuY3Rpb24gKHZhbCkge1xuXHRcdFx0XHRcdFx0XHRtYXJnaW5zW3ZhbF0gPSBzdHlsZVt2YWxdIHx8IFwiXCI7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdF91dGlsLmNzcyhwaW5UYXJnZXQsIG1hcmdpbnMpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRfcGluT3B0aW9ucy5zcGFjZXIucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUocGluVGFyZ2V0LCBfcGluT3B0aW9ucy5zcGFjZXIpO1xuXHRcdFx0XHRcdF9waW5PcHRpb25zLnNwYWNlci5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKF9waW5PcHRpb25zLnNwYWNlcik7XG5cdFx0XHRcdFx0aWYgKCFfcGluLnBhcmVudE5vZGUuaGFzQXR0cmlidXRlKFBJTl9TUEFDRVJfQVRUUklCVVRFKSkgeyAvLyBpZiBpdCdzIHRoZSBsYXN0IHBpbiBmb3IgdGhpcyBlbGVtZW50IC0+IHJlc3RvcmUgaW5saW5lIHN0eWxlc1xuXHRcdFx0XHRcdFx0Ly8gVE9ETzogb25seSBjb3JyZWN0bHkgc2V0IGZvciBmaXJzdCBwaW4gKHdoZW4gY2FzY2FkaW5nKSAtIGhvdyB0byBmaXg/XG5cdFx0XHRcdFx0XHRfdXRpbC5jc3MoX3BpbiwgX3Bpbi5fX19vcmlnU3R5bGUpO1xuXHRcdFx0XHRcdFx0ZGVsZXRlIF9waW4uX19fb3JpZ1N0eWxlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgdXBkYXRlUGluSW5Db250YWluZXIpO1xuXHRcdFx0XHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdXBkYXRlUGluSW5Db250YWluZXIpO1xuXHRcdFx0XHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdXBkYXRlUmVsYXRpdmVQaW5TcGFjZXIpO1xuXHRcdFx0XHRfcGluLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZXdoZWVsXCIsIG9uTW91c2V3aGVlbE92ZXJQaW4pO1xuXHRcdFx0XHRfcGluLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJET01Nb3VzZVNjcm9sbFwiLCBvbk1vdXNld2hlZWxPdmVyUGluKTtcblx0XHRcdFx0X3BpbiA9IHVuZGVmaW5lZDtcblx0XHRcdFx0bG9nKDMsIFwicmVtb3ZlZCBwaW4gKHJlc2V0OiBcIiArIChyZXNldCA/IFwidHJ1ZVwiIDogXCJmYWxzZVwiKSArIFwiKVwiKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBTY2VuZTtcblx0XHR9O1xuXG5cblx0XHR2YXJcblx0XHRfY3NzQ2xhc3NlcywgX2Nzc0NsYXNzRWxlbXMgPSBbXTtcblxuXHRcdFNjZW5lLm9uKFwiZGVzdHJveS5pbnRlcm5hbFwiLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0U2NlbmUucmVtb3ZlQ2xhc3NUb2dnbGUoZS5yZXNldCk7XG5cdFx0fSk7XG5cdFx0LyoqXG5cdFx0ICogRGVmaW5lIGEgY3NzIGNsYXNzIG1vZGlmaWNhdGlvbiB3aGlsZSB0aGUgc2NlbmUgaXMgYWN0aXZlLiAgXG5cdFx0ICogV2hlbiB0aGUgc2NlbmUgdHJpZ2dlcnMgdGhlIGNsYXNzZXMgd2lsbCBiZSBhZGRlZCB0byB0aGUgc3VwcGxpZWQgZWxlbWVudCBhbmQgcmVtb3ZlZCwgd2hlbiB0aGUgc2NlbmUgaXMgb3Zlci5cblx0XHQgKiBJZiB0aGUgc2NlbmUgZHVyYXRpb24gaXMgMCB0aGUgY2xhc3NlcyB3aWxsIG9ubHkgYmUgcmVtb3ZlZCBpZiB0aGUgdXNlciBzY3JvbGxzIGJhY2sgcGFzdCB0aGUgc3RhcnQgcG9zaXRpb24uXG5cdFx0ICogQG1ldGhvZCBTY3JvbGxNYWdpYy5TY2VuZSNzZXRDbGFzc1RvZ2dsZVxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogLy8gYWRkIHRoZSBjbGFzcyAnbXljbGFzcycgdG8gdGhlIGVsZW1lbnQgd2l0aCB0aGUgaWQgJ215LWVsZW0nIGZvciB0aGUgZHVyYXRpb24gb2YgdGhlIHNjZW5lXG5cdFx0ICogc2NlbmUuc2V0Q2xhc3NUb2dnbGUoXCIjbXktZWxlbVwiLCBcIm15Y2xhc3NcIik7XG5cdFx0ICpcblx0XHQgKiAvLyBhZGQgbXVsdGlwbGUgY2xhc3NlcyB0byBtdWx0aXBsZSBlbGVtZW50cyBkZWZpbmVkIGJ5IHRoZSBzZWxlY3RvciAnLmNsYXNzQ2hhbmdlJ1xuXHRcdCAqIHNjZW5lLnNldENsYXNzVG9nZ2xlKFwiLmNsYXNzQ2hhbmdlXCIsIFwiY2xhc3MxIGNsYXNzMiBjbGFzczNcIik7XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0geyhzdHJpbmd8b2JqZWN0KX0gZWxlbWVudCAtIEEgU2VsZWN0b3IgdGFyZ2V0aW5nIG9uZSBvciBtb3JlIGVsZW1lbnRzIG9yIGEgRE9NIG9iamVjdCB0aGF0IGlzIHN1cHBvc2VkIHRvIGJlIG1vZGlmaWVkLlxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBjbGFzc2VzIC0gT25lIG9yIG1vcmUgQ2xhc3NuYW1lcyAoc2VwYXJhdGVkIGJ5IHNwYWNlKSB0aGF0IHNob3VsZCBiZSBhZGRlZCB0byB0aGUgZWxlbWVudCBkdXJpbmcgdGhlIHNjZW5lLlxuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge1NjZW5lfSBQYXJlbnQgb2JqZWN0IGZvciBjaGFpbmluZy5cblx0XHQgKi9cblx0XHR0aGlzLnNldENsYXNzVG9nZ2xlID0gZnVuY3Rpb24gKGVsZW1lbnQsIGNsYXNzZXMpIHtcblx0XHRcdHZhciBlbGVtcyA9IF91dGlsLmdldC5lbGVtZW50cyhlbGVtZW50KTtcblx0XHRcdGlmIChlbGVtcy5sZW5ndGggPT09IDAgfHwgIV91dGlsLnR5cGUuU3RyaW5nKGNsYXNzZXMpKSB7XG5cdFx0XHRcdGxvZygxLCBcIkVSUk9SIGNhbGxpbmcgbWV0aG9kICdzZXRDbGFzc1RvZ2dsZSgpJzogSW52YWxpZCBcIiArIChlbGVtcy5sZW5ndGggPT09IDAgPyBcImVsZW1lbnRcIiA6IFwiY2xhc3Nlc1wiKSArIFwiIHN1cHBsaWVkLlwiKTtcblx0XHRcdFx0cmV0dXJuIFNjZW5lO1xuXHRcdFx0fVxuXHRcdFx0aWYgKF9jc3NDbGFzc0VsZW1zLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0Ly8gcmVtb3ZlIG9sZCBvbmVzXG5cdFx0XHRcdFNjZW5lLnJlbW92ZUNsYXNzVG9nZ2xlKCk7XG5cdFx0XHR9XG5cdFx0XHRfY3NzQ2xhc3NlcyA9IGNsYXNzZXM7XG5cdFx0XHRfY3NzQ2xhc3NFbGVtcyA9IGVsZW1zO1xuXHRcdFx0U2NlbmUub24oXCJlbnRlci5pbnRlcm5hbF9jbGFzcyBsZWF2ZS5pbnRlcm5hbF9jbGFzc1wiLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHR2YXIgdG9nZ2xlID0gZS50eXBlID09PSBcImVudGVyXCIgPyBfdXRpbC5hZGRDbGFzcyA6IF91dGlsLnJlbW92ZUNsYXNzO1xuXHRcdFx0XHRfY3NzQ2xhc3NFbGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtLCBrZXkpIHtcblx0XHRcdFx0XHR0b2dnbGUoZWxlbSwgX2Nzc0NsYXNzZXMpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIFNjZW5lO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBSZW1vdmUgdGhlIGNsYXNzIGJpbmRpbmcgZnJvbSB0aGUgc2NlbmUuXG5cdFx0ICogQG1ldGhvZCBTY3JvbGxNYWdpYy5TY2VuZSNyZW1vdmVDbGFzc1RvZ2dsZVxuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogLy8gcmVtb3ZlIGNsYXNzIGJpbmRpbmcgZnJvbSB0aGUgc2NlbmUgd2l0aG91dCByZXNldFxuXHRcdCAqIHNjZW5lLnJlbW92ZUNsYXNzVG9nZ2xlKCk7XG5cdFx0ICpcblx0XHQgKiAvLyByZW1vdmUgY2xhc3MgYmluZGluZyBhbmQgcmVtb3ZlIHRoZSBjaGFuZ2VzIGl0IGNhdXNlZFxuXHRcdCAqIHNjZW5lLnJlbW92ZUNsYXNzVG9nZ2xlKHRydWUpO1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtib29sZWFufSBbcmVzZXQ9ZmFsc2VdIC0gSWYgYGZhbHNlYCBhbmQgdGhlIGNsYXNzZXMgYXJlIGN1cnJlbnRseSBhY3RpdmUsIHRoZXkgd2lsbCByZW1haW4gb24gdGhlIGVsZW1lbnQuIElmIGB0cnVlYCB0aGV5IHdpbGwgYmUgcmVtb3ZlZC5cblx0XHQgKiBAcmV0dXJucyB7U2NlbmV9IFBhcmVudCBvYmplY3QgZm9yIGNoYWluaW5nLlxuXHRcdCAqL1xuXHRcdHRoaXMucmVtb3ZlQ2xhc3NUb2dnbGUgPSBmdW5jdGlvbiAocmVzZXQpIHtcblx0XHRcdGlmIChyZXNldCkge1xuXHRcdFx0XHRfY3NzQ2xhc3NFbGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtLCBrZXkpIHtcblx0XHRcdFx0XHRfdXRpbC5yZW1vdmVDbGFzcyhlbGVtLCBfY3NzQ2xhc3Nlcyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0U2NlbmUub2ZmKFwic3RhcnQuaW50ZXJuYWxfY2xhc3MgZW5kLmludGVybmFsX2NsYXNzXCIpO1xuXHRcdFx0X2Nzc0NsYXNzZXMgPSB1bmRlZmluZWQ7XG5cdFx0XHRfY3NzQ2xhc3NFbGVtcyA9IFtdO1xuXHRcdFx0cmV0dXJuIFNjZW5lO1xuXHRcdH07XG5cblx0XHQvLyBJTklUXG5cdFx0Y29uc3RydWN0KCk7XG5cdFx0cmV0dXJuIFNjZW5lO1xuXHR9O1xuXG5cdC8vIHN0b3JlIHBhZ2V3aWRlIHNjZW5lIG9wdGlvbnNcblx0dmFyIFNDRU5FX09QVElPTlMgPSB7XG5cdFx0ZGVmYXVsdHM6IHtcblx0XHRcdGR1cmF0aW9uOiAwLFxuXHRcdFx0b2Zmc2V0OiAwLFxuXHRcdFx0dHJpZ2dlckVsZW1lbnQ6IHVuZGVmaW5lZCxcblx0XHRcdHRyaWdnZXJIb29rOiAwLjUsXG5cdFx0XHRyZXZlcnNlOiB0cnVlLFxuXHRcdFx0bG9nbGV2ZWw6IDJcblx0XHR9LFxuXHRcdHZhbGlkYXRlOiB7XG5cdFx0XHRvZmZzZXQ6IGZ1bmN0aW9uICh2YWwpIHtcblx0XHRcdFx0dmFsID0gcGFyc2VGbG9hdCh2YWwpO1xuXHRcdFx0XHRpZiAoIV91dGlsLnR5cGUuTnVtYmVyKHZhbCkpIHtcblx0XHRcdFx0XHR0aHJvdyBbXCJJbnZhbGlkIHZhbHVlIGZvciBvcHRpb24gXFxcIm9mZnNldFxcXCI6XCIsIHZhbF07XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHZhbDtcblx0XHRcdH0sXG5cdFx0XHR0cmlnZ2VyRWxlbWVudDogZnVuY3Rpb24gKHZhbCkge1xuXHRcdFx0XHR2YWwgPSB2YWwgfHwgdW5kZWZpbmVkO1xuXHRcdFx0XHRpZiAodmFsKSB7XG5cdFx0XHRcdFx0dmFyIGVsZW0gPSBfdXRpbC5nZXQuZWxlbWVudHModmFsKVswXTtcblx0XHRcdFx0XHRpZiAoZWxlbSkge1xuXHRcdFx0XHRcdFx0dmFsID0gZWxlbTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dGhyb3cgW1wiRWxlbWVudCBkZWZpbmVkIGluIG9wdGlvbiBcXFwidHJpZ2dlckVsZW1lbnRcXFwiIHdhcyBub3QgZm91bmQ6XCIsIHZhbF07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB2YWw7XG5cdFx0XHR9LFxuXHRcdFx0dHJpZ2dlckhvb2s6IGZ1bmN0aW9uICh2YWwpIHtcblx0XHRcdFx0dmFyIHRyYW5zbGF0ZSA9IHtcblx0XHRcdFx0XHRcIm9uQ2VudGVyXCI6IDAuNSxcblx0XHRcdFx0XHRcIm9uRW50ZXJcIjogMSxcblx0XHRcdFx0XHRcIm9uTGVhdmVcIjogMFxuXHRcdFx0XHR9O1xuXHRcdFx0XHRpZiAoX3V0aWwudHlwZS5OdW1iZXIodmFsKSkge1xuXHRcdFx0XHRcdHZhbCA9IE1hdGgubWF4KDAsIE1hdGgubWluKHBhcnNlRmxvYXQodmFsKSwgMSkpOyAvLyAgbWFrZSBzdXJlIGl0cyBiZXR3ZWVlbiAwIGFuZCAxXG5cdFx0XHRcdH0gZWxzZSBpZiAodmFsIGluIHRyYW5zbGF0ZSkge1xuXHRcdFx0XHRcdHZhbCA9IHRyYW5zbGF0ZVt2YWxdO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRocm93IFtcIkludmFsaWQgdmFsdWUgZm9yIG9wdGlvbiBcXFwidHJpZ2dlckhvb2tcXFwiOiBcIiwgdmFsXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdmFsO1xuXHRcdFx0fSxcblx0XHRcdHJldmVyc2U6IGZ1bmN0aW9uICh2YWwpIHtcblx0XHRcdFx0cmV0dXJuICEhdmFsOyAvLyBmb3JjZSBib29sZWFuXG5cdFx0XHR9LFxuXHRcdFx0bG9nbGV2ZWw6IGZ1bmN0aW9uICh2YWwpIHtcblx0XHRcdFx0dmFsID0gcGFyc2VJbnQodmFsKTtcblx0XHRcdFx0aWYgKCFfdXRpbC50eXBlLk51bWJlcih2YWwpIHx8IHZhbCA8IDAgfHwgdmFsID4gMykge1xuXHRcdFx0XHRcdHRocm93IFtcIkludmFsaWQgdmFsdWUgZm9yIG9wdGlvbiBcXFwibG9nbGV2ZWxcXFwiOlwiLCB2YWxdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB2YWw7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHQvLyBob2xkZXIgZm9yICB2YWxpZGF0aW9uIG1ldGhvZHMuIGR1cmF0aW9uIHZhbGlkYXRpb24gaXMgaGFuZGxlZCBpbiAnZ2V0dGVycy1zZXR0ZXJzLmpzJ1xuXHRcdHNoaWZ0czogW1wiZHVyYXRpb25cIiwgXCJvZmZzZXRcIiwgXCJ0cmlnZ2VySG9va1wiXSxcblx0XHQvLyBsaXN0IG9mIG9wdGlvbnMgdGhhdCB0cmlnZ2VyIGEgYHNoaWZ0YCBldmVudFxuXHR9O1xuLypcbiAqIG1ldGhvZCB1c2VkIHRvIGFkZCBhbiBvcHRpb24gdG8gU2Nyb2xsTWFnaWMgU2NlbmVzLlxuICogVE9ETzogRE9DIChwcml2YXRlIGZvciBkZXYpXG4gKi9cblx0U2Nyb2xsTWFnaWMuU2NlbmUuYWRkT3B0aW9uID0gZnVuY3Rpb24gKG5hbWUsIGRlZmF1bHRWYWx1ZSwgdmFsaWRhdGlvbkNhbGxiYWNrLCBzaGlmdHMpIHtcblx0XHRpZiAoIShuYW1lIGluIFNDRU5FX09QVElPTlMuZGVmYXVsdHMpKSB7XG5cdFx0XHRTQ0VORV9PUFRJT05TLmRlZmF1bHRzW25hbWVdID0gZGVmYXVsdFZhbHVlO1xuXHRcdFx0U0NFTkVfT1BUSU9OUy52YWxpZGF0ZVtuYW1lXSA9IHZhbGlkYXRpb25DYWxsYmFjaztcblx0XHRcdGlmIChzaGlmdHMpIHtcblx0XHRcdFx0U0NFTkVfT1BUSU9OUy5zaGlmdHMucHVzaChuYW1lKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0U2Nyb2xsTWFnaWMuX3V0aWwubG9nKDEsIFwiW3N0YXRpY10gU2Nyb2xsTWFnaWMuU2NlbmUgLT4gQ2Fubm90IGFkZCBTY2VuZSBvcHRpb24gJ1wiICsgbmFtZSArIFwiJywgYmVjYXVzZSBpdCBhbHJlYWR5IGV4aXN0cy5cIik7XG5cdFx0fVxuXHR9O1xuXHQvLyBpbnN0YW5jZSBleHRlbnNpb24gZnVuY3Rpb24gZm9yIHBsdWdpbnNcblx0Ly8gVE9ETzogRE9DIChwcml2YXRlIGZvciBkZXYpXG5cdFNjcm9sbE1hZ2ljLlNjZW5lLmV4dGVuZCA9IGZ1bmN0aW9uIChleHRlbnNpb24pIHtcblx0XHR2YXIgb2xkQ2xhc3MgPSB0aGlzO1xuXHRcdFNjcm9sbE1hZ2ljLlNjZW5lID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0b2xkQ2xhc3MuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XHRcdHRoaXMuJHN1cGVyID0gX3V0aWwuZXh0ZW5kKHt9LCB0aGlzKTsgLy8gY29weSBwYXJlbnQgc3RhdGVcblx0XHRcdHJldHVybiBleHRlbnNpb24uYXBwbHkodGhpcywgYXJndW1lbnRzKSB8fCB0aGlzO1xuXHRcdH07XG5cdFx0X3V0aWwuZXh0ZW5kKFNjcm9sbE1hZ2ljLlNjZW5lLCBvbGRDbGFzcyk7IC8vIGNvcHkgcHJvcGVydGllc1xuXHRcdFNjcm9sbE1hZ2ljLlNjZW5lLnByb3RvdHlwZSA9IG9sZENsYXNzLnByb3RvdHlwZTsgLy8gY29weSBwcm90b3R5cGVcblx0XHRTY3JvbGxNYWdpYy5TY2VuZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY3JvbGxNYWdpYy5TY2VuZTsgLy8gcmVzdG9yZSBjb25zdHJ1Y3RvclxuXHR9O1xuXG5cblx0LyoqXG5cdCAqIFRPRE86IERPQ1MgKHByaXZhdGUgZm9yIGRldilcblx0ICogQGNsYXNzXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXG5cdFNjcm9sbE1hZ2ljLkV2ZW50ID0gZnVuY3Rpb24gKHR5cGUsIG5hbWVzcGFjZSwgdGFyZ2V0LCB2YXJzKSB7XG5cdFx0dmFycyA9IHZhcnMgfHwge307XG5cdFx0Zm9yICh2YXIga2V5IGluIHZhcnMpIHtcblx0XHRcdHRoaXNba2V5XSA9IHZhcnNba2V5XTtcblx0XHR9XG5cdFx0dGhpcy50eXBlID0gdHlwZTtcblx0XHR0aGlzLnRhcmdldCA9IHRoaXMuY3VycmVudFRhcmdldCA9IHRhcmdldDtcblx0XHR0aGlzLm5hbWVzcGFjZSA9IG5hbWVzcGFjZSB8fCAnJztcblx0XHR0aGlzLnRpbWVTdGFtcCA9IHRoaXMudGltZXN0YW1wID0gRGF0ZS5ub3coKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuLypcbiAqIFRPRE86IERPQ1MgKHByaXZhdGUgZm9yIGRldilcbiAqL1xuXG5cdHZhciBfdXRpbCA9IFNjcm9sbE1hZ2ljLl91dGlsID0gKGZ1bmN0aW9uICh3aW5kb3cpIHtcblx0XHR2YXIgVSA9IHt9LFxuXHRcdFx0aTtcblxuXHRcdC8qKlxuXHRcdCAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRcdCAqIGludGVybmFsIGhlbHBlcnNcblx0XHQgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0XHQgKi9cblxuXHRcdC8vIHBhcnNlIGZsb2F0IGFuZCBmYWxsIGJhY2sgdG8gMC5cblx0XHR2YXIgZmxvYXR2YWwgPSBmdW5jdGlvbiAobnVtYmVyKSB7XG5cdFx0XHRyZXR1cm4gcGFyc2VGbG9hdChudW1iZXIpIHx8IDA7XG5cdFx0fTtcblx0XHQvLyBnZXQgY3VycmVudCBzdHlsZSBJRSBzYWZlIChvdGhlcndpc2UgSUUgd291bGQgcmV0dXJuIGNhbGN1bGF0ZWQgdmFsdWVzIGZvciAnYXV0bycpXG5cdFx0dmFyIF9nZXRDb21wdXRlZFN0eWxlID0gZnVuY3Rpb24gKGVsZW0pIHtcblx0XHRcdHJldHVybiBlbGVtLmN1cnJlbnRTdHlsZSA/IGVsZW0uY3VycmVudFN0eWxlIDogd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWxlbSk7XG5cdFx0fTtcblxuXHRcdC8vIGdldCBlbGVtZW50IGRpbWVuc2lvbiAod2lkdGggb3IgaGVpZ2h0KVxuXHRcdHZhciBfZGltZW5zaW9uID0gZnVuY3Rpb24gKHdoaWNoLCBlbGVtLCBvdXRlciwgaW5jbHVkZU1hcmdpbikge1xuXHRcdFx0ZWxlbSA9IChlbGVtID09PSBkb2N1bWVudCkgPyB3aW5kb3cgOiBlbGVtO1xuXHRcdFx0aWYgKGVsZW0gPT09IHdpbmRvdykge1xuXHRcdFx0XHRpbmNsdWRlTWFyZ2luID0gZmFsc2U7XG5cdFx0XHR9IGVsc2UgaWYgKCFfdHlwZS5Eb21FbGVtZW50KGVsZW0pKSB7XG5cdFx0XHRcdHJldHVybiAwO1xuXHRcdFx0fVxuXHRcdFx0d2hpY2ggPSB3aGljaC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHdoaWNoLnN1YnN0cigxKS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0dmFyIGRpbWVuc2lvbiA9IChvdXRlciA/IGVsZW1bJ29mZnNldCcgKyB3aGljaF0gfHwgZWxlbVsnb3V0ZXInICsgd2hpY2hdIDogZWxlbVsnY2xpZW50JyArIHdoaWNoXSB8fCBlbGVtWydpbm5lcicgKyB3aGljaF0pIHx8IDA7XG5cdFx0XHRpZiAob3V0ZXIgJiYgaW5jbHVkZU1hcmdpbikge1xuXHRcdFx0XHR2YXIgc3R5bGUgPSBfZ2V0Q29tcHV0ZWRTdHlsZShlbGVtKTtcblx0XHRcdFx0ZGltZW5zaW9uICs9IHdoaWNoID09PSAnSGVpZ2h0JyA/IGZsb2F0dmFsKHN0eWxlLm1hcmdpblRvcCkgKyBmbG9hdHZhbChzdHlsZS5tYXJnaW5Cb3R0b20pIDogZmxvYXR2YWwoc3R5bGUubWFyZ2luTGVmdCkgKyBmbG9hdHZhbChzdHlsZS5tYXJnaW5SaWdodCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZGltZW5zaW9uO1xuXHRcdH07XG5cdFx0Ly8gY29udmVydHMgJ21hcmdpbi10b3AnIGludG8gJ21hcmdpblRvcCdcblx0XHR2YXIgX2NhbWVsQ2FzZSA9IGZ1bmN0aW9uIChzdHIpIHtcblx0XHRcdHJldHVybiBzdHIucmVwbGFjZSgvXlteYS16XSsoW2Etel0pL2csICckMScpLnJlcGxhY2UoLy0oW2Etel0pL2csIGZ1bmN0aW9uIChnKSB7XG5cdFx0XHRcdHJldHVybiBnWzFdLnRvVXBwZXJDYXNlKCk7XG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdFx0ICogZXh0ZXJuYWwgaGVscGVyc1xuXHRcdCAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRcdCAqL1xuXG5cdFx0Ly8gZXh0ZW5kIG9iaiDigJMgc2FtZSBhcyBqUXVlcnkuZXh0ZW5kKHt9LCBvYmpBLCBvYmpCKVxuXHRcdFUuZXh0ZW5kID0gZnVuY3Rpb24gKG9iaikge1xuXHRcdFx0b2JqID0gb2JqIHx8IHt9O1xuXHRcdFx0Zm9yIChpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAoIWFyZ3VtZW50c1tpXSkge1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGZvciAodmFyIGtleSBpbiBhcmd1bWVudHNbaV0pIHtcblx0XHRcdFx0XHRpZiAoYXJndW1lbnRzW2ldLmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdFx0XHRcdG9ialtrZXldID0gYXJndW1lbnRzW2ldW2tleV07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gb2JqO1xuXHRcdH07XG5cblx0XHQvLyBjaGVjayBpZiBhIGNzcyBkaXNwbGF5IHR5cGUgcmVzdWx0cyBpbiBtYXJnaW4tY29sbGFwc2Ugb3Igbm90XG5cdFx0VS5pc01hcmdpbkNvbGxhcHNlVHlwZSA9IGZ1bmN0aW9uIChzdHIpIHtcblx0XHRcdHJldHVybiBbXCJibG9ja1wiLCBcImZsZXhcIiwgXCJsaXN0LWl0ZW1cIiwgXCJ0YWJsZVwiLCBcIi13ZWJraXQtYm94XCJdLmluZGV4T2Yoc3RyKSA+IC0xO1xuXHRcdH07XG5cblx0XHQvLyBpbXBsZW1lbnRhdGlvbiBvZiByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcblx0XHQvLyBiYXNlZCBvbiBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9wYXVsaXJpc2gvMTU3OTY3MVxuXHRcdHZhclxuXHRcdGxhc3RUaW1lID0gMCxcblx0XHRcdHZlbmRvcnMgPSBbJ21zJywgJ21veicsICd3ZWJraXQnLCAnbyddO1xuXHRcdHZhciBfcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTtcblx0XHR2YXIgX2NhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lO1xuXHRcdC8vIHRyeSB2ZW5kb3IgcHJlZml4ZXMgaWYgdGhlIGFib3ZlIGRvZXNuJ3Qgd29ya1xuXHRcdGZvciAoaSA9IDA7ICFfcmVxdWVzdEFuaW1hdGlvbkZyYW1lICYmIGkgPCB2ZW5kb3JzLmxlbmd0aDsgKytpKSB7XG5cdFx0XHRfcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbaV0gKyAnUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XG5cdFx0XHRfY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdmVuZG9yc1tpXSArICdDYW5jZWxBbmltYXRpb25GcmFtZSddIHx8IHdpbmRvd1t2ZW5kb3JzW2ldICsgJ0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuXHRcdH1cblxuXHRcdC8vIGZhbGxiYWNrc1xuXHRcdGlmICghX3JlcXVlc3RBbmltYXRpb25GcmFtZSkge1xuXHRcdFx0X3JlcXVlc3RBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuXHRcdFx0XHR2YXJcblx0XHRcdFx0Y3VyclRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcblx0XHRcdFx0XHR0aW1lVG9DYWxsID0gTWF0aC5tYXgoMCwgMTYgLSAoY3VyclRpbWUgLSBsYXN0VGltZSkpLFxuXHRcdFx0XHRcdGlkID0gd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0Y2FsbGJhY2soY3VyclRpbWUgKyB0aW1lVG9DYWxsKTtcblx0XHRcdFx0XHR9LCB0aW1lVG9DYWxsKTtcblx0XHRcdFx0bGFzdFRpbWUgPSBjdXJyVGltZSArIHRpbWVUb0NhbGw7XG5cdFx0XHRcdHJldHVybiBpZDtcblx0XHRcdH07XG5cdFx0fVxuXHRcdGlmICghX2NhbmNlbEFuaW1hdGlvbkZyYW1lKSB7XG5cdFx0XHRfY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbiAoaWQpIHtcblx0XHRcdFx0d2luZG93LmNsZWFyVGltZW91dChpZCk7XG5cdFx0XHR9O1xuXHRcdH1cblx0XHRVLnJBRiA9IF9yZXF1ZXN0QW5pbWF0aW9uRnJhbWUuYmluZCh3aW5kb3cpO1xuXHRcdFUuY0FGID0gX2NhbmNlbEFuaW1hdGlvbkZyYW1lLmJpbmQod2luZG93KTtcblxuXHRcdHZhclxuXHRcdGxvZ2xldmVscyA9IFtcImVycm9yXCIsIFwid2FyblwiLCBcImxvZ1wiXSxcblx0XHRcdGNvbnNvbGUgPSB3aW5kb3cuY29uc29sZSB8fCB7fTtcblxuXHRcdGNvbnNvbGUubG9nID0gY29uc29sZS5sb2cgfHxcblx0XHRmdW5jdGlvbiAoKSB7fTsgLy8gbm8gY29uc29sZSBsb2csIHdlbGwgLSBkbyBub3RoaW5nIHRoZW4uLi5cblx0XHQvLyBtYWtlIHN1cmUgbWV0aG9kcyBmb3IgYWxsIGxldmVscyBleGlzdC5cblx0XHRmb3IgKGkgPSAwOyBpIDwgbG9nbGV2ZWxzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgbWV0aG9kID0gbG9nbGV2ZWxzW2ldO1xuXHRcdFx0aWYgKCFjb25zb2xlW21ldGhvZF0pIHtcblx0XHRcdFx0Y29uc29sZVttZXRob2RdID0gY29uc29sZS5sb2c7IC8vIHByZWZlciAubG9nIG92ZXIgbm90aGluZ1xuXHRcdFx0fVxuXHRcdH1cblx0XHRVLmxvZyA9IGZ1bmN0aW9uIChsb2dsZXZlbCkge1xuXHRcdFx0aWYgKGxvZ2xldmVsID4gbG9nbGV2ZWxzLmxlbmd0aCB8fCBsb2dsZXZlbCA8PSAwKSBsb2dsZXZlbCA9IGxvZ2xldmVscy5sZW5ndGg7XG5cdFx0XHR2YXIgbm93ID0gbmV3IERhdGUoKSxcblx0XHRcdFx0dGltZSA9IChcIjBcIiArIG5vdy5nZXRIb3VycygpKS5zbGljZSgtMikgKyBcIjpcIiArIChcIjBcIiArIG5vdy5nZXRNaW51dGVzKCkpLnNsaWNlKC0yKSArIFwiOlwiICsgKFwiMFwiICsgbm93LmdldFNlY29uZHMoKSkuc2xpY2UoLTIpICsgXCI6XCIgKyAoXCIwMFwiICsgbm93LmdldE1pbGxpc2Vjb25kcygpKS5zbGljZSgtMyksXG5cdFx0XHRcdG1ldGhvZCA9IGxvZ2xldmVsc1tsb2dsZXZlbCAtIDFdLFxuXHRcdFx0XHRhcmdzID0gQXJyYXkucHJvdG90eXBlLnNwbGljZS5jYWxsKGFyZ3VtZW50cywgMSksXG5cdFx0XHRcdGZ1bmMgPSBGdW5jdGlvbi5wcm90b3R5cGUuYmluZC5jYWxsKGNvbnNvbGVbbWV0aG9kXSwgY29uc29sZSk7XG5cdFx0XHRhcmdzLnVuc2hpZnQodGltZSk7XG5cdFx0XHRmdW5jLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0XHQgKiB0eXBlIHRlc3Rpbmdcblx0XHQgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0XHQgKi9cblxuXHRcdHZhciBfdHlwZSA9IFUudHlwZSA9IGZ1bmN0aW9uICh2KSB7XG5cdFx0XHRyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHYpLnJlcGxhY2UoL15cXFtvYmplY3QgKC4rKVxcXSQvLCBcIiQxXCIpLnRvTG93ZXJDYXNlKCk7XG5cdFx0fTtcblx0XHRfdHlwZS5TdHJpbmcgPSBmdW5jdGlvbiAodikge1xuXHRcdFx0cmV0dXJuIF90eXBlKHYpID09PSAnc3RyaW5nJztcblx0XHR9O1xuXHRcdF90eXBlLkZ1bmN0aW9uID0gZnVuY3Rpb24gKHYpIHtcblx0XHRcdHJldHVybiBfdHlwZSh2KSA9PT0gJ2Z1bmN0aW9uJztcblx0XHR9O1xuXHRcdF90eXBlLkFycmF5ID0gZnVuY3Rpb24gKHYpIHtcblx0XHRcdHJldHVybiBBcnJheS5pc0FycmF5KHYpO1xuXHRcdH07XG5cdFx0X3R5cGUuTnVtYmVyID0gZnVuY3Rpb24gKHYpIHtcblx0XHRcdHJldHVybiAhX3R5cGUuQXJyYXkodikgJiYgKHYgLSBwYXJzZUZsb2F0KHYpICsgMSkgPj0gMDtcblx0XHR9O1xuXHRcdF90eXBlLkRvbUVsZW1lbnQgPSBmdW5jdGlvbiAobykge1xuXHRcdFx0cmV0dXJuIChcblx0XHRcdHR5cGVvZiBIVE1MRWxlbWVudCA9PT0gXCJvYmplY3RcIiA/IG8gaW5zdGFuY2VvZiBIVE1MRWxlbWVudCA6IC8vRE9NMlxuXHRcdFx0byAmJiB0eXBlb2YgbyA9PT0gXCJvYmplY3RcIiAmJiBvICE9PSBudWxsICYmIG8ubm9kZVR5cGUgPT09IDEgJiYgdHlwZW9mIG8ubm9kZU5hbWUgPT09IFwic3RyaW5nXCIpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0XHQgKiBET00gRWxlbWVudCBpbmZvXG5cdFx0ICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdFx0ICovXG5cdFx0Ly8gYWx3YXlzIHJldHVybnMgYSBsaXN0IG9mIG1hdGNoaW5nIERPTSBlbGVtZW50cywgZnJvbSBhIHNlbGVjdG9yLCBhIERPTSBlbGVtZW50IG9yIGFuIGxpc3Qgb2YgZWxlbWVudHMgb3IgZXZlbiBhbiBhcnJheSBvZiBzZWxlY3RvcnNcblx0XHR2YXIgX2dldCA9IFUuZ2V0ID0ge307XG5cdFx0X2dldC5lbGVtZW50cyA9IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuXHRcdFx0dmFyIGFyciA9IFtdO1xuXHRcdFx0aWYgKF90eXBlLlN0cmluZyhzZWxlY3RvcikpIHtcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRzZWxlY3RvciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuXHRcdFx0XHR9IGNhdGNoIChlKSB7IC8vIGludmFsaWQgc2VsZWN0b3Jcblx0XHRcdFx0XHRyZXR1cm4gYXJyO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoX3R5cGUoc2VsZWN0b3IpID09PSAnbm9kZWxpc3QnIHx8IF90eXBlLkFycmF5KHNlbGVjdG9yKSkge1xuXHRcdFx0XHRmb3IgKHZhciBpID0gMCwgcmVmID0gYXJyLmxlbmd0aCA9IHNlbGVjdG9yLmxlbmd0aDsgaSA8IHJlZjsgaSsrKSB7IC8vIGxpc3Qgb2YgZWxlbWVudHNcblx0XHRcdFx0XHR2YXIgZWxlbSA9IHNlbGVjdG9yW2ldO1xuXHRcdFx0XHRcdGFycltpXSA9IF90eXBlLkRvbUVsZW1lbnQoZWxlbSkgPyBlbGVtIDogX2dldC5lbGVtZW50cyhlbGVtKTsgLy8gaWYgbm90IGFuIGVsZW1lbnQsIHRyeSB0byByZXNvbHZlIHJlY3Vyc2l2ZWx5XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAoX3R5cGUuRG9tRWxlbWVudChzZWxlY3RvcikgfHwgc2VsZWN0b3IgPT09IGRvY3VtZW50IHx8IHNlbGVjdG9yID09PSB3aW5kb3cpIHtcblx0XHRcdFx0YXJyID0gW3NlbGVjdG9yXTsgLy8gb25seSB0aGUgZWxlbWVudFxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGFycjtcblx0XHR9O1xuXHRcdC8vIGdldCBzY3JvbGwgdG9wIHZhbHVlXG5cdFx0X2dldC5zY3JvbGxUb3AgPSBmdW5jdGlvbiAoZWxlbSkge1xuXHRcdFx0cmV0dXJuIChlbGVtICYmIHR5cGVvZiBlbGVtLnNjcm9sbFRvcCA9PT0gJ251bWJlcicpID8gZWxlbS5zY3JvbGxUb3AgOiB3aW5kb3cucGFnZVlPZmZzZXQgfHwgMDtcblx0XHR9O1xuXHRcdC8vIGdldCBzY3JvbGwgbGVmdCB2YWx1ZVxuXHRcdF9nZXQuc2Nyb2xsTGVmdCA9IGZ1bmN0aW9uIChlbGVtKSB7XG5cdFx0XHRyZXR1cm4gKGVsZW0gJiYgdHlwZW9mIGVsZW0uc2Nyb2xsTGVmdCA9PT0gJ251bWJlcicpID8gZWxlbS5zY3JvbGxMZWZ0IDogd2luZG93LnBhZ2VYT2Zmc2V0IHx8IDA7XG5cdFx0fTtcblx0XHQvLyBnZXQgZWxlbWVudCBoZWlnaHRcblx0XHRfZ2V0LndpZHRoID0gZnVuY3Rpb24gKGVsZW0sIG91dGVyLCBpbmNsdWRlTWFyZ2luKSB7XG5cdFx0XHRyZXR1cm4gX2RpbWVuc2lvbignd2lkdGgnLCBlbGVtLCBvdXRlciwgaW5jbHVkZU1hcmdpbik7XG5cdFx0fTtcblx0XHQvLyBnZXQgZWxlbWVudCB3aWR0aFxuXHRcdF9nZXQuaGVpZ2h0ID0gZnVuY3Rpb24gKGVsZW0sIG91dGVyLCBpbmNsdWRlTWFyZ2luKSB7XG5cdFx0XHRyZXR1cm4gX2RpbWVuc2lvbignaGVpZ2h0JywgZWxlbSwgb3V0ZXIsIGluY2x1ZGVNYXJnaW4pO1xuXHRcdH07XG5cblx0XHQvLyBnZXQgZWxlbWVudCBwb3NpdGlvbiAob3B0aW9uYWxseSByZWxhdGl2ZSB0byB2aWV3cG9ydClcblx0XHRfZ2V0Lm9mZnNldCA9IGZ1bmN0aW9uIChlbGVtLCByZWxhdGl2ZVRvVmlld3BvcnQpIHtcblx0XHRcdHZhciBvZmZzZXQgPSB7XG5cdFx0XHRcdHRvcDogMCxcblx0XHRcdFx0bGVmdDogMFxuXHRcdFx0fTtcblx0XHRcdGlmIChlbGVtICYmIGVsZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KSB7IC8vIGNoZWNrIGlmIGF2YWlsYWJsZVxuXHRcdFx0XHR2YXIgcmVjdCA9IGVsZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cdFx0XHRcdG9mZnNldC50b3AgPSByZWN0LnRvcDtcblx0XHRcdFx0b2Zmc2V0LmxlZnQgPSByZWN0LmxlZnQ7XG5cdFx0XHRcdGlmICghcmVsYXRpdmVUb1ZpZXdwb3J0KSB7IC8vIGNsaWVudFJlY3QgaXMgYnkgZGVmYXVsdCByZWxhdGl2ZSB0byB2aWV3cG9ydC4uLlxuXHRcdFx0XHRcdG9mZnNldC50b3AgKz0gX2dldC5zY3JvbGxUb3AoKTtcblx0XHRcdFx0XHRvZmZzZXQubGVmdCArPSBfZ2V0LnNjcm9sbExlZnQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG9mZnNldDtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdFx0ICogRE9NIEVsZW1lbnQgbWFuaXB1bGF0aW9uXG5cdFx0ICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdFx0ICovXG5cblx0XHRVLmFkZENsYXNzID0gZnVuY3Rpb24gKGVsZW0sIGNsYXNzbmFtZSkge1xuXHRcdFx0aWYgKGNsYXNzbmFtZSkge1xuXHRcdFx0XHRpZiAoZWxlbS5jbGFzc0xpc3QpIGVsZW0uY2xhc3NMaXN0LmFkZChjbGFzc25hbWUpO1xuXHRcdFx0XHRlbHNlIGVsZW0uY2xhc3NOYW1lICs9ICcgJyArIGNsYXNzbmFtZTtcblx0XHRcdH1cblx0XHR9O1xuXHRcdFUucmVtb3ZlQ2xhc3MgPSBmdW5jdGlvbiAoZWxlbSwgY2xhc3NuYW1lKSB7XG5cdFx0XHRpZiAoY2xhc3NuYW1lKSB7XG5cdFx0XHRcdGlmIChlbGVtLmNsYXNzTGlzdCkgZWxlbS5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzbmFtZSk7XG5cdFx0XHRcdGVsc2UgZWxlbS5jbGFzc05hbWUgPSBlbGVtLmNsYXNzTmFtZS5yZXBsYWNlKG5ldyBSZWdFeHAoJyhefFxcXFxiKScgKyBjbGFzc25hbWUuc3BsaXQoJyAnKS5qb2luKCd8JykgKyAnKFxcXFxifCQpJywgJ2dpJyksICcgJyk7XG5cdFx0XHR9XG5cdFx0fTtcblx0XHQvLyBpZiBvcHRpb25zIGlzIHN0cmluZyAtPiByZXR1cm5zIGNzcyB2YWx1ZVxuXHRcdC8vIGlmIG9wdGlvbnMgaXMgYXJyYXkgLT4gcmV0dXJucyBvYmplY3Qgd2l0aCBjc3MgdmFsdWUgcGFpcnNcblx0XHQvLyBpZiBvcHRpb25zIGlzIG9iamVjdCAtPiBzZXQgbmV3IGNzcyB2YWx1ZXNcblx0XHRVLmNzcyA9IGZ1bmN0aW9uIChlbGVtLCBvcHRpb25zKSB7XG5cdFx0XHRpZiAoX3R5cGUuU3RyaW5nKG9wdGlvbnMpKSB7XG5cdFx0XHRcdHJldHVybiBfZ2V0Q29tcHV0ZWRTdHlsZShlbGVtKVtfY2FtZWxDYXNlKG9wdGlvbnMpXTtcblx0XHRcdH0gZWxzZSBpZiAoX3R5cGUuQXJyYXkob3B0aW9ucykpIHtcblx0XHRcdFx0dmFyXG5cdFx0XHRcdG9iaiA9IHt9LFxuXHRcdFx0XHRcdHN0eWxlID0gX2dldENvbXB1dGVkU3R5bGUoZWxlbSk7XG5cdFx0XHRcdG9wdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAob3B0aW9uLCBrZXkpIHtcblx0XHRcdFx0XHRvYmpbb3B0aW9uXSA9IHN0eWxlW19jYW1lbENhc2Uob3B0aW9uKV07XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm4gb2JqO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Zm9yICh2YXIgb3B0aW9uIGluIG9wdGlvbnMpIHtcblx0XHRcdFx0XHR2YXIgdmFsID0gb3B0aW9uc1tvcHRpb25dO1xuXHRcdFx0XHRcdGlmICh2YWwgPT0gcGFyc2VGbG9hdCh2YWwpKSB7IC8vIGFzc3VtZSBwaXhlbCBmb3Igc2VlbWluZ2x5IG51bWVyaWNhbCB2YWx1ZXNcblx0XHRcdFx0XHRcdHZhbCArPSAncHgnO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbGVtLnN0eWxlW19jYW1lbENhc2Uob3B0aW9uKV0gPSB2YWw7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0cmV0dXJuIFU7XG5cdH0od2luZG93IHx8IHt9KSk7XG5cblx0U2Nyb2xsTWFnaWMuU2NlbmUucHJvdG90eXBlLmFkZEluZGljYXRvcnMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0U2Nyb2xsTWFnaWMuX3V0aWwubG9nKDEsICcoU2Nyb2xsTWFnaWMuU2NlbmUpIC0+IEVSUk9SIGNhbGxpbmcgYWRkSW5kaWNhdG9ycygpIGR1ZSB0byBtaXNzaW5nIFBsdWdpbiBcXCdkZWJ1Zy5hZGRJbmRpY2F0b3JzXFwnLiBQbGVhc2UgbWFrZSBzdXJlIHRvIGluY2x1ZGUgcGx1Z2lucy9kZWJ1Zy5hZGRJbmRpY2F0b3JzLmpzJyk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblx0U2Nyb2xsTWFnaWMuU2NlbmUucHJvdG90eXBlLnJlbW92ZUluZGljYXRvcnMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0U2Nyb2xsTWFnaWMuX3V0aWwubG9nKDEsICcoU2Nyb2xsTWFnaWMuU2NlbmUpIC0+IEVSUk9SIGNhbGxpbmcgcmVtb3ZlSW5kaWNhdG9ycygpIGR1ZSB0byBtaXNzaW5nIFBsdWdpbiBcXCdkZWJ1Zy5hZGRJbmRpY2F0b3JzXFwnLiBQbGVhc2UgbWFrZSBzdXJlIHRvIGluY2x1ZGUgcGx1Z2lucy9kZWJ1Zy5hZGRJbmRpY2F0b3JzLmpzJyk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblx0U2Nyb2xsTWFnaWMuU2NlbmUucHJvdG90eXBlLnNldFR3ZWVuID0gZnVuY3Rpb24gKCkge1xuXHRcdFNjcm9sbE1hZ2ljLl91dGlsLmxvZygxLCAnKFNjcm9sbE1hZ2ljLlNjZW5lKSAtPiBFUlJPUiBjYWxsaW5nIHNldFR3ZWVuKCkgZHVlIHRvIG1pc3NpbmcgUGx1Z2luIFxcJ2FuaW1hdGlvbi5nc2FwXFwnLiBQbGVhc2UgbWFrZSBzdXJlIHRvIGluY2x1ZGUgcGx1Z2lucy9hbmltYXRpb24uZ3NhcC5qcycpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cdFNjcm9sbE1hZ2ljLlNjZW5lLnByb3RvdHlwZS5yZW1vdmVUd2VlbiA9IGZ1bmN0aW9uICgpIHtcblx0XHRTY3JvbGxNYWdpYy5fdXRpbC5sb2coMSwgJyhTY3JvbGxNYWdpYy5TY2VuZSkgLT4gRVJST1IgY2FsbGluZyByZW1vdmVUd2VlbigpIGR1ZSB0byBtaXNzaW5nIFBsdWdpbiBcXCdhbmltYXRpb24uZ3NhcFxcJy4gUGxlYXNlIG1ha2Ugc3VyZSB0byBpbmNsdWRlIHBsdWdpbnMvYW5pbWF0aW9uLmdzYXAuanMnKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXHRTY3JvbGxNYWdpYy5TY2VuZS5wcm90b3R5cGUuc2V0VmVsb2NpdHkgPSBmdW5jdGlvbiAoKSB7XG5cdFx0U2Nyb2xsTWFnaWMuX3V0aWwubG9nKDEsICcoU2Nyb2xsTWFnaWMuU2NlbmUpIC0+IEVSUk9SIGNhbGxpbmcgc2V0VmVsb2NpdHkoKSBkdWUgdG8gbWlzc2luZyBQbHVnaW4gXFwnYW5pbWF0aW9uLnZlbG9jaXR5XFwnLiBQbGVhc2UgbWFrZSBzdXJlIHRvIGluY2x1ZGUgcGx1Z2lucy9hbmltYXRpb24udmVsb2NpdHkuanMnKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXHRTY3JvbGxNYWdpYy5TY2VuZS5wcm90b3R5cGUucmVtb3ZlVmVsb2NpdHkgPSBmdW5jdGlvbiAoKSB7XG5cdFx0U2Nyb2xsTWFnaWMuX3V0aWwubG9nKDEsICcoU2Nyb2xsTWFnaWMuU2NlbmUpIC0+IEVSUk9SIGNhbGxpbmcgcmVtb3ZlVmVsb2NpdHkoKSBkdWUgdG8gbWlzc2luZyBQbHVnaW4gXFwnYW5pbWF0aW9uLnZlbG9jaXR5XFwnLiBQbGVhc2UgbWFrZSBzdXJlIHRvIGluY2x1ZGUgcGx1Z2lucy9hbmltYXRpb24udmVsb2NpdHkuanMnKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiBTY3JvbGxNYWdpYztcbn0pKTsiXSwiZmlsZSI6InZlbmRvci9TY3JvbGxNYWdpYy5qcyJ9
