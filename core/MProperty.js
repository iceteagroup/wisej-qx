/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2011 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * This mixin offers the basic property features which include generic
 * setter, getter and resetter.
 */
qx.Mixin.define("qx.core.MProperty",
{
  members :
  {
    /**
     * Sets multiple properties at once by using a property list or
     * sets one property and its value by the first and second argument.
     * As a fallback, if no generated property setter could be found, a
     * handwritten setter will be searched and invoked if available.
     *
     * @param data {Map | String} a map of property values. The key is the name of the property.
     * @param value {var?} the value, only used when <code>data</code> is a string.
     * @return {Object} this instance.
     * @throws {Error} if a property defined does not exist
     */
    set : function(data, value)
    {
      if (qx.Bootstrap.isString(data)) {

        // @ITG:Wisej: Speed improvement, use the indexer only once.
        var method = this["set" + qx.Bootstrap.firstUp(data)];
        if (method == undefined) {
            throw new Error("No such property: " + data);
        }

        return method.call(this, value);
      }
      else {

        for (var prop in data) {

            // @ITG:Wisej: Speed improvement, use the indexer only once.
            var method = this["set" + qx.Bootstrap.firstUp(prop)];

            if (method == undefined) {
                throw new Error("No such property: " + prop);
            }

            method.call(this, data[prop]);
        }

        return this;
      }
    },


    /**
     * Returns the value of the given property. If no generated getter could be
     * found, a fallback tries to access a handwritten getter.
     *
     * @param prop {String} Name of the property.
     * @return {var} The value of the value
     * @throws {Error} if a property defined does not exist
     */
    get: function (prop)
    {
        // @ITG:Wisej: Speed improvement, use the indexer only once.
        var method = this["get" + qx.Bootstrap.firstUp(prop)]

        if (method == undefined) {
            throw new Error("No such property: " + prop);
        }

        return method.call(this, prop);
    },


    /**
     * Resets the value of the given property. If no generated resetter could be
     * found, a handwritten resetter will be invoked, if available.
     *
     * @param prop {String} Name of the property.
     * @throws {Error} if a property defined does not exist
     */
    reset: function (prop)
    {
        // @ITG:Wisej: Speed improvement, use the indexer only once.
        var method = this["reset" + qx.Bootstrap.firstUp(prop)];

        if (method == undefined) {
            throw new Error("No such property: " + prop);
        }

        method.call(this, prop);
    }
  }
});
