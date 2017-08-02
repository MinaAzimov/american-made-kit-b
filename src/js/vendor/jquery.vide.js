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
