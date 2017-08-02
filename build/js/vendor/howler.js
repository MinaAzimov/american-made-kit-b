/*!
 *  howler.js v1.1.29
 *  howlerjs.com
 *
 *  (c) 2013-2016, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

(function() {
  // setup
  var cache = {};

  // setup the audio context
  var ctx = null,
    usingWebAudio = true,
    noAudio = false;
  try {
    if (typeof AudioContext !== 'undefined') {
      ctx = new AudioContext();
    } else if (typeof webkitAudioContext !== 'undefined') {
      ctx = new webkitAudioContext();
    } else {
      usingWebAudio = false;
    }
  } catch(e) {
    usingWebAudio = false;
  }

  if (!usingWebAudio) {
    if (typeof Audio !== 'undefined') {
      try {
        new Audio();
      } catch(e) {
        noAudio = true;
      }
    } else {
      noAudio = true;
    }
  }

  // create a master gain node
  if (usingWebAudio) {
    var masterGain = (typeof ctx.createGain === 'undefined') ? ctx.createGainNode() : ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);
  }

  // create global controller
  var HowlerGlobal = function(codecs) {
    this._volume = 1;
    this._muted = false;
    this.usingWebAudio = usingWebAudio;
    this.ctx = ctx;
    this.noAudio = noAudio;
    this._howls = [];
    this._codecs = codecs;
    this.iOSAutoEnable = true;
  };
  HowlerGlobal.prototype = {
    /**
     * Get/set the global volume for all sounds.
     * @param  {Float} vol Volume from 0.0 to 1.0.
     * @return {Howler/Float}     Returns self or current volume.
     */
    volume: function(vol) {
      var self = this;

      // make sure volume is a number
      vol = parseFloat(vol);

      if (vol >= 0 && vol <= 1) {
        self._volume = vol;

        if (usingWebAudio) {
          masterGain.gain.value = vol;
        }

        // loop through cache and change volume of all nodes that are using HTML5 Audio
        for (var key in self._howls) {
          if (self._howls.hasOwnProperty(key) && self._howls[key]._webAudio === false) {
            // loop through the audio nodes
            for (var i=0; i<self._howls[key]._audioNode.length; i++) {
              self._howls[key]._audioNode[i].volume = self._howls[key]._volume * self._volume;
            }
          }
        }

        return self;
      }

      // return the current global volume
      return (usingWebAudio) ? masterGain.gain.value : self._volume;
    },

    /**
     * Mute all sounds.
     * @return {Howler}
     */
    mute: function() {
      this._setMuted(true);

      return this;
    },

    /**
     * Unmute all sounds.
     * @return {Howler}
     */
    unmute: function() {
      this._setMuted(false);

      return this;
    },

    /**
     * Handle muting and unmuting globally.
     * @param  {Boolean} muted Is muted or not.
     */
    _setMuted: function(muted) {
      var self = this;

      self._muted = muted;

      if (usingWebAudio) {
        masterGain.gain.value = muted ? 0 : self._volume;
      }

      for (var key in self._howls) {
        if (self._howls.hasOwnProperty(key) && self._howls[key]._webAudio === false) {
          // loop through the audio nodes
          for (var i=0; i<self._howls[key]._audioNode.length; i++) {
            self._howls[key]._audioNode[i].muted = muted;
          }
        }
      }
    },

    /**
     * Check for codec support.
     * @param  {String} ext Audio file extension.
     * @return {Boolean}
     */
    codecs: function(ext) {
      return this._codecs[ext];
    },

    /**
     * iOS will only allow audio to be played after a user interaction.
     * Attempt to automatically unlock audio on the first user interaction.
     * Concept from: http://paulbakaus.com/tutorials/html5/web-audio-on-ios/
     * @return {Howler}
     */
    _enableiOSAudio: function() {
      var self = this;

      // only run this on iOS if audio isn't already eanbled
      if (ctx && (self._iOSEnabled || !/iPhone|iPad|iPod/i.test(navigator.userAgent))) {
        return;
      }

      self._iOSEnabled = false;

      // call this method on touch start to create and play a buffer,
      // then check if the audio actually played to determine if
      // audio has now been unlocked on iOS
      var unlock = function() {
        // create an empty buffer
        var buffer = ctx.createBuffer(1, 1, 22050);
        var source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        // play the empty buffer
        if (typeof source.start === 'undefined') {
          source.noteOn(0);
        } else {
          source.start(0);
        }

        // setup a timeout to check that we are unlocked on the next event loop
        setTimeout(function() {
          if ((source.playbackState === source.PLAYING_STATE || source.playbackState === source.FINISHED_STATE)) {
            // update the unlocked state and prevent this check from happening again
            self._iOSEnabled = true;
            self.iOSAutoEnable = false;

            // remove the touch start listener
            window.removeEventListener('touchend', unlock, false);
          }
        }, 0);
      };

      // setup a touch start listener to attempt an unlock in
      window.addEventListener('touchend', unlock, false);

      return self;
    }
  };

  // check for browser codec support
  var audioTest = null;
  var codecs = {};
  if (!noAudio) {
    audioTest = new Audio();
    codecs = {
      mp3: !!audioTest.canPlayType('audio/mpeg;').replace(/^no$/, ''),
      opus: !!audioTest.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ''),
      ogg: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''),
      wav: !!audioTest.canPlayType('audio/wav; codecs="1"').replace(/^no$/, ''),
      aac: !!audioTest.canPlayType('audio/aac;').replace(/^no$/, ''),
      m4a: !!(audioTest.canPlayType('audio/x-m4a;') || audioTest.canPlayType('audio/m4a;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
      mp4: !!(audioTest.canPlayType('audio/x-mp4;') || audioTest.canPlayType('audio/mp4;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
      weba: !!audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, '')
    };
  }

  // allow access to the global audio controls
  var Howler = new HowlerGlobal(codecs);

  // setup the audio object
  var Howl = function(o) {
    var self = this;

    // setup the defaults
    self._autoplay = o.autoplay || false;
    self._buffer = o.buffer || false;
    self._duration = o.duration || 0;
    self._format = o.format || null;
    self._loop = o.loop || false;
    self._loaded = false;
    self._sprite = o.sprite || {};
    self._src = o.src || '';
    self._pos3d = o.pos3d || [0, 0, -0.5];
    self._volume = o.volume !== undefined ? o.volume : 1;
    self._urls = o.urls || [];
    self._rate = o.rate || 1;

    // allow forcing of a specific panningModel ('equalpower' or 'HRTF'),
    // if none is specified, defaults to 'equalpower' and switches to 'HRTF'
    // if 3d sound is used
    self._model = o.model || null;

    // setup event functions
    self._onload = [o.onload || function() {}];
    self._onloaderror = [o.onloaderror || function() {}];
    self._onend = [o.onend || function() {}];
    self._onpause = [o.onpause || function() {}];
    self._onplay = [o.onplay || function() {}];

    self._onendTimer = [];

    // Web Audio or HTML5 Audio?
    self._webAudio = usingWebAudio && !self._buffer;

    // check if we need to fall back to HTML5 Audio
    self._audioNode = [];
    if (self._webAudio) {
      self._setupAudioNode();
    }

    // automatically try to enable audio on iOS
    if (typeof ctx !== 'undefined' && ctx && Howler.iOSAutoEnable) {
      Howler._enableiOSAudio();
    }

    // add this to an array of Howl's to allow global control
    Howler._howls.push(self);

    // load the track
    self.load();
  };

  // setup all of the methods
  Howl.prototype = {
    /**
     * Load an audio file.
     * @return {Howl}
     */
    load: function() {
      var self = this,
        url = null;

      // if no audio is available, quit immediately
      if (noAudio) {
        self.on('loaderror', new Error('No audio support.'));
        return;
      }

      // loop through source URLs and pick the first one that is compatible
      for (var i=0; i<self._urls.length; i++) {
        var ext, urlItem;

        if (self._format) {
          // use specified audio format if available
          ext = self._format;
        } else {
          // figure out the filetype (whether an extension or base64 data)
          urlItem = self._urls[i];
          ext = /^data:audio\/([^;,]+);/i.exec(urlItem);
          if (!ext) {
            ext = /\.([^.]+)$/.exec(urlItem.split('?', 1)[0]);
          }

          if (ext) {
            ext = ext[1].toLowerCase();
          } else {
            self.on('loaderror', new Error('Could not extract format from passed URLs, please add format parameter.'));
            return;
          }
        }

        if (codecs[ext]) {
          url = self._urls[i];
          break;
        }
      }

      if (!url) {
        self.on('loaderror', new Error('No codec support for selected audio sources.'));
        return;
      }

      self._src = url;

      if (self._webAudio) {
        loadBuffer(self, url);
      } else {
        var newNode = new Audio();

        // listen for errors with HTML5 audio (http://dev.w3.org/html5/spec-author-view/spec.html#mediaerror)
        newNode.addEventListener('error', function () {
          if (newNode.error && newNode.error.code === 4) {
            HowlerGlobal.noAudio = true;
          }

          self.on('loaderror', {type: newNode.error ? newNode.error.code : 0});
        }, false);

        self._audioNode.push(newNode);

        // setup the new audio node
        newNode.src = url;
        newNode._pos = 0;
        newNode.preload = 'auto';
        newNode.volume = (Howler._muted) ? 0 : self._volume * Howler.volume();

        // setup the event listener to start playing the sound
        // as soon as it has buffered enough
        var listener = function() {
          // round up the duration when using HTML5 Audio to account for the lower precision
          self._duration = Math.ceil(newNode.duration * 10) / 10;

          // setup a sprite if none is defined
          if (Object.getOwnPropertyNames(self._sprite).length === 0) {
            self._sprite = {_default: [0, self._duration * 1000]};
          }

          if (!self._loaded) {
            self._loaded = true;
            self.on('load');
          }

          if (self._autoplay) {
            self.play();
          }

          // clear the event listener
          newNode.removeEventListener('canplaythrough', listener, false);
        };
        newNode.addEventListener('canplaythrough', listener, false);
        newNode.load();
      }

      return self;
    },

    /**
     * Get/set the URLs to be pulled from to play in this source.
     * @param  {Array} urls  Arry of URLs to load from
     * @return {Howl}        Returns self or the current URLs
     */
    urls: function(urls) {
      var self = this;

      if (urls) {
        self.stop();
        self._urls = (typeof urls === 'string') ? [urls] : urls;
        self._loaded = false;
        self.load();

        return self;
      } else {
        return self._urls;
      }
    },

    /**
     * Play a sound from the current time (0 by default).
     * @param  {String}   sprite   (optional) Plays from the specified position in the sound sprite definition.
     * @param  {Function} callback (optional) Returns the unique playback id for this sound instance.
     * @return {Howl}
     */
    play: function(sprite, callback) {
      var self = this;

      // if no sprite was passed but a callback was, update the variables
      if (typeof sprite === 'function') {
        callback = sprite;
      }

      // use the default sprite if none is passed
      if (!sprite || typeof sprite === 'function') {
        sprite = '_default';
      }

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('load', function() {
          self.play(sprite, callback);
        });

        return self;
      }

      // if the sprite doesn't exist, play nothing
      if (!self._sprite[sprite]) {
        if (typeof callback === 'function') callback();
        return self;
      }

      // get the node to playback
      self._inactiveNode(function(node) {
        // persist the sprite being played
        node._sprite = sprite;

        // determine where to start playing from
        var pos = (node._pos > 0) ? node._pos : self._sprite[sprite][0] / 1000;

        // determine how long to play for
        var duration = 0;
        if (self._webAudio) {
          duration = self._sprite[sprite][1] / 1000 - node._pos;
          if (node._pos > 0) {
            pos = self._sprite[sprite][0] / 1000 + pos;
          }
        } else {
          duration = self._sprite[sprite][1] / 1000 - (pos - self._sprite[sprite][0] / 1000);
        }

        // determine if this sound should be looped
        var loop = !!(self._loop || self._sprite[sprite][2]);

        // set timer to fire the 'onend' event
        var soundId = (typeof callback === 'string') ? callback : Math.round(Date.now() * Math.random()) + '',
          timerId;
        (function() {
          var data = {
            id: soundId,
            sprite: sprite,
            loop: loop
          };
          timerId = setTimeout(function() {
            // if looping, restart the track
            if (!self._webAudio && loop) {
              self.stop(data.id).play(sprite, data.id);
            }

            // set web audio node to paused at end
            if (self._webAudio && !loop) {
              self._nodeById(data.id).paused = true;
              self._nodeById(data.id)._pos = 0;

              // clear the end timer
              self._clearEndTimer(data.id);
            }

            // end the track if it is HTML audio and a sprite
            if (!self._webAudio && !loop) {
              self.stop(data.id);
            }

            // fire ended event
            self.on('end', soundId);
          }, (duration / self._rate) * 1000);

          // store the reference to the timer
          self._onendTimer.push({timer: timerId, id: data.id});
        })();

        if (self._webAudio) {
          var loopStart = self._sprite[sprite][0] / 1000,
            loopEnd = self._sprite[sprite][1] / 1000;

          // set the play id to this node and load into context
          node.id = soundId;
          node.paused = false;
          refreshBuffer(self, [loop, loopStart, loopEnd], soundId);
          self._playStart = ctx.currentTime;
          node.gain.value = self._volume;

          if (typeof node.bufferSource.start === 'undefined') {
            loop ? node.bufferSource.noteGrainOn(0, pos, 86400) : node.bufferSource.noteGrainOn(0, pos, duration);
          } else {
            loop ? node.bufferSource.start(0, pos, 86400) : node.bufferSource.start(0, pos, duration);
          }
        } else {
          if (node.readyState === 4 || !node.readyState && navigator.isCocoonJS) {
            node.readyState = 4;
            node.id = soundId;
            node.currentTime = pos;
            node.muted = Howler._muted || node.muted;
            node.volume = self._volume * Howler.volume();
            setTimeout(function() { node.play(); }, 0);
          } else {
            self._clearEndTimer(soundId);

            (function(){
              var sound = self,
                playSprite = sprite,
                fn = callback,
                newNode = node;
              var listener = function() {
                sound.play(playSprite, fn);

                // clear the event listener
                newNode.removeEventListener('canplaythrough', listener, false);
              };
              newNode.addEventListener('canplaythrough', listener, false);
            })();

            return self;
          }
        }

        // fire the play event and send the soundId back in the callback
        self.on('play');
        if (typeof callback === 'function') callback(soundId);

        return self;
      });

      return self;
    },

    /**
     * Pause playback and save the current position.
     * @param {String} id (optional) The play instance ID.
     * @return {Howl}
     */
    pause: function(id) {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('play', function() {
          self.pause(id);
        });

        return self;
      }

      // clear 'onend' timer
      self._clearEndTimer(id);

      var activeNode = (id) ? self._nodeById(id) : self._activeNode();
      if (activeNode) {
        activeNode._pos = self.pos(null, id);

        if (self._webAudio) {
          // make sure the sound has been created
          if (!activeNode.bufferSource || activeNode.paused) {
            return self;
          }

          activeNode.paused = true;
          if (typeof activeNode.bufferSource.stop === 'undefined') {
            activeNode.bufferSource.noteOff(0);
          } else {
            activeNode.bufferSource.stop(0);
          }
        } else {
          activeNode.pause();
        }
      }

      self.on('pause');

      return self;
    },

    /**
     * Stop playback and reset to start.
     * @param  {String} id  (optional) The play instance ID.
     * @return {Howl}
     */
    stop: function(id) {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('play', function() {
          self.stop(id);
        });

        return self;
      }

      // clear 'onend' timer
      self._clearEndTimer(id);

      var activeNode = (id) ? self._nodeById(id) : self._activeNode();
      if (activeNode) {
        activeNode._pos = 0;

        if (self._webAudio) {
          // make sure the sound has been created
          if (!activeNode.bufferSource || activeNode.paused) {
            return self;
          }

          activeNode.paused = true;

          if (typeof activeNode.bufferSource.stop === 'undefined') {
            activeNode.bufferSource.noteOff(0);
          } else {
            activeNode.bufferSource.stop(0);
          }
        } else if (!isNaN(activeNode.duration)) {
          activeNode.pause();
          activeNode.currentTime = 0;
        }
      }

      return self;
    },

    /**
     * Mute this sound.
     * @param  {String} id (optional) The play instance ID.
     * @return {Howl}
     */
    mute: function(id) {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('play', function() {
          self.mute(id);
        });

        return self;
      }

      var activeNode = (id) ? self._nodeById(id) : self._activeNode();
      if (activeNode) {
        if (self._webAudio) {
          activeNode.gain.value = 0;
        } else {
          activeNode.muted = true;
        }
      }

      return self;
    },

    /**
     * Unmute this sound.
     * @param  {String} id (optional) The play instance ID.
     * @return {Howl}
     */
    unmute: function(id) {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('play', function() {
          self.unmute(id);
        });

        return self;
      }

      var activeNode = (id) ? self._nodeById(id) : self._activeNode();
      if (activeNode) {
        if (self._webAudio) {
          activeNode.gain.value = self._volume;
        } else {
          activeNode.muted = false;
        }
      }

      return self;
    },

    /**
     * Get/set volume of this sound.
     * @param  {Float}  vol Volume from 0.0 to 1.0.
     * @param  {String} id  (optional) The play instance ID.
     * @return {Howl/Float}     Returns self or current volume.
     */
    volume: function(vol, id) {
      var self = this;

      // make sure volume is a number
      vol = parseFloat(vol);

      if (vol >= 0 && vol <= 1) {
        self._volume = vol;

        // if the sound hasn't been loaded, add it to the event queue
        if (!self._loaded) {
          self.on('play', function() {
            self.volume(vol, id);
          });

          return self;
        }

        var activeNode = (id) ? self._nodeById(id) : self._activeNode();
        if (activeNode) {
          if (self._webAudio) {
            activeNode.gain.value = vol;
          } else {
            activeNode.volume = vol * Howler.volume();
          }
        }

        return self;
      } else {
        return self._volume;
      }
    },

    /**
     * Get/set whether to loop the sound.
     * @param  {Boolean} loop To loop or not to loop, that is the question.
     * @return {Howl/Boolean}      Returns self or current looping value.
     */
    loop: function(loop) {
      var self = this;

      if (typeof loop === 'boolean') {
        self._loop = loop;

        return self;
      } else {
        return self._loop;
      }
    },

    /**
     * Get/set sound sprite definition.
     * @param  {Object} sprite Example: {spriteName: [offset, duration, loop]}
     *                @param {Integer} offset   Where to begin playback in milliseconds
     *                @param {Integer} duration How long to play in milliseconds
     *                @param {Boolean} loop     (optional) Set true to loop this sprite
     * @return {Howl}        Returns current sprite sheet or self.
     */
    sprite: function(sprite) {
      var self = this;

      if (typeof sprite === 'object') {
        self._sprite = sprite;

        return self;
      } else {
        return self._sprite;
      }
    },

    /**
     * Get/set the position of playback.
     * @param  {Float}  pos The position to move current playback to.
     * @param  {String} id  (optional) The play instance ID.
     * @return {Howl/Float}      Returns self or current playback position.
     */
    pos: function(pos, id) {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('load', function() {
          self.pos(pos);
        });

        return typeof pos === 'number' ? self : self._pos || 0;
      }

      // make sure we are dealing with a number for pos
      pos = parseFloat(pos);

      var activeNode = (id) ? self._nodeById(id) : self._activeNode();
      if (activeNode) {
        if (pos >= 0) {
          self.pause(id);
          activeNode._pos = pos;
          self.play(activeNode._sprite, id);

          return self;
        } else {
          return self._webAudio ? activeNode._pos + (ctx.currentTime - self._playStart) : activeNode.currentTime;
        }
      } else if (pos >= 0) {
        return self;
      } else {
        // find the first inactive node to return the pos for
        for (var i=0; i<self._audioNode.length; i++) {
          if (self._audioNode[i].paused && self._audioNode[i].readyState === 4) {
            return (self._webAudio) ? self._audioNode[i]._pos : self._audioNode[i].currentTime;
          }
        }
      }
    },

    /**
     * Get/set the 3D position of the audio source.
     * The most common usage is to set the 'x' position
     * to affect the left/right ear panning. Setting any value higher than
     * 1.0 will begin to decrease the volume of the sound as it moves further away.
     * NOTE: This only works with Web Audio API, HTML5 Audio playback
     * will not be affected.
     * @param  {Float}  x  The x-position of the playback from -1000.0 to 1000.0
     * @param  {Float}  y  The y-position of the playback from -1000.0 to 1000.0
     * @param  {Float}  z  The z-position of the playback from -1000.0 to 1000.0
     * @param  {String} id (optional) The play instance ID.
     * @return {Howl/Array}   Returns self or the current 3D position: [x, y, z]
     */
    pos3d: function(x, y, z, id) {
      var self = this;

      // set a default for the optional 'y' & 'z'
      y = (typeof y === 'undefined' || !y) ? 0 : y;
      z = (typeof z === 'undefined' || !z) ? -0.5 : z;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('play', function() {
          self.pos3d(x, y, z, id);
        });

        return self;
      }

      if (x >= 0 || x < 0) {
        if (self._webAudio) {
          var activeNode = (id) ? self._nodeById(id) : self._activeNode();
          if (activeNode) {
            self._pos3d = [x, y, z];
            activeNode.panner.setPosition(x, y, z);
            activeNode.panner.panningModel = self._model || 'HRTF';
          }
        }
      } else {
        return self._pos3d;
      }

      return self;
    },

    /**
     * Fade a currently playing sound between two volumes.
     * @param  {Number}   from     The volume to fade from (0.0 to 1.0).
     * @param  {Number}   to       The volume to fade to (0.0 to 1.0).
     * @param  {Number}   len      Time in milliseconds to fade.
     * @param  {Function} callback (optional) Fired when the fade is complete.
     * @param  {String}   id       (optional) The play instance ID.
     * @return {Howl}
     */
    fade: function(from, to, len, callback, id) {
      var self = this,
        diff = Math.abs(from - to),
        dir = from > to ? 'down' : 'up',
        steps = diff / 0.01,
        stepTime = len / steps;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('load', function() {
          self.fade(from, to, len, callback, id);
        });

        return self;
      }

      // set the volume to the start position
      self.volume(from, id);

      for (var i=1; i<=steps; i++) {
        (function() {
          var change = self._volume + (dir === 'up' ? 0.01 : -0.01) * i,
            vol = Math.round(1000 * change) / 1000,
            toVol = to;

          setTimeout(function() {
            self.volume(vol, id);

            if (vol === toVol) {
              if (callback) callback();
            }
          }, stepTime * i);
        })();
      }
    },

    /**
     * [DEPRECATED] Fade in the current sound.
     * @param  {Float}    to      Volume to fade to (0.0 to 1.0).
     * @param  {Number}   len     Time in milliseconds to fade.
     * @param  {Function} callback
     * @return {Howl}
     */
    fadeIn: function(to, len, callback) {
      return this.volume(0).play().fade(0, to, len, callback);
    },

    /**
     * [DEPRECATED] Fade out the current sound and pause when finished.
     * @param  {Float}    to       Volume to fade to (0.0 to 1.0).
     * @param  {Number}   len      Time in milliseconds to fade.
     * @param  {Function} callback
     * @param  {String}   id       (optional) The play instance ID.
     * @return {Howl}
     */
    fadeOut: function(to, len, callback, id) {
      var self = this;

      return self.fade(self._volume, to, len, function() {
        if (callback) callback();
        self.pause(id);

        // fire ended event
        self.on('end');
      }, id);
    },

    /**
     * Get an audio node by ID.
     * @return {Howl} Audio node.
     */
    _nodeById: function(id) {
      var self = this,
        node = self._audioNode[0];

      // find the node with this ID
      for (var i=0; i<self._audioNode.length; i++) {
        if (self._audioNode[i].id === id) {
          node = self._audioNode[i];
          break;
        }
      }

      return node;
    },

    /**
     * Get the first active audio node.
     * @return {Howl} Audio node.
     */
    _activeNode: function() {
      var self = this,
        node = null;

      // find the first playing node
      for (var i=0; i<self._audioNode.length; i++) {
        if (!self._audioNode[i].paused) {
          node = self._audioNode[i];
          break;
        }
      }

      // remove excess inactive nodes
      self._drainPool();

      return node;
    },

    /**
     * Get the first inactive audio node.
     * If there is none, create a new one and add it to the pool.
     * @param  {Function} callback Function to call when the audio node is ready.
     */
    _inactiveNode: function(callback) {
      var self = this,
        node = null;

      // find first inactive node to recycle
      for (var i=0; i<self._audioNode.length; i++) {
        if (self._audioNode[i].paused && self._audioNode[i].readyState === 4) {
          // send the node back for use by the new play instance
          callback(self._audioNode[i]);
          node = true;
          break;
        }
      }

      // remove excess inactive nodes
      self._drainPool();

      if (node) {
        return;
      }

      // create new node if there are no inactives
      var newNode;
      if (self._webAudio) {
        newNode = self._setupAudioNode();
        callback(newNode);
      } else {
        self.load();
        newNode = self._audioNode[self._audioNode.length - 1];

        // listen for the correct load event and fire the callback
        var listenerEvent = navigator.isCocoonJS ? 'canplaythrough' : 'loadedmetadata';
        var listener = function() {
          newNode.removeEventListener(listenerEvent, listener, false);
          callback(newNode);
        };
        newNode.addEventListener(listenerEvent, listener, false);
      }
    },

    /**
     * If there are more than 5 inactive audio nodes in the pool, clear out the rest.
     */
    _drainPool: function() {
      var self = this,
        inactive = 0,
        i;

      // count the number of inactive nodes
      for (i=0; i<self._audioNode.length; i++) {
        if (self._audioNode[i].paused) {
          inactive++;
        }
      }

      // remove excess inactive nodes
      for (i=self._audioNode.length-1; i>=0; i--) {
        if (inactive <= 5) {
          break;
        }

        if (self._audioNode[i].paused) {
          // disconnect the audio source if using Web Audio
          if (self._webAudio) {
            self._audioNode[i].disconnect(0);
          }

          inactive--;
          self._audioNode.splice(i, 1);
        }
      }
    },

    /**
     * Clear 'onend' timeout before it ends.
     * @param  {String} soundId  The play instance ID.
     */
    _clearEndTimer: function(soundId) {
      var self = this,
        index = -1;

      // loop through the timers to find the one associated with this sound
      for (var i=0; i<self._onendTimer.length; i++) {
        if (self._onendTimer[i].id === soundId) {
          index = i;
          break;
        }
      }

      var timer = self._onendTimer[index];
      if (timer) {
        clearTimeout(timer.timer);
        self._onendTimer.splice(index, 1);
      }
    },

    /**
     * Setup the gain node and panner for a Web Audio instance.
     * @return {Object} The new audio node.
     */
    _setupAudioNode: function() {
      var self = this,
        node = self._audioNode,
        index = self._audioNode.length;

      // create gain node
      node[index] = (typeof ctx.createGain === 'undefined') ? ctx.createGainNode() : ctx.createGain();
      node[index].gain.value = self._volume;
      node[index].paused = true;
      node[index]._pos = 0;
      node[index].readyState = 4;
      node[index].connect(masterGain);

      // create the panner
      node[index].panner = ctx.createPanner();
      node[index].panner.panningModel = self._model || 'equalpower';
      node[index].panner.setPosition(self._pos3d[0], self._pos3d[1], self._pos3d[2]);
      node[index].panner.connect(node[index]);

      return node[index];
    },

    /**
     * Call/set custom events.
     * @param  {String}   event Event type.
     * @param  {Function} fn    Function to call.
     * @return {Howl}
     */
    on: function(event, fn) {
      var self = this,
        events = self['_on' + event];

      if (typeof fn === 'function') {
        events.push(fn);
      } else {
        for (var i=0; i<events.length; i++) {
          if (fn) {
            events[i].call(self, fn);
          } else {
            events[i].call(self);
          }
        }
      }

      return self;
    },

    /**
     * Remove a custom event.
     * @param  {String}   event Event type.
     * @param  {Function} fn    Listener to remove.
     * @return {Howl}
     */
    off: function(event, fn) {
      var self = this,
        events = self['_on' + event];

      if (fn) {
        // loop through functions in the event for comparison
        for (var i=0; i<events.length; i++) {
          if (fn === events[i]) {
            events.splice(i, 1);
            break;
          }
        }
      } else {
        self['_on' + event] = [];
      }

      return self;
    },

    /**
     * Unload and destroy the current Howl object.
     * This will immediately stop all play instances attached to this sound.
     */
    unload: function() {
      var self = this;

      // stop playing any active nodes
      var nodes = self._audioNode;
      for (var i=0; i<self._audioNode.length; i++) {
        // stop the sound if it is currently playing
        if (!nodes[i].paused) {
          self.stop(nodes[i].id);
          self.on('end', nodes[i].id);
        }

        if (!self._webAudio) {
          // remove the source if using HTML5 Audio
          nodes[i].src = '';
        } else {
          // disconnect the output from the master gain
          nodes[i].disconnect(0);
        }
      }

      // make sure all timeouts are cleared
      for (i=0; i<self._onendTimer.length; i++) {
        clearTimeout(self._onendTimer[i].timer);
      }

      // remove the reference in the global Howler object
      var index = Howler._howls.indexOf(self);
      if (index !== null && index >= 0) {
        Howler._howls.splice(index, 1);
      }

      // delete this sound from the cache
      delete cache[self._src];
      self = null;
    }

  };

  // only define these functions when using WebAudio
  if (usingWebAudio) {

    /**
     * Buffer a sound from URL (or from cache) and decode to audio source (Web Audio API).
     * @param  {Object} obj The Howl object for the sound to load.
     * @param  {String} url The path to the sound file.
     */
    var loadBuffer = function(obj, url) {
      // check if the buffer has already been cached
      if (url in cache) {
        // set the duration from the cache
        obj._duration = cache[url].duration;

        // load the sound into this object
        loadSound(obj);
        return;
      }
      
      if (/^data:[^;]+;base64,/.test(url)) {
        // Decode base64 data-URIs because some browsers cannot load data-URIs with XMLHttpRequest.
        var data = atob(url.split(',')[1]);
        var dataView = new Uint8Array(data.length);
        for (var i=0; i<data.length; ++i) {
          dataView[i] = data.charCodeAt(i);
        }
        
        decodeAudioData(dataView.buffer, obj, url);
      } else {
        // load the buffer from the URL
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
          decodeAudioData(xhr.response, obj, url);
        };
        xhr.onerror = function() {
          // if there is an error, switch the sound to HTML Audio
          if (obj._webAudio) {
            obj._buffer = true;
            obj._webAudio = false;
            obj._audioNode = [];
            delete obj._gainNode;
            delete cache[url];
            obj.load();
          }
        };
        try {
          xhr.send();
        } catch (e) {
          xhr.onerror();
        }
      }
    };

    /**
     * Decode audio data from an array buffer.
     * @param  {ArrayBuffer} arraybuffer The audio data.
     * @param  {Object} obj The Howl object for the sound to load.
     * @param  {String} url The path to the sound file.
     */
    var decodeAudioData = function(arraybuffer, obj, url) {
      // decode the buffer into an audio source
      ctx.decodeAudioData(
        arraybuffer,
        function(buffer) {
          if (buffer) {
            cache[url] = buffer;
            loadSound(obj, buffer);
          }
        },
        function(err) {
          obj.on('loaderror', err);
        }
      );
    };

    /**
     * Finishes loading the Web Audio API sound and fires the loaded event
     * @param  {Object}  obj    The Howl object for the sound to load.
     * @param  {Objecct} buffer The decoded buffer sound source.
     */
    var loadSound = function(obj, buffer) {
      // set the duration
      obj._duration = (buffer) ? buffer.duration : obj._duration;

      // setup a sprite if none is defined
      if (Object.getOwnPropertyNames(obj._sprite).length === 0) {
        obj._sprite = {_default: [0, obj._duration * 1000]};
      }

      // fire the loaded event
      if (!obj._loaded) {
        obj._loaded = true;
        obj.on('load');
      }

      if (obj._autoplay) {
        obj.play();
      }
    };

    /**
     * Load the sound back into the buffer source.
     * @param  {Object} obj   The sound to load.
     * @param  {Array}  loop  Loop boolean, pos, and duration.
     * @param  {String} id    (optional) The play instance ID.
     */
    var refreshBuffer = function(obj, loop, id) {
      // determine which node to connect to
      var node = obj._nodeById(id);

      // setup the buffer source for playback
      node.bufferSource = ctx.createBufferSource();
      node.bufferSource.buffer = cache[obj._src];
      node.bufferSource.connect(node.panner);
      node.bufferSource.loop = loop[0];
      if (loop[0]) {
        node.bufferSource.loopStart = loop[1];
        node.bufferSource.loopEnd = loop[1] + loop[2];
      }
      node.bufferSource.playbackRate.value = obj._rate;
    };

  }

  /**
   * Add support for AMD (Asynchronous Module Definition) libraries such as require.js.
   */
  if (typeof define === 'function' && define.amd) {
    define(function() {
      return {
        Howler: Howler,
        Howl: Howl
      };
    });
  }

  /**
   * Add support for CommonJS libraries such as browserify.
   */
  if (typeof exports !== 'undefined') {
    exports.Howler = Howler;
    exports.Howl = Howl;
  }

  // define globally in case AMD is not available or available but not used

  if (typeof window !== 'undefined') {
    window.Howler = Howler;
    window.Howl = Howl;
  }

})();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJ2ZW5kb3IvaG93bGVyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICogIGhvd2xlci5qcyB2MS4xLjI5XG4gKiAgaG93bGVyanMuY29tXG4gKlxuICogIChjKSAyMDEzLTIwMTYsIEphbWVzIFNpbXBzb24gb2YgR29sZEZpcmUgU3R1ZGlvc1xuICogIGdvbGRmaXJlc3R1ZGlvcy5jb21cbiAqXG4gKiAgTUlUIExpY2Vuc2VcbiAqL1xuXG4oZnVuY3Rpb24oKSB7XG4gIC8vIHNldHVwXG4gIHZhciBjYWNoZSA9IHt9O1xuXG4gIC8vIHNldHVwIHRoZSBhdWRpbyBjb250ZXh0XG4gIHZhciBjdHggPSBudWxsLFxuICAgIHVzaW5nV2ViQXVkaW8gPSB0cnVlLFxuICAgIG5vQXVkaW8gPSBmYWxzZTtcbiAgdHJ5IHtcbiAgICBpZiAodHlwZW9mIEF1ZGlvQ29udGV4dCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGN0eCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB3ZWJraXRBdWRpb0NvbnRleHQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBjdHggPSBuZXcgd2Via2l0QXVkaW9Db250ZXh0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHVzaW5nV2ViQXVkaW8gPSBmYWxzZTtcbiAgICB9XG4gIH0gY2F0Y2goZSkge1xuICAgIHVzaW5nV2ViQXVkaW8gPSBmYWxzZTtcbiAgfVxuXG4gIGlmICghdXNpbmdXZWJBdWRpbykge1xuICAgIGlmICh0eXBlb2YgQXVkaW8gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0cnkge1xuICAgICAgICBuZXcgQXVkaW8oKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICBub0F1ZGlvID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbm9BdWRpbyA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgLy8gY3JlYXRlIGEgbWFzdGVyIGdhaW4gbm9kZVxuICBpZiAodXNpbmdXZWJBdWRpbykge1xuICAgIHZhciBtYXN0ZXJHYWluID0gKHR5cGVvZiBjdHguY3JlYXRlR2FpbiA9PT0gJ3VuZGVmaW5lZCcpID8gY3R4LmNyZWF0ZUdhaW5Ob2RlKCkgOiBjdHguY3JlYXRlR2FpbigpO1xuICAgIG1hc3RlckdhaW4uZ2Fpbi52YWx1ZSA9IDE7XG4gICAgbWFzdGVyR2Fpbi5jb25uZWN0KGN0eC5kZXN0aW5hdGlvbik7XG4gIH1cblxuICAvLyBjcmVhdGUgZ2xvYmFsIGNvbnRyb2xsZXJcbiAgdmFyIEhvd2xlckdsb2JhbCA9IGZ1bmN0aW9uKGNvZGVjcykge1xuICAgIHRoaXMuX3ZvbHVtZSA9IDE7XG4gICAgdGhpcy5fbXV0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLnVzaW5nV2ViQXVkaW8gPSB1c2luZ1dlYkF1ZGlvO1xuICAgIHRoaXMuY3R4ID0gY3R4O1xuICAgIHRoaXMubm9BdWRpbyA9IG5vQXVkaW87XG4gICAgdGhpcy5faG93bHMgPSBbXTtcbiAgICB0aGlzLl9jb2RlY3MgPSBjb2RlY3M7XG4gICAgdGhpcy5pT1NBdXRvRW5hYmxlID0gdHJ1ZTtcbiAgfTtcbiAgSG93bGVyR2xvYmFsLnByb3RvdHlwZSA9IHtcbiAgICAvKipcbiAgICAgKiBHZXQvc2V0IHRoZSBnbG9iYWwgdm9sdW1lIGZvciBhbGwgc291bmRzLlxuICAgICAqIEBwYXJhbSAge0Zsb2F0fSB2b2wgVm9sdW1lIGZyb20gMC4wIHRvIDEuMC5cbiAgICAgKiBAcmV0dXJuIHtIb3dsZXIvRmxvYXR9ICAgICBSZXR1cm5zIHNlbGYgb3IgY3VycmVudCB2b2x1bWUuXG4gICAgICovXG4gICAgdm9sdW1lOiBmdW5jdGlvbih2b2wpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgLy8gbWFrZSBzdXJlIHZvbHVtZSBpcyBhIG51bWJlclxuICAgICAgdm9sID0gcGFyc2VGbG9hdCh2b2wpO1xuXG4gICAgICBpZiAodm9sID49IDAgJiYgdm9sIDw9IDEpIHtcbiAgICAgICAgc2VsZi5fdm9sdW1lID0gdm9sO1xuXG4gICAgICAgIGlmICh1c2luZ1dlYkF1ZGlvKSB7XG4gICAgICAgICAgbWFzdGVyR2Fpbi5nYWluLnZhbHVlID0gdm9sO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbG9vcCB0aHJvdWdoIGNhY2hlIGFuZCBjaGFuZ2Ugdm9sdW1lIG9mIGFsbCBub2RlcyB0aGF0IGFyZSB1c2luZyBIVE1MNSBBdWRpb1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc2VsZi5faG93bHMpIHtcbiAgICAgICAgICBpZiAoc2VsZi5faG93bHMuaGFzT3duUHJvcGVydHkoa2V5KSAmJiBzZWxmLl9ob3dsc1trZXldLl93ZWJBdWRpbyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgYXVkaW8gbm9kZXNcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxzZWxmLl9ob3dsc1trZXldLl9hdWRpb05vZGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgc2VsZi5faG93bHNba2V5XS5fYXVkaW9Ob2RlW2ldLnZvbHVtZSA9IHNlbGYuX2hvd2xzW2tleV0uX3ZvbHVtZSAqIHNlbGYuX3ZvbHVtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgIH1cblxuICAgICAgLy8gcmV0dXJuIHRoZSBjdXJyZW50IGdsb2JhbCB2b2x1bWVcbiAgICAgIHJldHVybiAodXNpbmdXZWJBdWRpbykgPyBtYXN0ZXJHYWluLmdhaW4udmFsdWUgOiBzZWxmLl92b2x1bWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE11dGUgYWxsIHNvdW5kcy5cbiAgICAgKiBAcmV0dXJuIHtIb3dsZXJ9XG4gICAgICovXG4gICAgbXV0ZTogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9zZXRNdXRlZCh0cnVlKTtcblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVubXV0ZSBhbGwgc291bmRzLlxuICAgICAqIEByZXR1cm4ge0hvd2xlcn1cbiAgICAgKi9cbiAgICB1bm11dGU6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fc2V0TXV0ZWQoZmFsc2UpO1xuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIG11dGluZyBhbmQgdW5tdXRpbmcgZ2xvYmFsbHkuXG4gICAgICogQHBhcmFtICB7Qm9vbGVhbn0gbXV0ZWQgSXMgbXV0ZWQgb3Igbm90LlxuICAgICAqL1xuICAgIF9zZXRNdXRlZDogZnVuY3Rpb24obXV0ZWQpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgc2VsZi5fbXV0ZWQgPSBtdXRlZDtcblxuICAgICAgaWYgKHVzaW5nV2ViQXVkaW8pIHtcbiAgICAgICAgbWFzdGVyR2Fpbi5nYWluLnZhbHVlID0gbXV0ZWQgPyAwIDogc2VsZi5fdm9sdW1lO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gc2VsZi5faG93bHMpIHtcbiAgICAgICAgaWYgKHNlbGYuX2hvd2xzLmhhc093blByb3BlcnR5KGtleSkgJiYgc2VsZi5faG93bHNba2V5XS5fd2ViQXVkaW8gPT09IGZhbHNlKSB7XG4gICAgICAgICAgLy8gbG9vcCB0aHJvdWdoIHRoZSBhdWRpbyBub2Rlc1xuICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxzZWxmLl9ob3dsc1trZXldLl9hdWRpb05vZGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHNlbGYuX2hvd2xzW2tleV0uX2F1ZGlvTm9kZVtpXS5tdXRlZCA9IG11dGVkO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBmb3IgY29kZWMgc3VwcG9ydC5cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IGV4dCBBdWRpbyBmaWxlIGV4dGVuc2lvbi5cbiAgICAgKiBAcmV0dXJuIHtCb29sZWFufVxuICAgICAqL1xuICAgIGNvZGVjczogZnVuY3Rpb24oZXh0KSB7XG4gICAgICByZXR1cm4gdGhpcy5fY29kZWNzW2V4dF07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIGlPUyB3aWxsIG9ubHkgYWxsb3cgYXVkaW8gdG8gYmUgcGxheWVkIGFmdGVyIGEgdXNlciBpbnRlcmFjdGlvbi5cbiAgICAgKiBBdHRlbXB0IHRvIGF1dG9tYXRpY2FsbHkgdW5sb2NrIGF1ZGlvIG9uIHRoZSBmaXJzdCB1c2VyIGludGVyYWN0aW9uLlxuICAgICAqIENvbmNlcHQgZnJvbTogaHR0cDovL3BhdWxiYWthdXMuY29tL3R1dG9yaWFscy9odG1sNS93ZWItYXVkaW8tb24taW9zL1xuICAgICAqIEByZXR1cm4ge0hvd2xlcn1cbiAgICAgKi9cbiAgICBfZW5hYmxlaU9TQXVkaW86IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAvLyBvbmx5IHJ1biB0aGlzIG9uIGlPUyBpZiBhdWRpbyBpc24ndCBhbHJlYWR5IGVhbmJsZWRcbiAgICAgIGlmIChjdHggJiYgKHNlbGYuX2lPU0VuYWJsZWQgfHwgIS9pUGhvbmV8aVBhZHxpUG9kL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBzZWxmLl9pT1NFbmFibGVkID0gZmFsc2U7XG5cbiAgICAgIC8vIGNhbGwgdGhpcyBtZXRob2Qgb24gdG91Y2ggc3RhcnQgdG8gY3JlYXRlIGFuZCBwbGF5IGEgYnVmZmVyLFxuICAgICAgLy8gdGhlbiBjaGVjayBpZiB0aGUgYXVkaW8gYWN0dWFsbHkgcGxheWVkIHRvIGRldGVybWluZSBpZlxuICAgICAgLy8gYXVkaW8gaGFzIG5vdyBiZWVuIHVubG9ja2VkIG9uIGlPU1xuICAgICAgdmFyIHVubG9jayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBjcmVhdGUgYW4gZW1wdHkgYnVmZmVyXG4gICAgICAgIHZhciBidWZmZXIgPSBjdHguY3JlYXRlQnVmZmVyKDEsIDEsIDIyMDUwKTtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGN0eC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICAgICAgc291cmNlLmJ1ZmZlciA9IGJ1ZmZlcjtcbiAgICAgICAgc291cmNlLmNvbm5lY3QoY3R4LmRlc3RpbmF0aW9uKTtcblxuICAgICAgICAvLyBwbGF5IHRoZSBlbXB0eSBidWZmZXJcbiAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2Uuc3RhcnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgc291cmNlLm5vdGVPbigwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzb3VyY2Uuc3RhcnQoMCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzZXR1cCBhIHRpbWVvdXQgdG8gY2hlY2sgdGhhdCB3ZSBhcmUgdW5sb2NrZWQgb24gdGhlIG5leHQgZXZlbnQgbG9vcFxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgoc291cmNlLnBsYXliYWNrU3RhdGUgPT09IHNvdXJjZS5QTEFZSU5HX1NUQVRFIHx8IHNvdXJjZS5wbGF5YmFja1N0YXRlID09PSBzb3VyY2UuRklOSVNIRURfU1RBVEUpKSB7XG4gICAgICAgICAgICAvLyB1cGRhdGUgdGhlIHVubG9ja2VkIHN0YXRlIGFuZCBwcmV2ZW50IHRoaXMgY2hlY2sgZnJvbSBoYXBwZW5pbmcgYWdhaW5cbiAgICAgICAgICAgIHNlbGYuX2lPU0VuYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgc2VsZi5pT1NBdXRvRW5hYmxlID0gZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIHJlbW92ZSB0aGUgdG91Y2ggc3RhcnQgbGlzdGVuZXJcbiAgICAgICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIHVubG9jaywgZmFsc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgMCk7XG4gICAgICB9O1xuXG4gICAgICAvLyBzZXR1cCBhIHRvdWNoIHN0YXJ0IGxpc3RlbmVyIHRvIGF0dGVtcHQgYW4gdW5sb2NrIGluXG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCB1bmxvY2ssIGZhbHNlKTtcblxuICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfVxuICB9O1xuXG4gIC8vIGNoZWNrIGZvciBicm93c2VyIGNvZGVjIHN1cHBvcnRcbiAgdmFyIGF1ZGlvVGVzdCA9IG51bGw7XG4gIHZhciBjb2RlY3MgPSB7fTtcbiAgaWYgKCFub0F1ZGlvKSB7XG4gICAgYXVkaW9UZXN0ID0gbmV3IEF1ZGlvKCk7XG4gICAgY29kZWNzID0ge1xuICAgICAgbXAzOiAhIWF1ZGlvVGVzdC5jYW5QbGF5VHlwZSgnYXVkaW8vbXBlZzsnKS5yZXBsYWNlKC9ebm8kLywgJycpLFxuICAgICAgb3B1czogISFhdWRpb1Rlc3QuY2FuUGxheVR5cGUoJ2F1ZGlvL29nZzsgY29kZWNzPVwib3B1c1wiJykucmVwbGFjZSgvXm5vJC8sICcnKSxcbiAgICAgIG9nZzogISFhdWRpb1Rlc3QuY2FuUGxheVR5cGUoJ2F1ZGlvL29nZzsgY29kZWNzPVwidm9yYmlzXCInKS5yZXBsYWNlKC9ebm8kLywgJycpLFxuICAgICAgd2F2OiAhIWF1ZGlvVGVzdC5jYW5QbGF5VHlwZSgnYXVkaW8vd2F2OyBjb2RlY3M9XCIxXCInKS5yZXBsYWNlKC9ebm8kLywgJycpLFxuICAgICAgYWFjOiAhIWF1ZGlvVGVzdC5jYW5QbGF5VHlwZSgnYXVkaW8vYWFjOycpLnJlcGxhY2UoL15ubyQvLCAnJyksXG4gICAgICBtNGE6ICEhKGF1ZGlvVGVzdC5jYW5QbGF5VHlwZSgnYXVkaW8veC1tNGE7JykgfHwgYXVkaW9UZXN0LmNhblBsYXlUeXBlKCdhdWRpby9tNGE7JykgfHwgYXVkaW9UZXN0LmNhblBsYXlUeXBlKCdhdWRpby9hYWM7JykpLnJlcGxhY2UoL15ubyQvLCAnJyksXG4gICAgICBtcDQ6ICEhKGF1ZGlvVGVzdC5jYW5QbGF5VHlwZSgnYXVkaW8veC1tcDQ7JykgfHwgYXVkaW9UZXN0LmNhblBsYXlUeXBlKCdhdWRpby9tcDQ7JykgfHwgYXVkaW9UZXN0LmNhblBsYXlUeXBlKCdhdWRpby9hYWM7JykpLnJlcGxhY2UoL15ubyQvLCAnJyksXG4gICAgICB3ZWJhOiAhIWF1ZGlvVGVzdC5jYW5QbGF5VHlwZSgnYXVkaW8vd2VibTsgY29kZWNzPVwidm9yYmlzXCInKS5yZXBsYWNlKC9ebm8kLywgJycpXG4gICAgfTtcbiAgfVxuXG4gIC8vIGFsbG93IGFjY2VzcyB0byB0aGUgZ2xvYmFsIGF1ZGlvIGNvbnRyb2xzXG4gIHZhciBIb3dsZXIgPSBuZXcgSG93bGVyR2xvYmFsKGNvZGVjcyk7XG5cbiAgLy8gc2V0dXAgdGhlIGF1ZGlvIG9iamVjdFxuICB2YXIgSG93bCA9IGZ1bmN0aW9uKG8pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBzZXR1cCB0aGUgZGVmYXVsdHNcbiAgICBzZWxmLl9hdXRvcGxheSA9IG8uYXV0b3BsYXkgfHwgZmFsc2U7XG4gICAgc2VsZi5fYnVmZmVyID0gby5idWZmZXIgfHwgZmFsc2U7XG4gICAgc2VsZi5fZHVyYXRpb24gPSBvLmR1cmF0aW9uIHx8IDA7XG4gICAgc2VsZi5fZm9ybWF0ID0gby5mb3JtYXQgfHwgbnVsbDtcbiAgICBzZWxmLl9sb29wID0gby5sb29wIHx8IGZhbHNlO1xuICAgIHNlbGYuX2xvYWRlZCA9IGZhbHNlO1xuICAgIHNlbGYuX3Nwcml0ZSA9IG8uc3ByaXRlIHx8IHt9O1xuICAgIHNlbGYuX3NyYyA9IG8uc3JjIHx8ICcnO1xuICAgIHNlbGYuX3BvczNkID0gby5wb3MzZCB8fCBbMCwgMCwgLTAuNV07XG4gICAgc2VsZi5fdm9sdW1lID0gby52b2x1bWUgIT09IHVuZGVmaW5lZCA/IG8udm9sdW1lIDogMTtcbiAgICBzZWxmLl91cmxzID0gby51cmxzIHx8IFtdO1xuICAgIHNlbGYuX3JhdGUgPSBvLnJhdGUgfHwgMTtcblxuICAgIC8vIGFsbG93IGZvcmNpbmcgb2YgYSBzcGVjaWZpYyBwYW5uaW5nTW9kZWwgKCdlcXVhbHBvd2VyJyBvciAnSFJURicpLFxuICAgIC8vIGlmIG5vbmUgaXMgc3BlY2lmaWVkLCBkZWZhdWx0cyB0byAnZXF1YWxwb3dlcicgYW5kIHN3aXRjaGVzIHRvICdIUlRGJ1xuICAgIC8vIGlmIDNkIHNvdW5kIGlzIHVzZWRcbiAgICBzZWxmLl9tb2RlbCA9IG8ubW9kZWwgfHwgbnVsbDtcblxuICAgIC8vIHNldHVwIGV2ZW50IGZ1bmN0aW9uc1xuICAgIHNlbGYuX29ubG9hZCA9IFtvLm9ubG9hZCB8fCBmdW5jdGlvbigpIHt9XTtcbiAgICBzZWxmLl9vbmxvYWRlcnJvciA9IFtvLm9ubG9hZGVycm9yIHx8IGZ1bmN0aW9uKCkge31dO1xuICAgIHNlbGYuX29uZW5kID0gW28ub25lbmQgfHwgZnVuY3Rpb24oKSB7fV07XG4gICAgc2VsZi5fb25wYXVzZSA9IFtvLm9ucGF1c2UgfHwgZnVuY3Rpb24oKSB7fV07XG4gICAgc2VsZi5fb25wbGF5ID0gW28ub25wbGF5IHx8IGZ1bmN0aW9uKCkge31dO1xuXG4gICAgc2VsZi5fb25lbmRUaW1lciA9IFtdO1xuXG4gICAgLy8gV2ViIEF1ZGlvIG9yIEhUTUw1IEF1ZGlvP1xuICAgIHNlbGYuX3dlYkF1ZGlvID0gdXNpbmdXZWJBdWRpbyAmJiAhc2VsZi5fYnVmZmVyO1xuXG4gICAgLy8gY2hlY2sgaWYgd2UgbmVlZCB0byBmYWxsIGJhY2sgdG8gSFRNTDUgQXVkaW9cbiAgICBzZWxmLl9hdWRpb05vZGUgPSBbXTtcbiAgICBpZiAoc2VsZi5fd2ViQXVkaW8pIHtcbiAgICAgIHNlbGYuX3NldHVwQXVkaW9Ob2RlKCk7XG4gICAgfVxuXG4gICAgLy8gYXV0b21hdGljYWxseSB0cnkgdG8gZW5hYmxlIGF1ZGlvIG9uIGlPU1xuICAgIGlmICh0eXBlb2YgY3R4ICE9PSAndW5kZWZpbmVkJyAmJiBjdHggJiYgSG93bGVyLmlPU0F1dG9FbmFibGUpIHtcbiAgICAgIEhvd2xlci5fZW5hYmxlaU9TQXVkaW8oKTtcbiAgICB9XG5cbiAgICAvLyBhZGQgdGhpcyB0byBhbiBhcnJheSBvZiBIb3dsJ3MgdG8gYWxsb3cgZ2xvYmFsIGNvbnRyb2xcbiAgICBIb3dsZXIuX2hvd2xzLnB1c2goc2VsZik7XG5cbiAgICAvLyBsb2FkIHRoZSB0cmFja1xuICAgIHNlbGYubG9hZCgpO1xuICB9O1xuXG4gIC8vIHNldHVwIGFsbCBvZiB0aGUgbWV0aG9kc1xuICBIb3dsLnByb3RvdHlwZSA9IHtcbiAgICAvKipcbiAgICAgKiBMb2FkIGFuIGF1ZGlvIGZpbGUuXG4gICAgICogQHJldHVybiB7SG93bH1cbiAgICAgKi9cbiAgICBsb2FkOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgdXJsID0gbnVsbDtcblxuICAgICAgLy8gaWYgbm8gYXVkaW8gaXMgYXZhaWxhYmxlLCBxdWl0IGltbWVkaWF0ZWx5XG4gICAgICBpZiAobm9BdWRpbykge1xuICAgICAgICBzZWxmLm9uKCdsb2FkZXJyb3InLCBuZXcgRXJyb3IoJ05vIGF1ZGlvIHN1cHBvcnQuJykpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGxvb3AgdGhyb3VnaCBzb3VyY2UgVVJMcyBhbmQgcGljayB0aGUgZmlyc3Qgb25lIHRoYXQgaXMgY29tcGF0aWJsZVxuICAgICAgZm9yICh2YXIgaT0wOyBpPHNlbGYuX3VybHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGV4dCwgdXJsSXRlbTtcblxuICAgICAgICBpZiAoc2VsZi5fZm9ybWF0KSB7XG4gICAgICAgICAgLy8gdXNlIHNwZWNpZmllZCBhdWRpbyBmb3JtYXQgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgZXh0ID0gc2VsZi5fZm9ybWF0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGZpZ3VyZSBvdXQgdGhlIGZpbGV0eXBlICh3aGV0aGVyIGFuIGV4dGVuc2lvbiBvciBiYXNlNjQgZGF0YSlcbiAgICAgICAgICB1cmxJdGVtID0gc2VsZi5fdXJsc1tpXTtcbiAgICAgICAgICBleHQgPSAvXmRhdGE6YXVkaW9cXC8oW147LF0rKTsvaS5leGVjKHVybEl0ZW0pO1xuICAgICAgICAgIGlmICghZXh0KSB7XG4gICAgICAgICAgICBleHQgPSAvXFwuKFteLl0rKSQvLmV4ZWModXJsSXRlbS5zcGxpdCgnPycsIDEpWzBdKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZXh0KSB7XG4gICAgICAgICAgICBleHQgPSBleHRbMV0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZi5vbignbG9hZGVycm9yJywgbmV3IEVycm9yKCdDb3VsZCBub3QgZXh0cmFjdCBmb3JtYXQgZnJvbSBwYXNzZWQgVVJMcywgcGxlYXNlIGFkZCBmb3JtYXQgcGFyYW1ldGVyLicpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29kZWNzW2V4dF0pIHtcbiAgICAgICAgICB1cmwgPSBzZWxmLl91cmxzW2ldO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICghdXJsKSB7XG4gICAgICAgIHNlbGYub24oJ2xvYWRlcnJvcicsIG5ldyBFcnJvcignTm8gY29kZWMgc3VwcG9ydCBmb3Igc2VsZWN0ZWQgYXVkaW8gc291cmNlcy4nKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgc2VsZi5fc3JjID0gdXJsO1xuXG4gICAgICBpZiAoc2VsZi5fd2ViQXVkaW8pIHtcbiAgICAgICAgbG9hZEJ1ZmZlcihzZWxmLCB1cmwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIG5ld05vZGUgPSBuZXcgQXVkaW8oKTtcblxuICAgICAgICAvLyBsaXN0ZW4gZm9yIGVycm9ycyB3aXRoIEhUTUw1IGF1ZGlvIChodHRwOi8vZGV2LnczLm9yZy9odG1sNS9zcGVjLWF1dGhvci12aWV3L3NwZWMuaHRtbCNtZWRpYWVycm9yKVxuICAgICAgICBuZXdOb2RlLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmIChuZXdOb2RlLmVycm9yICYmIG5ld05vZGUuZXJyb3IuY29kZSA9PT0gNCkge1xuICAgICAgICAgICAgSG93bGVyR2xvYmFsLm5vQXVkaW8gPSB0cnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHNlbGYub24oJ2xvYWRlcnJvcicsIHt0eXBlOiBuZXdOb2RlLmVycm9yID8gbmV3Tm9kZS5lcnJvci5jb2RlIDogMH0pO1xuICAgICAgICB9LCBmYWxzZSk7XG5cbiAgICAgICAgc2VsZi5fYXVkaW9Ob2RlLnB1c2gobmV3Tm9kZSk7XG5cbiAgICAgICAgLy8gc2V0dXAgdGhlIG5ldyBhdWRpbyBub2RlXG4gICAgICAgIG5ld05vZGUuc3JjID0gdXJsO1xuICAgICAgICBuZXdOb2RlLl9wb3MgPSAwO1xuICAgICAgICBuZXdOb2RlLnByZWxvYWQgPSAnYXV0byc7XG4gICAgICAgIG5ld05vZGUudm9sdW1lID0gKEhvd2xlci5fbXV0ZWQpID8gMCA6IHNlbGYuX3ZvbHVtZSAqIEhvd2xlci52b2x1bWUoKTtcblxuICAgICAgICAvLyBzZXR1cCB0aGUgZXZlbnQgbGlzdGVuZXIgdG8gc3RhcnQgcGxheWluZyB0aGUgc291bmRcbiAgICAgICAgLy8gYXMgc29vbiBhcyBpdCBoYXMgYnVmZmVyZWQgZW5vdWdoXG4gICAgICAgIHZhciBsaXN0ZW5lciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIHJvdW5kIHVwIHRoZSBkdXJhdGlvbiB3aGVuIHVzaW5nIEhUTUw1IEF1ZGlvIHRvIGFjY291bnQgZm9yIHRoZSBsb3dlciBwcmVjaXNpb25cbiAgICAgICAgICBzZWxmLl9kdXJhdGlvbiA9IE1hdGguY2VpbChuZXdOb2RlLmR1cmF0aW9uICogMTApIC8gMTA7XG5cbiAgICAgICAgICAvLyBzZXR1cCBhIHNwcml0ZSBpZiBub25lIGlzIGRlZmluZWRcbiAgICAgICAgICBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoc2VsZi5fc3ByaXRlKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHNlbGYuX3Nwcml0ZSA9IHtfZGVmYXVsdDogWzAsIHNlbGYuX2R1cmF0aW9uICogMTAwMF19O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghc2VsZi5fbG9hZGVkKSB7XG4gICAgICAgICAgICBzZWxmLl9sb2FkZWQgPSB0cnVlO1xuICAgICAgICAgICAgc2VsZi5vbignbG9hZCcpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChzZWxmLl9hdXRvcGxheSkge1xuICAgICAgICAgICAgc2VsZi5wbGF5KCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gY2xlYXIgdGhlIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgICAgbmV3Tm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKCdjYW5wbGF5dGhyb3VnaCcsIGxpc3RlbmVyLCBmYWxzZSk7XG4gICAgICAgIH07XG4gICAgICAgIG5ld05vZGUuYWRkRXZlbnRMaXN0ZW5lcignY2FucGxheXRocm91Z2gnLCBsaXN0ZW5lciwgZmFsc2UpO1xuICAgICAgICBuZXdOb2RlLmxvYWQoKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldC9zZXQgdGhlIFVSTHMgdG8gYmUgcHVsbGVkIGZyb20gdG8gcGxheSBpbiB0aGlzIHNvdXJjZS5cbiAgICAgKiBAcGFyYW0gIHtBcnJheX0gdXJscyAgQXJyeSBvZiBVUkxzIHRvIGxvYWQgZnJvbVxuICAgICAqIEByZXR1cm4ge0hvd2x9ICAgICAgICBSZXR1cm5zIHNlbGYgb3IgdGhlIGN1cnJlbnQgVVJMc1xuICAgICAqL1xuICAgIHVybHM6IGZ1bmN0aW9uKHVybHMpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgaWYgKHVybHMpIHtcbiAgICAgICAgc2VsZi5zdG9wKCk7XG4gICAgICAgIHNlbGYuX3VybHMgPSAodHlwZW9mIHVybHMgPT09ICdzdHJpbmcnKSA/IFt1cmxzXSA6IHVybHM7XG4gICAgICAgIHNlbGYuX2xvYWRlZCA9IGZhbHNlO1xuICAgICAgICBzZWxmLmxvYWQoKTtcblxuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBzZWxmLl91cmxzO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQbGF5IGEgc291bmQgZnJvbSB0aGUgY3VycmVudCB0aW1lICgwIGJ5IGRlZmF1bHQpLlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gICBzcHJpdGUgICAob3B0aW9uYWwpIFBsYXlzIGZyb20gdGhlIHNwZWNpZmllZCBwb3NpdGlvbiBpbiB0aGUgc291bmQgc3ByaXRlIGRlZmluaXRpb24uXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIChvcHRpb25hbCkgUmV0dXJucyB0aGUgdW5pcXVlIHBsYXliYWNrIGlkIGZvciB0aGlzIHNvdW5kIGluc3RhbmNlLlxuICAgICAqIEByZXR1cm4ge0hvd2x9XG4gICAgICovXG4gICAgcGxheTogZnVuY3Rpb24oc3ByaXRlLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAvLyBpZiBubyBzcHJpdGUgd2FzIHBhc3NlZCBidXQgYSBjYWxsYmFjayB3YXMsIHVwZGF0ZSB0aGUgdmFyaWFibGVzXG4gICAgICBpZiAodHlwZW9mIHNwcml0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjYWxsYmFjayA9IHNwcml0ZTtcbiAgICAgIH1cblxuICAgICAgLy8gdXNlIHRoZSBkZWZhdWx0IHNwcml0ZSBpZiBub25lIGlzIHBhc3NlZFxuICAgICAgaWYgKCFzcHJpdGUgfHwgdHlwZW9mIHNwcml0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBzcHJpdGUgPSAnX2RlZmF1bHQnO1xuICAgICAgfVxuXG4gICAgICAvLyBpZiB0aGUgc291bmQgaGFzbid0IGJlZW4gbG9hZGVkLCBhZGQgaXQgdG8gdGhlIGV2ZW50IHF1ZXVlXG4gICAgICBpZiAoIXNlbGYuX2xvYWRlZCkge1xuICAgICAgICBzZWxmLm9uKCdsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2VsZi5wbGF5KHNwcml0ZSwgY2FsbGJhY2spO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgIH1cblxuICAgICAgLy8gaWYgdGhlIHNwcml0ZSBkb2Vzbid0IGV4aXN0LCBwbGF5IG5vdGhpbmdcbiAgICAgIGlmICghc2VsZi5fc3ByaXRlW3Nwcml0ZV0pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykgY2FsbGJhY2soKTtcbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICB9XG5cbiAgICAgIC8vIGdldCB0aGUgbm9kZSB0byBwbGF5YmFja1xuICAgICAgc2VsZi5faW5hY3RpdmVOb2RlKGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgLy8gcGVyc2lzdCB0aGUgc3ByaXRlIGJlaW5nIHBsYXllZFxuICAgICAgICBub2RlLl9zcHJpdGUgPSBzcHJpdGU7XG5cbiAgICAgICAgLy8gZGV0ZXJtaW5lIHdoZXJlIHRvIHN0YXJ0IHBsYXlpbmcgZnJvbVxuICAgICAgICB2YXIgcG9zID0gKG5vZGUuX3BvcyA+IDApID8gbm9kZS5fcG9zIDogc2VsZi5fc3ByaXRlW3Nwcml0ZV1bMF0gLyAxMDAwO1xuXG4gICAgICAgIC8vIGRldGVybWluZSBob3cgbG9uZyB0byBwbGF5IGZvclxuICAgICAgICB2YXIgZHVyYXRpb24gPSAwO1xuICAgICAgICBpZiAoc2VsZi5fd2ViQXVkaW8pIHtcbiAgICAgICAgICBkdXJhdGlvbiA9IHNlbGYuX3Nwcml0ZVtzcHJpdGVdWzFdIC8gMTAwMCAtIG5vZGUuX3BvcztcbiAgICAgICAgICBpZiAobm9kZS5fcG9zID4gMCkge1xuICAgICAgICAgICAgcG9zID0gc2VsZi5fc3ByaXRlW3Nwcml0ZV1bMF0gLyAxMDAwICsgcG9zO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkdXJhdGlvbiA9IHNlbGYuX3Nwcml0ZVtzcHJpdGVdWzFdIC8gMTAwMCAtIChwb3MgLSBzZWxmLl9zcHJpdGVbc3ByaXRlXVswXSAvIDEwMDApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZGV0ZXJtaW5lIGlmIHRoaXMgc291bmQgc2hvdWxkIGJlIGxvb3BlZFxuICAgICAgICB2YXIgbG9vcCA9ICEhKHNlbGYuX2xvb3AgfHwgc2VsZi5fc3ByaXRlW3Nwcml0ZV1bMl0pO1xuXG4gICAgICAgIC8vIHNldCB0aW1lciB0byBmaXJlIHRoZSAnb25lbmQnIGV2ZW50XG4gICAgICAgIHZhciBzb3VuZElkID0gKHR5cGVvZiBjYWxsYmFjayA9PT0gJ3N0cmluZycpID8gY2FsbGJhY2sgOiBNYXRoLnJvdW5kKERhdGUubm93KCkgKiBNYXRoLnJhbmRvbSgpKSArICcnLFxuICAgICAgICAgIHRpbWVySWQ7XG4gICAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICAgIGlkOiBzb3VuZElkLFxuICAgICAgICAgICAgc3ByaXRlOiBzcHJpdGUsXG4gICAgICAgICAgICBsb29wOiBsb29wXG4gICAgICAgICAgfTtcbiAgICAgICAgICB0aW1lcklkID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIGlmIGxvb3BpbmcsIHJlc3RhcnQgdGhlIHRyYWNrXG4gICAgICAgICAgICBpZiAoIXNlbGYuX3dlYkF1ZGlvICYmIGxvb3ApIHtcbiAgICAgICAgICAgICAgc2VsZi5zdG9wKGRhdGEuaWQpLnBsYXkoc3ByaXRlLCBkYXRhLmlkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gc2V0IHdlYiBhdWRpbyBub2RlIHRvIHBhdXNlZCBhdCBlbmRcbiAgICAgICAgICAgIGlmIChzZWxmLl93ZWJBdWRpbyAmJiAhbG9vcCkge1xuICAgICAgICAgICAgICBzZWxmLl9ub2RlQnlJZChkYXRhLmlkKS5wYXVzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICBzZWxmLl9ub2RlQnlJZChkYXRhLmlkKS5fcG9zID0gMDtcblxuICAgICAgICAgICAgICAvLyBjbGVhciB0aGUgZW5kIHRpbWVyXG4gICAgICAgICAgICAgIHNlbGYuX2NsZWFyRW5kVGltZXIoZGF0YS5pZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGVuZCB0aGUgdHJhY2sgaWYgaXQgaXMgSFRNTCBhdWRpbyBhbmQgYSBzcHJpdGVcbiAgICAgICAgICAgIGlmICghc2VsZi5fd2ViQXVkaW8gJiYgIWxvb3ApIHtcbiAgICAgICAgICAgICAgc2VsZi5zdG9wKGRhdGEuaWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBmaXJlIGVuZGVkIGV2ZW50XG4gICAgICAgICAgICBzZWxmLm9uKCdlbmQnLCBzb3VuZElkKTtcbiAgICAgICAgICB9LCAoZHVyYXRpb24gLyBzZWxmLl9yYXRlKSAqIDEwMDApO1xuXG4gICAgICAgICAgLy8gc3RvcmUgdGhlIHJlZmVyZW5jZSB0byB0aGUgdGltZXJcbiAgICAgICAgICBzZWxmLl9vbmVuZFRpbWVyLnB1c2goe3RpbWVyOiB0aW1lcklkLCBpZDogZGF0YS5pZH0pO1xuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGlmIChzZWxmLl93ZWJBdWRpbykge1xuICAgICAgICAgIHZhciBsb29wU3RhcnQgPSBzZWxmLl9zcHJpdGVbc3ByaXRlXVswXSAvIDEwMDAsXG4gICAgICAgICAgICBsb29wRW5kID0gc2VsZi5fc3ByaXRlW3Nwcml0ZV1bMV0gLyAxMDAwO1xuXG4gICAgICAgICAgLy8gc2V0IHRoZSBwbGF5IGlkIHRvIHRoaXMgbm9kZSBhbmQgbG9hZCBpbnRvIGNvbnRleHRcbiAgICAgICAgICBub2RlLmlkID0gc291bmRJZDtcbiAgICAgICAgICBub2RlLnBhdXNlZCA9IGZhbHNlO1xuICAgICAgICAgIHJlZnJlc2hCdWZmZXIoc2VsZiwgW2xvb3AsIGxvb3BTdGFydCwgbG9vcEVuZF0sIHNvdW5kSWQpO1xuICAgICAgICAgIHNlbGYuX3BsYXlTdGFydCA9IGN0eC5jdXJyZW50VGltZTtcbiAgICAgICAgICBub2RlLmdhaW4udmFsdWUgPSBzZWxmLl92b2x1bWU7XG5cbiAgICAgICAgICBpZiAodHlwZW9mIG5vZGUuYnVmZmVyU291cmNlLnN0YXJ0ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgbG9vcCA/IG5vZGUuYnVmZmVyU291cmNlLm5vdGVHcmFpbk9uKDAsIHBvcywgODY0MDApIDogbm9kZS5idWZmZXJTb3VyY2Uubm90ZUdyYWluT24oMCwgcG9zLCBkdXJhdGlvbik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvb3AgPyBub2RlLmJ1ZmZlclNvdXJjZS5zdGFydCgwLCBwb3MsIDg2NDAwKSA6IG5vZGUuYnVmZmVyU291cmNlLnN0YXJ0KDAsIHBvcywgZHVyYXRpb24pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAobm9kZS5yZWFkeVN0YXRlID09PSA0IHx8ICFub2RlLnJlYWR5U3RhdGUgJiYgbmF2aWdhdG9yLmlzQ29jb29uSlMpIHtcbiAgICAgICAgICAgIG5vZGUucmVhZHlTdGF0ZSA9IDQ7XG4gICAgICAgICAgICBub2RlLmlkID0gc291bmRJZDtcbiAgICAgICAgICAgIG5vZGUuY3VycmVudFRpbWUgPSBwb3M7XG4gICAgICAgICAgICBub2RlLm11dGVkID0gSG93bGVyLl9tdXRlZCB8fCBub2RlLm11dGVkO1xuICAgICAgICAgICAgbm9kZS52b2x1bWUgPSBzZWxmLl92b2x1bWUgKiBIb3dsZXIudm9sdW1lKCk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBub2RlLnBsYXkoKTsgfSwgMCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlbGYuX2NsZWFyRW5kVGltZXIoc291bmRJZCk7XG5cbiAgICAgICAgICAgIChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICB2YXIgc291bmQgPSBzZWxmLFxuICAgICAgICAgICAgICAgIHBsYXlTcHJpdGUgPSBzcHJpdGUsXG4gICAgICAgICAgICAgICAgZm4gPSBjYWxsYmFjayxcbiAgICAgICAgICAgICAgICBuZXdOb2RlID0gbm9kZTtcbiAgICAgICAgICAgICAgdmFyIGxpc3RlbmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc291bmQucGxheShwbGF5U3ByaXRlLCBmbik7XG5cbiAgICAgICAgICAgICAgICAvLyBjbGVhciB0aGUgZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgICAgICAgICBuZXdOb2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NhbnBsYXl0aHJvdWdoJywgbGlzdGVuZXIsIGZhbHNlKTtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgbmV3Tm9kZS5hZGRFdmVudExpc3RlbmVyKCdjYW5wbGF5dGhyb3VnaCcsIGxpc3RlbmVyLCBmYWxzZSk7XG4gICAgICAgICAgICB9KSgpO1xuXG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBmaXJlIHRoZSBwbGF5IGV2ZW50IGFuZCBzZW5kIHRoZSBzb3VuZElkIGJhY2sgaW4gdGhlIGNhbGxiYWNrXG4gICAgICAgIHNlbGYub24oJ3BsYXknKTtcbiAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykgY2FsbGJhY2soc291bmRJZCk7XG5cbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBhdXNlIHBsYXliYWNrIGFuZCBzYXZlIHRoZSBjdXJyZW50IHBvc2l0aW9uLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBpZCAob3B0aW9uYWwpIFRoZSBwbGF5IGluc3RhbmNlIElELlxuICAgICAqIEByZXR1cm4ge0hvd2x9XG4gICAgICovXG4gICAgcGF1c2U6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIC8vIGlmIHRoZSBzb3VuZCBoYXNuJ3QgYmVlbiBsb2FkZWQsIGFkZCBpdCB0byB0aGUgZXZlbnQgcXVldWVcbiAgICAgIGlmICghc2VsZi5fbG9hZGVkKSB7XG4gICAgICAgIHNlbGYub24oJ3BsYXknLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzZWxmLnBhdXNlKGlkKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICB9XG5cbiAgICAgIC8vIGNsZWFyICdvbmVuZCcgdGltZXJcbiAgICAgIHNlbGYuX2NsZWFyRW5kVGltZXIoaWQpO1xuXG4gICAgICB2YXIgYWN0aXZlTm9kZSA9IChpZCkgPyBzZWxmLl9ub2RlQnlJZChpZCkgOiBzZWxmLl9hY3RpdmVOb2RlKCk7XG4gICAgICBpZiAoYWN0aXZlTm9kZSkge1xuICAgICAgICBhY3RpdmVOb2RlLl9wb3MgPSBzZWxmLnBvcyhudWxsLCBpZCk7XG5cbiAgICAgICAgaWYgKHNlbGYuX3dlYkF1ZGlvKSB7XG4gICAgICAgICAgLy8gbWFrZSBzdXJlIHRoZSBzb3VuZCBoYXMgYmVlbiBjcmVhdGVkXG4gICAgICAgICAgaWYgKCFhY3RpdmVOb2RlLmJ1ZmZlclNvdXJjZSB8fCBhY3RpdmVOb2RlLnBhdXNlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYWN0aXZlTm9kZS5wYXVzZWQgPSB0cnVlO1xuICAgICAgICAgIGlmICh0eXBlb2YgYWN0aXZlTm9kZS5idWZmZXJTb3VyY2Uuc3RvcCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGFjdGl2ZU5vZGUuYnVmZmVyU291cmNlLm5vdGVPZmYoMCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFjdGl2ZU5vZGUuYnVmZmVyU291cmNlLnN0b3AoMCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFjdGl2ZU5vZGUucGF1c2UoKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBzZWxmLm9uKCdwYXVzZScpO1xuXG4gICAgICByZXR1cm4gc2VsZjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RvcCBwbGF5YmFjayBhbmQgcmVzZXQgdG8gc3RhcnQuXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBpZCAgKG9wdGlvbmFsKSBUaGUgcGxheSBpbnN0YW5jZSBJRC5cbiAgICAgKiBAcmV0dXJuIHtIb3dsfVxuICAgICAqL1xuICAgIHN0b3A6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIC8vIGlmIHRoZSBzb3VuZCBoYXNuJ3QgYmVlbiBsb2FkZWQsIGFkZCBpdCB0byB0aGUgZXZlbnQgcXVldWVcbiAgICAgIGlmICghc2VsZi5fbG9hZGVkKSB7XG4gICAgICAgIHNlbGYub24oJ3BsYXknLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzZWxmLnN0b3AoaWQpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgIH1cblxuICAgICAgLy8gY2xlYXIgJ29uZW5kJyB0aW1lclxuICAgICAgc2VsZi5fY2xlYXJFbmRUaW1lcihpZCk7XG5cbiAgICAgIHZhciBhY3RpdmVOb2RlID0gKGlkKSA/IHNlbGYuX25vZGVCeUlkKGlkKSA6IHNlbGYuX2FjdGl2ZU5vZGUoKTtcbiAgICAgIGlmIChhY3RpdmVOb2RlKSB7XG4gICAgICAgIGFjdGl2ZU5vZGUuX3BvcyA9IDA7XG5cbiAgICAgICAgaWYgKHNlbGYuX3dlYkF1ZGlvKSB7XG4gICAgICAgICAgLy8gbWFrZSBzdXJlIHRoZSBzb3VuZCBoYXMgYmVlbiBjcmVhdGVkXG4gICAgICAgICAgaWYgKCFhY3RpdmVOb2RlLmJ1ZmZlclNvdXJjZSB8fCBhY3RpdmVOb2RlLnBhdXNlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYWN0aXZlTm9kZS5wYXVzZWQgPSB0cnVlO1xuXG4gICAgICAgICAgaWYgKHR5cGVvZiBhY3RpdmVOb2RlLmJ1ZmZlclNvdXJjZS5zdG9wID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgYWN0aXZlTm9kZS5idWZmZXJTb3VyY2Uubm90ZU9mZigwKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWN0aXZlTm9kZS5idWZmZXJTb3VyY2Uuc3RvcCgwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIWlzTmFOKGFjdGl2ZU5vZGUuZHVyYXRpb24pKSB7XG4gICAgICAgICAgYWN0aXZlTm9kZS5wYXVzZSgpO1xuICAgICAgICAgIGFjdGl2ZU5vZGUuY3VycmVudFRpbWUgPSAwO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZWxmO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNdXRlIHRoaXMgc291bmQuXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBpZCAob3B0aW9uYWwpIFRoZSBwbGF5IGluc3RhbmNlIElELlxuICAgICAqIEByZXR1cm4ge0hvd2x9XG4gICAgICovXG4gICAgbXV0ZTogZnVuY3Rpb24oaWQpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgLy8gaWYgdGhlIHNvdW5kIGhhc24ndCBiZWVuIGxvYWRlZCwgYWRkIGl0IHRvIHRoZSBldmVudCBxdWV1ZVxuICAgICAgaWYgKCFzZWxmLl9sb2FkZWQpIHtcbiAgICAgICAgc2VsZi5vbigncGxheScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNlbGYubXV0ZShpZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgfVxuXG4gICAgICB2YXIgYWN0aXZlTm9kZSA9IChpZCkgPyBzZWxmLl9ub2RlQnlJZChpZCkgOiBzZWxmLl9hY3RpdmVOb2RlKCk7XG4gICAgICBpZiAoYWN0aXZlTm9kZSkge1xuICAgICAgICBpZiAoc2VsZi5fd2ViQXVkaW8pIHtcbiAgICAgICAgICBhY3RpdmVOb2RlLmdhaW4udmFsdWUgPSAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFjdGl2ZU5vZGUubXV0ZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZWxmO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVbm11dGUgdGhpcyBzb3VuZC5cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IGlkIChvcHRpb25hbCkgVGhlIHBsYXkgaW5zdGFuY2UgSUQuXG4gICAgICogQHJldHVybiB7SG93bH1cbiAgICAgKi9cbiAgICB1bm11dGU6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIC8vIGlmIHRoZSBzb3VuZCBoYXNuJ3QgYmVlbiBsb2FkZWQsIGFkZCBpdCB0byB0aGUgZXZlbnQgcXVldWVcbiAgICAgIGlmICghc2VsZi5fbG9hZGVkKSB7XG4gICAgICAgIHNlbGYub24oJ3BsYXknLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzZWxmLnVubXV0ZShpZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgfVxuXG4gICAgICB2YXIgYWN0aXZlTm9kZSA9IChpZCkgPyBzZWxmLl9ub2RlQnlJZChpZCkgOiBzZWxmLl9hY3RpdmVOb2RlKCk7XG4gICAgICBpZiAoYWN0aXZlTm9kZSkge1xuICAgICAgICBpZiAoc2VsZi5fd2ViQXVkaW8pIHtcbiAgICAgICAgICBhY3RpdmVOb2RlLmdhaW4udmFsdWUgPSBzZWxmLl92b2x1bWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYWN0aXZlTm9kZS5tdXRlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZWxmO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQvc2V0IHZvbHVtZSBvZiB0aGlzIHNvdW5kLlxuICAgICAqIEBwYXJhbSAge0Zsb2F0fSAgdm9sIFZvbHVtZSBmcm9tIDAuMCB0byAxLjAuXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBpZCAgKG9wdGlvbmFsKSBUaGUgcGxheSBpbnN0YW5jZSBJRC5cbiAgICAgKiBAcmV0dXJuIHtIb3dsL0Zsb2F0fSAgICAgUmV0dXJucyBzZWxmIG9yIGN1cnJlbnQgdm9sdW1lLlxuICAgICAqL1xuICAgIHZvbHVtZTogZnVuY3Rpb24odm9sLCBpZCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAvLyBtYWtlIHN1cmUgdm9sdW1lIGlzIGEgbnVtYmVyXG4gICAgICB2b2wgPSBwYXJzZUZsb2F0KHZvbCk7XG5cbiAgICAgIGlmICh2b2wgPj0gMCAmJiB2b2wgPD0gMSkge1xuICAgICAgICBzZWxmLl92b2x1bWUgPSB2b2w7XG5cbiAgICAgICAgLy8gaWYgdGhlIHNvdW5kIGhhc24ndCBiZWVuIGxvYWRlZCwgYWRkIGl0IHRvIHRoZSBldmVudCBxdWV1ZVxuICAgICAgICBpZiAoIXNlbGYuX2xvYWRlZCkge1xuICAgICAgICAgIHNlbGYub24oJ3BsYXknLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHNlbGYudm9sdW1lKHZvbCwgaWQpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYWN0aXZlTm9kZSA9IChpZCkgPyBzZWxmLl9ub2RlQnlJZChpZCkgOiBzZWxmLl9hY3RpdmVOb2RlKCk7XG4gICAgICAgIGlmIChhY3RpdmVOb2RlKSB7XG4gICAgICAgICAgaWYgKHNlbGYuX3dlYkF1ZGlvKSB7XG4gICAgICAgICAgICBhY3RpdmVOb2RlLmdhaW4udmFsdWUgPSB2b2w7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFjdGl2ZU5vZGUudm9sdW1lID0gdm9sICogSG93bGVyLnZvbHVtZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuX3ZvbHVtZTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0L3NldCB3aGV0aGVyIHRvIGxvb3AgdGhlIHNvdW5kLlxuICAgICAqIEBwYXJhbSAge0Jvb2xlYW59IGxvb3AgVG8gbG9vcCBvciBub3QgdG8gbG9vcCwgdGhhdCBpcyB0aGUgcXVlc3Rpb24uXG4gICAgICogQHJldHVybiB7SG93bC9Cb29sZWFufSAgICAgIFJldHVybnMgc2VsZiBvciBjdXJyZW50IGxvb3BpbmcgdmFsdWUuXG4gICAgICovXG4gICAgbG9vcDogZnVuY3Rpb24obG9vcCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBpZiAodHlwZW9mIGxvb3AgPT09ICdib29sZWFuJykge1xuICAgICAgICBzZWxmLl9sb29wID0gbG9vcDtcblxuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBzZWxmLl9sb29wO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQvc2V0IHNvdW5kIHNwcml0ZSBkZWZpbml0aW9uLlxuICAgICAqIEBwYXJhbSAge09iamVjdH0gc3ByaXRlIEV4YW1wbGU6IHtzcHJpdGVOYW1lOiBbb2Zmc2V0LCBkdXJhdGlvbiwgbG9vcF19XG4gICAgICogICAgICAgICAgICAgICAgQHBhcmFtIHtJbnRlZ2VyfSBvZmZzZXQgICBXaGVyZSB0byBiZWdpbiBwbGF5YmFjayBpbiBtaWxsaXNlY29uZHNcbiAgICAgKiAgICAgICAgICAgICAgICBAcGFyYW0ge0ludGVnZXJ9IGR1cmF0aW9uIEhvdyBsb25nIHRvIHBsYXkgaW4gbWlsbGlzZWNvbmRzXG4gICAgICogICAgICAgICAgICAgICAgQHBhcmFtIHtCb29sZWFufSBsb29wICAgICAob3B0aW9uYWwpIFNldCB0cnVlIHRvIGxvb3AgdGhpcyBzcHJpdGVcbiAgICAgKiBAcmV0dXJuIHtIb3dsfSAgICAgICAgUmV0dXJucyBjdXJyZW50IHNwcml0ZSBzaGVldCBvciBzZWxmLlxuICAgICAqL1xuICAgIHNwcml0ZTogZnVuY3Rpb24oc3ByaXRlKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIGlmICh0eXBlb2Ygc3ByaXRlID09PSAnb2JqZWN0Jykge1xuICAgICAgICBzZWxmLl9zcHJpdGUgPSBzcHJpdGU7XG5cbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gc2VsZi5fc3ByaXRlO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQvc2V0IHRoZSBwb3NpdGlvbiBvZiBwbGF5YmFjay5cbiAgICAgKiBAcGFyYW0gIHtGbG9hdH0gIHBvcyBUaGUgcG9zaXRpb24gdG8gbW92ZSBjdXJyZW50IHBsYXliYWNrIHRvLlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gaWQgIChvcHRpb25hbCkgVGhlIHBsYXkgaW5zdGFuY2UgSUQuXG4gICAgICogQHJldHVybiB7SG93bC9GbG9hdH0gICAgICBSZXR1cm5zIHNlbGYgb3IgY3VycmVudCBwbGF5YmFjayBwb3NpdGlvbi5cbiAgICAgKi9cbiAgICBwb3M6IGZ1bmN0aW9uKHBvcywgaWQpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgLy8gaWYgdGhlIHNvdW5kIGhhc24ndCBiZWVuIGxvYWRlZCwgYWRkIGl0IHRvIHRoZSBldmVudCBxdWV1ZVxuICAgICAgaWYgKCFzZWxmLl9sb2FkZWQpIHtcbiAgICAgICAgc2VsZi5vbignbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNlbGYucG9zKHBvcyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB0eXBlb2YgcG9zID09PSAnbnVtYmVyJyA/IHNlbGYgOiBzZWxmLl9wb3MgfHwgMDtcbiAgICAgIH1cblxuICAgICAgLy8gbWFrZSBzdXJlIHdlIGFyZSBkZWFsaW5nIHdpdGggYSBudW1iZXIgZm9yIHBvc1xuICAgICAgcG9zID0gcGFyc2VGbG9hdChwb3MpO1xuXG4gICAgICB2YXIgYWN0aXZlTm9kZSA9IChpZCkgPyBzZWxmLl9ub2RlQnlJZChpZCkgOiBzZWxmLl9hY3RpdmVOb2RlKCk7XG4gICAgICBpZiAoYWN0aXZlTm9kZSkge1xuICAgICAgICBpZiAocG9zID49IDApIHtcbiAgICAgICAgICBzZWxmLnBhdXNlKGlkKTtcbiAgICAgICAgICBhY3RpdmVOb2RlLl9wb3MgPSBwb3M7XG4gICAgICAgICAgc2VsZi5wbGF5KGFjdGl2ZU5vZGUuX3Nwcml0ZSwgaWQpO1xuXG4gICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHNlbGYuX3dlYkF1ZGlvID8gYWN0aXZlTm9kZS5fcG9zICsgKGN0eC5jdXJyZW50VGltZSAtIHNlbGYuX3BsYXlTdGFydCkgOiBhY3RpdmVOb2RlLmN1cnJlbnRUaW1lO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHBvcyA+PSAwKSB7XG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZmluZCB0aGUgZmlyc3QgaW5hY3RpdmUgbm9kZSB0byByZXR1cm4gdGhlIHBvcyBmb3JcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPHNlbGYuX2F1ZGlvTm9kZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChzZWxmLl9hdWRpb05vZGVbaV0ucGF1c2VkICYmIHNlbGYuX2F1ZGlvTm9kZVtpXS5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgICByZXR1cm4gKHNlbGYuX3dlYkF1ZGlvKSA/IHNlbGYuX2F1ZGlvTm9kZVtpXS5fcG9zIDogc2VsZi5fYXVkaW9Ob2RlW2ldLmN1cnJlbnRUaW1lO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQvc2V0IHRoZSAzRCBwb3NpdGlvbiBvZiB0aGUgYXVkaW8gc291cmNlLlxuICAgICAqIFRoZSBtb3N0IGNvbW1vbiB1c2FnZSBpcyB0byBzZXQgdGhlICd4JyBwb3NpdGlvblxuICAgICAqIHRvIGFmZmVjdCB0aGUgbGVmdC9yaWdodCBlYXIgcGFubmluZy4gU2V0dGluZyBhbnkgdmFsdWUgaGlnaGVyIHRoYW5cbiAgICAgKiAxLjAgd2lsbCBiZWdpbiB0byBkZWNyZWFzZSB0aGUgdm9sdW1lIG9mIHRoZSBzb3VuZCBhcyBpdCBtb3ZlcyBmdXJ0aGVyIGF3YXkuXG4gICAgICogTk9URTogVGhpcyBvbmx5IHdvcmtzIHdpdGggV2ViIEF1ZGlvIEFQSSwgSFRNTDUgQXVkaW8gcGxheWJhY2tcbiAgICAgKiB3aWxsIG5vdCBiZSBhZmZlY3RlZC5cbiAgICAgKiBAcGFyYW0gIHtGbG9hdH0gIHggIFRoZSB4LXBvc2l0aW9uIG9mIHRoZSBwbGF5YmFjayBmcm9tIC0xMDAwLjAgdG8gMTAwMC4wXG4gICAgICogQHBhcmFtICB7RmxvYXR9ICB5ICBUaGUgeS1wb3NpdGlvbiBvZiB0aGUgcGxheWJhY2sgZnJvbSAtMTAwMC4wIHRvIDEwMDAuMFxuICAgICAqIEBwYXJhbSAge0Zsb2F0fSAgeiAgVGhlIHotcG9zaXRpb24gb2YgdGhlIHBsYXliYWNrIGZyb20gLTEwMDAuMCB0byAxMDAwLjBcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IGlkIChvcHRpb25hbCkgVGhlIHBsYXkgaW5zdGFuY2UgSUQuXG4gICAgICogQHJldHVybiB7SG93bC9BcnJheX0gICBSZXR1cm5zIHNlbGYgb3IgdGhlIGN1cnJlbnQgM0QgcG9zaXRpb246IFt4LCB5LCB6XVxuICAgICAqL1xuICAgIHBvczNkOiBmdW5jdGlvbih4LCB5LCB6LCBpZCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAvLyBzZXQgYSBkZWZhdWx0IGZvciB0aGUgb3B0aW9uYWwgJ3knICYgJ3onXG4gICAgICB5ID0gKHR5cGVvZiB5ID09PSAndW5kZWZpbmVkJyB8fCAheSkgPyAwIDogeTtcbiAgICAgIHogPSAodHlwZW9mIHogPT09ICd1bmRlZmluZWQnIHx8ICF6KSA/IC0wLjUgOiB6O1xuXG4gICAgICAvLyBpZiB0aGUgc291bmQgaGFzbid0IGJlZW4gbG9hZGVkLCBhZGQgaXQgdG8gdGhlIGV2ZW50IHF1ZXVlXG4gICAgICBpZiAoIXNlbGYuX2xvYWRlZCkge1xuICAgICAgICBzZWxmLm9uKCdwbGF5JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2VsZi5wb3MzZCh4LCB5LCB6LCBpZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgfVxuXG4gICAgICBpZiAoeCA+PSAwIHx8IHggPCAwKSB7XG4gICAgICAgIGlmIChzZWxmLl93ZWJBdWRpbykge1xuICAgICAgICAgIHZhciBhY3RpdmVOb2RlID0gKGlkKSA/IHNlbGYuX25vZGVCeUlkKGlkKSA6IHNlbGYuX2FjdGl2ZU5vZGUoKTtcbiAgICAgICAgICBpZiAoYWN0aXZlTm9kZSkge1xuICAgICAgICAgICAgc2VsZi5fcG9zM2QgPSBbeCwgeSwgel07XG4gICAgICAgICAgICBhY3RpdmVOb2RlLnBhbm5lci5zZXRQb3NpdGlvbih4LCB5LCB6KTtcbiAgICAgICAgICAgIGFjdGl2ZU5vZGUucGFubmVyLnBhbm5pbmdNb2RlbCA9IHNlbGYuX21vZGVsIHx8ICdIUlRGJztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBzZWxmLl9wb3MzZDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZhZGUgYSBjdXJyZW50bHkgcGxheWluZyBzb3VuZCBiZXR3ZWVuIHR3byB2b2x1bWVzLlxuICAgICAqIEBwYXJhbSAge051bWJlcn0gICBmcm9tICAgICBUaGUgdm9sdW1lIHRvIGZhZGUgZnJvbSAoMC4wIHRvIDEuMCkuXG4gICAgICogQHBhcmFtICB7TnVtYmVyfSAgIHRvICAgICAgIFRoZSB2b2x1bWUgdG8gZmFkZSB0byAoMC4wIHRvIDEuMCkuXG4gICAgICogQHBhcmFtICB7TnVtYmVyfSAgIGxlbiAgICAgIFRpbWUgaW4gbWlsbGlzZWNvbmRzIHRvIGZhZGUuXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIChvcHRpb25hbCkgRmlyZWQgd2hlbiB0aGUgZmFkZSBpcyBjb21wbGV0ZS5cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9ICAgaWQgICAgICAgKG9wdGlvbmFsKSBUaGUgcGxheSBpbnN0YW5jZSBJRC5cbiAgICAgKiBAcmV0dXJuIHtIb3dsfVxuICAgICAqL1xuICAgIGZhZGU6IGZ1bmN0aW9uKGZyb20sIHRvLCBsZW4sIGNhbGxiYWNrLCBpZCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICBkaWZmID0gTWF0aC5hYnMoZnJvbSAtIHRvKSxcbiAgICAgICAgZGlyID0gZnJvbSA+IHRvID8gJ2Rvd24nIDogJ3VwJyxcbiAgICAgICAgc3RlcHMgPSBkaWZmIC8gMC4wMSxcbiAgICAgICAgc3RlcFRpbWUgPSBsZW4gLyBzdGVwcztcblxuICAgICAgLy8gaWYgdGhlIHNvdW5kIGhhc24ndCBiZWVuIGxvYWRlZCwgYWRkIGl0IHRvIHRoZSBldmVudCBxdWV1ZVxuICAgICAgaWYgKCFzZWxmLl9sb2FkZWQpIHtcbiAgICAgICAgc2VsZi5vbignbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNlbGYuZmFkZShmcm9tLCB0bywgbGVuLCBjYWxsYmFjaywgaWQpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgIH1cblxuICAgICAgLy8gc2V0IHRoZSB2b2x1bWUgdG8gdGhlIHN0YXJ0IHBvc2l0aW9uXG4gICAgICBzZWxmLnZvbHVtZShmcm9tLCBpZCk7XG5cbiAgICAgIGZvciAodmFyIGk9MTsgaTw9c3RlcHM7IGkrKykge1xuICAgICAgICAoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGNoYW5nZSA9IHNlbGYuX3ZvbHVtZSArIChkaXIgPT09ICd1cCcgPyAwLjAxIDogLTAuMDEpICogaSxcbiAgICAgICAgICAgIHZvbCA9IE1hdGgucm91bmQoMTAwMCAqIGNoYW5nZSkgLyAxMDAwLFxuICAgICAgICAgICAgdG9Wb2wgPSB0bztcblxuICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzZWxmLnZvbHVtZSh2b2wsIGlkKTtcblxuICAgICAgICAgICAgaWYgKHZvbCA9PT0gdG9Wb2wpIHtcbiAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIHN0ZXBUaW1lICogaSk7XG4gICAgICAgIH0pKCk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFtERVBSRUNBVEVEXSBGYWRlIGluIHRoZSBjdXJyZW50IHNvdW5kLlxuICAgICAqIEBwYXJhbSAge0Zsb2F0fSAgICB0byAgICAgIFZvbHVtZSB0byBmYWRlIHRvICgwLjAgdG8gMS4wKS5cbiAgICAgKiBAcGFyYW0gIHtOdW1iZXJ9ICAgbGVuICAgICBUaW1lIGluIG1pbGxpc2Vjb25kcyB0byBmYWRlLlxuICAgICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqIEByZXR1cm4ge0hvd2x9XG4gICAgICovXG4gICAgZmFkZUluOiBmdW5jdGlvbih0bywgbGVuLCBjYWxsYmFjaykge1xuICAgICAgcmV0dXJuIHRoaXMudm9sdW1lKDApLnBsYXkoKS5mYWRlKDAsIHRvLCBsZW4sIGNhbGxiYWNrKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogW0RFUFJFQ0FURURdIEZhZGUgb3V0IHRoZSBjdXJyZW50IHNvdW5kIGFuZCBwYXVzZSB3aGVuIGZpbmlzaGVkLlxuICAgICAqIEBwYXJhbSAge0Zsb2F0fSAgICB0byAgICAgICBWb2x1bWUgdG8gZmFkZSB0byAoMC4wIHRvIDEuMCkuXG4gICAgICogQHBhcmFtICB7TnVtYmVyfSAgIGxlbiAgICAgIFRpbWUgaW4gbWlsbGlzZWNvbmRzIHRvIGZhZGUuXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSAgIGlkICAgICAgIChvcHRpb25hbCkgVGhlIHBsYXkgaW5zdGFuY2UgSUQuXG4gICAgICogQHJldHVybiB7SG93bH1cbiAgICAgKi9cbiAgICBmYWRlT3V0OiBmdW5jdGlvbih0bywgbGVuLCBjYWxsYmFjaywgaWQpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgcmV0dXJuIHNlbGYuZmFkZShzZWxmLl92b2x1bWUsIHRvLCBsZW4sIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKCk7XG4gICAgICAgIHNlbGYucGF1c2UoaWQpO1xuXG4gICAgICAgIC8vIGZpcmUgZW5kZWQgZXZlbnRcbiAgICAgICAgc2VsZi5vbignZW5kJyk7XG4gICAgICB9LCBpZCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBhbiBhdWRpbyBub2RlIGJ5IElELlxuICAgICAqIEByZXR1cm4ge0hvd2x9IEF1ZGlvIG5vZGUuXG4gICAgICovXG4gICAgX25vZGVCeUlkOiBmdW5jdGlvbihpZCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICBub2RlID0gc2VsZi5fYXVkaW9Ob2RlWzBdO1xuXG4gICAgICAvLyBmaW5kIHRoZSBub2RlIHdpdGggdGhpcyBJRFxuICAgICAgZm9yICh2YXIgaT0wOyBpPHNlbGYuX2F1ZGlvTm9kZS5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoc2VsZi5fYXVkaW9Ob2RlW2ldLmlkID09PSBpZCkge1xuICAgICAgICAgIG5vZGUgPSBzZWxmLl9hdWRpb05vZGVbaV07XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgZmlyc3QgYWN0aXZlIGF1ZGlvIG5vZGUuXG4gICAgICogQHJldHVybiB7SG93bH0gQXVkaW8gbm9kZS5cbiAgICAgKi9cbiAgICBfYWN0aXZlTm9kZTogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgIG5vZGUgPSBudWxsO1xuXG4gICAgICAvLyBmaW5kIHRoZSBmaXJzdCBwbGF5aW5nIG5vZGVcbiAgICAgIGZvciAodmFyIGk9MDsgaTxzZWxmLl9hdWRpb05vZGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKCFzZWxmLl9hdWRpb05vZGVbaV0ucGF1c2VkKSB7XG4gICAgICAgICAgbm9kZSA9IHNlbGYuX2F1ZGlvTm9kZVtpXTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyByZW1vdmUgZXhjZXNzIGluYWN0aXZlIG5vZGVzXG4gICAgICBzZWxmLl9kcmFpblBvb2woKTtcblxuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgZmlyc3QgaW5hY3RpdmUgYXVkaW8gbm9kZS5cbiAgICAgKiBJZiB0aGVyZSBpcyBub25lLCBjcmVhdGUgYSBuZXcgb25lIGFuZCBhZGQgaXQgdG8gdGhlIHBvb2wuXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgYXVkaW8gbm9kZSBpcyByZWFkeS5cbiAgICAgKi9cbiAgICBfaW5hY3RpdmVOb2RlOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICBub2RlID0gbnVsbDtcblxuICAgICAgLy8gZmluZCBmaXJzdCBpbmFjdGl2ZSBub2RlIHRvIHJlY3ljbGVcbiAgICAgIGZvciAodmFyIGk9MDsgaTxzZWxmLl9hdWRpb05vZGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHNlbGYuX2F1ZGlvTm9kZVtpXS5wYXVzZWQgJiYgc2VsZi5fYXVkaW9Ob2RlW2ldLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAvLyBzZW5kIHRoZSBub2RlIGJhY2sgZm9yIHVzZSBieSB0aGUgbmV3IHBsYXkgaW5zdGFuY2VcbiAgICAgICAgICBjYWxsYmFjayhzZWxmLl9hdWRpb05vZGVbaV0pO1xuICAgICAgICAgIG5vZGUgPSB0cnVlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHJlbW92ZSBleGNlc3MgaW5hY3RpdmUgbm9kZXNcbiAgICAgIHNlbGYuX2RyYWluUG9vbCgpO1xuXG4gICAgICBpZiAobm9kZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGNyZWF0ZSBuZXcgbm9kZSBpZiB0aGVyZSBhcmUgbm8gaW5hY3RpdmVzXG4gICAgICB2YXIgbmV3Tm9kZTtcbiAgICAgIGlmIChzZWxmLl93ZWJBdWRpbykge1xuICAgICAgICBuZXdOb2RlID0gc2VsZi5fc2V0dXBBdWRpb05vZGUoKTtcbiAgICAgICAgY2FsbGJhY2sobmV3Tm9kZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxmLmxvYWQoKTtcbiAgICAgICAgbmV3Tm9kZSA9IHNlbGYuX2F1ZGlvTm9kZVtzZWxmLl9hdWRpb05vZGUubGVuZ3RoIC0gMV07XG5cbiAgICAgICAgLy8gbGlzdGVuIGZvciB0aGUgY29ycmVjdCBsb2FkIGV2ZW50IGFuZCBmaXJlIHRoZSBjYWxsYmFja1xuICAgICAgICB2YXIgbGlzdGVuZXJFdmVudCA9IG5hdmlnYXRvci5pc0NvY29vbkpTID8gJ2NhbnBsYXl0aHJvdWdoJyA6ICdsb2FkZWRtZXRhZGF0YSc7XG4gICAgICAgIHZhciBsaXN0ZW5lciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG5ld05vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihsaXN0ZW5lckV2ZW50LCBsaXN0ZW5lciwgZmFsc2UpO1xuICAgICAgICAgIGNhbGxiYWNrKG5ld05vZGUpO1xuICAgICAgICB9O1xuICAgICAgICBuZXdOb2RlLmFkZEV2ZW50TGlzdGVuZXIobGlzdGVuZXJFdmVudCwgbGlzdGVuZXIsIGZhbHNlKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSWYgdGhlcmUgYXJlIG1vcmUgdGhhbiA1IGluYWN0aXZlIGF1ZGlvIG5vZGVzIGluIHRoZSBwb29sLCBjbGVhciBvdXQgdGhlIHJlc3QuXG4gICAgICovXG4gICAgX2RyYWluUG9vbDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgIGluYWN0aXZlID0gMCxcbiAgICAgICAgaTtcblxuICAgICAgLy8gY291bnQgdGhlIG51bWJlciBvZiBpbmFjdGl2ZSBub2Rlc1xuICAgICAgZm9yIChpPTA7IGk8c2VsZi5fYXVkaW9Ob2RlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChzZWxmLl9hdWRpb05vZGVbaV0ucGF1c2VkKSB7XG4gICAgICAgICAgaW5hY3RpdmUrKztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyByZW1vdmUgZXhjZXNzIGluYWN0aXZlIG5vZGVzXG4gICAgICBmb3IgKGk9c2VsZi5fYXVkaW9Ob2RlLmxlbmd0aC0xOyBpPj0wOyBpLS0pIHtcbiAgICAgICAgaWYgKGluYWN0aXZlIDw9IDUpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzZWxmLl9hdWRpb05vZGVbaV0ucGF1c2VkKSB7XG4gICAgICAgICAgLy8gZGlzY29ubmVjdCB0aGUgYXVkaW8gc291cmNlIGlmIHVzaW5nIFdlYiBBdWRpb1xuICAgICAgICAgIGlmIChzZWxmLl93ZWJBdWRpbykge1xuICAgICAgICAgICAgc2VsZi5fYXVkaW9Ob2RlW2ldLmRpc2Nvbm5lY3QoMCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaW5hY3RpdmUtLTtcbiAgICAgICAgICBzZWxmLl9hdWRpb05vZGUuc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFyICdvbmVuZCcgdGltZW91dCBiZWZvcmUgaXQgZW5kcy5cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IHNvdW5kSWQgIFRoZSBwbGF5IGluc3RhbmNlIElELlxuICAgICAqL1xuICAgIF9jbGVhckVuZFRpbWVyOiBmdW5jdGlvbihzb3VuZElkKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgIGluZGV4ID0gLTE7XG5cbiAgICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgdGltZXJzIHRvIGZpbmQgdGhlIG9uZSBhc3NvY2lhdGVkIHdpdGggdGhpcyBzb3VuZFxuICAgICAgZm9yICh2YXIgaT0wOyBpPHNlbGYuX29uZW5kVGltZXIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHNlbGYuX29uZW5kVGltZXJbaV0uaWQgPT09IHNvdW5kSWQpIHtcbiAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIHRpbWVyID0gc2VsZi5fb25lbmRUaW1lcltpbmRleF07XG4gICAgICBpZiAodGltZXIpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyLnRpbWVyKTtcbiAgICAgICAgc2VsZi5fb25lbmRUaW1lci5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXR1cCB0aGUgZ2FpbiBub2RlIGFuZCBwYW5uZXIgZm9yIGEgV2ViIEF1ZGlvIGluc3RhbmNlLlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gVGhlIG5ldyBhdWRpbyBub2RlLlxuICAgICAqL1xuICAgIF9zZXR1cEF1ZGlvTm9kZTogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgIG5vZGUgPSBzZWxmLl9hdWRpb05vZGUsXG4gICAgICAgIGluZGV4ID0gc2VsZi5fYXVkaW9Ob2RlLmxlbmd0aDtcblxuICAgICAgLy8gY3JlYXRlIGdhaW4gbm9kZVxuICAgICAgbm9kZVtpbmRleF0gPSAodHlwZW9mIGN0eC5jcmVhdGVHYWluID09PSAndW5kZWZpbmVkJykgPyBjdHguY3JlYXRlR2Fpbk5vZGUoKSA6IGN0eC5jcmVhdGVHYWluKCk7XG4gICAgICBub2RlW2luZGV4XS5nYWluLnZhbHVlID0gc2VsZi5fdm9sdW1lO1xuICAgICAgbm9kZVtpbmRleF0ucGF1c2VkID0gdHJ1ZTtcbiAgICAgIG5vZGVbaW5kZXhdLl9wb3MgPSAwO1xuICAgICAgbm9kZVtpbmRleF0ucmVhZHlTdGF0ZSA9IDQ7XG4gICAgICBub2RlW2luZGV4XS5jb25uZWN0KG1hc3RlckdhaW4pO1xuXG4gICAgICAvLyBjcmVhdGUgdGhlIHBhbm5lclxuICAgICAgbm9kZVtpbmRleF0ucGFubmVyID0gY3R4LmNyZWF0ZVBhbm5lcigpO1xuICAgICAgbm9kZVtpbmRleF0ucGFubmVyLnBhbm5pbmdNb2RlbCA9IHNlbGYuX21vZGVsIHx8ICdlcXVhbHBvd2VyJztcbiAgICAgIG5vZGVbaW5kZXhdLnBhbm5lci5zZXRQb3NpdGlvbihzZWxmLl9wb3MzZFswXSwgc2VsZi5fcG9zM2RbMV0sIHNlbGYuX3BvczNkWzJdKTtcbiAgICAgIG5vZGVbaW5kZXhdLnBhbm5lci5jb25uZWN0KG5vZGVbaW5kZXhdKTtcblxuICAgICAgcmV0dXJuIG5vZGVbaW5kZXhdO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsL3NldCBjdXN0b20gZXZlbnRzLlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gICBldmVudCBFdmVudCB0eXBlLlxuICAgICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiAgICBGdW5jdGlvbiB0byBjYWxsLlxuICAgICAqIEByZXR1cm4ge0hvd2x9XG4gICAgICovXG4gICAgb246IGZ1bmN0aW9uKGV2ZW50LCBmbikge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICBldmVudHMgPSBzZWxmWydfb24nICsgZXZlbnRdO1xuXG4gICAgICBpZiAodHlwZW9mIGZuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGV2ZW50cy5wdXNoKGZuKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxldmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoZm4pIHtcbiAgICAgICAgICAgIGV2ZW50c1tpXS5jYWxsKHNlbGYsIGZuKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXZlbnRzW2ldLmNhbGwoc2VsZik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZWxmO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmUgYSBjdXN0b20gZXZlbnQuXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSAgIGV2ZW50IEV2ZW50IHR5cGUuXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuICAgIExpc3RlbmVyIHRvIHJlbW92ZS5cbiAgICAgKiBAcmV0dXJuIHtIb3dsfVxuICAgICAqL1xuICAgIG9mZjogZnVuY3Rpb24oZXZlbnQsIGZuKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgIGV2ZW50cyA9IHNlbGZbJ19vbicgKyBldmVudF07XG5cbiAgICAgIGlmIChmbikge1xuICAgICAgICAvLyBsb29wIHRocm91Z2ggZnVuY3Rpb25zIGluIHRoZSBldmVudCBmb3IgY29tcGFyaXNvblxuICAgICAgICBmb3IgKHZhciBpPTA7IGk8ZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKGZuID09PSBldmVudHNbaV0pIHtcbiAgICAgICAgICAgIGV2ZW50cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGZbJ19vbicgKyBldmVudF0gPSBbXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVubG9hZCBhbmQgZGVzdHJveSB0aGUgY3VycmVudCBIb3dsIG9iamVjdC5cbiAgICAgKiBUaGlzIHdpbGwgaW1tZWRpYXRlbHkgc3RvcCBhbGwgcGxheSBpbnN0YW5jZXMgYXR0YWNoZWQgdG8gdGhpcyBzb3VuZC5cbiAgICAgKi9cbiAgICB1bmxvYWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAvLyBzdG9wIHBsYXlpbmcgYW55IGFjdGl2ZSBub2Rlc1xuICAgICAgdmFyIG5vZGVzID0gc2VsZi5fYXVkaW9Ob2RlO1xuICAgICAgZm9yICh2YXIgaT0wOyBpPHNlbGYuX2F1ZGlvTm9kZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAvLyBzdG9wIHRoZSBzb3VuZCBpZiBpdCBpcyBjdXJyZW50bHkgcGxheWluZ1xuICAgICAgICBpZiAoIW5vZGVzW2ldLnBhdXNlZCkge1xuICAgICAgICAgIHNlbGYuc3RvcChub2Rlc1tpXS5pZCk7XG4gICAgICAgICAgc2VsZi5vbignZW5kJywgbm9kZXNbaV0uaWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFzZWxmLl93ZWJBdWRpbykge1xuICAgICAgICAgIC8vIHJlbW92ZSB0aGUgc291cmNlIGlmIHVzaW5nIEhUTUw1IEF1ZGlvXG4gICAgICAgICAgbm9kZXNbaV0uc3JjID0gJyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gZGlzY29ubmVjdCB0aGUgb3V0cHV0IGZyb20gdGhlIG1hc3RlciBnYWluXG4gICAgICAgICAgbm9kZXNbaV0uZGlzY29ubmVjdCgwKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBtYWtlIHN1cmUgYWxsIHRpbWVvdXRzIGFyZSBjbGVhcmVkXG4gICAgICBmb3IgKGk9MDsgaTxzZWxmLl9vbmVuZFRpbWVyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChzZWxmLl9vbmVuZFRpbWVyW2ldLnRpbWVyKTtcbiAgICAgIH1cblxuICAgICAgLy8gcmVtb3ZlIHRoZSByZWZlcmVuY2UgaW4gdGhlIGdsb2JhbCBIb3dsZXIgb2JqZWN0XG4gICAgICB2YXIgaW5kZXggPSBIb3dsZXIuX2hvd2xzLmluZGV4T2Yoc2VsZik7XG4gICAgICBpZiAoaW5kZXggIT09IG51bGwgJiYgaW5kZXggPj0gMCkge1xuICAgICAgICBIb3dsZXIuX2hvd2xzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICB9XG5cbiAgICAgIC8vIGRlbGV0ZSB0aGlzIHNvdW5kIGZyb20gdGhlIGNhY2hlXG4gICAgICBkZWxldGUgY2FjaGVbc2VsZi5fc3JjXTtcbiAgICAgIHNlbGYgPSBudWxsO1xuICAgIH1cblxuICB9O1xuXG4gIC8vIG9ubHkgZGVmaW5lIHRoZXNlIGZ1bmN0aW9ucyB3aGVuIHVzaW5nIFdlYkF1ZGlvXG4gIGlmICh1c2luZ1dlYkF1ZGlvKSB7XG5cbiAgICAvKipcbiAgICAgKiBCdWZmZXIgYSBzb3VuZCBmcm9tIFVSTCAob3IgZnJvbSBjYWNoZSkgYW5kIGRlY29kZSB0byBhdWRpbyBzb3VyY2UgKFdlYiBBdWRpbyBBUEkpLlxuICAgICAqIEBwYXJhbSAge09iamVjdH0gb2JqIFRoZSBIb3dsIG9iamVjdCBmb3IgdGhlIHNvdW5kIHRvIGxvYWQuXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSB1cmwgVGhlIHBhdGggdG8gdGhlIHNvdW5kIGZpbGUuXG4gICAgICovXG4gICAgdmFyIGxvYWRCdWZmZXIgPSBmdW5jdGlvbihvYmosIHVybCkge1xuICAgICAgLy8gY2hlY2sgaWYgdGhlIGJ1ZmZlciBoYXMgYWxyZWFkeSBiZWVuIGNhY2hlZFxuICAgICAgaWYgKHVybCBpbiBjYWNoZSkge1xuICAgICAgICAvLyBzZXQgdGhlIGR1cmF0aW9uIGZyb20gdGhlIGNhY2hlXG4gICAgICAgIG9iai5fZHVyYXRpb24gPSBjYWNoZVt1cmxdLmR1cmF0aW9uO1xuXG4gICAgICAgIC8vIGxvYWQgdGhlIHNvdW5kIGludG8gdGhpcyBvYmplY3RcbiAgICAgICAgbG9hZFNvdW5kKG9iaik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKC9eZGF0YTpbXjtdKztiYXNlNjQsLy50ZXN0KHVybCkpIHtcbiAgICAgICAgLy8gRGVjb2RlIGJhc2U2NCBkYXRhLVVSSXMgYmVjYXVzZSBzb21lIGJyb3dzZXJzIGNhbm5vdCBsb2FkIGRhdGEtVVJJcyB3aXRoIFhNTEh0dHBSZXF1ZXN0LlxuICAgICAgICB2YXIgZGF0YSA9IGF0b2IodXJsLnNwbGl0KCcsJylbMV0pO1xuICAgICAgICB2YXIgZGF0YVZpZXcgPSBuZXcgVWludDhBcnJheShkYXRhLmxlbmd0aCk7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxkYXRhLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgZGF0YVZpZXdbaV0gPSBkYXRhLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGRlY29kZUF1ZGlvRGF0YShkYXRhVmlldy5idWZmZXIsIG9iaiwgdXJsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGxvYWQgdGhlIGJ1ZmZlciBmcm9tIHRoZSBVUkxcbiAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICB4aHIub3BlbignR0VUJywgdXJsLCB0cnVlKTtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBkZWNvZGVBdWRpb0RhdGEoeGhyLnJlc3BvbnNlLCBvYmosIHVybCk7XG4gICAgICAgIH07XG4gICAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgLy8gaWYgdGhlcmUgaXMgYW4gZXJyb3IsIHN3aXRjaCB0aGUgc291bmQgdG8gSFRNTCBBdWRpb1xuICAgICAgICAgIGlmIChvYmouX3dlYkF1ZGlvKSB7XG4gICAgICAgICAgICBvYmouX2J1ZmZlciA9IHRydWU7XG4gICAgICAgICAgICBvYmouX3dlYkF1ZGlvID0gZmFsc2U7XG4gICAgICAgICAgICBvYmouX2F1ZGlvTm9kZSA9IFtdO1xuICAgICAgICAgICAgZGVsZXRlIG9iai5fZ2Fpbk5vZGU7XG4gICAgICAgICAgICBkZWxldGUgY2FjaGVbdXJsXTtcbiAgICAgICAgICAgIG9iai5sb2FkKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHhoci5zZW5kKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICB4aHIub25lcnJvcigpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERlY29kZSBhdWRpbyBkYXRhIGZyb20gYW4gYXJyYXkgYnVmZmVyLlxuICAgICAqIEBwYXJhbSAge0FycmF5QnVmZmVyfSBhcnJheWJ1ZmZlciBUaGUgYXVkaW8gZGF0YS5cbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IG9iaiBUaGUgSG93bCBvYmplY3QgZm9yIHRoZSBzb3VuZCB0byBsb2FkLlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gdXJsIFRoZSBwYXRoIHRvIHRoZSBzb3VuZCBmaWxlLlxuICAgICAqL1xuICAgIHZhciBkZWNvZGVBdWRpb0RhdGEgPSBmdW5jdGlvbihhcnJheWJ1ZmZlciwgb2JqLCB1cmwpIHtcbiAgICAgIC8vIGRlY29kZSB0aGUgYnVmZmVyIGludG8gYW4gYXVkaW8gc291cmNlXG4gICAgICBjdHguZGVjb2RlQXVkaW9EYXRhKFxuICAgICAgICBhcnJheWJ1ZmZlcixcbiAgICAgICAgZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICAgICAgaWYgKGJ1ZmZlcikge1xuICAgICAgICAgICAgY2FjaGVbdXJsXSA9IGJ1ZmZlcjtcbiAgICAgICAgICAgIGxvYWRTb3VuZChvYmosIGJ1ZmZlcik7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICBvYmoub24oJ2xvYWRlcnJvcicsIGVycik7XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEZpbmlzaGVzIGxvYWRpbmcgdGhlIFdlYiBBdWRpbyBBUEkgc291bmQgYW5kIGZpcmVzIHRoZSBsb2FkZWQgZXZlbnRcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9ICBvYmogICAgVGhlIEhvd2wgb2JqZWN0IGZvciB0aGUgc291bmQgdG8gbG9hZC5cbiAgICAgKiBAcGFyYW0gIHtPYmplY2N0fSBidWZmZXIgVGhlIGRlY29kZWQgYnVmZmVyIHNvdW5kIHNvdXJjZS5cbiAgICAgKi9cbiAgICB2YXIgbG9hZFNvdW5kID0gZnVuY3Rpb24ob2JqLCBidWZmZXIpIHtcbiAgICAgIC8vIHNldCB0aGUgZHVyYXRpb25cbiAgICAgIG9iai5fZHVyYXRpb24gPSAoYnVmZmVyKSA/IGJ1ZmZlci5kdXJhdGlvbiA6IG9iai5fZHVyYXRpb247XG5cbiAgICAgIC8vIHNldHVwIGEgc3ByaXRlIGlmIG5vbmUgaXMgZGVmaW5lZFxuICAgICAgaWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9iai5fc3ByaXRlKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgb2JqLl9zcHJpdGUgPSB7X2RlZmF1bHQ6IFswLCBvYmouX2R1cmF0aW9uICogMTAwMF19O1xuICAgICAgfVxuXG4gICAgICAvLyBmaXJlIHRoZSBsb2FkZWQgZXZlbnRcbiAgICAgIGlmICghb2JqLl9sb2FkZWQpIHtcbiAgICAgICAgb2JqLl9sb2FkZWQgPSB0cnVlO1xuICAgICAgICBvYmoub24oJ2xvYWQnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9iai5fYXV0b3BsYXkpIHtcbiAgICAgICAgb2JqLnBsYXkoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogTG9hZCB0aGUgc291bmQgYmFjayBpbnRvIHRoZSBidWZmZXIgc291cmNlLlxuICAgICAqIEBwYXJhbSAge09iamVjdH0gb2JqICAgVGhlIHNvdW5kIHRvIGxvYWQuXG4gICAgICogQHBhcmFtICB7QXJyYXl9ICBsb29wICBMb29wIGJvb2xlYW4sIHBvcywgYW5kIGR1cmF0aW9uLlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gaWQgICAgKG9wdGlvbmFsKSBUaGUgcGxheSBpbnN0YW5jZSBJRC5cbiAgICAgKi9cbiAgICB2YXIgcmVmcmVzaEJ1ZmZlciA9IGZ1bmN0aW9uKG9iaiwgbG9vcCwgaWQpIHtcbiAgICAgIC8vIGRldGVybWluZSB3aGljaCBub2RlIHRvIGNvbm5lY3QgdG9cbiAgICAgIHZhciBub2RlID0gb2JqLl9ub2RlQnlJZChpZCk7XG5cbiAgICAgIC8vIHNldHVwIHRoZSBidWZmZXIgc291cmNlIGZvciBwbGF5YmFja1xuICAgICAgbm9kZS5idWZmZXJTb3VyY2UgPSBjdHguY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgICBub2RlLmJ1ZmZlclNvdXJjZS5idWZmZXIgPSBjYWNoZVtvYmouX3NyY107XG4gICAgICBub2RlLmJ1ZmZlclNvdXJjZS5jb25uZWN0KG5vZGUucGFubmVyKTtcbiAgICAgIG5vZGUuYnVmZmVyU291cmNlLmxvb3AgPSBsb29wWzBdO1xuICAgICAgaWYgKGxvb3BbMF0pIHtcbiAgICAgICAgbm9kZS5idWZmZXJTb3VyY2UubG9vcFN0YXJ0ID0gbG9vcFsxXTtcbiAgICAgICAgbm9kZS5idWZmZXJTb3VyY2UubG9vcEVuZCA9IGxvb3BbMV0gKyBsb29wWzJdO1xuICAgICAgfVxuICAgICAgbm9kZS5idWZmZXJTb3VyY2UucGxheWJhY2tSYXRlLnZhbHVlID0gb2JqLl9yYXRlO1xuICAgIH07XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgc3VwcG9ydCBmb3IgQU1EIChBc3luY2hyb25vdXMgTW9kdWxlIERlZmluaXRpb24pIGxpYnJhcmllcyBzdWNoIGFzIHJlcXVpcmUuanMuXG4gICAqL1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgSG93bGVyOiBIb3dsZXIsXG4gICAgICAgIEhvd2w6IEhvd2xcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIHN1cHBvcnQgZm9yIENvbW1vbkpTIGxpYnJhcmllcyBzdWNoIGFzIGJyb3dzZXJpZnkuXG4gICAqL1xuICBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgZXhwb3J0cy5Ib3dsZXIgPSBIb3dsZXI7XG4gICAgZXhwb3J0cy5Ib3dsID0gSG93bDtcbiAgfVxuXG4gIC8vIGRlZmluZSBnbG9iYWxseSBpbiBjYXNlIEFNRCBpcyBub3QgYXZhaWxhYmxlIG9yIGF2YWlsYWJsZSBidXQgbm90IHVzZWRcblxuICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB3aW5kb3cuSG93bGVyID0gSG93bGVyO1xuICAgIHdpbmRvdy5Ib3dsID0gSG93bDtcbiAgfVxuXG59KSgpOyJdLCJmaWxlIjoidmVuZG9yL2hvd2xlci5qcyJ9
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJ2ZW5kb3IvaG93bGVyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICogIGhvd2xlci5qcyB2MS4xLjI5XG4gKiAgaG93bGVyanMuY29tXG4gKlxuICogIChjKSAyMDEzLTIwMTYsIEphbWVzIFNpbXBzb24gb2YgR29sZEZpcmUgU3R1ZGlvc1xuICogIGdvbGRmaXJlc3R1ZGlvcy5jb21cbiAqXG4gKiAgTUlUIExpY2Vuc2VcbiAqL1xuXG4oZnVuY3Rpb24oKSB7XG4gIC8vIHNldHVwXG4gIHZhciBjYWNoZSA9IHt9O1xuXG4gIC8vIHNldHVwIHRoZSBhdWRpbyBjb250ZXh0XG4gIHZhciBjdHggPSBudWxsLFxuICAgIHVzaW5nV2ViQXVkaW8gPSB0cnVlLFxuICAgIG5vQXVkaW8gPSBmYWxzZTtcbiAgdHJ5IHtcbiAgICBpZiAodHlwZW9mIEF1ZGlvQ29udGV4dCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGN0eCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB3ZWJraXRBdWRpb0NvbnRleHQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBjdHggPSBuZXcgd2Via2l0QXVkaW9Db250ZXh0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHVzaW5nV2ViQXVkaW8gPSBmYWxzZTtcbiAgICB9XG4gIH0gY2F0Y2goZSkge1xuICAgIHVzaW5nV2ViQXVkaW8gPSBmYWxzZTtcbiAgfVxuXG4gIGlmICghdXNpbmdXZWJBdWRpbykge1xuICAgIGlmICh0eXBlb2YgQXVkaW8gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0cnkge1xuICAgICAgICBuZXcgQXVkaW8oKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICBub0F1ZGlvID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbm9BdWRpbyA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgLy8gY3JlYXRlIGEgbWFzdGVyIGdhaW4gbm9kZVxuICBpZiAodXNpbmdXZWJBdWRpbykge1xuICAgIHZhciBtYXN0ZXJHYWluID0gKHR5cGVvZiBjdHguY3JlYXRlR2FpbiA9PT0gJ3VuZGVmaW5lZCcpID8gY3R4LmNyZWF0ZUdhaW5Ob2RlKCkgOiBjdHguY3JlYXRlR2FpbigpO1xuICAgIG1hc3RlckdhaW4uZ2Fpbi52YWx1ZSA9IDE7XG4gICAgbWFzdGVyR2Fpbi5jb25uZWN0KGN0eC5kZXN0aW5hdGlvbik7XG4gIH1cblxuICAvLyBjcmVhdGUgZ2xvYmFsIGNvbnRyb2xsZXJcbiAgdmFyIEhvd2xlckdsb2JhbCA9IGZ1bmN0aW9uKGNvZGVjcykge1xuICAgIHRoaXMuX3ZvbHVtZSA9IDE7XG4gICAgdGhpcy5fbXV0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLnVzaW5nV2ViQXVkaW8gPSB1c2luZ1dlYkF1ZGlvO1xuICAgIHRoaXMuY3R4ID0gY3R4O1xuICAgIHRoaXMubm9BdWRpbyA9IG5vQXVkaW87XG4gICAgdGhpcy5faG93bHMgPSBbXTtcbiAgICB0aGlzLl9jb2RlY3MgPSBjb2RlY3M7XG4gICAgdGhpcy5pT1NBdXRvRW5hYmxlID0gdHJ1ZTtcbiAgfTtcbiAgSG93bGVyR2xvYmFsLnByb3RvdHlwZSA9IHtcbiAgICAvKipcbiAgICAgKiBHZXQvc2V0IHRoZSBnbG9iYWwgdm9sdW1lIGZvciBhbGwgc291bmRzLlxuICAgICAqIEBwYXJhbSAge0Zsb2F0fSB2b2wgVm9sdW1lIGZyb20gMC4wIHRvIDEuMC5cbiAgICAgKiBAcmV0dXJuIHtIb3dsZXIvRmxvYXR9ICAgICBSZXR1cm5zIHNlbGYgb3IgY3VycmVudCB2b2x1bWUuXG4gICAgICovXG4gICAgdm9sdW1lOiBmdW5jdGlvbih2b2wpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgLy8gbWFrZSBzdXJlIHZvbHVtZSBpcyBhIG51bWJlclxuICAgICAgdm9sID0gcGFyc2VGbG9hdCh2b2wpO1xuXG4gICAgICBpZiAodm9sID49IDAgJiYgdm9sIDw9IDEpIHtcbiAgICAgICAgc2VsZi5fdm9sdW1lID0gdm9sO1xuXG4gICAgICAgIGlmICh1c2luZ1dlYkF1ZGlvKSB7XG4gICAgICAgICAgbWFzdGVyR2Fpbi5nYWluLnZhbHVlID0gdm9sO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbG9vcCB0aHJvdWdoIGNhY2hlIGFuZCBjaGFuZ2Ugdm9sdW1lIG9mIGFsbCBub2RlcyB0aGF0IGFyZSB1c2luZyBIVE1MNSBBdWRpb1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc2VsZi5faG93bHMpIHtcbiAgICAgICAgICBpZiAoc2VsZi5faG93bHMuaGFzT3duUHJvcGVydHkoa2V5KSAmJiBzZWxmLl9ob3dsc1trZXldLl93ZWJBdWRpbyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgYXVkaW8gbm9kZXNcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxzZWxmLl9ob3dsc1trZXldLl9hdWRpb05vZGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgc2VsZi5faG93bHNba2V5XS5fYXVkaW9Ob2RlW2ldLnZvbHVtZSA9IHNlbGYuX2hvd2xzW2tleV0uX3ZvbHVtZSAqIHNlbGYuX3ZvbHVtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgIH1cblxuICAgICAgLy8gcmV0dXJuIHRoZSBjdXJyZW50IGdsb2JhbCB2b2x1bWVcbiAgICAgIHJldHVybiAodXNpbmdXZWJBdWRpbykgPyBtYXN0ZXJHYWluLmdhaW4udmFsdWUgOiBzZWxmLl92b2x1bWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE11dGUgYWxsIHNvdW5kcy5cbiAgICAgKiBAcmV0dXJuIHtIb3dsZXJ9XG4gICAgICovXG4gICAgbXV0ZTogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9zZXRNdXRlZCh0cnVlKTtcblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVubXV0ZSBhbGwgc291bmRzLlxuICAgICAqIEByZXR1cm4ge0hvd2xlcn1cbiAgICAgKi9cbiAgICB1bm11dGU6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fc2V0TXV0ZWQoZmFsc2UpO1xuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIG11dGluZyBhbmQgdW5tdXRpbmcgZ2xvYmFsbHkuXG4gICAgICogQHBhcmFtICB7Qm9vbGVhbn0gbXV0ZWQgSXMgbXV0ZWQgb3Igbm90LlxuICAgICAqL1xuICAgIF9zZXRNdXRlZDogZnVuY3Rpb24obXV0ZWQpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgc2VsZi5fbXV0ZWQgPSBtdXRlZDtcblxuICAgICAgaWYgKHVzaW5nV2ViQXVkaW8pIHtcbiAgICAgICAgbWFzdGVyR2Fpbi5nYWluLnZhbHVlID0gbXV0ZWQgPyAwIDogc2VsZi5fdm9sdW1lO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gc2VsZi5faG93bHMpIHtcbiAgICAgICAgaWYgKHNlbGYuX2hvd2xzLmhhc093blByb3BlcnR5KGtleSkgJiYgc2VsZi5faG93bHNba2V5XS5fd2ViQXVkaW8gPT09IGZhbHNlKSB7XG4gICAgICAgICAgLy8gbG9vcCB0aHJvdWdoIHRoZSBhdWRpbyBub2Rlc1xuICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxzZWxmLl9ob3dsc1trZXldLl9hdWRpb05vZGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHNlbGYuX2hvd2xzW2tleV0uX2F1ZGlvTm9kZVtpXS5tdXRlZCA9IG11dGVkO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBmb3IgY29kZWMgc3VwcG9ydC5cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IGV4dCBBdWRpbyBmaWxlIGV4dGVuc2lvbi5cbiAgICAgKiBAcmV0dXJuIHtCb29sZWFufVxuICAgICAqL1xuICAgIGNvZGVjczogZnVuY3Rpb24oZXh0KSB7XG4gICAgICByZXR1cm4gdGhpcy5fY29kZWNzW2V4dF07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIGlPUyB3aWxsIG9ubHkgYWxsb3cgYXVkaW8gdG8gYmUgcGxheWVkIGFmdGVyIGEgdXNlciBpbnRlcmFjdGlvbi5cbiAgICAgKiBBdHRlbXB0IHRvIGF1dG9tYXRpY2FsbHkgdW5sb2NrIGF1ZGlvIG9uIHRoZSBmaXJzdCB1c2VyIGludGVyYWN0aW9uLlxuICAgICAqIENvbmNlcHQgZnJvbTogaHR0cDovL3BhdWxiYWthdXMuY29tL3R1dG9yaWFscy9odG1sNS93ZWItYXVkaW8tb24taW9zL1xuICAgICAqIEByZXR1cm4ge0hvd2xlcn1cbiAgICAgKi9cbiAgICBfZW5hYmxlaU9TQXVkaW86IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAvLyBvbmx5IHJ1biB0aGlzIG9uIGlPUyBpZiBhdWRpbyBpc24ndCBhbHJlYWR5IGVhbmJsZWRcbiAgICAgIGlmIChjdHggJiYgKHNlbGYuX2lPU0VuYWJsZWQgfHwgIS9pUGhvbmV8aVBhZHxpUG9kL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBzZWxmLl9pT1NFbmFibGVkID0gZmFsc2U7XG5cbiAgICAgIC8vIGNhbGwgdGhpcyBtZXRob2Qgb24gdG91Y2ggc3RhcnQgdG8gY3JlYXRlIGFuZCBwbGF5IGEgYnVmZmVyLFxuICAgICAgLy8gdGhlbiBjaGVjayBpZiB0aGUgYXVkaW8gYWN0dWFsbHkgcGxheWVkIHRvIGRldGVybWluZSBpZlxuICAgICAgLy8gYXVkaW8gaGFzIG5vdyBiZWVuIHVubG9ja2VkIG9uIGlPU1xuICAgICAgdmFyIHVubG9jayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBjcmVhdGUgYW4gZW1wdHkgYnVmZmVyXG4gICAgICAgIHZhciBidWZmZXIgPSBjdHguY3JlYXRlQnVmZmVyKDEsIDEsIDIyMDUwKTtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGN0eC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICAgICAgc291cmNlLmJ1ZmZlciA9IGJ1ZmZlcjtcbiAgICAgICAgc291cmNlLmNvbm5lY3QoY3R4LmRlc3RpbmF0aW9uKTtcblxuICAgICAgICAvLyBwbGF5IHRoZSBlbXB0eSBidWZmZXJcbiAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2Uuc3RhcnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgc291cmNlLm5vdGVPbigwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzb3VyY2Uuc3RhcnQoMCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzZXR1cCBhIHRpbWVvdXQgdG8gY2hlY2sgdGhhdCB3ZSBhcmUgdW5sb2NrZWQgb24gdGhlIG5leHQgZXZlbnQgbG9vcFxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgoc291cmNlLnBsYXliYWNrU3RhdGUgPT09IHNvdXJjZS5QTEFZSU5HX1NUQVRFIHx8IHNvdXJjZS5wbGF5YmFja1N0YXRlID09PSBzb3VyY2UuRklOSVNIRURfU1RBVEUpKSB7XG4gICAgICAgICAgICAvLyB1cGRhdGUgdGhlIHVubG9ja2VkIHN0YXRlIGFuZCBwcmV2ZW50IHRoaXMgY2hlY2sgZnJvbSBoYXBwZW5pbmcgYWdhaW5cbiAgICAgICAgICAgIHNlbGYuX2lPU0VuYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgc2VsZi5pT1NBdXRvRW5hYmxlID0gZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIHJlbW92ZSB0aGUgdG91Y2ggc3RhcnQgbGlzdGVuZXJcbiAgICAgICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIHVubG9jaywgZmFsc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgMCk7XG4gICAgICB9O1xuXG4gICAgICAvLyBzZXR1cCBhIHRvdWNoIHN0YXJ0IGxpc3RlbmVyIHRvIGF0dGVtcHQgYW4gdW5sb2NrIGluXG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCB1bmxvY2ssIGZhbHNlKTtcblxuICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfVxuICB9O1xuXG4gIC8vIGNoZWNrIGZvciBicm93c2VyIGNvZGVjIHN1cHBvcnRcbiAgdmFyIGF1ZGlvVGVzdCA9IG51bGw7XG4gIHZhciBjb2RlY3MgPSB7fTtcbiAgaWYgKCFub0F1ZGlvKSB7XG4gICAgYXVkaW9UZXN0ID0gbmV3IEF1ZGlvKCk7XG4gICAgY29kZWNzID0ge1xuICAgICAgbXAzOiAhIWF1ZGlvVGVzdC5jYW5QbGF5VHlwZSgnYXVkaW8vbXBlZzsnKS5yZXBsYWNlKC9ebm8kLywgJycpLFxuICAgICAgb3B1czogISFhdWRpb1Rlc3QuY2FuUGxheVR5cGUoJ2F1ZGlvL29nZzsgY29kZWNzPVwib3B1c1wiJykucmVwbGFjZSgvXm5vJC8sICcnKSxcbiAgICAgIG9nZzogISFhdWRpb1Rlc3QuY2FuUGxheVR5cGUoJ2F1ZGlvL29nZzsgY29kZWNzPVwidm9yYmlzXCInKS5yZXBsYWNlKC9ebm8kLywgJycpLFxuICAgICAgd2F2OiAhIWF1ZGlvVGVzdC5jYW5QbGF5VHlwZSgnYXVkaW8vd2F2OyBjb2RlY3M9XCIxXCInKS5yZXBsYWNlKC9ebm8kLywgJycpLFxuICAgICAgYWFjOiAhIWF1ZGlvVGVzdC5jYW5QbGF5VHlwZSgnYXVkaW8vYWFjOycpLnJlcGxhY2UoL15ubyQvLCAnJyksXG4gICAgICBtNGE6ICEhKGF1ZGlvVGVzdC5jYW5QbGF5VHlwZSgnYXVkaW8veC1tNGE7JykgfHwgYXVkaW9UZXN0LmNhblBsYXlUeXBlKCdhdWRpby9tNGE7JykgfHwgYXVkaW9UZXN0LmNhblBsYXlUeXBlKCdhdWRpby9hYWM7JykpLnJlcGxhY2UoL15ubyQvLCAnJyksXG4gICAgICBtcDQ6ICEhKGF1ZGlvVGVzdC5jYW5QbGF5VHlwZSgnYXVkaW8veC1tcDQ7JykgfHwgYXVkaW9UZXN0LmNhblBsYXlUeXBlKCdhdWRpby9tcDQ7JykgfHwgYXVkaW9UZXN0LmNhblBsYXlUeXBlKCdhdWRpby9hYWM7JykpLnJlcGxhY2UoL15ubyQvLCAnJyksXG4gICAgICB3ZWJhOiAhIWF1ZGlvVGVzdC5jYW5QbGF5VHlwZSgnYXVkaW8vd2VibTsgY29kZWNzPVwidm9yYmlzXCInKS5yZXBsYWNlKC9ebm8kLywgJycpXG4gICAgfTtcbiAgfVxuXG4gIC8vIGFsbG93IGFjY2VzcyB0byB0aGUgZ2xvYmFsIGF1ZGlvIGNvbnRyb2xzXG4gIHZhciBIb3dsZXIgPSBuZXcgSG93bGVyR2xvYmFsKGNvZGVjcyk7XG5cbiAgLy8gc2V0dXAgdGhlIGF1ZGlvIG9iamVjdFxuICB2YXIgSG93bCA9IGZ1bmN0aW9uKG8pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBzZXR1cCB0aGUgZGVmYXVsdHNcbiAgICBzZWxmLl9hdXRvcGxheSA9IG8uYXV0b3BsYXkgfHwgZmFsc2U7XG4gICAgc2VsZi5fYnVmZmVyID0gby5idWZmZXIgfHwgZmFsc2U7XG4gICAgc2VsZi5fZHVyYXRpb24gPSBvLmR1cmF0aW9uIHx8IDA7XG4gICAgc2VsZi5fZm9ybWF0ID0gby5mb3JtYXQgfHwgbnVsbDtcbiAgICBzZWxmLl9sb29wID0gby5sb29wIHx8IGZhbHNlO1xuICAgIHNlbGYuX2xvYWRlZCA9IGZhbHNlO1xuICAgIHNlbGYuX3Nwcml0ZSA9IG8uc3ByaXRlIHx8IHt9O1xuICAgIHNlbGYuX3NyYyA9IG8uc3JjIHx8ICcnO1xuICAgIHNlbGYuX3BvczNkID0gby5wb3MzZCB8fCBbMCwgMCwgLTAuNV07XG4gICAgc2VsZi5fdm9sdW1lID0gby52b2x1bWUgIT09IHVuZGVmaW5lZCA/IG8udm9sdW1lIDogMTtcbiAgICBzZWxmLl91cmxzID0gby51cmxzIHx8IFtdO1xuICAgIHNlbGYuX3JhdGUgPSBvLnJhdGUgfHwgMTtcblxuICAgIC8vIGFsbG93IGZvcmNpbmcgb2YgYSBzcGVjaWZpYyBwYW5uaW5nTW9kZWwgKCdlcXVhbHBvd2VyJyBvciAnSFJURicpLFxuICAgIC8vIGlmIG5vbmUgaXMgc3BlY2lmaWVkLCBkZWZhdWx0cyB0byAnZXF1YWxwb3dlcicgYW5kIHN3aXRjaGVzIHRvICdIUlRGJ1xuICAgIC8vIGlmIDNkIHNvdW5kIGlzIHVzZWRcbiAgICBzZWxmLl9tb2RlbCA9IG8ubW9kZWwgfHwgbnVsbDtcblxuICAgIC8vIHNldHVwIGV2ZW50IGZ1bmN0aW9uc1xuICAgIHNlbGYuX29ubG9hZCA9IFtvLm9ubG9hZCB8fCBmdW5jdGlvbigpIHt9XTtcbiAgICBzZWxmLl9vbmxvYWRlcnJvciA9IFtvLm9ubG9hZGVycm9yIHx8IGZ1bmN0aW9uKCkge31dO1xuICAgIHNlbGYuX29uZW5kID0gW28ub25lbmQgfHwgZnVuY3Rpb24oKSB7fV07XG4gICAgc2VsZi5fb25wYXVzZSA9IFtvLm9ucGF1c2UgfHwgZnVuY3Rpb24oKSB7fV07XG4gICAgc2VsZi5fb25wbGF5ID0gW28ub25wbGF5IHx8IGZ1bmN0aW9uKCkge31dO1xuXG4gICAgc2VsZi5fb25lbmRUaW1lciA9IFtdO1xuXG4gICAgLy8gV2ViIEF1ZGlvIG9yIEhUTUw1IEF1ZGlvP1xuICAgIHNlbGYuX3dlYkF1ZGlvID0gdXNpbmdXZWJBdWRpbyAmJiAhc2VsZi5fYnVmZmVyO1xuXG4gICAgLy8gY2hlY2sgaWYgd2UgbmVlZCB0byBmYWxsIGJhY2sgdG8gSFRNTDUgQXVkaW9cbiAgICBzZWxmLl9hdWRpb05vZGUgPSBbXTtcbiAgICBpZiAoc2VsZi5fd2ViQXVkaW8pIHtcbiAgICAgIHNlbGYuX3NldHVwQXVkaW9Ob2RlKCk7XG4gICAgfVxuXG4gICAgLy8gYXV0b21hdGljYWxseSB0cnkgdG8gZW5hYmxlIGF1ZGlvIG9uIGlPU1xuICAgIGlmICh0eXBlb2YgY3R4ICE9PSAndW5kZWZpbmVkJyAmJiBjdHggJiYgSG93bGVyLmlPU0F1dG9FbmFibGUpIHtcbiAgICAgIEhvd2xlci5fZW5hYmxlaU9TQXVkaW8oKTtcbiAgICB9XG5cbiAgICAvLyBhZGQgdGhpcyB0byBhbiBhcnJheSBvZiBIb3dsJ3MgdG8gYWxsb3cgZ2xvYmFsIGNvbnRyb2xcbiAgICBIb3dsZXIuX2hvd2xzLnB1c2goc2VsZik7XG5cbiAgICAvLyBsb2FkIHRoZSB0cmFja1xuICAgIHNlbGYubG9hZCgpO1xuICB9O1xuXG4gIC8vIHNldHVwIGFsbCBvZiB0aGUgbWV0aG9kc1xuICBIb3dsLnByb3RvdHlwZSA9IHtcbiAgICAvKipcbiAgICAgKiBMb2FkIGFuIGF1ZGlvIGZpbGUuXG4gICAgICogQHJldHVybiB7SG93bH1cbiAgICAgKi9cbiAgICBsb2FkOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgdXJsID0gbnVsbDtcblxuICAgICAgLy8gaWYgbm8gYXVkaW8gaXMgYXZhaWxhYmxlLCBxdWl0IGltbWVkaWF0ZWx5XG4gICAgICBpZiAobm9BdWRpbykge1xuICAgICAgICBzZWxmLm9uKCdsb2FkZXJyb3InLCBuZXcgRXJyb3IoJ05vIGF1ZGlvIHN1cHBvcnQuJykpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGxvb3AgdGhyb3VnaCBzb3VyY2UgVVJMcyBhbmQgcGljayB0aGUgZmlyc3Qgb25lIHRoYXQgaXMgY29tcGF0aWJsZVxuICAgICAgZm9yICh2YXIgaT0wOyBpPHNlbGYuX3VybHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGV4dCwgdXJsSXRlbTtcblxuICAgICAgICBpZiAoc2VsZi5fZm9ybWF0KSB7XG4gICAgICAgICAgLy8gdXNlIHNwZWNpZmllZCBhdWRpbyBmb3JtYXQgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgZXh0ID0gc2VsZi5fZm9ybWF0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGZpZ3VyZSBvdXQgdGhlIGZpbGV0eXBlICh3aGV0aGVyIGFuIGV4dGVuc2lvbiBvciBiYXNlNjQgZGF0YSlcbiAgICAgICAgICB1cmxJdGVtID0gc2VsZi5fdXJsc1tpXTtcbiAgICAgICAgICBleHQgPSAvXmRhdGE6YXVkaW9cXC8oW147LF0rKTsvaS5leGVjKHVybEl0ZW0pO1xuICAgICAgICAgIGlmICghZXh0KSB7XG4gICAgICAgICAgICBleHQgPSAvXFwuKFteLl0rKSQvLmV4ZWModXJsSXRlbS5zcGxpdCgnPycsIDEpWzBdKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZXh0KSB7XG4gICAgICAgICAgICBleHQgPSBleHRbMV0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZi5vbignbG9hZGVycm9yJywgbmV3IEVycm9yKCdDb3VsZCBub3QgZXh0cmFjdCBmb3JtYXQgZnJvbSBwYXNzZWQgVVJMcywgcGxlYXNlIGFkZCBmb3JtYXQgcGFyYW1ldGVyLicpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29kZWNzW2V4dF0pIHtcbiAgICAgICAgICB1cmwgPSBzZWxmLl91cmxzW2ldO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICghdXJsKSB7XG4gICAgICAgIHNlbGYub24oJ2xvYWRlcnJvcicsIG5ldyBFcnJvcignTm8gY29kZWMgc3VwcG9ydCBmb3Igc2VsZWN0ZWQgYXVkaW8gc291cmNlcy4nKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgc2VsZi5fc3JjID0gdXJsO1xuXG4gICAgICBpZiAoc2VsZi5fd2ViQXVkaW8pIHtcbiAgICAgICAgbG9hZEJ1ZmZlcihzZWxmLCB1cmwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIG5ld05vZGUgPSBuZXcgQXVkaW8oKTtcblxuICAgICAgICAvLyBsaXN0ZW4gZm9yIGVycm9ycyB3aXRoIEhUTUw1IGF1ZGlvIChodHRwOi8vZGV2LnczLm9yZy9odG1sNS9zcGVjLWF1dGhvci12aWV3L3NwZWMuaHRtbCNtZWRpYWVycm9yKVxuICAgICAgICBuZXdOb2RlLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmIChuZXdOb2RlLmVycm9yICYmIG5ld05vZGUuZXJyb3IuY29kZSA9PT0gNCkge1xuICAgICAgICAgICAgSG93bGVyR2xvYmFsLm5vQXVkaW8gPSB0cnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHNlbGYub24oJ2xvYWRlcnJvcicsIHt0eXBlOiBuZXdOb2RlLmVycm9yID8gbmV3Tm9kZS5lcnJvci5jb2RlIDogMH0pO1xuICAgICAgICB9LCBmYWxzZSk7XG5cbiAgICAgICAgc2VsZi5fYXVkaW9Ob2RlLnB1c2gobmV3Tm9kZSk7XG5cbiAgICAgICAgLy8gc2V0dXAgdGhlIG5ldyBhdWRpbyBub2RlXG4gICAgICAgIG5ld05vZGUuc3JjID0gdXJsO1xuICAgICAgICBuZXdOb2RlLl9wb3MgPSAwO1xuICAgICAgICBuZXdOb2RlLnByZWxvYWQgPSAnYXV0byc7XG4gICAgICAgIG5ld05vZGUudm9sdW1lID0gKEhvd2xlci5fbXV0ZWQpID8gMCA6IHNlbGYuX3ZvbHVtZSAqIEhvd2xlci52b2x1bWUoKTtcblxuICAgICAgICAvLyBzZXR1cCB0aGUgZXZlbnQgbGlzdGVuZXIgdG8gc3RhcnQgcGxheWluZyB0aGUgc291bmRcbiAgICAgICAgLy8gYXMgc29vbiBhcyBpdCBoYXMgYnVmZmVyZWQgZW5vdWdoXG4gICAgICAgIHZhciBsaXN0ZW5lciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIHJvdW5kIHVwIHRoZSBkdXJhdGlvbiB3aGVuIHVzaW5nIEhUTUw1IEF1ZGlvIHRvIGFjY291bnQgZm9yIHRoZSBsb3dlciBwcmVjaXNpb25cbiAgICAgICAgICBzZWxmLl9kdXJhdGlvbiA9IE1hdGguY2VpbChuZXdOb2RlLmR1cmF0aW9uICogMTApIC8gMTA7XG5cbiAgICAgICAgICAvLyBzZXR1cCBhIHNwcml0ZSBpZiBub25lIGlzIGRlZmluZWRcbiAgICAgICAgICBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoc2VsZi5fc3ByaXRlKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHNlbGYuX3Nwcml0ZSA9IHtfZGVmYXVsdDogWzAsIHNlbGYuX2R1cmF0aW9uICogMTAwMF19O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghc2VsZi5fbG9hZGVkKSB7XG4gICAgICAgICAgICBzZWxmLl9sb2FkZWQgPSB0cnVlO1xuICAgICAgICAgICAgc2VsZi5vbignbG9hZCcpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChzZWxmLl9hdXRvcGxheSkge1xuICAgICAgICAgICAgc2VsZi5wbGF5KCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gY2xlYXIgdGhlIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgICAgbmV3Tm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKCdjYW5wbGF5dGhyb3VnaCcsIGxpc3RlbmVyLCBmYWxzZSk7XG4gICAgICAgIH07XG4gICAgICAgIG5ld05vZGUuYWRkRXZlbnRMaXN0ZW5lcignY2FucGxheXRocm91Z2gnLCBsaXN0ZW5lciwgZmFsc2UpO1xuICAgICAgICBuZXdOb2RlLmxvYWQoKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldC9zZXQgdGhlIFVSTHMgdG8gYmUgcHVsbGVkIGZyb20gdG8gcGxheSBpbiB0aGlzIHNvdXJjZS5cbiAgICAgKiBAcGFyYW0gIHtBcnJheX0gdXJscyAgQXJyeSBvZiBVUkxzIHRvIGxvYWQgZnJvbVxuICAgICAqIEByZXR1cm4ge0hvd2x9ICAgICAgICBSZXR1cm5zIHNlbGYgb3IgdGhlIGN1cnJlbnQgVVJMc1xuICAgICAqL1xuICAgIHVybHM6IGZ1bmN0aW9uKHVybHMpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgaWYgKHVybHMpIHtcbiAgICAgICAgc2VsZi5zdG9wKCk7XG4gICAgICAgIHNlbGYuX3VybHMgPSAodHlwZW9mIHVybHMgPT09ICdzdHJpbmcnKSA/IFt1cmxzXSA6IHVybHM7XG4gICAgICAgIHNlbGYuX2xvYWRlZCA9IGZhbHNlO1xuICAgICAgICBzZWxmLmxvYWQoKTtcblxuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBzZWxmLl91cmxzO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQbGF5IGEgc291bmQgZnJvbSB0aGUgY3VycmVudCB0aW1lICgwIGJ5IGRlZmF1bHQpLlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gICBzcHJpdGUgICAob3B0aW9uYWwpIFBsYXlzIGZyb20gdGhlIHNwZWNpZmllZCBwb3NpdGlvbiBpbiB0aGUgc291bmQgc3ByaXRlIGRlZmluaXRpb24uXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIChvcHRpb25hbCkgUmV0dXJucyB0aGUgdW5pcXVlIHBsYXliYWNrIGlkIGZvciB0aGlzIHNvdW5kIGluc3RhbmNlLlxuICAgICAqIEByZXR1cm4ge0hvd2x9XG4gICAgICovXG4gICAgcGxheTogZnVuY3Rpb24oc3ByaXRlLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAvLyBpZiBubyBzcHJpdGUgd2FzIHBhc3NlZCBidXQgYSBjYWxsYmFjayB3YXMsIHVwZGF0ZSB0aGUgdmFyaWFibGVzXG4gICAgICBpZiAodHlwZW9mIHNwcml0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjYWxsYmFjayA9IHNwcml0ZTtcbiAgICAgIH1cblxuICAgICAgLy8gdXNlIHRoZSBkZWZhdWx0IHNwcml0ZSBpZiBub25lIGlzIHBhc3NlZFxuICAgICAgaWYgKCFzcHJpdGUgfHwgdHlwZW9mIHNwcml0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBzcHJpdGUgPSAnX2RlZmF1bHQnO1xuICAgICAgfVxuXG4gICAgICAvLyBpZiB0aGUgc291bmQgaGFzbid0IGJlZW4gbG9hZGVkLCBhZGQgaXQgdG8gdGhlIGV2ZW50IHF1ZXVlXG4gICAgICBpZiAoIXNlbGYuX2xvYWRlZCkge1xuICAgICAgICBzZWxmLm9uKCdsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2VsZi5wbGF5KHNwcml0ZSwgY2FsbGJhY2spO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgIH1cblxuICAgICAgLy8gaWYgdGhlIHNwcml0ZSBkb2Vzbid0IGV4aXN0LCBwbGF5IG5vdGhpbmdcbiAgICAgIGlmICghc2VsZi5fc3ByaXRlW3Nwcml0ZV0pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykgY2FsbGJhY2soKTtcbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICB9XG5cbiAgICAgIC8vIGdldCB0aGUgbm9kZSB0byBwbGF5YmFja1xuICAgICAgc2VsZi5faW5hY3RpdmVOb2RlKGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgLy8gcGVyc2lzdCB0aGUgc3ByaXRlIGJlaW5nIHBsYXllZFxuICAgICAgICBub2RlLl9zcHJpdGUgPSBzcHJpdGU7XG5cbiAgICAgICAgLy8gZGV0ZXJtaW5lIHdoZXJlIHRvIHN0YXJ0IHBsYXlpbmcgZnJvbVxuICAgICAgICB2YXIgcG9zID0gKG5vZGUuX3BvcyA+IDApID8gbm9kZS5fcG9zIDogc2VsZi5fc3ByaXRlW3Nwcml0ZV1bMF0gLyAxMDAwO1xuXG4gICAgICAgIC8vIGRldGVybWluZSBob3cgbG9uZyB0byBwbGF5IGZvclxuICAgICAgICB2YXIgZHVyYXRpb24gPSAwO1xuICAgICAgICBpZiAoc2VsZi5fd2ViQXVkaW8pIHtcbiAgICAgICAgICBkdXJhdGlvbiA9IHNlbGYuX3Nwcml0ZVtzcHJpdGVdWzFdIC8gMTAwMCAtIG5vZGUuX3BvcztcbiAgICAgICAgICBpZiAobm9kZS5fcG9zID4gMCkge1xuICAgICAgICAgICAgcG9zID0gc2VsZi5fc3ByaXRlW3Nwcml0ZV1bMF0gLyAxMDAwICsgcG9zO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkdXJhdGlvbiA9IHNlbGYuX3Nwcml0ZVtzcHJpdGVdWzFdIC8gMTAwMCAtIChwb3MgLSBzZWxmLl9zcHJpdGVbc3ByaXRlXVswXSAvIDEwMDApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZGV0ZXJtaW5lIGlmIHRoaXMgc291bmQgc2hvdWxkIGJlIGxvb3BlZFxuICAgICAgICB2YXIgbG9vcCA9ICEhKHNlbGYuX2xvb3AgfHwgc2VsZi5fc3ByaXRlW3Nwcml0ZV1bMl0pO1xuXG4gICAgICAgIC8vIHNldCB0aW1lciB0byBmaXJlIHRoZSAnb25lbmQnIGV2ZW50XG4gICAgICAgIHZhciBzb3VuZElkID0gKHR5cGVvZiBjYWxsYmFjayA9PT0gJ3N0cmluZycpID8gY2FsbGJhY2sgOiBNYXRoLnJvdW5kKERhdGUubm93KCkgKiBNYXRoLnJhbmRvbSgpKSArICcnLFxuICAgICAgICAgIHRpbWVySWQ7XG4gICAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICAgIGlkOiBzb3VuZElkLFxuICAgICAgICAgICAgc3ByaXRlOiBzcHJpdGUsXG4gICAgICAgICAgICBsb29wOiBsb29wXG4gICAgICAgICAgfTtcbiAgICAgICAgICB0aW1lcklkID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIGlmIGxvb3BpbmcsIHJlc3RhcnQgdGhlIHRyYWNrXG4gICAgICAgICAgICBpZiAoIXNlbGYuX3dlYkF1ZGlvICYmIGxvb3ApIHtcbiAgICAgICAgICAgICAgc2VsZi5zdG9wKGRhdGEuaWQpLnBsYXkoc3ByaXRlLCBkYXRhLmlkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gc2V0IHdlYiBhdWRpbyBub2RlIHRvIHBhdXNlZCBhdCBlbmRcbiAgICAgICAgICAgIGlmIChzZWxmLl93ZWJBdWRpbyAmJiAhbG9vcCkge1xuICAgICAgICAgICAgICBzZWxmLl9ub2RlQnlJZChkYXRhLmlkKS5wYXVzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICBzZWxmLl9ub2RlQnlJZChkYXRhLmlkKS5fcG9zID0gMDtcblxuICAgICAgICAgICAgICAvLyBjbGVhciB0aGUgZW5kIHRpbWVyXG4gICAgICAgICAgICAgIHNlbGYuX2NsZWFyRW5kVGltZXIoZGF0YS5pZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGVuZCB0aGUgdHJhY2sgaWYgaXQgaXMgSFRNTCBhdWRpbyBhbmQgYSBzcHJpdGVcbiAgICAgICAgICAgIGlmICghc2VsZi5fd2ViQXVkaW8gJiYgIWxvb3ApIHtcbiAgICAgICAgICAgICAgc2VsZi5zdG9wKGRhdGEuaWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBmaXJlIGVuZGVkIGV2ZW50XG4gICAgICAgICAgICBzZWxmLm9uKCdlbmQnLCBzb3VuZElkKTtcbiAgICAgICAgICB9LCAoZHVyYXRpb24gLyBzZWxmLl9yYXRlKSAqIDEwMDApO1xuXG4gICAgICAgICAgLy8gc3RvcmUgdGhlIHJlZmVyZW5jZSB0byB0aGUgdGltZXJcbiAgICAgICAgICBzZWxmLl9vbmVuZFRpbWVyLnB1c2goe3RpbWVyOiB0aW1lcklkLCBpZDogZGF0YS5pZH0pO1xuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGlmIChzZWxmLl93ZWJBdWRpbykge1xuICAgICAgICAgIHZhciBsb29wU3RhcnQgPSBzZWxmLl9zcHJpdGVbc3ByaXRlXVswXSAvIDEwMDAsXG4gICAgICAgICAgICBsb29wRW5kID0gc2VsZi5fc3ByaXRlW3Nwcml0ZV1bMV0gLyAxMDAwO1xuXG4gICAgICAgICAgLy8gc2V0IHRoZSBwbGF5IGlkIHRvIHRoaXMgbm9kZSBhbmQgbG9hZCBpbnRvIGNvbnRleHRcbiAgICAgICAgICBub2RlLmlkID0gc291bmRJZDtcbiAgICAgICAgICBub2RlLnBhdXNlZCA9IGZhbHNlO1xuICAgICAgICAgIHJlZnJlc2hCdWZmZXIoc2VsZiwgW2xvb3AsIGxvb3BTdGFydCwgbG9vcEVuZF0sIHNvdW5kSWQpO1xuICAgICAgICAgIHNlbGYuX3BsYXlTdGFydCA9IGN0eC5jdXJyZW50VGltZTtcbiAgICAgICAgICBub2RlLmdhaW4udmFsdWUgPSBzZWxmLl92b2x1bWU7XG5cbiAgICAgICAgICBpZiAodHlwZW9mIG5vZGUuYnVmZmVyU291cmNlLnN0YXJ0ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgbG9vcCA/IG5vZGUuYnVmZmVyU291cmNlLm5vdGVHcmFpbk9uKDAsIHBvcywgODY0MDApIDogbm9kZS5idWZmZXJTb3VyY2Uubm90ZUdyYWluT24oMCwgcG9zLCBkdXJhdGlvbik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvb3AgPyBub2RlLmJ1ZmZlclNvdXJjZS5zdGFydCgwLCBwb3MsIDg2NDAwKSA6IG5vZGUuYnVmZmVyU291cmNlLnN0YXJ0KDAsIHBvcywgZHVyYXRpb24pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAobm9kZS5yZWFkeVN0YXRlID09PSA0IHx8ICFub2RlLnJlYWR5U3RhdGUgJiYgbmF2aWdhdG9yLmlzQ29jb29uSlMpIHtcbiAgICAgICAgICAgIG5vZGUucmVhZHlTdGF0ZSA9IDQ7XG4gICAgICAgICAgICBub2RlLmlkID0gc291bmRJZDtcbiAgICAgICAgICAgIG5vZGUuY3VycmVudFRpbWUgPSBwb3M7XG4gICAgICAgICAgICBub2RlLm11dGVkID0gSG93bGVyLl9tdXRlZCB8fCBub2RlLm11dGVkO1xuICAgICAgICAgICAgbm9kZS52b2x1bWUgPSBzZWxmLl92b2x1bWUgKiBIb3dsZXIudm9sdW1lKCk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBub2RlLnBsYXkoKTsgfSwgMCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlbGYuX2NsZWFyRW5kVGltZXIoc291bmRJZCk7XG5cbiAgICAgICAgICAgIChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICB2YXIgc291bmQgPSBzZWxmLFxuICAgICAgICAgICAgICAgIHBsYXlTcHJpdGUgPSBzcHJpdGUsXG4gICAgICAgICAgICAgICAgZm4gPSBjYWxsYmFjayxcbiAgICAgICAgICAgICAgICBuZXdOb2RlID0gbm9kZTtcbiAgICAgICAgICAgICAgdmFyIGxpc3RlbmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc291bmQucGxheShwbGF5U3ByaXRlLCBmbik7XG5cbiAgICAgICAgICAgICAgICAvLyBjbGVhciB0aGUgZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgICAgICAgICBuZXdOb2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NhbnBsYXl0aHJvdWdoJywgbGlzdGVuZXIsIGZhbHNlKTtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgbmV3Tm9kZS5hZGRFdmVudExpc3RlbmVyKCdjYW5wbGF5dGhyb3VnaCcsIGxpc3RlbmVyLCBmYWxzZSk7XG4gICAgICAgICAgICB9KSgpO1xuXG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBmaXJlIHRoZSBwbGF5IGV2ZW50IGFuZCBzZW5kIHRoZSBzb3VuZElkIGJhY2sgaW4gdGhlIGNhbGxiYWNrXG4gICAgICAgIHNlbGYub24oJ3BsYXknKTtcbiAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykgY2FsbGJhY2soc291bmRJZCk7XG5cbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBhdXNlIHBsYXliYWNrIGFuZCBzYXZlIHRoZSBjdXJyZW50IHBvc2l0aW9uLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBpZCAob3B0aW9uYWwpIFRoZSBwbGF5IGluc3RhbmNlIElELlxuICAgICAqIEByZXR1cm4ge0hvd2x9XG4gICAgICovXG4gICAgcGF1c2U6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIC8vIGlmIHRoZSBzb3VuZCBoYXNuJ3QgYmVlbiBsb2FkZWQsIGFkZCBpdCB0byB0aGUgZXZlbnQgcXVldWVcbiAgICAgIGlmICghc2VsZi5fbG9hZGVkKSB7XG4gICAgICAgIHNlbGYub24oJ3BsYXknLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzZWxmLnBhdXNlKGlkKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICB9XG5cbiAgICAgIC8vIGNsZWFyICdvbmVuZCcgdGltZXJcbiAgICAgIHNlbGYuX2NsZWFyRW5kVGltZXIoaWQpO1xuXG4gICAgICB2YXIgYWN0aXZlTm9kZSA9IChpZCkgPyBzZWxmLl9ub2RlQnlJZChpZCkgOiBzZWxmLl9hY3RpdmVOb2RlKCk7XG4gICAgICBpZiAoYWN0aXZlTm9kZSkge1xuICAgICAgICBhY3RpdmVOb2RlLl9wb3MgPSBzZWxmLnBvcyhudWxsLCBpZCk7XG5cbiAgICAgICAgaWYgKHNlbGYuX3dlYkF1ZGlvKSB7XG4gICAgICAgICAgLy8gbWFrZSBzdXJlIHRoZSBzb3VuZCBoYXMgYmVlbiBjcmVhdGVkXG4gICAgICAgICAgaWYgKCFhY3RpdmVOb2RlLmJ1ZmZlclNvdXJjZSB8fCBhY3RpdmVOb2RlLnBhdXNlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYWN0aXZlTm9kZS5wYXVzZWQgPSB0cnVlO1xuICAgICAgICAgIGlmICh0eXBlb2YgYWN0aXZlTm9kZS5idWZmZXJTb3VyY2Uuc3RvcCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGFjdGl2ZU5vZGUuYnVmZmVyU291cmNlLm5vdGVPZmYoMCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFjdGl2ZU5vZGUuYnVmZmVyU291cmNlLnN0b3AoMCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFjdGl2ZU5vZGUucGF1c2UoKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBzZWxmLm9uKCdwYXVzZScpO1xuXG4gICAgICByZXR1cm4gc2VsZjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RvcCBwbGF5YmFjayBhbmQgcmVzZXQgdG8gc3RhcnQuXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBpZCAgKG9wdGlvbmFsKSBUaGUgcGxheSBpbnN0YW5jZSBJRC5cbiAgICAgKiBAcmV0dXJuIHtIb3dsfVxuICAgICAqL1xuICAgIHN0b3A6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIC8vIGlmIHRoZSBzb3VuZCBoYXNuJ3QgYmVlbiBsb2FkZWQsIGFkZCBpdCB0byB0aGUgZXZlbnQgcXVldWVcbiAgICAgIGlmICghc2VsZi5fbG9hZGVkKSB7XG4gICAgICAgIHNlbGYub24oJ3BsYXknLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzZWxmLnN0b3AoaWQpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgIH1cblxuICAgICAgLy8gY2xlYXIgJ29uZW5kJyB0aW1lclxuICAgICAgc2VsZi5fY2xlYXJFbmRUaW1lcihpZCk7XG5cbiAgICAgIHZhciBhY3RpdmVOb2RlID0gKGlkKSA/IHNlbGYuX25vZGVCeUlkKGlkKSA6IHNlbGYuX2FjdGl2ZU5vZGUoKTtcbiAgICAgIGlmIChhY3RpdmVOb2RlKSB7XG4gICAgICAgIGFjdGl2ZU5vZGUuX3BvcyA9IDA7XG5cbiAgICAgICAgaWYgKHNlbGYuX3dlYkF1ZGlvKSB7XG4gICAgICAgICAgLy8gbWFrZSBzdXJlIHRoZSBzb3VuZCBoYXMgYmVlbiBjcmVhdGVkXG4gICAgICAgICAgaWYgKCFhY3RpdmVOb2RlLmJ1ZmZlclNvdXJjZSB8fCBhY3RpdmVOb2RlLnBhdXNlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYWN0aXZlTm9kZS5wYXVzZWQgPSB0cnVlO1xuXG4gICAgICAgICAgaWYgKHR5cGVvZiBhY3RpdmVOb2RlLmJ1ZmZlclNvdXJjZS5zdG9wID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgYWN0aXZlTm9kZS5idWZmZXJTb3VyY2Uubm90ZU9mZigwKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWN0aXZlTm9kZS5idWZmZXJTb3VyY2Uuc3RvcCgwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIWlzTmFOKGFjdGl2ZU5vZGUuZHVyYXRpb24pKSB7XG4gICAgICAgICAgYWN0aXZlTm9kZS5wYXVzZSgpO1xuICAgICAgICAgIGFjdGl2ZU5vZGUuY3VycmVudFRpbWUgPSAwO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZWxmO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNdXRlIHRoaXMgc291bmQuXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBpZCAob3B0aW9uYWwpIFRoZSBwbGF5IGluc3RhbmNlIElELlxuICAgICAqIEByZXR1cm4ge0hvd2x9XG4gICAgICovXG4gICAgbXV0ZTogZnVuY3Rpb24oaWQpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgLy8gaWYgdGhlIHNvdW5kIGhhc24ndCBiZWVuIGxvYWRlZCwgYWRkIGl0IHRvIHRoZSBldmVudCBxdWV1ZVxuICAgICAgaWYgKCFzZWxmLl9sb2FkZWQpIHtcbiAgICAgICAgc2VsZi5vbigncGxheScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNlbGYubXV0ZShpZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgfVxuXG4gICAgICB2YXIgYWN0aXZlTm9kZSA9IChpZCkgPyBzZWxmLl9ub2RlQnlJZChpZCkgOiBzZWxmLl9hY3RpdmVOb2RlKCk7XG4gICAgICBpZiAoYWN0aXZlTm9kZSkge1xuICAgICAgICBpZiAoc2VsZi5fd2ViQXVkaW8pIHtcbiAgICAgICAgICBhY3RpdmVOb2RlLmdhaW4udmFsdWUgPSAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFjdGl2ZU5vZGUubXV0ZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZWxmO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVbm11dGUgdGhpcyBzb3VuZC5cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IGlkIChvcHRpb25hbCkgVGhlIHBsYXkgaW5zdGFuY2UgSUQuXG4gICAgICogQHJldHVybiB7SG93bH1cbiAgICAgKi9cbiAgICB1bm11dGU6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIC8vIGlmIHRoZSBzb3VuZCBoYXNuJ3QgYmVlbiBsb2FkZWQsIGFkZCBpdCB0byB0aGUgZXZlbnQgcXVldWVcbiAgICAgIGlmICghc2VsZi5fbG9hZGVkKSB7XG4gICAgICAgIHNlbGYub24oJ3BsYXknLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzZWxmLnVubXV0ZShpZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgfVxuXG4gICAgICB2YXIgYWN0aXZlTm9kZSA9IChpZCkgPyBzZWxmLl9ub2RlQnlJZChpZCkgOiBzZWxmLl9hY3RpdmVOb2RlKCk7XG4gICAgICBpZiAoYWN0aXZlTm9kZSkge1xuICAgICAgICBpZiAoc2VsZi5fd2ViQXVkaW8pIHtcbiAgICAgICAgICBhY3RpdmVOb2RlLmdhaW4udmFsdWUgPSBzZWxmLl92b2x1bWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYWN0aXZlTm9kZS5tdXRlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZWxmO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQvc2V0IHZvbHVtZSBvZiB0aGlzIHNvdW5kLlxuICAgICAqIEBwYXJhbSAge0Zsb2F0fSAgdm9sIFZvbHVtZSBmcm9tIDAuMCB0byAxLjAuXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBpZCAgKG9wdGlvbmFsKSBUaGUgcGxheSBpbnN0YW5jZSBJRC5cbiAgICAgKiBAcmV0dXJuIHtIb3dsL0Zsb2F0fSAgICAgUmV0dXJucyBzZWxmIG9yIGN1cnJlbnQgdm9sdW1lLlxuICAgICAqL1xuICAgIHZvbHVtZTogZnVuY3Rpb24odm9sLCBpZCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAvLyBtYWtlIHN1cmUgdm9sdW1lIGlzIGEgbnVtYmVyXG4gICAgICB2b2wgPSBwYXJzZUZsb2F0KHZvbCk7XG5cbiAgICAgIGlmICh2b2wgPj0gMCAmJiB2b2wgPD0gMSkge1xuICAgICAgICBzZWxmLl92b2x1bWUgPSB2b2w7XG5cbiAgICAgICAgLy8gaWYgdGhlIHNvdW5kIGhhc24ndCBiZWVuIGxvYWRlZCwgYWRkIGl0IHRvIHRoZSBldmVudCBxdWV1ZVxuICAgICAgICBpZiAoIXNlbGYuX2xvYWRlZCkge1xuICAgICAgICAgIHNlbGYub24oJ3BsYXknLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHNlbGYudm9sdW1lKHZvbCwgaWQpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYWN0aXZlTm9kZSA9IChpZCkgPyBzZWxmLl9ub2RlQnlJZChpZCkgOiBzZWxmLl9hY3RpdmVOb2RlKCk7XG4gICAgICAgIGlmIChhY3RpdmVOb2RlKSB7XG4gICAgICAgICAgaWYgKHNlbGYuX3dlYkF1ZGlvKSB7XG4gICAgICAgICAgICBhY3RpdmVOb2RlLmdhaW4udmFsdWUgPSB2b2w7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFjdGl2ZU5vZGUudm9sdW1lID0gdm9sICogSG93bGVyLnZvbHVtZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuX3ZvbHVtZTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0L3NldCB3aGV0aGVyIHRvIGxvb3AgdGhlIHNvdW5kLlxuICAgICAqIEBwYXJhbSAge0Jvb2xlYW59IGxvb3AgVG8gbG9vcCBvciBub3QgdG8gbG9vcCwgdGhhdCBpcyB0aGUgcXVlc3Rpb24uXG4gICAgICogQHJldHVybiB7SG93bC9Cb29sZWFufSAgICAgIFJldHVybnMgc2VsZiBvciBjdXJyZW50IGxvb3BpbmcgdmFsdWUuXG4gICAgICovXG4gICAgbG9vcDogZnVuY3Rpb24obG9vcCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBpZiAodHlwZW9mIGxvb3AgPT09ICdib29sZWFuJykge1xuICAgICAgICBzZWxmLl9sb29wID0gbG9vcDtcblxuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBzZWxmLl9sb29wO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQvc2V0IHNvdW5kIHNwcml0ZSBkZWZpbml0aW9uLlxuICAgICAqIEBwYXJhbSAge09iamVjdH0gc3ByaXRlIEV4YW1wbGU6IHtzcHJpdGVOYW1lOiBbb2Zmc2V0LCBkdXJhdGlvbiwgbG9vcF19XG4gICAgICogICAgICAgICAgICAgICAgQHBhcmFtIHtJbnRlZ2VyfSBvZmZzZXQgICBXaGVyZSB0byBiZWdpbiBwbGF5YmFjayBpbiBtaWxsaXNlY29uZHNcbiAgICAgKiAgICAgICAgICAgICAgICBAcGFyYW0ge0ludGVnZXJ9IGR1cmF0aW9uIEhvdyBsb25nIHRvIHBsYXkgaW4gbWlsbGlzZWNvbmRzXG4gICAgICogICAgICAgICAgICAgICAgQHBhcmFtIHtCb29sZWFufSBsb29wICAgICAob3B0aW9uYWwpIFNldCB0cnVlIHRvIGxvb3AgdGhpcyBzcHJpdGVcbiAgICAgKiBAcmV0dXJuIHtIb3dsfSAgICAgICAgUmV0dXJucyBjdXJyZW50IHNwcml0ZSBzaGVldCBvciBzZWxmLlxuICAgICAqL1xuICAgIHNwcml0ZTogZnVuY3Rpb24oc3ByaXRlKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIGlmICh0eXBlb2Ygc3ByaXRlID09PSAnb2JqZWN0Jykge1xuICAgICAgICBzZWxmLl9zcHJpdGUgPSBzcHJpdGU7XG5cbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gc2VsZi5fc3ByaXRlO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQvc2V0IHRoZSBwb3NpdGlvbiBvZiBwbGF5YmFjay5cbiAgICAgKiBAcGFyYW0gIHtGbG9hdH0gIHBvcyBUaGUgcG9zaXRpb24gdG8gbW92ZSBjdXJyZW50IHBsYXliYWNrIHRvLlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gaWQgIChvcHRpb25hbCkgVGhlIHBsYXkgaW5zdGFuY2UgSUQuXG4gICAgICogQHJldHVybiB7SG93bC9GbG9hdH0gICAgICBSZXR1cm5zIHNlbGYgb3IgY3VycmVudCBwbGF5YmFjayBwb3NpdGlvbi5cbiAgICAgKi9cbiAgICBwb3M6IGZ1bmN0aW9uKHBvcywgaWQpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgLy8gaWYgdGhlIHNvdW5kIGhhc24ndCBiZWVuIGxvYWRlZCwgYWRkIGl0IHRvIHRoZSBldmVudCBxdWV1ZVxuICAgICAgaWYgKCFzZWxmLl9sb2FkZWQpIHtcbiAgICAgICAgc2VsZi5vbignbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNlbGYucG9zKHBvcyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB0eXBlb2YgcG9zID09PSAnbnVtYmVyJyA/IHNlbGYgOiBzZWxmLl9wb3MgfHwgMDtcbiAgICAgIH1cblxuICAgICAgLy8gbWFrZSBzdXJlIHdlIGFyZSBkZWFsaW5nIHdpdGggYSBudW1iZXIgZm9yIHBvc1xuICAgICAgcG9zID0gcGFyc2VGbG9hdChwb3MpO1xuXG4gICAgICB2YXIgYWN0aXZlTm9kZSA9IChpZCkgPyBzZWxmLl9ub2RlQnlJZChpZCkgOiBzZWxmLl9hY3RpdmVOb2RlKCk7XG4gICAgICBpZiAoYWN0aXZlTm9kZSkge1xuICAgICAgICBpZiAocG9zID49IDApIHtcbiAgICAgICAgICBzZWxmLnBhdXNlKGlkKTtcbiAgICAgICAgICBhY3RpdmVOb2RlLl9wb3MgPSBwb3M7XG4gICAgICAgICAgc2VsZi5wbGF5KGFjdGl2ZU5vZGUuX3Nwcml0ZSwgaWQpO1xuXG4gICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHNlbGYuX3dlYkF1ZGlvID8gYWN0aXZlTm9kZS5fcG9zICsgKGN0eC5jdXJyZW50VGltZSAtIHNlbGYuX3BsYXlTdGFydCkgOiBhY3RpdmVOb2RlLmN1cnJlbnRUaW1lO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHBvcyA+PSAwKSB7XG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZmluZCB0aGUgZmlyc3QgaW5hY3RpdmUgbm9kZSB0byByZXR1cm4gdGhlIHBvcyBmb3JcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPHNlbGYuX2F1ZGlvTm9kZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChzZWxmLl9hdWRpb05vZGVbaV0ucGF1c2VkICYmIHNlbGYuX2F1ZGlvTm9kZVtpXS5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgICByZXR1cm4gKHNlbGYuX3dlYkF1ZGlvKSA/IHNlbGYuX2F1ZGlvTm9kZVtpXS5fcG9zIDogc2VsZi5fYXVkaW9Ob2RlW2ldLmN1cnJlbnRUaW1lO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQvc2V0IHRoZSAzRCBwb3NpdGlvbiBvZiB0aGUgYXVkaW8gc291cmNlLlxuICAgICAqIFRoZSBtb3N0IGNvbW1vbiB1c2FnZSBpcyB0byBzZXQgdGhlICd4JyBwb3NpdGlvblxuICAgICAqIHRvIGFmZmVjdCB0aGUgbGVmdC9yaWdodCBlYXIgcGFubmluZy4gU2V0dGluZyBhbnkgdmFsdWUgaGlnaGVyIHRoYW5cbiAgICAgKiAxLjAgd2lsbCBiZWdpbiB0byBkZWNyZWFzZSB0aGUgdm9sdW1lIG9mIHRoZSBzb3VuZCBhcyBpdCBtb3ZlcyBmdXJ0aGVyIGF3YXkuXG4gICAgICogTk9URTogVGhpcyBvbmx5IHdvcmtzIHdpdGggV2ViIEF1ZGlvIEFQSSwgSFRNTDUgQXVkaW8gcGxheWJhY2tcbiAgICAgKiB3aWxsIG5vdCBiZSBhZmZlY3RlZC5cbiAgICAgKiBAcGFyYW0gIHtGbG9hdH0gIHggIFRoZSB4LXBvc2l0aW9uIG9mIHRoZSBwbGF5YmFjayBmcm9tIC0xMDAwLjAgdG8gMTAwMC4wXG4gICAgICogQHBhcmFtICB7RmxvYXR9ICB5ICBUaGUgeS1wb3NpdGlvbiBvZiB0aGUgcGxheWJhY2sgZnJvbSAtMTAwMC4wIHRvIDEwMDAuMFxuICAgICAqIEBwYXJhbSAge0Zsb2F0fSAgeiAgVGhlIHotcG9zaXRpb24gb2YgdGhlIHBsYXliYWNrIGZyb20gLTEwMDAuMCB0byAxMDAwLjBcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IGlkIChvcHRpb25hbCkgVGhlIHBsYXkgaW5zdGFuY2UgSUQuXG4gICAgICogQHJldHVybiB7SG93bC9BcnJheX0gICBSZXR1cm5zIHNlbGYgb3IgdGhlIGN1cnJlbnQgM0QgcG9zaXRpb246IFt4LCB5LCB6XVxuICAgICAqL1xuICAgIHBvczNkOiBmdW5jdGlvbih4LCB5LCB6LCBpZCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAvLyBzZXQgYSBkZWZhdWx0IGZvciB0aGUgb3B0aW9uYWwgJ3knICYgJ3onXG4gICAgICB5ID0gKHR5cGVvZiB5ID09PSAndW5kZWZpbmVkJyB8fCAheSkgPyAwIDogeTtcbiAgICAgIHogPSAodHlwZW9mIHogPT09ICd1bmRlZmluZWQnIHx8ICF6KSA/IC0wLjUgOiB6O1xuXG4gICAgICAvLyBpZiB0aGUgc291bmQgaGFzbid0IGJlZW4gbG9hZGVkLCBhZGQgaXQgdG8gdGhlIGV2ZW50IHF1ZXVlXG4gICAgICBpZiAoIXNlbGYuX2xvYWRlZCkge1xuICAgICAgICBzZWxmLm9uKCdwbGF5JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2VsZi5wb3MzZCh4LCB5LCB6LCBpZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgfVxuXG4gICAgICBpZiAoeCA+PSAwIHx8IHggPCAwKSB7XG4gICAgICAgIGlmIChzZWxmLl93ZWJBdWRpbykge1xuICAgICAgICAgIHZhciBhY3RpdmVOb2RlID0gKGlkKSA/IHNlbGYuX25vZGVCeUlkKGlkKSA6IHNlbGYuX2FjdGl2ZU5vZGUoKTtcbiAgICAgICAgICBpZiAoYWN0aXZlTm9kZSkge1xuICAgICAgICAgICAgc2VsZi5fcG9zM2QgPSBbeCwgeSwgel07XG4gICAgICAgICAgICBhY3RpdmVOb2RlLnBhbm5lci5zZXRQb3NpdGlvbih4LCB5LCB6KTtcbiAgICAgICAgICAgIGFjdGl2ZU5vZGUucGFubmVyLnBhbm5pbmdNb2RlbCA9IHNlbGYuX21vZGVsIHx8ICdIUlRGJztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBzZWxmLl9wb3MzZDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZhZGUgYSBjdXJyZW50bHkgcGxheWluZyBzb3VuZCBiZXR3ZWVuIHR3byB2b2x1bWVzLlxuICAgICAqIEBwYXJhbSAge051bWJlcn0gICBmcm9tICAgICBUaGUgdm9sdW1lIHRvIGZhZGUgZnJvbSAoMC4wIHRvIDEuMCkuXG4gICAgICogQHBhcmFtICB7TnVtYmVyfSAgIHRvICAgICAgIFRoZSB2b2x1bWUgdG8gZmFkZSB0byAoMC4wIHRvIDEuMCkuXG4gICAgICogQHBhcmFtICB7TnVtYmVyfSAgIGxlbiAgICAgIFRpbWUgaW4gbWlsbGlzZWNvbmRzIHRvIGZhZGUuXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIChvcHRpb25hbCkgRmlyZWQgd2hlbiB0aGUgZmFkZSBpcyBjb21wbGV0ZS5cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9ICAgaWQgICAgICAgKG9wdGlvbmFsKSBUaGUgcGxheSBpbnN0YW5jZSBJRC5cbiAgICAgKiBAcmV0dXJuIHtIb3dsfVxuICAgICAqL1xuICAgIGZhZGU6IGZ1bmN0aW9uKGZyb20sIHRvLCBsZW4sIGNhbGxiYWNrLCBpZCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICBkaWZmID0gTWF0aC5hYnMoZnJvbSAtIHRvKSxcbiAgICAgICAgZGlyID0gZnJvbSA+IHRvID8gJ2Rvd24nIDogJ3VwJyxcbiAgICAgICAgc3RlcHMgPSBkaWZmIC8gMC4wMSxcbiAgICAgICAgc3RlcFRpbWUgPSBsZW4gLyBzdGVwcztcblxuICAgICAgLy8gaWYgdGhlIHNvdW5kIGhhc24ndCBiZWVuIGxvYWRlZCwgYWRkIGl0IHRvIHRoZSBldmVudCBxdWV1ZVxuICAgICAgaWYgKCFzZWxmLl9sb2FkZWQpIHtcbiAgICAgICAgc2VsZi5vbignbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNlbGYuZmFkZShmcm9tLCB0bywgbGVuLCBjYWxsYmFjaywgaWQpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgIH1cblxuICAgICAgLy8gc2V0IHRoZSB2b2x1bWUgdG8gdGhlIHN0YXJ0IHBvc2l0aW9uXG4gICAgICBzZWxmLnZvbHVtZShmcm9tLCBpZCk7XG5cbiAgICAgIGZvciAodmFyIGk9MTsgaTw9c3RlcHM7IGkrKykge1xuICAgICAgICAoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGNoYW5nZSA9IHNlbGYuX3ZvbHVtZSArIChkaXIgPT09ICd1cCcgPyAwLjAxIDogLTAuMDEpICogaSxcbiAgICAgICAgICAgIHZvbCA9IE1hdGgucm91bmQoMTAwMCAqIGNoYW5nZSkgLyAxMDAwLFxuICAgICAgICAgICAgdG9Wb2wgPSB0bztcblxuICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzZWxmLnZvbHVtZSh2b2wsIGlkKTtcblxuICAgICAgICAgICAgaWYgKHZvbCA9PT0gdG9Wb2wpIHtcbiAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIHN0ZXBUaW1lICogaSk7XG4gICAgICAgIH0pKCk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFtERVBSRUNBVEVEXSBGYWRlIGluIHRoZSBjdXJyZW50IHNvdW5kLlxuICAgICAqIEBwYXJhbSAge0Zsb2F0fSAgICB0byAgICAgIFZvbHVtZSB0byBmYWRlIHRvICgwLjAgdG8gMS4wKS5cbiAgICAgKiBAcGFyYW0gIHtOdW1iZXJ9ICAgbGVuICAgICBUaW1lIGluIG1pbGxpc2Vjb25kcyB0byBmYWRlLlxuICAgICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqIEByZXR1cm4ge0hvd2x9XG4gICAgICovXG4gICAgZmFkZUluOiBmdW5jdGlvbih0bywgbGVuLCBjYWxsYmFjaykge1xuICAgICAgcmV0dXJuIHRoaXMudm9sdW1lKDApLnBsYXkoKS5mYWRlKDAsIHRvLCBsZW4sIGNhbGxiYWNrKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogW0RFUFJFQ0FURURdIEZhZGUgb3V0IHRoZSBjdXJyZW50IHNvdW5kIGFuZCBwYXVzZSB3aGVuIGZpbmlzaGVkLlxuICAgICAqIEBwYXJhbSAge0Zsb2F0fSAgICB0byAgICAgICBWb2x1bWUgdG8gZmFkZSB0byAoMC4wIHRvIDEuMCkuXG4gICAgICogQHBhcmFtICB7TnVtYmVyfSAgIGxlbiAgICAgIFRpbWUgaW4gbWlsbGlzZWNvbmRzIHRvIGZhZGUuXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSAgIGlkICAgICAgIChvcHRpb25hbCkgVGhlIHBsYXkgaW5zdGFuY2UgSUQuXG4gICAgICogQHJldHVybiB7SG93bH1cbiAgICAgKi9cbiAgICBmYWRlT3V0OiBmdW5jdGlvbih0bywgbGVuLCBjYWxsYmFjaywgaWQpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgcmV0dXJuIHNlbGYuZmFkZShzZWxmLl92b2x1bWUsIHRvLCBsZW4sIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKCk7XG4gICAgICAgIHNlbGYucGF1c2UoaWQpO1xuXG4gICAgICAgIC8vIGZpcmUgZW5kZWQgZXZlbnRcbiAgICAgICAgc2VsZi5vbignZW5kJyk7XG4gICAgICB9LCBpZCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBhbiBhdWRpbyBub2RlIGJ5IElELlxuICAgICAqIEByZXR1cm4ge0hvd2x9IEF1ZGlvIG5vZGUuXG4gICAgICovXG4gICAgX25vZGVCeUlkOiBmdW5jdGlvbihpZCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICBub2RlID0gc2VsZi5fYXVkaW9Ob2RlWzBdO1xuXG4gICAgICAvLyBmaW5kIHRoZSBub2RlIHdpdGggdGhpcyBJRFxuICAgICAgZm9yICh2YXIgaT0wOyBpPHNlbGYuX2F1ZGlvTm9kZS5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoc2VsZi5fYXVkaW9Ob2RlW2ldLmlkID09PSBpZCkge1xuICAgICAgICAgIG5vZGUgPSBzZWxmLl9hdWRpb05vZGVbaV07XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgZmlyc3QgYWN0aXZlIGF1ZGlvIG5vZGUuXG4gICAgICogQHJldHVybiB7SG93bH0gQXVkaW8gbm9kZS5cbiAgICAgKi9cbiAgICBfYWN0aXZlTm9kZTogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgIG5vZGUgPSBudWxsO1xuXG4gICAgICAvLyBmaW5kIHRoZSBmaXJzdCBwbGF5aW5nIG5vZGVcbiAgICAgIGZvciAodmFyIGk9MDsgaTxzZWxmLl9hdWRpb05vZGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKCFzZWxmLl9hdWRpb05vZGVbaV0ucGF1c2VkKSB7XG4gICAgICAgICAgbm9kZSA9IHNlbGYuX2F1ZGlvTm9kZVtpXTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyByZW1vdmUgZXhjZXNzIGluYWN0aXZlIG5vZGVzXG4gICAgICBzZWxmLl9kcmFpblBvb2woKTtcblxuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgZmlyc3QgaW5hY3RpdmUgYXVkaW8gbm9kZS5cbiAgICAgKiBJZiB0aGVyZSBpcyBub25lLCBjcmVhdGUgYSBuZXcgb25lIGFuZCBhZGQgaXQgdG8gdGhlIHBvb2wuXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgYXVkaW8gbm9kZSBpcyByZWFkeS5cbiAgICAgKi9cbiAgICBfaW5hY3RpdmVOb2RlOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICBub2RlID0gbnVsbDtcblxuICAgICAgLy8gZmluZCBmaXJzdCBpbmFjdGl2ZSBub2RlIHRvIHJlY3ljbGVcbiAgICAgIGZvciAodmFyIGk9MDsgaTxzZWxmLl9hdWRpb05vZGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHNlbGYuX2F1ZGlvTm9kZVtpXS5wYXVzZWQgJiYgc2VsZi5fYXVkaW9Ob2RlW2ldLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAvLyBzZW5kIHRoZSBub2RlIGJhY2sgZm9yIHVzZSBieSB0aGUgbmV3IHBsYXkgaW5zdGFuY2VcbiAgICAgICAgICBjYWxsYmFjayhzZWxmLl9hdWRpb05vZGVbaV0pO1xuICAgICAgICAgIG5vZGUgPSB0cnVlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHJlbW92ZSBleGNlc3MgaW5hY3RpdmUgbm9kZXNcbiAgICAgIHNlbGYuX2RyYWluUG9vbCgpO1xuXG4gICAgICBpZiAobm9kZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGNyZWF0ZSBuZXcgbm9kZSBpZiB0aGVyZSBhcmUgbm8gaW5hY3RpdmVzXG4gICAgICB2YXIgbmV3Tm9kZTtcbiAgICAgIGlmIChzZWxmLl93ZWJBdWRpbykge1xuICAgICAgICBuZXdOb2RlID0gc2VsZi5fc2V0dXBBdWRpb05vZGUoKTtcbiAgICAgICAgY2FsbGJhY2sobmV3Tm9kZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxmLmxvYWQoKTtcbiAgICAgICAgbmV3Tm9kZSA9IHNlbGYuX2F1ZGlvTm9kZVtzZWxmLl9hdWRpb05vZGUubGVuZ3RoIC0gMV07XG5cbiAgICAgICAgLy8gbGlzdGVuIGZvciB0aGUgY29ycmVjdCBsb2FkIGV2ZW50IGFuZCBmaXJlIHRoZSBjYWxsYmFja1xuICAgICAgICB2YXIgbGlzdGVuZXJFdmVudCA9IG5hdmlnYXRvci5pc0NvY29vbkpTID8gJ2NhbnBsYXl0aHJvdWdoJyA6ICdsb2FkZWRtZXRhZGF0YSc7XG4gICAgICAgIHZhciBsaXN0ZW5lciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG5ld05vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihsaXN0ZW5lckV2ZW50LCBsaXN0ZW5lciwgZmFsc2UpO1xuICAgICAgICAgIGNhbGxiYWNrKG5ld05vZGUpO1xuICAgICAgICB9O1xuICAgICAgICBuZXdOb2RlLmFkZEV2ZW50TGlzdGVuZXIobGlzdGVuZXJFdmVudCwgbGlzdGVuZXIsIGZhbHNlKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSWYgdGhlcmUgYXJlIG1vcmUgdGhhbiA1IGluYWN0aXZlIGF1ZGlvIG5vZGVzIGluIHRoZSBwb29sLCBjbGVhciBvdXQgdGhlIHJlc3QuXG4gICAgICovXG4gICAgX2RyYWluUG9vbDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgIGluYWN0aXZlID0gMCxcbiAgICAgICAgaTtcblxuICAgICAgLy8gY291bnQgdGhlIG51bWJlciBvZiBpbmFjdGl2ZSBub2Rlc1xuICAgICAgZm9yIChpPTA7IGk8c2VsZi5fYXVkaW9Ob2RlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChzZWxmLl9hdWRpb05vZGVbaV0ucGF1c2VkKSB7XG4gICAgICAgICAgaW5hY3RpdmUrKztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyByZW1vdmUgZXhjZXNzIGluYWN0aXZlIG5vZGVzXG4gICAgICBmb3IgKGk9c2VsZi5fYXVkaW9Ob2RlLmxlbmd0aC0xOyBpPj0wOyBpLS0pIHtcbiAgICAgICAgaWYgKGluYWN0aXZlIDw9IDUpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzZWxmLl9hdWRpb05vZGVbaV0ucGF1c2VkKSB7XG4gICAgICAgICAgLy8gZGlzY29ubmVjdCB0aGUgYXVkaW8gc291cmNlIGlmIHVzaW5nIFdlYiBBdWRpb1xuICAgICAgICAgIGlmIChzZWxmLl93ZWJBdWRpbykge1xuICAgICAgICAgICAgc2VsZi5fYXVkaW9Ob2RlW2ldLmRpc2Nvbm5lY3QoMCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaW5hY3RpdmUtLTtcbiAgICAgICAgICBzZWxmLl9hdWRpb05vZGUuc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFyICdvbmVuZCcgdGltZW91dCBiZWZvcmUgaXQgZW5kcy5cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IHNvdW5kSWQgIFRoZSBwbGF5IGluc3RhbmNlIElELlxuICAgICAqL1xuICAgIF9jbGVhckVuZFRpbWVyOiBmdW5jdGlvbihzb3VuZElkKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgIGluZGV4ID0gLTE7XG5cbiAgICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgdGltZXJzIHRvIGZpbmQgdGhlIG9uZSBhc3NvY2lhdGVkIHdpdGggdGhpcyBzb3VuZFxuICAgICAgZm9yICh2YXIgaT0wOyBpPHNlbGYuX29uZW5kVGltZXIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHNlbGYuX29uZW5kVGltZXJbaV0uaWQgPT09IHNvdW5kSWQpIHtcbiAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIHRpbWVyID0gc2VsZi5fb25lbmRUaW1lcltpbmRleF07XG4gICAgICBpZiAodGltZXIpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyLnRpbWVyKTtcbiAgICAgICAgc2VsZi5fb25lbmRUaW1lci5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXR1cCB0aGUgZ2FpbiBub2RlIGFuZCBwYW5uZXIgZm9yIGEgV2ViIEF1ZGlvIGluc3RhbmNlLlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gVGhlIG5ldyBhdWRpbyBub2RlLlxuICAgICAqL1xuICAgIF9zZXR1cEF1ZGlvTm9kZTogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgIG5vZGUgPSBzZWxmLl9hdWRpb05vZGUsXG4gICAgICAgIGluZGV4ID0gc2VsZi5fYXVkaW9Ob2RlLmxlbmd0aDtcblxuICAgICAgLy8gY3JlYXRlIGdhaW4gbm9kZVxuICAgICAgbm9kZVtpbmRleF0gPSAodHlwZW9mIGN0eC5jcmVhdGVHYWluID09PSAndW5kZWZpbmVkJykgPyBjdHguY3JlYXRlR2Fpbk5vZGUoKSA6IGN0eC5jcmVhdGVHYWluKCk7XG4gICAgICBub2RlW2luZGV4XS5nYWluLnZhbHVlID0gc2VsZi5fdm9sdW1lO1xuICAgICAgbm9kZVtpbmRleF0ucGF1c2VkID0gdHJ1ZTtcbiAgICAgIG5vZGVbaW5kZXhdLl9wb3MgPSAwO1xuICAgICAgbm9kZVtpbmRleF0ucmVhZHlTdGF0ZSA9IDQ7XG4gICAgICBub2RlW2luZGV4XS5jb25uZWN0KG1hc3RlckdhaW4pO1xuXG4gICAgICAvLyBjcmVhdGUgdGhlIHBhbm5lclxuICAgICAgbm9kZVtpbmRleF0ucGFubmVyID0gY3R4LmNyZWF0ZVBhbm5lcigpO1xuICAgICAgbm9kZVtpbmRleF0ucGFubmVyLnBhbm5pbmdNb2RlbCA9IHNlbGYuX21vZGVsIHx8ICdlcXVhbHBvd2VyJztcbiAgICAgIG5vZGVbaW5kZXhdLnBhbm5lci5zZXRQb3NpdGlvbihzZWxmLl9wb3MzZFswXSwgc2VsZi5fcG9zM2RbMV0sIHNlbGYuX3BvczNkWzJdKTtcbiAgICAgIG5vZGVbaW5kZXhdLnBhbm5lci5jb25uZWN0KG5vZGVbaW5kZXhdKTtcblxuICAgICAgcmV0dXJuIG5vZGVbaW5kZXhdO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsL3NldCBjdXN0b20gZXZlbnRzLlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gICBldmVudCBFdmVudCB0eXBlLlxuICAgICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiAgICBGdW5jdGlvbiB0byBjYWxsLlxuICAgICAqIEByZXR1cm4ge0hvd2x9XG4gICAgICovXG4gICAgb246IGZ1bmN0aW9uKGV2ZW50LCBmbikge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICBldmVudHMgPSBzZWxmWydfb24nICsgZXZlbnRdO1xuXG4gICAgICBpZiAodHlwZW9mIGZuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGV2ZW50cy5wdXNoKGZuKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxldmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoZm4pIHtcbiAgICAgICAgICAgIGV2ZW50c1tpXS5jYWxsKHNlbGYsIGZuKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXZlbnRzW2ldLmNhbGwoc2VsZik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZWxmO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmUgYSBjdXN0b20gZXZlbnQuXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSAgIGV2ZW50IEV2ZW50IHR5cGUuXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuICAgIExpc3RlbmVyIHRvIHJlbW92ZS5cbiAgICAgKiBAcmV0dXJuIHtIb3dsfVxuICAgICAqL1xuICAgIG9mZjogZnVuY3Rpb24oZXZlbnQsIGZuKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgIGV2ZW50cyA9IHNlbGZbJ19vbicgKyBldmVudF07XG5cbiAgICAgIGlmIChmbikge1xuICAgICAgICAvLyBsb29wIHRocm91Z2ggZnVuY3Rpb25zIGluIHRoZSBldmVudCBmb3IgY29tcGFyaXNvblxuICAgICAgICBmb3IgKHZhciBpPTA7IGk8ZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKGZuID09PSBldmVudHNbaV0pIHtcbiAgICAgICAgICAgIGV2ZW50cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGZbJ19vbicgKyBldmVudF0gPSBbXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVubG9hZCBhbmQgZGVzdHJveSB0aGUgY3VycmVudCBIb3dsIG9iamVjdC5cbiAgICAgKiBUaGlzIHdpbGwgaW1tZWRpYXRlbHkgc3RvcCBhbGwgcGxheSBpbnN0YW5jZXMgYXR0YWNoZWQgdG8gdGhpcyBzb3VuZC5cbiAgICAgKi9cbiAgICB1bmxvYWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAvLyBzdG9wIHBsYXlpbmcgYW55IGFjdGl2ZSBub2Rlc1xuICAgICAgdmFyIG5vZGVzID0gc2VsZi5fYXVkaW9Ob2RlO1xuICAgICAgZm9yICh2YXIgaT0wOyBpPHNlbGYuX2F1ZGlvTm9kZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAvLyBzdG9wIHRoZSBzb3VuZCBpZiBpdCBpcyBjdXJyZW50bHkgcGxheWluZ1xuICAgICAgICBpZiAoIW5vZGVzW2ldLnBhdXNlZCkge1xuICAgICAgICAgIHNlbGYuc3RvcChub2Rlc1tpXS5pZCk7XG4gICAgICAgICAgc2VsZi5vbignZW5kJywgbm9kZXNbaV0uaWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFzZWxmLl93ZWJBdWRpbykge1xuICAgICAgICAgIC8vIHJlbW92ZSB0aGUgc291cmNlIGlmIHVzaW5nIEhUTUw1IEF1ZGlvXG4gICAgICAgICAgbm9kZXNbaV0uc3JjID0gJyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gZGlzY29ubmVjdCB0aGUgb3V0cHV0IGZyb20gdGhlIG1hc3RlciBnYWluXG4gICAgICAgICAgbm9kZXNbaV0uZGlzY29ubmVjdCgwKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBtYWtlIHN1cmUgYWxsIHRpbWVvdXRzIGFyZSBjbGVhcmVkXG4gICAgICBmb3IgKGk9MDsgaTxzZWxmLl9vbmVuZFRpbWVyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChzZWxmLl9vbmVuZFRpbWVyW2ldLnRpbWVyKTtcbiAgICAgIH1cblxuICAgICAgLy8gcmVtb3ZlIHRoZSByZWZlcmVuY2UgaW4gdGhlIGdsb2JhbCBIb3dsZXIgb2JqZWN0XG4gICAgICB2YXIgaW5kZXggPSBIb3dsZXIuX2hvd2xzLmluZGV4T2Yoc2VsZik7XG4gICAgICBpZiAoaW5kZXggIT09IG51bGwgJiYgaW5kZXggPj0gMCkge1xuICAgICAgICBIb3dsZXIuX2hvd2xzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICB9XG5cbiAgICAgIC8vIGRlbGV0ZSB0aGlzIHNvdW5kIGZyb20gdGhlIGNhY2hlXG4gICAgICBkZWxldGUgY2FjaGVbc2VsZi5fc3JjXTtcbiAgICAgIHNlbGYgPSBudWxsO1xuICAgIH1cblxuICB9O1xuXG4gIC8vIG9ubHkgZGVmaW5lIHRoZXNlIGZ1bmN0aW9ucyB3aGVuIHVzaW5nIFdlYkF1ZGlvXG4gIGlmICh1c2luZ1dlYkF1ZGlvKSB7XG5cbiAgICAvKipcbiAgICAgKiBCdWZmZXIgYSBzb3VuZCBmcm9tIFVSTCAob3IgZnJvbSBjYWNoZSkgYW5kIGRlY29kZSB0byBhdWRpbyBzb3VyY2UgKFdlYiBBdWRpbyBBUEkpLlxuICAgICAqIEBwYXJhbSAge09iamVjdH0gb2JqIFRoZSBIb3dsIG9iamVjdCBmb3IgdGhlIHNvdW5kIHRvIGxvYWQuXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSB1cmwgVGhlIHBhdGggdG8gdGhlIHNvdW5kIGZpbGUuXG4gICAgICovXG4gICAgdmFyIGxvYWRCdWZmZXIgPSBmdW5jdGlvbihvYmosIHVybCkge1xuICAgICAgLy8gY2hlY2sgaWYgdGhlIGJ1ZmZlciBoYXMgYWxyZWFkeSBiZWVuIGNhY2hlZFxuICAgICAgaWYgKHVybCBpbiBjYWNoZSkge1xuICAgICAgICAvLyBzZXQgdGhlIGR1cmF0aW9uIGZyb20gdGhlIGNhY2hlXG4gICAgICAgIG9iai5fZHVyYXRpb24gPSBjYWNoZVt1cmxdLmR1cmF0aW9uO1xuXG4gICAgICAgIC8vIGxvYWQgdGhlIHNvdW5kIGludG8gdGhpcyBvYmplY3RcbiAgICAgICAgbG9hZFNvdW5kKG9iaik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKC9eZGF0YTpbXjtdKztiYXNlNjQsLy50ZXN0KHVybCkpIHtcbiAgICAgICAgLy8gRGVjb2RlIGJhc2U2NCBkYXRhLVVSSXMgYmVjYXVzZSBzb21lIGJyb3dzZXJzIGNhbm5vdCBsb2FkIGRhdGEtVVJJcyB3aXRoIFhNTEh0dHBSZXF1ZXN0LlxuICAgICAgICB2YXIgZGF0YSA9IGF0b2IodXJsLnNwbGl0KCcsJylbMV0pO1xuICAgICAgICB2YXIgZGF0YVZpZXcgPSBuZXcgVWludDhBcnJheShkYXRhLmxlbmd0aCk7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxkYXRhLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgZGF0YVZpZXdbaV0gPSBkYXRhLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGRlY29kZUF1ZGlvRGF0YShkYXRhVmlldy5idWZmZXIsIG9iaiwgdXJsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGxvYWQgdGhlIGJ1ZmZlciBmcm9tIHRoZSBVUkxcbiAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICB4aHIub3BlbignR0VUJywgdXJsLCB0cnVlKTtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBkZWNvZGVBdWRpb0RhdGEoeGhyLnJlc3BvbnNlLCBvYmosIHVybCk7XG4gICAgICAgIH07XG4gICAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgLy8gaWYgdGhlcmUgaXMgYW4gZXJyb3IsIHN3aXRjaCB0aGUgc291bmQgdG8gSFRNTCBBdWRpb1xuICAgICAgICAgIGlmIChvYmouX3dlYkF1ZGlvKSB7XG4gICAgICAgICAgICBvYmouX2J1ZmZlciA9IHRydWU7XG4gICAgICAgICAgICBvYmouX3dlYkF1ZGlvID0gZmFsc2U7XG4gICAgICAgICAgICBvYmouX2F1ZGlvTm9kZSA9IFtdO1xuICAgICAgICAgICAgZGVsZXRlIG9iai5fZ2Fpbk5vZGU7XG4gICAgICAgICAgICBkZWxldGUgY2FjaGVbdXJsXTtcbiAgICAgICAgICAgIG9iai5sb2FkKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHhoci5zZW5kKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICB4aHIub25lcnJvcigpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERlY29kZSBhdWRpbyBkYXRhIGZyb20gYW4gYXJyYXkgYnVmZmVyLlxuICAgICAqIEBwYXJhbSAge0FycmF5QnVmZmVyfSBhcnJheWJ1ZmZlciBUaGUgYXVkaW8gZGF0YS5cbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IG9iaiBUaGUgSG93bCBvYmplY3QgZm9yIHRoZSBzb3VuZCB0byBsb2FkLlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gdXJsIFRoZSBwYXRoIHRvIHRoZSBzb3VuZCBmaWxlLlxuICAgICAqL1xuICAgIHZhciBkZWNvZGVBdWRpb0RhdGEgPSBmdW5jdGlvbihhcnJheWJ1ZmZlciwgb2JqLCB1cmwpIHtcbiAgICAgIC8vIGRlY29kZSB0aGUgYnVmZmVyIGludG8gYW4gYXVkaW8gc291cmNlXG4gICAgICBjdHguZGVjb2RlQXVkaW9EYXRhKFxuICAgICAgICBhcnJheWJ1ZmZlcixcbiAgICAgICAgZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICAgICAgaWYgKGJ1ZmZlcikge1xuICAgICAgICAgICAgY2FjaGVbdXJsXSA9IGJ1ZmZlcjtcbiAgICAgICAgICAgIGxvYWRTb3VuZChvYmosIGJ1ZmZlcik7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICBvYmoub24oJ2xvYWRlcnJvcicsIGVycik7XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEZpbmlzaGVzIGxvYWRpbmcgdGhlIFdlYiBBdWRpbyBBUEkgc291bmQgYW5kIGZpcmVzIHRoZSBsb2FkZWQgZXZlbnRcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9ICBvYmogICAgVGhlIEhvd2wgb2JqZWN0IGZvciB0aGUgc291bmQgdG8gbG9hZC5cbiAgICAgKiBAcGFyYW0gIHtPYmplY2N0fSBidWZmZXIgVGhlIGRlY29kZWQgYnVmZmVyIHNvdW5kIHNvdXJjZS5cbiAgICAgKi9cbiAgICB2YXIgbG9hZFNvdW5kID0gZnVuY3Rpb24ob2JqLCBidWZmZXIpIHtcbiAgICAgIC8vIHNldCB0aGUgZHVyYXRpb25cbiAgICAgIG9iai5fZHVyYXRpb24gPSAoYnVmZmVyKSA/IGJ1ZmZlci5kdXJhdGlvbiA6IG9iai5fZHVyYXRpb247XG5cbiAgICAgIC8vIHNldHVwIGEgc3ByaXRlIGlmIG5vbmUgaXMgZGVmaW5lZFxuICAgICAgaWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9iai5fc3ByaXRlKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgb2JqLl9zcHJpdGUgPSB7X2RlZmF1bHQ6IFswLCBvYmouX2R1cmF0aW9uICogMTAwMF19O1xuICAgICAgfVxuXG4gICAgICAvLyBmaXJlIHRoZSBsb2FkZWQgZXZlbnRcbiAgICAgIGlmICghb2JqLl9sb2FkZWQpIHtcbiAgICAgICAgb2JqLl9sb2FkZWQgPSB0cnVlO1xuICAgICAgICBvYmoub24oJ2xvYWQnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9iai5fYXV0b3BsYXkpIHtcbiAgICAgICAgb2JqLnBsYXkoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogTG9hZCB0aGUgc291bmQgYmFjayBpbnRvIHRoZSBidWZmZXIgc291cmNlLlxuICAgICAqIEBwYXJhbSAge09iamVjdH0gb2JqICAgVGhlIHNvdW5kIHRvIGxvYWQuXG4gICAgICogQHBhcmFtICB7QXJyYXl9ICBsb29wICBMb29wIGJvb2xlYW4sIHBvcywgYW5kIGR1cmF0aW9uLlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gaWQgICAgKG9wdGlvbmFsKSBUaGUgcGxheSBpbnN0YW5jZSBJRC5cbiAgICAgKi9cbiAgICB2YXIgcmVmcmVzaEJ1ZmZlciA9IGZ1bmN0aW9uKG9iaiwgbG9vcCwgaWQpIHtcbiAgICAgIC8vIGRldGVybWluZSB3aGljaCBub2RlIHRvIGNvbm5lY3QgdG9cbiAgICAgIHZhciBub2RlID0gb2JqLl9ub2RlQnlJZChpZCk7XG5cbiAgICAgIC8vIHNldHVwIHRoZSBidWZmZXIgc291cmNlIGZvciBwbGF5YmFja1xuICAgICAgbm9kZS5idWZmZXJTb3VyY2UgPSBjdHguY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgICBub2RlLmJ1ZmZlclNvdXJjZS5idWZmZXIgPSBjYWNoZVtvYmouX3NyY107XG4gICAgICBub2RlLmJ1ZmZlclNvdXJjZS5jb25uZWN0KG5vZGUucGFubmVyKTtcbiAgICAgIG5vZGUuYnVmZmVyU291cmNlLmxvb3AgPSBsb29wWzBdO1xuICAgICAgaWYgKGxvb3BbMF0pIHtcbiAgICAgICAgbm9kZS5idWZmZXJTb3VyY2UubG9vcFN0YXJ0ID0gbG9vcFsxXTtcbiAgICAgICAgbm9kZS5idWZmZXJTb3VyY2UubG9vcEVuZCA9IGxvb3BbMV0gKyBsb29wWzJdO1xuICAgICAgfVxuICAgICAgbm9kZS5idWZmZXJTb3VyY2UucGxheWJhY2tSYXRlLnZhbHVlID0gb2JqLl9yYXRlO1xuICAgIH07XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgc3VwcG9ydCBmb3IgQU1EIChBc3luY2hyb25vdXMgTW9kdWxlIERlZmluaXRpb24pIGxpYnJhcmllcyBzdWNoIGFzIHJlcXVpcmUuanMuXG4gICAqL1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgSG93bGVyOiBIb3dsZXIsXG4gICAgICAgIEhvd2w6IEhvd2xcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIHN1cHBvcnQgZm9yIENvbW1vbkpTIGxpYnJhcmllcyBzdWNoIGFzIGJyb3dzZXJpZnkuXG4gICAqL1xuICBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgZXhwb3J0cy5Ib3dsZXIgPSBIb3dsZXI7XG4gICAgZXhwb3J0cy5Ib3dsID0gSG93bDtcbiAgfVxuXG4gIC8vIGRlZmluZSBnbG9iYWxseSBpbiBjYXNlIEFNRCBpcyBub3QgYXZhaWxhYmxlIG9yIGF2YWlsYWJsZSBidXQgbm90IHVzZWRcblxuICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB3aW5kb3cuSG93bGVyID0gSG93bGVyO1xuICAgIHdpbmRvdy5Ib3dsID0gSG93bDtcbiAgfVxuXG59KSgpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnVZVzFsY3lJNlcxMHNJbTFoY0hCcGJtZHpJam9pSWl3aWMyOTFjbU5sY3lJNld5SjJaVzVrYjNJdmFHOTNiR1Z5TG1weklsMHNJbk52ZFhKalpYTkRiMjUwWlc1MElqcGJJaThxSVZ4dUlDb2dJR2h2ZDJ4bGNpNXFjeUIyTVM0eExqSTVYRzRnS2lBZ2FHOTNiR1Z5YW5NdVkyOXRYRzRnS2x4dUlDb2dJQ2hqS1NBeU1ERXpMVEl3TVRZc0lFcGhiV1Z6SUZOcGJYQnpiMjRnYjJZZ1IyOXNaRVpwY21VZ1UzUjFaR2x2YzF4dUlDb2dJR2R2YkdSbWFYSmxjM1IxWkdsdmN5NWpiMjFjYmlBcVhHNGdLaUFnVFVsVUlFeHBZMlZ1YzJWY2JpQXFMMXh1WEc0b1puVnVZM1JwYjI0b0tTQjdYRzRnSUM4dklITmxkSFZ3WEc0Z0lIWmhjaUJqWVdOb1pTQTlJSHQ5TzF4dVhHNGdJQzh2SUhObGRIVndJSFJvWlNCaGRXUnBieUJqYjI1MFpYaDBYRzRnSUhaaGNpQmpkSGdnUFNCdWRXeHNMRnh1SUNBZ0lIVnphVzVuVjJWaVFYVmthVzhnUFNCMGNuVmxMRnh1SUNBZ0lHNXZRWFZrYVc4Z1BTQm1ZV3h6WlR0Y2JpQWdkSEo1SUh0Y2JpQWdJQ0JwWmlBb2RIbHdaVzltSUVGMVpHbHZRMjl1ZEdWNGRDQWhQVDBnSjNWdVpHVm1hVzVsWkNjcElIdGNiaUFnSUNBZ0lHTjBlQ0E5SUc1bGR5QkJkV1JwYjBOdmJuUmxlSFFvS1R0Y2JpQWdJQ0I5SUdWc2MyVWdhV1lnS0hSNWNHVnZaaUIzWldKcmFYUkJkV1JwYjBOdmJuUmxlSFFnSVQwOUlDZDFibVJsWm1sdVpXUW5LU0I3WEc0Z0lDQWdJQ0JqZEhnZ1BTQnVaWGNnZDJWaWEybDBRWFZrYVc5RGIyNTBaWGgwS0NrN1hHNGdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJSFZ6YVc1blYyVmlRWFZrYVc4Z1BTQm1ZV3h6WlR0Y2JpQWdJQ0I5WEc0Z0lIMGdZMkYwWTJnb1pTa2dlMXh1SUNBZ0lIVnphVzVuVjJWaVFYVmthVzhnUFNCbVlXeHpaVHRjYmlBZ2ZWeHVYRzRnSUdsbUlDZ2hkWE5wYm1kWFpXSkJkV1JwYnlrZ2UxeHVJQ0FnSUdsbUlDaDBlWEJsYjJZZ1FYVmthVzhnSVQwOUlDZDFibVJsWm1sdVpXUW5LU0I3WEc0Z0lDQWdJQ0IwY25rZ2UxeHVJQ0FnSUNBZ0lDQnVaWGNnUVhWa2FXOG9LVHRjYmlBZ0lDQWdJSDBnWTJGMFkyZ29aU2tnZTF4dUlDQWdJQ0FnSUNCdWIwRjFaR2x2SUQwZ2RISjFaVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ2JtOUJkV1JwYnlBOUlIUnlkV1U3WEc0Z0lDQWdmVnh1SUNCOVhHNWNiaUFnTHk4Z1kzSmxZWFJsSUdFZ2JXRnpkR1Z5SUdkaGFXNGdibTlrWlZ4dUlDQnBaaUFvZFhOcGJtZFhaV0pCZFdScGJ5a2dlMXh1SUNBZ0lIWmhjaUJ0WVhOMFpYSkhZV2x1SUQwZ0tIUjVjR1Z2WmlCamRIZ3VZM0psWVhSbFIyRnBiaUE5UFQwZ0ozVnVaR1ZtYVc1bFpDY3BJRDhnWTNSNExtTnlaV0YwWlVkaGFXNU9iMlJsS0NrZ09pQmpkSGd1WTNKbFlYUmxSMkZwYmlncE8xeHVJQ0FnSUcxaGMzUmxja2RoYVc0dVoyRnBiaTUyWVd4MVpTQTlJREU3WEc0Z0lDQWdiV0Z6ZEdWeVIyRnBiaTVqYjI1dVpXTjBLR04wZUM1a1pYTjBhVzVoZEdsdmJpazdYRzRnSUgxY2JseHVJQ0F2THlCamNtVmhkR1VnWjJ4dlltRnNJR052Ym5SeWIyeHNaWEpjYmlBZ2RtRnlJRWh2ZDJ4bGNrZHNiMkpoYkNBOUlHWjFibU4wYVc5dUtHTnZaR1ZqY3lrZ2UxeHVJQ0FnSUhSb2FYTXVYM1p2YkhWdFpTQTlJREU3WEc0Z0lDQWdkR2hwY3k1ZmJYVjBaV1FnUFNCbVlXeHpaVHRjYmlBZ0lDQjBhR2x6TG5WemFXNW5WMlZpUVhWa2FXOGdQU0IxYzJsdVoxZGxZa0YxWkdsdk8xeHVJQ0FnSUhSb2FYTXVZM1I0SUQwZ1kzUjRPMXh1SUNBZ0lIUm9hWE11Ym05QmRXUnBieUE5SUc1dlFYVmthVzg3WEc0Z0lDQWdkR2hwY3k1ZmFHOTNiSE1nUFNCYlhUdGNiaUFnSUNCMGFHbHpMbDlqYjJSbFkzTWdQU0JqYjJSbFkzTTdYRzRnSUNBZ2RHaHBjeTVwVDFOQmRYUnZSVzVoWW14bElEMGdkSEoxWlR0Y2JpQWdmVHRjYmlBZ1NHOTNiR1Z5UjJ4dlltRnNMbkJ5YjNSdmRIbHdaU0E5SUh0Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCSFpYUXZjMlYwSUhSb1pTQm5iRzlpWVd3Z2RtOXNkVzFsSUdadmNpQmhiR3dnYzI5MWJtUnpMbHh1SUNBZ0lDQXFJRUJ3WVhKaGJTQWdlMFpzYjJGMGZTQjJiMndnVm05c2RXMWxJR1p5YjIwZ01DNHdJSFJ2SURFdU1DNWNiaUFnSUNBZ0tpQkFjbVYwZFhKdUlIdEliM2RzWlhJdlJteHZZWFI5SUNBZ0lDQlNaWFIxY201eklITmxiR1lnYjNJZ1kzVnljbVZ1ZENCMmIyeDFiV1V1WEc0Z0lDQWdJQ292WEc0Z0lDQWdkbTlzZFcxbE9pQm1kVzVqZEdsdmJpaDJiMndwSUh0Y2JpQWdJQ0FnSUhaaGNpQnpaV3htSUQwZ2RHaHBjenRjYmx4dUlDQWdJQ0FnTHk4Z2JXRnJaU0J6ZFhKbElIWnZiSFZ0WlNCcGN5QmhJRzUxYldKbGNseHVJQ0FnSUNBZ2RtOXNJRDBnY0dGeWMyVkdiRzloZENoMmIyd3BPMXh1WEc0Z0lDQWdJQ0JwWmlBb2RtOXNJRDQ5SURBZ0ppWWdkbTlzSUR3OUlERXBJSHRjYmlBZ0lDQWdJQ0FnYzJWc1ppNWZkbTlzZFcxbElEMGdkbTlzTzF4dVhHNGdJQ0FnSUNBZ0lHbG1JQ2gxYzJsdVoxZGxZa0YxWkdsdktTQjdYRzRnSUNBZ0lDQWdJQ0FnYldGemRHVnlSMkZwYmk1bllXbHVMblpoYkhWbElEMGdkbTlzTzF4dUlDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdMeThnYkc5dmNDQjBhSEp2ZFdkb0lHTmhZMmhsSUdGdVpDQmphR0Z1WjJVZ2RtOXNkVzFsSUc5bUlHRnNiQ0J1YjJSbGN5QjBhR0YwSUdGeVpTQjFjMmx1WnlCSVZFMU1OU0JCZFdScGIxeHVJQ0FnSUNBZ0lDQm1iM0lnS0haaGNpQnJaWGtnYVc0Z2MyVnNaaTVmYUc5M2JITXBJSHRjYmlBZ0lDQWdJQ0FnSUNCcFppQW9jMlZzWmk1ZmFHOTNiSE11YUdGelQzZHVVSEp2Y0dWeWRIa29hMlY1S1NBbUppQnpaV3htTGw5b2IzZHNjMXRyWlhsZExsOTNaV0pCZFdScGJ5QTlQVDBnWm1Gc2MyVXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDOHZJR3h2YjNBZ2RHaHliM1ZuYUNCMGFHVWdZWFZrYVc4Z2JtOWtaWE5jYmlBZ0lDQWdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHazlNRHNnYVR4elpXeG1MbDlvYjNkc2MxdHJaWGxkTGw5aGRXUnBiMDV2WkdVdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdjMlZzWmk1ZmFHOTNiSE5iYTJWNVhTNWZZWFZrYVc5T2IyUmxXMmxkTG5admJIVnRaU0E5SUhObGJHWXVYMmh2ZDJ4elcydGxlVjB1WDNadmJIVnRaU0FxSUhObGJHWXVYM1p2YkhWdFpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYzJWc1pqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnY21WMGRYSnVJSFJvWlNCamRYSnlaVzUwSUdkc2IySmhiQ0IyYjJ4MWJXVmNiaUFnSUNBZ0lISmxkSFZ5YmlBb2RYTnBibWRYWldKQmRXUnBieWtnUHlCdFlYTjBaWEpIWVdsdUxtZGhhVzR1ZG1Gc2RXVWdPaUJ6Wld4bUxsOTJiMngxYldVN1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUM4cUtseHVJQ0FnSUNBcUlFMTFkR1VnWVd4c0lITnZkVzVrY3k1Y2JpQWdJQ0FnS2lCQWNtVjBkWEp1SUh0SWIzZHNaWEo5WEc0Z0lDQWdJQ292WEc0Z0lDQWdiWFYwWlRvZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQjBhR2x6TGw5elpYUk5kWFJsWkNoMGNuVmxLVHRjYmx4dUlDQWdJQ0FnY21WMGRYSnVJSFJvYVhNN1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUM4cUtseHVJQ0FnSUNBcUlGVnViWFYwWlNCaGJHd2djMjkxYm1SekxseHVJQ0FnSUNBcUlFQnlaWFIxY200Z2UwaHZkMnhsY24xY2JpQWdJQ0FnS2k5Y2JpQWdJQ0IxYm0xMWRHVTZJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnZEdocGN5NWZjMlYwVFhWMFpXUW9abUZzYzJVcE8xeHVYRzRnSUNBZ0lDQnlaWFIxY200Z2RHaHBjenRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nU0dGdVpHeGxJRzExZEdsdVp5QmhibVFnZFc1dGRYUnBibWNnWjJ4dlltRnNiSGt1WEc0Z0lDQWdJQ29nUUhCaGNtRnRJQ0I3UW05dmJHVmhibjBnYlhWMFpXUWdTWE1nYlhWMFpXUWdiM0lnYm05MExseHVJQ0FnSUNBcUwxeHVJQ0FnSUY5elpYUk5kWFJsWkRvZ1puVnVZM1JwYjI0b2JYVjBaV1FwSUh0Y2JpQWdJQ0FnSUhaaGNpQnpaV3htSUQwZ2RHaHBjenRjYmx4dUlDQWdJQ0FnYzJWc1ppNWZiWFYwWldRZ1BTQnRkWFJsWkR0Y2JseHVJQ0FnSUNBZ2FXWWdLSFZ6YVc1blYyVmlRWFZrYVc4cElIdGNiaUFnSUNBZ0lDQWdiV0Z6ZEdWeVIyRnBiaTVuWVdsdUxuWmhiSFZsSUQwZ2JYVjBaV1FnUHlBd0lEb2djMlZzWmk1ZmRtOXNkVzFsTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCbWIzSWdLSFpoY2lCclpYa2dhVzRnYzJWc1ppNWZhRzkzYkhNcElIdGNiaUFnSUNBZ0lDQWdhV1lnS0hObGJHWXVYMmh2ZDJ4ekxtaGhjMDkzYmxCeWIzQmxjblI1S0d0bGVTa2dKaVlnYzJWc1ppNWZhRzkzYkhOYmEyVjVYUzVmZDJWaVFYVmthVzhnUFQwOUlHWmhiSE5sS1NCN1hHNGdJQ0FnSUNBZ0lDQWdMeThnYkc5dmNDQjBhSEp2ZFdkb0lIUm9aU0JoZFdScGJ5QnViMlJsYzF4dUlDQWdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHazlNRHNnYVR4elpXeG1MbDlvYjNkc2MxdHJaWGxkTGw5aGRXUnBiMDV2WkdVdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lITmxiR1l1WDJodmQyeHpXMnRsZVYwdVgyRjFaR2x2VG05a1pWdHBYUzV0ZFhSbFpDQTlJRzExZEdWa08xeHVJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnZlZ4dUlDQWdJSDBzWEc1Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCRGFHVmpheUJtYjNJZ1kyOWtaV01nYzNWd2NHOXlkQzVjYmlBZ0lDQWdLaUJBY0dGeVlXMGdJSHRUZEhKcGJtZDlJR1Y0ZENCQmRXUnBieUJtYVd4bElHVjRkR1Z1YzJsdmJpNWNiaUFnSUNBZ0tpQkFjbVYwZFhKdUlIdENiMjlzWldGdWZWeHVJQ0FnSUNBcUwxeHVJQ0FnSUdOdlpHVmpjem9nWm5WdVkzUnBiMjRvWlhoMEtTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2RHaHBjeTVmWTI5a1pXTnpXMlY0ZEYwN1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUM4cUtseHVJQ0FnSUNBcUlHbFBVeUIzYVd4c0lHOXViSGtnWVd4c2IzY2dZWFZrYVc4Z2RHOGdZbVVnY0d4aGVXVmtJR0ZtZEdWeUlHRWdkWE5sY2lCcGJuUmxjbUZqZEdsdmJpNWNiaUFnSUNBZ0tpQkJkSFJsYlhCMElIUnZJR0YxZEc5dFlYUnBZMkZzYkhrZ2RXNXNiMk5ySUdGMVpHbHZJRzl1SUhSb1pTQm1hWEp6ZENCMWMyVnlJR2x1ZEdWeVlXTjBhVzl1TGx4dUlDQWdJQ0FxSUVOdmJtTmxjSFFnWm5KdmJUb2dhSFIwY0RvdkwzQmhkV3hpWVd0aGRYTXVZMjl0TDNSMWRHOXlhV0ZzY3k5b2RHMXNOUzkzWldJdFlYVmthVzh0YjI0dGFXOXpMMXh1SUNBZ0lDQXFJRUJ5WlhSMWNtNGdlMGh2ZDJ4bGNuMWNiaUFnSUNBZ0tpOWNiaUFnSUNCZlpXNWhZbXhsYVU5VFFYVmthVzg2SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ2RtRnlJSE5sYkdZZ1BTQjBhR2x6TzF4dVhHNGdJQ0FnSUNBdkx5QnZibXg1SUhKMWJpQjBhR2x6SUc5dUlHbFBVeUJwWmlCaGRXUnBieUJwYzI0bmRDQmhiSEpsWVdSNUlHVmhibUpzWldSY2JpQWdJQ0FnSUdsbUlDaGpkSGdnSmlZZ0tITmxiR1l1WDJsUFUwVnVZV0pzWldRZ2ZId2dJUzlwVUdodmJtVjhhVkJoWkh4cFVHOWtMMmt1ZEdWemRDaHVZWFpwWjJGMGIzSXVkWE5sY2tGblpXNTBLU2twSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCelpXeG1MbDlwVDFORmJtRmliR1ZrSUQwZ1ptRnNjMlU3WEc1Y2JpQWdJQ0FnSUM4dklHTmhiR3dnZEdocGN5QnRaWFJvYjJRZ2IyNGdkRzkxWTJnZ2MzUmhjblFnZEc4Z1kzSmxZWFJsSUdGdVpDQndiR0Y1SUdFZ1luVm1abVZ5TEZ4dUlDQWdJQ0FnTHk4Z2RHaGxiaUJqYUdWamF5QnBaaUIwYUdVZ1lYVmthVzhnWVdOMGRXRnNiSGtnY0d4aGVXVmtJSFJ2SUdSbGRHVnliV2x1WlNCcFpseHVJQ0FnSUNBZ0x5OGdZWFZrYVc4Z2FHRnpJRzV2ZHlCaVpXVnVJSFZ1Ykc5amEyVmtJRzl1SUdsUFUxeHVJQ0FnSUNBZ2RtRnlJSFZ1Ykc5amF5QTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnSUNBdkx5QmpjbVZoZEdVZ1lXNGdaVzF3ZEhrZ1luVm1abVZ5WEc0Z0lDQWdJQ0FnSUhaaGNpQmlkV1ptWlhJZ1BTQmpkSGd1WTNKbFlYUmxRblZtWm1WeUtERXNJREVzSURJeU1EVXdLVHRjYmlBZ0lDQWdJQ0FnZG1GeUlITnZkWEpqWlNBOUlHTjBlQzVqY21WaGRHVkNkV1ptWlhKVGIzVnlZMlVvS1R0Y2JpQWdJQ0FnSUNBZ2MyOTFjbU5sTG1KMVptWmxjaUE5SUdKMVptWmxjanRjYmlBZ0lDQWdJQ0FnYzI5MWNtTmxMbU52Ym01bFkzUW9ZM1I0TG1SbGMzUnBibUYwYVc5dUtUdGNibHh1SUNBZ0lDQWdJQ0F2THlCd2JHRjVJSFJvWlNCbGJYQjBlU0JpZFdabVpYSmNiaUFnSUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUJ6YjNWeVkyVXVjM1JoY25RZ1BUMDlJQ2QxYm1SbFptbHVaV1FuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdjMjkxY21ObExtNXZkR1ZQYmlnd0tUdGNiaUFnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0J6YjNWeVkyVXVjM1JoY25Rb01DazdYRzRnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBdkx5QnpaWFIxY0NCaElIUnBiV1Z2ZFhRZ2RHOGdZMmhsWTJzZ2RHaGhkQ0IzWlNCaGNtVWdkVzVzYjJOclpXUWdiMjRnZEdobElHNWxlSFFnWlhabGJuUWdiRzl2Y0Z4dUlDQWdJQ0FnSUNCelpYUlVhVzFsYjNWMEtHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdJQ0FnSUdsbUlDZ29jMjkxY21ObExuQnNZWGxpWVdOclUzUmhkR1VnUFQwOUlITnZkWEpqWlM1UVRFRlpTVTVIWDFOVVFWUkZJSHg4SUhOdmRYSmpaUzV3YkdGNVltRmphMU4wWVhSbElEMDlQU0J6YjNWeVkyVXVSa2xPU1ZOSVJVUmZVMVJCVkVVcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QjFjR1JoZEdVZ2RHaGxJSFZ1Ykc5amEyVmtJSE4wWVhSbElHRnVaQ0J3Y21WMlpXNTBJSFJvYVhNZ1kyaGxZMnNnWm5KdmJTQm9ZWEJ3Wlc1cGJtY2dZV2RoYVc1Y2JpQWdJQ0FnSUNBZ0lDQWdJSE5sYkdZdVgybFBVMFZ1WVdKc1pXUWdQU0IwY25WbE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnYzJWc1ppNXBUMU5CZFhSdlJXNWhZbXhsSUQwZ1ptRnNjMlU3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUhKbGJXOTJaU0IwYUdVZ2RHOTFZMmdnYzNSaGNuUWdiR2x6ZEdWdVpYSmNiaUFnSUNBZ0lDQWdJQ0FnSUhkcGJtUnZkeTV5WlcxdmRtVkZkbVZ1ZEV4cGMzUmxibVZ5S0NkMGIzVmphR1Z1WkNjc0lIVnViRzlqYXl3Z1ptRnNjMlVwTzF4dUlDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmU3dnTUNrN1hHNGdJQ0FnSUNCOU8xeHVYRzRnSUNBZ0lDQXZMeUJ6WlhSMWNDQmhJSFJ2ZFdOb0lITjBZWEowSUd4cGMzUmxibVZ5SUhSdklHRjBkR1Z0Y0hRZ1lXNGdkVzVzYjJOcklHbHVYRzRnSUNBZ0lDQjNhVzVrYjNjdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnbmRHOTFZMmhsYm1RbkxDQjFibXh2WTJzc0lHWmhiSE5sS1R0Y2JseHVJQ0FnSUNBZ2NtVjBkWEp1SUhObGJHWTdYRzRnSUNBZ2ZWeHVJQ0I5TzF4dVhHNGdJQzh2SUdOb1pXTnJJR1p2Y2lCaWNtOTNjMlZ5SUdOdlpHVmpJSE4xY0hCdmNuUmNiaUFnZG1GeUlHRjFaR2x2VkdWemRDQTlJRzUxYkd3N1hHNGdJSFpoY2lCamIyUmxZM01nUFNCN2ZUdGNiaUFnYVdZZ0tDRnViMEYxWkdsdktTQjdYRzRnSUNBZ1lYVmthVzlVWlhOMElEMGdibVYzSUVGMVpHbHZLQ2s3WEc0Z0lDQWdZMjlrWldOeklEMGdlMXh1SUNBZ0lDQWdiWEF6T2lBaElXRjFaR2x2VkdWemRDNWpZVzVRYkdGNVZIbHdaU2duWVhWa2FXOHZiWEJsWnpzbktTNXlaWEJzWVdObEtDOWVibThrTHl3Z0p5Y3BMRnh1SUNBZ0lDQWdiM0IxY3pvZ0lTRmhkV1JwYjFSbGMzUXVZMkZ1VUd4aGVWUjVjR1VvSjJGMVpHbHZMMjluWnpzZ1kyOWtaV056UFZ3aWIzQjFjMXdpSnlrdWNtVndiR0ZqWlNndlhtNXZKQzhzSUNjbktTeGNiaUFnSUNBZ0lHOW5aem9nSVNGaGRXUnBiMVJsYzNRdVkyRnVVR3hoZVZSNWNHVW9KMkYxWkdsdkwyOW5aenNnWTI5a1pXTnpQVndpZG05eVltbHpYQ0luS1M1eVpYQnNZV05sS0M5ZWJtOGtMeXdnSnljcExGeHVJQ0FnSUNBZ2QyRjJPaUFoSVdGMVpHbHZWR1Z6ZEM1allXNVFiR0Y1Vkhsd1pTZ25ZWFZrYVc4dmQyRjJPeUJqYjJSbFkzTTlYQ0l4WENJbktTNXlaWEJzWVdObEtDOWVibThrTHl3Z0p5Y3BMRnh1SUNBZ0lDQWdZV0ZqT2lBaElXRjFaR2x2VkdWemRDNWpZVzVRYkdGNVZIbHdaU2duWVhWa2FXOHZZV0ZqT3ljcExuSmxjR3hoWTJVb0wxNXVieVF2TENBbkp5a3NYRzRnSUNBZ0lDQnROR0U2SUNFaEtHRjFaR2x2VkdWemRDNWpZVzVRYkdGNVZIbHdaU2duWVhWa2FXOHZlQzF0TkdFN0p5a2dmSHdnWVhWa2FXOVVaWE4wTG1OaGJsQnNZWGxVZVhCbEtDZGhkV1JwYnk5dE5HRTdKeWtnZkh3Z1lYVmthVzlVWlhOMExtTmhibEJzWVhsVWVYQmxLQ2RoZFdScGJ5OWhZV003SnlrcExuSmxjR3hoWTJVb0wxNXVieVF2TENBbkp5a3NYRzRnSUNBZ0lDQnRjRFE2SUNFaEtHRjFaR2x2VkdWemRDNWpZVzVRYkdGNVZIbHdaU2duWVhWa2FXOHZlQzF0Y0RRN0p5a2dmSHdnWVhWa2FXOVVaWE4wTG1OaGJsQnNZWGxVZVhCbEtDZGhkV1JwYnk5dGNEUTdKeWtnZkh3Z1lYVmthVzlVWlhOMExtTmhibEJzWVhsVWVYQmxLQ2RoZFdScGJ5OWhZV003SnlrcExuSmxjR3hoWTJVb0wxNXVieVF2TENBbkp5a3NYRzRnSUNBZ0lDQjNaV0poT2lBaElXRjFaR2x2VkdWemRDNWpZVzVRYkdGNVZIbHdaU2duWVhWa2FXOHZkMlZpYlRzZ1kyOWtaV056UFZ3aWRtOXlZbWx6WENJbktTNXlaWEJzWVdObEtDOWVibThrTHl3Z0p5Y3BYRzRnSUNBZ2ZUdGNiaUFnZlZ4dVhHNGdJQzh2SUdGc2JHOTNJR0ZqWTJWemN5QjBieUIwYUdVZ1oyeHZZbUZzSUdGMVpHbHZJR052Ym5SeWIyeHpYRzRnSUhaaGNpQkliM2RzWlhJZ1BTQnVaWGNnU0c5M2JHVnlSMnh2WW1Gc0tHTnZaR1ZqY3lrN1hHNWNiaUFnTHk4Z2MyVjBkWEFnZEdobElHRjFaR2x2SUc5aWFtVmpkRnh1SUNCMllYSWdTRzkzYkNBOUlHWjFibU4wYVc5dUtHOHBJSHRjYmlBZ0lDQjJZWElnYzJWc1ppQTlJSFJvYVhNN1hHNWNiaUFnSUNBdkx5QnpaWFIxY0NCMGFHVWdaR1ZtWVhWc2RITmNiaUFnSUNCelpXeG1MbDloZFhSdmNHeGhlU0E5SUc4dVlYVjBiM0JzWVhrZ2ZId2dabUZzYzJVN1hHNGdJQ0FnYzJWc1ppNWZZblZtWm1WeUlEMGdieTVpZFdabVpYSWdmSHdnWm1Gc2MyVTdYRzRnSUNBZ2MyVnNaaTVmWkhWeVlYUnBiMjRnUFNCdkxtUjFjbUYwYVc5dUlIeDhJREE3WEc0Z0lDQWdjMlZzWmk1ZlptOXliV0YwSUQwZ2J5NW1iM0p0WVhRZ2ZId2diblZzYkR0Y2JpQWdJQ0J6Wld4bUxsOXNiMjl3SUQwZ2J5NXNiMjl3SUh4OElHWmhiSE5sTzF4dUlDQWdJSE5sYkdZdVgyeHZZV1JsWkNBOUlHWmhiSE5sTzF4dUlDQWdJSE5sYkdZdVgzTndjbWwwWlNBOUlHOHVjM0J5YVhSbElIeDhJSHQ5TzF4dUlDQWdJSE5sYkdZdVgzTnlZeUE5SUc4dWMzSmpJSHg4SUNjbk8xeHVJQ0FnSUhObGJHWXVYM0J2Y3pOa0lEMGdieTV3YjNNelpDQjhmQ0JiTUN3Z01Dd2dMVEF1TlYwN1hHNGdJQ0FnYzJWc1ppNWZkbTlzZFcxbElEMGdieTUyYjJ4MWJXVWdJVDA5SUhWdVpHVm1hVzVsWkNBL0lHOHVkbTlzZFcxbElEb2dNVHRjYmlBZ0lDQnpaV3htTGw5MWNteHpJRDBnYnk1MWNteHpJSHg4SUZ0ZE8xeHVJQ0FnSUhObGJHWXVYM0poZEdVZ1BTQnZMbkpoZEdVZ2ZId2dNVHRjYmx4dUlDQWdJQzh2SUdGc2JHOTNJR1p2Y21OcGJtY2diMllnWVNCemNHVmphV1pwWXlCd1lXNXVhVzVuVFc5a1pXd2dLQ2RsY1hWaGJIQnZkMlZ5SnlCdmNpQW5TRkpVUmljcExGeHVJQ0FnSUM4dklHbG1JRzV2Ym1VZ2FYTWdjM0JsWTJsbWFXVmtMQ0JrWldaaGRXeDBjeUIwYnlBblpYRjFZV3h3YjNkbGNpY2dZVzVrSUhOM2FYUmphR1Z6SUhSdklDZElVbFJHSjF4dUlDQWdJQzh2SUdsbUlETmtJSE52ZFc1a0lHbHpJSFZ6WldSY2JpQWdJQ0J6Wld4bUxsOXRiMlJsYkNBOUlHOHViVzlrWld3Z2ZId2diblZzYkR0Y2JseHVJQ0FnSUM4dklITmxkSFZ3SUdWMlpXNTBJR1oxYm1OMGFXOXVjMXh1SUNBZ0lITmxiR1l1WDI5dWJHOWhaQ0E5SUZ0dkxtOXViRzloWkNCOGZDQm1kVzVqZEdsdmJpZ3BJSHQ5WFR0Y2JpQWdJQ0J6Wld4bUxsOXZibXh2WVdSbGNuSnZjaUE5SUZ0dkxtOXViRzloWkdWeWNtOXlJSHg4SUdaMWJtTjBhVzl1S0NrZ2UzMWRPMXh1SUNBZ0lITmxiR1l1WDI5dVpXNWtJRDBnVzI4dWIyNWxibVFnZkh3Z1puVnVZM1JwYjI0b0tTQjdmVjA3WEc0Z0lDQWdjMlZzWmk1ZmIyNXdZWFZ6WlNBOUlGdHZMbTl1Y0dGMWMyVWdmSHdnWm5WdVkzUnBiMjRvS1NCN2ZWMDdYRzRnSUNBZ2MyVnNaaTVmYjI1d2JHRjVJRDBnVzI4dWIyNXdiR0Y1SUh4OElHWjFibU4wYVc5dUtDa2dlMzFkTzF4dVhHNGdJQ0FnYzJWc1ppNWZiMjVsYm1SVWFXMWxjaUE5SUZ0ZE8xeHVYRzRnSUNBZ0x5OGdWMlZpSUVGMVpHbHZJRzl5SUVoVVRVdzFJRUYxWkdsdlAxeHVJQ0FnSUhObGJHWXVYM2RsWWtGMVpHbHZJRDBnZFhOcGJtZFhaV0pCZFdScGJ5QW1KaUFoYzJWc1ppNWZZblZtWm1WeU8xeHVYRzRnSUNBZ0x5OGdZMmhsWTJzZ2FXWWdkMlVnYm1WbFpDQjBieUJtWVd4c0lHSmhZMnNnZEc4Z1NGUk5URFVnUVhWa2FXOWNiaUFnSUNCelpXeG1MbDloZFdScGIwNXZaR1VnUFNCYlhUdGNiaUFnSUNCcFppQW9jMlZzWmk1ZmQyVmlRWFZrYVc4cElIdGNiaUFnSUNBZ0lITmxiR1l1WDNObGRIVndRWFZrYVc5T2IyUmxLQ2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeThnWVhWMGIyMWhkR2xqWVd4c2VTQjBjbmtnZEc4Z1pXNWhZbXhsSUdGMVpHbHZJRzl1SUdsUFUxeHVJQ0FnSUdsbUlDaDBlWEJsYjJZZ1kzUjRJQ0U5UFNBbmRXNWtaV1pwYm1Wa0p5QW1KaUJqZEhnZ0ppWWdTRzkzYkdWeUxtbFBVMEYxZEc5RmJtRmliR1VwSUh0Y2JpQWdJQ0FnSUVodmQyeGxjaTVmWlc1aFlteGxhVTlUUVhWa2FXOG9LVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZMeUJoWkdRZ2RHaHBjeUIwYnlCaGJpQmhjbkpoZVNCdlppQkliM2RzSjNNZ2RHOGdZV3hzYjNjZ1oyeHZZbUZzSUdOdmJuUnliMnhjYmlBZ0lDQkliM2RzWlhJdVgyaHZkMnh6TG5CMWMyZ29jMlZzWmlrN1hHNWNiaUFnSUNBdkx5QnNiMkZrSUhSb1pTQjBjbUZqYTF4dUlDQWdJSE5sYkdZdWJHOWhaQ2dwTzF4dUlDQjlPMXh1WEc0Z0lDOHZJSE5sZEhWd0lHRnNiQ0J2WmlCMGFHVWdiV1YwYUc5a2MxeHVJQ0JJYjNkc0xuQnliM1J2ZEhsd1pTQTlJSHRjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJNYjJGa0lHRnVJR0YxWkdsdklHWnBiR1V1WEc0Z0lDQWdJQ29nUUhKbGRIVnliaUI3U0c5M2JIMWNiaUFnSUNBZ0tpOWNiaUFnSUNCc2IyRmtPaUJtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUhaaGNpQnpaV3htSUQwZ2RHaHBjeXhjYmlBZ0lDQWdJQ0FnZFhKc0lEMGdiblZzYkR0Y2JseHVJQ0FnSUNBZ0x5OGdhV1lnYm04Z1lYVmthVzhnYVhNZ1lYWmhhV3hoWW14bExDQnhkV2wwSUdsdGJXVmthV0YwWld4NVhHNGdJQ0FnSUNCcFppQW9ibTlCZFdScGJ5a2dlMXh1SUNBZ0lDQWdJQ0J6Wld4bUxtOXVLQ2RzYjJGa1pYSnliM0luTENCdVpYY2dSWEp5YjNJb0owNXZJR0YxWkdsdklITjFjSEJ2Y25RdUp5a3BPMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQzh2SUd4dmIzQWdkR2h5YjNWbmFDQnpiM1Z5WTJVZ1ZWSk1jeUJoYm1RZ2NHbGpheUIwYUdVZ1ptbHljM1FnYjI1bElIUm9ZWFFnYVhNZ1kyOXRjR0YwYVdKc1pWeHVJQ0FnSUNBZ1ptOXlJQ2gyWVhJZ2FUMHdPeUJwUEhObGJHWXVYM1Z5YkhNdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlHVjRkQ3dnZFhKc1NYUmxiVHRjYmx4dUlDQWdJQ0FnSUNCcFppQW9jMlZzWmk1ZlptOXliV0YwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdMeThnZFhObElITndaV05wWm1sbFpDQmhkV1JwYnlCbWIzSnRZWFFnYVdZZ1lYWmhhV3hoWW14bFhHNGdJQ0FnSUNBZ0lDQWdaWGgwSUQwZ2MyVnNaaTVmWm05eWJXRjBPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUM4dklHWnBaM1Z5WlNCdmRYUWdkR2hsSUdacGJHVjBlWEJsSUNoM2FHVjBhR1Z5SUdGdUlHVjRkR1Z1YzJsdmJpQnZjaUJpWVhObE5qUWdaR0YwWVNsY2JpQWdJQ0FnSUNBZ0lDQjFjbXhKZEdWdElEMGdjMlZzWmk1ZmRYSnNjMXRwWFR0Y2JpQWdJQ0FnSUNBZ0lDQmxlSFFnUFNBdlhtUmhkR0U2WVhWa2FXOWNYQzhvVzE0N0xGMHJLVHN2YVM1bGVHVmpLSFZ5YkVsMFpXMHBPMXh1SUNBZ0lDQWdJQ0FnSUdsbUlDZ2haWGgwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JsZUhRZ1BTQXZYRnd1S0Z0ZUxsMHJLU1F2TG1WNFpXTW9kWEpzU1hSbGJTNXpjR3hwZENnblB5Y3NJREVwV3pCZEtUdGNiaUFnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQnBaaUFvWlhoMEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCbGVIUWdQU0JsZUhSYk1WMHVkRzlNYjNkbGNrTmhjMlVvS1R0Y2JpQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYzJWc1ppNXZiaWduYkc5aFpHVnljbTl5Snl3Z2JtVjNJRVZ5Y205eUtDZERiM1ZzWkNCdWIzUWdaWGgwY21GamRDQm1iM0p0WVhRZ1puSnZiU0J3WVhOelpXUWdWVkpNY3l3Z2NHeGxZWE5sSUdGa1pDQm1iM0p0WVhRZ2NHRnlZVzFsZEdWeUxpY3BLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNCcFppQW9ZMjlrWldOelcyVjRkRjBwSUh0Y2JpQWdJQ0FnSUNBZ0lDQjFjbXdnUFNCelpXeG1MbDkxY214elcybGRPMXh1SUNBZ0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUdsbUlDZ2hkWEpzS1NCN1hHNGdJQ0FnSUNBZ0lITmxiR1l1YjI0b0oyeHZZV1JsY25KdmNpY3NJRzVsZHlCRmNuSnZjaWduVG04Z1kyOWtaV01nYzNWd2NHOXlkQ0JtYjNJZ2MyVnNaV04wWldRZ1lYVmthVzhnYzI5MWNtTmxjeTRuS1NrN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2MyVnNaaTVmYzNKaklEMGdkWEpzTzF4dVhHNGdJQ0FnSUNCcFppQW9jMlZzWmk1ZmQyVmlRWFZrYVc4cElIdGNiaUFnSUNBZ0lDQWdiRzloWkVKMVptWmxjaWh6Wld4bUxDQjFjbXdwTzF4dUlDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlHNWxkMDV2WkdVZ1BTQnVaWGNnUVhWa2FXOG9LVHRjYmx4dUlDQWdJQ0FnSUNBdkx5QnNhWE4wWlc0Z1ptOXlJR1Z5Y205eWN5QjNhWFJvSUVoVVRVdzFJR0YxWkdsdklDaG9kSFJ3T2k4dlpHVjJMbmN6TG05eVp5OW9kRzFzTlM5emNHVmpMV0YxZEdodmNpMTJhV1YzTDNOd1pXTXVhSFJ0YkNOdFpXUnBZV1Z5Y205eUtWeHVJQ0FnSUNBZ0lDQnVaWGRPYjJSbExtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyVnljbTl5Snl3Z1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lDQWdJQ0FnSUdsbUlDaHVaWGRPYjJSbExtVnljbTl5SUNZbUlHNWxkMDV2WkdVdVpYSnliM0l1WTI5a1pTQTlQVDBnTkNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnU0c5M2JHVnlSMnh2WW1Gc0xtNXZRWFZrYVc4Z1BTQjBjblZsTzF4dUlDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUhObGJHWXViMjRvSjJ4dllXUmxjbkp2Y2ljc0lIdDBlWEJsT2lCdVpYZE9iMlJsTG1WeWNtOXlJRDhnYm1WM1RtOWtaUzVsY25KdmNpNWpiMlJsSURvZ01IMHBPMXh1SUNBZ0lDQWdJQ0I5TENCbVlXeHpaU2s3WEc1Y2JpQWdJQ0FnSUNBZ2MyVnNaaTVmWVhWa2FXOU9iMlJsTG5CMWMyZ29ibVYzVG05a1pTazdYRzVjYmlBZ0lDQWdJQ0FnTHk4Z2MyVjBkWEFnZEdobElHNWxkeUJoZFdScGJ5QnViMlJsWEc0Z0lDQWdJQ0FnSUc1bGQwNXZaR1V1YzNKaklEMGdkWEpzTzF4dUlDQWdJQ0FnSUNCdVpYZE9iMlJsTGw5d2IzTWdQU0F3TzF4dUlDQWdJQ0FnSUNCdVpYZE9iMlJsTG5CeVpXeHZZV1FnUFNBbllYVjBieWM3WEc0Z0lDQWdJQ0FnSUc1bGQwNXZaR1V1ZG05c2RXMWxJRDBnS0VodmQyeGxjaTVmYlhWMFpXUXBJRDhnTUNBNklITmxiR1l1WDNadmJIVnRaU0FxSUVodmQyeGxjaTUyYjJ4MWJXVW9LVHRjYmx4dUlDQWdJQ0FnSUNBdkx5QnpaWFIxY0NCMGFHVWdaWFpsYm5RZ2JHbHpkR1Z1WlhJZ2RHOGdjM1JoY25RZ2NHeGhlV2x1WnlCMGFHVWdjMjkxYm1SY2JpQWdJQ0FnSUNBZ0x5OGdZWE1nYzI5dmJpQmhjeUJwZENCb1lYTWdZblZtWm1WeVpXUWdaVzV2ZFdkb1hHNGdJQ0FnSUNBZ0lIWmhjaUJzYVhOMFpXNWxjaUE5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQzh2SUhKdmRXNWtJSFZ3SUhSb1pTQmtkWEpoZEdsdmJpQjNhR1Z1SUhWemFXNW5JRWhVVFV3MUlFRjFaR2x2SUhSdklHRmpZMjkxYm5RZ1ptOXlJSFJvWlNCc2IzZGxjaUJ3Y21WamFYTnBiMjVjYmlBZ0lDQWdJQ0FnSUNCelpXeG1MbDlrZFhKaGRHbHZiaUE5SUUxaGRHZ3VZMlZwYkNodVpYZE9iMlJsTG1SMWNtRjBhVzl1SUNvZ01UQXBJQzhnTVRBN1hHNWNiaUFnSUNBZ0lDQWdJQ0F2THlCelpYUjFjQ0JoSUhOd2NtbDBaU0JwWmlCdWIyNWxJR2x6SUdSbFptbHVaV1JjYmlBZ0lDQWdJQ0FnSUNCcFppQW9UMkpxWldOMExtZGxkRTkzYmxCeWIzQmxjblI1VG1GdFpYTW9jMlZzWmk1ZmMzQnlhWFJsS1M1c1pXNW5kR2dnUFQwOUlEQXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lITmxiR1l1WDNOd2NtbDBaU0E5SUh0ZlpHVm1ZWFZzZERvZ1d6QXNJSE5sYkdZdVgyUjFjbUYwYVc5dUlDb2dNVEF3TUYxOU8xeHVJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lHbG1JQ2doYzJWc1ppNWZiRzloWkdWa0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCelpXeG1MbDlzYjJGa1pXUWdQU0IwY25WbE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnYzJWc1ppNXZiaWduYkc5aFpDY3BPMXh1SUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJR2xtSUNoelpXeG1MbDloZFhSdmNHeGhlU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjMlZzWmk1d2JHRjVLQ2s3WEc0Z0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnTHk4Z1kyeGxZWElnZEdobElHVjJaVzUwSUd4cGMzUmxibVZ5WEc0Z0lDQWdJQ0FnSUNBZ2JtVjNUbTlrWlM1eVpXMXZkbVZGZG1WdWRFeHBjM1JsYm1WeUtDZGpZVzV3YkdGNWRHaHliM1ZuYUNjc0lHeHBjM1JsYm1WeUxDQm1ZV3h6WlNrN1hHNGdJQ0FnSUNBZ0lIMDdYRzRnSUNBZ0lDQWdJRzVsZDA1dlpHVXVZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25ZMkZ1Y0d4aGVYUm9jbTkxWjJnbkxDQnNhWE4wWlc1bGNpd2dabUZzYzJVcE8xeHVJQ0FnSUNBZ0lDQnVaWGRPYjJSbExteHZZV1FvS1R0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2NtVjBkWEp1SUhObGJHWTdYRzRnSUNBZ2ZTeGNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJRWRsZEM5elpYUWdkR2hsSUZWU1RITWdkRzhnWW1VZ2NIVnNiR1ZrSUdaeWIyMGdkRzhnY0d4aGVTQnBiaUIwYUdseklITnZkWEpqWlM1Y2JpQWdJQ0FnS2lCQWNHRnlZVzBnSUh0QmNuSmhlWDBnZFhKc2N5QWdRWEp5ZVNCdlppQlZVa3h6SUhSdklHeHZZV1FnWm5KdmJWeHVJQ0FnSUNBcUlFQnlaWFIxY200Z2UwaHZkMng5SUNBZ0lDQWdJQ0JTWlhSMWNtNXpJSE5sYkdZZ2IzSWdkR2hsSUdOMWNuSmxiblFnVlZKTWMxeHVJQ0FnSUNBcUwxeHVJQ0FnSUhWeWJITTZJR1oxYm1OMGFXOXVLSFZ5YkhNcElIdGNiaUFnSUNBZ0lIWmhjaUJ6Wld4bUlEMGdkR2hwY3p0Y2JseHVJQ0FnSUNBZ2FXWWdLSFZ5YkhNcElIdGNiaUFnSUNBZ0lDQWdjMlZzWmk1emRHOXdLQ2s3WEc0Z0lDQWdJQ0FnSUhObGJHWXVYM1Z5YkhNZ1BTQW9kSGx3Wlc5bUlIVnliSE1nUFQwOUlDZHpkSEpwYm1jbktTQS9JRnQxY214elhTQTZJSFZ5YkhNN1hHNGdJQ0FnSUNBZ0lITmxiR1l1WDJ4dllXUmxaQ0E5SUdaaGJITmxPMXh1SUNBZ0lDQWdJQ0J6Wld4bUxteHZZV1FvS1R0Y2JseHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2MyVnNaanRjYmlBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnpaV3htTGw5MWNteHpPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJRYkdGNUlHRWdjMjkxYm1RZ1puSnZiU0IwYUdVZ1kzVnljbVZ1ZENCMGFXMWxJQ2d3SUdKNUlHUmxabUYxYkhRcExseHVJQ0FnSUNBcUlFQndZWEpoYlNBZ2UxTjBjbWx1WjMwZ0lDQnpjSEpwZEdVZ0lDQW9iM0IwYVc5dVlXd3BJRkJzWVhseklHWnliMjBnZEdobElITndaV05wWm1sbFpDQndiM05wZEdsdmJpQnBiaUIwYUdVZ2MyOTFibVFnYzNCeWFYUmxJR1JsWm1sdWFYUnBiMjR1WEc0Z0lDQWdJQ29nUUhCaGNtRnRJQ0I3Um5WdVkzUnBiMjU5SUdOaGJHeGlZV05ySUNodmNIUnBiMjVoYkNrZ1VtVjBkWEp1Y3lCMGFHVWdkVzVwY1hWbElIQnNZWGxpWVdOcklHbGtJR1p2Y2lCMGFHbHpJSE52ZFc1a0lHbHVjM1JoYm1ObExseHVJQ0FnSUNBcUlFQnlaWFIxY200Z2UwaHZkMng5WEc0Z0lDQWdJQ292WEc0Z0lDQWdjR3hoZVRvZ1puVnVZM1JwYjI0b2MzQnlhWFJsTENCallXeHNZbUZqYXlrZ2UxeHVJQ0FnSUNBZ2RtRnlJSE5sYkdZZ1BTQjBhR2x6TzF4dVhHNGdJQ0FnSUNBdkx5QnBaaUJ1YnlCemNISnBkR1VnZDJGeklIQmhjM05sWkNCaWRYUWdZU0JqWVd4c1ltRmpheUIzWVhNc0lIVndaR0YwWlNCMGFHVWdkbUZ5YVdGaWJHVnpYRzRnSUNBZ0lDQnBaaUFvZEhsd1pXOW1JSE53Y21sMFpTQTlQVDBnSjJaMWJtTjBhVzl1SnlrZ2UxeHVJQ0FnSUNBZ0lDQmpZV3hzWW1GamF5QTlJSE53Y21sMFpUdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnZFhObElIUm9aU0JrWldaaGRXeDBJSE53Y21sMFpTQnBaaUJ1YjI1bElHbHpJSEJoYzNObFpGeHVJQ0FnSUNBZ2FXWWdLQ0Z6Y0hKcGRHVWdmSHdnZEhsd1pXOW1JSE53Y21sMFpTQTlQVDBnSjJaMWJtTjBhVzl1SnlrZ2UxeHVJQ0FnSUNBZ0lDQnpjSEpwZEdVZ1BTQW5YMlJsWm1GMWJIUW5PMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0F2THlCcFppQjBhR1VnYzI5MWJtUWdhR0Z6YmlkMElHSmxaVzRnYkc5aFpHVmtMQ0JoWkdRZ2FYUWdkRzhnZEdobElHVjJaVzUwSUhGMVpYVmxYRzRnSUNBZ0lDQnBaaUFvSVhObGJHWXVYMnh2WVdSbFpDa2dlMXh1SUNBZ0lDQWdJQ0J6Wld4bUxtOXVLQ2RzYjJGa0p5d2dablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0FnSUNBZ2MyVnNaaTV3YkdGNUtITndjbWwwWlN3Z1kyRnNiR0poWTJzcE8xeHVJQ0FnSUNBZ0lDQjlLVHRjYmx4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYzJWc1pqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnYVdZZ2RHaGxJSE53Y21sMFpTQmtiMlZ6YmlkMElHVjRhWE4wTENCd2JHRjVJRzV2ZEdocGJtZGNiaUFnSUNBZ0lHbG1JQ2doYzJWc1ppNWZjM0J5YVhSbFczTndjbWwwWlYwcElIdGNiaUFnSUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUJqWVd4c1ltRmpheUE5UFQwZ0oyWjFibU4wYVc5dUp5a2dZMkZzYkdKaFkyc29LVHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSE5sYkdZN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJR2RsZENCMGFHVWdibTlrWlNCMGJ5QndiR0Y1WW1GamExeHVJQ0FnSUNBZ2MyVnNaaTVmYVc1aFkzUnBkbVZPYjJSbEtHWjFibU4wYVc5dUtHNXZaR1VwSUh0Y2JpQWdJQ0FnSUNBZ0x5OGdjR1Z5YzJsemRDQjBhR1VnYzNCeWFYUmxJR0psYVc1bklIQnNZWGxsWkZ4dUlDQWdJQ0FnSUNCdWIyUmxMbDl6Y0hKcGRHVWdQU0J6Y0hKcGRHVTdYRzVjYmlBZ0lDQWdJQ0FnTHk4Z1pHVjBaWEp0YVc1bElIZG9aWEpsSUhSdklITjBZWEowSUhCc1lYbHBibWNnWm5KdmJWeHVJQ0FnSUNBZ0lDQjJZWElnY0c5eklEMGdLRzV2WkdVdVgzQnZjeUErSURBcElEOGdibTlrWlM1ZmNHOXpJRG9nYzJWc1ppNWZjM0J5YVhSbFczTndjbWwwWlYxYk1GMGdMeUF4TURBd08xeHVYRzRnSUNBZ0lDQWdJQzh2SUdSbGRHVnliV2x1WlNCb2IzY2diRzl1WnlCMGJ5QndiR0Y1SUdadmNseHVJQ0FnSUNBZ0lDQjJZWElnWkhWeVlYUnBiMjRnUFNBd08xeHVJQ0FnSUNBZ0lDQnBaaUFvYzJWc1ppNWZkMlZpUVhWa2FXOHBJSHRjYmlBZ0lDQWdJQ0FnSUNCa2RYSmhkR2x2YmlBOUlITmxiR1l1WDNOd2NtbDBaVnR6Y0hKcGRHVmRXekZkSUM4Z01UQXdNQ0F0SUc1dlpHVXVYM0J2Y3p0Y2JpQWdJQ0FnSUNBZ0lDQnBaaUFvYm05a1pTNWZjRzl6SUQ0Z01Da2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NHOXpJRDBnYzJWc1ppNWZjM0J5YVhSbFczTndjbWwwWlYxYk1GMGdMeUF4TURBd0lDc2djRzl6TzF4dUlDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0JrZFhKaGRHbHZiaUE5SUhObGJHWXVYM053Y21sMFpWdHpjSEpwZEdWZFd6RmRJQzhnTVRBd01DQXRJQ2h3YjNNZ0xTQnpaV3htTGw5emNISnBkR1ZiYzNCeWFYUmxYVnN3WFNBdklERXdNREFwTzF4dUlDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdMeThnWkdWMFpYSnRhVzVsSUdsbUlIUm9hWE1nYzI5MWJtUWdjMmh2ZFd4a0lHSmxJR3h2YjNCbFpGeHVJQ0FnSUNBZ0lDQjJZWElnYkc5dmNDQTlJQ0VoS0hObGJHWXVYMnh2YjNBZ2ZId2djMlZzWmk1ZmMzQnlhWFJsVzNOd2NtbDBaVjFiTWwwcE8xeHVYRzRnSUNBZ0lDQWdJQzh2SUhObGRDQjBhVzFsY2lCMGJ5Qm1hWEpsSUhSb1pTQW5iMjVsYm1RbklHVjJaVzUwWEc0Z0lDQWdJQ0FnSUhaaGNpQnpiM1Z1WkVsa0lEMGdLSFI1Y0dWdlppQmpZV3hzWW1GamF5QTlQVDBnSjNOMGNtbHVaeWNwSUQ4Z1kyRnNiR0poWTJzZ09pQk5ZWFJvTG5KdmRXNWtLRVJoZEdVdWJtOTNLQ2tnS2lCTllYUm9MbkpoYm1SdmJTZ3BLU0FySUNjbkxGeHVJQ0FnSUNBZ0lDQWdJSFJwYldWeVNXUTdYRzRnSUNBZ0lDQWdJQ2htZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ0lDQjJZWElnWkdGMFlTQTlJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHbGtPaUJ6YjNWdVpFbGtMRnh1SUNBZ0lDQWdJQ0FnSUNBZ2MzQnlhWFJsT2lCemNISnBkR1VzWEc0Z0lDQWdJQ0FnSUNBZ0lDQnNiMjl3T2lCc2IyOXdYRzRnSUNBZ0lDQWdJQ0FnZlR0Y2JpQWdJQ0FnSUNBZ0lDQjBhVzFsY2tsa0lEMGdjMlYwVkdsdFpXOTFkQ2htZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUdsbUlHeHZiM0JwYm1jc0lISmxjM1JoY25RZ2RHaGxJSFJ5WVdOclhHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb0lYTmxiR1l1WDNkbFlrRjFaR2x2SUNZbUlHeHZiM0FwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnYzJWc1ppNXpkRzl3S0dSaGRHRXVhV1FwTG5Cc1lYa29jM0J5YVhSbExDQmtZWFJoTG1sa0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z2MyVjBJSGRsWWlCaGRXUnBieUJ1YjJSbElIUnZJSEJoZFhObFpDQmhkQ0JsYm1SY2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoelpXeG1MbDkzWldKQmRXUnBieUFtSmlBaGJHOXZjQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0J6Wld4bUxsOXViMlJsUW5sSlpDaGtZWFJoTG1sa0tTNXdZWFZ6WldRZ1BTQjBjblZsTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0J6Wld4bUxsOXViMlJsUW5sSlpDaGtZWFJoTG1sa0tTNWZjRzl6SUQwZ01EdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQXZMeUJqYkdWaGNpQjBhR1VnWlc1a0lIUnBiV1Z5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJSE5sYkdZdVgyTnNaV0Z5Ulc1a1ZHbHRaWElvWkdGMFlTNXBaQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDOHZJR1Z1WkNCMGFHVWdkSEpoWTJzZ2FXWWdhWFFnYVhNZ1NGUk5UQ0JoZFdScGJ5QmhibVFnWVNCemNISnBkR1ZjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2doYzJWc1ppNWZkMlZpUVhWa2FXOGdKaVlnSVd4dmIzQXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdjMlZzWmk1emRHOXdLR1JoZEdFdWFXUXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5Qm1hWEpsSUdWdVpHVmtJR1YyWlc1MFhHNGdJQ0FnSUNBZ0lDQWdJQ0J6Wld4bUxtOXVLQ2RsYm1RbkxDQnpiM1Z1WkVsa0tUdGNiaUFnSUNBZ0lDQWdJQ0I5TENBb1pIVnlZWFJwYjI0Z0x5QnpaV3htTGw5eVlYUmxLU0FxSURFd01EQXBPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0x5OGdjM1J2Y21VZ2RHaGxJSEpsWm1WeVpXNWpaU0IwYnlCMGFHVWdkR2x0WlhKY2JpQWdJQ0FnSUNBZ0lDQnpaV3htTGw5dmJtVnVaRlJwYldWeUxuQjFjMmdvZTNScGJXVnlPaUIwYVcxbGNrbGtMQ0JwWkRvZ1pHRjBZUzVwWkgwcE8xeHVJQ0FnSUNBZ0lDQjlLU2dwTzF4dVhHNGdJQ0FnSUNBZ0lHbG1JQ2h6Wld4bUxsOTNaV0pCZFdScGJ5a2dlMXh1SUNBZ0lDQWdJQ0FnSUhaaGNpQnNiMjl3VTNSaGNuUWdQU0J6Wld4bUxsOXpjSEpwZEdWYmMzQnlhWFJsWFZzd1hTQXZJREV3TURBc1hHNGdJQ0FnSUNBZ0lDQWdJQ0JzYjI5d1JXNWtJRDBnYzJWc1ppNWZjM0J5YVhSbFczTndjbWwwWlYxYk1WMGdMeUF4TURBd08xeHVYRzRnSUNBZ0lDQWdJQ0FnTHk4Z2MyVjBJSFJvWlNCd2JHRjVJR2xrSUhSdklIUm9hWE1nYm05a1pTQmhibVFnYkc5aFpDQnBiblJ2SUdOdmJuUmxlSFJjYmlBZ0lDQWdJQ0FnSUNCdWIyUmxMbWxrSUQwZ2MyOTFibVJKWkR0Y2JpQWdJQ0FnSUNBZ0lDQnViMlJsTG5CaGRYTmxaQ0E5SUdaaGJITmxPMXh1SUNBZ0lDQWdJQ0FnSUhKbFpuSmxjMmhDZFdabVpYSW9jMlZzWml3Z1cyeHZiM0FzSUd4dmIzQlRkR0Z5ZEN3Z2JHOXZjRVZ1WkYwc0lITnZkVzVrU1dRcE8xeHVJQ0FnSUNBZ0lDQWdJSE5sYkdZdVgzQnNZWGxUZEdGeWRDQTlJR04wZUM1amRYSnlaVzUwVkdsdFpUdGNiaUFnSUNBZ0lDQWdJQ0J1YjJSbExtZGhhVzR1ZG1Gc2RXVWdQU0J6Wld4bUxsOTJiMngxYldVN1hHNWNiaUFnSUNBZ0lDQWdJQ0JwWmlBb2RIbHdaVzltSUc1dlpHVXVZblZtWm1WeVUyOTFjbU5sTG5OMFlYSjBJRDA5UFNBbmRXNWtaV1pwYm1Wa0p5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2JHOXZjQ0EvSUc1dlpHVXVZblZtWm1WeVUyOTFjbU5sTG01dmRHVkhjbUZwYms5dUtEQXNJSEJ2Y3l3Z09EWTBNREFwSURvZ2JtOWtaUzVpZFdabVpYSlRiM1Z5WTJVdWJtOTBaVWR5WVdsdVQyNG9NQ3dnY0c5ekxDQmtkWEpoZEdsdmJpazdYRzRnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHeHZiM0FnUHlCdWIyUmxMbUoxWm1abGNsTnZkWEpqWlM1emRHRnlkQ2d3TENCd2IzTXNJRGcyTkRBd0tTQTZJRzV2WkdVdVluVm1abVZ5VTI5MWNtTmxMbk4wWVhKMEtEQXNJSEJ2Y3l3Z1pIVnlZWFJwYjI0cE8xeHVJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNCcFppQW9ibTlrWlM1eVpXRmtlVk4wWVhSbElEMDlQU0EwSUh4OElDRnViMlJsTG5KbFlXUjVVM1JoZEdVZ0ppWWdibUYyYVdkaGRHOXlMbWx6UTI5amIyOXVTbE1wSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJRzV2WkdVdWNtVmhaSGxUZEdGMFpTQTlJRFE3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnViMlJsTG1sa0lEMGdjMjkxYm1SSlpEdGNiaUFnSUNBZ0lDQWdJQ0FnSUc1dlpHVXVZM1Z5Y21WdWRGUnBiV1VnUFNCd2IzTTdYRzRnSUNBZ0lDQWdJQ0FnSUNCdWIyUmxMbTExZEdWa0lEMGdTRzkzYkdWeUxsOXRkWFJsWkNCOGZDQnViMlJsTG0xMWRHVmtPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2JtOWtaUzUyYjJ4MWJXVWdQU0J6Wld4bUxsOTJiMngxYldVZ0tpQkliM2RzWlhJdWRtOXNkVzFsS0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J6WlhSVWFXMWxiM1YwS0daMWJtTjBhVzl1S0NrZ2V5QnViMlJsTG5Cc1lYa29LVHNnZlN3Z01DazdYRzRnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lITmxiR1l1WDJOc1pXRnlSVzVrVkdsdFpYSW9jMjkxYm1SSlpDazdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDaG1kVzVqZEdsdmJpZ3BlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnYzI5MWJtUWdQU0J6Wld4bUxGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIQnNZWGxUY0hKcGRHVWdQU0J6Y0hKcGRHVXNYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdabTRnUFNCallXeHNZbUZqYXl4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCdVpYZE9iMlJsSUQwZ2JtOWtaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUd4cGMzUmxibVZ5SUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjMjkxYm1RdWNHeGhlU2h3YkdGNVUzQnlhWFJsTENCbWJpazdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0F2THlCamJHVmhjaUIwYUdVZ1pYWmxiblFnYkdsemRHVnVaWEpjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J1WlhkT2IyUmxMbkpsYlc5MlpVVjJaVzUwVEdsemRHVnVaWElvSjJOaGJuQnNZWGwwYUhKdmRXZG9KeXdnYkdsemRHVnVaWElzSUdaaGJITmxLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdmVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdibVYzVG05a1pTNWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpZVzV3YkdGNWRHaHliM1ZuYUNjc0lHeHBjM1JsYm1WeUxDQm1ZV3h6WlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5S1NncE8xeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnYzJWc1pqdGNiaUFnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQXZMeUJtYVhKbElIUm9aU0J3YkdGNUlHVjJaVzUwSUdGdVpDQnpaVzVrSUhSb1pTQnpiM1Z1WkVsa0lHSmhZMnNnYVc0Z2RHaGxJR05oYkd4aVlXTnJYRzRnSUNBZ0lDQWdJSE5sYkdZdWIyNG9KM0JzWVhrbktUdGNiaUFnSUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUJqWVd4c1ltRmpheUE5UFQwZ0oyWjFibU4wYVc5dUp5a2dZMkZzYkdKaFkyc29jMjkxYm1SSlpDazdYRzVjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSE5sYkdZN1hHNGdJQ0FnSUNCOUtUdGNibHh1SUNBZ0lDQWdjbVYwZFhKdUlITmxiR1k3WEc0Z0lDQWdmU3hjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUZCaGRYTmxJSEJzWVhsaVlXTnJJR0Z1WkNCellYWmxJSFJvWlNCamRYSnlaVzUwSUhCdmMybDBhVzl1TGx4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VTNSeWFXNW5mU0JwWkNBb2IzQjBhVzl1WVd3cElGUm9aU0J3YkdGNUlHbHVjM1JoYm1ObElFbEVMbHh1SUNBZ0lDQXFJRUJ5WlhSMWNtNGdlMGh2ZDJ4OVhHNGdJQ0FnSUNvdlhHNGdJQ0FnY0dGMWMyVTZJR1oxYm1OMGFXOXVLR2xrS1NCN1hHNGdJQ0FnSUNCMllYSWdjMlZzWmlBOUlIUm9hWE03WEc1Y2JpQWdJQ0FnSUM4dklHbG1JSFJvWlNCemIzVnVaQ0JvWVhOdUozUWdZbVZsYmlCc2IyRmtaV1FzSUdGa1pDQnBkQ0IwYnlCMGFHVWdaWFpsYm5RZ2NYVmxkV1ZjYmlBZ0lDQWdJR2xtSUNnaGMyVnNaaTVmYkc5aFpHVmtLU0I3WEc0Z0lDQWdJQ0FnSUhObGJHWXViMjRvSjNCc1lYa25MQ0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnpaV3htTG5CaGRYTmxLR2xrS1R0Y2JpQWdJQ0FnSUNBZ2ZTazdYRzVjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSE5sYkdZN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJR05zWldGeUlDZHZibVZ1WkNjZ2RHbHRaWEpjYmlBZ0lDQWdJSE5sYkdZdVgyTnNaV0Z5Ulc1a1ZHbHRaWElvYVdRcE8xeHVYRzRnSUNBZ0lDQjJZWElnWVdOMGFYWmxUbTlrWlNBOUlDaHBaQ2tnUHlCelpXeG1MbDl1YjJSbFFubEpaQ2hwWkNrZ09pQnpaV3htTGw5aFkzUnBkbVZPYjJSbEtDazdYRzRnSUNBZ0lDQnBaaUFvWVdOMGFYWmxUbTlrWlNrZ2UxeHVJQ0FnSUNBZ0lDQmhZM1JwZG1WT2IyUmxMbDl3YjNNZ1BTQnpaV3htTG5CdmN5aHVkV3hzTENCcFpDazdYRzVjYmlBZ0lDQWdJQ0FnYVdZZ0tITmxiR1l1WDNkbFlrRjFaR2x2S1NCN1hHNGdJQ0FnSUNBZ0lDQWdMeThnYldGclpTQnpkWEpsSUhSb1pTQnpiM1Z1WkNCb1lYTWdZbVZsYmlCamNtVmhkR1ZrWEc0Z0lDQWdJQ0FnSUNBZ2FXWWdLQ0ZoWTNScGRtVk9iMlJsTG1KMVptWmxjbE52ZFhKalpTQjhmQ0JoWTNScGRtVk9iMlJsTG5CaGRYTmxaQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlITmxiR1k3WEc0Z0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnWVdOMGFYWmxUbTlrWlM1d1lYVnpaV1FnUFNCMGNuVmxPMXh1SUNBZ0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ1lXTjBhWFpsVG05a1pTNWlkV1ptWlhKVGIzVnlZMlV1YzNSdmNDQTlQVDBnSjNWdVpHVm1hVzVsWkNjcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdGamRHbDJaVTV2WkdVdVluVm1abVZ5VTI5MWNtTmxMbTV2ZEdWUFptWW9NQ2s3WEc0Z0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR0ZqZEdsMlpVNXZaR1V1WW5WbVptVnlVMjkxY21ObExuTjBiM0FvTUNrN1hHNGdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUdGamRHbDJaVTV2WkdVdWNHRjFjMlVvS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQnpaV3htTG05dUtDZHdZWFZ6WlNjcE8xeHVYRzRnSUNBZ0lDQnlaWFIxY200Z2MyVnNaanRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nVTNSdmNDQndiR0Y1WW1GamF5QmhibVFnY21WelpYUWdkRzhnYzNSaGNuUXVYRzRnSUNBZ0lDb2dRSEJoY21GdElDQjdVM1J5YVc1bmZTQnBaQ0FnS0c5d2RHbHZibUZzS1NCVWFHVWdjR3hoZVNCcGJuTjBZVzVqWlNCSlJDNWNiaUFnSUNBZ0tpQkFjbVYwZFhKdUlIdEliM2RzZlZ4dUlDQWdJQ0FxTDF4dUlDQWdJSE4wYjNBNklHWjFibU4wYVc5dUtHbGtLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2MyVnNaaUE5SUhSb2FYTTdYRzVjYmlBZ0lDQWdJQzh2SUdsbUlIUm9aU0J6YjNWdVpDQm9ZWE51SjNRZ1ltVmxiaUJzYjJGa1pXUXNJR0ZrWkNCcGRDQjBieUIwYUdVZ1pYWmxiblFnY1hWbGRXVmNiaUFnSUNBZ0lHbG1JQ2doYzJWc1ppNWZiRzloWkdWa0tTQjdYRzRnSUNBZ0lDQWdJSE5sYkdZdWIyNG9KM0JzWVhrbkxDQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNCelpXeG1Mbk4wYjNBb2FXUXBPMXh1SUNBZ0lDQWdJQ0I5S1R0Y2JseHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2MyVnNaanRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnTHk4Z1kyeGxZWElnSjI5dVpXNWtKeUIwYVcxbGNseHVJQ0FnSUNBZ2MyVnNaaTVmWTJ4bFlYSkZibVJVYVcxbGNpaHBaQ2s3WEc1Y2JpQWdJQ0FnSUhaaGNpQmhZM1JwZG1WT2IyUmxJRDBnS0dsa0tTQS9JSE5sYkdZdVgyNXZaR1ZDZVVsa0tHbGtLU0E2SUhObGJHWXVYMkZqZEdsMlpVNXZaR1VvS1R0Y2JpQWdJQ0FnSUdsbUlDaGhZM1JwZG1WT2IyUmxLU0I3WEc0Z0lDQWdJQ0FnSUdGamRHbDJaVTV2WkdVdVgzQnZjeUE5SURBN1hHNWNiaUFnSUNBZ0lDQWdhV1lnS0hObGJHWXVYM2RsWWtGMVpHbHZLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0x5OGdiV0ZyWlNCemRYSmxJSFJvWlNCemIzVnVaQ0JvWVhNZ1ltVmxiaUJqY21WaGRHVmtYRzRnSUNBZ0lDQWdJQ0FnYVdZZ0tDRmhZM1JwZG1WT2IyUmxMbUoxWm1abGNsTnZkWEpqWlNCOGZDQmhZM1JwZG1WT2IyUmxMbkJoZFhObFpDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUhObGJHWTdYRzRnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdZV04wYVhabFRtOWtaUzV3WVhWelpXUWdQU0IwY25WbE8xeHVYRzRnSUNBZ0lDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCaFkzUnBkbVZPYjJSbExtSjFabVpsY2xOdmRYSmpaUzV6ZEc5d0lEMDlQU0FuZFc1a1pXWnBibVZrSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWVdOMGFYWmxUbTlrWlM1aWRXWm1aWEpUYjNWeVkyVXVibTkwWlU5bVppZ3dLVHRjYmlBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdZV04wYVhabFRtOWtaUzVpZFdabVpYSlRiM1Z5WTJVdWMzUnZjQ2d3S1R0Y2JpQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDBnWld4elpTQnBaaUFvSVdselRtRk9LR0ZqZEdsMlpVNXZaR1V1WkhWeVlYUnBiMjRwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdZV04wYVhabFRtOWtaUzV3WVhWelpTZ3BPMXh1SUNBZ0lDQWdJQ0FnSUdGamRHbDJaVTV2WkdVdVkzVnljbVZ1ZEZScGJXVWdQU0F3TzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lISmxkSFZ5YmlCelpXeG1PMXh1SUNBZ0lIMHNYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJOZFhSbElIUm9hWE1nYzI5MWJtUXVYRzRnSUNBZ0lDb2dRSEJoY21GdElDQjdVM1J5YVc1bmZTQnBaQ0FvYjNCMGFXOXVZV3dwSUZSb1pTQndiR0Y1SUdsdWMzUmhibU5sSUVsRUxseHVJQ0FnSUNBcUlFQnlaWFIxY200Z2UwaHZkMng5WEc0Z0lDQWdJQ292WEc0Z0lDQWdiWFYwWlRvZ1puVnVZM1JwYjI0b2FXUXBJSHRjYmlBZ0lDQWdJSFpoY2lCelpXeG1JRDBnZEdocGN6dGNibHh1SUNBZ0lDQWdMeThnYVdZZ2RHaGxJSE52ZFc1a0lHaGhjMjRuZENCaVpXVnVJR3h2WVdSbFpDd2dZV1JrSUdsMElIUnZJSFJvWlNCbGRtVnVkQ0J4ZFdWMVpWeHVJQ0FnSUNBZ2FXWWdLQ0Z6Wld4bUxsOXNiMkZrWldRcElIdGNiaUFnSUNBZ0lDQWdjMlZzWmk1dmJpZ25jR3hoZVNjc0lHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdJQ0FnSUhObGJHWXViWFYwWlNocFpDazdYRzRnSUNBZ0lDQWdJSDBwTzF4dVhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCelpXeG1PMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0IyWVhJZ1lXTjBhWFpsVG05a1pTQTlJQ2hwWkNrZ1B5QnpaV3htTGw5dWIyUmxRbmxKWkNocFpDa2dPaUJ6Wld4bUxsOWhZM1JwZG1WT2IyUmxLQ2s3WEc0Z0lDQWdJQ0JwWmlBb1lXTjBhWFpsVG05a1pTa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2MyVnNaaTVmZDJWaVFYVmthVzhwSUh0Y2JpQWdJQ0FnSUNBZ0lDQmhZM1JwZG1WT2IyUmxMbWRoYVc0dWRtRnNkV1VnUFNBd08xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJR0ZqZEdsMlpVNXZaR1V1YlhWMFpXUWdQU0IwY25WbE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSEpsZEhWeWJpQnpaV3htTzF4dUlDQWdJSDBzWEc1Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCVmJtMTFkR1VnZEdocGN5QnpiM1Z1WkM1Y2JpQWdJQ0FnS2lCQWNHRnlZVzBnSUh0VGRISnBibWQ5SUdsa0lDaHZjSFJwYjI1aGJDa2dWR2hsSUhCc1lYa2dhVzV6ZEdGdVkyVWdTVVF1WEc0Z0lDQWdJQ29nUUhKbGRIVnliaUI3U0c5M2JIMWNiaUFnSUNBZ0tpOWNiaUFnSUNCMWJtMTFkR1U2SUdaMWJtTjBhVzl1S0dsa0tTQjdYRzRnSUNBZ0lDQjJZWElnYzJWc1ppQTlJSFJvYVhNN1hHNWNiaUFnSUNBZ0lDOHZJR2xtSUhSb1pTQnpiM1Z1WkNCb1lYTnVKM1FnWW1WbGJpQnNiMkZrWldRc0lHRmtaQ0JwZENCMGJ5QjBhR1VnWlhabGJuUWdjWFZsZFdWY2JpQWdJQ0FnSUdsbUlDZ2hjMlZzWmk1ZmJHOWhaR1ZrS1NCN1hHNGdJQ0FnSUNBZ0lITmxiR1l1YjI0b0ozQnNZWGtuTENCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdJQ0J6Wld4bUxuVnViWFYwWlNocFpDazdYRzRnSUNBZ0lDQWdJSDBwTzF4dVhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCelpXeG1PMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0IyWVhJZ1lXTjBhWFpsVG05a1pTQTlJQ2hwWkNrZ1B5QnpaV3htTGw5dWIyUmxRbmxKWkNocFpDa2dPaUJ6Wld4bUxsOWhZM1JwZG1WT2IyUmxLQ2s3WEc0Z0lDQWdJQ0JwWmlBb1lXTjBhWFpsVG05a1pTa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2MyVnNaaTVmZDJWaVFYVmthVzhwSUh0Y2JpQWdJQ0FnSUNBZ0lDQmhZM1JwZG1WT2IyUmxMbWRoYVc0dWRtRnNkV1VnUFNCelpXeG1MbDkyYjJ4MWJXVTdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnWVdOMGFYWmxUbTlrWlM1dGRYUmxaQ0E5SUdaaGJITmxPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUhKbGRIVnliaUJ6Wld4bU8xeHVJQ0FnSUgwc1hHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQkhaWFF2YzJWMElIWnZiSFZ0WlNCdlppQjBhR2x6SUhOdmRXNWtMbHh1SUNBZ0lDQXFJRUJ3WVhKaGJTQWdlMFpzYjJGMGZTQWdkbTlzSUZadmJIVnRaU0JtY205dElEQXVNQ0IwYnlBeExqQXVYRzRnSUNBZ0lDb2dRSEJoY21GdElDQjdVM1J5YVc1bmZTQnBaQ0FnS0c5d2RHbHZibUZzS1NCVWFHVWdjR3hoZVNCcGJuTjBZVzVqWlNCSlJDNWNiaUFnSUNBZ0tpQkFjbVYwZFhKdUlIdEliM2RzTDBac2IyRjBmU0FnSUNBZ1VtVjBkWEp1Y3lCelpXeG1JRzl5SUdOMWNuSmxiblFnZG05c2RXMWxMbHh1SUNBZ0lDQXFMMXh1SUNBZ0lIWnZiSFZ0WlRvZ1puVnVZM1JwYjI0b2RtOXNMQ0JwWkNrZ2UxeHVJQ0FnSUNBZ2RtRnlJSE5sYkdZZ1BTQjBhR2x6TzF4dVhHNGdJQ0FnSUNBdkx5QnRZV3RsSUhOMWNtVWdkbTlzZFcxbElHbHpJR0VnYm5WdFltVnlYRzRnSUNBZ0lDQjJiMndnUFNCd1lYSnpaVVpzYjJGMEtIWnZiQ2s3WEc1Y2JpQWdJQ0FnSUdsbUlDaDJiMndnUGowZ01DQW1KaUIyYjJ3Z1BEMGdNU2tnZTF4dUlDQWdJQ0FnSUNCelpXeG1MbDkyYjJ4MWJXVWdQU0IyYjJ3N1hHNWNiaUFnSUNBZ0lDQWdMeThnYVdZZ2RHaGxJSE52ZFc1a0lHaGhjMjRuZENCaVpXVnVJR3h2WVdSbFpDd2dZV1JrSUdsMElIUnZJSFJvWlNCbGRtVnVkQ0J4ZFdWMVpWeHVJQ0FnSUNBZ0lDQnBaaUFvSVhObGJHWXVYMnh2WVdSbFpDa2dlMXh1SUNBZ0lDQWdJQ0FnSUhObGJHWXViMjRvSjNCc1lYa25MQ0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSE5sYkdZdWRtOXNkVzFsS0hadmJDd2dhV1FwTzF4dUlDQWdJQ0FnSUNBZ0lIMHBPMXh1WEc0Z0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUhObGJHWTdYRzRnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNCMllYSWdZV04wYVhabFRtOWtaU0E5SUNocFpDa2dQeUJ6Wld4bUxsOXViMlJsUW5sSlpDaHBaQ2tnT2lCelpXeG1MbDloWTNScGRtVk9iMlJsS0NrN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hoWTNScGRtVk9iMlJsS1NCN1hHNGdJQ0FnSUNBZ0lDQWdhV1lnS0hObGJHWXVYM2RsWWtGMVpHbHZLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmhZM1JwZG1WT2IyUmxMbWRoYVc0dWRtRnNkV1VnUFNCMmIydzdYRzRnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHRmpkR2wyWlU1dlpHVXVkbTlzZFcxbElEMGdkbTlzSUNvZ1NHOTNiR1Z5TG5admJIVnRaU2dwTzF4dUlDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ6Wld4bU8xeHVJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhObGJHWXVYM1p2YkhWdFpUdGNiaUFnSUNBZ0lIMWNiaUFnSUNCOUxGeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2dSMlYwTDNObGRDQjNhR1YwYUdWeUlIUnZJR3h2YjNBZ2RHaGxJSE52ZFc1a0xseHVJQ0FnSUNBcUlFQndZWEpoYlNBZ2UwSnZiMnhsWVc1OUlHeHZiM0FnVkc4Z2JHOXZjQ0J2Y2lCdWIzUWdkRzhnYkc5dmNDd2dkR2hoZENCcGN5QjBhR1VnY1hWbGMzUnBiMjR1WEc0Z0lDQWdJQ29nUUhKbGRIVnliaUI3U0c5M2JDOUNiMjlzWldGdWZTQWdJQ0FnSUZKbGRIVnlibk1nYzJWc1ppQnZjaUJqZFhKeVpXNTBJR3h2YjNCcGJtY2dkbUZzZFdVdVhHNGdJQ0FnSUNvdlhHNGdJQ0FnYkc5dmNEb2dablZ1WTNScGIyNG9iRzl2Y0NrZ2UxeHVJQ0FnSUNBZ2RtRnlJSE5sYkdZZ1BTQjBhR2x6TzF4dVhHNGdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHeHZiM0FnUFQwOUlDZGliMjlzWldGdUp5a2dlMXh1SUNBZ0lDQWdJQ0J6Wld4bUxsOXNiMjl3SUQwZ2JHOXZjRHRjYmx4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYzJWc1pqdGNiaUFnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCelpXeG1MbDlzYjI5d08xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgwc1hHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQkhaWFF2YzJWMElITnZkVzVrSUhOd2NtbDBaU0JrWldacGJtbDBhVzl1TGx4dUlDQWdJQ0FxSUVCd1lYSmhiU0FnZTA5aWFtVmpkSDBnYzNCeWFYUmxJRVY0WVcxd2JHVTZJSHR6Y0hKcGRHVk9ZVzFsT2lCYmIyWm1jMlYwTENCa2RYSmhkR2x2Yml3Z2JHOXZjRjE5WEc0Z0lDQWdJQ29nSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdRSEJoY21GdElIdEpiblJsWjJWeWZTQnZabVp6WlhRZ0lDQlhhR1Z5WlNCMGJ5QmlaV2RwYmlCd2JHRjVZbUZqYXlCcGJpQnRhV3hzYVhObFkyOXVaSE5jYmlBZ0lDQWdLaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQkFjR0Z5WVcwZ2UwbHVkR1ZuWlhKOUlHUjFjbUYwYVc5dUlFaHZkeUJzYjI1bklIUnZJSEJzWVhrZ2FXNGdiV2xzYkdselpXTnZibVJ6WEc0Z0lDQWdJQ29nSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdRSEJoY21GdElIdENiMjlzWldGdWZTQnNiMjl3SUNBZ0lDQW9iM0IwYVc5dVlXd3BJRk5sZENCMGNuVmxJSFJ2SUd4dmIzQWdkR2hwY3lCemNISnBkR1ZjYmlBZ0lDQWdLaUJBY21WMGRYSnVJSHRJYjNkc2ZTQWdJQ0FnSUNBZ1VtVjBkWEp1Y3lCamRYSnlaVzUwSUhOd2NtbDBaU0J6YUdWbGRDQnZjaUJ6Wld4bUxseHVJQ0FnSUNBcUwxeHVJQ0FnSUhOd2NtbDBaVG9nWm5WdVkzUnBiMjRvYzNCeWFYUmxLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2MyVnNaaUE5SUhSb2FYTTdYRzVjYmlBZ0lDQWdJR2xtSUNoMGVYQmxiMllnYzNCeWFYUmxJRDA5UFNBbmIySnFaV04wSnlrZ2UxeHVJQ0FnSUNBZ0lDQnpaV3htTGw5emNISnBkR1VnUFNCemNISnBkR1U3WEc1Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhObGJHWTdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2MyVnNaaTVmYzNCeWFYUmxPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJIWlhRdmMyVjBJSFJvWlNCd2IzTnBkR2x2YmlCdlppQndiR0Y1WW1GamF5NWNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ0lIdEdiRzloZEgwZ0lIQnZjeUJVYUdVZ2NHOXphWFJwYjI0Z2RHOGdiVzkyWlNCamRYSnlaVzUwSUhCc1lYbGlZV05ySUhSdkxseHVJQ0FnSUNBcUlFQndZWEpoYlNBZ2UxTjBjbWx1WjMwZ2FXUWdJQ2h2Y0hScGIyNWhiQ2tnVkdobElIQnNZWGtnYVc1emRHRnVZMlVnU1VRdVhHNGdJQ0FnSUNvZ1FISmxkSFZ5YmlCN1NHOTNiQzlHYkc5aGRIMGdJQ0FnSUNCU1pYUjFjbTV6SUhObGJHWWdiM0lnWTNWeWNtVnVkQ0J3YkdGNVltRmpheUJ3YjNOcGRHbHZiaTVjYmlBZ0lDQWdLaTljYmlBZ0lDQndiM002SUdaMWJtTjBhVzl1S0hCdmN5d2dhV1FwSUh0Y2JpQWdJQ0FnSUhaaGNpQnpaV3htSUQwZ2RHaHBjenRjYmx4dUlDQWdJQ0FnTHk4Z2FXWWdkR2hsSUhOdmRXNWtJR2hoYzI0bmRDQmlaV1Z1SUd4dllXUmxaQ3dnWVdSa0lHbDBJSFJ2SUhSb1pTQmxkbVZ1ZENCeGRXVjFaVnh1SUNBZ0lDQWdhV1lnS0NGelpXeG1MbDlzYjJGa1pXUXBJSHRjYmlBZ0lDQWdJQ0FnYzJWc1ppNXZiaWduYkc5aFpDY3NJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lITmxiR1l1Y0c5ektIQnZjeWs3WEc0Z0lDQWdJQ0FnSUgwcE8xeHVYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjBlWEJsYjJZZ2NHOXpJRDA5UFNBbmJuVnRZbVZ5SnlBL0lITmxiR1lnT2lCelpXeG1MbDl3YjNNZ2ZId2dNRHRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnTHk4Z2JXRnJaU0J6ZFhKbElIZGxJR0Z5WlNCa1pXRnNhVzVuSUhkcGRHZ2dZU0J1ZFcxaVpYSWdabTl5SUhCdmMxeHVJQ0FnSUNBZ2NHOXpJRDBnY0dGeWMyVkdiRzloZENod2IzTXBPMXh1WEc0Z0lDQWdJQ0IyWVhJZ1lXTjBhWFpsVG05a1pTQTlJQ2hwWkNrZ1B5QnpaV3htTGw5dWIyUmxRbmxKWkNocFpDa2dPaUJ6Wld4bUxsOWhZM1JwZG1WT2IyUmxLQ2s3WEc0Z0lDQWdJQ0JwWmlBb1lXTjBhWFpsVG05a1pTa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2NHOXpJRDQ5SURBcElIdGNiaUFnSUNBZ0lDQWdJQ0J6Wld4bUxuQmhkWE5sS0dsa0tUdGNiaUFnSUNBZ0lDQWdJQ0JoWTNScGRtVk9iMlJsTGw5d2IzTWdQU0J3YjNNN1hHNGdJQ0FnSUNBZ0lDQWdjMlZzWmk1d2JHRjVLR0ZqZEdsMlpVNXZaR1V1WDNOd2NtbDBaU3dnYVdRcE8xeHVYRzRnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJSE5sYkdZN1hHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlITmxiR1l1WDNkbFlrRjFaR2x2SUQ4Z1lXTjBhWFpsVG05a1pTNWZjRzl6SUNzZ0tHTjBlQzVqZFhKeVpXNTBWR2x0WlNBdElITmxiR1l1WDNCc1lYbFRkR0Z5ZENrZ09pQmhZM1JwZG1WT2IyUmxMbU4xY25KbGJuUlVhVzFsTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tIQnZjeUErUFNBd0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnpaV3htTzF4dUlDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnTHk4Z1ptbHVaQ0IwYUdVZ1ptbHljM1FnYVc1aFkzUnBkbVVnYm05a1pTQjBieUJ5WlhSMWNtNGdkR2hsSUhCdmN5Qm1iM0pjYmlBZ0lDQWdJQ0FnWm05eUlDaDJZWElnYVQwd095QnBQSE5sYkdZdVgyRjFaR2x2VG05a1pTNXNaVzVuZEdnN0lHa3JLeWtnZTF4dUlDQWdJQ0FnSUNBZ0lHbG1JQ2h6Wld4bUxsOWhkV1JwYjA1dlpHVmJhVjB1Y0dGMWMyVmtJQ1ltSUhObGJHWXVYMkYxWkdsdlRtOWtaVnRwWFM1eVpXRmtlVk4wWVhSbElEMDlQU0EwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdLSE5sYkdZdVgzZGxZa0YxWkdsdktTQS9JSE5sYkdZdVgyRjFaR2x2VG05a1pWdHBYUzVmY0c5eklEb2djMlZzWmk1ZllYVmthVzlPYjJSbFcybGRMbU4xY25KbGJuUlVhVzFsTzF4dUlDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJIWlhRdmMyVjBJSFJvWlNBelJDQndiM05wZEdsdmJpQnZaaUIwYUdVZ1lYVmthVzhnYzI5MWNtTmxMbHh1SUNBZ0lDQXFJRlJvWlNCdGIzTjBJR052YlcxdmJpQjFjMkZuWlNCcGN5QjBieUJ6WlhRZ2RHaGxJQ2Q0SnlCd2IzTnBkR2x2Ymx4dUlDQWdJQ0FxSUhSdklHRm1abVZqZENCMGFHVWdiR1ZtZEM5eWFXZG9kQ0JsWVhJZ2NHRnVibWx1Wnk0Z1UyVjBkR2x1WnlCaGJua2dkbUZzZFdVZ2FHbG5hR1Z5SUhSb1lXNWNiaUFnSUNBZ0tpQXhMakFnZDJsc2JDQmlaV2RwYmlCMGJ5QmtaV055WldGelpTQjBhR1VnZG05c2RXMWxJRzltSUhSb1pTQnpiM1Z1WkNCaGN5QnBkQ0J0YjNabGN5Qm1kWEowYUdWeUlHRjNZWGt1WEc0Z0lDQWdJQ29nVGs5VVJUb2dWR2hwY3lCdmJteDVJSGR2Y210eklIZHBkR2dnVjJWaUlFRjFaR2x2SUVGUVNTd2dTRlJOVERVZ1FYVmthVzhnY0d4aGVXSmhZMnRjYmlBZ0lDQWdLaUIzYVd4c0lHNXZkQ0JpWlNCaFptWmxZM1JsWkM1Y2JpQWdJQ0FnS2lCQWNHRnlZVzBnSUh0R2JHOWhkSDBnSUhnZ0lGUm9aU0I0TFhCdmMybDBhVzl1SUc5bUlIUm9aU0J3YkdGNVltRmpheUJtY205dElDMHhNREF3TGpBZ2RHOGdNVEF3TUM0d1hHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUNCN1JteHZZWFI5SUNCNUlDQlVhR1VnZVMxd2IzTnBkR2x2YmlCdlppQjBhR1VnY0d4aGVXSmhZMnNnWm5KdmJTQXRNVEF3TUM0d0lIUnZJREV3TURBdU1GeHVJQ0FnSUNBcUlFQndZWEpoYlNBZ2UwWnNiMkYwZlNBZ2VpQWdWR2hsSUhvdGNHOXphWFJwYjI0Z2IyWWdkR2hsSUhCc1lYbGlZV05ySUdaeWIyMGdMVEV3TURBdU1DQjBieUF4TURBd0xqQmNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ0lIdFRkSEpwYm1kOUlHbGtJQ2h2Y0hScGIyNWhiQ2tnVkdobElIQnNZWGtnYVc1emRHRnVZMlVnU1VRdVhHNGdJQ0FnSUNvZ1FISmxkSFZ5YmlCN1NHOTNiQzlCY25KaGVYMGdJQ0JTWlhSMWNtNXpJSE5sYkdZZ2IzSWdkR2hsSUdOMWNuSmxiblFnTTBRZ2NHOXphWFJwYjI0NklGdDRMQ0I1TENCNlhWeHVJQ0FnSUNBcUwxeHVJQ0FnSUhCdmN6TmtPaUJtZFc1amRHbHZiaWg0TENCNUxDQjZMQ0JwWkNrZ2UxeHVJQ0FnSUNBZ2RtRnlJSE5sYkdZZ1BTQjBhR2x6TzF4dVhHNGdJQ0FnSUNBdkx5QnpaWFFnWVNCa1pXWmhkV3gwSUdadmNpQjBhR1VnYjNCMGFXOXVZV3dnSjNrbklDWWdKM29uWEc0Z0lDQWdJQ0I1SUQwZ0tIUjVjR1Z2WmlCNUlEMDlQU0FuZFc1a1pXWnBibVZrSnlCOGZDQWhlU2tnUHlBd0lEb2dlVHRjYmlBZ0lDQWdJSG9nUFNBb2RIbHdaVzltSUhvZ1BUMDlJQ2QxYm1SbFptbHVaV1FuSUh4OElDRjZLU0EvSUMwd0xqVWdPaUI2TzF4dVhHNGdJQ0FnSUNBdkx5QnBaaUIwYUdVZ2MyOTFibVFnYUdGemJpZDBJR0psWlc0Z2JHOWhaR1ZrTENCaFpHUWdhWFFnZEc4Z2RHaGxJR1YyWlc1MElIRjFaWFZsWEc0Z0lDQWdJQ0JwWmlBb0lYTmxiR1l1WDJ4dllXUmxaQ2tnZTF4dUlDQWdJQ0FnSUNCelpXeG1MbTl1S0Nkd2JHRjVKeXdnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBZ0lDQWdjMlZzWmk1d2IzTXpaQ2g0TENCNUxDQjZMQ0JwWkNrN1hHNGdJQ0FnSUNBZ0lIMHBPMXh1WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ6Wld4bU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQnBaaUFvZUNBK1BTQXdJSHg4SUhnZ1BDQXdLU0I3WEc0Z0lDQWdJQ0FnSUdsbUlDaHpaV3htTGw5M1pXSkJkV1JwYnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJSFpoY2lCaFkzUnBkbVZPYjJSbElEMGdLR2xrS1NBL0lITmxiR1l1WDI1dlpHVkNlVWxrS0dsa0tTQTZJSE5sYkdZdVgyRmpkR2wyWlU1dlpHVW9LVHRjYmlBZ0lDQWdJQ0FnSUNCcFppQW9ZV04wYVhabFRtOWtaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjMlZzWmk1ZmNHOXpNMlFnUFNCYmVDd2dlU3dnZWwwN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JoWTNScGRtVk9iMlJsTG5CaGJtNWxjaTV6WlhSUWIzTnBkR2x2YmloNExDQjVMQ0I2S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJR0ZqZEdsMlpVNXZaR1V1Y0dGdWJtVnlMbkJoYm01cGJtZE5iMlJsYkNBOUlITmxiR1l1WDIxdlpHVnNJSHg4SUNkSVVsUkdKenRjYmlBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCelpXeG1MbDl3YjNNelpEdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdjbVYwZFhKdUlITmxiR1k3WEc0Z0lDQWdmU3hjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUVaaFpHVWdZU0JqZFhKeVpXNTBiSGtnY0d4aGVXbHVaeUJ6YjNWdVpDQmlaWFIzWldWdUlIUjNieUIyYjJ4MWJXVnpMbHh1SUNBZ0lDQXFJRUJ3WVhKaGJTQWdlMDUxYldKbGNuMGdJQ0JtY205dElDQWdJQ0JVYUdVZ2RtOXNkVzFsSUhSdklHWmhaR1VnWm5KdmJTQW9NQzR3SUhSdklERXVNQ2t1WEc0Z0lDQWdJQ29nUUhCaGNtRnRJQ0I3VG5WdFltVnlmU0FnSUhSdklDQWdJQ0FnSUZSb1pTQjJiMngxYldVZ2RHOGdabUZrWlNCMGJ5QW9NQzR3SUhSdklERXVNQ2t1WEc0Z0lDQWdJQ29nUUhCaGNtRnRJQ0I3VG5WdFltVnlmU0FnSUd4bGJpQWdJQ0FnSUZScGJXVWdhVzRnYldsc2JHbHpaV052Ym1SeklIUnZJR1poWkdVdVhHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUNCN1JuVnVZM1JwYjI1OUlHTmhiR3hpWVdOcklDaHZjSFJwYjI1aGJDa2dSbWx5WldRZ2QyaGxiaUIwYUdVZ1ptRmtaU0JwY3lCamIyMXdiR1YwWlM1Y2JpQWdJQ0FnS2lCQWNHRnlZVzBnSUh0VGRISnBibWQ5SUNBZ2FXUWdJQ0FnSUNBZ0tHOXdkR2x2Ym1Gc0tTQlVhR1VnY0d4aGVTQnBibk4wWVc1alpTQkpSQzVjYmlBZ0lDQWdLaUJBY21WMGRYSnVJSHRJYjNkc2ZWeHVJQ0FnSUNBcUwxeHVJQ0FnSUdaaFpHVTZJR1oxYm1OMGFXOXVLR1p5YjIwc0lIUnZMQ0JzWlc0c0lHTmhiR3hpWVdOckxDQnBaQ2tnZTF4dUlDQWdJQ0FnZG1GeUlITmxiR1lnUFNCMGFHbHpMRnh1SUNBZ0lDQWdJQ0JrYVdabUlEMGdUV0YwYUM1aFluTW9abkp2YlNBdElIUnZLU3hjYmlBZ0lDQWdJQ0FnWkdseUlEMGdabkp2YlNBK0lIUnZJRDhnSjJSdmQyNG5JRG9nSjNWd0p5eGNiaUFnSUNBZ0lDQWdjM1JsY0hNZ1BTQmthV1ptSUM4Z01DNHdNU3hjYmlBZ0lDQWdJQ0FnYzNSbGNGUnBiV1VnUFNCc1pXNGdMeUJ6ZEdWd2N6dGNibHh1SUNBZ0lDQWdMeThnYVdZZ2RHaGxJSE52ZFc1a0lHaGhjMjRuZENCaVpXVnVJR3h2WVdSbFpDd2dZV1JrSUdsMElIUnZJSFJvWlNCbGRtVnVkQ0J4ZFdWMVpWeHVJQ0FnSUNBZ2FXWWdLQ0Z6Wld4bUxsOXNiMkZrWldRcElIdGNiaUFnSUNBZ0lDQWdjMlZzWmk1dmJpZ25iRzloWkNjc0lHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdJQ0FnSUhObGJHWXVabUZrWlNobWNtOXRMQ0IwYnl3Z2JHVnVMQ0JqWVd4c1ltRmpheXdnYVdRcE8xeHVJQ0FnSUNBZ0lDQjlLVHRjYmx4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYzJWc1pqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnYzJWMElIUm9aU0IyYjJ4MWJXVWdkRzhnZEdobElITjBZWEowSUhCdmMybDBhVzl1WEc0Z0lDQWdJQ0J6Wld4bUxuWnZiSFZ0WlNobWNtOXRMQ0JwWkNrN1hHNWNiaUFnSUNBZ0lHWnZjaUFvZG1GeUlHazlNVHNnYVR3OWMzUmxjSE03SUdrckt5a2dlMXh1SUNBZ0lDQWdJQ0FvWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBZ0lDQWdkbUZ5SUdOb1lXNW5aU0E5SUhObGJHWXVYM1p2YkhWdFpTQXJJQ2hrYVhJZ1BUMDlJQ2QxY0NjZ1B5QXdMakF4SURvZ0xUQXVNREVwSUNvZ2FTeGNiaUFnSUNBZ0lDQWdJQ0FnSUhadmJDQTlJRTFoZEdndWNtOTFibVFvTVRBd01DQXFJR05vWVc1blpTa2dMeUF4TURBd0xGeHVJQ0FnSUNBZ0lDQWdJQ0FnZEc5V2Iyd2dQU0IwYnp0Y2JseHVJQ0FnSUNBZ0lDQWdJSE5sZEZScGJXVnZkWFFvWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J6Wld4bUxuWnZiSFZ0WlNoMmIyd3NJR2xrS1R0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tIWnZiQ0E5UFQwZ2RHOVdiMndwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tHTmhiR3hpWVdOcktTQmpZV3hzWW1GamF5Z3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJSDBzSUhOMFpYQlVhVzFsSUNvZ2FTazdYRzRnSUNBZ0lDQWdJSDBwS0NrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlN4Y2JseHVJQ0FnSUM4cUtseHVJQ0FnSUNBcUlGdEVSVkJTUlVOQlZFVkVYU0JHWVdSbElHbHVJSFJvWlNCamRYSnlaVzUwSUhOdmRXNWtMbHh1SUNBZ0lDQXFJRUJ3WVhKaGJTQWdlMFpzYjJGMGZTQWdJQ0IwYnlBZ0lDQWdJRlp2YkhWdFpTQjBieUJtWVdSbElIUnZJQ2d3TGpBZ2RHOGdNUzR3S1M1Y2JpQWdJQ0FnS2lCQWNHRnlZVzBnSUh0T2RXMWlaWEo5SUNBZ2JHVnVJQ0FnSUNCVWFXMWxJR2x1SUcxcGJHeHBjMlZqYjI1a2N5QjBieUJtWVdSbExseHVJQ0FnSUNBcUlFQndZWEpoYlNBZ2UwWjFibU4wYVc5dWZTQmpZV3hzWW1GamExeHVJQ0FnSUNBcUlFQnlaWFIxY200Z2UwaHZkMng5WEc0Z0lDQWdJQ292WEc0Z0lDQWdabUZrWlVsdU9pQm1kVzVqZEdsdmJpaDBieXdnYkdWdUxDQmpZV3hzWW1GamF5a2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlIUm9hWE11ZG05c2RXMWxLREFwTG5Cc1lYa29LUzVtWVdSbEtEQXNJSFJ2TENCc1pXNHNJR05oYkd4aVlXTnJLVHRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nVzBSRlVGSkZRMEZVUlVSZElFWmhaR1VnYjNWMElIUm9aU0JqZFhKeVpXNTBJSE52ZFc1a0lHRnVaQ0J3WVhWelpTQjNhR1Z1SUdacGJtbHphR1ZrTGx4dUlDQWdJQ0FxSUVCd1lYSmhiU0FnZTBac2IyRjBmU0FnSUNCMGJ5QWdJQ0FnSUNCV2IyeDFiV1VnZEc4Z1ptRmtaU0IwYnlBb01DNHdJSFJ2SURFdU1Da3VYRzRnSUNBZ0lDb2dRSEJoY21GdElDQjdUblZ0WW1WeWZTQWdJR3hsYmlBZ0lDQWdJRlJwYldVZ2FXNGdiV2xzYkdselpXTnZibVJ6SUhSdklHWmhaR1V1WEc0Z0lDQWdJQ29nUUhCaGNtRnRJQ0I3Um5WdVkzUnBiMjU5SUdOaGJHeGlZV05yWEc0Z0lDQWdJQ29nUUhCaGNtRnRJQ0I3VTNSeWFXNW5mU0FnSUdsa0lDQWdJQ0FnSUNodmNIUnBiMjVoYkNrZ1ZHaGxJSEJzWVhrZ2FXNXpkR0Z1WTJVZ1NVUXVYRzRnSUNBZ0lDb2dRSEpsZEhWeWJpQjdTRzkzYkgxY2JpQWdJQ0FnS2k5Y2JpQWdJQ0JtWVdSbFQzVjBPaUJtZFc1amRHbHZiaWgwYnl3Z2JHVnVMQ0JqWVd4c1ltRmpheXdnYVdRcElIdGNiaUFnSUNBZ0lIWmhjaUJ6Wld4bUlEMGdkR2hwY3p0Y2JseHVJQ0FnSUNBZ2NtVjBkWEp1SUhObGJHWXVabUZrWlNoelpXeG1MbDkyYjJ4MWJXVXNJSFJ2TENCc1pXNHNJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9ZMkZzYkdKaFkyc3BJR05oYkd4aVlXTnJLQ2s3WEc0Z0lDQWdJQ0FnSUhObGJHWXVjR0YxYzJVb2FXUXBPMXh1WEc0Z0lDQWdJQ0FnSUM4dklHWnBjbVVnWlc1a1pXUWdaWFpsYm5SY2JpQWdJQ0FnSUNBZ2MyVnNaaTV2YmlnblpXNWtKeWs3WEc0Z0lDQWdJQ0I5TENCcFpDazdYRzRnSUNBZ2ZTeGNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJRWRsZENCaGJpQmhkV1JwYnlCdWIyUmxJR0o1SUVsRUxseHVJQ0FnSUNBcUlFQnlaWFIxY200Z2UwaHZkMng5SUVGMVpHbHZJRzV2WkdVdVhHNGdJQ0FnSUNvdlhHNGdJQ0FnWDI1dlpHVkNlVWxrT2lCbWRXNWpkR2x2YmlocFpDa2dlMXh1SUNBZ0lDQWdkbUZ5SUhObGJHWWdQU0IwYUdsekxGeHVJQ0FnSUNBZ0lDQnViMlJsSUQwZ2MyVnNaaTVmWVhWa2FXOU9iMlJsV3pCZE8xeHVYRzRnSUNBZ0lDQXZMeUJtYVc1a0lIUm9aU0J1YjJSbElIZHBkR2dnZEdocGN5QkpSRnh1SUNBZ0lDQWdabTl5SUNoMllYSWdhVDB3T3lCcFBITmxiR1l1WDJGMVpHbHZUbTlrWlM1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2MyVnNaaTVmWVhWa2FXOU9iMlJsVzJsZExtbGtJRDA5UFNCcFpDa2dlMXh1SUNBZ0lDQWdJQ0FnSUc1dlpHVWdQU0J6Wld4bUxsOWhkV1JwYjA1dlpHVmJhVjA3WEc0Z0lDQWdJQ0FnSUNBZ1luSmxZV3M3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2NtVjBkWEp1SUc1dlpHVTdYRzRnSUNBZ2ZTeGNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJRWRsZENCMGFHVWdabWx5YzNRZ1lXTjBhWFpsSUdGMVpHbHZJRzV2WkdVdVhHNGdJQ0FnSUNvZ1FISmxkSFZ5YmlCN1NHOTNiSDBnUVhWa2FXOGdibTlrWlM1Y2JpQWdJQ0FnS2k5Y2JpQWdJQ0JmWVdOMGFYWmxUbTlrWlRvZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQjJZWElnYzJWc1ppQTlJSFJvYVhNc1hHNGdJQ0FnSUNBZ0lHNXZaR1VnUFNCdWRXeHNPMXh1WEc0Z0lDQWdJQ0F2THlCbWFXNWtJSFJvWlNCbWFYSnpkQ0J3YkdGNWFXNW5JRzV2WkdWY2JpQWdJQ0FnSUdadmNpQW9kbUZ5SUdrOU1Ec2dhVHh6Wld4bUxsOWhkV1JwYjA1dlpHVXViR1Z1WjNSb095QnBLeXNwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLQ0Z6Wld4bUxsOWhkV1JwYjA1dlpHVmJhVjB1Y0dGMWMyVmtLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2JtOWtaU0E5SUhObGJHWXVYMkYxWkdsdlRtOWtaVnRwWFR0Y2JpQWdJQ0FnSUNBZ0lDQmljbVZoYXp0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJ5WlcxdmRtVWdaWGhqWlhOeklHbHVZV04wYVhabElHNXZaR1Z6WEc0Z0lDQWdJQ0J6Wld4bUxsOWtjbUZwYmxCdmIyd29LVHRjYmx4dUlDQWdJQ0FnY21WMGRYSnVJRzV2WkdVN1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUM4cUtseHVJQ0FnSUNBcUlFZGxkQ0IwYUdVZ1ptbHljM1FnYVc1aFkzUnBkbVVnWVhWa2FXOGdibTlrWlM1Y2JpQWdJQ0FnS2lCSlppQjBhR1Z5WlNCcGN5QnViMjVsTENCamNtVmhkR1VnWVNCdVpYY2diMjVsSUdGdVpDQmhaR1FnYVhRZ2RHOGdkR2hsSUhCdmIyd3VYRzRnSUNBZ0lDb2dRSEJoY21GdElDQjdSblZ1WTNScGIyNTlJR05oYkd4aVlXTnJJRVoxYm1OMGFXOXVJSFJ2SUdOaGJHd2dkMmhsYmlCMGFHVWdZWFZrYVc4Z2JtOWtaU0JwY3lCeVpXRmtlUzVjYmlBZ0lDQWdLaTljYmlBZ0lDQmZhVzVoWTNScGRtVk9iMlJsT2lCbWRXNWpkR2x2YmloallXeHNZbUZqYXlrZ2UxeHVJQ0FnSUNBZ2RtRnlJSE5sYkdZZ1BTQjBhR2x6TEZ4dUlDQWdJQ0FnSUNCdWIyUmxJRDBnYm5Wc2JEdGNibHh1SUNBZ0lDQWdMeThnWm1sdVpDQm1hWEp6ZENCcGJtRmpkR2wyWlNCdWIyUmxJSFJ2SUhKbFkzbGpiR1ZjYmlBZ0lDQWdJR1p2Y2lBb2RtRnlJR2s5TURzZ2FUeHpaV3htTGw5aGRXUnBiMDV2WkdVdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tITmxiR1l1WDJGMVpHbHZUbTlrWlZ0cFhTNXdZWFZ6WldRZ0ppWWdjMlZzWmk1ZllYVmthVzlPYjJSbFcybGRMbkpsWVdSNVUzUmhkR1VnUFQwOUlEUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBdkx5QnpaVzVrSUhSb1pTQnViMlJsSUdKaFkyc2dabTl5SUhWelpTQmllU0IwYUdVZ2JtVjNJSEJzWVhrZ2FXNXpkR0Z1WTJWY2JpQWdJQ0FnSUNBZ0lDQmpZV3hzWW1GamF5aHpaV3htTGw5aGRXUnBiMDV2WkdWYmFWMHBPMXh1SUNBZ0lDQWdJQ0FnSUc1dlpHVWdQU0IwY25WbE8xeHVJQ0FnSUNBZ0lDQWdJR0p5WldGck8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQzh2SUhKbGJXOTJaU0JsZUdObGMzTWdhVzVoWTNScGRtVWdibTlrWlhOY2JpQWdJQ0FnSUhObGJHWXVYMlJ5WVdsdVVHOXZiQ2dwTzF4dVhHNGdJQ0FnSUNCcFppQW9ibTlrWlNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJR055WldGMFpTQnVaWGNnYm05a1pTQnBaaUIwYUdWeVpTQmhjbVVnYm04Z2FXNWhZM1JwZG1WelhHNGdJQ0FnSUNCMllYSWdibVYzVG05a1pUdGNiaUFnSUNBZ0lHbG1JQ2h6Wld4bUxsOTNaV0pCZFdScGJ5a2dlMXh1SUNBZ0lDQWdJQ0J1WlhkT2IyUmxJRDBnYzJWc1ppNWZjMlYwZFhCQmRXUnBiMDV2WkdVb0tUdGNiaUFnSUNBZ0lDQWdZMkZzYkdKaFkyc29ibVYzVG05a1pTazdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQnpaV3htTG14dllXUW9LVHRjYmlBZ0lDQWdJQ0FnYm1WM1RtOWtaU0E5SUhObGJHWXVYMkYxWkdsdlRtOWtaVnR6Wld4bUxsOWhkV1JwYjA1dlpHVXViR1Z1WjNSb0lDMGdNVjA3WEc1Y2JpQWdJQ0FnSUNBZ0x5OGdiR2x6ZEdWdUlHWnZjaUIwYUdVZ1kyOXljbVZqZENCc2IyRmtJR1YyWlc1MElHRnVaQ0JtYVhKbElIUm9aU0JqWVd4c1ltRmphMXh1SUNBZ0lDQWdJQ0IyWVhJZ2JHbHpkR1Z1WlhKRmRtVnVkQ0E5SUc1aGRtbG5ZWFJ2Y2k1cGMwTnZZMjl2YmtwVElEOGdKMk5oYm5Cc1lYbDBhSEp2ZFdkb0p5QTZJQ2RzYjJGa1pXUnRaWFJoWkdGMFlTYzdYRzRnSUNBZ0lDQWdJSFpoY2lCc2FYTjBaVzVsY2lBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdJQ0FnSUc1bGQwNXZaR1V1Y21WdGIzWmxSWFpsYm5STWFYTjBaVzVsY2loc2FYTjBaVzVsY2tWMlpXNTBMQ0JzYVhOMFpXNWxjaXdnWm1Gc2MyVXBPMXh1SUNBZ0lDQWdJQ0FnSUdOaGJHeGlZV05yS0c1bGQwNXZaR1VwTzF4dUlDQWdJQ0FnSUNCOU8xeHVJQ0FnSUNBZ0lDQnVaWGRPYjJSbExtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb2JHbHpkR1Z1WlhKRmRtVnVkQ3dnYkdsemRHVnVaWElzSUdaaGJITmxLVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nU1dZZ2RHaGxjbVVnWVhKbElHMXZjbVVnZEdoaGJpQTFJR2x1WVdOMGFYWmxJR0YxWkdsdklHNXZaR1Z6SUdsdUlIUm9aU0J3YjI5c0xDQmpiR1ZoY2lCdmRYUWdkR2hsSUhKbGMzUXVYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1gyUnlZV2x1VUc5dmJEb2dablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0IyWVhJZ2MyVnNaaUE5SUhSb2FYTXNYRzRnSUNBZ0lDQWdJR2x1WVdOMGFYWmxJRDBnTUN4Y2JpQWdJQ0FnSUNBZ2FUdGNibHh1SUNBZ0lDQWdMeThnWTI5MWJuUWdkR2hsSUc1MWJXSmxjaUJ2WmlCcGJtRmpkR2wyWlNCdWIyUmxjMXh1SUNBZ0lDQWdabTl5SUNocFBUQTdJR2s4YzJWc1ppNWZZWFZrYVc5T2IyUmxMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2h6Wld4bUxsOWhkV1JwYjA1dlpHVmJhVjB1Y0dGMWMyVmtLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2FXNWhZM1JwZG1Vckt6dGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0F2THlCeVpXMXZkbVVnWlhoalpYTnpJR2x1WVdOMGFYWmxJRzV2WkdWelhHNGdJQ0FnSUNCbWIzSWdLR2s5YzJWc1ppNWZZWFZrYVc5T2IyUmxMbXhsYm1kMGFDMHhPeUJwUGowd095QnBMUzBwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLR2x1WVdOMGFYWmxJRHc5SURVcElIdGNiaUFnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUdsbUlDaHpaV3htTGw5aGRXUnBiMDV2WkdWYmFWMHVjR0YxYzJWa0tTQjdYRzRnSUNBZ0lDQWdJQ0FnTHk4Z1pHbHpZMjl1Ym1WamRDQjBhR1VnWVhWa2FXOGdjMjkxY21ObElHbG1JSFZ6YVc1bklGZGxZaUJCZFdScGIxeHVJQ0FnSUNBZ0lDQWdJR2xtSUNoelpXeG1MbDkzWldKQmRXUnBieWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjMlZzWmk1ZllYVmthVzlPYjJSbFcybGRMbVJwYzJOdmJtNWxZM1FvTUNrN1hHNGdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ2FXNWhZM1JwZG1VdExUdGNiaUFnSUNBZ0lDQWdJQ0J6Wld4bUxsOWhkV1JwYjA1dlpHVXVjM0JzYVdObEtHa3NJREVwTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOVhHNGdJQ0FnZlN4Y2JseHVJQ0FnSUM4cUtseHVJQ0FnSUNBcUlFTnNaV0Z5SUNkdmJtVnVaQ2NnZEdsdFpXOTFkQ0JpWldadmNtVWdhWFFnWlc1a2N5NWNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ0lIdFRkSEpwYm1kOUlITnZkVzVrU1dRZ0lGUm9aU0J3YkdGNUlHbHVjM1JoYm1ObElFbEVMbHh1SUNBZ0lDQXFMMXh1SUNBZ0lGOWpiR1ZoY2tWdVpGUnBiV1Z5T2lCbWRXNWpkR2x2YmloemIzVnVaRWxrS1NCN1hHNGdJQ0FnSUNCMllYSWdjMlZzWmlBOUlIUm9hWE1zWEc0Z0lDQWdJQ0FnSUdsdVpHVjRJRDBnTFRFN1hHNWNiaUFnSUNBZ0lDOHZJR3h2YjNBZ2RHaHliM1ZuYUNCMGFHVWdkR2x0WlhKeklIUnZJR1pwYm1RZ2RHaGxJRzl1WlNCaGMzTnZZMmxoZEdWa0lIZHBkR2dnZEdocGN5QnpiM1Z1WkZ4dUlDQWdJQ0FnWm05eUlDaDJZWElnYVQwd095QnBQSE5sYkdZdVgyOXVaVzVrVkdsdFpYSXViR1Z1WjNSb095QnBLeXNwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSE5sYkdZdVgyOXVaVzVrVkdsdFpYSmJhVjB1YVdRZ1BUMDlJSE52ZFc1a1NXUXBJSHRjYmlBZ0lDQWdJQ0FnSUNCcGJtUmxlQ0E5SUdrN1hHNGdJQ0FnSUNBZ0lDQWdZbkpsWVdzN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdkbUZ5SUhScGJXVnlJRDBnYzJWc1ppNWZiMjVsYm1SVWFXMWxjbHRwYm1SbGVGMDdYRzRnSUNBZ0lDQnBaaUFvZEdsdFpYSXBJSHRjYmlBZ0lDQWdJQ0FnWTJ4bFlYSlVhVzFsYjNWMEtIUnBiV1Z5TG5ScGJXVnlLVHRjYmlBZ0lDQWdJQ0FnYzJWc1ppNWZiMjVsYm1SVWFXMWxjaTV6Y0d4cFkyVW9hVzVrWlhnc0lERXBPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJUWlhSMWNDQjBhR1VnWjJGcGJpQnViMlJsSUdGdVpDQndZVzV1WlhJZ1ptOXlJR0VnVjJWaUlFRjFaR2x2SUdsdWMzUmhibU5sTGx4dUlDQWdJQ0FxSUVCeVpYUjFjbTRnZTA5aWFtVmpkSDBnVkdobElHNWxkeUJoZFdScGJ5QnViMlJsTGx4dUlDQWdJQ0FxTDF4dUlDQWdJRjl6WlhSMWNFRjFaR2x2VG05a1pUb2dablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0IyWVhJZ2MyVnNaaUE5SUhSb2FYTXNYRzRnSUNBZ0lDQWdJRzV2WkdVZ1BTQnpaV3htTGw5aGRXUnBiMDV2WkdVc1hHNGdJQ0FnSUNBZ0lHbHVaR1Y0SUQwZ2MyVnNaaTVmWVhWa2FXOU9iMlJsTG14bGJtZDBhRHRjYmx4dUlDQWdJQ0FnTHk4Z1kzSmxZWFJsSUdkaGFXNGdibTlrWlZ4dUlDQWdJQ0FnYm05a1pWdHBibVJsZUYwZ1BTQW9kSGx3Wlc5bUlHTjBlQzVqY21WaGRHVkhZV2x1SUQwOVBTQW5kVzVrWldacGJtVmtKeWtnUHlCamRIZ3VZM0psWVhSbFIyRnBiazV2WkdVb0tTQTZJR04wZUM1amNtVmhkR1ZIWVdsdUtDazdYRzRnSUNBZ0lDQnViMlJsVzJsdVpHVjRYUzVuWVdsdUxuWmhiSFZsSUQwZ2MyVnNaaTVmZG05c2RXMWxPMXh1SUNBZ0lDQWdibTlrWlZ0cGJtUmxlRjB1Y0dGMWMyVmtJRDBnZEhKMVpUdGNiaUFnSUNBZ0lHNXZaR1ZiYVc1a1pYaGRMbDl3YjNNZ1BTQXdPMXh1SUNBZ0lDQWdibTlrWlZ0cGJtUmxlRjB1Y21WaFpIbFRkR0YwWlNBOUlEUTdYRzRnSUNBZ0lDQnViMlJsVzJsdVpHVjRYUzVqYjI1dVpXTjBLRzFoYzNSbGNrZGhhVzRwTzF4dVhHNGdJQ0FnSUNBdkx5QmpjbVZoZEdVZ2RHaGxJSEJoYm01bGNseHVJQ0FnSUNBZ2JtOWtaVnRwYm1SbGVGMHVjR0Z1Ym1WeUlEMGdZM1I0TG1OeVpXRjBaVkJoYm01bGNpZ3BPMXh1SUNBZ0lDQWdibTlrWlZ0cGJtUmxlRjB1Y0dGdWJtVnlMbkJoYm01cGJtZE5iMlJsYkNBOUlITmxiR1l1WDIxdlpHVnNJSHg4SUNkbGNYVmhiSEJ2ZDJWeUp6dGNiaUFnSUNBZ0lHNXZaR1ZiYVc1a1pYaGRMbkJoYm01bGNpNXpaWFJRYjNOcGRHbHZiaWh6Wld4bUxsOXdiM016WkZzd1hTd2djMlZzWmk1ZmNHOXpNMlJiTVYwc0lITmxiR1l1WDNCdmN6TmtXekpkS1R0Y2JpQWdJQ0FnSUc1dlpHVmJhVzVrWlhoZExuQmhibTVsY2k1amIyNXVaV04wS0c1dlpHVmJhVzVrWlhoZEtUdGNibHh1SUNBZ0lDQWdjbVYwZFhKdUlHNXZaR1ZiYVc1a1pYaGRPMXh1SUNBZ0lIMHNYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJEWVd4c0wzTmxkQ0JqZFhOMGIyMGdaWFpsYm5SekxseHVJQ0FnSUNBcUlFQndZWEpoYlNBZ2UxTjBjbWx1WjMwZ0lDQmxkbVZ1ZENCRmRtVnVkQ0IwZVhCbExseHVJQ0FnSUNBcUlFQndZWEpoYlNBZ2UwWjFibU4wYVc5dWZTQm1iaUFnSUNCR2RXNWpkR2x2YmlCMGJ5QmpZV3hzTGx4dUlDQWdJQ0FxSUVCeVpYUjFjbTRnZTBodmQyeDlYRzRnSUNBZ0lDb3ZYRzRnSUNBZ2IyNDZJR1oxYm1OMGFXOXVLR1YyWlc1MExDQm1iaWtnZTF4dUlDQWdJQ0FnZG1GeUlITmxiR1lnUFNCMGFHbHpMRnh1SUNBZ0lDQWdJQ0JsZG1WdWRITWdQU0J6Wld4bVd5ZGZiMjRuSUNzZ1pYWmxiblJkTzF4dVhHNGdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHWnVJRDA5UFNBblpuVnVZM1JwYjI0bktTQjdYRzRnSUNBZ0lDQWdJR1YyWlc1MGN5NXdkWE5vS0dadUtUdGNiaUFnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHazlNRHNnYVR4bGRtVnVkSE11YkdWdVozUm9PeUJwS3lzcElIdGNiaUFnSUNBZ0lDQWdJQ0JwWmlBb1ptNHBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHVjJaVzUwYzF0cFhTNWpZV3hzS0hObGJHWXNJR1p1S1R0Y2JpQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWlhabGJuUnpXMmxkTG1OaGJHd29jMlZzWmlrN1hHNGdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUhKbGRIVnliaUJ6Wld4bU8xeHVJQ0FnSUgwc1hHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQlNaVzF2ZG1VZ1lTQmpkWE4wYjIwZ1pYWmxiblF1WEc0Z0lDQWdJQ29nUUhCaGNtRnRJQ0I3VTNSeWFXNW5mU0FnSUdWMlpXNTBJRVYyWlc1MElIUjVjR1V1WEc0Z0lDQWdJQ29nUUhCaGNtRnRJQ0I3Um5WdVkzUnBiMjU5SUdadUlDQWdJRXhwYzNSbGJtVnlJSFJ2SUhKbGJXOTJaUzVjYmlBZ0lDQWdLaUJBY21WMGRYSnVJSHRJYjNkc2ZWeHVJQ0FnSUNBcUwxeHVJQ0FnSUc5bVpqb2dablZ1WTNScGIyNG9aWFpsYm5Rc0lHWnVLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2MyVnNaaUE5SUhSb2FYTXNYRzRnSUNBZ0lDQWdJR1YyWlc1MGN5QTlJSE5sYkdaYkoxOXZiaWNnS3lCbGRtVnVkRjA3WEc1Y2JpQWdJQ0FnSUdsbUlDaG1iaWtnZTF4dUlDQWdJQ0FnSUNBdkx5QnNiMjl3SUhSb2NtOTFaMmdnWm5WdVkzUnBiMjV6SUdsdUlIUm9aU0JsZG1WdWRDQm1iM0lnWTI5dGNHRnlhWE52Ymx4dUlDQWdJQ0FnSUNCbWIzSWdLSFpoY2lCcFBUQTdJR2s4WlhabGJuUnpMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNBZ0lDQWdhV1lnS0dadUlEMDlQU0JsZG1WdWRITmJhVjBwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1YyWlc1MGN5NXpjR3hwWTJVb2FTd2dNU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmljbVZoYXp0Y2JpQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJSE5sYkdaYkoxOXZiaWNnS3lCbGRtVnVkRjBnUFNCYlhUdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdjbVYwZFhKdUlITmxiR1k3WEc0Z0lDQWdmU3hjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUZWdWJHOWhaQ0JoYm1RZ1pHVnpkSEp2ZVNCMGFHVWdZM1Z5Y21WdWRDQkliM2RzSUc5aWFtVmpkQzVjYmlBZ0lDQWdLaUJVYUdseklIZHBiR3dnYVcxdFpXUnBZWFJsYkhrZ2MzUnZjQ0JoYkd3Z2NHeGhlU0JwYm5OMFlXNWpaWE1nWVhSMFlXTm9aV1FnZEc4Z2RHaHBjeUJ6YjNWdVpDNWNiaUFnSUNBZ0tpOWNiaUFnSUNCMWJteHZZV1E2SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ2RtRnlJSE5sYkdZZ1BTQjBhR2x6TzF4dVhHNGdJQ0FnSUNBdkx5QnpkRzl3SUhCc1lYbHBibWNnWVc1NUlHRmpkR2wyWlNCdWIyUmxjMXh1SUNBZ0lDQWdkbUZ5SUc1dlpHVnpJRDBnYzJWc1ppNWZZWFZrYVc5T2IyUmxPMXh1SUNBZ0lDQWdabTl5SUNoMllYSWdhVDB3T3lCcFBITmxiR1l1WDJGMVpHbHZUbTlrWlM1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdJQ0F2THlCemRHOXdJSFJvWlNCemIzVnVaQ0JwWmlCcGRDQnBjeUJqZFhKeVpXNTBiSGtnY0d4aGVXbHVaMXh1SUNBZ0lDQWdJQ0JwWmlBb0lXNXZaR1Z6VzJsZExuQmhkWE5sWkNrZ2UxeHVJQ0FnSUNBZ0lDQWdJSE5sYkdZdWMzUnZjQ2h1YjJSbGMxdHBYUzVwWkNrN1hHNGdJQ0FnSUNBZ0lDQWdjMlZzWmk1dmJpZ25aVzVrSnl3Z2JtOWtaWE5iYVYwdWFXUXBPMXh1SUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ2FXWWdLQ0Z6Wld4bUxsOTNaV0pCZFdScGJ5a2dlMXh1SUNBZ0lDQWdJQ0FnSUM4dklISmxiVzkyWlNCMGFHVWdjMjkxY21ObElHbG1JSFZ6YVc1bklFaFVUVXcxSUVGMVpHbHZYRzRnSUNBZ0lDQWdJQ0FnYm05a1pYTmJhVjB1YzNKaklEMGdKeWM3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0x5OGdaR2x6WTI5dWJtVmpkQ0IwYUdVZ2IzVjBjSFYwSUdaeWIyMGdkR2hsSUcxaGMzUmxjaUJuWVdsdVhHNGdJQ0FnSUNBZ0lDQWdibTlrWlhOYmFWMHVaR2x6WTI5dWJtVmpkQ2d3S1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJ0WVd0bElITjFjbVVnWVd4c0lIUnBiV1Z2ZFhSeklHRnlaU0JqYkdWaGNtVmtYRzRnSUNBZ0lDQm1iM0lnS0drOU1Ec2dhVHh6Wld4bUxsOXZibVZ1WkZScGJXVnlMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNBZ0lHTnNaV0Z5VkdsdFpXOTFkQ2h6Wld4bUxsOXZibVZ1WkZScGJXVnlXMmxkTG5ScGJXVnlLVHRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnTHk4Z2NtVnRiM1psSUhSb1pTQnlaV1psY21WdVkyVWdhVzRnZEdobElHZHNiMkpoYkNCSWIzZHNaWElnYjJKcVpXTjBYRzRnSUNBZ0lDQjJZWElnYVc1a1pYZ2dQU0JJYjNkc1pYSXVYMmh2ZDJ4ekxtbHVaR1Y0VDJZb2MyVnNaaWs3WEc0Z0lDQWdJQ0JwWmlBb2FXNWtaWGdnSVQwOUlHNTFiR3dnSmlZZ2FXNWtaWGdnUGowZ01Da2dlMXh1SUNBZ0lDQWdJQ0JJYjNkc1pYSXVYMmh2ZDJ4ekxuTndiR2xqWlNocGJtUmxlQ3dnTVNrN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJR1JsYkdWMFpTQjBhR2x6SUhOdmRXNWtJR1p5YjIwZ2RHaGxJR05oWTJobFhHNGdJQ0FnSUNCa1pXeGxkR1VnWTJGamFHVmJjMlZzWmk1ZmMzSmpYVHRjYmlBZ0lDQWdJSE5sYkdZZ1BTQnVkV3hzTzF4dUlDQWdJSDFjYmx4dUlDQjlPMXh1WEc0Z0lDOHZJRzl1YkhrZ1pHVm1hVzVsSUhSb1pYTmxJR1oxYm1OMGFXOXVjeUIzYUdWdUlIVnphVzVuSUZkbFlrRjFaR2x2WEc0Z0lHbG1JQ2gxYzJsdVoxZGxZa0YxWkdsdktTQjdYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJDZFdabVpYSWdZU0J6YjNWdVpDQm1jbTl0SUZWU1RDQW9iM0lnWm5KdmJTQmpZV05vWlNrZ1lXNWtJR1JsWTI5a1pTQjBieUJoZFdScGJ5QnpiM1Z5WTJVZ0tGZGxZaUJCZFdScGJ5QkJVRWtwTGx4dUlDQWdJQ0FxSUVCd1lYSmhiU0FnZTA5aWFtVmpkSDBnYjJKcUlGUm9aU0JJYjNkc0lHOWlhbVZqZENCbWIzSWdkR2hsSUhOdmRXNWtJSFJ2SUd4dllXUXVYRzRnSUNBZ0lDb2dRSEJoY21GdElDQjdVM1J5YVc1bmZTQjFjbXdnVkdobElIQmhkR2dnZEc4Z2RHaGxJSE52ZFc1a0lHWnBiR1V1WEc0Z0lDQWdJQ292WEc0Z0lDQWdkbUZ5SUd4dllXUkNkV1ptWlhJZ1BTQm1kVzVqZEdsdmJpaHZZbW9zSUhWeWJDa2dlMXh1SUNBZ0lDQWdMeThnWTJobFkyc2dhV1lnZEdobElHSjFabVpsY2lCb1lYTWdZV3h5WldGa2VTQmlaV1Z1SUdOaFkyaGxaRnh1SUNBZ0lDQWdhV1lnS0hWeWJDQnBiaUJqWVdOb1pTa2dlMXh1SUNBZ0lDQWdJQ0F2THlCelpYUWdkR2hsSUdSMWNtRjBhVzl1SUdaeWIyMGdkR2hsSUdOaFkyaGxYRzRnSUNBZ0lDQWdJRzlpYWk1ZlpIVnlZWFJwYjI0Z1BTQmpZV05vWlZ0MWNteGRMbVIxY21GMGFXOXVPMXh1WEc0Z0lDQWdJQ0FnSUM4dklHeHZZV1FnZEdobElITnZkVzVrSUdsdWRHOGdkR2hwY3lCdlltcGxZM1JjYmlBZ0lDQWdJQ0FnYkc5aFpGTnZkVzVrS0c5aWFpazdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lGeHVJQ0FnSUNBZ2FXWWdLQzllWkdGMFlUcGJYanRkS3p0aVlYTmxOalFzTHk1MFpYTjBLSFZ5YkNrcElIdGNiaUFnSUNBZ0lDQWdMeThnUkdWamIyUmxJR0poYzJVMk5DQmtZWFJoTFZWU1NYTWdZbVZqWVhWelpTQnpiMjFsSUdKeWIzZHpaWEp6SUdOaGJtNXZkQ0JzYjJGa0lHUmhkR0V0VlZKSmN5QjNhWFJvSUZoTlRFaDBkSEJTWlhGMVpYTjBMbHh1SUNBZ0lDQWdJQ0IyWVhJZ1pHRjBZU0E5SUdGMGIySW9kWEpzTG5Od2JHbDBLQ2NzSnlsYk1WMHBPMXh1SUNBZ0lDQWdJQ0IyWVhJZ1pHRjBZVlpwWlhjZ1BTQnVaWGNnVldsdWREaEJjbkpoZVNoa1lYUmhMbXhsYm1kMGFDazdYRzRnSUNBZ0lDQWdJR1p2Y2lBb2RtRnlJR2s5TURzZ2FUeGtZWFJoTG14bGJtZDBhRHNnS3l0cEtTQjdYRzRnSUNBZ0lDQWdJQ0FnWkdGMFlWWnBaWGRiYVYwZ1BTQmtZWFJoTG1Ob1lYSkRiMlJsUVhRb2FTazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnWEc0Z0lDQWdJQ0FnSUdSbFkyOWtaVUYxWkdsdlJHRjBZU2hrWVhSaFZtbGxkeTVpZFdabVpYSXNJRzlpYWl3Z2RYSnNLVHRjYmlBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQzh2SUd4dllXUWdkR2hsSUdKMVptWmxjaUJtY205dElIUm9aU0JWVWt4Y2JpQWdJQ0FnSUNBZ2RtRnlJSGhvY2lBOUlHNWxkeUJZVFV4SWRIUndVbVZ4ZFdWemRDZ3BPMXh1SUNBZ0lDQWdJQ0I0YUhJdWIzQmxiaWduUjBWVUp5d2dkWEpzTENCMGNuVmxLVHRjYmlBZ0lDQWdJQ0FnZUdoeUxuSmxjM0J2Ym5ObFZIbHdaU0E5SUNkaGNuSmhlV0oxWm1abGNpYzdYRzRnSUNBZ0lDQWdJSGhvY2k1dmJteHZZV1FnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdJQ0JrWldOdlpHVkJkV1JwYjBSaGRHRW9lR2h5TG5KbGMzQnZibk5sTENCdlltb3NJSFZ5YkNrN1hHNGdJQ0FnSUNBZ0lIMDdYRzRnSUNBZ0lDQWdJSGhvY2k1dmJtVnljbTl5SUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJQ0FnTHk4Z2FXWWdkR2hsY21VZ2FYTWdZVzRnWlhKeWIzSXNJSE4zYVhSamFDQjBhR1VnYzI5MWJtUWdkRzhnU0ZSTlRDQkJkV1JwYjF4dUlDQWdJQ0FnSUNBZ0lHbG1JQ2h2WW1vdVgzZGxZa0YxWkdsdktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCdlltb3VYMkoxWm1abGNpQTlJSFJ5ZFdVN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J2WW1vdVgzZGxZa0YxWkdsdklEMGdabUZzYzJVN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J2WW1vdVgyRjFaR2x2VG05a1pTQTlJRnRkTzF4dUlDQWdJQ0FnSUNBZ0lDQWdaR1ZzWlhSbElHOWlhaTVmWjJGcGJrNXZaR1U3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmtaV3hsZEdVZ1kyRmphR1ZiZFhKc1hUdGNiaUFnSUNBZ0lDQWdJQ0FnSUc5aWFpNXNiMkZrS0NrN1hHNGdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5TzF4dUlDQWdJQ0FnSUNCMGNua2dlMXh1SUNBZ0lDQWdJQ0FnSUhob2NpNXpaVzVrS0NrN1hHNGdJQ0FnSUNBZ0lIMGdZMkYwWTJnZ0tHVXBJSHRjYmlBZ0lDQWdJQ0FnSUNCNGFISXViMjVsY25KdmNpZ3BPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVHRjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUVSbFkyOWtaU0JoZFdScGJ5QmtZWFJoSUdaeWIyMGdZVzRnWVhKeVlYa2dZblZtWm1WeUxseHVJQ0FnSUNBcUlFQndZWEpoYlNBZ2UwRnljbUY1UW5WbVptVnlmU0JoY25KaGVXSjFabVpsY2lCVWFHVWdZWFZrYVc4Z1pHRjBZUzVjYmlBZ0lDQWdLaUJBY0dGeVlXMGdJSHRQWW1wbFkzUjlJRzlpYWlCVWFHVWdTRzkzYkNCdlltcGxZM1FnWm05eUlIUm9aU0J6YjNWdVpDQjBieUJzYjJGa0xseHVJQ0FnSUNBcUlFQndZWEpoYlNBZ2UxTjBjbWx1WjMwZ2RYSnNJRlJvWlNCd1lYUm9JSFJ2SUhSb1pTQnpiM1Z1WkNCbWFXeGxMbHh1SUNBZ0lDQXFMMXh1SUNBZ0lIWmhjaUJrWldOdlpHVkJkV1JwYjBSaGRHRWdQU0JtZFc1amRHbHZiaWhoY25KaGVXSjFabVpsY2l3Z2IySnFMQ0IxY213cElIdGNiaUFnSUNBZ0lDOHZJR1JsWTI5a1pTQjBhR1VnWW5WbVptVnlJR2x1ZEc4Z1lXNGdZWFZrYVc4Z2MyOTFjbU5sWEc0Z0lDQWdJQ0JqZEhndVpHVmpiMlJsUVhWa2FXOUVZWFJoS0Z4dUlDQWdJQ0FnSUNCaGNuSmhlV0oxWm1abGNpeGNiaUFnSUNBZ0lDQWdablZ1WTNScGIyNG9ZblZtWm1WeUtTQjdYRzRnSUNBZ0lDQWdJQ0FnYVdZZ0tHSjFabVpsY2lrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWTJGamFHVmJkWEpzWFNBOUlHSjFabVpsY2p0Y2JpQWdJQ0FnSUNBZ0lDQWdJR3h2WVdSVGIzVnVaQ2h2WW1vc0lHSjFabVpsY2lrN1hHNGdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5TEZ4dUlDQWdJQ0FnSUNCbWRXNWpkR2x2YmlobGNuSXBJSHRjYmlBZ0lDQWdJQ0FnSUNCdlltb3ViMjRvSjJ4dllXUmxjbkp2Y2ljc0lHVnljaWs3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNrN1hHNGdJQ0FnZlR0Y2JseHVJQ0FnSUM4cUtseHVJQ0FnSUNBcUlFWnBibWx6YUdWeklHeHZZV1JwYm1jZ2RHaGxJRmRsWWlCQmRXUnBieUJCVUVrZ2MyOTFibVFnWVc1a0lHWnBjbVZ6SUhSb1pTQnNiMkZrWldRZ1pYWmxiblJjYmlBZ0lDQWdLaUJBY0dGeVlXMGdJSHRQWW1wbFkzUjlJQ0J2WW1vZ0lDQWdWR2hsSUVodmQyd2diMkpxWldOMElHWnZjaUIwYUdVZ2MyOTFibVFnZEc4Z2JHOWhaQzVjYmlBZ0lDQWdLaUJBY0dGeVlXMGdJSHRQWW1wbFkyTjBmU0JpZFdabVpYSWdWR2hsSUdSbFkyOWtaV1FnWW5WbVptVnlJSE52ZFc1a0lITnZkWEpqWlM1Y2JpQWdJQ0FnS2k5Y2JpQWdJQ0IyWVhJZ2JHOWhaRk52ZFc1a0lEMGdablZ1WTNScGIyNG9iMkpxTENCaWRXWm1aWElwSUh0Y2JpQWdJQ0FnSUM4dklITmxkQ0IwYUdVZ1pIVnlZWFJwYjI1Y2JpQWdJQ0FnSUc5aWFpNWZaSFZ5WVhScGIyNGdQU0FvWW5WbVptVnlLU0EvSUdKMVptWmxjaTVrZFhKaGRHbHZiaUE2SUc5aWFpNWZaSFZ5WVhScGIyNDdYRzVjYmlBZ0lDQWdJQzh2SUhObGRIVndJR0VnYzNCeWFYUmxJR2xtSUc1dmJtVWdhWE1nWkdWbWFXNWxaRnh1SUNBZ0lDQWdhV1lnS0U5aWFtVmpkQzVuWlhSUGQyNVFjbTl3WlhKMGVVNWhiV1Z6S0c5aWFpNWZjM0J5YVhSbEtTNXNaVzVuZEdnZ1BUMDlJREFwSUh0Y2JpQWdJQ0FnSUNBZ2IySnFMbDl6Y0hKcGRHVWdQU0I3WDJSbFptRjFiSFE2SUZzd0xDQnZZbW91WDJSMWNtRjBhVzl1SUNvZ01UQXdNRjE5TzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBdkx5Qm1hWEpsSUhSb1pTQnNiMkZrWldRZ1pYWmxiblJjYmlBZ0lDQWdJR2xtSUNnaGIySnFMbDlzYjJGa1pXUXBJSHRjYmlBZ0lDQWdJQ0FnYjJKcUxsOXNiMkZrWldRZ1BTQjBjblZsTzF4dUlDQWdJQ0FnSUNCdlltb3ViMjRvSjJ4dllXUW5LVHRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnYVdZZ0tHOWlhaTVmWVhWMGIzQnNZWGtwSUh0Y2JpQWdJQ0FnSUNBZ2IySnFMbkJzWVhrb0tUdGNiaUFnSUNBZ0lIMWNiaUFnSUNCOU8xeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2dURzloWkNCMGFHVWdjMjkxYm1RZ1ltRmpheUJwYm5SdklIUm9aU0JpZFdabVpYSWdjMjkxY21ObExseHVJQ0FnSUNBcUlFQndZWEpoYlNBZ2UwOWlhbVZqZEgwZ2IySnFJQ0FnVkdobElITnZkVzVrSUhSdklHeHZZV1F1WEc0Z0lDQWdJQ29nUUhCaGNtRnRJQ0I3UVhKeVlYbDlJQ0JzYjI5d0lDQk1iMjl3SUdKdmIyeGxZVzRzSUhCdmN5d2dZVzVrSUdSMWNtRjBhVzl1TGx4dUlDQWdJQ0FxSUVCd1lYSmhiU0FnZTFOMGNtbHVaMzBnYVdRZ0lDQWdLRzl3ZEdsdmJtRnNLU0JVYUdVZ2NHeGhlU0JwYm5OMFlXNWpaU0JKUkM1Y2JpQWdJQ0FnS2k5Y2JpQWdJQ0IyWVhJZ2NtVm1jbVZ6YUVKMVptWmxjaUE5SUdaMWJtTjBhVzl1S0c5aWFpd2diRzl2Y0N3Z2FXUXBJSHRjYmlBZ0lDQWdJQzh2SUdSbGRHVnliV2x1WlNCM2FHbGphQ0J1YjJSbElIUnZJR052Ym01bFkzUWdkRzljYmlBZ0lDQWdJSFpoY2lCdWIyUmxJRDBnYjJKcUxsOXViMlJsUW5sSlpDaHBaQ2s3WEc1Y2JpQWdJQ0FnSUM4dklITmxkSFZ3SUhSb1pTQmlkV1ptWlhJZ2MyOTFjbU5sSUdadmNpQndiR0Y1WW1GamExeHVJQ0FnSUNBZ2JtOWtaUzVpZFdabVpYSlRiM1Z5WTJVZ1BTQmpkSGd1WTNKbFlYUmxRblZtWm1WeVUyOTFjbU5sS0NrN1hHNGdJQ0FnSUNCdWIyUmxMbUoxWm1abGNsTnZkWEpqWlM1aWRXWm1aWElnUFNCallXTm9aVnR2WW1vdVgzTnlZMTA3WEc0Z0lDQWdJQ0J1YjJSbExtSjFabVpsY2xOdmRYSmpaUzVqYjI1dVpXTjBLRzV2WkdVdWNHRnVibVZ5S1R0Y2JpQWdJQ0FnSUc1dlpHVXVZblZtWm1WeVUyOTFjbU5sTG14dmIzQWdQU0JzYjI5d1d6QmRPMXh1SUNBZ0lDQWdhV1lnS0d4dmIzQmJNRjBwSUh0Y2JpQWdJQ0FnSUNBZ2JtOWtaUzVpZFdabVpYSlRiM1Z5WTJVdWJHOXZjRk4wWVhKMElEMGdiRzl2Y0ZzeFhUdGNiaUFnSUNBZ0lDQWdibTlrWlM1aWRXWm1aWEpUYjNWeVkyVXViRzl2Y0VWdVpDQTlJR3h2YjNCYk1WMGdLeUJzYjI5d1d6SmRPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdibTlrWlM1aWRXWm1aWEpUYjNWeVkyVXVjR3hoZVdKaFkydFNZWFJsTG5aaGJIVmxJRDBnYjJKcUxsOXlZWFJsTzF4dUlDQWdJSDA3WEc1Y2JpQWdmVnh1WEc0Z0lDOHFLbHh1SUNBZ0tpQkJaR1FnYzNWd2NHOXlkQ0JtYjNJZ1FVMUVJQ2hCYzNsdVkyaHliMjV2ZFhNZ1RXOWtkV3hsSUVSbFptbHVhWFJwYjI0cElHeHBZbkpoY21sbGN5QnpkV05vSUdGeklISmxjWFZwY21VdWFuTXVYRzRnSUNBcUwxeHVJQ0JwWmlBb2RIbHdaVzltSUdSbFptbHVaU0E5UFQwZ0oyWjFibU4wYVc5dUp5QW1KaUJrWldacGJtVXVZVzFrS1NCN1hHNGdJQ0FnWkdWbWFXNWxLR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJSHRjYmlBZ0lDQWdJQ0FnU0c5M2JHVnlPaUJJYjNkc1pYSXNYRzRnSUNBZ0lDQWdJRWh2ZDJ3NklFaHZkMnhjYmlBZ0lDQWdJSDA3WEc0Z0lDQWdmU2s3WEc0Z0lIMWNibHh1SUNBdktpcGNiaUFnSUNvZ1FXUmtJSE4xY0hCdmNuUWdabTl5SUVOdmJXMXZia3BUSUd4cFluSmhjbWxsY3lCemRXTm9JR0Z6SUdKeWIzZHpaWEpwWm5rdVhHNGdJQ0FxTDF4dUlDQnBaaUFvZEhsd1pXOW1JR1Y0Y0c5eWRITWdJVDA5SUNkMWJtUmxabWx1WldRbktTQjdYRzRnSUNBZ1pYaHdiM0owY3k1SWIzZHNaWElnUFNCSWIzZHNaWEk3WEc0Z0lDQWdaWGh3YjNKMGN5NUliM2RzSUQwZ1NHOTNiRHRjYmlBZ2ZWeHVYRzRnSUM4dklHUmxabWx1WlNCbmJHOWlZV3hzZVNCcGJpQmpZWE5sSUVGTlJDQnBjeUJ1YjNRZ1lYWmhhV3hoWW14bElHOXlJR0YyWVdsc1lXSnNaU0JpZFhRZ2JtOTBJSFZ6WldSY2JseHVJQ0JwWmlBb2RIbHdaVzltSUhkcGJtUnZkeUFoUFQwZ0ozVnVaR1ZtYVc1bFpDY3BJSHRjYmlBZ0lDQjNhVzVrYjNjdVNHOTNiR1Z5SUQwZ1NHOTNiR1Z5TzF4dUlDQWdJSGRwYm1SdmR5NUliM2RzSUQwZ1NHOTNiRHRjYmlBZ2ZWeHVYRzU5S1NncE95SmRMQ0ptYVd4bElqb2lkbVZ1Wkc5eUwyaHZkMnhsY2k1cWN5SjkiXSwiZmlsZSI6InZlbmRvci9ob3dsZXIuanMifQ==
