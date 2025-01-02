import { Equation } from '../eqSolver'
//-------------------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------------------- POPULATE EQUATION --------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
/*	This function is the first one called in the process of solving an equation.
    It takes the equation and populates the components of the equation object necessary to solve that type of equation.
    there are 5 types
	Case 1 - the equation starts with an equal sign this is usually in a table element
	Case 2 - a show equation
	Case 3 - a matrix component	
	Case 4 - A standard equation with no inputs
	Case 5 - The case where the user is calling  [a, b] = Function(inputs)
//-------------------------------------------------------------------------------------------------------------------------------------*/
export default function populateEquation(this: Equation) {
  this.equationId = this.getId('Equation')
  var temp = '',
    split_eq = [],
    re = '',
    num = 0

  // If this is a special case of a subequation, it will have inputs that need to be removed
  if (this.solutionShowType == 'subequation') {
    this.parseInputs()

    // If this equation ends with a "=" it is a display equation
  } else if (this.equation.match(/\=$/)) {
    temp = this.equation.replace(/\=$/, '')
    temp = temp.toString().replace(/^\s+|\s+$/g, '')
    this.equationLeft = temp
    this.equationRight = temp
    this.equationName = temp
    this.equation = temp
    this.equationInUse = temp
    this.equationType = 5

    // If the equation has a "]=" then it is setting a portion of an array
  } else if (this.equation.match(/\]=/)) {
    split_eq = this.equation.split('=')
    this.equationLeft = split_eq[0].replace(/^\s+|\s+$/g, '')
    this.equationRight = split_eq[1]
    this.equationInUse = split_eq[1]
    this.equationName = this.equationLeft.replace(/\[[\:\+\-\*\\0-9,a-z,A-Z]+\]/g, '')
    this.equationType = 3

    // We are left with a hopefully normal equation
  } else {
    this.equationType = 1

    // If this equation has no "=" then throw an error
    if (!this.equation.match(/\=/)) {
      this.setError(this.equationId, 'Format7')
      this.returnEquation()

      // Now, we separate out the parts of the equation
    } else {
      var arrayTemp = this.equation.match(/([^=]*)=(.*)/) || []
      this.equationLeft = arrayTemp[1]?.replace(/^\s+|\s+$/g, '')
      this.equationRight = arrayTemp[2]?.replace(/^\s+|\s+$/g, '')
      this.equationName = arrayTemp[1]?.replace(/\[[0-9,a-z,A-Z]+\]/g, '').replace(/^\s+|\s+$/g, '')
      this.equationInUse = this.equationRight

      // Check again to ensure that there is an "=" in the equation
      var reg = /\=/
      var sumCheck = this.equation.match(reg) || []
      if (sumCheck.length === 0) {
        this.setError(this.equationId, 'Format15')
      }
    }
    if (this.equation.match(/^\[/)) {
      this.equationType = 6
    }
  }
}
