import React from 'react';
import { Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import {
  StyleSheet,
  PanResponder,
  View,
  Platform,
  Dimensions,
  I18nManager,
  ImageBackground,
} from 'react-native';

import DefaultMarker from './DefaultMarker';
import DefaultLabel from './DefaultLabel';
import { createArray, valueToPosition, positionToValue } from './converters';

export default class MultiSlider extends React.Component {
  static defaultProps = {
    values: [0],
    onValuesChangeStart: () => {},
    onValuesChange: values => {},
    onValuesChangeFinish: values => {},
    onMarkersPosition: values => {},
    step: 1,
    min: 0,
    max: 10,
    touchDimensions: {
      height: 50,
      width: 50,
      borderRadius: 15,
      slipDisplacement: 200,
    },
    customMarker: DefaultMarker,
    customMarkerLeft: DefaultMarker,
    customMarkerRight: DefaultMarker,
    customLabel: DefaultLabel,
    markerOffsetX: 0,
    markerOffsetY: 0,
    markerSize: 0,
    sliderLength: 280,
    onToggleOne: undefined,
    onToggleTwo: undefined,
    stepsAs: [],
    showSteps: false,
    showStepMarkers: true,
    showStepLabels: true,
    enabledOne: true,
    enabledTwo: true,
    allowOverlap: false,
    snapped: false,
    smoothSnapped: false,
    vertical: false,
    minMarkerOverlapDistance: 0,
    minMarkerOverlapStepDistance: 0,
    testID: '',
  };

  constructor(props) {
    super(props);

    if (
      this.props.minMarkerOverlapDistance > 0 &&
      this.props.minMarkerOverlapStepDistance > 0
    ) {
      console.error(
        'You should provide either "minMarkerOverlapDistance" or "minMarkerOverlapStepDistance", not both. Expect unreliable results.',
      );
    }

    this.optionsArray =
      this.props.optionsArray ||
      createArray(this.props.min, this.props.max, this.props.step);
    this.stepLength = this.props.sliderLength / (this.optionsArray.length - 1);

    var initialValues = this.props.values.map(value =>
      valueToPosition(
        value,
        this.optionsArray,
        this.props.sliderLength,
        this.props.markerSize,
      ),
    );

    var tempStepsAs = {};
    this.props.stepsAs.forEach(step => {
      if (step?.index !== undefined) {
        tempStepsAs[step?.index] = step;
      }
    });

    this.stepsAs = {};
    this.optionsArray.forEach((ops, index) => {
      if (tempStepsAs[index]) {
        var step = tempStepsAs[index];
        this.stepsAs[index] = {
          stepLabel: step?.stepLabel ? step.stepLabel : ops,
          suffix: step?.suffix ? step.suffix : '',
          prefix: step?.prefix ? step.prefix : '',
        };
      } else {
        this.stepsAs[index] = {
          stepLabel: ops,
          suffix: '',
          prefix: '',
        };
      }
    });

    this.state = {
      pressedOne: true,
      valueOne: this.props.values[0],
      valueTwo: this.props.values[1],
      pastOne: initialValues[0],
      pastTwo: initialValues[1],
      positionOne: initialValues[0],
      positionTwo: initialValues[1],
    };

    this.subscribePanResponder();
  }

  subscribePanResponder = () => {
    var customPanResponder = (start, move, end) => {
      return PanResponder.create({
        onStartShouldSetPanResponder: (evt, gestureState) => true,
        onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
        onMoveShouldSetPanResponder: (evt, gestureState) => true,
        onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
        onPanResponderGrant: (evt, gestureState) => start(),
        onPanResponderMove: (evt, gestureState) => move(gestureState),
        onPanResponderTerminationRequest: (evt, gestureState) => false,
        onPanResponderRelease: (evt, gestureState) => end(gestureState),
        onPanResponderTerminate: (evt, gestureState) => end(gestureState),
        onShouldBlockNativeResponder: (evt, gestureState) => true,
      });
    };

    this._panResponderBetween = customPanResponder(
      gestureState => {
        this.startOne(gestureState);
        this.startTwo(gestureState);
      },
      gestureState => {
        this.moveOne(gestureState);
        this.moveTwo(gestureState);
      },
      gestureState => {
        this.endOne(gestureState);
        this.endTwo(gestureState);
      },
    );

    this._panResponderOne = customPanResponder(
      this.startOne,
      this.moveOne,
      this.endOne,
    );
    this._panResponderTwo = customPanResponder(
      this.startTwo,
      this.moveTwo,
      this.endTwo,
    );
  };

  startOne = () => {
    if (this.props.enabledOne) {
      this.props.onValuesChangeStart();
      this.setState({
        onePressed: !this.state.onePressed,
      });
    }
  };

  startTwo = () => {
    if (this.props.enabledTwo) {
      this.props.onValuesChangeStart();
      this.setState({
        twoPressed: !this.state.twoPressed,
      });
    }
  };

  moveOne = gestureState => {
    if (!this.props.enabledOne) {
      return;
    }

    const accumDistance = this.props.vertical
      ? -gestureState.dy
      : gestureState.dx;
    const accumDistanceDisplacement = this.props.vertical
      ? gestureState.dx
      : gestureState.dy;

    const unconfined = I18nManager.isRTL
      ? this.state.pastOne - accumDistance
      : accumDistance + this.state.pastOne;
    var bottom = this.props.markerSize / 2;
    var trueTop =
      this.state.positionTwo -
      (this.props.allowOverlap
        ? 0
        : this.props.minMarkerOverlapDistance > 0
        ? this.props.minMarkerOverlapDistance
        : (this.props.minMarkerOverlapStepDistance || 1) * this.stepLength);
    var top =
      trueTop === 0
        ? 0
        : trueTop || this.props.sliderLength - this.props.markerSize / 2;
    var confined =
      unconfined < bottom ? bottom : unconfined > top ? top : unconfined;
    var slipDisplacement = this.props.touchDimensions.slipDisplacement;

    if (
      Math.abs(accumDistanceDisplacement) < slipDisplacement ||
      !slipDisplacement
    ) {
      var value = positionToValue(
        confined,
        this.optionsArray,
        this.props.sliderLength,
        this.props.markerSize,
      );
      var snapped = valueToPosition(
        value,
        this.optionsArray,
        this.props.sliderLength,
        this.props.markerSize,
      );
      this.setState({
        positionOne: this.props.snapped ? snapped : confined,
      });

      if (value !== this.state.valueOne) {
        this.setState(
          {
            valueOne: value,
          },
          () => {
            var change = [this.state.valueOne];
            if (this.state.valueTwo) {
              change.push(this.state.valueTwo);
            }
            this.props.onValuesChange(change);

            this.props.onMarkersPosition([
              this.state.positionOne,
              this.state.positionTwo,
            ]);
          },
        );
      }
    }
  };

  moveTwo = gestureState => {
    if (!this.props.enabledTwo) {
      return;
    }

    const accumDistance = this.props.vertical
      ? -gestureState.dy
      : gestureState.dx;
    const accumDistanceDisplacement = this.props.vertical
      ? gestureState.dx
      : gestureState.dy;

    const unconfined = I18nManager.isRTL
      ? this.state.pastTwo - accumDistance
      : accumDistance + this.state.pastTwo;
    var bottom =
      this.state.positionOne +
      (this.props.allowOverlap
        ? 0
        : this.props.minMarkerOverlapDistance > 0
        ? this.props.minMarkerOverlapDistance
        : (this.props.minMarkerOverlapStepDistance || 1) * this.stepLength);
    var top = this.props.sliderLength - this.props.markerSize / 2;
    var confined =
      unconfined < bottom ? bottom : unconfined > top ? top : unconfined;
    var slipDisplacement = this.props.touchDimensions.slipDisplacement;

    if (
      Math.abs(accumDistanceDisplacement) < slipDisplacement ||
      !slipDisplacement
    ) {
      var value = positionToValue(
        confined,
        this.optionsArray,
        this.props.sliderLength,
        this.props.markerSize,
      );
      var snapped = valueToPosition(
        value,
        this.optionsArray,
        this.props.sliderLength,
        this.props.markerSize,
      );

      this.setState({
        positionTwo: this.props.snapped ? snapped : confined,
      });

      if (value !== this.state.valueTwo) {
        this.setState(
          {
            valueTwo: value,
          },
          () => {
            this.props.onValuesChange([
              this.state.valueOne,
              this.state.valueTwo,
            ]);

            this.props.onMarkersPosition([
              this.state.positionOne,
              this.state.positionTwo,
            ]);
          },
        );
      }
    }
  };

  endOne = gestureState => {
    if (gestureState.moveX === 0 && this.props.onToggleOne) {
      this.props.onToggleOne();
      return;
    }

    var snapped = valueToPosition(
      this.state.valueOne,
      this.optionsArray,
      this.props.sliderLength,
    );

    this.setState(
      {
        pastOne: this.props.smoothSnapped ? snapped : this.state.positionOne,
        ...(this.props.smoothSnapped ? { positionOne: snapped } : {}),
        onePressed: !this.state.onePressed,
      },
      () => {
        var change = [this.state.valueOne];
        if (this.state.valueTwo) {
          change.push(this.state.valueTwo);
        }
        this.props.onValuesChangeFinish(change);
      },
    );
  };

  endTwo = gestureState => {
    if (gestureState.moveX === 0 && this.props.onToggleTwo) {
      this.props.onToggleTwo();
      return;
    }

    var snapped = valueToPosition(
      this.state.valueTwo,
      this.optionsArray,
      this.props.sliderLength,
    );

    this.setState(
      {
        twoPressed: !this.state.twoPressed,
        pastTwo: this.props.smoothSnapped ? snapped : this.state.positionTwo,
        ...(this.props.smoothSnapped ? { positionTwo: snapped } : {}),
      },
      () => {
        this.props.onValuesChangeFinish([
          this.state.valueOne,
          this.state.valueTwo,
        ]);
      },
    );
  };

  componentDidUpdate(prevProps, prevState) {
    const {
      positionOne: prevPositionOne,
      positionTwo: prevPositionTwo,
    } = prevState;

    const { positionOne, positionTwo } = this.state;

    if (
      typeof positionOne === 'undefined' &&
      typeof positionTwo !== 'undefined'
    ) {
      return;
    }

    if (positionOne !== prevPositionOne || positionTwo !== prevPositionTwo) {
      this.props.onMarkersPosition([positionOne, positionTwo]);
    }

    if (this.state.onePressed || this.state.twoPressed) {
      return;
    }

    let nextState = {};
    if (
      prevProps.min !== this.props.min ||
      prevProps.max !== this.props.max ||
      prevProps.step !== this.props.step ||
      prevProps.values[0] !== this.props.values[0] ||
      prevProps.sliderLength !== this.props.sliderLength ||
      prevProps.values[1] !== this.props.values[1] ||
      (prevProps.sliderLength !== this.props.sliderLength &&
        prevProps.values[1])
    ) {
      this.optionsArray =
        this.props.optionsArray ||
        createArray(this.props.min, this.props.max, this.props.step);

      this.stepLength = this.props.sliderLength / this.optionsArray.length;

      const positionOne = valueToPosition(
        this.props.values[0],
        this.optionsArray,
        this.props.sliderLength,
        this.props.markerSize,
      );
      nextState.valueOne = this.props.values[0];
      nextState.pastOne = positionOne;
      nextState.positionOne = positionOne;

      const positionTwo = valueToPosition(
        this.props.values[1],
        this.optionsArray,
        this.props.sliderLength,
        this.props.markerSize,
      );
      nextState.valueTwo = this.props.values[1];
      nextState.pastTwo = positionTwo;
      nextState.positionTwo = positionTwo;

      this.setState(nextState);
    }
  }

  getSteps(currentValue) {
    const stepLength = this.props.sliderLength / (this.optionsArray.length - 1);

    const textStyles = [
      styles.stepLabel,
      this.props.stepLabelStyle,
      ...(this.props.vertical ? [{ transform: [{ rotate: '90deg' }] }] : []),
    ];
    const markerHeight = this.props?.trackStyle?.height || styles.track.height;
    const markerStyles = [
      styles.stepMarker,
      {
        height: markerHeight,
        width: markerHeight,
        borderRadius: markerHeight / 2,
      },
      this.props.stepMarkerStyle,
    ];

    return this.optionsArray.map((number, index) => {
      var step = this.stepsAs[index];

      const activeStyle = this.props.activeStepLabelStyle || {};
      const active = step?.stepLabel === currentValue;

      const nextTextStyle = active ? activeStyle : {};
      const activePos = {
        left: index === 0 ? 0 : stepLength * index - 3,
      };
      const pos = active ? activePos : {};
      return (
        <View
          key={number}
          style={[
            styles.step,
            this.props.stepStyle,
            { top: 10 },
            { left: index === 0 ? 0 : stepLength * index - 3 },
            pos,
          ]}
        >
          {/* {this.props.showStepMarkers &&
            index !== 0 &&
            index !== this.optionsArray.length - 1 && (
              <View style={markerStyles} />
            )} */}
          {this.props.showStepLabels && (
            <Text
              style={[textStyles, nextTextStyle]}
            >{`${step.prefix}${step.stepLabel}${step.suffix}`}</Text>
          )}
        </View>
      );
    });
  }

  render() {
    const { positionOne, positionTwo } = this.state;
    const {
      selectedStyle,
      unselectedStyle,
      sliderLength,
      markerOffsetX,
      markerOffsetY,
    } = this.props;
    const twoMarkers = this.props.values.length == 2; // when allowOverlap, positionTwo could be 0, identified as string '0' and throwing 'RawText 0 needs to be wrapped in <Text>' error

    const trackOneLength = positionOne;
    const trackOneStyle = twoMarkers
      ? unselectedStyle
      : selectedStyle || styles.selectedTrack;
    const trackThreeLength = twoMarkers ? sliderLength - positionTwo : 0;
    const trackThreeStyle = unselectedStyle;
    const trackTwoLength = sliderLength - trackOneLength - trackThreeLength;
    const trackTwoStyle = twoMarkers
      ? selectedStyle || styles.selectedTrack
      : unselectedStyle;
    const Marker = this.props.customMarker;

    const MarkerLeft = this.props.customMarkerLeft;
    const MarkerRight = this.props.customMarkerRight;
    const isMarkersSeparated = this.props.isMarkersSeparated || false;

    const Label = this.props.customLabel;

    const {
      slipDisplacement,
      height,
      width,
      borderRadius,
    } = this.props.touchDimensions;
    const touchStyle = {
      borderRadius: borderRadius || 0,
      ...(height && { height }),
      ...(width && { width }),
    };

    const markerContainerOne = {
      top: markerOffsetY - 24,
      left: trackOneLength + markerOffsetX - 24,
    };

    const markerContainerTwo = {
      top: markerOffsetY - 24,
      right: trackThreeLength + markerOffsetX - 24,
    };

    const containerStyle = [styles.container, this.props.containerStyle];

    if (this.props.vertical) {
      containerStyle.push({
        transform: [{ rotate: '-90deg' }],
      });
    }

    // LinearGradientOptions
    const {
      unselectedLinearGradientOptions = {
        colors: ['#fff', '#fff'],
        start: { x: 0, y: 0 },
        end: { x: 1, y: 0 },
      },
      selectedLinearGradientOptions = {
        colors: ['#fff', '#fff'],
        start: { x: 0, y: 0 },
        end: { x: 1, y: 0 },
      },
    } = this.props;

    const nextTrackOneLength = trackOneLength === 0 ? 1 : trackOneLength;
    const nextTrackTwoLength = trackTwoLength === 0 ? 1 : trackTwoLength;

    const body = (
      <React.Fragment>
        <View style={[styles.fullTrack, { width: sliderLength }]}>
          <LinearGradient
            start={selectedLinearGradientOptions.start}
            end={selectedLinearGradientOptions.end}
            colors={selectedLinearGradientOptions.colors}
            style={[
              styles.track,
              trackOneStyle,
              this.props.trackStyle,
              { width: nextTrackOneLength },
            ]}
          />
          <View
            style={[
              styles.track,
              trackTwoStyle,
              this.props.trackStyle,
              { width: trackTwoLength, backgroundColor: '#25293B' },
            ]}
          />
          {this.props.showSteps && this.getSteps(this.state.valueOne)}
          <View
            style={[
              styles.markerContainer,
              markerContainerOne,
              this.props.markerContainerStyle,
              positionOne > sliderLength / 2 && styles.topMarkerContainer,
            ]}
          >
            <View
              style={[styles.touch, touchStyle]}
              ref={component => (this._markerOne = component)}
              {...this._panResponderOne.panHandlers}
            >
              {isMarkersSeparated === false ? (
                <Marker
                  enabled={this.props.enabledOne}
                  pressed={this.state.onePressed}
                  markerStyle={this.props.markerStyle}
                  pressedMarkerStyle={this.props.pressedMarkerStyle}
                  disabledMarkerStyle={this.props.disabledMarkerStyle}
                  currentValue={this.state.valueOne}
                  valuePrefix={this.props.valuePrefix}
                  valueSuffix={this.props.valueSuffix}
                />
              ) : (
                <MarkerLeft
                  enabled={this.props.enabledOne}
                  pressed={this.state.onePressed}
                  markerStyle={this.props.markerStyle}
                  pressedMarkerStyle={this.props.pressedMarkerStyle}
                  disabledMarkerStyle={this.props.disabledMarkerStyle}
                  currentValue={this.state.valueOne}
                  valuePrefix={this.props.valuePrefix}
                  valueSuffix={this.props.valueSuffix}
                />
              )}
            </View>
          </View>
          {twoMarkers && positionOne !== this.props.sliderLength && (
            <View
              style={[
                styles.markerContainer,
                markerContainerTwo,
                this.props.markerContainerStyle,
              ]}
            >
              <View
                style={[styles.touch, touchStyle]}
                ref={component => (this._markerTwo = component)}
                {...this._panResponderTwo.panHandlers}
              >
                {isMarkersSeparated === false ? (
                  <Marker
                    pressed={this.state.twoPressed}
                    markerStyle={this.props.markerStyle}
                    pressedMarkerStyle={this.props.pressedMarkerStyle}
                    disabledMarkerStyle={this.props.disabledMarkerStyle}
                    currentValue={this.state.valueTwo}
                    enabled={this.props.enabledTwo}
                    valuePrefix={this.props.valuePrefix}
                    valueSuffix={this.props.valueSuffix}
                  />
                ) : (
                  <MarkerRight
                    pressed={this.state.twoPressed}
                    markerStyle={this.props.markerStyle}
                    pressedMarkerStyle={this.props.pressedMarkerStyle}
                    disabledMarkerStyle={this.props.disabledMarkerStyle}
                    currentValue={this.state.valueTwo}
                    enabled={this.props.enabledTwo}
                    valuePrefix={this.props.valuePrefix}
                    valueSuffix={this.props.valueSuffix}
                  />
                )}
              </View>
            </View>
          )}
        </View>
      </React.Fragment>
    );

    return (
      <View testID={this.props.testID}>
        {this.props.enableLabel && (
          <Label
            oneMarkerValue={this.state.valueOne}
            twoMarkerValue={this.state.valueTwo}
            minValue={this.props.min}
            maxValue={this.props.max}
            oneMarkerLeftPosition={positionOne}
            twoMarkerLeftPosition={positionTwo}
            oneMarkerPressed={this.state.onePressed}
            twoMarkerPressed={this.state.twoPressed}
          />
        )}
        {this.props.imageBackgroundSource && (
          <ImageBackground
            source={this.props.imageBackgroundSource}
            style={[{ width: '100%', height: '100%' }, containerStyle]}
          >
            {body}
          </ImageBackground>
        )}
        {!this.props.imageBackgroundSource && (
          <View style={containerStyle}>{body}</View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    height: 50,
    justifyContent: 'center',
  },
  fullTrack: {
    flexDirection: 'row',
  },
  track: {
    height: 6,
    borderRadius: 6,
  },
  selectedTrack: {
    backgroundColor: '#095FFF',
  },
  markerContainer: {
    position: 'absolute',
    width: 48,
    height: 48,
    backgroundColor: 'transparent',
    // justifyContent: 'center',
    alignItems: 'center',
  },
  topMarkerContainer: {
    zIndex: 1,
  },
  touch: {
    backgroundColor: 'transparent',
    // backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  step: {
    position: 'absolute',
    marginLeft: -5,
  },
  stepMarker: {
    position: 'absolute',
    left: 2,
    width: 6,
    height: 6,
    backgroundColor: '#0000008c',
    borderRadius: 3,
  },
  stepLabel: {
    position: 'absolute',
    top: 15,
    color: '#333',
  },
});
