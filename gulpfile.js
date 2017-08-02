/* global require */

var gulp = require('gulp'),
	browserSync = require('browser-sync'),
	reload = browserSync.reload,
	concat = require('gulp-concat'),
	rigger = require('gulp-rigger'),
	sourcemaps = require('gulp-sourcemaps'),
	less = require('gulp-less'),
	watch = require('gulp-watch'),
    clip = require('gulp-clip-empty-files'),
    cache = require('gulp-cache'),
    cleanCSS = require('gulp-clean-css'),
    imagemin = require('gulp-imagemin'),
    iconfont = require('gulp-iconfont'),
    plumber = require('gulp-plumber');

var path = {
    build: { 
        html: 'build/',
        js: 'build/js/',
        style: 'build/',
        img: 'build/img/',
        fonts: 'build/fonts/',
        data: 'build/data/',
        iconfont: 'build/fonts/american-made-icons/',
    },
    src: { 
        html: 'src/html/*.html', 
        js: 'src/js/**/*.js', 
        style: 'src/styles/main.less',
        img: 'src/img/**/*',
        fonts: 'src/fonts/**/*.*',
        data: 'src/data/*.js',
        iconfont: 'src/img/_icons/*.svg'
    },
    watch: { 
        html: 'src/html/*.html',
        js: 'src/js/*.js',
        style: 'src/styles/**/*.less',
        fonts: 'src/fonts/**/*.*',
        img: 'src/img/**/*',
        data: 'src/data/*.js'
    },
    clean: './build'
};

gulp.task('server', function() {
	browserSync.init({
        open: false,
            logPrefix: 'AMERICAN-MADE',
        server: {
			baseDir: path.build.html
		}
	});
});

gulp.task('html', function () {
    gulp.src(path.src.html) 
        .pipe(rigger()) 
        .pipe(clip())
        .pipe(gulp.dest(path.build.html)); 
});

gulp.task('less', function() {
  	gulp.src(path.src.style)
		.pipe(less())
		.pipe(concat('app.css'))
        .pipe(cleanCSS())
		.pipe(gulp.dest(path.build.style))
		.pipe(reload({stream: true}));
});

gulp.task('image', function () {
    return gulp.src([path.src.img, '!src/img/**/*.psd', '!src/img/_icons/*.*'])
        .pipe(cache(imagemin({
            progressive: true,
            interlaced: true,
            verbose: true
        })))
        .pipe(gulp.dest(path.build.img));
});

gulp.task('iconfont', function(){
  return gulp.src([path.src.iconfont])
    .pipe(iconfont({
      fontName: 'American-Made-Icons', 
      prependUnicode: true, 
      formats: ['ttf', 'eot', 'woff', 'woff2'], 
      timestamp: Math.round(Date.now()/1000), 
      normalize: true,
      fontHeight: 500
    }))
    .on('glyphs', function(glyphs, options) {
        // console.log(glyphs, options);
    })
    .pipe(gulp.dest(path.build.iconfont));
});

gulp.task('fonts', function () {
    return gulp.src(path.src.fonts)
        .pipe(gulp.dest(path.build.fonts))
        .pipe(reload({stream: true}));
});

gulp.task('data', function () {
    gulp.src(path.src.data)
        .pipe(gulp.dest(path.build.data))
        .pipe(reload({stream: true}));
});

gulp.task('js', function () {
    return gulp.src(path.src.js) 
        .pipe(rigger()) 
        .pipe(sourcemaps.init()) 
        .pipe(sourcemaps.write()) 
        .pipe(gulp.dest(path.build.js)); 
});

gulp.task('js-watch', ['js'], function (done) {
    browserSync.reload();
    done();
});

gulp.task('image-watch', ['image'], function (done) {
    browserSync.reload();
    done();
});

gulp.task('build', ['html', 'js', 'less', 'image', 'fonts', 'iconfont', 'data']);

gulp.task('watch', function(){
    watch([path.watch.html], function(event, cb) {
        gulp.start('html');
        browserSync.reload();
    });
    watch([path.watch.style], function(event, cb) {
        gulp.start('less');
    });
    watch([path.watch.js], function(event, cb) {
        gulp.start('js-watch');
    });
    // watch([path.watch.img, '!src/img/_icons'], function(event, cb) {
    //     gulp.start('image-watch');
    // });
    watch([path.watch.data], function(event, cb) {
        gulp.start('data');
    });
    watch([path.watch.fonts], function(event, cb) {
        gulp.start('fonts');
    });
});

gulp.task('clip', function () {
    return gulp.src(path.src.html)
        .pipe(clip())
        .pipe(gulp.dest(path.build.html));
});
 
gulp.task('clear', function (done) {
  return cache.clearAll(done);
});

gulp.task('default', ['build', 'server', 'watch']);
