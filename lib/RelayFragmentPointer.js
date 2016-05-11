/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule RelayFragmentPointer
 * 
 */

'use strict';

/**
 * Fragment pointers encapsulate the fetched data for a fragment reference. They
 * are opaque tokens that are used by Relay containers to read data that is then
 * passed to the underlying React component.
 *
 * @internal
 */
var RelayFragmentPointer = {
  addFragment: function (record, fragment, dataID) {
    var fragmentMap = record.__fragments__;
    if (fragmentMap == null) {
      fragmentMap = record.__fragments__ = {};
    }
    require('fbjs/lib/invariant')(typeof fragmentMap === 'object' && fragmentMap != null, 'RelayFragmentPointer: Expected record to contain a fragment map, got ' + '`%s` for record `%s`.', fragmentMap, record.__dataID__);
    fragmentMap[fragment.getConcreteFragmentID()] = dataID;
  },
  getDataID: function (record, fragment) {
    var fragmentMap = record.__fragments__;
    if (typeof fragmentMap === 'object' && fragmentMap != null) {
      var ret = fragmentMap[fragment.getConcreteFragmentID()];
      if (typeof ret === 'string') {
        return ret;
      }
    }
    return null;
  },
  create: function (dataID, fragment) {
    var record = require('./RelayRecord').create(dataID);
    RelayFragmentPointer.addFragment(record, fragment, dataID);
    return record;
  },
  createForRoot: function (store, query) {
    var fragment = getRootFragment(query);
    if (!fragment) {
      return null;
    }
    var storageKey = query.getStorageKey();
    var pointers = [];
    require('./forEachRootCallArg')(query, function (_ref) {
      var identifyingArgKey = _ref.identifyingArgKey;

      var dataID = store.getDataID(storageKey, identifyingArgKey);
      if (dataID == null) {
        pointers.push(null);
      } else {
        pointers.push(RelayFragmentPointer.create(dataID, fragment));
      }
    });
    // Distinguish between singular/plural queries.
    var identifyingArg = query.getIdentifyingArg();
    var identifyingArgValue = identifyingArg && identifyingArg.value || null;
    if (Array.isArray(identifyingArgValue)) {
      return pointers;
    }
    return pointers[0];
  }
};

function getRootFragment(query) {
  var batchCall = query.getBatchCall();
  if (batchCall) {
    require('fbjs/lib/invariant')(false, 'Queries supplied at the root cannot have batch call variables. Query ' + '`%s` has a batch call variable, `%s`.', query.getName(), batchCall.refParamName);
  }
  var fragment = void 0;
  query.getChildren().forEach(function (child) {
    if (child instanceof require('./RelayQuery').Fragment) {
      require('fbjs/lib/invariant')(!fragment, 'Queries supplied at the root should contain exactly one fragment ' + '(e.g. `${Component.getFragment(\'...\')}`). Query `%s` contains ' + 'more than one fragment.', query.getName());
      fragment = child;
    } else if (child instanceof require('./RelayQuery').Field) {
      require('fbjs/lib/invariant')(child.isGenerated(), 'Queries supplied at the root should contain exactly one fragment ' + 'and no fields. Query `%s` contains a field, `%s`. If you need to ' + 'fetch fields, declare them in a Relay container.', query.getName(), child.getSchemaName());
    }
  });
  return fragment;
}

module.exports = RelayFragmentPointer;