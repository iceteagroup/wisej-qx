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
/* ************************************************************************


************************************************************************ */
/**
 * A special blocker element for the splitpane which is based on
 * {@link qx.html.Element} and takes care of the positioning of the div.
 *
 * @internal
 * @asset(qx/static/blank.gif)
 */
qx.Class.define("qx.ui.splitpane.Blocker",
{
  extend : qx.html.Element,

  /**
   * @param orientation {String} The orientation of the split pane control.
   */
  construct : function(orientation)
  {
    var styles = {
      position: "absolute",
      zIndex: 11
    };

    // IE needs some extra love here to convince it to block events.
    if ((qx.core.Environment.get("engine.name") == "mshtml"))
    {
      // @ITG:Wisej: Replaced link to bank.gif with the existing PLACEHOLDER_IMAGE.
      styles.backgroundImage = "url(\"" + qx.ui.basic.Image.PLACEHOLDER_IMAGE + "\")";
        styles.backgroundRepeat = "repeat";
    }

    this.base(arguments, "div", styles);

  },

  members :
  {

    /**
     * Sets the width of the blocker.
     *
     * @param width {Number} The width of the splitter.
     */
    setWidth : function(width) {
      this.setStyle("width", width + "px");
    },


    /**
     * Sets the height of the blocker.
     *
     * @param height {Number} The height of the splitter.
     */
    setHeight: function (height) {
      this.setStyle("height", height + "px");
    },
  }
});
