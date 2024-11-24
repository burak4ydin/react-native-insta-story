import React, { useState, useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  ActivityIndicator,
  View,
  Platform,
  SafeAreaView,
} from 'react-native';
import GestureRecognizer from 'react-native-swipe-gestures';
import Video from 'react-native-video';

import { usePrevious, isNullOrWhitespace } from './helpers';
import {
  IUserStoryItem,
  NextOrPrevious,
  StoryListItemProps,
} from './interfaces';

const { width, height } = Dimensions.get('window');

export const StoryListItem = ({
                                index,
                                key,
                                userId,
                                profileImage,
                                profileName,
                                duration,
                                onFinish,
                                onClosePress,
                                stories,
                                currentPage,
                                onStorySeen,
                                renderCloseComponent,
                                renderSwipeUpComponent,
                                renderTextComponent,
                                loadedAnimationBarStyle,
                                unloadedAnimationBarStyle,
                                animationBarContainerStyle,
                                storyUserContainerStyle,
                                storyImageStyle,
                                storyAvatarImageStyle,
                                storyContainerStyle,
                                ...props
                              }: StoryListItemProps) => {
  const [load, setLoad] = useState<boolean>(true);
  const [pressed, setPressed] = useState<boolean>(false);
  const [content, setContent] = useState<IUserStoryItem[]>(
      stories.map((x) => ({
        ...x,
        finish: 0,
      })),
  );

  const [current, setCurrent] = useState(0);

  const progress = useRef(new Animated.Value(0)).current;
  const [videoDuration, setVideoDuration] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);

  const prevCurrentPage = usePrevious(currentPage);

  useEffect(() => {
    let isPrevious = !!prevCurrentPage && prevCurrentPage > currentPage;
    if (isPrevious) {
      setCurrent(content.length - 1);
    } else {
      setCurrent(0);
    }

    let data = [...content];
    data.map((x, i) => {
      if (isPrevious) {
        x.finish = 1;
        if (i == content.length - 1) {
          x.finish = 0;
        }
      } else {
        x.finish = 0;
      }
    });
    setContent(data);
    start();
  }, [currentPage]);

  const prevCurrent = usePrevious(current);

  useEffect(() => {
    if (!isNullOrWhitespace(prevCurrent)) {
      if (prevCurrent) {
        if (
            current > prevCurrent &&
            content[current - 1].story_image == content[current].story_image
        ) {
          start();
        } else if (
            current < prevCurrent &&
            content[current + 1].story_image == content[current].story_image
        ) {
          start();
        }
      }
    }
  }, [current]);

  function start() {
    setLoad(false);
    progress.setValue(0);

    if (content[current].story_video) {
    } else {
      startAnimation(duration);
    }
  }

  function startAnimation(customDuration) {
    Animated.timing(progress, {
      toValue: 1,
      duration: customDuration || duration,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        next();
      }
    });
  }

  const onVideoLoad = (data) => {
    setLoad(false);
    const durationInMs = data.duration * 1000; // Milisaniyeye çevir
    setVideoDuration(durationInMs);
    startAnimation(durationInMs);
  };

  function onSwipeUp(_props?: any) {
    if (onClosePress) {
      onClosePress();
    }
    if (content[current].onPress) {
      content[current].onPress?.();
    }
  }

  function onSwipeDown(_props?: any) {
    onClosePress();
  }

  const config = {
    velocityThreshold: 0.3,
    directionalOffsetThreshold: 80,
  };

  function next() {
    setLoad(true);
    if (current !== content.length - 1) {
      let data = [...content];
      data[current].finish = 1;
      setContent(data);
      setCurrent(current + 1);
      progress.setValue(0);
      setIsPaused(false);
    } else {
      close('next');
    }
  }

  function previous() {
    setLoad(true);
    if (current - 1 >= 0) {
      let data = [...content];
      data[current].finish = 0;
      setContent(data);
      setCurrent(current - 1);
      progress.setValue(0);
      setIsPaused(false);
    } else {
      // önceki içerik boş
      close('previous');
    }
  }

  function close(state: NextOrPrevious) {
    let data = [...content];
    data.map((x) => (x.finish = 0));
    setContent(data);
    progress.setValue(0);
    if (currentPage == index) {
      if (onFinish) {
        onFinish(state);
      }
    }
  }

  const swipeText =
      content?.[current]?.swipeText || props.swipeText || 'Swipe Up';

  React.useEffect(() => {
    if (onStorySeen && currentPage === index) {
      onStorySeen({
        user_id: userId,
        user_image: profileImage,
        user_name: profileName,
        story: content[current],
      });
    }
  }, [currentPage, index, onStorySeen, current]);

  useEffect(() => {
    setIsPaused(pressed);
  }, [pressed]);

  return (
      <GestureRecognizer
          key={key}
          onSwipeUp={onSwipeUp}
          onSwipeDown={onSwipeDown}
          config={config}
          style={[styles.container, storyContainerStyle]}
      >
        <SafeAreaView>
          <View style={styles.backgroundContainer}>
            {content[current].story_video ? (
                <Video
                    source={{ uri: content[current].story_video }}
                    style={[styles.image, storyImageStyle]}
                    resizeMode="cover"
                    paused={isPaused}
                    onLoad={onVideoLoad}
                    onEnd={next}
                    repeat={false}
                />
            ) : (
                <Image
                    onLoadEnd={() => start()}
                    source={{ uri: content[current].story_image }}
                    style={[styles.image, storyImageStyle]}
                />
            )}
            {load && (
                <View style={styles.spinnerContainer}>
                  <ActivityIndicator size="large" color={'white'} />
                </View>
            )}
          </View>
        </SafeAreaView>
        <View style={styles.flexCol}>
          <View
              style={[styles.animationBarContainer, animationBarContainerStyle]}
          >
            {content.map((item, idx) => {
              return (
                  <View
                      key={idx}
                      style={[
                        styles.animationBackground,
                        unloadedAnimationBarStyle,
                      ]}
                  >
                    <Animated.View
                        style={[
                          {
                            flex:
                                current == idx
                                    ? progress
                                    : content[idx].finish,
                            height: 2,
                            backgroundColor: 'white',
                          },
                          loadedAnimationBarStyle,
                        ]}
                    />
                  </View>
              );
            })}
          </View>
          <View style={[styles.userContainer, storyUserContainerStyle]}>
            <View style={styles.flexRowCenter}>
              <Image
                  style={[styles.avatarImage, storyAvatarImageStyle]}
                  source={{ uri: profileImage }}
              />
              {typeof renderTextComponent === 'function' ? (
                  renderTextComponent({
                    item: content[current],
                    profileName,
                  })
              ) : (
                  <Text style={styles.avatarText}>{profileName}</Text>
              )}
            </View>
            <View style={styles.closeIconContainer}>
              {typeof renderCloseComponent === 'function' ? (
                  renderCloseComponent({
                    onPress: onClosePress,
                    item: content[current],
                  })
              ) : (
                  <TouchableOpacity
                      onPress={() => {
                        if (onClosePress) {
                          onClosePress();
                        }
                      }}
                  >
                    <Text style={styles.whiteText}>X</Text>
                  </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        {/* pressContainer'ı flexCol'un dışına taşıdık */}
        <View style={styles.pressContainer}>
          <TouchableWithoutFeedback
              onPressIn={() => {
                progress.stopAnimation();
                setPressed(true);
                setIsPaused(true);
              }}
              onLongPress={() => {
                setPressed(true);
                setIsPaused(true);
              }}
              onPressOut={() => {
                setPressed(false);
                setIsPaused(false);
                if (content[current].story_video) {
                  startAnimation(
                      videoDuration - progress.__getValue() * videoDuration,
                  );
                } else {
                  startAnimation(duration - progress.__getValue() * duration);
                }
              }}
              onPress={() => {
                  previous();
              }}
          >
            <View style={styles.leftTouchableArea} />
          </TouchableWithoutFeedback>
          <TouchableWithoutFeedback
              onPressIn={() => {
                progress.stopAnimation();
                setPressed(true);
                setIsPaused(true);
              }}
              onLongPress={() => {
                setPressed(true);
                setIsPaused(true);
              }}
              onPressOut={() => {
                setPressed(false);
                setIsPaused(false);
                if (content[current].story_video) {
                  startAnimation(
                      videoDuration - progress.__getValue() * videoDuration,
                  );
                } else {
                  startAnimation(duration - progress.__getValue() * duration);
                }
              }}
              onPress={() => {
                  next();
              }}
          >
            <View style={styles.rightTouchableArea} />
          </TouchableWithoutFeedback>
        </View>
        {typeof renderSwipeUpComponent === 'function' ? (
            renderSwipeUpComponent({
              onPress: onSwipeUp,
              item: content[current],
            })
        ) : (
            <TouchableOpacity
                activeOpacity={1}
                onPress={onSwipeUp}
                style={styles.swipeUpBtn}
            >
              <Text style={styles.swipeText}></Text>
              <Text style={styles.swipeText}>{swipeText}</Text>
            </TouchableOpacity>
        )}
      </GestureRecognizer>
  );
};

export default StoryListItem;

StoryListItem.defaultProps = {
  duration: 10000,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  flex: {
    flex: 1,
  },
  flexCol: {
    flex: 1,
    flexDirection: 'column',
  },
  flexRowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: width,
    height: height,
    resizeMode: 'cover',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  spinnerContainer: {
    zIndex: -100,
    position: 'absolute',
    justifyContent: 'center',
    backgroundColor: 'black',
    alignSelf: 'center',
    width: width,
    height: height,
  },
  animationBarContainer: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  animationBackground: {
    height: 2,
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(117, 117, 117, 0.5)',
    marginHorizontal: 2,
  },
  userContainer: {
    height: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  avatarImage: {
    height: 30,
    width: 30,
    borderRadius: 100,
  },
  avatarText: {
    fontWeight: 'bold',
    color: 'white',
    paddingLeft: 10,
  },
  closeIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    paddingHorizontal: 15,
  },
  pressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 1,
  },
  leftTouchableArea: {
    flex: 1,
  },
  rightTouchableArea: {
    flex: 1,
  },
  swipeUpBtn: {
    position: 'absolute',
    right: 0,
    left: 0,
    alignItems: 'center',
    bottom: Platform.OS == 'ios' ? 20 : 50,
  },
  whiteText: {
    color: 'white',
  },
  swipeText: {
    color: 'white',
    marginTop: 5,
  },
});
