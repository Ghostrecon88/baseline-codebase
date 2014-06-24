/**
 * @jsx React.DOM
 */
'use strict';

var React                  = require('react');
var ReactForms             = require('react-forms');
var validation             = ReactForms.validation;
var makeAssessment         = require('../assessment').makeAssessment;
var localization           = require('../localization');
var createSchema           = require('../createSchema');
var FormEntry              = require('./FormEntry');
var FormOverview           = require('./FormOverview');
var FormEventsContextMixin = require('./FormEventsContextMixin');

var FormLocalizerMixin = {
  mixins: [localization.LocalizerMixin],

  getLocale: function() {
    return this.props.locale;
  },

  localize: function(localizedString) {
    if (!localizedString) {
      return '';
    }

    var locale = this.props.locale;

    if (localizedString[locale]) {
      return localizedString[locale];
    }

    var language = locale.split(/[\-_]/, 1);

    if (localizedString[language]) {
      return localizedString[language];
    }

    return localizedString[this.props.form.defaultLocalization];
  }
};

var Form = React.createClass({
  mixins: [
    FormLocalizerMixin,
    ReactForms.FormMixin,
    FormEventsContextMixin
  ],

  propTypes: {
    instrument: React.PropTypes.object.isRequired,
    form: React.PropTypes.object.isRequired,
    assessment: React.PropTypes.object,
    parameters: React.PropTypes.object,
    locale: React.PropTypes.string,
    onComplete: React.PropTypes.func,
    showOverview: React.PropTypes.bool,
    showOverviewOnCompletion: React.PropTypes.bool,
    readOnly: React.PropTypes.bool
  },

  render: function() {
    var isValid = this.isValid();
    var form;

    if (this.state.showOverview || this.props.showOverview) {
      form = this.transferPropsTo(
        <FormOverview
          ref="form"
          readOnly={this.props.readOnly || this.state.completed}
          isValid={isValid}
          isFieldValid={this.isFieldValid}
          startEditTransaction={this.startEditTransaction}
          commitEditTransaction={this.commitEditTransaction}
          rollbackEditTransaction={this.rollbackEditTransaction}
          />
      );
    } else {
      form = this.transferPropsTo(
        <FormEntry
          ref="form"
          isValid={isValid}
          isFieldValid={this.isFieldValid}
          />
      );
    }

    return (
      <div className="rex-forms-Form">
        {form}
        {!this.props.readOnly &&
          <div className="rex-forms-Form__toolbar clearfix">
            <button
              disabled={!isValid || this.state.completed}
              onClick={this.onComplete}
              type="button"
              className="rex-forms-Form__complete">
              Complete form
            </button>
            {!isValid &&
              <span className="rex-forms-Form__info">
                Form cannot be completed until all fields are valid
              </span>}
          </div>}
      </div>
    );
  },

  getDefaultProps: function() {
    return {
      defaultValue: this.props.assessment ?
        this.props.assessment.values :
        {},
      schema: this.props.schema
        || createSchema(this.props.instrument, this.props.form),
      parameters: {},
      locale: 'en'
    };
  },

  getInitialState: function() {
    return {
      showOverview: false,
      completed: false,
      commitedValue: null
    };
  },

  startEditTransaction: function() {
    this.setState({commitedValue: this.state.value});
  },

  commitEditTransaction: function() {
    this.setState({commitedValue: null});
  },

  rollbackEditTransaction: function() {
    this.onValueUpdate(this.state.commitedValue);
  },

  getFormState: function(value) {
    var events = this.formEvents();
    this.getEventExecutionContext().forEachTarget((name) => {
      var newValue = events.calculate(name, value.value);

      if (newValue !== undefined
          && (!value.value[name] || !value.value[name].value !== newValue)) {

        value = value
          .get(name).get('value')
          .updateValue(newValue)
          .root();
      }

      var failed = events.isFailed(name, value.value);
      if (failed) {
        value = value
          .get(name).get('value')
          .updateValidation({validation: {failure: 'invalid value'}})
          .root();
      }
    });

    return {value};
  },

  /**
   * Return true if form is valid
   *
   * @returns {Boolean}
   */
  isValid: function(value) {
    for (var i = 0, len = this.props.instrument.record.length; i < len; i++) {
      if (!this.isFieldValid(this.props.instrument.record[i].id, value)) {
        return false;
      }
    }
    return true;
  },

  /**
   * Return true if field with fieldId is valid in the current form state
   *
   * @returns {Boolean}
   */
  isFieldValid: function(fieldId, value) {
    value = value || this.value();
    var events = this.formEvents();
    return validation.isSuccess(value.validation.children[fieldId])
      || events.isHidden(fieldId, value.value)
      || events.isDisabled(fieldId, value.value);
  },

  /**
   * Return an assessment document for the current form state.
   *
   * @returns {Assessment}
   */
  getAssessment: function(value) {
    value = value || this.value().value;
    // We iterate over all actions and decide if we should remove assessment
    // values from hidden/disabled fields.
    //
    // We don't remove values from original form value because if field become
    // enabled/visible again we want to show retained value and not a clean
    // state.
    var valueOverlay = {};

    var events = this.formEvents();

    this.getEventExecutionContext().forEachTarget((name) => {
      if (events.isHidden(name, value) || events.isDisabled(name, value)) {
        valueOverlay[name] = {value: null};
      }
    });

    return makeAssessment(
      value,
      this.props.instrument,
      valueOverlay
    );
  },

  onComplete: function() {
    if (this.isValid() && this.props.onComplete && !this.state.completed) {
      var value = this.value();
      // check if we need to show overview before completion
      if (this.props.showOverviewOnCompletion && !this.state.showOverview) {
        this.setState({showOverview: true});
      } else {
        this.setState({completed: true});
        if (this.props.onComplete) {
          this.props.onComplete(this.getAssessment(value.value));
        }
      }
    }
  },

  valueUpdated: function(value) {
    var isValid = this.isValid(value);
    var assessment = this.getAssessment(value.value);
    if (this.props.onChange && isValid) {
      this.props.onChange(assessment);
    }
    if (this.props.onUpdate) {
      this.props.onUpdate(assessment, isValid);
    }
  }
});

module.exports = Form;
