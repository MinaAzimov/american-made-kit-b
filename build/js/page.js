var gallery;
var galleryOpened = false;
var galleryLoaded = false;

var openPhotoSwipe = function() {
	var pswpElement = document.querySelectorAll('.pswp')[0];

	var items = [
	{
		mediumImage: {
			src: 'img/_gallery/gallery_2_sm.jpg',
			w: 1200,
			h: 815
		},
		originalImage: {
			src: 'img/_gallery/gallery_2.jpg',
			w: 2000,
			h: 1358
		}
	},
	{
		mediumImage: {
			src: 'img/_gallery/gallery_1_sm.jpg',
			w: 1000,
			h: 655
		},
		originalImage: {
			src: 'img/_gallery/gallery_1.jpg',
			w: 2100,
			h: 1373
		}
	},
	{
		mediumImage: {
			src: 'img/_gallery/gallery_3_sm.jpg',
			w: 1200,
			h: 727
		},
		originalImage: {
			src: 'img/_gallery/gallery_3.jpg',
			w: 2200,
			h: 1333
		}
	},
	{
		mediumImage: {
			src: 'img/_gallery/gallery_4_sm.jpg',
			w: 848,
			h: 1000
		},
		originalImage: {
			src: 'img/_gallery/gallery_4.jpg',
			w: 1695,
			h: 2000
		}
	},
	{
		mediumImage: {
			src: 'img/_gallery/gallery_5_sm.jpg',
			w: 848,
			h: 1000
		},
		originalImage: {
			src: 'img/_gallery/gallery_5.jpg',
			w: 1264,
			h: 2000
		}
	}
	];

	var options = {
		history: false,
		focus: false,
		zoomEl: false,
		loop: false,
		modal: false,
		tapToClose: false,
		timeToIdle: 99999,
		timeToIdleOutside: 99999,
		barsSize: {top:0, bottom:0}, 
		pinchToClose: false,
		arrowKeys: false,
		escKey: false,
		closeOnScroll: false,
		closeOnVerticalDrag: false,
		showAnimationDuration: 0,
		hideAnimationDuration: 0

	};

	gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, options);

	var realViewportWidth,
	useLargeImages = false,
	firstResize = true,
	imageSrcWillChange;

	gallery.listen('beforeResize', function() {


		realViewportWidth = gallery.viewportSize.x * window.devicePixelRatio;


		if(useLargeImages && realViewportWidth < 1000) {
			useLargeImages = false;
			imageSrcWillChange = true;
		} else if(!useLargeImages && realViewportWidth >= 1000) {
			useLargeImages = true;
			imageSrcWillChange = true;
		}

		if(imageSrcWillChange && !firstResize) {

			gallery.invalidateCurrItems();
		}

		if(firstResize) {
			firstResize = false;
		}

		imageSrcWillChange = false;

	});

	gallery.listen('afterChange', function() {
		$('.gallery-button--left, .gallery-button--right').removeClass('disabled');

		if (gallery.getCurrentIndex() == 0) {
			$('.gallery-button--left').addClass('disabled');
		}
		if (gallery.getCurrentIndex() == (gallery.options.getNumItemsFn() - 1)) {
			$('.gallery-button--right').addClass('disabled');
		}
	});

	gallery.listen('imageLoadComplete', function(index, item) { 
		if (!galleryLoaded) {
			setTimeout(function() {
				$('.gallery-button--close').addClass('open');
				galleryLoaded = true;
			}, 300);
		}

	});

	$('.gallery-button--left').click(function(){
		if (!$(this).hasClass('disabled')) {
			gallery.prev();	
		} else {
			event.stopPropagation();
		}
	}); 

	$('.gallery-button--right').click(function() {
		if (!$(this).hasClass('disabled')) {
			gallery.next();
		}
		else {
			event.stopPropagation();
		}
	}); 


	gallery.listen('gettingData', function(index, item) {

		if( useLargeImages ) {
			item.src = item.originalImage.src;
			item.w = item.originalImage.w;
			item.h = item.originalImage.h;
		} else {
			item.src = item.mediumImage.src;
			item.w = item.mediumImage.w;
			item.h = item.mediumImage.h;
		}

	});
	gallery.init();
};

$('.gallery-image-grid-item').click(function(event){ 
	$("#gallery-wrapper").addClass('page-wrapper--open');
	$("body").css("overflow", "hidden");

	var index = event.currentTarget.id.split('-').pop();

	if (galleryOpened) {
		gallery.goTo(index - 1);
	}

	if (!galleryOpened) {
		setTimeout(function() {
			openPhotoSwipe();
			gallery.goTo(index - 1);
		}, 1200);
		galleryOpened = true;
	}

});

$('.gallery-button--close').click(function(){ 
	$("#gallery-wrapper").removeClass('page-wrapper--open');
	$("body").css("overflow", "visible");
	setTimeout(function() {
		gallery.goTo(0);
	}, 1200);
});

$('.button-item--legal').click(function(){ 
	$("#footer-wrapper").addClass('page-wrapper--open');
});

$('#footerClose').click(function(){ 
	$("#footer-wrapper").removeClass('page-wrapper--open');
});

$('#tickets').mouseenter(function(){ 
	$("#plane-image").css({'transform': 'rotate(-35deg)'});
});

$('#tickets').mouseleave(function(){ 
	$("#plane-image").css({'transform': 'rotate(0deg)'});
});

$('#trailer').mouseenter(function(){ 
	$("#plane-image").css({'transform': 'rotate(35deg)'});
});

$('#trailer').mouseleave(function(){ 
	$("#plane-image").css({'transform': 'rotate(0deg)'});
});


$('#map-expand').click(function(event){ 
	$("#map-wrapper").addClass('map-page-wrapper--open');
	$("body").css("overflow", "hidden");
	$("#map-image").attr('src', 'img/map-code.svg');




});

$('.map-button--close').click(function(){ 
	$("#map-wrapper").removeClass('map-page-wrapper--open');
	$("body").css("overflow", "visible");
	$("#map-image").attr('src', '');
	preventDefault();

	
});


