/**
 * @jsx React.DOM
 * @preventMunge
 * @copyright Prometheus Research, LLC 2014
 */
'use strict';

var Immutable                                    = require('immutable');
var {Vector, Map, OrderedMap, Record}            = Immutable;
var {isSchema, isList, isMapping, isScalar, isDynamic} = require('./schema');
var ValidationResult                             = require('./ValidationResult');
var mergeInto                                    = require('./mergeInto');
var merge                                        = require('./merge');
var invariant                                    = require('./invariant');
var validate                                     = require('./validate');
var emptyFunction                                = require('./emptyFunction');
var toArray                                      = require('./toArray');

var DIRTY_KEY = '__react_forms_dirty__';

/**
 * Serves as a immutable container for form value attributes.
 */
var ValueAttributes = Record({
  schema: null,
  value: null,
  validation: null,
  externalValidation: null,
  serialized: null
}, 'ValueAttributes');

/**
 * Reference to the current form value.
 */
class Value {

  constructor(attributes, root, path) {
    this._attributes = attributes;
    this._root = root;
    this._cache = {};
    this._schema = null;
    this.path = path;
  }

  equals(other) {
    var equals = (
      this.path.toString() === other.path.toString() &&
      this.schema.equals(other.schema) &&
      Immutable.is(this.value, other.value) &&
      Immutable.is(this.serialized, other.serialized) &&
      Immutable.is(this.validation, other.validation) &&
      Immutable.is(this.externalValidation, other.externalValidation) &&
      this.dirty === other.dirty &&
      this._root.get('onUpdate') === other._root.get('onUpdate')
    );
    return equals;
  }

  _child(key, value) {
    if (this._cache[key]) {
      return this._cache[key];
    }

    var schema = this.schema.child(key);
    value = value !== undefined ? value : this.value.get(key);
    if (isDynamic(schema)) {
      schema = schema.instantiate(value);
    }
    var serialized = this.serialized.get(key);
    var validation = this.validation.child(key);
    var externalValidation = this.externalValidation ?
      this.externalValidation.child(key) :
      ValidationResult.success;

    var attributes;
    if (value === undefined) {
      value = _defaultValue(schema);
      attributes = makeAttributes({schema, value, serialized, validation, externalValidation});
    } else {
      attributes = {schema, value, serialized, validation, externalValidation};
    }

    var ctor = _getCtor(schema);
    return (this._cache[key] = new ctor(
      this._attributes.merge(attributes),
      this._root,
      this.path.concat(key)
    ));
  }

  child(...key) {
    var value = this;
    for (var i = 0, len = key.length; i < len; i++) {
      value = value._child(key[i]);
    }
    return value;
  }

  childIn(keyPath) {
    return this.child.apply(this, keyPath);
  }

  update(newValue) {
    var trace = valueTraceByPath(this.root, this.path);
    var attributes;
    for (var i = 0, len = trace.length; i < len; i++) {
      var value = trace[i];
      if (i === 0) {
        if (this.schema.onUpdate) {
          newValue = this.schema.onUpdate(newValue);
        }
        var schema = value._attributes.schema.instantiate(newValue);
        attributes = makeAttributes({schema, value: newValue});
      } else {
        attributes = value.onChildUpdate(prevValue.key, attributes);
      }
      var prevValue = value;
    }
    var dirty = this._makeDirty();
    var root;
    var pendingRootRef = () => root;
    root = new this.root.constructor(
      this.root._attributes.merge(attributes),
      this._root.merge({dirty, pendingRootRef}),
      []
    );
    return root.childIn(this.path);
  }

  onChildUpdate(key, {value, validation, serialized}) {
    value = this.value.set(key, value);

    if (this.schema.onUpdate) {
      value = this.schema.onUpdate(value);
    }

    var schema = this.schema;
    var newSchema = this._attributes.schema.instantiate(value);
    if (!schema.equals(newSchema)) {
      return makeAttributes({schema: newSchema, value}, {strip: true});
    }
    validation = this.validation.updateChild(key, validation);
    validation = validate(this.schema, value, validation.children).validation;
    serialized = this.serialized.set(key, serialized);
    return this._attributes.merge({value, serialized, validation});
  }

  updateChild(key, newValue) {
    return this.child(key).update(newValue).root();
  }

  updateChildIn(keyPath, newValue) {
    return this.childIn(keyPath).update(newValue).root();
  }

  updateSchema(newSchema) {
    // TODO: Should we try to keep serialized for unchanged parts of schema?
    var {_attributes: {value, externalValidation}} = this.root;
    return make(
      newSchema, value, externalValidation,
      this._root.get('onUpdate'),
      this._root.get('dirty'),
      this._root.get('rootRef'));
  }

  updateExternalValidation(newExternalValidation) {
    var root = this.root;
    var externalValidation = root.externalValidation.updateChildIn(this.path, newExternalValidation);
    var pendingRootRef = () => root;
    root = new root.constructor(
      root._attributes.merge({externalValidation}),
      root._root.merge({pendingRootRef}),
      []
    );
    return root.childIn(this.path);
  }

