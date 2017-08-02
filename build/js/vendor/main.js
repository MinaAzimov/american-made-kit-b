/**
 * main.js
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * Copyright 2016, Codrops
 * http://www.codrops.com
 */
;(function(window) {

	'use strict';

	// Helper vars and functions.
	function extend( a, b ) {
		for( var key in b ) { 
			if( b.hasOwnProperty( key ) ) {
				a[key] = b[key];
			}
		}
		return a;
	}
	// From https://davidwalsh.name/javascript-debounce-function.
	function debounce(func, wait, immediate) {
		var timeout;
		return function() {
			var context = this, args = arguments;
			var later = function() {
				timeout = null;
				if (!immediate) func.apply(context, args);
			};
			var callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) func.apply(context, args);
		};
	};
	// Creates a sorted array of random numbers between minVal and maxVal with a length = size.
	function createRandIntOrderedArray(minVal, maxVal, size) {
		var arr = [];
		for(var i=0; i<size; ++i) {
			arr.push(anime.random(minVal, maxVal));
		}
		arr.sort(function(a, b){ return a-b });
		return arr;
	}
	// Checks if an object is empty.
	function isObjEmpty(obj) {
		return Object.getOwnPropertyNames(obj).length > 0;
	}
	// Concatenate JS objs.
	// From http://stackoverflow.com/a/2454315.
	function collect() {
		var ret = {};
		var len = arguments.length;
		for (var i=0; i<len; i++) {
			for (var p in arguments[i]) {
				if (arguments[i].hasOwnProperty(p)) {
					ret[p] = arguments[i][p];
				}
			}
		}
		return ret;
	}
	// Check if clip-path is supported. From http://stackoverflow.com/a/30041538.
	function areClipPathShapesSupported() {
		var base = 'clipPath',
			prefixes = [ 'webkit', 'moz', 'ms', 'o' ],
			properties = [ base ],
			testElement = document.createElement( 'testelement' ),
			attribute = 'polygon(50% 0%, 0% 100%, 100% 100%)';

		// Push the prefixed properties into the array of properties.
		for ( var i = 0, l = prefixes.length; i < l; i++ ) {
			var prefixedProperty = prefixes[i] + base.charAt( 0 ).toUpperCase() + base.slice( 1 ); // remember to capitalize!
			properties.push( prefixedProperty );
		}

		// Interate over the properties and see if they pass two tests.
		for ( var i = 0, l = properties.length; i < l; i++ ) {
			var property = properties[i];

			// First, they need to even support clip-path (IE <= 11 does not)...
			if ( testElement.style[property] === '' ) {

				// Second, we need to see what happens when we try to create a CSS shape...
				testElement.style[property] = attribute;
				if ( testElement.style[property] !== '' ) {
					return true;
				}
			}
		}
		return false;
	};

	/**
	 * Segmenter obj.
	 */
	function Segmenter(el, options) {
		this.el = el;
		this.options = extend({}, this.options);
		extend(this.options, options);
		// Preload main image.
		var self = this;
		imagesLoaded(this.el, { background: true }, function() {
			self._init();
			self._initEvents();
			self.options.onReady();
		});
	}

	Segmenter.prototype.options = {
		// Number of pieces.
		pieces: 4, 
		// Show pieces already styled.
		renderOnLoad: false,
		// Add an element for the shadow.
		shadows: true,
		// Animations for the shadow (valid properties: opacity, translateX, translateY).
		shadowsAnimation: {
			opacity: 1,
			// translateX: 20,
			// translateY: 20
		},
		// Parrallax effect for the pieces.
		parallax: false,
		// Movements for the parallax effect.
		parallaxMovement: {min: 10, max: 40},
		// Animation for the pieces (valid properties: duration, easing, delay, opacity, translate[XYZ]).
		animation: {
			duration: 1500,
			easing: 'easeOutQuad',
			delay: 0, // Delay increment per piece.
			// opacity: 0.5,
			translateZ: {min: 10, max: 65}, // We can also use an integer for a specific value.
			// translateX: {min: -100, max: 100}, // We can also use an integer for a specific value.
			// translateY: {min: -100, max: 100} // We can also use an integer for a specific value.
		},
		// Callbacks
		onReady: function() { return false; },
		onAnimationComplete: function() { return false; },
		onAnimationStart: function() { return false; },
		// The positions of the pieces in percentage values. 
		// We can also use random values by setting options.positions to "random".
		positions: [
			{top: 80, left: 10, width: 30, height: 20},
			{top: 2, left: 2, width: 40, height: 40},
			{top: 30, left: 60, width: 30, height: 60},
			{top: 10, left: 20, width: 50, height: 60}
		]
	};

	/**
	 * Init!
	 */
	Segmenter.prototype._init = function() {
		// The dimensions of the main element.
		this.dimensions = {
			width: this.el.offsetWidth,
			height: this.el.offsetHeight
		};
		
		// The source of the main image.
		var background = this.el.style.backgroundImage;
		this.imgsrc = background.replace('url(','').replace(')','').replace(/\"/gi, "");;
		
		// Create the layout.
		this._layout();

		var self = this;
		this.pieces = [].slice.call(this.el.querySelectorAll('.segmenter__piece-wrap'));
		this.pieces.forEach(function(piece, pos) {
			// Bugfix for Chrome. The translateZ needs an initial value otherwise the animation will not work. (this seems to be a anime.js bug - let´s wait for the next version..)
			piece.style.WebkitTransform = piece.style.transform = 'translateZ(0.0001px)';

			// If we want to render the different pieces on load then:
			if( self.options.renderOnLoad ) {
				self._renderPiece(piece);
			}
		});
		// Flag to indicate the pieces are already rendered/styled either on load or after the animation.
		if( this.options.renderOnLoad ) {
			this.active = true;
		}
	};

	/**
	 * Creates the layout.
	 */
	Segmenter.prototype._layout = function() {
		// clip-path support
		var clipPath = areClipPathShapesSupported();

		var segBgEl = document.createElement('div');
		segBgEl.className = 'segmenter__background';
		segBgEl.style.backgroundImage = 'url(' + this.imgsrc + ')';

		var segPieces = document.createElement('div'),
			segPiecesHTML = '',
			positionsTotal = this.options.positions.length;

		segPieces.className = 'segmenter__pieces';

		for(var i = 0, len = this.options.pieces; i < len; ++i) {
			if( this.options.parallax ) {
				segPiecesHTML += '<div class="segmenter__piece-parallax">';
			}

			segPiecesHTML += '<div class="segmenter__piece-wrap">';
			
			var top, left, width, height, clipTop, clipLeft, clipRight, clipBottom,
				pos = i <= positionsTotal - 1 ? i : 0,
				isRandom = this.options.positions === 'random';

			top = isRandom ? anime.random(0,100) : this.options.positions[pos].top;
			left = isRandom ? anime.random(0,100) : this.options.positions[pos].left;
			width = isRandom ? anime.random(0,100) : this.options.positions[pos].width;
			height = isRandom ? anime.random(0,100) : this.options.positions[pos].height;
			
			if( !clipPath ) {
				clipTop = isRandom ? top/100 * this.dimensions.height : this.options.positions[pos].top/100 * this.dimensions.height;
				clipLeft = isRandom ? left/100 * this.dimensions.width : this.options.positions[pos].left/100 * this.dimensions.width;
				clipRight = isRandom ? width/100 * this.dimensions.width + clipLeft : this.options.positions[pos].width/100 * this.dimensions.width + clipLeft;
				clipBottom = isRandom ? height/100 * this.dimensions.height + clipTop : this.options.positions[pos].height/100 * this.dimensions.height + clipTop;
			}

			if( this.options.shadows ) {
				segPiecesHTML += '<div class="segmenter__shadow" style="top: ' + top + '%; left: ' + left + '%; width: ' + width + '%; height: ' + height + '%"></div>';		
			}

			segPiecesHTML += clipPath ?
							'<div class="segmenter__piece" style="background-image: url(' + this.imgsrc + '); -webkit-clip-path: polygon(' + left + '% ' + top + '%, ' + (left + width) + '% ' + top + '%, ' + (left + width) + '% ' + (top + height) + '%, ' + left + '% ' + (top + height) + '%); clip-path: polygon(' + left + '% ' + top + '%, ' + (left + width) + '% ' + top + '%, ' + (left + width) + '% ' + (top + height) + '%, ' + left + '% ' + (top + height) + '%)"></div>' :
							'<div class="segmenter__piece" style="background-image: url(' + this.imgsrc + '); clip: rect(' + clipTop + 'px,' + clipRight + 'px,' + clipBottom + 'px,' + clipLeft + 'px)"></div>';

			segPiecesHTML += '</div>'
			if( this.options.parallax ) {
				segPiecesHTML += '</div>';
			}
		}

		segPieces.innerHTML = segPiecesHTML;

		this.el.innerHTML = '';
		this.el.appendChild(segBgEl);
		this.el.appendChild(segPieces);
	};

	/**
	 * Renders/Styles a piece with the options that are passed in the initialization.
	 */
	Segmenter.prototype._renderPiece = function(piece) {
		var idx = this.pieces.indexOf(piece);
		var self = this;
		if( self.options.animation.translateZ != undefined ) {
			if( typeof self.options.animation.translateZ === 'object' ) {
				var randArr = createRandIntOrderedArray(self.options.animation.translateZ.min, self.options.animation.translateZ.max, self.options.pieces);
				piece.style.transform = piece.style.WebkitTransform = 'translateZ(' + randArr[idx] + 'px)';
			}
			else {
				piece.style.transform = piece.style.WebkitTransform = 'translateZ(' + self.options.animation.translateZ + 'px)';
			}
		}
		if( self.options.animation.translateY != undefined ) {
			if( typeof self.options.animation.translateY === 'object' ) {
				var randArr = createRandIntOrderedArray(self.options.animation.translateY.min, self.options.animation.translateY.max, self.options.pieces);
				piece.style.transform = piece.style.WebkitTransform = 'translateY(' + randArr[idx] + 'px)';
			}
			else {
				piece.style.transform = piece.style.WebkitTransform = 'translateY(' + self.options.animation.translateY + 'px)';
			}
		}
		if( self.options.animation.translateX != undefined ) {
			if( typeof self.options.animation.translateX === 'object' ) {
				var randArr = createRandIntOrderedArray(self.options.animation.translateX.min, self.options.animation.translateX.max, self.options.pieces);
				piece.style.transform = piece.style.WebkitTransform = 'translateX(' + randArr[idx] + 'px)';
			}
			else {
				piece.style.transform = piece.style.WebkitTransform = 'translateX(' + self.options.animation.translateX + 'px)';
			}
		}
		if( self.options.animation.opacity != undefined ) {
			piece.style.opacity = self.options.animation.opacity;
		}

		if( self.options.shadows && isObjEmpty(self.options.shadowsAnimation) ) {
			var shadowEl = piece.querySelector('.segmenter__shadow');
			shadowEl.style.opacity = self.options.shadowsAnimation.opacity != undefined ? self.options.shadowsAnimation.opacity : 0;
			shadowEl.style.transform = shadowEl.style.WebkitTransform = 'translateX(' + (self.options.shadowsAnimation.translateX != undefined ? self.options.shadowsAnimation.translateX : 0) + 'px) translateY(' + (self.options.shadowsAnimation.translateY != undefined ? self.options.shadowsAnimation.translateY : 0) + 'px)';
		}
	};

	/**
	 * Animates the pieces with the options passed (with anime.js).
	 */
	Segmenter.prototype.animate = function() {
		if( this.active ) {
			return false;
		}
		this.active = true;

		var self = this,
			animProps = {
				targets: this.pieces,
				duration: this.options.animation.duration,
				delay: function(el, index) { return (self.options.pieces - index - 1) * self.options.animation.delay; },
				easing: this.options.animation.easing,
				begin: this.options.onAnimationStart,
				complete: this.options.onAnimationComplete
			};
		
		if( this.options.animation.translateZ != undefined ) {
			var randArr = createRandIntOrderedArray(this.options.animation.translateZ.min, this.options.animation.translateZ.max, this.options.pieces);
			animProps.translateZ = typeof this.options.animation.translateZ === 'object' ? function(el, index) {
				return randArr[index];
			} : this.options.animation.translateZ;
		}
		if( this.options.animation.translateX != undefined ) {
			animProps.translateX = typeof this.options.animation.translateX === 'object' ? function(el, index) {
				return anime.random(self.options.animation.translateX.min, self.options.animation.translateX.max);
			} : this.options.animation.translateX;
		}
		if( this.options.animation.translateY != undefined ) {
			animProps.translateY = typeof this.options.animation.translateY === 'object' ? function(el, index) {
				return anime.random(self.options.animation.translateY.min, self.options.animation.translateY.max);
			} : this.options.animation.translateY;
		}
		if( this.options.animation.opacity != undefined ) {
			animProps.opacity = this.options.animation.opacity;
		}

		anime(animProps);

		// Also animate the shadow element.
		if( this.options.shadows && isObjEmpty(this.options.shadowsAnimation) ) {
			anime(collect({
				targets: this.el.querySelectorAll('.segmenter__shadow'),
				duration: this.options.animation.duration,
				delay: function(el, index) { return (self.options.pieces - index - 1) * self.options.animation.delay; },
				easing: this.options.animation.easing
			}, this.options.shadowsAnimation));
		}
	};

	/**
	 * Init/Bind events.
	 */
	Segmenter.prototype._initEvents = function() {
		var self = this;
		
		// Window resize.
		this.debounceResize = debounce(function(ev) {
			var positionsTotal = self.options.positions.length;

			// Recalculate dimensions.
			self.dimensions = {
				width: self.el.offsetWidth,
				height: self.el.offsetHeight
			};

			// Recalculate clip values..
			// todo: DRY
			// todo: If random is true then save the initial values. Should not recalculate for this case.
			self.pieces.forEach(function(piece, position) {
				var clipTop, clipLeft, clipRight, clipBottom,
					segmenterPiece = piece.querySelector('.segmenter__piece');

				if( self.options.positions === 'random' ) {
					var randT = anime.random(0,100), randL = anime.random(0,100), randW = anime.random(0,100), randH = anime.random(0,100);
					clipTop = randT/100 * self.dimensions.height;
					clipLeft = randL/100 * self.dimensions.width;
					clipRight = randW/100 * self.dimensions.width + clipLeft;
					clipBottom = randH/100 * self.dimensions.height + clipTop;
				}
				else {
					var pos = position <= positionsTotal - 1 ? position : 0;
					clipTop = self.options.positions[pos].top/100 * self.dimensions.height;
					clipLeft = self.options.positions[pos].left/100 * self.dimensions.width;
					clipRight = self.options.positions[pos].width/100 * self.dimensions.width + clipLeft;
					clipBottom = self.options.positions[pos].height/100 * self.dimensions.height + clipTop;
				}

				segmenterPiece.style.clip = 'rect(' + clipTop + 'px,' + clipRight + 'px,' + clipBottom + 'px,' + clipLeft + 'px)';
			});
		}, 10);
		window.addEventListener('resize', this.debounceResize);
		
		// Mousemove and Deviceorientation:
		if( this.options.parallax ) {
			var arrRand = createRandIntOrderedArray(this.options.parallaxMovement.min, this.options.parallaxMovement.max, this.options.pieces);
			this.pieces.forEach(function(piece, pos) {
				piece.setAttribute('data-parallax-translation', typeof self.options.parallaxMovement === 'object' ? arrRand[pos] : self.options.parallaxMovement );
			});
			this.mousemove = function(ev) {
				if( !self.active ) {
					return false;
				}
				requestAnimationFrame(function() {
					self.pieces.forEach(function(piece) {
						var t = piece.getAttribute('data-parallax-translation'),
							transX = t/(self.dimensions.width)*ev.clientX - t/2,
							transY = t/(self.dimensions.height)*ev.clientY - t/2;

						piece.parentNode.style.transform = piece.parentNode.style.WebkitTransform = 'translate3d(' + transX + 'px,' + transY + 'px,0)';
					});
				});
			};
			window.addEventListener('mousemove', this.mousemove);

			this.handleOrientation = function() {
				if( !self.active ) {
					return false;
				}
				var y = event.gamma;
				// To make computation easier we shift the range of x and y to [0,180]
				y += 90;
				
				requestAnimationFrame(function() {
					self.pieces.forEach(function(piece) {
						var t = piece.getAttribute('data-parallax-translation'),
							transX = t/(self.dimensions.width)*y - t/2,
							transY = t/(self.dimensions.height)*y - t/2;

						piece.parentNode.style.transform = piece.parentNode.style.WebkitTransform = 'translate3d(' + transX + 'px,' + transY + 'px,0)';
					});
				});
			}
			window.addEventListener('deviceorientation', this.handleOrientation);
		}
	};

	window.Segmenter = Segmenter;

})(window);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJ2ZW5kb3IvbWFpbi5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIG1haW4uanNcbiAqIGh0dHA6Ly93d3cuY29kcm9wcy5jb21cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4gKiBodHRwOi8vd3d3Lm9wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL21pdC1saWNlbnNlLnBocFxuICogXG4gKiBDb3B5cmlnaHQgMjAxNiwgQ29kcm9wc1xuICogaHR0cDovL3d3dy5jb2Ryb3BzLmNvbVxuICovXG47KGZ1bmN0aW9uKHdpbmRvdykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHQvLyBIZWxwZXIgdmFycyBhbmQgZnVuY3Rpb25zLlxuXHRmdW5jdGlvbiBleHRlbmQoIGEsIGIgKSB7XG5cdFx0Zm9yKCB2YXIga2V5IGluIGIgKSB7IFxuXHRcdFx0aWYoIGIuaGFzT3duUHJvcGVydHkoIGtleSApICkge1xuXHRcdFx0XHRhW2tleV0gPSBiW2tleV07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBhO1xuXHR9XG5cdC8vIEZyb20gaHR0cHM6Ly9kYXZpZHdhbHNoLm5hbWUvamF2YXNjcmlwdC1kZWJvdW5jZS1mdW5jdGlvbi5cblx0ZnVuY3Rpb24gZGVib3VuY2UoZnVuYywgd2FpdCwgaW1tZWRpYXRlKSB7XG5cdFx0dmFyIHRpbWVvdXQ7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGNvbnRleHQgPSB0aGlzLCBhcmdzID0gYXJndW1lbnRzO1xuXHRcdFx0dmFyIGxhdGVyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHRpbWVvdXQgPSBudWxsO1xuXHRcdFx0XHRpZiAoIWltbWVkaWF0ZSkgZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcblx0XHRcdH07XG5cdFx0XHR2YXIgY2FsbE5vdyA9IGltbWVkaWF0ZSAmJiAhdGltZW91dDtcblx0XHRcdGNsZWFyVGltZW91dCh0aW1lb3V0KTtcblx0XHRcdHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0KTtcblx0XHRcdGlmIChjYWxsTm93KSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuXHRcdH07XG5cdH07XG5cdC8vIENyZWF0ZXMgYSBzb3J0ZWQgYXJyYXkgb2YgcmFuZG9tIG51bWJlcnMgYmV0d2VlbiBtaW5WYWwgYW5kIG1heFZhbCB3aXRoIGEgbGVuZ3RoID0gc2l6ZS5cblx0ZnVuY3Rpb24gY3JlYXRlUmFuZEludE9yZGVyZWRBcnJheShtaW5WYWwsIG1heFZhbCwgc2l6ZSkge1xuXHRcdHZhciBhcnIgPSBbXTtcblx0XHRmb3IodmFyIGk9MDsgaTxzaXplOyArK2kpIHtcblx0XHRcdGFyci5wdXNoKGFuaW1lLnJhbmRvbShtaW5WYWwsIG1heFZhbCkpO1xuXHRcdH1cblx0XHRhcnIuc29ydChmdW5jdGlvbihhLCBiKXsgcmV0dXJuIGEtYiB9KTtcblx0XHRyZXR1cm4gYXJyO1xuXHR9XG5cdC8vIENoZWNrcyBpZiBhbiBvYmplY3QgaXMgZW1wdHkuXG5cdGZ1bmN0aW9uIGlzT2JqRW1wdHkob2JqKSB7XG5cdFx0cmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9iaikubGVuZ3RoID4gMDtcblx0fVxuXHQvLyBDb25jYXRlbmF0ZSBKUyBvYmpzLlxuXHQvLyBGcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzI0NTQzMTUuXG5cdGZ1bmN0aW9uIGNvbGxlY3QoKSB7XG5cdFx0dmFyIHJldCA9IHt9O1xuXHRcdHZhciBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuXHRcdGZvciAodmFyIGk9MDsgaTxsZW47IGkrKykge1xuXHRcdFx0Zm9yICh2YXIgcCBpbiBhcmd1bWVudHNbaV0pIHtcblx0XHRcdFx0aWYgKGFyZ3VtZW50c1tpXS5oYXNPd25Qcm9wZXJ0eShwKSkge1xuXHRcdFx0XHRcdHJldFtwXSA9IGFyZ3VtZW50c1tpXVtwXTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gcmV0O1xuXHR9XG5cdC8vIENoZWNrIGlmIGNsaXAtcGF0aCBpcyBzdXBwb3J0ZWQuIEZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMzAwNDE1MzguXG5cdGZ1bmN0aW9uIGFyZUNsaXBQYXRoU2hhcGVzU3VwcG9ydGVkKCkge1xuXHRcdHZhciBiYXNlID0gJ2NsaXBQYXRoJyxcblx0XHRcdHByZWZpeGVzID0gWyAnd2Via2l0JywgJ21veicsICdtcycsICdvJyBdLFxuXHRcdFx0cHJvcGVydGllcyA9IFsgYmFzZSBdLFxuXHRcdFx0dGVzdEVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCAndGVzdGVsZW1lbnQnICksXG5cdFx0XHRhdHRyaWJ1dGUgPSAncG9seWdvbig1MCUgMCUsIDAlIDEwMCUsIDEwMCUgMTAwJSknO1xuXG5cdFx0Ly8gUHVzaCB0aGUgcHJlZml4ZWQgcHJvcGVydGllcyBpbnRvIHRoZSBhcnJheSBvZiBwcm9wZXJ0aWVzLlxuXHRcdGZvciAoIHZhciBpID0gMCwgbCA9IHByZWZpeGVzLmxlbmd0aDsgaSA8IGw7IGkrKyApIHtcblx0XHRcdHZhciBwcmVmaXhlZFByb3BlcnR5ID0gcHJlZml4ZXNbaV0gKyBiYXNlLmNoYXJBdCggMCApLnRvVXBwZXJDYXNlKCkgKyBiYXNlLnNsaWNlKCAxICk7IC8vIHJlbWVtYmVyIHRvIGNhcGl0YWxpemUhXG5cdFx0XHRwcm9wZXJ0aWVzLnB1c2goIHByZWZpeGVkUHJvcGVydHkgKTtcblx0XHR9XG5cblx0XHQvLyBJbnRlcmF0ZSBvdmVyIHRoZSBwcm9wZXJ0aWVzIGFuZCBzZWUgaWYgdGhleSBwYXNzIHR3byB0ZXN0cy5cblx0XHRmb3IgKCB2YXIgaSA9IDAsIGwgPSBwcm9wZXJ0aWVzLmxlbmd0aDsgaSA8IGw7IGkrKyApIHtcblx0XHRcdHZhciBwcm9wZXJ0eSA9IHByb3BlcnRpZXNbaV07XG5cblx0XHRcdC8vIEZpcnN0LCB0aGV5IG5lZWQgdG8gZXZlbiBzdXBwb3J0IGNsaXAtcGF0aCAoSUUgPD0gMTEgZG9lcyBub3QpLi4uXG5cdFx0XHRpZiAoIHRlc3RFbGVtZW50LnN0eWxlW3Byb3BlcnR5XSA9PT0gJycgKSB7XG5cblx0XHRcdFx0Ly8gU2Vjb25kLCB3ZSBuZWVkIHRvIHNlZSB3aGF0IGhhcHBlbnMgd2hlbiB3ZSB0cnkgdG8gY3JlYXRlIGEgQ1NTIHNoYXBlLi4uXG5cdFx0XHRcdHRlc3RFbGVtZW50LnN0eWxlW3Byb3BlcnR5XSA9IGF0dHJpYnV0ZTtcblx0XHRcdFx0aWYgKCB0ZXN0RWxlbWVudC5zdHlsZVtwcm9wZXJ0eV0gIT09ICcnICkge1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fTtcblxuXHQvKipcblx0ICogU2VnbWVudGVyIG9iai5cblx0ICovXG5cdGZ1bmN0aW9uIFNlZ21lbnRlcihlbCwgb3B0aW9ucykge1xuXHRcdHRoaXMuZWwgPSBlbDtcblx0XHR0aGlzLm9wdGlvbnMgPSBleHRlbmQoe30sIHRoaXMub3B0aW9ucyk7XG5cdFx0ZXh0ZW5kKHRoaXMub3B0aW9ucywgb3B0aW9ucyk7XG5cdFx0Ly8gUHJlbG9hZCBtYWluIGltYWdlLlxuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRpbWFnZXNMb2FkZWQodGhpcy5lbCwgeyBiYWNrZ3JvdW5kOiB0cnVlIH0sIGZ1bmN0aW9uKCkge1xuXHRcdFx0c2VsZi5faW5pdCgpO1xuXHRcdFx0c2VsZi5faW5pdEV2ZW50cygpO1xuXHRcdFx0c2VsZi5vcHRpb25zLm9uUmVhZHkoKTtcblx0XHR9KTtcblx0fVxuXG5cdFNlZ21lbnRlci5wcm90b3R5cGUub3B0aW9ucyA9IHtcblx0XHQvLyBOdW1iZXIgb2YgcGllY2VzLlxuXHRcdHBpZWNlczogNCwgXG5cdFx0Ly8gU2hvdyBwaWVjZXMgYWxyZWFkeSBzdHlsZWQuXG5cdFx0cmVuZGVyT25Mb2FkOiBmYWxzZSxcblx0XHQvLyBBZGQgYW4gZWxlbWVudCBmb3IgdGhlIHNoYWRvdy5cblx0XHRzaGFkb3dzOiB0cnVlLFxuXHRcdC8vIEFuaW1hdGlvbnMgZm9yIHRoZSBzaGFkb3cgKHZhbGlkIHByb3BlcnRpZXM6IG9wYWNpdHksIHRyYW5zbGF0ZVgsIHRyYW5zbGF0ZVkpLlxuXHRcdHNoYWRvd3NBbmltYXRpb246IHtcblx0XHRcdG9wYWNpdHk6IDEsXG5cdFx0XHQvLyB0cmFuc2xhdGVYOiAyMCxcblx0XHRcdC8vIHRyYW5zbGF0ZVk6IDIwXG5cdFx0fSxcblx0XHQvLyBQYXJyYWxsYXggZWZmZWN0IGZvciB0aGUgcGllY2VzLlxuXHRcdHBhcmFsbGF4OiBmYWxzZSxcblx0XHQvLyBNb3ZlbWVudHMgZm9yIHRoZSBwYXJhbGxheCBlZmZlY3QuXG5cdFx0cGFyYWxsYXhNb3ZlbWVudDoge21pbjogMTAsIG1heDogNDB9LFxuXHRcdC8vIEFuaW1hdGlvbiBmb3IgdGhlIHBpZWNlcyAodmFsaWQgcHJvcGVydGllczogZHVyYXRpb24sIGVhc2luZywgZGVsYXksIG9wYWNpdHksIHRyYW5zbGF0ZVtYWVpdKS5cblx0XHRhbmltYXRpb246IHtcblx0XHRcdGR1cmF0aW9uOiAxNTAwLFxuXHRcdFx0ZWFzaW5nOiAnZWFzZU91dFF1YWQnLFxuXHRcdFx0ZGVsYXk6IDAsIC8vIERlbGF5IGluY3JlbWVudCBwZXIgcGllY2UuXG5cdFx0XHQvLyBvcGFjaXR5OiAwLjUsXG5cdFx0XHR0cmFuc2xhdGVaOiB7bWluOiAxMCwgbWF4OiA2NX0sIC8vIFdlIGNhbiBhbHNvIHVzZSBhbiBpbnRlZ2VyIGZvciBhIHNwZWNpZmljIHZhbHVlLlxuXHRcdFx0Ly8gdHJhbnNsYXRlWDoge21pbjogLTEwMCwgbWF4OiAxMDB9LCAvLyBXZSBjYW4gYWxzbyB1c2UgYW4gaW50ZWdlciBmb3IgYSBzcGVjaWZpYyB2YWx1ZS5cblx0XHRcdC8vIHRyYW5zbGF0ZVk6IHttaW46IC0xMDAsIG1heDogMTAwfSAvLyBXZSBjYW4gYWxzbyB1c2UgYW4gaW50ZWdlciBmb3IgYSBzcGVjaWZpYyB2YWx1ZS5cblx0XHR9LFxuXHRcdC8vIENhbGxiYWNrc1xuXHRcdG9uUmVhZHk6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZmFsc2U7IH0sXG5cdFx0b25BbmltYXRpb25Db21wbGV0ZTogZnVuY3Rpb24oKSB7IHJldHVybiBmYWxzZTsgfSxcblx0XHRvbkFuaW1hdGlvblN0YXJ0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGZhbHNlOyB9LFxuXHRcdC8vIFRoZSBwb3NpdGlvbnMgb2YgdGhlIHBpZWNlcyBpbiBwZXJjZW50YWdlIHZhbHVlcy4gXG5cdFx0Ly8gV2UgY2FuIGFsc28gdXNlIHJhbmRvbSB2YWx1ZXMgYnkgc2V0dGluZyBvcHRpb25zLnBvc2l0aW9ucyB0byBcInJhbmRvbVwiLlxuXHRcdHBvc2l0aW9uczogW1xuXHRcdFx0e3RvcDogODAsIGxlZnQ6IDEwLCB3aWR0aDogMzAsIGhlaWdodDogMjB9LFxuXHRcdFx0e3RvcDogMiwgbGVmdDogMiwgd2lkdGg6IDQwLCBoZWlnaHQ6IDQwfSxcblx0XHRcdHt0b3A6IDMwLCBsZWZ0OiA2MCwgd2lkdGg6IDMwLCBoZWlnaHQ6IDYwfSxcblx0XHRcdHt0b3A6IDEwLCBsZWZ0OiAyMCwgd2lkdGg6IDUwLCBoZWlnaHQ6IDYwfVxuXHRcdF1cblx0fTtcblxuXHQvKipcblx0ICogSW5pdCFcblx0ICovXG5cdFNlZ21lbnRlci5wcm90b3R5cGUuX2luaXQgPSBmdW5jdGlvbigpIHtcblx0XHQvLyBUaGUgZGltZW5zaW9ucyBvZiB0aGUgbWFpbiBlbGVtZW50LlxuXHRcdHRoaXMuZGltZW5zaW9ucyA9IHtcblx0XHRcdHdpZHRoOiB0aGlzLmVsLm9mZnNldFdpZHRoLFxuXHRcdFx0aGVpZ2h0OiB0aGlzLmVsLm9mZnNldEhlaWdodFxuXHRcdH07XG5cdFx0XG5cdFx0Ly8gVGhlIHNvdXJjZSBvZiB0aGUgbWFpbiBpbWFnZS5cblx0XHR2YXIgYmFja2dyb3VuZCA9IHRoaXMuZWwuc3R5bGUuYmFja2dyb3VuZEltYWdlO1xuXHRcdHRoaXMuaW1nc3JjID0gYmFja2dyb3VuZC5yZXBsYWNlKCd1cmwoJywnJykucmVwbGFjZSgnKScsJycpLnJlcGxhY2UoL1xcXCIvZ2ksIFwiXCIpOztcblx0XHRcblx0XHQvLyBDcmVhdGUgdGhlIGxheW91dC5cblx0XHR0aGlzLl9sYXlvdXQoKTtcblxuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR0aGlzLnBpZWNlcyA9IFtdLnNsaWNlLmNhbGwodGhpcy5lbC5xdWVyeVNlbGVjdG9yQWxsKCcuc2VnbWVudGVyX19waWVjZS13cmFwJykpO1xuXHRcdHRoaXMucGllY2VzLmZvckVhY2goZnVuY3Rpb24ocGllY2UsIHBvcykge1xuXHRcdFx0Ly8gQnVnZml4IGZvciBDaHJvbWUuIFRoZSB0cmFuc2xhdGVaIG5lZWRzIGFuIGluaXRpYWwgdmFsdWUgb3RoZXJ3aXNlIHRoZSBhbmltYXRpb24gd2lsbCBub3Qgd29yay4gKHRoaXMgc2VlbXMgdG8gYmUgYSBhbmltZS5qcyBidWcgLSBsZXTCtHMgd2FpdCBmb3IgdGhlIG5leHQgdmVyc2lvbi4uKVxuXHRcdFx0cGllY2Uuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gcGllY2Uuc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZVooMC4wMDAxcHgpJztcblxuXHRcdFx0Ly8gSWYgd2Ugd2FudCB0byByZW5kZXIgdGhlIGRpZmZlcmVudCBwaWVjZXMgb24gbG9hZCB0aGVuOlxuXHRcdFx0aWYoIHNlbGYub3B0aW9ucy5yZW5kZXJPbkxvYWQgKSB7XG5cdFx0XHRcdHNlbGYuX3JlbmRlclBpZWNlKHBpZWNlKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHQvLyBGbGFnIHRvIGluZGljYXRlIHRoZSBwaWVjZXMgYXJlIGFscmVhZHkgcmVuZGVyZWQvc3R5bGVkIGVpdGhlciBvbiBsb2FkIG9yIGFmdGVyIHRoZSBhbmltYXRpb24uXG5cdFx0aWYoIHRoaXMub3B0aW9ucy5yZW5kZXJPbkxvYWQgKSB7XG5cdFx0XHR0aGlzLmFjdGl2ZSA9IHRydWU7XG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIHRoZSBsYXlvdXQuXG5cdCAqL1xuXHRTZWdtZW50ZXIucHJvdG90eXBlLl9sYXlvdXQgPSBmdW5jdGlvbigpIHtcblx0XHQvLyBjbGlwLXBhdGggc3VwcG9ydFxuXHRcdHZhciBjbGlwUGF0aCA9IGFyZUNsaXBQYXRoU2hhcGVzU3VwcG9ydGVkKCk7XG5cblx0XHR2YXIgc2VnQmdFbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdHNlZ0JnRWwuY2xhc3NOYW1lID0gJ3NlZ21lbnRlcl9fYmFja2dyb3VuZCc7XG5cdFx0c2VnQmdFbC5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2UgPSAndXJsKCcgKyB0aGlzLmltZ3NyYyArICcpJztcblxuXHRcdHZhciBzZWdQaWVjZXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSxcblx0XHRcdHNlZ1BpZWNlc0hUTUwgPSAnJyxcblx0XHRcdHBvc2l0aW9uc1RvdGFsID0gdGhpcy5vcHRpb25zLnBvc2l0aW9ucy5sZW5ndGg7XG5cblx0XHRzZWdQaWVjZXMuY2xhc3NOYW1lID0gJ3NlZ21lbnRlcl9fcGllY2VzJztcblxuXHRcdGZvcih2YXIgaSA9IDAsIGxlbiA9IHRoaXMub3B0aW9ucy5waWVjZXM7IGkgPCBsZW47ICsraSkge1xuXHRcdFx0aWYoIHRoaXMub3B0aW9ucy5wYXJhbGxheCApIHtcblx0XHRcdFx0c2VnUGllY2VzSFRNTCArPSAnPGRpdiBjbGFzcz1cInNlZ21lbnRlcl9fcGllY2UtcGFyYWxsYXhcIj4nO1xuXHRcdFx0fVxuXG5cdFx0XHRzZWdQaWVjZXNIVE1MICs9ICc8ZGl2IGNsYXNzPVwic2VnbWVudGVyX19waWVjZS13cmFwXCI+Jztcblx0XHRcdFxuXHRcdFx0dmFyIHRvcCwgbGVmdCwgd2lkdGgsIGhlaWdodCwgY2xpcFRvcCwgY2xpcExlZnQsIGNsaXBSaWdodCwgY2xpcEJvdHRvbSxcblx0XHRcdFx0cG9zID0gaSA8PSBwb3NpdGlvbnNUb3RhbCAtIDEgPyBpIDogMCxcblx0XHRcdFx0aXNSYW5kb20gPSB0aGlzLm9wdGlvbnMucG9zaXRpb25zID09PSAncmFuZG9tJztcblxuXHRcdFx0dG9wID0gaXNSYW5kb20gPyBhbmltZS5yYW5kb20oMCwxMDApIDogdGhpcy5vcHRpb25zLnBvc2l0aW9uc1twb3NdLnRvcDtcblx0XHRcdGxlZnQgPSBpc1JhbmRvbSA/IGFuaW1lLnJhbmRvbSgwLDEwMCkgOiB0aGlzLm9wdGlvbnMucG9zaXRpb25zW3Bvc10ubGVmdDtcblx0XHRcdHdpZHRoID0gaXNSYW5kb20gPyBhbmltZS5yYW5kb20oMCwxMDApIDogdGhpcy5vcHRpb25zLnBvc2l0aW9uc1twb3NdLndpZHRoO1xuXHRcdFx0aGVpZ2h0ID0gaXNSYW5kb20gPyBhbmltZS5yYW5kb20oMCwxMDApIDogdGhpcy5vcHRpb25zLnBvc2l0aW9uc1twb3NdLmhlaWdodDtcblx0XHRcdFxuXHRcdFx0aWYoICFjbGlwUGF0aCApIHtcblx0XHRcdFx0Y2xpcFRvcCA9IGlzUmFuZG9tID8gdG9wLzEwMCAqIHRoaXMuZGltZW5zaW9ucy5oZWlnaHQgOiB0aGlzLm9wdGlvbnMucG9zaXRpb25zW3Bvc10udG9wLzEwMCAqIHRoaXMuZGltZW5zaW9ucy5oZWlnaHQ7XG5cdFx0XHRcdGNsaXBMZWZ0ID0gaXNSYW5kb20gPyBsZWZ0LzEwMCAqIHRoaXMuZGltZW5zaW9ucy53aWR0aCA6IHRoaXMub3B0aW9ucy5wb3NpdGlvbnNbcG9zXS5sZWZ0LzEwMCAqIHRoaXMuZGltZW5zaW9ucy53aWR0aDtcblx0XHRcdFx0Y2xpcFJpZ2h0ID0gaXNSYW5kb20gPyB3aWR0aC8xMDAgKiB0aGlzLmRpbWVuc2lvbnMud2lkdGggKyBjbGlwTGVmdCA6IHRoaXMub3B0aW9ucy5wb3NpdGlvbnNbcG9zXS53aWR0aC8xMDAgKiB0aGlzLmRpbWVuc2lvbnMud2lkdGggKyBjbGlwTGVmdDtcblx0XHRcdFx0Y2xpcEJvdHRvbSA9IGlzUmFuZG9tID8gaGVpZ2h0LzEwMCAqIHRoaXMuZGltZW5zaW9ucy5oZWlnaHQgKyBjbGlwVG9wIDogdGhpcy5vcHRpb25zLnBvc2l0aW9uc1twb3NdLmhlaWdodC8xMDAgKiB0aGlzLmRpbWVuc2lvbnMuaGVpZ2h0ICsgY2xpcFRvcDtcblx0XHRcdH1cblxuXHRcdFx0aWYoIHRoaXMub3B0aW9ucy5zaGFkb3dzICkge1xuXHRcdFx0XHRzZWdQaWVjZXNIVE1MICs9ICc8ZGl2IGNsYXNzPVwic2VnbWVudGVyX19zaGFkb3dcIiBzdHlsZT1cInRvcDogJyArIHRvcCArICclOyBsZWZ0OiAnICsgbGVmdCArICclOyB3aWR0aDogJyArIHdpZHRoICsgJyU7IGhlaWdodDogJyArIGhlaWdodCArICclXCI+PC9kaXY+JztcdFx0XG5cdFx0XHR9XG5cblx0XHRcdHNlZ1BpZWNlc0hUTUwgKz0gY2xpcFBhdGggP1xuXHRcdFx0XHRcdFx0XHQnPGRpdiBjbGFzcz1cInNlZ21lbnRlcl9fcGllY2VcIiBzdHlsZT1cImJhY2tncm91bmQtaW1hZ2U6IHVybCgnICsgdGhpcy5pbWdzcmMgKyAnKTsgLXdlYmtpdC1jbGlwLXBhdGg6IHBvbHlnb24oJyArIGxlZnQgKyAnJSAnICsgdG9wICsgJyUsICcgKyAobGVmdCArIHdpZHRoKSArICclICcgKyB0b3AgKyAnJSwgJyArIChsZWZ0ICsgd2lkdGgpICsgJyUgJyArICh0b3AgKyBoZWlnaHQpICsgJyUsICcgKyBsZWZ0ICsgJyUgJyArICh0b3AgKyBoZWlnaHQpICsgJyUpOyBjbGlwLXBhdGg6IHBvbHlnb24oJyArIGxlZnQgKyAnJSAnICsgdG9wICsgJyUsICcgKyAobGVmdCArIHdpZHRoKSArICclICcgKyB0b3AgKyAnJSwgJyArIChsZWZ0ICsgd2lkdGgpICsgJyUgJyArICh0b3AgKyBoZWlnaHQpICsgJyUsICcgKyBsZWZ0ICsgJyUgJyArICh0b3AgKyBoZWlnaHQpICsgJyUpXCI+PC9kaXY+JyA6XG5cdFx0XHRcdFx0XHRcdCc8ZGl2IGNsYXNzPVwic2VnbWVudGVyX19waWVjZVwiIHN0eWxlPVwiYmFja2dyb3VuZC1pbWFnZTogdXJsKCcgKyB0aGlzLmltZ3NyYyArICcpOyBjbGlwOiByZWN0KCcgKyBjbGlwVG9wICsgJ3B4LCcgKyBjbGlwUmlnaHQgKyAncHgsJyArIGNsaXBCb3R0b20gKyAncHgsJyArIGNsaXBMZWZ0ICsgJ3B4KVwiPjwvZGl2Pic7XG5cblx0XHRcdHNlZ1BpZWNlc0hUTUwgKz0gJzwvZGl2Pidcblx0XHRcdGlmKCB0aGlzLm9wdGlvbnMucGFyYWxsYXggKSB7XG5cdFx0XHRcdHNlZ1BpZWNlc0hUTUwgKz0gJzwvZGl2Pic7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0c2VnUGllY2VzLmlubmVySFRNTCA9IHNlZ1BpZWNlc0hUTUw7XG5cblx0XHR0aGlzLmVsLmlubmVySFRNTCA9ICcnO1xuXHRcdHRoaXMuZWwuYXBwZW5kQ2hpbGQoc2VnQmdFbCk7XG5cdFx0dGhpcy5lbC5hcHBlbmRDaGlsZChzZWdQaWVjZXMpO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBSZW5kZXJzL1N0eWxlcyBhIHBpZWNlIHdpdGggdGhlIG9wdGlvbnMgdGhhdCBhcmUgcGFzc2VkIGluIHRoZSBpbml0aWFsaXphdGlvbi5cblx0ICovXG5cdFNlZ21lbnRlci5wcm90b3R5cGUuX3JlbmRlclBpZWNlID0gZnVuY3Rpb24ocGllY2UpIHtcblx0XHR2YXIgaWR4ID0gdGhpcy5waWVjZXMuaW5kZXhPZihwaWVjZSk7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdGlmKCBzZWxmLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVogIT0gdW5kZWZpbmVkICkge1xuXHRcdFx0aWYoIHR5cGVvZiBzZWxmLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVogPT09ICdvYmplY3QnICkge1xuXHRcdFx0XHR2YXIgcmFuZEFyciA9IGNyZWF0ZVJhbmRJbnRPcmRlcmVkQXJyYXkoc2VsZi5vcHRpb25zLmFuaW1hdGlvbi50cmFuc2xhdGVaLm1pbiwgc2VsZi5vcHRpb25zLmFuaW1hdGlvbi50cmFuc2xhdGVaLm1heCwgc2VsZi5vcHRpb25zLnBpZWNlcyk7XG5cdFx0XHRcdHBpZWNlLnN0eWxlLnRyYW5zZm9ybSA9IHBpZWNlLnN0eWxlLldlYmtpdFRyYW5zZm9ybSA9ICd0cmFuc2xhdGVaKCcgKyByYW5kQXJyW2lkeF0gKyAncHgpJztcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRwaWVjZS5zdHlsZS50cmFuc2Zvcm0gPSBwaWVjZS5zdHlsZS5XZWJraXRUcmFuc2Zvcm0gPSAndHJhbnNsYXRlWignICsgc2VsZi5vcHRpb25zLmFuaW1hdGlvbi50cmFuc2xhdGVaICsgJ3B4KSc7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmKCBzZWxmLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVkgIT0gdW5kZWZpbmVkICkge1xuXHRcdFx0aWYoIHR5cGVvZiBzZWxmLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVkgPT09ICdvYmplY3QnICkge1xuXHRcdFx0XHR2YXIgcmFuZEFyciA9IGNyZWF0ZVJhbmRJbnRPcmRlcmVkQXJyYXkoc2VsZi5vcHRpb25zLmFuaW1hdGlvbi50cmFuc2xhdGVZLm1pbiwgc2VsZi5vcHRpb25zLmFuaW1hdGlvbi50cmFuc2xhdGVZLm1heCwgc2VsZi5vcHRpb25zLnBpZWNlcyk7XG5cdFx0XHRcdHBpZWNlLnN0eWxlLnRyYW5zZm9ybSA9IHBpZWNlLnN0eWxlLldlYmtpdFRyYW5zZm9ybSA9ICd0cmFuc2xhdGVZKCcgKyByYW5kQXJyW2lkeF0gKyAncHgpJztcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRwaWVjZS5zdHlsZS50cmFuc2Zvcm0gPSBwaWVjZS5zdHlsZS5XZWJraXRUcmFuc2Zvcm0gPSAndHJhbnNsYXRlWSgnICsgc2VsZi5vcHRpb25zLmFuaW1hdGlvbi50cmFuc2xhdGVZICsgJ3B4KSc7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmKCBzZWxmLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVggIT0gdW5kZWZpbmVkICkge1xuXHRcdFx0aWYoIHR5cGVvZiBzZWxmLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVggPT09ICdvYmplY3QnICkge1xuXHRcdFx0XHR2YXIgcmFuZEFyciA9IGNyZWF0ZVJhbmRJbnRPcmRlcmVkQXJyYXkoc2VsZi5vcHRpb25zLmFuaW1hdGlvbi50cmFuc2xhdGVYLm1pbiwgc2VsZi5vcHRpb25zLmFuaW1hdGlvbi50cmFuc2xhdGVYLm1heCwgc2VsZi5vcHRpb25zLnBpZWNlcyk7XG5cdFx0XHRcdHBpZWNlLnN0eWxlLnRyYW5zZm9ybSA9IHBpZWNlLnN0eWxlLldlYmtpdFRyYW5zZm9ybSA9ICd0cmFuc2xhdGVYKCcgKyByYW5kQXJyW2lkeF0gKyAncHgpJztcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRwaWVjZS5zdHlsZS50cmFuc2Zvcm0gPSBwaWVjZS5zdHlsZS5XZWJraXRUcmFuc2Zvcm0gPSAndHJhbnNsYXRlWCgnICsgc2VsZi5vcHRpb25zLmFuaW1hdGlvbi50cmFuc2xhdGVYICsgJ3B4KSc7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmKCBzZWxmLm9wdGlvbnMuYW5pbWF0aW9uLm9wYWNpdHkgIT0gdW5kZWZpbmVkICkge1xuXHRcdFx0cGllY2Uuc3R5bGUub3BhY2l0eSA9IHNlbGYub3B0aW9ucy5hbmltYXRpb24ub3BhY2l0eTtcblx0XHR9XG5cblx0XHRpZiggc2VsZi5vcHRpb25zLnNoYWRvd3MgJiYgaXNPYmpFbXB0eShzZWxmLm9wdGlvbnMuc2hhZG93c0FuaW1hdGlvbikgKSB7XG5cdFx0XHR2YXIgc2hhZG93RWwgPSBwaWVjZS5xdWVyeVNlbGVjdG9yKCcuc2VnbWVudGVyX19zaGFkb3cnKTtcblx0XHRcdHNoYWRvd0VsLnN0eWxlLm9wYWNpdHkgPSBzZWxmLm9wdGlvbnMuc2hhZG93c0FuaW1hdGlvbi5vcGFjaXR5ICE9IHVuZGVmaW5lZCA/IHNlbGYub3B0aW9ucy5zaGFkb3dzQW5pbWF0aW9uLm9wYWNpdHkgOiAwO1xuXHRcdFx0c2hhZG93RWwuc3R5bGUudHJhbnNmb3JtID0gc2hhZG93RWwuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gJ3RyYW5zbGF0ZVgoJyArIChzZWxmLm9wdGlvbnMuc2hhZG93c0FuaW1hdGlvbi50cmFuc2xhdGVYICE9IHVuZGVmaW5lZCA/IHNlbGYub3B0aW9ucy5zaGFkb3dzQW5pbWF0aW9uLnRyYW5zbGF0ZVggOiAwKSArICdweCkgdHJhbnNsYXRlWSgnICsgKHNlbGYub3B0aW9ucy5zaGFkb3dzQW5pbWF0aW9uLnRyYW5zbGF0ZVkgIT0gdW5kZWZpbmVkID8gc2VsZi5vcHRpb25zLnNoYWRvd3NBbmltYXRpb24udHJhbnNsYXRlWSA6IDApICsgJ3B4KSc7XG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBBbmltYXRlcyB0aGUgcGllY2VzIHdpdGggdGhlIG9wdGlvbnMgcGFzc2VkICh3aXRoIGFuaW1lLmpzKS5cblx0ICovXG5cdFNlZ21lbnRlci5wcm90b3R5cGUuYW5pbWF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdGlmKCB0aGlzLmFjdGl2ZSApIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0dGhpcy5hY3RpdmUgPSB0cnVlO1xuXG5cdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0YW5pbVByb3BzID0ge1xuXHRcdFx0XHR0YXJnZXRzOiB0aGlzLnBpZWNlcyxcblx0XHRcdFx0ZHVyYXRpb246IHRoaXMub3B0aW9ucy5hbmltYXRpb24uZHVyYXRpb24sXG5cdFx0XHRcdGRlbGF5OiBmdW5jdGlvbihlbCwgaW5kZXgpIHsgcmV0dXJuIChzZWxmLm9wdGlvbnMucGllY2VzIC0gaW5kZXggLSAxKSAqIHNlbGYub3B0aW9ucy5hbmltYXRpb24uZGVsYXk7IH0sXG5cdFx0XHRcdGVhc2luZzogdGhpcy5vcHRpb25zLmFuaW1hdGlvbi5lYXNpbmcsXG5cdFx0XHRcdGJlZ2luOiB0aGlzLm9wdGlvbnMub25BbmltYXRpb25TdGFydCxcblx0XHRcdFx0Y29tcGxldGU6IHRoaXMub3B0aW9ucy5vbkFuaW1hdGlvbkNvbXBsZXRlXG5cdFx0XHR9O1xuXHRcdFxuXHRcdGlmKCB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVogIT0gdW5kZWZpbmVkICkge1xuXHRcdFx0dmFyIHJhbmRBcnIgPSBjcmVhdGVSYW5kSW50T3JkZXJlZEFycmF5KHRoaXMub3B0aW9ucy5hbmltYXRpb24udHJhbnNsYXRlWi5taW4sIHRoaXMub3B0aW9ucy5hbmltYXRpb24udHJhbnNsYXRlWi5tYXgsIHRoaXMub3B0aW9ucy5waWVjZXMpO1xuXHRcdFx0YW5pbVByb3BzLnRyYW5zbGF0ZVogPSB0eXBlb2YgdGhpcy5vcHRpb25zLmFuaW1hdGlvbi50cmFuc2xhdGVaID09PSAnb2JqZWN0JyA/IGZ1bmN0aW9uKGVsLCBpbmRleCkge1xuXHRcdFx0XHRyZXR1cm4gcmFuZEFycltpbmRleF07XG5cdFx0XHR9IDogdGhpcy5vcHRpb25zLmFuaW1hdGlvbi50cmFuc2xhdGVaO1xuXHRcdH1cblx0XHRpZiggdGhpcy5vcHRpb25zLmFuaW1hdGlvbi50cmFuc2xhdGVYICE9IHVuZGVmaW5lZCApIHtcblx0XHRcdGFuaW1Qcm9wcy50cmFuc2xhdGVYID0gdHlwZW9mIHRoaXMub3B0aW9ucy5hbmltYXRpb24udHJhbnNsYXRlWCA9PT0gJ29iamVjdCcgPyBmdW5jdGlvbihlbCwgaW5kZXgpIHtcblx0XHRcdFx0cmV0dXJuIGFuaW1lLnJhbmRvbShzZWxmLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVgubWluLCBzZWxmLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVgubWF4KTtcblx0XHRcdH0gOiB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVg7XG5cdFx0fVxuXHRcdGlmKCB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVkgIT0gdW5kZWZpbmVkICkge1xuXHRcdFx0YW5pbVByb3BzLnRyYW5zbGF0ZVkgPSB0eXBlb2YgdGhpcy5vcHRpb25zLmFuaW1hdGlvbi50cmFuc2xhdGVZID09PSAnb2JqZWN0JyA/IGZ1bmN0aW9uKGVsLCBpbmRleCkge1xuXHRcdFx0XHRyZXR1cm4gYW5pbWUucmFuZG9tKHNlbGYub3B0aW9ucy5hbmltYXRpb24udHJhbnNsYXRlWS5taW4sIHNlbGYub3B0aW9ucy5hbmltYXRpb24udHJhbnNsYXRlWS5tYXgpO1xuXHRcdFx0fSA6IHRoaXMub3B0aW9ucy5hbmltYXRpb24udHJhbnNsYXRlWTtcblx0XHR9XG5cdFx0aWYoIHRoaXMub3B0aW9ucy5hbmltYXRpb24ub3BhY2l0eSAhPSB1bmRlZmluZWQgKSB7XG5cdFx0XHRhbmltUHJvcHMub3BhY2l0eSA9IHRoaXMub3B0aW9ucy5hbmltYXRpb24ub3BhY2l0eTtcblx0XHR9XG5cblx0XHRhbmltZShhbmltUHJvcHMpO1xuXG5cdFx0Ly8gQWxzbyBhbmltYXRlIHRoZSBzaGFkb3cgZWxlbWVudC5cblx0XHRpZiggdGhpcy5vcHRpb25zLnNoYWRvd3MgJiYgaXNPYmpFbXB0eSh0aGlzLm9wdGlvbnMuc2hhZG93c0FuaW1hdGlvbikgKSB7XG5cdFx0XHRhbmltZShjb2xsZWN0KHtcblx0XHRcdFx0dGFyZ2V0czogdGhpcy5lbC5xdWVyeVNlbGVjdG9yQWxsKCcuc2VnbWVudGVyX19zaGFkb3cnKSxcblx0XHRcdFx0ZHVyYXRpb246IHRoaXMub3B0aW9ucy5hbmltYXRpb24uZHVyYXRpb24sXG5cdFx0XHRcdGRlbGF5OiBmdW5jdGlvbihlbCwgaW5kZXgpIHsgcmV0dXJuIChzZWxmLm9wdGlvbnMucGllY2VzIC0gaW5kZXggLSAxKSAqIHNlbGYub3B0aW9ucy5hbmltYXRpb24uZGVsYXk7IH0sXG5cdFx0XHRcdGVhc2luZzogdGhpcy5vcHRpb25zLmFuaW1hdGlvbi5lYXNpbmdcblx0XHRcdH0sIHRoaXMub3B0aW9ucy5zaGFkb3dzQW5pbWF0aW9uKSk7XG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBJbml0L0JpbmQgZXZlbnRzLlxuXHQgKi9cblx0U2VnbWVudGVyLnByb3RvdHlwZS5faW5pdEV2ZW50cyA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHQvLyBXaW5kb3cgcmVzaXplLlxuXHRcdHRoaXMuZGVib3VuY2VSZXNpemUgPSBkZWJvdW5jZShmdW5jdGlvbihldikge1xuXHRcdFx0dmFyIHBvc2l0aW9uc1RvdGFsID0gc2VsZi5vcHRpb25zLnBvc2l0aW9ucy5sZW5ndGg7XG5cblx0XHRcdC8vIFJlY2FsY3VsYXRlIGRpbWVuc2lvbnMuXG5cdFx0XHRzZWxmLmRpbWVuc2lvbnMgPSB7XG5cdFx0XHRcdHdpZHRoOiBzZWxmLmVsLm9mZnNldFdpZHRoLFxuXHRcdFx0XHRoZWlnaHQ6IHNlbGYuZWwub2Zmc2V0SGVpZ2h0XG5cdFx0XHR9O1xuXG5cdFx0XHQvLyBSZWNhbGN1bGF0ZSBjbGlwIHZhbHVlcy4uXG5cdFx0XHQvLyB0b2RvOiBEUllcblx0XHRcdC8vIHRvZG86IElmIHJhbmRvbSBpcyB0cnVlIHRoZW4gc2F2ZSB0aGUgaW5pdGlhbCB2YWx1ZXMuIFNob3VsZCBub3QgcmVjYWxjdWxhdGUgZm9yIHRoaXMgY2FzZS5cblx0XHRcdHNlbGYucGllY2VzLmZvckVhY2goZnVuY3Rpb24ocGllY2UsIHBvc2l0aW9uKSB7XG5cdFx0XHRcdHZhciBjbGlwVG9wLCBjbGlwTGVmdCwgY2xpcFJpZ2h0LCBjbGlwQm90dG9tLFxuXHRcdFx0XHRcdHNlZ21lbnRlclBpZWNlID0gcGllY2UucXVlcnlTZWxlY3RvcignLnNlZ21lbnRlcl9fcGllY2UnKTtcblxuXHRcdFx0XHRpZiggc2VsZi5vcHRpb25zLnBvc2l0aW9ucyA9PT0gJ3JhbmRvbScgKSB7XG5cdFx0XHRcdFx0dmFyIHJhbmRUID0gYW5pbWUucmFuZG9tKDAsMTAwKSwgcmFuZEwgPSBhbmltZS5yYW5kb20oMCwxMDApLCByYW5kVyA9IGFuaW1lLnJhbmRvbSgwLDEwMCksIHJhbmRIID0gYW5pbWUucmFuZG9tKDAsMTAwKTtcblx0XHRcdFx0XHRjbGlwVG9wID0gcmFuZFQvMTAwICogc2VsZi5kaW1lbnNpb25zLmhlaWdodDtcblx0XHRcdFx0XHRjbGlwTGVmdCA9IHJhbmRMLzEwMCAqIHNlbGYuZGltZW5zaW9ucy53aWR0aDtcblx0XHRcdFx0XHRjbGlwUmlnaHQgPSByYW5kVy8xMDAgKiBzZWxmLmRpbWVuc2lvbnMud2lkdGggKyBjbGlwTGVmdDtcblx0XHRcdFx0XHRjbGlwQm90dG9tID0gcmFuZEgvMTAwICogc2VsZi5kaW1lbnNpb25zLmhlaWdodCArIGNsaXBUb3A7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0dmFyIHBvcyA9IHBvc2l0aW9uIDw9IHBvc2l0aW9uc1RvdGFsIC0gMSA/IHBvc2l0aW9uIDogMDtcblx0XHRcdFx0XHRjbGlwVG9wID0gc2VsZi5vcHRpb25zLnBvc2l0aW9uc1twb3NdLnRvcC8xMDAgKiBzZWxmLmRpbWVuc2lvbnMuaGVpZ2h0O1xuXHRcdFx0XHRcdGNsaXBMZWZ0ID0gc2VsZi5vcHRpb25zLnBvc2l0aW9uc1twb3NdLmxlZnQvMTAwICogc2VsZi5kaW1lbnNpb25zLndpZHRoO1xuXHRcdFx0XHRcdGNsaXBSaWdodCA9IHNlbGYub3B0aW9ucy5wb3NpdGlvbnNbcG9zXS53aWR0aC8xMDAgKiBzZWxmLmRpbWVuc2lvbnMud2lkdGggKyBjbGlwTGVmdDtcblx0XHRcdFx0XHRjbGlwQm90dG9tID0gc2VsZi5vcHRpb25zLnBvc2l0aW9uc1twb3NdLmhlaWdodC8xMDAgKiBzZWxmLmRpbWVuc2lvbnMuaGVpZ2h0ICsgY2xpcFRvcDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHNlZ21lbnRlclBpZWNlLnN0eWxlLmNsaXAgPSAncmVjdCgnICsgY2xpcFRvcCArICdweCwnICsgY2xpcFJpZ2h0ICsgJ3B4LCcgKyBjbGlwQm90dG9tICsgJ3B4LCcgKyBjbGlwTGVmdCArICdweCknO1xuXHRcdFx0fSk7XG5cdFx0fSwgMTApO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLmRlYm91bmNlUmVzaXplKTtcblx0XHRcblx0XHQvLyBNb3VzZW1vdmUgYW5kIERldmljZW9yaWVudGF0aW9uOlxuXHRcdGlmKCB0aGlzLm9wdGlvbnMucGFyYWxsYXggKSB7XG5cdFx0XHR2YXIgYXJyUmFuZCA9IGNyZWF0ZVJhbmRJbnRPcmRlcmVkQXJyYXkodGhpcy5vcHRpb25zLnBhcmFsbGF4TW92ZW1lbnQubWluLCB0aGlzLm9wdGlvbnMucGFyYWxsYXhNb3ZlbWVudC5tYXgsIHRoaXMub3B0aW9ucy5waWVjZXMpO1xuXHRcdFx0dGhpcy5waWVjZXMuZm9yRWFjaChmdW5jdGlvbihwaWVjZSwgcG9zKSB7XG5cdFx0XHRcdHBpZWNlLnNldEF0dHJpYnV0ZSgnZGF0YS1wYXJhbGxheC10cmFuc2xhdGlvbicsIHR5cGVvZiBzZWxmLm9wdGlvbnMucGFyYWxsYXhNb3ZlbWVudCA9PT0gJ29iamVjdCcgPyBhcnJSYW5kW3Bvc10gOiBzZWxmLm9wdGlvbnMucGFyYWxsYXhNb3ZlbWVudCApO1xuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLm1vdXNlbW92ZSA9IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdGlmKCAhc2VsZi5hY3RpdmUgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzZWxmLnBpZWNlcy5mb3JFYWNoKGZ1bmN0aW9uKHBpZWNlKSB7XG5cdFx0XHRcdFx0XHR2YXIgdCA9IHBpZWNlLmdldEF0dHJpYnV0ZSgnZGF0YS1wYXJhbGxheC10cmFuc2xhdGlvbicpLFxuXHRcdFx0XHRcdFx0XHR0cmFuc1ggPSB0LyhzZWxmLmRpbWVuc2lvbnMud2lkdGgpKmV2LmNsaWVudFggLSB0LzIsXG5cdFx0XHRcdFx0XHRcdHRyYW5zWSA9IHQvKHNlbGYuZGltZW5zaW9ucy5oZWlnaHQpKmV2LmNsaWVudFkgLSB0LzI7XG5cblx0XHRcdFx0XHRcdHBpZWNlLnBhcmVudE5vZGUuc3R5bGUudHJhbnNmb3JtID0gcGllY2UucGFyZW50Tm9kZS5zdHlsZS5XZWJraXRUcmFuc2Zvcm0gPSAndHJhbnNsYXRlM2QoJyArIHRyYW5zWCArICdweCwnICsgdHJhbnNZICsgJ3B4LDApJztcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9O1xuXHRcdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMubW91c2Vtb3ZlKTtcblxuXHRcdFx0dGhpcy5oYW5kbGVPcmllbnRhdGlvbiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiggIXNlbGYuYWN0aXZlICkge1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgeSA9IGV2ZW50LmdhbW1hO1xuXHRcdFx0XHQvLyBUbyBtYWtlIGNvbXB1dGF0aW9uIGVhc2llciB3ZSBzaGlmdCB0aGUgcmFuZ2Ugb2YgeCBhbmQgeSB0byBbMCwxODBdXG5cdFx0XHRcdHkgKz0gOTA7XG5cdFx0XHRcdFxuXHRcdFx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0c2VsZi5waWVjZXMuZm9yRWFjaChmdW5jdGlvbihwaWVjZSkge1xuXHRcdFx0XHRcdFx0dmFyIHQgPSBwaWVjZS5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGFyYWxsYXgtdHJhbnNsYXRpb24nKSxcblx0XHRcdFx0XHRcdFx0dHJhbnNYID0gdC8oc2VsZi5kaW1lbnNpb25zLndpZHRoKSp5IC0gdC8yLFxuXHRcdFx0XHRcdFx0XHR0cmFuc1kgPSB0LyhzZWxmLmRpbWVuc2lvbnMuaGVpZ2h0KSp5IC0gdC8yO1xuXG5cdFx0XHRcdFx0XHRwaWVjZS5wYXJlbnROb2RlLnN0eWxlLnRyYW5zZm9ybSA9IHBpZWNlLnBhcmVudE5vZGUuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gJ3RyYW5zbGF0ZTNkKCcgKyB0cmFuc1ggKyAncHgsJyArIHRyYW5zWSArICdweCwwKSc7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2RldmljZW9yaWVudGF0aW9uJywgdGhpcy5oYW5kbGVPcmllbnRhdGlvbik7XG5cdFx0fVxuXHR9O1xuXG5cdHdpbmRvdy5TZWdtZW50ZXIgPSBTZWdtZW50ZXI7XG5cbn0pKHdpbmRvdyk7Il0sImZpbGUiOiJ2ZW5kb3IvbWFpbi5qcyJ9
