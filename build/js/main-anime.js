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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJtYWluLWFuaW1lLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogbWFpbi5qc1xuICogaHR0cDovL3d3dy5jb2Ryb3BzLmNvbVxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiAqIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXG4gKiBcbiAqIENvcHlyaWdodCAyMDE2LCBDb2Ryb3BzXG4gKiBodHRwOi8vd3d3LmNvZHJvcHMuY29tXG4gKi9cbjsoZnVuY3Rpb24od2luZG93KSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdC8vIEhlbHBlciB2YXJzIGFuZCBmdW5jdGlvbnMuXG5cdGZ1bmN0aW9uIGV4dGVuZCggYSwgYiApIHtcblx0XHRmb3IoIHZhciBrZXkgaW4gYiApIHsgXG5cdFx0XHRpZiggYi5oYXNPd25Qcm9wZXJ0eSgga2V5ICkgKSB7XG5cdFx0XHRcdGFba2V5XSA9IGJba2V5XTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGE7XG5cdH1cblx0Ly8gRnJvbSBodHRwczovL2Rhdmlkd2Fsc2gubmFtZS9qYXZhc2NyaXB0LWRlYm91bmNlLWZ1bmN0aW9uLlxuXHRmdW5jdGlvbiBkZWJvdW5jZShmdW5jLCB3YWl0LCBpbW1lZGlhdGUpIHtcblx0XHR2YXIgdGltZW91dDtcblx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgY29udGV4dCA9IHRoaXMsIGFyZ3MgPSBhcmd1bWVudHM7XG5cdFx0XHR2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0dGltZW91dCA9IG51bGw7XG5cdFx0XHRcdGlmICghaW1tZWRpYXRlKSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuXHRcdFx0fTtcblx0XHRcdHZhciBjYWxsTm93ID0gaW1tZWRpYXRlICYmICF0aW1lb3V0O1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuXHRcdFx0dGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xuXHRcdFx0aWYgKGNhbGxOb3cpIGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG5cdFx0fTtcblx0fTtcblx0Ly8gQ3JlYXRlcyBhIHNvcnRlZCBhcnJheSBvZiByYW5kb20gbnVtYmVycyBiZXR3ZWVuIG1pblZhbCBhbmQgbWF4VmFsIHdpdGggYSBsZW5ndGggPSBzaXplLlxuXHRmdW5jdGlvbiBjcmVhdGVSYW5kSW50T3JkZXJlZEFycmF5KG1pblZhbCwgbWF4VmFsLCBzaXplKSB7XG5cdFx0dmFyIGFyciA9IFtdO1xuXHRcdGZvcih2YXIgaT0wOyBpPHNpemU7ICsraSkge1xuXHRcdFx0YXJyLnB1c2goYW5pbWUucmFuZG9tKG1pblZhbCwgbWF4VmFsKSk7XG5cdFx0fVxuXHRcdGFyci5zb3J0KGZ1bmN0aW9uKGEsIGIpeyByZXR1cm4gYS1iIH0pO1xuXHRcdHJldHVybiBhcnI7XG5cdH1cblx0Ly8gQ2hlY2tzIGlmIGFuIG9iamVjdCBpcyBlbXB0eS5cblx0ZnVuY3Rpb24gaXNPYmpFbXB0eShvYmopIHtcblx0XHRyZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqKS5sZW5ndGggPiAwO1xuXHR9XG5cdC8vIENvbmNhdGVuYXRlIEpTIG9ianMuXG5cdC8vIEZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjQ1NDMxNS5cblx0ZnVuY3Rpb24gY29sbGVjdCgpIHtcblx0XHR2YXIgcmV0ID0ge307XG5cdFx0dmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG5cdFx0Zm9yICh2YXIgaT0wOyBpPGxlbjsgaSsrKSB7XG5cdFx0XHRmb3IgKHZhciBwIGluIGFyZ3VtZW50c1tpXSkge1xuXHRcdFx0XHRpZiAoYXJndW1lbnRzW2ldLmhhc093blByb3BlcnR5KHApKSB7XG5cdFx0XHRcdFx0cmV0W3BdID0gYXJndW1lbnRzW2ldW3BdO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiByZXQ7XG5cdH1cblx0Ly8gQ2hlY2sgaWYgY2xpcC1wYXRoIGlzIHN1cHBvcnRlZC4gRnJvbSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8zMDA0MTUzOC5cblx0ZnVuY3Rpb24gYXJlQ2xpcFBhdGhTaGFwZXNTdXBwb3J0ZWQoKSB7XG5cdFx0dmFyIGJhc2UgPSAnY2xpcFBhdGgnLFxuXHRcdFx0cHJlZml4ZXMgPSBbICd3ZWJraXQnLCAnbW96JywgJ21zJywgJ28nIF0sXG5cdFx0XHRwcm9wZXJ0aWVzID0gWyBiYXNlIF0sXG5cdFx0XHR0ZXN0RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoICd0ZXN0ZWxlbWVudCcgKSxcblx0XHRcdGF0dHJpYnV0ZSA9ICdwb2x5Z29uKDUwJSAwJSwgMCUgMTAwJSwgMTAwJSAxMDAlKSc7XG5cblx0XHQvLyBQdXNoIHRoZSBwcmVmaXhlZCBwcm9wZXJ0aWVzIGludG8gdGhlIGFycmF5IG9mIHByb3BlcnRpZXMuXG5cdFx0Zm9yICggdmFyIGkgPSAwLCBsID0gcHJlZml4ZXMubGVuZ3RoOyBpIDwgbDsgaSsrICkge1xuXHRcdFx0dmFyIHByZWZpeGVkUHJvcGVydHkgPSBwcmVmaXhlc1tpXSArIGJhc2UuY2hhckF0KCAwICkudG9VcHBlckNhc2UoKSArIGJhc2Uuc2xpY2UoIDEgKTsgLy8gcmVtZW1iZXIgdG8gY2FwaXRhbGl6ZSFcblx0XHRcdHByb3BlcnRpZXMucHVzaCggcHJlZml4ZWRQcm9wZXJ0eSApO1xuXHRcdH1cblxuXHRcdC8vIEludGVyYXRlIG92ZXIgdGhlIHByb3BlcnRpZXMgYW5kIHNlZSBpZiB0aGV5IHBhc3MgdHdvIHRlc3RzLlxuXHRcdGZvciAoIHZhciBpID0gMCwgbCA9IHByb3BlcnRpZXMubGVuZ3RoOyBpIDwgbDsgaSsrICkge1xuXHRcdFx0dmFyIHByb3BlcnR5ID0gcHJvcGVydGllc1tpXTtcblxuXHRcdFx0Ly8gRmlyc3QsIHRoZXkgbmVlZCB0byBldmVuIHN1cHBvcnQgY2xpcC1wYXRoIChJRSA8PSAxMSBkb2VzIG5vdCkuLi5cblx0XHRcdGlmICggdGVzdEVsZW1lbnQuc3R5bGVbcHJvcGVydHldID09PSAnJyApIHtcblxuXHRcdFx0XHQvLyBTZWNvbmQsIHdlIG5lZWQgdG8gc2VlIHdoYXQgaGFwcGVucyB3aGVuIHdlIHRyeSB0byBjcmVhdGUgYSBDU1Mgc2hhcGUuLi5cblx0XHRcdFx0dGVzdEVsZW1lbnQuc3R5bGVbcHJvcGVydHldID0gYXR0cmlidXRlO1xuXHRcdFx0XHRpZiAoIHRlc3RFbGVtZW50LnN0eWxlW3Byb3BlcnR5XSAhPT0gJycgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBTZWdtZW50ZXIgb2JqLlxuXHQgKi9cblx0ZnVuY3Rpb24gU2VnbWVudGVyKGVsLCBvcHRpb25zKSB7XG5cdFx0dGhpcy5lbCA9IGVsO1xuXHRcdHRoaXMub3B0aW9ucyA9IGV4dGVuZCh7fSwgdGhpcy5vcHRpb25zKTtcblx0XHRleHRlbmQodGhpcy5vcHRpb25zLCBvcHRpb25zKTtcblx0XHQvLyBQcmVsb2FkIG1haW4gaW1hZ2UuXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdGltYWdlc0xvYWRlZCh0aGlzLmVsLCB7IGJhY2tncm91bmQ6IHRydWUgfSwgZnVuY3Rpb24oKSB7XG5cdFx0XHRzZWxmLl9pbml0KCk7XG5cdFx0XHRzZWxmLl9pbml0RXZlbnRzKCk7XG5cdFx0XHRzZWxmLm9wdGlvbnMub25SZWFkeSgpO1xuXHRcdH0pO1xuXHR9XG5cblx0U2VnbWVudGVyLnByb3RvdHlwZS5vcHRpb25zID0ge1xuXHRcdC8vIE51bWJlciBvZiBwaWVjZXMuXG5cdFx0cGllY2VzOiA0LCBcblx0XHQvLyBTaG93IHBpZWNlcyBhbHJlYWR5IHN0eWxlZC5cblx0XHRyZW5kZXJPbkxvYWQ6IGZhbHNlLFxuXHRcdC8vIEFkZCBhbiBlbGVtZW50IGZvciB0aGUgc2hhZG93LlxuXHRcdHNoYWRvd3M6IHRydWUsXG5cdFx0Ly8gQW5pbWF0aW9ucyBmb3IgdGhlIHNoYWRvdyAodmFsaWQgcHJvcGVydGllczogb3BhY2l0eSwgdHJhbnNsYXRlWCwgdHJhbnNsYXRlWSkuXG5cdFx0c2hhZG93c0FuaW1hdGlvbjoge1xuXHRcdFx0b3BhY2l0eTogMSxcblx0XHRcdC8vIHRyYW5zbGF0ZVg6IDIwLFxuXHRcdFx0Ly8gdHJhbnNsYXRlWTogMjBcblx0XHR9LFxuXHRcdC8vIFBhcnJhbGxheCBlZmZlY3QgZm9yIHRoZSBwaWVjZXMuXG5cdFx0cGFyYWxsYXg6IGZhbHNlLFxuXHRcdC8vIE1vdmVtZW50cyBmb3IgdGhlIHBhcmFsbGF4IGVmZmVjdC5cblx0XHRwYXJhbGxheE1vdmVtZW50OiB7bWluOiAxMCwgbWF4OiA0MH0sXG5cdFx0Ly8gQW5pbWF0aW9uIGZvciB0aGUgcGllY2VzICh2YWxpZCBwcm9wZXJ0aWVzOiBkdXJhdGlvbiwgZWFzaW5nLCBkZWxheSwgb3BhY2l0eSwgdHJhbnNsYXRlW1hZWl0pLlxuXHRcdGFuaW1hdGlvbjoge1xuXHRcdFx0ZHVyYXRpb246IDE1MDAsXG5cdFx0XHRlYXNpbmc6ICdlYXNlT3V0UXVhZCcsXG5cdFx0XHRkZWxheTogMCwgLy8gRGVsYXkgaW5jcmVtZW50IHBlciBwaWVjZS5cblx0XHRcdC8vIG9wYWNpdHk6IDAuNSxcblx0XHRcdHRyYW5zbGF0ZVo6IHttaW46IDEwLCBtYXg6IDY1fSwgLy8gV2UgY2FuIGFsc28gdXNlIGFuIGludGVnZXIgZm9yIGEgc3BlY2lmaWMgdmFsdWUuXG5cdFx0XHQvLyB0cmFuc2xhdGVYOiB7bWluOiAtMTAwLCBtYXg6IDEwMH0sIC8vIFdlIGNhbiBhbHNvIHVzZSBhbiBpbnRlZ2VyIGZvciBhIHNwZWNpZmljIHZhbHVlLlxuXHRcdFx0Ly8gdHJhbnNsYXRlWToge21pbjogLTEwMCwgbWF4OiAxMDB9IC8vIFdlIGNhbiBhbHNvIHVzZSBhbiBpbnRlZ2VyIGZvciBhIHNwZWNpZmljIHZhbHVlLlxuXHRcdH0sXG5cdFx0Ly8gQ2FsbGJhY2tzXG5cdFx0b25SZWFkeTogZnVuY3Rpb24oKSB7IHJldHVybiBmYWxzZTsgfSxcblx0XHRvbkFuaW1hdGlvbkNvbXBsZXRlOiBmdW5jdGlvbigpIHsgcmV0dXJuIGZhbHNlOyB9LFxuXHRcdG9uQW5pbWF0aW9uU3RhcnQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZmFsc2U7IH0sXG5cdFx0Ly8gVGhlIHBvc2l0aW9ucyBvZiB0aGUgcGllY2VzIGluIHBlcmNlbnRhZ2UgdmFsdWVzLiBcblx0XHQvLyBXZSBjYW4gYWxzbyB1c2UgcmFuZG9tIHZhbHVlcyBieSBzZXR0aW5nIG9wdGlvbnMucG9zaXRpb25zIHRvIFwicmFuZG9tXCIuXG5cdFx0cG9zaXRpb25zOiBbXG5cdFx0XHR7dG9wOiA4MCwgbGVmdDogMTAsIHdpZHRoOiAzMCwgaGVpZ2h0OiAyMH0sXG5cdFx0XHR7dG9wOiAyLCBsZWZ0OiAyLCB3aWR0aDogNDAsIGhlaWdodDogNDB9LFxuXHRcdFx0e3RvcDogMzAsIGxlZnQ6IDYwLCB3aWR0aDogMzAsIGhlaWdodDogNjB9LFxuXHRcdFx0e3RvcDogMTAsIGxlZnQ6IDIwLCB3aWR0aDogNTAsIGhlaWdodDogNjB9XG5cdFx0XVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBJbml0IVxuXHQgKi9cblx0U2VnbWVudGVyLnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uKCkge1xuXHRcdC8vIFRoZSBkaW1lbnNpb25zIG9mIHRoZSBtYWluIGVsZW1lbnQuXG5cdFx0dGhpcy5kaW1lbnNpb25zID0ge1xuXHRcdFx0d2lkdGg6IHRoaXMuZWwub2Zmc2V0V2lkdGgsXG5cdFx0XHRoZWlnaHQ6IHRoaXMuZWwub2Zmc2V0SGVpZ2h0XG5cdFx0fTtcblx0XHRcblx0XHQvLyBUaGUgc291cmNlIG9mIHRoZSBtYWluIGltYWdlLlxuXHRcdHZhciBiYWNrZ3JvdW5kID0gdGhpcy5lbC5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U7XG5cdFx0dGhpcy5pbWdzcmMgPSBiYWNrZ3JvdW5kLnJlcGxhY2UoJ3VybCgnLCcnKS5yZXBsYWNlKCcpJywnJykucmVwbGFjZSgvXFxcIi9naSwgXCJcIik7O1xuXHRcdFxuXHRcdC8vIENyZWF0ZSB0aGUgbGF5b3V0LlxuXHRcdHRoaXMuX2xheW91dCgpO1xuXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHRoaXMucGllY2VzID0gW10uc2xpY2UuY2FsbCh0aGlzLmVsLnF1ZXJ5U2VsZWN0b3JBbGwoJy5zZWdtZW50ZXJfX3BpZWNlLXdyYXAnKSk7XG5cdFx0dGhpcy5waWVjZXMuZm9yRWFjaChmdW5jdGlvbihwaWVjZSwgcG9zKSB7XG5cdFx0XHQvLyBCdWdmaXggZm9yIENocm9tZS4gVGhlIHRyYW5zbGF0ZVogbmVlZHMgYW4gaW5pdGlhbCB2YWx1ZSBvdGhlcndpc2UgdGhlIGFuaW1hdGlvbiB3aWxsIG5vdCB3b3JrLiAodGhpcyBzZWVtcyB0byBiZSBhIGFuaW1lLmpzIGJ1ZyAtIGxldMK0cyB3YWl0IGZvciB0aGUgbmV4dCB2ZXJzaW9uLi4pXG5cdFx0XHRwaWVjZS5zdHlsZS5XZWJraXRUcmFuc2Zvcm0gPSBwaWVjZS5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlWigwLjAwMDFweCknO1xuXG5cdFx0XHQvLyBJZiB3ZSB3YW50IHRvIHJlbmRlciB0aGUgZGlmZmVyZW50IHBpZWNlcyBvbiBsb2FkIHRoZW46XG5cdFx0XHRpZiggc2VsZi5vcHRpb25zLnJlbmRlck9uTG9hZCApIHtcblx0XHRcdFx0c2VsZi5fcmVuZGVyUGllY2UocGllY2UpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdC8vIEZsYWcgdG8gaW5kaWNhdGUgdGhlIHBpZWNlcyBhcmUgYWxyZWFkeSByZW5kZXJlZC9zdHlsZWQgZWl0aGVyIG9uIGxvYWQgb3IgYWZ0ZXIgdGhlIGFuaW1hdGlvbi5cblx0XHRpZiggdGhpcy5vcHRpb25zLnJlbmRlck9uTG9hZCApIHtcblx0XHRcdHRoaXMuYWN0aXZlID0gdHJ1ZTtcblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgdGhlIGxheW91dC5cblx0ICovXG5cdFNlZ21lbnRlci5wcm90b3R5cGUuX2xheW91dCA9IGZ1bmN0aW9uKCkge1xuXHRcdC8vIGNsaXAtcGF0aCBzdXBwb3J0XG5cdFx0dmFyIGNsaXBQYXRoID0gYXJlQ2xpcFBhdGhTaGFwZXNTdXBwb3J0ZWQoKTtcblxuXHRcdHZhciBzZWdCZ0VsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0c2VnQmdFbC5jbGFzc05hbWUgPSAnc2VnbWVudGVyX19iYWNrZ3JvdW5kJztcblx0XHRzZWdCZ0VsLnN0eWxlLmJhY2tncm91bmRJbWFnZSA9ICd1cmwoJyArIHRoaXMuaW1nc3JjICsgJyknO1xuXG5cdFx0dmFyIHNlZ1BpZWNlcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLFxuXHRcdFx0c2VnUGllY2VzSFRNTCA9ICcnLFxuXHRcdFx0cG9zaXRpb25zVG90YWwgPSB0aGlzLm9wdGlvbnMucG9zaXRpb25zLmxlbmd0aDtcblxuXHRcdHNlZ1BpZWNlcy5jbGFzc05hbWUgPSAnc2VnbWVudGVyX19waWVjZXMnO1xuXG5cdFx0Zm9yKHZhciBpID0gMCwgbGVuID0gdGhpcy5vcHRpb25zLnBpZWNlczsgaSA8IGxlbjsgKytpKSB7XG5cdFx0XHRpZiggdGhpcy5vcHRpb25zLnBhcmFsbGF4ICkge1xuXHRcdFx0XHRzZWdQaWVjZXNIVE1MICs9ICc8ZGl2IGNsYXNzPVwic2VnbWVudGVyX19waWVjZS1wYXJhbGxheFwiPic7XG5cdFx0XHR9XG5cblx0XHRcdHNlZ1BpZWNlc0hUTUwgKz0gJzxkaXYgY2xhc3M9XCJzZWdtZW50ZXJfX3BpZWNlLXdyYXBcIj4nO1xuXHRcdFx0XG5cdFx0XHR2YXIgdG9wLCBsZWZ0LCB3aWR0aCwgaGVpZ2h0LCBjbGlwVG9wLCBjbGlwTGVmdCwgY2xpcFJpZ2h0LCBjbGlwQm90dG9tLFxuXHRcdFx0XHRwb3MgPSBpIDw9IHBvc2l0aW9uc1RvdGFsIC0gMSA/IGkgOiAwLFxuXHRcdFx0XHRpc1JhbmRvbSA9IHRoaXMub3B0aW9ucy5wb3NpdGlvbnMgPT09ICdyYW5kb20nO1xuXG5cdFx0XHR0b3AgPSBpc1JhbmRvbSA/IGFuaW1lLnJhbmRvbSgwLDEwMCkgOiB0aGlzLm9wdGlvbnMucG9zaXRpb25zW3Bvc10udG9wO1xuXHRcdFx0bGVmdCA9IGlzUmFuZG9tID8gYW5pbWUucmFuZG9tKDAsMTAwKSA6IHRoaXMub3B0aW9ucy5wb3NpdGlvbnNbcG9zXS5sZWZ0O1xuXHRcdFx0d2lkdGggPSBpc1JhbmRvbSA/IGFuaW1lLnJhbmRvbSgwLDEwMCkgOiB0aGlzLm9wdGlvbnMucG9zaXRpb25zW3Bvc10ud2lkdGg7XG5cdFx0XHRoZWlnaHQgPSBpc1JhbmRvbSA/IGFuaW1lLnJhbmRvbSgwLDEwMCkgOiB0aGlzLm9wdGlvbnMucG9zaXRpb25zW3Bvc10uaGVpZ2h0O1xuXHRcdFx0XG5cdFx0XHRpZiggIWNsaXBQYXRoICkge1xuXHRcdFx0XHRjbGlwVG9wID0gaXNSYW5kb20gPyB0b3AvMTAwICogdGhpcy5kaW1lbnNpb25zLmhlaWdodCA6IHRoaXMub3B0aW9ucy5wb3NpdGlvbnNbcG9zXS50b3AvMTAwICogdGhpcy5kaW1lbnNpb25zLmhlaWdodDtcblx0XHRcdFx0Y2xpcExlZnQgPSBpc1JhbmRvbSA/IGxlZnQvMTAwICogdGhpcy5kaW1lbnNpb25zLndpZHRoIDogdGhpcy5vcHRpb25zLnBvc2l0aW9uc1twb3NdLmxlZnQvMTAwICogdGhpcy5kaW1lbnNpb25zLndpZHRoO1xuXHRcdFx0XHRjbGlwUmlnaHQgPSBpc1JhbmRvbSA/IHdpZHRoLzEwMCAqIHRoaXMuZGltZW5zaW9ucy53aWR0aCArIGNsaXBMZWZ0IDogdGhpcy5vcHRpb25zLnBvc2l0aW9uc1twb3NdLndpZHRoLzEwMCAqIHRoaXMuZGltZW5zaW9ucy53aWR0aCArIGNsaXBMZWZ0O1xuXHRcdFx0XHRjbGlwQm90dG9tID0gaXNSYW5kb20gPyBoZWlnaHQvMTAwICogdGhpcy5kaW1lbnNpb25zLmhlaWdodCArIGNsaXBUb3AgOiB0aGlzLm9wdGlvbnMucG9zaXRpb25zW3Bvc10uaGVpZ2h0LzEwMCAqIHRoaXMuZGltZW5zaW9ucy5oZWlnaHQgKyBjbGlwVG9wO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiggdGhpcy5vcHRpb25zLnNoYWRvd3MgKSB7XG5cdFx0XHRcdHNlZ1BpZWNlc0hUTUwgKz0gJzxkaXYgY2xhc3M9XCJzZWdtZW50ZXJfX3NoYWRvd1wiIHN0eWxlPVwidG9wOiAnICsgdG9wICsgJyU7IGxlZnQ6ICcgKyBsZWZ0ICsgJyU7IHdpZHRoOiAnICsgd2lkdGggKyAnJTsgaGVpZ2h0OiAnICsgaGVpZ2h0ICsgJyVcIj48L2Rpdj4nO1x0XHRcblx0XHRcdH1cblxuXHRcdFx0c2VnUGllY2VzSFRNTCArPSBjbGlwUGF0aCA/XG5cdFx0XHRcdFx0XHRcdCc8ZGl2IGNsYXNzPVwic2VnbWVudGVyX19waWVjZVwiIHN0eWxlPVwiYmFja2dyb3VuZC1pbWFnZTogdXJsKCcgKyB0aGlzLmltZ3NyYyArICcpOyAtd2Via2l0LWNsaXAtcGF0aDogcG9seWdvbignICsgbGVmdCArICclICcgKyB0b3AgKyAnJSwgJyArIChsZWZ0ICsgd2lkdGgpICsgJyUgJyArIHRvcCArICclLCAnICsgKGxlZnQgKyB3aWR0aCkgKyAnJSAnICsgKHRvcCArIGhlaWdodCkgKyAnJSwgJyArIGxlZnQgKyAnJSAnICsgKHRvcCArIGhlaWdodCkgKyAnJSk7IGNsaXAtcGF0aDogcG9seWdvbignICsgbGVmdCArICclICcgKyB0b3AgKyAnJSwgJyArIChsZWZ0ICsgd2lkdGgpICsgJyUgJyArIHRvcCArICclLCAnICsgKGxlZnQgKyB3aWR0aCkgKyAnJSAnICsgKHRvcCArIGhlaWdodCkgKyAnJSwgJyArIGxlZnQgKyAnJSAnICsgKHRvcCArIGhlaWdodCkgKyAnJSlcIj48L2Rpdj4nIDpcblx0XHRcdFx0XHRcdFx0JzxkaXYgY2xhc3M9XCJzZWdtZW50ZXJfX3BpZWNlXCIgc3R5bGU9XCJiYWNrZ3JvdW5kLWltYWdlOiB1cmwoJyArIHRoaXMuaW1nc3JjICsgJyk7IGNsaXA6IHJlY3QoJyArIGNsaXBUb3AgKyAncHgsJyArIGNsaXBSaWdodCArICdweCwnICsgY2xpcEJvdHRvbSArICdweCwnICsgY2xpcExlZnQgKyAncHgpXCI+PC9kaXY+JztcblxuXHRcdFx0c2VnUGllY2VzSFRNTCArPSAnPC9kaXY+J1xuXHRcdFx0aWYoIHRoaXMub3B0aW9ucy5wYXJhbGxheCApIHtcblx0XHRcdFx0c2VnUGllY2VzSFRNTCArPSAnPC9kaXY+Jztcblx0XHRcdH1cblx0XHR9XG5cblx0XHRzZWdQaWVjZXMuaW5uZXJIVE1MID0gc2VnUGllY2VzSFRNTDtcblxuXHRcdHRoaXMuZWwuaW5uZXJIVE1MID0gJyc7XG5cdFx0dGhpcy5lbC5hcHBlbmRDaGlsZChzZWdCZ0VsKTtcblx0XHR0aGlzLmVsLmFwcGVuZENoaWxkKHNlZ1BpZWNlcyk7XG5cdH07XG5cblx0LyoqXG5cdCAqIFJlbmRlcnMvU3R5bGVzIGEgcGllY2Ugd2l0aCB0aGUgb3B0aW9ucyB0aGF0IGFyZSBwYXNzZWQgaW4gdGhlIGluaXRpYWxpemF0aW9uLlxuXHQgKi9cblx0U2VnbWVudGVyLnByb3RvdHlwZS5fcmVuZGVyUGllY2UgPSBmdW5jdGlvbihwaWVjZSkge1xuXHRcdHZhciBpZHggPSB0aGlzLnBpZWNlcy5pbmRleE9mKHBpZWNlKTtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0aWYoIHNlbGYub3B0aW9ucy5hbmltYXRpb24udHJhbnNsYXRlWiAhPSB1bmRlZmluZWQgKSB7XG5cdFx0XHRpZiggdHlwZW9mIHNlbGYub3B0aW9ucy5hbmltYXRpb24udHJhbnNsYXRlWiA9PT0gJ29iamVjdCcgKSB7XG5cdFx0XHRcdHZhciByYW5kQXJyID0gY3JlYXRlUmFuZEludE9yZGVyZWRBcnJheShzZWxmLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVoubWluLCBzZWxmLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVoubWF4LCBzZWxmLm9wdGlvbnMucGllY2VzKTtcblx0XHRcdFx0cGllY2Uuc3R5bGUudHJhbnNmb3JtID0gcGllY2Uuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gJ3RyYW5zbGF0ZVooJyArIHJhbmRBcnJbaWR4XSArICdweCknO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHBpZWNlLnN0eWxlLnRyYW5zZm9ybSA9IHBpZWNlLnN0eWxlLldlYmtpdFRyYW5zZm9ybSA9ICd0cmFuc2xhdGVaKCcgKyBzZWxmLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVogKyAncHgpJztcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYoIHNlbGYub3B0aW9ucy5hbmltYXRpb24udHJhbnNsYXRlWSAhPSB1bmRlZmluZWQgKSB7XG5cdFx0XHRpZiggdHlwZW9mIHNlbGYub3B0aW9ucy5hbmltYXRpb24udHJhbnNsYXRlWSA9PT0gJ29iamVjdCcgKSB7XG5cdFx0XHRcdHZhciByYW5kQXJyID0gY3JlYXRlUmFuZEludE9yZGVyZWRBcnJheShzZWxmLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVkubWluLCBzZWxmLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVkubWF4LCBzZWxmLm9wdGlvbnMucGllY2VzKTtcblx0XHRcdFx0cGllY2Uuc3R5bGUudHJhbnNmb3JtID0gcGllY2Uuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gJ3RyYW5zbGF0ZVkoJyArIHJhbmRBcnJbaWR4XSArICdweCknO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHBpZWNlLnN0eWxlLnRyYW5zZm9ybSA9IHBpZWNlLnN0eWxlLldlYmtpdFRyYW5zZm9ybSA9ICd0cmFuc2xhdGVZKCcgKyBzZWxmLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVkgKyAncHgpJztcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYoIHNlbGYub3B0aW9ucy5hbmltYXRpb24udHJhbnNsYXRlWCAhPSB1bmRlZmluZWQgKSB7XG5cdFx0XHRpZiggdHlwZW9mIHNlbGYub3B0aW9ucy5hbmltYXRpb24udHJhbnNsYXRlWCA9PT0gJ29iamVjdCcgKSB7XG5cdFx0XHRcdHZhciByYW5kQXJyID0gY3JlYXRlUmFuZEludE9yZGVyZWRBcnJheShzZWxmLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVgubWluLCBzZWxmLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVgubWF4LCBzZWxmLm9wdGlvbnMucGllY2VzKTtcblx0XHRcdFx0cGllY2Uuc3R5bGUudHJhbnNmb3JtID0gcGllY2Uuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gJ3RyYW5zbGF0ZVgoJyArIHJhbmRBcnJbaWR4XSArICdweCknO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHBpZWNlLnN0eWxlLnRyYW5zZm9ybSA9IHBpZWNlLnN0eWxlLldlYmtpdFRyYW5zZm9ybSA9ICd0cmFuc2xhdGVYKCcgKyBzZWxmLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVggKyAncHgpJztcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYoIHNlbGYub3B0aW9ucy5hbmltYXRpb24ub3BhY2l0eSAhPSB1bmRlZmluZWQgKSB7XG5cdFx0XHRwaWVjZS5zdHlsZS5vcGFjaXR5ID0gc2VsZi5vcHRpb25zLmFuaW1hdGlvbi5vcGFjaXR5O1xuXHRcdH1cblxuXHRcdGlmKCBzZWxmLm9wdGlvbnMuc2hhZG93cyAmJiBpc09iakVtcHR5KHNlbGYub3B0aW9ucy5zaGFkb3dzQW5pbWF0aW9uKSApIHtcblx0XHRcdHZhciBzaGFkb3dFbCA9IHBpZWNlLnF1ZXJ5U2VsZWN0b3IoJy5zZWdtZW50ZXJfX3NoYWRvdycpO1xuXHRcdFx0c2hhZG93RWwuc3R5bGUub3BhY2l0eSA9IHNlbGYub3B0aW9ucy5zaGFkb3dzQW5pbWF0aW9uLm9wYWNpdHkgIT0gdW5kZWZpbmVkID8gc2VsZi5vcHRpb25zLnNoYWRvd3NBbmltYXRpb24ub3BhY2l0eSA6IDA7XG5cdFx0XHRzaGFkb3dFbC5zdHlsZS50cmFuc2Zvcm0gPSBzaGFkb3dFbC5zdHlsZS5XZWJraXRUcmFuc2Zvcm0gPSAndHJhbnNsYXRlWCgnICsgKHNlbGYub3B0aW9ucy5zaGFkb3dzQW5pbWF0aW9uLnRyYW5zbGF0ZVggIT0gdW5kZWZpbmVkID8gc2VsZi5vcHRpb25zLnNoYWRvd3NBbmltYXRpb24udHJhbnNsYXRlWCA6IDApICsgJ3B4KSB0cmFuc2xhdGVZKCcgKyAoc2VsZi5vcHRpb25zLnNoYWRvd3NBbmltYXRpb24udHJhbnNsYXRlWSAhPSB1bmRlZmluZWQgPyBzZWxmLm9wdGlvbnMuc2hhZG93c0FuaW1hdGlvbi50cmFuc2xhdGVZIDogMCkgKyAncHgpJztcblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIEFuaW1hdGVzIHRoZSBwaWVjZXMgd2l0aCB0aGUgb3B0aW9ucyBwYXNzZWQgKHdpdGggYW5pbWUuanMpLlxuXHQgKi9cblx0U2VnbWVudGVyLnByb3RvdHlwZS5hbmltYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYoIHRoaXMuYWN0aXZlICkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHR0aGlzLmFjdGl2ZSA9IHRydWU7XG5cblx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRhbmltUHJvcHMgPSB7XG5cdFx0XHRcdHRhcmdldHM6IHRoaXMucGllY2VzLFxuXHRcdFx0XHRkdXJhdGlvbjogdGhpcy5vcHRpb25zLmFuaW1hdGlvbi5kdXJhdGlvbixcblx0XHRcdFx0ZGVsYXk6IGZ1bmN0aW9uKGVsLCBpbmRleCkgeyByZXR1cm4gKHNlbGYub3B0aW9ucy5waWVjZXMgLSBpbmRleCAtIDEpICogc2VsZi5vcHRpb25zLmFuaW1hdGlvbi5kZWxheTsgfSxcblx0XHRcdFx0ZWFzaW5nOiB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uLmVhc2luZyxcblx0XHRcdFx0YmVnaW46IHRoaXMub3B0aW9ucy5vbkFuaW1hdGlvblN0YXJ0LFxuXHRcdFx0XHRjb21wbGV0ZTogdGhpcy5vcHRpb25zLm9uQW5pbWF0aW9uQ29tcGxldGVcblx0XHRcdH07XG5cdFx0XG5cdFx0aWYoIHRoaXMub3B0aW9ucy5hbmltYXRpb24udHJhbnNsYXRlWiAhPSB1bmRlZmluZWQgKSB7XG5cdFx0XHR2YXIgcmFuZEFyciA9IGNyZWF0ZVJhbmRJbnRPcmRlcmVkQXJyYXkodGhpcy5vcHRpb25zLmFuaW1hdGlvbi50cmFuc2xhdGVaLm1pbiwgdGhpcy5vcHRpb25zLmFuaW1hdGlvbi50cmFuc2xhdGVaLm1heCwgdGhpcy5vcHRpb25zLnBpZWNlcyk7XG5cdFx0XHRhbmltUHJvcHMudHJhbnNsYXRlWiA9IHR5cGVvZiB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVogPT09ICdvYmplY3QnID8gZnVuY3Rpb24oZWwsIGluZGV4KSB7XG5cdFx0XHRcdHJldHVybiByYW5kQXJyW2luZGV4XTtcblx0XHRcdH0gOiB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVo7XG5cdFx0fVxuXHRcdGlmKCB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVggIT0gdW5kZWZpbmVkICkge1xuXHRcdFx0YW5pbVByb3BzLnRyYW5zbGF0ZVggPSB0eXBlb2YgdGhpcy5vcHRpb25zLmFuaW1hdGlvbi50cmFuc2xhdGVYID09PSAnb2JqZWN0JyA/IGZ1bmN0aW9uKGVsLCBpbmRleCkge1xuXHRcdFx0XHRyZXR1cm4gYW5pbWUucmFuZG9tKHNlbGYub3B0aW9ucy5hbmltYXRpb24udHJhbnNsYXRlWC5taW4sIHNlbGYub3B0aW9ucy5hbmltYXRpb24udHJhbnNsYXRlWC5tYXgpO1xuXHRcdFx0fSA6IHRoaXMub3B0aW9ucy5hbmltYXRpb24udHJhbnNsYXRlWDtcblx0XHR9XG5cdFx0aWYoIHRoaXMub3B0aW9ucy5hbmltYXRpb24udHJhbnNsYXRlWSAhPSB1bmRlZmluZWQgKSB7XG5cdFx0XHRhbmltUHJvcHMudHJhbnNsYXRlWSA9IHR5cGVvZiB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uLnRyYW5zbGF0ZVkgPT09ICdvYmplY3QnID8gZnVuY3Rpb24oZWwsIGluZGV4KSB7XG5cdFx0XHRcdHJldHVybiBhbmltZS5yYW5kb20oc2VsZi5vcHRpb25zLmFuaW1hdGlvbi50cmFuc2xhdGVZLm1pbiwgc2VsZi5vcHRpb25zLmFuaW1hdGlvbi50cmFuc2xhdGVZLm1heCk7XG5cdFx0XHR9IDogdGhpcy5vcHRpb25zLmFuaW1hdGlvbi50cmFuc2xhdGVZO1xuXHRcdH1cblx0XHRpZiggdGhpcy5vcHRpb25zLmFuaW1hdGlvbi5vcGFjaXR5ICE9IHVuZGVmaW5lZCApIHtcblx0XHRcdGFuaW1Qcm9wcy5vcGFjaXR5ID0gdGhpcy5vcHRpb25zLmFuaW1hdGlvbi5vcGFjaXR5O1xuXHRcdH1cblxuXHRcdGFuaW1lKGFuaW1Qcm9wcyk7XG5cblx0XHQvLyBBbHNvIGFuaW1hdGUgdGhlIHNoYWRvdyBlbGVtZW50LlxuXHRcdGlmKCB0aGlzLm9wdGlvbnMuc2hhZG93cyAmJiBpc09iakVtcHR5KHRoaXMub3B0aW9ucy5zaGFkb3dzQW5pbWF0aW9uKSApIHtcblx0XHRcdGFuaW1lKGNvbGxlY3Qoe1xuXHRcdFx0XHR0YXJnZXRzOiB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3JBbGwoJy5zZWdtZW50ZXJfX3NoYWRvdycpLFxuXHRcdFx0XHRkdXJhdGlvbjogdGhpcy5vcHRpb25zLmFuaW1hdGlvbi5kdXJhdGlvbixcblx0XHRcdFx0ZGVsYXk6IGZ1bmN0aW9uKGVsLCBpbmRleCkgeyByZXR1cm4gKHNlbGYub3B0aW9ucy5waWVjZXMgLSBpbmRleCAtIDEpICogc2VsZi5vcHRpb25zLmFuaW1hdGlvbi5kZWxheTsgfSxcblx0XHRcdFx0ZWFzaW5nOiB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uLmVhc2luZ1xuXHRcdFx0fSwgdGhpcy5vcHRpb25zLnNoYWRvd3NBbmltYXRpb24pKTtcblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIEluaXQvQmluZCBldmVudHMuXG5cdCAqL1xuXHRTZWdtZW50ZXIucHJvdG90eXBlLl9pbml0RXZlbnRzID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdC8vIFdpbmRvdyByZXNpemUuXG5cdFx0dGhpcy5kZWJvdW5jZVJlc2l6ZSA9IGRlYm91bmNlKGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHR2YXIgcG9zaXRpb25zVG90YWwgPSBzZWxmLm9wdGlvbnMucG9zaXRpb25zLmxlbmd0aDtcblxuXHRcdFx0Ly8gUmVjYWxjdWxhdGUgZGltZW5zaW9ucy5cblx0XHRcdHNlbGYuZGltZW5zaW9ucyA9IHtcblx0XHRcdFx0d2lkdGg6IHNlbGYuZWwub2Zmc2V0V2lkdGgsXG5cdFx0XHRcdGhlaWdodDogc2VsZi5lbC5vZmZzZXRIZWlnaHRcblx0XHRcdH07XG5cblx0XHRcdC8vIFJlY2FsY3VsYXRlIGNsaXAgdmFsdWVzLi5cblx0XHRcdC8vIHRvZG86IERSWVxuXHRcdFx0Ly8gdG9kbzogSWYgcmFuZG9tIGlzIHRydWUgdGhlbiBzYXZlIHRoZSBpbml0aWFsIHZhbHVlcy4gU2hvdWxkIG5vdCByZWNhbGN1bGF0ZSBmb3IgdGhpcyBjYXNlLlxuXHRcdFx0c2VsZi5waWVjZXMuZm9yRWFjaChmdW5jdGlvbihwaWVjZSwgcG9zaXRpb24pIHtcblx0XHRcdFx0dmFyIGNsaXBUb3AsIGNsaXBMZWZ0LCBjbGlwUmlnaHQsIGNsaXBCb3R0b20sXG5cdFx0XHRcdFx0c2VnbWVudGVyUGllY2UgPSBwaWVjZS5xdWVyeVNlbGVjdG9yKCcuc2VnbWVudGVyX19waWVjZScpO1xuXG5cdFx0XHRcdGlmKCBzZWxmLm9wdGlvbnMucG9zaXRpb25zID09PSAncmFuZG9tJyApIHtcblx0XHRcdFx0XHR2YXIgcmFuZFQgPSBhbmltZS5yYW5kb20oMCwxMDApLCByYW5kTCA9IGFuaW1lLnJhbmRvbSgwLDEwMCksIHJhbmRXID0gYW5pbWUucmFuZG9tKDAsMTAwKSwgcmFuZEggPSBhbmltZS5yYW5kb20oMCwxMDApO1xuXHRcdFx0XHRcdGNsaXBUb3AgPSByYW5kVC8xMDAgKiBzZWxmLmRpbWVuc2lvbnMuaGVpZ2h0O1xuXHRcdFx0XHRcdGNsaXBMZWZ0ID0gcmFuZEwvMTAwICogc2VsZi5kaW1lbnNpb25zLndpZHRoO1xuXHRcdFx0XHRcdGNsaXBSaWdodCA9IHJhbmRXLzEwMCAqIHNlbGYuZGltZW5zaW9ucy53aWR0aCArIGNsaXBMZWZ0O1xuXHRcdFx0XHRcdGNsaXBCb3R0b20gPSByYW5kSC8xMDAgKiBzZWxmLmRpbWVuc2lvbnMuaGVpZ2h0ICsgY2xpcFRvcDtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHR2YXIgcG9zID0gcG9zaXRpb24gPD0gcG9zaXRpb25zVG90YWwgLSAxID8gcG9zaXRpb24gOiAwO1xuXHRcdFx0XHRcdGNsaXBUb3AgPSBzZWxmLm9wdGlvbnMucG9zaXRpb25zW3Bvc10udG9wLzEwMCAqIHNlbGYuZGltZW5zaW9ucy5oZWlnaHQ7XG5cdFx0XHRcdFx0Y2xpcExlZnQgPSBzZWxmLm9wdGlvbnMucG9zaXRpb25zW3Bvc10ubGVmdC8xMDAgKiBzZWxmLmRpbWVuc2lvbnMud2lkdGg7XG5cdFx0XHRcdFx0Y2xpcFJpZ2h0ID0gc2VsZi5vcHRpb25zLnBvc2l0aW9uc1twb3NdLndpZHRoLzEwMCAqIHNlbGYuZGltZW5zaW9ucy53aWR0aCArIGNsaXBMZWZ0O1xuXHRcdFx0XHRcdGNsaXBCb3R0b20gPSBzZWxmLm9wdGlvbnMucG9zaXRpb25zW3Bvc10uaGVpZ2h0LzEwMCAqIHNlbGYuZGltZW5zaW9ucy5oZWlnaHQgKyBjbGlwVG9wO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0c2VnbWVudGVyUGllY2Uuc3R5bGUuY2xpcCA9ICdyZWN0KCcgKyBjbGlwVG9wICsgJ3B4LCcgKyBjbGlwUmlnaHQgKyAncHgsJyArIGNsaXBCb3R0b20gKyAncHgsJyArIGNsaXBMZWZ0ICsgJ3B4KSc7XG5cdFx0XHR9KTtcblx0XHR9LCAxMCk7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMuZGVib3VuY2VSZXNpemUpO1xuXHRcdFxuXHRcdC8vIE1vdXNlbW92ZSBhbmQgRGV2aWNlb3JpZW50YXRpb246XG5cdFx0aWYoIHRoaXMub3B0aW9ucy5wYXJhbGxheCApIHtcblx0XHRcdHZhciBhcnJSYW5kID0gY3JlYXRlUmFuZEludE9yZGVyZWRBcnJheSh0aGlzLm9wdGlvbnMucGFyYWxsYXhNb3ZlbWVudC5taW4sIHRoaXMub3B0aW9ucy5wYXJhbGxheE1vdmVtZW50Lm1heCwgdGhpcy5vcHRpb25zLnBpZWNlcyk7XG5cdFx0XHR0aGlzLnBpZWNlcy5mb3JFYWNoKGZ1bmN0aW9uKHBpZWNlLCBwb3MpIHtcblx0XHRcdFx0cGllY2Uuc2V0QXR0cmlidXRlKCdkYXRhLXBhcmFsbGF4LXRyYW5zbGF0aW9uJywgdHlwZW9mIHNlbGYub3B0aW9ucy5wYXJhbGxheE1vdmVtZW50ID09PSAnb2JqZWN0JyA/IGFyclJhbmRbcG9zXSA6IHNlbGYub3B0aW9ucy5wYXJhbGxheE1vdmVtZW50ICk7XG5cdFx0XHR9KTtcblx0XHRcdHRoaXMubW91c2Vtb3ZlID0gZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0aWYoICFzZWxmLmFjdGl2ZSApIHtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHNlbGYucGllY2VzLmZvckVhY2goZnVuY3Rpb24ocGllY2UpIHtcblx0XHRcdFx0XHRcdHZhciB0ID0gcGllY2UuZ2V0QXR0cmlidXRlKCdkYXRhLXBhcmFsbGF4LXRyYW5zbGF0aW9uJyksXG5cdFx0XHRcdFx0XHRcdHRyYW5zWCA9IHQvKHNlbGYuZGltZW5zaW9ucy53aWR0aCkqZXYuY2xpZW50WCAtIHQvMixcblx0XHRcdFx0XHRcdFx0dHJhbnNZID0gdC8oc2VsZi5kaW1lbnNpb25zLmhlaWdodCkqZXYuY2xpZW50WSAtIHQvMjtcblxuXHRcdFx0XHRcdFx0cGllY2UucGFyZW50Tm9kZS5zdHlsZS50cmFuc2Zvcm0gPSBwaWVjZS5wYXJlbnROb2RlLnN0eWxlLldlYmtpdFRyYW5zZm9ybSA9ICd0cmFuc2xhdGUzZCgnICsgdHJhbnNYICsgJ3B4LCcgKyB0cmFuc1kgKyAncHgsMCknO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cdFx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5tb3VzZW1vdmUpO1xuXG5cdFx0XHR0aGlzLmhhbmRsZU9yaWVudGF0aW9uID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmKCAhc2VsZi5hY3RpdmUgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciB5ID0gZXZlbnQuZ2FtbWE7XG5cdFx0XHRcdC8vIFRvIG1ha2UgY29tcHV0YXRpb24gZWFzaWVyIHdlIHNoaWZ0IHRoZSByYW5nZSBvZiB4IGFuZCB5IHRvIFswLDE4MF1cblx0XHRcdFx0eSArPSA5MDtcblx0XHRcdFx0XG5cdFx0XHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzZWxmLnBpZWNlcy5mb3JFYWNoKGZ1bmN0aW9uKHBpZWNlKSB7XG5cdFx0XHRcdFx0XHR2YXIgdCA9IHBpZWNlLmdldEF0dHJpYnV0ZSgnZGF0YS1wYXJhbGxheC10cmFuc2xhdGlvbicpLFxuXHRcdFx0XHRcdFx0XHR0cmFuc1ggPSB0LyhzZWxmLmRpbWVuc2lvbnMud2lkdGgpKnkgLSB0LzIsXG5cdFx0XHRcdFx0XHRcdHRyYW5zWSA9IHQvKHNlbGYuZGltZW5zaW9ucy5oZWlnaHQpKnkgLSB0LzI7XG5cblx0XHRcdFx0XHRcdHBpZWNlLnBhcmVudE5vZGUuc3R5bGUudHJhbnNmb3JtID0gcGllY2UucGFyZW50Tm9kZS5zdHlsZS5XZWJraXRUcmFuc2Zvcm0gPSAndHJhbnNsYXRlM2QoJyArIHRyYW5zWCArICdweCwnICsgdHJhbnNZICsgJ3B4LDApJztcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZGV2aWNlb3JpZW50YXRpb24nLCB0aGlzLmhhbmRsZU9yaWVudGF0aW9uKTtcblx0XHR9XG5cdH07XG5cblx0d2luZG93LlNlZ21lbnRlciA9IFNlZ21lbnRlcjtcblxufSkod2luZG93KTsiXSwiZmlsZSI6Im1haW4tYW5pbWUuanMifQ==
