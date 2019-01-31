/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2015 Ice Tea Group LLC, http://wisej.com
     2004-2010 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     MIT: https://opensource.org/licenses/MIT
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Gianluca Pivato (Ice Tea Group LLC)

************************************************************************ */

// @ITG:Wisej: Added support for custom css strings in the theme decorators.

/**
 * A decorator featuring full CSS3 strings. It allows a theme to
 * define completely custom CSS3 strings for a widget/state combination.
 * This new decorator is useful to add pseudo elements (:before, :after, etc.) and other
 * complex features in order to expand qooxdoo's theme capabilities.
 *
 * To be used responsibly!
 *
 * This mixin is usually used by {@link qx.ui.decoration.Decorator}.
 */
qx.Mixin.define("qx.ui.decoration.MStyleSheet", {

    properties: {
        /*
        ---------------------------------------------------------------------------
          PROPERTY: TRANSFORM
        ---------------------------------------------------------------------------
        */

        /** the CSS3 string definition */
        css: {
            init: null,
            check: "String",
            apply: "_applyStyleSheet"
        }
    },


    members: {

        // cached parse CSS rules.
        __css: null,

        /**
         * Merges in the custom css string to the stylesheet.
         * This is the needed behavior for {@link qx.ui.decoration.Decorator}.
         *
         * @param styles {Map} A map to add the styles.
         */
        _styleStyleSheet: function (styles) {
            // merge and override existing rules.
            var css = this.__css;
            if (css) {

                // iterate the properties: convert px values and resolve the themed values.
                css = this.__resolveValues(css);

                // merge with the styles that we got passed in the decorator chain.
                qx.lang.Object.mergeWith(styles, css, true);
            }
        },

        __resolveValues: function (css) {

            var styles = {};
            var imgLoader = qx.io.ImageLoader;
            var aliasMgr = qx.util.AliasManager.getInstance();
            var resMgr = qx.util.ResourceManager.getInstance();
            var colorMgr = qx.theme.manager.Color.getInstance();

            // resolve and remove the fillColor value, it's not a valid CSS style.
            var fillColor = css["fillColor"] || css["fill-color"];
            if (fillColor)
            {
                delete css["fillColor"];
                delete css["fill-color"];
                fillColor = colorMgr.resolve(fillColor);
            }

            var value = null;
            var important = false;
            for (var name in css) {

                value = css[name];

                // preserve "!important".
                important = false;
                if (typeof value === "string") {
                    important = qx.lang.String.endsWith(value, " !important");
                    if (important)
                        value = value.substring(0, value.length - 11);
                }

                // inner object? probably a pseudo element.
                if (qx.Bootstrap.isObject(value)) {

                    value = this.__resolveValues(value);
                }
                else if (name === "color" || qx.lang.String.endsWith(name, "Color") || qx.lang.String.endsWith(name, "-color")) {

                    value = colorMgr.resolve(value);
                }
                else if (name === "image" || qx.lang.String.endsWith(name, "Image") || qx.lang.String.endsWith(name, "-image")) {

                    // resolve the image name, apply the fill color, if specified, and
                    // and change the css value to a valid url().
                    var source = aliasMgr.resolve(value);
                    source = resMgr.toUri(source);

                    if (source && fillColor && imgLoader.getFormat(source) === "svg") {

                        // load the image directly (no callbacks) since it must be a data uri or preloaded.
                        imgLoader.load(source);
                        var svg = imgLoader.getSvg(source);
                        if (svg) {
                            // the image is loaded, changed the color and proceed.
                            svg = qx.ui.basic.Image.setSvgColor(svg, fillColor);
                            source = qx.ui.basic.Image.getSvgDataUri(svg);
                        }
                    }

                    value = "url(\"" + source + "\")";
                }
                else if (name === "content") {

                    if (!qx.lang.String.startsWith(value, "'") && !qx.lang.String.startsWith(value, '"'))
                        value = "'" + value + "'";
                }

                if (important)
                    value += " !important";

                styles[qx.bom.Style.getCssName(name)] = value;
            }

            return styles;
        },

        /*
        ---------------------------------------------------------------------------
          PROPERTY APPLY ROUTINES
        ---------------------------------------------------------------------------
        */

        // property apply
        _applyStyleSheet: function (value) {
            if (qx.core.Environment.get("qx.debug")) {
                if (this._isInitialized()) {
                    throw new Error("This decorator is already in-use. Modification is not possible anymore!");
                }
            }
            else {
                try {
                    if (value) {
                        this.__css = JSON.parse(value);
                    }
                    else {
                        this.__css = null;
                    }
                }
                catch (ex) {
                    throw new Error("The CSS value is invalid: " + ex.message);
                }
            }
        }
    }
});
