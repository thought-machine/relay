/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule GraphQLSegment
 * @typechecks
 */

'use strict';

var _classCallCheck3 = _interopRequireDefault(require('babel-runtime/helpers/classCallCheck'));

var _assign2 = _interopRequireDefault(require('babel-runtime/core-js/object/assign'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * Represents one contiguous segment of edges within a `GraphQLRange`. Has
 * methods for adding/removing edges (`appendEdge`, `prependEdge`, `removeEdge`)
 * and working with cursors (`getFirstCursor`, `getLastCursor` etc)
 *
 * Edges are never actually deleted from segments; they are merely marked as
 * being deleted. As such, `GraphQLSegment` offers both a `getCount` method
 * (returning the number of non-deleted edges) and a `getLength` method (which
 * returns the total number, including deleted edges).
 *
 * Used mostly as an implementation detail internal to `GraphQLRange`.
 *
 * @internal
 */

var GraphQLSegment = function () {
  function GraphQLSegment() {
    (0, _classCallCheck3['default'])(this, GraphQLSegment);

    // We use a map rather than an array because indices can become negative
    // when prepending.
    this._indexToMetadataMap = {};

    // We keep track of past indices to ensure we can delete them completely.
    this._idToIndicesMap = {};
    this._cursorToIndexMap = {};

    this._count = 0;
    this._minIndex = null;
    this._maxIndex = null;
  }

  /**
   * @param {string} cursor
   * @return {?number}
   */


  GraphQLSegment.prototype._getIndexForCursor = function _getIndexForCursor(cursor) {
    return this._cursorToIndexMap[cursor];
  };

  /**
   * @param {string} id
   * @return {?number}
   */


  GraphQLSegment.prototype._getIndexForID = function _getIndexForID(id) {
    var indices = this._idToIndicesMap[id];
    return indices && indices[0];
  };

  /**
   * @return {?string} cursor for first non-deleted edge
   */


  GraphQLSegment.prototype.getFirstCursor = function getFirstCursor() {
    if (this.getLength()) {
      for (var ii = this._minIndex; ii <= this._maxIndex; ii++) {
        var metadata = this._indexToMetadataMap[ii];
        if (!metadata.deleted) {
          return metadata.cursor;
        }
      }
    }
  };

  /**
   * @return {?string} cursor for last non-deleted edge
   */


  GraphQLSegment.prototype.getLastCursor = function getLastCursor() {
    if (this.getLength()) {
      for (var ii = this._maxIndex; ii >= this._minIndex; ii--) {
        var metadata = this._indexToMetadataMap[ii];
        if (!metadata.deleted) {
          return metadata.cursor;
        }
      }
    }
  };

  /**
   * @return {?string} id for first non-deleted edge
   */


  GraphQLSegment.prototype.getFirstID = function getFirstID() {
    if (this.getLength()) {
      for (var ii = this._minIndex; ii <= this._maxIndex; ii++) {
        var metadata = this._indexToMetadataMap[ii];
        if (!metadata.deleted) {
          return metadata.edgeID;
        }
      }
    }
  };

  /**
   * @return {?string} id for last non-deleted edge
   */


  GraphQLSegment.prototype.getLastID = function getLastID() {
    if (this.getLength()) {
      for (var ii = this._maxIndex; ii >= this._minIndex; ii--) {
        var metadata = this._indexToMetadataMap[ii];
        if (!metadata.deleted) {
          return metadata.edgeID;
        }
      }
    }
  };

  /**
   * @param {number} index
   * @return {?object} Returns the not-deleted edge at index
   */


  GraphQLSegment.prototype._getEdgeAtIndex = function _getEdgeAtIndex(index) {
    var edge = this._indexToMetadataMap[index];
    return edge && !edge.deleted ? edge : null;
  };

  /**
   * Returns whether there is a non-deleted edge for id
   * @param {string} id
   * @return {boolean}
   */


  GraphQLSegment.prototype.containsEdgeWithID = function containsEdgeWithID(id) {
    var index = this._getIndexForID(id);
    if (index === undefined) {
      return false;
    }
    return !!this._getEdgeAtIndex(index);
  };

  /**
   * Returns whether there is a non-deleted edge for cursor
   * @param {string} cursor
   * @return {boolean}
   */


  GraphQLSegment.prototype.containsEdgeWithCursor = function containsEdgeWithCursor(cursor) {
    var index = this._getIndexForCursor(cursor);
    if (index === undefined) {
      return false;
    }
    return !!this._getEdgeAtIndex(index);
  };

  /**
   * Returns up to count number of ids and cursors that is after input cursor
   * @param {number} count
   * @param {?string} cursor
   * @return {object} object with arrays of ids and cursors
   */


  GraphQLSegment.prototype.getMetadataAfterCursor = function getMetadataAfterCursor(count, cursor) {
    if (!this.getLength()) {
      return {
        edgeIDs: [],
        cursors: []
      };
    }
    var currentIndex = this._minIndex;
    if (cursor) {
      var index = this._getIndexForCursor(cursor);
      if (index === undefined) {
        console.warn('This segment does not have a cursor %s', cursor);
        return {
          edgeIDs: [],
          cursors: []
        };
      }
      currentIndex = index + 1;
    }
    var total = 0;
    var edgeIDs = [];
    var cursors = [];

    while (currentIndex <= this._maxIndex && total < count) {
      var metadata = this._indexToMetadataMap[currentIndex];
      if (!metadata.deleted) {
        edgeIDs.push(metadata.edgeID);
        cursors.push(metadata.cursor);
        total++;
      }
      currentIndex++;
    }
    return {
      edgeIDs: edgeIDs,
      cursors: cursors
    };
  };

  /**
   * Returns up to count number of ids and cursors that is before index
   * @param {number} count
   * @param {?string} cursor
   * @return {object} object with arrays of ids and cursors
   */


  GraphQLSegment.prototype.getMetadataBeforeCursor = function getMetadataBeforeCursor(count, cursor) {
    if (!this.getLength()) {
      return {
        edgeIDs: [],
        cursors: []
      };
    }
    var currentIndex = this._maxIndex;
    if (cursor) {
      var index = this._getIndexForCursor(cursor);
      if (index === undefined) {
        console.warn('This segment does not have a cursor %s', cursor);
        return {
          edgeIDs: [],
          cursors: []
        };
      }
      currentIndex = index - 1;
    }
    var total = 0;
    var edgeIDs = [];
    var cursors = [];
    while (currentIndex >= this._minIndex && total < count) {
      var metadata = this._indexToMetadataMap[currentIndex];
      if (!metadata.deleted) {
        edgeIDs.push(metadata.edgeID);
        cursors.push(metadata.cursor);
        total++;
      }
      currentIndex--;
    }

    // Reverse edges because larger index were added first
    return {
      edgeIDs: edgeIDs.reverse(),
      cursors: cursors.reverse()
    };
  };

  /**
   * @param {object} edge
   * @param {number} index
   */


  GraphQLSegment.prototype._addEdgeAtIndex = function _addEdgeAtIndex(edge, index) {
    var edgeID = require('./RelayRecord').getDataIDForObject(edge);
    var cursor = edge.cursor;

    var idIndex = this._getIndexForID(edgeID);
    // If the id is has an index and is not deleted
    if (idIndex !== undefined && this._getEdgeAtIndex(idIndex)) {
      console.warn('Attempted to add an ID already in GraphQLSegment: %s', edgeID);
      return;
    }

    if (this.getLength() === 0) {
      this._minIndex = index;
      this._maxIndex = index;
    } else if (this._minIndex === index + 1) {
      this._minIndex = index;
    } else if (this._maxIndex === index - 1) {
      this._maxIndex = index;
    } else {
      console.warn('Attempted to add noncontiguous index to GraphQLSegment: ' + index + ' to ' + ('(' + this._minIndex + ', ' + this._maxIndex + ')'));

      return;
    }

    this._indexToMetadataMap[index] = {
      edgeID: edgeID,
      cursor: cursor,
      deleted: false
    };
    this._idToIndicesMap[edgeID] = this._idToIndicesMap[edgeID] || [];
    this._idToIndicesMap[edgeID].unshift(index);
    this._count++;

    if (cursor) {
      this._cursorToIndexMap[cursor] = index;
    }
  };

  /**
   * @param {object} edge should have cursor and a node with id
   */


  GraphQLSegment.prototype.prependEdge = function prependEdge(edge) {
    this._addEdgeAtIndex(edge, this._minIndex !== null ? this._minIndex - 1 : 0);
  };

  /**
   * @param {object} edge should have cursor and a node with id
   */


  GraphQLSegment.prototype.appendEdge = function appendEdge(edge) {
    this._addEdgeAtIndex(edge, this._maxIndex !== null ? this._maxIndex + 1 : 0);
  };

  /**
   * Mark the currently valid edge with given id to be deleted.
   *
   * @param {string} id the id of the edge to be removed
   */


  GraphQLSegment.prototype.removeEdge = function removeEdge(id) {
    var index = this._getIndexForID(id);
    if (index === undefined) {
      console.warn('Attempted to remove edge with ID that was never in GraphQLSegment: ' + id);
      return;
    }
    var data = this._indexToMetadataMap[index];
    if (data.deleted) {
      console.warn('Attempted to remove edge with ID that was already removed: ' + id);
      return;
    }
    data.deleted = true;
    this._count--;
  };

  /**
   * Mark all edges with given id to be deleted. This is used by
   * delete mutations to ensure both the current and past edges are no longer
   * accessible.
   *
   * @param {string} id the id of the edge to be removed
   */


  GraphQLSegment.prototype.removeAllEdges = function removeAllEdges(id) {
    var indices = this._idToIndicesMap[id];
    if (!indices) {
      return;
    }
    for (var ii = 0; ii < indices.length; ii++) {
      var data = this._indexToMetadataMap[indices[ii]];
      if (!data.deleted) {
        data.deleted = true;
        this._count--;
      }
    }
  };

  /**
   * @param {array} edges
   * @param {?string} cursor
   */


  GraphQLSegment.prototype.addEdgesAfterCursor = function addEdgesAfterCursor(edges, cursor) {
    if (!edges.length) {
      return;
    }
    // Default adding after with no cursor to -1
    // So the first element in the segment is stored at index 0
    var index = -1;
    if (cursor) {
      index = this._getIndexForCursor(cursor);
      if (index === undefined) {
        console.warn('This segment does not have a cursor %s', cursor);
        return;
      }
    }

    while (this._maxIndex !== null && index < this._maxIndex) {
      var data = this._indexToMetadataMap[index + 1];
      // Skip over elements that have been deleted
      // so we can add new edges on the end.
      if (data.deleted) {
        index++;
      } else {
        console.warn('Attempted to do an overwrite to GraphQLSegment: ' + 'last index is ' + this._maxIndex + ' trying to add edges before ' + index);
        return;
      }
    }

    var startIndex = index + 1;
    for (var ii = 0; ii < edges.length; ii++) {
      var edge = edges[ii];
      this._addEdgeAtIndex(edge, startIndex + ii);
    }
  };

  /**
   * @param {array} edges - should be in increasing order of index
   * @param {?string} cursor
   */


  GraphQLSegment.prototype.addEdgesBeforeCursor = function addEdgesBeforeCursor(edges, cursor) {
    if (!edges.length) {
      return;
    }
    // Default adding before with no cursor to 1
    // So the first element in the segment is stored at index 0
    var index = 1;
    if (cursor) {
      index = this._getIndexForCursor(cursor);
      if (index === undefined) {
        console.warn('This segment does not have a cursor %s', cursor);
        return;
      }
    }

    while (this._minIndex !== null && index > this._minIndex) {
      var data = this._indexToMetadataMap[index - 1];
      // Skip over elements that have been deleted
      // so we can add new edges in the front.
      if (data.deleted) {
        index--;
      } else {
        console.warn('Attempted to do an overwrite to GraphQLSegment: ' + 'first index is ' + this._minIndex + ' trying to add edges after ' + index);
        return;
      }
    }

    // Edges must be added in reverse order since the
    // segment must be continuous at all times.
    var startIndex = index - 1;
    for (var ii = 0; ii < edges.length; ii++) {
      // Iterates from edges.length - 1 to 0
      var edge = edges[edges.length - ii - 1];
      this._addEdgeAtIndex(edge, startIndex - ii);
    }
  };

  /**
   * This is the total length of the segment including the deleted edges.
   * Non-zero length guarantees value max and min indices.
   * DO NOT USE THIS TO DETERMINE THE TOTAL NUMBER OF EDGES; use `getCount`
   * instead.
   * @return {number}
   */


  GraphQLSegment.prototype.getLength = function getLength() {
    if (this._minIndex === null && this._maxIndex === null) {
      return 0;
    }

    return this._maxIndex - this._minIndex + 1;
  };

  /**
   * Returns the total number of non-deleted edges in the segment.
   *
   * @return {number}
   */


  GraphQLSegment.prototype.getCount = function getCount() {
    return this._count;
  };

  /**
   * In the event of a failed `concatSegment` operation, rollback internal
   * properties to their former values.
   *
   * @param {object} cursorRollbackMap
   * @param {object} idRollbackMap
   * @param {object} counters
   */


  GraphQLSegment.prototype._rollback = function _rollback(cursorRollbackMap, idRollbackMap, counters) {
    (0, _assign2['default'])(this._cursorToIndexMap, cursorRollbackMap);
    (0, _assign2['default'])(this._idToIndicesMap, idRollbackMap);

    // no need to reset _indexToMetadataMap; resetting counters is enough
    this._count = counters.count;
    this._maxIndex = counters.maxIndex;
    this._minIndex = counters.minIndex;
  };

  /**
   * @return {object} Captured counter state.
   */


  GraphQLSegment.prototype._getCounterState = function _getCounterState() {
    return {
      count: this._count,
      maxIndex: this._maxIndex,
      minIndex: this._minIndex
    };
  };

  /**
   * Copies over content of the input segment and add to the current
   * segment.
   * @param {GraphQLSegment} segment - the segment to be copied over
   * @return {boolean} whether or not we successfully concatenated the segments
   */


  GraphQLSegment.prototype.concatSegment = function concatSegment(segment) {
    if (!segment.getLength()) {
      return true;
    }
    var idRollbackMap = {};
    var cursorRollbackMap = {};
    var counterState = this._getCounterState();
    var newEdges = segment._indexToMetadataMap;
    for (var ii = segment._minIndex; ii <= segment._maxIndex; ii++) {
      var index = void 0;
      if (this.getLength()) {
        index = this._maxIndex + 1;
      } else {
        index = 0;
        this._minIndex = 0;
      }
      this._maxIndex = index;

      var newEdge = newEdges[ii];
      var idIndex = this._getIndexForID(newEdge.edgeID);
      if (!idRollbackMap.hasOwnProperty(newEdge.edgeID)) {
        if (this._idToIndicesMap[newEdge.edgeID]) {
          idRollbackMap[newEdge.edgeID] = this._idToIndicesMap[newEdge.edgeID].slice();
        } else {
          idRollbackMap[newEdge.edgeID] = undefined;
        }
      }
      // Check for id collision. Can't have same id twice
      if (idIndex !== undefined) {
        var idEdge = this._indexToMetadataMap[idIndex];
        if (idEdge.deleted && !newEdge.deleted) {
          // We want to map to most recent edge. Only write to the front of map
          // if existing edge with id is deleted or have an older deletion
          // time.
          this._idToIndicesMap[newEdge.edgeID].unshift(index);
        } else if (!newEdge.deleted) {
          console.warn('Attempt to concat an ID already in GraphQLSegment: %s', newEdge.edgeID);
          this._rollback(cursorRollbackMap, idRollbackMap, counterState);
          return false;
        } else {
          // We want to keep track of past edges as well. Write these indices
          // to the end of the array.
          this._idToIndicesMap[newEdge.edgeID] = this._idToIndicesMap[newEdge.edgeID] || [];
          this._idToIndicesMap[newEdge.edgeID].push(index);
        }
      } else {
        this._idToIndicesMap[newEdge.edgeID] = this._idToIndicesMap[newEdge.edgeID] || [];
        this._idToIndicesMap[newEdge.edgeID].unshift(index);
      }
      var cursorIndex = this._getIndexForCursor(newEdge.cursor);
      // Check for cursor collision. Can't have same cursor twice
      if (cursorIndex !== undefined) {
        var cursorEdge = this._indexToMetadataMap[cursorIndex];
        if (cursorEdge.deleted && !newEdge.deleted) {
          // We want to map to most recent edge. Only write in the cursor map if
          // existing edge with cursor is deleted or have and older deletion
          // time.
          cursorRollbackMap[newEdge.cursor] = this._cursorToIndexMap[newEdge.cursor];
          this._cursorToIndexMap[newEdge.cursor] = index;
        } else if (!newEdge.deleted) {
          console.warn('Attempt to concat a cursor already in GraphQLSegment: %s', newEdge.cursor);
          this._rollback(cursorRollbackMap, idRollbackMap, counterState);
          return false;
        }
      } else if (newEdge.cursor) {
        cursorRollbackMap[newEdge.cursor] = this._cursorToIndexMap[newEdge.cursor];
        this._cursorToIndexMap[newEdge.cursor] = index;
      }
      if (!newEdge.deleted) {
        this._count++;
      }
      this._indexToMetadataMap[index] = (0, _assign2['default'])({}, newEdge);
    }

    return true;
  };

  GraphQLSegment.prototype.toJSON = function toJSON() {
    return [this._indexToMetadataMap, this._idToIndicesMap, this._cursorToIndexMap, this._minIndex, this._maxIndex, this._count];
  };

  GraphQLSegment.fromJSON = function fromJSON(descriptor) {
    var indexToMetadataMap = descriptor[0];
    var idToIndicesMap = descriptor[1];
    var cursorToIndexMap = descriptor[2];
    var minIndex = descriptor[3];
    var maxIndex = descriptor[4];
    var count = descriptor[5];

    var segment = new GraphQLSegment();
    segment._indexToMetadataMap = indexToMetadataMap;
    segment._idToIndicesMap = idToIndicesMap;
    segment._cursorToIndexMap = cursorToIndexMap;
    segment._minIndex = minIndex;
    segment._maxIndex = maxIndex;
    segment._count = count;
    return segment;
  };

  GraphQLSegment.prototype.__debug = function __debug() {
    return {
      metadata: this._indexToMetadataMap,
      idToIndices: this._idToIndicesMap,
      cursorToIndex: this._cursorToIndexMap
    };
  };

  /**
   * Returns a list of all IDs that were registered for this segment.
   */


  GraphQLSegment.prototype.getEdgeIDs = function getEdgeIDs() {
    var _ref = arguments.length <= 0 || arguments[0] === undefined ? { includeDeleted: false } : arguments[0];

    var includeDeleted = _ref.includeDeleted;

    var edgeIds = [];
    if (this.getLength() > 0) {
      for (var ii = this._minIndex; ii <= this._maxIndex; ii++) {
        var _indexToMetadataMap$i = this._indexToMetadataMap[ii];
        var deleted = _indexToMetadataMap$i.deleted;
        var edgeID = _indexToMetadataMap$i.edgeID;

        if (includeDeleted || !deleted) {
          edgeIds.push(edgeID);
        }
      }
    }
    return edgeIds;
  };

  return GraphQLSegment;
}();

module.exports = GraphQLSegment;