/**
 * Copyright (c) 2014, Prometheus Research, LLC
 *
 * @jsx React.DOM
 */

'use strict';


var Forms = require('react-forms');
var Schema = Forms.schema.Schema;
var Property = Forms.schema.Property;

var createSchema = require('../createSchema');
var SIMPLE_INSTRUMENT_BASE_TYPES = createSchema.SIMPLE_INSTRUMENT_BASE_TYPES;
var types = require('../types');
var validators = require('../validators');

var components = require('./components');
var SimpleDiscrepancy = components.SimpleDiscrepancy;
var RecordListDiscrepancy = components.RecordListDiscrepancy;
var RecordListRecordDiscrepancy = components.RecordListRecordDiscrepancy;
var MatrixDiscrepancy = components.MatrixDiscrepancy;
var MatrixRowDiscrepancy = components.MatrixRowDiscrepancy;


class SchemaBuilder {
  constructor(discrepancies, instrument, form) {
    this.discrepancies = discrepancies || {};
    this.instrument = instrument;
    this.form = form;
    this.typeCatalog = createSchema.createTypeCatalog(instrument.types);
  }

  build() {
    var properties = Object.keys(this.discrepancies).map((key) => {
      return this.buildProperty(key, this.discrepancies[key]);
    });

    return (
      <Schema>
        {properties}
      </Schema>
    );
  }

  buildProperty(fieldId, values) {
    var field = this.getField(fieldId),
      fieldType = this.getFieldType(field);

    if (this.isSimpleType(fieldType)) {
      return this.buildSimpleProperty(field, fieldType, values);
    } else if (fieldType.rootType === 'recordList') {
      return this.buildRecordListProperty(field, fieldType, values);
    } else if (fieldType.rootType === 'matrix') {
      return this.buildMatrixProperty(field, fieldType, values);
    }
  }

  buildSimpleProperty(field, fieldType, values) {
    var type = types.getForInstrumentType(fieldType),
      validator = validators.getForInstrumentType(fieldType),
      defaultValue = type.getDefaultValue(),
      question = this.getQuestion(field);

    return (
      <Property
        name={field.id}
        type={type}
        validate={validator}
        defaultValue={defaultValue}
        required={field.required || false}
        discrepancy={values}
        question={question}
        instrumentType={fieldType}
        component={SimpleDiscrepancy}
      />
    );
  }

  buildRecordListProperty(field, fieldType, values) {
    var question = this.getQuestion(field);

    var records = Object.keys(values).map((key) => {
      return this.buildRecordListRecord(key, fieldType, values[key], question);
    });

    return (
      <Schema
        name={field.id}
        question={question}
        component={RecordListDiscrepancy}>
        {records}
      </Schema>
    );
  }

  buildRecordListRecord(recordId, recordFieldType, values, recordFieldQuestion) {
    var sb = new RecordSchemaBuilder(
      values,
      recordFieldType,
      recordFieldQuestion
    );

    var properties = Object.keys(values).map((key) => {
      return sb.buildProperty(key, values[key]);
    });

    return (
      <Schema
        name={recordId}
        component={RecordListRecordDiscrepancy}>
        {properties}
      </Schema>
    );
  }

  buildMatrixProperty(field, fieldType, values) {
    var question = this.getQuestion(field);

    var rows = Object.keys(values).map((key) => {
      return this.buildMatrixRow(key, fieldType, values[key], question);
    });

    return (
      <Schema
        name={field.id}
        question={question}
        component={MatrixDiscrepancy}>
        {rows}
      </Schema>
    );
  }

  buildMatrixRow(rowId, matrixFieldType, values, matrixFieldQuestion) {
    var sb = new MatrixSchemaBuilder(
      values,
      matrixFieldType,
      matrixFieldQuestion
    );

    var properties = Object.keys(values).map((key) => {
      return sb.buildProperty(key, values[key]);
    });

    var row = null;
    for (var i = 0; i < matrixFieldQuestion.rows.length; i += 1) {
      if (matrixFieldQuestion.rows[i].id === rowId) {
        row = matrixFieldQuestion.rows[i];
        break;
      }
    }

    return (
      <Schema
        name={rowId}
        row={row}
        component={MatrixRowDiscrepancy}>
        {properties}
      </Schema>
    );
  }

  getField(fieldId) {
    for (var i = 0; i < this.instrument.record.length; i += 1) {
      if (this.instrument.record[i].id === fieldId) {
        return this.instrument.record[i];
      }
    }
  }

  getFieldType(field) {
    return createSchema.getTypeDefinition(field.type, this.typeCatalog);
  }

  isSimpleType(fieldType) {
    return (SIMPLE_INSTRUMENT_BASE_TYPES.indexOf(fieldType.rootType) > -1);
  }

  getQuestion(field) {
    for (var i = 0; i < this.form.pages.length; i += 1) {
      for (var j = 0; j < this.form.pages[i].elements.length; j += 1) {
        if (this.form.pages[i].elements[j].type === 'question') {
          if (this.form.pages[i].elements[j].options.fieldId === field.id) {
            return this.form.pages[i].elements[j].options;
          }
        }
      }
    }
  }
}


class RecordSchemaBuilder extends SchemaBuilder {
  constructor(discrepancies, fieldType, question) {
    super(discrepancies, fieldType, question);
  }

  getQuestion(field) {
    for (var i = 0; i < this.form.questions.length; i += 1) {
      if (this.form.questions[i].fieldId === field.id) {
        return this.form.questions[i];
      }
    }
  }
}


class MatrixSchemaBuilder extends RecordSchemaBuilder {
  constructor(discrepancies, fieldType, question) {
    var fakeInstrument = {
      record: fieldType.columns
    };
    super(discrepancies, fakeInstrument, question);
  }
}


module.exports = {
  SchemaBuilder: SchemaBuilder
};