// document.body.addEventListener("touchmove", function(event) {
// 	event.preventDefault();
// 	event.stopPropagation();
// }, false);
//#
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJwYWdlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbInZhciBnYWxsZXJ5O1xudmFyIGdhbGxlcnlPcGVuZWQgPSBmYWxzZTtcbnZhciBnYWxsZXJ5TG9hZGVkID0gZmFsc2U7XG5cbnZhciBvcGVuUGhvdG9Td2lwZSA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgcHN3cEVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucHN3cCcpWzBdO1xuXG5cdHZhciBpdGVtcyA9IFtcblx0e1xuXHRcdG1lZGl1bUltYWdlOiB7XG5cdFx0XHRzcmM6ICdpbWcvX2dhbGxlcnkvZ2FsbGVyeV8yX3NtLmpwZycsXG5cdFx0XHR3OiAxMjAwLFxuXHRcdFx0aDogODE1XG5cdFx0fSxcblx0XHRvcmlnaW5hbEltYWdlOiB7XG5cdFx0XHRzcmM6ICdpbWcvX2dhbGxlcnkvZ2FsbGVyeV8yLmpwZycsXG5cdFx0XHR3OiAyMDAwLFxuXHRcdFx0aDogMTM1OFxuXHRcdH1cblx0fSxcblx0e1xuXHRcdG1lZGl1bUltYWdlOiB7XG5cdFx0XHRzcmM6ICdpbWcvX2dhbGxlcnkvZ2FsbGVyeV8xX3NtLmpwZycsXG5cdFx0XHR3OiAxMDAwLFxuXHRcdFx0aDogNjU1XG5cdFx0fSxcblx0XHRvcmlnaW5hbEltYWdlOiB7XG5cdFx0XHRzcmM6ICdpbWcvX2dhbGxlcnkvZ2FsbGVyeV8xLmpwZycsXG5cdFx0XHR3OiAyMTAwLFxuXHRcdFx0aDogMTM3M1xuXHRcdH1cblx0fSxcblx0e1xuXHRcdG1lZGl1bUltYWdlOiB7XG5cdFx0XHRzcmM6ICdpbWcvX2dhbGxlcnkvZ2FsbGVyeV8zX3NtLmpwZycsXG5cdFx0XHR3OiAxMjAwLFxuXHRcdFx0aDogNzI3XG5cdFx0fSxcblx0XHRvcmlnaW5hbEltYWdlOiB7XG5cdFx0XHRzcmM6ICdpbWcvX2dhbGxlcnkvZ2FsbGVyeV8zLmpwZycsXG5cdFx0XHR3OiAyMjAwLFxuXHRcdFx0aDogMTMzM1xuXHRcdH1cblx0fSxcblx0e1xuXHRcdG1lZGl1bUltYWdlOiB7XG5cdFx0XHRzcmM6ICdpbWcvX2dhbGxlcnkvZ2FsbGVyeV80X3NtLmpwZycsXG5cdFx0XHR3OiA4NDgsXG5cdFx0XHRoOiAxMDAwXG5cdFx0fSxcblx0XHRvcmlnaW5hbEltYWdlOiB7XG5cdFx0XHRzcmM6ICdpbWcvX2dhbGxlcnkvZ2FsbGVyeV80LmpwZycsXG5cdFx0XHR3OiAxNjk1LFxuXHRcdFx0aDogMjAwMFxuXHRcdH1cblx0fSxcblx0e1xuXHRcdG1lZGl1bUltYWdlOiB7XG5cdFx0XHRzcmM6ICdpbWcvX2dhbGxlcnkvZ2FsbGVyeV81X3NtLmpwZycsXG5cdFx0XHR3OiA4NDgsXG5cdFx0XHRoOiAxMDAwXG5cdFx0fSxcblx0XHRvcmlnaW5hbEltYWdlOiB7XG5cdFx0XHRzcmM6ICdpbWcvX2dhbGxlcnkvZ2FsbGVyeV81LmpwZycsXG5cdFx0XHR3OiAxMjY0LFxuXHRcdFx0aDogMjAwMFxuXHRcdH1cblx0fVxuXHRdO1xuXG5cdHZhciBvcHRpb25zID0ge1xuXHRcdGhpc3Rvcnk6IGZhbHNlLFxuXHRcdGZvY3VzOiBmYWxzZSxcblx0XHR6b29tRWw6IGZhbHNlLFxuXHRcdGxvb3A6IGZhbHNlLFxuXHRcdG1vZGFsOiBmYWxzZSxcblx0XHR0YXBUb0Nsb3NlOiBmYWxzZSxcblx0XHR0aW1lVG9JZGxlOiA5OTk5OSxcblx0XHR0aW1lVG9JZGxlT3V0c2lkZTogOTk5OTksXG5cdFx0YmFyc1NpemU6IHt0b3A6MCwgYm90dG9tOjB9LCBcblx0XHRwaW5jaFRvQ2xvc2U6IGZhbHNlLFxuXHRcdGFycm93S2V5czogZmFsc2UsXG5cdFx0ZXNjS2V5OiBmYWxzZSxcblx0XHRjbG9zZU9uU2Nyb2xsOiBmYWxzZSxcblx0XHRjbG9zZU9uVmVydGljYWxEcmFnOiBmYWxzZSxcblx0XHRzaG93QW5pbWF0aW9uRHVyYXRpb246IDAsXG5cdFx0aGlkZUFuaW1hdGlvbkR1cmF0aW9uOiAwXG5cblx0fTtcblxuXHRnYWxsZXJ5ID0gbmV3IFBob3RvU3dpcGUocHN3cEVsZW1lbnQsIFBob3RvU3dpcGVVSV9EZWZhdWx0LCBpdGVtcywgb3B0aW9ucyk7XG5cblx0dmFyIHJlYWxWaWV3cG9ydFdpZHRoLFxuXHR1c2VMYXJnZUltYWdlcyA9IGZhbHNlLFxuXHRmaXJzdFJlc2l6ZSA9IHRydWUsXG5cdGltYWdlU3JjV2lsbENoYW5nZTtcblxuXHRnYWxsZXJ5Lmxpc3RlbignYmVmb3JlUmVzaXplJywgZnVuY3Rpb24oKSB7XG5cblxuXHRcdHJlYWxWaWV3cG9ydFdpZHRoID0gZ2FsbGVyeS52aWV3cG9ydFNpemUueCAqIHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xuXG5cblx0XHRpZih1c2VMYXJnZUltYWdlcyAmJiByZWFsVmlld3BvcnRXaWR0aCA8IDEwMDApIHtcblx0XHRcdHVzZUxhcmdlSW1hZ2VzID0gZmFsc2U7XG5cdFx0XHRpbWFnZVNyY1dpbGxDaGFuZ2UgPSB0cnVlO1xuXHRcdH0gZWxzZSBpZighdXNlTGFyZ2VJbWFnZXMgJiYgcmVhbFZpZXdwb3J0V2lkdGggPj0gMTAwMCkge1xuXHRcdFx0dXNlTGFyZ2VJbWFnZXMgPSB0cnVlO1xuXHRcdFx0aW1hZ2VTcmNXaWxsQ2hhbmdlID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZihpbWFnZVNyY1dpbGxDaGFuZ2UgJiYgIWZpcnN0UmVzaXplKSB7XG5cblx0XHRcdGdhbGxlcnkuaW52YWxpZGF0ZUN1cnJJdGVtcygpO1xuXHRcdH1cblxuXHRcdGlmKGZpcnN0UmVzaXplKSB7XG5cdFx0XHRmaXJzdFJlc2l6ZSA9IGZhbHNlO1xuXHRcdH1cblxuXHRcdGltYWdlU3JjV2lsbENoYW5nZSA9IGZhbHNlO1xuXG5cdH0pO1xuXG5cdGdhbGxlcnkubGlzdGVuKCdhZnRlckNoYW5nZScsIGZ1bmN0aW9uKCkge1xuXHRcdCQoJy5nYWxsZXJ5LWJ1dHRvbi0tbGVmdCwgLmdhbGxlcnktYnV0dG9uLS1yaWdodCcpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXG5cdFx0aWYgKGdhbGxlcnkuZ2V0Q3VycmVudEluZGV4KCkgPT0gMCkge1xuXHRcdFx0JCgnLmdhbGxlcnktYnV0dG9uLS1sZWZ0JykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fVxuXHRcdGlmIChnYWxsZXJ5LmdldEN1cnJlbnRJbmRleCgpID09IChnYWxsZXJ5Lm9wdGlvbnMuZ2V0TnVtSXRlbXNGbigpIC0gMSkpIHtcblx0XHRcdCQoJy5nYWxsZXJ5LWJ1dHRvbi0tcmlnaHQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9XG5cdH0pO1xuXG5cdGdhbGxlcnkubGlzdGVuKCdpbWFnZUxvYWRDb21wbGV0ZScsIGZ1bmN0aW9uKGluZGV4LCBpdGVtKSB7IFxuXHRcdGlmICghZ2FsbGVyeUxvYWRlZCkge1xuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0JCgnLmdhbGxlcnktYnV0dG9uLS1jbG9zZScpLmFkZENsYXNzKCdvcGVuJyk7XG5cdFx0XHRcdGdhbGxlcnlMb2FkZWQgPSB0cnVlO1xuXHRcdFx0fSwgMzAwKTtcblx0XHR9XG5cblx0fSk7XG5cblx0JCgnLmdhbGxlcnktYnV0dG9uLS1sZWZ0JykuY2xpY2soZnVuY3Rpb24oKXtcblx0XHRpZiAoISQodGhpcykuaGFzQ2xhc3MoJ2Rpc2FibGVkJykpIHtcblx0XHRcdGdhbGxlcnkucHJldigpO1x0XG5cdFx0fSBlbHNlIHtcblx0XHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdH1cblx0fSk7IFxuXG5cdCQoJy5nYWxsZXJ5LWJ1dHRvbi0tcmlnaHQnKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRpZiAoISQodGhpcykuaGFzQ2xhc3MoJ2Rpc2FibGVkJykpIHtcblx0XHRcdGdhbGxlcnkubmV4dCgpO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdH1cblx0fSk7IFxuXG5cblx0Z2FsbGVyeS5saXN0ZW4oJ2dldHRpbmdEYXRhJywgZnVuY3Rpb24oaW5kZXgsIGl0ZW0pIHtcblxuXHRcdGlmKCB1c2VMYXJnZUltYWdlcyApIHtcblx0XHRcdGl0ZW0uc3JjID0gaXRlbS5vcmlnaW5hbEltYWdlLnNyYztcblx0XHRcdGl0ZW0udyA9IGl0ZW0ub3JpZ2luYWxJbWFnZS53O1xuXHRcdFx0aXRlbS5oID0gaXRlbS5vcmlnaW5hbEltYWdlLmg7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGl0ZW0uc3JjID0gaXRlbS5tZWRpdW1JbWFnZS5zcmM7XG5cdFx0XHRpdGVtLncgPSBpdGVtLm1lZGl1bUltYWdlLnc7XG5cdFx0XHRpdGVtLmggPSBpdGVtLm1lZGl1bUltYWdlLmg7XG5cdFx0fVxuXG5cdH0pO1xuXHRnYWxsZXJ5LmluaXQoKTtcbn07XG5cbiQoJy5nYWxsZXJ5LWltYWdlLWdyaWQtaXRlbScpLmNsaWNrKGZ1bmN0aW9uKGV2ZW50KXsgXG5cdCQoXCIjZ2FsbGVyeS13cmFwcGVyXCIpLmFkZENsYXNzKCdwYWdlLXdyYXBwZXItLW9wZW4nKTtcblx0JChcImJvZHlcIikuY3NzKFwib3ZlcmZsb3dcIiwgXCJoaWRkZW5cIik7XG5cblx0dmFyIGluZGV4ID0gZXZlbnQuY3VycmVudFRhcmdldC5pZC5zcGxpdCgnLScpLnBvcCgpO1xuXG5cdGlmIChnYWxsZXJ5T3BlbmVkKSB7XG5cdFx0Z2FsbGVyeS5nb1RvKGluZGV4IC0gMSk7XG5cdH1cblxuXHRpZiAoIWdhbGxlcnlPcGVuZWQpIHtcblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0b3BlblBob3RvU3dpcGUoKTtcblx0XHRcdGdhbGxlcnkuZ29UbyhpbmRleCAtIDEpO1xuXHRcdH0sIDEyMDApO1xuXHRcdGdhbGxlcnlPcGVuZWQgPSB0cnVlO1xuXHR9XG5cbn0pO1xuXG4kKCcuZ2FsbGVyeS1idXR0b24tLWNsb3NlJykuY2xpY2soZnVuY3Rpb24oKXsgXG5cdCQoXCIjZ2FsbGVyeS13cmFwcGVyXCIpLnJlbW92ZUNsYXNzKCdwYWdlLXdyYXBwZXItLW9wZW4nKTtcblx0JChcImJvZHlcIikuY3NzKFwib3ZlcmZsb3dcIiwgXCJ2aXNpYmxlXCIpO1xuXHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdGdhbGxlcnkuZ29UbygwKTtcblx0fSwgMTIwMCk7XG59KTtcblxuJCgnLmJ1dHRvbi1pdGVtLS1sZWdhbCcpLmNsaWNrKGZ1bmN0aW9uKCl7IFxuXHQkKFwiI2Zvb3Rlci13cmFwcGVyXCIpLmFkZENsYXNzKCdwYWdlLXdyYXBwZXItLW9wZW4nKTtcbn0pO1xuXG4kKCcjZm9vdGVyQ2xvc2UnKS5jbGljayhmdW5jdGlvbigpeyBcblx0JChcIiNmb290ZXItd3JhcHBlclwiKS5yZW1vdmVDbGFzcygncGFnZS13cmFwcGVyLS1vcGVuJyk7XG59KTtcblxuJCgnI3RpY2tldHMnKS5tb3VzZWVudGVyKGZ1bmN0aW9uKCl7IFxuXHQkKFwiI3BsYW5lLWltYWdlXCIpLmNzcyh7J3RyYW5zZm9ybSc6ICdyb3RhdGUoLTM1ZGVnKSd9KTtcbn0pO1xuXG4kKCcjdGlja2V0cycpLm1vdXNlbGVhdmUoZnVuY3Rpb24oKXsgXG5cdCQoXCIjcGxhbmUtaW1hZ2VcIikuY3NzKHsndHJhbnNmb3JtJzogJ3JvdGF0ZSgwZGVnKSd9KTtcbn0pO1xuXG4kKCcjdHJhaWxlcicpLm1vdXNlZW50ZXIoZnVuY3Rpb24oKXsgXG5cdCQoXCIjcGxhbmUtaW1hZ2VcIikuY3NzKHsndHJhbnNmb3JtJzogJ3JvdGF0ZSgzNWRlZyknfSk7XG59KTtcblxuJCgnI3RyYWlsZXInKS5tb3VzZWxlYXZlKGZ1bmN0aW9uKCl7IFxuXHQkKFwiI3BsYW5lLWltYWdlXCIpLmNzcyh7J3RyYW5zZm9ybSc6ICdyb3RhdGUoMGRlZyknfSk7XG59KTtcblxuXG4kKCcjbWFwLWV4cGFuZCcpLmNsaWNrKGZ1bmN0aW9uKGV2ZW50KXsgXG5cdCQoXCIjbWFwLXdyYXBwZXJcIikuYWRkQ2xhc3MoJ21hcC1wYWdlLXdyYXBwZXItLW9wZW4nKTtcblx0JChcImJvZHlcIikuY3NzKFwib3ZlcmZsb3dcIiwgXCJoaWRkZW5cIik7XG5cdCQoXCIjbWFwLWltYWdlXCIpLmF0dHIoJ3NyYycsICdpbWcvbWFwLWNvZGUuc3ZnJyk7XG5cblxuXG5cbn0pO1xuXG4kKCcubWFwLWJ1dHRvbi0tY2xvc2UnKS5jbGljayhmdW5jdGlvbigpeyBcblx0JChcIiNtYXAtd3JhcHBlclwiKS5yZW1vdmVDbGFzcygnbWFwLXBhZ2Utd3JhcHBlci0tb3BlbicpO1xuXHQkKFwiYm9keVwiKS5jc3MoXCJvdmVyZmxvd1wiLCBcInZpc2libGVcIik7XG5cdCQoXCIjbWFwLWltYWdlXCIpLmF0dHIoJ3NyYycsICcnKTtcblx0cHJldmVudERlZmF1bHQoKTtcblxuXHRcbn0pO1xuXG5cbi8vIGRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNobW92ZVwiLCBmdW5jdGlvbihldmVudCkge1xuLy8gXHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuLy8gXHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbi8vIH0sIGZhbHNlKTtcbi8vIyJdLCJmaWxlIjoicGFnZS5qcyJ9
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJwYWdlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbInZhciBnYWxsZXJ5O1xudmFyIGdhbGxlcnlPcGVuZWQgPSBmYWxzZTtcbnZhciBnYWxsZXJ5TG9hZGVkID0gZmFsc2U7XG5cbnZhciBvcGVuUGhvdG9Td2lwZSA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgcHN3cEVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucHN3cCcpWzBdO1xuXG5cdHZhciBpdGVtcyA9IFtcblx0e1xuXHRcdG1lZGl1bUltYWdlOiB7XG5cdFx0XHRzcmM6ICdpbWcvX2dhbGxlcnkvZ2FsbGVyeV8yX3NtLmpwZycsXG5cdFx0XHR3OiAxMjAwLFxuXHRcdFx0aDogODE1XG5cdFx0fSxcblx0XHRvcmlnaW5hbEltYWdlOiB7XG5cdFx0XHRzcmM6ICdpbWcvX2dhbGxlcnkvZ2FsbGVyeV8yLmpwZycsXG5cdFx0XHR3OiAyMDAwLFxuXHRcdFx0aDogMTM1OFxuXHRcdH1cblx0fSxcblx0e1xuXHRcdG1lZGl1bUltYWdlOiB7XG5cdFx0XHRzcmM6ICdpbWcvX2dhbGxlcnkvZ2FsbGVyeV8xX3NtLmpwZycsXG5cdFx0XHR3OiAxMDAwLFxuXHRcdFx0aDogNjU1XG5cdFx0fSxcblx0XHRvcmlnaW5hbEltYWdlOiB7XG5cdFx0XHRzcmM6ICdpbWcvX2dhbGxlcnkvZ2FsbGVyeV8xLmpwZycsXG5cdFx0XHR3OiAyMTAwLFxuXHRcdFx0aDogMTM3M1xuXHRcdH1cblx0fSxcblx0e1xuXHRcdG1lZGl1bUltYWdlOiB7XG5cdFx0XHRzcmM6ICdpbWcvX2dhbGxlcnkvZ2FsbGVyeV8zX3NtLmpwZycsXG5cdFx0XHR3OiAxMjAwLFxuXHRcdFx0aDogNzI3XG5cdFx0fSxcblx0XHRvcmlnaW5hbEltYWdlOiB7XG5cdFx0XHRzcmM6ICdpbWcvX2dhbGxlcnkvZ2FsbGVyeV8zLmpwZycsXG5cdFx0XHR3OiAyMjAwLFxuXHRcdFx0aDogMTMzM1xuXHRcdH1cblx0fSxcblx0e1xuXHRcdG1lZGl1bUltYWdlOiB7XG5cdFx0XHRzcmM6ICdpbWcvX2dhbGxlcnkvZ2FsbGVyeV80X3NtLmpwZycsXG5cdFx0XHR3OiA4NDgsXG5cdFx0XHRoOiAxMDAwXG5cdFx0fSxcblx0XHRvcmlnaW5hbEltYWdlOiB7XG5cdFx0XHRzcmM6ICdpbWcvX2dhbGxlcnkvZ2FsbGVyeV80LmpwZycsXG5cdFx0XHR3OiAxNjk1LFxuXHRcdFx0aDogMjAwMFxuXHRcdH1cblx0fSxcblx0e1xuXHRcdG1lZGl1bUltYWdlOiB7XG5cdFx0XHRzcmM6ICdpbWcvX2dhbGxlcnkvZ2FsbGVyeV81X3NtLmpwZycsXG5cdFx0XHR3OiA4NDgsXG5cdFx0XHRoOiAxMDAwXG5cdFx0fSxcblx0XHRvcmlnaW5hbEltYWdlOiB7XG5cdFx0XHRzcmM6ICdpbWcvX2dhbGxlcnkvZ2FsbGVyeV81LmpwZycsXG5cdFx0XHR3OiAxMjY0LFxuXHRcdFx0aDogMjAwMFxuXHRcdH1cblx0fVxuXHRdO1xuXG5cdHZhciBvcHRpb25zID0ge1xuXHRcdGhpc3Rvcnk6IGZhbHNlLFxuXHRcdGZvY3VzOiBmYWxzZSxcblx0XHR6b29tRWw6IGZhbHNlLFxuXHRcdGxvb3A6IGZhbHNlLFxuXHRcdG1vZGFsOiBmYWxzZSxcblx0XHR0YXBUb0Nsb3NlOiBmYWxzZSxcblx0XHR0aW1lVG9JZGxlOiA5OTk5OSxcblx0XHR0aW1lVG9JZGxlT3V0c2lkZTogOTk5OTksXG5cdFx0YmFyc1NpemU6IHt0b3A6MCwgYm90dG9tOjB9LCBcblx0XHRwaW5jaFRvQ2xvc2U6IGZhbHNlLFxuXHRcdGFycm93S2V5czogZmFsc2UsXG5cdFx0ZXNjS2V5OiBmYWxzZSxcblx0XHRjbG9zZU9uU2Nyb2xsOiBmYWxzZSxcblx0XHRjbG9zZU9uVmVydGljYWxEcmFnOiBmYWxzZSxcblx0XHRzaG93QW5pbWF0aW9uRHVyYXRpb246IDAsXG5cdFx0aGlkZUFuaW1hdGlvbkR1cmF0aW9uOiAwXG5cblx0fTtcblxuXHRnYWxsZXJ5ID0gbmV3IFBob3RvU3dpcGUocHN3cEVsZW1lbnQsIFBob3RvU3dpcGVVSV9EZWZhdWx0LCBpdGVtcywgb3B0aW9ucyk7XG5cblx0dmFyIHJlYWxWaWV3cG9ydFdpZHRoLFxuXHR1c2VMYXJnZUltYWdlcyA9IGZhbHNlLFxuXHRmaXJzdFJlc2l6ZSA9IHRydWUsXG5cdGltYWdlU3JjV2lsbENoYW5nZTtcblxuXHRnYWxsZXJ5Lmxpc3RlbignYmVmb3JlUmVzaXplJywgZnVuY3Rpb24oKSB7XG5cblxuXHRcdHJlYWxWaWV3cG9ydFdpZHRoID0gZ2FsbGVyeS52aWV3cG9ydFNpemUueCAqIHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xuXG5cblx0XHRpZih1c2VMYXJnZUltYWdlcyAmJiByZWFsVmlld3BvcnRXaWR0aCA8IDEwMDApIHtcblx0XHRcdHVzZUxhcmdlSW1hZ2VzID0gZmFsc2U7XG5cdFx0XHRpbWFnZVNyY1dpbGxDaGFuZ2UgPSB0cnVlO1xuXHRcdH0gZWxzZSBpZighdXNlTGFyZ2VJbWFnZXMgJiYgcmVhbFZpZXdwb3J0V2lkdGggPj0gMTAwMCkge1xuXHRcdFx0dXNlTGFyZ2VJbWFnZXMgPSB0cnVlO1xuXHRcdFx0aW1hZ2VTcmNXaWxsQ2hhbmdlID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZihpbWFnZVNyY1dpbGxDaGFuZ2UgJiYgIWZpcnN0UmVzaXplKSB7XG5cblx0XHRcdGdhbGxlcnkuaW52YWxpZGF0ZUN1cnJJdGVtcygpO1xuXHRcdH1cblxuXHRcdGlmKGZpcnN0UmVzaXplKSB7XG5cdFx0XHRmaXJzdFJlc2l6ZSA9IGZhbHNlO1xuXHRcdH1cblxuXHRcdGltYWdlU3JjV2lsbENoYW5nZSA9IGZhbHNlO1xuXG5cdH0pO1xuXG5cdGdhbGxlcnkubGlzdGVuKCdhZnRlckNoYW5nZScsIGZ1bmN0aW9uKCkge1xuXHRcdCQoJy5nYWxsZXJ5LWJ1dHRvbi0tbGVmdCwgLmdhbGxlcnktYnV0dG9uLS1yaWdodCcpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXG5cdFx0aWYgKGdhbGxlcnkuZ2V0Q3VycmVudEluZGV4KCkgPT0gMCkge1xuXHRcdFx0JCgnLmdhbGxlcnktYnV0dG9uLS1sZWZ0JykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fVxuXHRcdGlmIChnYWxsZXJ5LmdldEN1cnJlbnRJbmRleCgpID09IChnYWxsZXJ5Lm9wdGlvbnMuZ2V0TnVtSXRlbXNGbigpIC0gMSkpIHtcblx0XHRcdCQoJy5nYWxsZXJ5LWJ1dHRvbi0tcmlnaHQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9XG5cdH0pO1xuXG5cdGdhbGxlcnkubGlzdGVuKCdpbWFnZUxvYWRDb21wbGV0ZScsIGZ1bmN0aW9uKGluZGV4LCBpdGVtKSB7IFxuXHRcdGlmICghZ2FsbGVyeUxvYWRlZCkge1xuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0JCgnLmdhbGxlcnktYnV0dG9uLS1jbG9zZScpLmFkZENsYXNzKCdvcGVuJyk7XG5cdFx0XHRcdGdhbGxlcnlMb2FkZWQgPSB0cnVlO1xuXHRcdFx0fSwgMzAwKTtcblx0XHR9XG5cblx0fSk7XG5cblx0JCgnLmdhbGxlcnktYnV0dG9uLS1sZWZ0JykuY2xpY2soZnVuY3Rpb24oKXtcblx0XHRpZiAoISQodGhpcykuaGFzQ2xhc3MoJ2Rpc2FibGVkJykpIHtcblx0XHRcdGdhbGxlcnkucHJldigpO1x0XG5cdFx0fSBlbHNlIHtcblx0XHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdH1cblx0fSk7IFxuXG5cdCQoJy5nYWxsZXJ5LWJ1dHRvbi0tcmlnaHQnKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRpZiAoISQodGhpcykuaGFzQ2xhc3MoJ2Rpc2FibGVkJykpIHtcblx0XHRcdGdhbGxlcnkubmV4dCgpO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdH1cblx0fSk7IFxuXG5cblx0Z2FsbGVyeS5saXN0ZW4oJ2dldHRpbmdEYXRhJywgZnVuY3Rpb24oaW5kZXgsIGl0ZW0pIHtcblxuXHRcdGlmKCB1c2VMYXJnZUltYWdlcyApIHtcblx0XHRcdGl0ZW0uc3JjID0gaXRlbS5vcmlnaW5hbEltYWdlLnNyYztcblx0XHRcdGl0ZW0udyA9IGl0ZW0ub3JpZ2luYWxJbWFnZS53O1xuXHRcdFx0aXRlbS5oID0gaXRlbS5vcmlnaW5hbEltYWdlLmg7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGl0ZW0uc3JjID0gaXRlbS5tZWRpdW1JbWFnZS5zcmM7XG5cdFx0XHRpdGVtLncgPSBpdGVtLm1lZGl1bUltYWdlLnc7XG5cdFx0XHRpdGVtLmggPSBpdGVtLm1lZGl1bUltYWdlLmg7XG5cdFx0fVxuXG5cdH0pO1xuXHRnYWxsZXJ5LmluaXQoKTtcbn07XG5cbiQoJy5nYWxsZXJ5LWltYWdlLWdyaWQtaXRlbScpLmNsaWNrKGZ1bmN0aW9uKGV2ZW50KXsgXG5cdCQoXCIjZ2FsbGVyeS13cmFwcGVyXCIpLmFkZENsYXNzKCdwYWdlLXdyYXBwZXItLW9wZW4nKTtcblx0JChcImJvZHlcIikuY3NzKFwib3ZlcmZsb3dcIiwgXCJoaWRkZW5cIik7XG5cblx0dmFyIGluZGV4ID0gZXZlbnQuY3VycmVudFRhcmdldC5pZC5zcGxpdCgnLScpLnBvcCgpO1xuXG5cdGlmIChnYWxsZXJ5T3BlbmVkKSB7XG5cdFx0Z2FsbGVyeS5nb1RvKGluZGV4IC0gMSk7XG5cdH1cblxuXHRpZiAoIWdhbGxlcnlPcGVuZWQpIHtcblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0b3BlblBob3RvU3dpcGUoKTtcblx0XHRcdGdhbGxlcnkuZ29UbyhpbmRleCAtIDEpO1xuXHRcdH0sIDEyMDApO1xuXHRcdGdhbGxlcnlPcGVuZWQgPSB0cnVlO1xuXHR9XG5cbn0pO1xuXG4kKCcuZ2FsbGVyeS1idXR0b24tLWNsb3NlJykuY2xpY2soZnVuY3Rpb24oKXsgXG5cdCQoXCIjZ2FsbGVyeS13cmFwcGVyXCIpLnJlbW92ZUNsYXNzKCdwYWdlLXdyYXBwZXItLW9wZW4nKTtcblx0JChcImJvZHlcIikuY3NzKFwib3ZlcmZsb3dcIiwgXCJ2aXNpYmxlXCIpO1xuXHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdGdhbGxlcnkuZ29UbygwKTtcblx0fSwgMTIwMCk7XG59KTtcblxuJCgnLmJ1dHRvbi1pdGVtLS1sZWdhbCcpLmNsaWNrKGZ1bmN0aW9uKCl7IFxuXHQkKFwiI2Zvb3Rlci13cmFwcGVyXCIpLmFkZENsYXNzKCdwYWdlLXdyYXBwZXItLW9wZW4nKTtcbn0pO1xuXG4kKCcjZm9vdGVyQ2xvc2UnKS5jbGljayhmdW5jdGlvbigpeyBcblx0JChcIiNmb290ZXItd3JhcHBlclwiKS5yZW1vdmVDbGFzcygncGFnZS13cmFwcGVyLS1vcGVuJyk7XG59KTtcblxuJCgnI3RpY2tldHMnKS5tb3VzZWVudGVyKGZ1bmN0aW9uKCl7IFxuXHQkKFwiI3BsYW5lLWltYWdlXCIpLmNzcyh7J3RyYW5zZm9ybSc6ICdyb3RhdGUoLTM1ZGVnKSd9KTtcbn0pO1xuXG4kKCcjdGlja2V0cycpLm1vdXNlbGVhdmUoZnVuY3Rpb24oKXsgXG5cdCQoXCIjcGxhbmUtaW1hZ2VcIikuY3NzKHsndHJhbnNmb3JtJzogJ3JvdGF0ZSgwZGVnKSd9KTtcbn0pO1xuXG4kKCcjdHJhaWxlcicpLm1vdXNlZW50ZXIoZnVuY3Rpb24oKXsgXG5cdCQoXCIjcGxhbmUtaW1hZ2VcIikuY3NzKHsndHJhbnNmb3JtJzogJ3JvdGF0ZSgzNWRlZyknfSk7XG59KTtcblxuJCgnI3RyYWlsZXInKS5tb3VzZWxlYXZlKGZ1bmN0aW9uKCl7IFxuXHQkKFwiI3BsYW5lLWltYWdlXCIpLmNzcyh7J3RyYW5zZm9ybSc6ICdyb3RhdGUoMGRlZyknfSk7XG59KTtcblxuXG4kKCcjbWFwLWV4cGFuZCcpLmNsaWNrKGZ1bmN0aW9uKGV2ZW50KXsgXG5cdCQoXCIjbWFwLXdyYXBwZXJcIikuYWRkQ2xhc3MoJ21hcC1wYWdlLXdyYXBwZXItLW9wZW4nKTtcblx0JChcImJvZHlcIikuY3NzKFwib3ZlcmZsb3dcIiwgXCJoaWRkZW5cIik7XG5cdCQoXCIjbWFwLWltYWdlXCIpLmF0dHIoJ3NyYycsICdpbWcvbWFwLWNvZGUuc3ZnJyk7XG5cblxuXG5cbn0pO1xuXG4kKCcubWFwLWJ1dHRvbi0tY2xvc2UnKS5jbGljayhmdW5jdGlvbigpeyBcblx0JChcIiNtYXAtd3JhcHBlclwiKS5yZW1vdmVDbGFzcygnbWFwLXBhZ2Utd3JhcHBlci0tb3BlbicpO1xuXHQkKFwiYm9keVwiKS5jc3MoXCJvdmVyZmxvd1wiLCBcInZpc2libGVcIik7XG5cdCQoXCIjbWFwLWltYWdlXCIpLmF0dHIoJ3NyYycsICcnKTtcblx0cHJldmVudERlZmF1bHQoKTtcblxuXHRcbn0pO1xuXG5cbi8vIGRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNobW92ZVwiLCBmdW5jdGlvbihldmVudCkge1xuLy8gXHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuLy8gXHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbi8vIH0sIGZhbHNlKTtcbi8vI1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnVZVzFsY3lJNlcxMHNJbTFoY0hCcGJtZHpJam9pSWl3aWMyOTFjbU5sY3lJNld5SndZV2RsTG1weklsMHNJbk52ZFhKalpYTkRiMjUwWlc1MElqcGJJblpoY2lCbllXeHNaWEo1TzF4dWRtRnlJR2RoYkd4bGNubFBjR1Z1WldRZ1BTQm1ZV3h6WlR0Y2JuWmhjaUJuWVd4c1pYSjVURzloWkdWa0lEMGdabUZzYzJVN1hHNWNiblpoY2lCdmNHVnVVR2h2ZEc5VGQybHdaU0E5SUdaMWJtTjBhVzl1S0NrZ2UxeHVYSFIyWVhJZ2NITjNjRVZzWlcxbGJuUWdQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eVFXeHNLQ2N1Y0hOM2NDY3BXekJkTzF4dVhHNWNkSFpoY2lCcGRHVnRjeUE5SUZ0Y2JseDBlMXh1WEhSY2RHMWxaR2wxYlVsdFlXZGxPaUI3WEc1Y2RGeDBYSFJ6Y21NNklDZHBiV2N2WDJkaGJHeGxjbmt2WjJGc2JHVnllVjh5WDNOdExtcHdaeWNzWEc1Y2RGeDBYSFIzT2lBeE1qQXdMRnh1WEhSY2RGeDBhRG9nT0RFMVhHNWNkRngwZlN4Y2JseDBYSFJ2Y21sbmFXNWhiRWx0WVdkbE9pQjdYRzVjZEZ4MFhIUnpjbU02SUNkcGJXY3ZYMmRoYkd4bGNua3ZaMkZzYkdWeWVWOHlMbXB3Wnljc1hHNWNkRngwWEhSM09pQXlNREF3TEZ4dVhIUmNkRngwYURvZ01UTTFPRnh1WEhSY2RIMWNibHgwZlN4Y2JseDBlMXh1WEhSY2RHMWxaR2wxYlVsdFlXZGxPaUI3WEc1Y2RGeDBYSFJ6Y21NNklDZHBiV2N2WDJkaGJHeGxjbmt2WjJGc2JHVnllVjh4WDNOdExtcHdaeWNzWEc1Y2RGeDBYSFIzT2lBeE1EQXdMRnh1WEhSY2RGeDBhRG9nTmpVMVhHNWNkRngwZlN4Y2JseDBYSFJ2Y21sbmFXNWhiRWx0WVdkbE9pQjdYRzVjZEZ4MFhIUnpjbU02SUNkcGJXY3ZYMmRoYkd4bGNua3ZaMkZzYkdWeWVWOHhMbXB3Wnljc1hHNWNkRngwWEhSM09pQXlNVEF3TEZ4dVhIUmNkRngwYURvZ01UTTNNMXh1WEhSY2RIMWNibHgwZlN4Y2JseDBlMXh1WEhSY2RHMWxaR2wxYlVsdFlXZGxPaUI3WEc1Y2RGeDBYSFJ6Y21NNklDZHBiV2N2WDJkaGJHeGxjbmt2WjJGc2JHVnllVjh6WDNOdExtcHdaeWNzWEc1Y2RGeDBYSFIzT2lBeE1qQXdMRnh1WEhSY2RGeDBhRG9nTnpJM1hHNWNkRngwZlN4Y2JseDBYSFJ2Y21sbmFXNWhiRWx0WVdkbE9pQjdYRzVjZEZ4MFhIUnpjbU02SUNkcGJXY3ZYMmRoYkd4bGNua3ZaMkZzYkdWeWVWOHpMbXB3Wnljc1hHNWNkRngwWEhSM09pQXlNakF3TEZ4dVhIUmNkRngwYURvZ01UTXpNMXh1WEhSY2RIMWNibHgwZlN4Y2JseDBlMXh1WEhSY2RHMWxaR2wxYlVsdFlXZGxPaUI3WEc1Y2RGeDBYSFJ6Y21NNklDZHBiV2N2WDJkaGJHeGxjbmt2WjJGc2JHVnllVjgwWDNOdExtcHdaeWNzWEc1Y2RGeDBYSFIzT2lBNE5EZ3NYRzVjZEZ4MFhIUm9PaUF4TURBd1hHNWNkRngwZlN4Y2JseDBYSFJ2Y21sbmFXNWhiRWx0WVdkbE9pQjdYRzVjZEZ4MFhIUnpjbU02SUNkcGJXY3ZYMmRoYkd4bGNua3ZaMkZzYkdWeWVWODBMbXB3Wnljc1hHNWNkRngwWEhSM09pQXhOamsxTEZ4dVhIUmNkRngwYURvZ01qQXdNRnh1WEhSY2RIMWNibHgwZlN4Y2JseDBlMXh1WEhSY2RHMWxaR2wxYlVsdFlXZGxPaUI3WEc1Y2RGeDBYSFJ6Y21NNklDZHBiV2N2WDJkaGJHeGxjbmt2WjJGc2JHVnllVjgxWDNOdExtcHdaeWNzWEc1Y2RGeDBYSFIzT2lBNE5EZ3NYRzVjZEZ4MFhIUm9PaUF4TURBd1hHNWNkRngwZlN4Y2JseDBYSFJ2Y21sbmFXNWhiRWx0WVdkbE9pQjdYRzVjZEZ4MFhIUnpjbU02SUNkcGJXY3ZYMmRoYkd4bGNua3ZaMkZzYkdWeWVWODFMbXB3Wnljc1hHNWNkRngwWEhSM09pQXhNalkwTEZ4dVhIUmNkRngwYURvZ01qQXdNRnh1WEhSY2RIMWNibHgwZlZ4dVhIUmRPMXh1WEc1Y2RIWmhjaUJ2Y0hScGIyNXpJRDBnZTF4dVhIUmNkR2hwYzNSdmNuazZJR1poYkhObExGeHVYSFJjZEdadlkzVnpPaUJtWVd4elpTeGNibHgwWEhSNmIyOXRSV3c2SUdaaGJITmxMRnh1WEhSY2RHeHZiM0E2SUdaaGJITmxMRnh1WEhSY2RHMXZaR0ZzT2lCbVlXeHpaU3hjYmx4MFhIUjBZWEJVYjBOc2IzTmxPaUJtWVd4elpTeGNibHgwWEhSMGFXMWxWRzlKWkd4bE9pQTVPVGs1T1N4Y2JseDBYSFIwYVcxbFZHOUpaR3hsVDNWMGMybGtaVG9nT1RrNU9Ua3NYRzVjZEZ4MFltRnljMU5wZW1VNklIdDBiM0E2TUN3Z1ltOTBkRzl0T2pCOUxDQmNibHgwWEhSd2FXNWphRlJ2UTJ4dmMyVTZJR1poYkhObExGeHVYSFJjZEdGeWNtOTNTMlY1Y3pvZ1ptRnNjMlVzWEc1Y2RGeDBaWE5qUzJWNU9pQm1ZV3h6WlN4Y2JseDBYSFJqYkc5elpVOXVVMk55YjJ4c09pQm1ZV3h6WlN4Y2JseDBYSFJqYkc5elpVOXVWbVZ5ZEdsallXeEVjbUZuT2lCbVlXeHpaU3hjYmx4MFhIUnphRzkzUVc1cGJXRjBhVzl1UkhWeVlYUnBiMjQ2SURBc1hHNWNkRngwYUdsa1pVRnVhVzFoZEdsdmJrUjFjbUYwYVc5dU9pQXdYRzVjYmx4MGZUdGNibHh1WEhSbllXeHNaWEo1SUQwZ2JtVjNJRkJvYjNSdlUzZHBjR1VvY0hOM2NFVnNaVzFsYm5Rc0lGQm9iM1J2VTNkcGNHVlZTVjlFWldaaGRXeDBMQ0JwZEdWdGN5d2diM0IwYVc5dWN5azdYRzVjYmx4MGRtRnlJSEpsWVd4V2FXVjNjRzl5ZEZkcFpIUm9MRnh1WEhSMWMyVk1ZWEpuWlVsdFlXZGxjeUE5SUdaaGJITmxMRnh1WEhSbWFYSnpkRkpsYzJsNlpTQTlJSFJ5ZFdVc1hHNWNkR2x0WVdkbFUzSmpWMmxzYkVOb1lXNW5aVHRjYmx4dVhIUm5ZV3hzWlhKNUxteHBjM1JsYmlnblltVm1iM0psVW1WemFYcGxKeXdnWm5WdVkzUnBiMjRvS1NCN1hHNWNibHh1WEhSY2RISmxZV3hXYVdWM2NHOXlkRmRwWkhSb0lEMGdaMkZzYkdWeWVTNTJhV1YzY0c5eWRGTnBlbVV1ZUNBcUlIZHBibVJ2ZHk1a1pYWnBZMlZRYVhobGJGSmhkR2x2TzF4dVhHNWNibHgwWEhScFppaDFjMlZNWVhKblpVbHRZV2RsY3lBbUppQnlaV0ZzVm1sbGQzQnZjblJYYVdSMGFDQThJREV3TURBcElIdGNibHgwWEhSY2RIVnpaVXhoY21kbFNXMWhaMlZ6SUQwZ1ptRnNjMlU3WEc1Y2RGeDBYSFJwYldGblpWTnlZMWRwYkd4RGFHRnVaMlVnUFNCMGNuVmxPMXh1WEhSY2RIMGdaV3h6WlNCcFppZ2hkWE5sVEdGeVoyVkpiV0ZuWlhNZ0ppWWdjbVZoYkZacFpYZHdiM0owVjJsa2RHZ2dQajBnTVRBd01Da2dlMXh1WEhSY2RGeDBkWE5sVEdGeVoyVkpiV0ZuWlhNZ1BTQjBjblZsTzF4dVhIUmNkRngwYVcxaFoyVlRjbU5YYVd4c1EyaGhibWRsSUQwZ2RISjFaVHRjYmx4MFhIUjlYRzVjYmx4MFhIUnBaaWhwYldGblpWTnlZMWRwYkd4RGFHRnVaMlVnSmlZZ0lXWnBjbk4wVW1WemFYcGxLU0I3WEc1Y2JseDBYSFJjZEdkaGJHeGxjbmt1YVc1MllXeHBaR0YwWlVOMWNuSkpkR1Z0Y3lncE8xeHVYSFJjZEgxY2JseHVYSFJjZEdsbUtHWnBjbk4wVW1WemFYcGxLU0I3WEc1Y2RGeDBYSFJtYVhKemRGSmxjMmw2WlNBOUlHWmhiSE5sTzF4dVhIUmNkSDFjYmx4dVhIUmNkR2x0WVdkbFUzSmpWMmxzYkVOb1lXNW5aU0E5SUdaaGJITmxPMXh1WEc1Y2RIMHBPMXh1WEc1Y2RHZGhiR3hsY25rdWJHbHpkR1Z1S0NkaFpuUmxja05vWVc1blpTY3NJR1oxYm1OMGFXOXVLQ2tnZTF4dVhIUmNkQ1FvSnk1bllXeHNaWEo1TFdKMWRIUnZiaTB0YkdWbWRDd2dMbWRoYkd4bGNua3RZblYwZEc5dUxTMXlhV2RvZENjcExuSmxiVzkyWlVOc1lYTnpLQ2RrYVhOaFlteGxaQ2NwTzF4dVhHNWNkRngwYVdZZ0tHZGhiR3hsY25rdVoyVjBRM1Z5Y21WdWRFbHVaR1Y0S0NrZ1BUMGdNQ2tnZTF4dVhIUmNkRngwSkNnbkxtZGhiR3hsY25rdFluVjBkRzl1TFMxc1pXWjBKeWt1WVdSa1EyeGhjM01vSjJScGMyRmliR1ZrSnlrN1hHNWNkRngwZlZ4dVhIUmNkR2xtSUNobllXeHNaWEo1TG1kbGRFTjFjbkpsYm5SSmJtUmxlQ2dwSUQwOUlDaG5ZV3hzWlhKNUxtOXdkR2x2Ym5NdVoyVjBUblZ0U1hSbGJYTkdiaWdwSUMwZ01Ta3BJSHRjYmx4MFhIUmNkQ1FvSnk1bllXeHNaWEo1TFdKMWRIUnZiaTB0Y21sbmFIUW5LUzVoWkdSRGJHRnpjeWduWkdsellXSnNaV1FuS1R0Y2JseDBYSFI5WEc1Y2RIMHBPMXh1WEc1Y2RHZGhiR3hsY25rdWJHbHpkR1Z1S0NkcGJXRm5aVXh2WVdSRGIyMXdiR1YwWlNjc0lHWjFibU4wYVc5dUtHbHVaR1Y0TENCcGRHVnRLU0I3SUZ4dVhIUmNkR2xtSUNnaFoyRnNiR1Z5ZVV4dllXUmxaQ2tnZTF4dVhIUmNkRngwYzJWMFZHbHRaVzkxZENobWRXNWpkR2x2YmlncElIdGNibHgwWEhSY2RGeDBKQ2duTG1kaGJHeGxjbmt0WW5WMGRHOXVMUzFqYkc5elpTY3BMbUZrWkVOc1lYTnpLQ2R2Y0dWdUp5azdYRzVjZEZ4MFhIUmNkR2RoYkd4bGNubE1iMkZrWldRZ1BTQjBjblZsTzF4dVhIUmNkRngwZlN3Z016QXdLVHRjYmx4MFhIUjlYRzVjYmx4MGZTazdYRzVjYmx4MEpDZ25MbWRoYkd4bGNua3RZblYwZEc5dUxTMXNaV1owSnlrdVkyeHBZMnNvWm5WdVkzUnBiMjRvS1h0Y2JseDBYSFJwWmlBb0lTUW9kR2hwY3lrdWFHRnpRMnhoYzNNb0oyUnBjMkZpYkdWa0p5a3BJSHRjYmx4MFhIUmNkR2RoYkd4bGNua3VjSEpsZGlncE8xeDBYRzVjZEZ4MGZTQmxiSE5sSUh0Y2JseDBYSFJjZEdWMlpXNTBMbk4wYjNCUWNtOXdZV2RoZEdsdmJpZ3BPMXh1WEhSY2RIMWNibHgwZlNrN0lGeHVYRzVjZENRb0p5NW5ZV3hzWlhKNUxXSjFkSFJ2YmkwdGNtbG5hSFFuS1M1amJHbGpheWhtZFc1amRHbHZiaWdwSUh0Y2JseDBYSFJwWmlBb0lTUW9kR2hwY3lrdWFHRnpRMnhoYzNNb0oyUnBjMkZpYkdWa0p5a3BJSHRjYmx4MFhIUmNkR2RoYkd4bGNua3VibVY0ZENncE8xeHVYSFJjZEgxY2JseDBYSFJsYkhObElIdGNibHgwWEhSY2RHVjJaVzUwTG5OMGIzQlFjbTl3WVdkaGRHbHZiaWdwTzF4dVhIUmNkSDFjYmx4MGZTazdJRnh1WEc1Y2JseDBaMkZzYkdWeWVTNXNhWE4wWlc0b0oyZGxkSFJwYm1kRVlYUmhKeXdnWm5WdVkzUnBiMjRvYVc1a1pYZ3NJR2wwWlcwcElIdGNibHh1WEhSY2RHbG1LQ0IxYzJWTVlYSm5aVWx0WVdkbGN5QXBJSHRjYmx4MFhIUmNkR2wwWlcwdWMzSmpJRDBnYVhSbGJTNXZjbWxuYVc1aGJFbHRZV2RsTG5OeVl6dGNibHgwWEhSY2RHbDBaVzB1ZHlBOUlHbDBaVzB1YjNKcFoybHVZV3hKYldGblpTNTNPMXh1WEhSY2RGeDBhWFJsYlM1b0lEMGdhWFJsYlM1dmNtbG5hVzVoYkVsdFlXZGxMbWc3WEc1Y2RGeDBmU0JsYkhObElIdGNibHgwWEhSY2RHbDBaVzB1YzNKaklEMGdhWFJsYlM1dFpXUnBkVzFKYldGblpTNXpjbU03WEc1Y2RGeDBYSFJwZEdWdExuY2dQU0JwZEdWdExtMWxaR2wxYlVsdFlXZGxMbmM3WEc1Y2RGeDBYSFJwZEdWdExtZ2dQU0JwZEdWdExtMWxaR2wxYlVsdFlXZGxMbWc3WEc1Y2RGeDBmVnh1WEc1Y2RIMHBPMXh1WEhSbllXeHNaWEo1TG1sdWFYUW9LVHRjYm4wN1hHNWNiaVFvSnk1bllXeHNaWEo1TFdsdFlXZGxMV2R5YVdRdGFYUmxiU2NwTG1Oc2FXTnJLR1oxYm1OMGFXOXVLR1YyWlc1MEtYc2dYRzVjZENRb1hDSWpaMkZzYkdWeWVTMTNjbUZ3Y0dWeVhDSXBMbUZrWkVOc1lYTnpLQ2R3WVdkbExYZHlZWEJ3WlhJdExXOXdaVzRuS1R0Y2JseDBKQ2hjSW1KdlpIbGNJaWt1WTNOektGd2liM1psY21ac2IzZGNJaXdnWENKb2FXUmtaVzVjSWlrN1hHNWNibHgwZG1GeUlHbHVaR1Y0SUQwZ1pYWmxiblF1WTNWeWNtVnVkRlJoY21kbGRDNXBaQzV6Y0d4cGRDZ25MU2NwTG5CdmNDZ3BPMXh1WEc1Y2RHbG1JQ2huWVd4c1pYSjVUM0JsYm1Wa0tTQjdYRzVjZEZ4MFoyRnNiR1Z5ZVM1bmIxUnZLR2x1WkdWNElDMGdNU2s3WEc1Y2RIMWNibHh1WEhScFppQW9JV2RoYkd4bGNubFBjR1Z1WldRcElIdGNibHgwWEhSelpYUlVhVzFsYjNWMEtHWjFibU4wYVc5dUtDa2dlMXh1WEhSY2RGeDBiM0JsYmxCb2IzUnZVM2RwY0dVb0tUdGNibHgwWEhSY2RHZGhiR3hsY25rdVoyOVVieWhwYm1SbGVDQXRJREVwTzF4dVhIUmNkSDBzSURFeU1EQXBPMXh1WEhSY2RHZGhiR3hsY25sUGNHVnVaV1FnUFNCMGNuVmxPMXh1WEhSOVhHNWNibjBwTzF4dVhHNGtLQ2N1WjJGc2JHVnllUzFpZFhSMGIyNHRMV05zYjNObEp5a3VZMnhwWTJzb1puVnVZM1JwYjI0b0tYc2dYRzVjZENRb1hDSWpaMkZzYkdWeWVTMTNjbUZ3Y0dWeVhDSXBMbkpsYlc5MlpVTnNZWE56S0Nkd1lXZGxMWGR5WVhCd1pYSXRMVzl3Wlc0bktUdGNibHgwSkNoY0ltSnZaSGxjSWlrdVkzTnpLRndpYjNabGNtWnNiM2RjSWl3Z1hDSjJhWE5wWW14bFhDSXBPMXh1WEhSelpYUlVhVzFsYjNWMEtHWjFibU4wYVc5dUtDa2dlMXh1WEhSY2RHZGhiR3hsY25rdVoyOVVieWd3S1R0Y2JseDBmU3dnTVRJd01DazdYRzU5S1R0Y2JseHVKQ2duTG1KMWRIUnZiaTFwZEdWdExTMXNaV2RoYkNjcExtTnNhV05yS0daMWJtTjBhVzl1S0NsN0lGeHVYSFFrS0Z3aUkyWnZiM1JsY2kxM2NtRndjR1Z5WENJcExtRmtaRU5zWVhOektDZHdZV2RsTFhkeVlYQndaWEl0TFc5d1pXNG5LVHRjYm4wcE8xeHVYRzRrS0NjalptOXZkR1Z5UTJ4dmMyVW5LUzVqYkdsamF5aG1kVzVqZEdsdmJpZ3BleUJjYmx4MEpDaGNJaU5tYjI5MFpYSXRkM0poY0hCbGNsd2lLUzV5WlcxdmRtVkRiR0Z6Y3lnbmNHRm5aUzEzY21Gd2NHVnlMUzF2Y0dWdUp5azdYRzU5S1R0Y2JseHVKQ2duSTNScFkydGxkSE1uS1M1dGIzVnpaV1Z1ZEdWeUtHWjFibU4wYVc5dUtDbDdJRnh1WEhRa0tGd2lJM0JzWVc1bExXbHRZV2RsWENJcExtTnpjeWg3SjNSeVlXNXpabTl5YlNjNklDZHliM1JoZEdVb0xUTTFaR1ZuS1NkOUtUdGNibjBwTzF4dVhHNGtLQ2NqZEdsamEyVjBjeWNwTG0xdmRYTmxiR1ZoZG1Vb1puVnVZM1JwYjI0b0tYc2dYRzVjZENRb1hDSWpjR3hoYm1VdGFXMWhaMlZjSWlrdVkzTnpLSHNuZEhKaGJuTm1iM0p0SnpvZ0ozSnZkR0YwWlNnd1pHVm5LU2Q5S1R0Y2JuMHBPMXh1WEc0a0tDY2pkSEpoYVd4bGNpY3BMbTF2ZFhObFpXNTBaWElvWm5WdVkzUnBiMjRvS1hzZ1hHNWNkQ1FvWENJamNHeGhibVV0YVcxaFoyVmNJaWt1WTNOektIc25kSEpoYm5ObWIzSnRKem9nSjNKdmRHRjBaU2d6TldSbFp5a25mU2s3WEc1OUtUdGNibHh1SkNnbkkzUnlZV2xzWlhJbktTNXRiM1Z6Wld4bFlYWmxLR1oxYm1OMGFXOXVLQ2w3SUZ4dVhIUWtLRndpSTNCc1lXNWxMV2x0WVdkbFhDSXBMbU56Y3loN0ozUnlZVzV6Wm05eWJTYzZJQ2R5YjNSaGRHVW9NR1JsWnlrbmZTazdYRzU5S1R0Y2JseHVYRzRrS0NjamJXRndMV1Y0Y0dGdVpDY3BMbU5zYVdOcktHWjFibU4wYVc5dUtHVjJaVzUwS1hzZ1hHNWNkQ1FvWENJamJXRndMWGR5WVhCd1pYSmNJaWt1WVdSa1EyeGhjM01vSjIxaGNDMXdZV2RsTFhkeVlYQndaWEl0TFc5d1pXNG5LVHRjYmx4MEpDaGNJbUp2WkhsY0lpa3VZM056S0Z3aWIzWmxjbVpzYjNkY0lpd2dYQ0pvYVdSa1pXNWNJaWs3WEc1Y2RDUW9YQ0lqYldGd0xXbHRZV2RsWENJcExtRjBkSElvSjNOeVl5Y3NJQ2RwYldjdmJXRndMV052WkdVdWMzWm5KeWs3WEc1Y2JseHVYRzVjYm4wcE8xeHVYRzRrS0NjdWJXRndMV0oxZEhSdmJpMHRZMnh2YzJVbktTNWpiR2xqYXlobWRXNWpkR2x2YmlncGV5QmNibHgwSkNoY0lpTnRZWEF0ZDNKaGNIQmxjbHdpS1M1eVpXMXZkbVZEYkdGemN5Z25iV0Z3TFhCaFoyVXRkM0poY0hCbGNpMHRiM0JsYmljcE8xeHVYSFFrS0Z3aVltOWtlVndpS1M1amMzTW9YQ0p2ZG1WeVpteHZkMXdpTENCY0luWnBjMmxpYkdWY0lpazdYRzVjZENRb1hDSWpiV0Z3TFdsdFlXZGxYQ0lwTG1GMGRISW9KM055WXljc0lDY25LVHRjYmx4MGNISmxkbVZ1ZEVSbFptRjFiSFFvS1R0Y2JseHVYSFJjYm4wcE8xeHVYRzVjYmk4dklHUnZZM1Z0Wlc1MExtSnZaSGt1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWhjSW5SdmRXTm9iVzkyWlZ3aUxDQm1kVzVqZEdsdmJpaGxkbVZ1ZENrZ2UxeHVMeThnWEhSbGRtVnVkQzV3Y21WMlpXNTBSR1ZtWVhWc2RDZ3BPMXh1THk4Z1hIUmxkbVZ1ZEM1emRHOXdVSEp2Y0dGbllYUnBiMjRvS1R0Y2JpOHZJSDBzSUdaaGJITmxLVHRjYmk4dkl5SmRMQ0ptYVd4bElqb2ljR0ZuWlM1cWN5SjkiXSwiZmlsZSI6InBhZ2UuanMifQ==
