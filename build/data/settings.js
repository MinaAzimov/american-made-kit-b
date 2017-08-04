var settings = {
	  
 
	debug : true,
	initialManifest : {
		path : "",
		manifest : [
			// UI
			{ id : "footerBillingLeft", src : "img/footer_billing_left.png", crossOrigin : true },
			{ id : "footerBillingRight", src : "img/footer_billing_right.png", crossOrigin : true },
			{ id : "footerLogo", src : "img/footer_logos.png", crossOrigin : true },
			// Reviews Section
			{ id : "reviewsbg", src : data.reviews.desktopBackground, crossOrigin : true },
			{ id : "reviewsmobbg", src : data.reviews.mobileBackground, crossOrigin : true },
			{ id : "reviews1", src : data.reviews.list_left[0].quoteDesktop, crossOrigin : true },			
			{ id : "reviews2", src : data.reviews.list_left[1].quoteDesktop, crossOrigin : true },
			{ id : "reviews3", src : data.reviews.list_left[2].quoteDesktop, crossOrigin : true },
			{ id : "reviews4", src : data.reviews.list_left[3].quoteDesktop, crossOrigin : true },
			{ id : "reviews5", src : data.reviews.list_left[4].quoteDesktop, crossOrigin : true },
			{ id : "reviews6", src : data.reviews.list_right[0].quoteDesktop, crossOrigin : true },		
			{ id : "reviews7", src : data.reviews.list_right[1].quoteDesktop, crossOrigin : true },
			{ id : "reviews8", src : data.reviews.list_right[2].quoteDesktop, crossOrigin : true },
			{ id : "reviews9", src : data.reviews.list_right[3].quoteDesktop, crossOrigin : true },
			{ id : "reviews10", src : data.reviews.list_right[4].quoteDesktop, crossOrigin : true },
			// Story Section
			{ id : "story1bg", src : data.story.section1.backgroundImage, crossOrigin : true },
			{ id : "story1fg", src : data.story.section1.foregroundImage, crossOrigin : true },
			{ id : "story1cloud1", src : data.story.section1.cloud1, crossOrigin : true },
			{ id : "story1cloud2", src : data.story.section1.cloud2, crossOrigin : true },
			{ id : "story1cloud3", src : data.story.section1.cloud3, crossOrigin : true },
			{ id : "story2vid", src : data.story.section2.desktopVideo, crossOrigin : true },
			{ id : "story2bg", src : data.story.section2.desktopImage, crossOrigin : true },
			{ id : "story2bg_mob", src : data.story.section2.mobileImage, crossOrigin : true },
			{ id : "story3vid", src : data.story.section3.desktopVideo, crossOrigin : true },
			{ id : "story3bg", src : data.story.section3.desktopImage, crossOrigin : true },
			{ id : "story3bg_mob", src : data.story.section3.mobileImage, crossOrigin : true },
			{ id : "story4vid", src : data.story.section4.desktopVideo, crossOrigin : true },
			{ id : "story4bg", src : data.story.section4.desktopImage, crossOrigin : true },
			{ id : "story4bg_mob", src : data.story.section4.mobileImage, crossOrigin : true },
			{ id : "story5bg", src : data.story.section5.backgroundImage, crossOrigin : true },
			{ id : "story5fg", src : data.story.section5.foregroundImage, crossOrigin : true },
			{ id : "story6bg", src : data.story.section6.backgroundImage, crossOrigin : true },
			{ id : "story6fg", src : data.story.section6.foregroundImage, crossOrigin : true },
			{ id : "story7bg", src : data.story.section7.backgroundImage, crossOrigin : true },
			// Cast & Crew Section
			{ id : "chrispine", src : "img/_castncrew/cnc_tomcruise.jpg", crossOrigin : true },
			{ id : "benfoster", src : "img/_castncrew/cnc_domhallgleeson.jpg", crossOrigin : true },
			{ id : "jeffbridges", src : "img/_castncrew/cnc_sarahwright.jpg", crossOrigin : true },
			{ id : "gilbirmingham", src : "img/_castncrew/cnc_gilbirmingham.jpg", crossOrigin : true },
			{ id : "davidmackenzie", src : "img/_castncrew/cnc_dougliman.jpg", crossOrigin : true },
			{ id : "taylorsheridan", src : "img/_castncrew/cnc_garyspinelli.jpg", crossOrigin : true },
			{ id : "chrispine_mob", src : "img/_castncrew/cnc_mobile_chrispine.jpg", crossOrigin : true },
			{ id : "benfoster_mob", src : "img/_castncrew/cnc_mobile_benfoster.jpg", crossOrigin : true },
			{ id : "jeffbridges_mob", src : "img/_castncrew/cnc_mobile_jeffbridges.jpg", crossOrigin : true },
			{ id : "gilbirmingham_mob", src : "img/_castncrew/cnc_mobile_gilbirmingham.jpg", crossOrigin : true },
			{ id : "davidmackenzie_mob", src : "img/_castncrew/cnc_mobile_davidmackenzie.jpg", crossOrigin : true },
			{ id : "taylorsheridan_mob", src : "img/_castncrew/cnc_mobile_taylorsheridan.jpg", crossOrigin : true },
			{ id : "chrispine_overlay", src : "img/_castncrew/overlay_tomcruise.jpg", crossOrigin : true },
			{ id : "benfoster_overlay", src : "img/_castncrew/overlay_domhallgleeson.jpg", crossOrigin : true },
			{ id : "jeffbridges_overlay", src : "img/_castncrew/overlay_sarahwright.jpg", crossOrigin : true },
			{ id : "gilbirmingham_overlay", src : "img/_castncrew/overlay_gilbirmingham.jpg", crossOrigin : true },
			{ id : "davidmackenzie_overlay", src : "img/_castncrew/overlay_dougliman.jpg", crossOrigin : true },
			{ id : "taylorsheridan_overlay", src : "img/_castncrew/overlay_garyspinelli.jpg", crossOrigin : true },
			{ id : "barry_video", src : "img/_videos/barry.mp4", crossOrigin : true },
			{ id : "lucy_video", src : "img/_videos/lucy.mp4", crossOrigin : true },
			{ id : "sh_video", src : "img/_videos/sh.mp4", crossOrigin : true },
			{ id : "fake_video", src : "img/_videos/fake.mp4", crossOrigin : true },
			// Gallery Section
			// { id : "gallery1", src : "img/_gallery/gallery_1.jpg", crossOrigin : true },
			// { id : "gallery2", src : "img/_gallery/gallery_2.jpg", crossOrigin : true },
			// { id : "gallery3", src : "img/_gallery/gallery_3.jpg", crossOrigin : true },
			// { id : "gallery4", src : "img/_gallery/gallery_4.jpg", crossOrigin : true },
			// { id : "gallery5", src : "img/_gallery/gallery_5.jpg", crossOrigin : true },
			// { id : "gallery6", src : "img/_gallery/gallery_6.jpg", crossOrigin : true },
			// Videos Section
			{ id : "videosBg", src : "img/videos_bg.jpg", crossOrigin : true },
			{ id : "videosFg", src : "img/videos_fg.png", crossOrigin : true }
		]
	},
	mouseWheel : {
		scrollTime : 1.2,
    	scrollDistance : 270,
	},
	sounds : [
		{ loop : true, type : "mp3", volume : 1 , id : "dummyMp3", src : "assets/bg_music.mp3" }
	],

	hashList : []
};

