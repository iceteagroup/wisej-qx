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
     * Andreas Ecker (ecker)
     * Christian Hagendorn (cs)

************************************************************************ */

/**
 * Methods to convert colors between different color spaces.
 *
 * @ignore(qx.theme.*)
 * @ignore(qx.Class)
 * @ignore(qx.Class.*)
 */
qx.Bootstrap.define("qx.util.ColorUtil",
{
  statics :
  {
    /**
     * Regular expressions for color strings
     */
    REGEXP :
    {
      hex3 : /^#([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
      hex6 : /^#([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
      rgb : /^rgb\(\s*([0-9]{1,3}\.{0,1}[0-9]*)\s*,\s*([0-9]{1,3}\.{0,1}[0-9]*)\s*,\s*([0-9]{1,3}\.{0,1}[0-9]*)\s*\)$/,
      rgba : /^rgba\(\s*([0-9]{1,3}\.{0,1}[0-9]*)\s*,\s*([0-9]{1,3}\.{0,1}[0-9]*)\s*,\s*([0-9]{1,3}\.{0,1}[0-9]*)\s*,\s*([0-9]{1,3}\.{0,1}[0-9]*)\s*\)$/
    },


    /**
     * CSS3 system color names.
     */
    SYSTEM :
    {
      activeborder        : true,
      activecaption       : true,
      appworkspace        : true,
      background          : true,
      buttonface          : true,
      buttonhighlight     : true,
      buttonshadow        : true,
      buttontext          : true,
      captiontext         : true,
      graytext            : true,
      highlight           : true,
      highlighttext       : true,
      inactiveborder      : true,
      inactivecaption     : true,
      inactivecaptiontext : true,
      infobackground      : true,
      infotext            : true,
      menu                : true,
      menutext            : true,
      scrollbar           : true,
      threeddarkshadow    : true,
      threedface          : true,
      threedhighlight     : true,
      threedlightshadow   : true,
      threedshadow        : true,
      window              : true,
      windowframe         : true,
      windowtext          : true
    },


    /**
     * Named colors, only the 16 basic colors plus the following ones:
     * transparent, grey, magenta, orange and brown
     */
    NAMED :
    {
       // @ITG:Wisej:Added list of standard HTML colors.
      "black": "#000000",
      "silver": "#c0c0c0",
      "gray": "#808080",
      "white": "#ffffff",
      "maroon": "#800000",
      "red": "#ff0000",
      "purple": "#800080",
      "fuchsia": "#ff00ff",
      "green": "#008000",
      "lime": "#00ff00",
      "olive": "#808000",
      "yellow": "#ffff00",
      "navy": "#000080",
      "blue": "#0000ff",
      "teal": "#008080",
      "aqua": "#00ffff",
      "orange": "#ffa500",
      "aliceblue": "#f0f8ff",
      "antiquewhite": "#faebd7",
      "aquamarine": "#7fffd4",
      "azure": "#f0ffff",
      "beige": "#f5f5dc",
      "bisque": "#ffe4c4",
      "blanchedalmond": "#ffe4c4",
      "blueviolet": "#8a2be2",
      "brown": "#a52a2a",
      "burlywood": "#deb887",
      "cadetblue": "#5f9ea0",
      "chartreuse": "#7fff00",
      "chocolate": "#d2691e",
      "coral": "#ff7f50",
      "cornflowerblue": "#6495ed",
      "cornsilk": "#fff8dc",
      "crimson": "#dc143c",
      "darkblue": "#00008b",
      "darkcyan": "#008b8b",
      "darkgoldenrod": "#b8860b",
      "darkgray": "#a9a9a9",
      "darkgreen": "#006400",
      "darkgrey": "#a9a9a9",
      "darkkhaki": "#bdb76b",
      "darkmagenta": "#8b008b",
      "darkolivegreen": "#556b2f",
      "darkorange": "#ff8c00",
      "darkorchid": "#9932cc",
      "darkred": "#8b0000",
      "darksalmon": "#e9967a",
      "darkseagreen": "#8fbc8f",
      "darkslateblue": "#483d8b",
      "darkslategray": "#2f4f4f",
      "darkslategrey": "#2f4f4f",
      "darkturquoise": "#00ced1",
      "darkviolet": "#9400d3",
      "deeppink": "#ff1493",
      "deepskyblue": "#00bfff",
      "dimgray": "#696969",
      "dimgrey": "#696969",
      "dodgerblue": "#1e90ff",
      "firebrick": "#b22222",
      "floralwhite": "#fffaf0",
      "forestgreen": "#228b22",
      "gainsboro": "#dcdcdc",
      "ghostwhite": "#f8f8ff",
      "gold": "#ffd700",
      "goldenrod": "#daa520",
      "greenyellow": "#adff2f",
      "grey": "#808080",
      "honeydew": "#f0fff0",
      "hotpink": "#ff69b4",
      "indianred": "#cd5c5c",
      "indigo": "#4b0082",
      "ivory": "#fffff0",
      "khaki": "#f0e68c",
      "lavender": "#e6e6fa",
      "lavenderblush": "#fff0f5",
      "lawngreen": "#7cfc00",
      "lemonchiffon": "#fffacd",
      "lightblue": "#add8e6",
      "lightcoral": "#f08080",
      "lightcyan": "#e0ffff",
      "lightgoldenrodyellow": "#fafad2",
      "lightgray": "#d3d3d3",
      "lightgreen": "#90ee90",
      "lightgrey": "#d3d3d3",
      "lightpink": "#ffb6c1",
      "lightsalmon": "#ffa07a",
      "lightseagreen": "#20b2aa",
      "lightskyblue": "#87cefa",
      "lightslategray": "#778899",
      "lightslategrey": "#778899",
      "lightsteelblue": "#b0c4de",
      "lightyellow": "#ffffe0",
      "limegreen": "#32cd32",
      "linen": "#faf0e6",
      "mediumaquamarine": "#66cdaa",
      "mediumblue": "#0000cd",
      "mediumorchid": "#ba55d3",
      "mediumpurple": "#9370db",
      "mediumseagreen": "#3cb371",
      "mediumslateblue": "#7b68ee",
      "mediumspringgreen": "#00fa9a",
      "mediumturquoise": "#48d1cc",
      "mediumvioletred": "#c71585",
      "midnightblue": "#191970",
      "mintcream": "#f5fffa",
      "mistyrose": "#ffe4e1",
      "moccasin": "#ffe4b5",
      "navajowhite": "#ffdead",
      "oldlace": "#fdf5e6",
      "olivedrab": "#6b8e23",
      "orangered": "#ff4500",
      "orchid": "#da70d6",
      "palegoldenrod": "#eee8aa",
      "palegreen": "#98fb98",
      "paleturquoise": "#afeeee",
      "palevioletred": "#db7093",
      "papayawhip": "#ffefd5",
      "peachpuff": "#ffdab9",
      "peru": "#cd853f",
      "pink": "#ffc0cb",
      "plum": "#dda0dd",
      "powderblue": "#b0e0e6",
      "rosybrown": "#bc8f8f",
      "royalblue": "#4169e1",
      "saddlebrown": "#8b4513",
      "salmon": "#fa8072",
      "sandybrown": "#f4a460",
      "seagreen": "#2e8b57",
      "seashell": "#fff5ee",
      "sienna": "#a0522d",
      "skyblue": "#87ceeb",
      "slateblue": "#6a5acd",
      "slategray": "#708090",
      "slategrey": "#708090",
      "snow": "#fffafa",
      "springgreen": "#00ff7f",
      "steelblue": "#4682b4",
      "tan": "#d2b48c",
      "thistle": "#d8bfd8",
      "tomato": "#ff6347",
      "turquoise": "#40e0d0",
      "violet": "#ee82ee",
      "wheat": "#f5deb3",
      "whitesmoke": "#f5f5f5",
      "yellowgreen": "#9acd32",
      "rebeccapurple": "#663399",

      // Additional values
      transparent: [-1, -1, -1],
      magenta: [255, 0, 255],   // alias for fuchsia
    },


    /**
     * Whether the incoming value is a named color.
     *
     * @param value {String} the color value to test
     * @return {Boolean} true if the color is a named color
     */
    isNamedColor: function (value) {

      // @ITG:Wisej:Named colors can be any case.
      value = value != null ? value.toLowerCase() : value;

      return this.NAMED[value] !== undefined;
    },


    /**
     * Whether the incoming value is a system color.
     *
     * @param value {String} the color value to test
     * @return {Boolean} true if the color is a system color
     */
    isSystemColor : function(value) {
      return this.SYSTEM[value] !== undefined;
    },


    /**
     * Whether the color theme manager is loaded. Generally
     * part of the GUI of qooxdoo.
     *
     * @return {Boolean} <code>true</code> when color theme support is ready.
     **/
    supportsThemes : function() {
      if (qx.Class) {
        return qx.Class.isDefined("qx.theme.manager.Color");
      }
      return false;
    },


    /**
     * Whether the incoming value is a themed color.
     *
     * @param value {String} the color value to test
     * @return {Boolean} true if the color is a themed color
     */
    isThemedColor : function(value)
    {
      if (!this.supportsThemes()) {
        return false;
      }

      if (qx.theme && qx.theme.manager && qx.theme.manager.Color) {
        return qx.theme.manager.Color.getInstance().isDynamic(value);
      }
      return false;
    },


    /**
     * Try to convert an incoming string to an RGB array.
     * Supports themed, named and system colors, but also RGB strings,
     * hex3 and hex6 values.
     *
     * @param str {String} any string
     * @return {Array} returns an array of red, green, blue on a successful transformation
     * @throws {Error} if the string could not be parsed
     */
    stringToRgb : function(str)
    {
      if (this.supportsThemes() && this.isThemedColor(str)) {
        str = qx.theme.manager.Color.getInstance().resolveDynamic(str);
      }

      if (this.isNamedColor(str))
      {
        // @ITG:Wisej:Added support for standard HTML colors.
        str = str.toLowerCase();
        var color = this.NAMED[str];
        if (this.isHex6String(color))
          return this.hex6StringToRgb(color);
        else
          return color.concat();
      }
      else if (this.isSystemColor(str))
      {
        throw new Error("Could not convert system colors to RGB: " + str);
      }
      else if (this.isRgbaString(str)) {
        return this.__rgbaStringToRgb(str);
      }
      else if (this.isRgbString(str))
      {
        return this.__rgbStringToRgb();
      }
      else if (this.isHex3String(str))
      {
        return this.__hex3StringToRgb();
      }
      else if (this.isHex6String(str))
      {
        return this.__hex6StringToRgb();
      }

      throw new Error("Could not parse color: " + str);
    },


    /**
     * Try to convert an incoming string to an RGB array.
     * Support named colors, RGB strings, hex3 and hex6 values.
     *
     * @param str {String} any string
     * @return {Array} returns an array of red, green, blue on a successful transformation
     * @throws {Error} if the string could not be parsed
     */
    cssStringToRgb : function(str)
    {
      if (this.isNamedColor(str))
      {
        // @ITG:Wisej:Added support for standard HTML colors and fixed the return array.
        str = str.toLowerCase();
        var color = this.NAMED[str];
        if (this.isHex6String(color))
          return this.hex6StringToRgb(color);
        else
          return color.concat();
      }
      else if (this.isSystemColor(str))
      {
        throw new Error("Could not convert system colors to RGB: " + str);
      }
      else if (this.isRgbString(str))
      {
        return this.__rgbStringToRgb();
      }
      else if (this.isRgbaString(str))
      {
        return this.__rgbaStringToRgb();
      }
      else if (this.isHex3String(str))
      {
        return this.__hex3StringToRgb();
      }
      else if (this.isHex6String(str))
      {
        return this.__hex6StringToRgb();
      }

      throw new Error("Could not parse color: " + str);
    },


    /**
     * Try to convert an incoming string to an RGB string, which can be used
     * for all color properties.
     * Supports themed, named and system colors, but also RGB strings,
     * hex3 and hex6 values.
     *
     * @param str {String} any string
     * @return {String} a RGB string
     * @throws {Error} if the string could not be parsed
     */
    stringToRgbString : function(str) {
      return this.rgbToRgbString(this.stringToRgb(str));
    },


    /**
     * Converts a RGB array to an RGB string
     *
     * @param rgb {Array} an array with red, green and blue values and optionally
     * an alpha value
     * @return {String} an RGB string
     */
    rgbToRgbString : function(rgb) {
      return "rgb" + (rgb[3] !== undefined ? "a" : "") +  "(" + rgb.join(",") + ")";
    },


    /**
     * Converts a RGB array to an hex6 string
     *
     * @param rgb {Array} an array with red, green and blue
     * @return {String} a hex6 string (#xxxxxx)
     */
    rgbToHexString : function(rgb)
    {
      return (
        "#" +
        qx.lang.String.pad(rgb[0].toString(16).toUpperCase(), 2) +
        qx.lang.String.pad(rgb[1].toString(16).toUpperCase(), 2) +
        qx.lang.String.pad(rgb[2].toString(16).toUpperCase(), 2)
      );
    },


    /**
     * Detects if a string is a valid qooxdoo color
     *
     * @param str {String} any string
     * @return {Boolean} true when the incoming value is a valid qooxdoo color
     */
    isValidPropertyValue : function(str) {
      return (
        this.isThemedColor(str) ||
        this.isNamedColor(str) ||
        this.isHex3String(str) ||
        this.isHex6String(str) ||
        this.isRgbString(str) ||
        this.isRgbaString(str));
    },


    /**
     * Detects if a string is a valid CSS color string
     *
     * @param str {String} any string
     * @return {Boolean} true when the incoming value is a valid CSS color string
     */
    isCssString : function(str) {
      return (
        this.isSystemColor(str) ||
        this.isNamedColor(str) ||
        this.isHex3String(str) ||
        this.isHex6String(str) ||
        this.isRgbString(str) ||
        this.isRgbaString(str));
    },


    /**
     * Detects if a string is a valid hex3 string
     *
     * @param str {String} any string
     * @return {Boolean} true when the incoming value is a valid hex3 string
     */
    isHex3String : function(str) {
      return this.REGEXP.hex3.test(str);
    },


    /**
     * Detects if a string is a valid hex6 string
     *
     * @param str {String} any string
     * @return {Boolean} true when the incoming value is a valid hex6 string
     */
    isHex6String : function(str) {
      return this.REGEXP.hex6.test(str);
    },


    /**
     * Detects if a string is a valid RGB string
     *
     * @param str {String} any string
     * @return {Boolean} true when the incoming value is a valid RGB string
     */
    isRgbString : function(str) {
      return this.REGEXP.rgb.test(str);
    },


    /**
     * Detects if a string is a valid RGBA string
     *
     * @param str {String} any string
     * @return {Boolean} true when the incoming value is a valid RGBA string
     */
    isRgbaString : function(str) {
      return this.REGEXP.rgba.test(str);
    },


    /**
     * Converts a regexp object match of a rgb string to an RGB array.
     *
     * @return {Array} an array with red, green, blue
     */
    __rgbStringToRgb : function()
    {
      var red = parseInt(RegExp.$1, 10);
      var green = parseInt(RegExp.$2, 10);
      var blue = parseInt(RegExp.$3, 10);

      return [red, green, blue];
    },

   /**
    * Converts a regexp object match of a rgba string to an RGB array.
    *
    * @return {Array} an array with red, green, blue
    */
    __rgbaStringToRgb : function()
    {
      var red = parseInt(RegExp.$1, 10);
      var green = parseInt(RegExp.$2, 10);
      var blue = parseInt(RegExp.$3, 10);
      var alpha = parseFloat(RegExp.$4, 10);

      if (red === 0 && green === 0 & blue === 0 && alpha === 0) {
        return [-1, -1, -1];
      }

      return [red, green, blue];
    },


    /**
     * Converts a regexp object match of a hex3 string to an RGB array.
     *
     * @return {Array} an array with red, green, blue
     */
    __hex3StringToRgb : function()
    {
      var red = parseInt(RegExp.$1, 16) * 17;
      var green = parseInt(RegExp.$2, 16) * 17;
      var blue = parseInt(RegExp.$3, 16) * 17;

      return [red, green, blue];
    },


    /**
     * Converts a regexp object match of a hex6 string to an RGB array.
     *
     * @return {Array} an array with red, green, blue
     */
    __hex6StringToRgb : function()
    {
      var red = (parseInt(RegExp.$1, 16) * 16) + parseInt(RegExp.$2, 16);
      var green = (parseInt(RegExp.$3, 16) * 16) + parseInt(RegExp.$4, 16);
      var blue = (parseInt(RegExp.$5, 16) * 16) + parseInt(RegExp.$6, 16);

      return [red, green, blue];
    },


    /**
     * Converts a hex3 string to an RGB array
     *
     * @param value {String} a hex3 (#xxx) string
     * @return {Array} an array with red, green, blue
     */
    hex3StringToRgb : function(value)
    {
      if (this.isHex3String(value)) {
        return this.__hex3StringToRgb(value);
      }

      throw new Error("Invalid hex3 value: " + value);
    },


    /**
     * Converts a hex3 (#xxx) string to a hex6 (#xxxxxx) string.
     *
     * @param value {String} a hex3 (#xxx) string
     * @return {String} The hex6 (#xxxxxx) string or the passed value when the
     *   passed value is not an hex3 (#xxx) value.
     */
    hex3StringToHex6String : function(value)
    {
      if (this.isHex3String(value)) {
        return this.rgbToHexString(this.hex3StringToRgb(value));
      }
      return value;
    },


    /**
     * Converts a hex6 string to an RGB array
     *
     * @param value {String} a hex6 (#xxxxxx) string
     * @return {Array} an array with red, green, blue
     */
    hex6StringToRgb : function(value)
    {
      if (this.isHex6String(value)) {
        return this.__hex6StringToRgb(value);
      }

      throw new Error("Invalid hex6 value: " + value);
    },


    /**
     * Converts a hex string to an RGB array
     *
     * @param value {String} a hex3 (#xxx) or hex6 (#xxxxxx) string
     * @return {Array} an array with red, green, blue
     */
    hexStringToRgb : function(value)
    {
      if (this.isHex3String(value)) {
        return this.__hex3StringToRgb(value);
      }

      if (this.isHex6String(value)) {
        return this.__hex6StringToRgb(value);
      }

      throw new Error("Invalid hex value: " + value);
    },


    /**
     * Convert RGB colors to HSB
     *
     * @param rgb {Number[]} red, blue and green as array
     * @return {Array} an array with hue, saturation and brightness
     */
    rgbToHsb : function(rgb)
    {
      var hue, saturation, brightness;

      var red = rgb[0];
      var green = rgb[1];
      var blue = rgb[2];

      var cmax = (red > green) ? red : green;

      if (blue > cmax) {
        cmax = blue;
      }

      var cmin = (red < green) ? red : green;

      if (blue < cmin) {
        cmin = blue;
      }

      brightness = cmax / 255.0;

      if (cmax != 0) {
        saturation = (cmax - cmin) / cmax;
      } else {
        saturation = 0;
      }

      if (saturation == 0)
      {
        hue = 0;
      }
      else
      {
        var redc = (cmax - red) / (cmax - cmin);
        var greenc = (cmax - green) / (cmax - cmin);
        var bluec = (cmax - blue) / (cmax - cmin);

        if (red == cmax) {
          hue = bluec - greenc;
        } else if (green == cmax) {
          hue = 2.0 + redc - bluec;
        } else {
          hue = 4.0 + greenc - redc;
        }

        hue = hue / 6.0;

        if (hue < 0) {
          hue = hue + 1.0;
        }
      }

      return [ Math.round(hue * 360), Math.round(saturation * 100), Math.round(brightness * 100) ];
    },


    /**
     * Convert HSB colors to RGB
     *
     * @param hsb {Number[]} an array with hue, saturation and brightness
     * @return {Integer[]} an array with red, green, blue
     */
    hsbToRgb : function(hsb)
    {
      var i, f, p, r, t;

      var hue = hsb[0] / 360;
      var saturation = hsb[1] / 100;
      var brightness = hsb[2] / 100;

      if (hue >= 1.0) {
        hue %= 1.0;
      }

      if (saturation > 1.0) {
        saturation = 1.0;
      }

      if (brightness > 1.0) {
        brightness = 1.0;
      }

      var tov = Math.floor(255 * brightness);
      var rgb = {};

      if (saturation == 0.0)
      {
        rgb.red = rgb.green = rgb.blue = tov;
      }
      else
      {
        hue *= 6.0;

        i = Math.floor(hue);

        f = hue - i;

        p = Math.floor(tov * (1.0 - saturation));
        r = Math.floor(tov * (1.0 - (saturation * f)));
        t = Math.floor(tov * (1.0 - (saturation * (1.0 - f))));

        switch(i)
        {
          case 0:
            rgb.red = tov;
            rgb.green = t;
            rgb.blue = p;
            break;

          case 1:
            rgb.red = r;
            rgb.green = tov;
            rgb.blue = p;
            break;

          case 2:
            rgb.red = p;
            rgb.green = tov;
            rgb.blue = t;
            break;

          case 3:
            rgb.red = p;
            rgb.green = r;
            rgb.blue = tov;
            break;

          case 4:
            rgb.red = t;
            rgb.green = p;
            rgb.blue = tov;
            break;

          case 5:
            rgb.red = tov;
            rgb.green = p;
            rgb.blue = r;
            break;
        }
      }

      return [rgb.red, rgb.green, rgb.blue];
    },


    /**
     * Creates a random color.
     *
     * @return {String} a valid qooxdoo/CSS rgb color string.
     */
    randomColor : function()
    {
      var r = Math.round(Math.random() * 255);
      var g = Math.round(Math.random() * 255);
      var b = Math.round(Math.random() * 255);

      return this.rgbToRgbString([r, g, b]);
    }
  }
});
