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
	$("#map-image").attr('data', 'img/map-code-folder/map-code.svg');
});

$('#map-expand-mobile').click(function(event){ 
	$("#map-wrapper").addClass('map-page-wrapper--open');
	$("body").css("overflow", "hidden");
	$("#map-image").attr('data', 'img/map-code-folder/map-code.svg');
});

$('.map-button--close').click(function(){ 
	$("#map-wrapper").removeClass('map-page-wrapper--open');
	$("body").css("overflow", "visible");
	$("#map-image").attr('data', '');

});

$('#upgradeclose').on('click', function () {
	$('#upgrade-safari').css('display', 'none');
});

$('#mobile-scrolling').scroll(function() {    
	var scroll = $('#mobile-scrolling').scrollTop();
	if (scroll >= $("#story-mobile-begin").offset().top) {
		$("#header-bar-mobile").addClass("dark");
		$("#header-mobile").addClass("dark");
		$("#toggleLegal").addClass("dark");
	}
	if (scroll <= $("#story-mobile-begin").offset().top) {
		$("#header-bar-mobile").removeClass("dark");
		$("#header-mobile").removeClass("dark");
		$("#toggleLegal").removeClass("dark");
	}
}); 

$("#scroll-story-mobile-begin").click(function() {
	$('#mobile-scrolling').animate({
		scrollTop: $("#story-mobile-begin").offset().top
	}, 300);
});

// $(document).ready(function() {
 // $(window).resize(function() {
    //var bodyheight = $(document).height();
 //if(bodyheight < 8000) {
 //	$('.navbar-brand').css('opacity', '0');
 //	$('#plane-image').css('opacity', '0');
 	
 //}

// if(bodyheight > 8000) {
 //	$('.navbar-brand').css('opacity', '1');
 //	$('#plane-image').css('opacity', '1');

//}
//}); });