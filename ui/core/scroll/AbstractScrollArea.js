/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's left-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)
     * Fabian Jakobs (fjakobs)

************************************************************************ */

// @ITG:Wisej: Added support for "hidden" scrollbar X and Y.

/**
 * The ScrollArea provides a container widget with on demand scroll bars
 * if the content size exceeds the size of the container.
 *
 * @childControl pane {qx.ui.core.scroll.ScrollPane} pane which holds the content to scroll
 * @childControl scrollbar-x {qx.ui.core.scroll.ScrollBar?qx.ui.core.scroll.NativeScrollBar} horizontal scrollbar
 * @childControl scrollbar-y {qx.ui.core.scroll.ScrollBar?qx.ui.core.scroll.NativeScrollBar} vertical scrollbar
 * @childControl corner {qx.ui.core.Widget} corner where no scrollbar is shown
 */
qx.Class.define("qx.ui.core.scroll.AbstractScrollArea",
{
  extend : qx.ui.core.Widget,
  include : [
    qx.ui.core.scroll.MScrollBarFactory,
    qx.ui.core.scroll.MRoll,
    qx.ui.core.MDragDropScrolling
  ],
  type : "abstract",


  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /**
     * The default width which is used for the width of the scroll bar if
     * overlaid.
     */
    DEFAULT_SCROLLBAR_WIDTH : 14
  },



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    this.base(arguments);

    if (qx.core.Environment.get("os.scrollBarOverlayed")) {

      // use a plain canvas to overlay the scroll bars
      this._setLayout(new qx.ui.layout.Canvas());

    } else {

      // Create 'fixed' grid layout
      var grid = new qx.ui.layout.Grid();
      grid.setColumnFlex(0, 1);
      grid.setRowFlex(0, 1);
      this._setLayout(grid);
    }

    // @ITG:Wisej: RightToLeft support.
    this.addListener("changeRtl", this._onRtlChange, this);
	// @ITG:Wisej: Custom scrollArea layout.
    this._updateScrollAreaLayout();

    // Roll listener for scrolling
    this._addRollHandling();
  },


  events : {
    /** Fired as soon as the scroll animation in X direction ends. */
    scrollAnimationXEnd: 'qx.event.type.Event',

    /** Fired as soon as the scroll animation in Y direction ends. */
    scrollAnimationYEnd: 'qx.event.type.Event'
  },



  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    // overridden
    appearance :
    {
      refine : true,
      init : "scrollarea"
    },


    // overridden
    width :
    {
      refine : true,
      init : 100
    },


    // overridden
    height :
    {
      refine : true,
      init : 200
    },


    /**
     * The policy, when the horizontal scrollbar should be shown.
     * <ul>
     *   <li><b>auto</b>: Show scrollbar on demand</li>
     *   <li><b>on</b>: Always show the scrollbar</li>
     *   <li><b>off</b>: Never show the scrollbar</li>
     *   <li><b>hide</b>: Hide the scrollbar.</li>
     * </ul>
     */
    scrollbarX :
    {
      check : ["auto", "on", "off", "hide"],
      init : "auto",
      themeable : true,
      apply : "_computeScrollbars"
    },


    /**
     * The policy, when the horizontal scrollbar should be shown.
     * <ul>
     *   <li><b>auto</b>: Show scrollbar on demand</li>
     *   <li><b>on</b>: Always show the scrollbar</li>
     *   <li><b>off</b>: Never show the scrollbar</li>
     * </ul>
     */
    scrollbarY :
    {
      check: ["auto", "on", "off", "hide"],
      init : "auto",
      themeable : true,
      apply : "_computeScrollbars"
    },


    /**
     * Group property, to set the overflow of both scroll bars.
     */
    scrollbar : {
      group : [ "scrollbarX", "scrollbarY" ]
    }
  },






  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /*
    ---------------------------------------------------------------------------
      CHILD CONTROL SUPPORT
    ---------------------------------------------------------------------------
    */

    // @ITG:Wisej: RightToLeft support. 
    // Listens to "changeRtl" to move the vertical scrollbar to the left side.
    _onRtlChange: function (e) {

      if (e.getData() === e.getOldData())
        return;

      var rtl = e.getData();
      if (rtl) {
        // when in rtl mode we need to ensure that the X scrollbar is created even if invisible.
        var value = this.getScrollbarX();
        this.setScrollbarX("auto");
        this.setScrollbarX(value);
        // and reverse the scroll position.
        var scrollX = this.getChildControl("scrollbar-x");
        scrollX.setPosition(scrollX.getMaximum() - scrollX.getPosition());
      }
      else if (e.getOldData() == true) {
        // when restoring ltr mode, restore also the scrollbar position.
        var scrollX = this.getChildControl("scrollbar-x");
        // and reverse the scroll position.
        scrollX.setPosition(scrollX.getMaximum() - scrollX.getPosition());
      }

      this._updateScrollAreaLayout();
    },

    // @ITG:Wisej: Custom scrollArea layout.

    // overridden.
    _onChangeTheme: function () {

      // the theme may have changed the os.scrollBarOverlayed setting.
      var overlayed = qx.core.Environment.get("os.scrollBarOverlayed");
      if (overlayed !== (this._getLayout() instanceof qx.ui.layout.Canvas)) {

        this._getLayout().dispose();

        if (overlayed) {

          // use a plain canvas to overlay the scroll bars
          this._setLayout(new qx.ui.layout.Canvas());

        } else {

          // Create 'fixed' grid layout
          var grid = new qx.ui.layout.Grid();
          grid.setColumnFlex(0, 1);
          grid.setRowFlex(0, 1);
          this._setLayout(grid);
        }
      }

      this.base(arguments);
      this._updateScrollAreaLayout();
    },

    /**
     * Updates the internal layout of the scroll components: pane, corner, scrollX, and scrollY.
     * This function can be overridden to change the layout of scrollable widgets in case
     * the implementation needs to add more child controls.
     *
     * @param paneCell {Map?} A {row, column} map that defines the location of the content pane.
     * The function deducts the cell of the scrollbars and corner from the pane's cell and the
     * value of the rtl property.
     *
     * @param controls {Map?} A {pane, scrollX, scrollY, corner} map that optionally
     * passes the controls to the function. Used from createChildControlImpl since the child control
     * is not retrievable while in that method. 
     */
    _updateScrollAreaLayout : function(paneCell, controls) {

        var rtl = this.getRtl();

        // the default layout.
        paneCell = paneCell || { row: 0, column: 0 };
		
        controls = controls || {};
        var pane = controls.pane || this.getChildControl("pane", true);
        var scrollY = controls.scrollY || this.getChildControl("scrollbar-y", true);
        var scrollX = controls.scrollX || this.getChildControl("scrollbar-x", true);

        var overlayed = qx.core.Environment.get("os.scrollBarOverlayed");

        if (overlayed) {
            if (pane)
                pane.setLayoutProperties({ edge: 0 });

            if (rtl) {
                if (scrollY)
                    scrollY.setLayoutProperties({ left: 0, bottom: 0, top: 0 });
                if (scrollX)
                    scrollX.setLayoutProperties({ bottom: 0, right: 0, left: 0 });
            }
            else {
                if (scrollY)
                    scrollY.setLayoutProperties({ right: 0, bottom: 0, top: 0 });
                if (scrollX)
                    scrollX.setLayoutProperties({ bottom: 0, right: 0, left: 0 });
            }
        }
        else {

            var layout = this._getLayout();
            var corner = controls.corner || this.getChildControl("corner", true);

            if (rtl) {

                var rtlscrollYCell = { row: paneCell.row, column: paneCell.column };
                var rtlscrollXCell = { row: paneCell.row + 1, column: paneCell.column + 1 };
                var rtlcornerCell = { row: paneCell.row + 1, column: paneCell.column };
                var rtlPaneCell = { row: paneCell.row, column: paneCell.column + 1 };

                layout.setRowFlex(rtlPaneCell.row, 1);
                layout.setRowFlex(rtlPaneCell.row + 1, 0);
                layout.setColumnFlex(rtlPaneCell.column, 1);
                layout.setColumnFlex(rtlPaneCell.column - 1, 0);

                if (pane)
                    pane.setLayoutProperties(rtlPaneCell);
                if (scrollY)
                    scrollY.setLayoutProperties(rtlscrollYCell);
                if (scrollX)
                    scrollX.setLayoutProperties(rtlscrollXCell);
                if (corner)
                    corner.setLayoutProperties(rtlcornerCell);
            }
            else {
                layout.setRowFlex(paneCell.row, 1);
                layout.setRowFlex(paneCell.row + 1, 0);
                layout.setColumnFlex(paneCell.column, 1);
                layout.setColumnFlex(paneCell.column + 1, 0);


                var scrollYCell = { row: paneCell.row, column: paneCell.column + 1 };
                var scrollXCell = { row: paneCell.row + 1, column: paneCell.column };
                var cornerCell = { row: paneCell.row + 1, column: paneCell.column + 1 };

                if (pane)
                    pane.setLayoutProperties(paneCell);
                if (scrollY)
                    scrollY.setLayoutProperties(scrollYCell);
                if (scrollX)
                    scrollX.setLayoutProperties(scrollXCell);
                if (corner)
                    corner.setLayoutProperties(cornerCell);
            }
        }

    },

    // overridden
    _createChildControlImpl : function(id, hash)
    {
      var control;

      switch(id)
      {
        case "pane":
          control = new qx.ui.core.scroll.ScrollPane();

          control.addListener("update", this._computeScrollbars, this);
          control.addListener("scrollX", this._onScrollPaneX, this);
          control.addListener("scrollY", this._onScrollPaneY, this);

          this._add(control);
          this._updateScrollAreaLayout({ row: 0, column: 0 }, { pane: control });
          break;


        case "scrollbar-x":
          control = this._createScrollBar("horizontal");
          control.setMinWidth(0);

          control.exclude();
          control.addListener("scroll", this._onScrollBarX, this);
          control.addListener("changeVisibility", this._onChangeScrollbarXVisibility, this);
          control.addListener("scrollAnimationEnd", this._onScrollAnimationEnd.bind(this, "X"));

          if (qx.core.Environment.get("os.scrollBarOverlayed"))
            control.setMinHeight(qx.ui.core.scroll.AbstractScrollArea.DEFAULT_SCROLLBAR_WIDTH);
          this._add(control);
          this._updateScrollAreaLayout({ row: 0, column: 0 }, { scrollX: control });
          break;


        case "scrollbar-y":
          control = this._createScrollBar("vertical");
          control.setMinHeight(0);

          control.exclude();
          control.addListener("scroll", this._onScrollBarY, this);
          control.addListener("changeVisibility", this._onChangeScrollbarYVisibility, this);
          control.addListener("scrollAnimationEnd", this._onScrollAnimationEnd.bind(this, "Y"));

          if (qx.core.Environment.get("os.scrollBarOverlayed"))
            control.setMinWidth(qx.ui.core.scroll.AbstractScrollArea.DEFAULT_SCROLLBAR_WIDTH);
          this._add(control);
          this._updateScrollAreaLayout({ row: 0, column: 0 }, { scrollY: control });
          break;


        case "corner":
          control = new qx.ui.core.Widget();
          control.setWidth(0);
          control.setHeight(0);
          control.exclude();

          if (!qx.core.Environment.get("os.scrollBarOverlayed")) {
            // only add for non overlayed scroll bars
            this._add(control);
            this._updateScrollAreaLayout({ row: 0, column: 0 }, { corner: control });
          }
          break;
      }

      return control || this.base(arguments, id);
    },




    /*
    ---------------------------------------------------------------------------
      PANE SIZE
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the boundaries of the pane.
     *
     * @return {Map} The pane boundaries.
     */
    getPaneSize : function() {
      return this.getChildControl("pane").getInnerSize();
    },






    /*
    ---------------------------------------------------------------------------
      ITEM LOCATION SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the top offset of the given item in relation to the
     * inner height of this widget.
     *
     * @param item {qx.ui.core.Widget} Item to query
     * @return {Integer} Top offset
     */
    getItemTop : function(item) {
      return this.getChildControl("pane").getItemTop(item);
    },


    /**
     * Returns the top offset of the end of the given item in relation to the
     * inner height of this widget.
     *
     * @param item {qx.ui.core.Widget} Item to query
     * @return {Integer} Top offset
     */
    getItemBottom : function(item) {
      return this.getChildControl("pane").getItemBottom(item);
    },


    /**
     * Returns the left offset of the given item in relation to the
     * inner width of this widget.
     *
     * @param item {qx.ui.core.Widget} Item to query
     * @return {Integer} Top offset
     */
    getItemLeft : function(item) {
      return this.getChildControl("pane").getItemLeft(item);
    },


    /**
     * Returns the left offset of the end of the given item in relation to the
     * inner width of this widget.
     *
     * @param item {qx.ui.core.Widget} Item to query
     * @return {Integer} Right offset
     */
    getItemRight : function(item) {
      return this.getChildControl("pane").getItemRight(item);
    },





    /*
    ---------------------------------------------------------------------------
      SCROLL SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Scrolls the element's content to the given left coordinate
     *
     * @param value {Integer} The vertical position to scroll to.
     * @param duration {Number?} The time in milliseconds the scroll to should take.
     */
    scrollToX : function(value, duration) {
      // First flush queue before scroll
      qx.ui.core.queue.Manager.flush();

      this.getChildControl("scrollbar-x").scrollTo(value, duration);
    },


    /**
     * Scrolls the element's content by the given left offset
     *
     * @param value {Integer} The vertical position to scroll to.
     * @param duration {Number?} The time in milliseconds the scroll to should take.
     */
    scrollByX : function(value, duration) {
      // First flush queue before scroll
      qx.ui.core.queue.Manager.flush();

      this.getChildControl("scrollbar-x").scrollBy(value, duration);
    },


    /**
     * Returns the scroll left position of the content
     *
     * @return {Integer} Horizontal scroll position
     */
    getScrollX : function()
    {
      var scrollbar = this.getChildControl("scrollbar-x", true);
      return scrollbar ? scrollbar.getPosition() : 0;
    },


    /**
     * Scrolls the element's content to the given top coordinate
     *
     * @param value {Integer} The horizontal position to scroll to.
     * @param duration {Number?} The time in milliseconds the scroll to should take.
     */
    scrollToY : function(value, duration) {
      // First flush queue before scroll
      qx.ui.core.queue.Manager.flush();

      this.getChildControl("scrollbar-y").scrollTo(value, duration);
    },


    /**
     * Scrolls the element's content by the given top offset
     *
     * @param value {Integer} The horizontal position to scroll to.
     * @param duration {Number?} The time in milliseconds the scroll to should take.
     */
    scrollByY : function(value, duration) {
      // First flush queue before scroll
      qx.ui.core.queue.Manager.flush();

      this.getChildControl("scrollbar-y").scrollBy(value, duration);
    },


    /**
     * Returns the scroll top position of the content
     *
     * @return {Integer} Vertical scroll position
     */
    getScrollY : function()
    {
      var scrollbar = this.getChildControl("scrollbar-y", true);
      return scrollbar ? scrollbar.getPosition() : 0;
    },


    /**
     * In case a scroll animation is currently running in X direction,
     * it will be stopped. If not, the method does nothing.
     */
    stopScrollAnimationX : function() {
      var scrollbar = this.getChildControl("scrollbar-x", true);
      if (scrollbar) {
        scrollbar.stopScrollAnimation();
      }
    },


    /**
     * In case a scroll animation is currently running in X direction,
     * it will be stopped. If not, the method does nothing.
     */
    stopScrollAnimationY : function() {
      var scrollbar = this.getChildControl("scrollbar-y", true);
      if (scrollbar) {
        scrollbar.stopScrollAnimation();
      }
    },



    /*
    ---------------------------------------------------------------------------
      EVENT LISTENERS
    ---------------------------------------------------------------------------
    */
    /**
     * Event handler for the scroll animation end event for both scroll bars.
     *
     * @param direction {String} Either "X" or "Y".
     */
    _onScrollAnimationEnd : function(direction) {
      this.fireEvent("scrollAnimation" + direction + "End");
    },

    /**
     * Event handler for the scroll event of the horizontal scrollbar
     *
     * @param e {qx.event.type.Data} The scroll event object
     */
    _onScrollBarX : function(e) {
      this.getChildControl("pane").scrollToX(e.getData());
    },


    /**
     * Event handler for the scroll event of the vertical scrollbar
     *
     * @param e {qx.event.type.Data} The scroll event object
     */
    _onScrollBarY : function(e) {
      this.getChildControl("pane").scrollToY(e.getData());
    },


    /**
     * Event handler for the horizontal scroll event of the pane
     *
     * @param e {qx.event.type.Data} The scroll event object
     */
    _onScrollPaneX : function(e) {
      var scrollbar = this.getChildControl("scrollbar-x");
      if (scrollbar) {
        scrollbar.updatePosition(e.getData());
      }
    },


    /**
     * Event handler for the vertical scroll event of the pane
     *
     * @param e {qx.event.type.Data} The scroll event object
     */
    _onScrollPaneY : function(e) {
      var scrollbar = this.getChildControl("scrollbar-y");
      if (scrollbar) {
        scrollbar.updatePosition(e.getData());
      }
    },


    /**
     * Event handler for visibility changes of horizontal scrollbar.
     *
     * @param e {qx.event.type.Event} Property change event
     */
    _onChangeScrollbarXVisibility : function(e)
    {
      var showX = this._isChildControlVisible("scrollbar-x");
      var showY = this._isChildControlVisible("scrollbar-y");

      if (!showX) {
        this.scrollToX(0);
      }

      showX && showY ? this._showChildControl("corner") : this._excludeChildControl("corner");
    },


    /**
     * Event handler for visibility changes of horizontal scrollbar.
     *
     * @param e {qx.event.type.Event} Property change event
     */
    _onChangeScrollbarYVisibility : function(e)
    {
      var showX = this._isChildControlVisible("scrollbar-x");
      var showY = this._isChildControlVisible("scrollbar-y");

      if (!showY) {
        this.scrollToY(0);
      }

      showX && showY ? this._showChildControl("corner") : this._excludeChildControl("corner");
    },




    /*
    ---------------------------------------------------------------------------
      HELPER METHODS
    ---------------------------------------------------------------------------
    */

    /**
     * Computes the visibility state for scrollbars.
     *
     */
    _computeScrollbars : function()
    {
      var pane = this.getChildControl("pane");
      var content = pane.getChildren()[0];
      if (!content)
      {
        this._excludeChildControl("scrollbar-x");
        this._excludeChildControl("scrollbar-y");
        return;
      }

      // @ITG:Wisej: Use the inner pane size for the inner and outer areas
      // to take into account cases when the pane size doesn't fill this
      // widget because the default layout has been changed.
      var paneSize = pane.getInnerSize();
      var innerSize = this.getInnerSize();
      var scrollSize = pane.getScrollSize();

      // if the widget has not yet been rendered, return and try again in the
      // resize event
      if (!paneSize || !scrollSize || !innerSize) {
        return;
      }

      // @ITG:Wisej: Skip panes with size 0,0 or we end up in an infinite loop.
      if (paneSize.width == 0 || paneSize.height == 0) {
        if (paneSize.width == 0) {
          this._excludeChildControl("scrollbar-x");
        }
        if (paneSize.height == 0) {
          this._excludeChildControl("scrollbar-y");
        }
        return;
      }

      var scrollbarX = this.getScrollbarX();
      var scrollbarY = this.getScrollbarY();

     if ((scrollbarX === "auto" || scrollbarX === "hide") && (scrollbarY === "auto" || scrollbarY === "hide"))
      {
        // Check if the container is big enough to show
        // the full content.
        var showX = scrollSize.width > innerSize.width;
        var showY = scrollSize.height > innerSize.height;

        // Dependency check
        // We need a special intelligence here when only one
        // of the autosized axis requires a scrollbar
        // This scrollbar may then influence the need
        // for the other one as well.
        if ((showX || showY) && !(showX && showY))
        {
          if (showX) {
            showY = scrollSize.height > paneSize.height;
          } else if (showY) {
            showX = scrollSize.width > paneSize.width;
          }
        }
      }
      else
      {
        var showX = scrollbarX === "on";
        var showY = scrollbarY === "on";

        // Check auto values afterwards with already
        // corrected client dimensions
        if (scrollSize.width > (showX ? paneSize.width : innerSize.width) && (scrollbarX === "auto" || scrollbarX === "hide")) {
          showX = true;
        }

        if (scrollSize.height > (showX ? paneSize.height : innerSize.height) && (scrollbarY === "auto" || scrollbarY === "hide")) {
          showY = true;
        }
      }

      // Update scrollbars
      if (showX)
      {
        var barX = this.getChildControl("scrollbar-x");

        barX.show();
        scrollbarX === "hide" ? barX.setMaxHeight(0) : barX.resetMaxHeight();
        barX.setMaximum(Math.max(0, scrollSize.width - paneSize.width));
        barX.setKnobFactor((scrollSize.width === 0) ? 0 : paneSize.width / scrollSize.width);
      }
      else
      {
        this._excludeChildControl("scrollbar-x");
      }

      if (showY)
      {
        var barY = this.getChildControl("scrollbar-y");

        barY.show();
        scrollbarY === "hide" ? barY.setMaxWidth(0) : barY.resetMaxWidth();
        barY.setMaximum(Math.max(0, scrollSize.height - paneSize.height));
        barY.setKnobFactor((scrollSize.height === 0) ? 0 : paneSize.height / scrollSize.height);
      }
      else
      {
        this._excludeChildControl("scrollbar-y");
      }
    }
  }
});
