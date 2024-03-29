/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2006 STZ-IDA, Germany, http://www.stz-ida.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Til Schneider (til132)
     * Jonathan Weiß (jonathan_rass)

************************************************************************ */

/**
 * Shows a whole meta column. This includes a {@link Header},
 * a {@link Pane} and the needed scroll bars. This class handles the
 * virtual scrolling and does all the pointer event handling.
 *
 * @childControl header {qx.ui.table.pane.Header} header pane
 * @childControl pane {qx.ui.table.pane.Pane} table pane to show the data
 * @childControl focus-indicator {qx.ui.table.pane.FocusIndicator} shows the current focused cell
 * @childControl resize-line {qx.ui.core.Widget} resize line widget
 * @childControl scrollbar-x {qx.ui.core.scroll.ScrollBar?qx.ui.core.scroll.NativeScrollBar}
 *               horizontal scrollbar widget (depends on the "qx.nativeScrollBars" setting which implementation is used)
 * @childControl scrollbar-y {qx.ui.core.scroll.ScrollBar?qx.ui.core.scroll.NativeScrollBar}
 *               vertical scrollbar widget (depends on the "qx.nativeScrollBars" setting which implementation is used)
 */
qx.Class.define("qx.ui.table.pane.Scroller",
{
  extend : qx.ui.core.Widget,
  include : [qx.ui.core.scroll.MScrollBarFactory],



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param table {qx.ui.table.Table} the table the scroller belongs to.
   */
  construct : function(table)
  {
    this.base(arguments);

    this.__table = table;

    // init layout
    var grid = new qx.ui.layout.Grid();
    grid.setColumnFlex(0, 1);
    grid.setRowFlex(1, 1);
    this._setLayout(grid);

    // init child controls
    this.__header = this._showChildControl("header");
    this.__tablePane = this._showChildControl("pane");

    // the top line containing the header clipper and the top right widget
    //this.__top = new qx.ui.container.Composite(new qx.ui.layout.HBox()).set({
    //  minWidth: 0
    //});
    //this._add(this.__top, {row: 0, column: 0, colSpan: 2});

    // @ITG:Wisej: Add as a child control to be able to style it.
    this.__top = this._createChildControl("header-container");

    // embed header into a scrollable container
    this._headerClipper = this._createHeaderClipper();
    this._headerClipper.add(this.__header);
    this._headerClipper.addListener("losecapture", this._onChangeCaptureHeader, this);
    this._headerClipper.addListener("pointermove", this._onPointermoveHeader, this);
    this._headerClipper.addListener("pointerdown", this._onPointerdownHeader, this);
    this._headerClipper.addListener("pointerup", this._onPointerupHeader, this);
    this._headerClipper.addListener("tap", this._onTapHeader, this);
    this.__top.add(this._headerClipper, {flex: 1});

    // embed pane into a scrollable container
    this._paneClipper = this._createPaneClipper();
    this._paneClipper.add(this.__tablePane);
    this._paneClipper.addListener("pointermove", this._onPointermovePane, this);
    this._paneClipper.addListener("pointerdown", this._onPointerdownPane, this);
    this._paneClipper.addListener("tap", this._onTapPane, this);
    this._paneClipper.addListener("contextmenu", this._onTapPane, this);
    this._paneClipper.addListener("contextmenu", this._onContextMenu, this);
    if (qx.core.Environment.get("device.type") === "desktop") {
      this._paneClipper.addListener("dblclick", this._onDbltapPane, this);
    } else {
      this._paneClipper.addListener("dbltap", this._onDbltapPane, this);
    }
    this._paneClipper.addListener("resize", this._onResizePane, this);

    // if we have overlayed scroll bars, we should use a separate container
    if (qx.core.Environment.get("os.scrollBarOverlayed")) {
      this.__clipperContainer = new qx.ui.container.Composite();
      this.__clipperContainer.setLayout(new qx.ui.layout.Canvas());
      this.__clipperContainer.add(this._paneClipper, {edge: 0});
      this._add(this.__clipperContainer, {row: 1, column: 0});
    } else {
      this._add(this._paneClipper, {row: 1, column: 0});
    }

    // init scroll bars
    this.__horScrollBar = this.getChildControl("scrollbar-x");
    this.__verScrollBar = this.getChildControl("scrollbar-y");

    // init focus indicator
    this.__focusIndicator = this.getChildControl("focus-indicator");

    // need to run the apply method at least once [BUG #4057]
    // @ITG:Wisej: Should preserve the focus indicator visibility set in table.
    this.setShowCellFocusIndicator(table.getShowCellFocusIndicator());
    // this.initShowCellFocusIndicator();

    // force creation of the resize line
    this.getChildControl("resize-line").hide();

    this.addListener("pointerout", this._onPointerout, this);

    // @ITG:Wisej: RightToLeft support.
    this.addListener("changeRtl", this._onRtlChange, this);

    // @ITG:Wisej: Handle "roll" events fired on child scrollbars.
    this.addListener("roll", this._onRoll, this);
  },




  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {

    /** @type {int} The minimum width a column could get in pixels. */
    MIN_COLUMN_WIDTH         : 10,

    /** @type {int} The radius of the resize region in pixels. */
    RESIZE_REGION_RADIUS     : 5,


    /**
     * (int) The number of pixels the pointer may move between pointer down and pointer up
     * in order to count as a tap.
     */
    TAP_TOLERANCE          : 5,


    /**
     * (int) The mask for the horizontal scroll bar.
     * May be combined with {@link #VERTICAL_SCROLLBAR}.
     *
     * @see #getNeededScrollBars
     */
    HORIZONTAL_SCROLLBAR     : 1,


    /**
     * (int) The mask for the vertical scroll bar.
     * May be combined with {@link #HORIZONTAL_SCROLLBAR}.
     *
     * @see #getNeededScrollBars
     */
    VERTICAL_SCROLLBAR       : 2
  },




  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /** Dispatched if the pane is scrolled horizontally */
    "changeScrollY" : "qx.event.type.Data",

    /** Dispatched if the pane is scrolled vertically */
    "changeScrollX" : "qx.event.type.Data",

    /**See {@link qx.ui.table.Table#cellTap}.*/
    "cellTap" : "qx.ui.table.pane.CellEvent",

    /*** See {@link qx.ui.table.Table#cellDbltap}.*/
    "cellDbltap" : "qx.ui.table.pane.CellEvent",

    /**See {@link qx.ui.table.Table#cellContextmenu}.*/
    "cellContextmenu" : "qx.ui.table.pane.CellEvent",

    /** Dispatched when a sortable header was tapped */
    "beforeSort" : "qx.event.type.Data"
  },





  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {

    /** Whether to show the horizontal scroll bar */
    horizontalScrollBarVisible :
    {
      check : "Boolean",
      init : false,
      apply : "_applyHorizontalScrollBarVisible",
      event : "changeHorizontalScrollBarVisible"
    },

    /** Whether to show the vertical scroll bar */
    verticalScrollBarVisible :
    {
      check : "Boolean",
      init : false,
      apply : "_applyVerticalScrollBarVisible",
      event : "changeVerticalScrollBarVisible"
    },

    /** The table pane model. */
    tablePaneModel :
    {
      check : "qx.ui.table.pane.Model",
      apply : "_applyTablePaneModel",
      event : "changeTablePaneModel"
    },


    /**
     * Whether column resize should be live. If false, during resize only a line is
     * shown and the real resize happens when the user releases the pointer button.
     */
    liveResize :
    {
      check : "Boolean",
      init : false
    },


    /**
     * Whether the focus should moved when the pointer is moved over a cell. If false
     * the focus is only moved on pointer taps.
     */
    focusCellOnPointerMove :
    {
      check : "Boolean",
      init : false
    },


    /**
     * Whether to handle selections via the selection manager before setting the
     * focus.  The traditional behavior is to handle selections after setting the
     * focus, but setting the focus means redrawing portions of the table, and
     * some subclasses may want to modify the data to be displayed based on the
     * selection.
     */
    selectBeforeFocus :
    {
      check : "Boolean",
      init : false
    },


    /**
     * Whether the cell focus indicator should be shown
     */
    showCellFocusIndicator :
    {
      check : "Boolean",
      init: true,
      apply : "_applyShowCellFocusIndicator"
    },


    /**
     * By default, the "cellContextmenu" event is fired only when a data cell
     * is right-clicked. It is not fired when a right-click occurs in the
     * empty area of the table below the last data row. By turning on this
     * property, "cellContextMenu" events will also be generated when a
     * right-click occurs in that empty area. In such a case, row identifier
     * in the event data will be null, so event handlers can check (row ===
     * null) to handle this case.
     */
    contextMenuFromDataCellsOnly :
    {
      check : "Boolean",
      init : true
    },


    /**
     * Whether to reset the selection when a header cell is tapped. Since
     * most data models do not have provisions to retain a selection after
     * sorting, the default is to reset the selection in this case. Some data
     * models, however, do have the capability to retain the selection, so
     * when using those, this property should be set to false.
     */
    resetSelectionOnHeaderTap :
    {
      check : "Boolean",
      init : true
    },


    appearance :
    {
      refine : true,
      init : "table-scroller"
    }
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __lastRowCount : null,
    __table : null,

    _moveColumn : null,
    __lastMoveColPos : null,
    _lastMoveTargetX : null,
    _lastMoveTargetScroller : null,
    __lastMovePointerPageX : null,

    __resizeColumn : null,
    __lastResizePointerPageX : null,
    __lastResizeWidth : null,

    __lastPointerDownCell : null,
    __firedTapEvent : false,
    __ignoreTap : null,
    __lastPointerPageX : null,
    __lastPointerPageY : null,

    __focusedCol : null,
    __focusedRow : null,

    _cellEditor : null,
    __cellEditorFactory : null,

    __topRightWidget : null,
    __horScrollBar : null,
    __verScrollBar : null,
    __header : null,
    _headerClipper : null,
    __tablePane : null,
    _paneClipper : null,
    __clipperContainer : null,
    __focusIndicator : null,
    __top : null,


    /**
     * The right inset of the pane. The right inset is the maximum of the
     * top right widget width and the scrollbar width (if visible).
     *
     * @return {Integer} The right inset of the pane
     */
    getPaneInsetRight : function()
    {
      var topRight = this.getTopRightWidget();
      var topRightWidth =
        topRight && topRight.isVisible() && topRight.getBounds() ?
          topRight.getBounds().width + topRight.getMarginLeft() + topRight.getMarginRight() :
          0;

      var scrollBar = this.__verScrollBar;
      var scrollBarWidth = this.getVerticalScrollBarVisible() ?
        this.getVerticalScrollBarWidth() + scrollBar.getMarginLeft() + scrollBar.getMarginRight() :
        0;

      return Math.max(topRightWidth, scrollBarWidth);
    },


    /**
     * Set the pane's width
     *
     * @param width {Integer} The pane's width
     */
    setPaneWidth : function(width)
    {
      if (this.isVerticalScrollBarVisible()) {
        width += this.getPaneInsetRight();
      }
      this.setWidth(width);
    },

    // @ITG:Wisej: RightToLeft support. 
    // Listens to "changeRtl" to mirror the captionbar and child controls.
    _onRtlChange: function (e) {

      if (e.getData() === e.getOldData())
        return;

      var rtl = e.getData();
      if (rtl != null) {
        this.__top._mirrorChildren(rtl);
        this.setTopRightWidget(this.getTopRightWidget());
        this._applyHorizontalScrollBarVisible(this.getHorizontalScrollBarVisible());
        this._updateLayout(rtl);
      }
    },

    _updateLayout: function (rtl) {

        var scrollX = this.__horScrollBar;
        var scrollY = this.__verScrollBar;
        var overlayed = qx.core.Environment.get("os.scrollBarOverlayed");

        if (overlayed) {

            if (rtl) {
                scrollY.setLayoutProperties({ left: 0, right: null, bottom: 0, top: 0 });
                scrollX.setLayoutProperties({ bottom: 0, right: 0, left: 0 });
            }
            else {
                scrollY.setLayoutProperties({ left: null, right: 0, bottom: 0, top: 0 });
                scrollX.setLayoutProperties({ bottom: 0, right: 0, left: 0 });
            }
        }
        else {

            var pane = this._paneClipper;
            var layout = this._getLayout();

            if (rtl) {
                layout.setColumnFlex(0, 0);
                layout.setColumnFlex(1, 1);

                pane.setLayoutProperties({ row: 1, column: 1 });
                scrollY.setLayoutProperties({ row: 1, column: 0 });
                scrollX.setLayoutProperties({ row: 2, column: 1 });
            }
            else {
                layout.setColumnFlex(0, 1);
                layout.setColumnFlex(1, 0);

                pane.setLayoutProperties({ row: 1, column: 0 });
                scrollY.setLayoutProperties({ row: 1, column: 1 });
                scrollX.setLayoutProperties({ row: 2, column: 0 });
            }
        }
    },

    // overridden
    _createChildControlImpl : function(id, hash)
    {
      var control;

      switch(id)
      {
        case "header":
          control = (this.getTable().getNewTablePaneHeader())(this);
          break;

        // @ITG:Wisej: Add as a child control to be able to style it.
        case "header-container":
          control = new qx.ui.container.Composite(new qx.ui.layout.HBox());
          this._add(control, {row: 0, column: 0, colSpan: 2});
          break;

        case "pane":
          control = (this.getTable().getNewTablePane())(this);
          break;

        case "focus-indicator":
          control = new qx.ui.table.pane.FocusIndicator(this);
          control.setUserBounds(0, 0, 0, 0);
          control.setZIndex(1000);
          control.addListener("pointerup", this._onPointerupFocusIndicator, this);
          // @ITG:Wisej: Register the pointerdown handle only once on the focus indicator.
          control.addListener("pointerdown", this._onPointerdownFocusIndicator, this);
          this._paneClipper.add(control);
          control.show();             // must be active for editor to operate
          control.setDecorator(null); // it can be initially invisible, though.
          break;

        case "resize-line":
          control = new qx.ui.core.Widget();
          control.setUserBounds(0, 0, 0, 0);
          control.setZIndex(1000);
          // @ITG:Wisej: Show the resize line above all scrollers.
          this.getTable()._add(control);
          break;

        case "scrollbar-x":
          control = this._createScrollBar("horizontal").set({
            alignY: "bottom",
            maximum: 0,
            visibility:"excluded"
          });
          control.addListener("scroll", this._onScrollX, this);

          if (this.__clipperContainer != null) {
            control.setMinHeight(qx.ui.core.scroll.AbstractScrollArea.DEFAULT_SCROLLBAR_WIDTH);
            this.__clipperContainer.add(control, {bottom: 0, right: 0, left: 0});
          } else {
            this._add(control, {row: 2, column: 0});
          }
          break;

        case "scrollbar-y":
          control = this._createScrollBar("vertical").set({
            maximum: 0,
            visibility: "excluded"
          });
          control.addListener("scroll", this._onScrollY, this);

          if (this.__clipperContainer != null) {
            this.__clipperContainer.add(control, {right: 0, bottom: 0, top: 0});
          } else {
            this._add(control, {row: 1, column: 1});
          }
          break;
      }

      return control || this.base(arguments, id);
    },


    // property modifier
    _applyHorizontalScrollBarVisible : function(value, old) {
      this.__horScrollBar.setVisibility(value ? "visible" : "excluded");
    },

    // property modifier
    _applyVerticalScrollBarVisible : function(value, old) {

      this.__verScrollBar.setVisibility(value ? "visible" : "excluded");

      // @ITG:Wisej: RightToLeft support. Add a spacer to line up the left column with the content.
      if (this.isRtl()) {

        if (!this.__verticalScrollBarFiller) {

          this.__verticalScrollBarFiller = new qx.ui.core.Spacer();
          this.__top.add(this.__verticalScrollBarFiller);

          if (qx.core.Environment.get("qx.dyntheme")) {
              qx.theme.manager.Meta.getInstance().addListener("changeTheme", function (e) {

                if (this.__verticalScrollBarFiller && this.isRtl())
                  this.__verticalScrollBarFiller.setWidth(this.__verScrollBar.getSizeHint().width);

            }, this);
          }
        }
        this.__verScrollBar.syncAppearance();
        this.__verticalScrollBarFiller.setWidth(value ? this.__verScrollBar.getSizeHint().width : 0);
      }
      else if (this.__verticalScrollBarFiller) {
        this.__verticalScrollBarFiller.setWidth(0);
      }
    },

	// @ITG:Wisej: RightToLeft support.
    __verticalScrollBarFiller: null,

    // property modifier
    _applyTablePaneModel : function(value, old)
    {
      if (old != null) {
        old.removeListener("modelChanged", this._onPaneModelChanged, this);
      }

      value.addListener("modelChanged", this._onPaneModelChanged, this);
    },


    // property modifier
    _applyShowCellFocusIndicator : function(value, old)
    {
      if(value) {
        this.__focusIndicator.resetDecorator();
        this._updateFocusIndicator();
      }
      else {
        if(this.__focusIndicator) {
          this.__focusIndicator.setDecorator(null);
        }
      }
    },


    /**
     * Get the current position of the vertical scroll bar.
     *
     * @return {Integer} The current scroll position.
     */
    getScrollY : function() {
      return this.__verScrollBar.getPosition();
    },


    /**
     * Set the current position of the vertical scroll bar.
     *
     * @param scrollY {Integer} The new scroll position.
     * @param renderSync {Boolean?false} Whether the table update should be
     *     performed synchronously.
     */
    setScrollY : function(scrollY, renderSync)
    {
      this.__verScrollBar.scrollTo(scrollY);
      if (renderSync) {
        this._updateContent();
      }
    },


    /**
     * Get the current position of the vertical scroll bar.
     *
     * @return {Integer} The current scroll position.
     */
    getScrollX : function() {
      return this.__horScrollBar.getPosition();
    },


    /**
     * Set the current position of the vertical scroll bar.
     *
     * @param scrollX {Integer} The new scroll position.
     */
    setScrollX : function(scrollX) {
      this.__horScrollBar.scrollTo(scrollX);

      // @ITG:Wisej: Fix the column headers going out of sync when setting the scroll position by code.
      this._headerClipper.scrollToX(scrollX);

    },


    /**
     * Returns the table this scroller belongs to.
     *
     * @return {qx.ui.table.Table} the table.
     */
    getTable : function() {
      return this.__table;
    },


    /**
     * Creates and returns an instance of pane clipper.
     *
     * @return {qx.ui.table.pane.Clipper} pane clipper.
     */
    _createPaneClipper : function()
    {
      return new qx.ui.table.pane.Clipper();
    },


    /**
     * Creates and returns an instance of header clipper.
     *
     * @return {qx.ui.table.pane.Clipper} pane clipper.
     */
    _createHeaderClipper : function()
    {
      return new qx.ui.table.pane.Clipper();
    },


    /**
     * Event handler. Called when the visibility of a column has changed.
     */
    onColVisibilityChanged : function()
    {
      this.updateHorScrollBarMaximum();
      this._updateFocusIndicator();
    },


    /**
     * Sets the column width.
     *
     * @param col {Integer} the column to change the width for.
     * @param width {Integer} the new width.
     */
    setColumnWidth : function(col, width)
    {
      // @ITG:Wisej: Save the update when the column doesn't belong to the scroller.
      if (this.getTablePaneModel().getX(col) < 0)
        return;

      this.__header.setColumnWidth(col, width);
      this.__tablePane.setColumnWidth(col, width);

      this.updateHorScrollBarMaximum();
      this._updateFocusIndicator();
    },


    /**
     * Event handler. Called when the column order has changed.
     *
     */
    onColOrderChanged : function()
    {
      this.__header.onColOrderChanged();
      this.__tablePane.onColOrderChanged();

      this.updateHorScrollBarMaximum();
      this._updateFocusIndicator();
    },


    /**
     * Event handler. Called when the table model has changed.
     *
     * @param firstRow {Integer} The index of the first row that has changed.
     * @param lastRow {Integer} The index of the last row that has changed.
     * @param firstColumn {Integer} The model index of the first column that has changed.
     * @param lastColumn {Integer} The model index of the last column that has changed.
     */
    onTableModelDataChanged : function(firstRow, lastRow, firstColumn, lastColumn)
    {
      this.__tablePane.onTableModelDataChanged(firstRow, lastRow, firstColumn, lastColumn);
      var rowCount = this.getTable().getTableModel().getRowCount();

      if (rowCount != this.__lastRowCount)
      {
        this.updateVerScrollBarMaximum();

        if (this.getFocusedRow() >= rowCount)
        {
          if (rowCount == 0) {
            this.setFocusedCell(null, null);
          } else {
            this.setFocusedCell(this.getFocusedColumn(), rowCount - 1);
          }
        }
        this.__lastRowCount = rowCount;
      }
    },


    /**
     * Event handler. Called when the selection has changed.
     */
    onSelectionChanged : function() {
      this.__tablePane.onSelectionChanged();
    },


    /**
     * Event handler. Called when the table gets or looses the focus.
     */
    onFocusChanged : function() {
      this.__tablePane.onFocusChanged();
    },


    /**
     * Event handler. Called when the table model meta data has changed.
     */
    onTableModelMetaDataChanged : function()
    {
      this.__header.onTableModelMetaDataChanged();
      this.__tablePane.onTableModelMetaDataChanged();

      this.updateHorScrollBarMaximum();
      this._updateFocusIndicator();
    },


    /**
     * Event handler. Called when the pane model has changed.
     */
    _onPaneModelChanged : function()
    {
      this.__header.onPaneModelChanged();
      this.__tablePane.onPaneModelChanged();
    },


    /**
     * Event listener for the pane clipper's resize event
     */
    _onResizePane : function()
    {
      this.updateHorScrollBarMaximum();
      this.updateVerScrollBarMaximum();

      // The height has changed -> Update content
      this._updateContent();
      this.__header._updateContent();
      this.__table._updateScrollBarVisibility();
    },


    /**
     * Updates the maximum of the horizontal scroll bar, so it corresponds to the
     * total width of the columns in the table pane.
     */
    updateHorScrollBarMaximum : function()
    {
      var paneSize = this._paneClipper.getInnerSize();
      if (!paneSize) {
        // will be called on the next resize event again
        return;
      }
      var scrollSize = this.getTablePaneModel().getTotalWidth();

      var scrollBar = this.__horScrollBar;

      if (paneSize.width < scrollSize)
      {
        var max = Math.max(0, scrollSize - paneSize.width);

        scrollBar.setMaximum(max);
        scrollBar.setKnobFactor(paneSize.width / scrollSize);

        var pos = scrollBar.getPosition();
        scrollBar.setPosition(Math.min(pos, max));
      }
      else
      {
        scrollBar.setMaximum(0);
        scrollBar.setKnobFactor(1);
        scrollBar.setPosition(0);
      }
    },


    /**
     * Updates the maximum of the vertical scroll bar, so it corresponds to the
     * number of rows in the table.
     */
    updateVerScrollBarMaximum : function()
    {
      var paneSize = this._paneClipper.getInnerSize();
      if (!paneSize) {
        // will be called on the next resize event again
        return;
      }

      var tableModel = this.getTable().getTableModel();
      var rowCount = tableModel.getRowCount();

      if (this.getTable().getKeepFirstVisibleRowComplete()) {
        rowCount += 1;
      }

      var rowHeight = this.getTable().getRowHeight();
      var scrollSize = rowCount * rowHeight;
      var scrollBar = this.__verScrollBar;

      if (paneSize.height < scrollSize)
      {
        var max = Math.max(0, scrollSize - paneSize.height);

        scrollBar.setMaximum(max);
        scrollBar.setKnobFactor(paneSize.height / scrollSize);

        var pos = scrollBar.getPosition();
        scrollBar.setPosition(Math.min(pos, max));
      }
      else
      {
        scrollBar.setMaximum(0);
        scrollBar.setKnobFactor(1);
        scrollBar.setPosition(0);
      }
    },


    /**
     * Event handler. Called when the table property "keepFirstVisibleRowComplete"
     * changed.
     */
    onKeepFirstVisibleRowCompleteChanged : function()
    {
      this.updateVerScrollBarMaximum();
      this._updateContent();
    },


    /**
     * Event handler. Called when the horizontal scroll bar moved.
     *
     * @param e {Map} the event.
     */
    _onScrollX : function(e)
    {
      var scrollLeft = e.getData();

      this.fireDataEvent("changeScrollX", scrollLeft, e.getOldData());
      this._headerClipper.scrollToX(scrollLeft);
      this._paneClipper.scrollToX(scrollLeft);
    },


    /**
     * Event handler. Called when the vertical scroll bar moved.
     *
     * @param e {Map} the event.
     */
    _onScrollY : function(e)
    {
      this.fireDataEvent("changeScrollY", e.getData(), e.getOldData());
      this._updateContent();
    },


    /**
     * Event handler. Called when the user moved the mouse wheel.
     *
     * @param e {qx.event.type.Roll} the event.
     */
    _onRoll : function(e)
    {
      var table = this.getTable();

      if (e.getPointerType() === "mouse" || !table.getEnabled()) {
        return;
      }

      // vertical scrolling
      var delta = e.getDelta();
      // normalize that at least one step is scrolled at a time
      if (delta.y > 0 && delta.y < 1) {
        delta.y = 1;
      } else if (delta.y < 0 && delta.y > -1) {
        delta.y = -1;
      }
      this.__verScrollBar.scrollBy(parseInt(delta.y, 10));

      // @ITG:Wisej: Check if the scrollbar is visible before testing the location.
      var scrolled =
        this.__verScrollBar.isVisible() &&
        delta.y != 0 && !this.__isAtEdge(this.__verScrollBar, delta.y);

      // horizontal scrolling
      // normalize that at least one step is scrolled at a time
      if (delta.x > 0 && delta.x < 1) {
        delta.x = 1;
      } else if (delta.x < 0 && delta.x > -1) {
        delta.x = -1;
      }
      this.__horScrollBar.scrollBy(parseInt(delta.x, 10));

      // Update the focus
      if (this.__lastPointerPageX && this.getFocusCellOnPointerMove()) {
        this._focusCellAtPagePos(this.__lastPointerPageX, this.__lastPointerPageY);
      }

      // @ITG:Wisej: Check if the scrollbar is visible before testing the location.
      scrolled = scrolled ||
        this.__horScrollBar.isVisible() &&
        (delta.x != 0 && !this.__isAtEdge(this.__horScrollBar, delta.x));

      // pass the event to the parent if the scrollbar is at an edge
      if (scrolled) {
        e.stop();
      } else {
        e.stopMomentum();
      }
    },


    /**
     * Checks if the table has been scrolled.
     * @param scrollBar {qx.ui.core.scroll.IScrollBar} The scrollbar to check
     * @param delta {Number} The scroll delta.
     * @return {Boolean} <code>true</code>, if the scrolling is a the edge
     */
    __isAtEdge : function(scrollBar, delta) {
      var position = scrollBar.getPosition();
      return (delta <= 0 && position <= 0) || (delta >= 0 && position >= scrollBar.getMaximum());
    },


    /**
     * Common column resize logic.
     *
     * @param pageX {Integer} the current pointer x position.
     */
    __handleResizeColumn : function(pageX)
    {
      var table = this.getTable();

      // We are currently resizing -> Update the position
      var headerCell = this.__header.getHeaderWidgetAtColumn(this.__resizeColumn);
      if (headerCell == null)
        return;

      var minColumnWidth = headerCell.getSizeHint().minWidth;
      var newWidth = Math.max(minColumnWidth, this.__lastResizeWidth + pageX - this.__lastResizePointerPageX);

      // @ITG:Wisej: Added support for column max width.
      var maxColumnWidth = headerCell.getSizeHint().maxWidth;
      newWidth = Math.min(maxColumnWidth, newWidth);

      if (this.getLiveResize()) {
        var columnModel = table.getTableColumnModel();
        columnModel.setColumnWidth(this.__resizeColumn, newWidth, true);
      } else {
        var paneModel = this.getTablePaneModel();
        this._showResizeLine(paneModel.getColumnLeft(this.__resizeColumn) + newWidth);
      }

      this.__lastResizePointerPageX += newWidth - this.__lastResizeWidth;
      this.__lastResizeWidth = newWidth;
    },


    /**
     * Common column move logic.
     *
     * @param pageX {Integer} the current pointer x position.
     *
     */
    __handleMoveColumn : function(pageX)
    {
      // We are moving a column

      // Check whether we moved outside the tap tolerance so we can start
      // showing the column move feedback
      // (showing the column move feedback prevents the ontap event)
      var tapTolerance = qx.ui.table.pane.Scroller.TAP_TOLERANCE;
      if (this.__header.isShowingColumnMoveFeedback()
        || pageX > this.__lastMovePointerPageX + tapTolerance
        || pageX < this.__lastMovePointerPageX - tapTolerance)
      {
        this.__lastMoveColPos += pageX - this.__lastMovePointerPageX;

        this.__header.showColumnMoveFeedback(this._moveColumn, this.__lastMoveColPos);

        // Get the responsible scroller
        var targetScroller = this.__table.getTablePaneScrollerAtPageX(pageX);
        if (this._lastMoveTargetScroller && this._lastMoveTargetScroller != targetScroller) {
          this._lastMoveTargetScroller.hideColumnMoveFeedback();
        }
        if (targetScroller != null) {
          this._lastMoveTargetX = targetScroller.showColumnMoveFeedback(pageX);
        } else {
          this._lastMoveTargetX = null;
        }

        this._lastMoveTargetScroller = targetScroller;
        this.__lastMovePointerPageX = pageX;
      }
    },


    /**
     * Event handler. Called when the user moved the pointer over the header.
     *
     * @param e {Map} the event.
     */
    _onPointermoveHeader : function(e)
    {
      var table = this.getTable();
      if (! table.getEnabled()) {
        return;
      }

      var useResizeCursor = false;
      var pointerOverColumn = null;

      var pageX = e.getDocumentLeft();
      var pageY = e.getDocumentTop();

      // Workaround: In onmousewheel the event has wrong coordinates for pageX
      //       and pageY. So we remember the last move event.
      this.__lastPointerPageX = pageX;
      this.__lastPointerPageY = pageY;

      if (this.__resizeColumn != null)
      {
        // We are currently resizing -> Update the position
        this.__handleResizeColumn(pageX);
        useResizeCursor = true;
        e.stopPropagation();
      }
      else if (this._moveColumn != null)
      {
        // We are moving a column
        this.__handleMoveColumn(pageX);
        e.stopPropagation();
      }
      else
      {
        var resizeCol = this._getResizeColumnForPageX(pageX);
        if (resizeCol != -1)
        {
          // The pointer is over a resize region -> Show the right cursor
          useResizeCursor = true;
        }
        else
        {
          var tableModel = table.getTableModel();
          var col = this._getColumnForPageX(pageX);
          if (col != null && tableModel.isColumnSortable(col)) {
            pointerOverColumn = col;
          }
        }
      }

      var cursor = useResizeCursor ? "col-resize" : null;
      this.setCursor(cursor);
      this.getApplicationRoot().setGlobalCursor(cursor);
      this.__header.setPointerOverColumn(pointerOverColumn);
    },


    /**
     * Event handler. Called when the user moved the pointer over the pane.
     *
     * @param e {Map} the event.
     */
    _onPointermovePane : function(e)
    {
      var table = this.getTable();

      if (! table.getEnabled()) {
        return;
      }

      //var useResizeCursor = false;

      var pageX = e.getDocumentLeft();
      var pageY = e.getDocumentTop();

      // Workaround: In onpointerwheel the event has wrong coordinates for pageX
      //       and pageY. So we remember the last move event.
      this.__lastPointerPageX = pageX;
      this.__lastPointerPageY = pageY;

      var row = this._getRowForPagePos(pageX, pageY);
      if (row != null && this._getColumnForPageX(pageX) != null) {
        // The pointer is over the data -> update the focus
        if (this.getFocusCellOnPointerMove()) {
          this._focusCellAtPagePos(pageX, pageY);
        }
      }
      this.__header.setPointerOverColumn(null);
    },


    /**
     * Event handler. Called when the user pressed a pointer button over the header.
     *
     * @param e {Map} the event.
     */
    _onPointerdownHeader : function(e)
    {
      if (! this.getTable().getEnabled()) {
        return;
      }

      var pageX = e.getDocumentLeft();

      // pointer is in header
      var resizeCol = this._getResizeColumnForPageX(pageX);
      if (resizeCol != -1)
      {
        // The pointer is over a resize region -> Start resizing
        this._startResizeHeader(resizeCol, pageX);
        e.stopPropagation();
      }
      else
      {
        // The pointer is not in a resize region
        var moveCol = this._getColumnForPageX(pageX);
        if (moveCol != null)
        {
          this._startMoveHeader(moveCol, pageX);
          e.stopPropagation();
        }
      }
    },


    /**
     * Start a resize session of the header.
     *
     * @param resizeCol {Integer} the column index
     * @param pageX {Integer} x coordinate of the pointer event
     */
    _startResizeHeader : function(resizeCol, pageX)
    {
      var columnModel = this.getTable().getTableColumnModel();

      // The pointer is over a resize region -> Start resizing
      this.__resizeColumn = resizeCol;
      this.__lastResizePointerPageX = pageX;
      this.__lastResizeWidth = columnModel.getColumnWidth(this.__resizeColumn);
      this._headerClipper.capture();
    },


    /**
     * Start a move session of the header.
     *
     * @param moveCol {Integer} the column index
     * @param pageX {Integer} x coordinate of the pointer event
     */
    _startMoveHeader : function(moveCol, pageX)
    {
      // Prepare column moving
      this._moveColumn = moveCol;
      this.__lastMovePointerPageX = pageX;
      this.__lastMoveColPos = this.getTablePaneModel().getColumnLeft(moveCol);
      this._headerClipper.capture();
    },



    /**
     * Event handler. Called when the user pressed a pointer button over the pane.
     *
     * @param e {Map} the event.
     */
    _onPointerdownPane : function(e)
    {
      var table = this.getTable();

      if (!table.getEnabled()) {
        return;
      }

      if (table.isEditing()) {
        table.stopEditing();
      }

      var pageX = e.getDocumentLeft();
      var pageY = e.getDocumentTop();
      var row = this._getRowForPagePos(pageX, pageY);
      var col = this._getColumnForPageX(pageX);

      if (row !== null)
      {
        // The focus indicator blocks the tap event on the scroller so we
        // store the current cell and listen for the pointerup event on the
        // focus indicator
        //
        // INVARIANT:
        //  The members of this object always contain the last position of
        //  the cell on which the pointerdown event occurred.
        //  *** These values are never cleared! ***.
        //  Different browsers/OS combinations issue events in different
        //  orders, and the context menu event, in particular, can be issued
        //  early or late (Firefox on Linux issues it early; Firefox on
        //  Windows issues it late) so no one may clear these values.
        //
        this.__lastPointerDownCell = {
          row : row,
          col : col
        };

        // On the other hand, we need to know if we've issued the tap event
        // so we don't issue it twice, both from pointer-up on the focus
        // indicator, and from the tap even on the pane. Both possibilities
        // are necessary, however, to maintain the qooxdoo order of events.
        this.__firedTapEvent = false;
      }
    },

    // @ITG:Wisej: Register the pointerdown handle only once on the focus indicator.
    /**
     * Event handle for the focus indicator's pointer down event.
     * 
     * @param e {qx.event.type.Pointer} The pointer event
     */
      _onPointerdownFocusIndicator: function (e) {

        if (this.isEditing()) {
          this.__lastPointerDownCell = {
            row: this.__focusedRow,
            col: this.__focusedCol
        };

         e.stopPropagation();
      }
    },

    /**
     * Event handler for the focus indicator's pointerup event
     *
     * @param e {qx.event.type.Pointer} The pointer event
     */
    _onPointerupFocusIndicator : function(e)
    {
      if (this.__lastPointerDownCell &&
          !this.__firedTapEvent &&
          !this.isEditing() &&
          this.__focusIndicator.getRow() == this.__lastPointerDownCell.row &&
          this.__focusIndicator.getColumn() == this.__lastPointerDownCell.col)
      {
        this.fireEvent("cellTap",
                       qx.ui.table.pane.CellEvent,
                       [
                         this,
                         e,
                         this.__lastPointerDownCell.row,
                         this.__lastPointerDownCell.col
                       ],
                       true);
        this.__firedTapEvent = true;
      } else if (!this.isEditing()) {
        // if no cellTap event should be fired, act like a pointerdown which
        // invokes the change of the selection e.g. [BUG #1632]
        this._onPointerdownPane(e);
      }
    },


    /**
     * Event handler. Called when the event capturing of the header changed.
     * Stops/finishes an active header resize/move session if it lost capturing
     * during the session to stay in a stable state.
     *
     * @param e {qx.event.type.Data} The data event
     */
    _onChangeCaptureHeader : function(e)
    {
      if (this.__resizeColumn != null) {
        this._stopResizeHeader();
      }

      if (this._moveColumn != null) {
        this._stopMoveHeader();
      }
    },


    /**
     * Stop a resize session of the header.
     *
     */
    _stopResizeHeader : function()
    {
      var columnModel = this.getTable().getTableColumnModel();

      // We are currently resizing -> Finish resizing
      if (! this.getLiveResize()) {
        this._hideResizeLine();
        columnModel.setColumnWidth(this.__resizeColumn,
                                   this.__lastResizeWidth,
                                   true);
      }

      this.__resizeColumn = null;
      this._headerClipper.releaseCapture();

      this.setCursor(null);
      this.getApplicationRoot().setGlobalCursor(null);
    },


    /**
     * Stop a move session of the header.
     *
     */
    _stopMoveHeader : function()
    {
      var columnModel = this.getTable().getTableColumnModel();
      var paneModel = this.getTablePaneModel();

      // We are moving a column -> Drop the column
      this.__header.hideColumnMoveFeedback();
      if (this._lastMoveTargetScroller) {
        this._lastMoveTargetScroller.hideColumnMoveFeedback();
      }

      if (this._lastMoveTargetX != null)
      {
        var fromVisXPos = paneModel.getFirstColumnX() + paneModel.getX(this._moveColumn);
        var toVisXPos = this._lastMoveTargetX;
        if (toVisXPos != fromVisXPos && toVisXPos != fromVisXPos + 1)
        {
          // The column was really moved to another position
          // (and not moved before or after itself, which is a noop)

          // Translate visible positions to overall positions
          var fromCol = columnModel.getVisibleColumnAtX(fromVisXPos);
          var toCol   = columnModel.getVisibleColumnAtX(toVisXPos);
          var fromOverXPos = columnModel.getOverallX(fromCol);
          var toOverXPos = (toCol != null) ? columnModel.getOverallX(toCol) : columnModel.getOverallColumnCount();

          if (toOverXPos > fromOverXPos) {
            // Don't count the column itself
            toOverXPos--;
          }

          // Move the column
          columnModel.moveColumn(fromOverXPos, toOverXPos);

          // update the focus indicator including the editor
          this._updateFocusIndicator();
        }
      }

      this._moveColumn = null;
      this._lastMoveTargetX = null;
      this._headerClipper.releaseCapture();
    },


    /**
     * Event handler. Called when the user released a pointer button over the header.
     *
     * @param e {Map} the event.
     */
    _onPointerupHeader : function(e)
    {
      var table = this.getTable();

      if (! table.getEnabled()) {
        return;
      }

      if (this.__resizeColumn != null)
      {
       this._stopResizeHeader();

        // @ITG:Wisej: Causes the next valid header tap to get lost when the column is resized.
        // this.__ignoreTap = true;

        e.stop();
      }
      else if (this._moveColumn != null)
      {
        this._stopMoveHeader();
        e.stop();
      }
    },


    /**
     * Event handler. Called when the user tapped a pointer button over the header.
     *
     * @param e {Map} the event.
     */
    _onTapHeader : function(e)
    {
      // @ITG:Wisej: Ignore taps on the resize border.
      if (this._getResizeColumnForPageX(e.getDocumentLeft()) > -1)
        return;

      // @ITG:Wisej: Causes the next valid header tap to get lost when the column is resized.
      //if (this.__ignoreTap)
      //{
      //  this.__ignoreTap = false;
      //  return;
      //}

      var table = this.getTable();

      if (!table.getEnabled()) {
        return;
      }

      var tableModel = table.getTableModel();

      var pageX = e.getDocumentLeft();

      var resizeCol = this._getResizeColumnForPageX(pageX);

      if (resizeCol == -1)
      {
        // pointer is not in a resize region
        var col = this._getColumnForPageX(pageX);

        if (col != null && tableModel.isColumnSortable(col))
        {
          // Sort that column
          var sortCol = tableModel.getSortColumnIndex();
          var ascending = (col != sortCol) ? true : !tableModel.isSortAscending();

          var data =
            {
              column     : col,
              ascending  : ascending,
              tapEvent : e
            };

          if (this.fireDataEvent("beforeSort", data, null, true))
          {
            // Stop cell editing
            if (table.isEditing()) {
              table.stopEditing();
            }

            tableModel.sortByColumn(col, ascending);
            if (this.getResetSelectionOnHeaderTap())
            {
              table.getSelectionModel().resetSelection();
            }
          }
        }
      }

      e.stop();
    },


    /**
     * Event handler. Called when the user tapped a pointer button over the pane.
     *
     * @param e {Map} the event.
     */
    _onTapPane : function(e)
    {
      var table = this.getTable();

      if (!table.getEnabled()) {
        return;
      }

      var pageX = e.getDocumentLeft();
      var pageY = e.getDocumentTop();
      var row = this._getRowForPagePos(pageX, pageY);
      var col = this._getColumnForPageX(pageX);

      if (row != null && col != null) {
        var selectBeforeFocus = this.getSelectBeforeFocus();

        if (selectBeforeFocus) {
          table.getSelectionManager().handleTap(row, e);
        }

        // The pointer is over the data -> update the focus
        if (!this.getFocusCellOnPointerMove()) {
          this._focusCellAtPagePos(pageX, pageY);
        }

        if (!selectBeforeFocus) {
          table.getSelectionManager().handleTap(row, e);
        }

        if (this.__focusIndicator.isHidden() ||
            (this.__lastPointerDownCell &&
             !this.__firedTapEvent &&
             !this.isEditing() &&
             row == this.__lastPointerDownCell.row &&
             col == this.__lastPointerDownCell.col))
        {
          this.fireEvent("cellTap",
                         qx.ui.table.pane.CellEvent,
                         [this, e, row, col],
                         true);
          this.__firedTapEvent = true;
        }
      }
    },


    /**
     * Event handler. Called when a context menu is invoked in a cell.
     *
     * @param e {qx.event.type.Pointer} the event.
     */
    _onContextMenu : function(e)
    {
      var pageX = e.getDocumentLeft();
      var pageY = e.getDocumentTop();
      var row = this._getRowForPagePos(pageX, pageY);
      var col = this._getColumnForPageX(pageX);

      /*
       * The 'row' value will be null if the right-click was in the blank
       * area below the last data row. Some applications desire to receive
       * the context menu event anyway, and can set the property value of
       * contextMenuFromDataCellsOnly to false to achieve that.
       */
      if (row === null && this.getContextMenuFromDataCellsOnly())
      {
        return;
      }

      if (! this.getShowCellFocusIndicator() ||
          row === null ||
          (this.__lastPointerDownCell &&
           row == this.__lastPointerDownCell.row &&
           col == this.__lastPointerDownCell.col))
      {
        this.fireEvent("cellContextmenu",
                       qx.ui.table.pane.CellEvent,
                       [this, e, row, col],
                       true);

        // Now that the cellContextmenu handler has had a chance to build
        // the menu for this cell, display it (if there is one).
        var menu = this.getTable().getContextMenu();
        if (menu)
        {
          // A menu with no children means don't display any context menu
          // including the default context menu even if the default context
          // menu is allowed to be displayed normally. There's no need to
          // actually show an empty menu, though.
          if (menu.getChildren().length > 0) {
            menu.openAtPointer(e);
          }
          else
          {
            menu.exclude();
          }

          // Do not show native menu
          e.preventDefault();
        }
      }
    },


    // overridden
    _onContextMenuOpen : function(e)
    {
      // This is Widget's context menu handler which typically retrieves
      // and displays the menu as soon as it receives a "contextmenu" event.
      // We want to allow the cellContextmenu handler to create the menu,
      // so we'll override this method with a null one, and do the menu
      // placement and display handling in our _onContextMenu method.
    },


    /**
     * Event handler. Called when the user double tapped a pointer button over the pane.
     *
     * @param e {Map} the event.
     */
    _onDbltapPane : function(e)
    {
      var pageX = e.getDocumentLeft();
      var pageY = e.getDocumentTop();
      var col = this._getColumnForPageX(pageX);

      if (col !== null) {
        this._focusCellAtPagePos(pageX, pageY);
        this.startEditing();

        var row = this._getRowForPagePos(pageX, pageY);
        if (row != -1 && row != null) {
          this.fireEvent("cellDbltap", qx.ui.table.pane.CellEvent, [this, e, row], true);
        }
      }
    },


    /**
     * Event handler. Called when the pointer moved out.
     *
     * @param e {Map} the event.
     */
    _onPointerout : function(e)
    {
      var table = this.getTable();

      if (!table.getEnabled()) {
        return;
      }

      // Reset the resize cursor when the pointer leaves the header
      // If currently a column is resized then do nothing
      // (the cursor will be reset on pointerup)
      if (this.__resizeColumn == null)
      {
        this.setCursor(null);
        this.getApplicationRoot().setGlobalCursor(null);
      }

      this.__header.setPointerOverColumn(null);

      // in case the focus follows the pointer, it should be remove on pointerout
      if (this.getFocusCellOnPointerMove()) {
        this.__table.setFocusedCell();
      }
    },


    /**
     * Shows the resize line.
     *
     * @param x {Integer} the position where to show the line (in pixels, relative to
     *      the left side of the pane).
     */
    _showResizeLine : function(x)
    {
      var resizeLine = this._showChildControl("resize-line");

      var width = resizeLine.getWidth();

      // @ITG:Wisej: Show the resize line above all scrollers.
      var paneBounds = this.getBounds();
      var bounds = this.getTable().getBounds();
      resizeLine.setUserBounds(
        x + paneBounds.left - Math.round(width / 2) - this.getScrollX(), 0, width, bounds.height
      );
    },


    /**
     * Hides the resize line.
     */
    _hideResizeLine : function() {
      this._excludeChildControl("resize-line");
    },


    /**
     * Shows the feedback shown while a column is moved by the user.
     *
     * @param pageX {Integer} the x position of the pointer in the page (in pixels).
     * @return {Integer} the visible x position of the column in the whole table.
     */
    showColumnMoveFeedback : function(pageX)
    {
      var paneModel = this.getTablePaneModel();
      var columnModel = this.getTable().getTableColumnModel();
      var paneLeft = this.__tablePane.getContentLocation().left;
      var colCount = paneModel.getColumnCount();

      var targetXPos = 0;
      var targetX = 0;
      var currX = paneLeft;

      for (var xPos=0; xPos<colCount; xPos++)
      {
        var col = paneModel.getColumnAtX(xPos);
        var colWidth = columnModel.getColumnWidth(col);

        if (pageX < currX + colWidth / 2) {
          break;
        }

        currX += colWidth;
        targetXPos = xPos + 1;
        targetX = currX - paneLeft;
      }

      // Ensure targetX is visible
      var scrollerLeft = this._paneClipper.getContentLocation().left;
      var scrollerWidth = this._paneClipper.getBounds().width;
      var scrollX = scrollerLeft - paneLeft;

      // NOTE: +2/-1 because of feedback width
      targetX = qx.lang.Number.limit(targetX, scrollX + 2, scrollX + scrollerWidth - 1);

      this._showResizeLine(targetX);

      // Return the overall target x position
      return paneModel.getFirstColumnX() + targetXPos;
    },


    /**
     * Hides the feedback shown while a column is moved by the user.
     */
    hideColumnMoveFeedback : function() {
      this._hideResizeLine();
    },


    /**
     * Sets the focus to the cell that's located at the page position
     * <code>pageX</code>/<code>pageY</code>. If there is no cell at that position,
     * nothing happens.
     *
     * @param pageX {Integer} the x position in the page (in pixels).
     * @param pageY {Integer} the y position in the page (in pixels).
     */
    _focusCellAtPagePos : function(pageX, pageY)
    {
      var row = this._getRowForPagePos(pageX, pageY);

      if (row != -1 && row != null)
      {
        // The pointer is over the data -> update the focus
        var col = this._getColumnForPageX(pageX);
        this.__table.setFocusedCell(col, row, true);
      }
    },


    /**
     * Sets the currently focused cell.
     *
     * @param col {Integer} the model index of the focused cell's column.
     * @param row {Integer} the model index of the focused cell's row.
     */
    setFocusedCell : function(col, row)
    {
      if (!this.isEditing())
      {
        this.__tablePane.setFocusedCell(col, row);

        this.__focusedCol = col;
        this.__focusedRow = row;

        this._updateFocusIndicator();
      }
    },


    /**
     * Returns the column of currently focused cell.
     *
     * @return {Integer} the model index of the focused cell's column.
     */
    getFocusedColumn : function() {
      return this.__focusedCol;
    },


    /**
     * Returns the row of currently focused cell.
     *
     * @return {Integer} the model index of the focused cell's column.
     */
    getFocusedRow : function() {
      return this.__focusedRow;
    },


    /**
     * Scrolls a cell visible.
     *
     * @param col {Integer} the model index of the column the cell belongs to.
     * @param row {Integer} the model index of the row the cell belongs to.
     */
    scrollCellVisible : function(col, row)
    {
      var paneModel = this.getTablePaneModel();
      var xPos = paneModel.getX(col);

      if (xPos != -1)
      {
        var clipperSize = this._paneClipper.getInnerSize();
        if (!clipperSize) {
          return;
        }

        var columnModel = this.getTable().getTableColumnModel();

        var colWidth = columnModel.getColumnWidth(col);
        var rowHeight = this.getTable().getRowHeight();
        var rowTop = row * rowHeight;

        var scrollX = this.getScrollX();
        var scrollY = this.getScrollY();

        // @ITG:Wisej: RightToLeft support.
        //var colLeft = paneModel.getColumnLeft(col);
        var colLeft = (!this.isRtl())
          ? paneModel.getColumnLeft(col)
          : paneModel.getTotalWidth() - paneModel.getColumnLeft(col) - colWidth;

        // NOTE: We don't use qx.lang.Number.limit, because min should win if max < min
        var minScrollX = Math.min(colLeft, colLeft + colWidth - clipperSize.width);
        var maxScrollX = colLeft;
        this.setScrollX(Math.max(minScrollX, Math.min(maxScrollX, scrollX)));

        var minScrollY = rowTop + rowHeight - clipperSize.height;

        if (this.getTable().getKeepFirstVisibleRowComplete()) {
          minScrollY += rowHeight;
        }

        var maxScrollY = rowTop;
        this.setScrollY(Math.max(minScrollY, Math.min(maxScrollY, scrollY)), true);
      }
    },


    /**
     * Returns whether currently a cell is editing.
     *
     * @return {var} whether currently a cell is editing.
     */
    isEditing : function() {
      return this._cellEditor != null;
    },

    // @ITG:Wisej: Added overridable method isCellEditable.

    /**
     * Checks whether a cell is editable.
     * @param col {Integer} column index.
     * @param row {Integer} row index.
     */
    isCellEditable: function (col, row) { 
      if (col != null && row != null) {
        var tableModel = this.getTable().getTableModel();
        return tableModel.isColumnEditable(col);
      }
      return false;
    },

    /**
     * Starts editing the currently focused cell. Does nothing if already
     * editing, if the column is not editable, or if the cell editor for the
     * column ascertains that the particular cell is not editable.
     *
     * @return {Boolean} whether editing was started
     */
    startEditing : function()
    {
      var table = this.getTable();
      var tableModel = table.getTableModel();
      var col = this.__focusedCol;
      var row = this.__focusedRow;

      if (!this.isEditing() && this.isCellEditable(col, row))
      {
        var xPos = this.getTablePaneModel().getX(col);
        var value = tableModel.getValue(col, row);

        // scroll cell into view
        this.scrollCellVisible(col, row);

        this.__cellEditorFactory = table.getTableColumnModel().getCellEditorFactory(col);

        var cellInfo =
        {
          col   : col,
          row   : row,
          xPos  : xPos,
          value : value,
          table : table
        };

        // Get a cell editor
        this._cellEditor = this.__cellEditorFactory.createCellEditor(cellInfo);

        // We handle two types of cell editors: the traditional in-place
        // editor, where the cell editor returned by the factory must fit in
        // the space of the table cell; and a modal window in which the
        // editing takes place.  Additionally, if the cell editor determines
        // that it does not want to edit the particular cell being requested,
        // it may return null to indicate that cell is not editable.
        if (this._cellEditor === null)
        {
          // This cell is not editable even though its column is.
          return false;
        }
        else if (this._cellEditor instanceof qx.ui.window.Window)
        {
          // It's a window.  Ensure that it's modal.
          this._cellEditor.setModal(true);

          // At least for the time being, we disallow the close button.  It
          // acts differently than a cellEditor.close(), and invokes a bug
          // someplace.  Modal window cell editors should provide their own
          // buttons or means to activate a cellEditor.close() or equivalently
          // cellEditor.hide().
          // @ITG:Wisej: No reason to hide the close button. It's the minimize button that should be hidden.
          // this._cellEditor.setShowClose(false);
          this._cellEditor.setShowMinimize(false);

          // Arrange to be notified when it is closed.
          this._cellEditor.addListener(
            "close",
            this._onCellEditorModalWindowClose,
            this);

          // If there's a pre-open function defined for the table...
          var f = table.getModalCellEditorPreOpenFunction();
          if (f != null) {
            f(this._cellEditor, cellInfo);
          }

          // Open it now.
          this._cellEditor.open();
        }
        else
        {
          // @ITG:Wisej: Don't attach the handle every time the cell enters edit mode.
          //// prevent tap event from bubbling up to the table
          //this.__focusIndicator.addListener("pointerdown", function(e)
          //{
          //  this.__lastPointerDownCell = {
          //    row : this.__focusedRow,
          //    col : this.__focusedCol
          //  };
          //  e.stopPropagation();
          //}, this);

          this.__focusIndicator.add(this._cellEditor);
          this.__focusIndicator.addState("editing");
          this.__focusIndicator.setKeepActive(false);

          // Make the focus indicator visible during editing
          this.__focusIndicator.setDecorator("table-scroller-focus-indicator");

          if (this._cellEditor.isFocusable())
            this._cellEditor.focus();

          // @ITG:Wisej: Not needed, it redirects keyboard inputs to the outer widget when the editor is a composite widget such as a ComboBox or DateField.
          // this._cellEditor.activate();
        }

        return true;
      }

      return false;
    },


    /**
     * Stops editing and writes the editor's value to the model.
     */
    stopEditing : function()
    {
      // If the focus indicator is not being shown normally...
      if (! this.getShowCellFocusIndicator())
      {
        // ... then hide it again
        this.__focusIndicator.setDecorator(null);
      }

      this.flushEditor();
      this.cancelEditing();
    },


    /**
     * Writes the editor's value to the model.
     */
    flushEditor : function()
    {
      if (this.isEditing())
      {
        this.__table.focus();

        var dataModel = this.__table.getTableModel();
        var oldValue = dataModel.getValue(this.__focusedCol, this.__focusedRow);
        var value = this.__cellEditorFactory.getCellEditorValue(this._cellEditor);

        dataModel.setValue(this.__focusedCol, this.__focusedRow, value);

        // Fire an event containing the value change.
        this.__table.fireDataEvent("dataEdited",
                                   {
                                     row      : this.__focusedRow,
                                     col      : this.__focusedCol,
                                     oldValue : oldValue,
                                     value    : value
                                   });
      }
    },


    /**
     * Stops editing without writing the editor's value to the model.
     */
    cancelEditing : function()
    {
      if (this.isEditing())
      {
        if (!(this._cellEditor instanceof qx.ui.window.Window))
        {
          this.__focusIndicator.removeState("editing");
          this.__focusIndicator.setKeepActive(true);
        }
        this._cellEditor.destroy();
        this._cellEditor = null;
        this.__cellEditorFactory = null;
      }
    },


    /**
     * Event handler. Called when the modal window of the cell editor closes.
     *
     * @param e {Map} the event.
     */
    _onCellEditorModalWindowClose : function(e) {

      // @ITG:Wisej: Should call stopEditing on the table, not the scroller. See all other calls to table.stopEditing.
      // this.stopEditing();
      var table = this.getTable();
      if (table.isEditing()) {
        table.stopEditing();
      }
    },


    /**
     * Returns the model index of the column the pointer is over or null if the pointer
     * is not over a column.
     *
     * @param pageX {Integer} the x position of the pointer in the page (in pixels).
     * @return {Integer} the model index of the column the pointer is over.
     */
    _getColumnForPageX : function(pageX)
    {
      var columnModel = this.getTable().getTableColumnModel();
      var paneModel = this.getTablePaneModel();
      var colCount = paneModel.getColumnCount();

      // @ITG:Wisej: Check if the pane has a valid location object or under
      // certain circumstances we get a null error when reading the left field.
      // var currX = this.__tablePane.getContentLocation().left;
      var location = this.__tablePane.getContentLocation();
      var currX = location != null ? location.left : 0;

      // @ITG:Wisej: RightToLeft support.
      var rtl = this.isRtl();

      for (var x =
        rtl ? (colCount - 1) : (0);
        rtl ? (x > -1) : (x < colCount);
        rtl ? (x--) : (x++))
      {
        var col = paneModel.getColumnAtX(x);
        var colWidth = columnModel.getColumnWidth(col);
        currX += colWidth;

        if (pageX < currX) {
          return col;
        }
      }

      return null;
    },


    /**
     * Returns the model index of the column that should be resized when dragging
     * starts here. Returns -1 if the pointer is in no resize region of any column.
     *
     * @param pageX {Integer} the x position of the pointer in the page (in pixels).
     * @return {Integer} the column index.
     */
    _getResizeColumnForPageX : function(pageX)
    {
      var columnModel = this.getTable().getTableColumnModel();
      var paneModel = this.getTablePaneModel();
      var colCount = paneModel.getColumnCount();
      var currX = this.__header.getContentLocation().left;
      var regionRadius = qx.ui.table.pane.Scroller.RESIZE_REGION_RADIUS;

      // @ITG:Wisej: RightToLeft support.
      var rtl = this.isRtl();

      for (var x =
        rtl ? (colCount - 1) : (0) ;
        rtl ? (x > -1) : (x < colCount) ;
        rtl ? (x--) : (x++))
      {
        var col = paneModel.getColumnAtX(x);
        var colWidth = columnModel.getColumnWidth(col);
        currX += colWidth;

        if (pageX >= (currX - regionRadius) && pageX <= (currX + regionRadius)) {
          return col;
        }
      }

      return -1;
    },


    /**
     * Returns the model index of the row the pointer is currently over. Returns -1 if
     * the pointer is over the header. Returns null if the pointer is not over any
     * column.
     *
     * @param pageX {Integer} the pointer x position in the page.
     * @param pageY {Integer} the pointer y position in the page.
     * @return {Integer} the model index of the row the pointer is currently over.
     */
    _getRowForPagePos : function(pageX, pageY)
    {
      var panePos = this.__tablePane.getContentLocation();

      if (pageX < panePos.left || pageX > panePos.right)
      {
        // There was no cell or header cell hit
        return null;
      }

      if (pageY >= panePos.top && pageY <= panePos.bottom)
      {
        // This event is in the pane -> Get the row
        var rowHeight = this.getTable().getRowHeight();

        var scrollY = this.__verScrollBar.getPosition();

        if (this.getTable().getKeepFirstVisibleRowComplete()) {
          scrollY = Math.floor(scrollY / rowHeight) * rowHeight;
        }

        var tableY = scrollY + pageY - panePos.top;
        var row = Math.floor(tableY / rowHeight);

        var tableModel = this.getTable().getTableModel();
        var rowCount = tableModel.getRowCount();

        return (row < rowCount) ? row : null;
      }

      var headerPos = this.__header.getContentLocation();

      if (
        pageY >= headerPos.top &&
        pageY <= headerPos.bottom &&
        pageX <= headerPos.right)
      {
        // This event is in the pane -> Return -1 for the header
        return -1;
      }

      return null;
    },


    /**
     * Sets the widget that should be shown in the top right corner.
     *
     * The widget will not be disposed, when this table scroller is disposed. So the
     * caller has to dispose it.
     *
     * @param widget {qx.ui.core.Widget} The widget to set. May be null.
     */
    setTopRightWidget : function(widget)
    {
      var oldWidget = this.__topRightWidget;

      if (oldWidget != null) {
        this.__top.remove(oldWidget);
      }

      if (widget != null) {

        // @ITG:Wisej: RightToLeft support. Keep the top right widget (visibility menu) to the right, or the cell layout gets shifted.
        if (this.isRtl())
          this.__top.addAt(widget, 0);
        else
          this.__top.add(widget);
      }

      this.__topRightWidget = widget;
    },


    /**
     * Get the top right widget
     *
     * @return {qx.ui.core.Widget} The top right widget.
     */
    getTopRightWidget : function() {
      return this.__topRightWidget;
    },


    /**
     * Returns the header.
     *
     * @return {qx.ui.table.pane.Header} the header.
     */
    getHeader : function() {
      return this.__header;
    },


    /**
     * Returns the table pane.
     *
     * @return {qx.ui.table.pane.Pane} the table pane.
     */
    getTablePane : function() {
      return this.__tablePane;
    },


    /**
     * Get the rendered width of the vertical scroll bar. The return value is
     * <code>0</code> if the scroll bar is invisible or not yet rendered.
     *
     * @internal
     * @return {Integer} The width of the vertical scroll bar
     */
    getVerticalScrollBarWidth : function()
    {
      var scrollBar = this.__verScrollBar;
      return scrollBar.isVisible() ? (scrollBar.getSizeHint().width || 0) : 0;
    },


    /**
     * Returns which scrollbars are needed.
     *
     * @param forceHorizontal {Boolean ? false} Whether to show the horizontal
     *      scrollbar always.
     * @param preventVertical {Boolean ? false} Whether to show the vertical scrollbar
     *      never.
     * @return {Integer} which scrollbars are needed. This may be any combination of
     *      {@link #HORIZONTAL_SCROLLBAR} or {@link #VERTICAL_SCROLLBAR}
     *      (combined by OR).
     */
    getNeededScrollBars : function(forceHorizontal, preventVertical)
    {
      var verScrollBar = this.__verScrollBar;
      var verBarWidth = verScrollBar.getSizeHint().width
        + verScrollBar.getMarginLeft() + verScrollBar.getMarginRight();

      var horScrollBar = this.__horScrollBar;
      var horBarHeight = horScrollBar.getSizeHint().height
        + horScrollBar.getMarginTop() + horScrollBar.getMarginBottom();

      // Get the width and height of the view (without scroll bars)
      var clipperSize = this._paneClipper.getInnerSize();
      var viewWidth = clipperSize ? clipperSize.width : 0;

      if (this.getVerticalScrollBarVisible()) {
        viewWidth += verBarWidth;
      }

      var viewHeight = clipperSize ? clipperSize.height : 0;

      if (this.getHorizontalScrollBarVisible()) {
        viewHeight += horBarHeight;
      }

      var tableModel = this.getTable().getTableModel();
      var rowCount = tableModel.getRowCount();

      // Get the (virtual) width and height of the pane
      var paneWidth = this.getTablePaneModel().getTotalWidth();
      var paneHeight = this.getTable().getRowHeight() * rowCount;

      // Check which scrollbars are needed
      var horNeeded = false;
      var verNeeded = false;

      if (paneWidth > viewWidth) {
        horNeeded = true;

        if (paneHeight > viewHeight - horBarHeight) {
          verNeeded = true;
        }
      } else if (paneHeight > viewHeight) {
        verNeeded = true;

        if (!preventVertical && (paneWidth > viewWidth - verBarWidth)) {
          horNeeded = true;
        }
      }

      // Create the mask
      var horBar = qx.ui.table.pane.Scroller.HORIZONTAL_SCROLLBAR;
      var verBar = qx.ui.table.pane.Scroller.VERTICAL_SCROLLBAR;
      return ((forceHorizontal || horNeeded) ? horBar : 0) | ((preventVertical || !verNeeded) ? 0 : verBar);
    },


    /**
     * Return the pane clipper. It is sometimes required for special activities
     * such as tracking events for drag&drop.
     *
     * @return {qx.ui.table.pane.Clipper}
     *   The pane clipper for this scroller.
     */
    getPaneClipper : function()
    {
      return this._paneClipper;
    },


    /**
     * Returns the scroll area container widget (which enables more precise
     * operations e.g. bounds retrieval for drag session scrolling).
     *
     * @see qx.ui.core.MDragDropScrolling#_getBounds
     * @return {qx.ui.table.pane.Clipper}
     *   The pane clipper for this scroller.
     */
    getScrollAreaContainer : function() {
      return this.getPaneClipper();
    },


    /**
     * Updates the content. Sets the right section the table pane should show and
     * does the scrolling.
     */
    _updateContent : function()
    {
      var paneSize = this._paneClipper.getInnerSize();
      if (!paneSize) {
        return;
      }
      var paneHeight = paneSize.height;

      var scrollX = this.__horScrollBar.getPosition();
      var scrollY = this.__verScrollBar.getPosition();
      var rowHeight = this.getTable().getRowHeight();

      var firstRow = Math.floor(scrollY / rowHeight);
      var oldFirstRow = this.__tablePane.getFirstVisibleRow();
      this.__tablePane.setFirstVisibleRow(firstRow);

      var visibleRowCount = Math.ceil(paneHeight / rowHeight);
      var paneOffset = 0;
      var firstVisibleRowComplete = this.getTable().getKeepFirstVisibleRowComplete();

      if (!firstVisibleRowComplete)
      {

        // NOTE: We don't consider paneOffset, because this may cause alternating
        //       adding and deleting of one row when scrolling. Instead we add one row
        //       in every case.
        visibleRowCount++;

        paneOffset = scrollY % rowHeight;
      }

      this.__tablePane.setVisibleRowCount(visibleRowCount);

      if (firstRow != oldFirstRow) {
        this._updateFocusIndicator();
      }

      this._paneClipper.scrollToX(scrollX);

      // Avoid expensive calls to setScrollTop if
      // scrolling is not needed
      if (! firstVisibleRowComplete ) {
        this._paneClipper.scrollToY(paneOffset);
      }
    },

    /**
     * Updates the location and the visibility of the focus indicator.
     *
     */
    _updateFocusIndicator : function()
    {
      var table = this.getTable();

      if (!table.getEnabled()) {
        return;
      }

      this.__focusIndicator.moveToCell(this.__focusedCol, this.__focusedRow);
    }
  },




  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    // this object was created by the table on init so we have to clean it up.
    var tablePaneModel = this.getTablePaneModel();
    if (tablePaneModel)
    {
      tablePaneModel.dispose();
    }

    this.__lastPointerDownCell = this.__topRightWidget = this.__table = null;
    this._disposeObjects("__horScrollBar", "__verScrollBar",
                         "_headerClipper", "_paneClipper", "__focusIndicator",
                         "__header", "__tablePane", "__top",
                         "__clipperContainer", "__verticalScrollBarFiller");
  }
});
