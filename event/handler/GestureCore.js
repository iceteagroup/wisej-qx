/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2014 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Christopher Zuendorf (czuendorf)
     * Daniel Wagner (danielwagner)

************************************************************************ */

/**
 * Listens for (native or synthetic) pointer events and fires events
 * for gestures like "tap" or "swipe"
 */
qx.Bootstrap.define("qx.event.handler.GestureCore", {
  extend : Object,

  statics : {

    TYPES : ["tap", "swipe", "longtap", "dbltap", "track", "trackstart", "trackend", "rotate", "pinch", "roll"],

    GESTURE_EVENTS : ["gesturebegin", "gesturefinish", "gesturemove", "gesturecancel"],

    /** @type {Map} Maximum distance between a pointer-down and pointer-up event, values are configurable */
    TAP_MAX_DISTANCE : {"touch": 40, "mouse": 5, "pen": 20}, // values are educated guesses

    /** @type {Map} Maximum distance between two subsequent taps, values are configurable */
    DOUBLETAP_MAX_DISTANCE : {"touch": 10, "mouse": 4, "pen": 10}, // values are educated guesses

    /** @type {Map} The direction of a swipe relative to the axis */
    SWIPE_DIRECTION :
    {
      x : ["left", "right"],
      y : ["up", "down"]
    },

    /**
     * @type {Integer} The time delta in milliseconds to fire a long tap event.
     */
    LONGTAP_TIME : 500,

    /**
     * @type {Integer} Maximum time between two tap events that will still trigger a
     * dbltap event.
     */
    DOUBLETAP_TIME : 500,

    /**
     * @type {Integer} Factor which is used for adapting the delta of the mouse wheel
     * event to the roll events,
     */
    ROLL_FACTOR : 18
  },

  /**
   * @param target {Element} DOM Element that should fire gesture events
   * @param emitter {qx.event.Emitter?} Event emitter (used if dispatchEvent
   * is not supported, e.g. in IE8)
   */
  construct : function(target, emitter) {
    this.__defaultTarget = target;
    this.__emitter = emitter;
    this.__gesture = {};
    this.__lastTap = {};
    this.__stopMomentum = {};
    this._initObserver();
  },

  members : {
    __defaultTarget : null,
    __emitter : null,
    __gesture : null,
    __eventName : null,
    __primaryTarget : null,
    __isMultiPointerGesture : null,
    __initialAngle : null,
    __lastTap : null,
    __rollImpulseId : null,
    __stopMomentum : null,
    __initialDistance : null,

    /**
     * Register pointer event listeners
     */
    _initObserver : function() {
      qx.event.handler.GestureCore.GESTURE_EVENTS.forEach(function(gestureType) {
        qxWeb(this.__defaultTarget).on(gestureType, this.checkAndFireGesture, this);
      }.bind(this));

      if (qx.core.Environment.get("engine.name") === "mshtml" &&
        qx.core.Environment.get("browser.documentmode") < 9)
      {
        qxWeb(this.__defaultTarget).on("dblclick", this._onDblClick, this);
      }

      // list to wheel events
      var data = qx.core.Environment.get("event.mousewheel");
      qxWeb(data.target).on(data.type, this._fireRoll, this);
    },


    /**
     * Remove native pointer event listeners.
     */
    _stopObserver : function() {
      qx.event.handler.GestureCore.GESTURE_EVENTS.forEach(function(pointerType) {
        qxWeb(this.__defaultTarget).off(pointerType, this.checkAndFireGesture, this);
      }.bind(this));

      if (qx.core.Environment.get("engine.name") === "mshtml" &&
        qx.core.Environment.get("browser.documentmode") < 9)
      {
        qxWeb(this.__defaultTarget).off("dblclick", this._onDblClick, this);
      }

      var data = qx.core.Environment.get("event.mousewheel");
      qxWeb(data.target).off(data.type, this._fireRoll, this);
    },


    /**
     * Checks if a gesture was made and fires the gesture event.
     *
     * @param domEvent {Event} DOM event
     * @param type {String ? null} type of the event
     * @param target {Element ? null} event target
     */
    checkAndFireGesture : function(domEvent, type, target) {
      if (!type) {
        type = domEvent.type;
      }

      if (!target) {
        target = qx.bom.Event.getTarget(domEvent);
      }

      if (type == "gesturebegin") {
        this.gestureBegin(domEvent, target);
      } else if (type == "gesturemove") {
        this.gestureMove(domEvent, target);
      } else if (type == "gesturefinish") {
        this.gestureFinish(domEvent, target);
      } else if (type == "gesturecancel") {
        this.gestureCancel(domEvent.pointerId);
      }
    },

    /**
     * Helper method for gesture start.
     *
     * @param domEvent {Event} DOM event
     * @param target {Element} event target
     */
    gestureBegin : function(domEvent, target) {
      if (this.__gesture[domEvent.pointerId]) {
        this.__stopLongTapTimer(this.__gesture[domEvent.pointerId]);
        delete this.__gesture[domEvent.pointerId];
      }

      /*
        If the dom event's target or one of its ancestors have
        a gesture handler, we don't need to fire the gesture again
        since it bubbles.
       */
      if (this._hasIntermediaryHandler(target)) {
        return;
      }

      this.__gesture[domEvent.pointerId] = {
        "startTime" : new Date().getTime(),
        "lastEventTime" : new Date().getTime(),
        "startX" : domEvent.clientX,
        "startY" : domEvent.clientY,
        "clientX" : domEvent.clientX,
        "clientY" : domEvent.clientY,
        "velocityX" : 0,
        "velocityY" : 0,
        "target" : target,
        "isTap" : true,
        "isPrimary" : domEvent.isPrimary,
        "longTapTimer" : window.setTimeout(
          this.__fireLongTap.bind(this, domEvent, target),
          qx.event.handler.GestureCore.LONGTAP_TIME
        )
      };

      if(domEvent.isPrimary) {
        this.__isMultiPointerGesture = false;
        this.__primaryTarget = target;
        this.__fireTrack("trackstart", domEvent, target);
      } else {
        this.__isMultiPointerGesture = true;
        if(Object.keys(this.__gesture).length === 2) {
          this.__initialAngle = this._calcAngle();
          this.__initialDistance = this._calcDistance();
        }
      }
    },


    /**
     * Helper method for gesture move.
     *
     * @param domEvent {Event} DOM event
     * @param target {Element} event target
     */
    gestureMove : function(domEvent, target) {
      var gesture = this.__gesture[domEvent.pointerId];

      if (gesture) {
        var oldClientX = gesture.clientX;
        var oldClientY = gesture.clientY;

        gesture.clientX = domEvent.clientX;
        gesture.clientY = domEvent.clientY;
        gesture.lastEventTime = new Date().getTime();

        if(oldClientX) {
          gesture.velocityX = gesture.clientX - oldClientX;
        }
        if(oldClientY) {
          gesture.velocityY = gesture.clientY - oldClientY;
        }

        if (Object.keys(this.__gesture).length === 2) {
          this.__fireRotate(domEvent, gesture.target);
          this.__firePinch(domEvent, gesture.target);
        }

        if(!this.__isMultiPointerGesture) {
          this.__fireTrack("track", domEvent, gesture.target);
          this._fireRoll(domEvent, "touch", gesture.target);
        }

        // abort long tap timer if the distance is too big
        if (gesture.isTap) {
          gesture.isTap = this._isBelowTapMaxDistance(domEvent);
          if (!gesture.isTap) {
            this.__stopLongTapTimer(gesture);
          }
        }
      }
    },


    /**
     * Checks if a DOM element located between the target of a gesture
     * event and the element this handler is attached to has a gesture
     * handler of its own.
     *
     * @param target {Element} The gesture event's target
     * @return {Boolean}
     */
    _hasIntermediaryHandler: function(target) {
      while (target && target !== this.__defaultTarget) {
        if (target.$$gestureHandler) {
          return true;
        }
        target = target.parentNode;
      }
      return false;
    },


    /**
     * Helper method for gesture end.
     *
     * @param domEvent {Event} DOM event
     * @param target {Element} event target
     */
    gestureFinish : function(domEvent, target) {
      // If no start position is available for this pointerup event, cancel gesture recognition.
      if (!this.__gesture[domEvent.pointerId]) {
        return;
      }

      var gesture = this.__gesture[domEvent.pointerId];
      // delete the long tap
      this.__stopLongTapTimer(gesture);

      /*
        If the dom event's target or one of its ancestors have
        a gesture handler, we don't need to fire the gesture again
        since it bubbles.
       */
      if (this._hasIntermediaryHandler(target)) {
        return;
      }

      // always start the roll impulse on the original target
      this.__handleRollImpulse(
        gesture.velocityX,
        gesture.velocityY,
        domEvent,
        gesture.target
      );

      this.__fireTrack("trackend", domEvent, gesture.target);

      if (gesture.isTap) {

        // @ITG:Wisej: This check prevents the table from changing the
        // focused cell when the data in a cell is edited because the
        // cell element (the target) is changed in between the down and up events.
        //if (target !== gesture.target) {
        //  delete this.__gesture[domEvent.pointerId];
        //  return;
        //}

        if (target !== gesture.target && document.body.contains(gesture.target)) {

          // @ITG:Wisej: Before dropping the event check if the real end-target is the same as the begin-target.
          var widget = qx.ui.core.Widget.getWidgetByElement(target);
          for (; widget && widget.isAnonymous(); widget = widget.getLayoutParent());
          var originalWidget = qx.ui.core.Widget.getWidgetByElement(gesture.target);
          for (; originalWidget && originalWidget.isAnonymous(); originalWidget = originalWidget.getLayoutParent());

          if (widget != originalWidget) {
            delete this.__gesture[domEvent.pointerId];
            return;
          }
        }

        this._fireEvent(domEvent, "tap", domEvent.target || target);

        var isDblTap = false;
        if (Object.keys(this.__lastTap).length > 0) {
          // delete old tap entries
          var limit = Date.now() - qx.event.handler.GestureCore.DOUBLETAP_TIME;
          for (var time in this.__lastTap) {

            if (time < limit) {
              delete this.__lastTap[time];
            } else {
              var lastTap = this.__lastTap[time];
              var isBelowDoubleTapDistance = this.__isBelowDoubleTapDistance(
                lastTap.x,
                lastTap.y,
                domEvent.clientX,
                domEvent.clientY,
                domEvent.getPointerType()
              );
              var isSameTarget = lastTap.target === (domEvent.target || target);
              var isSameButton = lastTap.button === domEvent.button;

              if (isBelowDoubleTapDistance && isSameButton && isSameTarget) {
                isDblTap = true;
                delete this.__lastTap[time];
                this._fireEvent(domEvent, "dbltap", domEvent.target || target);
              }
            }
          }
        }

        if (!isDblTap) {
          this.__lastTap[Date.now()] = {
            x: domEvent.clientX,
            y: domEvent.clientY,
            target: domEvent.target || target,
            button: domEvent.button
          };
        }

      } else if (!this._isBelowTapMaxDistance(domEvent)) {
        var swipe = this.__getSwipeGesture(domEvent, target);
        if (swipe) {
          domEvent.swipe = swipe;
          this._fireEvent(domEvent, "swipe", gesture.target || target);
        }
      }

      delete this.__gesture[domEvent.pointerId];
    },


    /**
     * Stops the momentum scrolling currently running.
     *
     * @param id {Integer} The timeoutId of a 'roll' event
     */
    stopMomentum : function(id) {
      this.__stopMomentum[id] = true;
    },


    /**
     * Cancels the gesture if running.
     * @param id {Number} The pointer Id.
     */
    gestureCancel : function(id) {
      if (this.__gesture[id]) {
        this.__stopLongTapTimer(this.__gesture[id]);
        delete this.__gesture[id];
      }
    },


    /**
     * Update the target of a running gesture. This is used in virtual widgets
     * when the DOM element changes.
     *
     * @param id {String} The pointer id.
     * @param target {Element} The new target element.
     * @internal
     */
    updateGestureTarget : function(id, target) {
      this.__gesture[id].target = target;
    },


    /**
     * Method which will be called recursively to provide a momentum scrolling.
     * @param deltaX {Number} The last offset in X direction
     * @param deltaY {Number} The last offset in Y direction
     * @param domEvent {Event} The original gesture event
     * @param target {Element} The target of the momentum roll events
     * @param time {Number ?} The time in ms between the last two calls
     */
    __handleRollImpulse : function(deltaX, deltaY, domEvent, target, time) {
      var oldTimeoutId = domEvent.timeoutId;
      // do nothing if we don't need to scroll
      if ((Math.abs(deltaY) < 1 && Math.abs(deltaX) < 1) || this.__stopMomentum[oldTimeoutId]) {
        delete this.__stopMomentum[oldTimeoutId];
        return;
      }

      if (!time) {
        time = 1;
        var startFactor = 2.8;
        deltaY = deltaY / startFactor;
        deltaX = deltaX / startFactor;
      }
      time += 0.0006;

      deltaY = deltaY / time;
      deltaX = deltaX / time;

      // set up a new timer with the new delta
      var timeoutId = qx.bom.AnimationFrame.request(
        qx.lang.Function.bind(
          function(deltaX, deltaY, domEvent, target, time) {
            this.__handleRollImpulse(deltaX, deltaY, domEvent, target, time);
          },
          this, deltaX, deltaY, domEvent, target, time)
      );

      deltaX = Math.round(deltaX * 100) / 100;
      deltaY = Math.round(deltaY * 100) / 100;

      // scroll the desired new delta
      domEvent.delta = {
        x: -deltaX,
        y: -deltaY
      };

      domEvent.momentum = true;
      domEvent.timeoutId = timeoutId;
      this._fireEvent(domEvent, "roll", domEvent.target || target);
    },


    /**
    * Calculates the angle of the primary and secondary pointer.
    * @return {Number} the rotation angle of the 2 pointers.
    */
    _calcAngle : function() {
      var pointerA = null;
      var pointerB = null;

      for (var pointerId in this.__gesture) {
        var gesture = this.__gesture[pointerId];
        if (pointerA === null) {
          pointerA = gesture;
        } else {
          pointerB = gesture;
        }
      }

      var x = pointerA.clientX - pointerB.clientX;
      var y = pointerA.clientY - pointerB.clientY;

      return (360 + Math.atan2(y, x) * (180/Math.PI)) % 360;
    },


    /**
     * Calculates the scaling distance between two pointers.
     * @return {Number} the calculated distance.
     */
    _calcDistance : function() {
      var pointerA = null;
      var pointerB = null;

      for (var pointerId in this.__gesture) {
        var gesture = this.__gesture[pointerId];
        if (pointerA === null) {
          pointerA = gesture;
        } else {
          pointerB = gesture;
        }
      }

      var scale = Math.sqrt( Math.pow(pointerA.clientX - pointerB.clientX, 2) + Math.pow(pointerA.clientY - pointerB.clientY, 2));
      return scale;
    },


    /**
     * Checks if the distance between the x/y coordinates of DOM event
     * exceeds TAP_MAX_DISTANCE and returns the result.
     *
     * @param domEvent {Event} The DOM event from the browser.
     * @return {Boolean|null} true if distance is below TAP_MAX_DISTANCE.
     */
    _isBelowTapMaxDistance: function(domEvent) {
      var delta = this._getDeltaCoordinates(domEvent);
      var maxDistance = qx.event.handler.GestureCore.TAP_MAX_DISTANCE[domEvent.getPointerType()];
      if (!delta) {
        return null;
      }

      return (Math.abs(delta.x) <= maxDistance &&
              Math.abs(delta.y) <= maxDistance);
    },


    /**
     * Checks if the distance between the x1/y1 and x2/y2 is
     * below the TAP_MAX_DISTANCE and returns the result.
     *
     * @param x1 {Number} The x position of point one.
     * @param y1 {Number} The y position of point one.
     * @param x2 {Number} The x position of point two.
     * @param y2 {Number} The y position of point two.
     * @param type {String} The pointer type e.g. "mouse"
     * @return {Boolean} <code>true</code>, if points are in range
     */
    __isBelowDoubleTapDistance : function(x1, y1, x2, y2, type) {
      var clazz = qx.event.handler.GestureCore;

      var inX = Math.abs(x1 - x2) < clazz.DOUBLETAP_MAX_DISTANCE[type];
      var inY = Math.abs(y1 - y2) < clazz.DOUBLETAP_MAX_DISTANCE[type];

      return inX && inY;
    },


    /**
    * Calculates the delta coordinates in relation to the position on <code>pointerstart</code> event.
    * @param domEvent {Event} The DOM event from the browser.
    * @return {Map} containing the deltaX as x, and deltaY as y.
    */
    _getDeltaCoordinates : function(domEvent) {
      var gesture = this.__gesture[domEvent.pointerId];
      if (!gesture) {
        return null;
      }

      var deltaX = domEvent.clientX - gesture.startX;
      var deltaY = domEvent.clientY - gesture.startY;

      var axis = "x";
      if (Math.abs(deltaX / deltaY) < 1) {
        axis = "y";
      }

      return {
        "x": deltaX,
        "y": deltaY,
        "axis": axis
      };
    },


    /**
     * Fire a gesture event with the given parameters
     *
     * @param domEvent {Event} DOM event
     * @param type {String} type of the event
     * @param target {Element ? null} event target
     */
    _fireEvent : function(domEvent, type, target) {
      // The target may have been removed, e.g. menu hide on tap
      if (!this.__defaultTarget) {
        return;
      }
      var evt;
      if (qx.core.Environment.get("event.dispatchevent")) {
        evt = new qx.event.type.dom.Custom(type, domEvent, {
          bubbles: true,
          swipe: domEvent.swipe,
          scale: domEvent.scale,
          angle: domEvent.angle,
          delta: domEvent.delta,
          pointerType: domEvent.pointerType,
          momentum : domEvent.momentum
        });
        target.dispatchEvent(evt);
      } else if (this.__emitter) {
        evt = new qx.event.type.dom.Custom(type, domEvent, {
          target : this.__defaultTarget,
          currentTarget : this.__defaultTarget,
          srcElement : this.__defaultTarget,
          swipe: domEvent.swipe,
          scale: domEvent.scale,
          angle: domEvent.angle,
          delta: domEvent.delta,
          pointerType: domEvent.pointerType,
          momentum : domEvent.momentum
        });

        this.__emitter.emit(type, domEvent);
      }
    },


    /**
     * Fire "tap" and "dbltap" events after a native "dblclick"
     * event to fix IE 8's broken mouse event sequence.
     *
     * @param domEvent {Event} dblclick event
     */
    _onDblClick : function(domEvent) {
      var target = qx.bom.Event.getTarget(domEvent);
      this._fireEvent(domEvent, "tap", target);
      this._fireEvent(domEvent, "dbltap", target);
    },


    /**
     * Returns the swipe gesture when the user performed a swipe.
     *
     * @param domEvent {Event} DOM event
     * @param target {Element} event target
     * @return {Map|null} returns the swipe data when the user performed a swipe, null if the gesture was no swipe.
     */
    __getSwipeGesture : function(domEvent, target) {
      var gesture = this.__gesture[domEvent.pointerId];
      if (!gesture) {
        return null;
      }

      var clazz = qx.event.handler.GestureCore;
      var deltaCoordinates = this._getDeltaCoordinates(domEvent);
      var duration = new Date().getTime() - gesture.startTime;
      var axis = (Math.abs(deltaCoordinates.x) >= Math.abs(deltaCoordinates.y)) ? "x" : "y";
      var distance = deltaCoordinates[axis];
      var direction = clazz.SWIPE_DIRECTION[axis][distance < 0 ? 0 : 1];
      var velocity = (duration !== 0) ? distance / duration : 0;

      var swipe = {
        startTime: gesture.startTime,
        duration: duration,
        axis: axis,
        direction: direction,
        distance: distance,
        velocity: velocity
      };

      return swipe;
    },


    /**
     * Fires a track event.
     *
     * @param type {String} the track type
     * @param domEvent {Event} DOM event
     * @param target {Element} event target
     */
    __fireTrack : function(type, domEvent, target) {
      domEvent.delta = this._getDeltaCoordinates(domEvent);
      this._fireEvent(domEvent, type, domEvent.target || target);
    },


    /**
     * Fires a roll event.
     *
     * @param domEvent {Event} DOM event
     * @param type {String} The type of the dom event
     * @param target {Element} event target
     */
    _fireRoll : function(domEvent, type, target) {
      if (domEvent.type === qx.core.Environment.get("event.mousewheel").type) {
        domEvent.delta = {
          x: qx.util.Wheel.getDelta(domEvent, "x") * qx.event.handler.GestureCore.ROLL_FACTOR,
          y: qx.util.Wheel.getDelta(domEvent, "y") * qx.event.handler.GestureCore.ROLL_FACTOR
        };
        domEvent.delta.axis = Math.abs(domEvent.delta.x / domEvent.delta.y) < 1 ? "y" : "x";
        domEvent.pointerType = "wheel";
      } else {
        var gesture = this.__gesture[domEvent.pointerId];
        domEvent.delta = {
          x: -gesture.velocityX,
          y: -gesture.velocityY,
          axis : Math.abs(gesture.velocityX / gesture.velocityY) < 1 ? "y" : "x"
        };
      }

      this._fireEvent(domEvent, "roll", domEvent.target || target);
    },


    /**
     * Fires a rotate event.
     *
     * @param domEvent {Event} DOM event
     * @param target {Element} event target
     */
    __fireRotate : function(domEvent, target) {
      if(!domEvent.isPrimary) {
        var angle = this._calcAngle();
        domEvent.angle = Math.round((angle - this.__initialAngle) % 360);
        this._fireEvent(domEvent, "rotate", this.__primaryTarget);
      }
    },


    /**
     * Fires a pinch event.
     *
     * @param domEvent {Event} DOM event
     * @param target {Element} event target
     */
    __firePinch: function(domEvent, target) {
      if (!domEvent.isPrimary) {
        var distance = this._calcDistance();
        var scale = distance / this.__initialDistance;
        domEvent.scale = (Math.round(scale * 100) / 100);
        this._fireEvent(domEvent, "pinch", this.__primaryTarget);
      }
    },


    /**
     * Fires the long tap event.
     *
     * @param domEvent {Event} DOM event
     * @param target {Element} event target
     */
    __fireLongTap : function(domEvent, target) {
      var gesture = this.__gesture[domEvent.pointerId];
      if (gesture) {
        this._fireEvent(domEvent, "longtap", domEvent.target || target);
        gesture.longTapTimer = null;
        gesture.isTap = false;
      }
    },


    /**
     * Stops the time for the long tap event.
     * @param gesture {Map} Data may representing the gesture.
     */
    __stopLongTapTimer : function(gesture) {
      if (gesture.longTapTimer) {
        window.clearTimeout(gesture.longTapTimer);
        gesture.longTapTimer = null;
      }
    },

    /**
     * Checks if the distance between the x/y coordinates of touchstart/mousedown and touchmove/mousemove event
     * exceeds TAP_MAX_DISTANCE and returns the result.
     *
     * @param event {Event} The event from the browser.
     * @return {Boolean} true if distance is below TAP_MAX_DISTANCE.
     */
    isBelowTapMaxDistance: function(event) {
      var deltaCoordinates = this._calcDelta(event);
      var clazz = qx.event.handler.GestureCore;

      return (Math.abs(deltaCoordinates.x) <= clazz.TAP_MAX_DISTANCE &&
              Math.abs(deltaCoordinates.y) <= clazz.TAP_MAX_DISTANCE);
    },


    /**
     * Dispose the current instance
     */
    dispose : function() {
      for(var gesture in this.__gesture) {
        this.__stopLongTapTimer(gesture);
      }

      this._stopObserver();
      this.__defaultTarget = this.__emitter = null;
    }
  }
});
