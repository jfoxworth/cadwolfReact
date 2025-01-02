/* eslint-disable no-restricted-globals */
//import Big from 'big.mjs'
import resetEquation from './equationFunctions/resetEquation'
import populateEquation from './equationFunctions/populateEquation'
import parseInputs from './equationFunctions/parseInputs'
import getItemIndex from './equationFunctions/getEquationIndex'
import getID from './equationFunctions/getId'

import parseUnits from './parseUnits.json'
import constants from './constants.json'
import scaleUnits from './scaleUnits.json'
const UnitList = new Array('A', 'K', 's', 'm', 'kg', 'cd', 'mol', 'molecules', 'rad')

type CadwolfMessage = {
  cadwolfType: string
  eqID: string
  equation: string
  fileID: string
  showValue: string
  originalId: string
  pagePosition: number
}

//-------------------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------- THE EQUATION CLASS --------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
export class Equation {
  equation: string // the full equation text : x = 1+a
  fileId: string // ID of the parent file for the equation
  equationId: string // the ID of this equation (from document)
  DOMObject: Equation[] // Array of equations for this document
  equationName: string // ?
  equationShow: string // The string to show the equation
  solutionShow: string // the string to show the solution
  equationInUse: string // ?
  equationRight: string // left side of the equation
  equationLeft: string // right side of the equation
  solutionSize: string // size of result '1x1'
  solutionNumInds: number // number of indices in the solution
  equationType: number // number indicating type of equation
  equationHasChanged: boolean // ? has the equation changed
  solutionShowType: string // ?
  solutionShowValue: string // ?
  equationShowComponent: string // ?
  equationEditInUse: boolean // ?
  solving: boolean // ? is the equation currently being solved
  solutionConvsol: string // ?
  solutionReal: object // Real part of the solution
  solutionImag: object // Imaginary part of the solution
  solutionInputArray: string[] // Input array for solution
  solutionInputs: string[] // ?
  solutionVariableArray: string[] // ?
  solutionKeyArray: string[] // ?
  solutionUnitArray: string[] // array that holds the units for each entry
  solutionObjectArray: string[] // ? array that holds the ?
  solutionTemps: string[]
  solutionPostFix: string[]
  solutionPostUnits: string[]
  solutionRealDefault: number
  solutionImagDefault: number
  pageParentId: string // ID of parent item on the document
  pageTopParentId: string // ID of main item on the document
  pagePosition: number // position of this equation on the DOM
  unitsUnits: string
  unitsShowUnits: string
  unitsConvUnits: string
  unitsUnitArray: string[]
  unitsConvArray: string[]
  unitsScaledArray: string[]
  unitsBaseArray: {
    A: number
    K: number
    s: number
    m: number
    kg: number
    cd: number
    mol: number
    molecules: number
    rad: number
  }
  unitsBaseString: string
  unitsMultiplier: number
  unitsQuantity: string
  modelsNumerical: string
  modelsUnits: string
  modelsDimensions: string
  modelsQuantities: string
  errorsFlag: boolean
  errorsErrors: string[]
  FaF: object
  connectedIds: object

