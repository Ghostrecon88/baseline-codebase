/**
 * @copyright 2015, Prometheus Research, LLC
 */

import React            from 'react';
import * as Stylesheet  from '@prometheusresearch/react-stylesheet';
import Hoverable        from './Hoverable';
import Icon             from './Icon';
import {Box, HBox}      from './Layout';
import ProgressBar      from './ProgressBar';

/**
 * Can be called in a variety of ways to
 * upload, download, or delete an uploaded file.
 *
 * Renders a file uploaded to a storage.
 */
@Hoverable
@Stylesheet.styleable
export default class File extends React.Component {

  static propTypes = {
    /**
     * **hover** controls aspects of the display.
     */
    hover: React.PropTypes.bool,

    /**
     * The file object. The 'name' attribute contains the filename.
     * When provided, **children** should not be.
     */
    file: React.PropTypes.object,

    /**
     * If provided, the name of the icon to display.
     */
    icon: React.PropTypes.string,

    /**
     * **required** controls aspects of the display.
     */
    required: React.PropTypes.bool,

    /**
     * children to be rendered.
     * Rendered only when **progress** is not 0,
     * **required** is true, and **hover** is false.
     */
    children: React.PropTypes.element,

    /**
     * Function to call when the HBox is clicked.
     * Only enabled when **required** is false and **progress** is 0.
     */
    onRemove: React.PropTypes.func,

    /**
     * A value between 0 (start) and 1 (end).
     */
    progress: React.PropTypes.number
  };

  static stylesheet = Stylesheet.createStylesheet({
    Root: {
      Component: HBox,
      fontSize: '90%',
      cursor: 'pointer',
      top: 2,
    },
    IconWrapper: {
      Component: Box,
      marginRight: 5,
      marginLeft: 5,
      top: -2,
    }
  });

  render() {
    let {Root, IconWrapper} = this.stylesheet;
    let {
      hover, file, icon, required, children,
      onRemove, progress, ...props
    } = this.props;
    return (
      <Box {...props}>
        <Root
          size={1}
          onClick={!required && !progress && onRemove}>
          <IconWrapper centerVertically>
            {icon ?
              <Icon name={icon} /> :
              progress ?
              <Icon name="repeat" /> :
              required || !hover ?
              <Icon name="ok" /> :
              <Icon name="remove" />}
          </IconWrapper>
          <Box centerVertically>
            {progress || required || !hover ?
              children || file.name :
              'Remove file'}
          </Box>
        </Root>
        <ProgressBar progress={progress} />
      </Box>
    );
  }
}
