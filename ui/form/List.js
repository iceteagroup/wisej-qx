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
     * Andreas Ecker (ecker)
     * Martin Wittemann (martinwittemann)
     * Christian Hagendorn (chris_schmidt)

************************************************************************ */

/**
 * A list of items. Displays an automatically scrolling list for all
 * added {@link qx.ui.form.ListItem} instances. Supports various
 * selection options: single, multi, ...
 */
qx.Class.define("qx.ui.form.List",
{
  extend : qx.ui.core.scroll.AbstractScrollArea,
  implement : [
    qx.ui.core.IMultiSelection,
    qx.ui.form.IForm,
    qx.ui.form.IModelSelection
  ],
  include : [
    qx.ui.core.MRemoteChildrenHandling,
    qx.ui.core.MMultiSelectionHandling,
    qx.ui.form.MForm,
    qx.ui.form.MModelSelection
  ],


  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param horizontal {Boolean?false} Whether the list should be horizontal.
   */
  construct : function(horizontal)
  {
    this.base(arguments);

    // Create content
    this.__content = this._createListItemContainer();

    // Used to fire item add/remove events
    this.__content.addListener("addChildWidget", this._onAddChild, this);
    this.__content.addListener("removeChildWidget", this._onRemoveChild, this);

    // Add to scrollpane
    this.getChildControl("pane").add(this.__content);

    // Apply orientation
    if (horizontal) {
      this.setOrientation("horizontal");
    } else {
      this.initOrientation();
    }

    // Add keypress listener
    this.addListener("keypress", this._onKeyPress);
    this.addListener("keyinput", this._onKeyInput);

    // initialize the search string
    this.__pressedString = "";
  },


  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */


  events :
  {
    /**
     * This event is fired after a list item was added to the list. The
     * {@link qx.event.type.Data#getData} method of the event returns the
     * added item.
     */
    addItem : "qx.event.type.Data",

    /**
     * This event is fired after a list item has been removed from the list.
     * The {@link qx.event.type.Data#getData} method of the event returns the
     * removed item.
     */
    removeItem : "qx.event.type.Data"
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
      init : "list"
    },

    // overridden
    focusable :
    {
      refine : true,
      init : true
    },

    /**
     * Whether the list should be rendered horizontal or vertical.
     */
    orientation :
    {
      check : ["horizontal", "vertical"],
      init : "vertical",
      apply : "_applyOrientation"
    },

    /** Spacing between the items */
    spacing :
    {
      check : "Integer",
      init : 0,
      apply : "_applySpacing",
      themeable : true
    },

    /** Controls whether the inline-find feature is activated or not */
    enableInlineFind :
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
    __pressedString : null,
    __lastKeyPress : null,

    /** @type {qx.ui.core.Widget} The children container */
    __content : null,

    /** @type {Class} Pointer to the selection manager to use */
    SELECTION_MANAGER : qx.ui.core.selection.ScrollArea,


    /*
    ---------------------------------------------------------------------------
      WIDGET API
    ---------------------------------------------------------------------------
    */


    // overridden
    getChildrenContainer : function() {
      return this.__content;
    },

    /**
     * Handle child widget adds on the content pane
     *
     * @param e {qx.event.type.Data} the event instance
     */
    _onAddChild : function(e) {
      this.fireDataEvent("addItem", e.getData());
    },

    /**
     * Handle child widget removes on the content pane
     *
     * @param e {qx.event.type.Data} the event instance
     */
    _onRemoveChild : function(e) {
      this.fireDataEvent("removeItem", e.getData());
    },


    /*
    ---------------------------------------------------------------------------
      PUBLIC API
    ---------------------------------------------------------------------------
    */


    /**
     * Used to route external <code>keypress</code> events to the list
     * handling (in fact the manager of the list)
     *
     * @param e {qx.event.type.KeySequence} KeyPress event
     */
    handleKeyPress : function(e)
    {
      if (!this._onKeyPress(e)) {
        this._getManager().handleKeyPress(e);
      }
    },



    /*
    ---------------------------------------------------------------------------
      PROTECTED API
    ---------------------------------------------------------------------------
    */

    /**
     * This container holds the list item widgets.
     *
     * @return {qx.ui.container.Composite} Container for the list item widgets
     */
    _createListItemContainer : function() {
      return new qx.ui.container.Composite;
    },

    /*
    ---------------------------------------------------------------------------
      PROPERTY APPLY ROUTINES
    ---------------------------------------------------------------------------
    */


    // property apply
    _applyOrientation: function(value, old) {

      var content = this.__content;

      // save old layout for disposal
      var oldLayout = content.getLayout();

      // Create new layout
      var horizontal = value === "horizontal";
      var layout = horizontal
        ? new qx.ui.layout.HBox()
        : new qx.ui.layout.VBox();

      // Configure content
      content.setLayout(layout);
      content.setAllowGrowX(!horizontal);
      content.setAllowGrowY(horizontal);

      // Configure spacing
      this._applySpacing(this.getSpacing());

      // dispose old layout
      if (oldLayout) {
          oldLayout.dispose();
      }
    },

    // property apply
    _applySpacing : function(value, old) {
      this.__content.getLayout().setSpacing(value);
    },


    /*
    ---------------------------------------------------------------------------
      EVENT HANDLER
    ---------------------------------------------------------------------------
    */


    /**
     * Event listener for <code>keypress</code> events.
     *
     * @param e {qx.event.type.KeySequence} KeyPress event
     * @return {Boolean} Whether the event was processed
     */
    _onKeyPress : function(e)
    {
      // Execute action on press <ENTER>
      if (e.getKeyIdentifier() == "Enter" && !e.isAltPressed())
      {
        var items = this.getSelection();
        for (var i=0; i<items.length; i++) {
          items[i].fireEvent("action");
        }

        return true;
      }

      return false;
    },


    /*
    ---------------------------------------------------------------------------
      FIND SUPPORT
    ---------------------------------------------------------------------------
    */


    /**
     * Handles the inline find - if enabled
     *
     * @param e {qx.event.type.KeyInput} key input event
     */
    _onKeyInput : function(e)
    {
      // do nothing if the find is disabled
      if (!this.getEnableInlineFind()) {
        return;
      }

      // @ITG:Wisej: Change behavior in multi selection by setting
      // the lead item instead of selecting the item.
      var multi = false;
      var mode = this.getSelectionMode();
      if (mode !== "single" && mode !== "one")
        multi = true;

      // Reset string after a second of non pressed key
      if (((new Date).valueOf() - this.__lastKeyPress) > 1000) {
        this.__pressedString = "";
      }

      // Combine keys the user pressed to a string
      this.__pressedString += e.getChar();

      // @ITG:Wisej: Use the currently selected item to start the search.
      var startIndex = -1;
      if (multi) {
        startIndex = this.indexOf(this._getManager().getLeadItem());
      }
      else {
        var selection = this.getSelection();
        if (selection && selection.length > 0)
          startIndex = this.indexOf(selection[0]);
      }

      // Find matching item
      var matchedItem = this.findItemByLabelFuzzy(this.__pressedString, startIndex);

      // if an item was found, select it
      if (matchedItem) {

        // @ITG:Wisej: Change behavior in multi selection by setting the lead item.
        if (multi) {
          this._getManager()._setLeadItem(matchedItem);
          this._getManager()._scrollItemIntoView(matchedItem);
        }
        else {
          this.setSelection([matchedItem]);
        }
      }

      // @ITG:Wisej: Stop default processing of the key input char when an item has been found or we may get the char appended to the input text.
      e.stop();

      // Store timestamp
      this.__lastKeyPress = (new Date).valueOf();
    },

    // @ITG:Wisej: Added startIndex to start from the specified index.
    /**
     * Takes the given string and tries to find a ListItem
     * which starts with this string. The search is not case sensitive and the
     * first found ListItem will be returned. If there could not be found any
     * qualifying list item, null will be returned.
     *
     * @param search {String} The text with which the label of the ListItem should start with
     * @param startIndex {Integer} The index to start the search from
     * @return {qx.ui.form.ListItem} The found ListItem or null
     */
    findItemByLabelFuzzy : function(search, startIndex)
    {
      // lower case search text
      search = search.toLowerCase();

      // get all items of the list
      var items = this.getChildren();

      // go through all items
      startIndex = Math.max(0, Math.min(startIndex + 1 || 0, items.length));
      for (var i = startIndex, l = items.length; i < l; i++) {

        // get the label of the current item
        var currentLabel = this._getItemText(items[i]);

        // if the label fits with the search text (ignore case, begins with)
        if (currentLabel && currentLabel.toLowerCase().indexOf(search) === 0)
        {
          // just return the first found element
          return items[i];
        }
      }

      // wrap?
      if (startIndex > 0) {
        for (var i = 0, l = startIndex; i < l; i++) {
          // get the label of the current item
          var currentLabel = this._getItemText(items[i]);

          // if the label fits with the search text (ignore case, begins with)
          if (currentLabel && currentLabel.toLowerCase().indexOf(search) === 0) {
            // just return the first found element
            return items[i];
          }
        }
      }

      // if no element was found, return null
      return null;
    },

    /**
     * Find an item by its {@link qx.ui.basic.Atom#getLabel}.
     *
     * @param search {String} A label or any item
     * @param ignoreCase {Boolean?true} description
     * @return {qx.ui.form.ListItem} The found ListItem or null
     */
    findItem : function(search, ignoreCase)
    {
      // lowercase search
      if (ignoreCase !== false) {
        search = search.toLowerCase();
      }

      // get all items of the list
      var items = this.getChildren();
      var item;

      // go through all items
      for (var i=0, l=items.length; i<l; i++)
      {
        item = items[i];

        // @ITG:Wisej: Search the label text, whether it's html or not.
        var label = this._getItemText(item);

        if (label != null) {
          if (label.translate) {
            label = label.translate();
          }
          if (ignoreCase !== false) {
            label = label.toLowerCase();
          }

          if (label.toString() === search.toString()) {
            return item;
          }
        }
      }

      return null;
    },

    // @ITG:Wisej: Added method to normalize the text returned by child items.
    /**
     * Overridable method to return the text of an item for one
     * of the search methods: findItem and findItemByLabelFuzzy.
     *
     * @param item {Widget} the widget item for which to return plain text.
     */
    _getItemText: function (item) {

      var text = null;

      if (item) {
        text = item.getLabel() || "";
        text = qx.bom.String.toText(text);
      }

      return text;
    }
  },


  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function() {
    this._disposeObjects("__content");
  }
});
