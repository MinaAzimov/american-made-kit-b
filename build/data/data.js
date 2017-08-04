var data = {
	info:{
		name: 'American Made',
		release_date: 'September 29',
		default_date: 'In Select Cities Setember 29',
		friday_date: 'In Select Cities Friday',
		eve_date: 'In Select Cities Tonight',
		live_date: 'September 29',
	},
	// Main Navigation
	navigation: {
		mainRight:  [
			{
				text: 'Find Tickets',
				link: true,
				show: true,
				url: ''
			},
			{
				text: 'Trailer',
				link: false,
				show: true
			}
		],
		social: [
			{
				label: 'Facebook',
				show: true,
				url: 'https://www.facebook.com/hellorhighwater'
			},
			{
				label: 'Twitter',
				show: true,
				url: 'https://twitter.com/HoHWmovie'
			},
			{
				label: 'Instagram',
				show: true,
				url: 'https://www.instagram.com/hellorhighwatermovie'
			},
			{
				label: 'YouTube',
				show: true,
				url: 'https://www.youtube.com/watch?v=JQoqsKoJVDw&list=PLG3zLMu1dR_vbhcFn2E-5HbwtQKc9znbx'
			}
		]
	},
	// Home Section
	home : {
		titleblock: {
			titletreatment: 'img/tt.png',
			release_date: 'In Theatres August 12'
		},
		cast: [
			{
				firstName: 'Jeff',
				lastName: 'Bridges',
				award: 'Academy Award Winner'
			},
			{
				firstName: 'Chris',
				lastName: 'Pine',
			},
			{
				firstName: 'Ben',
				lastName: 'Foster'
			}
		],
		quote: [
			{
				content: 'Full-blown Americana spirit.',
				source: 'Jasmin Valjas, The Upcoming'
			},
			{
				content: 'Chris Pine, Ben Foster, and Jeff Bridges are all brilliant… a thrillingly good movie….',
				source: 'Owen Gleiberman, Variety'
			},
			{
				content: 'An action-thriller with punch.',
				source: 'Peter Bradshaw, The Guardian'
			},
			{
				content: 'A solid American film… that ignites the screen.',
				source: 'Pete Hammond, Deadline'
			},
			{
				content: 'It’s so damn fun.',
				source: 'Craig Skinner, Flickreel'
			},
			{
				content: 'This is an amazing movie…',
				source: 'David Edelstein, New York Magazine'
			},
			{
				content: 'A movie of uniformly brilliant performances.',
				source: 'Joe Morgenstern, The Wall Street Journal'
			},
			{
				content: 'Jeff Bridges shows how it\'s done in an exceptional performance.',
				source: 'Rolling Stone'
			},
			{
				content: 'A new classic and a great humanist western. It\'s the best movie I\'ve seen all year – all last year, too.',
				source: 'David Edelstein, CBS Sunday Morning'
			}
		],
		tout: [
			{
				label: 'Awards',
				img: 'img/_touts/tout-2.gif',
				link:'https://www.rottentomatoes.com/m/hell_or_high_water/'
			},
			{
				label: 'Rotten Tomatoes',
				img: 'img/_touts/tout-1.jpg',
				link:'https://www.rottentomatoes.com/m/hell_or_high_water/'
			}
		]
	},
	// Reviews Section
	reviews: {
		header: 'Reviews',
		desktopBackground: 'img/reviews_bg.jpg',
		mobileBackground: 'img/reviews_mobile_bg.jpg',
		list_left: [
			{
				quoteDesktop: 'img/_reviews/quote8.png',
				source: 'Joe Morgenstern',
				org: 'The Wall Street Journal'
			},
			{
				quoteDesktop: 'img/_reviews/quote9.png',
				org: 'Rolling Stone'
			},
			{
				quoteDesktop: 'img/_reviews/quote1.png',
				source: 'Dustin Heller',
				org: 'Fox TV'
			},
			{
				quoteDesktop: 'img/_reviews/quote3.png',
				source: 'David Booney',
				org: 'The Hollywood Reporter'
			},
			{
				quoteDesktop: 'img/_reviews/quote5.png',
				source: 'Owen Gleiberman',
				org: 'Variety'
			}
		],
		list_right: [
			{
				quoteDesktop: 'img/_reviews/quote7.png',
				source: 'David Edelstein',
				org: 'New York Magazine'
			},

			{
				quoteDesktop: 'img/_reviews/quote10.png',
				source: 'David Edelstein',
				org: 'CBS Sunday Morning'
			},
			{
				quoteDesktop: 'img/_reviews/quote2.png',
				source: 'Pete Hammond',
				org: 'Deadline'
			},
			{
				quoteDesktop: 'img/_reviews/quote4.png',
				source: 'Peter Bradshaw',
				org: 'The Guardian'
			},
			{
				quoteDesktop: 'img/_reviews/quote6.png',
				source: 'Anne Hornaday',
				org: 'The Washington Post'
			}
		]
	},
	//Story Section
	story: {
		section1: {
			type: 'parallax',
			background : 'story1background',
			cloud1: 'img/_story/s06-cloud5.png',
			cloud2: 'img/_story/s06-cloud6.png',
			cloud3: 'img/_story/s06-cloud7.png',
			foregroundImage: 'img/_story/s06-fg-plane.png',
			backgroundImage: 'img/_story/s06-bg-plane-long.jpg'
		},
		section2: {
			type: 'parallax',
			desktopVideo: 'img/_story/columbia.mp4',
			desktopImage: 'img/_story/columbia.jpg',
			mobileImage: 'img/_story/s02-bg_mobile.jpg'
		},
		section3: {
			type: 'video',
			desktopVideo: 'img/_story/half-still.mp4',
			desktopImage: 'img/_story/s03-bg.jpg',
			mobileImage: 'img/_story/s03-bg_mobile.jpg'
		},
		section4: {
			type: 'parallax',
			desktopVideo: 'img/_story/panama-city-4.mp4',
			desktopImage: 'img/_story/panama-city.png',
			mobileImage: 'img/_story/s04-bg_mobile.jpg'
		},
		section5: {
			type: 'parallax',
			foregroundImage: 'img/_story/s01-fg-crash.png',
			backgroundImage: 'img/_story/s01-bg-crash.jpg'
		},
		section6: {
			type: 'parallax',
			foregroundImage: 'img/_story/hangar.jpg',	
			backgroundImage: 'img/_story/hangar.jpg'
		},
		section7: {
			type: 'image',
			backgroundImage: 'img/_story/s07-synopsis.jpg'
		},
	},
	// Cast & Crew Section
	castncrew : {
		header: {
				text: 'Cast & Crew',
				desktopForegroundImage: 'img/cnc_fg.png',
				mobileForegroundImage: 'img/cnc_mobile_fg.png',
				desktopBackgroundImage: 'img/cnc_bg.jpg',
				mobileBackgroundImage: 'img/cnc_mobile_bg.jpg' 
			},
		list: [
			{
				label: 'chrispine',
				type: 'full',
				name: 'Tom Cruise',
				role: 'Barry Seal',
				text: "<p>Tom Cruise starred in some of the top grossing films of the 1980s including Top Gun (1986); The Color of Money (1986), Rain Man (1988) and Born on the Fourth of July (1989). By the 1990s he was one of the highest paid actors in the world earning an average 15 million dollars a picture in such blockbuster hits as Interview with the Vampire: The Vampire Chronicles (1994), Mission: Impossible (1996) and Jerry Maguire (1996) for which he received an Academy Award Nomination for best actor. A kind and thoughtful man well known for his compassion and generosity, Tom Cruise is one of the best liked members of the movie community.<p>",
				desktopImage: 'chrispine',
				mobileImage: 'chrispine_mob',
				overlayImage: 'chrispine_overlay',
				video: 'barry_video'
			},
			{
				label: 'benfoster',
				type: 'full',
				name: 'Domhall Gleeson',
				role: 'Monty Schafer',
				text: "<p>Domhall (pronounced \"doh-nall\" with the \"m\" being silent) appeared in four films in 2015 and all four titles received nominations at the 88th Academy Awards. The films were: The Revenant (2015), Ex Machina (2014), Star Wars: The Force Awakens (2015) and Brooklyn (2015). The only other actor to achieve a similar record was Benedict Cumberbatch, who also appeared in four films that were Oscar nominated in 2013 - though he made a fifth movie that wasn't nominated.</p> <p>As of 2016, has appeared in three films that were nominated for the Best Picture Oscar: True Grit (2010), The Revenant (2015) and Brooklyn (2015).</p>",
				desktopImage: 'benfoster',
				mobileImage: 'benfoster_mob',
				overlayImage: 'benfoster_overlay',
				video: 'sh_video'
			},
			{
				label: 'jeffbridges',
				type: 'full',
				name: 'Sarah Wright',
				role: 'Lucy Seal',
				text: "<p>This Kentucky native began her career, in her home state and abroad in Europe, singing with The Kentucky Ambassadors of Music. Sarah attended Seneca High School in Kentucky. Discovered by a modeling agent, Sarah moved to Chicago where her career took off.</p> <p> Currently, Sarah is currently starring in the TV comedy, Marry Me as \"Dennah\".</p>",
				desktopImage: 'jeffbridges',
				mobileImage: 'jeffbridges_mob',
				overlayImage: 'jeffbridges_overlay',
				video: 'lucy_video'
			},
			{
				label: 'davidmackenzie',
				type: 'half',
				name: 'Doug Liman',
				role: 'Director',
				text: "<p>Doug Liman was born on July 24, 1965 in New York City, New York, USA. He is a producer and director, known for The Bourne Identity (2002), Edge of Tomorrow (2014) and The Bourne Ultimatum (2007).</p><p>Liman and Cruise often work together on films. On working with Tom, Liman commented: \"Tom innately understands that audiences come to the theatre not to watch a god but to see a good movie, and he will do everything in his power to make the film as great as possible. Nobody takes the trust of the audience more sacredly than him. When I'm working on a film, I think about how it will play with a tiny audience of friends whose opinions I respect, basically a 40-bloc radius from my apartment in Manhattan. Tom is thinking how it will play with the entire planet Earth.\"</p>",
				desktopImage: 'davidmackenzie',
				mobileImage: 'davidmackenzie_mob',
				overlayImage: 'davidmackenzie_overlay',
				video: 'fake_video'
			},
			{
				label: 'taylorsheridan',
				type: 'half',
				name: 'Gary Spinelli',
				role: 'Writer',
				text: "<p>Gary Spinelli is a writer based in Los Angeles. The script for American Made, originally titled \"Mena\" by Spinelli was taken by Universal Pictures at a $1 million bid at auction.</p><p> The original script was inspired by the true story of Barry Seal told in the book \"American made : who killed Barry Seal ? Pablo Escobar or George H.W. Bush.\" by Shaun Attwood.</p><p>In 2012, Spinelli wrote the crime/thriller Stash House. He is currently working as a screenwriter on the action, sci-fi tv-series, Impulse set to air in 2018.</p>",
				desktopImage: 'taylorsheridan',
				mobileImage: 'taylorsheridan_mob',
				overlayImage: 'taylorsheridan_overlay',
				video: 'fake_video'
			}
		]
	},
	// Gallery Section
	gallery: {
		list: [
			{
				desktop: 'img/_gallery/gallery_1.jpg',
				orientation: 'portrait',
				mobOrientation: 'landscape'
			},
			{
				desktop: 'img/_gallery/gallery_2.jpg',
				orientation: 'portrait',
				mobOrientation: 'portrait'				
			},
			{
				desktop: 'img/_gallery/gallery_3.jpg',
				orientation: 'portrait',
				mobOrientation: 'portrait'
			},
			{
				desktop: 'img/_gallery/gallery_4.jpg',
				orientation: 'portrait',
				mobOrientation: 'landscape'
			},
			{
				desktop: 'img/_gallery/gallery_5.jpg',
				orientation: 'portrait',
				mobOrientation: 'portrait'
			},
			{
				desktop: 'img/_gallery/gallery_6.jpg',
				orientation: 'portrait',
				mobOrientation: 'portrait'
			},
			{
				desktop: 'img/_gallery/gallery_7.jpg',
				orientation: 'landscape',
				mobOrientation: 'portrait'
			}
		]
	},
	// Videos Section
	videos: {
		header: 'Videos',
		desktopBackground: 'img/partners_bg.jpg',
		mobileBackground: 'img/partners_mobile_bg.jpg',
		foreground: 'img/partners_fg.png',
		list:[
			{
				name: 'Trailer 1',
				video: 'img/_videos/videos_bg2.mp4',
				poster: 'img/_videos/videos_bg2.jpg',
				show: true
			},
			{
				name: 'Trailer 2',
				video: 'img/_videos/videos_bg4.mp4',
				poster: 'img/_videos/videos_bg4.jpg',
				show: true
			}
		]
	},
	// Main Footer
	footer: {
		billingBlock: [
			'am-icon-universal-logo',
			'am-icon-rating'
		],
		footerText: 'Watch the American Made trailer on the official movie site. Starring Tom Cruise. In theaters September 29, 2017.',
		footerLinks: [
			{
				label: 'Terms of Use',
				link: 'http://www.nbcuniversal.com/terms'
			},
			{
				label: 'Privacy Policy',
				link: 'http://www.nbcuniversal.com/privacy'
			},
			{
				label: '©2017 Universal Pictures Inc. All Rights Reserved.'
			},
			{
				label: 'FilmRatings.com',
				link: 'http://filmratings.com/'
			},
			{
				label: 'MPAA.org',
				link: 'http://www.mpaa.org/'
			},
			{
				label: 'Parentalguide.org',
				link: 'http://www.parentalguide.org/'
			}
		]
	}
};