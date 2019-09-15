import * as tf from '@tensorflow/tfjs'
import log from 'loglevel'
import * as C from './constants'

let webcam = undefined

export const isWebcamStarted = () => !!webcam

const FACING_MODE = 'environment'

// This bit of error handling seems to throw an error itself:
//   https://github.com/tensorflow/tfjs/blob/master/tfjs-data/src/iterators/webcam_iterator.ts#L118-L119
// The error thrown is:
//   Cannot assign to read only property 'message' of object ''
// Therefore, I am making my own initial call to try to access the webcam
// so that I can directly handle any permission/access error myself and
// present a sensible error message to the user.
const testWebcamAccessWorkaround = async () => {
  const constraints = {
    video: {
      facingMode: FACING_MODE
    }
  }
  await navigator.mediaDevices.getUserMedia(constraints)
}

export const startWebcam = async videoElement => {
  await testWebcamAccessWorkaround()
  const videoRect = videoElement.getBoundingClientRect()
  log.info(`[startWebcam] videoRect: ${JSON.stringify(videoRect)}`)
  const width = Math.round(videoRect.width)
  const height = Math.round(videoRect.height)
  log.info(`[startWebcam] width: ${width}; height: ${height}`)
  const webcamConfig = {
    facingMode: FACING_MODE,
    // resizeWidth: width,
    // resizeHeight: height
    resizeWidth: C.GRID_IMAGE_WIDTH,
    resizeHeight: C.GRID_IMAGE_HEIGHT
  }
  videoElement.width = width
  videoElement.height = height
  webcam = await tf.data.webcam(videoElement, webcamConfig) //eslint-disable-line
}

export const stopWebcam = () => {
  if (webcam) {
    webcam.stop()
    webcam = undefined
  }
}

export const captureWebcam = () =>
  webcam ? webcam.capture() : undefined
