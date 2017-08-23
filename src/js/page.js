var gallery,
galleryOpened=!1,
galleryLoaded=!1,
openPhotoSwipe=function() {
    var e=document.querySelectorAll(".pswp")[0], t=[ {
        mediumImage: {
            src: "img/_gallery/gallery_2_sm.jpg", w: 1200, h: 815
        }
        ,
        originalImage: {
            src: "img/_gallery/gallery_2.jpg", w: 2e3, h: 1358
        }
    }
    ,
    {
        mediumImage: {
            src: "img/_gallery/gallery_1_sm.jpg", w: 1e3, h: 655
        }
        ,
        originalImage: {
            src: "img/_gallery/gallery_1.jpg", w: 2100, h: 1373
        }
    }
    ,
    {
        mediumImage: {
            src: "img/_gallery/gallery_3_sm.jpg", w: 1200, h: 727
        }
        ,
        originalImage: {
            src: "img/_gallery/gallery_3.jpg", w: 2200, h: 1333
        }
    }
    ,
    {
        mediumImage: {
            src: "img/_gallery/gallery_4_sm.jpg", w: 848, h: 1e3
        }
        ,
        originalImage: {
            src: "img/_gallery/gallery_4.jpg", w: 1695, h: 2e3
        }
    }
    ,
    {
        mediumImage: {
            src: "img/_gallery/gallery_5_sm.jpg", w: 848, h: 1e3
        }
        ,
        originalImage: {
            src: "img/_gallery/gallery_5.jpg", w: 1264, h: 2e3
        }
    },
    {
        mediumImage: {
            src: "img/_gallery/gallery_6_sm.jpg", w: 881, h: 1000
        }
        ,
        originalImage: {
            src: "img/_gallery/gallery_6.jpg", w: 1762, h: 2000
        }
    } ,
    {
        mediumImage: {
            src: "img/_gallery/gallery_7_sm.jpg", w: 1000, h: 667
        }
        ,
        originalImage: {
            src: "img/_gallery/gallery_7.jpg", w: 2000, h: 1333
        }
    },
    {
        mediumImage: {
            src: "img/_gallery/gallery_8_sm.jpg", w: 1000, h: 562
        }
        ,
        originalImage: {
            src: "img/_gallery/gallery_8.jpg", w: 2400, h: 1350
        }
    }
    ],
    i= {
        history:!1, focus:!1, zoomEl:!1, loop:!1, modal:!1, tapToClose:!1, timeToIdle:99999, timeToIdleOutside:99999, barsSize: {
            top: 0, bottom: 0
        }
        ,
        pinchToClose:!1,
        arrowKeys:!1,
        escKey:!1,
        closeOnScroll:!1,
        closeOnVerticalDrag:!1,
        showAnimationDuration:0,
        hideAnimationDuration:0
    }
    ;
    gallery=new PhotoSwipe(e,
    PhotoSwipeUI_Default,
    t,
    i);
    var n,
    r,
    s=!1,
    o=!0;
    gallery.listen("beforeResize",
    function() {
        n=gallery.viewportSize.x*window.devicePixelRatio, s&&1e3>n?(s=!1, r=!0): s||1e3>n||(s=!0, r=!0), r&&!o&&gallery.invalidateCurrItems(), o&&(o=!1), r=!1
    }
    ),
    gallery.listen("afterChange",
    function() {
        $(".gallery-button--left, .gallery-button--right").removeClass("disabled"), 0==gallery.getCurrentIndex()&&$(".gallery-button--left").addClass("disabled"), gallery.getCurrentIndex()==gallery.options.getNumItemsFn()-1&&$(".gallery-button--right").addClass("disabled")
    }
    ),
    gallery.listen("imageLoadComplete",
    function() {
        galleryLoaded||setTimeout(function() {
            $(".gallery-button--close").addClass("open"), galleryLoaded=!0
        }
        ,
        300)
    }
    ),
    $(".gallery-button--left").click(function() {
        $(this).hasClass("disabled")?event.stopPropagation(): gallery.prev()
    }
    ),
    $(".gallery-button--right").click(function() {
        $(this).hasClass("disabled")?event.stopPropagation(): gallery.next()
    }
    ),
    gallery.listen("gettingData",
    function(e,
    t) {
        s?(t.src=t.originalImage.src, t.w=t.originalImage.w, t.h=t.originalImage.h): (t.src=t.mediumImage.src, t.w=t.mediumImage.w, t.h=t.mediumImage.h)
    }
    ),
    gallery.init()
}
;
$(".gallery-image-grid-item").click(function(e) {
    $("#gallery-wrapper").addClass("page-wrapper--open"), $("body").css("overflow", "hidden");
    var t=e.currentTarget.id.split("-").pop();
    galleryOpened&&gallery.goTo(t-1), galleryOpened||(setTimeout(function() {
        openPhotoSwipe(), gallery.goTo(t-1)
    }
    ,
    1200),
    galleryOpened=!0)
}
),
$(".gallery-button--close").click(function() {
    $("#gallery-wrapper").removeClass("page-wrapper--open"), $("body").css("overflow", "visible"), setTimeout(function() {
      
    }
    ,
    1200)
}
),
$(".button-item--legal").click(function() {
    $("#footer-wrapper").addClass("page-wrapper--open")
}
),
$("#footerClose").click(function() {
    $("#footer-wrapper").removeClass("page-wrapper--open")
}
),
$("#tickets").mouseenter(function() {
    $("#plane-image").css( {
        transform: "rotate(-35deg)"
    }
    )
}
),
$("#tickets").mouseleave(function() {
    $("#plane-image").css( {
        transform: "rotate(0deg)"
    }
    )
}
),
$("#trailer").mouseenter(function() {
    $("#plane-image").css( {
        transform: "rotate(35deg)"
    }
    )
}
),
$("#trailer").mouseleave(function() {
    $("#plane-image").css( {
        transform: "rotate(0deg)"
    }
    )
}
),
$("#map-expand").click(function() {
    $("#map-wrapper").addClass("map-page-wrapper--open"), $("body").css("overflow", "hidden"), $("#map-image").attr("data", "img/map-code-folder/map-code.svg")
}
),
$("#map-expand-mobile").click(function() {
    $("#map-wrapper").addClass("map-page-wrapper--open"), $("body").css("overflow", "hidden"), $("#map-image").attr("data", "img/map-code-folder/map-code.svg")
}
),
$(".map-button--close").click(function() {
    $("#map-wrapper").removeClass("map-page-wrapper--open"), $("body").css("overflow", "visible"), $("#map-image").attr("data", "")
}
),
$("#upgradeclose").on("click",
function() {
    $("#upgrade-safari").css("display", "none")
}
),
$("#mobile-scrolling").scroll(function() {
    var e=$("#mobile-scrolling").scrollTop();
    e<$("#story-mobile-begin").offset().top||($("#header-bar-mobile").addClass("dark"), $("#logo-mobile").addClass("dark"), $("#mobile-ctas").addClass("dark"), $("#toggleLegal").addClass("dark")), e>$("#story-mobile-begin").offset().top||($("#header-bar-mobile").removeClass("dark"), $("#logo-mobile").removeClass("dark"),  $("#mobile-ctas").removeClass("dark"), $("#toggleLegal").removeClass("dark"))
}
),
$("#scroll-story-mobile-begin").click(function() {
    $("#mobile-scrolling").animate( {
        scrollTop: $("#story-mobile-begin").offset().top
    }
    ,
    300)
}
),
$(window).scroll(function() {
    $("#title_block").css("opacity", 1-$(window).scrollTop()/750)
}
);