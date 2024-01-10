import React from 'react';
import { View, StyleSheet, Platform, TouchableHighlight } from 'react-native';

class DefaultMarker extends React.Component {
  render() {
    return (
      <TouchableHighlight>
        <View
          style={
            this.props.enabled
              ? [
                  styles.markerStyle,
                  this.props.markerStyle,
                  this.props.pressed && styles.pressedMarkerStyle,
                  this.props.pressed && this.props.pressedMarkerStyle,
                ]
              : [
                  styles.markerStyle,
                  styles.disabled,
                  this.props.disabledMarkerStyle,
                ]
          }
        />
      </TouchableHighlight>
    );
  }
}

const thumbSize = 23;

const styles = StyleSheet.create({
  markerStyle: {
    height: thumbSize,
    width: thumbSize,
    borderRadius: thumbSize,
    borderWidth: 3,
    borderColor: '#5652FF',
    backgroundColor: '#FFFFFF',
  },
  pressedMarkerStyle: {},
  disabled: {
    backgroundColor: '#d3d3d3',
  },
});

export default DefaultMarker;
