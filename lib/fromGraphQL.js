/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule fromGraphQL
 * 
 */

'use strict';

/**
 * @internal
 *
 * Converts GraphQL nodes to RelayQuery nodes.
 */
var fromGraphQL = {
  Field: function (query) {
    var node = createNode(query, require('./RelayQuery').Field);
    require('fbjs/lib/invariant')(node instanceof require('./RelayQuery').Field, 'fromGraphQL.Field(): Expected a GraphQL field node.');
    return node;
  },
  Fragment: function (query) {
    var node = createNode(query, require('./RelayQuery').Fragment);
    require('fbjs/lib/invariant')(node instanceof require('./RelayQuery').Fragment, 'fromGraphQL.Fragment(): Expected a GraphQL fragment node.');
    return node;
  },
  Query: function (query) {
    var node = createNode(query, require('./RelayQuery').Root);
    require('fbjs/lib/invariant')(node instanceof require('./RelayQuery').Root, 'fromGraphQL.Query(): Expected a root node.');
    return node;
  },
  Operation: function (query) {
    var node = createNode(query, require('./RelayQuery').Operation);
    require('fbjs/lib/invariant')(node instanceof require('./RelayQuery').Operation, 'fromGraphQL.Operation(): Expected a mutation/subscription node.');
    return node;
  }
};

function createNode(query, desiredType) {
  var variables = {};
  var route = require('./RelayMetaRoute').get('$fromGraphQL');
  return desiredType.create(query, route, variables);
}

module.exports = fromGraphQL;