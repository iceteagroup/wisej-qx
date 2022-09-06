/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)

************************************************************************ */

/**
 * The ImageLoader can preload and manage loaded image resources. It easily
 * handles multiple requests and supports callbacks for successful and failed
 * requests.
 *
 * After loading of an image the dimension of the image is stored as long
 * as the application is running. This is quite useful for in-memory layouting.
 *
 * Use {@link #load} to preload your own images.
 */
qx.Bootstrap.define("qx.io.ImageLoader",
{
  statics :
  {
    /** @type {Map} Internal data structure to cache image sizes */
    __data : {},


    /** @type {Map} Default image size */
    __defaultSize :
    {
      width : null,
      height : null
    },

    /** @type {RegExp} Known image types */
    // @ITG:Wisej: Added support for embedded svg images.
    // __knownImageTypesRegExp: /\.(png|gif|jpg|jpeg|bmp)\b/i,
    __knownImageTypesRegExp: /\.(png|gif|jpg|jpeg|bmp|svg)\b/i,

    /** @type {RegExp} Image types of a data URL */
    // @ITG:Wisej: Added support for embedded svg images.
    // __dataUrlRegExp : /^data:image\/(png|gif|jpg|jpeg|bmp)\b/i,
    __dataUrlRegExp: /^data:image\/(png|gif|jpg|jpeg|bmp|svg)\b/i,

    /**
     * Whether the given image has previously been loaded using the
     * {@link #load} method.
     *
     * @param source {String} Image source to query
     * @return {Boolean} <code>true</code> when the image is loaded
     */
    isLoaded : function(source)
    {
      var entry = this.__data[this.__getKey(source)];
      return !!(entry && entry.loaded);
    },


    /**
     * Whether the given image has previously been requested using the
     * {@link #load} method but failed.
     *
     * @param source {String} Image source to query
     * @return {Boolean} <code>true</code> when the image loading failed
     */
    isFailed : function(source)
    {
      var entry = this.__data[this.__getKey(source)];
      return !!(entry && entry.failed);
    },


    /**
     * Whether the given image is currently loading.
     *
     * @param source {String} Image source to query
     * @return {Boolean} <code>true</code> when the image is loading in the moment.
     */
    isLoading : function(source)
    {
      var entry = this.__data[this.__getKey(source)];
      return !!(entry && entry.loading);
    },


    /**
     * Returns the format of a previously loaded image
     *
     * @param source {String} Image source to query
     * @return {String ? null} The format of the image or <code>null</code>
     */
    getFormat : function(source)
    {
      var entry = this.__data[this.__getKey(source)];

      if (! entry || ! entry.format)
      {
        // @ITG:Wisej: Fixed to return the format of a regular URL as well as a data uri.
        var result = this.__dataUrlRegExp.exec(source) || this.__knownImageTypesRegExp.exec(source);

        if (result != null)
        {
          // If width and height aren't defined, provide some defaults
          var width =
            (entry && qx.lang.Type.isNumber(entry.width)
             ? entry.width
             : this.__defaultSize.width);

          var height =
            (entry && qx.lang.Type.isNumber(entry.height)
             ? entry.height
             : this.__defaultSize.height);

          entry =
            {
              loaded : true,
              format : result[1],
              width  : width,
              height : height
            };
        }
      }

      return entry ? entry.format : null;
    },


    /**
     * Returns the size of a previously loaded image
     *
     * @param source {String} Image source to query
     * @return {Map} The dimension of the image (<code>width</code> and
     *    <code>height</code> as key). If the image is not yet loaded, the
     *    dimensions are given as <code>null</code> for width and height.
     */
    getSize : function(source) {
      var entry = this.__data[this.__getKey(source)];
      return entry ? { width: entry.width, height: entry.height } : this.__defaultSize;
    },


    /**
     * Returns the image width
     *
     * @param source {String} Image source to query
     * @return {Integer} The width or <code>null</code> when the image is not loaded
     */
    getWidth : function(source)
    {
      var entry = this.__data[this.__getKey(source)];
      return entry ? entry.width : null;
    },


    /**
     * Returns the image height
     *
     * @param source {String} Image source to query
     * @return {Integer} The height or <code>null</code> when the image is not loaded
     */
    getHeight : function(source)
    {
      var entry = this.__data[this.__getKey(source)];
      return entry ? entry.height : null;
    },


    /**
     * Loads the given image. Supports a callback which is
     * executed when the image is loaded.
     *
     * This method works asynchronous.
     *
     * @param source {String} Image source to load
     * @param callback {Function?} Callback function to execute
     *   The first parameter of the callback is the given source url, the
     *   second parameter is the data entry which contains additional
     *   information about the image.
     * @param context {Object?} Context in which the given callback should be executed
     */
    load : function(source, callback, context)
    {

      // @ITG:Wisej: Protect against null sources.
      if (!source)
        return;

      // Shorthand
      var key = this.__getKey(source);
      var entry = this.__data[key];

      if (!entry) {
        entry = this.__data[key] = {};
      }

      // Normalize context
      if (callback && !context) {
        context = window;
      }

      // Already known image source
      if (entry.loaded || entry.loading || entry.failed)
      {
        if (callback)
        {
          if (entry.loading) {
            entry.callbacks.push(callback, context);
          } else {
            callback.call(context, source, entry);
          }
        }
      }
      else
      {
        // Updating entry
        entry.loading = true;
        entry.callbacks = [];

        if (callback) {
          entry.callbacks.push(callback, context);
        }

        // @ITG:Wisej: Added separate handling for SVG images. If it's a url we download the file using an xhr request
        // in order to receive the actual SVG XML, parse it and save the parsed xml with the preloaded image data.
        // When the code requests an SVG image it will receive the onLoad callback with the data containing the XML doc.
        if (source && (source.indexOf(".svg") > -1 || source.indexOf("data:image/svg+xml;") == 0)) {

            // load http urls using an XMLHttpRequest.
            if (source.indexOf("data:image/svg+xml;") == -1) {
                this.__loadSvgUrl(entry, source);
                return;
            }

            // load the data uri immediately.
            try {
                entry.format = "svg";
                entry.loaded = true;
                entry.svg = this.__parseSvgDataUrl(source);
                this.__setSvgSize(entry, entry.svg);
            }
            catch (ex) {
                entry.failed = true;
                qx.log.Logger.error("Error parsing the SVG: " + source.substr(0, 100), ex);
            }

            // perform callbacks.
            var callbacks = entry.callbacks;
            delete entry.loading;
            delete entry.callbacks;
            for (var i = 0, l = callbacks.length; i < l; i += 2) {
                callbacks[i].call(callbacks[i + 1], source, entry);
            }
            return;
        }

        // Create image element
        var el = document.createElement('img');

        // Create common callback routine
        var boundCallback = qx.lang.Function.listener(this.__onload, this, el, source);

        // Assign callback to element
        el.onload = boundCallback;
        el.onerror = boundCallback;

        // Start loading of image
        el.src = source;

        // save the element for aborting
        entry.element = el;
      }
    },

    /**
     * Loads the SVG image from a url.
     */
    __loadSvgUrl: function (entry, source) {

        var url = source;
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {

                if (xhr.status == 200) {

                    var callbacks = entry.callbacks;
                    delete entry.loading;
                    delete entry.callbacks;
                    delete entry.element;

                    // the SVG file has been downloaded (already parsed for us): complete the callbacks.
                    entry.format = "svg";
                    if (xhr.responseXML != null) {
                        entry.loaded = true;
                        entry.svg = xhr.responseXML;
                        qx.io.ImageLoader.__setSvgSize(entry, entry.svg);
                    }
                    else {
                        entry.failed = true;
                        qx.log.Logger.error("Invalid SVG: " + url);
                    }

                    if (callbacks) {
                      for (var i = 0, l = callbacks.length; i < l; i += 2) {
                        callbacks[i].call(callbacks[i + 1], url, entry);
                      }
                    }
                }
            }
        };
        xhr.onerror = function () {
            entry.failed = true;
            var callbacks = entry.callbacks;
            delete entry.loading;
            delete entry.callbacks;
            delete entry.element;

            qx.log.Logger.error("Error " + xhr.status + " loading the SVG from: " + url);

            for (var i = 0, l = callbacks.length; i < l; i += 2) {
                callbacks[i].call(callbacks[i + 1], url, entry);
            }
        };
        xhr.ontimeout = function () {
            entry.failed = true;
            var callbacks = entry.callbacks;
            delete entry.loading;
            delete entry.callbacks;
            delete entry.element;

            qx.log.Logger.error("Timeout loading the SVG from: " + url);

            for (var i = 0, l = callbacks.length; i < l; i += 2) {
                callbacks[i].call(callbacks[i + 1], url, entry);
            }
        };
        xhr.send();

    },

    // @ITG:Wisej: Added support for SVG icons.
    /**
     * Parses a SVG Data url to a XMLDocument.
     */
    __parseSvgDataUrl: function (dataUri) {

        if (!dataUri)
            return;

        var svgString;

        // remove: data:image/svg+xml;utf8,
        // remove: data:image/svg+xml;base64,
        if (dataUri.indexOf("data:image/svg+xml;base64") == 0) {
            var startPos = dataUri.indexOf(",") + 1;
            if (startPos > 0) {
                svgString = window.atob
                    ? atob(dataUri.substr(startPos))
                    : qx.util.Base64.decode(dataUri.substr(startPos));
            }
        }
        else if (dataUri.indexOf("data:image/svg+xml;utf8") == 0) {
            var startPos = dataUri.indexOf(",") + 1;
            if (startPos > 0)
                svgString = dataUri.substr(startPos);
        }

        return this.__parseSvgString(svgString);
    },

    // @ITG:Wisej: Added support for SVG icons.
    /** 
     * Parses a SVG XML string to a XMLDocument.
     */
    __parseSvgString: function (svgString) {

        if (!svgString)
            return;

        if (!window.DOMParser) {
         qx.log.Logger.error("DOMParser is not supported.");
          return null;
        }

        var parser = new DOMParser();
        return parser.parseFromString(svgString, "image/svg+xml");

    },

    // @ITG:Wisej: Added support for SVG icons.
    /** 
     * Assigns the preferred size for the svg image.
     */
    __setSvgSize: function (entry, svg)
    {
        if (!entry || !svg || !svg.getAttribute)
            return;

        entry.width = parseInt(svg.getAttribute("width"));
        entry.height = parseInt(svg.getAttribute("height"));
    },

    /**
     * Returns the preparsed XML document for the SVG image.
     *
     * @param source {String} The source url or data-url for which to return the SVG XML document.
     * @return {XMLDocument} The SVG XML document if the image is preloaded, otherwise null.
     */
    getSvg: function (source) {

        var entry = this.__data[this.__getKey(source)];
        return entry == null
            ? null
            : entry.format == "svg" ? entry.svg : null;
    },

    // @ITG:Wisej: Fixed the abort method to abort the specified callback, otherwise it always aborts loading the image for every widget loading the same image.

    /**
     * Abort the loading for the given url.
     *
     * @param source {String} URL of the image to abort its loading.
     * @param context {Object?} Context of the callback to abort. If null, or if it's the only callback context, loading the image is actually aborted.
     */
    abort : function (source, context)
    {
      var key = this.__getKey(source);
      var entry = this.__data[key];

      if (entry && !entry.loaded)
      {
        var callbacks = entry.callbacks;

        // abort only the specified callbacks.
        if (context && callbacks) {

            for (var i = callbacks.length - 2; i > -1; i -= 2) {

                if (callbacks[i + 1] == context) {

                    try {
                        entry.aborted = true;
                        callbacks[i].call(callbacks[i + 1], source, entry);
                    }
                    finally {
                        entry.aborted = false;
                        callbacks.splice(i, 2);
                    }
                }
            }

            // if there are more listeners, don't abort loading the image.
            if (callbacks.length > 0)
                return;
        }

        var element = entry.element;

        // @ITG:Wisej prevent null error when aborting too soon.
        if (element) {
          // Cleanup listeners
          element.onload = element.onerror = null;

          // prevent further loading
          element.src = "";
        }
        // Cleanup entry
        delete entry.callbacks;
        delete entry.element;
        delete entry.loading;

        // Abort
        entry.aborted = true;

        if (callbacks) {
          for (var i = 0, l = callbacks.length; i < l; i += 2) {
            callbacks[i].call(callbacks[i+1], source, entry);
          }
        }
      }

      this.__data[key] = null;
    },


    /**
     * Calls a method based on qx.globalErrorHandling
     */
    __onload: function () {

      var callback = qx.core.Environment.select("qx.globalErrorHandling", {
        "true": qx.event.GlobalError.observeMethod(this.__onLoadHandler),
        "false": this.__onLoadHandler
      }); // @ITG:Wisej: Missing semicolon...

      // @ITG:Wisej: Fix preload flickering error with FireFox, IE and Edge by
      // processing the image using the 2D canvas sync drawImage call.
      if (qx.core.Environment.get("browser.name") != "chrome") {
        if (arguments[0].type !== "error") {
          try {
            var ctx = this.__image2dContext;
            if (ctx == null) {
              ctx = this.__image2dContext = document.createElement("canvas").getContext("2d");
            }
            if (ctx)
              ctx.drawImage(arguments[1], 0, 0);
          }
          catch (error) {
            qx.log.Logger.error("Error pre-rendering the image: " + arguments[2], error);
          }
        }
      }

      callback.apply(this, arguments);
    },


    /**
     * Internal event listener for all load/error events.
     *
     * @signature function(event, element, source)
     *
     * @param event {Event} Native event object
     * @param element {Element} DOM element which represents the image
     * @param source {String} The image source loaded
     */
    __onLoadHandler: function (event, element, source) {
      // Shorthand
      var entry = this.__data[this.__getKey(source)];

      // [BUG #9149]: When loading a SVG IE11 won't have
      // the width/height of the element set, unless 
      // it is inserted into the DOM.
      if(qx.bom.client.Engine.getName() == "mshtml" &&
          parseFloat(qx.bom.client.Engine.getVersion()) === 11)
      {
        document.body.appendChild(element);
      }

      // @ITG:Wisej: No need to create a child function on each call...
      //var isImageAvailable = function (imgElem) {
      //  return (imgElem && imgElem.height !== 0 || imgElem.src.indexOf("data:image") == 0);
      //};

      // @ITG:Wisej: If the image  is coming from a data string we need to use a different regex
      // to determine the format.
      var isDataUrl = source.indexOf("data:image") > -1;
      var isDataUrlSvg = isDataUrl && source.indexOf("data:image/svg+xml;") == 0;

      // [BUG #7497]: IE11 doesn't properly emit an error event
      // when loading fails so augment success check
      if (event.type === "load" && (element && (isDataUrlSvg || element.height > 0))) {

        // Store dimensions
        entry.loaded = true;
        entry.width = element.width;
        entry.height = element.height;

        // @ITG:Wisej: Parse the SVG string.
        if (isDataUrlSvg) {
            try {
                entry.svg = this.__parseSvgDataUrl(source);
            }
            catch (ex) {
                entry.failed = true;
                qx.log.Logger.error("Error parsing the SVG: " + source.substr(0, 100), ex);
            }
        }

        // @ITG:Wisej: If the image  is coming from a data string we need to use a different regex
        // to determine the format.
        // try to determine the image format
        var result =
            isDataUrl
                ? this.__dataUrlRegExp.exec(source)
                : this.__knownImageTypesRegExp.exec(source);

        if (result != null) {
          entry.format = result[1];
        }

      }
      else {

        entry.failed = true;
      }

      if(qx.bom.client.Engine.getName() == "mshtml" &&
          parseFloat(qx.bom.client.Engine.getVersion()) === 11)
      {
        document.body.removeChild(element);
      }

      // Cleanup listeners
      element.onload = element.onerror = null;

      // Cache callbacks
      var callbacks = entry.callbacks;

      // Cleanup entry
      delete entry.loading;
      delete entry.callbacks;
      delete entry.element;

      // Execute callbacks
      for (var i = 0, l = callbacks.length; i < l; i += 2) {
        callbacks[i].call(callbacks[i + 1], source, entry);
      }
    },

    // @ITG:Wisej: Use a smaller key to find images in the __data collection.
    // Otherwise when we load large base64 images the keys are huge.
    /**
     * Returns a (more or less) unique key for the source.
     */
    __getKey: function (source) {
        return qx.lang.String.toHashCode(source);
    },

    /**
     * Dispose stored images.
     */
    dispose : function()
    {
      this.__data = {};
    }
  }
});
