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

************************************************************************ */

/**
 * Manager for font themes
 */
qx.Class.define("qx.theme.manager.Font",
{
  type : "singleton",
  extend : qx.util.ValueManager,


  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** the currently selected font theme */
    theme :
    {
      check : "Theme",
      nullable : true,
      apply : "_applyTheme",
      event : "changeTheme"
    }
  },





  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /**
     * Returns the dynamically interpreted result for the incoming value
     *
     * @param value {String} dynamically interpreted identifier
     * @return {var} return the (translated) result of the incoming value
     */
    resolveDynamic : function(value)
    {
      var dynamic = this._dynamic;
      return value instanceof qx.bom.Font ? value : dynamic[value];
    },


    /**
     * Returns the dynamically interpreted result for the incoming value,
     * (if available), otherwise returns the original value
     * @param value {String} Value to resolve
     * @return {var} either returns the (translated) result of the incoming
     * value or the value itself
     */
    resolve : function(value)
    {
      // @ITG:Wisej: When the value is font property map, need to generate a key.
      var key = value;
      if (typeof key != "string")
        key = qx.lang.String.toHashCode(JSON.stringify(value));

      var cache = this._dynamic;
      var resolved = cache[key];

      if (resolved) {
        return resolved;
      }

      // @ITG:Wisej: Get the font from the theme only if the value is a string (the name of the themed font).
      if (typeof value === "string") {

        // If the font instance is not yet cached create a new one to return
        // This is true whenever a runtime include occurred (using "qx.Theme.include"
        // or "qx.Theme.patch"), since these methods only merging the keys of
        // the theme and are not updating the cache
        var theme = this.getTheme();
        if (theme !== null && theme.fonts[value])
        {
          var font = this.__getFontClass(theme.fonts[value]);
          return cache[key] = (new font).set(theme.fonts[value]);
        }
      }

      // @ITG:Wisej: Added fallback resolution for CSS-style font strings.
      if (typeof value === "string") {
        return cache[key] = qx.bom.Font.fromString(value);
      }

      // @ITG:Wisej: Added fallback for font configurations.
      if (value)
      {
        var config = value;
        if (config.family && config.family.length > 0)
        {
          var family = [];

          // add the family names that may be declared as theme fonts.
          var theme = this.getTheme();
          if (theme && theme.fonts)
          {
            for (var i = 0; i < config.family.length; i++)
            {
              var name = config.family[i];
              var themeFont = theme.fonts[name];

              if (themeFont && themeFont.family)
                family.push(themeFont.family);
              else
                family.push(name);
            }

            // eliminate duplicates.
            family = qx.lang.Array.unique(family);
          }
          else
          {
            family.push(config.family);
          }

          config.family = family;
          var font = this.__getFontClass(config);
          return cache[key] = (new font).set(config);
        }
      }

      return value;
    },


    /**
     * Whether a value is interpreted dynamically
     *
     * @param value {String} dynamically interpreted identifier
     * @return {Boolean} returns true if the value is interpreted dynamically
     */
    isDynamic : function(value)
    {
      var cache = this._dynamic;

      if (value && (value instanceof qx.bom.Font || cache[value] !== undefined))
      {
        return true;
      }

      // If the font instance is not yet cached create a new one to return
      // This is true whenever a runtime include occurred (using "qx.Theme.include"
      // or "qx.Theme.patch"), since these methods only merging the keys of
      // the theme and are not updating the cache
      var theme = this.getTheme();
      if (theme !== null && value && theme.fonts[value])
      {
        var font = this.__getFontClass(theme.fonts[value]);
        cache[value] = (new font).set(theme.fonts[value]);
        return true;
      }

      return false;
    },


    /**
     * Checks for includes and resolves them recursively
     *
     * @param fonts {Map} all fonts of the theme
     * @param fontName {String} font name to include
     */
    __resolveInclude : function(fonts, fontName)
    {
      if (fonts[fontName].include)
      {
        // get font infos out of the font theme
        var fontToInclude = fonts[fonts[fontName].include];

        // delete 'include' key - not part of the merge
        fonts[fontName].include = null;
        delete fonts[fontName].include;

        fonts[fontName] = qx.lang.Object.mergeWith(fonts[fontName], fontToInclude, false);

        this.__resolveInclude(fonts, fontName);
      }
    },


    // apply method
    _applyTheme : function(value)
    {
      var dest = this._dynamic;

      for (var key in dest)
      {
        if (dest[key].themed)
        {
          dest[key].dispose();
          delete dest[key];
        }
      }

      if (value)
      {
        var source = value.fonts;

        for (var key in source)
        {
          if (source[key].include && source[source[key].include]) {
            this.__resolveInclude(source, key);
          }

          var font = this.__getFontClass(source[key]);
          dest[key] = (new font).set(source[key]);
          dest[key].themed = true;
        }
      }
      this._setDynamic(dest);
    },

    /**
     * Decides which Font class should be used based on the theme configuration
     *
     * @param config {Map} The font's configuration map
     * @return {Class}
     */
    __getFontClass : function(config)
    {
      if (config.sources) {
        return qx.bom.webfonts.WebFont;
      }
      return qx.bom.Font;
    }
  },


  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function() {
    this._disposeMap("_dynamic");
  }
});
