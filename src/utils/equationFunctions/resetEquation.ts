import { Equation } from '../eqSolver'
//-------------------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------------------- RESET EQUATION --------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
/*	This function is called at the onset of any solution. It resets any items that may have been set in a previous solution.
//-------------------------------------------------------------------------------------------------------------------------------------*/
export default function resetEquation(this: Equation) {
  this.equation = this.equation.replace(/^\s+|\s+$/g, '')
  this.equationShow = ''
  this.errorsErrors = new Array()
  this.errorsFlag = 0
  this.unitsShowUnits = ''
  this.modelsNumerical = ''
  this.modelsUnits = ''
  this.modelsDimensions = ''
  this.modelsQuantities = ''
}
//-------------------------------------------------------------------------------------------------------------------------------------//