  _makeDirty() {
    var dirty = this._root.get('dirty');
    return dirty.updateIn(this.path.concat(DIRTY_KEY), () => true);
  }

  markDirty() {
    var dirty = this._makeDirty();
    var root;
    var pendingRootRef = () => root;
    root = new this.root.constructor(
      this.root._attributes,
      this.root._root.merge({dirty, pendingRootRef}),
      []
    );
    return root.childIn(this.path);
  }

  markAsConsistent() {
    return new this.constructor(
      this._attributes,
      this._root.merge({pendingRootRef: null}),
      this.path
    );
  }

  notify() {
    var onUpdate = this._root.get('onUpdate', emptyFunction);
    onUpdate(this);
    return this;
  }
}

Object.defineProperty(Value.prototype, 'key', {
  get: function() {
    if (this.path.length === 0) {
      return null;
    } else {
      return this.path[this.path.length - 1];
    }
  }
});

Object.defineProperty(Value.prototype, 'root', {
  get: function() {
    var ref = this._root.get('pendingRootRef');
    if (!ref) {
      ref = this._root.get('rootRef');
    }
    if (!ref) {
      return this;
    }
    return ref();
  }
});

Object.defineProperty(Value.prototype, 'parent', {
  get: function() {
    if (this.path.length === 0) {
      return null;
    }
    var path = this.path.slice(0);
    path.pop();
    return this.root.childIn(path);
  }
});

Object.defineProperty(Value.prototype, 'schema', {
  get: function() {
    if (this._schema === null) {
      if (isDynamic(this._attributes.schema)) {
        this._schema = this._attributes.schema.instantiate(this._attributes.value);
      } else {
        this._schema = this._attributes.schema;
      }
    }
    return this._schema;
  }
});

Object.defineProperty(Value.prototype, 'value', {
  get: function() {
    return this._attributes.value;
  }
});

Object.defineProperty(Value.prototype, 'serialized', {
  get: function() {
    var serialized = this._attributes.serialized;
    if (serialized === undefined) {
      return _defaultValue(this._attributes.schema);
    }
    return serialized;
  }
});

Object.defineProperty(Value.prototype, 'validation', {
  get: function() {
    return this._attributes.validation;
  }
});

Object.defineProperty(Value.prototype, 'externalValidation', {
  get: function() {
    return this._attributes.externalValidation;
  }
});

Object.defineProperty(Value.prototype, 'isValid', {
  get: function() {
    return this.validation.isSuccess;
  }
});

Object.defineProperty(Value.prototype, 'isDirty', {
  get: function() {
    var path = this.path;
    var dirty = this._root.get('dirty');
    for (var i = 0, len = path.length; i < len; i++) {
      if (dirty) {
        if (dirty.get(DIRTY_KEY) || dirty.get(path[i])) {
          return true;
        }
      } else {
        return false;
      }
      dirty = dirty.get(path[i]);
    }
    return dirty && (dirty.get(DIRTY_KEY) || dirty.length > 0);
  }
});


function valueTraceByPath(value, path) {
  var trace = [value];
  for (var i = 0, len = path.length; i < len; i++) {
    value = value.child(path[i]);
    trace.unshift(value);
  }
  return trace;
}


class ScalarValue extends Value {

}

class MappingValue extends Value {

  map(func, context) {
    return this.schema.children
      .map((_, key) => func.call(context, this.child(key), key))
      .toJS();
  }

  forEach(func, context) {
    this.schema.children.forEach((_, key) => {
      return func.call(context, this.child(key), key);
    });
  }
}

class ListValue extends Value {

  map(func, context) {
    return this.value
      .map((_, key) => func.call(context, this.child(key), key))
      .toJS();
  }

  forEach(func, context) {
    this.value.forEach((_, key) => func.call(context, this.child(key), key));
  }

  emptyChild() {
    return _defaultValue(this.schema.children);
  }

  push(value) {
    var newIndex = this.value.length;
    value = Immutable.fromJS(value);
    return this._child(newIndex, value).update(value).parent;
  }

  splice() {
    var newValue = this.value.splice.apply(this.value, toArray(arguments));
    return this.update(newValue);
  }
}

function isValue(maybeValue) {
  return maybeValue instanceof Value;
}

function isScalarValue(value) {
  return value instanceof ScalarValue;
}

function isMappingValue(value) {
  return value instanceof MappingValue;
}

function isListValue(value) {
  return value instanceof ListValue;
}

function make(schema, value, externalValidation, onUpdate, dirty, rootRef) {
  externalValidation = externalValidation || ValidationResult.success;
  dirty = dirty || Map.empty();
  schema = schema.instantiate(value);
  var attributes = makeAttributes({schema, value, externalValidation}, {root: true});
  var ctor = _getCtor(schema);
  rootRef = rootRef || (() => value);
  var value = new ctor(attributes, Map({onUpdate, dirty, rootRef}), []);
  return value;
}

