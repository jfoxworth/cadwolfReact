import { Equation } from '../eqSolver'

//-------------------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------- PARSE INPUTS ---------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
/*	This function goes through the variable array and finds entries where the user is calling a previous function with inputs. Once
	found, it pulls out the string containing the variables and sends them to a function that returns an object with the name - value
	pairs of the inputs for that string. The code then calls the solver for that equation with those inputs. Finally, the function 
	call is replaced with the result of the equation. The other parts of the input string are deleted from the parent equation.
	Along with this function is one that it uses which creates the objects for the inputs.	
//-------------------------------------------------------------------------------------------------------------------------------------*/
export default function parseInputs(this: Equation) {
  var salength = this.solutionVariableArray.length,
    a = 0,
    thisloc = 0,
    i = '',
    j = 0,
    flag = 0,
    op = 0,
    inner_text = '',
    thisindex = 0,
    Inputs = {}
  var eqobj = {},
    tempid = ''
  for (a = 0; a < this.solutionVariableArray.length; a++) {
    thisloc = 0
    for (i in this.DOMObject) {
      if (
        this.solutionVariableArray[a] == this.DOMObject[i]['equationName'] &&
        this.solutionVariableArray[a + 1] == '('
      ) {
        if (
          this.DOMObject[i]['pagePosition'] > thisloc &&
          this.DOMObject[i]['pagePosition'] < this.DOMObject[this.getItemIndex(this.equationId)]['pagePosition']
        ) {
          flag = 0
          op = 0
          inner_text = ''
          thisindex = a + 1
          Inputs = {}
          thisloc = this.DOMObject[this.getItemIndex(this.equationId)]['pagePosition']
          while (flag === 0 && thisindex <= salength) {
            inner_text = inner_text + this.solutionVariableArray[thisindex]
            let temptext = inner_text
            if (this.solutionVariableArray[thisindex] == '(') {
              op = op + 1
            }
            if (this.solutionVariableArray[thisindex] == ')') {
              op = op - 1
              if (op === 0) {
                flag = 1
                inner_text = inner_text.replace(/^\(/, '')
                inner_text = inner_text.replace(/\)$/, '')
                Inputs = inputObject(inner_text)
                var thisPos = this.DOMObject[this.getItemIndex(this.equationId)]['pagePosition']
                var eqText = 'tempEq=' + this.DOMObject[i]['equation']
                eqobj = {
                  Format_showtype: 'InnerFunction',
                  Solution_Inputs: Inputs,
                  Original_id: this.equationId
                }
                let tempEq = Object.assign(new Equation(this.fileId, eqText, thisPos, this.DOMObject), eqobj)

                tempEq.equationShow = this.solutionVariableArray[a] + '(' + inner_text + ')'
                this.solutionVariableArray[a] = tempEq.equationId
              }
            }
            this.solutionVariableArray[thisindex] = 'deleteme'
            thisindex = thisindex + 1
          }
          for (j = 0; j < this.solutionVariableArray.length; j++) {
            if (this.solutionVariableArray[i] == 'deleteme') {
              this.solutionVariableArray.splice(j, 1)
              this.solutionKeyArray.splice(j, 1)
              j = j - 1
            }
          }
        }
      }
    }
  }
}

function inputObject(input_string: string) {
  var Inputs: { [key: string]: string } = {}
  var input_array = input_string.split(';'),
    b = 0,
    spliteq = [],
    varname = '',
    number = ''
  for (b = 0; b < input_array.length; b++) {
    if (input_array[b] != ' ') {
      spliteq = input_array[b].replace(/^\s+|\s+$/g, '').split('=')
      varname = spliteq[0].replace(/^\s+|\s+$/g, '')
      number = spliteq[1].replace(/^\s+|\s+$/g, '')
      Inputs[varname] = number
    }
  }
  return Inputs
}
