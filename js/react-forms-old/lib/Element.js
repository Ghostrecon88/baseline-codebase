/**
 * `<Element />` component renders form value into one of then `<Field />`,
 * `<Fieldset />` or `<RepeatingFieldset />` component:
 *
 *    <Element value={...} />
 *
 * This component is the main building block for composite form elements such as
 * `<Fieldset />` and `<RepeatingFieldset />` which use it to render its
 * children.
 *
 * @copyright Prometheus Research, LLC 2014
 */
'use strict';

var {is}                                  = require('immutable');
var React                                 = require('react');
var PropTypes                             = require('./PropTypes');
var ReactCreateClass = require('create-react-class');
var invariant                             = require('./invariant');
var {ScalarNode, CompositeNode, ListNode} = require('./schema');

var Element = ReactCreateClass({

  render() {
    var Component;
    var {value: {node}} = this.props;

    Component = node.props.get('component');
    if (Component) {
      return React.isValidElement(Component) ?
        React.cloneElement(Component, this.props) :
        React.createElement(Component, this.props);
    } else {
      if (node instanceof ListNode) {
        Component = require('./RepeatingFieldset');
      } else if (node instanceof CompositeNode) {
        Component = require('./Fieldset');
      } else if (node instanceof ScalarNode) {
        Component = require('./Field');
      } else {
        invariant(false, 'invalid schema node: ' + node);
      }
      return <Component {...this.props} />;
    }
  },

  shouldComponentUpdate(props) {
    var shouldUpdate = false;
    for (var name in props) {
      if (!is(props[name], this.props[name])) {
        shouldUpdate = true;
        break;
      }
    }
    return shouldUpdate;
  }
});

module.exports = Element;
