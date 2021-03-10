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

************************************************************************ */

/**
 * This singleton is used to manager multiple instances of popups and their
 * state.
 */
qx.Class.define("qx.ui.popup.Manager",
{
  type : "singleton",
  extend : qx.core.Object,



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    this.base(arguments);

    // Create data structure, use an array because order matters [BUG #4323]
    this.__objects = [];

    // Register pointerdown handler
    qx.event.Registration.addListener(document.documentElement, "pointerdown",
                                      this.__onPointerDown, this, true);

    // Hide all popups on window blur
    qx.bom.Element.addListener(window, "blur", this.hideAll, this);
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __objects : null,


    /**
     * Registers a visible popup.
     *
     * @param obj {qx.ui.popup.Popup} The popup to register
     */
    add : function(obj)
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        if (!(obj instanceof qx.ui.popup.Popup)) {
          throw new Error("Object is no popup: " + obj);
        }
      }

      this.__objects.push(obj);
      this.__updateIndexes();
    },


    /**
     * Removes a popup from the registry
     *
     * @param obj {qx.ui.popup.Popup} The popup which was excluded
     */
    remove : function(obj)
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        if (!(obj instanceof qx.ui.popup.Popup)) {
          throw new Error("Object is no popup: " + obj);
        }
      }

      qx.lang.Array.remove(this.__objects, obj);
      this.__updateIndexes();
    },


    /**
     * Excludes all currently open popups,
     * except those with {@link qx.ui.popup.Popup#autoHide} set to false.
     */
    hideAll : function()
    {
      var l = this.__objects.length, current = {};

      while (l--) {
        current = this.__objects[l];
        if (current.getAutoHide())
         current.exclude();
      }
    },




    /*
    ---------------------------------------------------------------------------
      INTERNAL HELPER
    ---------------------------------------------------------------------------
    */

    /**
     * Updates the zIndex of all registered items to push
     * newly added ones on top of existing ones
     *
     */
    __updateIndexes : function()
    {
      // @ITG:Wisej: Menus should have a z-index higher than popups. Changed 1e7 to 1e6 here and 1e6 to 1e7 in the menu manager.
      var min = 1e6;
      for (var i = 0; i < this.__objects.length; i++) {
        this.__objects[i].setZIndex(min++);
      }
    },




    /*
    ---------------------------------------------------------------------------
      EVENT HANDLER
    ---------------------------------------------------------------------------
    */

    /**
     * Event handler for pointer down events
     *
     * @param e {qx.event.type.Pointer} Pointer event object
     */
    __onPointerDown : function(e)
    {
      // Get the corresponding widget of the target since we are dealing with
      // DOM elements here. This is necessary because we have to be aware of
      // Inline applications which are not covering the whole document and
      // therefore are not able to get all pointer events when only the
      // application root is monitored.
      var target = qx.ui.core.Widget.getWidgetByElement(e.getTarget());

      // @ITG:Wisej: Invert the iteration or it skips the last popup when
      // hiding more then one open popup.
      var reg = this.__objects;
      for (var i = reg.length-1; i >= 0; i--)
      {
        var obj = reg[i];

        if (!obj.getAutoHide() || target == obj || qx.ui.core.Widget.contains(obj, target)) {
          continue;
        }

        // @ITG:Wisej: Let the popup decide whether it should auto close or not.
        if (!obj.canAutoHide(target))
          continue;

        // @ITG:Wisej: Check whether the target is in a menu which is opened by a widget in a popup.
        for (var menu = target; menu != null; menu = menu.getLayoutParent()) {
          if (menu instanceof qx.ui.menu.Menu) {
            target = menu.getOpener();
            break;
          }
        }

        // @ITG:Wisej: Check whether the target is hosted in a popup, otherwise when a ComboBox or a DateField are in a 
        // popup, selecting an item or a date closes the popup.
        var skip = false;
        for (var parent = target; parent != null; parent = parent.getLayoutParent()) {

          if (parent instanceof qx.ui.popup.Popup) {
              skip = true;
              break;
          }
        }
        if (skip)
            continue;

        obj.exclude();
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
    qx.event.Registration.removeListener(document.documentElement, "pointerdown",
                                         this.__onPointerDown, this, true);

    this._disposeArray("__objects");
  }
});
