/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
	 2015 Ice Tea Group LLC, http://wisej.com
     2004-2010 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     MIT: https://opensource.org/licenses/MIT
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Gianluca Pivato (Ice Tea Group LLC)

************************************************************************ */

// @ITG:Wisej: Added transform and transition decoration support.

/**
 * A decorator featuring the CSS3 transform property http://www.w3schools.com/cssref/css3_pr_transform.asp
 * and the transition property http://www.w3schools.com/css/css3_transitions.asp.
 *
 * This mixin is usually used by {@link qx.ui.decoration.Decorator}.
 */
qx.Mixin.define("qx.ui.decoration.MTransform",
{
  properties :
  {
    /*
    ---------------------------------------------------------------------------
      PROPERTY: TRANSFORM
    ---------------------------------------------------------------------------
    */

    /** the CSS3 transform string */
    transform :
    {
      init: null,
      check: "String",
      apply : "_applyTransform"
    },

    /** the CSS3 transform-origin string */
    transformOrigin:
    {
      init: null,
      check: "String",
      apply: "_applyTransform"
    },

    /** the CSS3 transition string */
    transition:
    {
      init: null,
      check: "String",
      apply: "_applyTransform"
    },

  },


  members :
  {
    /**
     * Passes the transform and transition properties to the stylesheet.
     * This is the needed behavior for {@link qx.ui.decoration.Decorator}.
     *
     * @param styles {Map} A map to add the styles.
     */
    _styleTransform : function(styles)
    {
      // Add transform.
      if (this.getTransform() != null)
        styles["transform"] = this.getTransform();

      // Add transform-origin.
      if (this.getTransformOrigin() != null)
        styles["transform-origin"] = this.getTransformOrigin();

     // Add transition.
     if (this.getTransition() != null)
        styles["transition"] = this.getTransition();
    },

    /*
    ---------------------------------------------------------------------------
      PROPERTY APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    // property apply
    _applyTransform: function ()
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
