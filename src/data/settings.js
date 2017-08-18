var settings = {
	debug : true,
	initialManifest : {
		path : "",
		manifest : [
			// Story Section
			{ id : "story1bg", src : data.story.section1.backgroundImage, crossOrigin : true },
			{ id : "story1fg", src : data.story.section1.foregroundImage, crossOrigin : true },
			{ id : "story1cloud1", src : data.story.section1.cloud1, crossOrigin : true },
			{ id : "story1cloud2", src : data.story.section1.cloud2, crossOrigin : true },
			{ id : "story1cloud3", src : data.story.section1.cloud3, crossOrigin : true },
			{ id : "story3vid", src : data.story.section3.desktopVideo, crossOrigin : true },
			{ id : "story6bg", src : data.story.section6.backgroundImage, crossOrigin : true },
			{ id : "story6fg", src : data.story.section6.foregroundImage, crossOrigin : true },
			{ id : "story7bg", src : data.story.section7.desktopVideo, crossOrigin : true },
			// Cast & Crew Section
			{ id : "tomcruise", src : "img/_castncrew/cnc_tomcruise2.jpg", crossOrigin : true },
			{ id : "domhallgleeson", src : "img/_castncrew/cnc_domhallgleeson.jpg", crossOrigin : true },
			{ id : "sarahwright", src : "img/_castncrew/cnc_sarahwright.jpg", crossOrigin : true },
			{ id : "pabloescobar", src : "img/_castncrew/cnc_pabloescobar.jpg", crossOrigin : true },
			{ id : "jorgeochoa", src : "img/_castncrew/cnc_jorgeochoa.jpg", crossOrigin : true },
			// Videos Section
			{ id : "videosBg", src : "img/videos_bg.jpg", crossOrigin : true },
			{ id : "videosFg", src : "img/videos_fg.png", crossOrigin : true }
		]
	},
	mouseWheel : {
		scrollTime : 1.2,
    	scrollDistance : 270,
	},
	
	hashList : []
};

var settingsmobile = {
	debug : true,
	initialManifest : {
		path : "",
		manifest : [
			{ id : "chrispine_mob", src : "img/_img_mobile/empty.js", crossOrigin : true },
			{ id : "benfoster_mob", src : "img/_img_mobile/empty.js", crossOrigin : true },
			{ id : "jeffbridges_mob", src : "img/_img_mobile/empty.js", crossOrigin : true },
			{ id : "gilbirmingham_mob", src : "img/_img_mobile/empty.js", crossOrigin : true },
			{ id : "davidmackenzie_mob", src : "img/_img_mobile/empty.js", crossOrigin : true },
			{ id : "taylorsheridan_mob", src : "img/_img_mobile/empty.js", crossOrigin : true },
		]
	},
	mouseWheel : {
		scrollTime : 1.2,
    	scrollDistance : 270,
	},
	hashList : []
};