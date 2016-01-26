/**
 * @copyright 2016, Prometheus Research, LLC
 */

import React from 'react';
import {IFrame as BaseIFrame} from '../ui';

export default class IFrame extends React.Component {
  render() {
    var {src, queryString} = this.props;
    if (queryString) {
      src += '?' + queryString;
    }
    return <BaseIFrame src={src} />;
  }

  componentDidMount() {
    var {transferRequestParams, requestParams} = this.props;
    if (transferRequestParams) {
      window.REQUEST_PARAMS = requestParams;
    }
  }
};
