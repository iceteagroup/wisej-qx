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
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * A *date chooser* is a small calendar including a navigation bar to switch the shown
 * month. It includes a column for the calendar week and shows one month. Selecting
 * a date is as easy as tapping on it.
 *
 * To be conform with all form widgets, the {@link qx.ui.form.IForm} interface
 * is implemented.
 *
 * The following example creates and adds a date chooser to the root element.
 * A listener alerts the user if a new date is selected.
 *
 * <pre class='javascript'>
 * var chooser = new qx.ui.control.DateChooser();
 * this.getRoot().add(chooser, { left : 20, top: 20});
 *
 * chooser.addListener("changeValue", function(e) {
 *   alert(e.getData());
 * });
 * </pre>
 *
 * Additionally to a selection event an execute event is available which is
 * fired by doubletap or tapping the space / enter key. With this event you
 * can for example save the selection and close the date chooser.
 *
 * @childControl navigation-bar {qx.ui.container.Composite} container for the navigation bar controls
 * @childControl last-year-button-tooltip {qx.ui.tooltip.ToolTip} tooltip for the last year button
 * @childControl last-year-button {qx.ui.form.Button} button to jump to the last year
 * @childControl last-month-button-tooltip {qx.ui.tooltip.ToolTip} tooltip for the last month button
 * @childControl last-month-button {qx.ui.form.Button} button to jump to the last month
 * @childControl next-month-button-tooltip {qx.ui.tooltip.ToolTip} tooltip for the next month button
 * @childControl next-month-button {qx.ui.form.Button} button to jump to the next month
 * @childControl next-year-button-tooltip {qx.ui.tooltip.ToolTip} tooltip for the next year button
 * @childControl next-year-button {qx.ui.form.Button} button to jump to the next year
 * @childControl month-year-label {qx.ui.basic.Label} shows the current month and year
 * @childControl week {qx.ui.basic.Label} week label (used multiple times)
 * @childControl weekday {qx.ui.basic.Label} weekday label (used multiple times)
 * @childControl day {qx.ui.basic.Label} day label (used multiple times)
 * @childControl date-pane {qx.ui.container.Composite} the pane used to position the week, weekday and day labels
 *
 */
