/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2017 Ice Tea Group LLC, http://wisej.com
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     MIT: https://opensource.org/licenses/MIT
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Gianluca Pivato (Ice Tea Group LLC)

************************************************************************ */

/**
 * Provides mirroring behavior to any widget.
 */
qx.Mixin.define("qx.ui.core.MRightToLeftLayout",
{
    /*
    *****************************************************************************
       CONSTRUCTOR
    *****************************************************************************
    */
    construct: function () {

        this.addListener("changeRtl", this.__onRtlChange, this);
    },

    /*
    *****************************************************************************
       PROPERTIES
    *****************************************************************************
    */

    properties:
    {
        /**
         * rtlLayout property.
         *
         * Enables or disables the automatic mirroring of the horizontal
         * position of direct child widgets when the value of the {@link qx.ui.core.Widget.rtl}
         * property is true.
         */
        rtlLayout: { init: false, themeable: true, check: "Boolean", apply: "_applyRtlLayout" }

    },


    /*
    *****************************************************************************
       MEMBERS
    *****************************************************************************
    */

    members:
    {
        // Listens to "changeRtl" to mirror the child controls.
        __onRtlChange: function (e) {

          if (e.getData() === e.getOldData())
            return;

            var rtl = e.getData();
            if (rtl != null) {
                this.__performMirrorChildren(rtl && this.getRtlLayout());
            }
        },

        /**
         * Applies the rtlLayout property.
         */
        _applyRtlLayout: function (value, old) {

          var rtl = this.getRtl();
          if (rtl != null) {
            this.__performMirrorChildren(rtl && value);
          }
        },

        __performMirrorChildren: function (mirror) {

            if (this.getChildrenContainer)
                this.getChildrenContainer()._mirrorChildren(mirror);
            else
                this._mirrorChildren(mirror);
        }
    }

});
