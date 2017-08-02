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
 * @file ScrollMagic GSAP Animation Plugin.
 *
 * requires: GSAP ~1.14
 * Powered by the Greensock Animation Platform (GSAP): http://www.greensock.com/js
 * Greensock License info at http://www.greensock.com/licensing/
 */
/**
 * This plugin is meant to be used in conjunction with the Greensock Animation Plattform.  
 * It offers an easy API to trigger Tweens or synchronize them to the scrollbar movement.
 *
 * Both the `lite` and the `max` versions of the GSAP library are supported.  
 * The most basic requirement is `TweenLite`.
 * 
 * To have access to this extension, please include `plugins/animation.gsap.js`.
 * @requires {@link http://greensock.com/gsap|GSAP ~1.14.x}
 * @mixin animation.GSAP
 */
(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['ScrollMagic', 'TweenMax', 'TimelineMax'], factory);
	} else if (typeof exports === 'object') {
		// CommonJS
		// Loads whole gsap package onto global scope.
		require('gsap');
		factory(require('scrollmagic'), TweenMax, TimelineMax);
	} else {
		// Browser globals
		factory(root.ScrollMagic || (root.jQuery && root.jQuery.ScrollMagic), root.TweenMax || root.TweenLite, root.TimelineMax || root.TimelineLite);
	}
}(this, function (ScrollMagic, Tween, Timeline) {
	"use strict";
	var NAMESPACE = "animation.gsap";

	var
	console = window.console || {},
		err = Function.prototype.bind.call(console.error || console.log ||
		function () {}, console);
	if (!ScrollMagic) {
		err("(" + NAMESPACE + ") -> ERROR: The ScrollMagic main module could not be found. Please make sure it's loaded before this plugin or use an asynchronous loader like requirejs.");
	}
	if (!Tween) {
		err("(" + NAMESPACE + ") -> ERROR: TweenLite or TweenMax could not be found. Please make sure GSAP is loaded before ScrollMagic or use an asynchronous loader like requirejs.");
	}

/*
	 * ----------------------------------------------------------------
	 * Extensions for Scene
	 * ----------------------------------------------------------------
	 */
	/**
	 * Every instance of ScrollMagic.Scene now accepts an additional option.  
	 * See {@link ScrollMagic.Scene} for a complete list of the standard options.
	 * @memberof! animation.GSAP#
	 * @method new ScrollMagic.Scene(options)
	 * @example
	 * var scene = new ScrollMagic.Scene({tweenChanges: true});
	 *
	 * @param {object} [options] - Options for the Scene. The options can be updated at any time.
	 * @param {boolean} [options.tweenChanges=false] - Tweens Animation to the progress target instead of setting it.  
	 Does not affect animations where duration is `0`.
	 */
	/**
	 * **Get** or **Set** the tweenChanges option value.  
	 * This only affects scenes with a duration. If `tweenChanges` is `true`, the progress update when scrolling will not be immediate, but instead the animation will smoothly animate to the target state.  
	 * For a better understanding, try enabling and disabling this option in the [Scene Manipulation Example](../examples/basic/scene_manipulation.html).
	 * @memberof! animation.GSAP#
	 * @method Scene.tweenChanges
	 * 
	 * @example
	 * // get the current tweenChanges option
	 * var tweenChanges = scene.tweenChanges();
	 *
	 * // set new tweenChanges option
	 * scene.tweenChanges(true);
	 *
	 * @fires {@link Scene.change}, when used as setter
	 * @param {boolean} [newTweenChanges] - The new tweenChanges setting of the scene.
	 * @returns {boolean} `get` -  Current tweenChanges option value.
	 * @returns {Scene} `set` -  Parent object for chaining.
	 */
	// add option (TODO: DOC (private for dev))
	ScrollMagic.Scene.addOption("tweenChanges", // name
	false, // default


	function (val) { // validation callback
		return !!val;
	});
	// extend scene
	ScrollMagic.Scene.extend(function () {
		var Scene = this,
			_tween;

		var log = function () {
			if (Scene._log) { // not available, when main source minified
				Array.prototype.splice.call(arguments, 1, 0, "(" + NAMESPACE + ")", "->");
				Scene._log.apply(this, arguments);
			}
		};

		// set listeners
		Scene.on("progress.plugin_gsap", function () {
			updateTweenProgress();
		});
		Scene.on("destroy.plugin_gsap", function (e) {
			Scene.removeTween(e.reset);
		});

		/**
		 * Update the tween progress to current position.
		 * @private
		 */
		var updateTweenProgress = function () {
			if (_tween) {
				var
				progress = Scene.progress(),
					state = Scene.state();
				if (_tween.repeat && _tween.repeat() === -1) {
					// infinite loop, so not in relation to progress
					if (state === 'DURING' && _tween.paused()) {
						_tween.play();
					} else if (state !== 'DURING' && !_tween.paused()) {
						_tween.pause();
					}
				} else if (progress != _tween.progress()) { // do we even need to update the progress?
					// no infinite loop - so should we just play or go to a specific point in time?
					if (Scene.duration() === 0) {
						// play the animation
						if (progress > 0) { // play from 0 to 1
							_tween.play();
						} else { // play from 1 to 0
							_tween.reverse();
						}
					} else {
						// go to a specific point in time
						if (Scene.tweenChanges() && _tween.tweenTo) {
							// go smooth
							_tween.tweenTo(progress * _tween.duration());
						} else {
							// just hard set it
							_tween.progress(progress).pause();
						}
					}
				}
			}
		};

		/**
		 * Add a tween to the scene.  
		 * If you want to add multiple tweens, add them into a GSAP Timeline object and supply it instead (see example below).  
		 * 
		 * If the scene has a duration, the tween's duration will be projected to the scroll distance of the scene, meaning its progress will be synced to scrollbar movement.  
		 * For a scene with a duration of `0`, the tween will be triggered when scrolling forward past the scene's trigger position and reversed, when scrolling back.  
		 * To gain better understanding, check out the [Simple Tweening example](../examples/basic/simple_tweening.html).
		 *
		 * Instead of supplying a tween this method can also be used as a shorthand for `TweenMax.to()` (see example below).
		 * @memberof! animation.GSAP#
		 *
		 * @example
		 * // add a single tween directly
		 * scene.setTween(TweenMax.to("obj"), 1, {x: 100});
		 *
		 * // add a single tween via variable
		 * var tween = TweenMax.to("obj"), 1, {x: 100};
		 * scene.setTween(tween);
		 *
		 * // add multiple tweens, wrapped in a timeline.
		 * var timeline = new TimelineMax();
		 * var tween1 = TweenMax.from("obj1", 1, {x: 100});
		 * var tween2 = TweenMax.to("obj2", 1, {y: 100});
		 * timeline
		 *		.add(tween1)
		 *		.add(tween2);
		 * scene.addTween(timeline);
		 *
		 * // short hand to add a TweenMax.to() tween
		 * scene.setTween("obj3", 0.5, {y: 100});
		 *
		 * // short hand to add a TweenMax.to() tween for 1 second
		 * // this is useful, when the scene has a duration and the tween duration isn't important anyway
		 * scene.setTween("obj3", {y: 100});
		 *
		 * @param {(object|string)} TweenObject - A TweenMax, TweenLite, TimelineMax or TimelineLite object that should be animated in the scene. Can also be a Dom Element or Selector, when using direct tween definition (see examples).
		 * @param {(number|object)} duration - A duration for the tween, or tween parameters. If an object containing parameters are supplied, a default duration of 1 will be used.
		 * @param {object} params - The parameters for the tween
		 * @returns {Scene} Parent object for chaining.
		 */
		Scene.setTween = function (TweenObject, duration, params) {
			var newTween;
			if (arguments.length > 1) {
				if (arguments.length < 3) {
					params = duration;
					duration = 1;
				}
				TweenObject = Tween.to(TweenObject, duration, params);
			}
			try {
				// wrap Tween into a Timeline Object if available to include delay and repeats in the duration and standardize methods.
				if (Timeline) {
					newTween = new Timeline({
						smoothChildTiming: true
					}).add(TweenObject);
				} else {
					newTween = TweenObject;
				}
				newTween.pause();
			} catch (e) {
				log(1, "ERROR calling method 'setTween()': Supplied argument is not a valid TweenObject");
				return Scene;
			}
			if (_tween) { // kill old tween?
				Scene.removeTween();
			}
			_tween = newTween;

			// some properties need to be transferred it to the wrapper, otherwise they would get lost.
			if (TweenObject.repeat && TweenObject.repeat() === -1) { // TweenMax or TimelineMax Object?
				_tween.repeat(-1);
				_tween.yoyo(TweenObject.yoyo());
			}
			// Some tween validations and debugging helpers
			if (Scene.tweenChanges() && !_tween.tweenTo) {
				log(2, "WARNING: tweenChanges will only work if the TimelineMax object is available for ScrollMagic.");
			}

			// check if there are position tweens defined for the trigger and warn about it :)
			if (_tween && Scene.controller() && Scene.triggerElement() && Scene.loglevel() >= 2) { // controller is needed to know scroll direction.
				var
				triggerTweens = Tween.getTweensOf(Scene.triggerElement()),
					vertical = Scene.controller().info("vertical");
				triggerTweens.forEach(function (value, index) {
					var
					tweenvars = value.vars.css || value.vars,
						condition = vertical ? (tweenvars.top !== undefined || tweenvars.bottom !== undefined) : (tweenvars.left !== undefined || tweenvars.right !== undefined);
					if (condition) {
						log(2, "WARNING: Tweening the position of the trigger element affects the scene timing and should be avoided!");
						return false;
					}
				});
			}

			// warn about tween overwrites, when an element is tweened multiple times
			if (parseFloat(TweenLite.version) >= 1.14) { // onOverwrite only present since GSAP v1.14.0
				var
				list = _tween.getChildren ? _tween.getChildren(true, true, false) : [_tween],
					// get all nested tween objects
					newCallback = function () {
						log(2, "WARNING: tween was overwritten by another. To learn how to avoid this issue see here: https://github.com/janpaepke/ScrollMagic/wiki/WARNING:-tween-was-overwritten-by-another");
					};
				for (var i = 0, thisTween, oldCallback; i < list.length; i++) { /*jshint loopfunc: true */
					thisTween = list[i];
					if (oldCallback !== newCallback) { // if tweens is added more than once
						oldCallback = thisTween.vars.onOverwrite;
						thisTween.vars.onOverwrite = function () {
							if (oldCallback) {
								oldCallback.apply(this, arguments);
							}
							newCallback.apply(this, arguments);
						};
					}
				}
			}
			log(3, "added tween");

			updateTweenProgress();
			return Scene;
		};

		/**
		 * Remove the tween from the scene.  
		 * This will terminate the control of the Scene over the tween.
		 *
		 * Using the reset option you can decide if the tween should remain in the current state or be rewound to set the target elements back to the state they were in before the tween was added to the scene.
		 * @memberof! animation.GSAP#
		 *
		 * @example
		 * // remove the tween from the scene without resetting it
		 * scene.removeTween();
		 *
		 * // remove the tween from the scene and reset it to initial position
		 * scene.removeTween(true);
		 *
		 * @param {boolean} [reset=false] - If `true` the tween will be reset to its initial values.
		 * @returns {Scene} Parent object for chaining.
		 */
		Scene.removeTween = function (reset) {
			if (_tween) {
				if (reset) {
					_tween.progress(0).pause();
				}
				_tween.kill();
				_tween = undefined;
				log(3, "removed tween (reset: " + (reset ? "true" : "false") + ")");
			}
			return Scene;
		};

	});
}));
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJ2ZW5kb3IvcGx1Z2lucy9hbmltYXRpb24uZ3NhcC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiAqIFNjcm9sbE1hZ2ljIHYyLjAuNSAoMjAxNS0wNC0yOSlcbiAqIFRoZSBqYXZhc2NyaXB0IGxpYnJhcnkgZm9yIG1hZ2ljYWwgc2Nyb2xsIGludGVyYWN0aW9ucy5cbiAqIChjKSAyMDE1IEphbiBQYWVwa2UgKEBqYW5wYWVwa2UpXG4gKiBQcm9qZWN0IFdlYnNpdGU6IGh0dHA6Ly9zY3JvbGxtYWdpYy5pb1xuICogXG4gKiBAdmVyc2lvbiAyLjAuNVxuICogQGxpY2Vuc2UgRHVhbCBsaWNlbnNlZCB1bmRlciBNSVQgbGljZW5zZSBhbmQgR1BMLlxuICogQGF1dGhvciBKYW4gUGFlcGtlIC0gZS1tYWlsQGphbnBhZXBrZS5kZVxuICpcbiAqIEBmaWxlIFNjcm9sbE1hZ2ljIEdTQVAgQW5pbWF0aW9uIFBsdWdpbi5cbiAqXG4gKiByZXF1aXJlczogR1NBUCB+MS4xNFxuICogUG93ZXJlZCBieSB0aGUgR3JlZW5zb2NrIEFuaW1hdGlvbiBQbGF0Zm9ybSAoR1NBUCk6IGh0dHA6Ly93d3cuZ3JlZW5zb2NrLmNvbS9qc1xuICogR3JlZW5zb2NrIExpY2Vuc2UgaW5mbyBhdCBodHRwOi8vd3d3LmdyZWVuc29jay5jb20vbGljZW5zaW5nL1xuICovXG4vKipcbiAqIFRoaXMgcGx1Z2luIGlzIG1lYW50IHRvIGJlIHVzZWQgaW4gY29uanVuY3Rpb24gd2l0aCB0aGUgR3JlZW5zb2NrIEFuaW1hdGlvbiBQbGF0dGZvcm0uICBcbiAqIEl0IG9mZmVycyBhbiBlYXN5IEFQSSB0byB0cmlnZ2VyIFR3ZWVucyBvciBzeW5jaHJvbml6ZSB0aGVtIHRvIHRoZSBzY3JvbGxiYXIgbW92ZW1lbnQuXG4gKlxuICogQm90aCB0aGUgYGxpdGVgIGFuZCB0aGUgYG1heGAgdmVyc2lvbnMgb2YgdGhlIEdTQVAgbGlicmFyeSBhcmUgc3VwcG9ydGVkLiAgXG4gKiBUaGUgbW9zdCBiYXNpYyByZXF1aXJlbWVudCBpcyBgVHdlZW5MaXRlYC5cbiAqIFxuICogVG8gaGF2ZSBhY2Nlc3MgdG8gdGhpcyBleHRlbnNpb24sIHBsZWFzZSBpbmNsdWRlIGBwbHVnaW5zL2FuaW1hdGlvbi5nc2FwLmpzYC5cbiAqIEByZXF1aXJlcyB7QGxpbmsgaHR0cDovL2dyZWVuc29jay5jb20vZ3NhcHxHU0FQIH4xLjE0Lnh9XG4gKiBAbWl4aW4gYW5pbWF0aW9uLkdTQVBcbiAqL1xuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG5cdGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcblx0XHQvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG5cdFx0ZGVmaW5lKFsnU2Nyb2xsTWFnaWMnLCAnVHdlZW5NYXgnLCAnVGltZWxpbmVNYXgnXSwgZmFjdG9yeSk7XG5cdH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG5cdFx0Ly8gQ29tbW9uSlNcblx0XHQvLyBMb2FkcyB3aG9sZSBnc2FwIHBhY2thZ2Ugb250byBnbG9iYWwgc2NvcGUuXG5cdFx0cmVxdWlyZSgnZ3NhcCcpO1xuXHRcdGZhY3RvcnkocmVxdWlyZSgnc2Nyb2xsbWFnaWMnKSwgVHdlZW5NYXgsIFRpbWVsaW5lTWF4KTtcblx0fSBlbHNlIHtcblx0XHQvLyBCcm93c2VyIGdsb2JhbHNcblx0XHRmYWN0b3J5KHJvb3QuU2Nyb2xsTWFnaWMgfHwgKHJvb3QualF1ZXJ5ICYmIHJvb3QualF1ZXJ5LlNjcm9sbE1hZ2ljKSwgcm9vdC5Ud2Vlbk1heCB8fCByb290LlR3ZWVuTGl0ZSwgcm9vdC5UaW1lbGluZU1heCB8fCByb290LlRpbWVsaW5lTGl0ZSk7XG5cdH1cbn0odGhpcywgZnVuY3Rpb24gKFNjcm9sbE1hZ2ljLCBUd2VlbiwgVGltZWxpbmUpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cdHZhciBOQU1FU1BBQ0UgPSBcImFuaW1hdGlvbi5nc2FwXCI7XG5cblx0dmFyXG5cdGNvbnNvbGUgPSB3aW5kb3cuY29uc29sZSB8fCB7fSxcblx0XHRlcnIgPSBGdW5jdGlvbi5wcm90b3R5cGUuYmluZC5jYWxsKGNvbnNvbGUuZXJyb3IgfHwgY29uc29sZS5sb2cgfHxcblx0XHRmdW5jdGlvbiAoKSB7fSwgY29uc29sZSk7XG5cdGlmICghU2Nyb2xsTWFnaWMpIHtcblx0XHRlcnIoXCIoXCIgKyBOQU1FU1BBQ0UgKyBcIikgLT4gRVJST1I6IFRoZSBTY3JvbGxNYWdpYyBtYWluIG1vZHVsZSBjb3VsZCBub3QgYmUgZm91bmQuIFBsZWFzZSBtYWtlIHN1cmUgaXQncyBsb2FkZWQgYmVmb3JlIHRoaXMgcGx1Z2luIG9yIHVzZSBhbiBhc3luY2hyb25vdXMgbG9hZGVyIGxpa2UgcmVxdWlyZWpzLlwiKTtcblx0fVxuXHRpZiAoIVR3ZWVuKSB7XG5cdFx0ZXJyKFwiKFwiICsgTkFNRVNQQUNFICsgXCIpIC0+IEVSUk9SOiBUd2VlbkxpdGUgb3IgVHdlZW5NYXggY291bGQgbm90IGJlIGZvdW5kLiBQbGVhc2UgbWFrZSBzdXJlIEdTQVAgaXMgbG9hZGVkIGJlZm9yZSBTY3JvbGxNYWdpYyBvciB1c2UgYW4gYXN5bmNocm9ub3VzIGxvYWRlciBsaWtlIHJlcXVpcmVqcy5cIik7XG5cdH1cblxuLypcblx0ICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQgKiBFeHRlbnNpb25zIGZvciBTY2VuZVxuXHQgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdCAqL1xuXHQvKipcblx0ICogRXZlcnkgaW5zdGFuY2Ugb2YgU2Nyb2xsTWFnaWMuU2NlbmUgbm93IGFjY2VwdHMgYW4gYWRkaXRpb25hbCBvcHRpb24uICBcblx0ICogU2VlIHtAbGluayBTY3JvbGxNYWdpYy5TY2VuZX0gZm9yIGEgY29tcGxldGUgbGlzdCBvZiB0aGUgc3RhbmRhcmQgb3B0aW9ucy5cblx0ICogQG1lbWJlcm9mISBhbmltYXRpb24uR1NBUCNcblx0ICogQG1ldGhvZCBuZXcgU2Nyb2xsTWFnaWMuU2NlbmUob3B0aW9ucylcblx0ICogQGV4YW1wbGVcblx0ICogdmFyIHNjZW5lID0gbmV3IFNjcm9sbE1hZ2ljLlNjZW5lKHt0d2VlbkNoYW5nZXM6IHRydWV9KTtcblx0ICpcblx0ICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXSAtIE9wdGlvbnMgZm9yIHRoZSBTY2VuZS4gVGhlIG9wdGlvbnMgY2FuIGJlIHVwZGF0ZWQgYXQgYW55IHRpbWUuXG5cdCAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHdlZW5DaGFuZ2VzPWZhbHNlXSAtIFR3ZWVucyBBbmltYXRpb24gdG8gdGhlIHByb2dyZXNzIHRhcmdldCBpbnN0ZWFkIG9mIHNldHRpbmcgaXQuICBcblx0IERvZXMgbm90IGFmZmVjdCBhbmltYXRpb25zIHdoZXJlIGR1cmF0aW9uIGlzIGAwYC5cblx0ICovXG5cdC8qKlxuXHQgKiAqKkdldCoqIG9yICoqU2V0KiogdGhlIHR3ZWVuQ2hhbmdlcyBvcHRpb24gdmFsdWUuICBcblx0ICogVGhpcyBvbmx5IGFmZmVjdHMgc2NlbmVzIHdpdGggYSBkdXJhdGlvbi4gSWYgYHR3ZWVuQ2hhbmdlc2AgaXMgYHRydWVgLCB0aGUgcHJvZ3Jlc3MgdXBkYXRlIHdoZW4gc2Nyb2xsaW5nIHdpbGwgbm90IGJlIGltbWVkaWF0ZSwgYnV0IGluc3RlYWQgdGhlIGFuaW1hdGlvbiB3aWxsIHNtb290aGx5IGFuaW1hdGUgdG8gdGhlIHRhcmdldCBzdGF0ZS4gIFxuXHQgKiBGb3IgYSBiZXR0ZXIgdW5kZXJzdGFuZGluZywgdHJ5IGVuYWJsaW5nIGFuZCBkaXNhYmxpbmcgdGhpcyBvcHRpb24gaW4gdGhlIFtTY2VuZSBNYW5pcHVsYXRpb24gRXhhbXBsZV0oLi4vZXhhbXBsZXMvYmFzaWMvc2NlbmVfbWFuaXB1bGF0aW9uLmh0bWwpLlxuXHQgKiBAbWVtYmVyb2YhIGFuaW1hdGlvbi5HU0FQI1xuXHQgKiBAbWV0aG9kIFNjZW5lLnR3ZWVuQ2hhbmdlc1xuXHQgKiBcblx0ICogQGV4YW1wbGVcblx0ICogLy8gZ2V0IHRoZSBjdXJyZW50IHR3ZWVuQ2hhbmdlcyBvcHRpb25cblx0ICogdmFyIHR3ZWVuQ2hhbmdlcyA9IHNjZW5lLnR3ZWVuQ2hhbmdlcygpO1xuXHQgKlxuXHQgKiAvLyBzZXQgbmV3IHR3ZWVuQ2hhbmdlcyBvcHRpb25cblx0ICogc2NlbmUudHdlZW5DaGFuZ2VzKHRydWUpO1xuXHQgKlxuXHQgKiBAZmlyZXMge0BsaW5rIFNjZW5lLmNoYW5nZX0sIHdoZW4gdXNlZCBhcyBzZXR0ZXJcblx0ICogQHBhcmFtIHtib29sZWFufSBbbmV3VHdlZW5DaGFuZ2VzXSAtIFRoZSBuZXcgdHdlZW5DaGFuZ2VzIHNldHRpbmcgb2YgdGhlIHNjZW5lLlxuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn0gYGdldGAgLSAgQ3VycmVudCB0d2VlbkNoYW5nZXMgb3B0aW9uIHZhbHVlLlxuXHQgKiBAcmV0dXJucyB7U2NlbmV9IGBzZXRgIC0gIFBhcmVudCBvYmplY3QgZm9yIGNoYWluaW5nLlxuXHQgKi9cblx0Ly8gYWRkIG9wdGlvbiAoVE9ETzogRE9DIChwcml2YXRlIGZvciBkZXYpKVxuXHRTY3JvbGxNYWdpYy5TY2VuZS5hZGRPcHRpb24oXCJ0d2VlbkNoYW5nZXNcIiwgLy8gbmFtZVxuXHRmYWxzZSwgLy8gZGVmYXVsdFxuXG5cblx0ZnVuY3Rpb24gKHZhbCkgeyAvLyB2YWxpZGF0aW9uIGNhbGxiYWNrXG5cdFx0cmV0dXJuICEhdmFsO1xuXHR9KTtcblx0Ly8gZXh0ZW5kIHNjZW5lXG5cdFNjcm9sbE1hZ2ljLlNjZW5lLmV4dGVuZChmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIFNjZW5lID0gdGhpcyxcblx0XHRcdF90d2VlbjtcblxuXHRcdHZhciBsb2cgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoU2NlbmUuX2xvZykgeyAvLyBub3QgYXZhaWxhYmxlLCB3aGVuIG1haW4gc291cmNlIG1pbmlmaWVkXG5cdFx0XHRcdEFycmF5LnByb3RvdHlwZS5zcGxpY2UuY2FsbChhcmd1bWVudHMsIDEsIDAsIFwiKFwiICsgTkFNRVNQQUNFICsgXCIpXCIsIFwiLT5cIik7XG5cdFx0XHRcdFNjZW5lLl9sb2cuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0Ly8gc2V0IGxpc3RlbmVyc1xuXHRcdFNjZW5lLm9uKFwicHJvZ3Jlc3MucGx1Z2luX2dzYXBcIiwgZnVuY3Rpb24gKCkge1xuXHRcdFx0dXBkYXRlVHdlZW5Qcm9ncmVzcygpO1xuXHRcdH0pO1xuXHRcdFNjZW5lLm9uKFwiZGVzdHJveS5wbHVnaW5fZ3NhcFwiLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0U2NlbmUucmVtb3ZlVHdlZW4oZS5yZXNldCk7XG5cdFx0fSk7XG5cblx0XHQvKipcblx0XHQgKiBVcGRhdGUgdGhlIHR3ZWVuIHByb2dyZXNzIHRvIGN1cnJlbnQgcG9zaXRpb24uXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHR2YXIgdXBkYXRlVHdlZW5Qcm9ncmVzcyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmIChfdHdlZW4pIHtcblx0XHRcdFx0dmFyXG5cdFx0XHRcdHByb2dyZXNzID0gU2NlbmUucHJvZ3Jlc3MoKSxcblx0XHRcdFx0XHRzdGF0ZSA9IFNjZW5lLnN0YXRlKCk7XG5cdFx0XHRcdGlmIChfdHdlZW4ucmVwZWF0ICYmIF90d2Vlbi5yZXBlYXQoKSA9PT0gLTEpIHtcblx0XHRcdFx0XHQvLyBpbmZpbml0ZSBsb29wLCBzbyBub3QgaW4gcmVsYXRpb24gdG8gcHJvZ3Jlc3Ncblx0XHRcdFx0XHRpZiAoc3RhdGUgPT09ICdEVVJJTkcnICYmIF90d2Vlbi5wYXVzZWQoKSkge1xuXHRcdFx0XHRcdFx0X3R3ZWVuLnBsYXkoKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHN0YXRlICE9PSAnRFVSSU5HJyAmJiAhX3R3ZWVuLnBhdXNlZCgpKSB7XG5cdFx0XHRcdFx0XHRfdHdlZW4ucGF1c2UoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSBpZiAocHJvZ3Jlc3MgIT0gX3R3ZWVuLnByb2dyZXNzKCkpIHsgLy8gZG8gd2UgZXZlbiBuZWVkIHRvIHVwZGF0ZSB0aGUgcHJvZ3Jlc3M/XG5cdFx0XHRcdFx0Ly8gbm8gaW5maW5pdGUgbG9vcCAtIHNvIHNob3VsZCB3ZSBqdXN0IHBsYXkgb3IgZ28gdG8gYSBzcGVjaWZpYyBwb2ludCBpbiB0aW1lP1xuXHRcdFx0XHRcdGlmIChTY2VuZS5kdXJhdGlvbigpID09PSAwKSB7XG5cdFx0XHRcdFx0XHQvLyBwbGF5IHRoZSBhbmltYXRpb25cblx0XHRcdFx0XHRcdGlmIChwcm9ncmVzcyA+IDApIHsgLy8gcGxheSBmcm9tIDAgdG8gMVxuXHRcdFx0XHRcdFx0XHRfdHdlZW4ucGxheSgpO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHsgLy8gcGxheSBmcm9tIDEgdG8gMFxuXHRcdFx0XHRcdFx0XHRfdHdlZW4ucmV2ZXJzZSgpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyBnbyB0byBhIHNwZWNpZmljIHBvaW50IGluIHRpbWVcblx0XHRcdFx0XHRcdGlmIChTY2VuZS50d2VlbkNoYW5nZXMoKSAmJiBfdHdlZW4udHdlZW5Ubykge1xuXHRcdFx0XHRcdFx0XHQvLyBnbyBzbW9vdGhcblx0XHRcdFx0XHRcdFx0X3R3ZWVuLnR3ZWVuVG8ocHJvZ3Jlc3MgKiBfdHdlZW4uZHVyYXRpb24oKSk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHQvLyBqdXN0IGhhcmQgc2V0IGl0XG5cdFx0XHRcdFx0XHRcdF90d2Vlbi5wcm9ncmVzcyhwcm9ncmVzcykucGF1c2UoKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogQWRkIGEgdHdlZW4gdG8gdGhlIHNjZW5lLiAgXG5cdFx0ICogSWYgeW91IHdhbnQgdG8gYWRkIG11bHRpcGxlIHR3ZWVucywgYWRkIHRoZW0gaW50byBhIEdTQVAgVGltZWxpbmUgb2JqZWN0IGFuZCBzdXBwbHkgaXQgaW5zdGVhZCAoc2VlIGV4YW1wbGUgYmVsb3cpLiAgXG5cdFx0ICogXG5cdFx0ICogSWYgdGhlIHNjZW5lIGhhcyBhIGR1cmF0aW9uLCB0aGUgdHdlZW4ncyBkdXJhdGlvbiB3aWxsIGJlIHByb2plY3RlZCB0byB0aGUgc2Nyb2xsIGRpc3RhbmNlIG9mIHRoZSBzY2VuZSwgbWVhbmluZyBpdHMgcHJvZ3Jlc3Mgd2lsbCBiZSBzeW5jZWQgdG8gc2Nyb2xsYmFyIG1vdmVtZW50LiAgXG5cdFx0ICogRm9yIGEgc2NlbmUgd2l0aCBhIGR1cmF0aW9uIG9mIGAwYCwgdGhlIHR3ZWVuIHdpbGwgYmUgdHJpZ2dlcmVkIHdoZW4gc2Nyb2xsaW5nIGZvcndhcmQgcGFzdCB0aGUgc2NlbmUncyB0cmlnZ2VyIHBvc2l0aW9uIGFuZCByZXZlcnNlZCwgd2hlbiBzY3JvbGxpbmcgYmFjay4gIFxuXHRcdCAqIFRvIGdhaW4gYmV0dGVyIHVuZGVyc3RhbmRpbmcsIGNoZWNrIG91dCB0aGUgW1NpbXBsZSBUd2VlbmluZyBleGFtcGxlXSguLi9leGFtcGxlcy9iYXNpYy9zaW1wbGVfdHdlZW5pbmcuaHRtbCkuXG5cdFx0ICpcblx0XHQgKiBJbnN0ZWFkIG9mIHN1cHBseWluZyBhIHR3ZWVuIHRoaXMgbWV0aG9kIGNhbiBhbHNvIGJlIHVzZWQgYXMgYSBzaG9ydGhhbmQgZm9yIGBUd2Vlbk1heC50bygpYCAoc2VlIGV4YW1wbGUgYmVsb3cpLlxuXHRcdCAqIEBtZW1iZXJvZiEgYW5pbWF0aW9uLkdTQVAjXG5cdFx0ICpcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIC8vIGFkZCBhIHNpbmdsZSB0d2VlbiBkaXJlY3RseVxuXHRcdCAqIHNjZW5lLnNldFR3ZWVuKFR3ZWVuTWF4LnRvKFwib2JqXCIpLCAxLCB7eDogMTAwfSk7XG5cdFx0ICpcblx0XHQgKiAvLyBhZGQgYSBzaW5nbGUgdHdlZW4gdmlhIHZhcmlhYmxlXG5cdFx0ICogdmFyIHR3ZWVuID0gVHdlZW5NYXgudG8oXCJvYmpcIiksIDEsIHt4OiAxMDB9O1xuXHRcdCAqIHNjZW5lLnNldFR3ZWVuKHR3ZWVuKTtcblx0XHQgKlxuXHRcdCAqIC8vIGFkZCBtdWx0aXBsZSB0d2VlbnMsIHdyYXBwZWQgaW4gYSB0aW1lbGluZS5cblx0XHQgKiB2YXIgdGltZWxpbmUgPSBuZXcgVGltZWxpbmVNYXgoKTtcblx0XHQgKiB2YXIgdHdlZW4xID0gVHdlZW5NYXguZnJvbShcIm9iajFcIiwgMSwge3g6IDEwMH0pO1xuXHRcdCAqIHZhciB0d2VlbjIgPSBUd2Vlbk1heC50byhcIm9iajJcIiwgMSwge3k6IDEwMH0pO1xuXHRcdCAqIHRpbWVsaW5lXG5cdFx0ICpcdFx0LmFkZCh0d2VlbjEpXG5cdFx0ICpcdFx0LmFkZCh0d2VlbjIpO1xuXHRcdCAqIHNjZW5lLmFkZFR3ZWVuKHRpbWVsaW5lKTtcblx0XHQgKlxuXHRcdCAqIC8vIHNob3J0IGhhbmQgdG8gYWRkIGEgVHdlZW5NYXgudG8oKSB0d2VlblxuXHRcdCAqIHNjZW5lLnNldFR3ZWVuKFwib2JqM1wiLCAwLjUsIHt5OiAxMDB9KTtcblx0XHQgKlxuXHRcdCAqIC8vIHNob3J0IGhhbmQgdG8gYWRkIGEgVHdlZW5NYXgudG8oKSB0d2VlbiBmb3IgMSBzZWNvbmRcblx0XHQgKiAvLyB0aGlzIGlzIHVzZWZ1bCwgd2hlbiB0aGUgc2NlbmUgaGFzIGEgZHVyYXRpb24gYW5kIHRoZSB0d2VlbiBkdXJhdGlvbiBpc24ndCBpbXBvcnRhbnQgYW55d2F5XG5cdFx0ICogc2NlbmUuc2V0VHdlZW4oXCJvYmozXCIsIHt5OiAxMDB9KTtcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7KG9iamVjdHxzdHJpbmcpfSBUd2Vlbk9iamVjdCAtIEEgVHdlZW5NYXgsIFR3ZWVuTGl0ZSwgVGltZWxpbmVNYXggb3IgVGltZWxpbmVMaXRlIG9iamVjdCB0aGF0IHNob3VsZCBiZSBhbmltYXRlZCBpbiB0aGUgc2NlbmUuIENhbiBhbHNvIGJlIGEgRG9tIEVsZW1lbnQgb3IgU2VsZWN0b3IsIHdoZW4gdXNpbmcgZGlyZWN0IHR3ZWVuIGRlZmluaXRpb24gKHNlZSBleGFtcGxlcykuXG5cdFx0ICogQHBhcmFtIHsobnVtYmVyfG9iamVjdCl9IGR1cmF0aW9uIC0gQSBkdXJhdGlvbiBmb3IgdGhlIHR3ZWVuLCBvciB0d2VlbiBwYXJhbWV0ZXJzLiBJZiBhbiBvYmplY3QgY29udGFpbmluZyBwYXJhbWV0ZXJzIGFyZSBzdXBwbGllZCwgYSBkZWZhdWx0IGR1cmF0aW9uIG9mIDEgd2lsbCBiZSB1c2VkLlxuXHRcdCAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyBmb3IgdGhlIHR3ZWVuXG5cdFx0ICogQHJldHVybnMge1NjZW5lfSBQYXJlbnQgb2JqZWN0IGZvciBjaGFpbmluZy5cblx0XHQgKi9cblx0XHRTY2VuZS5zZXRUd2VlbiA9IGZ1bmN0aW9uIChUd2Vlbk9iamVjdCwgZHVyYXRpb24sIHBhcmFtcykge1xuXHRcdFx0dmFyIG5ld1R3ZWVuO1xuXHRcdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG5cdFx0XHRcdGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykge1xuXHRcdFx0XHRcdHBhcmFtcyA9IGR1cmF0aW9uO1xuXHRcdFx0XHRcdGR1cmF0aW9uID0gMTtcblx0XHRcdFx0fVxuXHRcdFx0XHRUd2Vlbk9iamVjdCA9IFR3ZWVuLnRvKFR3ZWVuT2JqZWN0LCBkdXJhdGlvbiwgcGFyYW1zKTtcblx0XHRcdH1cblx0XHRcdHRyeSB7XG5cdFx0XHRcdC8vIHdyYXAgVHdlZW4gaW50byBhIFRpbWVsaW5lIE9iamVjdCBpZiBhdmFpbGFibGUgdG8gaW5jbHVkZSBkZWxheSBhbmQgcmVwZWF0cyBpbiB0aGUgZHVyYXRpb24gYW5kIHN0YW5kYXJkaXplIG1ldGhvZHMuXG5cdFx0XHRcdGlmIChUaW1lbGluZSkge1xuXHRcdFx0XHRcdG5ld1R3ZWVuID0gbmV3IFRpbWVsaW5lKHtcblx0XHRcdFx0XHRcdHNtb290aENoaWxkVGltaW5nOiB0cnVlXG5cdFx0XHRcdFx0fSkuYWRkKFR3ZWVuT2JqZWN0KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRuZXdUd2VlbiA9IFR3ZWVuT2JqZWN0O1xuXHRcdFx0XHR9XG5cdFx0XHRcdG5ld1R3ZWVuLnBhdXNlKCk7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdGxvZygxLCBcIkVSUk9SIGNhbGxpbmcgbWV0aG9kICdzZXRUd2VlbigpJzogU3VwcGxpZWQgYXJndW1lbnQgaXMgbm90IGEgdmFsaWQgVHdlZW5PYmplY3RcIik7XG5cdFx0XHRcdHJldHVybiBTY2VuZTtcblx0XHRcdH1cblx0XHRcdGlmIChfdHdlZW4pIHsgLy8ga2lsbCBvbGQgdHdlZW4/XG5cdFx0XHRcdFNjZW5lLnJlbW92ZVR3ZWVuKCk7XG5cdFx0XHR9XG5cdFx0XHRfdHdlZW4gPSBuZXdUd2VlbjtcblxuXHRcdFx0Ly8gc29tZSBwcm9wZXJ0aWVzIG5lZWQgdG8gYmUgdHJhbnNmZXJyZWQgaXQgdG8gdGhlIHdyYXBwZXIsIG90aGVyd2lzZSB0aGV5IHdvdWxkIGdldCBsb3N0LlxuXHRcdFx0aWYgKFR3ZWVuT2JqZWN0LnJlcGVhdCAmJiBUd2Vlbk9iamVjdC5yZXBlYXQoKSA9PT0gLTEpIHsgLy8gVHdlZW5NYXggb3IgVGltZWxpbmVNYXggT2JqZWN0P1xuXHRcdFx0XHRfdHdlZW4ucmVwZWF0KC0xKTtcblx0XHRcdFx0X3R3ZWVuLnlveW8oVHdlZW5PYmplY3QueW95bygpKTtcblx0XHRcdH1cblx0XHRcdC8vIFNvbWUgdHdlZW4gdmFsaWRhdGlvbnMgYW5kIGRlYnVnZ2luZyBoZWxwZXJzXG5cdFx0XHRpZiAoU2NlbmUudHdlZW5DaGFuZ2VzKCkgJiYgIV90d2Vlbi50d2VlblRvKSB7XG5cdFx0XHRcdGxvZygyLCBcIldBUk5JTkc6IHR3ZWVuQ2hhbmdlcyB3aWxsIG9ubHkgd29yayBpZiB0aGUgVGltZWxpbmVNYXggb2JqZWN0IGlzIGF2YWlsYWJsZSBmb3IgU2Nyb2xsTWFnaWMuXCIpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBjaGVjayBpZiB0aGVyZSBhcmUgcG9zaXRpb24gdHdlZW5zIGRlZmluZWQgZm9yIHRoZSB0cmlnZ2VyIGFuZCB3YXJuIGFib3V0IGl0IDopXG5cdFx0XHRpZiAoX3R3ZWVuICYmIFNjZW5lLmNvbnRyb2xsZXIoKSAmJiBTY2VuZS50cmlnZ2VyRWxlbWVudCgpICYmIFNjZW5lLmxvZ2xldmVsKCkgPj0gMikgeyAvLyBjb250cm9sbGVyIGlzIG5lZWRlZCB0byBrbm93IHNjcm9sbCBkaXJlY3Rpb24uXG5cdFx0XHRcdHZhclxuXHRcdFx0XHR0cmlnZ2VyVHdlZW5zID0gVHdlZW4uZ2V0VHdlZW5zT2YoU2NlbmUudHJpZ2dlckVsZW1lbnQoKSksXG5cdFx0XHRcdFx0dmVydGljYWwgPSBTY2VuZS5jb250cm9sbGVyKCkuaW5mbyhcInZlcnRpY2FsXCIpO1xuXHRcdFx0XHR0cmlnZ2VyVHdlZW5zLmZvckVhY2goZnVuY3Rpb24gKHZhbHVlLCBpbmRleCkge1xuXHRcdFx0XHRcdHZhclxuXHRcdFx0XHRcdHR3ZWVudmFycyA9IHZhbHVlLnZhcnMuY3NzIHx8IHZhbHVlLnZhcnMsXG5cdFx0XHRcdFx0XHRjb25kaXRpb24gPSB2ZXJ0aWNhbCA/ICh0d2VlbnZhcnMudG9wICE9PSB1bmRlZmluZWQgfHwgdHdlZW52YXJzLmJvdHRvbSAhPT0gdW5kZWZpbmVkKSA6ICh0d2VlbnZhcnMubGVmdCAhPT0gdW5kZWZpbmVkIHx8IHR3ZWVudmFycy5yaWdodCAhPT0gdW5kZWZpbmVkKTtcblx0XHRcdFx0XHRpZiAoY29uZGl0aW9uKSB7XG5cdFx0XHRcdFx0XHRsb2coMiwgXCJXQVJOSU5HOiBUd2VlbmluZyB0aGUgcG9zaXRpb24gb2YgdGhlIHRyaWdnZXIgZWxlbWVudCBhZmZlY3RzIHRoZSBzY2VuZSB0aW1pbmcgYW5kIHNob3VsZCBiZSBhdm9pZGVkIVwiKTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyB3YXJuIGFib3V0IHR3ZWVuIG92ZXJ3cml0ZXMsIHdoZW4gYW4gZWxlbWVudCBpcyB0d2VlbmVkIG11bHRpcGxlIHRpbWVzXG5cdFx0XHRpZiAocGFyc2VGbG9hdChUd2VlbkxpdGUudmVyc2lvbikgPj0gMS4xNCkgeyAvLyBvbk92ZXJ3cml0ZSBvbmx5IHByZXNlbnQgc2luY2UgR1NBUCB2MS4xNC4wXG5cdFx0XHRcdHZhclxuXHRcdFx0XHRsaXN0ID0gX3R3ZWVuLmdldENoaWxkcmVuID8gX3R3ZWVuLmdldENoaWxkcmVuKHRydWUsIHRydWUsIGZhbHNlKSA6IFtfdHdlZW5dLFxuXHRcdFx0XHRcdC8vIGdldCBhbGwgbmVzdGVkIHR3ZWVuIG9iamVjdHNcblx0XHRcdFx0XHRuZXdDYWxsYmFjayA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGxvZygyLCBcIldBUk5JTkc6IHR3ZWVuIHdhcyBvdmVyd3JpdHRlbiBieSBhbm90aGVyLiBUbyBsZWFybiBob3cgdG8gYXZvaWQgdGhpcyBpc3N1ZSBzZWUgaGVyZTogaHR0cHM6Ly9naXRodWIuY29tL2phbnBhZXBrZS9TY3JvbGxNYWdpYy93aWtpL1dBUk5JTkc6LXR3ZWVuLXdhcy1vdmVyd3JpdHRlbi1ieS1hbm90aGVyXCIpO1xuXHRcdFx0XHRcdH07XG5cdFx0XHRcdGZvciAodmFyIGkgPSAwLCB0aGlzVHdlZW4sIG9sZENhbGxiYWNrOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykgeyAvKmpzaGludCBsb29wZnVuYzogdHJ1ZSAqL1xuXHRcdFx0XHRcdHRoaXNUd2VlbiA9IGxpc3RbaV07XG5cdFx0XHRcdFx0aWYgKG9sZENhbGxiYWNrICE9PSBuZXdDYWxsYmFjaykgeyAvLyBpZiB0d2VlbnMgaXMgYWRkZWQgbW9yZSB0aGFuIG9uY2Vcblx0XHRcdFx0XHRcdG9sZENhbGxiYWNrID0gdGhpc1R3ZWVuLnZhcnMub25PdmVyd3JpdGU7XG5cdFx0XHRcdFx0XHR0aGlzVHdlZW4udmFycy5vbk92ZXJ3cml0ZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0aWYgKG9sZENhbGxiYWNrKSB7XG5cdFx0XHRcdFx0XHRcdFx0b2xkQ2FsbGJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRuZXdDYWxsYmFjay5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGxvZygzLCBcImFkZGVkIHR3ZWVuXCIpO1xuXG5cdFx0XHR1cGRhdGVUd2VlblByb2dyZXNzKCk7XG5cdFx0XHRyZXR1cm4gU2NlbmU7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFJlbW92ZSB0aGUgdHdlZW4gZnJvbSB0aGUgc2NlbmUuICBcblx0XHQgKiBUaGlzIHdpbGwgdGVybWluYXRlIHRoZSBjb250cm9sIG9mIHRoZSBTY2VuZSBvdmVyIHRoZSB0d2Vlbi5cblx0XHQgKlxuXHRcdCAqIFVzaW5nIHRoZSByZXNldCBvcHRpb24geW91IGNhbiBkZWNpZGUgaWYgdGhlIHR3ZWVuIHNob3VsZCByZW1haW4gaW4gdGhlIGN1cnJlbnQgc3RhdGUgb3IgYmUgcmV3b3VuZCB0byBzZXQgdGhlIHRhcmdldCBlbGVtZW50cyBiYWNrIHRvIHRoZSBzdGF0ZSB0aGV5IHdlcmUgaW4gYmVmb3JlIHRoZSB0d2VlbiB3YXMgYWRkZWQgdG8gdGhlIHNjZW5lLlxuXHRcdCAqIEBtZW1iZXJvZiEgYW5pbWF0aW9uLkdTQVAjXG5cdFx0ICpcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIC8vIHJlbW92ZSB0aGUgdHdlZW4gZnJvbSB0aGUgc2NlbmUgd2l0aG91dCByZXNldHRpbmcgaXRcblx0XHQgKiBzY2VuZS5yZW1vdmVUd2VlbigpO1xuXHRcdCAqXG5cdFx0ICogLy8gcmVtb3ZlIHRoZSB0d2VlbiBmcm9tIHRoZSBzY2VuZSBhbmQgcmVzZXQgaXQgdG8gaW5pdGlhbCBwb3NpdGlvblxuXHRcdCAqIHNjZW5lLnJlbW92ZVR3ZWVuKHRydWUpO1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtib29sZWFufSBbcmVzZXQ9ZmFsc2VdIC0gSWYgYHRydWVgIHRoZSB0d2VlbiB3aWxsIGJlIHJlc2V0IHRvIGl0cyBpbml0aWFsIHZhbHVlcy5cblx0XHQgKiBAcmV0dXJucyB7U2NlbmV9IFBhcmVudCBvYmplY3QgZm9yIGNoYWluaW5nLlxuXHRcdCAqL1xuXHRcdFNjZW5lLnJlbW92ZVR3ZWVuID0gZnVuY3Rpb24gKHJlc2V0KSB7XG5cdFx0XHRpZiAoX3R3ZWVuKSB7XG5cdFx0XHRcdGlmIChyZXNldCkge1xuXHRcdFx0XHRcdF90d2Vlbi5wcm9ncmVzcygwKS5wYXVzZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdF90d2Vlbi5raWxsKCk7XG5cdFx0XHRcdF90d2VlbiA9IHVuZGVmaW5lZDtcblx0XHRcdFx0bG9nKDMsIFwicmVtb3ZlZCB0d2VlbiAocmVzZXQ6IFwiICsgKHJlc2V0ID8gXCJ0cnVlXCIgOiBcImZhbHNlXCIpICsgXCIpXCIpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIFNjZW5lO1xuXHRcdH07XG5cblx0fSk7XG59KSk7Il0sImZpbGUiOiJ2ZW5kb3IvcGx1Z2lucy9hbmltYXRpb24uZ3NhcC5qcyJ9