var settingsmobile = {
	  
 
	debug : true,
	initialManifest : {
		path : "",
		manifest : [
			// UI
			{ id : "footerBillingLeft", src : "img/_img_mobile", crossOrigin : true },
			{ id : "footerBillingRight", src : "img/_img_mobile", crossOrigin : true },
			{ id : "footerLogo", src : "img/_img_mobile", crossOrigin : true },
			// Reviews Section
			
			// Story Section
			{ id : "story1bg", src : "img/_img_mobile", crossOrigin : true },
			{ id : "story1fg", src : "img/_img_mobile", crossOrigin : true },
			{ id : "story1cloud1", src : "img/_img_mobile", crossOrigin : true },
			{ id : "story1cloud2", src : "img/_img_mobile", crossOrigin : true },
			{ id : "story1cloud3", src : "img/_img_mobile", crossOrigin : true },
			{ id : "story2vid", src : "img/_img_mobile", crossOrigin : true },
			{ id : "story2bg", src : "img/_img_mobile", crossOrigin : true },
			{ id : "story2bg_mob", src : "img/_img_mobile", crossOrigin : true },
			{ id : "story3vid", src : "img/_img_mobile", crossOrigin : true },
			{ id : "story3bg", src : "img/_img_mobile", crossOrigin : true },
			{ id : "story3bg_mob", src : "img/_img_mobile", crossOrigin : true },
			{ id : "story4vid", src : "img/_img_mobile", crossOrigin : true },
			{ id : "story4bg", src : "img/_img_mobile", crossOrigin : true },
			{ id : "story4bg_mob", src : "img/_img_mobile", crossOrigin : true },
			{ id : "story5bg", src : "img/_img_mobile", crossOrigin : true },
			{ id : "story5fg", src : "img/_img_mobile", crossOrigin : true },
			{ id : "story6bg", src : "img/_img_mobile", crossOrigin : true },
			{ id : "story6fg", src : "img/_img_mobile", crossOrigin : true },
			{ id : "story7bg", src : "img/_img_mobile", crossOrigin : true },
			// Cast & Crew Section
			{ id : "chrispine", src : "img/_img_mobile", crossOrigin : true },
			{ id : "benfoster", src : "img/_img_mobile", crossOrigin : true },
			{ id : "jeffbridges", src : "img/_img_mobile", crossOrigin : true },
			{ id : "gilbirmingham", src : "img/_img_mobile", crossOrigin : true },
			{ id : "davidmackenzie", src : "img/_img_mobile", crossOrigin : true },
			{ id : "taylorsheridan", src : "img/_img_mobile", crossOrigin : true },
			{ id : "chrispine_mob", src : "img/_img_mobile", crossOrigin : true },
			{ id : "benfoster_mob", src : "img/_img_mobile", crossOrigin : true },
			{ id : "jeffbridges_mob", src : "img/_img_mobile", crossOrigin : true },
			{ id : "gilbirmingham_mob", src : "img/_img_mobile", crossOrigin : true },
			{ id : "davidmackenzie_mob", src : "img/_img_mobile", crossOrigin : true },
			{ id : "taylorsheridan_mob", src : "img/_img_mobile", crossOrigin : true },
			{ id : "chrispine_overlay", src : "img/_img_mobile", crossOrigin : true },
			{ id : "benfoster_overlay", src : "img/_img_mobile", crossOrigin : true },
			{ id : "jeffbridges_overlay", src : "img/_img_mobile", crossOrigin : true },
			{ id : "gilbirmingham_overlay", src : "img/_img_mobile", crossOrigin : true },
			{ id : "davidmackenzie_overlay", src : "img/_img_mobile", crossOrigin : true },
			{ id : "taylorsheridan_overlay", src : "img/_img_mobile", crossOrigin : true },
			{ id : "barry_video", src : "img/_img_mobile", crossOrigin : true },
			{ id : "lucy_video", src : "img/_img_mobile", crossOrigin : true },
			{ id : "sh_video", src : "img/_img_mobile", crossOrigin : true },
			{ id : "fake_video", src : "img/_img_mobile", crossOrigin : true },
			// Gallery Section
			// { id : "gallery1", src : "img/_gallery/gallery_1.jpg", crossOrigin : true },
			// { id : "gallery2", src : "img/_gallery/gallery_2.jpg", crossOrigin : true },
			// { id : "gallery3", src : "img/_gallery/gallery_3.jpg", crossOrigin : true },
			// { id : "gallery4", src : "img/_gallery/gallery_4.jpg", crossOrigin : true },
			// { id : "gallery5", src : "img/_gallery/gallery_5.jpg", crossOrigin : true },
			// { id : "gallery6", src : "img/_gallery/gallery_6.jpg", crossOrigin : true },
			// Videos Section
			{ id : "videosBg", src : "img/_img_mobile", crossOrigin : true },
			{ id : "videosFg", src : "img/_img_mobile", crossOrigin : true }
		]
	},
	mouseWheel : {
		scrollTime : 1.2,
    	scrollDistance : 270,
	},
	sounds : [
		{ loop : true, type : "mp3", volume : 1 , id : "dummyMp3", src : "img/_img_mobile" }
	],

	hashList : []
};