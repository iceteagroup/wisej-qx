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
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * The AppearanceQueue registers all widgets which are influences through
 * state changes.
 */
qx.Class.define("qx.ui.core.queue.Appearance",
{
  statics :
  {
    /** @type {Array} This contains all the queued widgets for the next flush. */
    __queue : [],

  	// @ITG:Wisej: Speed improvement. Using https://github.com/qooxdoo/qooxdoo/pull/9078.
  	/** @type {Map} map of widgets by hash code which are in the queue */
    __lookup : {},

    /**
     * Clears the widget from the internal queue. Normally only used
     * during interims disposes of one or a few widgets.
     *
     * @param widget {qx.ui.core.Widget} The widget to clear
     */
    remove : function(widget) {
      // @ITG:Wisej: Speed improvement.
      // qx.lang.Array.remove(this.__queue, widget);
      if (!this.contains(widget)) {
        qx.lang.Array.remove(this.__queue, widget);
        delete this.__lookup[widget.$$hash];
      }
    },


    /**
     * Adds a widget to the queue.
     *
     * Should only be used by {@link qx.ui.core.Widget}.
     *
     * @param widget {qx.ui.core.Widget} The widget to add.
     */
    add : function(widget)
    {
      // @ITG:Wisej: Speed improvement.
      //if (qx.lang.Array.contains(queue, widget)) {
      //  return;
      //}
      if (this.contains(widget))
        return;

      this.__queue.push(widget);
      this.__lookup[widget.$$hash] = widget;
      qx.ui.core.queue.Manager.scheduleFlush("appearance");
    },


    /**
     * Whether the given widget is already queued
     *
     * @param widget {qx.ui.core.Widget} The widget to check
     * @return {Boolean} <code>true</code> if the widget is queued
     */
    has: function (widget) {
      // @ITG:Wisej: Speed improvement.
      // return qx.lang.Array.contains(this.__queue, widget);
      return this.contains(widget);
    },


  	// @ITG:Wisej: Speed improvement.
    /**
     * Checks if the widget is already in the queue.
     * 
     * @param widget {qx.ui.core.Widget} The widget to look for.
     *
     */
    contains : function (widget) {
      return !!this.__lookup[widget.$$hash];
    },


    /**
     * Flushes the appearance queue.
     *
     * This is used exclusively by the {@link qx.ui.core.queue.Manager}.
     */
    flush : function()
    {
      var Visibility = qx.ui.core.queue.Visibility;

      // @ITG:Wisej: Speed improvement.
      var widget = null;
      var queue = this.__queue;
      var lookup = this.__lookup;
      //The queue.length may change if a call to syncAppearance adds more widgets.
      for (var i = 0; i < queue.length; i++)
      {
      	widget = queue[i];
		// let the widget be able to get re-added to the queue.
      	delete this.__lookup[widget.$$hash];

        // Only apply to currently visible widgets.
      	if (Visibility.isVisible(widget)) {
      		widget.syncAppearance();
        } else {
      		widget.$$stateChanges = true;
        }
      }

      // Clear the inner lists.
      this.__queue = [];
      this.__lookup = {};
    }
  }
});
