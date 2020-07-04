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
 * The DisposeQueue registers all widgets which are should be disposed.
 * This queue makes it possible to remove widgets from the DOM using
 * the layout and element queues and dispose them afterwards.
 */
qx.Class.define("qx.ui.core.queue.Dispose",
{
  statics :
  {
    /** @type {Array} This contains all the queued widgets for the next flush. */
    __queue : [],

  	// @ITG:Wisej: Speed improvement. Using https://github.com/qooxdoo/qooxdoo/pull/9078.
  	/** @type {Map} map of widgets by hash code which are in the queue */
    __lookup: {},

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
      qx.ui.core.queue.Manager.scheduleFlush("dispose");
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
     * Whether the dispose queue is empty
     * @return {Boolean}
     * @internal
     */
    isEmpty : function()
    {
      return this.__queue.length == 0;
    },


    /**
     * Flushes the dispose queue.
     *
     * This is used exclusively by the {@link qx.ui.core.queue.Manager}.
     */
    flush : function()
    {
      // @ITG:Wisej: Speed improvement.
      // Dispose all registered objects
      var queue = this.__queue;
      for (var i = 0; i < queue.length; i++) {
        queue[i].dispose();
      }

      // Clear the inner lists.
      this.__queue = [];
      this.__lookup = {};
    }
  }
});
