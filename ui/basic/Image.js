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
     * Fabian Jakobs (fjakobs)
     * Sebastian Werner (wpbasti)

************************************************************************ */

/**
 * The image class displays an image file
 *
 * This class supports image clipping, which means that multiple images can be combined
 * into one large image and only the relevant part is shown.
 *
 * *Example*
 *
 * Here is a little example of how to use the widget.
 *
 * <pre class='javascript'>
 *   var image = new qx.ui.basic.Image("icon/32/actions/format-justify-left.png");
 *
 *   this.getRoot().add(image);
 * </pre>
 *
 * This example create a widget to display the image
 * <code>icon/32/actions/format-justify-left.png</code>.
 *
 * *External Documentation*
 *
 * <a href='http://manual.qooxdoo.org/${qxversion}/pages/widget/image.html' target='_blank'>
 * Documentation of this widget in the qooxdoo manual.</a>
 */
qx.Class.define("qx.ui.basic.Image",
{
  extend : qx.ui.core.Widget,



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param source {String?null} The URL of the image to display.
   */
  construct : function(source)
  {
    this.__contentElements = {};

    this.base(arguments);

    if (source) {
      this.setSource(source);
    }
  },




  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** The URL of the image. Setting it will possibly abort loading of current image. */
    source :
    {
      check : "String",
      init : null,
      nullable : true,
      event : "changeSource",
      apply : "_applySource",
      themeable : true
    },

    /**
     * Whether the image should be scaled to the given dimensions
     *
     * This is disabled by default because it prevents the usage
     * of image clipping when enabled.
     */
    scale :
    {
      check : "Boolean",
      init : false,
      themeable : true,
      apply : "_applyScale"
    },


    // overridden
    appearance :
    {
      refine : true,
      init : "image"
    },


    // overridden
    allowShrinkX :
    {
      refine : true,
      init : false
    },


    // overridden
    allowShrinkY :
    {
      refine : true,
      init : false
    },


    // overridden
    allowGrowX :
    {
      refine : true,
      init : false
    },


    // overridden
    allowGrowY :
    {
      refine : true,
      init : false
    }
  },


  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /**
     * Fired if the image source can not be loaded. This event can only be
     * fired for the first loading of an unmanaged resource (external image).
     */
    loadingFailed : "qx.event.type.Event",


    /**
     * Fired if the image has been loaded. This is even true for managed
     * resources (images known by generator).
     */
    loaded : "qx.event.type.Event",


    /** Fired when the pending request has been aborted. */
    aborted : "qx.event.type.Event"
  },


  statics:
  {
    PLACEHOLDER_IMAGE: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",

    // @ITG:Wisej: Added support for SVG icons.
    /**
     * Changes the fill and color of the svg xml.
     *
     * @param svg {XMLDocument} The SVG image as an xml document.
     * @param color {Color} The color to to the fill and color style properties.
     * @return {XMLDocument} the svg xml with the changed color.
     */
    setSvgColor: function (svg, color) {

        if (!color)
            return svg;

        if (!svg.getElementsByTagName)
            return svg;

        // set the color and fill styles.
        var svgEl = svg.getElementsByTagName("svg")[0];
        if (svgEl) {

            // set the fill color setting the style, as a browser with css would do.
            svgEl.style.fill = svgEl.style.color = color;

            // change the fill on path elements.
            // check that all the fill colors are the same before changing.
            var isMono = true;
            var monoColor = null;
            var paths = svgEl.getElementsByTagName("*");
            for (var i = 0; i < paths.length; i++) {

                var path = paths[i];
                if (!path.style)
                    continue;

                var pathFill = path.getAttribute("fill") || path.style.fill;
                if (!pathFill || pathFill == "none")
                    continue;

                if (monoColor == null) {
                    monoColor = pathFill;
                } else if (monoColor != pathFill) {
                    isMono = false;
                    break;
                }
            }

            if (isMono) {
                svgEl.setAttribute("fill", color);

                for (var i = 0; i < paths.length; i++) {

                    var path = paths[i];
                    if (!path.style)
                        continue;

                    var pathFill = path.getAttribute("fill");
                    if (pathFill == monoColor) {
                        path.setAttribute("fill", color);
                    }

                    var pathFill = path.style.fill;
                    if (pathFill == monoColor) {
                        path.style.fill = color;
                    }
                }
            }

            // fix the svg, if needed, to make it scalable.
            var viewBox = svgEl.getAttribute("viewBox");
            if (!viewBox) {
                var width = svgEl.getAttribute("width");
                var height = svgEl.getAttribute("height");
                if (width && height)
                    svgEl.setAttribute("viewBox", "0 0 " + width + " " + height);
            }

            // attempt to remove the preset size.
            svgEl.removeAttribute("width");
            svgEl.removeAttribute("height");
            svgEl.style.width = null;
            svgEl.style.height = null;
        }

        return svg;
    },

    /**
     * Converts the svg xml document to a data uri base64.
     *
     * @param svg {XmlDocument} The SVG image to convert to a data uri.
     */
    getSvgDataUri: function (svg) {

        if (!svg.getElementsByTagName)
            return svg;

        if (!window.XMLSerializer) {
            qx.log.Logger.error("XMLSerializer is not supported.");
            return svg;
        }

        var svgHtml = (new XMLSerializer).serializeToString(svg);

        // fix IE bug with empty namespaces, it adds "xmlns:NS1=""  xmlns:NS2="", ...
        if (qx.core.Environment.get("browser.name") === "ie")
            svgHtml = svgHtml.replace(/xmlns:NS\d=\"\"/g, "").replace(/\sNS\d:/g, "");

        // return the modified embedded svg.
        return "data:image/svg+xml;base64," + qx.util.Base64.encode(svgHtml);
    },


    /**
     * Resolves the image name or URL to a map that contains the image source
     * and the optional color to apply to SVG images.
     *
     * @param urlOrName {String} The url or name of the image.
     * @param color {?String} Optional color definition. The color specified in the image url takes precedence.
     *
     * @return {Map} Returns a map containing the image source and optional color.
     */
    resolveImage: function (urlOrName, color) {

        var imageColor = {
            color: null,
            source: ""
        };

        if (urlOrName) {

            // urlOrName = unescape(urlOrName);
            var colorPos = urlOrName.indexOf("?color=");

            if (colorPos > -1) {
                var name = urlOrName.substring(0, colorPos);
                var color = urlOrName.substring(colorPos + "?color=".length);
                imageColor.source = qx.util.AliasManager.getInstance().resolve(name);
                imageColor.color = qx.theme.manager.Color.getInstance().resolve(color);
            }
            else if (color) {

                imageColor.color = qx.theme.manager.Color.getInstance().resolve(color);
                imageColor.source = qx.util.AliasManager.getInstance().resolve(urlOrName);
            }
            else {

                imageColor.source = qx.util.AliasManager.getInstance().resolve(urlOrName);
            }
        }

        return imageColor;
    },
  },

  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __width : null,
    __height : null,
    __mode : null,
    __contentElements : null,
    __currentContentElement : null,
    __wrapper : null,
    __requestId : 0,


    //overridden
    _onChangeTheme : function() {
      this.base(arguments);
      // restyle source (theme change might have changed the resolved url)
      this._styleSource();
    },

    /*
    ---------------------------------------------------------------------------
      WIDGET API
    ---------------------------------------------------------------------------
    */

    // overridden
    getContentElement : function() {
      return this.__getSuitableContentElement();
    },


    // overridden
    _createContentElement : function() {
      return this.__getSuitableContentElement();
    },


    // overridden
    _getContentHint : function()
    {
      return {
        width : this.__width || 0,
        height : this.__height || 0
      };
    },

    // overridden
    _applyDecorator : function(value, old) {
      this.base(arguments, value, old);

      var source = this.getSource();
      source = qx.util.AliasManager.getInstance().resolve(source);
      var el = this.getContentElement();
      if (this.__wrapper) {
        el = el.getChild(0);
      }
      this.__setSource(el, source);
    },


    // overridden
    _applyPadding : function(value, old, name)
    {
      this.base(arguments, value, old, name);

      var element = this.getContentElement();
      if (this.__wrapper) {
        element.getChild(0).setStyles({
          top: this.getPaddingTop() || 0,
          left: this.getPaddingLeft() || 0
        });
      } else {
        element.setPadding(
          this.getPaddingLeft() || 0, this.getPaddingTop() || 0
        );
      }

    },

    renderLayout : function(left, top, width, height) {
      this.base(arguments, left, top, width, height);

      var element = this.getContentElement();
      if (this.__wrapper) {
        element.getChild(0).setStyles({
          width: width - (this.getPaddingLeft() || 0) - (this.getPaddingRight() || 0),
          height: height - (this.getPaddingTop() || 0) - (this.getPaddingBottom() || 0),
          top: this.getPaddingTop() || 0,
          left: this.getPaddingLeft() || 0
        });
      }
    },




    /*
    ---------------------------------------------------------------------------
      IMAGE API
    ---------------------------------------------------------------------------
    */

    // property apply, overridden
    _applyEnabled : function(value, old)
    {
      this.base(arguments, value, old);

      if (this.getSource()) {
        this._styleSource();
      }
    },


    // property apply
    _applySource: function (value, old) {

        // abort loading current image
        if (old) {
            if (qx.io.ImageLoader.isLoading(old)) {
                qx.io.ImageLoader.abort(old, this);
            }
        }

        // @ITG:Wisej: Extract the color from the image source URL or name.
        this.__sourceColor = null;
        if (value) {
            var colorPos = value.indexOf("?color=");
            if (colorPos > -1)
                this.__sourceColor = value.substring(colorPos + "?color=".length);
        }

        this._styleSource();
    },

    // @ITG:Wisej: The color extracted from the URL.
    __sourceColor: null,

    // property apply
    _applyScale: function (value) {

      this._styleSource();
    },


    /**
     * Remembers the mode to keep track which contentElement is currently in use.
     * @param mode {String} internal mode (alphaScaled|scaled|nonScaled)
     */
    __setMode : function(mode) {
      this.__mode = mode;
    },


    /**
     * Returns the current mode if set. Otherwise checks the current source and
     * the current scaling to determine the current mode.
     *
     * @return {String} current internal mode
     */
    __getMode : function()
    {
      if (this.__mode == null)
      {
        var source = this.getSource();
        var isPng = false;
        if (source != null) {
          isPng = qx.lang.String.endsWith(source, ".png");
        }

        if (this.getScale() && isPng && qx.core.Environment.get("css.alphaimageloaderneeded")) {
          this.__mode = "alphaScaled";
        } else if (this.getScale()) {
          this.__mode = "scaled";
        } else {
          this.__mode = "nonScaled";
        }
      }

      return this.__mode;
    },


    /**
     * Creates a contentElement suitable for the current mode
     *
     * @param mode {String} internal mode
     * @return {qx.html.Image} suitable image content element
     */
    __createSuitableContentElement : function(mode)
    {
      var scale;
      var tagName;
      if (mode == "alphaScaled")
      {
        scale = true;
        tagName = "div";
      }
      else if (mode == "nonScaled")
      {
        scale = false;
        tagName = "div";
      }
      else
      {
        scale = true;
        tagName = "img";
      }

      var element = new qx.html.Image(tagName);
      element.setAttribute("$$widget", this.toHashCode());
      element.setScale(scale);
      element.setStyles({
        "overflowX": "hidden",
        "overflowY": "hidden",
        "boxSizing": "border-box"
      });

      // @ITG:Wisej: Disable ghost img dragging, it happens in Firefox, Edge and IE.
      if (tagName === "img") {
        element.setAttribute("onmousedown", "return false");
      }

      if (qx.core.Environment.get("css.alphaimageloaderneeded")) {
        var wrapper = this.__wrapper = new qx.html.Element("div");
        wrapper.setAttribute("$$widget", this.toHashCode());
        wrapper.setStyle("position", "absolute");
        wrapper.add(element);
        return wrapper;
      }

      return element;
    },


    /**
     * Returns a contentElement suitable for the current mode
     *
     * @return {qx.html.Image} suitable image contentElement
     */
    __getSuitableContentElement : function()
    {
      if (this.$$disposed) {
        return null;
      }

      var mode = this.__getMode();

      if (this.__contentElements[mode] == null) {
        this.__contentElements[mode] = this.__createSuitableContentElement(mode);
      }

      var element = this.__contentElements[mode];

      if (!this.__currentContentElement) {
        this.__currentContentElement = element;
      }

      return element;
    },


    /**
     * Applies the source to the clipped image instance or preload
     * an image to detect sizes and apply it afterwards.
     *
     */
    _styleSource : function()
    {
      var AliasManager = qx.util.AliasManager.getInstance();
      var ResourceManager = qx.util.ResourceManager.getInstance();
      var source = AliasManager.resolve(this.getSource());

      var element = this.getContentElement();
      if (this.__wrapper) {
        element = element.getChild(0);
      }

      if (!source)
      {
        element.resetSource();
        return;
      }

      this.__checkForContentElementSwitch(source);

      if ((qx.core.Environment.get("engine.name") == "mshtml") &&
        (parseInt(qx.core.Environment.get("engine.version"), 10) < 9 ||
         qx.core.Environment.get("browser.documentmode") < 9))
      {
        var repeat = this.getScale() ? "scale" : "no-repeat";
        element.tagNameHint = qx.bom.element.Decoration.getTagName(repeat, source);
      }

      var contentEl = this.__getContentElement();

      // Detect if the image registry knows this image
      if (qx.util.ResourceManager.getInstance().has(source)) {
        var highResolutionSource = this._findHighResolutionSource(source);
        if (highResolutionSource) {
          var imageWidth = ResourceManager.getImageHeight(source);
          var imageHeight = ResourceManager.getImageWidth(source);
          this.setWidth(imageWidth);
          this.setHeight(imageHeight);
          
          // set background size on current element (div or img)
          var backgroundSize = imageWidth + "px, " + imageHeight + "px";
          this.__currentContentElement.setStyle("background-size", backgroundSize);

          this.setSource(highResolutionSource);
          source = highResolutionSource;
        }
        this.__setManagedImage(contentEl, source);
        this.__fireLoadEvent();
      } else if (qx.io.ImageLoader.isLoaded(source)) {

        this.__setUnmanagedImage(contentEl, source);
        this.__fireLoadEvent();
      } else {


        this.__loadUnmanagedImage(contentEl, source);
      }
    },


    /**
     * Helper function, which fires <code>loaded</code> event asynchronously.
     * It emulates native <code>loaded</code> event of an image object. This
     * helper will be called, if you try to load a managed image or an
     * previously loaded unmanaged image.
     */
    __fireLoadEvent : function()
    {
      this.__requestId++;
      qx.bom.AnimationFrame.request(function(rId){
        // prevent firing of the event if source changed in the meantime
        if (rId === this.__requestId) {
          this.fireEvent("loaded");
        } else {
          this.fireEvent("aborted");
        }
      }.bind(this, this.__requestId));
    },


    /**
     * Returns the content element.
     * @return {qx.html.Image} content element
     */
    __getContentElement : function()
    {
      var contentEl = this.__currentContentElement;
      if (this.__wrapper) {
        contentEl = contentEl.getChild(0);
      }

      return contentEl;
    },


    /**
     * Checks if the current content element is capable to display the image
     * with the current settings (scaling, alpha PNG)
     *
     * @param source {String} source of the image
     */
    __checkForContentElementSwitch : qx.core.Environment.select("engine.name",
    {
      "mshtml" : function(source)
      {
        var alphaImageLoader = qx.core.Environment.get("css.alphaimageloaderneeded");
        var isPng = qx.lang.String.endsWith(source, ".png");

        if (alphaImageLoader && isPng)
        {
          if (this.getScale() && this.__getMode() != "alphaScaled") {
            this.__setMode("alphaScaled");
          } else if (!this.getScale() && this.__getMode() != "nonScaled") {
            this.__setMode("nonScaled");
          }
        }
        else
        {
          if (this.getScale() && this.__getMode() != "scaled") {
            this.__setMode("scaled");
          } else if (!this.getScale() && this.__getMode() != "nonScaled") {
            this.__setMode("nonScaled");
          }
        }

        this.__checkForContentElementReplacement(this.__getSuitableContentElement());
      },

      "default" : function(source)
      {
        if (this.getScale() && this.__getMode() != "scaled") {
          this.__setMode("scaled");
        } else if (!this.getScale() && this.__getMode("nonScaled")) {
          this.__setMode("nonScaled");
        }

        this.__checkForContentElementReplacement(this.__getSuitableContentElement());
      }
    }),


    /**
     * Checks the current child and replaces it if necessary
     *
     * @param elementToAdd {qx.html.Image} content element to add
     */
    __checkForContentElementReplacement : function(elementToAdd)
    {
      var currentContentElement = this.__currentContentElement;

      if (currentContentElement != elementToAdd)
      {
        if (currentContentElement != null)
        {
          var pixel = "px";
          var styles = {};

          //inherit styles from current element
          var currentStyles = currentContentElement.getAllStyles();
          if (currentStyles) {
            for (var prop in currentStyles) {
              styles[prop] = currentStyles[prop];
            }
          }

          // Copy dimension and location of the current content element
          var bounds = this.getBounds();
          if (bounds != null) {
            styles.width = bounds.width + pixel;
            styles.height = bounds.height + pixel;
          }

          var insets = this.getInsets();
          styles.left = 
              parseInt(currentContentElement.getStyle("left") || insets.left) +
              pixel;
          styles.top = 
              parseInt(currentContentElement.getStyle("top") || insets.top) +
              pixel;

          styles.zIndex = 10;

          var newEl = this.__wrapper ? elementToAdd.getChild(0) : elementToAdd;
          newEl.setStyles(styles, true);
          newEl.setSelectable(this.getSelectable());

          if (!currentContentElement.isVisible()) {
            elementToAdd.hide();
          } else if (!elementToAdd.isVisible()) {
            elementToAdd.show();
          }

          if (!currentContentElement.isIncluded()) {
            elementToAdd.exclude();
          } else if (!elementToAdd.isIncluded()) {
            elementToAdd.include();
          }

          var container = currentContentElement.getParent();

          if (container) {
            var index = container.getChildren().indexOf(currentContentElement);
            container.removeAt(index);
            container.addAt(elementToAdd, index);
          }
          // force re-application of source so __setSource is called again
          var hint = newEl.getNodeName();
          if (newEl.setSource)
            newEl.setSource(null);

          var currentEl = this.__getContentElement();
          newEl.tagNameHint = hint;
          newEl.setAttribute("class", currentEl.getAttribute("class"));

          // @ITG:Wisej: Don't flush here. It may cause the dom to be created too soon and fire the "appear" event before the correct bounds are set.
          // Flush elements to make sure the DOM elements are created.
          //qx.html.Element.flush();

          var currentDomEl = currentEl.getDomElement();
          var newDomEl = elementToAdd.getDomElement();

          // @ITG:Wisej: When a theme switch changes the scaled property, the element stays hidden.
          if (this.isVisible())
            elementToAdd.show();

          // @ITG:Wisej: The "qxanonymous" attribute is lost.
          if (this.isAnonymous())
            elementToAdd.setAttribute("qxanonymous", "true");
          else
            elementToAdd.removeAttribute("qxanonymous");

          // copy event listeners
          var listeners = currentContentElement.getListeners() || [];
          listeners.forEach(function(listenerData) {
            elementToAdd.addListener(
              listenerData.type, 
              listenerData.handler, 
              listenerData.self, 
              listenerData.capture);
          });

          if (currentDomEl && newDomEl) {
            // Switch the DOM elements' hash codes. This is required for the event
            // layer to work [BUG #7447]
            var currentHash = currentDomEl.$$hash;
            currentDomEl.$$hash = newDomEl.$$hash;
            newDomEl.$$hash = currentHash;
          }

          this.__currentContentElement = elementToAdd;
        }
      }
    },


    /**
     * Use the ResourceManager to set a managed image
     *
     * @param el {Element} image DOM element
     * @param source {String} source path
     */
    __setManagedImage : function(el, source)
    {
      var ResourceManager = qx.util.ResourceManager.getInstance();

      // Try to find a disabled image in registry
      if (!this.getEnabled())
      {
        var disabled = source.replace(/\.([a-z]+)$/, "-disabled.$1");
        if (ResourceManager.has(disabled))
        {
          source = disabled;
          this.addState("replacement");
        }
        else
        {
          this.removeState("replacement");
        }
      }

      // Optimize case for enabled changes when no disabled image was found
      if (el.getSource() === source) {
        return;
      }

      // Apply source
      this.__setSource(el, source);

      // Compare with old sizes and relayout if necessary
      this.__updateContentHint(
        ResourceManager.getImageWidth(source),
        ResourceManager.getImageHeight(source)
      );
    },


    /**
     * Use the infos of the ImageLoader to set an unmanaged image
     *
     * @param el {Element} image DOM element
     * @param source {String} source path
     */
    __setUnmanagedImage: function (el, source) {

        var ImageLoader = qx.io.ImageLoader;

        // Apply source
        this.__setSource(el, source);

        // Compare with old sizes and relayout if necessary

        var width = ImageLoader.getWidth(source);
        var height = ImageLoader.getHeight(source);
        this.__updateContentHint(width, height);
    },


    /**
     * Use the ImageLoader to load an unmanaged image
     *
     * @param el {Element} image DOM element
     * @param source {String} source path
     */
    __loadUnmanagedImage : function(el, source)
    {
      var ImageLoader = qx.io.ImageLoader;

      if (qx.core.Environment.get("qx.debug"))
      {
        // loading external images via HTTP/HTTPS is a common use case, as is
        // using data URLs.
        var sourceLC = source.toLowerCase();
        var startsWith = qx.lang.String.startsWith;
        if (!startsWith(sourceLC, "http") &&
            !startsWith(sourceLC, "data:image/"))
        {
          var self = this.self(arguments);

          if (!self.__warned) {
            self.__warned = {};
          }

          if (!self.__warned[source])
          {
            this.debug("try to load an unmanaged relative image: " + source);
            self.__warned[source] = true;
          }
        }
      }

      // only try to load the image if it not already failed
      if(!ImageLoader.isFailed(source)) {
        ImageLoader.load(source, this.__loaderCallback, this);
      } else {
        if (el != null) {
          el.resetSource();
        }
      }
    },


    /**
     * Combines the decorator's image styles with our own image to make sure
     * gradient and backgroundImage decorators work on Images.
     *
     * @param el {Element} image DOM element
     * @param source {String} source path
     */
    __setSource: function (el, source) {

      // @ITG:Wisej: Adapt the SVG image fill and color to the current textColor.
      if (qx.io.ImageLoader.isLoaded(source)) {
        var svg = qx.io.ImageLoader.getSvg(source);
        if (svg)
          source = this.__changeSvgFillColor(el, svg);
      }
      else {
        return;
      }

      if (el.getNodeName() == "div") {

        // checks if a decorator already set.
        // In this case we have to merge background styles
        var decorator = qx.theme.manager.Decoration.getInstance().resolve(this.getDecorator());
        if (decorator) {
          var hasGradient = (decorator.getStartColor() && decorator.getEndColor());
          var hasBackground = decorator.getBackgroundImage();
          if (hasGradient || hasBackground) {
            var repeat = this.getScale() ? "scale" : "no-repeat";

            // get the style attributes for the given source
            var attr = qx.bom.element.Decoration.getAttributes(source, repeat);
            // get the background image(s) defined by the decorator
            var decoratorStyle = decorator.getStyles(true);

            // @ITG:Wisej: Changed the default background position to make Chrome compatible with IE when rendering SVG sources
            // IE centers while Chrome starts at 0,0.
            var defaultPosition = svg == null ? "0 0" : "center center";

            var combinedStyles = {
              "backgroundImage": attr.style.backgroundImage,
              "backgroundPosition": (attr.style.backgroundPosition || defaultPosition),
              "backgroundRepeat": (attr.style.backgroundRepeat || "no-repeat"),

              // @ITG:Wisej: Added support for background-size.
              "backgroundSize": (attr.style.backgroundSize || "auto"),
            };

            if (hasBackground) {
              combinedStyles["backgroundPosition"] += "," + decoratorStyle["background-position"] || defaultPosition;
              combinedStyles["backgroundRepeat"] += ", " + decorator.getBackgroundRepeat();

              // @ITG:Wisej: Added support for background-size.
              combinedStyles["backgroundSize"] += ", " + decorator.getBackgroundSize();
              }

            if (hasGradient) {
              combinedStyles["backgroundPosition"] += ", 0 0";
              combinedStyles["backgroundRepeat"] += ", no-repeat";
            }

            combinedStyles["backgroundImage"] += "," + decoratorStyle["background-image"];

            // @ITG:Wisej: Fixed potential bug with the delayed setting of the source which is initially set
            // to the source value for the image and it will override the combined styles.
            el.setSource(null);

            // apply combined background images
            el.setStyles(combinedStyles);

            return;
          }
        } else {
          // force re-apply to remove old decorator styles
          el.setSource(null);
        }
      }

      el.setSource(source);
    },

    /**
     * @ITG:Wisej: __changeSvgFillColor
     * 
     * Changes the fill and style color of the svg-xml to match the current css color set on the image
     * and returns the svg-xml definition packaged in a "data:image" base64 string.
     *
     * @param el {Element} The element to read the color from.
     * @param svg {XMLDocument} The svg xml image to change.
     * @return {String} The data uri base64 representation of the svg image.
     */
    __changeSvgFillColor: function (el, svg) {

        // determine whether to use the text-color
        // or the color specified in the image url.
        var color =
            this.__sourceColor
            || el.getStyle("color")
            || this.getTextColor();

        // change the svg mono color.
        if (color) {
            color = qx.theme.manager.Color.getInstance().resolve(color);
            svg = qx.ui.basic.Image.setSvgColor(svg, color);
        }

        // convert to base64 data uri.
        return qx.ui.basic.Image.getSvgDataUri(svg);
    },

    // @ITG:Wisej: Overridden to update the color of the svg icon.
    _applyTextColor: function (value, old) {

        this.base(arguments, value, old);

        // if the source is an embedded svg and the source didn't specify a color, update the fill color.
        if (!this.__sourceColor) {
            var source = this.getSource();
            if (source) {
                source = qx.util.AliasManager.getInstance().resolve(source);
                if (source != null) {
                    qx.io.ImageLoader.load(source, function (url, entry) {
                        var svg = entry.svg;
                        if (svg) {
                            var el = this.getContentElement();
                            el.setSource(this.__changeSvgFillColor(el, svg));
                        }
                    }, this);
                }
            }
        }
    },

    /**
     * Detects whether there is a high-resolution image available.
     * A high-resolution image is assumed to have the same file name as
     * the parameter source, but with a pixelRatio identifier before the file
     * extension, like "@2x".
     * Medium Resolution: "example.png", high-resolution: "example@2x.png"
     *
     * @param lowResImgSrc {String} source of the low resolution image.
     * @return {String|Boolean} If a high-resolution image source.
     */
    _findHighResolutionSource: function(lowResImgSrc) {
      var pixelRatioCandidates = ["3", "2", "1.5"];

      // Calculate the optimal ratio, based on the rem scale factor of the application and the device pixel ratio.
      var factor = parseFloat(qx.bom.client.Device.getDevicePixelRatio().toFixed(2));
      if (factor <= 1) {
        return false;
      }

      var i = pixelRatioCandidates.length;
      while (i > 0 && factor > pixelRatioCandidates[--i]) {}

      var hiResImgSrc;
      var k;

      // Search for best img with a higher resolution.
      for (k = i; k >= 0; k--) {
        hiResImgSrc = this._getHighResolutionSource(lowResImgSrc, pixelRatioCandidates[k]);
        if (hiResImgSrc) {
          return hiResImgSrc;
        }
      }

      // Search for best img with a lower resolution.
      for (k = i + 1; k < pixelRatioCandidates.length; k++) {
        hiResImgSrc = this._getHighResolutionSource(lowResImgSrc, pixelRatioCandidates[k]);
        if (hiResImgSrc) {
          return hiResImgSrc;
        }
      }

      return null;
    },

    /**
     * Returns the source name for the high-resolution image based on the passed
     * parameters.
     * @param source {String} the source of the medium resolution image.
     * @param pixelRatio {Number} the pixel ratio of the high-resolution image.
     * @return {String} the high-resolution source name or null if no source could be found.
     */
    _getHighResolutionSource : function(source, pixelRatio) {
      var fileExtIndex = source.lastIndexOf('.');
      if (fileExtIndex > -1) {
        var pixelRatioIdentifier = "@" + pixelRatio + "x";
        var candidate = source.slice(0, fileExtIndex) + pixelRatioIdentifier + source.slice(fileExtIndex);

        if(qx.util.ResourceManager.getInstance().has(candidate)) {
          return candidate;
        }
      }
      return null;
    },

    /**
     * Event handler fired after the preloader has finished loading the icon
     *
     * @param source {String} Image source which was loaded
     * @param imageInfo {Map} Dimensions of the loaded image
     */
    __loaderCallback : function(source, imageInfo)
    {
      // Ignore the callback on already disposed images
      if (this.$$disposed === true) {
        return;
      }

      // Ignore when the source has already been modified
      if (source !== qx.util.AliasManager.getInstance().resolve(this.getSource())) {
        this.fireEvent("aborted");
        return;
      }

      /// Output a warning if the image could not loaded and quit
      if (imageInfo.failed) {
        this.warn("Image could not be loaded: " + source);
        this.fireEvent("loadingFailed");
      } else if (imageInfo.aborted) {
        this.fireEvent("aborted");
        return;
      } else {
        this.fireEvent("loaded");
      }

      // Update image
      this.__setUnmanagedImage(this.__getContentElement(), source);
    },


    /**
     * Updates the content hint when the image size has been changed
     *
     * @param width {Integer} width of the image
     * @param height {Integer} height of the image
     */
    __updateContentHint : function(width, height)
    {
      // Compare with old sizes and relayout if necessary
      if (width !== this.__width || height !== this.__height)
      {
        this.__width = width;
        this.__height = height;

        qx.ui.core.queue.Layout.add(this);
      }
    }
  },


  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function() {
    for (var mode in this.__contentElements) {
      if (this.__contentElements.hasOwnProperty(mode)) {
        this.__contentElements[mode].setAttribute("$$widget", null, true);
      }
    }

    this.__currentContentElement = null;
    if (this.__wrapper) {
      this.__wrapper = null;
    }

    this._disposeMap("__contentElements");
  }
});
