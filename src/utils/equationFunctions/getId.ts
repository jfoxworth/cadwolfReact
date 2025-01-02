import { Equation } from '../eqSolver'
//-------------------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------------------- GET ID --------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
/*	This function creates an ID for a new item - equation, chart, etc
//-------------------------------------------------------------------------------------------------------------------------------------*/
export default function Get_ID(this: Equation, type: string) {
  var flag = false,
    id = '',
    file = 'File' + this.fileId
  if (type == 'Equation') {
    while (!flag) {
      id = file + 'Eq' + Math.floor(Math.random() * 100000 + 1)
      if (this.getItemIndex(id)) {
        flag = true
      }
    }
  } else if (type == 'ForLoop') {
    while (!flag) {
      id = file + 'forLoop' + Math.floor(Math.random() * 10000 + 1)
      if (this.getItemIndex(id)) {
        flag = true
      }
    }
  } else if (type == 'WhileLoop') {
    while (!flag) {
      id = file + 'whileLoop' + Math.floor(Math.random() * 10000 + 1)
      if (this.getItemIndex(id)) {
        flag = true
      }
    }
  } else if (type == 'IfElseStatement') {
    while (!flag) {
      id = file + 'IfElse' + Math.floor(Math.random() * 10000 + 1)
      if (this.getItemIndex(id)) {
        flag = true
      }
    }
  } else if (type == 'Table') {
    while (!flag) {
      id = file + 'Table' + Math.floor(Math.random() * 10000 + 1)
      if (this.getItemIndex(id)) {
        flag = true
      }
    }
  }
  return id
}
