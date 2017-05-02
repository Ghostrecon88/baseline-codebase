/**
 * @copyright 2015-present, Prometheus Research, LLC
 * @flow
 */

import * as React from 'react';
import Action from '../Action';

export default class Page extends React.Component {
  props: {
    width?: number,
    title?: string,
    text?: string,
    onClose: Function,
  };

  static defaultProps = {
    width: 480,
    title: 'Page',
    icon: 'bookmark',
  };

  render() {
    let {width, title, text, onClose} = this.props;
    return (
      <Action title={title} onClose={onClose} width={width}>
        <div dangerouslySetInnerHTML={{__html: text}} />
      </Action>
    );
  }
}
