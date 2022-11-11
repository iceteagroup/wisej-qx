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
 * Provides move behavior to any widget.
 *
 * The widget using the mixin must register a widget as move handle so that
 * the pointer events needed for moving it are attached to this widget).
 * <pre class='javascript'>this._activateMoveHandle(widget);</pre>
 */
qx.Mixin.define("qx.ui.core.MMovable",
{
  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** Whether the widget is movable */
    movable :
    {
      check : "Boolean",
      init : true
    },

    /** Whether to use a frame instead of the original widget during move sequences */
    useMoveFrame :
    {
      check : "Boolean",
      init : false
    },

    // @ITG:Wisej: Added support for keeping the movable widget wholly in the view area.
    keepInBounds :
    {
      check : "Boolean",
      init : false
    }
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __moveHandle : null,
    __moveFrame : null,
    __dragRange : null,
    __dragLeft : null,
    __dragTop : null,
    __parentLeft : null,
    __parentTop : null,

    __blockerAdded : false,
    __oldBlockerColor : null,
    __oldBlockerOpacity : 0,

    /*
    ---------------------------------------------------------------------------
      CORE FEATURES
    ---------------------------------------------------------------------------
    */

    /**
     * Configures the given widget as a move handle
     *
     * @param widget {qx.ui.core.Widget} Widget to activate as move handle
     */
    _activateMoveHandle : function(widget)
    {
      if (this.__moveHandle) {
        // @ITG:Wisej: Let widgets change the move handle target to allow composite widgets to become movable.
        // throw new Error("The move handle could not be redefined!");
        if (this.__moveHandle == widget)
          return;

        this._releaseMoveHandle();
      }

      this.__moveHandle = widget;
      widget.addListener("pointerdown", this._onMovePointerDown, this);
      widget.addListener("pointerup", this._onMovePointerUp, this);
      widget.addListener("pointermove", this._onMovePointerMove, this);
      widget.addListener("losecapture", this.__onMoveLoseCapture, this);
    },

    // @ITG:Wisej: Let widgets change the move handle target to allow composite widgets to become movable.
    /**
     * Detaches the current move handle.
     */
    _releaseMoveHandle: function()
    {
      if (this.__moveHandle) {
        var widget = this.__moveHandle;
        widget.removeListener("pointerdown", this._onMovePointerDown, this);
        widget.removeListener("pointerup", this._onMovePointerUp, this);
        widget.removeListener("pointermove", this._onMovePointerMove, this);
        widget.removeListener("losecapture", this.__onMoveLoseCapture, this);
        this.__moveHandle = null;
      }
    },

    /**
     * Get the widget, which draws the resize/move frame.
     *
     * @return {qx.ui.core.Widget} The resize frame
     */
    __getMoveFrame : function()
    {
      var frame = this.__moveFrame;
      if (!frame)
      {
        frame = this.__moveFrame = new qx.ui.core.Widget();
        frame.setAppearance("move-frame");
        frame.exclude();

        qx.core.Init.getApplication().getRoot().add(frame);
      }

      return frame;
    },


    /**
     * Creates, shows and syncs the frame with the widget.
     */
    __showMoveFrame : function()
    {
      var location = this.getContentLocation();
      var bounds = this.getBounds();
      var frame = this.__getMoveFrame();
      frame.setUserBounds(location.left, location.top, bounds.width, bounds.height);
      frame.show();
      frame.setZIndex(this.getZIndex()+1);
    },




    /*
    ---------------------------------------------------------------------------
      MOVE SUPPORT
    ---------------------------------------------------------------------------
    */

    // @ITG:Wisej: Add option to use a custom drag range. Useful when using the move frame.
    /**
     * @param top {Integer} Top range limit in pixels.
     * @param left {Integer} Left range in pixels.
     * @param right {Integer} Right range limit in pixels.
     * @param bottom {Integer} Left range limit in pixels.
     */
     setDragRange: function (top, left, right, bottom) {

       if (left == undefined) {
         this.__dragRange = null;
       }
       else {
           this.__dragRange = {
           left: left,
           top: top,
           right: right,
           bottom: bottom
         };
       }
    },

    /**
     * Computes the new drag coordinates
     *
     * @param e {qx.event.type.Pointer} Pointer event
     * @return {Map} A map with the computed drag coordinates
     */
    __computeMoveCoordinates : function(e)
    {
      var range = this.__dragRange;
      var pointerLeft = Math.max(range.left, Math.min(range.right, e.getDocumentLeft()));
      var pointerTop = Math.max(range.top, Math.min(range.bottom, e.getDocumentTop()));

      var viewportLeft = this.__dragLeft + pointerLeft;
      var viewportTop = this.__dragTop + pointerTop;

      // @ITG:Wisej: Adjust the element's coordinates to the possible element's CSS rotation.
      var adjustTop = 0;
      var adjustLeft = 0;
      var domEl = this.getContentElement().getDomElement();
      if (domEl) {
      	var clientRect = domEl.getBoundingClientRect();
      	var parentRect = domEl.parentNode.getBoundingClientRect();
      	adjustTop = parseInt(domEl.style.top) - clientRect.top + parentRect.top;
      	adjustLeft = parseInt(domEl.style.left) - clientRect.left + parentRect.left;
      }

      // @ITG:Wisej: Added support for keeping the movable widget wholly in the view area.
      if (this.isKeepInBounds()) {
        var parentLeft = parseInt(viewportLeft - this.__parentLeft, 10) + adjustLeft;
        var parentTop = parseInt(viewportTop - this.__parentTop, 10) + adjustTop;

        var windowBounds = this.getBounds();
        var containerBounds = this.getLayoutParent().getBounds();

        if (parentLeft < 0)
            parentLeft = 0;
        else if (parentLeft + windowBounds.width > containerBounds.width)
            parentLeft = parentLeft - (parentLeft + windowBounds.width - containerBounds.width);

        if (parentTop < 0)
            parentTop = 0;
        else if (parentTop + windowBounds.height > containerBounds.height)
            parentTop = parentTop - (parentTop + windowBounds.height - containerBounds.height);

        return {
            viewportLeft: parseInt(viewportLeft, 10),
            viewportTop: parseInt(viewportTop, 10),
            parentLeft: parentLeft,
            parentTop: parentTop
        };
      }

     return {
        viewportLeft : parseInt(viewportLeft, 10),
        viewportTop : parseInt(viewportTop, 10),

        parentLeft : parseInt(viewportLeft - this.__parentLeft, 10) + adjustLeft,
        parentTop : parseInt(viewportTop - this.__parentTop, 10) + adjustTop
     };
    },


    /*
    ---------------------------------------------------------------------------
      MOVE EVENT HANDLERS
    ---------------------------------------------------------------------------
    */

    /**
     * Roll handler which prevents the scrolling via tap & move on parent widgets
     * during the move of the widget.
     * @param e {qx.event.type.Roll} The roll event
     */
    _onMoveRoll : function(e) {
      e.stop();
    },


    /**
     * Enables the capturing of the caption bar and prepares the drag session and the
     * appearance (translucent, frame or opaque) for the moving of the window.
     *
     * @param e {qx.event.type.Pointer} pointer down event
     */
    _onMovePointerDown : function(e)
    {
      if (!this.getMovable() || this.hasState("maximized")) {
        return;
      }

      this.addListener("roll", this._onMoveRoll, this);

      // Compute drag range
      var parent = this.getLayoutParent();
      var parentLocation = parent.getContentLocation();
      var parentBounds = parent.getBounds();

      // Added a blocker, this solves the issue described in [BUG #1462]
      if (qx.Class.implementsInterface(parent, qx.ui.window.IDesktop)) {
        if (!parent.isBlocked()) {
          this.__oldBlockerColor = parent.getBlockerColor();
          this.__oldBlockerOpacity = parent.getBlockerOpacity();
          parent.setBlockerColor(null);
          parent.setBlockerOpacity(1);

          parent.blockContent(this.getZIndex() - 1);

          this.__blockerAdded = true;
        }
      }

      // @ITG:Wisej: Add option to use a custom drag range. Useful when using the move frame.
      this.__dragRange = this.__dragRange ||
      {
        left : parentLocation.left,
        top : parentLocation.top,
        right : parentLocation.left + parentBounds.width,
        bottom : parentLocation.top + parentBounds.height
      };

      // Compute drag positions
      var widgetLocation = this.getContentLocation();
      this.__parentLeft = parentLocation.left;
      this.__parentTop = parentLocation.top;

      this.__dragLeft = widgetLocation.left - e.getDocumentLeft();
      this.__dragTop = widgetLocation.top - e.getDocumentTop();

      // Add state
      this.addState("move");

      // Enable capturing
      this.__moveHandle.capture();

      // @ITG:Wisej: Notify that this widget is being dragged.
      this.fireEvent("startmove");

      // Enable drag frame
      if (this.getUseMoveFrame()) {
        this.__showMoveFrame();
      }

      // Stop event
      e.stopPropagation();
    },


    /**
     * Does the moving of the window by rendering the position
     * of the window (or frame) at runtime using direct dom methods.
     *
     * @param e {qx.event.type.Pointer} pointer move event
     */
    _onMovePointerMove : function(e)
    {
      // Only react when dragging is active
      if (!this.hasState("move")) {
        return;
      }

      // Apply new coordinates using DOM
      var coords = this.__computeMoveCoordinates(e);
      if (this.getUseMoveFrame()) {
        this.__getMoveFrame().setDomPosition(coords.viewportLeft, coords.viewportTop);
      } else {
        // @ITG:Wisej: Deducting insets causes a jump when moving inside a parent.
        // this.setDomPosition(coords.parentLeft - (insets.left || 0),
        //  coords.parentTop - (insets.top || 0));
        this.setDomPosition(coords.parentLeft, coords.parentTop);
      }

      e.stopPropagation();
    },


    /**
     * Disables the capturing of the caption bar and moves the window
     * to the last position of the drag session. Also restores the appearance
     * of the window.
     *
     * @param e {qx.event.type.Pointer} pointer up event
     */
    _onMovePointerUp : function(e)
    {
      // @ITG:Wisej: Incorrect check for the listener, it always returns false preventing
      // the removal of _onMoveRoll, which disables all actions that require a mouse drag: i.e. selecting the
      // text in a textbox.
      // if (this.hasListener("roll", this._onMoveRoll, this)) {
      if (this.hasListener("roll")) {
        this.removeListener("roll", this._onMoveRoll, this);
      }

      // Only react when dragging is active
      if (!this.hasState("move")) {
        return;
      }

      // Remove drag state
      this.removeState("move");

      // Removed blocker, this solves the issue described in [BUG #1462]
      var parent = this.getLayoutParent();
      if (qx.Class.implementsInterface(parent, qx.ui.window.IDesktop)) {
        if (this.__blockerAdded) {
          parent.unblock();

          parent.setBlockerColor(this.__oldBlockerColor);
          parent.setBlockerOpacity(this.__oldBlockerOpacity);
          this.__oldBlockerColor = null;
          this.__oldBlockerOpacity = 0;

          this.__blockerAdded = false;
        }
      }

      // Disable capturing
      this.__moveHandle.releaseCapture();

      // Apply them to the layout
      var coords = this.__computeMoveCoordinates(e);
      this.setLayoutProperties({
        // @ITG:Wisej: Deducting insets causes a jump when moving inside a parent.
        //left: coords.parentLeft - (insets.left || 0),
        //top: coords.parentTop - (insets.top || 0)
        left: coords.parentLeft,
        top: coords.parentTop
      });

      // @ITG:Wisej: MMovable doesn't work for widgets with user bounds.
      if (this.hasUserBounds()) {
        var bounds = this.getBounds();
        this.setUserBounds(
            // @ITG:Wisej: Deducting insets causes a jump when moving inside a parent.
            //coords.parentLeft - (insets.left || 0),
            //coords.parentTop - (insets.top || 0),
            coords.parentLeft,
            coords.parentTop,
            bounds.width,
            bounds.height);
      }

      // Hide frame afterwards
      if (this.getUseMoveFrame()) {
        this.__getMoveFrame().exclude();
      }

      e.stopPropagation();

      // @ITG:Wisej: Notify that this widget is done being dragged.
      this.fireEvent("endmove");

      // @ITG:Wisej: Add option to use a custom drag range. Useful when using the move frame.
      this.__dragRange = null;
    },


    /**
     * Event listener for <code>losecapture</code> event.
     *
     * @param e {qx.event.type.Event} Lose capture event
     */
    __onMoveLoseCapture : function(e)
    {
      // Check for active move
      if (!this.hasState("move")) {
        return;
      }

      // Remove drag state
      this.removeState("move");

      // Hide frame afterwards
      if (this.getUseMoveFrame()) {
        this.__getMoveFrame().exclude();
      }

      // @ITG:Wisej: Notify that this widget is done being dragged.
      this.fireEvent("endmove");

      // @ITG:Wisej: Add option to use a custom drag range. Useful when using the move frame.
      this.__dragRange = null;
    }
  },





  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function() {
    this._disposeObjects("__moveFrame", "__moveHandle");
    this.__dragRange = null;
  }
});
