/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)
     * Jonathan Weiß (jonathan_rass)

************************************************************************ */

// @ITG:Wisej: This class has been changed to fix the problems caused by storing the cell coordinates
// instead of the item index. When using cell coordinates a simple resize of the pane messes up the selection!

/**
 * EXPERIMENTAL!
 *
 * Cell selection manager
 *
 */
qx.Class.define("qx.ui.virtual.selection.CellRectangle",
{
    extend: qx.ui.virtual.selection.Abstract,


    /*
    *****************************************************************************
       MEMBERS
    *****************************************************************************
    */

    members:
    {
        /**
         * Returns the number of all items in the pane. This number may contain
         * unselectable items as well.
         *
         * @return {Integer} number of items
         */
        _getItemCount: function () {
            return this._pane.getRowConfig().getItemCount() * this._pane.getColumnConfig().getItemCount();
        },


        /*
        ---------------------------------------------------------------------------
          IMPLEMENT ABSTRACT METHODS
        ---------------------------------------------------------------------------
        */

        // overridden
        _getSelectableFromPointerEvent: function (event) {

            var cell = this._pane.getCellAtPosition(
              event.getDocumentLeft(),
              event.getDocumentTop()
            );

            if (!cell)
                return null;

            var columnCount = this._pane.getColumnConfig().getItemCount();
            var index = cell.row * columnCount + cell.column;

            return this._isSelectable(index) ? index : null;
        },


        // overridden
        getSelectables: function (all) {
            var selectables = [];

            var rowCount = this._pane.getRowConfig().getItemCount();
            var columnCount = this._pane.getColumnConfig().getItemCount();

            for (var row = 0; row < rowCount; row++) {
                for (var column = 0; column < columnCount; column++) {
                    var index = row * columnCount + column;
                    if (this._isSelectable(index)) {
                        selectables.push(index);
                    }
                }
            }

            return selectables;
        },


        // overridden
        _getSelectableRange: function (item1, item2) {

        	var columnCount = this._pane.getColumnConfig().getItemCount();

        	var index1 = item1;
        	var index2 = item2;
        	var row1 = (index1 / columnCount) | 0;
        	var column1 = index1 - (row1 * columnCount);
        	var row2 = (index2 / columnCount) | 0;
        	var column2 = index2 - (row2 * columnCount);

            var selectables = [];

            var minRow = Math.min(row1, row2);
            var maxRow = Math.max(row1, row2);
            var minColumn = Math.min(column1, column2);
            var maxColumn = Math.max(column1, column2);

            for (var row = minRow; row <= maxRow; row++) {
            	for (var column = minColumn; column <= maxColumn; column++) {
            		var index = row * columnCount + column;
            		if (this._isSelectable(index)) {
            			selectables.push(index);
            		}
            	}
            }
            return selectables;



        },


        // overridden
        _getFirstSelectable: function () {
            var rowCount = this._pane.getRowConfig().getItemCount();
            var columnCount = this._pane.getColumnConfig().getItemCount();

            for (var row = 0; row < rowCount; row++) {
                for (var column = 0; column < columnCount; column++) {
                    var index = row * columnCount + column;
                    if (this._isSelectable(index)) {
						return index;
                    }
                }
            }

            return null;
        },


        // overridden
        _getLastSelectable: function () {
            var rowCount = this._pane.getRowConfig().getItemCount();
            var columnCount = this._pane.getColumnConfig().getItemCount();

            for (var column = columnCount - 1; column >= 0; column--) {
                for (var row = rowCount - 1; row >= 0; row--) {
                    var index = row * columnCount + column;
                    if (this._isSelectable(index)) {
						return index;
                    }
                }
            }

            return null;
        },


        // overridden
        _getRelatedSelectable: function (item, relation) {

            var columnCount = this._pane.getColumnConfig().getItemCount();
            var index = item;
            var row = (index / columnCount) | 0;
            var column = index - (row * columnCount);

            switch (relation) {
                case "above":
                    for (var row = row - 1; row >= 0; row--) {
                        index = row * columnCount + column;
                        if (this._isSelectable(index)) {
                            return index;
                        }
                    }
                    break;

                case "under":
                    var rowCount = this._pane.getRowConfig().getItemCount();
                    for (var row = row + 1; row < rowCount; row++) {
                        index = row * columnCount + column;
                        if (this._isSelectable(index)) {
                            return index;
                        }
                    }
                    break;

                case "left":
                    for (var column = column - 1; column >= 0; column--) {
                        index = row * columnCount + column;
                        if (this._isSelectable(index)) {
                            return index;
                        }
                    }
                    break;

                case "right":
                    for (var column = column + 1; column < columnCount; column++) {
                        index = row * columnCount + column;
                        if (this._isSelectable(index)) {
                            return index;
                        }
                    }
                    break;
            }
            return null;
        },


        // overridden
        _getPage: function (lead, up) {
            if (up) {
                return this._getFirstSelectable();
            } else {
                return this._getLastSelectable();
            }
        },


        // overridden
        _selectableToHashCode: function (item) {
            return item;
        },


        // overridden
        _scrollItemIntoView: function (item) {
            if (this._autoScrollIntoView) {

                var columnCount = this._pane.getColumnConfig().getItemCount();
                var index = item;
                var row = (index / columnCount) | 0;
                var column = index - (row * columnCount);

                this._pane.scrollCellIntoView(column, row);
            }
        },


        // overridden
        _getSelectableLocationX: function (item) {
            var columnConfig = this._pane.getColumnConfig();

            var columnCount = columnConfig.getItemCount();
            var index = item;
            var row = (index / columnCount) | 0;
            var column = index - (row * columnCount);

            var itemLeft = columnConfig.getItemPosition(column);
            var itemRight = itemLeft + columnConfig.getItemSize(column) - 1;

            return {
                left: itemLeft,
                right: itemRight
            };
        },


        // overridden
        _getSelectableLocationY: function (item) {
            var rowConfig = this._pane.getRowConfig();
            var columnConfig = this._pane.getColumnConfig();

            var columnCount = columnConfig.getItemCount();
            var index = item;
            var row = (index / columnCount) | 0;
            var column = index - (row * columnCount);

            var itemTop = rowConfig.getItemPosition(row);
            var itemBottom = itemTop + rowConfig.getItemSize(row) - 1;

            return {
                top: itemTop,
                bottom: itemBottom
            };
        }
    }
});
