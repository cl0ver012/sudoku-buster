import log from 'loglevel'
import * as C from './constants'
import * as D from './data'
import * as I from './image'
import * as CALC from './calculations'
import * as SVG from './drawSvg'
import { findBoundingBox } from './findBoundingBox'

const findAndCheckBoundingBox = (imageData, svgElement) => {
  performance.mark('findAndCheckBoundingBox-start')
  try {
    const result = findBoundingBox(imageData)
    svgElement && SVG.clearDiagnostics(svgElement)
    if (!result) {
      const error = new Error('Failed to find bounding box.')
      error.isScanException = true
      throw error
    }
    const { boundingBox } = result
    const boundingBoxString = `[${boundingBox.join(', ')}]`
    log.info(`[findAndCheckBoundingBox] boundingBox: ${boundingBoxString}`)
    const [, , w, h] = boundingBox
    if (w < C.GRID_IMAGE_WIDTH / 2 || h < C.GRID_IMAGE_HEIGHT / 2) {
      const error = new Error(`Bounding box is too small, ${boundingBoxString}.`)
      error.isScanException = true
      throw error
    }
    return result
  } finally {
    performance.measure('findAndCheckBoundingBox', 'findAndCheckBoundingBox-start')
  }
}

const handleDrawingOptions = (boundingBoxInfo, svgElement, drawingOptions) => {
  performance.mark('handleDrawingOptions-start')
  try {
    const { contour, corners, boundingBox } = boundingBoxInfo
    if (drawingOptions.drawContour) {
      SVG.drawContour(svgElement, contour, 'red')
    }
    if (drawingOptions.drawCorners) {
      SVG.drawCorners(svgElement, corners, 'magenta')
    }
    if (drawingOptions.drawBoundingBox) {
      SVG.drawBoundingBox(svgElement, boundingBox, 'blue')
    }
    if (drawingOptions.drawGridSquares) {
      const gridSquares = CALC.calculateGridSquares(boundingBox)
      SVG.drawGridSquares(svgElement, gridSquares, 'green')
    }
  } finally {
    performance.measure('handleDrawingOptions', 'handleDrawingOptions-start')
  }
}

const predictDigits = async (cellsModel, gridImageTensor, boundingBox) => {
  performance.mark('predictDigits-start')
  const disposables = []
  try {
    const gridSquareImageTensors = D.cropGridSquares(gridImageTensor, boundingBox)
    disposables.push(gridSquareImageTensors)
    const batchSize = gridSquareImageTensors.shape[0]
    const outputs = cellsModel.predict(gridSquareImageTensors, { batchSize })
    disposables.push(outputs)
    const outputsArgMax = outputs.argMax(1)
    disposables.push(outputsArgMax)
    const outputsArgMaxArray = await outputsArgMax.array()
    const indexedDigitPredictions = outputsArgMaxArray
      .map((digitPrediction, index) => ({ digitPrediction, index }))
      .filter(({ digitPrediction }) => digitPrediction > 0)
    return indexedDigitPredictions
  } finally {
    disposables.forEach(disposable => disposable.dispose())
    performance.measure('predictDigits', 'predictDigits-start')
  }
}

export const scanPuzzle = async (cellsModel, imageData, svgElement, drawingOptions = {}) => {
  const disposables = []
  try {
    const boundingBoxInfo = findAndCheckBoundingBox(imageData, svgElement)
    handleDrawingOptions(boundingBoxInfo, svgElement, drawingOptions)
    const { image2: imageDataCorrected } = boundingBoxInfo
    const imageTensorCorrected = I.imageDataToImageTensor(imageDataCorrected)

    performance.mark('imageDataToImageTensor-start')
    disposables.push(imageTensorCorrected)
    performance.measure('imageDataToImageTensor', 'imageDataToImageTensor-start')

    const boundingBox = CALC.inset(0, 0, imageDataCorrected.width, imageDataCorrected.height, 2, 2)
    const indexedDigitPredictions = await predictDigits(cellsModel, imageTensorCorrected, boundingBox)
    return indexedDigitPredictions
  } finally {
    disposables.forEach(disposable => disposable.dispose())
  }
}
