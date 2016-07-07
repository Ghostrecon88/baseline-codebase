/*
 * Copyright (c) 2016, Prometheus Research, LLC
 */


import autobind from 'autobind-decorator';
import React from 'react';

import {getInstance} from '../instances';
import {ProviderContext} from './context';


function makeKey(i18n) {
  return `i18n-${i18n.config.locale}-${i18n.isLoaded ? '1' : '0'}`;
}


export default class Provider extends React.Component {
  constructor(props, context) {
    super(props, context);

    if (this.context.RexI18N) {
      if (this.context.RexI18N.config.locale === this.props.locale) {
        // If there's an instance already in our context for the same locale,
        // just use it.
        this.state = {
          RexI18N: this.context.RexI18N,
          key: makeKey(this.context.RexI18N)
        };
      } else {
        // If there's an instance already in the context, but it's for a
        // different locale, then make a new one and use that.
        let options = {
          onLoad: this.onI18NLoad,
          timezone: this.props.timezone || this.context.RexI18N.config.timezone,
          baseUrl: this.props.baseUrl || this.context.RexI18N.config.baseUrl,
          translationsUrl: this.props.translationsUrl || this.context.RexI18N.config.translationsUrl
        };
        let instance = getInstance(this.props.locale, options);
        this.state = {
          RexI18N: instance,
          key: makeKey(instance)
        };
      }
    } else {
      // An instance doesn't yet exist, make one.
      let options = {
        onLoad: this.onI18NLoad
      };
      ['timezone', 'baseUrl', 'translationsUrl'].forEach((opt) => {
        if (this.props[opt] !== undefined) {
          options[opt] = this.props[opt];
        }
      });
      let instance = getInstance(this.props.locale, options);
      this.state = {
        RexI18N: instance,
        key: makeKey(instance)
      };
    }
  }

  @autobind
  onI18NLoad(i18n) {
    if (this.props.onLoad) {
      this.props.onLoad(i18n);
    }
    this.setState({
      key: makeKey(i18n)
    });
  }

  componentDidMount() {
    this._mounted = true;
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.locale !== nextProps.locale) {
      let options = {
        onLoad: this.onI18NLoad,
        timezone: nextProps.timezone || this.state.RexI18N.config.timezone,
        baseUrl: nextProps.baseUrl || this.state.RexI18N.config.baseUrl,
        translationsUrl: nextProps.translationsUrl || this.state.RexI18N.config.translationsUrl
      };
      let instance = getInstance(nextProps.locale, options);
      this.state = {
        RexI18N: instance,
        key: makeKey(instance)
      };
    }
  }

  getChildContext() {
    return {
      RexI18N: this.state.RexI18N
    };
  }

  render() {
    let child = React.Children.only(this.props.children);
    return React.cloneElement(child, {key: this.state.key});
  }
}


Provider.propTypes = {
  locale: React.PropTypes.string,
  timezone: React.PropTypes.string,
  baseUrl: React.PropTypes.string,
  translationsUrl: React.PropTypes.string,
  onLoad: React.PropTypes.func,
  children: React.PropTypes.element.isRequired
};

Provider.contextTypes = {
  ...ProviderContext
};

Provider.childContextTypes = {
  ...ProviderContext
};

