!(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    factory(require('jquery'));
  } else {
    factory(root.jQuery);
  }
})(this, function($) {

  'use strict';

  /**
   * Name of the plugin
   * @private
   * @const
   * @type {String}
   */
  var PLUGIN_NAME = 'vide';

  /**
   * Default settings
   * @private
   * @const
   * @type {Object}
   */
  var DEFAULTS = {
    volume: 1,
    playbackRate: 1,
    muted: true,
    loop: true,
    autoplay: true,
    position: '50% 50%',
    posterType: 'detect',
    resizing: true,
    bgColor: 'transparent',
    className: ''
  };

  /**
   * Not implemented error message
   * @private
   * @const
   * @type {String}
   */
  var NOT_IMPLEMENTED_MSG = 'Not implemented';

  /**
   * Parse a string with options
   * @private
   * @param {String} str
   * @returns {Object|String}
   */
  function parseOptions(str) {
    var obj = {};
    var delimiterIndex;
    var option;
    var prop;
    var val;
    var arr;
    var len;
    var i;

    // Remove spaces around delimiters and split
    arr = str.replace(/\s*:\s*/g, ':').replace(/\s*,\s*/g, ',').split(',');

    // Parse a string
    for (i = 0, len = arr.length; i < len; i++) {
      option = arr[i];

      // Ignore urls and a string without colon delimiters
      if (
        option.search(/^(http|https|ftp):\/\//) !== -1 ||
        option.search(':') === -1
      ) {
        break;
      }

      delimiterIndex = option.indexOf(':');
      prop = option.substring(0, delimiterIndex);
      val = option.substring(delimiterIndex + 1);

      // If val is an empty string, make it undefined
      if (!val) {
        val = undefined;
      }

      // Convert a string value if it is like a boolean
      if (typeof val === 'string') {
        val = val === 'true' || (val === 'false' ? false : val);
      }

      // Convert a string value if it is like a number
      if (typeof val === 'string') {
        val = !isNaN(val) ? +val : val;
      }

      obj[prop] = val;
    }

    // If nothing is parsed
    if (prop == null && val == null) {
      return str;
    }

    return obj;
  }

  /**
   * Parse a position option
   * @private
   * @param {String} str
   * @returns {Object}
   */
  function parsePosition(str) {
    str = '' + str;

    // Default value is a center
    var args = str.split(/\s+/);
    var x = '50%';
    var y = '50%';
    var len;
    var arg;
    var i;

    for (i = 0, len = args.length; i < len; i++) {
      arg = args[i];

      // Convert values
      if (arg === 'left') {
        x = '0%';
      } else if (arg === 'right') {
        x = '100%';
      } else if (arg === 'top') {
        y = '0%';
      } else if (arg === 'bottom') {
        y = '100%';
      } else if (arg === 'center') {
        if (i === 0) {
          x = '50%';
        } else {
          y = '50%';
        }
      } else {
        if (i === 0) {
          x = arg;
        } else {
          y = arg;
        }
      }
    }

    return { x: x, y: y };
  }

  /**
   * Search a poster
   * @private
   * @param {String} path
   * @param {Function} callback
   */
  function findPoster(path, callback) {
    var onLoad = function() {
      callback(this.src);
    };

    $('<img src="' + path + '.gif">').on('load', onLoad);
    $('<img src="' + path + '.jpg">').on('load', onLoad);
    $('<img src="' + path + '.jpeg">').on('load', onLoad);
    $('<img src="' + path + '.png">').on('load', onLoad);
  }

  /**
   * Vide constructor
   * @param {HTMLElement} element
   * @param {Object|String} path
   * @param {Object|String} options
   * @constructor
   */
  function Vide(element, path, options) {
    this.$element = $(element);

    // Parse path
    if (typeof path === 'string') {
      path = parseOptions(path);
    }

    // Parse options
    if (!options) {
      options = {};
    } else if (typeof options === 'string') {
      options = parseOptions(options);
    }

    // Remove an extension
    if (typeof path === 'string') {
      path = path.replace(/\.\w*$/, '');
    } else if (typeof path === 'object') {
      for (var i in path) {
        if (path.hasOwnProperty(i)) {
          path[i] = path[i].replace(/\.\w*$/, '');
        }
      }
    }

    this.settings = $.extend({}, DEFAULTS, options);
    this.path = path;

    // https://github.com/VodkaBears/Vide/issues/110
    try {
      this.init();
    } catch (e) {
      if (e.message !== NOT_IMPLEMENTED_MSG) {
        throw e;
      }
    }
  }

  /**
   * Initialization
   * @public
   */
  Vide.prototype.init = function() {
    var vide = this;
    var path = vide.path;
    var poster = path;
    var sources = '';
    var $element = vide.$element;
    var settings = vide.settings;
    var position = parsePosition(settings.position);
    var posterType = settings.posterType;
    var $video;
    var $wrapper;

    // Set styles of a video wrapper
    $wrapper = vide.$wrapper = $('<div>')
      .addClass(settings.className)
      .css({
        position: 'absolute',
        'z-index': -1,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        overflow: 'hidden',
        '-webkit-background-size': 'cover',
        '-moz-background-size': 'cover',
        '-o-background-size': 'cover',
        'background-size': 'cover',
        'background-color': settings.bgColor,
        'background-repeat': 'no-repeat',
        'background-position': position.x + ' ' + position.y
      });

    // Get a poster path
    if (typeof path === 'object') {
      if (path.poster) {
        poster = path.poster;
      } else {
        if (path.mp4) {
          poster = path.mp4;
        } else if (path.webm) {
          poster = path.webm;
        } else if (path.ogv) {
          poster = path.ogv;
        }
      }
    }

    // Set a video poster
    if (posterType === 'detect') {
      findPoster(poster, function(url) {
        $wrapper.css('background-image', 'url(' + url + ')');
      });
    } else if (posterType !== 'none') {
      $wrapper.css('background-image', 'url(' + poster + '.' + posterType + ')');
    }

    // If a parent element has a static position, make it relative
    if ($element.css('position') === 'static') {
      $element.css('position', 'relative');
    }

    $element.prepend($wrapper);

    if (typeof path === 'object') {
      if (path.mp4) {
        sources += '<source src="' + path.mp4 + '.mp4" type="video/mp4">';
      }

      if (path.webm) {
        sources += '<source src="' + path.webm + '.webm" type="video/webm">';
      }

      if (path.ogv) {
        sources += '<source src="' + path.ogv + '.ogv" type="video/ogg">';
      }

      $video = vide.$video = $('<video>' + sources + '</video>');
    } else {
      $video = vide.$video = $('<video>' +
        '<source src="' + path + '.mp4" type="video/mp4">' +
        '<source src="' + path + '.webm" type="video/webm">' +
        '<source src="' + path + '.ogv" type="video/ogg">' +
        '</video>');
    }

    // https://github.com/VodkaBears/Vide/issues/110
    try {
      $video

        // Set video properties
        .prop({
          autoplay: settings.autoplay,
          loop: settings.loop,
          volume: settings.volume,
          muted: settings.muted,
          defaultMuted: settings.muted,
          playbackRate: settings.playbackRate,
          defaultPlaybackRate: settings.playbackRate
        });
    } catch (e) {
      throw new Error(NOT_IMPLEMENTED_MSG);
    }

    // Video alignment
    $video.css({
      margin: 'auto',
      position: 'absolute',
      'z-index': -1,
      top: position.y,
      left: position.x,
      '-webkit-transform': 'translate(-' + position.x + ', -' + position.y + ')',
      '-ms-transform': 'translate(-' + position.x + ', -' + position.y + ')',
      '-moz-transform': 'translate(-' + position.x + ', -' + position.y + ')',
      transform: 'translate(-' + position.x + ', -' + position.y + ')',

      // Disable visibility, while loading
      visibility: 'hidden',
      opacity: 0
    })

    // Resize a video, when it's loaded
    .one('canplaythrough.' + PLUGIN_NAME, function() {
      vide.resize();
    })

    // Make it visible, when it's already playing
    .one('playing.' + PLUGIN_NAME, function() {
      $video.css({
        visibility: 'visible',
        opacity: 1
      });
      $wrapper.css('background-image', 'none');
    });

    // Resize event is available only for 'window'
    // Use another code solutions to detect DOM elements resizing
    $element.on('resize.' + PLUGIN_NAME, function() {
      if (settings.resizing) {
        vide.resize();
      }
    });

    // Append a video
    $wrapper.append($video);
  };

  /**
   * Get a video element
   * @public
   * @returns {HTMLVideoElement}
   */
  Vide.prototype.getVideoObject = function() {
    return this.$video[0];
  };

  /**
   * Resize a video background
   * @public
   */
  Vide.prototype.resize = function() {
    if (!this.$video) {
      return;
    }

    var $wrapper = this.$wrapper;
    var $video = this.$video;
    var video = $video[0];

    // Get a native video size
    var videoHeight = video.videoHeight;
    var videoWidth = video.videoWidth;

    // Get a wrapper size
    var wrapperHeight = $wrapper.height();
    var wrapperWidth = $wrapper.width();

    if (wrapperWidth / videoWidth > wrapperHeight / videoHeight) {
      $video.css({

        // +2 pixels to prevent an empty space after transformation
        width: wrapperWidth + 2,
        height: 'auto'
      });
    } else {
      $video.css({
        width: 'auto',

        // +2 pixels to prevent an empty space after transformation
        height: wrapperHeight + 2
      });
    }
  };

  /**
   * Destroy a video background
   * @public
   */
  Vide.prototype.destroy = function() {
    delete $[PLUGIN_NAME].lookup[this.index];
    this.$video && this.$video.off(PLUGIN_NAME);
    this.$element.off(PLUGIN_NAME).removeData(PLUGIN_NAME);
    this.$wrapper.remove();
  };

  /**
   * Special plugin object for instances.
   * @public
   * @type {Object}
   */
  $[PLUGIN_NAME] = {
    lookup: []
  };

  /**
   * Plugin constructor
   * @param {Object|String} path
   * @param {Object|String} options
   * @returns {JQuery}
   * @constructor
   */
  $.fn[PLUGIN_NAME] = function(path, options) {
    var instance;

    this.each(function() {
      instance = $.data(this, PLUGIN_NAME);

      // Destroy the plugin instance if exists
      instance && instance.destroy();

      // Create the plugin instance
      instance = new Vide(this, path, options);
      instance.index = $[PLUGIN_NAME].lookup.push(instance) - 1;
      $.data(this, PLUGIN_NAME, instance);
    });

    return this;
  };

  $(document).ready(function() {
    var $window = $(window);

    // Window resize event listener
    $window.on('resize.' + PLUGIN_NAME, function() {
      for (var len = $[PLUGIN_NAME].lookup.length, i = 0, instance; i < len; i++) {
        instance = $[PLUGIN_NAME].lookup[i];

        if (instance && instance.settings.resizing) {
          instance.resize();
        }
      }
    });

    // https://github.com/VodkaBears/Vide/issues/68
    $window.on('unload.' + PLUGIN_NAME, function() {
      return false;
    });

    // Auto initialization
    // Add 'data-vide-bg' attribute with a path to the video without extension
    // Also you can pass options throw the 'data-vide-options' attribute
    // 'data-vide-options' must be like 'muted: false, volume: 0.5'
    $(document).find('[data-' + PLUGIN_NAME + '-bg]').each(function(i, element) {
      var $element = $(element);
      var options = $element.data(PLUGIN_NAME + '-options');
      var path = $element.data(PLUGIN_NAME + '-bg');

      $element[PLUGIN_NAME](path, options);
    });
  });

});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJ2ZW5kb3IvanF1ZXJ5LnZpZGUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiIShmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoWydqcXVlcnknXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgZmFjdG9yeShyZXF1aXJlKCdqcXVlcnknKSk7XG4gIH0gZWxzZSB7XG4gICAgZmFjdG9yeShyb290LmpRdWVyeSk7XG4gIH1cbn0pKHRoaXMsIGZ1bmN0aW9uKCQpIHtcblxuICAndXNlIHN0cmljdCc7XG5cbiAgLyoqXG4gICAqIE5hbWUgb2YgdGhlIHBsdWdpblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAY29uc3RcbiAgICogQHR5cGUge1N0cmluZ31cbiAgICovXG4gIHZhciBQTFVHSU5fTkFNRSA9ICd2aWRlJztcblxuICAvKipcbiAgICogRGVmYXVsdCBzZXR0aW5nc1xuICAgKiBAcHJpdmF0ZVxuICAgKiBAY29uc3RcbiAgICogQHR5cGUge09iamVjdH1cbiAgICovXG4gIHZhciBERUZBVUxUUyA9IHtcbiAgICB2b2x1bWU6IDEsXG4gICAgcGxheWJhY2tSYXRlOiAxLFxuICAgIG11dGVkOiB0cnVlLFxuICAgIGxvb3A6IHRydWUsXG4gICAgYXV0b3BsYXk6IHRydWUsXG4gICAgcG9zaXRpb246ICc1MCUgNTAlJyxcbiAgICBwb3N0ZXJUeXBlOiAnZGV0ZWN0JyxcbiAgICByZXNpemluZzogdHJ1ZSxcbiAgICBiZ0NvbG9yOiAndHJhbnNwYXJlbnQnLFxuICAgIGNsYXNzTmFtZTogJydcbiAgfTtcblxuICAvKipcbiAgICogTm90IGltcGxlbWVudGVkIGVycm9yIG1lc3NhZ2VcbiAgICogQHByaXZhdGVcbiAgICogQGNvbnN0XG4gICAqIEB0eXBlIHtTdHJpbmd9XG4gICAqL1xuICB2YXIgTk9UX0lNUExFTUVOVEVEX01TRyA9ICdOb3QgaW1wbGVtZW50ZWQnO1xuXG4gIC8qKlxuICAgKiBQYXJzZSBhIHN0cmluZyB3aXRoIG9wdGlvbnNcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICAgKiBAcmV0dXJucyB7T2JqZWN0fFN0cmluZ31cbiAgICovXG4gIGZ1bmN0aW9uIHBhcnNlT3B0aW9ucyhzdHIpIHtcbiAgICB2YXIgb2JqID0ge307XG4gICAgdmFyIGRlbGltaXRlckluZGV4O1xuICAgIHZhciBvcHRpb247XG4gICAgdmFyIHByb3A7XG4gICAgdmFyIHZhbDtcbiAgICB2YXIgYXJyO1xuICAgIHZhciBsZW47XG4gICAgdmFyIGk7XG5cbiAgICAvLyBSZW1vdmUgc3BhY2VzIGFyb3VuZCBkZWxpbWl0ZXJzIGFuZCBzcGxpdFxuICAgIGFyciA9IHN0ci5yZXBsYWNlKC9cXHMqOlxccyovZywgJzonKS5yZXBsYWNlKC9cXHMqLFxccyovZywgJywnKS5zcGxpdCgnLCcpO1xuXG4gICAgLy8gUGFyc2UgYSBzdHJpbmdcbiAgICBmb3IgKGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIG9wdGlvbiA9IGFycltpXTtcblxuICAgICAgLy8gSWdub3JlIHVybHMgYW5kIGEgc3RyaW5nIHdpdGhvdXQgY29sb24gZGVsaW1pdGVyc1xuICAgICAgaWYgKFxuICAgICAgICBvcHRpb24uc2VhcmNoKC9eKGh0dHB8aHR0cHN8ZnRwKTpcXC9cXC8vKSAhPT0gLTEgfHxcbiAgICAgICAgb3B0aW9uLnNlYXJjaCgnOicpID09PSAtMVxuICAgICAgKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBkZWxpbWl0ZXJJbmRleCA9IG9wdGlvbi5pbmRleE9mKCc6Jyk7XG4gICAgICBwcm9wID0gb3B0aW9uLnN1YnN0cmluZygwLCBkZWxpbWl0ZXJJbmRleCk7XG4gICAgICB2YWwgPSBvcHRpb24uc3Vic3RyaW5nKGRlbGltaXRlckluZGV4ICsgMSk7XG5cbiAgICAgIC8vIElmIHZhbCBpcyBhbiBlbXB0eSBzdHJpbmcsIG1ha2UgaXQgdW5kZWZpbmVkXG4gICAgICBpZiAoIXZhbCkge1xuICAgICAgICB2YWwgPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIC8vIENvbnZlcnQgYSBzdHJpbmcgdmFsdWUgaWYgaXQgaXMgbGlrZSBhIGJvb2xlYW5cbiAgICAgIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgICAgICB2YWwgPSB2YWwgPT09ICd0cnVlJyB8fCAodmFsID09PSAnZmFsc2UnID8gZmFsc2UgOiB2YWwpO1xuICAgICAgfVxuXG4gICAgICAvLyBDb252ZXJ0IGEgc3RyaW5nIHZhbHVlIGlmIGl0IGlzIGxpa2UgYSBudW1iZXJcbiAgICAgIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgICAgICB2YWwgPSAhaXNOYU4odmFsKSA/ICt2YWwgOiB2YWw7XG4gICAgICB9XG5cbiAgICAgIG9ialtwcm9wXSA9IHZhbDtcbiAgICB9XG5cbiAgICAvLyBJZiBub3RoaW5nIGlzIHBhcnNlZFxuICAgIGlmIChwcm9wID09IG51bGwgJiYgdmFsID09IG51bGwpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSBhIHBvc2l0aW9uIG9wdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAqL1xuICBmdW5jdGlvbiBwYXJzZVBvc2l0aW9uKHN0cikge1xuICAgIHN0ciA9ICcnICsgc3RyO1xuXG4gICAgLy8gRGVmYXVsdCB2YWx1ZSBpcyBhIGNlbnRlclxuICAgIHZhciBhcmdzID0gc3RyLnNwbGl0KC9cXHMrLyk7XG4gICAgdmFyIHggPSAnNTAlJztcbiAgICB2YXIgeSA9ICc1MCUnO1xuICAgIHZhciBsZW47XG4gICAgdmFyIGFyZztcbiAgICB2YXIgaTtcblxuICAgIGZvciAoaSA9IDAsIGxlbiA9IGFyZ3MubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGFyZyA9IGFyZ3NbaV07XG5cbiAgICAgIC8vIENvbnZlcnQgdmFsdWVzXG4gICAgICBpZiAoYXJnID09PSAnbGVmdCcpIHtcbiAgICAgICAgeCA9ICcwJSc7XG4gICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJ3JpZ2h0Jykge1xuICAgICAgICB4ID0gJzEwMCUnO1xuICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICd0b3AnKSB7XG4gICAgICAgIHkgPSAnMCUnO1xuICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICdib3R0b20nKSB7XG4gICAgICAgIHkgPSAnMTAwJSc7XG4gICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJ2NlbnRlcicpIHtcbiAgICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICB4ID0gJzUwJSc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgeSA9ICc1MCUnO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgICAgIHggPSBhcmc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgeSA9IGFyZztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7IHg6IHgsIHk6IHkgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggYSBwb3N0ZXJcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICovXG4gIGZ1bmN0aW9uIGZpbmRQb3N0ZXIocGF0aCwgY2FsbGJhY2spIHtcbiAgICB2YXIgb25Mb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICBjYWxsYmFjayh0aGlzLnNyYyk7XG4gICAgfTtcblxuICAgICQoJzxpbWcgc3JjPVwiJyArIHBhdGggKyAnLmdpZlwiPicpLm9uKCdsb2FkJywgb25Mb2FkKTtcbiAgICAkKCc8aW1nIHNyYz1cIicgKyBwYXRoICsgJy5qcGdcIj4nKS5vbignbG9hZCcsIG9uTG9hZCk7XG4gICAgJCgnPGltZyBzcmM9XCInICsgcGF0aCArICcuanBlZ1wiPicpLm9uKCdsb2FkJywgb25Mb2FkKTtcbiAgICAkKCc8aW1nIHNyYz1cIicgKyBwYXRoICsgJy5wbmdcIj4nKS5vbignbG9hZCcsIG9uTG9hZCk7XG4gIH1cblxuICAvKipcbiAgICogVmlkZSBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtZW50XG4gICAqIEBwYXJhbSB7T2JqZWN0fFN0cmluZ30gcGF0aFxuICAgKiBAcGFyYW0ge09iamVjdHxTdHJpbmd9IG9wdGlvbnNcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqL1xuICBmdW5jdGlvbiBWaWRlKGVsZW1lbnQsIHBhdGgsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gJChlbGVtZW50KTtcblxuICAgIC8vIFBhcnNlIHBhdGhcbiAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICBwYXRoID0gcGFyc2VPcHRpb25zKHBhdGgpO1xuICAgIH1cblxuICAgIC8vIFBhcnNlIG9wdGlvbnNcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnc3RyaW5nJykge1xuICAgICAgb3B0aW9ucyA9IHBhcnNlT3B0aW9ucyhvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgYW4gZXh0ZW5zaW9uXG4gICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFwuXFx3KiQvLCAnJyk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgcGF0aCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGZvciAodmFyIGkgaW4gcGF0aCkge1xuICAgICAgICBpZiAocGF0aC5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICAgIHBhdGhbaV0gPSBwYXRoW2ldLnJlcGxhY2UoL1xcLlxcdyokLywgJycpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5zZXR0aW5ncyA9ICQuZXh0ZW5kKHt9LCBERUZBVUxUUywgb3B0aW9ucyk7XG4gICAgdGhpcy5wYXRoID0gcGF0aDtcblxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9Wb2RrYUJlYXJzL1ZpZGUvaXNzdWVzLzExMFxuICAgIHRyeSB7XG4gICAgICB0aGlzLmluaXQoKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZS5tZXNzYWdlICE9PSBOT1RfSU1QTEVNRU5URURfTVNHKSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemF0aW9uXG4gICAqIEBwdWJsaWNcbiAgICovXG4gIFZpZGUucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmlkZSA9IHRoaXM7XG4gICAgdmFyIHBhdGggPSB2aWRlLnBhdGg7XG4gICAgdmFyIHBvc3RlciA9IHBhdGg7XG4gICAgdmFyIHNvdXJjZXMgPSAnJztcbiAgICB2YXIgJGVsZW1lbnQgPSB2aWRlLiRlbGVtZW50O1xuICAgIHZhciBzZXR0aW5ncyA9IHZpZGUuc2V0dGluZ3M7XG4gICAgdmFyIHBvc2l0aW9uID0gcGFyc2VQb3NpdGlvbihzZXR0aW5ncy5wb3NpdGlvbik7XG4gICAgdmFyIHBvc3RlclR5cGUgPSBzZXR0aW5ncy5wb3N0ZXJUeXBlO1xuICAgIHZhciAkdmlkZW87XG4gICAgdmFyICR3cmFwcGVyO1xuXG4gICAgLy8gU2V0IHN0eWxlcyBvZiBhIHZpZGVvIHdyYXBwZXJcbiAgICAkd3JhcHBlciA9IHZpZGUuJHdyYXBwZXIgPSAkKCc8ZGl2PicpXG4gICAgICAuYWRkQ2xhc3Moc2V0dGluZ3MuY2xhc3NOYW1lKVxuICAgICAgLmNzcyh7XG4gICAgICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuICAgICAgICAnei1pbmRleCc6IC0xLFxuICAgICAgICB0b3A6IDAsXG4gICAgICAgIGxlZnQ6IDAsXG4gICAgICAgIGJvdHRvbTogMCxcbiAgICAgICAgcmlnaHQ6IDAsXG4gICAgICAgIG92ZXJmbG93OiAnaGlkZGVuJyxcbiAgICAgICAgJy13ZWJraXQtYmFja2dyb3VuZC1zaXplJzogJ2NvdmVyJyxcbiAgICAgICAgJy1tb3otYmFja2dyb3VuZC1zaXplJzogJ2NvdmVyJyxcbiAgICAgICAgJy1vLWJhY2tncm91bmQtc2l6ZSc6ICdjb3ZlcicsXG4gICAgICAgICdiYWNrZ3JvdW5kLXNpemUnOiAnY292ZXInLFxuICAgICAgICAnYmFja2dyb3VuZC1jb2xvcic6IHNldHRpbmdzLmJnQ29sb3IsXG4gICAgICAgICdiYWNrZ3JvdW5kLXJlcGVhdCc6ICduby1yZXBlYXQnLFxuICAgICAgICAnYmFja2dyb3VuZC1wb3NpdGlvbic6IHBvc2l0aW9uLnggKyAnICcgKyBwb3NpdGlvbi55XG4gICAgICB9KTtcblxuICAgIC8vIEdldCBhIHBvc3RlciBwYXRoXG4gICAgaWYgKHR5cGVvZiBwYXRoID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKHBhdGgucG9zdGVyKSB7XG4gICAgICAgIHBvc3RlciA9IHBhdGgucG9zdGVyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHBhdGgubXA0KSB7XG4gICAgICAgICAgcG9zdGVyID0gcGF0aC5tcDQ7XG4gICAgICAgIH0gZWxzZSBpZiAocGF0aC53ZWJtKSB7XG4gICAgICAgICAgcG9zdGVyID0gcGF0aC53ZWJtO1xuICAgICAgICB9IGVsc2UgaWYgKHBhdGgub2d2KSB7XG4gICAgICAgICAgcG9zdGVyID0gcGF0aC5vZ3Y7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTZXQgYSB2aWRlbyBwb3N0ZXJcbiAgICBpZiAocG9zdGVyVHlwZSA9PT0gJ2RldGVjdCcpIHtcbiAgICAgIGZpbmRQb3N0ZXIocG9zdGVyLCBmdW5jdGlvbih1cmwpIHtcbiAgICAgICAgJHdyYXBwZXIuY3NzKCdiYWNrZ3JvdW5kLWltYWdlJywgJ3VybCgnICsgdXJsICsgJyknKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAocG9zdGVyVHlwZSAhPT0gJ25vbmUnKSB7XG4gICAgICAkd3JhcHBlci5jc3MoJ2JhY2tncm91bmQtaW1hZ2UnLCAndXJsKCcgKyBwb3N0ZXIgKyAnLicgKyBwb3N0ZXJUeXBlICsgJyknKTtcbiAgICB9XG5cbiAgICAvLyBJZiBhIHBhcmVudCBlbGVtZW50IGhhcyBhIHN0YXRpYyBwb3NpdGlvbiwgbWFrZSBpdCByZWxhdGl2ZVxuICAgIGlmICgkZWxlbWVudC5jc3MoJ3Bvc2l0aW9uJykgPT09ICdzdGF0aWMnKSB7XG4gICAgICAkZWxlbWVudC5jc3MoJ3Bvc2l0aW9uJywgJ3JlbGF0aXZlJyk7XG4gICAgfVxuXG4gICAgJGVsZW1lbnQucHJlcGVuZCgkd3JhcHBlcik7XG5cbiAgICBpZiAodHlwZW9mIHBhdGggPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAocGF0aC5tcDQpIHtcbiAgICAgICAgc291cmNlcyArPSAnPHNvdXJjZSBzcmM9XCInICsgcGF0aC5tcDQgKyAnLm1wNFwiIHR5cGU9XCJ2aWRlby9tcDRcIj4nO1xuICAgICAgfVxuXG4gICAgICBpZiAocGF0aC53ZWJtKSB7XG4gICAgICAgIHNvdXJjZXMgKz0gJzxzb3VyY2Ugc3JjPVwiJyArIHBhdGgud2VibSArICcud2VibVwiIHR5cGU9XCJ2aWRlby93ZWJtXCI+JztcbiAgICAgIH1cblxuICAgICAgaWYgKHBhdGgub2d2KSB7XG4gICAgICAgIHNvdXJjZXMgKz0gJzxzb3VyY2Ugc3JjPVwiJyArIHBhdGgub2d2ICsgJy5vZ3ZcIiB0eXBlPVwidmlkZW8vb2dnXCI+JztcbiAgICAgIH1cblxuICAgICAgJHZpZGVvID0gdmlkZS4kdmlkZW8gPSAkKCc8dmlkZW8+JyArIHNvdXJjZXMgKyAnPC92aWRlbz4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgJHZpZGVvID0gdmlkZS4kdmlkZW8gPSAkKCc8dmlkZW8+JyArXG4gICAgICAgICc8c291cmNlIHNyYz1cIicgKyBwYXRoICsgJy5tcDRcIiB0eXBlPVwidmlkZW8vbXA0XCI+JyArXG4gICAgICAgICc8c291cmNlIHNyYz1cIicgKyBwYXRoICsgJy53ZWJtXCIgdHlwZT1cInZpZGVvL3dlYm1cIj4nICtcbiAgICAgICAgJzxzb3VyY2Ugc3JjPVwiJyArIHBhdGggKyAnLm9ndlwiIHR5cGU9XCJ2aWRlby9vZ2dcIj4nICtcbiAgICAgICAgJzwvdmlkZW8+Jyk7XG4gICAgfVxuXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL1ZvZGthQmVhcnMvVmlkZS9pc3N1ZXMvMTEwXG4gICAgdHJ5IHtcbiAgICAgICR2aWRlb1xuXG4gICAgICAgIC8vIFNldCB2aWRlbyBwcm9wZXJ0aWVzXG4gICAgICAgIC5wcm9wKHtcbiAgICAgICAgICBhdXRvcGxheTogc2V0dGluZ3MuYXV0b3BsYXksXG4gICAgICAgICAgbG9vcDogc2V0dGluZ3MubG9vcCxcbiAgICAgICAgICB2b2x1bWU6IHNldHRpbmdzLnZvbHVtZSxcbiAgICAgICAgICBtdXRlZDogc2V0dGluZ3MubXV0ZWQsXG4gICAgICAgICAgZGVmYXVsdE11dGVkOiBzZXR0aW5ncy5tdXRlZCxcbiAgICAgICAgICBwbGF5YmFja1JhdGU6IHNldHRpbmdzLnBsYXliYWNrUmF0ZSxcbiAgICAgICAgICBkZWZhdWx0UGxheWJhY2tSYXRlOiBzZXR0aW5ncy5wbGF5YmFja1JhdGVcbiAgICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKE5PVF9JTVBMRU1FTlRFRF9NU0cpO1xuICAgIH1cblxuICAgIC8vIFZpZGVvIGFsaWdubWVudFxuICAgICR2aWRlby5jc3Moe1xuICAgICAgbWFyZ2luOiAnYXV0bycsXG4gICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJyxcbiAgICAgICd6LWluZGV4JzogLTEsXG4gICAgICB0b3A6IHBvc2l0aW9uLnksXG4gICAgICBsZWZ0OiBwb3NpdGlvbi54LFxuICAgICAgJy13ZWJraXQtdHJhbnNmb3JtJzogJ3RyYW5zbGF0ZSgtJyArIHBvc2l0aW9uLnggKyAnLCAtJyArIHBvc2l0aW9uLnkgKyAnKScsXG4gICAgICAnLW1zLXRyYW5zZm9ybSc6ICd0cmFuc2xhdGUoLScgKyBwb3NpdGlvbi54ICsgJywgLScgKyBwb3NpdGlvbi55ICsgJyknLFxuICAgICAgJy1tb3otdHJhbnNmb3JtJzogJ3RyYW5zbGF0ZSgtJyArIHBvc2l0aW9uLnggKyAnLCAtJyArIHBvc2l0aW9uLnkgKyAnKScsXG4gICAgICB0cmFuc2Zvcm06ICd0cmFuc2xhdGUoLScgKyBwb3NpdGlvbi54ICsgJywgLScgKyBwb3NpdGlvbi55ICsgJyknLFxuXG4gICAgICAvLyBEaXNhYmxlIHZpc2liaWxpdHksIHdoaWxlIGxvYWRpbmdcbiAgICAgIHZpc2liaWxpdHk6ICdoaWRkZW4nLFxuICAgICAgb3BhY2l0eTogMFxuICAgIH0pXG5cbiAgICAvLyBSZXNpemUgYSB2aWRlbywgd2hlbiBpdCdzIGxvYWRlZFxuICAgIC5vbmUoJ2NhbnBsYXl0aHJvdWdoLicgKyBQTFVHSU5fTkFNRSwgZnVuY3Rpb24oKSB7XG4gICAgICB2aWRlLnJlc2l6ZSgpO1xuICAgIH0pXG5cbiAgICAvLyBNYWtlIGl0IHZpc2libGUsIHdoZW4gaXQncyBhbHJlYWR5IHBsYXlpbmdcbiAgICAub25lKCdwbGF5aW5nLicgKyBQTFVHSU5fTkFNRSwgZnVuY3Rpb24oKSB7XG4gICAgICAkdmlkZW8uY3NzKHtcbiAgICAgICAgdmlzaWJpbGl0eTogJ3Zpc2libGUnLFxuICAgICAgICBvcGFjaXR5OiAxXG4gICAgICB9KTtcbiAgICAgICR3cmFwcGVyLmNzcygnYmFja2dyb3VuZC1pbWFnZScsICdub25lJyk7XG4gICAgfSk7XG5cbiAgICAvLyBSZXNpemUgZXZlbnQgaXMgYXZhaWxhYmxlIG9ubHkgZm9yICd3aW5kb3cnXG4gICAgLy8gVXNlIGFub3RoZXIgY29kZSBzb2x1dGlvbnMgdG8gZGV0ZWN0IERPTSBlbGVtZW50cyByZXNpemluZ1xuICAgICRlbGVtZW50Lm9uKCdyZXNpemUuJyArIFBMVUdJTl9OQU1FLCBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChzZXR0aW5ncy5yZXNpemluZykge1xuICAgICAgICB2aWRlLnJlc2l6ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQXBwZW5kIGEgdmlkZW9cbiAgICAkd3JhcHBlci5hcHBlbmQoJHZpZGVvKTtcbiAgfTtcblxuICAvKipcbiAgICogR2V0IGEgdmlkZW8gZWxlbWVudFxuICAgKiBAcHVibGljXG4gICAqIEByZXR1cm5zIHtIVE1MVmlkZW9FbGVtZW50fVxuICAgKi9cbiAgVmlkZS5wcm90b3R5cGUuZ2V0VmlkZW9PYmplY3QgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy4kdmlkZW9bMF07XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlc2l6ZSBhIHZpZGVvIGJhY2tncm91bmRcbiAgICogQHB1YmxpY1xuICAgKi9cbiAgVmlkZS5wcm90b3R5cGUucmVzaXplID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLiR2aWRlbykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciAkd3JhcHBlciA9IHRoaXMuJHdyYXBwZXI7XG4gICAgdmFyICR2aWRlbyA9IHRoaXMuJHZpZGVvO1xuICAgIHZhciB2aWRlbyA9ICR2aWRlb1swXTtcblxuICAgIC8vIEdldCBhIG5hdGl2ZSB2aWRlbyBzaXplXG4gICAgdmFyIHZpZGVvSGVpZ2h0ID0gdmlkZW8udmlkZW9IZWlnaHQ7XG4gICAgdmFyIHZpZGVvV2lkdGggPSB2aWRlby52aWRlb1dpZHRoO1xuXG4gICAgLy8gR2V0IGEgd3JhcHBlciBzaXplXG4gICAgdmFyIHdyYXBwZXJIZWlnaHQgPSAkd3JhcHBlci5oZWlnaHQoKTtcbiAgICB2YXIgd3JhcHBlcldpZHRoID0gJHdyYXBwZXIud2lkdGgoKTtcblxuICAgIGlmICh3cmFwcGVyV2lkdGggLyB2aWRlb1dpZHRoID4gd3JhcHBlckhlaWdodCAvIHZpZGVvSGVpZ2h0KSB7XG4gICAgICAkdmlkZW8uY3NzKHtcblxuICAgICAgICAvLyArMiBwaXhlbHMgdG8gcHJldmVudCBhbiBlbXB0eSBzcGFjZSBhZnRlciB0cmFuc2Zvcm1hdGlvblxuICAgICAgICB3aWR0aDogd3JhcHBlcldpZHRoICsgMixcbiAgICAgICAgaGVpZ2h0OiAnYXV0bydcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAkdmlkZW8uY3NzKHtcbiAgICAgICAgd2lkdGg6ICdhdXRvJyxcblxuICAgICAgICAvLyArMiBwaXhlbHMgdG8gcHJldmVudCBhbiBlbXB0eSBzcGFjZSBhZnRlciB0cmFuc2Zvcm1hdGlvblxuICAgICAgICBoZWlnaHQ6IHdyYXBwZXJIZWlnaHQgKyAyXG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIERlc3Ryb3kgYSB2aWRlbyBiYWNrZ3JvdW5kXG4gICAqIEBwdWJsaWNcbiAgICovXG4gIFZpZGUucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICBkZWxldGUgJFtQTFVHSU5fTkFNRV0ubG9va3VwW3RoaXMuaW5kZXhdO1xuICAgIHRoaXMuJHZpZGVvICYmIHRoaXMuJHZpZGVvLm9mZihQTFVHSU5fTkFNRSk7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoUExVR0lOX05BTUUpLnJlbW92ZURhdGEoUExVR0lOX05BTUUpO1xuICAgIHRoaXMuJHdyYXBwZXIucmVtb3ZlKCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNwZWNpYWwgcGx1Z2luIG9iamVjdCBmb3IgaW5zdGFuY2VzLlxuICAgKiBAcHVibGljXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqL1xuICAkW1BMVUdJTl9OQU1FXSA9IHtcbiAgICBsb29rdXA6IFtdXG4gIH07XG5cbiAgLyoqXG4gICAqIFBsdWdpbiBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge09iamVjdHxTdHJpbmd9IHBhdGhcbiAgICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSBvcHRpb25zXG4gICAqIEByZXR1cm5zIHtKUXVlcnl9XG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgJC5mbltQTFVHSU5fTkFNRV0gPSBmdW5jdGlvbihwYXRoLCBvcHRpb25zKSB7XG4gICAgdmFyIGluc3RhbmNlO1xuXG4gICAgdGhpcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgaW5zdGFuY2UgPSAkLmRhdGEodGhpcywgUExVR0lOX05BTUUpO1xuXG4gICAgICAvLyBEZXN0cm95IHRoZSBwbHVnaW4gaW5zdGFuY2UgaWYgZXhpc3RzXG4gICAgICBpbnN0YW5jZSAmJiBpbnN0YW5jZS5kZXN0cm95KCk7XG5cbiAgICAgIC8vIENyZWF0ZSB0aGUgcGx1Z2luIGluc3RhbmNlXG4gICAgICBpbnN0YW5jZSA9IG5ldyBWaWRlKHRoaXMsIHBhdGgsIG9wdGlvbnMpO1xuICAgICAgaW5zdGFuY2UuaW5kZXggPSAkW1BMVUdJTl9OQU1FXS5sb29rdXAucHVzaChpbnN0YW5jZSkgLSAxO1xuICAgICAgJC5kYXRhKHRoaXMsIFBMVUdJTl9OQU1FLCBpbnN0YW5jZSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAkKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcbiAgICB2YXIgJHdpbmRvdyA9ICQod2luZG93KTtcblxuICAgIC8vIFdpbmRvdyByZXNpemUgZXZlbnQgbGlzdGVuZXJcbiAgICAkd2luZG93Lm9uKCdyZXNpemUuJyArIFBMVUdJTl9OQU1FLCBmdW5jdGlvbigpIHtcbiAgICAgIGZvciAodmFyIGxlbiA9ICRbUExVR0lOX05BTUVdLmxvb2t1cC5sZW5ndGgsIGkgPSAwLCBpbnN0YW5jZTsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGluc3RhbmNlID0gJFtQTFVHSU5fTkFNRV0ubG9va3VwW2ldO1xuXG4gICAgICAgIGlmIChpbnN0YW5jZSAmJiBpbnN0YW5jZS5zZXR0aW5ncy5yZXNpemluZykge1xuICAgICAgICAgIGluc3RhbmNlLnJlc2l6ZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vVm9ka2FCZWFycy9WaWRlL2lzc3Vlcy82OFxuICAgICR3aW5kb3cub24oJ3VubG9hZC4nICsgUExVR0lOX05BTUUsIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pO1xuXG4gICAgLy8gQXV0byBpbml0aWFsaXphdGlvblxuICAgIC8vIEFkZCAnZGF0YS12aWRlLWJnJyBhdHRyaWJ1dGUgd2l0aCBhIHBhdGggdG8gdGhlIHZpZGVvIHdpdGhvdXQgZXh0ZW5zaW9uXG4gICAgLy8gQWxzbyB5b3UgY2FuIHBhc3Mgb3B0aW9ucyB0aHJvdyB0aGUgJ2RhdGEtdmlkZS1vcHRpb25zJyBhdHRyaWJ1dGVcbiAgICAvLyAnZGF0YS12aWRlLW9wdGlvbnMnIG11c3QgYmUgbGlrZSAnbXV0ZWQ6IGZhbHNlLCB2b2x1bWU6IDAuNSdcbiAgICAkKGRvY3VtZW50KS5maW5kKCdbZGF0YS0nICsgUExVR0lOX05BTUUgKyAnLWJnXScpLmVhY2goZnVuY3Rpb24oaSwgZWxlbWVudCkge1xuICAgICAgdmFyICRlbGVtZW50ID0gJChlbGVtZW50KTtcbiAgICAgIHZhciBvcHRpb25zID0gJGVsZW1lbnQuZGF0YShQTFVHSU5fTkFNRSArICctb3B0aW9ucycpO1xuICAgICAgdmFyIHBhdGggPSAkZWxlbWVudC5kYXRhKFBMVUdJTl9OQU1FICsgJy1iZycpO1xuXG4gICAgICAkZWxlbWVudFtQTFVHSU5fTkFNRV0ocGF0aCwgb3B0aW9ucyk7XG4gICAgfSk7XG4gIH0pO1xuXG59KTsiXSwiZmlsZSI6InZlbmRvci9qcXVlcnkudmlkZS5qcyJ9
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJ2ZW5kb3IvanF1ZXJ5LnZpZGUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiIShmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoWydqcXVlcnknXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgZmFjdG9yeShyZXF1aXJlKCdqcXVlcnknKSk7XG4gIH0gZWxzZSB7XG4gICAgZmFjdG9yeShyb290LmpRdWVyeSk7XG4gIH1cbn0pKHRoaXMsIGZ1bmN0aW9uKCQpIHtcblxuICAndXNlIHN0cmljdCc7XG5cbiAgLyoqXG4gICAqIE5hbWUgb2YgdGhlIHBsdWdpblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAY29uc3RcbiAgICogQHR5cGUge1N0cmluZ31cbiAgICovXG4gIHZhciBQTFVHSU5fTkFNRSA9ICd2aWRlJztcblxuICAvKipcbiAgICogRGVmYXVsdCBzZXR0aW5nc1xuICAgKiBAcHJpdmF0ZVxuICAgKiBAY29uc3RcbiAgICogQHR5cGUge09iamVjdH1cbiAgICovXG4gIHZhciBERUZBVUxUUyA9IHtcbiAgICB2b2x1bWU6IDEsXG4gICAgcGxheWJhY2tSYXRlOiAxLFxuICAgIG11dGVkOiB0cnVlLFxuICAgIGxvb3A6IHRydWUsXG4gICAgYXV0b3BsYXk6IHRydWUsXG4gICAgcG9zaXRpb246ICc1MCUgNTAlJyxcbiAgICBwb3N0ZXJUeXBlOiAnZGV0ZWN0JyxcbiAgICByZXNpemluZzogdHJ1ZSxcbiAgICBiZ0NvbG9yOiAndHJhbnNwYXJlbnQnLFxuICAgIGNsYXNzTmFtZTogJydcbiAgfTtcblxuICAvKipcbiAgICogTm90IGltcGxlbWVudGVkIGVycm9yIG1lc3NhZ2VcbiAgICogQHByaXZhdGVcbiAgICogQGNvbnN0XG4gICAqIEB0eXBlIHtTdHJpbmd9XG4gICAqL1xuICB2YXIgTk9UX0lNUExFTUVOVEVEX01TRyA9ICdOb3QgaW1wbGVtZW50ZWQnO1xuXG4gIC8qKlxuICAgKiBQYXJzZSBhIHN0cmluZyB3aXRoIG9wdGlvbnNcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICAgKiBAcmV0dXJucyB7T2JqZWN0fFN0cmluZ31cbiAgICovXG4gIGZ1bmN0aW9uIHBhcnNlT3B0aW9ucyhzdHIpIHtcbiAgICB2YXIgb2JqID0ge307XG4gICAgdmFyIGRlbGltaXRlckluZGV4O1xuICAgIHZhciBvcHRpb247XG4gICAgdmFyIHByb3A7XG4gICAgdmFyIHZhbDtcbiAgICB2YXIgYXJyO1xuICAgIHZhciBsZW47XG4gICAgdmFyIGk7XG5cbiAgICAvLyBSZW1vdmUgc3BhY2VzIGFyb3VuZCBkZWxpbWl0ZXJzIGFuZCBzcGxpdFxuICAgIGFyciA9IHN0ci5yZXBsYWNlKC9cXHMqOlxccyovZywgJzonKS5yZXBsYWNlKC9cXHMqLFxccyovZywgJywnKS5zcGxpdCgnLCcpO1xuXG4gICAgLy8gUGFyc2UgYSBzdHJpbmdcbiAgICBmb3IgKGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIG9wdGlvbiA9IGFycltpXTtcblxuICAgICAgLy8gSWdub3JlIHVybHMgYW5kIGEgc3RyaW5nIHdpdGhvdXQgY29sb24gZGVsaW1pdGVyc1xuICAgICAgaWYgKFxuICAgICAgICBvcHRpb24uc2VhcmNoKC9eKGh0dHB8aHR0cHN8ZnRwKTpcXC9cXC8vKSAhPT0gLTEgfHxcbiAgICAgICAgb3B0aW9uLnNlYXJjaCgnOicpID09PSAtMVxuICAgICAgKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBkZWxpbWl0ZXJJbmRleCA9IG9wdGlvbi5pbmRleE9mKCc6Jyk7XG4gICAgICBwcm9wID0gb3B0aW9uLnN1YnN0cmluZygwLCBkZWxpbWl0ZXJJbmRleCk7XG4gICAgICB2YWwgPSBvcHRpb24uc3Vic3RyaW5nKGRlbGltaXRlckluZGV4ICsgMSk7XG5cbiAgICAgIC8vIElmIHZhbCBpcyBhbiBlbXB0eSBzdHJpbmcsIG1ha2UgaXQgdW5kZWZpbmVkXG4gICAgICBpZiAoIXZhbCkge1xuICAgICAgICB2YWwgPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIC8vIENvbnZlcnQgYSBzdHJpbmcgdmFsdWUgaWYgaXQgaXMgbGlrZSBhIGJvb2xlYW5cbiAgICAgIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgICAgICB2YWwgPSB2YWwgPT09ICd0cnVlJyB8fCAodmFsID09PSAnZmFsc2UnID8gZmFsc2UgOiB2YWwpO1xuICAgICAgfVxuXG4gICAgICAvLyBDb252ZXJ0IGEgc3RyaW5nIHZhbHVlIGlmIGl0IGlzIGxpa2UgYSBudW1iZXJcbiAgICAgIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgICAgICB2YWwgPSAhaXNOYU4odmFsKSA/ICt2YWwgOiB2YWw7XG4gICAgICB9XG5cbiAgICAgIG9ialtwcm9wXSA9IHZhbDtcbiAgICB9XG5cbiAgICAvLyBJZiBub3RoaW5nIGlzIHBhcnNlZFxuICAgIGlmIChwcm9wID09IG51bGwgJiYgdmFsID09IG51bGwpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSBhIHBvc2l0aW9uIG9wdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAqL1xuICBmdW5jdGlvbiBwYXJzZVBvc2l0aW9uKHN0cikge1xuICAgIHN0ciA9ICcnICsgc3RyO1xuXG4gICAgLy8gRGVmYXVsdCB2YWx1ZSBpcyBhIGNlbnRlclxuICAgIHZhciBhcmdzID0gc3RyLnNwbGl0KC9cXHMrLyk7XG4gICAgdmFyIHggPSAnNTAlJztcbiAgICB2YXIgeSA9ICc1MCUnO1xuICAgIHZhciBsZW47XG4gICAgdmFyIGFyZztcbiAgICB2YXIgaTtcblxuICAgIGZvciAoaSA9IDAsIGxlbiA9IGFyZ3MubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGFyZyA9IGFyZ3NbaV07XG5cbiAgICAgIC8vIENvbnZlcnQgdmFsdWVzXG4gICAgICBpZiAoYXJnID09PSAnbGVmdCcpIHtcbiAgICAgICAgeCA9ICcwJSc7XG4gICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJ3JpZ2h0Jykge1xuICAgICAgICB4ID0gJzEwMCUnO1xuICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICd0b3AnKSB7XG4gICAgICAgIHkgPSAnMCUnO1xuICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICdib3R0b20nKSB7XG4gICAgICAgIHkgPSAnMTAwJSc7XG4gICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJ2NlbnRlcicpIHtcbiAgICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICB4ID0gJzUwJSc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgeSA9ICc1MCUnO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgICAgIHggPSBhcmc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgeSA9IGFyZztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7IHg6IHgsIHk6IHkgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggYSBwb3N0ZXJcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICovXG4gIGZ1bmN0aW9uIGZpbmRQb3N0ZXIocGF0aCwgY2FsbGJhY2spIHtcbiAgICB2YXIgb25Mb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICBjYWxsYmFjayh0aGlzLnNyYyk7XG4gICAgfTtcblxuICAgICQoJzxpbWcgc3JjPVwiJyArIHBhdGggKyAnLmdpZlwiPicpLm9uKCdsb2FkJywgb25Mb2FkKTtcbiAgICAkKCc8aW1nIHNyYz1cIicgKyBwYXRoICsgJy5qcGdcIj4nKS5vbignbG9hZCcsIG9uTG9hZCk7XG4gICAgJCgnPGltZyBzcmM9XCInICsgcGF0aCArICcuanBlZ1wiPicpLm9uKCdsb2FkJywgb25Mb2FkKTtcbiAgICAkKCc8aW1nIHNyYz1cIicgKyBwYXRoICsgJy5wbmdcIj4nKS5vbignbG9hZCcsIG9uTG9hZCk7XG4gIH1cblxuICAvKipcbiAgICogVmlkZSBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtZW50XG4gICAqIEBwYXJhbSB7T2JqZWN0fFN0cmluZ30gcGF0aFxuICAgKiBAcGFyYW0ge09iamVjdHxTdHJpbmd9IG9wdGlvbnNcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqL1xuICBmdW5jdGlvbiBWaWRlKGVsZW1lbnQsIHBhdGgsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gJChlbGVtZW50KTtcblxuICAgIC8vIFBhcnNlIHBhdGhcbiAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICBwYXRoID0gcGFyc2VPcHRpb25zKHBhdGgpO1xuICAgIH1cblxuICAgIC8vIFBhcnNlIG9wdGlvbnNcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnc3RyaW5nJykge1xuICAgICAgb3B0aW9ucyA9IHBhcnNlT3B0aW9ucyhvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgYW4gZXh0ZW5zaW9uXG4gICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFwuXFx3KiQvLCAnJyk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgcGF0aCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGZvciAodmFyIGkgaW4gcGF0aCkge1xuICAgICAgICBpZiAocGF0aC5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICAgIHBhdGhbaV0gPSBwYXRoW2ldLnJlcGxhY2UoL1xcLlxcdyokLywgJycpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5zZXR0aW5ncyA9ICQuZXh0ZW5kKHt9LCBERUZBVUxUUywgb3B0aW9ucyk7XG4gICAgdGhpcy5wYXRoID0gcGF0aDtcblxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9Wb2RrYUJlYXJzL1ZpZGUvaXNzdWVzLzExMFxuICAgIHRyeSB7XG4gICAgICB0aGlzLmluaXQoKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZS5tZXNzYWdlICE9PSBOT1RfSU1QTEVNRU5URURfTVNHKSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemF0aW9uXG4gICAqIEBwdWJsaWNcbiAgICovXG4gIFZpZGUucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmlkZSA9IHRoaXM7XG4gICAgdmFyIHBhdGggPSB2aWRlLnBhdGg7XG4gICAgdmFyIHBvc3RlciA9IHBhdGg7XG4gICAgdmFyIHNvdXJjZXMgPSAnJztcbiAgICB2YXIgJGVsZW1lbnQgPSB2aWRlLiRlbGVtZW50O1xuICAgIHZhciBzZXR0aW5ncyA9IHZpZGUuc2V0dGluZ3M7XG4gICAgdmFyIHBvc2l0aW9uID0gcGFyc2VQb3NpdGlvbihzZXR0aW5ncy5wb3NpdGlvbik7XG4gICAgdmFyIHBvc3RlclR5cGUgPSBzZXR0aW5ncy5wb3N0ZXJUeXBlO1xuICAgIHZhciAkdmlkZW87XG4gICAgdmFyICR3cmFwcGVyO1xuXG4gICAgLy8gU2V0IHN0eWxlcyBvZiBhIHZpZGVvIHdyYXBwZXJcbiAgICAkd3JhcHBlciA9IHZpZGUuJHdyYXBwZXIgPSAkKCc8ZGl2PicpXG4gICAgICAuYWRkQ2xhc3Moc2V0dGluZ3MuY2xhc3NOYW1lKVxuICAgICAgLmNzcyh7XG4gICAgICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuICAgICAgICAnei1pbmRleCc6IC0xLFxuICAgICAgICB0b3A6IDAsXG4gICAgICAgIGxlZnQ6IDAsXG4gICAgICAgIGJvdHRvbTogMCxcbiAgICAgICAgcmlnaHQ6IDAsXG4gICAgICAgIG92ZXJmbG93OiAnaGlkZGVuJyxcbiAgICAgICAgJy13ZWJraXQtYmFja2dyb3VuZC1zaXplJzogJ2NvdmVyJyxcbiAgICAgICAgJy1tb3otYmFja2dyb3VuZC1zaXplJzogJ2NvdmVyJyxcbiAgICAgICAgJy1vLWJhY2tncm91bmQtc2l6ZSc6ICdjb3ZlcicsXG4gICAgICAgICdiYWNrZ3JvdW5kLXNpemUnOiAnY292ZXInLFxuICAgICAgICAnYmFja2dyb3VuZC1jb2xvcic6IHNldHRpbmdzLmJnQ29sb3IsXG4gICAgICAgICdiYWNrZ3JvdW5kLXJlcGVhdCc6ICduby1yZXBlYXQnLFxuICAgICAgICAnYmFja2dyb3VuZC1wb3NpdGlvbic6IHBvc2l0aW9uLnggKyAnICcgKyBwb3NpdGlvbi55XG4gICAgICB9KTtcblxuICAgIC8vIEdldCBhIHBvc3RlciBwYXRoXG4gICAgaWYgKHR5cGVvZiBwYXRoID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKHBhdGgucG9zdGVyKSB7XG4gICAgICAgIHBvc3RlciA9IHBhdGgucG9zdGVyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHBhdGgubXA0KSB7XG4gICAgICAgICAgcG9zdGVyID0gcGF0aC5tcDQ7XG4gICAgICAgIH0gZWxzZSBpZiAocGF0aC53ZWJtKSB7XG4gICAgICAgICAgcG9zdGVyID0gcGF0aC53ZWJtO1xuICAgICAgICB9IGVsc2UgaWYgKHBhdGgub2d2KSB7XG4gICAgICAgICAgcG9zdGVyID0gcGF0aC5vZ3Y7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTZXQgYSB2aWRlbyBwb3N0ZXJcbiAgICBpZiAocG9zdGVyVHlwZSA9PT0gJ2RldGVjdCcpIHtcbiAgICAgIGZpbmRQb3N0ZXIocG9zdGVyLCBmdW5jdGlvbih1cmwpIHtcbiAgICAgICAgJHdyYXBwZXIuY3NzKCdiYWNrZ3JvdW5kLWltYWdlJywgJ3VybCgnICsgdXJsICsgJyknKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAocG9zdGVyVHlwZSAhPT0gJ25vbmUnKSB7XG4gICAgICAkd3JhcHBlci5jc3MoJ2JhY2tncm91bmQtaW1hZ2UnLCAndXJsKCcgKyBwb3N0ZXIgKyAnLicgKyBwb3N0ZXJUeXBlICsgJyknKTtcbiAgICB9XG5cbiAgICAvLyBJZiBhIHBhcmVudCBlbGVtZW50IGhhcyBhIHN0YXRpYyBwb3NpdGlvbiwgbWFrZSBpdCByZWxhdGl2ZVxuICAgIGlmICgkZWxlbWVudC5jc3MoJ3Bvc2l0aW9uJykgPT09ICdzdGF0aWMnKSB7XG4gICAgICAkZWxlbWVudC5jc3MoJ3Bvc2l0aW9uJywgJ3JlbGF0aXZlJyk7XG4gICAgfVxuXG4gICAgJGVsZW1lbnQucHJlcGVuZCgkd3JhcHBlcik7XG5cbiAgICBpZiAodHlwZW9mIHBhdGggPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAocGF0aC5tcDQpIHtcbiAgICAgICAgc291cmNlcyArPSAnPHNvdXJjZSBzcmM9XCInICsgcGF0aC5tcDQgKyAnLm1wNFwiIHR5cGU9XCJ2aWRlby9tcDRcIj4nO1xuICAgICAgfVxuXG4gICAgICBpZiAocGF0aC53ZWJtKSB7XG4gICAgICAgIHNvdXJjZXMgKz0gJzxzb3VyY2Ugc3JjPVwiJyArIHBhdGgud2VibSArICcud2VibVwiIHR5cGU9XCJ2aWRlby93ZWJtXCI+JztcbiAgICAgIH1cblxuICAgICAgaWYgKHBhdGgub2d2KSB7XG4gICAgICAgIHNvdXJjZXMgKz0gJzxzb3VyY2Ugc3JjPVwiJyArIHBhdGgub2d2ICsgJy5vZ3ZcIiB0eXBlPVwidmlkZW8vb2dnXCI+JztcbiAgICAgIH1cblxuICAgICAgJHZpZGVvID0gdmlkZS4kdmlkZW8gPSAkKCc8dmlkZW8+JyArIHNvdXJjZXMgKyAnPC92aWRlbz4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgJHZpZGVvID0gdmlkZS4kdmlkZW8gPSAkKCc8dmlkZW8+JyArXG4gICAgICAgICc8c291cmNlIHNyYz1cIicgKyBwYXRoICsgJy5tcDRcIiB0eXBlPVwidmlkZW8vbXA0XCI+JyArXG4gICAgICAgICc8c291cmNlIHNyYz1cIicgKyBwYXRoICsgJy53ZWJtXCIgdHlwZT1cInZpZGVvL3dlYm1cIj4nICtcbiAgICAgICAgJzxzb3VyY2Ugc3JjPVwiJyArIHBhdGggKyAnLm9ndlwiIHR5cGU9XCJ2aWRlby9vZ2dcIj4nICtcbiAgICAgICAgJzwvdmlkZW8+Jyk7XG4gICAgfVxuXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL1ZvZGthQmVhcnMvVmlkZS9pc3N1ZXMvMTEwXG4gICAgdHJ5IHtcbiAgICAgICR2aWRlb1xuXG4gICAgICAgIC8vIFNldCB2aWRlbyBwcm9wZXJ0aWVzXG4gICAgICAgIC5wcm9wKHtcbiAgICAgICAgICBhdXRvcGxheTogc2V0dGluZ3MuYXV0b3BsYXksXG4gICAgICAgICAgbG9vcDogc2V0dGluZ3MubG9vcCxcbiAgICAgICAgICB2b2x1bWU6IHNldHRpbmdzLnZvbHVtZSxcbiAgICAgICAgICBtdXRlZDogc2V0dGluZ3MubXV0ZWQsXG4gICAgICAgICAgZGVmYXVsdE11dGVkOiBzZXR0aW5ncy5tdXRlZCxcbiAgICAgICAgICBwbGF5YmFja1JhdGU6IHNldHRpbmdzLnBsYXliYWNrUmF0ZSxcbiAgICAgICAgICBkZWZhdWx0UGxheWJhY2tSYXRlOiBzZXR0aW5ncy5wbGF5YmFja1JhdGVcbiAgICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKE5PVF9JTVBMRU1FTlRFRF9NU0cpO1xuICAgIH1cblxuICAgIC8vIFZpZGVvIGFsaWdubWVudFxuICAgICR2aWRlby5jc3Moe1xuICAgICAgbWFyZ2luOiAnYXV0bycsXG4gICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJyxcbiAgICAgICd6LWluZGV4JzogLTEsXG4gICAgICB0b3A6IHBvc2l0aW9uLnksXG4gICAgICBsZWZ0OiBwb3NpdGlvbi54LFxuICAgICAgJy13ZWJraXQtdHJhbnNmb3JtJzogJ3RyYW5zbGF0ZSgtJyArIHBvc2l0aW9uLnggKyAnLCAtJyArIHBvc2l0aW9uLnkgKyAnKScsXG4gICAgICAnLW1zLXRyYW5zZm9ybSc6ICd0cmFuc2xhdGUoLScgKyBwb3NpdGlvbi54ICsgJywgLScgKyBwb3NpdGlvbi55ICsgJyknLFxuICAgICAgJy1tb3otdHJhbnNmb3JtJzogJ3RyYW5zbGF0ZSgtJyArIHBvc2l0aW9uLnggKyAnLCAtJyArIHBvc2l0aW9uLnkgKyAnKScsXG4gICAgICB0cmFuc2Zvcm06ICd0cmFuc2xhdGUoLScgKyBwb3NpdGlvbi54ICsgJywgLScgKyBwb3NpdGlvbi55ICsgJyknLFxuXG4gICAgICAvLyBEaXNhYmxlIHZpc2liaWxpdHksIHdoaWxlIGxvYWRpbmdcbiAgICAgIHZpc2liaWxpdHk6ICdoaWRkZW4nLFxuICAgICAgb3BhY2l0eTogMFxuICAgIH0pXG5cbiAgICAvLyBSZXNpemUgYSB2aWRlbywgd2hlbiBpdCdzIGxvYWRlZFxuICAgIC5vbmUoJ2NhbnBsYXl0aHJvdWdoLicgKyBQTFVHSU5fTkFNRSwgZnVuY3Rpb24oKSB7XG4gICAgICB2aWRlLnJlc2l6ZSgpO1xuICAgIH0pXG5cbiAgICAvLyBNYWtlIGl0IHZpc2libGUsIHdoZW4gaXQncyBhbHJlYWR5IHBsYXlpbmdcbiAgICAub25lKCdwbGF5aW5nLicgKyBQTFVHSU5fTkFNRSwgZnVuY3Rpb24oKSB7XG4gICAgICAkdmlkZW8uY3NzKHtcbiAgICAgICAgdmlzaWJpbGl0eTogJ3Zpc2libGUnLFxuICAgICAgICBvcGFjaXR5OiAxXG4gICAgICB9KTtcbiAgICAgICR3cmFwcGVyLmNzcygnYmFja2dyb3VuZC1pbWFnZScsICdub25lJyk7XG4gICAgfSk7XG5cbiAgICAvLyBSZXNpemUgZXZlbnQgaXMgYXZhaWxhYmxlIG9ubHkgZm9yICd3aW5kb3cnXG4gICAgLy8gVXNlIGFub3RoZXIgY29kZSBzb2x1dGlvbnMgdG8gZGV0ZWN0IERPTSBlbGVtZW50cyByZXNpemluZ1xuICAgICRlbGVtZW50Lm9uKCdyZXNpemUuJyArIFBMVUdJTl9OQU1FLCBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChzZXR0aW5ncy5yZXNpemluZykge1xuICAgICAgICB2aWRlLnJlc2l6ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQXBwZW5kIGEgdmlkZW9cbiAgICAkd3JhcHBlci5hcHBlbmQoJHZpZGVvKTtcbiAgfTtcblxuICAvKipcbiAgICogR2V0IGEgdmlkZW8gZWxlbWVudFxuICAgKiBAcHVibGljXG4gICAqIEByZXR1cm5zIHtIVE1MVmlkZW9FbGVtZW50fVxuICAgKi9cbiAgVmlkZS5wcm90b3R5cGUuZ2V0VmlkZW9PYmplY3QgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy4kdmlkZW9bMF07XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlc2l6ZSBhIHZpZGVvIGJhY2tncm91bmRcbiAgICogQHB1YmxpY1xuICAgKi9cbiAgVmlkZS5wcm90b3R5cGUucmVzaXplID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLiR2aWRlbykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciAkd3JhcHBlciA9IHRoaXMuJHdyYXBwZXI7XG4gICAgdmFyICR2aWRlbyA9IHRoaXMuJHZpZGVvO1xuICAgIHZhciB2aWRlbyA9ICR2aWRlb1swXTtcblxuICAgIC8vIEdldCBhIG5hdGl2ZSB2aWRlbyBzaXplXG4gICAgdmFyIHZpZGVvSGVpZ2h0ID0gdmlkZW8udmlkZW9IZWlnaHQ7XG4gICAgdmFyIHZpZGVvV2lkdGggPSB2aWRlby52aWRlb1dpZHRoO1xuXG4gICAgLy8gR2V0IGEgd3JhcHBlciBzaXplXG4gICAgdmFyIHdyYXBwZXJIZWlnaHQgPSAkd3JhcHBlci5oZWlnaHQoKTtcbiAgICB2YXIgd3JhcHBlcldpZHRoID0gJHdyYXBwZXIud2lkdGgoKTtcblxuICAgIGlmICh3cmFwcGVyV2lkdGggLyB2aWRlb1dpZHRoID4gd3JhcHBlckhlaWdodCAvIHZpZGVvSGVpZ2h0KSB7XG4gICAgICAkdmlkZW8uY3NzKHtcblxuICAgICAgICAvLyArMiBwaXhlbHMgdG8gcHJldmVudCBhbiBlbXB0eSBzcGFjZSBhZnRlciB0cmFuc2Zvcm1hdGlvblxuICAgICAgICB3aWR0aDogd3JhcHBlcldpZHRoICsgMixcbiAgICAgICAgaGVpZ2h0OiAnYXV0bydcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAkdmlkZW8uY3NzKHtcbiAgICAgICAgd2lkdGg6ICdhdXRvJyxcblxuICAgICAgICAvLyArMiBwaXhlbHMgdG8gcHJldmVudCBhbiBlbXB0eSBzcGFjZSBhZnRlciB0cmFuc2Zvcm1hdGlvblxuICAgICAgICBoZWlnaHQ6IHdyYXBwZXJIZWlnaHQgKyAyXG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIERlc3Ryb3kgYSB2aWRlbyBiYWNrZ3JvdW5kXG4gICAqIEBwdWJsaWNcbiAgICovXG4gIFZpZGUucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICBkZWxldGUgJFtQTFVHSU5fTkFNRV0ubG9va3VwW3RoaXMuaW5kZXhdO1xuICAgIHRoaXMuJHZpZGVvICYmIHRoaXMuJHZpZGVvLm9mZihQTFVHSU5fTkFNRSk7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoUExVR0lOX05BTUUpLnJlbW92ZURhdGEoUExVR0lOX05BTUUpO1xuICAgIHRoaXMuJHdyYXBwZXIucmVtb3ZlKCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNwZWNpYWwgcGx1Z2luIG9iamVjdCBmb3IgaW5zdGFuY2VzLlxuICAgKiBAcHVibGljXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqL1xuICAkW1BMVUdJTl9OQU1FXSA9IHtcbiAgICBsb29rdXA6IFtdXG4gIH07XG5cbiAgLyoqXG4gICAqIFBsdWdpbiBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge09iamVjdHxTdHJpbmd9IHBhdGhcbiAgICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSBvcHRpb25zXG4gICAqIEByZXR1cm5zIHtKUXVlcnl9XG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgJC5mbltQTFVHSU5fTkFNRV0gPSBmdW5jdGlvbihwYXRoLCBvcHRpb25zKSB7XG4gICAgdmFyIGluc3RhbmNlO1xuXG4gICAgdGhpcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgaW5zdGFuY2UgPSAkLmRhdGEodGhpcywgUExVR0lOX05BTUUpO1xuXG4gICAgICAvLyBEZXN0cm95IHRoZSBwbHVnaW4gaW5zdGFuY2UgaWYgZXhpc3RzXG4gICAgICBpbnN0YW5jZSAmJiBpbnN0YW5jZS5kZXN0cm95KCk7XG5cbiAgICAgIC8vIENyZWF0ZSB0aGUgcGx1Z2luIGluc3RhbmNlXG4gICAgICBpbnN0YW5jZSA9IG5ldyBWaWRlKHRoaXMsIHBhdGgsIG9wdGlvbnMpO1xuICAgICAgaW5zdGFuY2UuaW5kZXggPSAkW1BMVUdJTl9OQU1FXS5sb29rdXAucHVzaChpbnN0YW5jZSkgLSAxO1xuICAgICAgJC5kYXRhKHRoaXMsIFBMVUdJTl9OQU1FLCBpbnN0YW5jZSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAkKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcbiAgICB2YXIgJHdpbmRvdyA9ICQod2luZG93KTtcblxuICAgIC8vIFdpbmRvdyByZXNpemUgZXZlbnQgbGlzdGVuZXJcbiAgICAkd2luZG93Lm9uKCdyZXNpemUuJyArIFBMVUdJTl9OQU1FLCBmdW5jdGlvbigpIHtcbiAgICAgIGZvciAodmFyIGxlbiA9ICRbUExVR0lOX05BTUVdLmxvb2t1cC5sZW5ndGgsIGkgPSAwLCBpbnN0YW5jZTsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGluc3RhbmNlID0gJFtQTFVHSU5fTkFNRV0ubG9va3VwW2ldO1xuXG4gICAgICAgIGlmIChpbnN0YW5jZSAmJiBpbnN0YW5jZS5zZXR0aW5ncy5yZXNpemluZykge1xuICAgICAgICAgIGluc3RhbmNlLnJlc2l6ZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vVm9ka2FCZWFycy9WaWRlL2lzc3Vlcy82OFxuICAgICR3aW5kb3cub24oJ3VubG9hZC4nICsgUExVR0lOX05BTUUsIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pO1xuXG4gICAgLy8gQXV0byBpbml0aWFsaXphdGlvblxuICAgIC8vIEFkZCAnZGF0YS12aWRlLWJnJyBhdHRyaWJ1dGUgd2l0aCBhIHBhdGggdG8gdGhlIHZpZGVvIHdpdGhvdXQgZXh0ZW5zaW9uXG4gICAgLy8gQWxzbyB5b3UgY2FuIHBhc3Mgb3B0aW9ucyB0aHJvdyB0aGUgJ2RhdGEtdmlkZS1vcHRpb25zJyBhdHRyaWJ1dGVcbiAgICAvLyAnZGF0YS12aWRlLW9wdGlvbnMnIG11c3QgYmUgbGlrZSAnbXV0ZWQ6IGZhbHNlLCB2b2x1bWU6IDAuNSdcbiAgICAkKGRvY3VtZW50KS5maW5kKCdbZGF0YS0nICsgUExVR0lOX05BTUUgKyAnLWJnXScpLmVhY2goZnVuY3Rpb24oaSwgZWxlbWVudCkge1xuICAgICAgdmFyICRlbGVtZW50ID0gJChlbGVtZW50KTtcbiAgICAgIHZhciBvcHRpb25zID0gJGVsZW1lbnQuZGF0YShQTFVHSU5fTkFNRSArICctb3B0aW9ucycpO1xuICAgICAgdmFyIHBhdGggPSAkZWxlbWVudC5kYXRhKFBMVUdJTl9OQU1FICsgJy1iZycpO1xuXG4gICAgICAkZWxlbWVudFtQTFVHSU5fTkFNRV0ocGF0aCwgb3B0aW9ucyk7XG4gICAgfSk7XG4gIH0pO1xuXG59KTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zjg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p1WVcxbGN5STZXMTBzSW0xaGNIQnBibWR6SWpvaUlpd2ljMjkxY21ObGN5STZXeUoyWlc1a2IzSXZhbkYxWlhKNUxuWnBaR1V1YW5NaVhTd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lJU2htZFc1amRHbHZiaWh5YjI5MExDQm1ZV04wYjNKNUtTQjdYRzRnSUdsbUlDaDBlWEJsYjJZZ1pHVm1hVzVsSUQwOVBTQW5ablZ1WTNScGIyNG5JQ1ltSUdSbFptbHVaUzVoYldRcElIdGNiaUFnSUNCa1pXWnBibVVvV3lkcWNYVmxjbmtuWFN3Z1ptRmpkRzl5ZVNrN1hHNGdJSDBnWld4elpTQnBaaUFvZEhsd1pXOW1JR1Y0Y0c5eWRITWdQVDA5SUNkdlltcGxZM1FuS1NCN1hHNGdJQ0FnWm1GamRHOXllU2h5WlhGMWFYSmxLQ2RxY1hWbGNua25LU2s3WEc0Z0lIMGdaV3h6WlNCN1hHNGdJQ0FnWm1GamRHOXllU2h5YjI5MExtcFJkV1Z5ZVNrN1hHNGdJSDFjYm4wcEtIUm9hWE1zSUdaMWJtTjBhVzl1S0NRcElIdGNibHh1SUNBbmRYTmxJSE4wY21samRDYzdYRzVjYmlBZ0x5b3FYRzRnSUNBcUlFNWhiV1VnYjJZZ2RHaGxJSEJzZFdkcGJseHVJQ0FnS2lCQWNISnBkbUYwWlZ4dUlDQWdLaUJBWTI5dWMzUmNiaUFnSUNvZ1FIUjVjR1VnZTFOMGNtbHVaMzFjYmlBZ0lDb3ZYRzRnSUhaaGNpQlFURlZIU1U1ZlRrRk5SU0E5SUNkMmFXUmxKenRjYmx4dUlDQXZLaXBjYmlBZ0lDb2dSR1ZtWVhWc2RDQnpaWFIwYVc1bmMxeHVJQ0FnS2lCQWNISnBkbUYwWlZ4dUlDQWdLaUJBWTI5dWMzUmNiaUFnSUNvZ1FIUjVjR1VnZTA5aWFtVmpkSDFjYmlBZ0lDb3ZYRzRnSUhaaGNpQkVSVVpCVlV4VVV5QTlJSHRjYmlBZ0lDQjJiMngxYldVNklERXNYRzRnSUNBZ2NHeGhlV0poWTJ0U1lYUmxPaUF4TEZ4dUlDQWdJRzExZEdWa09pQjBjblZsTEZ4dUlDQWdJR3h2YjNBNklIUnlkV1VzWEc0Z0lDQWdZWFYwYjNCc1lYazZJSFJ5ZFdVc1hHNGdJQ0FnY0c5emFYUnBiMjQ2SUNjMU1DVWdOVEFsSnl4Y2JpQWdJQ0J3YjNOMFpYSlVlWEJsT2lBblpHVjBaV04wSnl4Y2JpQWdJQ0J5WlhOcGVtbHVaem9nZEhKMVpTeGNiaUFnSUNCaVowTnZiRzl5T2lBbmRISmhibk53WVhKbGJuUW5MRnh1SUNBZ0lHTnNZWE56VG1GdFpUb2dKeWRjYmlBZ2ZUdGNibHh1SUNBdktpcGNiaUFnSUNvZ1RtOTBJR2x0Y0d4bGJXVnVkR1ZrSUdWeWNtOXlJRzFsYzNOaFoyVmNiaUFnSUNvZ1FIQnlhWFpoZEdWY2JpQWdJQ29nUUdOdmJuTjBYRzRnSUNBcUlFQjBlWEJsSUh0VGRISnBibWQ5WEc0Z0lDQXFMMXh1SUNCMllYSWdUazlVWDBsTlVFeEZUVVZPVkVWRVgwMVRSeUE5SUNkT2IzUWdhVzF3YkdWdFpXNTBaV1FuTzF4dVhHNGdJQzhxS2x4dUlDQWdLaUJRWVhKelpTQmhJSE4wY21sdVp5QjNhWFJvSUc5d2RHbHZibk5jYmlBZ0lDb2dRSEJ5YVhaaGRHVmNiaUFnSUNvZ1FIQmhjbUZ0SUh0VGRISnBibWQ5SUhOMGNseHVJQ0FnS2lCQWNtVjBkWEp1Y3lCN1QySnFaV04wZkZOMGNtbHVaMzFjYmlBZ0lDb3ZYRzRnSUdaMWJtTjBhVzl1SUhCaGNuTmxUM0IwYVc5dWN5aHpkSElwSUh0Y2JpQWdJQ0IyWVhJZ2IySnFJRDBnZTMwN1hHNGdJQ0FnZG1GeUlHUmxiR2x0YVhSbGNrbHVaR1Y0TzF4dUlDQWdJSFpoY2lCdmNIUnBiMjQ3WEc0Z0lDQWdkbUZ5SUhCeWIzQTdYRzRnSUNBZ2RtRnlJSFpoYkR0Y2JpQWdJQ0IyWVhJZ1lYSnlPMXh1SUNBZ0lIWmhjaUJzWlc0N1hHNGdJQ0FnZG1GeUlHazdYRzVjYmlBZ0lDQXZMeUJTWlcxdmRtVWdjM0JoWTJWeklHRnliM1Z1WkNCa1pXeHBiV2wwWlhKeklHRnVaQ0J6Y0d4cGRGeHVJQ0FnSUdGeWNpQTlJSE4wY2k1eVpYQnNZV05sS0M5Y1hITXFPbHhjY3lvdlp5d2dKem9uS1M1eVpYQnNZV05sS0M5Y1hITXFMRnhjY3lvdlp5d2dKeXduS1M1emNHeHBkQ2duTENjcE8xeHVYRzRnSUNBZ0x5OGdVR0Z5YzJVZ1lTQnpkSEpwYm1kY2JpQWdJQ0JtYjNJZ0tHa2dQU0F3TENCc1pXNGdQU0JoY25JdWJHVnVaM1JvT3lCcElEd2diR1Z1T3lCcEt5c3BJSHRjYmlBZ0lDQWdJRzl3ZEdsdmJpQTlJR0Z5Y2x0cFhUdGNibHh1SUNBZ0lDQWdMeThnU1dkdWIzSmxJSFZ5YkhNZ1lXNWtJR0VnYzNSeWFXNW5JSGRwZEdodmRYUWdZMjlzYjI0Z1pHVnNhVzFwZEdWeWMxeHVJQ0FnSUNBZ2FXWWdLRnh1SUNBZ0lDQWdJQ0J2Y0hScGIyNHVjMlZoY21Ob0tDOWVLR2gwZEhCOGFIUjBjSE44Wm5Sd0tUcGNYQzljWEM4dktTQWhQVDBnTFRFZ2ZIeGNiaUFnSUNBZ0lDQWdiM0IwYVc5dUxuTmxZWEpqYUNnbk9pY3BJRDA5UFNBdE1WeHVJQ0FnSUNBZ0tTQjdYRzRnSUNBZ0lDQWdJR0p5WldGck8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQmtaV3hwYldsMFpYSkpibVJsZUNBOUlHOXdkR2x2Ymk1cGJtUmxlRTltS0NjNkp5azdYRzRnSUNBZ0lDQndjbTl3SUQwZ2IzQjBhVzl1TG5OMVluTjBjbWx1Wnlnd0xDQmtaV3hwYldsMFpYSkpibVJsZUNrN1hHNGdJQ0FnSUNCMllXd2dQU0J2Y0hScGIyNHVjM1ZpYzNSeWFXNW5LR1JsYkdsdGFYUmxja2x1WkdWNElDc2dNU2s3WEc1Y2JpQWdJQ0FnSUM4dklFbG1JSFpoYkNCcGN5QmhiaUJsYlhCMGVTQnpkSEpwYm1jc0lHMWhhMlVnYVhRZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNCcFppQW9JWFpoYkNrZ2UxeHVJQ0FnSUNBZ0lDQjJZV3dnUFNCMWJtUmxabWx1WldRN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJRU52Ym5abGNuUWdZU0J6ZEhKcGJtY2dkbUZzZFdVZ2FXWWdhWFFnYVhNZ2JHbHJaU0JoSUdKdmIyeGxZVzVjYmlBZ0lDQWdJR2xtSUNoMGVYQmxiMllnZG1Gc0lEMDlQU0FuYzNSeWFXNW5KeWtnZTF4dUlDQWdJQ0FnSUNCMllXd2dQU0IyWVd3Z1BUMDlJQ2QwY25WbEp5QjhmQ0FvZG1Gc0lEMDlQU0FuWm1Gc2MyVW5JRDhnWm1Gc2MyVWdPaUIyWVd3cE8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJEYjI1MlpYSjBJR0VnYzNSeWFXNW5JSFpoYkhWbElHbG1JR2wwSUdseklHeHBhMlVnWVNCdWRXMWlaWEpjYmlBZ0lDQWdJR2xtSUNoMGVYQmxiMllnZG1Gc0lEMDlQU0FuYzNSeWFXNW5KeWtnZTF4dUlDQWdJQ0FnSUNCMllXd2dQU0FoYVhOT1lVNG9kbUZzS1NBL0lDdDJZV3dnT2lCMllXdzdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJRzlpYWx0d2NtOXdYU0E5SUhaaGJEdGNiaUFnSUNCOVhHNWNiaUFnSUNBdkx5QkpaaUJ1YjNSb2FXNW5JR2x6SUhCaGNuTmxaRnh1SUNBZ0lHbG1JQ2h3Y205d0lEMDlJRzUxYkd3Z0ppWWdkbUZzSUQwOUlHNTFiR3dwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJ6ZEhJN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnY21WMGRYSnVJRzlpYWp0Y2JpQWdmVnh1WEc0Z0lDOHFLbHh1SUNBZ0tpQlFZWEp6WlNCaElIQnZjMmwwYVc5dUlHOXdkR2x2Ymx4dUlDQWdLaUJBY0hKcGRtRjBaVnh1SUNBZ0tpQkFjR0Z5WVcwZ2UxTjBjbWx1WjMwZ2MzUnlYRzRnSUNBcUlFQnlaWFIxY201eklIdFBZbXBsWTNSOVhHNGdJQ0FxTDF4dUlDQm1kVzVqZEdsdmJpQndZWEp6WlZCdmMybDBhVzl1S0hOMGNpa2dlMXh1SUNBZ0lITjBjaUE5SUNjbklDc2djM1J5TzF4dVhHNGdJQ0FnTHk4Z1JHVm1ZWFZzZENCMllXeDFaU0JwY3lCaElHTmxiblJsY2x4dUlDQWdJSFpoY2lCaGNtZHpJRDBnYzNSeUxuTndiR2wwS0M5Y1hITXJMeWs3WEc0Z0lDQWdkbUZ5SUhnZ1BTQW5OVEFsSnp0Y2JpQWdJQ0IyWVhJZ2VTQTlJQ2MxTUNVbk8xeHVJQ0FnSUhaaGNpQnNaVzQ3WEc0Z0lDQWdkbUZ5SUdGeVp6dGNiaUFnSUNCMllYSWdhVHRjYmx4dUlDQWdJR1p2Y2lBb2FTQTlJREFzSUd4bGJpQTlJR0Z5WjNNdWJHVnVaM1JvT3lCcElEd2diR1Z1T3lCcEt5c3BJSHRjYmlBZ0lDQWdJR0Z5WnlBOUlHRnlaM05iYVYwN1hHNWNiaUFnSUNBZ0lDOHZJRU52Ym5abGNuUWdkbUZzZFdWelhHNGdJQ0FnSUNCcFppQW9ZWEpuSUQwOVBTQW5iR1ZtZENjcElIdGNiaUFnSUNBZ0lDQWdlQ0E5SUNjd0pTYzdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLR0Z5WnlBOVBUMGdKM0pwWjJoMEp5a2dlMXh1SUNBZ0lDQWdJQ0I0SUQwZ0p6RXdNQ1VuTzF4dUlDQWdJQ0FnZlNCbGJITmxJR2xtSUNoaGNtY2dQVDA5SUNkMGIzQW5LU0I3WEc0Z0lDQWdJQ0FnSUhrZ1BTQW5NQ1VuTzF4dUlDQWdJQ0FnZlNCbGJITmxJR2xtSUNoaGNtY2dQVDA5SUNkaWIzUjBiMjBuS1NCN1hHNGdJQ0FnSUNBZ0lIa2dQU0FuTVRBd0pTYzdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLR0Z5WnlBOVBUMGdKMk5sYm5SbGNpY3BJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHa2dQVDA5SURBcElIdGNiaUFnSUNBZ0lDQWdJQ0I0SUQwZ0p6VXdKU2M3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ2VTQTlJQ2MxTUNVbk8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvYVNBOVBUMGdNQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lIZ2dQU0JoY21jN1hHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdlU0E5SUdGeVp6dGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdmVnh1SUNBZ0lIMWNibHh1SUNBZ0lISmxkSFZ5YmlCN0lIZzZJSGdzSUhrNklIa2dmVHRjYmlBZ2ZWeHVYRzRnSUM4cUtseHVJQ0FnS2lCVFpXRnlZMmdnWVNCd2IzTjBaWEpjYmlBZ0lDb2dRSEJ5YVhaaGRHVmNiaUFnSUNvZ1FIQmhjbUZ0SUh0VGRISnBibWQ5SUhCaGRHaGNiaUFnSUNvZ1FIQmhjbUZ0SUh0R2RXNWpkR2x2Ym4wZ1kyRnNiR0poWTJ0Y2JpQWdJQ292WEc0Z0lHWjFibU4wYVc5dUlHWnBibVJRYjNOMFpYSW9jR0YwYUN3Z1kyRnNiR0poWTJzcElIdGNiaUFnSUNCMllYSWdiMjVNYjJGa0lEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0JqWVd4c1ltRmpheWgwYUdsekxuTnlZeWs3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJQ1FvSnp4cGJXY2djM0pqUFZ3aUp5QXJJSEJoZEdnZ0t5QW5MbWRwWmx3aVBpY3BMbTl1S0Nkc2IyRmtKeXdnYjI1TWIyRmtLVHRjYmlBZ0lDQWtLQ2M4YVcxbklITnlZejFjSWljZ0t5QndZWFJvSUNzZ0p5NXFjR2RjSWo0bktTNXZiaWduYkc5aFpDY3NJRzl1VEc5aFpDazdYRzRnSUNBZ0pDZ25QR2x0WnlCemNtTTlYQ0luSUNzZ2NHRjBhQ0FySUNjdWFuQmxaMXdpUGljcExtOXVLQ2RzYjJGa0p5d2diMjVNYjJGa0tUdGNiaUFnSUNBa0tDYzhhVzFuSUhOeVl6MWNJaWNnS3lCd1lYUm9JQ3NnSnk1d2JtZGNJajRuS1M1dmJpZ25iRzloWkNjc0lHOXVURzloWkNrN1hHNGdJSDFjYmx4dUlDQXZLaXBjYmlBZ0lDb2dWbWxrWlNCamIyNXpkSEoxWTNSdmNseHVJQ0FnS2lCQWNHRnlZVzBnZTBoVVRVeEZiR1Z0Wlc1MGZTQmxiR1Z0Wlc1MFhHNGdJQ0FxSUVCd1lYSmhiU0I3VDJKcVpXTjBmRk4wY21sdVozMGdjR0YwYUZ4dUlDQWdLaUJBY0dGeVlXMGdlMDlpYW1WamRIeFRkSEpwYm1kOUlHOXdkR2x2Ym5OY2JpQWdJQ29nUUdOdmJuTjBjblZqZEc5eVhHNGdJQ0FxTDF4dUlDQm1kVzVqZEdsdmJpQldhV1JsS0dWc1pXMWxiblFzSUhCaGRHZ3NJRzl3ZEdsdmJuTXBJSHRjYmlBZ0lDQjBhR2x6TGlSbGJHVnRaVzUwSUQwZ0pDaGxiR1Z0Wlc1MEtUdGNibHh1SUNBZ0lDOHZJRkJoY25ObElIQmhkR2hjYmlBZ0lDQnBaaUFvZEhsd1pXOW1JSEJoZEdnZ1BUMDlJQ2R6ZEhKcGJtY25LU0I3WEc0Z0lDQWdJQ0J3WVhSb0lEMGdjR0Z5YzJWUGNIUnBiMjV6S0hCaGRHZ3BPMXh1SUNBZ0lIMWNibHh1SUNBZ0lDOHZJRkJoY25ObElHOXdkR2x2Ym5OY2JpQWdJQ0JwWmlBb0lXOXdkR2x2Ym5NcElIdGNiaUFnSUNBZ0lHOXdkR2x2Ym5NZ1BTQjdmVHRjYmlBZ0lDQjlJR1ZzYzJVZ2FXWWdLSFI1Y0dWdlppQnZjSFJwYjI1eklEMDlQU0FuYzNSeWFXNW5KeWtnZTF4dUlDQWdJQ0FnYjNCMGFXOXVjeUE5SUhCaGNuTmxUM0IwYVc5dWN5aHZjSFJwYjI1ektUdGNiaUFnSUNCOVhHNWNiaUFnSUNBdkx5QlNaVzF2ZG1VZ1lXNGdaWGgwWlc1emFXOXVYRzRnSUNBZ2FXWWdLSFI1Y0dWdlppQndZWFJvSUQwOVBTQW5jM1J5YVc1bkp5a2dlMXh1SUNBZ0lDQWdjR0YwYUNBOUlIQmhkR2d1Y21Wd2JHRmpaU2d2WEZ3dVhGeDNLaVF2TENBbkp5azdYRzRnSUNBZ2ZTQmxiSE5sSUdsbUlDaDBlWEJsYjJZZ2NHRjBhQ0E5UFQwZ0oyOWlhbVZqZENjcElIdGNiaUFnSUNBZ0lHWnZjaUFvZG1GeUlHa2dhVzRnY0dGMGFDa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2NHRjBhQzVvWVhOUGQyNVFjbTl3WlhKMGVTaHBLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lIQmhkR2hiYVYwZ1BTQndZWFJvVzJsZExuSmxjR3hoWTJVb0wxeGNMbHhjZHlva0x5d2dKeWNwTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dVhHNGdJQ0FnZEdocGN5NXpaWFIwYVc1bmN5QTlJQ1F1WlhoMFpXNWtLSHQ5TENCRVJVWkJWVXhVVXl3Z2IzQjBhVzl1Y3lrN1hHNGdJQ0FnZEdocGN5NXdZWFJvSUQwZ2NHRjBhRHRjYmx4dUlDQWdJQzh2SUdoMGRIQnpPaTh2WjJsMGFIVmlMbU52YlM5V2IyUnJZVUpsWVhKekwxWnBaR1V2YVhOemRXVnpMekV4TUZ4dUlDQWdJSFJ5ZVNCN1hHNGdJQ0FnSUNCMGFHbHpMbWx1YVhRb0tUdGNiaUFnSUNCOUlHTmhkR05vSUNobEtTQjdYRzRnSUNBZ0lDQnBaaUFvWlM1dFpYTnpZV2RsSUNFOVBTQk9UMVJmU1UxUVRFVk5SVTVVUlVSZlRWTkhLU0I3WEc0Z0lDQWdJQ0FnSUhSb2NtOTNJR1U3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1SUNCOVhHNWNiaUFnTHlvcVhHNGdJQ0FxSUVsdWFYUnBZV3hwZW1GMGFXOXVYRzRnSUNBcUlFQndkV0pzYVdOY2JpQWdJQ292WEc0Z0lGWnBaR1V1Y0hKdmRHOTBlWEJsTG1sdWFYUWdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0IyWVhJZ2RtbGtaU0E5SUhSb2FYTTdYRzRnSUNBZ2RtRnlJSEJoZEdnZ1BTQjJhV1JsTG5CaGRHZzdYRzRnSUNBZ2RtRnlJSEJ2YzNSbGNpQTlJSEJoZEdnN1hHNGdJQ0FnZG1GeUlITnZkWEpqWlhNZ1BTQW5KenRjYmlBZ0lDQjJZWElnSkdWc1pXMWxiblFnUFNCMmFXUmxMaVJsYkdWdFpXNTBPMXh1SUNBZ0lIWmhjaUJ6WlhSMGFXNW5jeUE5SUhacFpHVXVjMlYwZEdsdVozTTdYRzRnSUNBZ2RtRnlJSEJ2YzJsMGFXOXVJRDBnY0dGeWMyVlFiM05wZEdsdmJpaHpaWFIwYVc1bmN5NXdiM05wZEdsdmJpazdYRzRnSUNBZ2RtRnlJSEJ2YzNSbGNsUjVjR1VnUFNCelpYUjBhVzVuY3k1d2IzTjBaWEpVZVhCbE8xeHVJQ0FnSUhaaGNpQWtkbWxrWlc4N1hHNGdJQ0FnZG1GeUlDUjNjbUZ3Y0dWeU8xeHVYRzRnSUNBZ0x5OGdVMlYwSUhOMGVXeGxjeUJ2WmlCaElIWnBaR1Z2SUhkeVlYQndaWEpjYmlBZ0lDQWtkM0poY0hCbGNpQTlJSFpwWkdVdUpIZHlZWEJ3WlhJZ1BTQWtLQ2M4WkdsMlBpY3BYRzRnSUNBZ0lDQXVZV1JrUTJ4aGMzTW9jMlYwZEdsdVozTXVZMnhoYzNOT1lXMWxLVnh1SUNBZ0lDQWdMbU56Y3loN1hHNGdJQ0FnSUNBZ0lIQnZjMmwwYVc5dU9pQW5ZV0p6YjJ4MWRHVW5MRnh1SUNBZ0lDQWdJQ0FuZWkxcGJtUmxlQ2M2SUMweExGeHVJQ0FnSUNBZ0lDQjBiM0E2SURBc1hHNGdJQ0FnSUNBZ0lHeGxablE2SURBc1hHNGdJQ0FnSUNBZ0lHSnZkSFJ2YlRvZ01DeGNiaUFnSUNBZ0lDQWdjbWxuYUhRNklEQXNYRzRnSUNBZ0lDQWdJRzkyWlhKbWJHOTNPaUFuYUdsa1pHVnVKeXhjYmlBZ0lDQWdJQ0FnSnkxM1pXSnJhWFF0WW1GamEyZHliM1Z1WkMxemFYcGxKem9nSjJOdmRtVnlKeXhjYmlBZ0lDQWdJQ0FnSnkxdGIzb3RZbUZqYTJkeWIzVnVaQzF6YVhwbEp6b2dKMk52ZG1WeUp5eGNiaUFnSUNBZ0lDQWdKeTF2TFdKaFkydG5jbTkxYm1RdGMybDZaU2M2SUNkamIzWmxjaWNzWEc0Z0lDQWdJQ0FnSUNkaVlXTnJaM0p2ZFc1a0xYTnBlbVVuT2lBblkyOTJaWEluTEZ4dUlDQWdJQ0FnSUNBblltRmphMmR5YjNWdVpDMWpiMnh2Y2ljNklITmxkSFJwYm1kekxtSm5RMjlzYjNJc1hHNGdJQ0FnSUNBZ0lDZGlZV05yWjNKdmRXNWtMWEpsY0dWaGRDYzZJQ2R1YnkxeVpYQmxZWFFuTEZ4dUlDQWdJQ0FnSUNBblltRmphMmR5YjNWdVpDMXdiM05wZEdsdmJpYzZJSEJ2YzJsMGFXOXVMbmdnS3lBbklDY2dLeUJ3YjNOcGRHbHZiaTU1WEc0Z0lDQWdJQ0I5S1R0Y2JseHVJQ0FnSUM4dklFZGxkQ0JoSUhCdmMzUmxjaUJ3WVhSb1hHNGdJQ0FnYVdZZ0tIUjVjR1Z2WmlCd1lYUm9JRDA5UFNBbmIySnFaV04wSnlrZ2UxeHVJQ0FnSUNBZ2FXWWdLSEJoZEdndWNHOXpkR1Z5S1NCN1hHNGdJQ0FnSUNBZ0lIQnZjM1JsY2lBOUlIQmhkR2d1Y0c5emRHVnlPMXh1SUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdhV1lnS0hCaGRHZ3ViWEEwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdjRzl6ZEdWeUlEMGdjR0YwYUM1dGNEUTdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQnBaaUFvY0dGMGFDNTNaV0p0S1NCN1hHNGdJQ0FnSUNBZ0lDQWdjRzl6ZEdWeUlEMGdjR0YwYUM1M1pXSnRPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hCaGRHZ3ViMmQyS1NCN1hHNGdJQ0FnSUNBZ0lDQWdjRzl6ZEdWeUlEMGdjR0YwYUM1dlozWTdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZMeUJUWlhRZ1lTQjJhV1JsYnlCd2IzTjBaWEpjYmlBZ0lDQnBaaUFvY0c5emRHVnlWSGx3WlNBOVBUMGdKMlJsZEdWamRDY3BJSHRjYmlBZ0lDQWdJR1pwYm1SUWIzTjBaWElvY0c5emRHVnlMQ0JtZFc1amRHbHZiaWgxY213cElIdGNiaUFnSUNBZ0lDQWdKSGR5WVhCd1pYSXVZM056S0NkaVlXTnJaM0p2ZFc1a0xXbHRZV2RsSnl3Z0ozVnliQ2duSUNzZ2RYSnNJQ3NnSnlrbktUdGNiaUFnSUNBZ0lIMHBPMXh1SUNBZ0lIMGdaV3h6WlNCcFppQW9jRzl6ZEdWeVZIbHdaU0FoUFQwZ0oyNXZibVVuS1NCN1hHNGdJQ0FnSUNBa2QzSmhjSEJsY2k1amMzTW9KMkpoWTJ0bmNtOTFibVF0YVcxaFoyVW5MQ0FuZFhKc0tDY2dLeUJ3YjNOMFpYSWdLeUFuTGljZ0t5QndiM04wWlhKVWVYQmxJQ3NnSnlrbktUdGNiaUFnSUNCOVhHNWNiaUFnSUNBdkx5QkpaaUJoSUhCaGNtVnVkQ0JsYkdWdFpXNTBJR2hoY3lCaElITjBZWFJwWXlCd2IzTnBkR2x2Yml3Z2JXRnJaU0JwZENCeVpXeGhkR2wyWlZ4dUlDQWdJR2xtSUNna1pXeGxiV1Z1ZEM1amMzTW9KM0J2YzJsMGFXOXVKeWtnUFQwOUlDZHpkR0YwYVdNbktTQjdYRzRnSUNBZ0lDQWtaV3hsYldWdWRDNWpjM01vSjNCdmMybDBhVzl1Snl3Z0ozSmxiR0YwYVhabEp5azdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0pHVnNaVzFsYm5RdWNISmxjR1Z1WkNna2QzSmhjSEJsY2lrN1hHNWNiaUFnSUNCcFppQW9kSGx3Wlc5bUlIQmhkR2dnUFQwOUlDZHZZbXBsWTNRbktTQjdYRzRnSUNBZ0lDQnBaaUFvY0dGMGFDNXRjRFFwSUh0Y2JpQWdJQ0FnSUNBZ2MyOTFjbU5sY3lBclBTQW5QSE52ZFhKalpTQnpjbU05WENJbklDc2djR0YwYUM1dGNEUWdLeUFuTG0xd05Gd2lJSFI1Y0dVOVhDSjJhV1JsYnk5dGNEUmNJajRuTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCcFppQW9jR0YwYUM1M1pXSnRLU0I3WEc0Z0lDQWdJQ0FnSUhOdmRYSmpaWE1nS3owZ0p6eHpiM1Z5WTJVZ2MzSmpQVndpSnlBcklIQmhkR2d1ZDJWaWJTQXJJQ2N1ZDJWaWJWd2lJSFI1Y0dVOVhDSjJhV1JsYnk5M1pXSnRYQ0krSnp0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2FXWWdLSEJoZEdndWIyZDJLU0I3WEc0Z0lDQWdJQ0FnSUhOdmRYSmpaWE1nS3owZ0p6eHpiM1Z5WTJVZ2MzSmpQVndpSnlBcklIQmhkR2d1YjJkMklDc2dKeTV2WjNaY0lpQjBlWEJsUFZ3aWRtbGtaVzh2YjJkblhDSStKenRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSkhacFpHVnZJRDBnZG1sa1pTNGtkbWxrWlc4Z1BTQWtLQ2M4ZG1sa1pXOCtKeUFySUhOdmRYSmpaWE1nS3lBblBDOTJhV1JsYno0bktUdGNiaUFnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSkhacFpHVnZJRDBnZG1sa1pTNGtkbWxrWlc4Z1BTQWtLQ2M4ZG1sa1pXOCtKeUFyWEc0Z0lDQWdJQ0FnSUNjOGMyOTFjbU5sSUhOeVl6MWNJaWNnS3lCd1lYUm9JQ3NnSnk1dGNEUmNJaUIwZVhCbFBWd2lkbWxrWlc4dmJYQTBYQ0krSnlBclhHNGdJQ0FnSUNBZ0lDYzhjMjkxY21ObElITnlZejFjSWljZ0t5QndZWFJvSUNzZ0p5NTNaV0p0WENJZ2RIbHdaVDFjSW5acFpHVnZMM2RsWW0xY0lqNG5JQ3RjYmlBZ0lDQWdJQ0FnSnp4emIzVnlZMlVnYzNKalBWd2lKeUFySUhCaGRHZ2dLeUFuTG05bmRsd2lJSFI1Y0dVOVhDSjJhV1JsYnk5dloyZGNJajRuSUN0Y2JpQWdJQ0FnSUNBZ0p6d3ZkbWxrWlc4K0p5azdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5OGdhSFIwY0hNNkx5OW5hWFJvZFdJdVkyOXRMMVp2Wkd0aFFtVmhjbk12Vm1sa1pTOXBjM04xWlhNdk1URXdYRzRnSUNBZ2RISjVJSHRjYmlBZ0lDQWdJQ1IyYVdSbGIxeHVYRzRnSUNBZ0lDQWdJQzh2SUZObGRDQjJhV1JsYnlCd2NtOXdaWEowYVdWelhHNGdJQ0FnSUNBZ0lDNXdjbTl3S0h0Y2JpQWdJQ0FnSUNBZ0lDQmhkWFJ2Y0d4aGVUb2djMlYwZEdsdVozTXVZWFYwYjNCc1lYa3NYRzRnSUNBZ0lDQWdJQ0FnYkc5dmNEb2djMlYwZEdsdVozTXViRzl2Y0N4Y2JpQWdJQ0FnSUNBZ0lDQjJiMngxYldVNklITmxkSFJwYm1kekxuWnZiSFZ0WlN4Y2JpQWdJQ0FnSUNBZ0lDQnRkWFJsWkRvZ2MyVjBkR2x1WjNNdWJYVjBaV1FzWEc0Z0lDQWdJQ0FnSUNBZ1pHVm1ZWFZzZEUxMWRHVmtPaUJ6WlhSMGFXNW5jeTV0ZFhSbFpDeGNiaUFnSUNBZ0lDQWdJQ0J3YkdGNVltRmphMUpoZEdVNklITmxkSFJwYm1kekxuQnNZWGxpWVdOclVtRjBaU3hjYmlBZ0lDQWdJQ0FnSUNCa1pXWmhkV3gwVUd4aGVXSmhZMnRTWVhSbE9pQnpaWFIwYVc1bmN5NXdiR0Y1WW1GamExSmhkR1ZjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnZlNCallYUmphQ0FvWlNrZ2UxeHVJQ0FnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0U1UFZGOUpUVkJNUlUxRlRsUkZSRjlOVTBjcE8xeHVJQ0FnSUgxY2JseHVJQ0FnSUM4dklGWnBaR1Z2SUdGc2FXZHViV1Z1ZEZ4dUlDQWdJQ1IyYVdSbGJ5NWpjM01vZTF4dUlDQWdJQ0FnYldGeVoybHVPaUFuWVhWMGJ5Y3NYRzRnSUNBZ0lDQndiM05wZEdsdmJqb2dKMkZpYzI5c2RYUmxKeXhjYmlBZ0lDQWdJQ2Q2TFdsdVpHVjRKem9nTFRFc1hHNGdJQ0FnSUNCMGIzQTZJSEJ2YzJsMGFXOXVMbmtzWEc0Z0lDQWdJQ0JzWldaME9pQndiM05wZEdsdmJpNTRMRnh1SUNBZ0lDQWdKeTEzWldKcmFYUXRkSEpoYm5ObWIzSnRKem9nSjNSeVlXNXpiR0YwWlNndEp5QXJJSEJ2YzJsMGFXOXVMbmdnS3lBbkxDQXRKeUFySUhCdmMybDBhVzl1TG5rZ0t5QW5LU2NzWEc0Z0lDQWdJQ0FuTFcxekxYUnlZVzV6Wm05eWJTYzZJQ2QwY21GdWMyeGhkR1VvTFNjZ0t5QndiM05wZEdsdmJpNTRJQ3NnSnl3Z0xTY2dLeUJ3YjNOcGRHbHZiaTU1SUNzZ0p5a25MRnh1SUNBZ0lDQWdKeTF0YjNvdGRISmhibk5tYjNKdEp6b2dKM1J5WVc1emJHRjBaU2d0SnlBcklIQnZjMmwwYVc5dUxuZ2dLeUFuTENBdEp5QXJJSEJ2YzJsMGFXOXVMbmtnS3lBbktTY3NYRzRnSUNBZ0lDQjBjbUZ1YzJadmNtMDZJQ2QwY21GdWMyeGhkR1VvTFNjZ0t5QndiM05wZEdsdmJpNTRJQ3NnSnl3Z0xTY2dLeUJ3YjNOcGRHbHZiaTU1SUNzZ0p5a25MRnh1WEc0Z0lDQWdJQ0F2THlCRWFYTmhZbXhsSUhacGMybGlhV3hwZEhrc0lIZG9hV3hsSUd4dllXUnBibWRjYmlBZ0lDQWdJSFpwYzJsaWFXeHBkSGs2SUNkb2FXUmtaVzRuTEZ4dUlDQWdJQ0FnYjNCaFkybDBlVG9nTUZ4dUlDQWdJSDBwWEc1Y2JpQWdJQ0F2THlCU1pYTnBlbVVnWVNCMmFXUmxieXdnZDJobGJpQnBkQ2R6SUd4dllXUmxaRnh1SUNBZ0lDNXZibVVvSjJOaGJuQnNZWGwwYUhKdmRXZG9MaWNnS3lCUVRGVkhTVTVmVGtGTlJTd2dablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0IyYVdSbExuSmxjMmw2WlNncE8xeHVJQ0FnSUgwcFhHNWNiaUFnSUNBdkx5Qk5ZV3RsSUdsMElIWnBjMmxpYkdVc0lIZG9aVzRnYVhRbmN5QmhiSEpsWVdSNUlIQnNZWGxwYm1kY2JpQWdJQ0F1YjI1bEtDZHdiR0Y1YVc1bkxpY2dLeUJRVEZWSFNVNWZUa0ZOUlN3Z1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWtkbWxrWlc4dVkzTnpLSHRjYmlBZ0lDQWdJQ0FnZG1semFXSnBiR2wwZVRvZ0ozWnBjMmxpYkdVbkxGeHVJQ0FnSUNBZ0lDQnZjR0ZqYVhSNU9pQXhYRzRnSUNBZ0lDQjlLVHRjYmlBZ0lDQWdJQ1IzY21Gd2NHVnlMbU56Y3lnblltRmphMmR5YjNWdVpDMXBiV0ZuWlNjc0lDZHViMjVsSnlrN1hHNGdJQ0FnZlNrN1hHNWNiaUFnSUNBdkx5QlNaWE5wZW1VZ1pYWmxiblFnYVhNZ1lYWmhhV3hoWW14bElHOXViSGtnWm05eUlDZDNhVzVrYjNjblhHNGdJQ0FnTHk4Z1ZYTmxJR0Z1YjNSb1pYSWdZMjlrWlNCemIyeDFkR2x2Ym5NZ2RHOGdaR1YwWldOMElFUlBUU0JsYkdWdFpXNTBjeUJ5WlhOcGVtbHVaMXh1SUNBZ0lDUmxiR1Z0Wlc1MExtOXVLQ2R5WlhOcGVtVXVKeUFySUZCTVZVZEpUbDlPUVUxRkxDQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJR2xtSUNoelpYUjBhVzVuY3k1eVpYTnBlbWx1WnlrZ2UxeHVJQ0FnSUNBZ0lDQjJhV1JsTG5KbGMybDZaU2dwTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJSDBwTzF4dVhHNGdJQ0FnTHk4Z1FYQndaVzVrSUdFZ2RtbGtaVzljYmlBZ0lDQWtkM0poY0hCbGNpNWhjSEJsYm1Rb0pIWnBaR1Z2S1R0Y2JpQWdmVHRjYmx4dUlDQXZLaXBjYmlBZ0lDb2dSMlYwSUdFZ2RtbGtaVzhnWld4bGJXVnVkRnh1SUNBZ0tpQkFjSFZpYkdsalhHNGdJQ0FxSUVCeVpYUjFjbTV6SUh0SVZFMU1WbWxrWlc5RmJHVnRaVzUwZlZ4dUlDQWdLaTljYmlBZ1ZtbGtaUzV3Y205MGIzUjVjR1V1WjJWMFZtbGtaVzlQWW1wbFkzUWdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdkR2hwY3k0a2RtbGtaVzliTUYwN1hHNGdJSDA3WEc1Y2JpQWdMeW9xWEc0Z0lDQXFJRkpsYzJsNlpTQmhJSFpwWkdWdklHSmhZMnRuY205MWJtUmNiaUFnSUNvZ1FIQjFZbXhwWTF4dUlDQWdLaTljYmlBZ1ZtbGtaUzV3Y205MGIzUjVjR1V1Y21WemFYcGxJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnYVdZZ0tDRjBhR2x6TGlSMmFXUmxieWtnZTF4dUlDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lIMWNibHh1SUNBZ0lIWmhjaUFrZDNKaGNIQmxjaUE5SUhSb2FYTXVKSGR5WVhCd1pYSTdYRzRnSUNBZ2RtRnlJQ1IyYVdSbGJ5QTlJSFJvYVhNdUpIWnBaR1Z2TzF4dUlDQWdJSFpoY2lCMmFXUmxieUE5SUNSMmFXUmxiMXN3WFR0Y2JseHVJQ0FnSUM4dklFZGxkQ0JoSUc1aGRHbDJaU0IyYVdSbGJ5QnphWHBsWEc0Z0lDQWdkbUZ5SUhacFpHVnZTR1ZwWjJoMElEMGdkbWxrWlc4dWRtbGtaVzlJWldsbmFIUTdYRzRnSUNBZ2RtRnlJSFpwWkdWdlYybGtkR2dnUFNCMmFXUmxieTUyYVdSbGIxZHBaSFJvTzF4dVhHNGdJQ0FnTHk4Z1IyVjBJR0VnZDNKaGNIQmxjaUJ6YVhwbFhHNGdJQ0FnZG1GeUlIZHlZWEJ3WlhKSVpXbG5hSFFnUFNBa2QzSmhjSEJsY2k1b1pXbG5hSFFvS1R0Y2JpQWdJQ0IyWVhJZ2QzSmhjSEJsY2xkcFpIUm9JRDBnSkhkeVlYQndaWEl1ZDJsa2RHZ29LVHRjYmx4dUlDQWdJR2xtSUNoM2NtRndjR1Z5VjJsa2RHZ2dMeUIyYVdSbGIxZHBaSFJvSUQ0Z2QzSmhjSEJsY2tobGFXZG9kQ0F2SUhacFpHVnZTR1ZwWjJoMEtTQjdYRzRnSUNBZ0lDQWtkbWxrWlc4dVkzTnpLSHRjYmx4dUlDQWdJQ0FnSUNBdkx5QXJNaUJ3YVhobGJITWdkRzhnY0hKbGRtVnVkQ0JoYmlCbGJYQjBlU0J6Y0dGalpTQmhablJsY2lCMGNtRnVjMlp2Y20xaGRHbHZibHh1SUNBZ0lDQWdJQ0IzYVdSMGFEb2dkM0poY0hCbGNsZHBaSFJvSUNzZ01peGNiaUFnSUNBZ0lDQWdhR1ZwWjJoME9pQW5ZWFYwYnlkY2JpQWdJQ0FnSUgwcE8xeHVJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FrZG1sa1pXOHVZM056S0h0Y2JpQWdJQ0FnSUNBZ2QybGtkR2c2SUNkaGRYUnZKeXhjYmx4dUlDQWdJQ0FnSUNBdkx5QXJNaUJ3YVhobGJITWdkRzhnY0hKbGRtVnVkQ0JoYmlCbGJYQjBlU0J6Y0dGalpTQmhablJsY2lCMGNtRnVjMlp2Y20xaGRHbHZibHh1SUNBZ0lDQWdJQ0JvWldsbmFIUTZJSGR5WVhCd1pYSklaV2xuYUhRZ0t5QXlYRzRnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlYRzRnSUgwN1hHNWNiaUFnTHlvcVhHNGdJQ0FxSUVSbGMzUnliM2tnWVNCMmFXUmxieUJpWVdOclozSnZkVzVrWEc0Z0lDQXFJRUJ3ZFdKc2FXTmNiaUFnSUNvdlhHNGdJRlpwWkdVdWNISnZkRzkwZVhCbExtUmxjM1J5YjNrZ1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQmtaV3hsZEdVZ0pGdFFURlZIU1U1ZlRrRk5SVjB1Ykc5dmEzVndXM1JvYVhNdWFXNWtaWGhkTzF4dUlDQWdJSFJvYVhNdUpIWnBaR1Z2SUNZbUlIUm9hWE11SkhacFpHVnZMbTltWmloUVRGVkhTVTVmVGtGTlJTazdYRzRnSUNBZ2RHaHBjeTRrWld4bGJXVnVkQzV2Wm1Zb1VFeFZSMGxPWDA1QlRVVXBMbkpsYlc5MlpVUmhkR0VvVUV4VlIwbE9YMDVCVFVVcE8xeHVJQ0FnSUhSb2FYTXVKSGR5WVhCd1pYSXVjbVZ0YjNabEtDazdYRzRnSUgwN1hHNWNiaUFnTHlvcVhHNGdJQ0FxSUZOd1pXTnBZV3dnY0d4MVoybHVJRzlpYW1WamRDQm1iM0lnYVc1emRHRnVZMlZ6TGx4dUlDQWdLaUJBY0hWaWJHbGpYRzRnSUNBcUlFQjBlWEJsSUh0UFltcGxZM1I5WEc0Z0lDQXFMMXh1SUNBa1cxQk1WVWRKVGw5T1FVMUZYU0E5SUh0Y2JpQWdJQ0JzYjI5cmRYQTZJRnRkWEc0Z0lIMDdYRzVjYmlBZ0x5b3FYRzRnSUNBcUlGQnNkV2RwYmlCamIyNXpkSEoxWTNSdmNseHVJQ0FnS2lCQWNHRnlZVzBnZTA5aWFtVmpkSHhUZEhKcGJtZDlJSEJoZEdoY2JpQWdJQ29nUUhCaGNtRnRJSHRQWW1wbFkzUjhVM1J5YVc1bmZTQnZjSFJwYjI1elhHNGdJQ0FxSUVCeVpYUjFjbTV6SUh0S1VYVmxjbmw5WEc0Z0lDQXFJRUJqYjI1emRISjFZM1J2Y2x4dUlDQWdLaTljYmlBZ0pDNW1ibHRRVEZWSFNVNWZUa0ZOUlYwZ1BTQm1kVzVqZEdsdmJpaHdZWFJvTENCdmNIUnBiMjV6S1NCN1hHNGdJQ0FnZG1GeUlHbHVjM1JoYm1ObE8xeHVYRzRnSUNBZ2RHaHBjeTVsWVdOb0tHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdhVzV6ZEdGdVkyVWdQU0FrTG1SaGRHRW9kR2hwY3l3Z1VFeFZSMGxPWDA1QlRVVXBPMXh1WEc0Z0lDQWdJQ0F2THlCRVpYTjBjbTk1SUhSb1pTQndiSFZuYVc0Z2FXNXpkR0Z1WTJVZ2FXWWdaWGhwYzNSelhHNGdJQ0FnSUNCcGJuTjBZVzVqWlNBbUppQnBibk4wWVc1alpTNWtaWE4wY205NUtDazdYRzVjYmlBZ0lDQWdJQzh2SUVOeVpXRjBaU0IwYUdVZ2NHeDFaMmx1SUdsdWMzUmhibU5sWEc0Z0lDQWdJQ0JwYm5OMFlXNWpaU0E5SUc1bGR5QldhV1JsS0hSb2FYTXNJSEJoZEdnc0lHOXdkR2x2Ym5NcE8xeHVJQ0FnSUNBZ2FXNXpkR0Z1WTJVdWFXNWtaWGdnUFNBa1cxQk1WVWRKVGw5T1FVMUZYUzVzYjI5cmRYQXVjSFZ6YUNocGJuTjBZVzVqWlNrZ0xTQXhPMXh1SUNBZ0lDQWdKQzVrWVhSaEtIUm9hWE1zSUZCTVZVZEpUbDlPUVUxRkxDQnBibk4wWVc1alpTazdYRzRnSUNBZ2ZTazdYRzVjYmlBZ0lDQnlaWFIxY200Z2RHaHBjenRjYmlBZ2ZUdGNibHh1SUNBa0tHUnZZM1Z0Wlc1MEtTNXlaV0ZrZVNobWRXNWpkR2x2YmlncElIdGNiaUFnSUNCMllYSWdKSGRwYm1SdmR5QTlJQ1FvZDJsdVpHOTNLVHRjYmx4dUlDQWdJQzh2SUZkcGJtUnZkeUJ5WlhOcGVtVWdaWFpsYm5RZ2JHbHpkR1Z1WlhKY2JpQWdJQ0FrZDJsdVpHOTNMbTl1S0NkeVpYTnBlbVV1SnlBcklGQk1WVWRKVGw5T1FVMUZMQ0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUdadmNpQW9kbUZ5SUd4bGJpQTlJQ1JiVUV4VlIwbE9YMDVCVFVWZExteHZiMnQxY0M1c1pXNW5kR2dzSUdrZ1BTQXdMQ0JwYm5OMFlXNWpaVHNnYVNBOElHeGxianNnYVNzcktTQjdYRzRnSUNBZ0lDQWdJR2x1YzNSaGJtTmxJRDBnSkZ0UVRGVkhTVTVmVGtGTlJWMHViRzl2YTNWd1cybGRPMXh1WEc0Z0lDQWdJQ0FnSUdsbUlDaHBibk4wWVc1alpTQW1KaUJwYm5OMFlXNWpaUzV6WlhSMGFXNW5jeTV5WlhOcGVtbHVaeWtnZTF4dUlDQWdJQ0FnSUNBZ0lHbHVjM1JoYm1ObExuSmxjMmw2WlNncE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZTazdYRzVjYmlBZ0lDQXZMeUJvZEhSd2N6b3ZMMmRwZEdoMVlpNWpiMjB2Vm05a2EyRkNaV0Z5Y3k5V2FXUmxMMmx6YzNWbGN5ODJPRnh1SUNBZ0lDUjNhVzVrYjNjdWIyNG9KM1Z1Ykc5aFpDNG5JQ3NnVUV4VlIwbE9YMDVCVFVVc0lHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHWmhiSE5sTzF4dUlDQWdJSDBwTzF4dVhHNGdJQ0FnTHk4Z1FYVjBieUJwYm1sMGFXRnNhWHBoZEdsdmJseHVJQ0FnSUM4dklFRmtaQ0FuWkdGMFlTMTJhV1JsTFdKbkp5QmhkSFJ5YVdKMWRHVWdkMmwwYUNCaElIQmhkR2dnZEc4Z2RHaGxJSFpwWkdWdklIZHBkR2h2ZFhRZ1pYaDBaVzV6YVc5dVhHNGdJQ0FnTHk4Z1FXeHpieUI1YjNVZ1kyRnVJSEJoYzNNZ2IzQjBhVzl1Y3lCMGFISnZkeUIwYUdVZ0oyUmhkR0V0ZG1sa1pTMXZjSFJwYjI1ekp5QmhkSFJ5YVdKMWRHVmNiaUFnSUNBdkx5QW5aR0YwWVMxMmFXUmxMVzl3ZEdsdmJuTW5JRzExYzNRZ1ltVWdiR2xyWlNBbmJYVjBaV1E2SUdaaGJITmxMQ0IyYjJ4MWJXVTZJREF1TlNkY2JpQWdJQ0FrS0dSdlkzVnRaVzUwS1M1bWFXNWtLQ2RiWkdGMFlTMG5JQ3NnVUV4VlIwbE9YMDVCVFVVZ0t5QW5MV0puWFNjcExtVmhZMmdvWm5WdVkzUnBiMjRvYVN3Z1pXeGxiV1Z1ZENrZ2UxeHVJQ0FnSUNBZ2RtRnlJQ1JsYkdWdFpXNTBJRDBnSkNobGJHVnRaVzUwS1R0Y2JpQWdJQ0FnSUhaaGNpQnZjSFJwYjI1eklEMGdKR1ZzWlcxbGJuUXVaR0YwWVNoUVRGVkhTVTVmVGtGTlJTQXJJQ2N0YjNCMGFXOXVjeWNwTzF4dUlDQWdJQ0FnZG1GeUlIQmhkR2dnUFNBa1pXeGxiV1Z1ZEM1a1lYUmhLRkJNVlVkSlRsOU9RVTFGSUNzZ0p5MWlaeWNwTzF4dVhHNGdJQ0FnSUNBa1pXeGxiV1Z1ZEZ0UVRGVkhTVTVmVGtGTlJWMG9jR0YwYUN3Z2IzQjBhVzl1Y3lrN1hHNGdJQ0FnZlNrN1hHNGdJSDBwTzF4dVhHNTlLVHNpWFN3aVptbHNaU0k2SW5abGJtUnZjaTlxY1hWbGNua3VkbWxrWlM1cWN5SjkiXSwiZmlsZSI6InZlbmRvci9qcXVlcnkudmlkZS5qcyJ9
