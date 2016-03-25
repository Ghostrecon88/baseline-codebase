/**
 * @copyright 2016, Prometheus Research, LLC
 */

import Sinon from 'sinon';
import assert from 'power-assert';
import React from 'react';
import TestUtils from 'react-addons-test-utils';
import {findWithType, findAllWithType} from 'react-shallow-testutils';
import {createValue} from 'react-forms';

import {Field} from '../Field';
import Input from '../Input';

describe('rex-widget/form', function() {

  describe('<Field/>', function() {

    let schema = {
      type: 'object',
      properties: {
        num: {type: 'number'},
      }
    };

    it('marks field as dirty (onBlur)', function() {
      let renderer = TestUtils.createRenderer();
      let formValue = createValue({schema, value: {num: 'xxx'}});
      renderer.render(
        <Field formValue={formValue.select('num')} />
      );
      let root = renderer.getRenderOutput();
      assert(findAllWithType(root, Field.stylesheet.ErrorList).length === 0);
      let input = findWithType(root, Input);
      assert(input);
      assert(input.props.onBlur);
      input.props.onBlur();
      root = renderer.getRenderOutput();
      assert(findAllWithType(root, Field.stylesheet.ErrorList).length === 1);
    });

    it('marks field as dirty (onChange)', function() {
      let renderer = TestUtils.createRenderer();
      let formValue = createValue({schema, value: {num: 'xxx'}});
      renderer.render(
        <Field formValue={formValue.select('num')} />
      );
      let root = renderer.getRenderOutput();
      assert(findAllWithType(root, Field.stylesheet.ErrorList).length === 0);
      let input = findWithType(root, Input);
      assert(input);
      assert(input.props.onChange);
      input.props.onChange('yyy');
      root = renderer.getRenderOutput();
      assert(findAllWithType(root, Field.stylesheet.ErrorList).length === 1);
    });

    it('is compatible with DOM input', function() {
      let renderer = TestUtils.createRenderer();
      let formValue = createValue({schema, value: {num: 'xxx'}});
      renderer.render(
        <Field formValue={formValue.select('num')}>
          <input />
        </Field>
      );
      let root = renderer.getRenderOutput();
      assert(findAllWithType(root, Field.stylesheet.ErrorList).length === 0);
      let input = findWithType(root, 'input');
      assert(input);
      assert(input.props.onChange);
      let event = {
        target: {value: 'yyy'},
        stopPropagation: Sinon.spy(),
      };
      input.props.onChange(event);
      root = renderer.getRenderOutput();
      assert(findAllWithType(root, Field.stylesheet.ErrorList).length === 1);
      assert(event.stopPropagation.calledOnce);
    });

    it('validates value using async producing handler', function(done) {
      let validate = {
        produce() {
          return Promise.resolve({key: 'error'});
        }
      };
      let renderer = TestUtils.createRenderer();
      let onChange = Sinon.spy();
      let formValue = createValue({
        schema,
        onChange,
        value: {num: 42},
        params: {
          context: {a: 'a'}
        }
      });
      renderer.render(
        <Field
          debounceValidation={0}
          formValue={formValue.select('num')}
          validate={validate}
          />
      );
      let root = renderer.getRenderOutput();
      assert(findAllWithType(root, Field.stylesheet.ErrorList).length === 0);
      let input = findWithType(root, Input);
      input.props.onChange(42);
      setTimeout(() => {
        assert(onChange.callCount === 2);
        assert(onChange.lastCall.args[0].completeErrorList[0].message === 'error');
        done();
      }, 10);
    });

  });
});
