/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2010 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Martin Wittemann (martinwittemann)

************************************************************************ */
/**
 * Mixin responsible for setting the background color of a widget.
 * This mixin is usually used by {@link qx.ui.decoration.Decorator}.
 */
qx.Mixin.define("qx.ui.decoration.MBackgroundColor",
{
  properties :
  {
    /** Color of the background */
    backgroundColor :
    {
      check : "Color",
      nullable : true,
      apply : "_applyBackgroundColor"
    },

    // @ITG:Wisej: Added the clip property to let the border overlap with the background color.
    clip:
    {
      init: "border-box",
      check: ["border-box", "padding-box", "content-box", "initial", "inherit"],
      apply: "_applyBackgroundColor"
    },

  	// @ITG:Wisej: Added the textColor.
    textColor:
    {
      check: "Color",
      nullable: true,
      apply: "_applyBackgroundColor"
    },

  	// @ITG:Wisej: Added the filter.
    filter: {
      check: "String",
      nullable: true,
      apply: "_applyBackgroundColor"
    }
  },


  members :
  {

    /**
     * Adds the background-color styles to the given map
     * @param styles {Map} CSS style map
     */
    _styleBackgroundColor : function(styles) {

      var bgcolor = this.getBackgroundColor();

      if (bgcolor && qx.core.Environment.get("qx.theme")) {
        bgcolor = qx.theme.manager.Color.getInstance().resolve(bgcolor);
      }

      // @ITG:Wisej: Added the textColor.
      var txcolor = this.getTextColor();

      if (txcolor && qx.core.Environment.get("qx.theme")) {
        txcolor = qx.theme.manager.Color.getInstance().resolve(txcolor);
      }
      if (txcolor) {
      	styles["color"] = txcolor;
      }

      if (bgcolor) {
        styles["background-color"] = bgcolor;
      }

      // @ITG:Wisej: Added he filter.
      var filter = this.getFilter();
      if (filter) {
        styles["filter"] = filter;
      }

      // @ITG:Wisej: Added backgroundClip to support alpha transparency on borders.
      // Alpha transparency allows us to set generic border overlays that dynamically adapt to the background color.
      styles["background-clip"] = this.getClip();

    },


    // property apply
    _applyBackgroundColor : function()
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        if (this._isInitialized()) {
          throw new Error("This decorator is already in-use. Modification is not possible anymore!");
        }
      }
    }
  }
});
