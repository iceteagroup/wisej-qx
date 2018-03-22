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

   ======================================================================

   This class contains code based on the following work:

   * jQuery
     http://jquery.com
     Version 1.3.1

     Copyright:
       2009 John Resig

     License:
       MIT: http://www.opensource.org/licenses/mit-license.php

   * Underscore.js
     http://underscorejs.org

     Copyright:
       2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors

     License:
       MIT: http://www.opensource.org/licenses/mit-license.php

************************************************************************ */

/**
 * Static helper functions for arrays with a lot of often used convenience
 * methods like <code>remove</code> or <code>contains</code>.
 *
 * The native JavaScript Array is not modified by this class. However,
 * there are modifications to the native Array in {@link qx.lang.normalize.Array} for
 * browsers that do not support certain JavaScript features natively .
 *
 * @ignore(qx.data)
 * @ignore(qx.data.IListData)
 * @ignore(qx.Class.*)
 * @require(qx.lang.normalize.Date)
 */
qx.Bootstrap.define("qx.lang.Array",
{
  statics :
  {
    /**
     * Converts an array like object to any other array like
     * object.
     *
     * Attention: The returned array may be same
     * instance as the incoming one if the constructor is identical!
     *
     * @param object {var} any array-like object
     * @param constructor {Function} constructor of the new instance
     * @param offset {Integer?0} position to start from
     * @return {Array} the converted array
     */
    cast : function(object, constructor, offset)
    {
      if (object.constructor === constructor) {
        return object;
      }

      if (qx.data && qx.data.IListData) {
        if (qx.Class && qx.Class.hasInterface(object, qx.data.IListData)) {
          var object = object.toArray();
        }
      }


      // Create from given constructor
      var ret = new constructor;

      // Some collections in mshtml are not able to be sliced.
      // These lines are a special workaround for this client.
      if ((qx.core.Environment.get("engine.name") == "mshtml"))
      {
        if (object.item)
        {
          for (var i=offset||0, l=object.length; i<l; i++) {
            ret.push(object[i]);
          }

          return ret;
        }
      }

      // Copy over items
      if (Object.prototype.toString.call(object) === "[object Array]" && offset == null) {
        ret.push.apply(ret, object);
      } else {
        ret.push.apply(ret, Array.prototype.slice.call(object, offset||0));
      }

      return ret;
    },


    /**
     * Convert an arguments object into an array.
     *
     * @param args {arguments} arguments object
     * @param offset {Integer?0} position to start from
     * @return {Array} a newly created array (copy) with the content of the arguments object.
     */
    fromArguments : function(args, offset) {
      return Array.prototype.slice.call(args, offset||0);
    },


    /**
     * Convert a (node) collection into an array
     *
     * @param coll {var} node collection
     * @return {Array} a newly created array (copy) with the content of the node collection.
     */
    fromCollection : function(coll)
    {
      // The native Array.slice cannot be used with some Array-like objects
      // including NodeLists in older IEs
      if ((qx.core.Environment.get("engine.name") == "mshtml"))
      {
        if (coll.item)
        {
          var arr = [];
          for (var i=0, l=coll.length; i<l; i++) {
            arr[i] = coll[i];
          }

          return arr;
        }
      }

      return Array.prototype.slice.call(coll, 0);
    },


    /**
     * Expand shorthand definition to a four element list.
     * This is an utility function for padding/margin and all other shorthand handling.
     *
     * @param input {Array} arr with one to four elements
     * @return {Array} an arr with four elements
     */
    fromShortHand : function(input)
    {
      var len = input.length;
      var result = qx.lang.Array.clone(input);

      // Copy Values (according to the length)
      switch(len)
      {
        case 1:
          result[1] = result[2] = result[3] = result[0];
          break;

        case 2:
          result[2] = result[0];
          // no break here

        case 3:
          result[3] = result[1];
      }

      // Return list with 4 items
      return result;
    },


    /**
     * Return a copy of the given array
     *
     * @param arr {Array} the array to copy
     * @return {Array} copy of the array
     */
    clone : function(arr) {
      return arr.concat();
    },


    /**
     * Insert an element at a given position into the array
     *
     * @param arr {Array} the array
     * @param obj {var} the element to insert
     * @param i {Integer} position where to insert the element into the array
     * @return {Array} the array
     */
    insertAt : function(arr, obj, i)
    {
      // @ITG:Wisej: Added fast adding of last element.
      i = i || 0;
      if (i >= arr.length) {
          arr.push(obj);
      } else if (i == 0) {
        arr.unshift(obj);
      }
      else {
        arr.splice(i, 0, obj);
      }

      return arr;
    },


    /**
     * Insert an element into the array before a given second element.
     *
     * @param arr {Array} the array
     * @param obj {var} object to be inserted
     * @param obj2 {var} insert obj1 before this object
     * @return {Array} the array
     */
    insertBefore : function(arr, obj, obj2)
    {
      // @ITG:Wisej: Replaced for speed.
      // var i = arr.indexOf(obj2);
      //if (i == -1) {
      //  arr.push(obj);
      //} else {
      //  arr.splice(i, 0, obj);
      //}
      //return arr;
      return qx.lang.Array.insertAt(arr, obj, qx.lang.Array.indexOf(arr, obj2));
    },


    /**
     * Insert an element into the array after a given second element.
     *
     * @param arr {Array} the array
     * @param obj {var} object to be inserted
     * @param obj2 {var} insert obj1 after this object
     * @return {Array} the array
     */
    insertAfter : function(arr, obj, obj2)
    {
      // @ITG:Wisej: Replaced for speed.
      // var i = arr.indexOf(obj2);
      //if (i == -1 || i == (arr.length - 1)) {
      //  arr.push(obj);
      //} else {
      //  arr.splice(i + 1, 0, obj);
      //}
      //return arr;
      var i = qx.lang.Array.indexOf(arr, obj2);
      if (i == -1 || i == arr.lengh - 1) {
          arr.push(obj);
      } else {
          qx.lang.Array.insertAt(arr, obj, i + 1);
      }
      return arr;
    },


    /**
     * Remove an element from the array at the given index
     *
     * @param arr {Array} the array
     * @param i {Integer} index of the element to be removed
     * @return {var} The removed element.
     */
    removeAt: function (arr, i) {

      // @ITG:Wisej: Added fast removal of last element.
      // return arr.splice(i, 1)[0];
      i = i || 0;
      var last = arr.length - 1;
      var removed = arr[last];
      if (i == last) {
          arr.length = last;
      }
      else if (i == 0) {
        arr.shift();
      }
      else {
        arr.splice(i, 1);
      }
      return removed;
    },

    // @ITG:Wisej: Added fast method to remove an element without shifting the entire array. Used by the event manager.
    /**
     * Removes an element from the array at the given index
     * without closing the gap. The last element is moved
     * to take the space of the removed element.
     *
     * @param arr {Array} the array
     * @param i {Integer} index of the element to be removed
     * @return {var} The removed element.
     */
    popAt : function (arr, i) {

      i = i || 0;
      var last = arr.length - 1;
      if (i < 0 || i > last)
        return;

      var element = arr[i];

      if (i == 0) {
        arr.shift();
      }
      else {
      	arr[i] = arr[last];
        arr.length--;
      }

      return element;
    },


  	// @ITG:Wisej: Added fast method to move an element with in an array.
  	/**
     * Moves an element in array at the given index
     * to the specified destination index.
     *
     * @param arr {Array} the array
     * @param from {Integer} index of the element to move.
     * @param to {Integer} destination index of the element.
     */
    move: function (arr, from, to)
    {
      to = to || 0;
      from = from || 0;
      var len = arr.length;

      if (from < 0 || from >= len)
          return;

      var element = arr[from];
      if (to == from)
          return element;

      if (to > len)
          to = len - 1;
      if (to < 0)
          to = 0;

      if (from < to) {
        for (var i = from; i < to; i++) {
            arr[i] = arr[i+1];
        }
        arr[to] = element;
      }
      else {
        for (var i = from; i > to; i--) {
            arr[i] = arr[i - 1];
        }
        arr[to] = element;
      }

      return element;
    },


    /**
     * Remove all elements from the array
     *
     * @param arr {Array} the array
     * @return {Array} empty array
     */
    removeAll : function(arr)
    {
      arr.length = 0;
      return this;
    },


    /**
     * Append the elements of an array to the array
     *
     * @param arr1 {Array} the array
     * @param arr2 {Array} the elements of this array will be appended to other one
     * @return {Array} The modified array.
     * @throws {Error} if one of the arguments is not an array
     */
    append : function(arr1, arr2)
    {
      // this check is important because opera throws an uncatchable error if apply is called without
      // an arr as second argument.
      if (qx.core.Environment.get("qx.debug"))
      {
        qx.core.Assert && qx.core.Assert.assertArray(arr1, "The first parameter must be an array.");
        qx.core.Assert && qx.core.Assert.assertArray(arr2, "The second parameter must be an array.");
      }

      Array.prototype.push.apply(arr1, arr2);
      return arr1;
    },


    /**
     * Modifies the first array as it removes all elements
     * which are listed in the second array as well.
     *
     * @param arr1 {Array} the array
     * @param arr2 {Array} the elements of this array will be excluded from the other one
     * @return {Array} The modified array.
     * @throws {Error} if one of the arguments is not an array
     */
    exclude : function(arr1, arr2)
    {
      // this check is important because opera throws an uncatchable error if apply is called without
      // an arr as second argument.
      if (qx.core.Environment.get("qx.debug"))
      {
        qx.core.Assert && qx.core.Assert.assertArray(arr1, "The first parameter must be an array.");
        qx.core.Assert && qx.core.Assert.assertArray(arr2, "The second parameter must be an array.");
      }

      for (var i=0, il=arr2.length, index; i<il; i++)
      {
        index = arr1.indexOf(arr2[i]);
        if (index != -1) {
          arr1.splice(index, 1);
        }
      }

      return arr1;
    },


    /**
     * Remove an element from the array.
     *
     * @param arr {Array} the array
     * @param obj {var} element to be removed from the array
     * @return {var} the removed element
     */
    remove : function(arr, obj)
    {
      // @ITG:Wisej: Replaced for speed.
      var i = qx.lang.Array.indexOf(arr, obj);
      if (i != -1)
        return qx.lang.Array.removeAt(arr, i);
    },


    /**
     * Whether the array contains the given element
     *
     * @param arr {Array} the array
     * @param obj {var} object to look for
     * @return {Boolean} whether the arr contains the element
     */
    contains : function(arr, obj) {

      // @ITG:Wisej: Replaced for speed.
      return qx.lang.Array.indexOf(arr, obj) !== -1;
    },


    // @ITG:Wisej: Added fast indexOf.
    /**
     * The index of the given element in the array.
     *
     * @param arr {Array} the array
     * @param obj {var} object to look for
     * @return {Integer} index of the element, or -1 if not found.
     */
    indexOf : function (arr, obj) {

      for (var i = 0, len = arr.length; i < len ; i++) {
        if (arr[i] === obj)
          return i;
      }
      return -1;
    },

    /**
     * Check whether the two arrays have the same content. Checks only the
     * equality of the arrays' content.
     *
     * @param arr1 {Array} first array
     * @param arr2 {Array} second array
     * @return {Boolean} Whether the two arrays are equal
     */
    equals : function(arr1, arr2)
    {
      var length = arr1.length;

      if (length !== arr2.length) {
        return false;
      }

      for (var i=0; i<length; i++)
      {
        if (arr1[i] !== arr2[i]) {
          return false;
        }
      }

      return true;
    },


    /**
     * Returns the sum of all values in the given array. Supports
     * numeric values only.
     *
     * @param arr {Number[]} Array to process
     * @return {Number} The sum of all values.
     */
    sum : function(arr)
    {
      var result = 0;
      for (var i=0, l=arr.length; i<l; i++) {
        if (arr[i] != undefined) {
          result += arr[i];
        }
      }

      return result;
    },


    /**
     * Returns the highest value in the given array. Supports
     * numeric values only.
     *
     * @param arr {Number[]} Array to process
     * @return {Number | null} The highest of all values or undefined if array is empty.
     */
    max : function(arr)
    {
      if (qx.core.Environment.get("qx.debug")) {
        qx.core.Assert && qx.core.Assert.assertArray(arr, "Parameter must be an array.");
      }

      var i, len=arr.length, result = arr[0];

      for (i = 1; i < len; i++)
      {
        if (arr[i] > result) {
          result = arr[i];
        }
      }

      return result === undefined ? null : result;
    },


    /**
     * Returns the lowest value in the given array. Supports
     * numeric values only.
     *
     * @param arr {Number[]} Array to process
     * @return {Number | null} The lowest of all values or undefined if array is empty.
     */
    min : function(arr)
    {
      if (qx.core.Environment.get("qx.debug")) {
        qx.core.Assert && qx.core.Assert.assertArray(arr, "Parameter must be an array.");
      }

      var i, len=arr.length, result = arr[0];

      for (i = 1; i < len; i++)
      {
        if (arr[i] < result) {
          result = arr[i];
        }
      }

      return result === undefined ? null : result;
    },


    /**
     * Recreates an array which is free of all duplicate elements from the original.
     *
     * This method does not modify the original array!
     *
     * Keep in mind that this methods deletes undefined indexes.
     *
     * @param arr {Array} Incoming array
     * @return {Array} Returns a copy with no duplicates
     */
    unique: function(arr)
    {
      var ret=[], doneStrings={}, doneNumbers={}, doneObjects={};
      var value, count=0;
      var key = "qx" + Date.now();
      var hasNull=false, hasFalse=false, hasTrue=false;

      // Rebuild array and omit duplicates
      for (var i=0, len=arr.length; i<len; i++)
      {
        value = arr[i];

        // Differ between null, primitives and reference types
        if (value === null)
        {
          if (!hasNull)
          {
            hasNull = true;
            ret.push(value);
          }
        }
        else if (value === undefined)
        {
          // pass
        }
        else if (value === false)
        {
          if (!hasFalse)
          {
            hasFalse = true;
            ret.push(value);
          }
        }
        else if (value === true)
        {
          if (!hasTrue)
          {
            hasTrue = true;
            ret.push(value);
          }
        }
        else if (typeof value === "string")
        {
          if (!doneStrings[value])
          {
            doneStrings[value] = 1;
            ret.push(value);
          }
        }
        else if (typeof value === "number")
        {
          if (!doneNumbers[value])
          {
            doneNumbers[value] = 1;
            ret.push(value);
          }
        }
        else
        {
          var hash = value[key];

          if (hash == null) {
            hash = value[key] = count++;
          }

          if (!doneObjects[hash])
          {
            doneObjects[hash] = value;
            ret.push(value);
          }
        }
      }

      // Clear object hashs
      for (var hash in doneObjects)
      {
        try
        {
          delete doneObjects[hash][key];
        }
        catch(ex)
        {
          try
          {
            doneObjects[hash][key] = null;
          }
          catch(ex1)
          {
            throw new Error("Cannot clean-up map entry doneObjects[" + hash + "][" + key + "]");
          }
        }
      }

      return ret;
    },

    /**
     * Returns a new array with integers from start to stop incremented or decremented by step.
     *
     * @param start {Integer} start of the new array, defaults to 0
     * @param stop {Integer} stop of the new array
     * @param step {Integer} increment / decrement - depends whether you use positive or negative values
     * @return {Array} Returns a new array with integers
     */
    range : function(start, stop, step)
    {
      if (arguments.length <= 1) {
        stop = start || 0;
        start = 0;
      }
      step = arguments[2] || 1;

      var length = Math.max(Math.ceil((stop - start) / step), 0);
      var idx = 0;
      var range = Array(length);

      while (idx < length) {
        range[idx++] = start;
        start += step;
      }

      return range;
    }
  }
});
