/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Gianluca Pivato (Ice Tea Group LLC)

************************************************************************ */

/**
 * The MonthYearSelector  works in conjunction with the qx.ui.control.DateChooser widget
 * to help the user select a month or a year without having to click the month/year navigation
 * buttons multiple times.
 *
 * This widget shows two columns, the left column contains a list of months, while
 * the right column contains a list of years and two navigation buttons that change
 * the range of the displayed years.
 *
 * @childControl separator {qx.ui.core.Widget} separator between the month and year columns
 * @childControl month {qx.ui.basic.Label} displays the name of the month to select
 * @childControl year {qx.ui.basic.Label} displays the year value to select
 * @childControl prev-year {qx.ui.form.Button} button to change the range of the displayed years
 * @childControl next-year {qx.ui.form.Button} button to change the range of the displayed years
  */
qx.Class.define("qx.ui.control.MonthYearSelector", {

    extend: qx.ui.container.Composite,

    construct: function (owner) {

        this.__owner = owner;
        this.__yearTapped = false;
        this.__monthTapped = false;
        this.__focusedLabel = null;

        var layout = new qx.ui.layout.Grid();

        // we'll always show 6 rows: Jan-Feb, etc.
        layout.setRowFlex(0, 1);
        layout.setRowFlex(1, 1);
        layout.setRowFlex(2, 1);
        layout.setRowFlex(3, 1);
        layout.setRowFlex(4, 1);
        layout.setRowFlex(5, 1);

        // we'll always show 5 columns: Jan, Feb, Separator, Year, Year.
        layout.setColumnFlex(0, 1);
        layout.setColumnFlex(1, 1);
        layout.setColumnFlex(2, 0); // this is the separator.
        layout.setColumnFlex(3, 1);
        layout.setColumnFlex(4, 1);

        layout.setColumnAlign(0, "center", "middle");
        layout.setColumnAlign(1, "center", "middle");
        layout.setColumnAlign(2, "center", "middle");
        layout.setColumnAlign(3, "center", "middle");
        layout.setColumnAlign(4, "center", "middle");

        this.base(arguments, layout);

        this._createChildControl("separator");
        this._createChildControl("close");
        this._createChildControl("prev-year");
        this._createChildControl("next-year");

        this.addListener("appear", this.__onLoad, this);
        this.addListener("keypress", this.__onKeyPress, this);

        // prevent the pointer events from reaching the parent, in case
        // this is being shown in a popup.
        this.addListener("roll", this.__stopPropagation, this);
        this.addListener("pointerup", this.__stopPropagation, this);
        this.addListener("pointerdown", this.__stopPropagation, this);

        // initialize the minimum and maximum values.
        this.__minDate = this.__owner.getMinValue() || new Date(1, 0, 1);
        this.__maxDate = this.__owner.getMaxValue() || new Date(10000, 0, 1);
    },

    members: {

        _forwardStates: {
            hovered: true
        },

        // the DateChooser that owns this selector.
        __owner: null,

        // the currently selected month and year labels.
        __currentYear: null,
        __currentMonth: null,

        // maps the year value to the label.
        __yearToLabelMap: null,

        // year and month tapped flags: the selector closes automatically
        // when the user changes the month and the year;
        __yearTapped: false,
        __monthTapped: false,

        // the currently focused month or year label.
        __focusedLabel: null,

        // the minimum and maximum selectable dates.
        __minDate: null,
        __maxDate: null,

        /**
         * Closes the selector.
         *
         * @param commit {Boolean} When true the value is committed.
         */
        close: function (commit) {

            this.exclude();

            if (commit && this.__currentYear && this.__currentMonth) {

                var newShownMonth = this.__currentMonth.getUserData("month");
                var newShownYear = this.__currentYear.getUserData("year");

                // fire only one of "changeShownMonth" or "changeShownYear".
                if (this.__owner.getShownMonth() != newShownMonth
                    && this.__owner.getShownYear() != newShownYear) {
                    // for the value of the month property without firing the change event.
                    qx.util.PropertyUtil.setUserValue(this.__owner, "shownMonth", newShownMonth)
                }

                this.__owner.showMonth(newShownMonth, newShownYear);
            }
        },

        // populates the list of months and years when the selector is shown.
        __onLoad: function (e) {

            this.activate();

            this.__yearTapped = false;
            this.__monthTapped = false;

            this.__populateMonths();
            this.__populateYears(this.__owner.getShownYear() - 4);
            this.__setCurrentSelection(this.__owner.getShownMonth(), this.__owner.getShownYear());
            this.__focusedLabel = this.__currentMonth;

        },

        getSizeHint: function (compute) {

            return this.__owner.getChildControl("date-pane").getSizeHint();

        },

        /**
         * Listener method for "pointerover" event
         * <ul>
         * <li>Adds state "hovered"</li>
         * <li>Removes "abandoned" and adds "pressed" state (if "abandoned" state is set)</li>
         * </ul>
         *
         * @param e {Event} Mouse event
         */
        _onPointerOver: function (e) {

            if (!this.isEnabled())
                return;

            e.getTarget().addState("hovered");
        },

        /**
         * Listener method for "pointerout" event
         * <ul>
         * <li>Removes "hovered" state</li>
         * <li>Adds "abandoned" and removes "pressed" state (if "pressed" state is set)</li>
         * </ul>
         *
         * @param e {Event} Mouse event
         */
        _onPointerOut: function (e) {

            if (!this.isEnabled())
                return;

            e.getTarget().removeState("hovered");
        },

        // fill the list of months.
        __populateMonths: function () {

            var monthFormat = new qx.util.format.DateFormat("MMM");
            var firstTime = !this.getChildControl("month#0", true);

            for (var m = 0; m < 12; m++) {

                var helpDate = new Date(1, m);
                var monthLabel = this.getChildControl("month#" + m);
                monthLabel.setUserData("month", m);
                monthLabel.setValue(monthFormat.format(helpDate));

                if (firstTime)
                    this.add(monthLabel, { row: (m / 2) | 0, column: m % 2 });
            }
        },

        // fill the list of years.
        __populateYears: function (start) {

            var minYear = this.__minDate.getFullYear();
            var maxYear = this.__maxDate.getFullYear();
            var currentYear = this.__owner.getShownYear();

            start = Math.max(minYear, start);
            var end = Math.min(maxYear + 1, start + 10);
            var yearFormat = new qx.util.format.DateFormat("yyyy");

            this.__yearToLabelMap = {};

            for (var i = 0; i < 10; i++) {
                this._excludeChildControl("year#" + i);
            }

            for (var y = start, i = 0; y < end; y++) {

                var helpDate = new Date(y, 1);
                var yearLabel = this.getChildControl("year#" + i);

                yearLabel.show();
                yearLabel.setUserData("year", y);
                yearLabel.setValue(yearFormat.format(helpDate));
                yearLabel.removeState("selected");

                if (y == currentYear)
                    yearLabel.addState("selected");

                this.__yearToLabelMap[y] = yearLabel;

                i++;
            }
        },

        __setCurrentSelection: function (month, year) {

            if (this.__currentMonth)
                this.__currentMonth.removeState("selected");

            if (this.__currentYear)
                this.__currentYear.removeState("selected");

            if (year != null)
                this.__currentYear = this.__yearToLabelMap[year];

            if (month != null)
                this.__currentMonth = this.getChildControl("month#" + month);

            if (this.__currentMonth)
                this.__currentMonth.addState("selected");
            if (this.__currentYear)
                this.__currentYear.addState("selected");
        },

        /**
         * Create the child today widget.
         */
        _createChildControlImpl: function (id, hash) {
            var control;

            switch (id) {

                case "separator":
                    control = new qx.ui.core.Widget();
                    control.setAnonymous(true);
                    control.setFocusable(false);
                    this.add(control, { row: 0, column: 2, rowSpan: 6 });
                    break;

                case "month":
                    control = new qx.ui.basic.Label();
                    control.setFocusable(false);
                    control.addListener("tap", this.__onMonthTap, this);
                    control.addListener("pointerover", this._onPointerOver, this);
                    control.addListener("pointerout", this._onPointerOut, this);
                    break;

                case "year":
                    control = new qx.ui.basic.Label();
                    control.setFocusable(false);
                    control.addListener("tap", this.__onYearTap, this);
                    control.addListener("pointerover", this._onPointerOver, this);
                    control.addListener("pointerout", this._onPointerOut, this);
                    control.exclude();
                    var pos = parseInt(hash) || 0;
                    this.add(control, { row: 1 + (pos % 5) | 0, column: 3 + (pos < 5 ? 0 : 1) });
                    break;

                case "navigation-bar":
                    control = new qx.ui.container.Composite(new qx.ui.layout.HBox());
                    control.setAnonymous(true);
                    this.add(control, { row: 0, column: 3, colSpan: 2 });
                    break;

                case "close":
                    control = new qx.ui.form.Button();
                    control.setFocusable(false);
                    control.addListener("execute", this.__onCloseTap, this);
                    this.getChildControl("navigation-bar").addAt(control, 2, { flex: 1 });
                    break;

                case "prev-year":
                    control = new qx.ui.form.RepeatButton();
                    control.setFocusable(false);
                    control.addListener("execute", this.__onPrevYearExecute, this);
                    this.getChildControl("navigation-bar").addAt(control, 0, { flex: 1 });
                    break;

                case "next-year":
                    control = new qx.ui.form.RepeatButton();
                    control.setFocusable(false);
                    control.addListener("execute", this.__onNextYearExecute, this);
                    this.getChildControl("navigation-bar").addAt(control, 1, { flex: 1 });
                    break;
            }

            return control || this.base(arguments, id);
        },

        /**
         * Event handler. Used to handle the key events.
         *
         * @param e {qx.event.type.Data} The event.
         */
        handleKeyPress: function (e) {
            this.__onKeyPress(e);
        },

        __onKeyPress: function (e) {

            switch (e.getKeyIdentifier()) {

                case "Escape":
                    this.close(false);
                    e.stop();
                    break;

                case "Enter":
                    this.close(true);
                    e.stop();
                    break;

                case "Up":
                    this.__moveActiveYear(-1);
                    e.stop();
                    break

                case "Down":
                    this.__moveActiveYear(1);
                    e.stop();
                    break

                case "Left":
                    this.__moveActiveMonth(-1, 0);
                    e.stop();
                    break

                case "Right":
                    this.__moveActiveMonth(1, 0);
                    e.stop();
                    break
            }

        },

        // changes the currently selected year.
        __moveActiveYear: function (delta) {

            var year = this.__currentYear.getUserData("year");
            var month = this.__currentMonth.getUserData("month");

            var minYear = this.__minDate.getFullYear();
            var maxYear = this.__maxDate.getFullYear();
            year = Math.min(maxYear, Math.max(minYear, year + delta));

            var topYear = this.getChildControl("year#0").getUserData("year")
            var bottomYear = this.getChildControl("year#9").getUserData("year")

            // scroll years left or right?
            if (year < topYear) {
                this.__populateYears(year);
            }
            else if (year > bottomYear) {
                this.__populateYears(year - 9);
            }

            this.__setCurrentSelection(month, year);
        },

        // changes the currently selected month.
        __moveActiveMonth: function (delta) {

            var year = this.__currentYear.getUserData("year");
            var month = this.__currentMonth.getUserData("month");

            month += delta;
            if (month < 0) month = 11;
            if (month > 11) month = 0;

            this.__setCurrentSelection(month, year);
        },

        __stopPropagation: function (e) {

            e.stopPropagation();
        },

        __onCloseTap: function () {
            this.close(true);
        },

        __onMonthTap: function (e) {

            this.__monthTapped = true;
            this.__setCurrentSelection(e.getTarget().getUserData("month"), null);
            if (this.__yearTapped)
                this.close(true);
        },

        __onYearTap: function (e) {

            this.__yearTapped = true;
            this.__setCurrentSelection(null, e.getTarget().getUserData("year"));
            if (this.__monthTapped)
                this.close(true);
        },

        __onPrevYearExecute: function (e) {

            var minYear = this.__minDate.getFullYear();
            var year = this.getChildControl("year#0").getUserData("year") - 10;
            this.__populateYears(Math.max(year, minYear));
        },

        __onNextYearExecute: function (e) {

            var maxYear = this.__maxDate.getFullYear();
            var year = this.getChildControl("year#0").getUserData("year") + 10;
            this.__populateYears(Math.min(year, maxYear));
        }
    }
});

