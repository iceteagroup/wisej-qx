/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2007 David Pérez Carmona
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * David Perez Carmona (david-perez)
     * Sebastian Werner (wpbasti)
     * Fabian Jakobs (fjakobs)
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * Provides resizing behavior to any widget.
 */
qx.Mixin.define("qx.ui.core.MResizable",
{
  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    // Register listeners to the content
    var content = this.getContentElement();
    content.addListener("pointerdown", this.__onResizePointerDown, this, true);
    content.addListener("pointerup", this.__onResizePointerUp, this);
    content.addListener("pointermove", this.__onResizePointerMove, this);
    content.addListener("pointerout", this.__onResizePointerOut, this);
    content.addListener("losecapture", this.__onResizeLoseCapture, this);

    // Get a reference of the drag and drop handler
    var domElement = content.getDomElement();
    if (domElement == null) {
      domElement = window;
    }

    this.__dragDropHandler = qx.event.Registration.getManager(domElement).getHandler(qx.event.handler.DragDrop);
  },





  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** Whether the top edge is resizable */
    resizableTop :
    {
      check : "Boolean",
      init : true
    },

    /** Whether the right edge is resizable */
    resizableRight :
    {
      check : "Boolean",
      init : true
    },

    /** Whether the bottom edge is resizable */
    resizableBottom :
    {
      check : "Boolean",
      init : true
    },

    /** Whether the left edge is resizable */
    resizableLeft :
    {
      check : "Boolean",
      init : true
    },

    /**
     * Property group to configure the resize behavior for all edges at once
     */
    resizable :
    {
      group : [ "resizableTop", "resizableRight", "resizableBottom", "resizableLeft" ],
      mode  : "shorthand"
    },

    /** The tolerance to activate resizing */
    resizeSensitivity :
    {
      check : "Integer",
      init : 5
    },

    /** Whether a frame replacement should be used during the resize sequence */
    useResizeFrame :
    {
      check : "Boolean",
      init : true
    }
  },





  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __dragDropHandler : null,
    __resizeFrame : null,
    __resizeActive : null,
    __resizeLeft : null,
    __resizeTop : null,
    __resizeStart : null,
    __resizeRange : null,
    __savedCursor: null,
    __cursorChanged: false,

    RESIZE_TOP : 1,
    RESIZE_BOTTOM : 2,
    RESIZE_LEFT : 4,
    RESIZE_RIGHT : 8,

    /**
     * Returns true when any of the resizable properties is true.
     */
    isResizable: function () {
      var retval = 
        this.isResizableRight()
          || this.isResizableBottom()
            || this.isResizableLeft()
              || this.isResizableTop();

      return retval;
    },

    /*
    ---------------------------------------------------------------------------
      CORE FEATURES
    ---------------------------------------------------------------------------
    */

    /**
     * Get the widget, which draws the resize/move frame. The resize frame is
     * shared by all widgets and is added to the root widget.
     *
     * @return {qx.ui.core.Widget} The resize frame
     */
    _getResizeFrame : function()
    {
      var frame = this.__resizeFrame;
      if (!frame)
      {
        frame = this.__resizeFrame = new qx.ui.core.Widget();
        frame.exclude();
        frame.setAppearance("resize-frame");

        // @ITG:Wisej: Allow the resize frame to be dragged on touch devices.
        frame.getContentElement().setStyles({ "touch-action": "none", "-ms-touch-action": "none" });

        qx.core.Init.getApplication().getRoot().add(frame);
      }

      return frame;
    },


    /**
     * Creates, shows and syncs the frame with the widget.
     */
    __showResizeFrame : function()
    {
      var location = this.getContentLocation();
      var frame = this._getResizeFrame();
      frame.setUserBounds(
        location.left,
        location.top,
        location.right - location.left,
        location.bottom - location.top
      );
      frame.show();

      // @ITG:Wisej: The z-index was too low when using the resize frame with a child widget.
      // frame.setZIndex(this.getZIndex() + 1);
      frame.setZIndex(1e8);
    },


    /*
    ---------------------------------------------------------------------------
      RESIZE SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Computes the new boundaries at each interval
     * of the resize sequence.
     *
     * @param e {qx.event.type.Pointer} Last pointer event
     * @return {Map} A map with the computed boundaries
     */
    __computeResizeResult : function(e)
    {
      // Detect mode
      var resizeActive = this.__resizeActive;

      // Read size hint
      var hint = this.getSizeHint();
      var range = this.__resizeRange;

      // Read original values
      var start = this.__resizeStart;
      var width = start.width;
      var height = start.height;
      var left = start.left;
      var top = start.top;
      var diff;

      if (
        (resizeActive & this.RESIZE_TOP) ||
        (resizeActive & this.RESIZE_BOTTOM)
      )
      {
        diff = Math.max(range.top, Math.min(range.bottom, e.getDocumentTop())) - this.__resizeTop;

        if (resizeActive & this.RESIZE_TOP) {
          height -= diff;
        } else {
          height += diff;
        }

        if (height < hint.minHeight) {
          height = hint.minHeight;
        } else if (height > hint.maxHeight) {
          height = hint.maxHeight;
        }

        if (resizeActive & this.RESIZE_TOP) {
          top += start.height - height;
        }
      }

      if (
        (resizeActive & this.RESIZE_LEFT) ||
        (resizeActive & this.RESIZE_RIGHT)
      )
      {
        diff = Math.max(range.left, Math.min(range.right, e.getDocumentLeft())) - this.__resizeLeft;

        if (resizeActive & this.RESIZE_LEFT) {
          width -= diff;
        } else {
          width += diff;
        }

        if (width < hint.minWidth) {
          width = hint.minWidth;
        } else if (width > hint.maxWidth) {
          width = hint.maxWidth;
        }

        if (resizeActive & this.RESIZE_LEFT) {
          left += start.width - width;
        }
      }

      return {
        // left and top of the visible widget
        viewportLeft : left,
        viewportTop : top,

        parentLeft : start.bounds.left + left - start.left,
        parentTop : start.bounds.top + top - start.top,

        // dimensions of the visible widget
        width : width,
        height : height
      };
    },


    /**
     * @type {Map} Maps internal states to cursor symbols to use
     *
     * @lint ignoreReferenceField(__resizeCursors)
     */
    __resizeCursors :
    {
      1  : "n-resize",
      2  : "s-resize",
      3  : "ns-resize",
      4  : "w-resize",
      5  : "nw-resize",
      6  : "sw-resize",
      7  : "move",
      8  : "e-resize",
      9  : "ne-resize",
      10 : "se-resize",
      11 : "move",
      12 : "ew-resize",
      13 : "move",
      14 : "move",
      15 : "move",
    },


    /**
     * Updates the internally stored resize mode
     *
     * @param e {qx.event.type.Pointer} Last pointer event
     */
    __computeResizeMode : function(e)
    {
      var location = this.getContentLocation();
      var pointerTolerance = this.getResizeSensitivity();

      var pointerLeft = e.getDocumentLeft();
      var pointerTop = e.getDocumentTop();

      var resizeActive = this.__computeResizeActive(
        location, pointerLeft, pointerTop, pointerTolerance
      );

      // check again in case we have a corner [BUG #1200]
      if (resizeActive > 0) {

        // this is really a | (or)!
        resizeActive = resizeActive | this.__computeResizeActive(
          location, pointerLeft, pointerTop, pointerTolerance * 2
        );
      }

      this.__resizeActive = resizeActive;
    },


    /**
     * Internal helper for computing the proper resize action based on the
     * given parameters.
     *
     * @param location {Map} The current location of the widget.
     * @param pointerLeft {Integer} The left position of the pointer.
     * @param pointerTop {Integer} The top position of the pointer.
     * @param pointerTolerance {Integer} The desired distance to the edge.
     * @return {Integer} The resize active number.
     */
    __computeResizeActive : function(location, pointerLeft, pointerTop, pointerTolerance) {
      var resizeActive = 0;

      // TOP
      if (
        this.getResizableTop() &&
        Math.abs(location.top - pointerTop) < pointerTolerance &&
        pointerLeft > location.left - pointerTolerance &&
        pointerLeft < location.right + pointerTolerance
      ) {
        resizeActive += this.RESIZE_TOP;

      // BOTTOM
      } else if (
        this.getResizableBottom() &&
        Math.abs(location.bottom - pointerTop) < pointerTolerance &&
        pointerLeft > location.left - pointerTolerance &&
        pointerLeft < location.right + pointerTolerance
      ) {
        resizeActive += this.RESIZE_BOTTOM;
      }

      // LEFT
      if (
        this.getResizableLeft() &&
        Math.abs(location.left - pointerLeft) < pointerTolerance &&
        pointerTop > location.top - pointerTolerance &&
        pointerTop < location.bottom + pointerTolerance
      ) {
        resizeActive += this.RESIZE_LEFT;

      // RIGHT
      } else if (
        this.getResizableRight() &&
        Math.abs(location.right - pointerLeft) < pointerTolerance &&
        pointerTop > location.top - pointerTolerance &&
        pointerTop < location.bottom + pointerTolerance
      ) {
        resizeActive += this.RESIZE_RIGHT;
      }
      return resizeActive;
    },


    /*
    ---------------------------------------------------------------------------
      RESIZE EVENT HANDLERS
    ---------------------------------------------------------------------------
    */

    /**
     * Event handler for the pointer down event
     *
     * @param e {qx.event.type.Pointer} The pointer event instance
     */
    __onResizePointerDown : function(e)
    {
      // Check for active resize
      if (e.getPointerType() === "touch" && this.getEnabled()) {
       this.__computeResizeMode(e);
      }
      if (!this.__resizeActive || !this.getEnabled()) {
        return;
      }

      // Add resize state
      this.addState("resize");

      // @ITG:Wisej: Notify that this widget is being resized.
      this.fireEvent("startresize");

      // Store pointer coordinates
      this.__resizeLeft = e.getDocumentLeft();
      this.__resizeTop = e.getDocumentTop();

      // Cache bounds
      var location = this.getContentLocation();
      var bounds   = this.getBounds();

      this.__resizeStart = {
        top : location.top,
        left : location.left,
        width : location.right - location.left,
        height : location.bottom - location.top,
        bounds : qx.lang.Object.clone(bounds)
      };

      // Compute range
      var parent = this.getLayoutParent();
      var parentLocation = parent.getContentLocation();
      var parentBounds = parent.getBounds();

      this.__resizeRange = {
        left : parentLocation.left,
        top : parentLocation.top,
        right : parentLocation.left + parentBounds.width,
        bottom : parentLocation.top + parentBounds.height
      };

      // Show frame if configured this way
      if (this.getUseResizeFrame()) {
        this.__showResizeFrame();
      }

      // Enable capturing
      this.capture();

      // Stop event
      e.stop();
    },


    /**
     * Event handler for the pointer up event
     *
     * @param e {qx.event.type.Pointer} The pointer event instance
     */
    __onResizePointerUp : function(e)
    {
      // Check for active resize
      if (!this.hasState("resize") || !this.getEnabled()) {
        return;
      }

      // Hide frame afterwards
      if (this.getUseResizeFrame()) {
        this._getResizeFrame().exclude();
      }

      // Compute bounds
      var bounds = this.__computeResizeResult(e);

      // Sync with widget
      this.setWidth(bounds.width);
      this.setHeight(bounds.height);

      // Update coordinate in canvas
      if (this.getResizableLeft() || this.getResizableTop())
      {
        this.setLayoutProperties({
          left : bounds.parentLeft,
          top : bounds.parentTop
        });

        // @ITG:Wisej: MResizable doesn't work for widgets with user bounds.
        if (this.hasUserBounds()) {
            this.setUserBounds(
                bounds.parentLeft,
                bounds.parentTop,
                bounds.width,
                bounds.height);
        }
      }

      // Clear mode
      this.__resizeActive = 0;

      // Remove resize state
      this.removeState("resize");

      // Reset cursor
      // @ITG:Wisej Preserve the original cursor
      //this.resetCursor();
      this.__resetCursor();
      this.getApplicationRoot().resetGlobalCursor();

      // Disable capturing
      this.releaseCapture();

      e.stopPropagation();

      // @ITG:Wisej: Notify that this widget is done being resized.
      this.fireEvent("endresize");
    },


    /**
     * Event listener for <code>losecapture</code> event.
     *
     * @param e {qx.event.type.Event} Lose capture event
     */
    __onResizeLoseCapture : function(e)
    {
      // Check for active resize
      if (!this.__resizeActive) {
        return;
      }

      // Reset cursor
      // @ITG:Wisej Preserve the original cursor
      //this.resetCursor();
      this.__resetCursor();
      this.getApplicationRoot().resetGlobalCursor();

      // Remove drag state
      this.removeState("resize");

      // Hide frame afterwards
      if (this.getUseResizeFrame()) {
        this._getResizeFrame().exclude();
      }

      // @ITG:Wisej: Notify that this widget is done being resized.
      this.fireEvent("endresize");
    },


    /**
     * Event handler for the pointer move event
     *
     * @param e {qx.event.type.Pointer} The pointer event instance
     */
    __onResizePointerMove : function(e)
    {
      if (!this.getEnabled()) {
        return;
      }

      // @ITG:Wisej: Ignore if none of the resizable sides is enabled.
      if (!this.isResizable())
        return;

      if (this.hasState("resize"))
      {
        var bounds = this.__computeResizeResult(e);

        // Update widget
        if (this.getUseResizeFrame())
        {
          // Sync new bounds to frame
          var frame = this._getResizeFrame();
          frame.setUserBounds(bounds.viewportLeft, bounds.viewportTop, bounds.width, bounds.height);
        }
        else
        {
          // Update size
          this.setWidth(bounds.width);
          this.setHeight(bounds.height);

          // Update coordinate in canvas
          if (this.getResizableLeft() || this.getResizableTop())
          {
            this.setLayoutProperties({
              left : bounds.parentLeft,
              top : bounds.parentTop
            });

            // @ITG:Wisej: MResizable doesn't work for widgets with user bounds.
            if (this.hasUserBounds()) {
                this.setUserBounds(
                    bounds.parentLeft,
                    bounds.parentTop,
                    bounds.width,
                    bounds.height);
            }

          }
        }

        // Full stop for event
        e.stopPropagation();
      }
      else if (!this.hasState("maximized") && !this.__dragDropHandler.isSessionActive())
      {
        this.__computeResizeMode(e);

        var resizeActive = this.__resizeActive;
        // var root = this.getApplicationRoot();

        if (resizeActive)
        {
          // @ITG:Wisej: Save the current cursor,  otherwise when a widget
          // includes MResizable it will lose the cursor if it was set.
          this.__changeCursor();
        }
        else if (this.getCursor())
        {
          // @ITG:Wisej Preserve the original cursor
          this.__resetCursor();
        }
      }
    },

    // @ITG:Wisej: Sets the resize cursor.
    /**
     * Shows the resize cursor.
     */
    __changeCursor: function () {

      // @ITG:Wisej: Save the current cursor,  otherwise when a widget
      // includes MResizable it will lose the cursor if it was set.
      if (!this.__cursorChanged) {
        this.__cursorChanged = true;
        this.__savedCursor = this.getCursor();
      }

      var resizeActive = this.__resizeActive;
      if (resizeActive) {
        var cursor = this.__resizeCursors[resizeActive];
        this.setCursor(cursor);

        if (this.getUseResizeFrame())
          this._getResizeFrame().setCursor(cursor);

        this.getApplicationRoot().setGlobalCursor(cursor);
      }
    },

    // @ITG:Wisej: Restore the previously saved cursor.
    /**
     * Restores the original cursor.
     */
    __resetCursor: function () {

      if (!this.__cursorChanged)
        return;

      if (this.__savedCursor)
        this.setCursor(this.__savedCursor);
      else
        this.resetCursor();

      if (this.getUseResizeFrame())
        this._getResizeFrame().resetCursor();

      this.getApplicationRoot().resetGlobalCursor();

      this.__savedCursor = null;;
      this.__cursorChanged = false;
    },

    /**
     * Event handler for the pointer out event
     *
     * @param e {qx.event.type.Pointer} The pointer event instance
     */
    __onResizePointerOut : function(e)
    {
      // When the pointer left the window and resizing is not yet
      // active we must be sure to (especially) reset the global
      // cursor.
      if (this.getCursor() && !this.hasState("resize"))
      {
        // @ITG:Wisej Preserve the original cursor
        //this.resetCursor();
        this.__resetCursor();
        this.getApplicationRoot().resetGlobalCursor();
      }
    }
  },





  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    if (this.__resizeFrame != null && !qx.core.ObjectRegistry.inShutDown)
    {
      this.__resizeFrame.destroy();
      this.__resizeFrame = null;
    }

    this.__dragDropHandler = null;
  }
});