function makeAttributes(args, options) {
  var {schema, value} = args;

  invariant(
    isSchema(schema),
    'make(schema, ...) has received not a schema value as its first argument'
  );

  args = merge(args, {schema});
  if (isScalar(schema)) {
    return _makeScalar(args, options);
  } else if (isMapping(schema)) {
    return _makeMapping(args, options);
  } else if (isList(schema)) {
    return _makeList(args, options);
  }
}

function _makeScalar(args) {
  var {value, schema, validation, serialized} = args;
  if (value === undefined) {
    if (schema.defaultValue !== undefined) {
      value = schema.defaultValue;
    } else {
      return undefined;
    }
  }
  if (validation === undefined) {
    var validationResult = validate(schema, value);
    value = validationResult.value;
    validation = validationResult.validation;
  }
  if (serialized === undefined) {
    serialized = schema.type.serialize(value);
  }
  return new ValueAttributes(merge(args, {value, validation, serialized}));
}

function _makeMapping(args, options) {
  options = options || {};
  var {schema, value, externalValidation, serialized, validation} = args;
  if (value === undefined) {
    if (schema.defaultValue !== undefined) {
      value = schema.defaultValue
    } else if (options.root) {
      value = new OrderedMap();
    } else {
      return undefined;
    }
  }
  if (!(value instanceof OrderedMap)) {
    value = OrderedMap.from(value);
  }

  var _value = {};
  var _serialized = {};
  var _childrenValidation = {};
  var _hasChildError = false;
  var _validation;
  schema.children.forEach((schema, name) => {
    schema = schema.instantiate(value.get(name));
    if (schema === undefined) {
      return;
    }
    var child = makeAttributes({
      schema,
      value: value.get(name)
    }, {strip: options.strip});
    if (child == null || child.value == null) {
      if (schema.props.get('required')) {
        _hasChildError = true;
        _childrenValidation[name] = ValidationResult.failure('value is required');
      }
      return;
    }
    var {
      value: childValue,
      serialized: childSerialized,
      validation: childValidation
    } = child;
    _value[name] = childValue;
    _serialized[name] = childSerialized;
    if (childValidation.isFailure) {
      _hasChildError = true;
      _childrenValidation[name] = childValidation;
    }
  });
  if (_hasChildError) {
    _validation = new ValidationResult(null, OrderedMap(_childrenValidation));
  } else {
    var {value: _value, validation: _validation} = validate(schema, _value);
  }
  value = value.merge(_value);
  if (options.strip) {
    value.forEach((_, key) =>{
      if (!schema.children.has(key)) {
        value = value.remove(key);
      }
    });
  }
  serialized = serialized || OrderedMap.from(_serialized);
  validation = validation || _validation;
  return new ValueAttributes({schema, value, serialized, validation, externalValidation});
}

function _makeList(args, options) {
  options = options || {};
  var {schema, value, externalValidation, serialized, validation} = args;
  if (value === undefined) {
    if (schema.defaultValue !== undefined) {
      value = schema.defaultValue
    } else if (options.root) {
      value = new Vector();
    } else {
      return undefined;
    }
  }
  if (!(value instanceof Vector)) {
    value = Vector.from(value);
  }

  var _value = [];
  var _serialized = [];
  var _childrenValidation = {};
  var _hasChildError = false;
  var _validation;
  value.forEach((value, name) => {
    value = Immutable.fromJS(value);
    var childSchema = schema.child(name).instantiate(value);
    if (childSchema === undefined) {
      return;
    }
    var child = makeAttributes({
      schema: childSchema,
      value
    }, {strip: options.strip});
    if (child === undefined) {
      return;
    }
    var {
      value: childValue,
      serialized: childSerialized,
      validation: childValidation
    } = child;
    _value.push(childValue);
    _serialized.push(childSerialized);
    if (childValidation.isFailure) {
      _hasChildError = true;
      _childrenValidation[name] = childValidation;
    }
  });
  if (_hasChildError) {
    _validation = new ValidationResult(null, OrderedMap(_childrenValidation));
  } else {
    var {value: _value, validation: _validation} = validate(schema, _value);
  }
  return new ValueAttributes({
    schema,
    value: Vector.from(_value),
    serialized: serialized || Vector.from(_serialized),
    validation: validation || _validation,
    externalValidation
  });
}

/**
 * Get value constructor for given schema node.
 *
 * @private
 * @param {Schema} schema
 * @returns {Constructor}
 */
function _getCtor(schema) {
  var constructor;
  if (isScalar(schema)) {
    constructor = ScalarValue;
  } else if (isMapping(schema)) {
    constructor = MappingValue;
  } else if (isList(schema)) {
    constructor = ListValue;
  } else {
    invariant(false, 'invalid schema node');
  }
  return constructor;
}

function _defaultValue(schema) {
  if (schema.defaultValue !== undefined) {
    return schema.defaultValue;
  } else if (isMapping(schema)) {
    return OrderedMap.empty();
  } else if (isList(schema)) {
    return Vector.empty();
  } else {
    return null;
  }
}

module.exports = make;
mergeInto(module.exports, {
  isValue, isScalarValue, isMappingValue, isListValue
});
