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
     * Mustafa Sak (msak)

************************************************************************ */

/**
 * The widget queue handles the deferred computation of certain widget properties.
 * It is used e.g. for the tree to update the indentation of tree nodes.
 *
 * This queue calls the method {@link qx.ui.core.Widget#syncWidget} of each
 * queued widget before the layout queues are processed.
 */
qx.Class.define("qx.ui.core.queue.Widget",
{
  statics :
  {
    /** @type {Array} This contains all the queued widgets for the next flush. */
    __queue : [],


    /**
     * @type {Object} This contains a map of widgets hash ($$hash) and their
     * corresponding map of jobs.
     */
    __jobs : {},

    /**
     * Clears given job of a widget from the internal queue. If no jobs left, the
     * widget will be removed completely from queue. If job param is <code>null</code>
     * or <code>undefined</code> widget will be removed completely from queue.
     * Normally only used during interims disposes of one or a few widgets.
     *
     * @param widget {qx.ui.core.Widget} The widget to clear
     * @param job {String?} Job identifier. If not used, it will be converted to
     * "$$default".
     */
    remove : function(widget, job)
    {
      var queue = this.__queue;

      // @ITG:Wisej: Speed improvement.
      // if (!qx.lang.Array.contains(queue, widget)) {
      //  return;
      //}

      if (!queue.includes(widget)) {
        return;
      }

      var hash = widget.$$hash;

      // remove widget and all corresponding jobs, if job param is not given.
      if (job == null) {
      	qx.lang.Array.remove(queue, widget);
      	delete this.__jobs[hash];
        return;
      }

      if (this.__jobs[hash]) {
        delete this.__jobs[hash][job];

        if (qx.lang.Object.getLength(this.__jobs[hash]) == 0) {
          qx.lang.Array.remove(queue, widget);
	    }
      }
    },


    /**
     * Adds a widget to the queue. The second param can be used to identify
     * several jobs. You can add one job at once, which will be returned as
     * an map at flushing on method {@link qx.ui.core.Widget#syncWidget}.
     *
     * @param widget {qx.ui.core.Widget} The widget to add.
     * @param job {String?} Job identifier. If not used, it will be converted to
     * "$$default".
     */
    add : function(widget, job)
    {
      var queue = this.__queue;

      // @ITG:Wisej: Speed improvement.
      // if (!qx.lang.Array.contains(queue, widget)) {
      //  queue.unshift(widget);
      // }

      if (!queue.includes(widget)) {
        queue.push(widget);
      }

      //add job
      if (job == null) {
        job = "$$default";
      }
      var hash = widget.$$hash;
      if (!this.__jobs[hash]) {
        this.__jobs[hash] = {};
      }
      this.__jobs[hash][job] = true;

      qx.ui.core.queue.Manager.scheduleFlush("widget");
    },

    /**
     * Flushes the widget queue.
     *
     * This is used exclusively by the {@link qx.ui.core.queue.Manager}.
     */
    flush : function()
    {
      // Process all registered widgets
      var jobs = this.__jobs;
      var queue = this.__queue;
      this.__jobs = {};
      this.__queue = [];

      var widget, jobs, hash;
      for (var i = 0; i < queue.length; i++) {
        widget = queue[i];
        hash = widget.$$hash;

      	widget.syncWidget(jobs[hash]);
      }
    }
  }
});
