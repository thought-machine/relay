/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule RelayGarbageCollector
 * 
 */

'use strict';

var _classCallCheck3 = _interopRequireDefault(require('babel-runtime/helpers/classCallCheck'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * @internal
 *
 * Provides methods to track the number of references to registered records and
 * remove un-referenced records from Relay's cache.
 */

var RelayGarbageCollector = function () {
  function RelayGarbageCollector(storeData, scheduler) {
    (0, _classCallCheck3['default'])(this, RelayGarbageCollector);

    this._activeHoldCount = 0;
    this._collectionQueue = [];
    this._isCollecting = false;
    this._isScheduled = false;
    this._refCounts = {};
    this._scheduler = scheduler;
    this._storeData = storeData;
  }

  RelayGarbageCollector.prototype.register = function register(dataID) {
    if (!this._refCounts.hasOwnProperty(dataID)) {
      this._refCounts[dataID] = 0;
    }
  };

  RelayGarbageCollector.prototype.incrementReferenceCount = function incrementReferenceCount(dataID) {
    // Inlined `register` since this is a reasonably hot code path.
    if (!this._refCounts.hasOwnProperty(dataID)) {
      this._refCounts[dataID] = 0;
    }
    this._refCounts[dataID]++;
  };

  RelayGarbageCollector.prototype.decrementReferenceCount = function decrementReferenceCount(dataID) {
    if (!this._refCounts.hasOwnProperty(dataID) || this._refCounts[dataID] <= 0) {
      require('fbjs/lib/warning')(false, 'RelayGarbageCollector: Expected id `%s` be referenced before being ' + 'unreferenced.', dataID);
      this._refCounts[dataID] = 0;
      return;
    }
    this._refCounts[dataID]--;
  };

  /**
   * Notify the collector that GC should be put on hold/paused. The hold can be
   * released by calling the returned callback.
   *
   * Example use cases:
   * - In-flight queries may have been diffed against cached records that are
   *   unreferenced and eligible for GC. If these records were collected there
   *   would be insufficient data in the cache to render.
   * - There may be a gap between a query response being processed and rendering
   *   the component that initiated the fetch. If records were collected there
   *   would be insufficient data in the cache to render.
   */


  RelayGarbageCollector.prototype.acquireHold = function acquireHold() {
    var _this = this;

    var isReleased = false;
    this._activeHoldCount++;
    return {
      release: function () {
        require('fbjs/lib/invariant')(!isReleased, 'RelayGarbageCollector: hold can only be released once.');
        require('fbjs/lib/invariant')(_this._activeHoldCount > 0, 'RelayGarbageCollector: cannot decrease hold count below zero.');
        isReleased = true;
        _this._activeHoldCount--;
        if (_this._activeHoldCount === 0) {
          _this._scheduleCollection();
        }
      }
    };
  };

  /**
   * Schedules a collection starting at the given record.
   */


  RelayGarbageCollector.prototype.collectFromNode = function collectFromNode(dataID) {
    if (this._refCounts[dataID] === 0) {
      this._collectionQueue.push(dataID);
      this._scheduleCollection();
    }
  };

  /**
   * Schedules a collection for any currently unreferenced records.
   */


  RelayGarbageCollector.prototype.collect = function collect() {
    var _this2 = this;

    require('fbjs/lib/forEachObject')(this._refCounts, function (refCount, dataID) {
      if (refCount === 0) {
        _this2._collectionQueue.push(dataID);
      }
    });
    this._scheduleCollection();
  };

  RelayGarbageCollector.prototype._scheduleCollection = function _scheduleCollection() {
    var _this3 = this;

    if (this._isScheduled) {
      return;
    }
    this._isScheduled = true;
    require('fbjs/lib/resolveImmediate')(function () {
      _this3._isScheduled = false;
      _this3._processQueue();
    });
  };

  RelayGarbageCollector.prototype._processQueue = function _processQueue() {
    var _this4 = this;

    if (this._isCollecting || this._activeHoldCount || !this._collectionQueue.length) {
      // already scheduled, active hold, or nothing to do
      return;
    }
    this._isCollecting = true;

    var cachedRecords = this._storeData.getCachedData();
    var freshRecords = this._storeData.getNodeData();
    this._scheduler(function () {
      // exit if a hold was acquired since the last execution
      if (_this4._activeHoldCount) {
        _this4._isCollecting = false;
        return false;
      }

      var dataID = _this4._getNextUnreferencedID();
      if (dataID) {
        var cachedRecord = cachedRecords[dataID];
        if (cachedRecord) {
          _this4._traverseRecord(cachedRecord);
        }
        var freshRecord = freshRecords[dataID];
        if (freshRecord) {
          _this4._traverseRecord(freshRecord);
        }
        _this4._collectRecord(dataID);
      }

      // only allow new collections to be scheduled once the current one
      // is complete
      _this4._isCollecting = !!_this4._collectionQueue.length;
      return _this4._isCollecting;
    });
  };

  RelayGarbageCollector.prototype._getNextUnreferencedID = function _getNextUnreferencedID() {
    while (this._collectionQueue.length) {
      var dataID = this._collectionQueue.shift();
      if (this._refCounts.hasOwnProperty(dataID) && this._refCounts[dataID] === 0) {
        return dataID;
      }
    }
    return null;
  };

  RelayGarbageCollector.prototype._traverseRecord = function _traverseRecord(record) {
    var _this5 = this;

    require('fbjs/lib/forEachObject')(record, function (value, storageKey) {
      if (storageKey === require('./RelayRecord').MetadataKey.PATH) {
        return;
      } else if (value instanceof require('./GraphQLRange')) {
        value.getEdgeIDs({ includeDeleted: true }).forEach(function (id) {
          if (id != null) {
            _this5._collectionQueue.push(id);
          }
        });
      } else if (Array.isArray(value)) {
        value.forEach(function (item) {
          if (typeof item === 'object' && item !== null) {
            var linkedID = require('./RelayRecord').getDataIDForObject(item);
            if (linkedID != null) {
              _this5._collectionQueue.push(linkedID);
            }
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        var linkedID = require('./RelayRecord').getDataIDForObject(value);
        if (linkedID != null) {
          _this5._collectionQueue.push(linkedID);
        }
      }
    });
  };

  RelayGarbageCollector.prototype._collectRecord = function _collectRecord(dataID) {
    var queryTracker = this._storeData.getQueryTracker();
    if (queryTracker) {
      queryTracker.untrackNodesForID(dataID);
    }
    this._storeData.getQueuedStore().removeRecord(dataID);
    this._storeData.getRangeData().removeRecord(dataID);
    delete this._refCounts[dataID];
  };

  return RelayGarbageCollector;
}();

module.exports = RelayGarbageCollector;