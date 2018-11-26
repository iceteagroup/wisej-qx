
/**
 * qx.Application
 *
 * Application class - loaded at bootstrap time.
 *
 * This class prepares the default (transparent) standalone root
 * and forwards the calls to the qx.main(), qx.close(), qx.terminate() and qx.finalize().
 *
 */
qx.Class.define("qx.Application",
{
    extend: qx.application.Standalone,

    members:
    {
        main: function () {

            // call super class.
            this.base(arguments);

            if (qx && qx.main)
                qx.main.call(this);
        },

        close: function () {

            // call super class.
            this.base(arguments);

            if (qx && qx.close)
                qx.close.call(this);
        },

        finalize: function () {

            // call super class.
            this.base(arguments);

            if (qx && qx.finalize)
                qx.finalize.call(this);
        },

        terminate: function () {

            // call super class.
            this.base(arguments);

            if (qx && qx.terminate)
                qx.terminate.call(this);
        },

        /**
         * Sets the value of the specified option.
         *
         * @param option {String} Name of the option to set.
         * @param value {Object} New value of the option.
         */
        setOption: function (option, value) {

            qx.core.Environment.getChecks()[option] = undefined;
            qx.core.Environment.invalidateCacheKey(option);
            qx.core.Environment.add(option, value);

        },

        /**
         * Returns the application's routing.
         *
         * @return {qx.application.Routing} The application's routing.
         */
        getRouting: function () {

            if (!this.__routing) {
                this.__routing = new qx.application.Routing();
            }
            return this.__routing;
        },
        __routing: null,


        /**
         * Creates the application's root widget. Override this function to create
         * your own root widget.
         *
         * @return {qx.ui.root.Application} The application's root widget.
         */
        _createRootWidget: function () {
            return new qx.ui.root.Application(document);
        },
    }
});
