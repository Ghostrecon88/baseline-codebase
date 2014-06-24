/**
 * @jsx React.DOM
 */
'use strict';

var React                   = require('react');
var cx                      = React.addons.classSet;
var ReactForms              = require('react-forms');
var LabelRenderingMixin     = require('./LabelRenderingMixin');
var SelfErrorRenderingMixin = require('./SelfErrorRenderingMixin');
var matrixHeaderRow         = require('./matrixHeaderRow');
var matrixRow               = require('./matrixRow');

/**
 * Matrix
 */
var readOnlyMatrix = React.createClass({
  mixins: [
    ReactForms.FieldsetMixin,
    LabelRenderingMixin,
    SelfErrorRenderingMixin
  ],

  render: function() {
    var error = this.renderError();
    var className = cx(
      'rex-forms-Widget',
      'rex-forms-matrix',
      'rex-forms-matrix-' + this.props.name,
      'rex-forms-readOnlyMatrix',
      'rex-forms-readOnlyMatrix-' + this.props.name,
      error ? 'has-error' : null
    );
    var questions = this.props.options.questions;
    var rows = this.props.options.rows.map((row) =>
      <matrixRow
        readOnly={true}
        key={row.id}
        name={row.id}
        row={row}
        questions={questions}
        />
    );
    return (
      <div className={className}>
        {this.renderLabel()}
        <matrixHeaderRow
          readOnly={true}
          questions={questions}
          columns={this.value().schema.props.columns}
          />
        {rows}
        {error}
      </div>
    );
  }
});

module.exports = readOnlyMatrix;
