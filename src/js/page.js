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
