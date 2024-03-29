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
     * Fabian Jakobs (fjakobs)
     * Mustafa Sak (msak)

************************************************************************ */

/**
 * A wrapper for CSS font styles. Fond objects can be applied to instances
 * of {@link qx.html.Element}.
 */
qx.Class.define("qx.bom.Font",
{
  extend : qx.core.Object,




  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param size {String?} The font size (Unit: pixel)
   * @param family {String[]?} A sorted list of font families
   */
  construct : function(size, family)
  {
    this.base(arguments);

    this.__lookupMap =
    {
      fontFamily: "",
      fontSize: null,
      fontWeight: null,
      fontStyle: null,
      textDecoration: null,
      lineHeight: "normal",
      letterSpacing: "normal",

      // @ITG:Wisej: Setting the color to null overrides inherited text colors.
      // color: null,

      textShadow: null
    };

    if (size !== undefined) {
      this.setSize(size);
    }

    if (family !== undefined) {
      this.setFamily(family);
    }
  },




  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /**
     * Converts a typical CSS font definition string to an font object
     *
     * Example string: <code>bold italic 20px Arial</code>
     *
     * @param str {String} the CSS string
     * @return {qx.bom.Font} the created instance
     */
    fromString : function(str)
    {
      var font = new qx.bom.Font();
      var parts = str.split(/\s+/);
      var name = [];
      var part;

      for (var i=0; i<parts.length; i++)
      {
        switch(part = parts[i])
        {
          case "bold":
            font.setBold(true);
            break;

          case "italic":
            font.setItalic(true);
            break;

          case "underline":
            font.setDecoration("underline");
            break;

          // @ITG:Wisej: Added missing properties.
          case "overline":
          case "line-through":
            font.setDecoration(part);
            break;
          case "px":
          case "pt":
          case "em":
            font.setUnit(part);
            break;

          default:

            // @ITG:Wisej: Added support for the unit property.
            var size = parseInt(part, 10);

            if (!isNaN(size)) {
              font.setSize(size);

              if (qx.lang.String.endsWith(part, "px"))
                font.setUnit("px");
              else if (qx.lang.String.endsWith(part, "pt"))
                font.setUnit("pt");
              else if (qx.lang.String.endsWith(part, "em"))
                font.setUnit("em");
            }
            else {
              name.push(part);
            }

            /*
            var temp = parseInt(part, 10);

            if (temp == part || qx.lang.String.contains(part, "px")) {
              font.setSize(temp);
            } else {
              name.push(part);
            }
            */

            break;
        }
      }

      if (name.length > 0) {
        font.setFamily(name);
      }

      return font;
    },


    /**
     * Converts a map property definition into a font object.
     *
     * @param config {Map} map of property values
     * @return {qx.bom.Font} the created instance
     */
    fromConfig : function(config)
    {
      var font = new qx.bom.Font;
      font.set(config);
      return font;
    },


    /** @type {Map} Default (empty) CSS styles */
    __defaultStyles :
    {
      fontFamily: "",
      fontSize: "",
      fontWeight: "",
      fontStyle: "",
      textDecoration: "",
      lineHeight: "normal",
      letterSpacing: "normal",
      color: "",
      textShadow: ""
    },


    /**
     * Returns a map of all properties in empty state.
     *
     * This is useful for resetting previously configured
     * font styles.
     *
     * @return {Map} Default styles
     */
    getDefaultStyles : function() {
      return this.__defaultStyles;
    }
  },




  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** The font size (Unit: pixel) */
    size :
    {
      check : "Integer",
      nullable : true,
      apply : "_applySize"
    },


	// @ITG:Wisej: Added font unit.
    /** The font size unit: "px" (default) or "pt" or "em". */
    unit:
    {
      check : ["px", "pt", "em"],
      nullable: false,
      init: "px",
      apply: "_applyUnit"
    },

	// @ITG:Wisej: Added letter spacing.
    /** The font size unit: "px" (default) or "pt" or "em". */
    letterSpacing:
    {
      check: "Number",
      nullable: true,
      init: "normal",
      apply: "_applyLetterSpacing"
    },

    /**
     * The line height as scaling factor of the default line height. A value
     * of 1 corresponds to the default line height
     */
    lineHeight :
    {
      check : "Number",
      nullable: true,
      init: "normal",
      apply : "_applyLineHeight"
    },


    /** A sorted list of font families */
    family :
    {
      check : "Array",
      nullable : true,
      apply : "_applyFamily"
    },

    /** Whether the font is bold */
    bold :
    {
      check : "Boolean",
      nullable : true,
      apply : "_applyBold"
    },

    /** Whether the font is italic */
    italic :
    {
      check : "Boolean",
      nullable : true,
      apply : "_applyItalic"
    },

    /** The text decoration for this font */
    decoration :
    {
      check : [ "underline", "line-through", "overline" ],
      nullable : true,
      apply : "_applyDecoration"
    },

    /** The text color for this font */
    color :
    {
      check : "Color",
      nullable: true,
      apply: "_applyColor"
    },

    /** The text shadow for this font */
    textShadow :
    {
      nullable : true,
      check : "String",
      apply : "_applyTextShadow"
    },

    /** The weight property of the font as opposed to just setting it to 'bold' by setting the bold property to true */
    weight:
    {
      nullable: true,
      check: "String",
      apply: "_applyWeight"
    }
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __lookupMap : null,


    // property apply
    _applySize : function(value, old) {
      // @ITG:Wisej: Added font unit.
      this.__lookupMap.fontSize = value === null ? null : value + this.getUnit();
      // this.__lookupMap.fontSize = value === null ? null : value + "px";
    },

    _applyLineHeight : function(value, old) {
      this.__lookupMap.lineHeight = value === "normal" ? null : value;
    },

  	// @ITG:Wisej: Added font unit.
    _applyUnit: function (value, old) {
      if (this.getSize() != null)
      	this.__lookupMap.fontSize = this.getSize() + value;
    },

  	// @ITG:Wisej: Added letter spacing.
    _applyLetterSpacing: function (value, old) {
      this.__lookupMap.letterSpacing = value === null ? "normal" : value + "px";
    },

    // property apply
    _applyFamily : function(value, old)
    {
      var family = "";

      for (var i=0, l=value.length; i<l; i++)
      {
        // in FireFox 2 and WebKit fonts like 'serif' or 'sans-serif' must
        // not be quoted!
        if (value[i].indexOf(" ") > 0) {
          family += '"' + value[i] + '"';
        } else {
          family += value[i];
        }

        if (i !== l-1) {
          family += ",";
        }
      }

      // font family is a special case. In order to render the labels correctly
      // we have to return a font family - even if it's an empty string to prevent
      // the browser from applying the element style
      this.__lookupMap.fontFamily = family;
    },


    // property apply
    _applyBold : function(value, old) {
      this.__lookupMap.fontWeight = value == null ? null : value ? "bold" : "normal";
    },


    // property apply
    _applyItalic : function(value, old) {
      this.__lookupMap.fontStyle = value == null ? null : value ? "italic" : "normal";
    },


    // property apply
    _applyDecoration : function(value, old) {
      this.__lookupMap.textDecoration = value == null ? null : value;
    },

    // property apply
    _applyColor : function(value, old) {

      // @ITG:Wisej: Setting the color to null overrides inherited text colors.
      // this.__lookupMap.color = null;
      delete this.__lookupMap.color;

      if (value) {
        this.__lookupMap.color = qx.theme.manager.Color.getInstance().resolve(value);
      }
    },

    // property apply
    _applyWeight: function(value, old) {
      this.__lookupMap.fontWeight = value;
    },

    // property apply
    _applyTextShadow : function(value, old) {
      this.__lookupMap.textShadow = value == null ? null : value;
    },


    /**
     * Get a map of all CSS styles, which will be applied to the widget. Only
     * the styles which are set are returned.
     *
     * @return {Map} Map containing the current styles. The keys are property
     * names which can directly be used with the <code>set</code> method of each
     * widget.
     */
    getStyles : function() {
      return this.__lookupMap;
    }
  }
});