qx.Class.define("qx.ui.control.DateChooser",
{
  extend : qx.ui.core.Widget,
  include : [
    qx.ui.core.MExecutable,
    qx.ui.form.MForm
  ],
  implement : [
    qx.ui.form.IExecutable,
    qx.ui.form.IForm,
    qx.ui.form.IDateForm
  ],


  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param date {Date ? null} The initial date to show. If <code>null</code>
   * the current day (today) is shown.
   */
  construct : function(date)
  {
    this.base(arguments);

    // set the layout
    var layout = new qx.ui.layout.VBox();
    this._setLayout(layout);

    // create the child controls
    this._createChildControl("navigation-bar");
    this._createChildControl("date-pane");

    // Support for key events
    this.addListener("keypress", this._onKeyPress);

    // initialize format - moved from statics{} to constructor due to [BUG #7149]
    var DateChooser = qx.ui.control.DateChooser;
    if (!DateChooser.MONTH_YEAR_FORMAT) {
        DateChooser.MONTH_YEAR_FORMAT = qx.locale.Date.getDateTimeFormat("yyyyMMMM", "MMMM yyyy");
    }

    // Show the right date
    var shownDate = (date != null) ? date : new Date();
    this.showMonth(shownDate.getMonth(), shownDate.getFullYear());

    // listen for locale changes
    if (qx.core.Environment.get("qx.dynlocale")) {
      qx.locale.Manager.getInstance().addListener("changeLocale", this._updateDatePane, this);
    }

    // register pointer up and down handler
    this.addListener("pointerdown", this._onPointerUpDown, this);
    this.addListener("pointerup", this._onPointerUpDown, this);

    // @ITG:Wisej: Hide the new month-year-selector when deactivated or hidden.
    this.addListener("disappear", this.showMonthYearSelector.bind(this, false), this);
    this.addListener("deactivated", this.showMonthYearSelector.bind(this, false), this);
  },


  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /**
     * @type {string} The format for the date year label at the top center.
     */
    MONTH_YEAR_FORMAT : null,

    /**
     * @type {string} The format for the weekday labels (the headers of the date table).
     */
    WEEKDAY_FORMAT : "EE",

    /**
     * @type {string} The format for the week numbers (the labels of the left column).
     */
    WEEK_FORMAT : "ww"
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
      init   : "datechooser"
    },

    // @ITG:Wisej: Forcing the width and height to be initialized makes it impossible
    // to properly style the date chooser. It's a lot better to let the layout engine take care of the layout.
    /*
    // overridden
    width :
    {
      refine : true,
      init : 200
    },

    // overridden
    height :
    {
      refine : true,
      init : 150
    },
    */

    /** The currently shown month. 0 = january, 1 = february, and so on. */
    shownMonth :
    {
      check : "Integer",
      init : null,
      nullable : true,
      event : "changeShownMonth"
    },

    /** The currently shown year. */
    shownYear :
    {
      check : "Integer",
      init : null,
      nullable : true,
      event : "changeShownYear"
    },

    /** The date value of the widget. */
    value :
    {
      check : "Date",
      init : null,
      nullable : true,
      event : "changeValue",
      apply : "_applyValue",
      transform: "__limitValue"
    },

    // @ITG:Wisej: Added the "Today" property to let the widget customize what is today's date.
    /** Today's date. */
    today :
    {
      check: "Date",
      init: new Date(),
      apply: "_applyToday"
    },

    // @ITG:Wisej: Added the "MinValue" and "MaxValue: properties to limit the calendar navigation.
    /** MinValue. */
    minValue :
    {
      check: "Date",
      init:  new Date(1,0,1),
      nullable: true,
      apply: "_applyMinMaxValue"
    },

    /** MaxValue. */
    maxValue :
    {
      check: "Date",
      init: new Date(10000,0,1),
      nullable: true,
      apply: "_applyMinMaxValue"
    },

    // @ITG:Wisej: Added "weekStart" property to set the first day of the week. When set to -1 it uses the locale.
    weekStart:
    {
      check: "Integer",
      init:- 1
    }
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __weekdayLabelArr : null,
    __dayLabelArr : null,
    __weekLabelArr : null,


    // overridden
    /**
     * @lint ignoreReferenceField(_forwardStates)
     */
    _forwardStates :
    {
      invalid : true
    },


    /*
    ---------------------------------------------------------------------------
      WIDGET INTERNALS
    ---------------------------------------------------------------------------
    */

    // overridden
    _createChildControlImpl : function(id, hash)
    {
      var control;

      switch(id)
      {
        // NAVIGATION BAR STUFF
        case "navigation-bar":
          control = new qx.ui.container.Composite(new qx.ui.layout.HBox());

          // Add the navigation bar elements
          control.add(this.getChildControl("last-year-button"));
          control.add(this.getChildControl("last-month-button"));
          control.add(this.getChildControl("month-year-label"), {flex: 1});
          control.add(this.getChildControl("next-month-button"));
          control.add(this.getChildControl("next-year-button"));

          this._add(control);
          break;

        // @ITG:Wisej: Use the shared tooltip.
        //case "last-year-button-tooltip":
        //  control = new qx.ui.tooltip.ToolTip(this.tr("Last year"));
        //  break;

        case "last-year-button":
          control = new qx.ui.toolbar.Button();
          control.addState("lastYear");
          control.setFocusable(false);
          // @ITG:Wisej: Use the shared tooltip.
          // control.setToolTip(this.getChildControl("last-year-button-tooltip"));
          control.setToolTipText(this.tr("Last year"));
          control.addListener("tap", this._onNavButtonTap, this);
          break;

        //case "last-month-button-tooltip":
        //  control = new qx.ui.tooltip.ToolTip(this.tr("Last month"));
        //  break;

        case "last-month-button":
          control = new qx.ui.toolbar.Button();
          control.addState("lastMonth");
          control.setFocusable(false);
          // @ITG:Wisej: Use the shared tooltip.
          // control.setToolTip(this.getChildControl("last-month-button-tooltip"));
          control.setToolTipText(this.tr("Last month"));
          control.addListener("tap", this._onNavButtonTap, this);
          break;

        // @ITG:Wisej: Use the shared tooltip.
        //case "next-month-button-tooltip":
        //  control = new qx.ui.tooltip.ToolTip(this.tr("Next month"));
        //  break;

        case "next-month-button":
          control = new qx.ui.toolbar.Button();
          control.addState("nextMonth");
          control.setFocusable(false);
          // @ITG:Wisej: Use the shared tooltip.
          // control.setToolTip(this.getChildControl("next-month-button-tooltip"));
          control.setToolTipText(this.tr("Next month"));
          control.addListener("tap", this._onNavButtonTap, this);
          break;

        // @ITG:Wisej: Use the shared tooltip.
        //case "next-year-button-tooltip":
        //  control = new qx.ui.tooltip.ToolTip(this.tr("Next year"));
        //  break;

        case "next-year-button":
          control = new qx.ui.toolbar.Button();
          control.addState("nextYear");
          control.setFocusable(false);
          // @ITG:Wisej: Use the shared tooltip.
          // control.setToolTip(this.getChildControl("next-year-button-tooltip"));
          control.setToolTipText(this.tr("Next year"));
          control.addListener("tap", this._onNavButtonTap, this);
          break;

        case "month-year-label":
          control = new qx.ui.basic.Label();
          control.setAllowGrowX(true);
          // @ITG:Wisej: Detect clicks on the month-year-label to show the selector.
          // control.setAnonymous(true);
          control.setKeepActive(true);
          control.addListener("pointerup", this.__onMonthYearLabelPointerUpDown, this);
          control.addListener("pointerdown", this.__onMonthYearLabelPointerUpDown, this);
          control.addListener("pointerover", this.__onMonthYearLabelPointerOverOut, this);
          control.addListener("pointerout", this.__onMonthYearLabelPointerOverOut, this);
          break;

        case "week":
          control = new qx.ui.basic.Label();
          control.setAllowGrowX(true);
          control.setAllowGrowY(true);
          control.setSelectable(false);
          control.setAnonymous(true);
          break;

        case "weekday":
          control = new qx.ui.basic.Label();
          control.setAllowGrowX(true);
          control.setAllowGrowY(true);
          control.setSelectable(false);
          control.setAnonymous(true);
          break;

        case "day":
          control = new qx.ui.basic.Label();
          control.setAllowGrowX(true);
          control.setAllowGrowY(true);
          control.addListener("tap", this._onDayTap, this);
          control.addListener("dbltap", this._onDayDblTap, this);
          // @ITG:Wisej: Added "hovered" to the calendar days.
          control.addListener("pointerover", this.__onDayPointerOverOut, this);
          control.addListener("pointerout", this.__onDayPointerOverOut, this);
          break;

        case "date-pane":
          var controlLayout = new qx.ui.layout.Grid()
          control = new qx.ui.container.Composite(controlLayout);

          for (var i = 0; i < 8; i++) {
            controlLayout.setColumnFlex(i, 1);
          }

          for (var i = 0; i < 7; i++) {
            controlLayout.setRowFlex(i, 1);
          }

          // @ITG:Wisej: The weekday column should not resize with the calendar.
          controlLayout.setColumnFlex(0, 0);

          // Create the weekdays
          // Add an empty label as spacer for the week numbers
          var label = this.getChildControl("week#0");
          label.addState("header");
          control.add(label, {column: 0, row: 0});

          this.__weekdayLabelArr = [];
          for (var i=0; i<7; i++)
          {
            label = this.getChildControl("weekday#" + i);
            control.add(label, {column: i + 1, row: 0});
            this.__weekdayLabelArr.push(label);
          }

          // Add the days
          this.__dayLabelArr = [];
          this.__weekLabelArr = [];

          for (var y = 0; y < 6; y++)
          {
            // Add the week label
            var label = this.getChildControl("week#" + (y+1));
            control.add(label, {column: 0, row: y + 1});
            this.__weekLabelArr.push(label);

            // Add the day labels
            for (var x = 0; x < 7; x++)
            {
              var label = this.getChildControl("day#" + ((y*7)+x));
              control.add(label, {column:x + 1, row:y + 1});
              this.__dayLabelArr.push(label);
            }
          }

          // @ITG:Wisej: The date pane should fill the container in order to have a dynamically resizable date chooser.
          this._add(control, { flex: 1 });
          break;

        // @ITG:Wisej: Create the new "month-year-selector"
        case "month-year-selector":
          control = new qx.ui.control.MonthYearSelector(this);
          control.setFocusable(false);
          control.setKeepFocus(true);
          control.exclude();
          this._add(control, { flex: 1 });
          break;
      }

      return control || this.base(arguments, id);
    },

    // @ITG:Wisej: Added the "Today" property to let the widget customize what is today's date.
    _applyToday : function(value, old)
    {
        this._updateDatePane();
    },

    // @ITG:Wisej: Added the "MinValue" and "MaxValue: properties to limit the calendar navigation.
    _applyMinMaxValue: function (value, old)
    {
        this.setValue(this.__limitValue(this.getValue()));
    },

    // @ITG:Wisej: Added the "MinValue" and "MaxValue: properties to limit the calendar navigation.
    // applies the new date constraints to the specified value.
    __limitValue: function(value)
    {
      switch (this._checkLimits(value)) {
        case 1: return this.getMaxValue();
        case -1: return this.getMinValue();
        default: return value;
      }
    },

    /**
     * Checks whether the specified value is between the min/max limits.
     *
     * @param value {Date} the value to check.
     * @return {Integer} -1 when value is below minValue, +1 when value is greater than maxValue, 0 when value is in range.
     */
    _checkLimits: function (value)
    {
        if (value == null)
            return 0;

        var minDate = this.getMinValue();
        var maxDate = this.getMaxValue();
        if (minDate != null && value < minDate)
            return -1;
        if (maxDate != null && value > maxDate)
            return 1;

        return 0;
    },

    // apply methods
    _applyValue : function(value, old)
    {

      if ((value != null) && (this.getShownMonth() != value.getMonth() || this.getShownYear() != value.getFullYear()))
      {
        // The new date is in another month -> Show that month
        this.showMonth(value.getMonth(), value.getFullYear());
      }
      else
      {
        // The new date is in the current month -> Just change the states
        var newDay = (value == null) ? -1 : value.getDate();

        for (var i=0; i<6*7; i++)
        {
          var dayLabel = this.__dayLabelArr[i];

          // @ITG:Wisej: Added the "MinValue" and "MaxValue: properties to limit the calendar navigation.
          // hide the day label if it's outside of the date range.
          if (this._checkLimits(new Date(dayLabel.dateTime)) != 0)
            dayLabel.hide();
          else
            dayLabel.show();

          if (dayLabel.hasState("otherMonth"))
          {
            if (dayLabel.hasState("selected")) {
              dayLabel.removeState("selected");
            }
          }
          else
          {
            var day = parseInt(dayLabel.getValue(), 10);

            if (day == newDay) {
              dayLabel.addState("selected");
            } else if (dayLabel.hasState("selected")) {
              dayLabel.removeState("selected");
            }
          }
        }
      }
    },



    /*
    ---------------------------------------------------------------------------
      EVENT HANDLER
    ---------------------------------------------------------------------------
    */

    /**
     * Handler which stops the propagation of the tap event if
     * the navigation bar or calendar headers will be tapped.
     *
     * @param e {qx.event.type.Pointer} The pointer up / down event
     */
    _onPointerUpDown : function(e) {
      var target = e.getTarget();
      if (target == this.getChildControl("navigation-bar") ||
          target == this.getChildControl("date-pane")) {

        e.stopPropagation();
        return;
      }
    },


    /**
     * Event handler. Called when a navigation button has been tapped.
     *
     * @param evt {qx.event.type.Data} The data event.
     */
    _onNavButtonTap : function(evt)
    {
      var year = this.getShownYear();
      var month = this.getShownMonth();

      switch(evt.getCurrentTarget())
      {
        case this.getChildControl("last-year-button"):
          year--;
          break;

        case this.getChildControl("last-month-button"):
          month--;

          if (month < 0)
          {
            month = 11;
            year--;
          }

          break;

        case this.getChildControl("next-month-button"):
          month++;

          if (month >= 12)
          {
            month = 0;
            year++;
          }

          break;

        case this.getChildControl("next-year-button"):
          year++;
          break;
      }

      this.showMonth(month, year);
    },


    /**
     * Event handler. Called when a day has been tapped.
     *
     * @param e {qx.event.type.Data} The event.
     */
    _onDayTap : function(e)
    {
      var time = e.getCurrentTarget().dateTime;
      this.setValue(new Date(time));
      this.execute();
    },

    /**
     * Event handler. Called when a day has been double-tapped.
     */
    _onDayDblTap : function(e)
    {
      var time = e.getCurrentTarget().dateTime;
      this.setValue(new Date(time));
      this.execute();
    },


    /**
     * Event handler. Called when a key was pressed.
     *
     * @param evt {qx.event.type.Data} The event.
     */
    _onKeyPress : function(evt)
    {
      var dayIncrement = null;
      var monthIncrement = null;
      var yearIncrement = null;

      if (evt.getModifiers() == 0)
      {
        switch(evt.getKeyIdentifier())
        {
          case "Left":
            dayIncrement = -1;
            break;

          case "Right":
            dayIncrement = 1;
            break;

          case "Up":
            dayIncrement = -7;
            break;

          case "Down":
            dayIncrement = 7;
            break;

          case "PageUp":
            monthIncrement = -1;
            break;

          case "PageDown":
            monthIncrement = 1;
            break;

          case "Escape":
            if (this.getValue() != null)
            {
              this.setValue(null);
              return;
            }
            break;

          case "Enter":
          case "Space":
            if (this.getValue() != null) {
              this.execute();
            }
            return;

          // @ITG:Wisej: Show the month/year selector on F2.
          case "F2":
            this.showMonthYearSelector(true);
            return;
        }
      }
      else if (evt.isShiftPressed())
      {
        switch(evt.getKeyIdentifier())
        {
          case "PageUp":
            yearIncrement = -1;
            break;

          case "PageDown":
            yearIncrement = 1;
            break;
        }
      }
      else if (evt.isAltPressed())
      {
        // @ITG:Wisej: Show the month/year selector on Alt+Down.
        switch (evt.getKeyIdentifier()) {

            case "Down":
                this.showMonthYearSelector(true);
                return;
        }
      }

      if (dayIncrement != null || monthIncrement != null || yearIncrement != null)
      {
        var date = this.getValue();

        if (date != null) {
          date = new Date(date.getTime());
        }

        if (date == null) {
          date = new Date();
        }
        else
        {
          if (dayIncrement != null){date.setDate(date.getDate() + dayIncrement);}
          if (monthIncrement != null){date.setMonth(date.getMonth() + monthIncrement);}
          if (yearIncrement != null){date.setFullYear(date.getFullYear() + yearIncrement);}
        }

        this.setValue(date);
      }
    },


    /**
     * Shows a certain month.
     *
     * @param month {Integer ? null} the month to show (0 = january). If not set
     *      the month will remain the same.
     * @param year {Integer ? null} the year to show. If not set the year will
     *      remain the same.
     */
    showMonth : function(month, year)
    {

      // @ITG:Wisej: Added the "MinValue" and "MaxValue: properties to limit the calendar navigation.
      var date = this.__limitValue(new Date(year, month, 1));
      month = date.getMonth();
      year = date.getFullYear();

      if ((month != null && month != this.getShownMonth()) || (year != null && year != this.getShownYear()))
      {
        if (month != null) {
          this.setShownMonth(month);
        }

        if (year != null) {
          this.setShownYear(year);
        }

        this._updateDatePane();

        // @ITG:Wisej: Added "changeShownDate" event, fired after the DateChooser widget has been updated. Otherwise we get two events: changeShownMonth and changeShownYear and
        // both are fired before the DateChooser has been updated.
        this.fireEvent("changeShownDate");
      }
    },


    /**
     * Event handler. Used to handle the key events.
     *
     * @param e {qx.event.type.Data} The event.
     */
    handleKeyPress: function (e) {

      var selector = this.getChildControl("month-year-selector", true);
      if (selector && selector.isVisible())
        selector.handleKeyPress(e);
      else
        this._onKeyPress(e);
    },


    /**
     * Updates the date pane.
     */
    _updateDatePane : function()
    {
      var DateChooser = qx.ui.control.DateChooser;

      // @ITG:Wisej: Added the "Today" property to let the widget customize what is today's date.
      // var today = new Date();
      var today = this.getToday() || new Date();

      var todayYear = today.getFullYear();
      var todayMonth = today.getMonth();
      var todayDayOfMonth = today.getDate();

      var selDate = this.getValue();
      var selYear = (selDate == null) ? -1 : selDate.getFullYear();
      var selMonth = (selDate == null) ? -1 : selDate.getMonth();
      var selDayOfMonth = (selDate == null) ? -1 : selDate.getDate();

      var shownMonth = this.getShownMonth();
      var shownYear = this.getShownYear();

      var startOfWeek = this.getWeekStart() > -1 ? this.getWeekStart() : qx.locale.Date.getWeekStart();

      // Create a help date that points to the first of the current month
      var helpDate = new Date(this.getShownYear(), this.getShownMonth(), 1);

      var monthYearFormat = new qx.util.format.DateFormat(DateChooser.MONTH_YEAR_FORMAT);
      this.getChildControl("month-year-label").setValue(monthYearFormat.format(helpDate));

      // Show the day names
      var firstDayOfWeek = helpDate.getDay();
      var firstSundayInMonth = 1 + ((7 - firstDayOfWeek) % 7);
      var weekDayFormat = new qx.util.format.DateFormat(DateChooser.WEEKDAY_FORMAT);

      for (var i=0; i<7; i++)
      {
        var day = (i + startOfWeek) % 7;

        var dayLabel = this.__weekdayLabelArr[i];

        helpDate.setDate(firstSundayInMonth + day);
        dayLabel.setValue(weekDayFormat.format(helpDate));

        if (qx.locale.Date.isWeekend(day)) {
          dayLabel.addState("weekend");
        } else {
          dayLabel.removeState("weekend");
        }
      }

      // Show the days
      // @ITG:Wisej: Dates without times should consistently use 00:00.
      // helpDate = new Date(shownYear, shownMonth, 1, 12, 0, 0);
      helpDate = new Date(shownYear, shownMonth, 1);
      var nrDaysOfLastMonth = (7 + firstDayOfWeek - startOfWeek) % 7;
      helpDate.setDate(helpDate.getDate() - nrDaysOfLastMonth);

      var weekFormat = new qx.util.format.DateFormat(DateChooser.WEEK_FORMAT);

      for (var week=0; week<6; week++)
      {
        this.__weekLabelArr[week].setValue(weekFormat.format(helpDate));

        for (var i=0; i<7; i++)
        {
          var dayLabel = this.__dayLabelArr[week * 7 + i];

          var year = helpDate.getFullYear();
          var month = helpDate.getMonth();
          var dayOfMonth = helpDate.getDate();

          var isSelectedDate = (selYear == year && selMonth == month && selDayOfMonth == dayOfMonth);

          if (isSelectedDate) {
            dayLabel.addState("selected");
          } else {
            dayLabel.removeState("selected");
          }

          if (month != shownMonth) {
            dayLabel.addState("otherMonth");
          } else {
            dayLabel.removeState("otherMonth");
          }

          var isToday = (year == todayYear && month == todayMonth && dayOfMonth == todayDayOfMonth);

          if (isToday) {
            dayLabel.addState("today");
          } else {
            dayLabel.removeState("today");
          }

          dayLabel.setValue("" + dayOfMonth);
          dayLabel.dateTime = helpDate.getTime();

          // @ITG:Wisej: Added the "MinValue" and "MaxValue: properties to limit the calendar navigation.
          // hide the day label if it's outside of the date range.
          if (this._checkLimits(helpDate) != 0)
            dayLabel.hide();
          else
            dayLabel.show();

          // Go to the next day
          helpDate.setDate(helpDate.getDate() + 1);
        }
      }

      monthYearFormat.dispose();
      weekDayFormat.dispose();
      weekFormat.dispose();
    },

    // @ITG:Wisej: Shows or hides the new "month-year-selector" panel.
    __onMonthYearLabelPointerUpDown: function (e)
    {

        e.stopPropagation();

        if (e.getType() == "pointerup") {

            var selector = this.getChildControl("month-year-selector");
            this.showMonthYearSelector(!selector.isVisible());
        }
    },

    /**
     * Shows or hides the month/year selector.
     * @param show {Boolean} true to show and false to hide.
     */
    showMonthYearSelector: function(show)
    {
        var datePane = this.getChildControl("date-pane");
        var selector = this.getChildControl("month-year-selector");

        if (!show) {

            selector.exclude();
            datePane.show();
            datePane.activate();
        }
        else if (!selector.isVisible()) {

            datePane.exclude();
            selector.show();
            selector.activate();

            selector.addListenerOnce("disappear", function () {

                datePane.show();
                datePane.getLayoutParent().activate();
            });
        }
    },

    __onMonthYearLabelPointerOverOut: function(e)
    {
        var target = e.getTarget();
        e.getType() == "pointerover"
            ? target.addState("hovered")
            : target.removeState("hovered")
    },

    __onDayPointerOverOut: function(e)
    {
        var target = e.getTarget();
        e.getType() == "pointerover"
            ? target.addState("hovered")
            : target.removeState("hovered")
    }

  },


  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    if (qx.core.Environment.get("qx.dynlocale")) {
      qx.locale.Manager.getInstance().removeListener("changeLocale", this._updateDatePane, this);
    }

    this.__weekdayLabelArr = this.__dayLabelArr = this.__weekLabelArr = null;
  }
});
