/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Martin Wittemann (martinwittemann)

************************************************************************ */
/**
 * Mixin for supporting the background images on decorators.
 * This mixin is usually used by {@link qx.ui.decoration.Decorator}.
 */
qx.Mixin.define("qx.ui.decoration.MBackgroundImage",
{
  properties :
  {
    /** The URL of the background image */
    backgroundImage :
    {
      check : "String",
      nullable : true,
      apply : "_applyBackgroundImage"
    },


    /** How the background image should be repeated */
    backgroundRepeat :
    {
      check : ["repeat", "repeat-x", "repeat-y", "no-repeat", "scale"],
      init: "repeat",
      apply : "_applyBackgroundImage"
    },

    // @ITG:Wisej: Added support for background-size and background-origin.
    /** 
     * Either a string or the width and height numbers, which defines the width and height of the background image.
     *
     * If the values are integers, they are interpreted as a pixel value, otherwise
     * the value is taken to be a CSS value. For CSS, the values are "auto",
     * "cover" and "contain", "initial", "inherit".
     */
    backgroundSize :
    {
      init: null,
      nullable: true,
      apply: "_applyBackgroundSize"
    },

    backgroundOrigin:
    {
      init: null,
      nullable: true,
      apply: "_applyBackgroundSize"
    },

    // @ITG:Wisej: Added support for SVG background icon.
    /**
     * The fill color to apply to SVG background images.
     */
    fillColor :
    {
     init: null,
     nullable: true,
     check: "Color",
     apply: "_applyBackgroundImage"
    },

    /**
     * Either a string or a number, which defines the horizontal position
     * of the background image.
     *
     * If the value is an integer it is interpreted as a pixel value, otherwise
     * the value is taken to be a CSS value. For CSS, the values are "center",
     * "left" and "right".
     */
    backgroundPositionX :
    {
      nullable : true,
      apply : "_applyBackgroundPosition"
    },


    /**
     * Either a string or a number, which defines the vertical position
     * of the background image.
     *
     * If the value is an integer it is interpreted as a pixel value, otherwise
     * the value is taken to be a CSS value. For CSS, the values are "top",
     * "center" and "bottom".
     */
    backgroundPositionY :
    {
      nullable : true,
      apply : "_applyBackgroundPosition"
    },


    /**
     * Property group to define the background position
     */
    backgroundPosition :
    {
      mode: "shorthand",
      group : ["backgroundPositionY", "backgroundPositionX"]
    }
  },


  members :
  {
    /**
     * Adds the background-image styles to the given map
     * @param styles {Map} CSS style map
     */
    _styleBackgroundImage : function(styles)
    {
      var image = this.getBackgroundImage();

      // @ITG:Wisej: Allow a theme to define background rules without having to define the image url as well.
      //if(!image) {
      //  return;
      //}

      var source = qx.util.AliasManager.getInstance().resolve(image);
      source = qx.util.ResourceManager.getInstance().toUri(source);

      // @ITG:Wisej: Added support for dynamically colored SVG icons as background images. This works only if the image as embedded in a data uri.
      var color = this.getFillColor();
      if (color && qx.core.Environment.get("qx.theme"))
        color = qx.theme.manager.Color.getInstance().resolve(color);

      var ImageLoader = qx.io.ImageLoader;
      if (source && color && ImageLoader.getFormat(source) == "svg") {

        // load the image directly (no callbacks) since it must be a data uri or preloaded.
        ImageLoader.load(source);
        var svg = ImageLoader.getSvg(source);
        if (svg) {
            // the image is loaded, changed the color and proceed.
            svg = qx.ui.basic.Image.setSvgColor(svg, color);
            source = qx.ui.basic.Image.getSvgDataUri(svg);
        }
      }

      // @ITG:Wisej: Added quotes around url() in case it's a data uri and check for null image.
      if (source) {
        if (styles["background-image"]) {
          styles["background-image"] +=  ", url('" + source + "')";
        } else {
          styles["background-image"] = "url('" + source + "')";
        }
      }

      var repeat = this.getBackgroundRepeat();
      if (repeat === "scale") {
        styles["background-size"] = "100% 100%";
      }
      else {
        styles["background-repeat"] = repeat;
      }

      // @ITG:Wisej: Added support for background-size.
      var backgroundSize = this.getBackgroundSize();
      if (backgroundSize) {

        // convert a string to an array of values.
        if (typeof backgroundSize == "string") {
            var parts = backgroundSize.split(/\s|,/);
            backgroundSize = [];
            for (var i = 0; i < parts.length; i++) {
                if (parts[i])
                    backgroundSize.push(parts[i]);
            }
        }

        // @ITG:Wisej: Added support for background-origin.
        var backgroundOrigin = this.getBackgroundOrigin();
        if (backgroundOrigin) {
          styles["background-origin"] = backgroundOrigin;
        }

        // check if it's a number but doesn't specify "px".
        for (var i = 0; i < 2; i++) {
            var pixels = parseInt(backgroundSize[i]);
            if (!isNaN(pixels))
            	backgroundSize[i] = pixels + "px";
        }
        styles["background-size"] = backgroundSize.join(" ");
      }

      var top = this.getBackgroundPositionY() || 0;
      var left = this.getBackgroundPositionX() || 0;

      if (!isNaN(top)) {
        top += "px";
      }

      if (!isNaN(left)) {
        left += "px";
      }

      styles["background-position"] = left + " " + top;

      if (qx.core.Environment.get("qx.debug") &&
        source &&  qx.lang.String.endsWith(source, ".png") &&
        (repeat == "scale" || repeat == "no-repeat") &&
        qx.core.Environment.get("engine.name") == "mshtml" &&
        qx.core.Environment.get("browser.documentmode") < 9)
      {
        this.warn("Background PNGs with repeat == 'scale' or repeat == 'no-repeat'" +
          " are not supported in this client! The image's resource id is '" + id + "'");
      }
    },


    // property apply
    _applyBackgroundImage : function()
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        if (this._isInitialized()) {
          throw new Error("This decorator is already in-use. Modification is not possible anymore!");
        }
      }
    },

    // property apply
    _applyBackgroundPosition : function()
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        if (this._isInitialized()) {
          throw new Error("This decorator is already in-use. Modification is not possible anymore!");
        }
        if (qx.core.Environment.get("engine.name") == "mshtml" &&
          qx.core.Environment.get("browser.documentmode") < 9)
        {
          this.warn("The backgroundPosition property is not supported by this client!");
        }
      }
    },

    // @ITG:Wisej: Added support for background-size.
    // property apply
    _applyBackgroundSize: function () {
        if (qx.core.Environment.get("qx.debug")) {
            if (this._isInitialized()) {
                throw new Error("This decorator is already in-use. Modification is not possible anymore!");
            }
            if (qx.core.Environment.get("engine.name") == "mshtml" &&
              qx.core.Environment.get("browser.documentmode") < 9) {
                this.warn("The backgroundSize property is not supported by this client!");
            }
        }
    }


  }
});
