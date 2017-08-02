var VirtualScroll = (function(document) {

	var vs = {};

	var numListeners, listeners = [], initialized = false;

	var touchStartX, touchStartY;

	// [ These settings can be customized with the options() function below ]
	// Mutiply the touch action by two making the scroll a bit faster than finger movement
	var touchMult = 2;
	// Firefox on Windows needs a boost, since scrolling is very slow
	var firefoxMult = 15;
	// How many pixels to move with each key press
	var keyStep = 120;
	// General multiplier for all mousehweel including FF
	var mouseMult = 1;

	var bodyTouchAction;

	var hasWheelEvent = 'onwheel' in document;
	var hasMouseWheelEvent = 'onmousewheel' in document;
	var hasTouch = 'ontouchstart' in document;
	var hasTouchWin = navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 1;
	var hasPointer = !!window.navigator.msPointerEnabled;
	var hasKeyDown = 'onkeydown' in document;

	var isFirefox = navigator.userAgent.indexOf('Firefox') > -1;

	var event = {
		y: 0,
		x: 0,
		deltaX: 0,
		deltaY: 0,
		originalEvent: null
	};

	vs.on = function(f) {
		if(!initialized) initListeners(); 
		listeners.push(f);
		numListeners = listeners.length;
	}

	vs.options = function(opt) {
		keyStep = opt.keyStep || 120;
		firefoxMult = opt.firefoxMult || 15;
		touchMult = opt.touchMult || 2;
		mouseMult = opt.mouseMult || 1;
	}

	vs.off = function(f) {
		listeners.splice(f, 1);
		numListeners = listeners.length;
		if(numListeners <= 0) destroyListeners();
	}

	var notify = function(e) {
		event.x += event.deltaX;
		event.y += event.deltaY;
		event.originalEvent = e;

		for(var i = 0; i < numListeners; i++) {
			listeners[i](event);
		}
	}

	var onWheel = function(e) {
		// In Chrome and in Firefox (at least the new one)
		event.deltaX = e.wheelDeltaX || e.deltaX * -1;
		event.deltaY = e.wheelDeltaY || e.deltaY * -1;

		// for our purpose deltamode = 1 means user is on a wheel mouse, not touch pad 
		// real meaning: https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent#Delta_modes
		if(isFirefox && e.deltaMode == 1) {
			event.deltaX *= firefoxMult;
			event.deltaY *= firefoxMult;
		} 

		event.deltaX *= mouseMult;
		event.deltaY *= mouseMult;

		notify(e);
	}

	var onMouseWheel = function(e) {
		// In Safari, IE and in Chrome if 'wheel' isn't defined
		event.deltaX = (e.wheelDeltaX) ? e.wheelDeltaX : 0;
		event.deltaY = (e.wheelDeltaY) ? e.wheelDeltaY : e.wheelDelta;

		notify(e);	
	}

	var onTouchStart = function(e) {
		var t = (e.targetTouches) ? e.targetTouches[0] : e;
		touchStartX = t.pageX;	
		touchStartY = t.pageY;
	}

	var onTouchMove = function(e) {
		// e.preventDefault(); // < This needs to be managed externally
		var t = (e.targetTouches) ? e.targetTouches[0] : e;

		event.deltaX = (t.pageX - touchStartX) * touchMult;
		event.deltaY = (t.pageY - touchStartY) * touchMult;
		
		touchStartX = t.pageX;
		touchStartY = t.pageY;

		notify(e);
	}

	var onKeyDown = function(e) {
		// 37 left arrow, 38 up arrow, 39 right arrow, 40 down arrow
		event.deltaX = event.deltaY = 0;
		switch(e.keyCode) {
			case 37:
				event.deltaX = -keyStep;
				break;
			case 39:
				event.deltaX = keyStep;
				break;
			case 38:
				event.deltaY = keyStep;
				break;
			case 40:
				event.deltaY = -keyStep;
				break;
		}

		notify(e);
	}

	var initListeners = function() {
		if(hasWheelEvent) document.addEventListener("wheel", onWheel);
		if(hasMouseWheelEvent) document.addEventListener("mousewheel", onMouseWheel);

		if(hasTouch) {
			document.addEventListener("touchstart", onTouchStart);
			document.addEventListener("touchmove", onTouchMove);
		}
		
		if(hasPointer && hasTouchWin) {
			bodyTouchAction = document.body.style.msTouchAction;
			document.body.style.msTouchAction = "none";
			document.addEventListener("MSPointerDown", onTouchStart, true);
			document.addEventListener("MSPointerMove", onTouchMove, true);
		}

		if(hasKeyDown) document.addEventListener("keydown", onKeyDown);

		initialized = true;
	}

	var destroyListeners = function() {
		if(hasWheelEvent) document.removeEventListener("wheel", onWheel);
		if(hasMouseWheelEvent) document.removeEventListener("mousewheel", onMouseWheel);

		if(hasTouch) {
			document.removeEventListener("touchstart", onTouchStart);
			document.removeEventListener("touchmove", onTouchMove);
		}
		
		if(hasPointer && hasTouchWin) {
			document.body.style.msTouchAction = bodyTouchAction;
			document.removeEventListener("MSPointerDown", onTouchStart, true);
			document.removeEventListener("MSPointerMove", onTouchMove, true);
		}

		if(hasKeyDown) document.removeEventListener("keydown", onKeyDown);

		initialized = false;
	}

	return vs;
})(document);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJ2ZW5kb3IvVmlydHVhbFNjcm9sbC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgVmlydHVhbFNjcm9sbCA9IChmdW5jdGlvbihkb2N1bWVudCkge1xuXG5cdHZhciB2cyA9IHt9O1xuXG5cdHZhciBudW1MaXN0ZW5lcnMsIGxpc3RlbmVycyA9IFtdLCBpbml0aWFsaXplZCA9IGZhbHNlO1xuXG5cdHZhciB0b3VjaFN0YXJ0WCwgdG91Y2hTdGFydFk7XG5cblx0Ly8gWyBUaGVzZSBzZXR0aW5ncyBjYW4gYmUgY3VzdG9taXplZCB3aXRoIHRoZSBvcHRpb25zKCkgZnVuY3Rpb24gYmVsb3cgXVxuXHQvLyBNdXRpcGx5IHRoZSB0b3VjaCBhY3Rpb24gYnkgdHdvIG1ha2luZyB0aGUgc2Nyb2xsIGEgYml0IGZhc3RlciB0aGFuIGZpbmdlciBtb3ZlbWVudFxuXHR2YXIgdG91Y2hNdWx0ID0gMjtcblx0Ly8gRmlyZWZveCBvbiBXaW5kb3dzIG5lZWRzIGEgYm9vc3QsIHNpbmNlIHNjcm9sbGluZyBpcyB2ZXJ5IHNsb3dcblx0dmFyIGZpcmVmb3hNdWx0ID0gMTU7XG5cdC8vIEhvdyBtYW55IHBpeGVscyB0byBtb3ZlIHdpdGggZWFjaCBrZXkgcHJlc3Ncblx0dmFyIGtleVN0ZXAgPSAxMjA7XG5cdC8vIEdlbmVyYWwgbXVsdGlwbGllciBmb3IgYWxsIG1vdXNlaHdlZWwgaW5jbHVkaW5nIEZGXG5cdHZhciBtb3VzZU11bHQgPSAxO1xuXG5cdHZhciBib2R5VG91Y2hBY3Rpb247XG5cblx0dmFyIGhhc1doZWVsRXZlbnQgPSAnb253aGVlbCcgaW4gZG9jdW1lbnQ7XG5cdHZhciBoYXNNb3VzZVdoZWVsRXZlbnQgPSAnb25tb3VzZXdoZWVsJyBpbiBkb2N1bWVudDtcblx0dmFyIGhhc1RvdWNoID0gJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQ7XG5cdHZhciBoYXNUb3VjaFdpbiA9IG5hdmlnYXRvci5tc01heFRvdWNoUG9pbnRzICYmIG5hdmlnYXRvci5tc01heFRvdWNoUG9pbnRzID4gMTtcblx0dmFyIGhhc1BvaW50ZXIgPSAhIXdpbmRvdy5uYXZpZ2F0b3IubXNQb2ludGVyRW5hYmxlZDtcblx0dmFyIGhhc0tleURvd24gPSAnb25rZXlkb3duJyBpbiBkb2N1bWVudDtcblxuXHR2YXIgaXNGaXJlZm94ID0gbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCdGaXJlZm94JykgPiAtMTtcblxuXHR2YXIgZXZlbnQgPSB7XG5cdFx0eTogMCxcblx0XHR4OiAwLFxuXHRcdGRlbHRhWDogMCxcblx0XHRkZWx0YVk6IDAsXG5cdFx0b3JpZ2luYWxFdmVudDogbnVsbFxuXHR9O1xuXG5cdHZzLm9uID0gZnVuY3Rpb24oZikge1xuXHRcdGlmKCFpbml0aWFsaXplZCkgaW5pdExpc3RlbmVycygpOyBcblx0XHRsaXN0ZW5lcnMucHVzaChmKTtcblx0XHRudW1MaXN0ZW5lcnMgPSBsaXN0ZW5lcnMubGVuZ3RoO1xuXHR9XG5cblx0dnMub3B0aW9ucyA9IGZ1bmN0aW9uKG9wdCkge1xuXHRcdGtleVN0ZXAgPSBvcHQua2V5U3RlcCB8fCAxMjA7XG5cdFx0ZmlyZWZveE11bHQgPSBvcHQuZmlyZWZveE11bHQgfHwgMTU7XG5cdFx0dG91Y2hNdWx0ID0gb3B0LnRvdWNoTXVsdCB8fCAyO1xuXHRcdG1vdXNlTXVsdCA9IG9wdC5tb3VzZU11bHQgfHwgMTtcblx0fVxuXG5cdHZzLm9mZiA9IGZ1bmN0aW9uKGYpIHtcblx0XHRsaXN0ZW5lcnMuc3BsaWNlKGYsIDEpO1xuXHRcdG51bUxpc3RlbmVycyA9IGxpc3RlbmVycy5sZW5ndGg7XG5cdFx0aWYobnVtTGlzdGVuZXJzIDw9IDApIGRlc3Ryb3lMaXN0ZW5lcnMoKTtcblx0fVxuXG5cdHZhciBub3RpZnkgPSBmdW5jdGlvbihlKSB7XG5cdFx0ZXZlbnQueCArPSBldmVudC5kZWx0YVg7XG5cdFx0ZXZlbnQueSArPSBldmVudC5kZWx0YVk7XG5cdFx0ZXZlbnQub3JpZ2luYWxFdmVudCA9IGU7XG5cblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgbnVtTGlzdGVuZXJzOyBpKyspIHtcblx0XHRcdGxpc3RlbmVyc1tpXShldmVudCk7XG5cdFx0fVxuXHR9XG5cblx0dmFyIG9uV2hlZWwgPSBmdW5jdGlvbihlKSB7XG5cdFx0Ly8gSW4gQ2hyb21lIGFuZCBpbiBGaXJlZm94IChhdCBsZWFzdCB0aGUgbmV3IG9uZSlcblx0XHRldmVudC5kZWx0YVggPSBlLndoZWVsRGVsdGFYIHx8IGUuZGVsdGFYICogLTE7XG5cdFx0ZXZlbnQuZGVsdGFZID0gZS53aGVlbERlbHRhWSB8fCBlLmRlbHRhWSAqIC0xO1xuXG5cdFx0Ly8gZm9yIG91ciBwdXJwb3NlIGRlbHRhbW9kZSA9IDEgbWVhbnMgdXNlciBpcyBvbiBhIHdoZWVsIG1vdXNlLCBub3QgdG91Y2ggcGFkIFxuXHRcdC8vIHJlYWwgbWVhbmluZzogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL1doZWVsRXZlbnQjRGVsdGFfbW9kZXNcblx0XHRpZihpc0ZpcmVmb3ggJiYgZS5kZWx0YU1vZGUgPT0gMSkge1xuXHRcdFx0ZXZlbnQuZGVsdGFYICo9IGZpcmVmb3hNdWx0O1xuXHRcdFx0ZXZlbnQuZGVsdGFZICo9IGZpcmVmb3hNdWx0O1xuXHRcdH0gXG5cblx0XHRldmVudC5kZWx0YVggKj0gbW91c2VNdWx0O1xuXHRcdGV2ZW50LmRlbHRhWSAqPSBtb3VzZU11bHQ7XG5cblx0XHRub3RpZnkoZSk7XG5cdH1cblxuXHR2YXIgb25Nb3VzZVdoZWVsID0gZnVuY3Rpb24oZSkge1xuXHRcdC8vIEluIFNhZmFyaSwgSUUgYW5kIGluIENocm9tZSBpZiAnd2hlZWwnIGlzbid0IGRlZmluZWRcblx0XHRldmVudC5kZWx0YVggPSAoZS53aGVlbERlbHRhWCkgPyBlLndoZWVsRGVsdGFYIDogMDtcblx0XHRldmVudC5kZWx0YVkgPSAoZS53aGVlbERlbHRhWSkgPyBlLndoZWVsRGVsdGFZIDogZS53aGVlbERlbHRhO1xuXG5cdFx0bm90aWZ5KGUpO1x0XG5cdH1cblxuXHR2YXIgb25Ub3VjaFN0YXJ0ID0gZnVuY3Rpb24oZSkge1xuXHRcdHZhciB0ID0gKGUudGFyZ2V0VG91Y2hlcykgPyBlLnRhcmdldFRvdWNoZXNbMF0gOiBlO1xuXHRcdHRvdWNoU3RhcnRYID0gdC5wYWdlWDtcdFxuXHRcdHRvdWNoU3RhcnRZID0gdC5wYWdlWTtcblx0fVxuXG5cdHZhciBvblRvdWNoTW92ZSA9IGZ1bmN0aW9uKGUpIHtcblx0XHQvLyBlLnByZXZlbnREZWZhdWx0KCk7IC8vIDwgVGhpcyBuZWVkcyB0byBiZSBtYW5hZ2VkIGV4dGVybmFsbHlcblx0XHR2YXIgdCA9IChlLnRhcmdldFRvdWNoZXMpID8gZS50YXJnZXRUb3VjaGVzWzBdIDogZTtcblxuXHRcdGV2ZW50LmRlbHRhWCA9ICh0LnBhZ2VYIC0gdG91Y2hTdGFydFgpICogdG91Y2hNdWx0O1xuXHRcdGV2ZW50LmRlbHRhWSA9ICh0LnBhZ2VZIC0gdG91Y2hTdGFydFkpICogdG91Y2hNdWx0O1xuXHRcdFxuXHRcdHRvdWNoU3RhcnRYID0gdC5wYWdlWDtcblx0XHR0b3VjaFN0YXJ0WSA9IHQucGFnZVk7XG5cblx0XHRub3RpZnkoZSk7XG5cdH1cblxuXHR2YXIgb25LZXlEb3duID0gZnVuY3Rpb24oZSkge1xuXHRcdC8vIDM3IGxlZnQgYXJyb3csIDM4IHVwIGFycm93LCAzOSByaWdodCBhcnJvdywgNDAgZG93biBhcnJvd1xuXHRcdGV2ZW50LmRlbHRhWCA9IGV2ZW50LmRlbHRhWSA9IDA7XG5cdFx0c3dpdGNoKGUua2V5Q29kZSkge1xuXHRcdFx0Y2FzZSAzNzpcblx0XHRcdFx0ZXZlbnQuZGVsdGFYID0gLWtleVN0ZXA7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAzOTpcblx0XHRcdFx0ZXZlbnQuZGVsdGFYID0ga2V5U3RlcDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDM4OlxuXHRcdFx0XHRldmVudC5kZWx0YVkgPSBrZXlTdGVwO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgNDA6XG5cdFx0XHRcdGV2ZW50LmRlbHRhWSA9IC1rZXlTdGVwO1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cblx0XHRub3RpZnkoZSk7XG5cdH1cblxuXHR2YXIgaW5pdExpc3RlbmVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdGlmKGhhc1doZWVsRXZlbnQpIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCBvbldoZWVsKTtcblx0XHRpZihoYXNNb3VzZVdoZWVsRXZlbnQpIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXdoZWVsXCIsIG9uTW91c2VXaGVlbCk7XG5cblx0XHRpZihoYXNUb3VjaCkge1xuXHRcdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNoc3RhcnRcIiwgb25Ub3VjaFN0YXJ0KTtcblx0XHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaG1vdmVcIiwgb25Ub3VjaE1vdmUpO1xuXHRcdH1cblx0XHRcblx0XHRpZihoYXNQb2ludGVyICYmIGhhc1RvdWNoV2luKSB7XG5cdFx0XHRib2R5VG91Y2hBY3Rpb24gPSBkb2N1bWVudC5ib2R5LnN0eWxlLm1zVG91Y2hBY3Rpb247XG5cdFx0XHRkb2N1bWVudC5ib2R5LnN0eWxlLm1zVG91Y2hBY3Rpb24gPSBcIm5vbmVcIjtcblx0XHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJNU1BvaW50ZXJEb3duXCIsIG9uVG91Y2hTdGFydCwgdHJ1ZSk7XG5cdFx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiTVNQb2ludGVyTW92ZVwiLCBvblRvdWNoTW92ZSwgdHJ1ZSk7XG5cdFx0fVxuXG5cdFx0aWYoaGFzS2V5RG93bikgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgb25LZXlEb3duKTtcblxuXHRcdGluaXRpYWxpemVkID0gdHJ1ZTtcblx0fVxuXG5cdHZhciBkZXN0cm95TGlzdGVuZXJzID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYoaGFzV2hlZWxFdmVudCkgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIndoZWVsXCIsIG9uV2hlZWwpO1xuXHRcdGlmKGhhc01vdXNlV2hlZWxFdmVudCkgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNld2hlZWxcIiwgb25Nb3VzZVdoZWVsKTtcblxuXHRcdGlmKGhhc1RvdWNoKSB7XG5cdFx0XHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwidG91Y2hzdGFydFwiLCBvblRvdWNoU3RhcnQpO1xuXHRcdFx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInRvdWNobW92ZVwiLCBvblRvdWNoTW92ZSk7XG5cdFx0fVxuXHRcdFxuXHRcdGlmKGhhc1BvaW50ZXIgJiYgaGFzVG91Y2hXaW4pIHtcblx0XHRcdGRvY3VtZW50LmJvZHkuc3R5bGUubXNUb3VjaEFjdGlvbiA9IGJvZHlUb3VjaEFjdGlvbjtcblx0XHRcdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJNU1BvaW50ZXJEb3duXCIsIG9uVG91Y2hTdGFydCwgdHJ1ZSk7XG5cdFx0XHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwiTVNQb2ludGVyTW92ZVwiLCBvblRvdWNoTW92ZSwgdHJ1ZSk7XG5cdFx0fVxuXG5cdFx0aWYoaGFzS2V5RG93bikgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgb25LZXlEb3duKTtcblxuXHRcdGluaXRpYWxpemVkID0gZmFsc2U7XG5cdH1cblxuXHRyZXR1cm4gdnM7XG59KShkb2N1bWVudCk7Il0sImZpbGUiOiJ2ZW5kb3IvVmlydHVhbFNjcm9sbC5qcyJ9