  constructor(
    fileId: string,
    equation: string,
    pagePosition: number,
    DOMObject?: Equation[],
    equationId?: string,
    equationName?: string,
    equationShow?: string,
    solutionShow?: string,
    equationInUse?: string,
    equationRight?: string,
    equationLeft?: string,
    solutionSize?: string,
    solutionNumInds?: number,
    equationType?: number,
    equationHasChanged?: boolean,
    solutionShowType?: string,
    solutionShowValue?: string,
    equationShowComponent?: string,
    equationEditInUse?: boolean,
    solving?: boolean,
    solutionConvsol?: string,
    solutionReal?: object,
    solutionImag?: object,
    solutionInputArray?: string[],
    solutionInputs?: string[],
    solutionVariableArray?: string[],
    solutionKeyArray?: string[],
    solutionUnitArray?: string[],
    solutionObjectArray?: string[],
    solutionTemps?: string[],
    solutionPostFix?: string[],
    solutionPostUnits?: string[],
    solutionRealDefault?: number,
    solutionImagDefault?: number,
    pageParentId?: string,
    pageTopParentId?: string,
    unitsUnits?: string,
    unitsShowUnits?: string,
    unitsConvUnits?: string,
    unitsUnitArray?: string[],
    unitsConvArray?: string[],
    unitsScaledArray?: string[],
    unitsBaseArray?: {
      A: number
      K: number
      s: number
      m: number
      kg: number
      cd: number
      mol: number
      molecules: number
      rad: number
    },
    unitsBaseString?: string,
    unitsMultiplier?: number,
    unitsQuantity?: string,
    modelsNumerical?: string,
    modelsUnits?: string,
    modelsDimensions?: string,
    modelsQuantities?: string,
    errorsFlag?: boolean,
    errorsErrors?: string[],
    FaF?: object,
    connectedIds?: object
  ) {
    this.fileId = fileId
    this.equation = equation
    this.equationId = equationId || ''
    this.DOMObject = DOMObject || []
    this.equationName = equationName ? equationName : 'tempEq'
    this.equationShow = equationShow || ''
    this.solutionShow = solutionShow || ''
    this.equationInUse = equationInUse || ''
    this.equationRight = equationRight || ''
    this.equationLeft = equationLeft || ''
    this.solutionSize = solutionSize || '1x1'
    this.solutionNumInds = solutionNumInds || 1
    this.equationType = equationType || 1
    this.equationHasChanged = equationHasChanged || false
    this.solutionShowType = solutionShowType || 'top'
    this.solutionShowValue = solutionShowValue || 'default'
    this.equationShowComponent = equationShowComponent || ''
    this.equationEditInUse = equationEditInUse || false
    this.solving = solving || false
    this.solutionConvsol = solutionConvsol || ''
    this.solutionReal = solutionReal || {}
    this.solutionImag = solutionImag || {}
    this.solutionInputArray = solutionInputArray || new Array()
    this.solutionInputs = solutionInputs || new Array()
    this.solutionVariableArray = solutionVariableArray || new Array()
    this.solutionKeyArray = solutionKeyArray || new Array()
    this.solutionUnitArray = solutionUnitArray || new Array()
    this.solutionObjectArray = solutionObjectArray || new Array()
    this.solutionTemps = solutionTemps || new Array()
    this.solutionPostFix = solutionPostFix || new Array()
    this.solutionPostUnits = solutionPostUnits || new Array()
    this.solutionRealDefault = solutionRealDefault || 0
    this.solutionImagDefault = solutionImagDefault || 0
    this.pageParentId = pageParentId || 'none'
    this.pageTopParentId = pageTopParentId || 'none'
    this.pagePosition = pagePosition || 0
    this.unitsUnits = unitsUnits || ''
    this.unitsShowUnits = unitsShowUnits || ''
    this.unitsConvUnits = unitsConvUnits || ''
    this.unitsUnitArray = unitsUnitArray || new Array()
    this.unitsConvArray = unitsConvArray || new Array()
    this.unitsScaledArray = unitsScaledArray || new Array()
    this.unitsBaseArray = unitsBaseArray || { A: 0, K: 0, s: 0, m: 0, kg: 0, cd: 0, mol: 0, molecules: 0, rad: 0 }
    this.unitsBaseString = unitsBaseString || '00000000'
    this.unitsMultiplier = unitsMultiplier || 1
    this.unitsQuantity = unitsQuantity || ''
    this.modelsNumerical = modelsNumerical || ''
    this.modelsUnits = modelsUnits || ''
    this.modelsDimensions = modelsDimensions || ''
    this.modelsQuantities = modelsQuantities || ''
    this.errorsFlag = errorsFlag || false
    this.errorsErrors = errorsErrors || new Array()
    this.FaF = FaF || {}
    this.connectedIds = connectedIds || {}
  }

  resetEquation = resetEquation
  populateEquation = populateEquation
  parseInputs = parseInputs
  getItemIndex = getItemIndex
  getId = getID
  setError = (equationId: string, type: string) => {
    console.log(equationId, type)
  }
  returnEquation = () => {}
  solveEquation = () => {
    console.log('Solving ...')
    this.resetEquation()
    this.populateEquation()
  }
}

onmessage = (e: MessageEvent<CadwolfMessage>) => {
  console.log('In Worker')
  console.log('The event message is ...')
  console.log(e.data)

  self.onerror = e => {
    console.log(e)
  }

  // Call the appropriate action for the type of item being solved
  if (e.data['cadwolfType'] == 'solveEquation') {
    const currentEq = new Equation(e.data.fileID, e.data.equation, 0)
    currentEq.solveEquation()
    console.log(currentEq)
  }
}
export {}
