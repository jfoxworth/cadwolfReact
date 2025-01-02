/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------ EQUATIONS ----------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------- THE ON MESSAGE FUNCTION -------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/* 	This is the functiont that is invoked whenever the EquationSolver algorithm is called. The JSON object sent to the function expects to receive 3 different items.	\
	The first item is the id of the equation in question. The second item is the text of the equation in question. The third item is a JSON object containing the 		\
	DOM Object that has all the needed items. This includes both equations and tables.																					\
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
import Big from 'big.mjs'
import parseUnits from './parseUnits.json'
import constants from './constants.json'
import scaleUnits from './scaleUnits.json'
const UnitList = new Array('A', 'K', 's', 'm', 'kg', 'cd', 'mol', 'molecules', 'rad')

const showDebug = false

self.onmessage = function (Event) {
  console.log(Event)
  console.log(Event.data)
  console.log('In the web worker with a type of ' + Event.data['cadwolfType'])
  console.log('The eqObj is ...')
  console.log(Event.data['eqObj'])

  // Import the sent items into the web worker
  var equation = '',
    eqID = '',
    eqObj = {}
  Build_FunctionList()
  const DOM_Object = JSON.parse(JSON.stringify(Event.data['eqObj'])) || {}
  const ImportedFunctions = Event.data['importedFunctions'] || []
  const FileID = Event.data['FileID']
  const cadParts = Event.data['cadParts'] || []
  const eventType = Event.data['cadwolfType'] || 'SolveEquation'
  const eventErrorFlag = 0
  const eventError = ''

  // Call the appropriate action for the type of item being solved
  if (Event.data['cadwolfType'] == 'SolveEquation') {
    self[Event.data['eqID']] = new Equation(Event.data['eqID'])
    self[Event.data['eqID']]['Format_showvalue'] = Event.data['showValue']
    self[Event.data['eqID']].fileid = Event.data['FileID']
    self[Event.data['eqID']].Original_id = Event.data['eqID']
    self[Event.data['eqID']].Page_position = Event.data['order']
    console.log('In the solver for equation ' + Event.data['eqID'] + ' - ' + Event.data['Equation'])
    self[Event.data['eqID']].Solve_Equation(Event.data['Equation'])
  }
  if (Event.data['cadwolfType'] == 'SolveTableCell') {
    console.log(
      'The table ID, row, and column are ' +
        Event.data['tableID'] +
        ' - ' +
        Event.data['tableRow'] +
        ' - ' +
        Event.data['tableCol']
    )
    eqobj = {
      Page_position: Event.data['order'],
      equation: 'myTableCell' + Event.data['Equation'],
      tableID: Event.data['tableID'],
      tableRow: Event.data['tableRow'],
      tableCol: Event.data['tableCol']
    }
    eqID = CreateEq(Event.data['FileID'], 1, eqobj)
  }
  if (Event.data['cadwolfType'] == 'SolveTableFill') {
    solveTableFill(
      Event.data['FileID'],
      Event.data['tableID'],
      Event.data['order'],
      Event.data['fillType'],
      Event.data['tableRow'],
      Event.data['tableCol'],
      Event.data['numRows'],
      Event.data['numCols'],
      1
    )
  }
  if (Event.data['cadwolfType'] == 'solvePlotData') {
    console.log('In solve plot data function with a className of ' + Event.data['className'])
    plotObject = Event.data['plotObject']
    PlotID = Event.data['plotID']
    DataID = Event.data['dataID']
    className = Event.data['className']
    FileID = Event.data['FileID']
    ;(thisEqx = ''), (thisEqy = ''), (thisEqz = ''), (thisEqc = '')
    if (className == 'all') {
      var dataIndex = 0
      for (var dataIndex = 0; dataIndex < plotObject['Chart_dataobj'].length; dataIndex++) {
        if (plotObject['Chart_dataobj'][dataIndex]['Format_id'] == DataID) {
          thisEqx = plotObject['Chart_dataobj'][dataIndex]['xdata_name']
          thisEqy = plotObject['Chart_dataobj'][dataIndex]['ydata_name']
          thisEqz = plotObject['Chart_dataobj'][dataIndex]['zdata_name']
          thisEqc = plotObject['Chart_dataobj'][dataIndex]['cdata_name']
        }
      }
      console.log(
        'The plot and data IDs are ' +
          PlotID +
          ' and ' +
          DataID +
          ' while the x and y equations are ' +
          thisEqx +
          ' and ' +
          thisEqy
      )
      if (thisEqx != '' && thisEqy != '' && thisEqz != '' && thisEqc != '') {
        PassPlotData(plotObject, PlotID, DataID, 'all')
      }
      if (thisEqx != '') {
        eqobj = { Page_position: DOM_Object[PlotID]['order'], equation: 'PlotEq=' + thisEqx }
        eqID = CreateEq(FileID, 0, eqobj)
        if ((thisEqy == '' || thisEqy === undefined) && (thisEqz == '' || thisEqz === undefined)) {
          self[eqID].Solve_Equation('PlotEq=' + thisEqx, function () {
            PrepPlotData(eqID, plotObject, PlotID, DataID, 'plot_xdatainput', function () {
              PassPlotData(plotObject, PlotID, DataID, 'all')
            })
          })
        } else {
          self[eqID].Solve_Equation('PlotEq=' + thisEqx, function () {
            PrepPlotData(eqID, plotObject, PlotID, DataID, 'plot_xdatainput')
          })
        }
      }
      if (thisEqy != '') {
        eqobj = { Page_position: DOM_Object[PlotID]['order'], equation: 'PlotEq=' + thisEqy }
        eqID = CreateEq(FileID, 0, eqobj)
        if (thisEqz == '' || thisEqz === undefined) {
          self[eqID].Solve_Equation('PlotEq=' + thisEqy, function () {
            PrepPlotData(eqID, plotObject, PlotID, DataID, 'plot_ydatainput', function () {
              PassPlotData(plotObject, PlotID, DataID, 'all')
            })
          })
        } else {
          self[eqID].Solve_Equation('PlotEq=' + thisEqy, function () {
            PrepPlotData(eqID, plotObject, PlotID, DataID, 'plot_ydatainput')
          })
        }
      }
      if (thisEqz != '' && thisEqz !== undefined) {
        eqobj = { Page_position: DOM_Object[PlotID]['order'], equation: 'PlotEq=' + thisEqz }
        eqID = CreateEq(FileID, 0, eqobj)
        self[eqID].Solve_Equation('PlotEq=' + thisEqz, function () {
          PrepPlotData(eqID, plotObject, PlotID, DataID, 'plot_zdatainput', function () {
            PassPlotData(plotObject, PlotID, DataID, 'all')
          })
        })
      }
      if (thisEqc != '' && thisEqc != undefined) {
        eqobj = { Page_position: DOM_Object[PlotID]['order'], equation: 'PlotEq=' + thisEqc }
        eqID = CreateEq(FileID, 0, eqobj)
        self[eqID].Solve_Equation('PlotEq=' + thisEqc, function () {
          PrepPlotData(eqID, plotObject, PlotID, DataID, 'plot_cdatainput', function () {
            PassPlotData(plotObject, PlotID, DataID, 'all')
          })
        })
      }
    } else if (className == 'Lathe') {
      thisEq = plotObject['Chart_dataobj'][dataIndex]['curvetext']
      eqobj = {
        Page_position: DOM_Object[PlotID]['order'],
        Format_showtype: 'InnerFunction',
        equation: 'PlotEq=' + thisEq
      }
      eqID = CreateEq(FileID, 0, eqobj)
      self[eqID].Solve_Equation('PlotEq=' + thisEq, function () {
        PrepPlotData(eqID, plotObject, PlotID, DataID, className, function () {
          PassPlotData(plotObject, PlotID, DataID, className)
        })
      })
    } else {
      for (var thisData = 0; thisData < plotObject['Chart_dataobj'].length; thisData++) {
        if (plotObject['Chart_dataobj'][thisData]['Format_id'] == DataID) {
          console.log('For data id ' + DataID + ', the name is ' + plotObject['Chart_dataobj'][thisData]['ydata_name'])
          var thisEq = ''
          if (className == 'plot_xdatainput') {
            thisEq = plotObject['Chart_dataobj'][thisData]['xdata_name']
          }
          if (className == 'plot_ydatainput') {
            thisEq = plotObject['Chart_dataobj'][thisData]['ydata_name']
          }
          if (className == 'plot_zdatainput') {
            thisEq = plotObject['Chart_dataobj'][thisData]['zdata_name']
          }
          if (className == 'plot_cdatainput') {
            thisEq = plotObject['Chart_dataobj'][thisData]['cdata_name']
          }
          if (className == 'xLathe') {
            thisEq = plotObject['Chart_dataobj'][thisData]['xdata_name']
          }
          if (className == 'yLathe') {
            thisEq = plotObject['Chart_dataobj'][thisData]['ydata_name']
          }
          if (thisEq == '') {
            thisEq = '[0:1:' + Object.keys(plotObject['Chart_dataobj'][thisData]['PointData']).length - 1 + ']'
          }
        }
      }
      eqobj = {
        Page_position: DOM_Object[PlotID]['order'],
        Format_showtype: 'InnerFunction',
        equation: 'PlotEq=' + thisEq
      }
      eqID = CreateEq(FileID, 0, eqobj)
      self[eqID].Solve_Equation('PlotEq=' + thisEq, function () {
        PrepPlotData(eqID, plotObject, PlotID, DataID, className, function () {
          PassPlotData(plotObject, PlotID, DataID, className)
        })
      })
    }
  }
  if (Event.data['cadwolfType'] == 'FormatSolution') {
    eqObj = Event.data['eqObject']
    eqID = Event.data['eqID']
    self[eqID] = new Equation(eqID)
    for (var objProp in eqObj) {
      self[eqID][objProp] = eqObj[objProp]
    }
    self[eqID].Show_Solution(function () {
      passSolutionResults(eqID)
    })
  }
  if (Event.data['cadwolfType'] == 'SolveStructure') {
    for (var itemID in DOM_Object) {
      console.log('Creating a new item for ' + itemID)
      if (DOM_Object[itemID]['component_type_id'] == '8') {
        self[itemID] = new IfElse(DOM_Object[itemID])
      }
      if (DOM_Object[itemID]['component_type_id'] == '6') {
        self[itemID] = new ForLoop(DOM_Object[itemID])
      }
      if (DOM_Object[itemID]['component_type_id'] == '7') {
        self[itemID] = new WhileLoop(DOM_Object[itemID])
      }
      if (DOM_Object[itemID]['component_type_id'] == '3') {
        self[itemID] = new Equation(itemID, DOM_Object[itemID]['name'], DOM_Object[itemID]['fileid'])
        self[itemID].fileid = DOM_Object[itemID]['fileid']
        self[itemID].Original_id = itemID
        self[itemID].Page_position = DOM_Object[itemID]['order']
        self[itemID].order = DOM_Object[itemID]['order']
        self[itemID].Format_id = itemID
        for (var objProp in DOM_Object[itemID]) {
          self[itemID][objProp] = DOM_Object[itemID][objProp]
        }
        console.log(
          'I just created ' +
            itemID +
            ' with the name ' +
            DOM_Object[itemID]['name'] +
            ' and fileid of ' +
            DOM_Object[itemID]['fileid']
        )
      }
    }
    DoStructures(Event.data['ID'], 0, 1, function () {
      Return_Structure(Event.data['ID'])
    })
  }

  // Actually solves each of the three parameters for a for loop
  if (Event.data['cadwolfType'] == 'SolveLoopParameters') {
    self[Event.data['LoopID']] = Event.data['loopObject']
    self[Event.data['LoopID']].fileid = Event.data['FileID']
    DOM_Object[Event.data['LoopID']] = Event.data['loopObject']
    DOM_Object[Event.data['LoopID']].fileid = Event.data['FileID']
    DOM_Object[Event.data['LoopID']]['order'] = Event.data['order']
    SolveLoopParameters(Event.data['LoopID'], function () {
      PassForLoopParameters(Event.data['LoopID'])
    })
  }

  // Solves the equations within a while loop statement (not the structure)
  if (Event.data['cadwolfType'] == 'SolveWhileLoopParameters') {
    // self[Event.data['ID']]=new WhileLoop(Event.data['loopObject']);
    self[Event.data['LoopID']] = Event.data['loopObject']
    self[Event.data['LoopID']].fileid = Event.data['FileID']
    DOM_Object[Event.data['LoopID']] = Event.data['loopObject']
    DOM_Object[Event.data['LoopID']].fileid = Event.data['FileID']
    DOM_Object[Event.data['LoopID']]['order'] = Event.data['order']
    SolveWhileLoopParameters(Event.data['ID'], 1, function () {
      CheckWhileLoop(Event.data['ID'], function () {
        PassWhileParameters(Event.data['ID'])
      })
    })
  }

  // Solves the equations within an if/else statement (not the structure)
  if (Event.data['cadwolfType'] == 'SolveIfElseParameters') {
    // self[Event.data['ID']]=new IfElse(Event.data['loopObject']);
    self[Event.data['LoopID']] = Event.data['loopObject']
    self[Event.data['LoopID']].fileid = Event.data['FileID']
    DOM_Object[Event.data['LoopID']] = Event.data['loopObject']
    DOM_Object[Event.data['LoopID']]['order'] = Event.data['order']
    DOM_Object[Event.data['LoopID']].fileid = Event.data['FileID']
    SolveIfElseParameters(Event.data['ID'], function () {
      CheckStatement(Event.data['ID'], function () {
        PassIfElseParameters(Event.data['ID'])
      })
    })
  }
  if (Event.data['cadwolfType'] == 'SolveSurfaceData') {
    solveSurfaceData(
      Event.data['PlotID'],
      Event.data['DataID'],
      Event.data['dataObject'],
      Event.data['axis'],
      Event.data['type'],
      Event.data['Props']
    )
  }
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function formatScaleUnits(thisUnits) {
  var newUnits = []
  for (var a = 0; a < thisUnits.length; a++) {
    newUnits[thisUnits[a]['unit']] = thisUnits[a]
  }
  return newUnits
}

function formatConstants(thisConstants) {
  var newItem = []
  for (var a = 0; a < thisConstants.length; a++) {
    newItem[thisConstants[a]['name']] = thisConstants[a]
  }
  return newItem
}

function formatParseUnits(thisUnits) {
  var newUnits = []
  for (var a = 0; a < thisUnits.length; a++) {
    newUnits[thisUnits[a]['name']] = thisUnits[a]
  }
  return newUnits
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*----------------------------------------------------------- SOLVE THE ELEMENTS OF A TABLE ---------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This is the function that solves for all the cells that are being solved for when a table is filled left, right, up, or down. There are 8 inputs that help guide	|
	the function to its solution. Overall, the code is exactly what you would expect. That is, it simply solves one table cell and then moves on to the next cell and   |
    solves it until it reaches the end of the table.                                                                                                                    |
    The code has X parts :                                                                                                                                              |
        1.  The first time through, the code creates an equation to use to solve the cell and it creates the variables needed                                           |
        2.  Based upon the direction that the fill is moving, the code will change the cell indices in question to be the next one in the table. It also sets the       |
            indices of the previously solved table cell to the value of the solution from the previous solve.                                                           |
        3.  
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function solveTableFill(fileID, tableID, Location, fillType, tableRow, tableCol, numRows, numCols, firstRun, thisID) {
  var thisEquation = '',
    tableMatch = [],
    tableMatchNo = [],
    rowNum = 0,
    colNum = 0,
    colNumArr = [],
    rowNumArr = [],
    replacement = '',
    newIndex = '',
    newCol = '' //  |
  if (firstRun == '1') {
    tableCells = {}
    var eqobj = { Page_position: Location, Format_showtype: 'InnerFunction' }
    var thisID = CreateEq(fileID, 0, eqobj)
    self[thisID]['Format_left'] = 'mytablefill'
    thisEquation = DOM_Object[tableID]['data'][tableRow][tableCol]['equation']
  } else {
    console.log('The ID for the table fill is ' + thisID)
    console.log(
      'Setting the values for row ' + tableRow + ' and column ' + tableCol + ' to ' + DOM_Object[thisID]['real']['0-0']
    )
    DOM_Object[tableID]['data'][tableRow][tableCol]['equation'] = DOM_Object[thisID]['equation'].replace(
      /^mytablefill/,
      ''
    )
    DOM_Object[tableID]['data'][tableRow][tableCol]['real'] = DOM_Object[thisID]['real']['0-0']
    DOM_Object[tableID]['data'][tableRow][tableCol]['imag'] = DOM_Object[thisID]['imag']['0-0']
    DOM_Object[tableID]['data'][tableRow][tableCol]['units'] = DOM_Object[thisID]['units']
    thisEquation = DOM_Object[tableID]['data'][tableRow][tableCol]['equation']
    tableMatch = thisEquation.match(/\#File[0-9]+Table[0-9]+\.[A-Z]+\.[0-9+]/g) //  |
    tableMatchNo = thisEquation.match(/\#File[0-9]+Table[0-9]+\.[A-Z]+\.\$[0-9+]/g) //  |
    if (tableMatchNo != null) {
      for (var a = 0; a < tableMatchNo.length; a++) {
        tableMatch.push(tableMatchNo[a])
      }
    } //  |
    tableMatchNo = thisEquation.match(/\#File[0-9]+Table[0-9]+\.\$[A-Z]+\.[0-9+]/g) //  |
    if (tableMatchNo != null) {
      for (var a = 0; a < tableMatchNo.length; a++) {
        tableMatch.push(tableMatchNo[a])
      }
    } //  |
    if (fillType == 'right') {
      var tableCol = tableCol + 1
    } //	|
    if (fillType == 'left') {
      var tableCol = tableCol - 1
    } //	|
    if (fillType == 'down') {
      var tableRow = tableRow + 1
    } //	|
    if (fillType == 'up') {
      var tableRow = tableRow - 1
    } //	|
  } //	|
  if (fillType == 'left' || fillType == 'right') {
    //	|
    if ((fillType == 'left' && tableCol >= 0) || (fillType == 'right' && tableCol < numCols)) {
      //	|
      if (firstRun == 0) {
        //	|
        for (
          var a = 0;
          a < tableMatch.length;
          a++ //  |
        ) {
          colNumArr = tableMatch[a].match(/\.[A-Z]+\.[0-9]+$/) //  |
          if (colNumArr != null) {
            //  |
            colNum = colNumArr[0]
              .replace(/^\./, '')
              .replace(/\.[0-9]+$/, '')
              .replace(/\.\$[0-9]+$/, '') //  |
            rowNum = colNumArr[0].replace(/^\.[A-Z]+\./, '').replace(/^\.\$[A-Z]+\./, '') //  |
            if (fillType == 'left') {
              newIndex = String.fromCharCode(colNum.charCodeAt() - 1)
            } //	|
            if (fillType == 'right') {
              newIndex = String.fromCharCode(colNum.charCodeAt() + 1)
            } //	|
            replacement = tableMatch[a].replace(/\.[A-Z]+\.[0-9]+$/, '.' + newIndex + '.' + rowNum) //	|
            thisEquation = thisEquation.replace(tableMatch[a], replacement) //	|
          } //  |
          colNumArr = tableMatch[a].match(/\.[A-Z]+\.\$[0-9]+$/) //  |
          if (colNumArr != null) {
            //  |
            colNum = colNumArr[0]
              .replace(/^\./, '')
              .replace(/\.[0-9]+$/, '')
              .replace(/\.\$[0-9]+$/, '') //  |
            rowNum = colNumArr[0].replace(/^\.[A-Z]+\./, '').replace(/^\.\$[A-Z]+\./, '') //  |
            if (fillType == 'left') {
              newIndex = String.fromCharCode(colNum.charCodeAt() - 1)
            } //	|
            if (fillType == 'right') {
              newIndex = String.fromCharCode(colNum.charCodeAt() + 1)
            } //	|
            replacement = tableMatch[a].replace(/\.[A-Z]+\.\$[0-9]+$/, '.' + newIndex + '.$' + rowNum) //	|
            thisEquation = thisEquation.replace(tableMatch[a], replacement) //	|
          } //  |
        } //	|
      } //	|
      DOM_Object[tableID]['data'][tableRow][tableCol]['equation'] = thisEquation //	|
      DOM_Object[tableID]['data'][tableRow][tableCol]['needsUpdateFlag'] = 1 //	|
      self[thisID]['Format_right'] = thisEquation //	|
      DOM_Object[thisID]['equation'] = 'mytablefill' + thisEquation //	|
      eqPromise(thisID).then(
        solveTableFill(
          fileID,
          tableID,
          Location,
          fillType,
          parseInt(tableRow),
          parseInt(tableCol),
          numRows,
          numCols,
          0,
          thisID
        )
      ) //	|
    } //	|
    else {
      postMessage({ messageType: 'FullTable', tableID: tableID, tableData: DOM_Object[tableID]['data'] })
    } //	|
  } //	|
  if (fillType == 'down' || fillType == 'up') {
    //	|
    if ((fillType == 'down' && tableRow < numRows) || (fillType == 'up' && tableRow >= 0)) {
      //	|
      if (firstRun == 0) {
        //	|
        for (
          var a = 0;
          a < tableMatch.length;
          a++ //  |
        ) {
          rowNumArr = tableMatch[a].match(/\.[A-Z]+\.[0-9]+$/) //  |
          if (rowNumArr != null) {
            //  |
            rowNum = rowNumArr[0].replace(/^\.[A-Z]+\./, '').replace(/^\.\$[A-Z]+\./, '') //  |
            colNum = rowNumArr[0]
              .replace(/^\./, '')
              .replace(/\.[0-9]+$/, '')
              .replace(/\.\$[0-9]+$/, '') //  |
            if (fillType == 'up') {
              newIndex = parseInt(rowNum) - 1
            } //	|
            if (fillType == 'down') {
              newIndex = parseInt(rowNum) + 1
            } //	|
            replacement = tableMatch[a].replace(/\.[A-Z]+\.[0-9]+$/, '.' + colNum + '.' + newIndex) //	|
            thisEquation = thisEquation.replace(tableMatch[a], replacement) //	|
          } //  |
          rowNumArr = tableMatch[a].match(/\.\$[A-Z]+\.[0-9]+$/) //  |
          if (rowNumArr != null) {
            //  |
            rowNum = rowNumArr[0].replace(/^\.[A-Z]\./, '').replace(/^\.\$[A-Z]\./, '') //  |
            colNum = rowNumArr[0]
              .replace(/^\./, '')
              .replace(/\.[0-9]+$/, '')
              .replace(/\.\$[0-9]+$/, '') //  |
            if (fillType == 'up') {
              newIndex = parseInt(rowNum) - 1
            } //	|
            if (fillType == 'down') {
              newIndex = parseInt(rowNum) + 1
            } //	|
            replacement = tableMatch[a].replace(/\.\$[A-Z]+\.[0-9]+$/, '.$' + colNum + '.' + newIndex) //	|
            thisEquation = thisEquation.replace(tableMatch[a], replacement) //	|
          } //	|
        } //	|
      } //	|
      DOM_Object[tableID]['data'][tableRow][tableCol]['equation'] = thisEquation //	|
      DOM_Object[tableID]['data'][tableRow][tableCol]['needsUpdateFlag'] = 1 //	|
      self[thisID]['Format_right'] = thisEquation //	|
      DOM_Object[thisID]['equation'] = 'mytablefill' + thisEquation //	|
      console.log('The ID for the table fill is ' + thisID)
      eqPromise(thisID).then(
        solveTableFill(
          fileID,
          tableID,
          Location,
          fillType,
          parseInt(tableRow),
          parseInt(tableCol),
          numRows,
          numCols,
          0,
          thisID
        )
      ) //	|
    } //	|
    else {
      postMessage({ messageType: 'FullTable', tableID: tableID, tableData: DOM_Object[tableID]['data'] })
    } //	|
  } //	|
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------ GET ID -------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function Get_ID(type, file) {
  var flag = 0,
    id = '',
    testflag = 0,
    PlotID = '',
    DataID = '',
    AxisID = '',
    RID = '',
    LineID = '',
    BandID = '',
    RefID = ''
  file = 'File' + file
  if (type == 'Equation') {
    while (flag === 0) {
      id = file + 'var' + Math.floor(Math.random() * 100000 + 1)
      if (DOM_Object[id] === undefined) {
        flag = 1
      }
    }
  } else if (type == 'ForLoop') {
    while (flag === 0) {
      id = file + 'forLoop' + Math.floor(Math.random() * 10000 + 1)
      if (DOM_Object[id] === undefined) {
        flag = 1
      }
    }
  } else if (type == 'WhileLoop') {
    while (flag === 0) {
      id = file + 'whileLoop' + Math.floor(Math.random() * 10000 + 1)
      if (DOM_Object[id] === undefined) {
        flag = 1
      }
    }
  } else if (type == 'IfElseStatement') {
    while (flag === 0) {
      id = file + 'IfElse' + Math.floor(Math.random() * 10000 + 1)
      if (DOM_Object[id] === undefined) {
        flag = 1
      }
    }
  } else if (type == 'Table') {
    while (flag === 0) {
      id = file + 'Table' + Math.floor(Math.random() * 10000 + 1)
      if (DOM_Object[id] === undefined) {
        flag = 1
      }
    }
  }
  return id
}
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------//

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*--------------------------------------------------------- Functions to Parse Equations ------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

//-------------------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------- THE EQUATION OBJECT --------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
function Equation(id, name, fileid) {
  UnitList = new Array('A', 'K', 's', 'm', 'kg', 'cd', 'mol', 'molecules', 'rad')
  this.Format_id = id // 	\
  this.itemid = id // 	\
  this.Original_id = id // 	\
  if (name) {
    this.Format_name = name
  } else {
    this.Format_name = 'TempEq'
  } // 	\
  this.Format_equation = '' // 	\
  this.Format_showequation = '' // 	\
  this.Format_showsolution = '' // 	\
  this.Format_equationinuse = '' // 	\
  this.Format_right = '' // 	\
  this.Format_left = ''
  this.Format_size = '1x1' // 	\
  this.Format_numinds = '' // 	\
  this.Format_type = 1 // 	\
  this.Format_haschanged = 1 // 	\
  this.Format_showtype = 'top' // 	\
  this.Format_showvalue = 'default' // 	\
  this.Format_showcomponent = '' // 	\
  this.Format_editinuse = 1 // 	\
  this.Solving = 1
  this.Solution_convsol = '' // 	\
  this.Solution_real = {} // 	\
  this.Solution_imag = {} // 	\
  this.Solution_input_array = new Array() // 	\
  this.Solution_inputs = new Array() // 	\
  this.Solution_variable_array = new Array() // 	\
  this.Solution_key_array = new Array() // 	\
  this.Solution_unit_array = new Array() // 	\
  this.Solution_object_array = new Array() // 	\
  this.Solution_temps = new Array() // 	\
  this.Solution_PostFix = new Array() // 	\
  this.Solution_Post_Units = new Array() // 	\
  this.Solution_realdefault = 0
  this.Solution_imagdefault = 0
  this.Page_parentid = 'none' // 	\
  this.Page_topparentid = 'none' // 	\
  this.Page_position = 0 // 	\
  this.Units_units = '' // 	\
  this.Units_showunits = '' // 	\
  this.Units_conv_units = '' // 	\
  this.Units_unit_array = new Array() // 	\
  this.Units_conv_array = new Array() // 	\
  this.Units_scaled_array = new Array() // 	\
  this.Units_base_array = {} // 	\
  this.Units_base_string = '00000000' // 	\
  this.Units_multiplier = 1 // 	\
  this.Units_quantity = '' // 	\
  this.Models_numerical = '' // 	\
  this.Models_units = '' // 	\
  this.Models_dimensions = '' // 	\
  this.Models_quantities = '' // 	\
  this.Errors_flag = 0 // 	\
  this.Errors_errors = new Array() // 	\
  this.FaF = {}
  this.fileid = fileid
  this.connected_ids = {}
  for (var unitindex = 0; unitindex < UnitList.length; ++unitindex) {
    this.Units_base_array[UnitList[unitindex]] = 0
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------- MAIN SOLVE EQUATION FUNCTION ----------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.Solve_Equation = function (equation, callback) {
  console.log(
    'The equation being solved is ' + equation + ' and it is a ' + this.Format_showtype + ' on ' + this.Format_id
  )
  var thisfile = this.Format_id.replace(/^File/, '').match(/^[0-9]+/)
  DOM_Object[this.Format_id]['Dependents'] = {}
  if (this.Page_parentid == 'none') {
    this.Solution_real = {}
    this.Solution_imag = {}
  }
  var id = this.Format_id
  if (typeof equation != 'undefined') {
    this.Populate_Equation(equation)
  } else {
    this.Populate_Equation(this.Format_equation)
  }
  if (this.Errors_flag == 0) {
    self[id].Get_Variables(function () {
      self[id].Check_String(function () {
        self[id].Recombine_Units(function () {
          self[id].Parse_Inputs(function () {
            self[id].Replace_Inputs(function () {
              self[id].Flag_BuiltInEquations(function () {
                self[id].Remove_BuiltInEquations(0, function () {
                  self[id].Remove_SubEquations(function () {
                    self[id].Remove_FilesAsFunctions(function () {
                      self[id].Replace_Variables(function () {
                        self[id].Replace_CAD(function () {
                          self[id].Replace_Constants(function () {
                            self[id].Replace_Matrix_Pieces(function () {
                              self[id].Replace_Vectors(function () {
                                self[id].Replace_Matrices(function () {
                                  self[id].Replace_Numbers(function () {
                                    self[id].Replace_Tables(function () {
                                      self[id].Check_Imaginary(function () {
                                        self[id].Check_Negatives(function () {
                                          self[id].Check_Equation(function () {
                                            self[id].Unit_Array(function () {
                                              self[id].Scale_Units(function () {
                                                self[id].Decompose_Units(function () {
                                                  self[id].Get_BaseString(function () {
                                                    self[id].Convert_to_Post(function () {
                                                      self[id].SolvePostFix(function () {
                                                        self[id].Recompose_Units(function () {
                                                          self[id].Format_Fractions(function () {
                                                            self[id].Matrix_SubComp(function () {
                                                              self[id].Get_My_BaseString(function () {
                                                                self[id].Show_Equation(function () {
                                                                  self[id].Get_Size(function () {
                                                                    self[id].Show_Solution(function () {
                                                                      self[id].Models(function () {
                                                                        self[id].Equation_Cleanup(function () {
                                                                          self[id].Return_Equation(function () {
                                                                            if (typeof callback == 'function') {
                                                                              callback()
                                                                            } else if (typeof callback == 'string') {
                                                                              var func = new Function(callback)
                                                                              func()
                                                                            }
                                                                          })
                                                                        })
                                                                      })
                                                                    })
                                                                  })
                                                                })
                                                              })
                                                            })
                                                          })
                                                        })
                                                      })
                                                    })
                                                  })
                                                })
                                              })
                                            })
                                          })
                                        })
                                      })
                                    })
                                  })
                                })
                              })
                            })
                          })
                        })
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------------------- POPULATE EQUATION --------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
/*	This function takes the equation and populates the components of the equation object necessary to solve the equations.				|
	Case 1 - the equation starts with an equal sign this is usually in a table element													|
	Case 2 - a show equation																											|
	Case 3 - a matrix component																											|
	Case 4 - A standard equation with no inputs																							|
	Case 5 - The case where the user is calling  [a, b] = Function(inputs)																|
//-------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Populate_Equation = function (equation) {
  var temp = '',
    split_eq = '',
    re = '',
    num = 0

  // Prep for the solution - reset errors and remove blank spaces at the beginning and end
  this.Format_equation = equation.replace(/^\s+|\s+$/g, '')
  this.Format_showequation = 'Error'
  this.Errors_errors = new Array()
  this.Errors_flag = 0
  if (this.Page_parentid === undefined) {
    this.Page_parentid = 'none'
  }
  if (this.Page_topparentid === undefined) {
    this.Page_topparentid = 'none'
  }

  // If this is a special case of a subequation, it will have inputs that need to be removed
  if (this.Format_showtype == 'subequation') {
    this.Parse_Inputs()

    // If this equation ends with a "=" it is a display equation
  } else if (this.Format_equation.match(/\=$/)) {
    temp = this.Format_equation.replace(/\=$/, '')
    temp = temp.toString().replace(/^\s+|\s+$/g, '')
    this.Format_left = temp
    this.Format_right = temp
    this.Format_name = temp
    this.Format_equation = temp
    this.Format_equationinuse = temp
    this.Format_type = '5'

    // If the equation has a "]=" then it is setting a portion of an array
  } else if (this.Format_equation.match(/\]=/)) {
    split_eq = equation.split('=')
    this.Format_left = split_eq[0].replace(/^\s+|\s+$/g, '')
    this.Format_right = split_eq[1]
    this.Format_equationinuse = split_eq[1]
    this.Format_name = this.Format_left.replace(/\[[\:\+\-\*\\0-9,a-z,A-Z]+\]/g, '')
    this.Format_type = '3'

    // We are left with a hopefully normal equation
  } else {
    this.Format_type = '1'

    // If this equation has no "=" then throw an error
    if (!this.Format_equation.match(/\=/)) {
      Set_Error(this.Original_id, 'Format7')
      this.Return_Equation()

      // Now, we separate out the parts of the equation
    } else {
      temp = equation.match(/([^=]*)=(.*)/)
      this.Format_left = temp[1].replace(/^\s+|\s+$/g, '')
      this.Format_right = temp[2].replace(/^\s+|\s+$/g, '')
      this.Format_name = temp[1].replace(/\[[0-9,a-z,A-Z]+\]/g, '').replace(/^\s+|\s+$/g, '')
      this.Format_equation = temp[2].replace(/^\s+|\s+$/g, '')
      this.Format_equationinuse = this.Format_right

      // Check again to ensure that there is an "=" in the equation
      re = /\=/
      num = equation.match(re)
      if (num.length === 0) {
        Set_Error(this.Original_id, 'Format15')
      }
    }
    if (this.Format_equation.match(/^\[/)) {
      this.Format_type = '6'
    }
  }

  // Set up the units and models
  this.Units_showunits = ''
  this.Models_numerical = ''
  this.Models_units = ''
  this.Models_dimensions = ''
  this.Models_quantities = ''

  if (DOM_Object[this.Format_id] !== undefined) {
    DOM_Object[this.Format_id]['name'] = this.Format_name
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------------- GET VARIABLES ------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
/*	This function takes the equation and parses out the individual variables within it. It records the unit array and the variable 		\
	array for the equation as part of the object.  													 									\
//-------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Get_Variables = function (callback) {
  this.Solution_variable_array = SplitText(this.Format_right)

  for (var a = 0; a < this.Solution_variable_array.length; a++) {
    var test = this.Solution_variable_array[a]
    if (test.match(/^[0-9,\.]+[a-z,A-Z,\/,\*,\-]+$/)) {
      var number = test.match(/^[0-9,\.]+/)
      var unit = test.match(/[a-z,A-Z,\/,\*,\-]+$/)
      this.Solution_variable_array[a] = number.toString()
      this.Solution_variable_array.splice(a + 1, 0, unit.toString())
    }
  }

  if (typeof callback == 'function') {
    callback()
  }
}
function SplitText(temp) {
  temp = temp.toString().replace(/^\s+|\s+$/g, '')
  temp = temp.toString().replace(/\s+[+]\s+/g, '?+?')
  temp = temp.toString().replace(/\s+[-]\s+/g, '?-?')
  temp = temp.toString().replace(/\s+[*]\s+/g, '?*?')
  temp = temp.toString().replace(/\.\*/g, '?#?')
  temp = temp.toString().replace(/\+/g, '?+?')
  temp = temp.toString().replace(/\-/g, '?-?')
  temp = temp.toString().replace(/\*/g, '?*?')
  temp = temp.toString().replace(/\,/g, '?,?')
  temp = temp.toString().replace(/\;/g, '?;?')
  temp = temp.toString().replace(/\:/g, '?:?')
  temp = temp.toString().replace(/\s/g, '?')
  //temp=temp.toString().replace(/{/g,"?{?");
  //temp=temp.toString().replace(/}/g,"?}?");
  temp = temp.toString().replace(/\]/g, '?]?')
  temp = temp.toString().replace(/\[/g, '?[?')
  temp = temp.toString().replace(/\(/g, '?(?')
  temp = temp.toString().replace(/\)/g, '?)?')
  temp = temp.toString().replace(/\\/g, '? \\?')
  temp = temp.toString().replace(/\//g, '?/?')
  temp = temp.toString().replace(/,+$/, '')
  temp = temp.toString().replace(/\^/g, '?^?')
  temp = temp.toString().replace(/\?{2,100}/g, '?')
  temp = temp.toString().replace(/^\?\-\?/, '-?')
  temp = temp.toString().replace(/\s+$/, '')
  temp = temp.toString().replace(/^\s+/, '')
  temp = temp.toString().replace(/^\s+|\s+$/g, '')
  temp = temp.toString().replace(/^\?+|\?+$/g, '')
  splittext = temp.split('?')
  return splittext
}
//-------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------------------- CHECK STRING ----------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
/*	This function checks to make sure that the equation entered makes sense. 															\
	These checks include :																												\
	making sure that the equation has matching parenthesis																				\
	making sure that the equation has matching square brackets																			\
	making sure that the name doesn't conflict with constants																			\
	making sure that the equation has a name																							\
	making sure that there is an equation																								\
//-------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Check_String = function (callback) {
  var pcounter = 0,
    bcounter = 0,
    index = 0,
    test = '',
    unit = '',
    myRe = '',
    testRe = ''

  // Are there equal parenthesis
  for (index = 0; index < this.Solution_variable_array.length; ++index) {
    test = this.Solution_variable_array[index]
    if (test == '(') {
      pcounter = parseInt(pcounter, 10) + 1
    }
    if (test == ')') {
      pcounter = parseInt(pcounter, 10) - 1
    }
    if (test == '[') {
      bcounter = parseInt(bcounter, 10) + 1
    }
    if (test == ']') {
      bcounter = parseInt(bcounter, 10) - 1
    }
  }
  if (pcounter > 0 || pcounter < 0) {
    Set_Error(this.Original_id, 'Format4', pcounter, 'NA')
  }
  if (bcounter > 0 || bcounter < 0) {
    Set_Error(this.Original_id, 'Format5', pcounter, 'NA')
  }

  // Check the reserved names
  if (this.Format_name == 'TempEq' && this.Format_showtype == 'top') {
    Set_Error(this.Original_id, 'Format6')
  }
  for (var ConstantName in Constants) {
    if (ConstantName == this.Format_name) {
      Set_Error(this.Original_id, 'Format1', 'NA', 'NA')
    }
  }

  // Check the scaled units
  for (unit in scaleUnits) {
    if (this.Format_name == unit) {
      Set_Error(this.Original_id, 'Format12')
    }
  }

  // Check the length
  if (this.Format_name.length < 1) {
    Set_Error(this.Original_id, 'Format13')
  }

  // Make sure that the name has some letters
  myRe = /[a-zA-Z]+/g
  testRe = myRe.exec(this.Format_name)
  if (testRe == -1) {
    Set_Error(this.Original_id, 'Format13')
  }

  // Make sure that the equation has a name and an equation
  if (this.Format_name === '' || this.Format_name === ' ') {
    Set_Error(this.Original_id, 'Format7')
  }
  if (this.Format_equation === '' || this.Format_equation === ' ') {
    Set_Error(this.Original_id, 'Format6')
  }

  if (typeof callback == 'function') {
    callback()
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------------------- RECOMBINE UNITS--------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
/*	The process of splitting an equation into its variables also splits units from numbers and splits units at division, multiple, 		\
	and power signs. This function looks at those split items and determines whether or not they were meant to be combined. If so, 		\
	they are placed together.																											\
	Step 1 : For each item in the array, if it matches any of the base units, then set the key array for that entry to one.				\
	Step 2 : If the item is a division or multiply or power, turn it on																	\
	Step 3 : Look for parenthesis surrounding the units																					\
	Step 4 : Repeat step 2 now that the parenthesis have been set																		\
	Step 5 : Combine units adjacent to each other and deletes the old spots. 															\
//-------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Recombine_Units = function (callback) {
  var index = 0,
    flag = 0,
    a = 0,
    test = ''
  var id = this.Format_id

  // Initiate the key array to 0 at each point
  this.Solution_key_array = new Array(parseInt(this.Solution_variable_array.length, 10))
  for (index = 0; index < this.Solution_variable_array.length; ++index) {
    this.Solution_key_array[index] = 0
  }

  // Check each index and if it matches a unit, mark it as 1
  for (index = 0; index < this.Solution_variable_array.length; index++) {
    if (scaleUnits[self[id].Solution_variable_array[index]] !== undefined) {
      self[id].Solution_key_array[index] = 1
    }
  }

  // If a *, *, or ^ is surrounded by units, mark it as a unit
  for (index = 0; index < this.Solution_variable_array.length; index++) {
    if (this.Solution_variable_array[index] == '*' || this.Solution_variable_array[index] == '/') {
      if (this.Solution_key_array[index - 1] == 1 && this.Solution_key_array[index + 1] == 1) {
        this.Solution_key_array[index] = 1
      }
    }
    if (this.Solution_variable_array[index] == '^') {
      if (isNumber(this.Solution_variable_array[index + 1]) && this.Solution_key_array[index - 1] == 1) {
        this.Solution_key_array[index] = 1
        this.Solution_key_array[index + 1] = 1
      }
    }
  }

  // If parenthesis surround units, mark the parenthesis as units too
  for (index = 0; index < this.Solution_variable_array.length; index++) {
    if (
      this.Solution_variable_array[index] == '(' &&
      this.Solution_key_array[index + 1] == 1 &&
      this.Solution_key_array[index] === 0
    ) {
      flag = 1
      for (a = index; a > 0; a--) {
        if (this.Solution_variable_array[a] == '(' && flag == 1) {
          this.Solution_key_array[a] = 1
        } else {
          flag = 0
        }
      }
    }
    if (
      this.Solution_variable_array[index] == ')' &&
      this.Solution_key_array[index - 1] == 1 &&
      this.Solution_key_array[index] === 0
    ) {
      flag = 1
      for (a = index; a < this.Solution_variable_array.length; a++) {
        if (this.Solution_variable_array[a] == '(' && flag == 1) {
          this.Solution_key_array[a] = 1
        } else {
          flag = 0
        }
      }
    }
  }

  // Go back through the array again and check to see if *, /, and ^ are surrounded by units
  for (index = 0; index < this.Solution_variable_array.length; index++) {
    if (this.Solution_variable_array[index] == '*' || this.Solution_variable_array[index] == '/') {
      if (this.Solution_key_array[index - 1] == 1 && this.Solution_key_array[index + 1] == 1) {
        this.Solution_key_array[index] = 1
      }
    }
    if (this.Solution_variable_array[index] == '^') {
      if (isNumber(this.Solution_variable_array[index + 1]) && this.Solution_key_array[index - 1] == 1) {
        this.Solution_key_array[index] = 1
        this.Solution_key_array[index + 1] = 1
      }
    }
  }

  // If this item is a number followed by
  for (index = 0; index < this.Solution_variable_array.length; index++) {
    test = this.Solution_variable_array[index].match(/^[0-9,.]+\s+[0-9,a-z,A-Z,.,\^,\\,\/,{,},\*]+/)
    if (test) {
      this.Solution_key_array[index - 1] = 0
    }
  }
  for (index = 0; index < this.Solution_variable_array.length; index++) {
    if (
      this.Solution_variable_array[index] == '/' &&
      this.Solution_key_array[index - 1] == 1 &&
      this.Solution_key_array[index + 1] == 1
    ) {
      this.Solution_key_array[index] = 1
    }
  }
  for (index = 0; index < this.Solution_variable_array.length; index++) {
    if (
      this.Solution_variable_array[index] == '/' &&
      this.Solution_variable_array[index - 1] == '1' &&
      this.Solution_key_array[index + 1] == 1
    ) {
      this.Solution_key_array[index] = 1
      this.Solution_key_array[index - 1] = 1
    }
  }
  for (index = this.Solution_variable_array.length - 1; index > 0; --index) {
    if (this.Solution_key_array[index] == 1 && this.Solution_key_array[index - 1] == 1) {
      this.Solution_variable_array[index - 1] =
        this.Solution_variable_array[index - 1] + '' + this.Solution_variable_array[index]
      this.Solution_variable_array.splice(index, 1)
      this.Solution_key_array.splice(index, 1)
    }
  }

  if (typeof callback == 'function') {
    callback()
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------- PREP BUILT IN EQUATIONS ----------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
/*	This function steps through the variable array and denotes any built-in functions. A built-in function is one that is downloaded	\
	as part of the CADWOLF software. When an entry in the variable array matches the text of a built-in function and there is a 		\
	parenthesis after that word, then the algorithm steps through and merges all of the inputs between the parenthesis.					\
//-------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Flag_BuiltInEquations = function (callback) {
  this.inline = 1
  var varlength = 0,
    index = 0,
    i = 0,
    sum = 0,
    index2 = 0,
    testflag = 0
  varlength = this.Solution_variable_array.length

  for (index = 0; index < this.Solution_variable_array.length; index++) {
    for (i in Functions) {
      if (this.Solution_variable_array[index] == Functions[i]) {
        functionfound = i
        sum = 0
        thistext = Functions[i]
        index2 = index + 1
        testflag = 0
        while (testflag === 0 && index2 < varlength) {
          thistext = thistext + this.Solution_variable_array[index2]
          if (this.Solution_variable_array[index2] == '(') {
            sum = sum + 1
          }
          if (this.Solution_variable_array[index2] == ')') {
            sum = sum - 1
            if (sum === 0) {
              testflag = 1
            }
          }
          if (index2 >= varlength + 1) {
            testflag = 1
          }
          this.Solution_variable_array[index2] = 'deleteme'
          index2 = index2 + 1
        }
        this.Solution_variable_array[index] = i
        this.Solution_variable_array[parseInt(index, 10) + 1] = thistext
      }
    }
  }
  for (i = 0; i < this.Solution_variable_array.length; i++) {
    if (
      this.Solution_variable_array[i] == 'deleteme' ||
      this.Solution_variable_array[i] === '' ||
      this.Solution_variable_array[i] === undefined
    ) {
      this.Solution_variable_array.splice(i, 1)
      this.Solution_key_array.splice(i, 1)
      i--
    }
  }

  if (typeof callback == 'function') {
    callback()
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------ REMOVE BUILT IN EQUATIONS ----------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
/*	Now that the variable array has been merged so that all the inputs to a built-in function are set in the entry just after the 		\
	name of the function, this algorithm calls each of those functions one by one and sends them the inputs.							\
//-------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Remove_BuiltInEquations = function (pos, callback) {
  var flag = 0,
    varlength = 0,
    i = '',
    func = ''
  varlength = this.Solution_variable_array.length
  if (pos < varlength) {
    for (i in Functions) {
      if (this.Solution_variable_array[pos] == Functions[i]) {
        functionfound = i
        flag = 1
        if (i == 'parseDate') {
          self[this.Format_id][functionfound](this.Format_right, this.Format_id, pos, callback)
        } else {
          self[this.Format_id][functionfound](
            this.Solution_variable_array[parseInt(pos, 10) + 1],
            this.Format_id,
            pos,
            callback
          )
        }
      }
    }
    if (flag === 0) {
      self[this.Format_id].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
    }
  } else {
    if (typeof callback == 'function') {
      callback()
    } else if (typeof callback == 'string') {
      func = new Function(callback)
      func()
    }
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
/*	The user can enter Force=ma for an equation. Later, they can call that result by entering "Force" into another equation or they 	\
	can enter "Force2=Force(a=9.81m/s^2)+10" and call for the result of the force equation with the acceleration set to the entered 	\
	value plus some additional math. This function looks for any of those subequations. When those functions are found, a separate 		\
	function is called to solve that equation with the substituted value. The text of the subequation is then replaced with the 		\
	equation object that contains the result of that equation with the inputs in question.												\
//-------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Remove_SubEquations = function (callback) {
  var salength = this.Solution_variable_array.length,
    index = 0,
    i = '',
    sum = 0,
    thistest = '',
    index2 = 0,
    testflag = '',
    thistext = '',
    id = ''
  for (index = 0; index < this.Solution_variable_array.length; index++) {
    for (i in DOM_Object) {
      // console.log('Comparing '+this.Solution_variable_array[index]+' to '+DOM_Object[i]['name']+' with the next index of '+this.Solution_variable_array[index+1]);
      if (
        this.Solution_variable_array[index] == DOM_Object[i]['name'] &&
        this.Solution_variable_array[index + 1] == '('
      ) {
        sum = 0
        thistext = DOM_Object[i]['name']
        index2 = index + 1
        testflag = 0
        while (testflag === 0 && index2 <= salength) {
          thistext = thistext + this.Solution_variable_array[index2]
          if (this.Solution_variable_array[index2] == '(') {
            sum = sum + 1
          } else if (this.Solution_variable_array[index2] == ')') {
            sum = sum - 1
            if (sum === 0) {
              testflag = 1
            }
          }
          this.Solution_variable_array[index2] = 'deleteme'
          index2 = index2 + 1
        }
        var eqobj = {
          Page_position: DOM_Object[this.Format_id]['order'],
          Format_showtype: 'subequation',
          Page_parentid: this.Page_parentid,
          Page_topparentid: this.Page_topparentid,
          Original_id: this.Format_id,
          equation: thistext
        }
        var newid = CreateEq(this.fileid, 1, eqobj)
        this.Solution_variable_array[index] = newid
        this.Solution_temps.push(newid)
      }
    }
  }
  for (i = 0; i < this.Solution_variable_array.length; i++) {
    if (this.Solution_variable_array[i] == 'deleteme') {
      this.Solution_variable_array.splice(i, 1)
      this.Solution_key_array.splice(i, 1)
      i--
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

/*-------------------------------------------------------------------------------------------------------------------------------------//
//--------------------------------- CALLING A FILE AS A FUNCTION WITHIN THE DOCUMENT --------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
	This is the function called to find any Files used as functions. It goes through the solution array and compares each remaining 	\
	item to the list of files as functions on this page. If it finds one, it then steps through the solution array and pulls in any    	\
    items that were intended to be inputs to the function into a string. The string is then parsed and the space occupied by the        \
    function call is replaced with the ID of the item created by solving the function.                                                  \
//-------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Remove_FilesAsFunctions = function (callback) {
  var thisid = this.Format_id,
    index = 0,
    flag = 0,
    thisEntry = '',
    inputText = '',
    sum = 0,
    fafFlag = 0
  var saLength = this.Solution_variable_array.length
  for (index = 0; index < this.Solution_variable_array.length; index++) {
    if (this.Solution_variable_array[index] == '(') {
      for (var a = 0; a < ImportedFunctions.length; a++) {
        if (ImportedFunctions[a]['functionName'] == this.Solution_variable_array[parseInt(index, 10) - 1]) {
          fafFlag = 1
          thisText = ''
          index2 = index + 1
          flag = 0
          sum = 1
          this.Solution_variable_array[index] = 'deleteme'
          while (flag == 0 && index2 < saLength) {
            if (this.Solution_variable_array[index2] == '(') {
              sum = sum + 1
            } else if (this.Solution_variable_array[index2] == ')') {
              sum = sum - 1
              if (sum == 0) {
                testflag = 1
              } else {
                inputText = inputText + this.Solution_variable_array[index2]
              }
            } else {
              inputText = inputText + this.Solution_variable_array[index2]
            }
            this.Solution_variable_array[index2] = 'deleteme'
            index2 = index2 + 1
          }
          inputs = InputArray(inputText)
          for (i = 0; i < this.Solution_variable_array.length; i++) {
            if (this.Solution_variable_array[i] == 'deleteme') {
              this.Solution_variable_array.splice(i, 1)
              this.Solution_key_array.splice(i, 1)
              i--
            }
          }
          this.solveFAF(ImportedFunctions[a]['functionName'], inputs, index - 1, callback)
        }
      }
    }
  }
  if (fafFlag == 0) {
    if (typeof callback == 'function') {
      callback()
    }
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

/*-------------------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------ SOLVING THE INPUTS FOR A FILE AS A FUNCTION ----------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
	This function solves for the inputs to the function. It does this by looping through the input array from the previous function,   	\
    solving each of those equations, and then placing the final values into the array slot. It then calls the solve function.           \
//-------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.solveFAF = function (functionName, inputs, solVarIndex, callback) {
  for (var a = 0; a < ImportedFunctions.length; a++) {
    if (ImportedFunctions[a]['functionName'] == functionName) {
      for (b = 0; b < inputs.length; b++) {
        eqobj = {
          Page_position: DOM_Object[this.Format_id]['order'],
          Format_showtype: 'InnerFunction',
          Original_id: this.Original_id,
          equation: 'Temp=' + inputs[b]
        }
        var id1 = CreateEq(this.fileid, 1, eqobj)
        ImportedFunctions[a]['functionInputs'][b]['real'] = JSON.parse(JSON.stringify(self[id1].Solution_real))
        ImportedFunctions[a]['functionInputs'][b]['imag'] = JSON.parse(JSON.stringify(self[id1].Solution_imag))
        ImportedFunctions[a]['functionInputs'][b]['size'] = JSON.parse(JSON.stringify(self[id1].Format_size))
        ImportedFunctions[a]['functionInputs'][b]['units'] = JSON.parse(JSON.stringify(self[id1].Units_units))
        ImportedFunctions[a]['functionInputs'][b]['showEq'] = JSON.parse(JSON.stringify(self[id1].Format_showequation))
        ImportedFunctions[a]['functionInputs'][b]['dimModel'] = JSON.parse(JSON.stringify(self[id1].Models_dimensions))
        ImportedFunctions[a]['functionInputs'][b]['unitModel'] = JSON.parse(JSON.stringify(self[id1].Models_units))
        ImportedFunctions[a]['functionInputs'][b]['numModel'] = JSON.parse(JSON.stringify(self[id1].Models_numerical))
        ImportedFunctions[a]['functionInputs'][b]['quanModel'] = JSON.parse(JSON.stringify(self[id1].Models_quantities))
        ImportedFunctions[a]['functionInputs'][b]['showEq'] = JSON.parse(JSON.stringify(self[id1].Format_showequation))
        for (var thisID in DOM_Object[id1]['Dependents']) {
          DOM_Object[this.Original_id]['Dependents'][thisID] = '1'
          console.log('setting id ' + thisID + ' - ' + self[thisID]['Format_name'] + ' as a dependent')
        }
        console.log(
          'For input ' +
            b +
            '-' +
            ImportedFunctions[a]['functionInputs'][b]['name'] +
            ', the answer is ' +
            self[id1].Solution_real['0-0']
        )
      }
      this.solveFafItems(functionName, 0, solVarIndex, callback)
    }
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

/*-------------------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------- FUNCTION TO SOLVE EQUATIONS, LOOPS, AND STATEMENTS ------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
/*  This function steps through each item in the file being used as a function. If that item is an equation, it is tested to see if     |
    the name matches an input. A new equation is created and if the item name matches an input, then its value is set. If not, then     |
    the equation is solved. If the item is a loop or a statement then the block is run.                                                 | 
//-------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.solveFafItems = function (functionName, pos, solVarIndex, callback) {
  var maxPos = 0,
    inputFlag = 0
  for (var a = 0; a < ImportedFunctions.length; a++) {
    if (ImportedFunctions[a]['functionName'] == functionName) {
      if (pos < ImportedFunctions[a]['fileItems'].length) {
        if (ImportedFunctions[a]['fileItems'][pos]['component_type_id'] == '3') {
          inputFlag = 0
          var tempData = ImportedFunctions[a]['fileItems'][pos]['content']['Equation']
          tempData['Format_equation'] = tempData['newEquation']
          tempData['Page_position'] = ImportedFunctions[a]['fileItems'][pos]['order']
          tempData['id'] = ImportedFunctions[a]['fileItems'][pos]['itemid']
          delete tempData['Format_id']
          // tempData['Original_id']=this.Original_id;
          tempData['Original_id'] = ImportedFunctions[a]['fileItems'][pos]['itemid']
          // var tempID=CreateEq(ImportedFunctions[a]['fileID'], 0, tempData);
          var tempID = CreateEq(this.fileid, 0, tempData)
          console.log('The ID that was created for the associated ID is ' + tempID)
          ImportedFunctions[a]['fileItems'][pos]['assocID'] = tempID
          for (var inputIndex = 0; inputIndex < ImportedFunctions[a]['functionInputs'].length; inputIndex++) {
            if (
              ImportedFunctions[a]['fileItems'][pos]['content']['Equation']['Format_name'] ==
              ImportedFunctions[a]['functionInputs'][inputIndex]['name']
            ) {
              self[tempID]['Solution_real'] = ImportedFunctions[a]['functionInputs'][inputIndex]['real']
              self[tempID]['Solution_imag'] = ImportedFunctions[a]['functionInputs'][inputIndex]['imag']
              self[tempID]['Units_units'] = ImportedFunctions[a]['functionInputs'][inputIndex]['units']
              self[tempID]['Format_size'] = ImportedFunctions[a]['functionInputs'][inputIndex]['size']
              self[tempID]['fileid'] = ImportedFunctions[a]['fileID']
              DOM_Object[tempID]['real'] = ImportedFunctions[a]['functionInputs'][inputIndex]['real']
              DOM_Object[tempID]['imag'] = ImportedFunctions[a]['functionInputs'][inputIndex]['imag']
              DOM_Object[tempID]['units'] = ImportedFunctions[a]['functionInputs'][inputIndex]['units']
              DOM_Object[tempID]['size'] = ImportedFunctions[a]['functionInputs'][inputIndex]['size']
              DOM_Object[tempID]['fileid'] = ImportedFunctions[a]['fileID']
              inputFlag = 1
              console.log(
                'The value that was set for ' +
                  tempID +
                  ' was ' +
                  self[tempID]['Solution_real']['0-0'] +
                  ' on file ' +
                  ImportedFunctions[a]['fileID']
              )
            }
          }
          if (inputFlag == 0) {
            eqPromise(tempID).then(this.solveFafItems(functionName, parseInt(pos, 10) + 1, solVarIndex, callback))
          } else {
            this.solveFafItems(functionName, parseInt(pos, 10) + 1, solVarIndex, callback)
          }
        } else if (ImportedFunctions[a]['fileItems'][pos]['component_type_id'] == '6') {
          self[ImportedFunctions[SVA]['items'][thispos]['id']] = {}
          self[ImportedFunctions[SVA]['items'][thispos]['id']]['type'] = 'forLoop'
          for (var objProp in ImportedFunctions[SVA]['items'][thispos]) {
            self[ImportedFunctions[SVA]['items'][thispos]['id']][objProp] =
              ImportedFunctions[SVA]['items'][thispos][objProp]
          }
          DoStructures(
            ImportedFunctions[SVA]['items'][thispos]['id'],
            0,
            1,
            SolveFAFs(parseInt(pos, 10) + 1, thisinputs, SVA, callback)
          )
        } else if (ImportedFunctions[a]['fileItems'][pos]['component_type_id'] == '7') {
          self[ImportedFunctions[SVA]['items'][thispos]['id']] = {}
          self[ImportedFunctions[SVA]['items'][thispos]['id']]['type'] = 'whileLoop'
          for (var objProp in ImportedFunctions[SVA]['items'][thispos]) {
            self[ImportedFunctions[SVA]['items'][thispos]['id']][objProp] =
              ImportedFunctions[SVA]['items'][thispos][objProp]
          }
          DoStructures(
            ImportedFunctions[SVA]['items'][thispos]['id'],
            0,
            1,
            SolveFAFs(parseInt(pos, 10) + 1, thisinputs, SVA, callback)
          )
        } else if (ImportedFunctions[a]['fileItems'][pos]['component_type_id'] == '8') {
          self[ImportedFunctions[SVA]['items'][thispos]['id']] = {}
          self[ImportedFunctions[SVA]['items'][thispos]['id']]['type'] = 'ifelse'
          for (var objProp in ImportedFunctions[SVA]['items'][thispos]) {
            self[ImportedFunctions[SVA]['items'][thispos]['id']][objProp] =
              ImportedFunctions[SVA]['items'][thispos][objProp]
          }
          DoStructures(
            ImportedFunctions[SVA]['items'][thispos]['id'],
            0,
            1,
            SolveFAFs(parseInt(pos, 10) + 1, thisinputs, SVA, callback)
          )
        }
      } else {
        this.returnFAF(functionName, solVarIndex, callback)
      }
      //		else if ((DOM_Object[myid]['type']=="ifelse")||(DOM_Object[myid]['type']=="elseif")||(DOM_Object[myid]['type']=="else")||(DOM_Object[myid]['type']=="forLoop")||(DOM_Object[myid]['type']=="whileLoop"))
      //		{	DoStructures(myid, 0, 1, function() { SolveFAFs(parseInt(pos,10)+1, SVA); } );	}
    }
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------*/

/*-------------------------------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------------- THIS REPLACES FAF EQUATIONS WITHIN THE VARIABLE ARRAY ---------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------------------//
	This is the final code called when dealing with files used as functions. The code simply goes through the outputs and then finds the            |
    corresponding item with that name and returns that ID. If there are multiple returns, the connected IDs are set.                                |
//-------------------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.returnFAF = function (functionName, solVarIndex, callback) {
  var name_array = [],
    flag = 0,
    returnID = ''
  this.connected_ids = {}
  for (var a = 0; a < ImportedFunctions.length; a++) {
    if (ImportedFunctions[a]['functionName'] == functionName) {
      if (ImportedFunctions[a]['functionOutputs'].length == 1) {
        for (var b = 0; b < ImportedFunctions[a]['fileItems'].length; b++) {
          if (
            ImportedFunctions[a]['functionOutputs'][0]['name'] ==
            ImportedFunctions[a]['fileItems'][b]['content']['Equation']['Format_name']
          ) {
            returnID = ImportedFunctions[a]['fileItems'][b]['assocID']
          }
        }
      } else {
        name_array = this.Format_left.replace(/[\[]/, '').replace(/[\]]/, '').split(',')
        for (var b = 0; b < name_array.length; b++) {
          name_array[b] = name_array[b].replace(/\s/g, '')
        }
        for (var b = 0; b < ImportedFunctions[a]['functionOutputs'].length; b++) {
          for (var c = 0; c < ImportedFunctions[a]['fileItems'].length; c++) {
            if (
              ImportedFunctions[a]['functionOutputs'][b]['name'] ==
              ImportedFunctions[a]['fileItems'][c]['content']['Equation']['Format_name']
            ) {
              console.log(
                'The value of ' +
                  ImportedFunctions[a]['fileItems'][c]['assocID'] +
                  ' - ' +
                  self[ImportedFunctions[a]['fileItems'][c]['assocID']]['Format_name'] +
                  ' should be ' +
                  self[ImportedFunctions[a]['fileItems'][c]['assocID']]['Solution_real']['0-0'] +
                  ' - ' +
                  DOM_Object[ImportedFunctions[a]['fileItems'][c]['assocID']]['real']['0-0']
              )
              this.connected_ids[ImportedFunctions[a]['fileItems'][c]['assocID']] = 1
              if (flag == 0) {
                flag = 1
                returnID = ImportedFunctions[a]['fileItems'][c]['assocID']
              }
            }
          }
        }
      }
      self[returnID]['Format_showequation'] = functionName + '\\left('
      for (var b = 0; b < ImportedFunctions[a]['functionInputs'].length; b++) {
        if (b > 0) {
          self[returnID]['Format_showequation'] =
            self[returnID]['Format_showequation'] + ', ' + ImportedFunctions[a]['functionInputs'][b]['showEq'] // \
        } else {
          self[returnID]['Format_showequation'] =
            self[returnID]['Format_showequation'] + ImportedFunctions[a]['functionInputs'][b]['showEq']
        }
      }
      self[returnID]['Format_showequation'] = self[returnID]['Format_showequation'] + '\\right)'
      console.log(
        'The value of the return ID should be ' +
          DOM_Object[returnID]['real']['0-0'] +
          '-' +
          self[returnID]['Solution_real']['0-0'] +
          ' with a show equation and solution of ' +
          self[returnID]['Format_showequation'] +
          ' and ' +
          self[returnID]['Format_showsolution']
      )
      this.Solution_variable_array[parseInt(solVarIndex)] = returnID
      this.Remove_FilesAsFunctions(callback)
    }
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------- PARSE INPUTS ---------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
/*	This function goes through the variable array and finds entries where the user is calling a previous function with inputs. Once 	\
	found, it pulls out the string containing the variables and sends them to a function that returns an object with the name - value 	\
	pairs of the inputs for that string. The code then calls the solver for that equation with those inputs. Finally, the function 		\
	call is replaced with the result of the equation. The other parts of the input string are deleted from the parent equation.			\
	Along with this function is one that it uses which creates the objects for the inputs.												\
//-------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Parse_Inputs = function (callback) {
  var salength = this.Solution_variable_array.length,
    a = 0,
    thisloc = 0,
    i = '',
    flag = 0,
    op = 0,
    inner_text = '',
    thisindex = 0,
    Inputs = {}
  var eqobj = {},
    tempid = ''
  for (a = 0; a < this.Solution_variable_array.length; a++) {
    thisloc = 0
    for (i in DOM_Object) {
      if (this.Solution_variable_array[a] == DOM_Object[i]['name'] && this.Solution_variable_array[a + 1] == '(') {
        if (DOM_Object[i]['order'] > thisloc && DOM_Object[i]['order'] < DOM_Object[this.Format_id]['order']) {
          flag = 0
          op = 0
          inner_text = ''
          thisindex = parseInt(a, 10) + 1
          Inputs = {}
          thisloc = DOM_Object[this.Format_id]['order']
          while (flag === 0 && thisindex <= salength) {
            inner_text = inner_text + this.Solution_variable_array[thisindex]
            temptext = inner_text
            if (this.Solution_variable_array[thisindex] == '(') {
              op = op + 1
            }
            if (this.Solution_variable_array[thisindex] == ')') {
              op = op - 1
              if (op === 0) {
                flag = 1
                inner_text = inner_text.replace(/^\(/, '')
                inner_text = inner_text.replace(/\)$/, '')
                Inputs = Input_Object(inner_text)
                eqobj = {
                  Page_position: DOM_Object[this.Format_id]['order'],
                  Format_showtype: 'InnerFunction',
                  Solution_Inputs: Inputs,
                  Original_id: this.Original_id,
                  equation: 'tempEq=' + DOM_Object[i]['equation']
                }
                tempid = CreateEq(this.fileid, 1, eqobj)
                self[tempid].Format_showequation = this.Solution_variable_array[a] + '(' + inner_text + ')'
                this.Solution_variable_array[a] = tempid
              }
            }
            this.Solution_variable_array[thisindex] = 'deleteme'
            thisindex = parseInt(thisindex, 10) + 1
          }
          for (i = 0; i < this.Solution_variable_array.length; i++) {
            if (this.Solution_variable_array[i] == 'deleteme') {
              this.Solution_variable_array.splice(i, 1)
              this.Solution_key_array.splice(i, 1)
              i = i - 1
            }
          }
        }
      }
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
function Input_Object(input_string) {
  var Inputs = {},
    input_array = input_string.split(';'),
    b = 0,
    spliteq = '',
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

//-------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------------------- REPLACE INPUTS -----------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
/*	This function looks to see if there is a list of inputs for the equation and if there is, it replaces those values. This only 		\
	happens when the equation in question was originally called as a subequation and is now being solved already properly formatted.	\
//-------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Replace_Inputs = function (callback) {
  var keyes = '',
    index = 0,
    eqobj = '',
    tempid2 = ''
  for (keyes in this.Solution_Inputs) {
    for (index = 0; index < this.Solution_variable_array.length; index++) {
      if (
        this.Solution_variable_array[index] == keyes ||
        this.Solution_variable_array[index].replace(/^\-/, '') == keyes
      ) {
        if (typeof self[this.Solution_Inputs[keyes]] == 'object') {
          this.Solution_variable_array[index] = this.Solution_Inputs[keyes]
        } else {
          eqobj = {
            Page_position: DOM_Object[this.Format_id]['order'],
            Format_showtype: 'InnerFunction',
            Original_id: this.Original_id,
            equation: 'TempEq=' + this.Solution_Inputs[keyes]
          }
          tempid2 = CreateEq(this.fileid, 1, eqobj)
          this.Solution_variable_array[index] = tempid2
        }
      }
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------------- REPLACE VECTORS -------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
/*	This function looks at the variable array and replaces any vectors with an object that contains the appropriate numbers. A vector	\
	is entered through the use of two or three numbers along with semicolons such as 0:10 or 0:1:10. The first number is the beginning	\
	the second is the increment value and the third is the final value.	
//-------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Replace_Vectors = function (callback) {
  var a = '',
    i = '',
    startindex = 0,
    stopindex,
    sum = 0,
    params = [],
    temp = '',
    vectortext = '',
    parameters = [],
    eqobj = {},
    id1 = '',
    id2 = ''
  var id3 = '',
    id = '',
    counter = 0,
    key = '',
    tempdata = '',
    tablename = '',
    c1 = '',
    r1 = '',
    c2 = '',
    r2 = '',
    flag = 0,
    vector = ''

  for (index = 0; index < this.Solution_variable_array.length; index++) {
    if (this.Solution_variable_array[index] == ':') {
      startindex = 0
      stopindex = this.Solution_variable_array.length - 1
      sum = 0
      params = new Array()

      // Step back through the equation until we find the opening bracket
      for (a = index - 1; a >= 0; --a) {
        temp = this.Solution_variable_array[a]
        if (temp == '[') {
          startindex = a
          break
        }
      }
      // Step forward until we find the ending bracket for the vector
      for (a = index + 1; a < this.Solution_variable_array.length; ++a) {
        temp = this.Solution_variable_array[a]
        if (temp == ']') {
          stopindex = a
          break
        }
      }

      // Grab the text containing the vector and then pull off the brackets and split using the ":""
      vectortext = ''
      for (a = startindex; a <= stopindex; a++) {
        vectortext = vectortext + this.Solution_variable_array[a]
      }
      vector = vectortext.replace('[', '')
      vector = vector.replace(']', '')
      parameters = vector.split(':')

      // For each entered parameter in the vector, solve it for the value
      for (a = 0; a < parameters.length; a++) {
        parameters[a].replace(/^\s+|\s+$/g, '')
      }
      eqobj = {
        Page_position: DOM_Object[this.Format_id]['order'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + parameters[0]
      }
      id1 = CreateEq(this.fileid, 1, eqobj)
      params[0] = self[id1].Solution_real['0-0']

      eqobj = {
        Page_position: DOM_Object[this.Format_id]['order'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + parameters[1]
      }
      id2 = CreateEq(this.fileid, 1, eqobj)
      params[1] = self[id2].Solution_real['0-0']

      if (parameters.length == 3) {
        eqobj = {
          Page_position: DOM_Object[this.Format_id]['order'],
          Format_showtype: 'InnerFunction',
          Original_id: this.Original_id,
          equation: 'TempEq=' + parameters[2]
        }
        id3 = CreateEq(this.fileid, 1, eqobj)
        params[2] = self[id3].Solution_real['0-0']
      }

      // The return equation object
      eqobj = {
        Page_position: DOM_Object[this.Format_id]['order'],
        Format_showtype: 'vector',
        Original_id: this.Original_id,
        equation: 'TempEq=0'
      }
      id = CreateEq(this.fileid, 0, eqobj)

      // Set the show equations
      if (parameters.length == 3) {
        self[id].Format_showequation =
          '[' +
          self[id1].Format_showequation +
          ':' +
          self[id2].Format_showequation +
          ':' +
          self[id3].Format_showequation +
          ']'
      }
      if (parameters.length == 2) {
        self[id].Format_showequation = '[' + self[id1].Format_showequation + ':' + self[id2].Format_showequation + ']'
      }

      // Set the units
      if (self[id1].Units_units != '') {
        self[id].Units_units = self[id1].Units_units
        self[id].Units_base_array = self[id1].Units_base_array
        self[id].Units_base_string = self[id1].Units_base_string
      }
      if (self[id2].Units_units != '') {
        self[id].Units_units = self[id2].Units_units
        self[id].Units_base_array = self[id2].Units_base_array
        self[id].Units_base_string = self[id2].Units_base_string
      }
      if (parameters.length == 3) {
        if (self[id3].Units_units != '') {
          self[id].Units_units = self[id3].Units_units
          self[id].Units_base_array = self[id3].Units_base_array
          self[id].Units_base_string = self[id3].Units_base_string
        }
      }

      // Check to ensure that there weren't issues with the units
      if (parameters.length == 2 || parameters.length == 3) {
        if (
          self[id1].Units_units != self[id2].Units_units &&
          self[id1].Units_units != '' &&
          self[id2].Units_units != ''
        ) {
          Set_Error(this.Format_id, 'Vector3')
        }
      }

      if (parameters.length == 3) {
        if (
          self[id3].Units_units != self[id2].Units_units &&
          self[id2].Units_units != '' &&
          self[id3].Units_units != ''
        ) {
          Set_Error(this.Format_id, 'Vector3')
        }
        if (
          self[id3].Units_units != self[id1].Units_units &&
          self[id1].Units_units != '' &&
          self[id3].Units_units != ''
        ) {
          Set_Error(this.Format_id, 'Vector3')
        }
      }

      if (params.length == 3) {
        counter = 0
        for (a = parseFloat(params[0]); a <= parseFloat(params[2]); a = parseFloat(Big(a).plus(Big(params[1])))) {
          key = '0-' + counter
          self[id].Solution_real[key] = parseFloat(Big(params[0]).plus(Big(params[1]).times(Big(counter))))
          counter++
        }
        DOM_Object[id]['real'] = self[id].Solution_real
      } else if (params.length == 2) {
        if (parameters[0].match(/^#Table/)) {
          var temp = parameters[0].replace(/^#/, '')
          parameters[0] = '#File' + this.fileid + temp
        }
        if (parameters[1].match(/^#Table/)) {
          var temp = parameters[1].replace(/^#/, '')
          parameters[1] = '#File' + this.fileid + temp
        }
        if (parameters[0].match(/^#File[0-9]+Table/) && parameters[1].match(/^#File[0-9]+Table/)) {
          counter = 0
          tempdata = parameters[0].split('.')
          tablename = tempdata[0].replace(/^#/, '')
          c1 = tempdata[1].replace('$', '')
          c1 = parseInt(c1.charCodeAt(), 10) - 62
          r1 = parseInt(tempdata[2].replace('$', ''), 10) + 3
          tempdata = parameters[1].split('.')
          c2 = tempdata[1].replace('$', '')
          c2 = parseInt(c2.charCodeAt(), 10) - 62
          r2 = parseInt(tempdata[2].replace('$', ''), 10) + 3
          c1 = c1 - 3
          r1 = r1 - 3
          c2 = c2 - 3
          r2 = r2 - 3
          flag = 0
          if (c1 !== c2 && r1 !== r2) {
            flag = 1
            Set_Error(this.Format_id, 'Vector1')
          }
          if (c1 == c2 && parseInt(r1, 10) > parseInt(r2, 10)) {
            flag = 1
            Set_Error(this.Format_id, 'Vector2')
          }
          if (r1 == r2 && parseInt(c1, 10) > parseInt(c2, 10)) {
            flag = 1
            Set_Error(this.Format_id, 'Vector2')
          }
          if (c1 == c2) {
            for (a = r1; a <= r2; a = a + 1) {
              key = '0-' + counter
              self[id].Solution_real[key] = DOM_Object[tablename]['data'][a][c1]['real']
              // if (DOM_Object[PlotID]['Dependents'][DataID]===undefined){ DOM_Object[PlotID]['Dependents'][DataID]={}; }
              DOM_Object[this.Original_id]['Dependents'][tablename + '.' + tempdata[1] + '.' + a] = '1'
              counter = counter + 1
            }
            DOM_Object[id]['real'] = self[id].Solution_real
          } else {
            for (a = c1; a <= c2; a = a + 1) {
              key = '0-' + counter
              self[id].Solution_real[key] = DOM_Object[tablename]['data'][r1][a]['real']
              counter = counter + 1
              DOM_Object[this.Original_id]['Dependents'][tablename + '.' + String.fromCharCode(65 + a) + '.' + r1] = '1'
            }
            DOM_Object[id]['real'] = self[id].Solution_real
          }
          DOM_Object[this.Format_id]['Dependents'][tempdata[0].replace('#', '')] = '1'
        } else {
          counter = 0
          for (a = parseFloat(params[0]); a <= parseFloat(params[1]); a = ToNum(parseInt(a, 10) + 1)) {
            key = '0-' + counter
            self[id].Solution_real[key] = parseFloat(Big(params[0]).plus(Big(1).times(Big(counter))))
            counter++
          }
          DOM_Object[id]['real'] = self[id].Solution_real
        }
      }
      self[id].Format_size = '1x' + counter
      DOM_Object[id]['size'] = '1x' + counter
      this.Solution_variable_array[stopindex] = id
      if (this.Solution_key_array[stopindex + 1] == '1') {
        self[id].Units_units = this.Solution_variable_array[stopindex + 1]
        DOM_Object[id]['units'] = this.Solution_variable_array[stopindex + 1]
        self[id].Format_showequation = self[id].Format_showequation + ' ' + self[id].Units_units
        this.Solution_variable_array.splice(parseInt(stopindex, 10) + 1, 1)
        this.Solution_key_array.splice(parseInt(stopindex, 10) + 1, 1)
      }
      for (i = stopindex - 1; i >= startindex; i--) {
        this.Solution_variable_array.splice(i, 1)
        this.Solution_key_array.splice(i, 1)
      }
      delete self[id1]
      delete self[id2]
      delete self[id3]
      delete DOM_Object[id1]
      delete DOM_Object[id2]
      delete DOM_Object[id3]
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------------------------------- REPLACE MATRICES ---------------------------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
/*	Users are allowed to enter a matrix by hand. This function replaces those hand entered variables with temporary names and stores the values in temporary equation objects. 	\
	The token for the equation is put in its place. This is done so that when the PostFix is created, the token can be handled and not the input item.							\
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Replace_Matrices = function (callback) {
  var index = 0,
    matrixtext = '',
    flag = 0,
    index2 = 0,
    sum = 0,
    length1 = 0,
    id = '',
    Temp1 = '',
    rows = 0,
    Temp2 = [],
    columns = 0,
    ArrayText = []
  var index3 = 0,
    test = [],
    index4 = 0,
    key = '',
    eqobj = '',
    id1 = '',
    i = '',
    thisUnits = '',
    baseUnits = [],
    unitFlag = 0,
    thisQuantity = '',
    thisBase = []
  for (index = 0; index < this.Solution_variable_array.length; index++) {
    // Look at every index in the split array until we find the opening bracket
    if (this.Solution_variable_array[index] == '[') {
      var matrixtext = '',
        flag = 0,
        index2 = index,
        sum = 0,
        showequation = '['
      length1 = this.Solution_variable_array.length

      // Grab all of the text that is included in the matrix
      while (flag === 0 && index2 <= length1) {
        matrixtext = matrixtext + this.Solution_variable_array[index2]
        if (this.Solution_variable_array[index2] == '[') {
          sum = sum + 1
        } else if (this.Solution_variable_array[index2] == ']') {
          sum = sum - 1
          if (sum < 1) {
            flag = 1
          }
        }
        this.Solution_variable_array[index2] = 'deleteme'
        index2 = index2 + 1
      }

      // Clean up the text so that there are no duplicates and no trailing commas or semicolons
      matrixtext = matrixtext.replace(/;;/g, ';')
      matrixtext = matrixtext.replace(',,', ',')
      matrixtext = matrixtext.replace(',;,', ';')
      matrixtext = matrixtext.replace(/\;]$/, ']')
      matrixtext = matrixtext.replace(/\,]$/, ']')

      eqobj = {
        Page_position: DOM_Object[this.Format_id]['order'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + matrixtext,
        Format_name: 'Matrix',
        Format_showequation: matrixtext,
        Format_showtype: 'matrix'
      }
      id = CreateEq(this.fileid, 0, eqobj)
      this.Solution_temps.push(id)
      matrixtext = matrixtext.replace(']', '')
      matrixtext = matrixtext.replace('[', '')
      if (matrixtext.match(';')) {
        Temp1 = matrixtext.split(';')
        rows = Temp1.length
        Temp2 = Temp1[0].split(',')
        columns = Temp2.length
        ArrayText = matrixtext.split(';')
        for (index3 = 0; index3 < ArrayText.length; ++index3) {
          test = ArrayText[index3].split(',')
          for (index4 = 0; index4 < test.length; index4++) {
            key = index3 + '-' + index4
            if (typeof self[test[index4]] == 'object') {
              self[id].Solution_real[key] = self[test[index4]].Solution_real['0-0']
              self[id].Solution_imag[key] = self[test[index4]].Solution_imag['0-0']
              if (index4 == test.length - 1) {
                showequation = showequation + '' + self[test[index4]].Format_showequation + ';'
              } else {
                showequation = showequation + '' + self[test[index4]].Format_showequation + ','
              }

              if (self[test[index4]].Units_units != '')
                if ((unitFlag == 1 || unitFlag == '1') && thisUnits != self[test[index4]].Units_units) {
                  Set_Error(this.Original_id, 'Math5', thisUnits, self[test[index4]].Units_units)
                }
              thisUnits = self[test[index4]].Units_units
              thisBase = self[test[index4]].Units_base_array
              thisString = self[test[index4]].Units_base_string
              thisQuantity = self[test[index4]].Units_quantity
              unitFlag = 1
            } else if (isNumber(test[index4])) {
              self[id].Solution_real[key] = parseFloat(test[index4])
              self[id].Solution_imag[key] = 0
              if (index4 == test.length - 1) {
                showequation = showequation + '' + parseFloat(test[index4]) + ';'
              } else {
                showequation = showequation + '' + parseFloat(test[index4]) + ','
              }
            } else {
              eqobj = {
                Page_position: DOM_Object[this.Format_id]['order'],
                Format_showtype: 'InnerFunction',
                Original_id: this.Original_id,
                equation: 'TempEq=' + test[index4]
              }
              id1 = CreateEq(this.fileid, 1, eqobj)
              self[id].Solution_real[key] = self[id1].Solution_real['0-0']
              self[id].Solution_imag[key] = self[id1].Solution_imag['0-0']
              self[this.Original_id].Solution_temps.push(id1)
              if (index4 == test.length - 1) {
                showequation = showequation + '' + self[id1].Format_showequation + ';'
              } else {
                showequation = showequation + '' + self[id1].Format_showequation + ','
              }

              if (self[id1].Units_units != '')
                if ((unitFlag == 1 || unitFlag == '1') && thisUnits != self[id1].Units_units) {
                  Set_Error(this.Original_id, 'Math5', thisUnits, self[test[index4]].Units_units)
                }
              thisUnits = self[id1].Units_units
              thisBase = self[id1].Units_base_array
              thisString = self[id1].Units_base_string
              thisQuantity = self[id1].Units_quantity
              unitFlag = 1
            }
          }
        }
        self[id].Format_size = rows + 'x' + columns
        self[id].Format_numinds = 2
      } else {
        ArrayText = matrixtext.split(',')
        for (index3 = 0; index3 < ArrayText.length; index3++) {
          key = '0-' + index3
          if (typeof self[ArrayText[index3]] == 'object') {
            self[id].Solution_real[key] = self[ArrayText[index3]].Solution_real['0-0']
            self[id].Solution_imag[key] = self[ArrayText[index3]].Solution_imag['0-0']
            showequation = showequation + '' + self[ArrayText[index3]].Format_showequation + ','

            if (self[ArrayText[index3]].Units_units != '')
              if ((unitFlag == 1 || unitFlag == '1') && thisUnits != self[ArrayText[index3]].Units_units) {
                Set_Error(this.Original_id, 'Math5', thisUnits, self[ArrayText[index3]].Units_units)
              }
            thisUnits = self[ArrayText[index3]].Units_units
            thisBase = self[ArrayText[index3]].Units_base_array
            thisString = self[ArrayText[index3]].Units_base_string
            thisQuantity = self[ArrayText[index3]].Units_quantity
            unitFlag = 1
          } else if (isNumber(ArrayText[index3])) {
            self[id].Solution_real[key] = parseFloat(ArrayText[index3])
            self[id].Solution_imag[key] = 0
            showequation = showequation + '' + parseFloat(ArrayText[index3]) + ','
          } else {
            eqobj = {
              Page_position: DOM_Object[this.Format_id]['order'],
              Format_showtype: 'InnerFunction',
              Original_id: this.Original_id,
              equation: 'TempEq=' + ArrayText[index3]
            }
            id1 = CreateEq(this.fileid, 1, eqobj)
            self[id].Solution_real[key] = self[id1].Solution_real['0-0']
            self[id].Solution_imag[key] = self[id1].Solution_imag['0-0']
            self[this.Original_id].Solution_temps.push(id1)
            showequation = showequation + '' + self[id1].Format_showequation + ','

            if (self[id1].Units_units != '')
              if ((unitFlag == 1 || unitFlag == '1') && thisUnits != self[id1].Units_units) {
                Set_Error(this.Original_id, 'Math5', thisUnits, self[id1].Units_units)
              }
            thisUnits = self[id1].Units_units
            thisBase = self[id1].Units_base_array
            thisString = self[id1].Units_base_string
            thisQuantity = self[id1].Units_quantity
            unitFlag = 1
          }
        }
        self[id].Format_size = '1x' + ArrayText.length
        self[id].Format_numinds = 1
      }
      self[id].Format_showequation = showequation + ']'
      self[id].Show_Array()
      self[id].Units_units = thisUnits
      self[id].Units_quantity = thisQuantity
      self[id].Units_base_array = thisBase
      DOM_Object[id]['real'] = self[id]['Solution_real']
      DOM_Object[id]['imag'] = self[id]['Solution_imag']
      DOM_Object[id]['size'] = self[id]['Format_size']
      DOM_Object[id]['units'] = self[id]['Units_units']
      this.Solution_variable_array[index] = id
      for (i = 0; i < this.Solution_variable_array.length; i++) {
        if (this.Solution_variable_array[i] == 'deleteme') {
          this.Solution_variable_array.splice(i, 1)
          this.Solution_key_array.splice(i, 1)
          i--
        }
      }

      if (this.Solution_key_array[index + 1] == '1') {
        self[id].Units_units = this.Solution_variable_array[index + 1]
        self[id].Format_showequation = self[id].Format_showequation + ' ' + self[id].Units_units
        this.Solution_variable_array.splice(index + 1, 1)
        this.Solution_key_array.splice(index + 1, 1)
      }
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------------------------------------- MATCH CLOSEST EQUATION --------------------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
/*	This function is called several times throughout the equation process. It takes in the name of an equation and its location on the page. It then goes through the 			\
	DOM_Object object and matches the name. If it finds a match, it looks for the latest match prior to the equation in question. If no match is found, the entered				\
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function MatchClosestEquation(thisname, thislocation, thisid, index, insert) {
  //console.log('In the match closest equation function looking to match '+thisname+' at '+thislocation+' with a file id of '+DOM_Object[thisid].fileid);
  var file = DOM_Object[thisid].fileid,
    iname = '',
    iloc = 0,
    active = '',
    parenttype = '',
    lastpos = 0,
    parent = 'none',
    dirmatch = 0
  var thisfile = parseInt(thisid.replace(/^File/, '').match(/^[0-9]+/), 10)
  var answer = thisname,
    position = -1,
    rating = 0,
    i = 0,
    ifile = '',
    itemid = '',
    type = '',
    ploc = 0,
    newid = '',
    breakflag = 0
  if (
    !isNumber(thisname) &&
    thisname !== '*' &&
    thisname !== '/' &&
    thisname !== '+' &&
    thisname !== '*' &&
    thisname !== '-'
  ) {
    if (DOM_Object[thisid]['parentid'] == 'none' || DOM_Object[thisid]['parentid'] === undefined) {
      parenttype = 'none'
    } else {
      parenttype = DOM_Object[DOM_Object[thisid]['parentid']]['content']['type']
      parent = DOM_Object[thisid]['parentid']
    }
    for (i in DOM_Object) {
      //console.log('Comparing '+DOM_Object[i]['name']+' to '+thisname+' with names of '+self[thisid].Format_id+' and '+i);
      if (i !== undefined && i.length > 0) {
        file = self[thisid].Format_id.match(/^File[0-9]+/)
        var test = new RegExp('^' + file, 'g')
        if (i.match(test)) {
          iname = DOM_Object[i]['name']
          iloc = parseInt(DOM_Object[i]['order'], 10)
          thislocation = DOM_Object[self[thisid].Original_id]['order']
          active = DOM_Object[i]['active']
          ifile = parseInt(i.replace(/^File/, '').match(/^[0-9]+/), 10)
          //console.log('The ifile and thisfile are '+ifile+' - '+thisfile+', the names are '+iname+' - '+thisname+', and the lower and upper locations are '+iloc+' - '+thislocation+', the active is '+active+', and the parent is '+parenttype);
          if (iname == thisname && DOM_Object[i]['DatasetID'] !== undefined) {
            answer = i
            console.log('Matched Dataset')
          } else if (
            parenttype == 'none' ||
            parenttype == 'ifelse' ||
            parenttype == 'elseif' ||
            (parenttype == 'else' && thisfile == ifile)
          ) {
            //console.log('The position and active status are '+position+' : '+active);
            if (iname == thisname && iloc > position && iloc < parseInt(thislocation, 10) && active == 1) {
              answer = i
              position = DOM_Object[i]['order']
              console.log('Matched - ' + i + ' - ' + DOM_Object[i]['real']['0-0'])
            }
          } else {
            var count = self[DOM_Object[thisid]['parentid']].Loop_countervalue
            if (
              thisfile == ifile &&
              iname == thisname &&
              iloc > position &&
              active == 1 &&
              count === 0 &&
              iloc < parseInt(thislocation, 10)
            ) {
              answer = i
              position = DOM_Object[i]['order']
              console.log('Matched ' + i)
            } else if (
              thisfile == ifile &&
              iname == thisname &&
              iloc > parseInt(position, 10) &&
              active == 1 &&
              count !== 0 &&
              iloc <= parseInt(thislocation, 10)
            ) {
              answer = i
              position = DOM_Object[i]['order']
              if (iloc == thislocation) {
                dirmatch = 1
              }
              console.log('Matched - ' + i + ' - ' + DOM_Object[i]['real']['0-0'])
            }
          }
        }
      }
    }
    if (
      (parenttype == 'forLoop' || parenttype == 'whileLoop') &&
      self[DOM_Object[thisid]['parentid']].Loop_countervalue !== 0 &&
      dirmatch === 0
    ) {
      if (position > DOM_Object[parent]['order']) {
        breakflag = 1
      } else {
        breakflag = 0
      }
      while ((parenttype == 'forLoop' || parenttype == 'whileLoop' || parenttype == 'ifelse') && breakflag === 0) {
        for (itemid in DOM_Object[parent]['children']) {
          type = DOM_Object[itemid]['type']
          iname = DOM_Object[itemid]['name']
          iloc = DOM_Object[itemid]['order']
          ploc = DOM_Object[parent]['order']
          if (
            type == 'equation' &&
            DOM_Object[itemid]['active'] == 1 &&
            iname == thisname &&
            iloc > thislocation &&
            iloc > cpos
          ) {
            answer = itemid
            cpos = DOM_Object[i]['order']
            breakflag = 1
            console.log('Matched ' + DOM_Object[i]['name'] + ' at ' + cpos)
          }
        }
        parent = DOM_Object[parent]['content']['parentid']
        if (parent == 'none') {
          parenttype = 'none'
        } else {
          parenttype = DOM_Object[parent]['content']['type']
        }
      }
    }
    if (parseInt(insert) == 1 && DOM_Object[answer] !== undefined) {
      if (DOM_Object[answer]['type'] == 'equation' && answer != thisname) {
        eqobj = {
          Page_position: DOM_Object[thisid]['order'],
          equation: 'MyEq=0',
          Format_showtype: 'variable',
          Format_name: 'MyEq'
        }
        newid = CreateEq(DOM_Object[thisid]['fileid'], 0, eqobj)
        self[newid].Format_showequation = self[thisid].Solution_variable_array[index]
        self[thisid].Solution_variable_array[index] = newid
        self[thisid].Solution_temps.push(newid)
        self[newid]['Format_size'] = DOM_Object[answer]['size']
        self[newid]['Solution_real'] = DOM_Object[answer]['real']
        self[newid]['Solution_imag'] = DOM_Object[answer]['imag']
        self[newid]['Units_units'] = DOM_Object[answer]['units']
        self[newid]['Units_base_array'] = DOM_Object[answer]['basearray']
        DOM_Object[newid] = {}
        DOM_Object[newid]['ID'] = newid
        DOM_Object[newid]['size'] = DOM_Object[answer]['size']
        DOM_Object[newid]['real'] = DOM_Object[answer]['real']
        DOM_Object[newid]['imag'] = DOM_Object[answer]['imag']
        DOM_Object[newid]['units'] = DOM_Object[answer]['units']
        DOM_Object[newid]['basearray'] = DOM_Object[answer]['basearray']
        DOM_Object[newid]['name'] = 'MyEq'

        if (
          self[thisid].Format_showtype == 'top' &&
          self[thisid].Format_name != 'TempEq' &&
          self[thisid].Format_name !== undefined
        ) {
          DOM_Object[self[thisid].Format_id]['Dependents'][answer] = '1'
        } else if (self[thisid].Format_showtype == 'InnerFunction') {
          DOM_Object[self[thisid].Original_id]['Dependents'][answer] = '1'
        } else if (self[thisid].Format_name != 'TempEq') {
          DOM_Object[self[thisid].Original_id]['Dependents'][answer] = '1'
        }
        if (answer == self[thisid].Original_id) {
          delete DOM_Object[self[thisid].Original_id]['Dependents'][answer]
        }
      }
    }
  }
  return answer
}
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------------------------------------- REPLACE MATRIX PIECES --------------------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
/*	This function replaces any array pieces such as variable[0][0]
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Replace_Matrix_Pieces = function (callback) {
  var index = 0,
    thiseq = '',
    indobj = {},
    ansobj = {},
    matrixtext = '',
    flag = 0,
    index2 = 0,
    ends = new Array(),
    matsize = 1,
    mult = 1,
    range = {},
    key = '',
    indices = '',
    sizes = []
  var a = 0,
    b = 0,
    thisindex = '',
    eqobj = {},
    id = '',
    newid = '',
    i = 0,
    showtext = ''

  for (index = 0; index < this.Solution_variable_array.length; index++) {
    if (this.Solution_variable_array[index] == '[' && index > 0) {
      // If you have encounred an opening parenthesis with a variable name
      thiseq = MatchClosestEquation(
        this.Solution_variable_array[index - 1],
        DOM_Object[this.Format_id]['order'],
        this.Format_id
      )

      if (typeof self[thiseq] == 'object') {
        indobj = {}
        ansobj = {}
        matrixtext = ''
        flag = 0
        index2 = index

        // Go through the variable array and group together all of the text that represents the variable
        // and the input indices. This includes the name of the variable and any text within the brackets
        // This is done by creating a bracket index and ensuring that there aren't any more brackets past
        // the index being analyzed
        var bracketIndex = 0
        var indices = []
        var indIndex = 0
        var indexText = ''
        while (flag === 0 && index2 <= this.Solution_variable_array.length) {
          if (this.Solution_variable_array[index2] == '[') {
            bracketIndex = bracketIndex + 1
          }
          if (this.Solution_variable_array[index2] == ']') {
            bracketIndex = bracketIndex - 1
          }

          if (self[this.Solution_variable_array[index2]] !== undefined) {
            if (self[this.Solution_variable_array[index2]].Format_showequation !== undefined) {
              showtext = showtext + self[this.Solution_variable_array[index2]].Format_showequation
            }
            matrixtext = matrixtext + this.Solution_variable_array[index2]
            indexText = indexText + this.Solution_variable_array[index2]
          } else {
            if (this.Solution_variable_array[index2] !== undefined) {
              showtext = showtext + this.Solution_variable_array[index2]
            }
            matrixtext = matrixtext + this.Solution_variable_array[index2]
            indexText = indexText + this.Solution_variable_array[index2]
          }
          if (
            (bracketIndex == 0 &&
              this.Solution_variable_array[index2] == ']' &&
              this.Solution_variable_array[index2 + 1] != '[') ||
            index2 >= this.Solution_variable_array.length
          ) {
            flag = 1
          }
          if (bracketIndex == 0) {
            indices[indIndex] = indexText
            indIndex = indIndex + 1
            indexText = ''
          }
          this.Solution_variable_array[index2] = 'deleteme'
          index2 = index2 + 1
        }

        // For each bracket [], check to see if it is a :, a number, input, etc
        //indices=matrixtext.match(/\[[0-9,a-z,A-Z,\:,\.,\-]+\]/g, '');
        sizes = self[thiseq].Format_size.split('x')
        for (a = 0; a < indices.length; a = a + 1) {
          indobj[a] = {}
          ansobj[a] = {}
          thisindex = indices[a].replace(/^\[/, '').replace(/\]$/, '')
          if (thisindex.match(':') && thisindex.length == 1) {
            indobj[a]['0'] = ':'
            indobj[a]['1'] = ':'
          } else if (thisindex.match(':')) {
            ends = thisindex.split(':')
            indobj[a]['0'] = ends[0]
            indobj[a]['1'] = ends[1]
          } else {
            indobj[a]['0'] = thisindex
            indobj[a]['1'] = '&'
          }
        }

        // For each of those brackets that we have created, set the start and stop indices based
        // upon what the user entered
        for (a in indobj) {
          // If both entries are colons, take full size for this index
          if (indobj[a]['0'] == ':' && indobj[a]['1'] == ':') {
            ansobj[a]['0'] = 0
            ansobj[a]['1'] = parseInt(sizes[parseInt(a, 10)], 10) - 1

            // If the index is a bracket, it is a single number
          } else if (indobj[a]['1'] == '&') {
            eqobj = {
              Page_position: DOM_Object[this.Format_id]['order'],
              Format_showtype: 'InnerFunction',
              Page_parentid: this.Page_parentid,
              Page_topparentid: this.Page_topparentid,
              Original_id: this.Format_id,
              equation: 'TempEq=' + indobj[a]['0']
            }
            id = CreateEq(this.fileid, 1, eqobj)
            ansobj[a]['0'] = self[id].Solution_real['0-0']
            ansobj[a]['1'] = self[id].Solution_real['0-0']
            delete DOM_Object[id]
            delete self[id]

            // If the index has a start and stop point, solve the entries for each
            // of these items
          } else {
            eqobj = {
              Page_position: DOM_Object[this.Format_id]['order'],
              Format_showtype: 'InnerFunction',
              Page_parentid: this.Page_parentid,
              Page_topparentid: this.Page_topparentid,
              Original_id: this.Format_id,
              equation: 'TempEq=' + indobj[a]['0']
            }
            id = CreateEq(this.fileid, 1, eqobj)
            this.Solution_temps.push(id)
            ansobj[a]['0'] = self[id].Solution_real['0-0']
            delete DOM_Object[id]
            delete self[id]
            eqobj = {
              Page_position: DOM_Object[this.Format_id]['order'],
              Format_showtype: 'InnerFunction',
              Page_parentid: this.Page_parentid,
              Page_topparentid: this.Page_topparentid,
              Original_id: this.Format_id,
              equation: 'TempEq=' + indobj[a]['1']
            }
            id = CreateEq(this.fileid, 1, eqobj)
            self[id].Format_showequation = indobj[a]['1']
            this.Solution_temps.push(id)
            ansobj[a]['1'] = self[id].Solution_real['0-0']
            delete DOM_Object[id]
            delete self[id]
          }
        }

        // Now that we have solved the start and stop points for each index (bracket), we go through
        // and get the values for those indices
        eqobj = {
          Page_position: DOM_Object[this.Format_id]['order'],
          Format_showtype: 'matrixcomponent',
          Page_parentid: this.Page_parentid,
          Page_topparentid: this.Page_topparentid,
          Original_id: this.Format_id,
          equation: 'TempEq=0'
        }
        id = CreateEq(this.fileid, 0, eqobj)
        this.Solution_temps.push(id)
        for (a in self[thiseq].Solution_real) {
          flag = 0
          key = ''
          splitkey = a.split('-')
          for (b = 0; b < splitkey.length; b++) {
            if (splitkey[b] >= ansobj[b]['0'] && splitkey[b] <= ansobj[b]['1']) {
            } else {
              flag = 1
            }
          }
          if (flag === 0) {
            for (b = 0; b < splitkey.length; b++) {
              key = key + '-' + parseInt(parseInt(splitkey[b], 10) - parseInt(ansobj[b]['0'], 10), 10)
            }
            key = key.replace(/^\-/, '')
            self[id].Solution_real[key] = self[thiseq].Solution_real[a]
            self[id].Solution_imag[key] = self[thiseq].Solution_imag[a]
          }
        }

        self[id].Get_Size()
        newid = SquashMatrix(id)

        self[newid].Format_showequation =
          self[this.Solution_variable_array[index - 1]].Format_showequation + '' + showtext
        self[id].Format_showequation = self[this.Solution_variable_array[index - 1]].Format_showequation + '' + showtext
        DOM_Object[newid]['real'] = self[newid].Solution_real
        DOM_Object[newid]['imag'] = self[newid].Solution_imag
        this.Solution_temps.push(newid)
        self[newid].Units_units = self[thiseq].Units_units
        self[newid].Units_base_string = self[thiseq].Units_base_string
        self[newid].Units_base_array = self[thiseq].Units_base_array
        DOM_Object[newid]['units'] = self[thiseq].Units_units
        this.Solution_variable_array[index - 1] = newid
      }
    }
  }

  // Clean up the variable array by deleting the indexes that we declared to be deleted
  for (i = 0; i < this.Solution_variable_array.length; i++) {
    if (this.Solution_variable_array[i] == 'deleteme') {
      this.Solution_variable_array.splice(i, 1)
      this.Solution_key_array.splice(i, 1)
      i--
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------------------------------------------//
//------------------------------------ REPLACE NUMBERS ------------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------//
/*	This function replaces numbers in the variable array with objects. If the items after the numbers are units, then they		\
	are set as the units for that number and deleted from the array.															\
//-----------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Replace_Numbers = function (callback) {
  var index = 0,
    number = 0,
    eqobj = {},
    id = ''

  for (index = 0; index < this.Solution_variable_array.length; index++) {
    if (isNumber(this.Solution_variable_array[index]) && this.Solution_variable_array[index].length > 0) {
      number = parseFloat(Big(this.Solution_variable_array[index]))
      eqobj = {
        Page_position: DOM_Object[this.Original_id]['order'],
        Format_showtype: 'number',
        Original_id: this.Format_id,
        equation: 'TempEq=' + this.Solution_variable_array[index]
      }
      id = CreateEq(this.fileid, 0, eqobj)
      this.Solution_temps.push(id)
      self[id].Solution_real['0-0'] = number
      self[id].Format_showequation = this.Solution_variable_array[index]
      this.Solution_variable_array[index] = id
      self[id].Models_units = 'NA'
      self[id].Models_quantities = 'NA'
      self[id].Models_dimensions = '1x1'

      if (this.Solution_key_array[index + 1] == '1' || this.Solution_key_array[index + 1] == 1) {
        self[id].Units_units = this.Solution_variable_array[index + 1]
        self[id].Format_showequation = self[id].Format_showequation + ' ' + Show_Fraction(self[id].Units_units)
        this.Solution_variable_array.splice(index + 1, 1)
        this.Solution_key_array.splice(index + 1, 1)
        self[id].Models_units = self[id].Units_units
        console.log('Number had trailing units')
      }

      DOM_Object[id]['real'] = {}
      DOM_Object[id]['real']['0-0'] = number
      DOM_Object[id]['imag'] = {}
      DOM_Object[id]['size'] = '1x1'
      DOM_Object[id]['units'] = self[id].Units_units
    }
  }

  if (typeof callback == 'function') {
    callback()
  }
}
//-----------------------------------------------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------- IS NUMBER -----------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------//
function isNumber(o) {
  return !isNaN(o - 0)
}
//-----------------------------------------------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------------------- REPLACE TABLES ----------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------//
/*	This function replaces all table entries with the appropriate value. The tables are sent to this solver as an object 		\
	with indices that match their row and column index. This function merely pulls that number out and sets it as the 			\
	value of the object that is replaced in the variable array.																	\
//-----------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Replace_Tables = function (callback) {
  var index = 0,
    tempdata = '',
    tablename = '',
    colnumber = '',
    rownumber = 0,
    id = '',
    number = '',
    units = '',
    row = 0,
    col = 0
  var va = this.Solution_variable_array
  for (index = 0; index < this.Solution_variable_array.length; index += 1) {
    if (this.Solution_variable_array[index].match(/^#Table/)) {
      tempdata = this.Solution_variable_array[index].split('.')
      //			tablename="File"+FileID+"Table"+tempdata[0].replace('#Table','');
      var temp = tempdata[0].replace(/#/, '')
      this.Solution_variable_array[index] = '#File' + FileID + temp + '.' + tempdata[1] + '.' + tempdata[2]
    }
    if (this.Solution_variable_array[index].match(/^#File[0-9]+Table/)) {
      tempdata = this.Solution_variable_array[index].split('.')
      var tablename = this.Solution_variable_array[index].replace(/^#/, '')
      tablename = tablename.match(/^File[0-9]+Table[0-9]+/, '')
      colnumber = tempdata[1].replace('$', '')
      colnumber = parseInt(colnumber.charCodeAt(), 10) - 65
      rownumber = parseInt(tempdata[2].replace('$', ''), 10)
      eqobj = {
        Page_position: DOM_Object[this.Format_id]['order'],
        Format_showtype: 'InnerFunction',
        equation: 'Temp=0'
      }
      id = CreateEq(this.fileid, 0, eqobj)
      self[id].Solution_real['0-0'] = DOM_Object[tablename]['data'][rownumber][colnumber]['real']
      self[id].Solution_imag['0-0'] = DOM_Object[tablename]['data'][rownumber][colnumber]['imag']
      self[id].Units_units = DOM_Object[tablename]['data'][row][col]['units']
      self[id].Format_name = this.Solution_variable_array[index].replace('#', '')
      self[id].Format_showtype = 'table'
      self[id].Format_showequation = this.Solution_variable_array[index].replace('#', '')
      DOM_Object[id]['real'] = {}
      DOM_Object[id]['real']['0-0'] = DOM_Object[tablename]['data'][rownumber][colnumber]['real']
      DOM_Object[id]['imag']['0-0'] = DOM_Object[tablename]['data'][rownumber][colnumber]['imag']
      DOM_Object[id]['units'] = DOM_Object[tablename]['data'][rownumber][colnumber]['units']
      DOM_Object[id]['size'] = '1x1'
      DOM_Object[id]['ID'] = id
      DOM_Object[this.Original_id]['Dependents'][this.Solution_variable_array[index].replace('#', '')] = '1'
      //            DOM_Object[this.Original_id]['Dependents'][tablename]={};
      //            DOM_Object[this.Original_id]['Dependents'][tablename]['col']=colnumber;// \
      //            DOM_Object[this.Original_id]['Dependents'][tablename]['row']=rownumber;// \
      this.Solution_temps.push(self[id].Format_id)
      this.Solution_variable_array[index] = id
      //			if ((this.Format_showtype=="top")&&(this.Format_name!="TempEq")&&(this.Format_name!==undefined))
      //			{ DOM_Object[this.Format_id]['Dependents'][this.Solution_variable_array[index]]='1';
      //			}else if ((this.Format_showtype=="InnerFunction")&&(DOM_Object[this.Original_id]['type']!="plot"))
      //			{ 	DOM_Object[this.Original_id]['Dependents'][this.Solution_variable_array[index]]='1';
      //			}else if ((this.Format_name!="TempEq")&&(DOM_Object[this.Original_id]['type']!="plot"))
      //			{ DOM_Object[this.Original_id]['Dependents'][this.Solution_variable_array[index]]='1'; }
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-----------------------------------------------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------------------- REPLACE CONSTANTS -------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------//
/*	This function replaces any items that match a constant. This is done by looping through the constants object and 			\
	comparing the name of each item to all items in the variable array.	When there is a match, a new object is set in			\
	in place of the constant within the array. The values of that object are set to the values of the constant.					\
//-----------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Replace_Constants = function (callback) {
  var var_array = this.Solution_variable_array,
    index = 0,
    eqobj = {},
    id = ''
  var thisid = this.Format_id
  for (index = 0; index < this.Solution_variable_array.length; ++index) {
    for (var Constant in Constants) {
      if (Constants[Constant]['name'] == var_array[index]) {
        eqobj = { Page_position: DOM_Object[thisid]['order'], Format_showtype: 'InnerFunction', equation: 'Temp=0' }
        id = CreateEq(this.fileid, 0, eqobj)
        self[id].Format_showequation = Constants[Constant]['showvalue']
        self[id].Solution_real['0-0'] = Constants[Constant]['value']
        self[id].Units_units = Constants[Constant]['units']
        self[id].Units_multiplier = 1
        self[id].Format_showtype = 'constant'
        self[thisid].Solution_temps.push(id)
        self[thisid].Solution_variable_array[index] = id
        DOM_Object[id]['real'] = {}
        DOM_Object[id]['real']['0-0'] = Constants[Constant]['value']
        DOM_Object[id]['size'] = '1x1'
        DOM_Object[id]['units'] = Constants[Constant]['units']
        DOM_Object[id]['imag'] = {}
      }
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-----------------------------------------------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------------------- REPLACE VARIABLES -------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------//
/*	This function replaces any items in the variable array that match previously declared variables. This is done by 			\
	scrolling through the DOM Object that was sent to the solver and finding the name that matches. The DOM object sent			\
	will only contain the last occurence of the variable name.																	\
//-----------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Replace_Variables = function (callback) {
  var var_array = this.Solution_variable_array,
    index = 0,
    eqobj = {},
    id = ''
  var thisid = this.Format_id
  for (index = 0; index < this.Solution_variable_array.length; ++index) {
    thistext = this.Solution_variable_array[index].replace(/^\-/, '')
    thiseqid = MatchClosestEquation(thistext, DOM_Object[this.Format_id]['order'], this.Format_id, index, 1)
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-----------------------------------------------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------------------- REPLACE CAD ------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------//
/*	Replace any imported cad parts. This is done by matching the name given to each part to the user input.	It then parses		\
	text entered by the user to see which property the user wants. Only specific options are allowed.							\
//-----------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Replace_CAD = function (callback) {
  var var_array = this.Solution_variable_array,
    index = 0,
    eqobj = {},
    id = '',
    nameArray = [],
    num = 0,
    units = '',
    partId = ''
  var thisid = this.Format_id
  for (index = 0; index < this.Solution_variable_array.length; ++index) {
    nameArray = var_array[index].split('.')
    if (nameArray.length > 1) {
      for (var a = 0; a < cadParts.length; a++) {
        if (cadParts[a]['eqname'] == nameArray[0]) {
          if (cadParts[a]['type'] == 'onshape' || cadParts[a]['type'] === undefined) {
            eqobj = { Page_position: DOM_Object[thisid]['order'], Format_showtype: 'InnerFunction', equation: 'Temp=0' }
            id = CreateEq(this.fileid, 0, eqobj)
            self[id].Format_showequation = var_array[index]
            DOM_Object[id]['real'] = {}
            partId = cadParts[a]['part_data']['partId']
            if (nameArray[1] == 'mass') {
              console.log('Setting the mass to ' + cadParts[a]['mass_data']['bodies'][partId]['mass'][1])
              self[id].Solution_real['0-0'] = cadParts[a]['mass_data']['bodies'][partId]['mass'][1]
              DOM_Object[id]['real']['0-0'] = cadParts[a]['mass_data']['bodies'][partId]['mass'][1]
              self[id].Units_units = 'kg'
              self[id].Units_quantity = 'mass'
              DOM_Object[id]['units'] = 'kg'
              DOM_Object[id]['size'] = '1x1'
            }
            if (nameArray[1] == 'volume') {
              console.log('Setting the volume to ' + cadParts[a]['mass_data']['bodies'][partId]['volume'][1])
              self[id].Solution_real['0-0'] = cadParts[a]['mass_data']['bodies'][partId]['volume'][1]
              DOM_Object[id]['real']['0-0'] = cadParts[a]['mass_data']['bodies'][partId]['volume'][1]
              self[id].Units_units = 'm^3'
              self[id].Units_quantity = 'volume'
              DOM_Object[id]['units'] = 'm^3'
            }
            if (nameArray[1] == 'surface') {
              self[id].Solution_real['0-0'] = cadParts[a]['mass_data']['bodies'][partId]['periphery'][1]
              DOM_Object[id]['real']['0-0'] = cadParts[a]['mass_data']['bodies'][partId]['periphery'][1]
              self[id].Units_units = 'm^2'
              self[id].Units_quantity = 'area'
              DOM_Object[id]['units'] = 'm^2'
              DOM_Object[id]['size'] = '1x1'
            }
            if (nameArray[1] == 'weight') {
              console.log('Setting the weight to ' + cadParts[a]['mass_data']['bodies'][partId]['weight_N'])
              self[id].Solution_real['0-0'] = cadParts[a]['mass_data']['bodies'][partId]['weight_N']
              DOM_Object[id]['real']['0-0'] = cadParts[a]['mass_data']['bodies'][partId]['weight_N']
              self[id].Units_units = 'N'
              self[id].Units_quantity = 'force'
              DOM_Object[id]['units'] = 'N'
              DOM_Object[id]['size'] = '1x1'
            }
            if (nameArray[1] == 'inertia') {
              console.log('Setting the inertia')
              self[id].Solution_real['0-0'] = cadParts[a]['mass_data']['bodies'][partId]['inertia'][0]
              self[id].Solution_real['0-1'] = cadParts[a]['mass_data']['bodies'][partId]['inertia'][1]
              self[id].Solution_real['0-2'] = cadParts[a]['mass_data']['bodies'][partId]['inertia'][2]
              self[id].Solution_real['0-3'] = cadParts[a]['mass_data']['bodies'][partId]['inertia'][3]
              self[id].Solution_real['0-4'] = cadParts[a]['mass_data']['bodies'][partId]['inertia'][4]
              self[id].Solution_real['0-5'] = cadParts[a]['mass_data']['bodies'][partId]['inertia'][5]
              self[id].Solution_real['0-6'] = cadParts[a]['mass_data']['bodies'][partId]['inertia'][6]
              self[id].Solution_real['0-7'] = cadParts[a]['mass_data']['bodies'][partId]['inertia'][7]
              self[id].Solution_real['0-8'] = cadParts[a]['mass_data']['bodies'][partId]['inertia'][8]
              DOM_Object[id]['real']['0-0'] = cadParts[a]['mass_data']['bodies'][partId]['inertia'][0]
              DOM_Object[id]['real']['0-1'] = cadParts[a]['mass_data']['bodies'][partId]['inertia'][1]
              DOM_Object[id]['real']['0-2'] = cadParts[a]['mass_data']['bodies'][partId]['inertia'][2]
              DOM_Object[id]['real']['0-3'] = cadParts[a]['mass_data']['bodies'][partId]['inertia'][3]
              DOM_Object[id]['real']['0-4'] = cadParts[a]['mass_data']['bodies'][partId]['inertia'][4]
              DOM_Object[id]['real']['0-5'] = cadParts[a]['mass_data']['bodies'][partId]['inertia'][5]
              DOM_Object[id]['real']['0-6'] = cadParts[a]['mass_data']['bodies'][partId]['inertia'][6]
              DOM_Object[id]['real']['0-7'] = cadParts[a]['mass_data']['bodies'][partId]['inertia'][7]
              DOM_Object[id]['real']['0-8'] = cadParts[a]['mass_data']['bodies'][partId]['inertia'][8]
              self[id].Units_units = 'kg*m^2'
              self[id].Units_quantity = 'inertia'
              DOM_Object[id]['units'] = 'kg*m^2'
              DOM_Object[id]['size'] = '1x9'
            }
            if (nameArray[1] == 'principalInertia' || nameArray[1] == 'principalinertia') {
              console.log('Setting the principal inertia')
              self[id].Solution_real['0-0'] = cadParts[a]['mass_data']['bodies'][partId]['principalInertia'][0]
              self[id].Solution_real['0-1'] = cadParts[a]['mass_data']['bodies'][partId]['principalInertia'][1]
              self[id].Solution_real['0-2'] = cadParts[a]['mass_data']['bodies'][partId]['principalInertia'][2]
              self[id].Units_units = 'kg*m^2'
              self[id].Units_quantity = 'inertia'
              DOM_Object[id]['units'] = 'kg*m^2'
              DOM_Object[id]['size'] = '1x3'
            }
            if (nameArray[1] == 'centroid') {
              console.log('Setting the centroid')
              self[id].Solution_real['0-0'] = cadParts[a]['mass_data']['bodies'][partId]['centroid'][0]
              self[id].Solution_real['0-1'] = cadParts[a]['mass_data']['bodies'][partId]['centroid'][1]
              self[id].Solution_real['0-2'] = cadParts[a]['mass_data']['bodies'][partId]['centroid'][2]
              self[id].Units_units = 'm'
              self[id].Units_quantity = 'm'
              DOM_Object[id]['units'] = 'm'
              DOM_Object[id]['size'] = '1x3'
            }
            if (nameArray[1] == 'principalAxes' || nameArray[1] == 'principalaxes') {
              console.log('Setting the principal axes')
              self[id].Solution_real['0-0'] = cadParts[a]['mass_data']['bodies'][partId]['principalAxes'][0]['x']
              self[id].Solution_real['0-1'] = cadParts[a]['mass_data']['bodies'][partId]['principalAxes'][0]['y']
              self[id].Solution_real['0-2'] = cadParts[a]['mass_data']['bodies'][partId]['principalAxes'][0]['z']
              self[id].Solution_real['0-3'] = cadParts[a]['mass_data']['bodies'][partId]['principalAxes'][1]['x']
              self[id].Solution_real['0-4'] = cadParts[a]['mass_data']['bodies'][partId]['principalAxes'][1]['y']
              self[id].Solution_real['0-5'] = cadParts[a]['mass_data']['bodies'][partId]['principalAxes'][1]['z']
              self[id].Solution_real['0-6'] = cadParts[a]['mass_data']['bodies'][partId]['principalAxes'][2]['x']
              self[id].Solution_real['0-7'] = cadParts[a]['mass_data']['bodies'][partId]['principalAxes'][2]['y']
              self[id].Solution_real['0-8'] = cadParts[a]['mass_data']['bodies'][partId]['principalAxes'][2]['z']
              DOM_Object[id]['real']['0-0'] = cadParts[a]['mass_data']['bodies'][partId]['principalAxes'][0]['x']
              DOM_Object[id]['real']['0-1'] = cadParts[a]['mass_data']['bodies'][partId]['principalAxes'][0]['y']
              DOM_Object[id]['real']['0-2'] = cadParts[a]['mass_data']['bodies'][partId]['principalAxes'][0]['z']
              DOM_Object[id]['real']['0-3'] = cadParts[a]['mass_data']['bodies'][partId]['principalAxes'][1]['x']
              DOM_Object[id]['real']['0-4'] = cadParts[a]['mass_data']['bodies'][partId]['principalAxes'][1]['y']
              DOM_Object[id]['real']['0-5'] = cadParts[a]['mass_data']['bodies'][partId]['principalAxes'][1]['z']
              DOM_Object[id]['real']['0-6'] = cadParts[a]['mass_data']['bodies'][partId]['principalAxes'][2]['x']
              DOM_Object[id]['real']['0-7'] = cadParts[a]['mass_data']['bodies'][partId]['principalAxes'][2]['y']
              DOM_Object[id]['real']['0-8'] = cadParts[a]['mass_data']['bodies'][partId]['principalAxes'][2]['z']
              self[id].Units_units = 'kg*m^2'
              self[id].Units_quantity = 'inertia'
              DOM_Object[id]['units'] = 'kg*m^2'
              DOM_Object[id]['size'] = '1x9'
            }
            if (nameArray[1] == 'density') {
              console.log(
                'Setting the density to ' + cadParts[a]['material_data']['material']['properties'][0]['value']
              )
              self[id].Solution_real['0-0'] = cadParts[a]['material_data']['material']['properties'][0]['value']
              DOM_Object[id]['real']['0-0'] = cadParts[a]['material_data']['material']['properties'][0]['value']
              self[id].Units_units = cadParts[a]['material_data']['material']['properties'][0]['units']
              self[id].Units_quantity = 'density'
              DOM_Object[id]['units'] = cadParts[a]['material_data']['material']['properties'][0]['units']
              DOM_Object[id]['size'] = '1x1'
            }
          }

          if (cadParts[a]['type'] == 'fusion') {
            eqobj = { Page_position: DOM_Object[thisid]['order'], Format_showtype: 'InnerFunction', equation: 'Temp=0' }
            id = CreateEq(this.fileid, 0, eqobj)
            self[id].Format_showequation = var_array[index]
            DOM_Object[id]['real'] = {}

            if (nameArray[1] == 'mass' || nameArray[1] == 'Mass') {
              console.log('Setting the mass to ' + cadParts[a]['properties']['Mass'])
              self[id].Solution_real['0-0'] =
                parseFloat(cadParts[a]['properties']['Mass'].replace(/\s+[a-z]+/, '')) / 1000
              DOM_Object[id]['real']['0-0'] =
                parseFloat(cadParts[a]['properties']['Mass'].replace(/\s+[a-z]+/, '')) / 1000
              self[id].Units_units = 'kg'
              self[id].Units_quantity = 'mass'
              DOM_Object[id]['units'] = 'kg'
              DOM_Object[id]['size'] = '1x1'
            }

            if (nameArray[1] == 'density' || nameArray[1] == 'Density') {
              console.log('Setting the mass to ' + cadParts[a]['properties']['Density'])
              self[id].Solution_real['0-0'] =
                parseFloat(cadParts[a]['properties']['Density'].replace(/\s+/g, '').replace(/g\/mm\^3/, '')) * 1000000
              DOM_Object[id]['real']['0-0'] =
                parseFloat(cadParts[a]['properties']['Density'].replace(/\s+/g, '').replace(/g\/mm\^3/, '')) * 1000000
              self[id].Units_units = 'kg/m^3'
              self[id].Units_quantity = 'density'
              DOM_Object[id]['units'] = 'kg/m^3'
              DOM_Object[id]['size'] = '1x1'
            }

            if (nameArray[1] == 'area' || nameArray[1] == 'Area') {
              console.log('Setting the mass to ' + cadParts[a]['properties']['Area'])
              self[id].Solution_real['0-0'] =
                parseFloat(cadParts[a]['properties']['Area'].replace(/\s+/g, '').replace(/mm\^2/, '')) / 1000000
              DOM_Object[id]['real']['0-0'] =
                parseFloat(cadParts[a]['properties']['Area'].replace(/\s+/g, '').replace(/mm\^2/, '')) / 1000000
              self[id].Units_units = 'm^2'
              self[id].Units_quantity = 'area'
              DOM_Object[id]['units'] = 'm^2'
              DOM_Object[id]['size'] = '1x1'
            }

            if (nameArray[1] == 'volume' || nameArray[1] == 'Volume') {
              console.log('Setting the mass to ' + cadParts[a]['properties']['Volume'])
              self[id].Solution_real['0-0'] =
                parseFloat(cadParts[a]['properties']['Volume'].replace(/\s+/g, '').replace(/mm\^3/, '')) / 1000000000
              DOM_Object[id]['real']['0-0'] =
                parseFloat(cadParts[a]['properties']['Volume'].replace(/\s+/g, '').replace(/mm\^3/, '')) / 1000000000
              self[id].Units_units = 'm^3'
              self[id].Units_quantity = 'volume'
              DOM_Object[id]['units'] = 'm^3'
              DOM_Object[id]['size'] = '1x1'
            }
          }

          self[id].Units_multiplier = 1
          self[thisid].Solution_temps.push(id)
          self[thisid].Solution_variable_array[index] = id
          DOM_Object[id]['imag'] = {}
        }
      }
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-----------------------------------------------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------------------------------------------//
//----------------------------------------------------- CHECK NEGATIVES -------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------//
/*
This function looks for any independent negative signs and accounts for them. This is done for four cases - a negative at the 
beginning, a negative beforea variable or number, plus a negative, and a negative before a parenthesis.

*/
Equation.prototype.Check_Negatives = function (callback) {
  var index = 0,
    v1 = '',
    v2 = '',
    v3 = '',
    newid = ''
  for (index = 0; index < this.Solution_variable_array.length; ++index) {
    v1 = this.Solution_variable_array[index]
    v2 = this.Solution_variable_array[index + 1]
    if (index > 0) {
      v3 = this.Solution_variable_array[index - 1]
    } else {
      v3 = '#'
    }

    // If the negative occurs at the beginning
    if (v1 == '-' && typeof (self[v2] == 'object') && index === 0) {
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['order'],
        Format_showtype: 'FirstNeg',
        Page_parentid: this.Page_parentid,
        Page_topparentid: this.Page_topparentid,
        Original_id: this.Format_id,
        equation: 'TempEq=-1',
        Format_showequation: '-',
        Format_size: '1x1',
        Format_name: 'TempEq',
        Format_showvalue: 'FirstNeg'
      }
      var newid = CreateEq(this.fileid, 0, eqobj)

      self[newid].Solution_real['0-0'] = -1
      DOM_Object[newid]['real']['0-0'] = -1
      this.Solution_variable_array[index] = newid
      this.Solution_variable_array.splice(index + 1, 0, '*')
      this.Solution_key_array.splice(index + 1, 0, '*')
    } else if (
      v1 == '-' &&
      typeof self[v2] == 'object' &&
      (v3 == '+' || v3 == '-' || v3 == '//' || v3 == '*' || v3 == '(' || v3 == '[' || v3 == '#')
    ) {
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['order'],
        Format_showtype: 'FirstNeg',
        Page_parentid: this.Page_parentid,
        Page_topparentid: this.Page_topparentid,
        Original_id: this.Format_id,
        equation: 'TempEq=-1',
        Format_showequation: '-',
        Format_size: '1x1',
        Format_name: 'TempEq',
        Format_showvalue: 'Negative'
      }
      var newid = CreateEq(this.fileid, 0, eqobj)
      self[newid].Solution_real['0-0'] = -1
      DOM_Object[newid]['real']['0-0'] = -1
      this.Solution_variable_array[index] = newid
      this.Solution_variable_array.splice(index + 1, 0, '*')
      this.Solution_key_array.splice(index + 1, 0, '*')
    } else if (v1 == '-' && v3 == '+') {
      this.Solution_variable_array.splice([index - 1], 1)
      this.Solution_key_array.splice([index - 1], 1)
    } else if ((v1 == '-' && v2 == '(' && index === 0) || (v1 == '-' && v2 == '(' && v3 == '(')) {
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['order'],
        Format_showtype: 'FirstNeg',
        Page_parentid: this.Page_parentid,
        Page_topparentid: this.Page_topparentid,
        Original_id: this.Format_id,
        equation: 'TempEq=-1',
        Format_showequation: '-',
        Format_size: '1x1',
        Format_name: 'TempEq',
        Format_showvalue: 'Negative'
      }
      var newid = CreateEq(this.fileid, 0, eqobj)
      self[newid].Solution_real['0-0'] = -1
      DOM_Object[newid]['real']['0-0'] = -1
      this.Solution_variable_array[index] = newid
      this.Solution_variable_array.splice(index + 1, 0, '*')
      this.Solution_key_array.splice(index + 1, 0, '*')
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-----------------------------------------------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------------------------------------------//
//----------------------------------------------------- CHECK IMAGINARY -------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.Check_Imaginary = function (callback) {
  var index = 0,
    thiseq = '',
    min2 = '',
    min3 = ''
  for (index = 0; index < this.Solution_variable_array.length; ++index) {
    if (this.Solution_variable_array[index] == 'i') {
      thiseq = this.Solution_variable_array[index - 1]
      self[thiseq].Solution_imag['0-0'] = self[thiseq].Solution_real['0-0']
      self[thiseq].Solution_real['0-0'] = 0
      DOM_Object[thiseq]['real']['0-0'] = 0
      self[thiseq].Format_showequation = self[thiseq].Solution_imag['0-0'] + ' i'
      if (
        (this.Solution_variable_array[index - 2] == '+' || this.Solution_variable_array[index - 2] == '-') &&
        typeof self[this.Solution_variable_array[index - 3]] == 'object'
      ) {
        min2 = this.Solution_variable_array[index - 2]
        min3 = this.Solution_variable_array[index - 3]
        self[min3].Solution_imag['0-0'] = self[thiseq].Solution_imag['0-0']
        self[min3].Format_showequation =
          self[min3].Solution_real['0-0'] + '' + min2 + '' + self[thiseq].Solution_imag['0-0'] + ' i'
        if (min2 == '-') {
          self[min3].Solution_imag['0-0'] = '-' + self[min3].Solution_imag['0-0']
        }
        this.Solution_variable_array.splice(index, 1)
        this.Solution_variable_array.splice(index - 1, 1)
        this.Solution_variable_array.splice(index - 2, 1)
        this.Solution_key_array.splice(index, 1)
        this.Solution_key_array.splice(index - 1, 1)
        this.Solution_key_array.splice(index - 2, 1)
      } else {
        this.Solution_variable_array.splice(index, 1)
        this.Solution_key_array.splice(index, 1)
      }
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-----------------------------------------------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------------------- CHECK EQUATION ----------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------//
/*	This function checks to make sure that all the items in the variable array have either been replaced by an object or 		\
	are mathematical operations or parenthesis. If that is not the case, then the equation is flagged as an error.				\
//-----------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Check_Equation = function (callback) {
  for (var index = 0; index < this.Solution_variable_array.length; ++index) {
    var test = this.Solution_variable_array[index]
    if (
      typeof self[test] != 'object' &&
      test != '+' &&
      test != '-' &&
      test != '*' &&
      test != '/' &&
      test !== '' &&
      test != '(' &&
      test != ')' &&
      test != ''
    ) {
      console.log('Set error for ' + test)
      Set_Error(this.Original_id, 'Format2', test, 'NA')
    }
  }
  if (this.Errors_flag == 1 || self[this.Original_id]['Errors_flag'] == 1) {
    if (eventType == 'solvePlotData') {
      eventErrorFlag = 1
      eventError = self[this.Original_id]['Errors_errors']
      PassPlotData(plotObject, PlotID, DataID, 'all')
    } else {
      this.Format_showequation = 'Error'
      this.Show_Equation()
      this.Return_Equation()
      if (typeof callback == 'function') {
        callback()
      }
    }
  } else {
    if (typeof callback == 'function') {
      callback()
    }
  }
}
//-----------------------------------------------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------------------- UNIT ARRAY ----------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------//
/*	This function looks at the units for each equation object in an equation. It parses out the units in question and 			\
	converts the entered units into an array that holds the base units. These base units are later used in multiplication 		\
	and division of complex objects.																							\
	The overall process used to handle units starts with this function and follows the following process.						\
	1. The units are parsed out into an array which holds each unit and math symbol independently								\
	2. Each part of the unit array is changed into its metric, unscaled, base unit.												\
	3. These units are then further decomposed. This is done by taking complex units such as Newtons and breaking them 			\
	down into base units such as kg*m/s^2. This creates the base array and string.												\
	4. The base array and string are used in mathematical operations to manipulate the units									\
	5. After all the math has been performed on the equation, the base units are recomposed into any more complex units 		\
	that they may represent.																									\
//-----------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Unit_Array = function (callback) {
  var id = this.Format_id
  for (var index = 0; index < this.Solution_variable_array.length; ++index) {
    if (typeof self[this.Solution_variable_array[index]] == 'object') {
      if (self[this.Solution_variable_array[index]].Units_units === undefined) {
        self[this.Solution_variable_array[index]].Units_units = ''
      }
      var temp = self[this.Solution_variable_array[index]].Units_units
      if (temp === undefined || typeof temp == 'object') {
        temp = ''
      }
      temp = temp.toString().replace(/{/g, '?{?')
      temp = temp.toString().replace(/}/g, '?}?')
      temp = temp.toString().replace(/\(/g, '?(?')
      temp = temp.toString().replace(/\)/g, '?)?')
      temp = temp.toString().replace(/\*/g, '?*?')
      temp = temp.toString().replace(/\^/g, '?^?')
      temp = temp.toString().replace(/\//g, '?/?')
      temp = temp.toString().replace(/\?+$/, '')
      var unit_array = temp.split('?')
      self[this.Solution_variable_array[index]].Units_unit_array = unit_array
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-----------------------------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------------------------------- SCALE UNITS -----------------------------------------------------------------//
//---------------------------------------------------------------------------------------------------------------------------------------------//
/*
This function finds the metric equivalent of the units entered for each individual component of the equation. It then converts the number for 
that component accordingly. It then looks to see if there are any powers and records that information to be used in the creation of the base array.

Step 1: Creating the power array 
For each of the items in the unit array, if you come across a division sign, flip the sign for each unit beneath the sign. This is needed 
for manually entered units such as kg*m/s^2 instead of N.

Step 2: Converting the numbers and units to their metric equivalents 
Look at each item in the units array and see if it is a known unit. If it is, pull the scaled and converted numbers. If the item that 
follows the unit is a power sign, then increase the power array by the appropriate amount.

Step 3: Taking care of powers
This takes care of the case where there is a (m^2)^3

*/
Equation.prototype.Scale_Units = function (callback) {
  // Create the variables that will be needed
  var id = this.Format_id,
    TempFlag = 0,
    index = 0,
    thisid = '',
    unit_array = [],
    scaled_array = [],
    sign_array = '',
    unitindex = 0,
    thisindex = 0
  var conv_array = [],
    power_array = [],
    status = 1,
    flag = 0,
    i = 0,
    conv_unit = '',
    a = 0,
    x = '',
    y = '',
    replace = '',
    number = 0,
    temp = ''
  var temp1 = '',
    temp2 = ''

  for (index = 0; index < this.Solution_variable_array.length; ++index) {
    if (typeof self[this.Solution_variable_array[index]] == 'object') {
      // Grab the unit array and create some corresponding arrays to work with
      thisid = self[this.Solution_variable_array[index]].Format_id
      unit_array = self[this.Solution_variable_array[index]].Units_unit_array
      scaled_array = unit_array.slice(0)
      conv_array = unit_array.slice(0)
      power_array = unit_array.slice(0)
      sign_array = unit_array.slice(0)
      status = 1

      // Make sure that the power array has the appropriate sign
      for (unitindex = 0; unitindex < unit_array.length; ++unitindex) {
        power_array[unitindex] = status
        if (unit_array[unitindex] == '/') {
          status = status * -1
          thisindex = unitindex + 1
          flag = 0
          while (thisindex <= unit_array.length && flag === 0) {
            power_array[thisindex] = status
            if (unit_array[thisindex] == ')') {
              flag = 1
            }
            thisindex++
          }
        }
      }
      self[this.Solution_variable_array[index]].Units_power_array = power_array

      // Check each entry in the array and see if it matches a scaled item. If so,
      // check to see if it is a temperature and if it is, set a flag. If not, store
      // the scaled factor. Store the units it is converted to, the quantiry, and multiplier
      for (unitindex = 0; unitindex < unit_array.length; ++unitindex) {
        flag = 0
        for (i in scaleUnits) {
          if (unit_array[unitindex] == i) {
            if (i == 'C' || i == 'F' || i == 'R') {
              scaled_array[unitindex] = i
              TempFlag = 1
            } else {
              scaled_array[unitindex] = scaleUnits[i]['conv_factor']
            }
            conv_array[unitindex] = scaleUnits[i]['conv_unit']
            conv_unit = scaleUnits[i]['conv_unit']
            self[self[id].Solution_variable_array[index]].Units_units = conv_unit
            self[self[id].Solution_variable_array[index]].Units_conv_units = i
            self[self[id].Solution_variable_array[index]].Units_quantity = scaleUnits[i]['quantity']
            self[self[id].Solution_variable_array[index]].Units_multiplier = scaleUnits[i]['conv_factor']
            if (unit_array[unitindex + 1] == '^') {
              power_array[unitindex] = unit_array[unitindex + 2] * power_array[unitindex]
            }
            sign_array[unitindex] = power_array[unitindex]
          }
        }
      }

      // Build the equation to scale the item according to each of the conversion factors found so far.
      // Disallow for temperatures, but scale for powers for everything else
      var equation = 'NA='
      for (a = 0; a < scaled_array.length; ++a) {
        if (scaled_array[a + 1] == '^') {
          x = scaled_array[a]
          y = scaled_array[a + 2]
          if (x == 'C' || x == 'F' || x == 'K' || x == 'R') {
            Set_Error(this.Original_id, 'Format11')
          } else {
            replace = Math.pow(x, y)
          }
          scaled_array[a] = replace
          scaled_array[a + 1] = ''
          scaled_array[a + 2] = ''
        }
        equation = equation + scaled_array[a]
      }
      if (equation == 'NA=') {
        equation = 'NA=1'
      }

      // Solve this equation using the eval function to give us the total mutiplier
      if (equation != 'NA=C' && equation != 'NA=F' && equation != 'NA=K' && equation != 'NA=R' && TempFlag === 0) {
        self[this.Solution_variable_array[index]].Units_multiplier = eval(equation)
      }
      //else if (TempFlag==1) { Set_Error(this.Original_id, "Format11"); }

      // Store these values so that I can debug them
      self[this.Solution_variable_array[index]].Units_scaled_array = scaled_array
      self[this.Solution_variable_array[index]].Units_conv_array = conv_array

      // Now step through the solution and scale each entry
      if (self[this.Solution_variable_array[index]].Units_multiplier != 1) {
        for (i in self[this.Solution_variable_array[index]].Solution_real) {
          // Pull out the real and imaginary and make sure they exist
          temp1 = self[this.Solution_variable_array[index]].Solution_real[i]
          if (temp1 === undefined) {
            temp1 = 0
          }
          temp2 = self[this.Solution_variable_array[index]].Units_multiplier
          if (self[this.Solution_variable_array[index]].Solution_imag[i] === undefined) {
            self[this.Solution_variable_array[index]].Solution_imag[i] = 0
            temp3 = 0
          } else {
            temp3 = self[this.Solution_variable_array[index]].Solution_imag[i]
          }

          // Scale each number. If it is a temperature, handle that in its own way
          if (equation == 'NA=C' || equation == 'C') {
            self[this.Solution_variable_array[index]].Solution_real[i] = parseFloat(Big(temp1).plus(Big(273.15)))
            self[this.Solution_variable_array[index]].Solution_imag[i] = 0
          } else if (equation == 'NA=F' || equation == 'F') {
            self[this.Solution_variable_array[index]].Solution_real[i] = parseFloat(
              Big(temp1)
                .plus(Big(459.67))
                .times(Big(5).div(Big(9)))
            )
            self[this.Solution_variable_array[index]].Solution_imag[i] = 0
          } else if (equation == 'NA=R' || equation == 'NA=R') {
            self[this.Solution_variable_array[index]].Solution_real[i] = parseFloat(Big(temp1).times(0.555555555555))
            self[this.Solution_variable_array[index]].Solution_imag[i] = 0
          } else if (equation == 'NA=K' || equation == 'NA=K') {
            self[this.Solution_variable_array[index]].Solution_real[i] = parseFloat(temp1)
            self[this.Solution_variable_array[index]].Solution_imag[i] = 0
          } else {
            self[this.Solution_variable_array[index]].Solution_real[i] = parseFloat(Big(temp1).times(temp2))
            self[this.Solution_variable_array[index]].Solution_imag[i] = parseFloat(Big(temp3).times(temp2))
          }
        }
      }

      /*
			number=DOM_Object[this.Solution_variable_array[index]]['real']['0-0'];
			if (number===undefined) { number=1; }
			if (equation=="NA=C"||equation=="C") 
			{		temp=parseFloat(Big(number).plus(Big(273.15)));
			}else if (equation=="NA=F"||equation=="F")
			{		temp=parseFloat(Big(number).plus(Big(459.67)).times(Big(5).div(Big(9))));
			}else if (equation=="NA=R"||equation=="NA=R")
			{		temp=parseFloat(Big(number).times(0.555555555555));
			}else if (equation=="NA=K"||equation=="NA=K")			 
			{		temp=parseFloat(number);
			}else {	temp=parseFloat(Big(number).times(Big(self[this.Solution_variable_array[index]].Units_multiplier)));	}
			self[this.Solution_variable_array[index]].Solution_real['0-0']=temp;
			if ((self[this.Solution_variable_array[index]].Format_size!="1x1")&&(self[this.Solution_variable_array[index]].Units_multiplier!=1))
			{
				for (i in self[this.Solution_variable_array[index]].Solution_real)
				{ 	temp1=self[this.Solution_variable_array[index]].Solution_real[i];//--- This addresses the case where the item is an array and all components are scaled.
					temp2=self[this.Solution_variable_array[index]].Units_multiplier;
					self[this.Solution_variable_array[index]].Solution_real[i]=parseFloat(Big(temp1).times(temp2));
				 	temp1=self[this.Solution_variable_array[index]].Solution_imag[i];
					if (temp1===undefined) { self[this.Solution_variable_array[index]].Solution_imag[i]=0;
					}else { self[this.Solution_variable_array[index]].Solution_imag[i]=parseFloat(Big(temp1).times(Big(temp2))); }
				}

			}

			*/
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//---------------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------------------------------------- DECOMPOSE UNITS -----------------------------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
/*
This function looks at the units for an object and looks for complex units in the base array. For example, a N would be decomposed in 1 kg, 
1 m, and -2 s.This is done so that if the user enters "kg*m/s^2" for units instead of "N", then the code will still know that those are the 
same units. It then creates the base array.

Step 1: Initiate the new base array to zero everywhere

Step 2: For each individual unit in the unit array, compare it to the complex units in the parseUnits object. If it matches, then increase
the base units for the corresponding complex unit by an amount equal to those base units by the power of the complex unit.

For example, if you come across N^2, then the units added to the base array are 2 kg, 2 m, and -4 s.

Step 3 : For each individual unit in the unit array, compare it to the units in the scaled array.
*/
Equation.prototype.Decompose_Units = function (callback) {
  // Declare the variables
  var id = this.Format_id,
    matchFlag = 0,
    index = 0,
    unit_array = '',
    power_array = '',
    new_array = [],
    unitindex = 0,
    i = '',
    ui = 0,
    cu = ''

  for (index = 0; index < this.Solution_variable_array.length; ++index) {
    if (typeof self[this.Solution_variable_array[index]] == 'object') {
      // Take the converted units and power array created in the scale units function
      unit_array = self[this.Solution_variable_array[index]].Units_conv_array
      power_array = self[this.Solution_variable_array[index]].Units_power_array
      new_array = []
      for (unitindex = 0; unitindex < UnitList.length; unitindex++) {
        new_array[UnitList[unitindex]] = 0
      }

      // Match the scaled units to the parse equivalent and then increment the base units array accordingly
      for (unitindex = 0; unitindex < unit_array.length; ++unitindex) {
        for (i in parseUnits) {
          if (unit_array[unitindex] == parseUnits[i]['base_unit']) {
            for (ui = 0; ui < UnitList.length; ui++) {
              cu = UnitList[ui]
              new_array[cu] = parseFloat(
                Big(parseUnits[i][cu]).times(Big(power_array[unitindex])).plus(Big(new_array[cu]))
              )
            }
          }
        }
      }
      self[this.Solution_variable_array[index]].Units_base_array = new_array
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------------------------------------- GET BASE STRING -----------------------------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
/*
This function looks at the base array object for each equation item and creates units when adding and subtracting numbers.
*/
Equation.prototype.Get_BaseString = function (callback) {
  // Create the variables needed here
  var id = this.Format_id,
    thismodel = '',
    testmodel = '',
    index = 0,
    ui = 0

  for (index = 0; index < this.Solution_variable_array.length; ++index) {
    thismodel = ''
    if (typeof self[this.Solution_variable_array[index]] == 'object') {
      for (ui = 0; ui < UnitList.length - 1; ui++) {
        if (
          self[this.Solution_variable_array[index]].Units_base_array[UnitList[ui]] == NaN ||
          self[this.Solution_variable_array[index]].Units_base_array[UnitList[ui]] == 'NaN'
        ) {
          thismodel = thismodel + '0'
        } else {
          thismodel = thismodel + self[this.Solution_variable_array[index]].Units_base_array[UnitList[ui]]
        }
      }
      self[this.Solution_variable_array[index]].Units_base_string = thismodel
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------------------//
//----------------------------------------------- RECOMPOSE UNITS ---------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
/*
	This function takes the base array and determines the units from that. This is necessary because users may add Newtons to
	kg * meters per seconds squared. Users may also multiply kg by meters by seconds square.  Before that happens, the units 
	are decomposed into the base units, the math is done, and then the base array is looked at here to determine the final units.

	Step 1: Create a string from the current base array

	Step 2: Go through the parse array of complex units and create a string from those base units as well. Compare that
	string to the base string of the final equation. Note that regular units like s for seconds are included in the parse
	object. That means that normal units are indeed found here.

	Step 3: If the base string did not match any of the known complex units, an algorithm builds the display units from the 
	remaining base array. This should be updated to allow for complex units to be pulled out and still build the remaining
	items. Perhaps creating a base array and then subtracting the known complex units?
*/
Equation.prototype.Recompose_Units = function (callback) {
  var ui = 0,
    flag = 0,
    i = '',
    testmodel = '',
    basemodel = '',
    thismodel = '',
    units = '',
    flag0 = 0,
    flag1 = 0,
    flag2 = 0

  // Go through the base array and build a model for the base string
  for (ui = 0; ui < UnitList.length; ui++) {
    if (this.Units_base_array[UnitList[ui]] == NaN || this.Units_base_array[UnitList[ui]] == 'NaN') {
      thismodel = thismodel + '0'
      basemodel = basemodel + UnitList[ui]
    } else {
      thismodel = thismodel + this.Units_base_array[UnitList[ui]]
      basemodel = basemodel + UnitList[ui]
    }
  }

  // Test if the units base string matches any of the known complex units like Newtons, etc
  flag = 0
  for (i in parseUnits) {
    testmodel = ''
    for (ui = 0; ui < UnitList.length; ui++) {
      if (parseUnits[i][UnitList[ui]]) {
        testmodel = testmodel + parseUnits[i][UnitList[ui]]
      } else {
        testmodel = testmodel + '0'
      }
    }
    if (thismodel == testmodel && parseUnits[i]['default'] == '1') {
      flag = 1
      this.Units_units = parseUnits[i]['base_unit']
      this.Units_quantity = parseUnits[i]['quantity']
    }
  }

  // If the units do not match a known complex item
  if (flag == 0) {
    units = '('
    flag0 = 0
    flag1 = 0
    flag2 = 0

    // Loop through the unit list and build the units
    for (ui = 0; ui < UnitList.length; ui++) {
      if (this.Units_base_array[UnitList[ui]] == 1) {
        if (flag0 == 0) {
          units = units + '' + UnitList[ui]
          flag0 = 1
        } else {
          units = units + '*' + UnitList[ui]
        }
      }

      if (this.Units_base_array[UnitList[ui]] > 1) {
        if (flag0 == 0) {
          units = units + '' + UnitList[ui] + '^' + this.Units_base_array[UnitList[ui]]
          flag0 = 1
        } else {
          units = units + '*' + UnitList[ui] + '^' + this.Units_base_array[UnitList[ui]]
        }
      }
      flag1 = 1
    }
    if (units == '(') {
      units = ''
    } else {
      units = units + ')'
    }

    for (ui = 0; ui < UnitList.length; ui++) {
      // Place negative units on the lower end of the divide
      if (this.Units_base_array[UnitList[ui]] == -1) {
        if (flag0 === 0) {
          units = '1/(' + UnitList[ui]
          flag2 = 1
        } else {
          if (flag2 == 1) {
            units = units + '*' + UnitList[ui]
          } else {
            units = units + '/(' + UnitList[ui]
            flag2 = 1
          }
        }
      }

      // Place multiple lowered units
      if (this.Units_base_array[UnitList[ui]] < -1) {
        if (flag0 === 0) {
          units = '1/(' + UnitList[ui] + '^' + this.Units_base_array[UnitList[ui]].toString().replace('-', '')
          flag2 = 1
        } else {
          if (flag2 == 1) {
            units = units + '*' + UnitList[ui] + '^' + this.Units_base_array[UnitList[ui]].toString().replace('-', '')
          } else {
            units = units + '/(' + UnitList[ui] + '^' + this.Units_base_array[UnitList[ui]].toString().replace('-', '')
            flag2 = 1
          }
        }
      }
    }
    if (units !== '' && flag2 == 1) {
      units = units + ')'
    }
    units = units.replace(/^\*/, '')
    units = units.replace(/^\//, '')
    this.Units_units = units
  }
  this.Models_quantities = this.Units_quantity
  if (typeof callback == 'function') {
    callback()
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------------------- GET SIZE -----------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.Get_Size = function (callback) {
  var i = '',
    temp = '',
    a = '',
    size_array = {},
    numinds = 1,
    size = '',
    flag = 0,
    cflag = 0,
    newkey = '',
    newsol = {}
  for (i in this.Solution_real) {
    temp = i.split('-')
    for (a = 0; a < temp.length; a = a + 1) {
      if (parseInt(temp[a], 10) >= (parseInt(size_array[a], 10) || 0)) {
        size_array[a] = parseInt(temp[a], 10)
      }
    }
    if (temp.length != numinds && cflag === 0) {
      flag = 1
    }
    if (temp.length > numinds) {
      numinds = temp.length
    }
    cflag = 1
  }
  if (flag == 1) {
    for (i in this.Solution_real) {
      newkey = ''
      temp = i.split('-')
      for (a = 0; a < numinds; a = a + 1) {
        if (temp[a] !== undefined) {
          newkey = newkey + '-' + temp[a]
        } else {
          newkey = newkey + '-0'
        }
      }
      newkey = newkey.replace(/^\-/, '')
      newsol[newkey] = this.Solution_real[i]
    }
    this.Solution_real = newsol
  }
  for (i in size_array) {
    size_array[i] = parseInt(size_array[i], 10) + 1
  }
  for (i in size_array) {
    if (size === '') {
      size = size_array[i]
    } else {
      size = size + 'x' + size_array[i]
    }
  }
  this.Format_numinds = numinds
  if (this.Format_numinds < 2) {
    this.Format_numinds = 2
  }
  this.Format_size = size
  if (String(this.Format_size).indexOf('x') == '-1') {
    this.Format_size = this.Format_size + 'x1'
  }
  if (this.Format_size == 'x1') {
    this.Format_size = '1x1'
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------------- GET BASE STRING ------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.Get_My_BaseString = function (callback) {
  var basestring = ''
  for (var i in this.Units_base_array) {
    // We don't include radians in the base string
    if (i != 'rad') {
      basestring = basestring + this.Units_base_array[i]
    }
  }
  this.Units_base_string = basestring
  if (typeof callback == 'function') {
    callback()
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------------------ MODELS -----------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.Models = function (callback) {
  var id = this.Format_id
  self[id].Models_numerical = ''
  self[id].Models_units = ''
  self[id].Models_dimensions = ''
  self[id].Models_quantities = ''
  var num = ''
  var dim = ''
  var units = ''
  var quan = ''
  for (var index = 0; index < self[id].Solution_variable_array.length; ++index) {
    if (typeof self[self[id].Solution_variable_array[index]] == 'object') {
      if (self[self[id].Solution_variable_array[index]].Models_numerical === '') {
        if (self[self[id].Solution_variable_array[index]].Format_size == '1x1') {
          num = num + '' + self[self[id].Solution_variable_array[index]].Solution_real['0-0']
        } else {
          num = num + '' + self[self[id].Solution_variable_array[index]].Format_size
        }
      } else {
        num = num + '' + self[self[id].Solution_variable_array[index]].Models_numerical
      }
      if (self[self[id].Solution_variable_array[index]].Models_units === '') {
        if (self[self[id].Solution_variable_array[index]].Units_units === '') {
          units = units + ' NA'
        } else {
          units = units + '' + self[self[id].Solution_variable_array[index]].Units_units
        }
      } else {
        units = units + '' + self[self[id].Solution_variable_array[index]].Models_units
      }
      if (self[self[id].Solution_variable_array[index]].Models_dimensions === '') {
        dim = dim + '' + self[self[id].Solution_variable_array[index]].Format_size
      } else {
        dim = dim + '' + self[self[id].Solution_variable_array[index]].Models_dimensions
      }
      if (self[self[id].Solution_variable_array[index]].Models_quantities === '') {
        if (self[self[id].Solution_variable_array[index]].Units_quantity === '') {
          quan = quan + ' NA'
        } else {
          quan = quan + '' + self[self[id].Solution_variable_array[index]].Units_quantity
        }
      } else {
        if (self[self[id].Solution_variable_array[index]].Models_quantities == 'NA') {
          if (
            self[self[id].Solution_variable_array[index]].Units_quantity == 'NA' ||
            self[self[id].Solution_variable_array[index]].Units_quantity == ''
          ) {
            quan = quan + '' + self[self[id].Solution_variable_array[index]].Models_quantities
          } else {
            quan = quan + '' + self[self[id].Solution_variable_array[index]].Units_quantity
          }
        }
      }
    } else {
      num = num + '' + self[id].Solution_variable_array[index]
      units = units + '' + self[id].Solution_variable_array[index]
      dim = dim + '' + self[id].Solution_variable_array[index]
      quan = quan + '' + self[id].Solution_variable_array[index]
    }
  }
  self[id].Models_numerical = self[id].Models_numerical + num + ''
  self[id].Models_units = self[id].Models_units + units + ''
  self[id].Models_dimensions = self[id].Models_dimensions + dim + ''
  self[id].Models_quantities = self[id].Models_quantities + quan + ''
  if (typeof callback == 'function') {
    callback()
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------//

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*--------------------------------------------------------- Functions to Solve Equations ------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

//-------------------------------------------------------------------------------------------------------------------------//
//----------------------------------------- CONVERT EQUATION TO POSTFIX ---------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
/*
Solving an equation involves the five functions below. The primary function is the UpdateEquation one, which is called 
anytime an equation is changed or a variable is changed that the equation uses. This function calls the function above 
to parse the equation by separating the variables within the equation, obtaining their values and units from the variable 
table, and then creating the numerical, unit, and full model by calling those functions.

Once those functions are called, these functions are called to solve the equation. First, the ConvertToPost function is 
called to take the infix notation of the equation and make the postfix style equation. This function creates both a 
numerical postfix and a postfix with units. The function holding the precedence of the operators is called from this 
function. Then the function to solve the postfix equation is used. This function simply performs the numerical operations 
that is defined by the symbol or words like sin or cos. 

This function is one of the primary ones used to solve equations. It converts the entered equation from an infix 
notation to an postfix one. This is a common tactic used in solving this sort of problem. This is accomplished by parsing 
the equation into an array with each element contaning a variable, an operator, or a parenthesis. Once this is done, 
the algorithm simply goes through each item in the array and places it into the proper postfix format.
*/
Equation.prototype.Convert_to_Post = function (callback) {
  var var_array = this.Solution_variable_array
  Stack = new Array()
  Stack_Units = new Array()
  PostFix = new Array()
  PostFix_Units = new Array()
  var stackpop = ''
  var stackpop_units = ''
  for (var index = 0; index < var_array.length; ++index) {
    if (
      var_array[index] == '+' ||
      var_array[index] == '-' ||
      var_array[index] == '*' ||
      var_array[index] == '/' ||
      var_array[index] == '//' ||
      var_array[index] == '^' ||
      var_array[index] == '#'
    ) {
      stackpop = Stack.pop()
      Stack.push(stackpop)
      while (Stack.length !== 0 && ThisOperatorPrecedence(stackpop) >= ThisOperatorPrecedence(var_array[index])) {
        PostFix[PostFix.length] = Stack.pop()
        stackpop = Stack.pop()
        Stack.push(stackpop)
      }
      Stack.push(var_array[index])
    } else if (var_array[index] == '(') {
      Stack.push(var_array[index])
    } else if (var_array[index] == ')') {
      stackpop = Stack.pop()
      while (stackpop != '(') {
        PostFix[PostFix.length] = stackpop
        stackpop = Stack.pop()
      }
    } else {
      PostFix[PostFix.length] = var_array[index]
    }
  }
  stackpop = Stack.pop()
  while (stackpop) {
    PostFix[PostFix.length] = stackpop
    stackpop = Stack.pop()
  }
  this.Solution_PostFix = PostFix
  for (var i = 0; i < this.Solution_PostFix.length; i++) {
    if (this.Solution_PostFix[i] === '') {
      this.Solution_PostFix.splice(i, 1)
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------- OPERATOR PRECEDENCE ---------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
/*
This function is used by the above function in altering the entered equation from infix to postfix. It takes in an 
operator and returns the precedence of that operator. The precedence is simply a method of ensuring that multiplication 
and division occur before addition and subtraction. This is also true for trig functions, powers, and others.
*/
function ThisOperatorPrecedence(operator) {
  if (operator == '*' || operator == '/' || operator == '#' || operator == '.*' || operator == '//') {
    var precedence = 2
  } else if (operator == '+' || operator == '-') {
    var precedence = 1
  } else if (operator == '^') {
    var precedence = 3
  } else {
    var precedence = 0
  }
  return precedence
}
//-------------------------------------------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------- SOLVE THE POST FIX EQUATION ---------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------------------//
/*	This function solves the post fix string created above from the infix equation. This is done by pulling numbers from the string until 	\
	an operator is reached. At that time the most recent two numbers are pulled and the operator in question is performed for functions 	\
	in which one parameter is required, only one is pulled.																					\
//-----------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.SolvePostFix = function (callback) {
  var PostFix = this.Solution_PostFix
  Stack = new Array()
  var stackpop1 = ''
  var stackpop2 = ''
  solution = ''
  if (PostFix.length < 2) {
    if (typeof self[PostFix[0]] == 'object') {
      var object = self[PostFix[0]].Format_id
      if (typeof self[PostFix[0]].Solution_real['0-0'] == 'object') {
        var object = self[self[PostFix[0]].Solution_real['0-0']].Format_id
      }
      this.Solution_real = self[object].Solution_real
      this.Solution_imag = self[object].Solution_imag
      this.Solution_convsol = self[object].Solution_convsol
      this.Solution_realdefault = self[object].Solution_realdefault
      this.Solution_imagdefault = self[object].Solution_imagdefault
      this.Format_numinds = self[object].Format_numinds
      this.Format_size = self[object].Format_size
      this.Units_units = self[object].Units_units
      this.Units_conv_units = self[object].Units_conv_units
      this.Units_multiplier = self[object].Units_multiplier
      this.Units_quantity = self[object].Units_quantity
      this.Units_base_array = self[object].Units_base_array
    }
  } else {
    for (var index = 0; index < PostFix.length; ++index) {
      if (this.Errors_flag === 0) {
        if (
          PostFix[index] == '-' ||
          PostFix[index] == '+' ||
          PostFix[index] == '*' ||
          PostFix[index] == '#' ||
          PostFix[index] == '/' ||
          PostFix[index] == '//'
        ) {
          stackpop1 = Stack.pop()
          if (!isNaN(stackpop1)) {
            stackpop1 = stackpop1
          }
          stackpop2 = Stack.pop()
          if (!isNaN(stackpop2)) {
            stackpop2 = stackpop2
          }
          var temp = PostFix[index]
          solution = SolveMath(temp, stackpop1, stackpop2, this.Format_id)
          Stack.push(solution)
          if (solution == 'Error') {
            break
          }
        } else {
          Stack.push(PostFix[index])
        }
      }
    }
    if (typeof self[solution] == 'object' && this.Format_type != 3 && this.Errors_flag === 0) {
      var object = self[solution].Format_id
      if (typeof self[solution].Solution_real['0-0'] == 'object') {
        var object = self[self[PostFix[0]].Solution_real['0-0']].Format_id
      }
      this.Units_units = self[object].Units_units
      this.Units_base_array = self[object].Units_base_array
      this.Units_quantity = self[object].Units_quantity
      this.Format_size = self[object].Format_size
      this.Format_numinds = self[object].Format_numinds
      this.Solution_real = self[object].Solution_real
      this.Solution_imag = self[object].Solution_imag
      this.Solution_realdefault = self[object].Solution_realdefault
      this.Solution_imagdefault = self[object].Solution_imagdefault
    } else if (typeof self[solution] == 'object' && this.Format_type == 3 && this.Errors_flag === 0) {
      var object = self[solution].Format_id

      if (typeof self[solution].Solution_real['0-0'] == 'object') {
        var object = self[self[PostFix[0]].Solution_real['0-0']].Format_id
      }
      this.Solution_real = self[object].Solution_real
      this.Solution_imag = self[object].Solution_imag
    }
  }
  if (this.Errors_flag === 0) {
    for (var i in this.Solution_real) {
      if (typeof self[this.Solution_real[i]] === 'object') {
        if (self[this.Solution_real[i]].Format_showtype == 'number') {
          this.Solution_real[i] = self[this.Solution_real[i]].Solution_real['0-0']
          this.Solution_imag[i] = self[this.Solution_imag[i]].Solution_imag['0-0']
        }
      }
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-----------------------------------------------------------------------------------------------------------------------------------------//

/*-----------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------- SOLVE MATH -------------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------------------------------------------------------------*/
/*	This is the primary function that actually does the math. It is sent an operator and one or two numbers. It looks at the operator 		\
	and performs the appropriate math on the appropriate numbers. First, it looks at the two numbers sent to the solver and tests if 		\
	either is an array. If neither of the numbers is an array, the simple math is performed on the numbers. However, if one of the 			\
	numbers is an array, the proper function is performed.																					\
/*-----------------------------------------------------------------------------------------------------------------------------------------*/
function SolveMath(operator, pop1, pop2, id) {
  if (DOM_Object[pop1]['size'] === '') {
    DOM_Object[pop1]['size'] = '1x1'
  }
  if (DOM_Object[pop2]['size'] === '') {
    DOM_Object[pop2]['size'] = '1x1'
  }
  var solution = ''
  var type1 = 1
  var type2 = 1
  if (self[pop1]) {
    if (self[pop1].Format_size == '1x1') {
      type1 = 1
    } else {
      type1 = 3
    }
  }
  if (self[pop2]) {
    if (self[pop2].Format_size == '1x1') {
      type2 = 1
    } else {
      type2 = 3
    }
  }
  switch (operator) {
    case '+':
      if (type1 == 1 && type2 == 1) {
        solution = AddSubNumbers(pop2, pop1, '+', id)
      }
      if (type1 == 3 && type2 == 3) {
        solution = AddSubMatrices(pop2, pop1, '+', id)
      }
      if ((type1 == 1 && type2 == 3) || (type1 == 3 && type2 == 1)) {
        solution = ScalarOperation('+', pop1, pop2)
      }
      break
    case '-':
      if (type1 == 1 && type2 == 1) {
        solution = AddSubNumbers(pop2, pop1, '-', id)
      }
      if (type1 == 3 && type2 == 3) {
        solution = AddSubMatrices(pop2, pop1, '-', id)
      }
      if ((type1 == 1 && type2 == 3) || (type1 == 3 && type2 == 1)) {
        solution = ScalarOperation('-', pop2, pop1)
      }
      break
    case '*':
      if (type1 == 1 && type2 == 1) {
        solution = MultDivNumbers(pop2, pop1, '*', id)
      }
      if (type1 == 3 && type2 == 3) {
        solution = MultMatrices(pop2, pop1, '*', id)
      }
      if ((type1 == 1 && type2 == 3) || (type1 == 3 && type2 == 1)) {
        solution = ScalarOperation('*', pop1, pop2)
      }
      break
    case '/':
      if (type1 == 1 && type2 == 1) {
        solution = MultDivNumbers(pop2, pop1, '/', id)
      }
      if ((type1 == 1 && type2 == 3) || (type1 == 3 && type2 == 1)) {
        solution = ScalarOperation('/', pop1, pop2)
      }
      if (type1 == 3 && type2 == 3) {
        solution = MultMatrices(pop2, pop1, '/', id)
      }
      break
    case '#':
      if (type1 == 3 && type2 == 3 && self[pop1].Format_size == self[pop2].Format_size) {
        solution = DotProduct(pop1, pop2)
      } else {
        Set_Error(id, 'DotProduct1', pop1, pop2)
      }
      break
  }
  return solution
}
//-----------------------------------------------------------------------------------------------------------------------------------------//

/*-----------------------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------ SOLVE MATRIX SUBCOMPONENTS -------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------------------------------------------------------------*/
/*	This function is called to solve the case where a certain index of matrix is solved for. This is the case where the equation is 	    |
	Matrix1[1][2]=5. It is not the case where the equation is test=Matrix1[1][2]. To accomplish the task, the program has three steps.      |
    1.  Find the most recent incarnation of the matrix in question and set this Solution array equal to that. 		       					|    
    2.  Split the indices sent to be set up into the individual brackets in an array. i.e. "[1][2][3]" becomes "[1], [2], [3]"              |
    3.  For each of these indices:                                                                                                          |
            a. Split the text up by the colons to see of it is a span i.e. 3:8 becomes [3], [8]                                             |
            b. If the span has a length of 1                                                                                                |
                I.  If it is a number, set the key to that and the size of that index to 1                                                  |
                II. If it is not a number, solve the equation and set the key to that value and the size to 1                               |
            c. If the span is not 3, set an error it should be a "[something]" "[:]" "[something]"                                          |
            d. If the span is indeed 3                                                                                                      |
                I.   If the first item is a number, set the first part of the key                                                           |
                II.  If it is not a number, solve the equation and set the key                                                              |
                III. If the third part is a number, set the second part of the key                                                          |
                IV.  If the third part is not a number, solve and set the key                                                               |
                V.   Set the length for the segment by subtracting the first key from the second                                            |
    4.  Check the indexes for the solution and for the indices that the solution is to be assigned to.                                      |
            a. Check each index to see if the size at that index is the same for both sides                                                 |
                I. One additional index is allowed on the left side, but it must have a size of 1. This is the case where the user is       |
                   growing the matrix by one dimension. For an already 2 D matrix, a third dimension could be added.                        |
            b. Check again to ensure that the number of indices being assingned on the left is equal to the size of the right               |
            C. Check again to ensure that the same number of indices exist on both sides of the equation                                    |
    5.  				|
/*-----------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Matrix_SubComp = function (callback) {
  //	|
  var key = {},
    index = 0,
    thisNumInd = 1,
    newNumInd = 1,
    theseIndexes = [],
    thisIndex = '',
    sizeIndex = {},
    splitIndex = [],
    leftSizes = [] //  |
  var stepFlag = 0,
    thisKey = '',
    readKey = {},
    indexFlag = 0,
    newSizes = [],
    newKeySize = '',
    newIndexFlag = 0,
    bigMatrixFlag = 0,
    solSizes = [] //  |
  if (!this.Format_left.match(/^\[/)) {
    //	|
    if (this.Format_type == '3') {
      //	|
      this.Get_Size()
      if (this.Page_parentid == 'none') {
        //	|
        var thiseq = MatchClosestEquation(this.Format_name, DOM_Object[this.Format_id]['order'], this.Format_id) //	|
        if (DOM_Object[thiseq] !== undefined) {
          //	|
          DOM_Object[this.Format_id]['numinds'] = JSON.parse(JSON.stringify(DOM_Object[thiseq]['numinds'])) //	|
          DOM_Object[this.Format_id]['size'] = JSON.parse(JSON.stringify(DOM_Object[thiseq]['size'])) //	|(1)
          DOM_Object[this.Format_id]['real'] = JSON.parse(JSON.stringify(DOM_Object[thiseq]['real'])) //	|
          DOM_Object[this.Format_id]['imag'] = JSON.parse(JSON.stringify(DOM_Object[thiseq]['imag'])) //	|
          this.tempsolr = JSON.parse(JSON.stringify(DOM_Object[thiseq]['real'])) //	|
          this.tempsoli = JSON.parse(JSON.stringify(DOM_Object[thiseq]['imag'])) //	|
        } else {
          Set_Error(this.Format_id, 'Format10')
        } //  |
      } //  |
      theseIndexes = splitBrackets(this.Format_left) //  |(2)
      solSizes = this.Format_size.split('x') //  |
      leftSizes = DOM_Object[thiseq]['size'].split('x') //  |
      for (
        var index = 0;
        index < theseIndexes.length;
        index++ //  |
      ) {
        key[index] = {} //  |
        thisIndex = splitColons(theseIndexes[index]) //  |(3a)
        if (thisIndex.length == 1) {
          //  |
          if (isNumber(thisIndex[0])) {
            //  |(3bI)
            key[index]['a'] = parseInt(thisIndex[0]) //  |
            key[index]['b'] = parseInt(thisIndex[0]) //  |
            key[index]['length'] = 1 //  |
          } else if (thisIndex[0] == ':') {
            //  |
            key[index]['a'] = 0 //  |
            key[index]['b'] = leftSizes[index] - 1 //  |
            key[index]['length'] = leftSizes[index] //  |
          } //  |
          else {
            var eqobj = {
              Page_position: DOM_Object[this.Format_id]['order'],
              Format_showtype: 'InnerFunction', //  |
              Page_parentid: DOM_Object[this.Format_id]['parentid'],
              Page_topparentid: DOM_Object[this.Format_id]['topparentid'], // |
              Original_id: this.Format_id,
              equation: 'NewEq=' + thisIndex[0]
            } //  |
            var id = CreateEq(DOM_Object[this.Format_id]['fileid'], 1, eqobj) //  |
            this.Solution_temps.push(id) //  |
            key[index]['a'] = DOM_Object[id]['real']['0-0'] //  |
            key[index]['b'] = DOM_Object[id]['real']['0-0'] //  |
            key[index]['length'] = 1 //  |
            delete DOM_Object[id]
            delete self[id] //  |
            sizeIndex[index] = 1 //  |
          } //  |
        } else if (thisIndex.length != 3) {
          //  |(3c)
          Set_Error(this.Format_id, 'Indices1', index, thisIndex.length) //  |
        } else if (thisIndex.length == 3) {
          //  |
          if (isNumber(thisIndex[0])) {
            key[index]['a'] = parseInt(thisIndex[0]) //  |(3dI)
          } //  |
          else {
            var eqobj = {
              Page_position: DOM_Object[this.Format_id]['order'],
              Format_showtype: 'InnerFunction', //  |
              Page_parentid: DOM_Object[this.Format_id]['parentid'],
              Page_topparentid: DOM_Object[this.Format_id]['topparentid'], //  |
              Original_id: this.Format_id,
              equation: 'NewEq=' + thisindex[0]
            } //  |(3DII)
            var id = CreateEq(DOM_Object[this.Format_id]['fileid'], 1, eqobj) //  |
            this.Solution_temps.push(id) //  |
            key[index]['a'] = DOM_Object[id]['real']['0-0'] //  |
            delete DOM_Object[id]
            delete self[id] //  |
          } //  |
          if (isNumber(thisIndex[2])) {
            //  |(3dIII)
            key[index]['b'] = parseInt(thisIndex[2]) //  |
            key[index]['length'] = key[index]['b'] - key[index]['a'] + 1 //  |
          } //  |
          else {
            var eqobj = {
              Page_position: DOM_Object[this.Format_id]['order'],
              Format_showtype: 'InnerFunction', //  |
              Page_parentid: DOM_Object[this.Format_id]['parentid'],
              Page_topparentid: DOM_Object[this.Format_id]['topparentid'], //  |
              Original_id: this.Format_id,
              equation: 'NewEq=' + thisindex[2]
            } //  |
            var id = CreateEq(DOM_Object[this.Format_id]['fileid'], 1, eqobj) //  |(3dIV)
            this.Solution_temps.push(id) //  |
            key[index]['b'] = DOM_Object[id]['real']['0-0'] //  |
            key[index]['length'] = key[index]['b'] - key[index]['a'] + 1 //  |
            delete DOM_Object[id]
            delete self[id] //  |
          } //  |(3dV)
        } //  |
      } //  |
      for (var index = 0; index < theseIndexes.length; index++) {
        console.log('Multiplying ' + newNumInd + ' times ' + parseInt(key[index]['length']))
        newNumInd = newNumInd * parseInt(key[index]['length'])
      } //  |(4)
      for (var index = 0; index < solSizes.length; index++) {
        console.log('Multiplying ' + thisNumInd + ' times ' + parseInt(solSizes[index]))
        thisNumInd = thisNumInd * parseInt(solSizes[index])
      } //  |
      for (var index = 0; index < Object.keys(key).length; index++) {
        newKeySize = newKeySize + 'x' + key[index]['length']
      } //  |
      newKeySize = newKeySize.replace(/^x/, '') //  |
      console.log('The numbers of indices are newNumInd - ' + newNumInd + ' and thisNumInd - ' + thisNumInd)
      console.log('The sizes are newKeySize - ' + newKeySize + ' and this.Format_size - ' + this.Format_size)
      for (
        var index = 0;
        index < theseIndexes.length;
        index++ //  |
      ) {
        if (key[index]['b'] >= leftSizes[index]) {
          //  |
          bigMatrixFlag = 1
        } //  |
      } //  |
      for (
        var index = 0;
        index < theseIndexes.length;
        index++ //  |
      ) {
        if (key[index]['length'] != solSizes[index]) {
          //  |
          if (Object.keys(key).length == leftSizes.length) {
            indexFlag = 1
          } //  |
          if (
            key[index]['length'] == 1 &&
            index == theseIndexes.length - 1 &&
            theseIndexes.length == leftSizes.length + 1
          ) {
            //  |
            newIndexFlag = 1
          } else {
            indexFlag = 1
          } //  |
        } //  |(4A)
      } //  |
      if (theseIndexes.length != leftSizes.length && theseIndexes.length != leftSizes.length + 1) {
        //  |
        Set_Error(this.Format_id, 'Indices2', theseIndexes.length, leftSizes.length) //  |
      } else if (indexFlag == 1) {
        //  |(4B)
        Set_Error(this.Format_id, 'Indices4', newKeySize, this.Format_size) //  |
      } else if (newNumInd != thisNumInd) {
        //  |(4C)
        Set_Error(this.Format_id, 'Indices3', thisNumInd, newNumInd) //  |
      } //  |(4D)
      else {
        var numKeys = 1 //  |
        for (
          a = 0;
          a < Object.keys(key).length;
          a++ //  |
        ) {
          key[a]['count'] = key[a]['a'] //  |
          numKeys = numKeys * (parseInt(key[a]['b']) - parseInt(key[a]['a']) + 1) //  |
        } //  |
        for (
          a = 0;
          a < solSizes.length;
          a++ //  |
        ) {
          readKey[a] = {} //  |
          readKey[a]['a'] = 0 //  |
          readKey[a]['b'] = solSizes[a] - 1 //  |
          readKey[a]['count'] = 0 //  |
        } //  |
        console.log('The number of keys is ' + numKeys)
        for (
          index = 0;
          index < numKeys;
          index++ //  |
        ) {
          thisKey = ''
          showKey = '' //  |
          stepFlag = 0 //  |
          for (
            a = Object.keys(key).length - 1;
            a >= 0;
            a-- //  |
          ) {
            if (a == Object.keys(key).length - 1) {
              //  |
              thisKey = key[a]['count']
            } else {
              thisKey = key[a]['count'] + '-' + thisKey
            } //  |
          } //  |
          for (
            a = Object.keys(readKey).length - 1;
            a >= 0;
            a-- //  |
          ) {
            if (a == Object.keys(readKey).length - 1) {
              //  |
              showKey = readKey[a]['count']
            } else {
              showKey = readKey[a]['count'] + '-' + showKey
            } //  |
          } //  |
          showKey = showKey.replace(/\-$/, '') //  |
          console.log(
            'Setting the key ' + thisKey + ' to the value at ' + showKey + ' of ' + this.Solution_real[showKey]
          )
          for (
            a = Object.keys(key).length - 1;
            a >= 0;
            a-- //  |
          ) {
            if (a == Object.keys(key).length - 1) {
              //  |
              key[a]['count'] = parseInt(key[a]['count']) + 1 //  |
              if (key[a]['count'] > parseInt(key[a]['b'])) {
                //  |
                stepFlag = 1 //  |
                key[a]['count'] = parseInt(key[a]['a']) //  |
              } //  |
            } //  |
            else {
              if (stepFlag == 1) {
                //  |
                key[a]['count'] = parseInt(key[a]['count']) + 1 //  |
                if (key[a]['count'] > parseInt(key[a]['b'])) {
                  //  |
                  stepFlag = 1 //  |
                  key[a]['count'] = parseInt(key[a]['a']) //  |
                } else {
                  stepFlag = 0
                } //  |
              } //  |
            } //  |
          } //  |
          for (
            a = Object.keys(readKey).length - 1;
            a >= 0;
            a-- //  |
          ) {
            if (a == Object.keys(readKey).length - 1) {
              //  |
              readKey[a]['count'] = parseInt(readKey[a]['count']) + 1 //  |(5)
              if (readKey[a]['count'] > parseInt(readKey[a]['b'])) {
                //  |
                stepFlag = 1 //  |
                readKey[a]['count'] = 0 //  |
              } //  |
            } //  |
            else {
              if (stepFlag == 1) {
                //  |
                readKey[a]['count'] = parseInt(readKey[a]['count']) + 1 //  |
                if (readKey[a]['count'] > parseInt(readKey[a]['b'])) {
                  //  |
                  stepFlag = 1 //  |
                  readKey[a]['count'] = 0 //  |
                } else {
                  stepFlag = 0
                } //  |
              } //  |
            } //  |
          } //  |
          this.tempsolr[thisKey] = this.Solution_real[showKey] //  |
          this.tempsoli[thisKey] = this.Solution_imag[showKey] //  |
        } //  |
      } //  |
      DOM_Object[this.Format_id]['real'] = JSON.parse(JSON.stringify(this.tempsolr)) //  |
      DOM_Object[this.Format_id]['imag'] = JSON.parse(JSON.stringify(this.tempsoli)) //  |
      this.Solution_real = JSON.parse(JSON.stringify(this.tempsolr)) //  |
      this.Solution_imag = JSON.parse(JSON.stringify(this.tempsoli)) //  |
      console.log('I just set the new matrix to ...')
      console.log(this.Solution_real)
      if (newIndexFlag == 1 || bigMatrixFlag == 1) {
        resolveMatrix(this.Format_id)
      } //  |
    } //  |
  } //  |
  if (typeof callback == 'function') {
    callback()
  } //  |
} //  |
/*-----------------------------------------------------------------------------------------------------------------------------------------*/

/*-----------------------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------ SPLIT THE INDEXES UP BY THEIR BRACKETS -------------------------------------------------------*/
/*-----------------------------------------------------------------------------------------------------------------------------------------*/
/*  This function takes in the string that is sent as the series of indexes in the above function and then returns the contents of each     |
    bracket as an array. This is done by simply breaking up the text and then recombining the parts inside the brackets.                    |
/*-----------------------------------------------------------------------------------------------------------------------------------------*/
function splitBrackets(text) {
  //	|
  var inputArray = new Array(),
    numArray = new Array(),
    flip = 0,
    bcount = 0,
    pcount = 0 //	|
  text = text.replace(/^[a-zA-Z0-9\_]+/, '') //  |
  inputArray = SplitText(text) //	|
  for (
    var a = 0;
    a < inputArray.length;
    a++ //	|
  ) {
    if (inputArray[a] == '(') {
      flip = 1
      bcount = parseInt(bcount, 10) + 1
    } //	|
    if (inputArray[a] == '[') {
      flip = 1
      pcount = parseInt(pcount, 10) + 1
    } //	|
    if (inputArray[a] == ')') {
      bcount = bcount - 1
    } //	|
    if (inputArray[a] == ']') {
      pcount = pcount - 1
    } //	|
    if ((inputArray[a] == ')' || inputArray[a] == ']') && bcount === 0 && pcount === 0) {
      flip = 0
    } //	|
    if (flip == 1) {
      numArray[a] = 1
    } else {
      numArray[a] = 0
    } //	|
  } //	|
  for (
    var i = inputArray.length;
    i > 0;
    i-- //	|
  ) {
    if (
      (numArray[i] == '1' && numArray[parseInt(i, 10) - 1] == '1') ||
      (numArray[parseInt(i, 10) - 1] == '1' && inputArray[i] == ']') ||
      (numArray[parseInt(i, 10) - 1] == '1' && inputArray[i] == ')')
    ) {
      inputArray[i - 1] = inputArray[i - 1] + inputArray[i] //	|
      inputArray.splice(i, 1) //	|
      numArray.splice(i, 1) //	|
    }
  } //	|
  for (
    var i = inputArray.length;
    i >= 0;
    i-- //  |
  ) {
    if (inputArray[i] == ',' || inputArray[i] == ' ' || inputArray[i] === '') {
      //  |
      inputArray.splice(i, 1) //  |
    }
  } //	|
  return inputArray //	|
} //	|
/*-----------------------------------------------------------------------------------------------------------------------------------------*/

/*-----------------------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------ CHECK INPUT FOR MULTIPLE ENTRIES -------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------------------------------------------------------------*/
/*  This function takes in the string that is sent as an index to the function above. The function takes the string and splits it at the    |
    semicolons. It then recombines the string to ensure that an entry is not parsed at an inappropriate part.                               |
/*-----------------------------------------------------------------------------------------------------------------------------------------*/
function splitColons(text) {
  //	|
  text = text.replace(/^\[/, '').replace(/\]$/, '') //  |
  var inputArray = new Array(),
    numArray = new Array(),
    flip = 0,
    bcount = 0,
    pcount = 0 //	|
  inputArray = SplitText(text) //	|
  for (
    var a = 0;
    a < inputArray.length;
    a++ //	|
  ) {
    if (inputArray[a] == '(') {
      flip = 1
      bcount = parseInt(bcount, 10) + 1
    } //	|
    if (inputArray[a] == '[') {
      flip = 1
      pcount = parseInt(pcount, 10) + 1
    } //	|
    if (inputArray[a - 1] == ')') {
      bcount = bcount - 1
    } //	|
    if (inputArray[a - 1] == ']') {
      pcount = pcount - 1
    } //	|
    if ((inputArray[a - 1] == ')' || inputArray[a - 1] == ']') && bcount === 0 && pcount === 0) {
      flip = 0
    } //	|
    if (flip == 1) {
      numArray[a] = 1
    } //	|
  } //	|
  for (
    var i = inputArray.length;
    i > 0;
    i-- //	|
  ) {
    if (numArray[i] == '1' && numArray[parseInt(i, 10) - 1] == '1') {
      //	|
      inputArray[i - 1] = inputArray[i - 1] + inputArray[i] //	|
      inputArray.splice(i, 1) //	|
      numArray.splice(i, 1) //	|
    }
  } //	|
  for (
    var i = inputArray.length;
    i >= 0;
    i-- //  |
  ) {
    if (inputArray[i] == ',' || inputArray[i] == ' ' || inputArray[i] === '') {
      //  |
      inputArray.splice(i, 1) //  |
    }
  } //	|
  for (
    var i = inputArray.length - 1;
    i > 0;
    i-- //  |
  ) {
    if (inputArray[i] != ':' && inputArray[i - 1] != ':') {
      //  |
      inputArray[i - 1] = inputArray[i - 1] + '' + inputArray[i] //  |
      inputArray.splice(i, 1) //  |
    }
  } //	|
  return inputArray //	|
} //	|
/*-----------------------------------------------------------------------------------------------------------------------------------------*/

/*-----------------------------------------------------------------------------------------------------------------------------------------*/
/*----------------------------------------------------------- RESOLVE MATRIX --------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------------------------------------------------------------*/
/*	This function takes in an equation id and looks at the matrix to see if its size is correct and that every index has an entry.			|
	This is done by looping through each index and finding the highest value for each index. Once that is done, the matrix is looped 		|
	through again and any unset indices are set. The size is also reset. This function is called whenever a matrices indices are changed.   |
/*-----------------------------------------------------------------------------------------------------------------------------------------*/
function resolveMatrix(id, callback) {
  //	|
  var thisIndex = '',
    sizeObj = {},
    newSize = '',
    numIndices = 1,
    thisKey = '',
    stepFlag = 0,
    numIndices = 1,
    tempKey = '',
    tempIndex = 0 //  |
  for (var realNum in self[id]['Solution_real']) {
    //	|
    thisIndex = realNum.split('-') //  |
    for (var a in thisIndex) {
      //  |
      if (sizeObj[a] === undefined) {
        sizeObj[a] = {}
        sizeObj[a]['count'] = 0
        sizeObj[a]['size'] = 0
      } //  |
      if (thisIndex[a] > sizeObj[a]['size']) {
        sizeObj[a]['size'] = thisIndex[a]
      } //  |
    } //  |
  } //  |
  for (
    var a = 0;
    a < Object.keys(sizeObj).length;
    a++ //  |
  ) {
    if (a == 0) {
      newSize = parseInt(sizeObj[a]['size']) + 1
    } else {
      newSize = newSize + 'x' + (parseInt(sizeObj[a]['size']) + 1)
    }
  } //  |
  for (var a = 0; a < Object.keys(sizeObj).length; a++) {
    numIndices = numIndices * parseInt(parseInt(sizeObj[a]['size']) + 1)
  } //  |
  for (
    index = 0;
    index < numIndices;
    index++ //  |
  ) {
    thisKey = '' //  |
    stepFlag = 0 //  |
    for (
      a = Object.keys(sizeObj).length - 1;
      a >= 0;
      a-- //  |
    ) {
      if (a == Object.keys(sizeObj).length - 1) {
        thisKey = sizeObj[a]['count']
      } else {
        thisKey = sizeObj[a]['count'] + '-' + thisKey
      }
    } //  |
    if (self[id]['Solution_real'][thisKey] === undefined) {
      //  |
      tempKey = thisKey.replace(/\-[0-9]+$/, '') //  |
      if (self[id]['Solution_real'][tempKey] === undefined) {
        //  |
        self[id]['Solution_real'][thisKey] = self[id]['Solution_realdefault'] //  |
      } //  |
      else {
        tempIndex = thisKey.match(/[0-9]+$/) //  |
        if (tempIndex[0] == 0) {
          //  |
          self[id]['Solution_real'][thisKey] = self[id]['Solution_real'][tempKey] //  |
        } else {
          self[id]['Solution_real'][thisKey] = self[id]['Solution_realdefault']
        } //  |
      } //  |
    } else {
      self[id]['Solution_real'][thisKey] = self[id]['Solution_real'][thisKey]
    } //  |
    if (self[id]['Solution_imag'][thisKey] === undefined) {
      //  |
      tempKey = thisKey.replace(/\-[0-9]+$/, '') //  |
      if (self[id]['Solution_imag'][tempKey] === undefined) {
        //  |
        self[id]['Solution_imag'][thisKey] = self[id]['Solution_imagdefault'] //  |
      } //  |
      else {
        tempIndex = thisKey.match(/[0-9]+$/) //  |
        if (tempIndex[0] == 0) {
          //  |
          self[id]['Solution_imag'][thisKey] = self[id]['Solution_imag'][tempKey] //  |
        } else {
          self[id]['Solution_imag'][thisKey] = self[id]['Solution_imagdefault']
        } //  |
      } //  |
    } else {
      self[id]['Solution_imag'][thisKey] = self[id]['Solution_imag'][thisKey]
    } //  |
    for (
      a = Object.keys(sizeObj).length - 1;
      a >= 0;
      a-- //  |
    ) {
      if (a == Object.keys(sizeObj).length - 1) {
        //  |
        sizeObj[a]['count'] = parseInt(sizeObj[a]['count']) + 1 //  |
        if (sizeObj[a]['count'] > parseInt(sizeObj[a]['size'])) {
          //  |
          stepFlag = 1 //  |
          sizeObj[a]['count'] = 0 //  |
        } //  |
      } //  |
      else {
        if (stepFlag == 1) {
          //  |
          sizeObj[a]['count'] = parseInt(sizeObj[a]['count']) + 1 //  |
          if (sizeObj[a]['count'] > parseInt(sizeObj[a]['size'])) {
            //  |
            stepFlag = 1 //  |
            sizeObj[a]['count'] = 0 //  |
          } else {
            stepFlag = 0
          } //  |
        } //  |
      } //  |
    } //  |
  } //  |
  DOM_Object[id]['real'] = JSON.parse(JSON.stringify(self[id]['Solution_real'])) //  |
  DOM_Object[id]['imag'] = JSON.parse(JSON.stringify(self[id]['Solution_imag'])) //  |
  self[id]['Format_size'] = newSize //  |
  DOM_Object[id]['size'] = newSize //  |
  if (typeof callback == 'function') {
    callback()
  } //	|
} //	|
/*-----------------------------------------------------------------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------------------------------------------------------------*/

/*-----------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------- FORMAT FRACTIONS -------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------------------------------------------------------------*/
/*	This program looks at the object array and formats the fractions to be shown in MathJax. This is done by stepping through the 			\
	object array and finding any division signs. For the ones found, it looks for any parenthesis on either side and matches those. 		\
	It then inserts the formatting for MathJax																								\
/*-----------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Format_Fractions = function (callback) {
  for (a = 0; a < this.Solution_variable_array.length; a++) {
    var opencount = 0
    var closecount = 0
    if (this.Solution_variable_array[a] == '/') {
      this.Solution_variable_array[a] = '}{'
      if (this.Solution_variable_array[a - 1] == ')') {
        this.Solution_variable_array[a] = this.Solution_variable_array[a].replace('}', '')
        this.Solution_variable_array[a - 1] = '}'
        var closepar = 0
        var flag = 0
        var index = a - 2
        while (flag === 0 && index >= 0) {
          if (this.Solution_variable_array[index] == '(' && closepar === 0) {
            flag = 1
            this.Solution_variable_array[index] = '\\frac{'
          } else if (this.Solution_variable_array[index] == '(') {
            closepar = closepar - 1
          } else if (this.Solution_variable_array[index] == ')') {
            closepar = closepar + 1
          }
          index = index - 1
        }
      } else {
        if (a < 2) {
          this.Solution_variable_array.splice(0, 0, '\\frac{')
          this.Solution_key_array.splice(0, 0, '\\frac{')
          a = a + 1
        } else {
          this.Solution_variable_array.splice(a - 1, 0, '\\frac{')
          this.Solution_key_array.splice(a - 1, 0, '\\frac{')
          a = a + 1
        }
      }
      if (this.Solution_variable_array[a + 1] == '(') {
        var closepar = 0
        var flag = 0
        var index = a + 2
        this.Solution_variable_array[a] = this.Solution_variable_array[a].replace('{', '')
        this.Solution_variable_array[a + 1] = '{'
        while (flag === 0 && index <= this.Solution_variable_array.length - 1) {
          if (this.Solution_variable_array[index] == ')' && closepar === 0) {
            flag = 1
            this.Solution_variable_array[index] = '}'
          } else if (this.Solution_variable_array[index] == ')') {
            closepar = closepar - 1
          } else if (this.Solution_variable_array[index] == '(') {
            closepar = closepar + 1
          }
          index = index + 1
        }
      } else {
        this.Solution_variable_array.splice(a + 2, 0, '}')
      }
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-----------------------------------------------------------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------- SHOW FRACTION ----------------------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------------------//
/*
This function takes in a string that is either the units or an equation. It then goes through the string and formats any divisions to 
be shown in MathJax. The proper MathJax syntax is \frac{x}{y} where the user simply enters x/y
*/
function Show_Fraction(string) {
  if (string) {
    var test = string.match(/[0-9,a-z,A-Z,\.,\^,\-,\*,\s,\(,\)]+\/[0-9,a-z,A-Z,\.,\^,\-,\*,\s,\(,\)]+/)
    while (test) {
      var spliteq = test[0].split('/')
      var num = spliteq[0]
      var den = spliteq[1]
      var newstring = '\\frac{' + num + '}{' + den + '}'
      string = string.replace(test, newstring)
      test = string.match(/[0-9,a-z,A-Z,\.,\^,\-,\*,\s]+\/[0-9,a-z,A-Z,\.,\^,\-,\*,\s]+/)
    }
    test = string.match(/\//)
    while (test) {
      var index = string.indexOf('/')
      if (string.charAt(index - 1) == ')') {
        var closecount = 0
        var startindex = 0
        for (a = index - 2; a >= 0; a--) {
          if (string.indexOf(a) == ')') {
            closecount = closecount + 1
          }
          if (string.indexOf(a) == '(') {
            closecount = closecount - 1
            if (closecount === 0) {
              startindex = a
              break
            }
          }
        }
        var num = string.substr(startindex, index - startindex)
      }
      if (string.charAt(index + 1) == '(') {
        var opencount = 0
        var endindex = string.length - 1
        for (a = index + 2; a <= endindex; a++) {
          if (string.indexOf(a) == '(') {
            opencount = opencount + 1
          }
          if (string.indexOf(a) == ')') {
            opencount = opencount - 1
            if (opencount === 0) {
              endindex = a
              break
            }
          }
        }
        var den = string.substr(index + 1, endindex - index)
      }
      string = string.replace(num, '')
      string = string.replace(den, '\\frac{' + num + '}{' + den + '}')
      test = string.match(/\//)
    }
  }
  return string
}
//-----------------------------------------------------------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------------- SHOW EQUATION ----------------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------------------//
/*
The last function called in the formatting of the equation, this function looks at each object in the equation's array and displays the 
proper item. If the object was originally a number, then it display's a number. If it was a subequation or built in, then the proper 
text is shown. If it is a matrix, then the matrix is shown and if it was a vector then the vector text is shown.  If this is the top 
equation, then the result is also shown.
*/
Equation.prototype.Show_Equation = function (callback) {
  if (this.Format_showtype == 'top' || this.Format_showtype == 'builtin' || this.Format_showtype == 'InnerFunction') {
    var equation = ''
    for (var a = 0; a < this.Solution_variable_array.length; a++) {
      if (typeof self[this.Solution_variable_array[a]] == 'object') {
        if (
          self[this.Solution_variable_array[a]].Format_showvalue == 'Negative' ||
          self[this.Solution_variable_array[a]].Format_showvalue == 'FirstNeg'
        ) {
          self[this.Solution_variable_array[a]].Format_showvalue == 'default'
          this.Solution_variable_array.splice(a + 1, 1)
        }
        //console.log('The variable array is '+this.Solution_variable_array[a]+' and the show equation is '+self[this.Solution_variable_array[a]].Format_showequation);
        equation = equation + self[this.Solution_variable_array[a]].Format_showequation
      } else {
        equation = equation + this.Solution_variable_array[a]
      }
    }
    if (this.Errors_flag == 1) {
      this.Format_showequation = '\\text{' + this.Errors_errors[0] + '}'
    } else {
      this.Format_showequation = equation
    }
  }
  if (this.Format_type == '5') {
    this.Format_left + ''
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-----------------------------------------------------------------------------------------------------------------------------------------//

/*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*--------------------------------------------------------------- SHOW SOLUTION -----------------------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This function displays the solution only after the show equation has been formatted in the above function. This function is called whenever the user changes how the 		\
	solution is to be displayed. This could be changing the display from the solution to the size or vice versa. As of now, the name, equation, and solution are held is 		\
	separate properties of the equation object and brought together when being displayed.																						\
/*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Show_Solution = function (callback) {
  var solution = ''
  var isol = ''
  var real = 0
  var imag = 0
  var addon = ''
  var showu = ''
  if (this.Format_showtype == 'top') {
    if (this.Units_showunits === '') {
      this.Units_showunits = this.Units_units
    }
    if (this.Format_size == '1x1') {
      real = this.Solution_real['0-0']
      imag = this.Solution_imag['0-0']
      if (this.Units_units === '') {
        if (imag === 0 || imag === '' || imag === NaN || isNaN(imag)) {
          solution = real + '\\hspace{1mm}'
        } else if (imag > 0) {
          solution = real + '+' + imag + 'i\\hspace{1mm}'
        } else if (imag < 0) {
          solution = real + '' + imag + 'i\\hspace{1mm}'
        }
        solution = solution + Show_Fraction(this.Units_units)
      } else {
        if (scaleUnits[this.Units_showunits]) {
          var cv = Big(scaleUnits[this.Units_showunits]['conv_factor'])
          showu = this.Units_showunits
          if (this.Units_showunits == 'C') {
            solution = Big(real).minus(Big(273.15))
            showu = '^{\\circ} C'
          } else if (this.Units_showunits == 'F') {
            solution = parseFloat(
              Big(real)
                .times(Big(9).div(Big(5)))
                .minus(459.67)
            )
            showu = '^{\\circ} F'
          } else if (this.Units_showunits == 'R') {
            solution = parseFloat(Big(real).div(Big(0.555555555555)))
            showu = '^{\\circ} R'
          } else if (this.Units_showunits == 'K') {
            solution = real
            showu = 'K'
          } else {
            solution = Big(real).div(cv)
          }
          if (imag === 0 || imag === '' || imag === NaN || isNaN(imag)) {
            addon = ''
            isol = ''
          } else {
            if (this.Units_showunits == 'C') {
              isol = parseFloat(Big(imag).minus(Big(273.15)))
            } else if (this.Units_showunits == 'F') {
              isol = parseFloat(Big(imag).times(Big(9)).div(Big(5)).minus(459.67))
            } else if (this.Units_showunits == 'R') {
              isol = parseFloat(Big(imag).div(Big(0.555555555555)))
            } else if (this.Units_showunits == 'K') {
              isol = imag
            } else {
              isol = parseFloat(Big(imag).div(cv))
            }
          }
          if (imag > 0) {
            addon = '+'
          } else if (imag < 0) {
            addon = '-'
          }
          solution = solution + addon + isol + '\\hspace{1mm}' + Show_Fraction(showu)
        } else {
          if (this.Solution_convsol === '') {
            if (imag === 0 || imag === '' || imag === NaN || isNaN(imag)) {
              solution = real + '\\hspace{1mm}'
            } else if (imag > 0) {
              solution = real + '+' + imag + 'i'
            } else if (imag < 0) {
              solution = real + '' + imag + 'i'
            }
            if (this.Units_showunits === '') {
              solution = solution + '\\hspace{1mm}' + Show_Fraction(this.Units_units)
            } else {
              solution = solution + '\\hspace{1mm}' + Show_Fraction(this.Units_showunits)
            }
          } else {
            if (imag === 0 || imag === '' || imag === NaN || isNaN(imag)) {
              solution = ToNum(real / this.Solution_convsol) + '\\hspace{1mm}'
            } else if (imag > 0) {
              solution =
                parseFloat(Big(real).div(Big(this.Solution_convsol))) +
                '+' +
                parseFloat(Big(imag).div(Big(this.Solution_convsol))) +
                'i'
            } else if (imag < 0) {
              solution =
                parseFloat(Big(real).div(Big(this.Solution_convsol))) +
                '' +
                parseFloat(Big(imag).div(Big(this.Solution_convsol))) +
                'i'
            }
            solution = solution + '\\hspace{1mm}' + Show_Fraction(this.Units_showunits)
          }
        }
      }
    } //
    else {
      if (this.Format_showvalue == 'default' || this.Format_showvalue == 'size' || ToNum(this.Format_numinds) > 2) {
        solution = this.Format_size
      } else if (this.Format_showvalue == 'value') {
        this.Solution_showarray = {}
        if (this.Units_showunits === '') {
          for (var i in this.Solution_real) {
            if (this.Solution_real[i] != undefined) {
              if (this.Solution_imag[i] !== undefined) {
                if (parseFloat(this.Solution_imag[i]) > 0) {
                  this.Solution_showarray[i] = this.Solution_real[i] + ' + ' + this.Solution_imag[i] + 'i'
                } else if (parseFloat(this.Solution_imag[i]) < 0) {
                  this.Solution_showarray[i] = this.Solution_real[i] + '' + this.Solution_imag[i] + 'i'
                } else {
                  if (typeof self[this.Solution_real[i]] == 'object') {
                    this.Solution_showarray[i] = self[this.Solution_real[i]]['Format_showequation']
                  } else {
                    this.Solution_showarray[i] = this.Solution_real[i]
                  }
                }
              } else {
                if (this.Solution_imagdefault === 0) {
                  if (typeof self[this.Solution_real[i]] == 'object') {
                    this.Solution_showarray[i] = self[this.Solution_real[i]]['Format_showequation']
                  } else {
                    this.Solution_showarray[i] = this.Solution_real[i]
                  }
                } else {
                  this.Solution_showarray[i] = this.Solution_real[i] + '+' + this.Solution_imagdefault + 'i'
                }
              }
            } else {
              if (this.Solution_imag[i] !== undefined) {
                this.Solution_showarray[i] = this.Solution_realdefault + '+' + this.Solution_imag[i]
              } else {
                this.Solution_showarray[i] = this.Solution_realdefault + ' ' + this.Solution_imagdefault
              }
            }
          }
          solution = ShowMatrix(this.Format_id)
          solution = solution + '\\hspace{1mm}' + Show_Fraction(this.Units_units)
        } else {
          if (scaleUnits[this.Units_showunits] !== undefined) {
            var cv = scaleUnits[this.Units_showunits]['conv_factor']
            solution = ''
            showu = this.Units_showunits
            for (var i in this.Solution_real) {
              if (this.Solution_real[i] != undefined) {
                real = this.Solution_real[i]
                imag = this.Solution_imag[i]
                if (parseFloat(this.Solution_imag[i]) > 0) {
                  addon = '+'
                } else if (parseFloat(this.Solution_imag[i]) < 0) {
                  addon = ''
                } else {
                  addon = ''
                }
                if (this.Units_showunits == 'C') {
                  this.Solution_showarray[i] = Big(real).minus(Big(273.15))
                  showu = '^{\\circ} C'
                } else if (this.Units_showunits == 'F') {
                  this.Solution_showarray[i] = parseFloat(
                    Big(real)
                      .times(Big(9).div(Big(5)))
                      .minus(459.67)
                  )
                  showu = '^{\\circ} F'
                } else if (this.Units_showunits == 'R') {
                  this.Solution_showarray[i] = parseFloat(Big(real).div(Big(0.555555555555)))
                  showu = '^{\\circ} R'
                } else if (this.Units_showunits == 'K') {
                  this.Solution_showarray[i] = real
                  showu = 'K'
                } else {
                  this.Solution_showarray[i] = parseFloat(Big(real).div(cv))
                }
                if (imag === 0 || imag === '' || imag === NaN || isNaN(imag)) {
                  addon = ''
                  isol = ''
                } else {
                  if (this.Units_showunits == 'C') {
                    isol = Big(imag).minus(Big(273.15))
                  } else if (this.Units_showunits == 'F') {
                    isol = parseFloat(
                      Big(imag)
                        .times(Big(9).div(Big(5)))
                        .minus(459.67)
                    )
                  } else if (this.Units_showunits == 'R') {
                    isol = parseFloat(Big(imag).div(Big(0.555555555555)))
                  } else if (this.Units_showunits == 'K') {
                    isol = imag
                  } else {
                    isol = parseFloat(Big(imag).div(cv))
                  }
                  this.Solution_showarray[i] = this.Solution_showarray[i] + '' + addon + '' + isol
                }
              } else {
                if (this.Solution_imag[i] != undefined) {
                  this.Solution_showarray[i] =
                    parseFloat(Big(this.Solution_realdefault).div(Big(cv))) +
                    ' ' +
                    parseFloat(Big(this.Solution_imag[i]).div(Big(cv)))
                } else {
                  this.Solution_showarray[i] =
                    parseFloat(Big(this.Solution_realdefault).div(Big(cv))) +
                    ' ' +
                    parseFloat(Big(this.Solution_imagdefault).div(Big(cv)))
                }
              }
            }
            solution = ShowMatrix(this.Format_id)
            solution = solution + '\\hspace{1mm}' + Show_Fraction(showu)
          } else {
            for (var i in this.Solution_real) {
              if (this.Solution_real[i] != undefined) {
                real = this.Solution_real[i]
                imag = this.Solution_imag[i]
                if (this.Solution_imag[i] > 0) {
                  addon = '+'
                } else if (this.Solution_imag[i] < 0) {
                  addon = '-'
                } else {
                  addon = ''
                }
                if (imag === 0 || imag === '' || imag === NaN || isNaN(imag)) {
                  addon = ''
                  isol = ''
                  this.Solution_showarray[i] = real
                } else {
                  this.Solution_showarray[i] = this.Solution_showarray[i] + '' + addon + '' + isol
                }
              } else {
                if (this.Solution_imag[i] != undefined) {
                  this.Solution_showarray[i] =
                    parseFloat(Big(this.Solution_realdefault).div(Big(cv))) +
                    ' ' +
                    parseFloat(Big(this.Solution_imag[i]).div(Big(cv)))
                } else {
                  this.Solution_showarray[i] =
                    parseFloat(Big(this.Solution_realdefault).div(Big(cv))) +
                    ' ' +
                    parseFloat(Big(this.Solution_imagdefault).div(Big(cv)))
                }
              }
            }
            solution = ShowMatrix(this.Format_id)
            if (this.Units_showunits === '') {
              solution = solution + '\\hspace{1mm}' + Show_Fraction(this.Units_units)
            } else {
              solution = solution + '\\hspace{1mm}' + Show_Fraction(this.Units_units)
            }
          }
        }
      }
    }
    this.Format_showsolution = solution
    this.Solving = 0
  }
  if (typeof callback == 'function') {
    callback()
  }
}
/*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

//-----------------------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------- SHOW ARRAY ---------------------------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------------------//
/*
	This function looks at the equation and formats any arrays in it for MathJax. 
*/
Equation.prototype.Show_Array = function (callback) {
  var variable = '',
    temp = ''
  //	var splittext=this.Format_showequation.split(';');
  //	for (var a=0; a<splittext.length; a++)
  //	{	if (typeof(self[splittext[a].replace(/\[|\]/,'')])=="object") { temp=self[splittext[a].replace(/\[|\]/,'')].Format_showequation;
  //		}else { temp=splittext[a]; }
  //		variable=variable+''+temp; }
  variable = this.Format_showequation.replace(/\[/g, '\\begin{bmatrix}')
  variable = variable.replace(/\]/g, '\\end{bmatrix}')
  variable = variable.replace(/,/g, '&')
  variable = variable.replace(/;/g, ';;')
  variable = variable.replace(/;/g, '\\')
  this.Format_showequation = variable
  if (typeof callback == 'function') {
    callback()
  }
}
//-----------------------------------------------------------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------------------------------------------------------//
//----------------------------------------------------- SHOW MATRIX -----------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------------------//
/*
This function is called in the Show_Equation method. It simply returns the formatted matrix solution of an equation. If subcomponents 
are given, it only returns those. Note that you cannot show more than two dimensions at a time, so the code limits the user to that amount.
*/
function ShowMatrix(id) {
  var splitinds = self[id].Format_size.split('x')
  if (splitinds.length > 2 && this.Format_showvalue == 'value') {
    // This should produce an error and the entire algorithm needs to be updated later to account for components removing an index. The purpose here is to ensure that
    // the user isn't trying to show more than two dimensions. If he knocks down some dimensions, then the code needs to account for this.
  } else {
    var matrixtext = '\\begin{bmatrix}'
    for (var a = 0; a < splitinds[0]; a = a + 1) {
      for (var b = 0; b < splitinds[1]; b = b + 1) {
        key = a + '-' + b
        if (self[id].Solution_showarray[key] !== undefined) {
          matrixtext = matrixtext + self[id].Solution_showarray[key]
        } else {
          if (self[id].Solution_imagdefault === 0) {
            matrixtext = matrixtext + self[id].Solution_realdefault
          } else {
            if (self[id].Solution_imagdefault > 0) {
              matrixtext = matrixtext + self[id].Solution_realdefault + '+' + self[id].Solution_imagdefault + 'i'
            } else {
              matrixtext = matrixtext + self[id].Solution_realdefault + '' + self[id].Solution_imagdefault + 'i'
            }
          }
        }
        if (b < splitinds[1] - 1) {
          matrixtext = matrixtext + '&'
        }
      }
      matrixtext = matrixtext + '\\'
      matrixtext = matrixtext + '\\'
    }
    matrixtext = matrixtext + '\\end{bmatrix}'
  }
  return matrixtext
}
//-----------------------------------------------------------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------------------- EQUATION CLEANUP -------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------------------//
/*
This function goes through and cleans up after the equation has been completed. It deletes any temporary equations that were created 
during the solution process andremoves them from both the window memory and the DOM_Object array.
*/
Equation.prototype.Equation_Cleanup = function (callback) {
  //console.log('In the equation cleanup for '+this.Format_id+' - '+this.Format_equation);
  if (this.Format_showtype == 'top') {
    for (var a = 0; a < this.Solution_temps.length; a++) {
      delete DOM_Object[this.Solution_temps[a]]
      delete self[this.Solution_temps[a]]
    }
    this.Solution_temps = new Array()
    if (DOM_Object[this.Format_id] !== undefined && DOM_Object[this.Format_id]['name'] != 'TempEq') {
      for (var i in DOM_Object) {
        if (DOM_Object[i]['type'] == 'equation' || DOM_Object[i]['type'] === undefined) {
          if (
            DOM_Object[i]['name'] == 'undefined' ||
            DOM_Object[i]['name'] === undefined ||
            DOM_Object[i]['name'] == 'TempEq' ||
            DOM_Object[i]['name'] == 'Temp' ||
            DOM_Object[i]['name'] == 'NA'
          ) {
            console.log(
              'I came in like a wrecking ball and deleted ' + i + '-' + DOM_Object[i]['name'] + ' in the cleanup'
            )
            delete DOM_Object[i]
            delete self[i]
          }
        }
      }
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-----------------------------------------------------------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------------------- RETURN EQUATION --------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------------------//
/*	
//-----------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Return_Equation = function (callback) {
  console.log(
    'In the return equation function with ids of ' +
      this.Original_id +
      ' and ' +
      this.Format_id +
      ', the parent is ' +
      DOM_Object[this.Format_id]['parentid'] +
      ', the type is ' +
      self[this.Format_id]['Format_showtype'] +
      ' the equation is ' +
      DOM_Object[this.Format_id]['equation'] +
      ' and the solution is ' +
      self[this.Format_id]['Solution_real']['0-0'] +
      '-' +
      DOM_Object[this.Format_id]['Format_showequation'] +
      '-' +
      DOM_Object[this.Format_id]['Format_showsolution']
  )

  var connected = {}
  DOM_Object[this.Format_id]['real'] = this['Solution_real']
  DOM_Object[this.Format_id]['imag'] = this['Solution_imag']
  DOM_Object[this.Format_id]['size'] = this['Format_size']
  DOM_Object[this.Format_id]['name'] = this['Format_name']

  if (
    this.Original_id == this.Format_id &&
    DOM_Object[this.Format_id]['parentid'] == 'none' &&
    self[this.Format_id]['Format_showtype'] == 'top'
  ) {
    console.log(
      'Hey, I just met you, and this is crazy, but I finished equation ' + self[this.Original_id]['Format_equation']
    )
    if (eventType == 'SolveTableCell') {
      postMessage({ messageType: 'TableCellResult', Equation: this, Deps: DOM_Object[this.Format_id]['Dependents'] })
    } else {
      this.Dependents = DOM_Object[this.Format_id]['Dependents']
      if (Object.keys(self[this.Original_id]['connected_ids']).length > 0) {
        for (var id in self[this.Original_id]['connected_ids']) {
          connected[id] = self[id]
        }
      }
      postMessage({
        messageType: 'EquationResult',
        id: this.Format_id,
        equation: this,
        Deps: DOM_Object[this.Format_id]['Dependents'],
        connected: connected
      })
    }
  } else {
    console.log(
      "Hey, I just finished but didn't return " +
        self[this.Original_id]['Format_equation'] +
        ' because it had and original id of ' +
        this.Original_id +
        ' vs ' +
        this.Format_id +
        ', and parent id of ' +
        DOM_Object[this.Format_id]['parentid'] +
        ' and showtype of ' +
        self[this.Format_id]['Format_showtype']
    )
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//-----------------------------------------------------------------------------------------------------------------------------------------//

//-----------------------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------------------- RETURN STRUCTURE -------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------------------//
/*	This is the function called when a loop or statement has ended and the results are to be sent back to the main program. The function	\
	builds an object containing the results, size, and show equation for each equation in the structure and sends a message containing that	\
	object to the main program.																												\
//-----------------------------------------------------------------------------------------------------------------------------------------*/
function Return_Structure(ID) {
  console.log('The ID is ' + ID)
  console.log('At the beginning of Return_Structure, the DOM_Object of the loop is ...')
  console.log(DOM_Object)
  console.log(DOM_Object[ID])
  var returnObj = {},
    item = ''
  for (var itemID in DOM_Object) {
    console.log(
      'For ' +
        itemID +
        ', the location is ' +
        DOM_Object[itemID]['order'] +
        ', the location and lastpos are ' +
        DOM_Object[ID]['order'] +
        ' - ' +
        DOM_Object[ID]['Page_lastposition']
    )
    if (
      DOM_Object[itemID]['order'] >= DOM_Object[ID]['order'] &&
      DOM_Object[itemID]['order'] <= DOM_Object[ID]['Page_lastposition']
    ) {
      if (DOM_Object[itemID]['type'] == 'equation') {
        returnObj[itemID] = {}
        returnObj[itemID]['type'] = 'equation'
        returnObj[itemID]['Deps'] = DOM_Object[itemID]['Dependents']
        returnObj[itemID]['equationObj'] = self[itemID]
      }
      if (DOM_Object[itemID]['type'] == 'ifelse') {
        returnObj[itemID] = {}
        returnObj[itemID]['type'] = 'ifelse'
        returnObj[itemID]['ifelseObj'] = self[itemID]
      }
      if (DOM_Object[itemID]['type'] == 'forLoop') {
        returnObj[itemID] = {}
        returnObj[itemID]['type'] = 'forLoop'
        returnObj[itemID]['forloopObj'] = self[itemID]
      }
      if (DOM_Object[itemID]['type'] == 'whileLoop') {
        returnObj[itemID] = {}
        returnObj[itemID]['type'] = 'whileLoop'
        returnObj[itemID]['whileLoopObj'] = self[itemID]
      }
    }
  }
  postMessage({ messageType: 'StructureResult', ID: ID, structure: returnObj })
}
//-----------------------------------------------------------------------------------------------------------------------------------------//

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------- Math Functions  --------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

//---------------------------------------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------------------------------ TO NUMBERS ---------------------------------------------------------------------------//
//---------------------------------------------------------------------------------------------------------------------------------------------------------//
function ToNum(num) {
  return parseFloat(parseFloat(num).toFixed(12))
}

//---------------------------------------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------------------- ADDING AND SUBTRACTING NUMBERS ------------------------------------------------------------------//
//---------------------------------------------------------------------------------------------------------------------------------------------------------//
/*
This is the function that is called whenever two objects are added to each other. It checks the quantities to ensure that they are the same. If they are 
the same, the two are added or subtracted. If not, the error system is kicked in.

For complex numbers, the algorithm follows the pattern: (a+bi)+(c+di) = a+c+(b+d)i
*/
function AddSubNumbers(id1, id2, operator, thisid) {
  console.log('In add sub numbers, the operator is ' + operator + ' and the values are ...')
  console.log(
    self[id1].Solution_real['0-0'] +
      ' - ' +
      self[id1].Solution_imag['0-0'] +
      ' - ' +
      self[id2].Solution_real['0-0'] +
      ' ' +
      self[id2].Solution_imag['0-0']
  )

  if (isNaN(self[id1].Solution_real['0-0']) || self[id1].Solution_real['0-0'] == '') {
    self[id1].Solution_real['0-0'] = 0
  }
  if (isNaN(self[id1].Solution_imag['0-0']) || self[id1].Solution_imag['0-0'] == '') {
    self[id1].Solution_imag['0-0'] = 0
  }
  if (isNaN(self[id2].Solution_real['0-0']) || self[id2].Solution_real['0-0'] == '') {
    self[id2].Solution_real['0-0'] = 0
  }
  if (isNaN(self[id2].Solution_imag['0-0']) || self[id2].Solution_imag['0-0'] == '') {
    self[id2].Solution_imag['0-0'] = 0
  }
  if (self[id1].Units_base_string != self[id2].Units_base_string) {
    if (operator == '+') {
      Set_Error(thisid, 'Math1', id1, id2)
    }
    if (operator == '-') {
      Set_Error(thisid, 'Math2', id1, id2)
    }
    return 'Error'
  } else {
    if (operator == '+') {
      var real = Big(self[id1].Solution_real['0-0']).plus(Big(self[id2].Solution_real['0-0']))
      var imag = Big(self[id1].Solution_imag['0-0']).plus(Big(self[id2].Solution_imag['0-0']))
    }
    if (operator == '-') {
      var real = Big(self[id1].Solution_real['0-0']).minus(Big(self[id2].Solution_real['0-0']))
      var imag = Big(self[id1].Solution_imag['0-0']).minus(Big(self[id2].Solution_imag['0-0']))
    }
    var units = self[id1].Units_units
    var quantity = self[id1].Units_quantity
  }
  var eqobj = {
    Page_position: parseInt(self[id1].Page_position, 10),
    Format_showtype: 'InnerFunction',
    equation: 'TempEq=0'
  }
  var id = CreateEq(self[thisid]['fileid'], 0, eqobj)

  self[id].Format_showequation = '(' + self[id1].Format_showequation + operator + self[id2].Format_showequation + ')'
  self[id].Solution_real['0-0'] = parseFloat(real)
  self[id].Solution_imag['0-0'] = parseFloat(imag)
  self[id].Units_base_array = self[id1].Units_base_array
  self[id].Units_base_string = self[id1].Units_base_string
  self[id].Units_units = self[id1].Units_units
  self[id].Units_quantity = self[id1].Units_quantity
  self[id].Format_size = '1x1'
  self[thisid].Solution_temps.push(id)
  return id
}
//---------------------------------------------------------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------------------- MULTIPLYING AND DIVIDING NUMBERS ----------------------------------------------------------------//
//---------------------------------------------------------------------------------------------------------------------------------------------------------//
/*
	This function multiplies or divides two numbers with or without units. This is done by performing the math on the number for each item as it should 
	already be converted to the normalized SI units and then adding the units if it is multiplication or subtracting if it is division.
	For complex numbers, the multiplication algorithm follows the pattern: (a+bi)*(c+di)=ac+adi+bci+bdi^2=ac-bd+(ad+bc)i
	For division, the algorithm for complex numbers uses the complex conjugate : (a+bi)/(c+di)=((a+bi)*(c-di))/((c+di)*(c-di)) and is then divided out.
*/
function MultDivNumbers(id1, id2, operator, thisid) {
  console.log('In mult div numbers, the operator is ' + operator + ' and the values are ...')
  console.log(
    self[id1].Solution_real['0-0'] +
      ' - ' +
      self[id1].Solution_imag['0-0'] +
      ' - ' +
      self[id2].Solution_real['0-0'] +
      ' ' +
      self[id2].Solution_imag['0-0']
  )
  var real1 = 0
  var real2 = 0
  var imag1 = 0
  var imag2 = 0
  var real = 0
  var imag = 0
  if (self[id1].Solution_real['0-0'] == '') {
    self[id1].Solution_real['0-0'] = 0
  }
  if (self[id1].Solution_imag['0-0'] == '') {
    self[id1].Solution_imag['0-0'] = 0
  }
  if (self[id2].Solution_real['0-0'] == '') {
    self[id2].Solution_real['0-0'] = 0
  }
  if (self[id2].Solution_imag['0-0'] == '') {
    self[id2].Solution_imag['0-0'] = 0
  }
  if (self[id1].Solution_real['0-0'] === undefined) {
    real1 = self[id1].Solution_realdefault
  } else {
    real1 = self[id1].Solution_real['0-0']
  }
  if (self[id1].Solution_imag['0-0'] === undefined) {
    imag1 = self[id1].Solution_imagdefault
  } else {
    imag1 = self[id1].Solution_imag['0-0']
  }
  if (self[id2].Solution_real['0-0'] === undefined) {
    real2 = self[id2].Solution_realdefault
  } else {
    real2 = self[id2].Solution_real['0-0']
  }
  if (self[id2].Solution_imag['0-0'] === undefined) {
    imag2 = self[id2].Solution_imagdefault
  } else {
    imag2 = self[id2].Solution_imag['0-0']
  }
  if (operator == '*') {
    var r1 = parseFloat(Big(real1).times(Big(real2)))
    var r2 = parseFloat(Big(imag1).times(Big(imag2)))
    var i1 = parseFloat(Big(real1).times(Big(imag2)))
    var i2 = parseFloat(Big(imag1).times(Big(real2)))
    if (isNaN(r1)) {
      real = r2
    } else if (isNaN(r2)) {
      real = r1
    } else {
      real = parseFloat(Big(r1).minus(Big(r2)))
    }
    if (isNaN(i1)) {
      imag = i2
    } else if (isNaN(i2)) {
      imag = i1
    } else {
      imag = parseFloat(Big(i1).minus(Big(i2)))
    }
    if (self[id1].Format_showvalue == 'FirstNeg') {
      imag = imag * -1
    }
  }
  if (operator == '/') {
    console.log('')
    if (
      (imag1 === 0 && imag2 === 0) ||
      (imag1 === 0 && isNaN(imag2)) ||
      (isNaN(imag1) && imag2 === 0) ||
      (isNaN(imag1) && isNaN(imag2))
    ) {
      real = parseFloat(Big(real1).div(Big(real2)))
      imag = 0
    } else {
      var c = parseFloat(real2)
      var d = -1 * parseFloat(imag2)
      var a1 = real1
      var b1 = imag1
      var a2 = real2
      var b2 = imag2
      var nr = parseFloat(
        Big(a1)
          .times(Big(c))
          .minus(Big(b1).times(Big(d)))
      )
      var ni = parseFloat(
        Big(a1)
          .times(Big(d))
          .plus(Big(b1).times(Big(c)))
      )
      var dr = parseFloat(
        Big(a2)
          .times(Big(c))
          .minus(Big(b2).times(Big(d)))
      )
      var di = parseFloat(
        Big(a2)
          .times(Big(d))
          .minus(Big(b2).times(Big(c)))
      )
      var real = parseFloat(Big(nr).div(Big(dr)))
      var imag = parseFloat(Big(ni).div(Big(dr)))
    }
  }
  var baseunits = new Array()
  for (var index in self[id1].Units_base_array) {
    if (operator == '*') {
      baseunits[index] = self[id1].Units_base_array[index] + self[id2].Units_base_array[index]
    }
    if (operator == '/') {
      baseunits[index] = self[id1].Units_base_array[index] - self[id2].Units_base_array[index]
    }
  }
  var eqobj = {
    Page_position: DOM_Object[self[thisid].Format_id]['order'],
    Format_showtype: 'InnerFunction',
    Original_id: thisid,
    equation: 'TempEq=0'
  }
  var id = CreateEq(self[thisid]['fileid'], 0, eqobj)

  self[id].Solution_real['0-0'] = real
  self[id].Solution_imag['0-0'] = imag
  self[id].Units_base_array = baseunits
  self[id].Solution_variable_array[0] = id
  self[id].Get_My_BaseString()
  self[id].Format_size = '1x1'
  return id
}
//---------------------------------------------------------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------------------------- ADDING AND SUBTRACTING MATRICES ---------------------------------------------------------------//
//---------------------------------------------------------------------------------------------------------------------------------------------------------//
/*
This function is called whenever the user adds or subtracts matrices. It does the same as adding or subtracting two matrices with the addition of 
checking size issues. First, it checks to make sure that the base arrays match to ensure that the items being added make sense. Then it adds component
by component to each other and inserts the results to the proper component in the new equation item.
*/
function AddSubMatrices(id1, id2, operator, thisid) {
  self[id1].Get_My_BaseString()
  self[id2].Get_My_BaseString()
  console.log('In add sub matrices, the operator is ' + operator + ' and the values are ...')
  console.log(
    self[id1].Solution_real['0-0'] +
      ' - ' +
      self[id1].Solution_imag['0-0'] +
      ' - ' +
      self[id2].Solution_real['0-0'] +
      ' ' +
      self[id2].Solution_imag['0-0']
  )
  console.log(self[id1].Units_base_string + ' - ' + self[id2].Units_base_string)

  var real1 = 0
  var imag1 = 0
  var real2 = 0
  var imag2 = 0
  var realArray = {}
  var imagArray = {}
  var key = ''
  if (self[id1].Units_base_string != self[id2].Units_base_string) {
    if (operator == '+') {
      Set_Error(thisid, 'Math1', id1, id2)
    }
    if (operator == '-') {
      Set_Error(thisid, 'Math2', id1, id2)
    }
    return 'Error'
  } else if (self[id1].Format_size != self[id2].Format_size) {
    if (operator == '+') {
      Set_Error(thisid, 'Math3', id1, id2)
    }
    if (operator == '-') {
      Set_Error(thisid, 'Math4', id1, id2)
    }
    return 'Error'
  } else {
    var realkeys1 = self[id1].Solution_real
    var realkeys2 = self[id2].Solution_real
    var imagkeys1 = self[id1].Solution_imag
    var imagkeys2 = self[id2].Solution_imag
    for (var i in realkeys1) {
      if (realkeys1[i] === undefined || isNaN(realkeys1[i])) {
        real1 = self[id1].Solution_realdefault
      } else {
        real1 = realkeys1[i]
      }
      if (imagkeys1[i] === undefined || isNaN(imagkeys1[i])) {
        imag1 = self[id1].Solution_imagdefault
      } else {
        imag1 = imagkeys1[i]
      }
      if (realkeys2[i] === undefined || isNaN(realkeys2[i])) {
        real2 = self[id2].Solution_realdefault
      } else {
        real2 = realkeys2[i]
      }
      if (imagkeys2[i] === undefined || isNaN(imagkeys2[i])) {
        imag2 = self[id2].Solution_imagdefault
      } else {
        imag2 = imagkeys2[i]
      }
      if (operator == '+') {
        realArray[i] = parseFloat(Big(real1).plus(Big(real2)))
        imagArray[i] = parseFloat(Big(imag1).plus(Big(imag2)))
      }
      if (operator == '-') {
        realArray[i] = parseFloat(Big(real1).minus(Big(real2)))
        imagArray[i] = parseFloat(Big(imag1).minus(Big(imag2)))
      }
      delete realkeys1[i]
      delete realkeys2[i]
      delete imagkeys1[i]
      delete imagkeys2[i]
    }
    for (var i in realkeys2) {
      if (realkeys1[i] === undefined || isNaN(realkeys1[i])) {
        real1 = self[id1].Solution_realdefault
      } else {
        real1 = realkeys1[i]
      }
      if (imagkeys1[i] === undefined || isNaN(imagkeys1[i])) {
        imag1 = self[id1].Solution_imagdefault
      } else {
        imag1 = imagkeys1[i]
      }
      if (realkeys2[i] === undefined || isNaN(realkeys2[i])) {
        real2 = self[id2].Solution_realdefault
      } else {
        real2 = realkeys2[i]
      }
      if (imagkeys2[i] === undefined || isNaN(imagkeys2[i])) {
        imag2 = self[id2].Solution_imagdefault
      } else {
        imag2 = imagkeys2[i]
      }
      if (operator == '+') {
        realArray[i] = parseFloat(Big(real1).plus(Big(real2)))
        imagArray[i] = parseFloat(Big(imag1).plus(Big(imag2)))
      }
      if (operator == '-') {
        realArray[i] = parseFloat(Big(real1).minus(Big(real2)))
        imagArray[i] = parseFloat(Big(imag1).minus(Big(imag2)))
      }
      delete realkeys1[i]
      delete realkeys2[i]
      delete imagkeys1[i]
      delete imagkeys2[i]
    }
    for (var i in imagkeys1) {
      if (realkeys1[i] === undefined || isNaN(realkeys1[i])) {
        real1 = self[id1].Solution_realdefault
      } else {
        real1 = realkeys1[i]
      }
      if (imagkeys1[i] === undefined || isNaN(imagkeys1[i])) {
        imag1 = self[id1].Solution_imagdefault
      } else {
        imag1 = imagkeys1[i]
      }
      if (realkeys2[i] === undefined || isNaN(realkeys2[i])) {
        real2 = self[id2].Solution_realdefault
      } else {
        real2 = realkeys2[i]
      }
      if (imagkeys2[i] === undefined || isNaN(imagkeys2[i])) {
        imag2 = self[id2].Solution_imagdefault
      } else {
        imag2 = imagkeys2[i]
      }
      if (operator == '+') {
        realArray[i] = parseFloat(Big(real1).plus(Big(real2)))
        imagArray[i] = parseFloat(Big(imag1).plus(Big(imag2)))
      }
      if (operator == '-') {
        realArray[i] = parseFloat(Big(real1).minus(Big(real2)))
        imagArray[i] = parseFloat(Big(imag1).minus(Big(imag2)))
      }
      delete realkeys1[i]
      delete realkeys2[i]
      delete imagkeys1[i]
      delete imagkeys2[i]
    }
    for (var i in imagkeys2) {
      if (realkeys1[i] === undefined || isNaN(realkeys1[i])) {
        real1 = self[id1].Solution_realdefault
      } else {
        real1 = realkeys1[i]
      }
      if (imagkeys1[i] === undefined || isNaN(imagkeys1[i])) {
        imag1 = self[id1].Solution_imagdefault
      } else {
        imag1 = imagkeys1[i]
      }
      if (realkeys2[i] === undefined || isNaN(realkeys2[i])) {
        real2 = self[id2].Solution_realdefault
      } else {
        real2 = realkeys2[i]
      }
      if (imagkeys2[i] === undefined || isNaN(imagkeys2[i])) {
        imag2 = self[id2].Solution_imagdefault
      } else {
        imag2 = imagkeys2[i]
      }
      if (operator == '+') {
        realArray[i] = parseFloat(Big(real1).plus(Big(real2)))
        imagArray[i] = parseFloat(Big(imag1).plus(Big(imag2)))
      }
      if (operator == '-') {
        realArray[i] = parseFloat(Big(real1).minus(Big(real2)))
        imagArray[i] = parseFloat(Big(imag1).minus(Big(imag2)))
      }
      delete realkeys1[i]
      delete realkeys2[i]
      delete imagkeys1[i]
      delete imagkeys2[i]
    }
  }

  var eqobj = { Page_position: DOM_Object[thisid]['order'], Format_showtype: 'InnerFunction', equation: 'TempEq=0' }
  var id = CreateEq(this.fileid, 0, eqobj)
  self[id].Solution_real = realArray
  self[id].Solution_imag = imagArray
  self[id].Solution_realdefault = self[id1].Solution_realdefault + self[id2].Solution_realdefault
  self[id].Solution_imagdefault = self[id1].Solution_imagdefault + self[id2].Solution_imagdefault
  self[id].Units_units = self[id1].Units_units
  self[id].Units_quantity = self[id1].Units_quantity
  self[id].Units_base_array = self[id1].Units_base_array
  self[id].Units_base_string = self[id1].Units_base_string
  self[id].Format_size = self[id1].Format_size
  self[id].Format_numinds = self[id1].Format_numinds
  self[id].Get_My_BaseString()
  console.log('At the end of add sub matrices, the base array is ... ')
  console.log(self[id].Units_base_array)
  return id
}
//---------------------------------------------------------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------------------------- MULTIPLY TWO MATRICES -------------------------------------------------------------------------//
//---------------------------------------------------------------------------------------------------------------------------------------------------------//
function MultMatrices(id1, id2, operator, thisid) {
  console.log('In mult matrices, the operator is ' + operator + ' and the values are ...')
  console.log(
    operator +
      ' - ' +
      self[id1].Solution_real['0-0'] +
      ' - ' +
      self[id1].Solution_imag['0-0'] +
      ' - ' +
      self[id2].Solution_real['0-0'] +
      ' - ' +
      self[id2].Solution_imag['0-0']
  )

  if (self[id1].Solution_realdefault == undefined) {
    self[id1].Solution_realdefault = 0
  }
  if (self[id2].Solution_realdefault == undefined) {
    self[id2].Solution_realdefault = 0
  }
  if (self[id1].Solution_imagdefault == undefined) {
    self[id1].Solution_imagdefault = 0
  }
  if (self[id2].Solution_imagdefault == undefined) {
    self[id2].Solution_imagdefault = 0
  }
  var solution_realarray = new Array()
  var solution_imagarray = new Array()
  var flag = 0
  var sizes = self[id1].Format_size.split('x')
  var rows1 = sizes[0]
  var cols1 = sizes[1]
  var sizes = self[id2].Format_size.split('x')
  var rows2 = sizes[0]
  var cols2 = sizes[1]
  if (cols1 != rows2 && (rows1 != rows2 || cols1 != cols2)) {
    Set_Error(self[thisid].Original_id, 'MultMat1', self[id1].Format_size, self[id2].Format_size)
    flag = 1
  }

  if (operator == '*') {
    // If the cols and rows are transposed of each other, do traditional matrix math
    if (cols1 == rows2) {
      for (var index1 = 0; index1 < parseInt(rows1, 10); index1++) {
        for (var index2 = 0; index2 < parseFloat(cols2); index2++) {
          var key1 = index1 + '-' + index2
          solution_realarray[key1] = 0
          solution_imagarray[key1] = 0
          for (var index3 = 0; index3 < parseFloat(cols1); index3++) {
            var key2 = index2 + '-' + index1
            var key3 = index1 + '-' + index3
            var key4 = index3 + '-' + index2
            if (self[id1].Solution_real[key3] === undefined) {
              var real1 = self[id1].Solution_realdefault
            } else {
              var real1 = self[id1].Solution_real[key3]
            }
            if (self[id1].Solution_imag[key3] === undefined) {
              var imag1 = self[id1].Solution_imagdefault
            } else {
              var imag1 = self[id1].Solution_imag[key3]
            }
            if (self[id2].Solution_real[key4] === undefined) {
              var real2 = self[id2].Solution_realdefault
            } else {
              var real2 = self[id2].Solution_real[key4]
            }
            if (self[id2].Solution_imag[key4] === undefined) {
              var imag2 = self[id2].Solution_imagdefault
            } else {
              var imag2 = self[id2].Solution_imag[key4]
            }
            real1 = real1 || 0
            imag1 = imag1 || 0
            real2 = real2 || 0
            imag2 = imag2 || 0
            var r1 = parseFloat(Big(real1).times(Big(real2)))
            var r2 = parseFloat(Big(imag1).times(Big(imag2)))
            var i1 = parseFloat(Big(real1).times(Big(imag2)))
            var i2 = parseFloat(Big(imag1).times(Big(real2)))
            var real = parseFloat(Big(r1).minus(Big(r2)))
            var imag = parseFloat(Big(i1).plus(Big(i2)))
            solution_realarray[key1] = parseFloat(Big(solution_realarray[key1]).plus(Big(real)))
            solution_imagarray[key1] = parseFloat(Big(solution_imagarray[key1]).plus(Big(imag)))
          }
        }
      }
    }

    // If the cols and rows match, multiply the matrices piece by piece
    if (rows1 == rows2 && cols1 == cols2) {
      for (var index1 = 0; index1 < parseInt(rows1, 10); index1++) {
        for (var index2 = 0; index2 < parseFloat(cols2); index2++) {
          var key = index1 + '-' + index2
          solution_realarray[key] = 0
          solution_imagarray[key] = 0
          if (self[id1].Solution_real[key] === undefined) {
            var real1 = 0
          } else {
            var real1 = self[id1].Solution_real[key]
          }
          if (self[id1].Solution_imag[key] === undefined) {
            var imag1 = 0
          } else {
            var imag1 = self[id1].Solution_imag[key]
          }
          if (self[id2].Solution_real[key] === undefined) {
            var real2 = 0
          } else {
            var real2 = self[id2].Solution_real[key]
          }
          if (self[id2].Solution_imag[key] === undefined) {
            var imag2 = 0
          } else {
            var imag2 = self[id2].Solution_imag[key]
          }
          real1 = real1 || 0
          imag1 = imag1 || 0
          real2 = real2 || 0
          imag2 = imag2 || 0
          var r1 = parseFloat(Big(real1).times(Big(real2)))
          var r2 = parseFloat(Big(imag1).times(Big(imag2)))
          var i1 = parseFloat(Big(real1).times(Big(imag2)))
          var i2 = parseFloat(Big(imag1).times(Big(real2)))
          var real = parseFloat(Big(r1).minus(Big(r2)))
          var imag = parseFloat(Big(i1).plus(Big(i2)))
          solution_realarray[key] = real
          solution_imagarray[key] = imag
        }
      }
    }

    var baseunits = new Array()
    for (var index in self[id1].Units_base_array) {
      baseunits[index] = self[id1].Units_base_array[index] + self[id2].Units_base_array[index]
    }
  }

  if (operator == '/') {
    // If the cols and rows match, divide the matrices piece by piece
    if (rows1 == rows2 && cols1 == cols2) {
      for (var index1 = 0; index1 < parseInt(rows1, 10); index1++) {
        for (var index2 = 0; index2 < parseFloat(cols2); index2++) {
          var key = index1 + '-' + index2
          solution_realarray[key] = 0
          solution_imagarray[key] = 0
          if (self[id1].Solution_real[key] === undefined) {
            var real1 = self[id1].Solution_realdefault
          } else {
            var real1 = self[id1].Solution_real[key]
          }
          if (self[id1].Solution_imag[key] === undefined) {
            var imag1 = self[id1].Solution_imagdefault
          } else {
            var imag1 = self[id1].Solution_imag[key]
          }
          if (self[id2].Solution_real[key] === undefined) {
            var real2 = self[id2].Solution_realdefault
          } else {
            var real2 = self[id2].Solution_real[key]
          }
          if (self[id2].Solution_imag[key] === undefined) {
            var imag2 = self[id2].Solution_imagdefault
          } else {
            var imag2 = self[id2].Solution_imag[key]
          }

          real1 = real1 || 0
          imag1 = imag1 || 0
          real2 = real2 || 0
          imag2 = imag2 || 0

          if (
            (imag1 === 0 && imag2 === 0) ||
            (imag1 === 0 && isNaN(imag2)) ||
            (isNaN(imag1) && imag2 === 0) ||
            (isNaN(imag1) && isNaN(imag2))
          ) {
            if (real1 == 0) {
              real = 0
            } else {
              real = parseFloat(Big(real1).div(Big(real2)))
            }
            imag = 0
          } else {
            var c = parseFloat(real2)
            var d = -1 * parseFloat(imag2)
            var a1 = real1
            var b1 = imag1
            var a2 = real2
            var b2 = imag2
            var nr = parseFloat(
              Big(a1)
                .times(Big(c))
                .minus(Big(b1).times(Big(d)))
            )
            var ni = parseFloat(
              Big(a1)
                .times(Big(d))
                .plus(Big(b1).times(Big(c)))
            )
            var dr = parseFloat(
              Big(a2)
                .times(Big(c))
                .minus(Big(b2).times(Big(d)))
            )
            var di = parseFloat(
              Big(a2)
                .times(Big(d))
                .minus(Big(b2).times(Big(c)))
            )
            if (dr == 0) {
              real = 0
              imag = 0
            } else {
              var real = parseFloat(Big(nr).div(Big(dr)))
              var imag = parseFloat(Big(ni).div(Big(dr)))
            }
          }

          // Prevent NaNs from being returned
          real = real || 0
          imag = imag || 0

          solution_realarray[key] = real
          solution_imagarray[key] = imag

          var baseunits = new Array()
          for (var index in self[id1].Units_base_array) {
            baseunits[index] = self[id1].Units_base_array[index] - self[id2].Units_base_array[index]
          }
        }
      }
    }
  }

  size = index1 + 'x' + index2
  var eqobj = {
    Page_position: DOM_Object[thisid]['order'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'MyEq=' + 0,
    Solution_real: solution_realarray,
    Solution_imag: solution_imagarray,
    Format_size: size,
    Format_numinds: self[id1].Format_numinds,
    Units_base_array: baseunits
  }
  var id = CreateEq(this.fileid, 0, eqobj)
  //    var id=Get_ID("Equation");
  //	self[id]=new Equation(id);
  //	self[id].Solution_real=solution_realarray;
  //	self[id].Solution_imag=solution_imagarray;
  //	self[id].Format_size=size;
  //	self[id].Format_numinds=self[id1].Format_numinds;
  //	self[id].Units_base_array=baseunits;
  self[id].Recompose_Units()
  self[id].Get_My_BaseString()
  return id
}
//---------------------------------------------------------------------------------------------------------------------------------------------------------//

/*---------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------- Convert input string to array -------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*  This function is used on built-in functions. It is given the string which is sent to the functions. It takes this string and splits it view commas.     |
    It then recombines the matrices, other built in functions, other item that also uses commas.                                                            |
/*---------------------------------------------------------------------------------------------------------------------------------------------------------*/
function InputArray(text) {
  var inputarray = new Array()
  var numarray = new Array()
  var flip = 0
  var bcount = 0
  var pcount = 0
  inputarray = SplitText(text)
  for (var a = 0; a < inputarray.length; a++) {
    if (inputarray[a] != ',') {
      numarray[a] = 1
    } else {
      numarray[a] = 0
    }
  }
  for (var a = 0; a < inputarray.length; a++) {
    if (inputarray[a] == '(') {
      flip = 1
      bcount = parseInt(bcount, 10) + 1
    }
    if (inputarray[a] == '[') {
      flip = 1
      pcount = parseInt(pcount, 10) + 1
    }
    if (inputarray[a - 1] == ')') {
      bcount = bcount - 1
    }
    if (inputarray[a - 1] == ']') {
      pcount = pcount - 1
    }
    if ((inputarray[a - 1] == ')' || inputarray[a - 1] == ']') && bcount === 0 && pcount === 0) {
      flip = 0
    }
    if (flip == 1) {
      numarray[a] = 1
    }
  }
  for (var i = inputarray.length; i > 0; i--) {
    if (numarray[i] == '1' && numarray[parseInt(i, 10) - 1] == '1') {
      inputarray[i - 1] = inputarray[i - 1] + inputarray[i]
      inputarray.splice(i, 1)
      numarray.splice(i, 1)
    }
  }
  for (var i = inputarray.length; i >= 0; i--) {
    if (inputarray[i] == ',' || inputarray[i] == ' ' || inputarray[i] === '') {
      inputarray.splice(i, 1)
    }
  }
  return inputarray
}
//---------------------------------------------------------------------------------------------------------------------------------------------------------//

/*---------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------ SET THE MODELS FOR ALL EQUATIONS -----------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------*/
function SetModels(fname, id, id1, id2, id3, id4, id5, id6) {
  var num1 = ''
  var num2 = ''
  var num3 = ''
  var num4 = ''
  var num5 = ''
  var num6 = ''
  if (fname == 'power') {
    self[id].Models_dimensions = '\\left(' + self[id2].Format_size + '\\right)^{' + self[id1].Format_size + '}'
    if (self[id1].Units_units === '') {
      num1 = 'NA'
    } else {
      num1 = '{' + self[id1].Units_units + '}'
    }
    if (self[id2].Units_units === '') {
      num2 = 'NA'
    } else {
      num2 = '{' + self[id2].Units_units + '}'
    }
    self[id].Models_units = '\\left(' + num2 + '\\right)^{' + num1 + '}'
    if (self[id1].Units_quantity === '') {
      num1 = 'NA'
    } else {
      num1 = '{' + self[id1].Units_quantity + '}'
    }
    if (self[id2].Units_quantity === '') {
      num2 = 'NA'
    } else {
      num2 = '{' + self[id2].Units_quantity + '}'
    }
    self[id].Models_quantities = '\\left(' + num2 + '\\right)^{' + num1 + '}'
    if (self[id1].Format_size == '1x1') {
      num1 = self[id1].Solution_real['0-0']
    } else {
      num1 = '{' + self[id1].Format_size + '}'
    }
    if (self[id2].Format_size == '1x1') {
      num2 = self[id2].Solution_real['0-0']
    } else {
      num2 = '{' + self[id2].Format_size + '}'
    }
    self[id].Models_numerical = '\\left(' + num2 + '\\right)^{' + num1 + '}'
  } else if (fname == 'abs') {
    self[id].Models_dimensions = fname + '\\left|' + self[id1].Format_size + '\\right|'
    if (self[id1].Units_units === '') {
      num1 = 'NA'
    } else {
      num1 = '{' + self[id1].Units_units + '}'
    }
    self[id].Models_units = fname + '\\left|' + num1 + '\\right|'
    if (self[id1].Units_quantity === '') {
      num1 = 'NA'
    } else {
      num1 = '{' + self[id1].Units_quantity + '}'
    }
    self[id].Models_quantities = fname + '\\left|' + num1 + '\\right|'
    if (self[id1].Format_size == '1x1') {
      num1 = self[id1].Solution_real['0-0']
    } else {
      num1 = '{' + self[id1].Format_size + '}'
    }
    self[id].Models_numerical = fname + '\\left|' + num1 + '\\right|'
  } else if (fname == 'Integrate' || fname == 'NewtonCotes') {
    self[id].Models_dimensions =
      '\\int_{1x1}^{1x1}' + self[id2].Format_size + '\\hspace{1mm}\\mathrm{d}\\hspace{1mm}' + self[id1].Format_size
    if (self[id1].Units_units === '') {
      num1 = 'NA'
    } else {
      num1 = '{' + self[id1].Units_units + '}'
    }
    if (self[id2].Units_units === '') {
      num2 = 'NA'
    } else {
      num2 = '{' + self[id2].Units_units + '}'
    }
    self[id].Models_units = '\\int_{NA}^{NA}' + num2 + '\\hspace{1mm}\\mathrm{d}\\hspace{1mm}' + num1
    if (self[id1].Units_quantity === '') {
      num1 = 'NA'
    } else {
      num1 = '{' + self[id1].Units_quantity + '}'
    }
    if (self[id2].Units_quantity === '') {
      num2 = 'NA'
    } else {
      num2 = '{' + self[id2].Units_quantity + '}'
    }
    self[id].Models_quantities = '\\int_{NA}^{NA}' + num2 + '\\hspace{1mm}\\hspace{1mm}\\mathrm{d}\\hspace{1mm}' + num1
    self[id].Models_numerical =
      '\\int_{' +
      id3 +
      '}^{' +
      id4 +
      '}' +
      self[id2].Format_size +
      '\\hspace{1mm}\\mathrm{d}\\hspace{1mm}' +
      self[id1].Format_size
  } else if (fname == 'bisect' || fname == 'falsepos' || fname == 'secant') {
    if (id5 !== undefined || id6 !== undefined) {
      if (id6 !== undefined) {
        self[id].Models_dimensions =
          fname +
          '\\left(' +
          id1 +
          ', ' +
          self[id2].Format_size +
          ', ' +
          self[id3].Format_size +
          ', ' +
          self[id4].Format_size +
          ', ' +
          self[id5].Format_size +
          ', ' +
          self[id6].Format_size +
          '\\right)'
      } else if (id5 !== undefined) {
        self[id].Models_dimensions =
          fname +
          '\\left(' +
          id1 +
          ', ' +
          self[id2].Format_size +
          ', ' +
          self[id3].Format_size +
          ', ' +
          self[id4].Format_size +
          ', ' +
          self[id5].Format_size +
          '\\right)'
      }
      if (self[id2].Units_units === '') {
        num2 = 'NA'
      } else {
        num2 = '{' + self[id2].Units_units + '}'
      }
      if (self[id3].Units_units === '') {
        num3 = 'NA'
      } else {
        num3 = '{' + self[id3].Units_units + '}'
      }
      if (self[id4].Units_units === '') {
        num4 = 'NA'
      } else {
        num4 = '{' + self[id4].Units_units + '}'
      }
      if (self[id5].Units_units === '') {
        num5 = 'NA'
      } else {
        num5 = '{' + self[id5].Units_units + '}'
      }
      if (id6 !== undefined) {
        self[id].Models_units =
          fname + '\\left(' + id1 + ', ' + num2 + ', ' + num3 + ', ' + num4 + ', ' + num5 + ', ' + id6 + '\\right)'
      } else {
        self[id].Models_units =
          fname + '\\left(' + id1 + ', ' + num2 + ', ' + num3 + ', ' + num4 + ', ' + num5 + '\\right)'
      }
      if (self[id2].Units_quantity === '') {
        num2 = 'NA'
      } else {
        num2 = '{' + self[id2].Units_quantity + '}'
      }
      if (self[id3].Units_quantity === '') {
        num3 = 'NA'
      } else {
        num3 = '{' + self[id3].Units_quantity + '}'
      }
      if (self[id4].Units_quantity === '') {
        num4 = 'NA'
      } else {
        num4 = '{' + self[id4].Units_quantity + '}'
      }
      if (self[id5].Units_quantity === '') {
        num5 = 'NA'
      } else {
        num5 = '{' + self[id5].Units_quantity + '}'
      }
      if (id6 !== undefined) {
        self[id].Models_quantities =
          fname + '\\left(' + id1 + ', ' + num2 + ', ' + num3 + ', ' + num4 + ', ' + num5 + ', ' + id6 + '\\right)'
      } else {
        self[id].Models_quantities =
          fname + '\\left(' + id1 + ', ' + num2 + ', ' + num3 + ', ' + num4 + ', ' + num5 + '\\right)'
      }
      self[id].Models_quantities = fname + '\\left(' + num1 + ', ' + num2 + ', ' + num3 + ', ' + num4 + '\\right)'
      if (self[id2].Format_size == '1x1') {
        num2 = self[id2].Solution_real['0-0']
      } else {
        num2 = '{' + self[id2].Format_size + '}'
      }
      if (self[id3].Format_size == '1x1') {
        num3 = self[id3].Solution_real['0-0']
      } else {
        num3 = '{' + self[id3].Format_size + '}'
      }
      if (self[id4].Format_size == '1x1') {
        num4 = self[id4].Solution_real['0-0']
      } else {
        num4 = '{' + self[id4].Format_size + '}'
      }
      if (self[id5].Format_size == '1x1') {
        num5 = self[id5].Solution_real['0-0']
      } else {
        num5 = '{' + self[id5].Format_size + '}'
      }
      if (id6 !== undefined) {
        self[id].Models_numerical =
          fname + '\\left(' + id1 + ', ' + num2 + ', ' + num3 + ', ' + num4 + ', ' + num5 + ', ' + id6 + '\\right)'
      } else {
        self[id].Models_numerical =
          fname + '\\left(' + id1 + ', ' + num2 + ', ' + num3 + ', ' + num4 + ', ' + num5 + '\\right)'
      }
    } else if (id4 !== undefined) {
      self[id].Models_dimensions =
        fname +
        '\\left(' +
        id1 +
        ', ' +
        self[id2].Format_size +
        ', ' +
        self[id3].Format_size +
        ', ' +
        self[id4].Format_size +
        '\\right)'
      if (self[id2].Units_units === '') {
        num2 = 'NA'
      } else {
        num2 = '{' + self[id2].Units_units + '}'
      }
      if (self[id3].Units_units === '') {
        num3 = 'NA'
      } else {
        num3 = '{' + self[id3].Units_units + '}'
      }
      if (self[id4].Units_units === '') {
        num4 = 'NA'
      } else {
        num4 = '{' + self[id4].Units_units + '}'
      }
      self[id].Models_units = fname + '\\left(' + id1 + ', ' + num2 + ', ' + num3 + ', ' + num4 + '\\right)'
      if (self[id2].Units_quantity === '') {
        num2 = 'NA'
      } else {
        num2 = '{' + self[id2].Units_quantity + '}'
      }
      if (self[id3].Units_quantity === '') {
        num3 = 'NA'
      } else {
        num3 = '{' + self[id3].Units_quantity + '}'
      }
      if (self[id4].Units_quantity === '') {
        num4 = 'NA'
      } else {
        num4 = '{' + self[id4].Units_quantity + '}'
      }
      self[id].Models_quantities = fname + '\\left(' + id1 + ', ' + num2 + ', ' + num3 + ', ' + num4 + '\\right)'
      if (self[id2].Format_size == '1x1') {
        num2 = self[id2].Solution_real['0-0']
      } else {
        num2 = '{' + self[id2].Format_size + '}'
      }
      if (self[id3].Format_size == '1x1') {
        num3 = self[id3].Solution_real['0-0']
      } else {
        num3 = '{' + self[id3].Format_size + '}'
      }
      if (self[id4].Format_size == '1x1') {
        num4 = self[id4].Solution_real['0-0']
      } else {
        num4 = '{' + self[id4].Format_size + '}'
      }
      self[id].Models_numerical = fname + '\\left(' + id1 + ', ' + num2 + ', ' + num3 + ', ' + num4 + '\\right)'
    } else if (id3 !== undefined) {
      self[id].Models_dimensions =
        fname + '\\left(' + id1 + ', ' + self[id2].Format_size + ', ' + self[id3].Format_size + '\\right)'
      if (self[id2].Units_units === '') {
        num2 = 'NA'
      } else {
        num2 = '{' + self[id2].Units_units + '}'
      }
      if (self[id3].Units_units === '') {
        num3 = 'NA'
      } else {
        num3 = '{' + self[id3].Units_units + '}'
      }
      self[id].Models_units = fname + '\\left(' + id1 + ', ' + num2 + ', ' + num3 + '\\right)'
      if (self[id2].Units_quantity === '') {
        num2 = 'NA'
      } else {
        num2 = '{' + self[id2].Units_quantity + '}'
      }
      if (self[id3].Units_quantity === '') {
        num3 = 'NA'
      } else {
        num3 = '{' + self[id3].Units_quantity + '}'
      }
      self[id].Models_quantities = fname + '\\left(' + id1 + ', ' + num2 + ', ' + num3 + '\\right)'
      if (self[id2].Format_size == '1x1') {
        num2 = self[id2].Solution_real['0-0']
      } else {
        num2 = '{' + self[id2].Format_size + '}'
      }
      if (self[id3].Format_size == '1x1') {
        num3 = self[id3].Solution_real['0-0']
      } else {
        num3 = '{' + self[id3].Format_size + '}'
      }
      self[id].Models_numerical = fname + '\\left(' + id1 + ', ' + num2 + ', ' + num3 + '\\right)'
    }
  } else if (fname == 'Conj') {
    self[id].Models_dimensions = '\\overline{\\left(' + self[id1].Format_size + '\\right)}'
    if (self[id1].Units_units === '') {
      num1 = 'NA'
    } else {
      num1 = '{' + self[id1].Units_units + '}'
    }
    self[id].Models_units = '\\overline{\\left(' + num1 + '\\right)}'
    if (self[id1].Units_quantity === '') {
      num1 = 'NA'
    } else {
      num1 = '{' + self[id1].Units_quantity + '}'
    }
    self[id].Models_quantities = '\\overline{\\left(' + num1 + '\\right)}'
    if (self[id1].Format_size == '1x1') {
      num1 = self[id1].Solution_real['0-0']
    } else {
      num1 = '{' + self[id1].Format_size + '}'
    }
    self[id].Models_numerical = '\\overline{\\left(' + num1 + '\\right)}'
  } else if (fname == 'Norm') {
    self[id].Models_dimensions =
      '\\left|\\left|\\hspace{0.5em}' +
      self[id1].Format_size +
      '\\hspace{0.5em}\\right|\\right|_{' +
      self[id2].Format_size +
      '}'
    if (self[id1].Units_units === '') {
      num1 = 'NA'
    } else {
      num1 = '{' + self[id1].Units_units + '}'
    }
    if (self[id2].Units_units === '') {
      num2 = 'NA'
    } else {
      num2 = '{' + self[id2].Units_units + '}'
    }
    self[id].Models_units = '\\left|\\left|\\hspace{0.5em}' + num1 + '\\hspace{0.5em}\\right|\\right|_{' + num2 + '}'
    if (self[id1].Units_quantity === '') {
      num1 = 'NA'
    } else {
      num1 = '{' + self[id1].Units_quantity + '}'
    }
    if (self[id2].Units_quantity === '') {
      num2 = 'NA'
    } else {
      num2 = '{' + self[id2].Units_quantity + '}'
    }
    self[id].Models_quantities =
      '\\left|\\left|\\hspace{0.5em}' + num1 + '\\hspace{0.5em}\\right|\\right|_{' + num2 + '}'
    if (self[id1].Format_size == '1x1') {
      num1 = self[id1].Solution_real['0-0']
    } else {
      num1 = '{' + self[id1].Format_size + '}'
    }
    if (self[id2].Format_size == '1x1') {
      num2 = self[id2].Solution_real['0-0']
    } else {
      num2 = '{' + self[id2].Format_size + '}'
    }
    self[id].Models_numerical =
      '\\left|\\left|\\hspace{0.5em}' + num1 + '\\hspace{0.5em}\\right|\\right|_{' + num2 + '}'
  } else if (fname == 'RSNorm') {
    self[id].Models_dimensions =
      '\\left|\\left|\\hspace{0.5em}' + self[id1].Format_size + '\\hspace{0.5em}\\right|\\right|_R'
    if (self[id1].Units_units === '') {
      num1 = 'NA'
    } else {
      num1 = '{' + self[id1].Units_units + '}'
    }
    self[id].Models_units = '\\left|\\left|\\hspace{0.5em}' + num1 + '\\hspace{0.5em}\\right|\\right|_R'
    if (self[id1].Units_quantity === '') {
      num1 = 'NA'
    } else {
      num1 = '{' + self[id1].Units_quantity + '}'
    }
    self[id].Models_quantities = '\\left|\\left|\\hspace{0.5em}' + num1 + '\\hspace{0.5em}\\right|\\right|_R'
    if (self[id1].Format_size == '1x1') {
      num1 = self[id1].Solution_real['0-0']
    } else {
      num1 = '{' + self[id1].Format_size + '}'
    }
    self[id].Models_numerical = '\\left|\\left|\\hspace{0.5em}' + num1 + '\\hspace{0.5em}\\right|\\right|_R'
  } else if (fname == 'CSNorm') {
    self[id].Models_dimensions =
      '\\left|\\left|\\hspace{0.5em}' + self[id1].Format_size + '\\hspace{0.5em}\\right|\\right|_C'
    if (self[id1].Units_units === '') {
      num1 = 'NA'
    } else {
      num1 = '{' + self[id1].Units_units + '}'
    }
    self[id].Models_units = '\\left|\\left|\\hspace{0.5em}' + num1 + '\\hspace{0.5em}\\right|\\right|_C'
    if (self[id1].Units_quantity === '') {
      num1 = 'NA'
    } else {
      num1 = '{' + self[id1].Units_quantity + '}'
    }
    self[id].Models_quantities = '\\left|\\left|\\hspace{0.5em}' + num1 + '\\hspace{0.5em}\\right|\\right|_C'
    if (self[id1].Format_size == '1x1') {
      num1 = self[id1].Solution_real['0-0']
    } else {
      num1 = '{' + self[id1].Format_size + '}'
    }
    self[id].Models_numerical = '\\left|\\left|\\hspace{0.5em}' + num1 + '\\hspace{0.5em}\\right|\\right|_C'
  } else if (fname == 'incSearch' || fname == 'FalsePos' || fname == 'Secant' || fname == 'Bisect') {
    if (id6 >= 3) {
      if (self[id2].Format_size == '1x1') {
        num2 = self[id2].Solution_real['0-0']
      } else {
        num2 = '{' + self[id2].Format_size + '}'
      }
      if (self[id3].Format_size == '1x1') {
        num3 = self[id3].Solution_real['0-0']
      } else {
        num3 = '{' + self[id3].Format_size + '}'
      }
    }
    if (id6 >= 4) {
      if (self[id4].Format_size == '1x1') {
        num4 = self[id4].Solution_real['0-0']
      } else {
        num4 = '{' + self[id4].Format_size + '}'
      }
    }
    if (id6 == 3) {
      self[id].Models_numerical =
        fname +
        '  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        id1 +
        ', ' +
        num2 +
        ', ' +
        num3 +
        '\\hspace{0.2em}\\right)'
    }
    if (id6 == 4) {
      self[id].Models_numerical =
        fname +
        '  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        id1 +
        ', ' +
        num2 +
        ', ' +
        num3 +
        ', ' +
        num4 +
        '\\hspace{0.2em}\\right)'
    }
    if (id6 == 5) {
      self[id].Models_numerical =
        fname +
        '  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        id1 +
        ', ' +
        num2 +
        ', ' +
        num3 +
        ', ' +
        num4 +
        ', ' +
        id5 +
        '\\hspace{0.2em}\\right)'
    }
    if (id6 >= 3) {
      if (self[id2].Units_units === '') {
        num2 = 'NA'
      } else {
        num2 = '{' + self[id2].Units_units + '}'
      }
      if (self[id3].Units_units === '') {
        num3 = 'NA'
      } else {
        num3 = '{' + self[id3].Units_units + '}'
      }
    }
    if (id6 >= 4) {
      if (self[id4].Units_units === '') {
        num4 = 'NA'
      } else {
        num4 = '{' + self[id4].Units_units + '}'
      }
    }
    if (id6 == 3) {
      self[id].Models_units =
        fname +
        '  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        id1 +
        ', ' +
        num2 +
        ', ' +
        num3 +
        '\\hspace{0.2em}\\right)'
    }
    if (id6 == 4) {
      self[id].Models_units =
        fname +
        '  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        id1 +
        ', ' +
        num2 +
        ', ' +
        num3 +
        ', ' +
        num4 +
        '\\hspace{0.2em}\\right)'
    }
    if (id6 == 5) {
      self[id].Models_units =
        fname +
        '  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        id1 +
        ', ' +
        num2 +
        ', ' +
        num3 +
        ', ' +
        num4 +
        ', ' +
        id5 +
        '\\hspace{0.2em}\\right)'
    }
    if (id6 >= 3) {
      if (self[id2].Units_quantity === '') {
        num2 = 'NA'
      } else {
        num2 = '{' + self[id2].Units_quantity + '}'
      }
      if (self[id3].Units_quantity === '') {
        num3 = 'NA'
      } else {
        num3 = '{' + self[id3].Units_quantity + '}'
      }
    }
    if (id6 >= 4) {
      if (self[id4].Units_quantity === '') {
        num4 = 'NA'
      } else {
        num4 = '{' + self[id4].Units_quantity + '}'
      }
    }
    if (id6 == 3) {
      self[id].Models_quantities =
        fname +
        '  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        id1 +
        ', ' +
        num2 +
        ', ' +
        num3 +
        '\\hspace{0.2em}\\right)'
    }
    if (id6 == 4) {
      self[id].Models_quantities =
        fname +
        '  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        id1 +
        ', ' +
        num2 +
        ', ' +
        num3 +
        ', ' +
        num4 +
        '\\hspace{0.2em}\\right)'
    }
    if (id6 == 5) {
      self[id].Models_quantities =
        fname +
        '  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        id1 +
        ', ' +
        num2 +
        ', ' +
        num3 +
        ', ' +
        num4 +
        ', ' +
        id5 +
        '\\hspace{0.2em}\\right)'
    }
    if (id6 >= 3) {
      num2 = '{' + self[id2].Format_size + '}'
      num3 = '{' + self[id3].Format_size + '}'
    }
    if (id6 >= 4) {
      num4 = '{' + self[id4].Format_size + '}'
    }
    if (id6 == 3) {
      self[id].Models_dimensions =
        fname +
        '  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        id1 +
        ', ' +
        num2 +
        ', ' +
        num3 +
        '\\hspace{0.2em}\\right)'
    }
    if (id6 == 4) {
      self[id].Models_dimensions =
        fname +
        '  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        id1 +
        ', ' +
        num2 +
        ', ' +
        num3 +
        ', ' +
        num4 +
        '\\hspace{0.2em}\\right)'
    }
    if (id6 == 5) {
      self[id].Models_dimensions =
        fname +
        '  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        id1 +
        ', ' +
        num2 +
        ', ' +
        num3 +
        ', ' +
        num4 +
        ', ' +
        id5 +
        '\\hspace{0.2em}\\right)'
    }
  } else if (fname == 'ODE4') {
    if (self[id1].Format_size == '1x1') {
      num1 = self[id1].Solution_real['0-0']
    } else {
      num1 = '{' + self[id1].Format_size + '}'
    }
    if (self[id3].Format_size == '1x1') {
      num3 = self[id3].Solution_real['0-0']
    } else {
      num3 = '{' + self[id3].Format_size + '}'
    }
    self[id].Models_numerical =
      fname + '  \\hspace{0.1em} \\left( \\hspace{0.2em}' + num1 + ', ' + id2 + ', ' + num3 + '\\hspace{0.2em}\\right)'
    if (self[id1].Units_units === '') {
      num1 = 'NA'
    } else {
      num1 = '{' + self[id1].Units_units + '}'
    }
    if (self[id3].Units_units === '') {
      num3 = 'NA'
    } else {
      num3 = '{' + self[id3].Units_units + '}'
    }
    self[id].Models_units =
      fname + '  \\hspace{0.1em} \\left( \\hspace{0.2em}' + num1 + ', ' + id2 + ', ' + num3 + '\\hspace{0.2em}\\right)'
    if (self[id1].Units_quantity === '') {
      num1 = 'NA'
    } else {
      num1 = '{' + self[id1].Units_quantity + '}'
    }
    if (self[id3].Units_quantity === '') {
      num3 = 'NA'
    } else {
      num3 = '{' + self[id3].Units_quantity + '}'
    }
    self[id].Models_quantities =
      fname + '  \\hspace{0.1em} \\left( \\hspace{0.2em}' + num1 + ', ' + id2 + ', ' + num3 + '\\hspace{0.2em}\\right)'
    num1 = '{' + self[id1].Format_size + '}'
    num3 = '{' + self[id3].Format_size + '}'
    self[id].Models_dimensions =
      fname + '  \\hspace{0.1em} \\left( \\hspace{0.2em}' + num1 + ', ' + id2 + ', ' + num3 + '\\hspace{0.2em}\\right)'
  } else {
    if (id4 !== undefined) {
      self[id].Models_dimensions =
        fname +
        '\\left(' +
        self[id1].Format_size +
        ', ' +
        self[id2].Format_size +
        ', ' +
        self[id3].Format_size +
        ', ' +
        self[id4].Format_size +
        '\\right)'
      if (self[id1].Units_units === '') {
        num1 = 'NA'
      } else {
        num1 = '{' + self[id1].Units_units + '}'
      }
      if (self[id2].Units_units === '') {
        num2 = 'NA'
      } else {
        num2 = '{' + self[id2].Units_units + '}'
      }
      if (self[id3].Units_units === '') {
        num3 = 'NA'
      } else {
        num3 = '{' + self[id3].Units_units + '}'
      }
      if (self[id4].Units_units === '') {
        num4 = 'NA'
      } else {
        num4 = '{' + self[id4].Units_units + '}'
      }
      self[id].Models_units = fname + '\\left(' + num1 + ', ' + num2 + ', ' + num3 + ', ' + num4 + '\\right)'
      if (self[id1].Units_quantity === '') {
        num1 = 'NA'
      } else {
        num1 = '{' + self[id1].Units_quantity + '}'
      }
      if (self[id2].Units_quantity === '') {
        num2 = 'NA'
      } else {
        num2 = '{' + self[id2].Units_quantity + '}'
      }
      if (self[id3].Units_quantity === '') {
        num3 = 'NA'
      } else {
        num3 = '{' + self[id3].Units_quantity + '}'
      }
      if (self[id4].Units_quantity === '') {
        num4 = 'NA'
      } else {
        num4 = '{' + self[id4].Units_quantity + '}'
      }
      self[id].Models_quantities = fname + '\\left(' + num1 + ', ' + num2 + ', ' + num3 + ', ' + num4 + '\\right)'
      if (self[id1].Format_size == '1x1') {
        num1 = self[id1].Solution_real['0-0']
      } else {
        num1 = '{' + self[id1].Format_size + '}'
      }
      if (self[id2].Format_size == '1x1') {
        num2 = self[id2].Solution_real['0-0']
      } else {
        num2 = '{' + self[id2].Format_size + '}'
      }
      if (self[id3].Format_size == '1x1') {
        num3 = self[id3].Solution_real['0-0']
      } else {
        num3 = '{' + self[id3].Format_size + '}'
      }
      if (self[id4].Format_size == '1x1') {
        num4 = self[id4].Solution_real['0-0']
      } else {
        num4 = '{' + self[id4].Format_size + '}'
      }
      self[id].Models_numerical = fname + '\\left(' + num1 + ', ' + num2 + ', ' + num3 + ', ' + num4 + '\\right)'
    } else if (id3 !== undefined) {
      self[id].Models_dimensions =
        fname +
        '\\left(' +
        self[id1].Format_size +
        ', ' +
        self[id2].Format_size +
        ', ' +
        self[id3].Format_size +
        '\\right)'
      if (self[id1].Units_units === '') {
        num1 = 'NA'
      } else {
        num1 = '{' + self[id1].Units_units + '}'
      }
      if (self[id2].Units_units === '') {
        num2 = 'NA'
      } else {
        num2 = '{' + self[id2].Units_units + '}'
      }
      if (self[id3].Units_units === '') {
        num3 = 'NA'
      } else {
        num3 = '{' + self[id3].Units_units + '}'
      }
      self[id].Models_units = fname + '\\left(' + num1 + ', ' + num2 + ', ' + num3 + '\\right)'
      if (self[id1].Units_quantity === '') {
        num1 = 'NA'
      } else {
        num1 = '{' + self[id1].Units_quantity + '}'
      }
      if (self[id2].Units_quantity === '') {
        num2 = 'NA'
      } else {
        num2 = '{' + self[id2].Units_quantity + '}'
      }
      if (self[id3].Units_quantity === '') {
        num3 = 'NA'
      } else {
        num3 = '{' + self[id3].Units_quantity + '}'
      }
      self[id].Models_quantities = fname + '\\left(' + num1 + ', ' + num2 + ', ' + num3 + '\\right)'
      if (self[id1].Format_size == '1x1') {
        num1 = self[id1].Solution_real['0-0']
      } else {
        num1 = '{' + self[id1].Format_size + '}'
      }
      if (self[id2].Format_size == '1x1') {
        num2 = self[id2].Solution_real['0-0']
      } else {
        num2 = '{' + self[id2].Format_size + '}'
      }
      if (self[id3].Format_size == '1x1') {
        num3 = self[id3].Solution_real['0-0']
      } else {
        num3 = '{' + self[id3].Format_size + '}'
      }
      self[id].Models_numerical = fname + '\\left(' + num1 + ', ' + num2 + ', ' + num3 + '\\right)'
    } else if (id2 !== undefined) {
      self[id].Models_dimensions = fname + '\\left(' + self[id1].Format_size + ', ' + self[id2].Format_size + '\\right)'
      if (self[id1].Units_units === '') {
        num1 = 'NA'
      } else {
        num1 = '{' + self[id1].Units_units + '}'
      }
      if (self[id2].Units_units === '') {
        num2 = 'NA'
      } else {
        num2 = '{' + self[id2].Units_units + '}'
      }
      self[id].Models_units = fname + '\\left(' + num1 + ', ' + num2 + '\\right)'
      if (self[id1].Units_quantity === '') {
        num1 = 'NA'
      } else {
        num1 = '{' + self[id1].Units_quantity + '}'
      }
      if (self[id2].Units_quantity === '') {
        num2 = 'NA'
      } else {
        num2 = '{' + self[id2].Units_quantity + '}'
      }
      self[id].Models_quantities = fname + '\\left(' + num1 + ', ' + num2 + '\\right)'
      if (self[id1].Format_size == '1x1') {
        num1 = self[id1].Solution_real['0-0']
      } else {
        num1 = '{' + self[id1].Format_size + '}'
      }
      if (self[id2].Format_size == '1x1') {
        num2 = self[id2].Solution_real['0-0']
      } else {
        num2 = '{' + self[id2].Format_size + '}'
      }
      self[id].Models_numerical = fname + '\\left(' + num1 + ', ' + num2 + '\\right)'
    } else if (id1 !== undefined) {
      self[id].Models_dimensions = fname + '\\left(' + self[id1].Format_size + '\\right)'
      if (self[id1].Units_units === '') {
        num1 = 'NA'
      } else {
        num1 = '{' + self[id1].Units_units + '}'
      }
      self[id].Models_units = fname + '\\left(' + num1 + '\\right)'
      if (self[id1].Units_quantity === '') {
        num1 = 'NA'
      } else {
        num1 = '{' + self[id1].Units_quantity + '}'
      }
      self[id].Models_quantities = fname + '\\left(' + num1 + '\\right)'
      if (self[id1].Format_size == '1x1') {
        num1 = self[id1].Solution_real['0-0']
      } else {
        num1 = '{' + self[id1].Format_size + '}'
      }
      self[id].Models_numerical = fname + '\\left(' + num1 + '\\right)'
    }
  }
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*-------------------------------------------------------------------------------------------------------------------------*/
/*--------------------------------------- ADD A CONNECTED EQUATION TO THE DATABASES ---------------------------------------*/
/*-------------------------------------------------------------------------------------------------------------------------*\
	This function is used to add equations to the database that are created as the result of a function that has multiple	\
	outputs. The equations are added to the database so that they can be reloaded, but they do not cause an increase in 	\
	the locations of the other equations.																					\
/*-------------------------------------------------------------------------------------------------------------------------*/
function AddConnectedEqs(id) {
  for (var thisid in self[id].connected_ids) {
    var textstring = thisid + '::' + DOM_Object[id]['order'] + '::' + 3
    textstring = textstring + '::' + self[id].Page_parentid + '::' + self[id].Page_topparentid
  }
}
/*-------------------------------------------------------------------------------------------------------------------------*/

//---------------------------------------------------------------------------------------------------------//
//------------------------------ DELETE A CONNECTED EQUATION TO THE DATABASES -----------------------------//
/*
 This function is used to delete equations that were created in a function with multiple outputs. The 
 equations are deleted but there is no effect on the locations of the remaining equations.
*/
//---------------------------------------------------------------------------------------------------------//
function DeleteConnectedEqs(id) {
  var fileid = self[id].fileid
  for (var thisid in self[id].connected_ids) {
    var textstring = thisid + '::' + DOM_Object[id]['order'] + '::' + 3
    textstring = textstring + '::' + self[id].Page_parentid + '::' + self[id].Page_topparentid
    if (DOM_Object[thisid] !== undefined) {
      $.ajax({
        type: 'POST',
        url: '/Documents/DeleteItem',
        data: { fileid: fileid, type: 'equation', id: thisid, thisloc: DOM_Object[thisid]['order'] },
        insert: 0,
        error: function () {
          alert('There was an error deleting this item')
        }
      })
    }
    if (DOM_Object[thisid] !== undefined) {
      delete DOM_Object[thisid]
    }
  }
  self[id].connected_ids = {}
}
//---------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//---------------------------------- CREATE AND POSSIBLY SOLVE NEW EQUATION OBJECT ----------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
/*
This function is called to create and possibly solve new equation objects. The need for the function arose out of repeated 
need to create temporary equations and the absurd use of space that this created.
*/
function CreateEq(fileid, solve, eqobj) {
  if (eqobj['id'] !== undefined) {
    id = eqobj['id']
  } else {
    var id = Get_ID('Equation', fileid)
  }
  self[id] = new Equation(id)
  DOM_Object[id] = {}
  DOM_Object[id]['Dependents'] = {}
  DOM_Object[id]['children'] = {}
  DOM_Object[id]['active'] = 1
  DOM_Object[id]['Descendents'] = {}
  DOM_Object[id]['name'] = 'TempEq'
  DOM_Object[id]['parentid'] = 'none'
  DOM_Object[id]['topparentid'] = 'none'
  DOM_Object[id]['type'] = 'equation'
  DOM_Object[id]['real'] = {}
  DOM_Object[id]['imag'] = {}
  DOM_Object[id]['fileid'] = fileid
  DOM_Object[id]['units'] = {}
  DOM_Object[id]['numinds'] = 2
  DOM_Object[id]['itemid'] = id
  var filename = fileid + ''
  //	DOM_Object[id]['fileid']=filename.replace(/^File/,'').match(/^[0-9]+/);
  DOM_Object[id]['ID'] = id
  if (eqobj['Page_position'] !== undefined) {
    DOM_Object[id]['order'] = eqobj['Page_position']
  } else {
    DOM_Object[id]['order'] = 0
  }
  if (eqobj['Page_position'] !== undefined) {
    self[id].Page_position = eqobj['Page_position']
  }
  if (eqobj['Original_id'] !== undefined) {
    self[id]['Original_id'] = eqobj['Original_id']
  }
  if (eqobj['Page_parentid'] !== undefined) {
    DOM_Object[id]['parentid'] = eqobj['Page_parentid']
  }
  if (eqobj['Page_topparentid'] !== undefined) {
    DOM_Object[id]['topparentid'] = eqobj['Page_topparentid']
  }
  if (eqobj['Format_name'] !== undefined) {
    DOM_Object[id]['name'] = eqobj['Format_name']
  }
  if (eqobj['Solution_real'] !== undefined) {
    DOM_Object[id]['real'] = eqobj['Solution_real']
  }
  if (eqobj['Solution_imag'] !== undefined) {
    DOM_Object[id]['imag'] = eqobj['Solution_imag']
  }
  if (eqobj['Format_size'] !== undefined) {
    DOM_Object[id]['size'] = eqobj['Format_size']
  }
  if (eqobj['type'] !== undefined) {
    DOM_Object[id]['type'] = eqobj['type']
  }
  if (eqobj['Format_equation'] !== undefined) {
    DOM_Object[id]['equation'] = eqobj['Format_equation']
  }
  if (eqobj['equation'] !== undefined) {
    DOM_Object[id]['equation'] = eqobj['equation']
  }
  if (eqobj['equation'] !== undefined) {
    self[id].Format_equation = eqobj['equation']
  }
  self[id].fileid = fileid
  for (var prop in eqobj) {
    self[id][prop] = eqobj[prop]
  }
  if (solve) {
    self[id].Solve_Equation(eqobj['equation'])
  }
  return id
}
//-------------------------------------------------------------------------------------------------------------------------//

/*-------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------ GET TABLE ELEMENTS -----------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------------------------------------*/
/*	This function takes in text which is in the form of #Table85.A.1:#Table85.C.9.  The user can opt to get the values 		\
	of those table elements returned in an array of numbers or in text separated by commas. 								\
/*-------------------------------------------------------------------------------------------------------------------------*/
function Get_Table_Elements(text, option) {
  var tableblocks = text.split(':')
  if (tableblocks.length == 1) {
    var tempdata = tableblocks[0].split('.')
    var columnnumber = tempdata[1].replace('$', '')
    columnnumber = parseInt(columnnumber.charCodeAt()) - 62
    var rownumber = parseInt(tempdata[2].replace('$', '')) + 2
    var numbers = DOM_Object[tempdata[0]]['real'][rownumber + '-' + columnnumber]
    var units = DOM_Object[tempdata[0]]['units'][rownumber + '-' + columnnumber]
    if (typeof units == 'undefined') {
      units = ''
    }
  } else {
    var tempdata1 = tableblocks[0].split('.')
    var columnnumber1 = tempdata1[1].replace('$', '')
    columnnumber1 = parseInt(columnnumber1.charCodeAt()) - 62
    var rownumber1 = parseInt(tempdata1[2].replace('$', '')) + 2
    var tempdata2 = tableblocks[1].split('.')
    var columnnumber2 = tempdata2[1].replace('$', '')
    columnnumber2 = parseInt(columnnumber2.charCodeAt()) - 62
    var rownumber2 = parseInt(tempdata2[2].replace('$', '')) + 2
    var numbers = ''
    var numberarray = new Array()
    var counter = 0
    for (var a = rownumber1; a <= rownumber1 + (rownumber2 - rownumber1); a++) {
      for (var b = columnnumber1; b <= columnnumber1 + (columnnumber2 - columnnumber1); b++) {
        numberarray[counter] = DOM_Object[tempdata1[0]]['real'][a + '-' + b]
        counter = counter + 1
        numbers = numbers + ', ' + DOM_Object[tempdata1[0]]['real'][a + '-' + b]
      }
    }
  }
  if (option === 0) {
    return numbers
  } else if (option == 1) {
    return numberarray
  }
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------------------------------------------//
//----------------------------------------------------------- MATH BETWEEN NUMBERS AND MATRICES ---------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------------------------------//
function ScalarOperation(operation, id1, id2) {
  console.log('I am in the scalar operation function')
  if (self[id1].Format_size == '1x1' || self[id1].Format_size == '1 x 1') {
    var numid = id1
    var matrixid = id2
    var order = '1'
  }
  if (self[id2].Format_size == '1x1' || self[id2].Format_size == '1 x 1') {
    var numid = id2
    var matrixid = id1
    var order = '2'
  }
  var eqobj = { Page_position: DOM_Object[id1]['order'], equation: 'TempEq=0', Format_size: self[matrixid].Format_size }
  var id = CreateEq('Equation', 0, eqobj)
  self[id] = new Equation(id)
  self[id].Format_name = 'TempEq'
  self[id].Format_size = self[matrixid].Format_size
  switch (operation) {
    case '*':
      for (var i in self[matrixid].Solution_real) {
        if (isNaN(parseFloat(self[matrixid].Solution_real[i]))) {
          self[matrixid].Solution_real[i] = 0
        }
        if (isNaN(parseFloat(self[matrixid].Solution_imag[i]))) {
          self[matrixid].Solution_imag[i] = 0
        }
        if (self[numid].Solution_real[i] == undefined) {
          self[numid].Solution_real[i] = 0
        }
        if (self[numid].Solution_imag[i] == undefined) {
          self[numid].Solution_imag[i] = 0
        }
        var r1 = ToNum(self[matrixid].Solution_real[i] * self[numid].Solution_real['0-0'])
        var r2 = ToNum(self[matrixid].Solution_imag[i] * self[numid].Solution_imag['0-0'])
        var i1 = ToNum(self[matrixid].Solution_real[i] * self[numid].Solution_imag['0-0'])
        var i2 = ToNum(self[matrixid].Solution_imag[i] * self[numid].Solution_real['0-0'])
        self[id].Solution_real[i] = ToNum(r1 - r2)
        self[id].Solution_imag[i] = ToNum(i1 + i2)
        var r1 = ToNum(self[matrixid].Solution_realdefault * self[numid].Solution_real['0-0'])
        var r2 = ToNum(self[matrixid].Solution_imagdefault * self[numid].Solution_imag['0-0'])
        var i1 = ToNum(self[matrixid].Solution_realdefault * self[numid].Solution_imag['0-0'])
        var i2 = ToNum(self[matrixid].Solution_imagdefault * self[numid].Solution_real['0-0'])
        self[id].Solution_realdefault = ToNum(r1 - r2)
        self[id].Solution_imagdefault = ToNum(i1 + i2)
      }
      var baseunits = new Array()
      for (var index in self[id1].Units_base_array) {
        baseunits[index] = self[id1].Units_base_array[index] + self[id2].Units_base_array[index]
      }
      self[id]['Units_base_array'] = baseunits
      self[id]['Units_base_string'] = ''

      for (var index in self[id].Units_base_array) {
        self[id]['Units_base_string'] = self[id]['Units_base_string'] + '' + self[id].Units_base_array[index]
      }

      break
    case '+':
      for (var i in self[matrixid].Solution_real) {
        if (isNaN(parseFloat(self[matrixid].Solution_real[i]))) {
          self[matrixid].Solution_real[i] = 0
        }
        if (isNaN(parseFloat(self[matrixid].Solution_imag[i]))) {
          self[matrixid].Solution_imag[i] = 0
        }
        if (isNaN(parseFloat(self[numid].Solution_real['0-0']))) {
          self[numid].Solution_real['0-0'] = 0
        }
        if (isNaN(parseFloat(self[numid].Solution_imag['0-0']))) {
          self[numid].Solution_imag['0-0'] = 0
        }
        self[id].Solution_real[i] = ToNum(self[matrixid].Solution_real[i] + self[numid].Solution_real['0-0'])
        self[id].Solution_imag[i] = ToNum(self[matrixid].Solution_imag[i] + self[numid].Solution_imag['0-0'])
      }
      self[id].Solution_realdefault = ToNum(self[matrixid].Solution_realdefault + self[numid].Solution_real['0-0'])
      self[id].Solution_imagdefault = ToNum(self[matrixid].Solution_imagdefault + self[numid].Solution_imag['0-0'])
      var baseunits = new Array()
      for (var index in self[id1].Units_base_array) {
        baseunits[index] = self[id1].Units_base_array[index]
      }
      self[id]['Units_base_array'] = baseunits
      self[id].Get_My_BaseString()
      break
    case '-':
      if (order == '1') {
        for (var i in self[matrixid].Solution_real) {
          if (isNaN(parseFloat(self[matrixid].Solution_real[i]))) {
            self[matrixid].Solution_real[i] = 0
          }
          if (isNaN(parseFloat(self[matrixid].Solution_imag[i]))) {
            self[matrixid].Solution_imag[i] = 0
          }
          if (isNaN(parseFloat(self[numid].Solution_real['0-0']))) {
            self[numid].Solution_real['0-0'] = 0
          }
          if (isNaN(parseFloat(self[numid].Solution_imag['0-0']))) {
            self[numid].Solution_imag['0-0'] = 0
          }
          self[id].Solution_real[i] = ToNum(self[numid].Solution_real['0-0'] - self[matrixid].Solution_real[i])
          self[id].Solution_imag[i] = ToNum(self[numid].Solution_imag['0-0'] - self[matrixid].Solution_imag[i])
        }
        self[id].Solution_realdefault = ToNum(self[numid].Solution_real['0-0'] - self[matrixid].Solution_realdefault)
        self[id].Solution_imagdefault = ToNum(self[numid].Solution_imag['0-0'] - self[matrixid].Solution_imagdefault)
      } else {
        for (var i in self[matrixid].Solution_real) {
          if (self[matrixid].Solution_real[i] === '') {
            self[matrixid].Solution_real[i] = 0
          }
          if (self[matrixid].Solution_imag[i] === '') {
            self[matrixid].Solution_imag[i] = 0
          }
          if (self[numid].Solution_real['0-0'] === '') {
            self[numid].Solution_real['0-0'] = 0
          }
          if (self[numid].Solution_imag['0-0'] === '') {
            self[numid].Solution_imag['0-0'] = 0
          }
          self[id].Solution_real[i] = ToNum(self[matrixid].Solution_real[i] - self[numid].Solution_real['0-0'])
          self[id].Solution_imag[i] = ToNum(self[matrixid].Solution_imag[i] - self[numid].Solution_imag['0-0'])
        }
        self[id].Solution_realdefault = ToNum(self[matrixid].Solution_realdefault - self[numid].Solution_real['0-0'])
        self[id].Solution_imagdefault = ToNum(self[matrixid].Solution_imagdefault - self[numid].Solution_imag['0-0'])
      }
      var baseunits = new Array()
      for (var index in self[id1].Units_base_array) {
        baseunits[index] = self[id1].Units_base_array[index]
      }
      self[id]['Units_base_array'] = baseunits
      self[id].Get_My_BaseString()
      break
    case '/':
      if (order == '1') {
        for (var i in self[matrixid].Solution_real) {
          if (isNaN(parseFloat(self[matrixid].Solution_real[i]))) {
            self[matrixid].Solution_real[i] = 0
          }
          if (isNaN(parseFloat(self[matrixid].Solution_imag[i]))) {
            self[matrixid].Solution_imag[i] = 0
          }
          if (isNaN(parseFloat(self[numid].Solution_real['0-0']))) {
            self[numid].Solution_real['0-0'] = 0
          }
          if (isNaN(parseFloat(self[numid].Solution_imag['0-0']))) {
            self[numid].Solution_imag['0-0'] = 0
          }
          var c = parseFloat(self[numid].Solution_real['0-0'])
          var d = -1 * parseFloat(self[numid].Solution_imag['0-0'])
          var a1 = parseFloat(self[matrixid].Solution_real[i])
          var b1 = parseFloat(self[matrixid].Solution_imag[i])
          var a2 = parseFloat(self[numid].Solution_real['0-0'])
          var b2 = parseFloat(self[numid].Solution_imag['0-0'])
          var nr = ToNum(a1 * c - b1 * d)
          var ni = ToNum(a1 * d + b1 * c)
          var dr = ToNum(a2 * c - b2 * d)
          var di = ToNum(a2 * d + b2 * c)
          self[id].Solution_real[i] = ToNum(nr / dr)
          self[id].Solution_imag[i] = ToNum(ni / dr)
        }
        var a1 = self[matrixid].Solution_realdefault
        var b1 = self[matrixid].Solution_imagdefault
        var nr = ToNum(a1 * c - b1 * d)
        var ni = ToNum(a1 * d + b1 * c)
        var dr = ToNum(a2 * c - b2 * d)
        var di = ToNum(a2 * d + b2 * c)
        self[id].Solution_realdefault = ToNum(nr / dr)
        self[id].Solution_imagdefault = ToNum(ni / dr)
        var baseunits = new Array()
        for (var index in self[id1].Units_base_array) {
          baseunits[index] = self[id2].Units_base_array[index] - self[id1].Units_base_array[index]
        }
        self[id]['Units_base_array'] = baseunits
        self[id].Get_My_BaseString()
      } else {
        for (var i in self[matrixid].Solution_real) {
          if (isNaN(parseFloat(self[matrixid].Solution_real[i]))) {
            self[matrixid].Solution_real[i] = 0
          }
          if (isNaN(parseFloat(self[matrixid].Solution_imag[i]))) {
            self[matrixid].Solution_imag[i] = 0
          }
          if (isNaN(parseFloat(self[numid].Solution_real['0-0']))) {
            self[numid].Solution_real['0-0'] = 0
          }
          if (isNaN(parseFloat(self[numid].Solution_imag['0-0']))) {
            self[numid].Solution_imag['0-0'] = 0
          }
          var c = parseFloat(self[matrixid].Solution_real[i])
          var d = -1 * parseFloat(self[matrixid].Solution_imag[i])
          var a1 = parseFloat(self[numid].Solution_real['0-0'])
          var b1 = parseFloat(self[numid].Solution_imag['0-0'])
          var a2 = parseFloat(self[matrixid].Solution_real[i])
          var b2 = parseFloat(self[matrixid].Solution_imag[i])
          var nr = ToNum(a1 * c - b1 * d)
          var ni = ToNum(a1 * d + b1 * c)
          var dr = ToNum(a2 * c - b2 * d)
          var di = ToNum(a2 * d + b2 * c)
          self[id].Solution_real[i] = ToNum(nr / dr)
          self[id].Solution_imag[i] = ToNum(ni / dr)
        }
        var a2 = parseFloat(self[matrixid].Solution_real[i])
        var b2 = parseFloat(self[matrixid].Solution_imag[i])
        var nr = ToNum(a1 * c - b1 * d)
        var ni = ToNum(a1 * d + b1 * c)
        var dr = ToNum(a2 * c - b2 * d)
        var di = ToNum(a2 * d + b2 * c)
        self[id].Solution_realdefault = ToNum(nr / dr)
        self[id].Solution_imagdefault = ToNum(ni / dr)
        var baseunits = new Array()
        for (var index in self[id1].Units_base_array) {
          baseunits[index] = self[id2].Units_base_array[index] - self[id1].Units_base_array[index]
        }
        self[id]['Units_base_array'] = baseunits
        self[id].Get_My_BaseString()
      }
      break
  }

  console.log('At the end of the scalar operations, the base array is ...')
  console.log(self[id1].Units_base_array)
  console.log(self[id2].Units_base_array)
  console.log(self[id].Units_base_array)

  return id
}
//-------------------------------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------------------------------//
//----------------------------------------------------- BUILD FUNCTION LIST -----------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------------------------------//
/*
This function is called on page load. It creates an object named "Functions." This object is later looped through to determine if there is any 
built in function in the equation. If the text on the right side of the equal signs below is present, the function in the brackets is called.

*/
function Build_FunctionList() {
  const Functions = {}
  Functions['sin'] = 'sin'
  Functions['cos'] = 'cos'
  Functions['tan'] = 'tan'
  Functions['asin'] = 'asin'
  Functions['acos'] = 'acos'
  Functions['atan'] = 'atan'
  Functions['atan2'] = 'atan2'
  Functions['sinh'] = 'sinh'
  Functions['cosh'] = 'cosh'
  Functions['tanh'] = 'tanh'
  Functions['asinh'] = 'asinh'
  Functions['acosh'] = 'acosh'
  Functions['atanh'] = 'atanh'
  Functions['sec'] = 'sec'
  Functions['csc'] = 'csc'
  Functions['cot'] = 'cot'
  Functions['asec'] = 'asec'
  Functions['acsc'] = 'acsc'
  Functions['acot'] = 'acot'
  Functions['asech'] = 'asech'
  Functions['acsch'] = 'acsch'
  Functions['acoth'] = 'acoth'
  Functions['root'] = 'root'
  Functions['power'] = 'power'
  Functions['ln'] = 'ln'
  Functions['log10'] = 'log10'
  Functions['log'] = 'log'
  Functions['abs'] = 'abs'
  Functions['floor'] = 'floor'
  Functions['ceil'] = 'ceil'
  Functions['round'] = 'round'
  Functions['max'] = 'max'
  Functions['min'] = 'min'
  Functions['maxu'] = 'maxu'
  Functions['minu'] = 'minu'
  Functions['maxInd'] = 'maxInd'
  Functions['minInd'] = 'minInd'
  Functions['Transpose'] = 'Transpose'
  Functions['Size'] = 'Size'
  Functions['CreateMatrix'] = 'CreateMatrix' // Needs to be fixed to allow higher dimensions
  Functions['Identity'] = 'Identity'
  Functions['NewtonCotes'] = 'NewtonCotes'
  Functions['Integrate'] = 'Integrate'
  Functions['DerivativeFun'] = 'DerivativeFun'
  Functions['Derivative'] = 'Derivative'
  Functions['DerivativeUn'] = 'DerivativeUn'
  Functions['Real'] = 'Real'
  Functions['Imag'] = 'Imag'
  Functions['Append'] = 'Append'
  Functions['rand'] = 'rand'
  Functions['randMat'] = 'randMat'
  Functions['squash'] = 'squash' // Not Working
  Functions['GaussE'] = 'GaussE'
  Functions['LUDecomp'] = 'LUDecomp'
  Functions['InverseLU'] = 'InverseLU'
  Functions['sum'] = 'sum'
  Functions['mean'] = 'mean'
  Functions['median'] = 'median'
  Functions['mode'] = 'mode'
  Functions['range'] = 'range'
  Functions['stdev'] = 'stdev'
  Functions['variance'] = 'variance'
  Functions['cv'] = 'cv'
  Functions['polyfit'] = 'polyfit'
  Functions['powerfit'] = 'powerfit'
  Functions['logfit'] = 'logfit'
  Functions['expfit'] = 'expfit'
  Functions['histogram'] = 'histogram'
  Functions['numinds'] = 'numinds'
  Functions['Cholesky'] = 'Cholesky'
  Functions['Norm'] = 'Norm'
  Functions['CSNorm'] = 'CSNorm'
  Functions['RSNorm'] = 'RSNorm'
  Functions['Trace'] = 'Trace'
  Functions['Conj'] = 'Conj'
  Functions['DotMult'] = 'DotMult'
  Functions['DotDiv'] = 'DotDiv'
  Functions['Dot'] = 'Dot'
  Functions['Cross'] = 'Cross'
  Functions['Threshold'] = 'Threshold'
  Functions['isColumn'] = 'isColumn'
  Functions['isRow'] = 'isRow'
  Functions['isMatrix'] = 'isMatrix'
  Functions['NumEl'] = 'NumEl'
  Functions['length'] = 'length'
  Functions['fliplr'] = 'fliplr'
  Functions['flipud'] = 'flipud'
  Functions['diag'] = 'diag'
  Functions['matur'] = 'matur'
  Functions['matll'] = 'matll'
  Functions['incSearch'] = 'incSearch'
  Functions['Bisect'] = 'Bisect'
  Functions['FalsePos'] = 'FalsePos'
  Functions['Secant'] = 'Secant'
  Functions['FFT'] = 'FFT'
  Functions['Fourier'] = 'Fourier'
  Functions['Row2Mat'] = 'Row2Mat'
  Functions['Col2Mat'] = 'Col2Mat'
  Functions['ODE4'] = 'ODE4'
  Functions['Det'] = 'Det'
  Functions['MatPow'] = 'MatPow'
  Functions['IntVec'] = 'IntVec'
  Functions['sign'] = 'sign'
  Functions['rotate'] = 'rotate'
  Functions['parseDate'] = 'parseDate'
  Functions['isPosDef'] = 'isPosDef'
  Functions['Interpolate'] = 'Interpolate'
  Functions['IfElse'] = 'IfElse'
  Functions['firstPos'] = 'firstPos'
} //	|
//-------------------------------------------------------------------------------------------------------------------------------------------------//

/*
	Handles the sin function for numbers and matrices
	For complex numbers, the algorithm follows the following:
	sin(a+bi)=sina * coshb + i(cosa * sinhb)
*/

Equation.prototype.sin = function (replacetext, pid, pos, callback) {
  var real = 0,
    imag = 0,
    num1 = '',
    flag = 0
  replacetext = replacetext.replace(/^sin\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'sin')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'sin')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'SinEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'sin', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var id = CreateEq(this.fileid, 0, eqobj)
      for (var index in self[tempid].Solution_real) {
        if (self[tempid].Solution_real[index] !== undefined) {
          real = self[tempid].Solution_real[index]
        } else {
          real = self[tempid].Solution_realdefault
        }
        if (self[tempid].Solution_imag[index] !== undefined) {
          imag = self[tempid].Solution_imag[index]
        } else {
          imag = self[tempid].Solution_imagdefault
        }
        self[id].Solution_real[index] = ToNum(Math.sin(real) * 0.5 * (Math.exp(imag) + Math.exp(-imag)))
        self[id].Solution_imag[index] = ToNum(Math.cos(real) * 0.5 * (Math.exp(imag) - Math.exp(-imag)))
      }
      self[id].Format_size = self[tempid].Format_size
      self[id].Format_showequation = 'sin \\left(' + self[tempid].Format_showequation + ' \\right)'
      //this.Solution_temps.push(self[id].Format_id);
      //this.Solution_temps.push(self[tempid].Format_id);
      SetModels('sin', id, tempid)
      self[pid].Solution_variable_array[pos] = id
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
      DOM_Object[id]['real'] = self[id].Solution_real
      DOM_Object[id]['size'] = self[id]['Format_size']
      DOM_Object[id]['imag']['0-0'] = 0
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}

/*
	This function adds the cosine ability to the equation prototype

	For complex numbers, the algorithm follows the following:
	cos(a+bi)=cosa * coshb + i(sina*sinhb)
*/

Equation.prototype.cos = function (replacetext, pid, pos, callback) {
  var real = 0,
    imag = 0,
    flag = 0
  replacetext = replacetext.replace(/^cos\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'cos')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'cos')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'cos', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var id = CreateEq(this.fileid, 0, eqobj)
      for (var index in self[tempid].Solution_real) {
        if (self[tempid].Solution_real[index] !== undefined) {
          real = self[tempid].Solution_real[index]
        } else {
          real = self[tempid].Solution_realdefault
        }
        if (self[tempid].Solution_imag[index] !== undefined) {
          imag = self[tempid].Solution_imag[index]
        } else {
          imag = self[tempid].Solution_imagdefault
        }
        self[id].Solution_real[index] = ToNum(Math.cos(real) * 0.5 * (Math.exp(imag) + Math.exp(-imag)))
        self[id].Solution_imag[index] = -ToNum(Math.sin(real) * 0.5 * (Math.exp(imag) - Math.exp(-imag)))
      }
      self[id].Format_size = self[tempid].Format_size
      SetModels('cos', id, tempid)
      self[id].Format_showequation = 'cos \\left(' + self[tempid].Format_showequation + ' \\right)'
      self[pid].Solution_variable_array[pos] = id
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
      DOM_Object[id]['real'] = self[id].Solution_real
      DOM_Object[id]['size'] = self[id]['Format_size']
      DOM_Object[id]['imag']['0-0'] = 0
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}

/*
	This function adds the tangent function to the equation prototype
*/
Equation.prototype.tan = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^tan\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'tan')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'tan')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'tan', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var tanid = CreateEq(this.fileid, 0, eqobj)
      var tanobj = { tempid: tempid, tanid: tanid, tanind: 0, parentid: this.Format_id }
      for (var tanind in self[tempid].Solution_real) {
        tanobj['tanind'] = tanind
        Tangent1(tanobj, function () {
          Tangent2(tanobj, function () {
            DivideComplex(tanobj, function () {
              Tangent3(tanobj)
            })
          })
        })
        console.log('Div - ' + tanobj['real'] + ' ' + tanobj['imag'])
      }
      self[tanid].Format_showequation = 'tan \\left(' + self[tempid].Format_showequation + ' \\right)'
      this.Solution_temps.push(self[tanid].Format_id)
      self[tanid].Format_size = self[tempid].Format_size
      SetModels('tan', tanid, tempid)
      DOM_Object[tanid]['real'] = self[tanid].Solution_real
      DOM_Object[tanid]['size'] = self[tanid]['Format_size']
      DOM_Object[tanid]['imag']['0-0'] = 0
      self[pid].Solution_variable_array[pos] = tanid
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Tangent1(tanobj, callback) {
  if (self[tanobj['tempid']].Solution_real[tanobj['tanind']] !== undefined) {
    tanobj['real'] = self[tanobj['tempid']].Solution_real[tanobj['tanind']]
  } else {
    tanobj['real'] = self[tanobj['tempid']].Solution_realdefault
  }
  if (self[tanobj['tempid']].Solution_imag[tanobj['tanind']] !== undefined) {
    tanobj['imag'] = self[tanobj['tempid']].Solution_imag[tanobj['tanind']]
  } else {
    tanobj['imag'] = self[tanobj['tempid']].Solution_imagdefault
  }
  callback()
}
function Tangent2(tanobj, callback) {
  tanobj['numreal'] = ToNum(Math.sin(tanobj['real']) * 0.5 * (Math.exp(tanobj['imag']) + Math.exp(-tanobj['imag'])))
  tanobj['numimag'] = ToNum(Math.cos(tanobj['real']) * 0.5 * (Math.exp(tanobj['imag']) - Math.exp(-tanobj['imag'])))
  tanobj['denreal'] = ToNum(Math.cos(tanobj['real']) * 0.5 * (Math.exp(tanobj['imag']) + Math.exp(-tanobj['imag'])))
  tanobj['denimag'] = -ToNum(Math.sin(tanobj['real']) * 0.5 * (Math.exp(tanobj['imag']) - Math.exp(-tanobj['imag'])))

  console.log('Sin - ' + tanobj['numreal'] + ' ' + tanobj['numimag'])
  console.log('Cos - ' + tanobj['denreal'] + ' ' + tanobj['denimag'])
  callback()
}
function Tangent3(tanobj) {
  self[tanobj['tanid']].Solution_real[tanobj['tanind']] = tanobj['real']
  self[tanobj['tanid']].Solution_imag[tanobj['tanind']] = tanobj['imag']
}
/*
	This function performs the asin math for an equation object. This is done by 
	the formula -iln[ix + sqrt(1-x^2)]
*/
Equation.prototype.asin = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^asin\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'asin')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'asin')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'asin', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var asinid = CreateEq(this.fileid, 0, eqobj)
      var asinobj = { tempid: tempid, asinid: asinid, asinind: 0, parentid: this.Format_id }
      for (var asinind in self[tempid].Solution_real) {
        asinobj['asinind'] = asinind
        Asin1(asinobj, function () {
          SquareComplex(asinobj, function () {
            Asin2(asinobj, function () {
              SquareRoot(asinobj, function () {
                Asin3(asinobj, function () {
                  NatLog(asinobj, function () {
                    Asin4(asinobj, function () {})
                  })
                })
              })
            })
          })
        })
      }
      self[asinid].Format_showequation = 'asin \\left(' + self[tempid].Format_showequation + ' \\right)'
      self[asinid].Format_showtype = 'builtin'
      this.Solution_temps.push(self[asinid].Format_id)
      self[asinid].Format_size = self[tempid].Format_size
      DOM_Object[asinid]['real'] = self[asinid].Solution_real
      DOM_Object[asinid]['size'] = self[asinid]['Format_size']
      DOM_Object[asinid]['imag']['0-0'] = 0
      SetModels('asin', asinid, tempid)
      self[pid].Solution_variable_array[pos] = asinid
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Asin1(asinobj, callback) {
  if (self[asinobj['tempid']].Solution_real[asinobj['asinind']] !== undefined) {
    asinobj['real'] = self[asinobj['tempid']].Solution_real[asinobj['asinind']]
    asinobj['orig_real'] = self[asinobj['tempid']].Solution_real[asinobj['asinind']]
  } else {
    asinobj['real'] = self[asinobj['tempid']].Solution_realdefault
    asinobj['orig_real'] = self[asinobj['tempid']].Solution_realdefault
  }
  if (self[asinobj['tempid']].Solution_imag[asinobj['asinind']] !== undefined) {
    asinobj['imag'] = self[asinobj['tempid']].Solution_imag[asinobj['asinind']]
    asinobj['orig_imag'] = self[asinobj['tempid']].Solution_imag[asinobj['asinind']]
  } else {
    asinobj['imag'] = self[asinobj['tempid']].Solution_imagdefault
    asinobj['orig_imag'] = self[asinobj['tempid']].Solution_imagdefault
  }
  callback()
}
function Asin2(asinobj, callback) {
  asinobj['real'] = 1 - asinobj['real']
  asinobj['imag'] = -asinobj['imag']
  callback()
}
function Asin3(asinobj, callback) {
  var real = -asinobj['orig_imag'] + asinobj['real']
  var imag = asinobj['orig_real'] + asinobj['imag']
  asinobj['real'] = real
  asinobj['imag'] = imag
  callback()
}
function Asin4(asinobj, callback) {
  self[asinobj['asinid']].Solution_real[asinobj['asinind']] = asinobj['imag']
  self[asinobj['asinid']].Solution_imag[asinobj['asinind']] = -asinobj['real']
}
//---------------------------------------------------------------------------------------------------------//
/*
	This is the acos function. It is formulated by pi/2+iln[ix + sqrt(1-x^2)]
*/
Equation.prototype.acos = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^acos\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'acos')
    flag = 1
  }
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'acos')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'cot', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var acosid = CreateEq(this.fileid, 0, eqobj)
      var acosobj = { tempid: tempid, acosid: acosid, acosind: 0, parentid: this.Format_id }
      for (var acosind in self[tempid].Solution_real) {
        acosobj['acosind'] = acosind
        Acos1(acosobj, function () {
          SquareComplex(acosobj, function () {
            Acos2(acosobj, function () {
              SquareRoot(acosobj, function () {
                Acos3(acosobj, function () {
                  NatLog(acosobj, function () {
                    Acos4(acosobj)
                  })
                })
              })
            })
          })
        })
      }
      self[acosid].Format_showequation = 'acos \\left(' + self[tempid].Format_showequation + ' \\right)'
      self[acosid].Format_showtype = 'builtin'
      this.Solution_temps.push(self[acosid].Format_id)
      self[acosid].Format_size = self[tempid].Format_size
      DOM_Object[acosid]['real'] = self[acosid].Solution_real
      DOM_Object[acosid]['size'] = self[acosid]['Format_size']
      DOM_Object[acosid]['imag']['0-0'] = 0
      SetModels('acos', acosid, tempid)
      self[pid].Solution_variable_array[pos] = acosid
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Acos1(acosobj, callback) {
  if (self[acosobj['tempid']].Solution_real[acosobj['acosind']] !== undefined) {
    acosobj['real'] = self[acosobj['tempid']].Solution_real[acosobj['acosind']]
    acosobj['orig_real'] = self[acosobj['tempid']].Solution_real[acosobj['acosind']]
  } else {
    acosobj['real'] = self[acosobj['tempid']].Solution_realdefault
    acosobj['orig_real'] = self[acosobj['tempid']].Solution_realdefault
  }
  if (self[acosobj['tempid']].Solution_imag[acosobj['acosind']] !== undefined) {
    acosobj['imag'] = self[acosobj['tempid']].Solution_imag[acosobj['acosind']]
    acosobj['orig_imag'] = self[acosobj['tempid']].Solution_imag[acosobj['acosind']]
  } else {
    acosobj['imag'] = self[acosobj['tempid']].Solution_imagdefault
    acosobj['orig_imag'] = self[acosobj['tempid']].Solution_imagdefault
  }
  callback()
}
function Acos2(acosobj, callback) {
  acosobj['real'] = 1 - acosobj['real']
  acosobj['imag'] = -acosobj['imag']
  callback()
}
function Acos3(acosobj, callback) {
  var real = -acosobj['orig_imag'] + acosobj['real']
  var imag = acosobj['orig_real'] + acosobj['imag']
  acosobj['real'] = real
  acosobj['imag'] = imag
  callback()
}
function Acos4(acosobj, callback) {
  self[acosobj['acosid']].Solution_real[acosobj['acosind']] = Math.PI / 2 - acosobj['imag']
  self[acosobj['acosid']].Solution_imag[acosobj['acosind']] = acosobj['real']
}

/*
	0.5*i*[ ln(1-iz) - ln(1+iz) ]
*/
Equation.prototype.atan = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^atan\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'atan')
    flag = 1
  }
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'atan')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'cot', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var atanid = CreateEq(this.fileid, 0, eqobj)
      var atanobj = { tempid: tempid, atanid: atanid, atanind: 0, parentid: this.Format_id }
      for (var atanind in self[tempid].Solution_real) {
        atanobj['atanind'] = atanind
        Atan1(atanobj, function () {
          NatLog(atanobj, function () {
            Atan3(atanobj, function () {
              NatLog(atanobj, function () {
                Atan4(atanobj)
              })
            })
          })
        })
      }
      self[atanid].Format_showequation = 'atan \\left(' + self[tempid].Format_showequation + ' \\right)'
      self[atanid].Format_showtype = 'builtin'
      //this.Solution_temps.push(self[atanid].Format_id);
      self[atanid].Format_size = self[tempid].Format_size
      DOM_Object[atanid]['real'] = self[atanid].Solution_real
      DOM_Object[atanid]['size'] = self[atanid]['Format_size']
      DOM_Object[atanid]['imag']['0-0'] = 0
      SetModels('atan', atanid, tempid)
      self[pid].Solution_variable_array[pos] = atanid
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Atan1(atanobj, callback) {
  if (self[atanobj['tempid']].Solution_real[atanobj['atanind']] !== undefined) {
    atanobj['orig_real'] = self[atanobj['tempid']].Solution_real[atanobj['atanind']]
  } else {
    atanobj['orig_real'] = self[atanobj['tempid']].Solution_realdefault
  }
  if (self[atanobj['tempid']].Solution_imag[atanobj['atanind']] !== undefined) {
    atanobj['orig_imag'] = self[atanobj['tempid']].Solution_imag[atanobj['atanind']]
  } else {
    atanobj['orig_imag'] = self[atanobj['tempid']].Solution_imagdefault
  }
  atanobj['real'] = 1 + parseFloat(atanobj['orig_imag'])
  atanobj['imag'] = parseFloat(-atanobj['orig_real'])
  callback()
}
function Atan3(atanobj, callback) {
  atanobj['log1_real'] = atanobj['real']
  atanobj['log1_imag'] = atanobj['imag']
  atanobj['real'] = ToNum(1 - atanobj['orig_imag'])
  atanobj['imag'] = ToNum(atanobj['orig_real'])
  callback()
}
function Atan4(atanobj, callback) {
  var imag = 0.5 * ToNum(atanobj['log1_real'] - atanobj['real'])
  var real = -0.5 * ToNum(atanobj['log1_imag'] - atanobj['imag'])
  self[atanobj['atanid']].Solution_real[atanobj['atanind']] = real
  self[atanobj['atanid']].Solution_imag[atanobj['atanind']] = imag
}
//---------------------------------------------------------------------------------------------------------//

/*
	arctan2(y,x)=...from wiki atan2
*/
Equation.prototype.atan2 = function (replacetext, pid, pos, callback) {
  replacetext = replacetext.replace(/^atan2\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'Trig2', inputarray.length, 'atan2')
  }
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'atan2')
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[1]
  }
  var id2 = CreateEq(this.fileid, 1, eqobj)
  var id = CreateEq(this.fileid, 0, eqobj)
  for (var index in self[id1].Solution_real) {
    if (self[id1].Solution_real[index] !== undefined) {
      real1 = self[id1].Solution_real[index]
    } else {
      real1 = self[id1].Solution_realdefault
    }
    if (self[id1].Solution_imag[index] !== undefined) {
      imag1 = self[id1].Solution_imag[index]
    } else {
      imag1 = self[id1].Solution_imagdefault
    }
    if (self[id2].Solution_real[index] !== undefined) {
      real2 = self[id2].Solution_real[index]
    } else {
      real2 = self[id2].Solution_realdefault
    }
    if (self[id2].Solution_imag[index] !== undefined) {
      imag2 = self[id2].Solution_imag[index]
    } else {
      imag2 = self[id2].Solution_imagdefault
    }
    var x = real2
    var y = real1
    if (x > 0) {
      self[id].Solution_real[index] = Math.atan(y / x)
    } else if (x < 0 && y >= 0) {
      self[id].Solution_real[index] = Math.atan(y / x) + Math.PI
    } else if (x < 0 && y < 0) {
      self[id].Solution_real[index] = Math.atan(y / x) - Math.PI
    } else if (x === 0 && y > 0) {
      self[id].Solution_real[index] = Math.PI / 2
    } else if (x === 0 && y < 0) {
      self[id].Solution_real[index] = -Math.PI / 2
    } else if (x === 0 && y === 0) {
      self[id].Solution_real[index] = undefined
    }
  }
  self[id].Format_showequation =
    'atan2 \\left(' + self[id1].Format_showequation + ',' + self[id2].Format_showequation + ' \\right)'
  self[id].Format_showtype = 'builtin'
  this.Solution_temps.push(self[id].Format_id)
  DOM_Object[id]['real'] = self[id].Solution_real
  DOM_Object[id]['size'] = self[id]['Format_size']
  DOM_Object[id]['imag']['0-0'] = 0
  DOM_Object[id]['units'] = self[id].Units_units
  self[pid].Solution_variable_array[pos] = id
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------- sinh(a+bi) = sinha * cosb + i(cosha * sinb) -------------------------------------------------------------------------------------//
Equation.prototype.sinh = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^sinh\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'sinh')
    flag = 1
  }
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'sinh')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'acot', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var id = CreateEq(this.fileid, 0, eqobj)
      var obj = { tempid: tempid, id: id, ind: 0, parentid: this.Format_id }
      for (var ind in self[tempid].Solution_real) {
        if (self[obj['tempid']].Solution_real[ind] !== undefined) {
          obj['real'] = self[obj['tempid']].Solution_real[ind]
        } else {
          obj['real'] = self[obj['tempid']].Solution_realdefault
        }
        if (self[obj['tempid']].Solution_imag[ind] !== undefined) {
          obj['imag'] = self[obj['tempid']].Solution_imag[ind]
        } else {
          obj['imag'] = self[obj['tempid']].Solution_imagdefault
        }
        self[id].Solution_real[ind] = ToNum(
          ((Math.exp(parseFloat(obj['real'])) - Math.exp(-parseFloat(obj['real']))) / 2) * Math.cos(obj['imag'])
        )
        self[id].Solution_imag[ind] = ToNum(
          ((Math.exp(parseFloat(obj['real'])) + Math.exp(-parseFloat(obj['real']))) / 2) * Math.sin(obj['imag'])
        )
      }
      self[id].Format_showequation = 'sinh \\left(' + self[tempid].Format_showequation + ' \\right)'
      this.Solution_temps.push(self[id].Format_id)
      self[id].Format_size = self[tempid].Format_size
      DOM_Object[id]['real'] = self[id].Solution_real
      DOM_Object[id]['size'] = self[id]['Format_size']
      DOM_Object[id]['imag']['0-0'] = 0
      SetModels('sinh', id, tempid)
      self[pid].Solution_variable_array[pos] = id
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//--------------------------- cosh(a+bi) = cosha * cosb + i(sinha * sinb) ------------------------------------------------------------------------------//
Equation.prototype.cosh = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^cosh\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'cosh')
    flag = 1
  }
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'cosh')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'cosh', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var id = CreateEq(this.fileid, 0, eqobj)
      var obj = { tempid: tempid, id: id, ind: 0, parentid: this.Format_id }
      for (var ind in self[tempid].Solution_real) {
        if (self[obj['tempid']].Solution_real[ind] !== undefined) {
          obj['real'] = self[obj['tempid']].Solution_real[ind]
        } else {
          obj['real'] = self[obj['tempid']].Solution_realdefault
        }
        if (self[obj['tempid']].Solution_imag[ind] !== undefined) {
          obj['imag'] = self[obj['tempid']].Solution_imag[ind]
        } else {
          obj['imag'] = self[obj['tempid']].Solution_imagdefault
        }
        self[id].Solution_real[ind] = ToNum(
          ((Math.exp(obj['real']) + Math.exp(-obj['real'])) / 2) * Math.cos(obj['imag'])
        )
        self[id].Solution_imag[ind] = ToNum(
          ((Math.exp(obj['real']) - Math.exp(-obj['real'])) / 2) * Math.sin(obj['imag'])
        )
      }
      self[id].Format_showequation = 'cosh \\left(' + self[tempid].Format_showequation + ' \\right)'
      this.Solution_temps.push(self[id].Format_id)
      self[id].Format_size = self[tempid].Format_size
      DOM_Object[id]['real'] = self[id].Solution_real
      DOM_Object[id]['size'] = self[id]['Format_size']
      DOM_Object[id]['imag']['0-0'] = 0
      SetModels('cosh', id, tempid)
      self[pid].Solution_variable_array[pos] = id
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//------------------------------- tanh(a+bi) = sinh(a+bi)/cosh(a+bi) --------------------------------------------------------------------------//
Equation.prototype.tanh = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^tanh\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'tanh')
    flag = 1
  }
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'tanh')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'tanh', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var tanhid = CreateEq(this.fileid, 0, eqobj)
      var tanhobj = { tempid: tempid, tanhid: tanhid, tanhind: 0, parentid: this.Format_id }
      for (var tanhind in self[tempid].Solution_real) {
        tanhobj['tanhind'] = tanhind
        Tanh1(tanhobj, function () {
          DivideComplex(tanhobj, function () {
            Tanh2(tanhobj)
          })
        })
      }
      self[tanhid].Format_showequation = 'tanh \\left(' + self[tempid].Format_showequation + ' \\right)'
      self[tanhid].Format_showtype = 'builtin'
      this.Solution_temps.push(self[tanhid].Format_id)
      self[tanhid].Format_size = self[tempid].Format_size
      DOM_Object[tanhid]['real'] = self[tanhid].Solution_real
      DOM_Object[tanhid]['size'] = self[tanhid]['Format_size']
      DOM_Object[tanhid]['imag']['0-0'] = 0
      SetModels('tanh', tanhid, tempid)
      self[pid].Solution_variable_array[pos] = tanhid
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Tanh1(tanhobj, callback) {
  if (self[tanhobj['tempid']].Solution_real[tanhobj['tanhind']] !== undefined) {
    tanhobj['real'] = self[tanhobj['tempid']].Solution_real[tanhobj['tanhind']]
  } else {
    tanhobj['real'] = self[tanhobj['tempid']].Solution_realdefault
  }
  if (self[tanhobj['tempid']].Solution_imag[tanhobj['tanhind']] !== undefined) {
    tanhobj['imag'] = self[tanhobj['tempid']].Solution_imag[tanhobj['tanhind']]
  } else {
    tanhobj['imag'] = self[tanhobj['tempid']].Solution_imagdefault
  }
  tanhobj['numreal'] = ToNum(
    ((Math.exp(parseFloat(tanhobj['real'])) - Math.exp(-parseFloat(tanhobj['real']))) / 2) * Math.cos(tanhobj['imag'])
  )
  tanhobj['numimag'] = ToNum(
    ((Math.exp(parseFloat(tanhobj['real'])) + Math.exp(-parseFloat(tanhobj['real']))) / 2) * Math.sin(tanhobj['imag'])
  )
  tanhobj['denreal'] = ToNum(((Math.exp(tanhobj['real']) + Math.exp(-tanhobj['real'])) / 2) * Math.cos(tanhobj['imag']))
  tanhobj['denimag'] = ToNum(((Math.exp(tanhobj['real']) - Math.exp(-tanhobj['real'])) / 2) * Math.sin(tanhobj['imag']))
  callback()
}
function Tanh2(tanhobj, callback) {
  self[tanhobj['tanhid']].Solution_real[tanhobj['tanhind']] = tanhobj['real']
  self[tanhobj['tanhid']].Solution_imag[tanhobj['tanhind']] = tanhobj['imag']
}
//---------------------------------------------------------------------------------------------------------//

//------------------------------ asinh(z) = ln[ z+ sqrt(z^2+1) ] ---------------------------------------------------------------------------//
Equation.prototype.asinh = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^asinh\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'asinh')
    flag = 1
  }
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'asinh')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'asinh', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var asinhid = CreateEq(this.fileid, 0, eqobj)
      var asinhobj = { tempid: tempid, asinhid: asinhid, asinhind: 0, parentid: this.Format_id }
      for (var asinhind in self[tempid].Solution_real) {
        asinhobj['asinhind'] = asinhind
        Asinh1(asinhobj, function () {
          SquareComplex(asinhobj, function () {
            Asinh2(asinhobj, function () {
              SquareRoot(asinhobj, function () {
                Asinh3(asinhobj, function () {
                  NatLog(asinhobj, function () {
                    Asinh4(asinhobj)
                  })
                })
              })
            })
          })
        })
      }
      self[asinhid].Format_showequation = 'asinh \\left(' + self[tempid].Format_showequation + ' \\right)' //\
      self[asinhid].Format_showtype = 'builtin'
      self[asinhid].Format_size = self[tempid].Format_size
      this.Solution_temps.push(self[asinhid].Format_id)
      DOM_Object[asinhid]['real'] = self[asinhid].Solution_real
      DOM_Object[asinhid]['size'] = self[asinhid]['Format_size']
      DOM_Object[asinhid]['imag']['0-0'] = 0
      SetModels('asinh', asinhid, tempid)
      self[pid].Solution_variable_array[pos] = asinhid
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Asinh1(asinhobj, callback) {
  if (self[asinhobj['tempid']].Solution_real[asinhobj['asinhind']] !== undefined) {
    asinhobj['real'] = self[asinhobj['tempid']].Solution_real[asinhobj['asinhind']]
  } else {
    asinhobj['real'] = self[asinhobj['tempid']].Solution_realdefault
  }
  if (self[asinhobj['tempid']].Solution_imag[asinhobj['asinhind']] !== undefined) {
    asinhobj['imag'] = self[asinhobj['tempid']].Solution_imag[asinhobj['asinhind']]
  } else {
    asinhobj['imag'] = self[asinhobj['tempid']].Solution_imagdefault
  }
  asinhobj['orig_real'] = asinhobj['real']
  asinhobj['orig_imag'] = asinhobj['imag']
  callback()
}
function Asinh2(asinhobj, callback) {
  asinhobj['real'] = ToNum(parseFloat(asinhobj['real']) + 1)
  callback()
}
function Asinh3(asinhobj, callback) {
  asinhobj['real'] = asinhobj['real'] + asinhobj['orig_real']
  asinhobj['imag'] = asinhobj['imag'] + asinhobj['orig_imag']
  callback()
}
function Asinh4(asinhobj, callback) {
  self[asinhobj['asinhid']].Solution_real[asinhobj['asinhind']] = asinhobj['real']
  self[asinhobj['asinhid']].Solution_imag[asinhobj['asinhind']] = asinhobj['imag']
}
//---------------------------------------------------------------------------------------------------------//

//----------------------------- acosh(z) = ln[ z + sqrt(z-1) * sqrt(z+1) ] ----------------------------------------------------------------------------//
Equation.prototype.acosh = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^acosh\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'acosh')
    flag = 1
  }
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'acosh')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'acosh', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var acoshid = CreateEq(this.fileid, 0, eqobj)
      var acoshobj = { tempid: tempid, acoshid: acoshid, acoshind: 0, parentid: this.Format_id }
      for (var acoshind in self[tempid].Solution_real) {
        acoshobj['acoshind'] = acoshind
        Acosh1(acoshobj, function () {
          SquareRoot(acoshobj, function () {
            Acosh2(acoshobj, function () {
              SquareRoot(acoshobj, function () {
                Acosh3(acoshobj, function () {
                  NatLog(acoshobj, function () {
                    Acosh4(acoshobj)
                  })
                })
              })
            })
          })
        })
      }
      self[acoshid].Format_showequation = 'acosh \\left(' + self[tempid].Format_showequation + ' \\right)' //\
      self[acoshid].Format_showtype = 'builtin'
      this.Solution_temps.push(self[acoshid].Format_id)
      self[acoshid].Format_size = self[tempid].Format_size
      DOM_Object[acoshid]['real'] = self[acoshid].Solution_real
      DOM_Object[acoshid]['size'] = self[acoshid]['Format_size']
      DOM_Object[acoshid]['imag']['0-0'] = 0
      SetModels('acos', acoshid, tempid)
      self[pid].Solution_variable_array[pos] = acoshid
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Acosh1(acoshobj, callback) {
  if (self[acoshobj['tempid']].Solution_real[acoshobj['acoshind']] !== undefined) {
    acoshobj['real'] = self[acoshobj['tempid']].Solution_real[acoshobj['acoshind']]
  } else {
    acoshobj['real'] = self[acoshobj['tempid']].Solution_realdefault
  }
  if (self[acoshobj['tempid']].Solution_imag[acoshobj['acoshind']] !== undefined) {
    acoshobj['imag'] = self[acoshobj['tempid']].Solution_imag[acoshobj['acoshind']]
  } else {
    acoshobj['imag'] = self[acoshobj['tempid']].Solution_imagdefault
  }
  acoshobj['orig_real'] = acoshobj['real']
  acoshobj['orig_imag'] = acoshobj['imag']
  acoshobj['real'] = ToNum(parseFloat(acoshobj['real']) - 1)
  callback()
}
function Acosh2(acoshobj, callback) {
  acoshobj['sq1_real'] = acoshobj['real']
  acoshobj['sq1_imag'] = acoshobj['imag']
  acoshobj['real'] = ToNum(parseFloat(acoshobj['orig_real']) + 1)
  acoshobj['imag'] = acoshobj['orig_imag']
  callback()
}
function Acosh3(acoshobj, callback) {
  acoshobj['sq2_real'] = acoshobj['real']
  acoshobj['sq2_imag'] = acoshobj['imag']
  acoshobj['real'] =
    ToNum(acoshobj['sq1_real'] * acoshobj['sq2_real']) -
    ToNum(acoshobj['sq1_imag'] * acoshobj['sq2_imag']) +
    ToNum(acoshobj['orig_real'])
  acoshobj['imag'] =
    ToNum(acoshobj['sq1_real'] * acoshobj['sq2_imag']) +
    ToNum(acoshobj['sq1_imag'] * acoshobj['sq2_real']) +
    ToNum(acoshobj['orig_imag'])
  callback()
}
function Acosh4(acoshobj, callback) {
  self[acoshobj['acoshid']].Solution_real[acoshobj['acoshind']] = acoshobj['real']
  self[acoshobj['acoshid']].Solution_imag[acoshobj['acoshind']] = acoshobj['imag']
}
//---------------------------------------------------------------------------------------------------------//

//--------------------- atanh(z) = 0.5 * [ ln(1+z) - ln(1-z) ] ------------------------------------------------------------------------------------//
Equation.prototype.atanh = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^atanh\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'atanh')
    flag = 1
  }
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'atanh')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'acosh', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var atanhid = CreateEq(this.fileid, 0, eqobj)
      var atanhobj = { tempid: tempid, atanhid: atanhid, atanhind: 0, parentid: this.Format_id }
      for (var atanhind in self[tempid].Solution_real) {
        atanhobj['atanhind'] = atanhind
        Atanh1(atanhobj, function () {
          NatLog(atanhobj, function () {
            Atanh2(atanhobj, function () {
              NatLog(atanhobj, function () {
                Atanh3(atanhobj)
              })
            })
          })
        })
      }
      self[atanhid].Format_showequation = 'atanh\\left(' + self[tempid].Format_showequation + '\\right)'
      self[atanhid].Format_showtype = 'builtin'
      this.Solution_temps.push(self[atanhid].Format_id)
      self[atanhid].Format_size = self[tempid].Format_size
      DOM_Object[atanhid]['real'] = self[atanhid].Solution_real
      DOM_Object[atanhid]['size'] = self[atanhid]['Format_size']
      DOM_Object[atanhid]['imag']['0-0'] = 0
      SetModels('atanh', atanhid, tempid)
      self[pid].Solution_variable_array[pos] = atanhid
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Atanh1(atanhobj, callback) {
  if (self[atanhobj['tempid']].Solution_real[atanhobj['atanhind']] !== undefined) {
    atanhobj['real'] = self[atanhobj['tempid']].Solution_real[atanhobj['atanhind']]
  } else {
    atanhobj['real'] = self[atanhobj['tempid']].Solution_realdefault
  }
  if (self[atanhobj['tempid']].Solution_imag[atanhobj['atanhind']] !== undefined) {
    atanhobj['imag'] = self[atanhobj['tempid']].Solution_imag[atanhobj['atanhind']]
  } else {
    atanhobj['imag'] = self[atanhobj['tempid']].Solution_imagdefault
  }
  atanhobj['orig_real'] = atanhobj['real']
  atanhobj['orig_imag'] = atanhobj['imag']
  atanhobj['real'] = ToNum(parseFloat(atanhobj['real']) + 1)
  atanhobj['imag'] = ToNum(parseFloat(atanhobj['imag']))
  callback()
}
function Atanh2(atanhobj, callback) {
  atanhobj['nl1_real'] = atanhobj['real']
  atanhobj['nl1_imag'] = atanhobj['imag']
  atanhobj['real'] = ToNum(parseFloat(1 - atanhobj['orig_real']))
  atanhobj['imag'] = -atanhobj['orig_imag']
  callback()
}
function Atanh3(atanhobj, callback) {
  atanhobj['real'] = 0.5 * ToNum(atanhobj['nl1_real'] - atanhobj['real'])
  atanhobj['imag'] = 0.5 * ToNum(atanhobj['nl1_imag'] - atanhobj['imag'])
  self[atanhobj['atanhid']].Solution_real[atanhobj['atanhind']] = atanhobj['real']
  self[atanhobj['atanhid']].Solution_imag[atanhobj['atanhind']] = atanhobj['imag']
}
//---------------------------------------------------------------------------------------------------------//

/*
	This function is the secant function. It is defined as 1/cos
*/
Equation.prototype.sec = function (replacetext, pid, pos, callback) {
  var real = 0,
    imag = 0,
    cos_real = 0,
    cos_imag = 0,
    thisid = '',
    flag = 0
  replacetext = replacetext.replace(/^sec\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'sec')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'sec')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'sec', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var secid = CreateEq(this.fileid, 0, eqobj)
      var secobj = { tempid: tempid, secid: secid, secind: 0, parentid: this.Format_id }
      for (var secind in self[tempid].Solution_real) {
        secobj['secind'] = secind
        Secant1(secobj, function () {
          Secant2(secobj, function () {
            DivideComplex(secobj, function () {
              Secant3(secobj)
            })
          })
        })
      }
      self[secid].Format_showequation = 'sec \\left(' + self[tempid].Format_showequation + ' \\right)'
      this.Solution_temps.push(self[secid].Format_id)
      self[secid].Format_size = self[tempid].Format_size
      DOM_Object[secid]['real'] = self[secid].Solution_real
      DOM_Object[secid]['size'] = self[secid]['Format_size']
      DOM_Object[secid]['imag']['0-0'] = 0
      SetModels('sec', secid, tempid)
      self[pid].Solution_variable_array[pos] = secid
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Secant1(secobj, callback) {
  if (self[secobj['tempid']].Solution_real[secobj['secind']] !== undefined) {
    secobj['real'] = self[secobj['tempid']].Solution_real[secobj['secind']]
  } else {
    secobj['real'] = self[secobj['tempid']].Solution_realdefault
  }
  if (self[secobj['tempid']].Solution_imag[secobj['secind']] !== undefined) {
    secobj['imag'] = self[secobj['tempid']].Solution_imag[secobj['secind']]
  } else {
    secobj['imag'] = self[secobj['tempid']].Solution_imagdefault
  }
  callback()
}
function Secant2(secobj, callback) {
  secobj['denreal'] = ToNum(Math.cos(secobj['real']) * 0.5 * (Math.exp(secobj['imag']) + Math.exp(-secobj['imag'])))
  secobj['denimag'] = ToNum(Math.sin(secobj['real']) * 0.5 * (Math.exp(secobj['imag']) - Math.exp(-secobj['imag'])))
  secobj['numreal'] = 1
  secobj['numimag'] = 0
  callback()
}
function Secant3(secobj) {
  self[secobj['secid']].Solution_real[secobj['secind']] = secobj['real']
  self[secobj['secid']].Solution_imag[secobj['secind']] = -secobj['imag']
}
/*
	This is the cosecant function. It is csc=1/sin
*/
Equation.prototype.csc = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^csc\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'csc')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'csc')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'csc', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var cscid = CreateEq(this.fileid, 0, eqobj)
      var cscobj = { tempid: tempid, cscid: cscid, cscind: 0, parentid: this.Format_id }
      for (var cscind in self[tempid].Solution_real) {
        cscobj['cscind'] = cscind
        Cosecant1(cscobj, function () {
          Cosecant2(cscobj, function () {
            DivideComplex(cscobj, function () {
              Cosecant3(cscobj)
            })
          })
        })
      }
      self[cscid].Format_showequation = 'csc \\left(' + self[tempid].Format_showequation + ' \\right)'
      this.Solution_temps.push(self[cscid].Format_id)
      self[cscid].Format_size = self[tempid].Format_size
      DOM_Object[cscid]['real'] = self[cscid].Solution_real
      DOM_Object[cscid]['size'] = self[cscid]['Format_size']
      DOM_Object[cscid]['imag']['0-0'] = 0
      SetModels('csc', cscid, tempid)
      self[pid].Solution_variable_array[pos] = cscid
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Cosecant1(cscobj, callback) {
  if (self[cscobj['tempid']].Solution_real[cscobj['cscind']] !== undefined) {
    cscobj['real'] = self[cscobj['tempid']].Solution_real[cscobj['cscind']]
  } else {
    cscobj['real'] = self[cscobj['tempid']].Solution_realdefault
  }
  if (self[cscobj['tempid']].Solution_imag[cscobj['cscind']] !== undefined) {
    cscobj['imag'] = self[cscobj['tempid']].Solution_imag[cscobj['cscind']]
  } else {
    cscobj['imag'] = self[cscobj['tempid']].Solution_imagdefault
  }
  callback()
}
function Cosecant2(cscobj, callback) {
  cscobj['denreal'] = ToNum(Math.sin(cscobj['real']) * 0.5 * (Math.exp(cscobj['imag']) + Math.exp(-cscobj['imag'])))
  cscobj['denimag'] = ToNum(-Math.cos(cscobj['real']) * 0.5 * (Math.exp(cscobj['imag']) - Math.exp(-cscobj['imag'])))
  cscobj['numreal'] = 1
  cscobj['numimag'] = 0
  callback()
}
function Cosecant3(cscobj) {
  self[cscobj['cscid']].Solution_real[cscobj['cscind']] = cscobj['real']
  self[cscobj['cscid']].Solution_imag[cscobj['cscind']] = -cscobj['imag']
}

/*
	This is the cotangent function. It is defined as 1/tan
*/
Equation.prototype.cot = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^cot\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'cot')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'cot')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'cot', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var cotid = CreateEq(this.fileid, 0, eqobj)
      var cotobj = { tempid: tempid, cotid: cotid, cotind: 0, parentid: this.Format_id }
      for (var cotind in self[tempid].Solution_real) {
        cotobj['cotind'] = cotind
        Cotangent1(cotobj, function () {
          Cotangent2(cotobj, function () {
            DivideComplex(cotobj, function () {
              Cotangent3(cotobj, function () {
                DivideComplex(cotobj, function () {
                  Cotangent4(cotobj, function () {})
                })
              })
            })
          })
        })
      }
      self[cotid].Format_showequation = 'cot \\left(' + self[tempid].Format_showequation + ' \\right)'
      this.Solution_temps.push(self[cotid].Format_id)
      self[cotid].Format_size = self[tempid].Format_size
      DOM_Object[cotid]['real'] = self[cotid].Solution_real
      DOM_Object[cotid]['size'] = self[cotid]['Format_size']
      DOM_Object[cotid]['imag']['0-0'] = 0
      SetModels('cot', cotid, tempid)
      self[pid].Solution_variable_array[pos] = cotid
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Cotangent1(cotobj, callback) {
  if (self[cotobj['tempid']].Solution_real[cotobj['cotind']] !== undefined) {
    cotobj['real'] = self[cotobj['tempid']].Solution_real[cotobj['cotind']]
  } else {
    cotobj['real'] = self[cotobj['tempid']].Solution_realdefault
  }
  if (self[cotobj['tempid']].Solution_imag[cotobj['cotind']] !== undefined) {
    cotobj['imag'] = self[cotobj['tempid']].Solution_imag[cotobj['cotind']]
  } else {
    cotobj['imag'] = self[cotobj['tempid']].Solution_imagdefault
  }
  callback()
}
function Cotangent2(cotobj, callback) {
  cotobj['numreal'] = ToNum(Math.sin(cotobj['real']) * 0.5 * (Math.exp(cotobj['imag']) + Math.exp(-cotobj['imag'])))
  cotobj['numimag'] = ToNum(Math.cos(cotobj['real']) * 0.5 * (Math.exp(cotobj['imag']) - Math.exp(-cotobj['imag'])))
  cotobj['denreal'] = ToNum(Math.cos(cotobj['real']) * 0.5 * (Math.exp(cotobj['imag']) + Math.exp(-cotobj['imag'])))
  cotobj['denimag'] = ToNum(-Math.sin(cotobj['real']) * 0.5 * (Math.exp(cotobj['imag']) - Math.exp(-cotobj['imag'])))
  callback()
}
function Cotangent3(cotobj, callback) {
  cotobj['numreal'] = 1
  cotobj['numimag'] = 0
  cotobj['denreal'] = cotobj['real']
  cotobj['denimag'] = cotobj['imag']
  callback()
}
function Cotangent4(cotobj) {
  self[cotobj['cotid']].Solution_real[cotobj['cotind']] = cotobj['real']
  self[cotobj['cotid']].Solution_imag[cotobj['cotind']] = cotobj['imag']
}
/*
	This is the asec function which is pi/2 + i * ln[ sqrt(1-1/z^2) + i/z ]
*/
Equation.prototype.asec = function (replacetext, pid, pos, callback) {
  var real = 0,
    imag = 0,
    real1 = 0,
    imag1 = 0,
    real2 = 0,
    imag2 = 0,
    real3 = 0,
    tempid = '',
    imag3 = ''
  var id1 = '',
    id2 = '',
    id3 = '',
    id4 = '',
    id5 = '',
    baseid = '',
    finalid = '',
    flag = 0
  replacetext = replacetext.replace(/^asec\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'asec')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'asec')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'asec', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var asecid = CreateEq(this.fileid, 0, eqobj)
      var asecobj = { tempid: tempid, asecid: asecid, asecind: 0, parentid: this.Format_id }
      for (var asecind in self[tempid].Solution_real) {
        asecobj['asecind'] = asecind
        Asec1(asecobj, function () {
          DivideComplex(asecobj, function () {
            Asec2(asecobj, function () {
              DivideComplex(asecobj, function () {
                Asec3(asecobj, function () {
                  SquareRoot(asecobj, function () {
                    Asec4(asecobj, function () {
                      NatLog(asecobj, function () {
                        Asec5(asecobj)
                      })
                    })
                  })
                })
              })
            })
          })
        })
      }
      self[asecid].Format_showequation = 'asec \\left(' + self[tempid].Format_showequation + ' \\right)'
      self[asecid].Format_showtype = 'builtin'
      this.Solution_temps.push(self[asecid].Format_id)
      self[asecid].Format_size = self[tempid].Format_size
      DOM_Object[asecid]['real'] = self[asecid].Solution_real
      DOM_Object[asecid]['size'] = self[asecid]['Format_size']
      DOM_Object[asecid]['imag']['0-0'] = 0
      SetModels('asec', asecid, tempid)
      self[pid].Solution_variable_array[pos] = asecid
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Asec1(asecobj, callback) {
  if (self[asecobj['tempid']].Solution_real[asecobj['asecind']] !== undefined) {
    asecobj['orig_real'] = self[asecobj['tempid']].Solution_real[asecobj['asecind']]
  } else {
    asecobj['orig_real'] = self[asecobj['tempid']].Solution_realdefault
  }
  if (self[asecobj['tempid']].Solution_imag[asecobj['asecind']] !== undefined) {
    asecobj['orig_imag'] = self[asecobj['tempid']].Solution_imag[asecobj['asecind']]
  } else {
    asecobj['orig_imag'] = self[asecobj['tempid']].Solution_imagdefault
  }
  asecobj['real'] = asecobj['orig_real']
  asecobj['imag'] = asecobj['orig_imag']
  asecobj['denreal'] = asecobj['orig_real']
  asecobj['denimag'] = asecobj['orig_imag']
  asecobj['numreal'] = 0
  asecobj['numimag'] = 1
  callback()
}
function Asec2(asecobj, callback) {
  asecobj['div1_real'] = asecobj['real']
  asecobj['div1_imag'] = asecobj['imag']
  asecobj['denreal'] = asecobj['orig_real'] * asecobj['orig_real'] - asecobj['orig_imag'] * asecobj['orig_imag']
  asecobj['denimag'] = asecobj['orig_real'] * asecobj['orig_imag'] + asecobj['orig_imag'] * asecobj['orig_real']
  asecobj['numreal'] = 1
  asecobj['numimag'] = 0
  callback()
}
function Asec3(asecobj, callback) {
  asecobj['real'] = 1 - asecobj['real']
  asecobj['imag'] = -asecobj['imag']
  callback()
}
function Asec4(asecobj, callback) {
  asecobj['real'] = ToNum(parseFloat(asecobj['real']) + parseFloat(asecobj['div1_real']))
  asecobj['imag'] = ToNum(parseFloat(asecobj['imag']) + parseFloat(asecobj['div1_imag']))
  callback()
}
function Asec5(asecobj, callback) {
  self[asecobj['asecid']].Solution_real[asecobj['asecind']] = Math.PI / 2 - asecobj['imag']
  self[asecobj['asecid']].Solution_imag[asecobj['asecind']] = asecobj['real']
}
//---------------------------------------------------------------------------------------------------------//
//-------------------------------acsc=-i * log[ sqrt( 1 - 1/z^2) + i/z ]--------------------------------------------------------------------------//
Equation.prototype.acsc = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^acsc\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'acsc')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'acsc')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'acsc', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var acscid = CreateEq(this.fileid, 0, eqobj)
      var acscobj = { tempid: tempid, acscid: acscid, acscind: 0, parentid: this.Format_id }
      for (var acscind in self[tempid].Solution_real) {
        acscobj['acscind'] = acscind
        Acsc1(acscobj, function () {
          DivideComplex(acscobj, function () {
            Acsc2(acscobj, function () {
              DivideComplex(acscobj, function () {
                Acsc3(acscobj, function () {
                  SquareRoot(acscobj, function () {
                    Acsc4(acscobj, function () {
                      NatLog(acscobj, function () {
                        Acsc5(acscobj)
                      })
                    })
                  })
                })
              })
            })
          })
        })
      }
      self[acscid].Format_showequation = 'acsc \\left(' + self[tempid].Format_showequation + ' \\right)'
      self[acscid].Format_showtype = 'builtin'
      this.Solution_temps.push(self[acscid].Format_id)
      self[acscid].Format_size = self[tempid].Format_size
      DOM_Object[acscid]['real'] = self[acscid].Solution_real
      DOM_Object[acscid]['size'] = self[acscid]['Format_size']
      DOM_Object[acscid]['imag']['0-0'] = 0
      SetModels('acsc', acscid, tempid)
      self[pid].Solution_variable_array[pos] = acscid
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Acsc1(acscobj, callback) {
  if (self[acscobj['tempid']].Solution_real[acscobj['acscind']] !== undefined) {
    acscobj['orig_real'] = self[acscobj['tempid']].Solution_real[acscobj['acscind']]
  } else {
    acscobj['orig_real'] = self[acscobj['tempid']].Solution_realdefault
  }
  if (self[acscobj['tempid']].Solution_imag[acscobj['acscind']] !== undefined) {
    acscobj['orig_imag'] = self[acscobj['tempid']].Solution_imag[acscobj['acscind']]
  } else {
    acscobj['orig_imag'] = self[acscobj['tempid']].Solution_imagdefault
  }
  acscobj['real'] = acscobj['orig_real']
  acscobj['imag'] = acscobj['orig_imag']
  acscobj['denreal'] = acscobj['orig_real']
  acscobj['denimag'] = acscobj['orig_imag']
  acscobj['numreal'] = 0
  acscobj['numimag'] = 1
  callback()
}
function Acsc2(acscobj, callback) {
  acscobj['div1_real'] = acscobj['real']
  acscobj['div1_imag'] = acscobj['imag']
  acscobj['denreal'] = acscobj['orig_real'] * acscobj['orig_real'] - acscobj['orig_imag'] * acscobj['orig_imag']
  acscobj['denimag'] = acscobj['orig_real'] * acscobj['orig_imag'] + acscobj['orig_imag'] * acscobj['orig_real']
  acscobj['numreal'] = 1
  acscobj['numimag'] = 0
  callback()
}
function Acsc3(acscobj, callback) {
  var real = 1 - acscobj['real']
  var imag = -acscobj['imag']
  acscobj['real'] = real
  acscobj['imag'] = imag
  callback()
}
function Acsc4(acscobj, callback) {
  var real = acscobj['real'] + acscobj['div1_real']
  var imag = acscobj['imag'] + acscobj['div1_imag']
  acscobj['real'] = real
  acscobj['imag'] = imag
  callback()
}
function Acsc5(acscobj, callback) {
  self[acscobj['acscid']].Solution_real[acscobj['acscind']] = acscobj['imag']
  self[acscobj['acscid']].Solution_imag[acscobj['acscind']] = -acscobj['real']
}
//---------------------------------------------------------------------------------------------------------//

//-------------------------------acot=0.5 * i * [ log[(1-i/z)] - log[(1+i/z)] ]--------------------------------------------------------------------------//
Equation.prototype.acot = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^acot\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'acot')
    flag = 1
  }
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'acot')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'acot', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var acotid = CreateEq(this.fileid, 0, eqobj)
      self[acotid] = new Equation(acotid)
      var acotobj = { tempid: tempid, acotid: acotid, acotind: 0, parentid: this.Format_id }
      for (var acotind in self[tempid].Solution_real) {
        acotobj['acotind'] = acotind
        Acot1(acotobj, function () {
          DivideComplex(acotobj, function () {
            Acot2(acotobj, function () {
              NatLog(acotobj, function () {
                Acot3(acotobj, function () {
                  NatLog(acotobj, function () {
                    Acot4(acotobj)
                  })
                })
              })
            })
          })
        })
      }
      self[acotid].Format_showequation = 'acot \\left(' + self[tempid].Format_showequation + ' \\right)'
      self[acotid].Format_showtype = 'builtin'
      this.Solution_temps.push(self[acotid].Format_id)
      self[acotid].Format_size = self[tempid].Format_size
      DOM_Object[acotid]['real'] = self[acotid].Solution_real
      DOM_Object[acotid]['imag'] = self[acotid].Solution_imag
      DOM_Object[acotid]['size'] = self[acotid]['Format_size']
      SetModels('acot', acotid, tempid)
      self[pid].Solution_variable_array[pos] = acotid
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Acot1(acotobj, callback) {
  if (self[acotobj['tempid']].Solution_real[acotobj['acotind']] !== undefined) {
    acotobj['orig_real'] = self[acotobj['tempid']].Solution_real[acotobj['acotind']]
  } else {
    acotobj['orig_real'] = self[acotobj['tempid']].Solution_realdefault
  }
  if (self[acotobj['tempid']].Solution_imag[acotobj['acotind']] !== undefined) {
    acotobj['orig_imag'] = self[acotobj['tempid']].Solution_imag[acotobj['acotind']]
  } else {
    acotobj['orig_imag'] = self[acotobj['tempid']].Solution_imagdefault
  }
  acotobj['real'] = acotobj['orig_real']
  acotobj['imag'] = acotobj['orig_imag']
  acotobj['denreal'] = acotobj['orig_real']
  acotobj['denimag'] = acotobj['orig_imag']
  acotobj['numreal'] = 0
  acotobj['numimag'] = 1
  callback()
}
function Acot2(acotobj, callback) {
  acotobj['div1_real'] = acotobj['real']
  acotobj['div1_imag'] = acotobj['imag']
  acotobj['real'] = 1 - acotobj['div1_real']
  acotobj['imag'] = -acotobj['div1_imag']
  callback()
}
function Acot3(acotobj, callback) {
  acotobj['log1_real'] = acotobj['real']
  acotobj['log1_imag'] = acotobj['imag']
  acotobj['real'] = 1 + acotobj['div1_real']
  acotobj['imag'] = acotobj['div1_imag']
  callback()
}
function Acot4(acotobj, callback) {
  var real = acotobj['log1_real'] - acotobj['real']
  var imag = acotobj['log1_imag'] - acotobj['imag']
  self[acotobj['acotid']].Solution_real[acotobj['acotind']] = -0.5 * imag
  self[acotobj['acotid']].Solution_imag[acotobj['acotind']] = 0.5 * real
}
//---------------------------------------------------------------------------------------------------------//

//--------------------------------- asech(z) = ln[ sqrt(1/z-1) * sqrt(1/z+1) + 1/z ] ------------------------------------------------------------------------//
Equation.prototype.asech = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^asech\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'asech')
    flag = 1
  }
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'asech')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'acosh', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var asechid = CreateEq(this.fileid, 0, eqobj)
      var asechobj = { tempid: tempid, asechid: asechid, asechind: 0, parentid: this.Format_id }
      for (var asechind in self[tempid].Solution_real) {
        asechobj['asechind'] = asechind
        Asech1(asechobj, function () {
          DivideComplex(asechobj, function () {
            Asech2(asechobj, function () {
              SquareRoot(asechobj, function () {
                Asech3(asechobj, function () {
                  SquareRoot(asechobj, function () {
                    Asech4(asechobj, function () {
                      NatLog(asechobj, function () {
                        Asech5(asechobj)
                      })
                    })
                  })
                })
              })
            })
          })
        })
      }
      self[asechid].Format_showequation = 'asech\\left(' + self[tempid].Format_showequation + '\\right)'
      self[asechid].Format_showtype = 'builtin'
      this.Solution_temps.push(self[asechid].Format_id)
      self[asechid].Format_size = self[tempid].Format_size
      DOM_Object[asechid]['real'] = self[asechid].Solution_real
      DOM_Object[asechid]['size'] = self[asechid]['Format_size']
      DOM_Object[asechid]['imag'] = self[asechid].Solution_imag
      SetModels('asech', asechid, tempid)
      self[pid].Solution_variable_array[pos] = asechid
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Asech1(asechobj, callback) {
  if (self[asechobj['tempid']].Solution_real[asechobj['asechind']] !== undefined) {
    asechobj['real'] = self[asechobj['tempid']].Solution_real[asechobj['asechind']]
  } else {
    asechobj['real'] = self[asechobj['tempid']].Solution_realdefault
  }
  if (self[asechobj['tempid']].Solution_imag[asechobj['asechind']] !== undefined) {
    asechobj['imag'] = self[asechobj['tempid']].Solution_imag[asechobj['asechind']]
  } else {
    asechobj['imag'] = self[asechobj['tempid']].Solution_imagdefault
  }
  asechobj['orig_real'] = asechobj['real']
  asechobj['orig_imag'] = asechobj['imag']
  asechobj['numreal'] = 1
  asechobj['numimag'] = 0
  asechobj['denreal'] = asechobj['real']
  asechobj['denimag'] = asechobj['imag']
  callback()
}
function Asech2(asechobj, callback) {
  asechobj['div_real'] = asechobj['real']
  asechobj['div_imag'] = asechobj['imag']
  asechobj['real'] = ToNum(parseFloat(asechobj['real']) - 1)
  callback()
}
function Asech3(asechobj, callback) {
  asechobj['sq1_real'] = asechobj['real']
  asechobj['sq1_imag'] = asechobj['imag']
  asechobj['real'] = ToNum(parseFloat(asechobj['div_real']) + 1)
  asechobj['imag'] = ToNum(parseFloat(asechobj['div_imag']))
  callback()
}
function Asech4(asechobj, callback) {
  var real = asechobj['real']
  var imag = asechobj['imag']
  asechobj['real'] =
    ToNum(asechobj['sq1_real'] * real) - ToNum(asechobj['sq1_imag'] * imag) + ToNum(asechobj['div_real'])
  asechobj['imag'] =
    ToNum(asechobj['sq1_real'] * imag) + ToNum(asechobj['sq1_imag'] * real) + ToNum(asechobj['div_imag'])
  callback()
}
function Asech5(asechobj, callback) {
  self[asechobj['asechid']].Solution_real[asechobj['asechind']] = asechobj['real']
  self[asechobj['asechid']].Solution_imag[asechobj['asechind']] = asechobj['imag']
}
//---------------------------------------------------------------------------------------------------------//

//--------------------------- acsch(z) = ln[ sqrt(1+1/z^2) + 1/z] ------------------------------------------------------------------------------//
Equation.prototype.acsch = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^acsch\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'acsch')
    flag = 1
  }
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'acsch')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'acosh', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var acschid = CreateEq(this.fileid, 0, eqobj)
      var acschobj = { tempid: tempid, acschid: acschid, acschind: 0, parentid: this.Format_id }
      for (var acschind in self[tempid].Solution_real) {
        acschobj['acschind'] = acschind
        Acsch1(acschobj, function () {
          SquareComplex(acschobj, function () {
            Acsch2(acschobj, function () {
              DivideComplex(acschobj, function () {
                Acsch3(acschobj, function () {
                  SquareRoot(acschobj, function () {
                    Acsch4(acschobj, function () {
                      DivideComplex(acschobj, function () {
                        Acsch5(acschobj, function () {
                          NatLog(acschobj, function () {
                            Acsch6(acschobj)
                          })
                        })
                      })
                    })
                  })
                })
              })
            })
          })
        })
      }
      self[acschid].Format_showequation = 'acsch\\left(' + self[tempid].Format_showequation + '\\right)'
      self[acschid].Format_showtype = 'builtin'
      this.Solution_temps.push(self[acschid].Format_id)
      self[acschid].Format_size = self[tempid].Format_size
      DOM_Object[acschid]['real'] = self[acschid].Solution_real
      DOM_Object[acschid]['size'] = self[acschid]['Format_size']
      DOM_Object[acschid]['imag']['0-0'] = 0
      SetModels('acsch', acschid, tempid)
      self[pid].Solution_variable_array[pos] = acschid
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Acsch1(acschobj, callback) {
  if (self[acschobj['tempid']].Solution_real[acschobj['acschind']] !== undefined) {
    acschobj['real'] = self[acschobj['tempid']].Solution_real[acschobj['acschind']]
  } else {
    acschobj['real'] = self[acschobj['tempid']].Solution_realdefault
  }
  if (self[acschobj['tempid']].Solution_imag[acschobj['acschind']] !== undefined) {
    acschobj['imag'] = self[acschobj['tempid']].Solution_imag[acschobj['acschind']]
  } else {
    acschobj['imag'] = self[acschobj['tempid']].Solution_imagdefault
  }
  acschobj['orig_real'] = acschobj['real']
  acschobj['orig_imag'] = acschobj['imag']
  callback()
}
function Acsch2(acschobj, callback) {
  acschobj['numreal'] = 1
  acschobj['numimag'] = 0
  acschobj['denreal'] = acschobj['real']
  acschobj['denimag'] = acschobj['imag']
  callback()
}
function Acsch3(acschobj, callback) {
  acschobj['real'] = acschobj['real'] + 1
  callback()
}
function Acsch4(acschobj, callback) {
  acschobj['sqrtreal'] = acschobj['real']
  acschobj['sqrtimag'] = acschobj['imag']
  acschobj['numreal'] = 1
  acschobj['numimag'] = 0
  acschobj['denreal'] = acschobj['orig_real']
  acschobj['denimag'] = acschobj['orig_imag']
  callback()
}
function Acsch5(acschobj, callback) {
  acschobj['real'] = acschobj['sqrtreal'] + acschobj['real']
  acschobj['imag'] = acschobj['sqrtimag'] + acschobj['imag']
  callback()
}
function Acsch6(acschobj, callback) {
  self[acschobj['acschid']].Solution_real[acschobj['acschind']] = acschobj['real']
  self[acschobj['acschid']].Solution_imag[acschobj['acschind']] = acschobj['imag']
}
//---------------------------------------------------------------------------------------------------------//

//------------------------------- acoth(z) = 0.5 * [ ln(1+1/z) - ln(1-1/z)] --------------------------------------------------------------------------//
//------------------------------- acoth(z) = 0.5 * [ ln((z+1)/(z-1))] --------------------------------------------------------------------------//
Equation.prototype.acoth = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^acoth\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'acoth')
    flag = 1
  }
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'acoth')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (self[tempid]['Units_units'] !== '' && self[tempid]['Units_units'] !== 'rad') {
      Set_Error(this.Original_id, 'Trig2', 'acosh', self[tempid]['Units_units'])
      flag = 1
    }
    if (flag == 0) {
      var acothid = CreateEq(this.fileid, 0, eqobj)
      var acothobj = { tempid: tempid, acothid: acothid, acothind: 0, parentid: this.Format_id }
      for (var acothind in self[tempid].Solution_real) {
        acothobj['acothind'] = acothind
        Acoth1(acothobj, function () {
          DivideComplex(acothobj, function () {
            NatLog(acothobj, function () {
              Acoth2(acothobj)
            })
          })
        })
      }
      self[acothid].Format_showequation = 'acoth\\left(' + self[tempid].Format_showequation + '\\right)'
      self[acothid].Format_showtype = 'builtin'
      this.Solution_temps.push(self[acothid].Format_id)
      self[acothid].Format_size = self[tempid].Format_size
      DOM_Object[acothid]['real'] = self[acothid].Solution_real
      DOM_Object[acothid]['imag'] = self[acothid].Solution_imag
      DOM_Object[acothid]['size'] = self[acothid]['Format_size']
      SetModels('acoth', acothid, tempid)
      self[pid].Solution_variable_array[pos] = acothid
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Acoth1(acothobj, callback) {
  if (self[acothobj['tempid']].Solution_real[acothobj['acothind']] !== undefined) {
    acothobj['real'] = self[acothobj['tempid']].Solution_real[acothobj['acothind']]
  } else {
    acothobj['real'] = self[acothobj['tempid']].Solution_realdefault
  }
  if (self[acothobj['tempid']].Solution_imag[acothobj['acothind']] !== undefined) {
    acothobj['imag'] = self[acothobj['tempid']].Solution_imag[acothobj['acothind']]
  } else {
    acothobj['imag'] = self[acothobj['tempid']].Solution_imagdefault
  }
  acothobj['orig_real'] = acothobj['real']
  acothobj['orig_imag'] = acothobj['imag']
  acothobj['numreal'] = parseFloat(acothobj['real']) + 1
  acothobj['numimag'] = acothobj['imag']
  acothobj['denreal'] = parseFloat(acothobj['real']) - 1
  acothobj['denimag'] = acothobj['imag']
  callback()
}

function Acoth2(acothobj) {
  var real = 0.5 * acothobj['real']
  var imag = 0.5 * acothobj['imag']
  self[acothobj['acothid']].Solution_real[acothobj['acothind']] = real
  self[acothobj['acothid']].Solution_imag[acothobj['acothind']] = imag
}
//---------------------------------------------------------------------------------------------------------//

/*
//------------------------------- acoth(z) = 0.5 * [ ln(1+1/z) - ln(1-1/z)] --------------------------------------------------------------------------//
Equation.prototype.acoth = function(replacetext, pid, pos, callback)
{	var flag=0;
	replacetext=replacetext.replace(/^acoth\(/,"");
	replacetext=replacetext.replace(/\)$/,"");
	var inputarray=InputArray(replacetext);
	if (inputarray.length>1) { Set_Error(this.Original_id, "Trig1", inputarray.length, "acoth"); flag=1;}
	if (inputarray.length===0) { Set_Error(this.Original_id, "NoEntry", "acoth"); flag=1; }
	if (flag==0)
	{	var eqobj={Page_position:DOM_Object[this.Format_id]['location'], Format_showtype:"InnerFunction",
			Original_id:this.Original_id, equation:"TempEq="+inputarray[0]};
		var tempid=CreateEq(this.fileid, 1, eqobj);
		if ((self[tempid]['Units_units']!=='')&&(self[tempid]['Units_units']!=='rad')) 
		{ Set_Error(this.Original_id, "Trig2", "acosh", self[tempid]['Units_units']); flag=1; }
		if (flag==0)
		{	var acothid=CreateEq(this.fileid, 0, eqobj);
			var acothobj = { tempid: tempid, acothid: acothid, acothind: 0, parentid:this.Format_id };
			for (var acothind in self[tempid].Solution_real)
			{	acothobj['acothind']=acothind;
				Acoth1(acothobj, function(){ 
				DivideComplex(acothobj, function() { 
				Acoth2(acothobj, function(){ 
				NatLog(acothobj, function(){ 
				Acoth3(acothobj, function(){ 
				NatLog(acothobj, function(){ 
				Acoth4(acothobj) })})})})})});
			}
			self[acothid].Format_showequation="acoth\\left("+self[tempid].Format_showequation+"\\right)";
			self[acothid].Format_showtype="builtin";
			this.Solution_temps.push(self[acothid].Format_id);
			self[acothid].Format_size=self[tempid].Format_size;
			DOM_Object[acothid]['real']=self[acothid].Solution_real;
			DOM_Object[acothid]['size']=self[acothid]['Format_size'];
			DOM_Object[acothid]['imag']['0-0']=0;
			SetModels("acoth", acothid, tempid);
			self[pid].Solution_variable_array[pos]=acothid;
			self[pid].Solution_variable_array.splice(parseInt(pos, 10)+1,1);
	}	}
	self[pid].Remove_BuiltInEquations(parseInt(pos, 10)+1, callback);
}
function Acoth1(acothobj, callback)
{	if (self[acothobj['tempid']].Solution_real[acothobj['acothind']]!==undefined) 
	{		acothobj['real']=self[acothobj['tempid']].Solution_real[acothobj['acothind']];
	}else {	acothobj['real']=self[acothobj['tempid']].Solution_realdefault;	} 
	if (self[acothobj['tempid']].Solution_imag[acothobj['acothind']]!==undefined) 
	{		acothobj['imag']=self[acothobj['tempid']].Solution_imag[acothobj['acothind']];
	}else {	acothobj['imag']=self[acothobj['tempid']].Solution_imagdefault;	} 
	acothobj['orig_real']=acothobj['real'];		acothobj['orig_imag']=acothobj['imag'];
	acothobj['numreal']=1;						acothobj['numimag']=0;
	acothobj['denreal']=acothobj['real'];		acothobj['denimag']=acothobj['imag'];
	callback();
}    
function Acoth2(acothobj, callback)
{	
	acothobj['divreal']=acothobj['real']; acothobj['divimag']=acothobj['imag'];
	acothobj['real']=ToNum(parseFloat(acothobj['real'])+1); 
	callback();
}    
function Acoth3(acothobj, callback)
{	acothobj['nlreal']=acothobj['real']; acothobj['nlimag']=acothobj['imag'];
	acothobj['real']=1-acothobj['divreal'];	acothobj['imag']=acothobj['divimag'];
	callback();
}    
function Acoth4(acothobj, callback)
{	var real=0.5*acothobj['nlreal']-acothobj['real']; 
	var imag=0.5*acothobj['nlimag']-acothobj['imag'];
	self[acothobj['acothid']].Solution_real[acothobj['acothind']]=real;
	self[acothobj['acothid']].Solution_imag[acothobj['acothind']]=imag;
}
//---------------------------------------------------------------------------------------------------------//
*/

//-------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------------- MATH FUNCTION - ROOT --------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.root = function (text, pid, pos, callback) {
  var base_real = 0
  var base_imag = 0
  var exp_real = 0
  var exp_imag = 0
  var replacetext = text.replace(/^\s+|\s+$/g, '')
  replacetext = replacetext.replace(/^root\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'root')
  }
  if (inputarray.length < 2) {
    Set_Error(this.Original_id, 'Root1')
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'Root2')
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  if (self[id1].Units_units !== '') {
    Set_Error(this.Original_id, 'Root3')
  }

  if (self[id1].Format_size == '1x1') {
    if (self[id1].Solution_real['0-0'] === undefined) {
      exp_real = 0
    } else {
      exp_real = self[id1].Solution_real['0-0']
    }
    if (self[id1].Solution_imag['0-0'] === undefined) {
      exp_imag = 0
    } else {
      exp_imag = self[id1].Solution_imag['0-0']
    }
    var eflag = 0
  } else {
    var eflag = 1
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[1]
  }
  var id2 = CreateEq(this.fileid, 1, eqobj)
  if (self[id1].Format_size != self[id2].Format_size && self[id1].Format_size != '1x1') {
    Set_Error(this.Original_id, 'Power4')
  }
  if (self[id1].Solution_imag['0-0'] !== undefined && self[id1].Solution_imag['0-0'] != 0) {
    Set_Error(this.Original_id, 'Power6')
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var id = CreateEq(this.fileid, 0, eqobj)

  for (var i in self[id2].Solution_real) {
    if (self[id2].Solution_real[i] === undefined) {
      base_real = self[id2].Solution_realdefault
    } else {
      base_real = parseFloat(self[id2].Solution_real[i])
    }
    if (self[id2].Solution_imag[i] === undefined) {
      base_imag = self[id2].Solution_imagdefault
    } else {
      base_imag = parseFloat(self[id2].Solution_imag[i])
    }
    if (eflag == 1) {
      if (self[id1].Solution_real[i] === undefined) {
        exp_real = self[id1].Solution_realdefault
      } else {
        exp_real = parseFloat(self[id1].Solution_real[i])
      }
      if (self[id1].Solution_imag[i] === undefined) {
        exp_imag = self[id1].Solution_imagdefault
      } else {
        exp_imag = parseFloat(self[id1].Solution_imag[i])
      }
    }
    var r = ToNum(Math.pow(Math.pow(base_real, 2) + Math.pow(base_imag, 2), 0.5))
    if (base_real === 0 && base_imag > 0) {
      var theta = Math.PI / 2
    } else if (base_real === 0 && base_imag < 0) {
      var theta = -Math.PI / 2
    } else if (base_imag === 0 && base_real > 0) {
      var theta = 0
    } else if (base_imag === 0 && base_real < 0) {
      var theta = Math.PI
    } else {
      var theta = Math.atan2(base_imag, base_real)
    }
    var num = ToNum(Math.pow(r, exp_real) * Math.exp(-exp_imag * theta))
    if (r === 0) {
      self[id].Solution_real[i] = 0
      self[id].Solution_imag[i] = 0
    } else {
      self[id].Solution_real[i] = ToNum(Math.pow(r, parseFloat(1 / exp_real)) * Math.cos(theta / exp_real))
      self[id].Solution_imag[i] = ToNum(Math.pow(r, parseFloat(1 / exp_real)) * Math.sin(theta / exp_real))
    }
  }

  // Solve for the default
  var base_real = parseFloat(self[id2].Solution_realdefault)
  var base_imag = parseFloat(self[id2].Solution_imagdefault)
  var r = ToNum(Math.pow(Math.pow(base_real, 2) + Math.pow(base_imag, 2), 0.5))
  if (base_real === 0 && base_imag > 0) {
    var theta = Math.PI / 2
  } else if (base_real === 0 && base_imag < 0) {
    var theta = -Math.PI / 2
  } else if (base_imag === 0 && base_real > 0) {
    var theta = 0
  } else if (base_imag === 0 && base_real < 0) {
    var theta = Math.PI
  } else {
    var theta = Math.atan2(base_imag, base_real)
  }
  self[id].Solution_realdefault = ToNum(num * ToNum(Math.cos(exp_imag * Math.log(r) + exp_real * theta)))
  self[id].Solution_imagdefault = ToNum(num * ToNum(Math.sin(exp_imag * Math.log(r) + exp_real * theta)))
  self[id].Format_size = self[id2].Format_size
  if (self[id1].Units_units !== '') {
    Set_Error(this.Original_id, 'Root3')
  }
  for (var i in self[id2].Units_base_array) {
    self[id].Units_base_array[i] = (self[id2].Units_base_array[i] * 1) / exp_real
  }

  // Make sure that the units are a solid value
  for (var i in self[id].Units_base_array) {
    if (self[id].Units_base_array[i] % 1 !== 0 && i != 'rad') {
      Set_Error(this.Original_id, 'Root5', i)
    }
    if (self[id].Units_base_array[i] % 1 !== 0 && i == 'rad') {
      self[id].Units_base_array[i] = 0
    }
  }

  self[id].Recompose_Units()
  self[id].Get_My_BaseString()
  self[id].Format_showtype = 'builtin'
  self[id].Format_showequation = '\\sqrt[' + self[id1].Format_showequation + ']{' + self[id2].Format_showequation + '}'
  DOM_Object[id]['real'] = self[id].Solution_real
  DOM_Object[id]['size'] = self[id]['Format_size']
  DOM_Object[id]['imag']['0-0'] = 0
  DOM_Object[id]['units'] = self[id].Units_units
  SetModels('root', id, id1, id2)
  self[pid].Solution_variable_array[pos] = id
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------- TAKING A NUMBER TO THE NTH POWER --------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.power = function (text, pid, pos, callback) {
  // Establish the variables
  var base_real = 0
  var base_imag = 0
  var exp_real = 0
  var exp_imag = 0

  // Pull out the text sent to the function and create the input array
  //var replacetext=text.replace(/^\s+|\s+$/g, '');
  var replacetext = text.replace(/^power\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)

  // If there aren't the right number of inputs, set an error
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'power')
  }
  if (inputarray.length < 2) {
    Set_Error(this.Original_id, 'Power1')
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'Power2')
  }

  // Solve the exponential input and if there are units, set an error
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  if (self[id1].Units_units !== '') {
    Set_Error(this.Original_id, 'Power3')
  }

  // Solve the base input
  var eflag = 1
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[1]
  }
  var id2 = CreateEq(this.fileid, 1, eqobj)

  // The inputs must either be two matrices of equal size or a matrix raised to a single number
  if (
    self[id1].Format_size != self[id2].Format_size &&
    self[id1].Format_size != '1x1' &&
    self[id2].Format_size != '1x1'
  ) {
    Set_Error(this.Original_id, 'Power4')
  }

  // Create the equation to be returned
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var id = CreateEq(this.fileid, 0, eqobj)

  // The case where the exponent is a single number
  if (self[id1].Format_size == '1x1') {
    for (var i in self[id2].Solution_real) {
      // If there is not base at this index, use the default
      if (self[id2].Solution_real[i] === undefined) {
        base_real = self[id2].Solution_realdefault
      } else {
        base_real = parseFloat(self[id2].Solution_real[i])
      }
      if (self[id2].Solution_imag[i] === undefined) {
        base_imag = self[id2].Solution_imagdefault
      } else {
        base_imag = parseFloat(self[id2].Solution_imag[i])
      }
      if (isNaN(base_imag)) {
        base_imag = 0
      }

      if (eflag == 1) {
        if (self[id1].Solution_real['0-0'] === undefined) {
          exp_real = self[id1].Solution_realdefault
        } else {
          exp_real = parseFloat(self[id1].Solution_real['0-0'])
        }
        if (self[id1].Solution_imag['0-0'] === undefined) {
          exp_imag = self[id1].Solution_imagdefault
        } else {
          exp_imag = parseFloat(self[id1].Solution_imag['0-0'])
        }
      }

      // Set the base number to the sum of the squares of the real and imag
      var r = ToNum(Math.pow(Math.pow(base_real, 2) + Math.pow(base_imag, 2), 0.5))

      // Calculate theta
      if (base_real === 0 && base_imag > 0) {
        var theta = Math.PI / 2
      } else if (base_real === 0 && base_imag < 0) {
        var theta = -Math.PI / 2
      } else if (base_imag === 0 && base_real > 0) {
        var theta = 0
      } else if (base_imag === 0 && base_real < 0) {
        var theta = Math.PI
      } else {
        var theta = Math.atan2(base_imag, base_real)
      }
      var num = ToNum(Math.pow(r, exp_real) * Math.exp(-exp_imag * theta))

      // If r ended up being 0, set the return to zero
      if (r === 0) {
        self[id].Solution_real[i] = 0
        self[id].Solution_imag[i] = 0

        // calculate the final number for the power
      } else {
        self[id].Solution_real[i] = ToNum(num * ToNum(Math.cos(exp_imag * Math.log(r) + exp_real * theta)))
        self[id].Solution_imag[i] = ToNum(num * ToNum(Math.sin(exp_imag * Math.log(r) + exp_real * theta)))
      }
    }
    self[id].Format_size = self[id2].Format_size
  } else if (self[id2].Format_size == '1x1') {
    for (var i in self[id1].Solution_real) {
      if (self[id2].Solution_real['0-0'] === undefined) {
        base_real = self[id2].Solution_realdefault
      } else {
        base_real = parseFloat(self[id2].Solution_real['0-0'])
      }
      if (self[id2].Solution_imag['0-0'] === undefined) {
        base_imag = self[id2].Solution_imagdefault
      } else {
        base_imag = parseFloat(self[id2].Solution_imag['0-0'])
      }
      if (eflag == 1) {
        if (self[id1].Solution_real[i] === undefined) {
          exp_real = self[id1].Solution_realdefault
        } else {
          exp_real = parseFloat(self[id1].Solution_real[i])
        }
        if (self[id1].Solution_imag[i] === undefined) {
          exp_imag = self[id1].Solution_imagdefault
        } else {
          exp_imag = parseFloat(self[id1].Solution_imag[i])
        }
      }
      var r = ToNum(Math.pow(Math.pow(base_real, 2) + Math.pow(base_imag, 2), 0.5))
      if (base_real === 0 && base_imag > 0) {
        var theta = Math.PI / 2
      } else if (base_real === 0 && base_imag < 0) {
        var theta = -Math.PI / 2
      } else if (base_imag === 0 && base_real > 0) {
        var theta = 0
      } else if (base_imag === 0 && base_real < 0) {
        var theta = Math.PI
      } else {
        var theta = Math.atan2(base_imag, base_real)
      }
      var num = ToNum(Math.pow(r, exp_real) * Math.exp(-exp_imag * theta))
      if (r === 0) {
        self[id].Solution_real[i] = 0
        self[id].Solution_imag[i] = 0
      } else {
        self[id].Solution_real[i] = ToNum(num * ToNum(Math.cos(exp_imag * Math.log(r) + exp_real * theta)))
        self[id].Solution_imag[i] = ToNum(num * ToNum(Math.sin(exp_imag * Math.log(r) + exp_real * theta)))
      }
    }
    self[id].Format_size = self[id1].Format_size
  } else {
    for (var i in self[id1].Solution_real) {
      if (self[id2].Solution_real[i] === undefined) {
        base_real = self[id2].Solution_realdefault
      } else {
        base_real = parseFloat(self[id2].Solution_real[i])
      }
      if (self[id2].Solution_imag[i] === undefined) {
        base_imag = self[id2].Solution_imagdefault
      } else {
        base_imag = parseFloat(self[id2].Solution_imag[i])
      }
      if (eflag == 1) {
        if (self[id1].Solution_real[i] === undefined) {
          exp_real = self[id1].Solution_realdefault
        } else {
          exp_real = parseFloat(self[id1].Solution_real[i])
        }
        if (self[id1].Solution_imag[i] === undefined) {
          exp_imag = self[id1].Solution_imagdefault
        } else {
          exp_imag = parseFloat(self[id1].Solution_imag[i])
        }
      }
      var r = ToNum(Math.pow(Math.pow(base_real, 2) + Math.pow(base_imag, 2), 0.5))
      if (base_real === 0 && base_imag > 0) {
        var theta = Math.PI / 2
      } else if (base_real === 0 && base_imag < 0) {
        var theta = -Math.PI / 2
      } else if (base_imag === 0 && base_real > 0) {
        var theta = 0
      } else if (base_imag === 0 && base_real < 0) {
        var theta = Math.PI
      } else {
        var theta = Math.atan2(base_imag, base_real)
      }
      var num = ToNum(Math.pow(r, exp_real) * Math.exp(-exp_imag * theta))
      if (r === 0) {
        self[id].Solution_real[i] = 0
        self[id].Solution_imag[i] = 0
      } else {
        self[id].Solution_real[i] = ToNum(num * ToNum(Math.cos(exp_imag * Math.log(r) + exp_real * theta)))
        self[id].Solution_imag[i] = ToNum(num * ToNum(Math.sin(exp_imag * Math.log(r) + exp_real * theta)))
      }
    }
    self[id].Format_size = self[id1].Format_size
  }
  var base_real = parseFloat(self[id1].Solution_realdefault)
  var base_imag = parseFloat(self[id1].Solution_imagdefault)
  var r = ToNum(Math.pow(Math.pow(base_real, 2) + Math.pow(base_imag, 2), 0.5))
  if (base_real === 0 && base_imag > 0) {
    var theta = Math.PI / 2
  } else if (base_real === 0 && base_imag < 0) {
    var theta = -Math.PI / 2
  } else if (base_imag === 0 && base_real > 0) {
    var theta = 0
  } else if (base_imag === 0 && base_real < 0) {
    var theta = Math.PI
  } else {
    var theta = Math.atan2(base_imag, base_real)
  }
  self[id].Solution_realdefault = ToNum(num * ToNum(Math.cos(exp_imag * Math.log(r) + exp_real * theta)))
  self[id].Solution_imagdefault = ToNum(num * ToNum(Math.sin(exp_imag * Math.log(r) + exp_real * theta)))
  if (self[id1].Units_units !== '') {
    Set_Error(this.Original_id, 'Power3')
  }
  for (var i in self[id2].Units_base_array) {
    self[id].Units_base_array[i] = self[id2].Units_base_array[i] * exp_real
  }

  console.log('The base arrays for the three items are ...')
  console.log(self[id1].Units_base_array)
  console.log(self[id2].Units_base_array)
  console.log(self[id].Units_base_array)

  for (var i in self[id].Units_base_array) {
    if (self[id].Units_base_array[i] % 1 !== 0) {
      Set_Error(this.Original_id, 'Power5', i)
    }
  }
  self[id].Recompose_Units()
  self[id].Get_BaseString()
  self[id].Format_showtype = 'builtin'
  self[id].Format_showequation =
    '\\left(' + self[id2].Format_showequation + '\\right)^{' + self[id1].Format_showequation + '}'
  DOM_Object[id]['real'] = self[id].Solution_real
  DOM_Object[id]['size'] = self[id]['Format_size']
  DOM_Object[id]['imag']['0-0'] = 0
  DOM_Object[id]['units'] = self[id].Units_units
  SetModels('power', id, id1, id2)
  self[pid].Solution_variable_array[pos] = id
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//----------------------------------- NATURAL LOGARITHM ---------------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.ln = function (replacetext, pid, pos, callback) {
  replacetext = replacetext.replace(/^ln\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'ln')
  }
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'ln')
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var tempid = CreateEq(this.fileid, 1, eqobj)
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var lnid = CreateEq(this.fileid, 0, eqobj)
  var lnobj = { tempid: tempid, lnid: lnid, lnind: 0, parentid: this.Original_id }
  for (var lnind in self[tempid].Solution_real) {
    lnobj['lnind'] = lnind
    NL1(lnobj, function () {
      NatLog(lnobj, function () {
        NL2(lnobj, function () {})
      })
    })
  }
  self[lnid].Format_showequation = 'ln \\left(' + self[tempid].Format_showequation + ' \\right)'
  this.Solution_temps.push(self[lnid].Format_id)
  self[lnid].Format_size = self[tempid].Format_size
  self[lnid].Units_base_array = self[tempid].Units_base_array
  self[lnid].Units_units = self[tempid].Units_units
  self[lnid].Units_quantity = self[tempid].Units_quantity
  DOM_Object[lnid]['real'] = self[lnid].Solution_real
  DOM_Object[lnid]['size'] = self[lnid]['Format_size']
  DOM_Object[lnid]['imag']['0-0'] = 0
  DOM_Object[lnid]['units'] = self[lnid].Units_units
  SetModels('ln', lnid, tempid)
  self[pid].Solution_variable_array[pos] = lnid
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function NL1(lnobj, callback) {
  if (self[lnobj['tempid']].Solution_real[lnobj['lnind']] !== undefined) {
    lnobj['real'] = self[lnobj['tempid']].Solution_real[lnobj['lnind']]
  } else {
    lnobj['real'] = self[lnobj['tempid']].Solution_realdefault
  }
  if (self[lnobj['tempid']].Solution_imag[lnobj['lnind']] !== undefined) {
    lnobj['imag'] = self[lnobj['tempid']].Solution_imag[lnobj['lnind']]
  } else {
    lnobj['imag'] = self[lnobj['tempid']].Solution_imagdefault
  }
  if (lnobj['real'] === 0 && lnobj['imag'] === 0) {
    Set_Error(lnobj['parentid'], 'Log3')
  }
  callback()
}
function NL2(lnobj) {
  self[lnobj['lnid']].Solution_real[lnobj['lnind']] = lnobj['real']
  self[lnobj['lnid']].Solution_imag[lnobj['lnind']] = lnobj['imag']
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//--------------------------------------- Base 10 LOGARITHM -----------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.log10 = function (replacetext, pid, pos, callback) {
  replacetext = replacetext.replace(/^log10\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trig1', inputarray.length, 'log10')
  }
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'log10')
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var tempid = CreateEq(this.fileid, 1, eqobj)
  // var logid=Get_ID("Equation");
  // self[logid]=new Equation(logid);
  var logid = CreateEq(this.fileid, 0, eqobj)
  var logobj = { tempid: tempid, logid: logid, logind: 0, parentid: this.Format_id }
  for (var logind in self[tempid].Solution_real) {
    logobj['logind'] = logind
    TenLog1(logobj, function () {
      NatLog(logobj, function () {
        TenLog2(logobj, function () {
          NatLog(logobj, function () {
            TenLog3(logobj, function () {
              DivideComplex(logobj, function () {
                TenLog4(logobj)
              })
            })
          })
        })
      })
    })
  }
  self[logid].Format_showequation = 'Log10 \\left(' + self[tempid].Format_showequation + ' \\right)'
  this.Solution_temps.push(self[logid].Format_id)
  self[logid].Format_size = self[tempid].Format_size
  self[logid].Units_base_array = self[tempid].Units_base_array
  self[logid].Units_units = self[tempid].Units_units
  self[logid].Units_quantity = self[tempid].Units_quantity
  DOM_Object[logid]['real'] = self[logid].Solution_real
  DOM_Object[logid]['size'] = self[logid]['Format_size']
  DOM_Object[logid]['imag']['0-0'] = 0
  DOM_Object[logid]['units'] = self[logid].Units_units
  SetModels('log10', logid, tempid)
  self[pid].Solution_variable_array[pos] = logid
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function TenLog1(logobj, callback) {
  if (self[logobj['tempid']].Solution_real[logobj['logind']] !== undefined) {
    logobj['orig_real'] = self[logobj['tempid']].Solution_real[logobj['logind']]
  } else {
    logobj['orig_real'] = self[logobj['tempid']].Solution_realdefault
  }
  if (self[logobj['tempid']].Solution_imag[logobj['logind']] !== undefined) {
    logobj['orig_imag'] = self[logobj['tempid']].Solution_imag[logobj['logind']]
  } else {
    logobj['orig_imag'] = self[logobj['tempid']].Solution_imagdefault
  }
  logobj['real'] = 10
  logobj['imag'] = 0
  if (logobj['orig_real'] === 0 && logobj['orig_imag'] === 0) {
    Set_Error(logobj['parentid'], 'Log3')
  }
  callback()
}
function TenLog2(logobj, callback) {
  logobj['logreal'] = logobj['real']
  logobj['logimag'] = logobj['imag']
  logobj['real'] = logobj['orig_real']
  logobj['imag'] = logobj['orig_imag']
  callback()
}
function TenLog3(logobj, callback) {
  logobj['numreal'] = logobj['real']
  logobj['numimag'] = logobj['imag']
  logobj['denreal'] = logobj['logreal']
  logobj['denimag'] = logobj['logimag']
  callback()
}
function TenLog4(logobj) {
  self[logobj['logid']].Solution_real[logobj['logind']] = logobj['real']
  self[logobj['logid']].Solution_imag[logobj['logind']] = logobj['imag']
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//-------------------------------------------- LOGARITHM --------------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.log = function (replacetext, pid, pos, callback) {
  replacetext = replacetext.replace(/^log\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length < 2) {
    Set_Error(this.Original_id, 'Log1')
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'Log2')
  }
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'log')
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var logid = CreateEq(this.fileid, 1, eqobj)
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[1]
  }
  var baseid = CreateEq(this.fileid, 1, eqobj)
  var logobj = { logid: logid, baseid: baseid, logind: 0, parentid: this.Format_id }
  for (var logind in self[logid].Solution_real) {
    logobj['logind'] = logind
    Log1(logobj, function () {
      NatLog(logobj, function () {
        Log2(logobj, function () {
          NatLog(logobj, function () {
            Log3(logobj, function () {
              DivideComplex(logobj, function () {
                Log4(logobj)
              })
            })
          })
        })
      })
    })
  }
  self[logid].Format_showequation =
    'log \\left(' +
    self[logid].Format_showequation +
    ' ' +
    self[logid].Units_units +
    ',' +
    self[baseid].Format_showequation +
    ' ' +
    self[baseid].Units_units +
    ' \\right)'
  this.Solution_temps.push(self[logid].Format_id)
  // self[logid].Format_size=self[tempid].Format_size;
  // self[logid].Units_base_array=self[tempid].Units_base_array;
  // self[logid].Units_units=self[tempid].Units_units;
  // self[logid].Units_quantity=self[tempid].Units_quantity;
  DOM_Object[logid]['real'] = self[logid].Solution_real
  DOM_Object[logid]['size'] = self[logid]['Format_size']
  DOM_Object[logid]['imag'] = self[logid].Solution_imag
  DOM_Object[logid]['units'] = self[logid].Units_units
  SetModels('log', logid, logid)
  self[pid].Solution_variable_array[pos] = logid
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Log1(logobj, callback) {
  var index = ''
  if (self[logobj['logid']].Solution_real[logobj['logind']] !== undefined) {
    logobj['orig_real'] = self[logobj['logid']].Solution_real[logobj['logind']]
  } else {
    logobj['orig_real'] = self[logobj['logid']].Solution_realdefault
  }
  if (self[logobj['logid']].Solution_imag[logobj['logind']] !== undefined) {
    logobj['orig_imag'] = self[logobj['logid']].Solution_imag[logobj['logind']]
  } else {
    logobj['orig_imag'] = self[logobj['logid']].Solution_imagdefault
  }
  if (self[logobj['baseid']].Format_size == '1x1') {
    index = '0-0'
  } else {
    index = logobj['logind']
  }
  if (self[logobj['baseid']].Solution_real[index] !== undefined) {
    logobj['real'] = self[logobj['baseid']].Solution_real[index]
  } else {
    logobj['real'] = self[logobj['baseid']].Solution_realdefault
  }
  if (self[logobj['baseid']].Solution_imag[index] !== undefined) {
    logobj['imag'] = self[logobj['baseid']].Solution_imag[index]
  } else {
    logobj['imag'] = self[logobj['baseid']].Solution_imagdefault
  }
  if (logobj['orig_real'] === 0 && logobj['orig_imag'] === 0) {
    Set_Error(logobj['parentid'], 'Log3')
  }
  callback()
}
function Log2(logobj, callback) {
  logobj['logreal'] = logobj['real']
  logobj['logimag'] = logobj['imag']
  logobj['real'] = logobj['orig_real']
  logobj['imag'] = logobj['orig_imag']
  callback()
}
function Log3(logobj, callback) {
  logobj['numreal'] = logobj['real']
  logobj['numimag'] = logobj['imag']
  logobj['denreal'] = logobj['logreal']
  logobj['denimag'] = logobj['logimag']
  callback()
}
function Log4(logobj) {
  self[logobj['logid']].Solution_real[logobj['logind']] = logobj['real']
  self[logobj['logid']].Solution_imag[logobj['logind']] = logobj['imag']
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//--------------------------------------- MATH FUNCTION ABSOLUTE VALUE ------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.abs = function (replacetext, pid, pos, callback) {
  replacetext = replacetext.replace(/^abs\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Abs1')
  }
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'abs')
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id
  }
  var id = CreateEq(this.fileid, 0, eqobj)
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var tempid = CreateEq(this.fileid, 1, eqobj)
  for (var i in self[tempid].Solution_real) {
    if (self[tempid].Solution_real[i] !== '' || self[tempid].Solution_real[i] !== undefined) {
      if (
        self[tempid].Solution_imag[i] === '' ||
        self[tempid].Solution_imag[i] === undefined ||
        !isNumber(self[tempid].Solution_imag[i])
      ) {
        self[id].Solution_real[i] = Math.abs(self[tempid].Solution_real[i])
        self[id].Solution_imag[i] = 0
      } else {
        self[id].Solution_real[i] = ToNum(
          Math.sqrt(
            ToNum(Math.pow(self[tempid].Solution_real[i], 2)) + ToNum(Math.pow(self[tempid].Solution_imag[i], 2))
          )
        )
        self[id].Solution_imag[i] = 0
      }
    }
  }
  self[id].Format_showequation = '|' + self[tempid].Format_showequation + '|'
  self[id].Format_size = self[tempid].Format_size
  self[id].Units_base_array = self[tempid].Units_base_array
  self[id].Units_base_string = self[tempid].Units_base_string
  self[id].Units_units = self[tempid].Units_units
  self[id].Solution_realdefault = Math.sqrt(
    Math.pow(self[tempid].Solution_realdefault, 2) + Math.pow(self[tempid].Solution_imagdefault, 2)
  )
  self[id].Solution_imagdefault = 0
  this.Solution_temps.push(self[id].Format_id)
  SetModels('abs', id, tempid)
  DOM_Object[id]['real'] = self[id].Solution_real
  DOM_Object[id]['size'] = self[id]['Format_size']
  DOM_Object[id]['imag']['0-0'] = 0
  DOM_Object[id]['units'] = self[id].Units_units
  self[pid].Solution_variable_array[pos] = id
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

/*---------------------------------------------------------------------------------------------------------*/
/*-------------------------------------- MATH FUNCTION FLOOR ----------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------*/
/*	This function takes the floor of the result of any entry. When that entry has units, the algorithm		\
	automatically rounds the number after it has been converted to metric. The user has the option to enter	\
	a unit which the algorithm then matches and rounds to. Note that this rounding is done after any math	\
	within the floor function is solved.																	\
/*---------------------------------------------------------------------------------------------------------*/
Equation.prototype.floor = function (replacetext, pid, pos, callback) {
  replacetext = replacetext.replace(/^floor\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'Floor1')
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'Floor2')
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id
  }
  var id = CreateEq(this.fileid, 0, eqobj)
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var tempid = CreateEq(this.fileid, 1, eqobj)
  var flag = 0
  if (inputarray.length == 2) {
    flag = 1
    var this_unit = inputarray[1].replace(/^\s+|\s+$/g, '')
    if (scaleUnits[this_unit] !== undefined) {
      if (self[tempid].Units_quantity == scaleUnits[this_unit]['quantity']) {
        var mult = scaleUnits[this_unit]['conv_factor']
        for (var i in self[tempid].Solution_real) {
          self[id].Solution_real[i] = ToNum(mult * Math.floor(self[tempid].Solution_real[i] / mult))
        }
        for (var i in self[tempid].Solution_imag) {
          self[id].Solution_imag[i] = ToNum(mult * Math.floor(self[tempid].Solution_imag[i] / mult))
        }
      } else {
        flag = 0
      }
    } else {
      flag = 0
      Set_Error(this.Original_id, 'Floor3')
    }
  }
  if (flag == 0) {
    for (var i in self[tempid].Solution_real) {
      self[id].Solution_real[i] = Math.floor(self[tempid].Solution_real[i])
    }
    for (var i in self[tempid].Solution_imag) {
      self[id].Solution_imag[i] = Math.floor(self[tempid].Solution_imag[i])
    }
  }
  if (inputarray.length == 2) {
    self[id].Format_showequation =
      'floor\\left(' + self[tempid].Format_showequation + ', \\hspace{1mm}' + inputarray[1] + '\\right)'
  } else {
    self[id].Format_showequation = 'floor\\left(' + self[tempid].Format_showequation + '\\right)'
  }
  self[id].Units_base_array = self[tempid].Units_base_array
  self[id].Units_base_string = self[tempid].Units_base_string
  self[id].Units_units = self[tempid].Units_units
  self[id].Solution_realdefault = Math.floor(parseFloat(self[tempid].Solution_realdefault))
  self[id].Solution_imagdefault = Math.floor(parseFloat(self[tempid].Solution_imagdefault))
  DOM_Object[id]['real'] = self[id].Solution_real
  DOM_Object[id]['size'] = self[id]['Format_size']
  DOM_Object[id]['imag']['0-0'] = 0
  DOM_Object[id]['units'] = self[id].Units_units
  this.Solution_temps.push(self[id].Format_id)
  SetModels('floor', id, tempid)
  self[pid].Solution_variable_array[pos] = id
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//------------------------------------- MATH FUNCTION CEILING ---------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.ceil = function (replacetext, pid, pos, callback) {
  replacetext = replacetext.replace(/^ceil\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'Ceil1')
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'Ceil2')
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id
  }
  var id = CreateEq(this.fileid, 0, eqobj)
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var tempid = CreateEq(this.fileid, 1, eqobj)
  var flag = 0
  if (inputarray.length == 2) {
    flag = 1
    var this_unit = inputarray[1].replace(/^\s+|\s+$/g, '')
    if (scaleUnits[this_unit] !== undefined) {
      if (self[tempid].Units_quantity == scaleUnits[this_unit]['quantity']) {
        var mult = scaleUnits[this_unit]['conv_factor']
        for (var i in self[tempid].Solution_real) {
          self[id].Solution_real[i] = ToNum(mult * Math.ceil(self[tempid].Solution_real[i] / mult))
        }
        for (var i in self[tempid].Solution_imag) {
          self[id].Solution_imag[i] = ToNum(mult * Math.ceil(self[tempid].Solution_imag[i] / mult))
        }
      } else {
        flag = 0
      }
    } else {
      flag = 0
      Set_Error(this.Original_id, 'Ceil3')
    }
  }
  if (flag == 0) {
    for (var i in self[tempid].Solution_real) {
      self[id].Solution_real[i] = Math.ceil(self[tempid].Solution_real[i])
    }
    for (var i in self[tempid].Solution_imag) {
      self[id].Solution_imag[i] = Math.ceil(self[tempid].Solution_imag[i])
    }
  }
  if (inputarray.length == 2) {
    self[id].Format_showequation =
      'ceil\\left(' + self[tempid].Format_showequation + ',\\hspace{1mm} ' + inputarray[1] + '\\right)'
  } else {
    self[id].Format_showequation = 'ceil\\left(' + self[tempid].Format_showequation + '\\right)'
  }
  self[id].Units_base_array = self[tempid].Units_base_array
  self[id].Units_base_string = self[tempid].Units_base_string
  self[id].Units_units = self[tempid].Units_units
  self[id].Solution_realdefault = Math.ceil(parseFloat(self[tempid].Solution_realdefault))
  self[id].Solution_imagdefault = Math.ceil(parseFloat(self[tempid].Solution_imagdefault))
  DOM_Object[id]['real'] = self[id].Solution_real
  DOM_Object[id]['size'] = self[id]['Format_size']
  DOM_Object[id]['imag']['0-0'] = 0
  DOM_Object[id]['units'] = self[id].Units_units
  this.Solution_temps.push(self[id].Format_id)
  SetModels('ceil', id, tempid)
  self[pid].Solution_variable_array[pos] = id
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//--------------------------------------- MATH FUNCTION ROUND ---------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.round = function (replacetext, pid, pos, callback) {
  var multiplier = 0,
    umult = 1,
    temp = 0
  replacetext = replacetext.replace(/^round\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'round')
  }
  if (inputarray.length > 3) {
    Set_Error(this.Original_id, 'Round1')
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id
  }
  var id = CreateEq(this.fileid, 0, eqobj)
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var tempid = CreateEq(this.fileid, 1, eqobj)
  var flag = 0
  if (inputarray.length == 3) {
    flag = 1
    var this_unit = inputarray[2].replace(/^\s+|\s+$/g, '')
    if (scaleUnits[this_unit] !== undefined) {
      if (self[tempid].Units_quantity == scaleUnits[this_unit]['quantity']) {
        umult = scaleUnits[this_unit]['conv_factor']
      } else {
        flag = 0
      }
    } else {
      flag = 0
    }
  }
  if (inputarray.length == 2 || inputarray.length == 3) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[1]
    }
    var multid = CreateEq(this.fileid, 1, eqobj)
    multiplier = self[multid].Solution_real['0-0']
    if (multiplier % 1 != 0 || multiplier % 1 != -0) {
      Set_Error(this.Original_id, 'Round2')
    }
  } else {
    multiplier = 0
  }
  for (var i in self[tempid].Solution_real) {
    if (self[tempid].Solution_real[i] !== '' && self[tempid].Solution_real[i] !== undefined) {
      temp = Math.round(
        parseFloat(
          Big(self[tempid].Solution_real[i])
            .div(Big(umult))
            .times(Big(Math.pow(10, multiplier)))
        )
      )
      self[id].Solution_real[i] = parseFloat(Big(umult).times(Big(temp).div(Big(Math.pow(10, multiplier)))))
    }
    if (self[tempid].Solution_imag[i] !== '' && self[tempid].Solution_imag[i] !== undefined) {
      temp = Math.round(
        parseFloat(
          Big(self[tempid].Solution_imag[i])
            .div(Big(umult))
            .times(Big(Math.pow(10, multiplier)))
        )
      )
      self[id].Solution_imag[i] = parseFloat(Big(umult).times(Big(temp).div(Big(Math.pow(10, multiplier)))))
    }
  }
  if (inputarray.length === 1) {
    self[id].Format_showequation = 'round\\left(' + self[tempid].Format_showequation + '\\right)'
  }
  if (inputarray.length === 2) {
    self[id].Format_showequation =
      'round\\left(' + self[tempid].Format_showequation + ', \\hspace{1mm}' + inputarray[1] + '\\right)'
  }
  if (inputarray.length === 3) {
    self[id].Format_showequation =
      'round\\left(' +
      self[tempid].Format_showequation +
      ', \\hspace{1mm}' +
      inputarray[1] +
      ', \\hspace{1mm}' +
      inputarray[2] +
      '\\right)'
  }
  self[id].Units_base_array = self[tempid].Units_base_array
  self[id].Units_base_string = self[tempid].Units_base_string
  self[id].Units_units = self[tempid].Units_units
  self[id].Solution_realdefault = Math.round(
    parseFloat(Math.round(self[tempid].Solution_realdefault * Math.pow(10, multiplier)) / Math.pow(10, multiplier))
  )
  self[id].Solution_imagdefault = Math.round(
    parseFloat(Math.round(self[tempid].Solution_imagdefault * Math.pow(10, multiplier)) / Math.pow(10, multiplier))
  )
  DOM_Object[id]['real'] = self[id].Solution_real
  DOM_Object[id]['size'] = self[id]['Format_size']
  DOM_Object[id]['imag']['0-0'] = 0
  DOM_Object[id]['units'] = self[id].Units_units
  this.Solution_temps.push(self[id].Format_id)
  SetModels('round', id, tempid)
  self[pid].Solution_variable_array[pos] = id
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//-------------------------------- MATH FUNCTION MAX ------------------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.max = function (replacetext, pid, pos, callback) {
  replacetext = replacetext.replace(/^max\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var showeq = ''
  var num = ''
  var dim = ''
  var units = ''
  var quan = ''
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'Max1')
  }
  var nums = new Array()
  var thistext = ''
  for (var a = 0; a < inputarray.length; a = a + 1) {
    inputarray[a] = inputarray[a].replace(/^\s+|\s+$/g, '')
    if (isNumber(inputarray[a])) {
      nums.push(parseFloat(inputarray[a]))
      showeq = showeq + ', ' + inputarray[a]
      num = num + ', ' + inputarray[a]
      dim = dim + ', 1x1'
      units = units + ', NA'
      quan = quan + ', NA'
    } else if (inputarray[a].match('#Table')) {
      var numberarray = Get_Table_Elements(inputarray[a], 1)
      for (var b = 0; b < numberarray.length; b = b + 1) {
        nums.push(numberarray[b])
        showeq = showeq + ', ' + inputarray[a]
        num = num + ', ' + inputarray[a]
        dim = dim + ', 1x1'
        units = units + ', NA'
        quan = quan + ', NA'
      }
    } else {
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 1, eqobj)
      if (self[tempid].Format_size == '1x1') {
        nums.push(ToNum(self[tempid].Solution_real['0-0']))
      } else {
        for (var i in self[tempid].Solution_real) {
          nums.push(ToNum(self[tempid].Solution_real[i]))
        }
      }
      num = num + ', ' + self[tempid].Format_showequation
      dim = dim + ', ' + self[tempid].Format_size
      units = units + ', ' + self[tempid].Units_units
      quan = quan + ', ' + self[tempid].Units_quantity
      showeq = showeq + ', ' + self[tempid].Format_showequation
    }
  }
  showeq = showeq.replace(/^\,/, '')
  num = num.replace(/^\,/, '')
  dim = dim.replace(/^\,/, '')
  units = units.replace(/^\,/, '')
  quan = quan.replace(/^\,/, '')
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var id = CreateEq(this.fileid, 0, eqobj)
  self[id].Solution_real['0-0'] = Math.max.apply(null, nums)
  self[id].Format_showequation = 'max\\left(' + showeq + '\\right)'
  this.Solution_temps.push(self[id].Format_id)
  self[id].Models_numerical = 'max\\left(' + num + '\\right)'
  self[id].Models_dimensions = 'max\\left(' + dim + '\\right)'
  self[id].Models_quantities = 'max\\left(' + quan + '\\right)'
  self[id].Models_units = 'max\\left(' + units + '\\right)'
  DOM_Object[id]['real'] = self[id].Solution_real
  DOM_Object[id]['size'] = self[id]['Format_size']
  DOM_Object[id]['imag']['0-0'] = 0
  DOM_Object[id]['units'] = self[id].Units_units
  self[pid].Solution_variable_array[pos] = id
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

/*---------------------------------------------------------------------------------------------------------*/
/*---------------------------------- MATH FUNCTION MIN ----------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------*/
/*	This function looks for the minimum number in the set of numbers given. The function does not care 		\
	about units or comparing quantities. It passes through the units of any number.							\
/*---------------------------------------------------------------------------------------------------------*/
Equation.prototype.min = function (replacetext, pid, pos, callback) {
  replacetext = replacetext.replace(/^min\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var showeq = ''
  var num = ''
  var dim = ''
  var units = ''
  var quan = ''
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'Min1')
  }
  var nums = new Array()
  var thistext = ''
  for (var a = 0; a < inputarray.length; a = a + 1) {
    inputarray[a] = inputarray[a].replace(/^\s+|\s+$/g, '')
    if (isNumber(inputarray[a])) {
      nums.push(parseFloat(inputarray[a]))
      showeq = showeq + ', ' + inputarray[a]
      num = num + ', ' + inputarray[a]
      dim = dim + ', 1x1'
      units = units + ', NA'
      quan = quan + ', NA'
    } else if (inputarray[a].match('#Table')) {
      var numberarray = Get_Table_Elements(inputarray[a], 1)
      for (var b = 0; b < numberarray.length; b = b + 1) {
        nums.push(numberarray[b])
        showeq = showeq + ', ' + inputarray[a]
        num = num + ', ' + inputarray[a]
        dim = dim + ', 1x1'
        units = units + ', NA'
        quan = quan + ', NA'
      }
    } else {
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var id = CreateEq(this.fileid, 1, eqobj)
      if (self[id].Format_size == '1x1') {
        nums.push(ToNum(self[id].Solution_real['0-0']))
        showeq = showeq + ', ' + self[id].Format_showequation
        num = num + ', ' + self[id].Solution_real['0-0']
        dim = dim + ', 1x1'
        units = units + ', ' + self[id].Units_units
        quan = quan + ', ' + self[id].Units_quantity
      } else {
        for (var i in self[id].Solution_real) {
          nums.push(ToNum(self[id].Solution_real[i]))
        }
        num = num + ', ' + self[id].Format_showequation
        dim = dim + ', ' + self[id].Format_size
        units = units + ', ' + self[id].Units_units
        quan = quan + ', ' + self[id].Units_quantity
        showeq = showeq + ', ' + self[id].Format_showequation
      }
    }
  }
  showeq = showeq.replace(/^\,/, '')
  num = num.replace(/^\,/, '')
  dim = dim.replace(/^\,/, '')
  units = units.replace(/^\,/, '')
  quan = quan.replace(/^\,/, '')
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var id = CreateEq(this.fileid, 0, eqobj)
  self[id].Solution_real['0-0'] = Math.min.apply(null, nums)
  self[id].Format_showequation = 'min\\left(' + showeq + '\\right)'
  self[id].Models_numerical = 'min\\left(' + num + '\\right)'
  self[id].Models_dimensions = 'min\\left(' + dim + '\\right)'
  self[id].Models_quantities = 'min\\left(' + quan + '\\right)'
  self[id].Models_units = 'min\\left(' + units + '\\right)'
  DOM_Object[id]['real'] = self[id].Solution_real
  DOM_Object[id]['size'] = self[id]['Format_size']
  DOM_Object[id]['imag']['0-0'] = 0
  DOM_Object[id]['units'] = self[id].Units_units
  this.Solution_temps.push(self[id].Format_id)
  self[pid].Solution_variable_array[pos] = id
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//-------------------------------- MATH FUNCTION MAX - with units -----------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.maxu = function (replacetext, pid, pos, callback) {
  var basestring = ''
  var tempbasestring = ''
  replacetext = replacetext.replace(/^maxu\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var showeq = ''
  var num = ''
  var dim = ''
  var units = ''
  var quan = ''
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'Max1')
  }
  var nums = new Array()
  var thistext = ''
  for (var a = 0; a < inputarray.length; a = a + 1) {
    inputarray[a] = inputarray[a].replace(/^\s+|\s+$/g, '')
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[a]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (basestring === '') {
      basestring = self[tempid].Units_base_string
    } else {
      if (basestring != self[tempid].Units_base_string) {
        Set_Error(this.Original_id, 'Max2')
      }
    }
    if (self[tempid].Format_size == '1x1') {
      nums.push(self[tempid].Solution_real['0-0'])
      showeq = showeq + ', ' + self[tempid].Format_showequation
      num = num + ', ' + self[tempid].Solution_real['0-0']
      dim = dim + ', 1x1'
      units = units + ', ' + self[tempid].Units_units
      quan = quan + ', ' + self[tempid].Units_quantity
    } else {
      for (var i in self[tempid].Solution_real) {
        nums.push(self[tempid].Solution_real[i])
      }
      showeq = showeq + ', ' + self[tempid].Format_showequation
      num = num + ', ' + self[tempid].Solution_real['0-0']
      dim = dim + ', ' + self[tempid].Format_size
      units = units + ', ' + self[tempid].Units_units
      quan = quan + ', ' + self[tempid].Units_quantity
    }
    showeq = showeq.replace(/^\,/, '')
    num = num.replace(/^\,/, '')
    dim = dim.replace(/^\,/, '')
    units = units.replace(/^\,/, '')
    quan = quan.replace(/^\,/, '')
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var id = CreateEq(this.fileid, 0, eqobj)
  self[id].Units_units = self[tempid].Units_units
  self[id].Units_base_array = self[tempid].Units_base_array
  self[id].Units_base_string = self[tempid].Units_base_string
  self[id].Solution_real['0-0'] = Math.max.apply(null, nums)
  self[id].Format_showequation = 'maxu\\left(' + replacetext + '\\right)'
  this.Solution_temps.push(self[id].Format_id, tempid)
  self[id].Models_numerical = 'maxu\\left(' + num + '\\right)'
  self[id].Models_dimensions = 'maxu\\left(' + dim + '\\right)'
  self[id].Models_quantities = 'maxu\\left(' + quan + '\\right)'
  self[id].Models_units = 'maxu\\left(' + units + '\\right)'
  DOM_Object[id]['real'] = self[id].Solution_real
  DOM_Object[id]['size'] = self[id]['Format_size']
  DOM_Object[id]['imag']['0-0'] = 0
  DOM_Object[id]['units'] = self[id].Units_units
  self[pid].Solution_variable_array[pos] = id
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//-------------------------------- MATH FUNCTION MIN - with units -----------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.minu = function (replacetext, pid, pos, callback) {
  var basestring = ''
  var tempbasestring = ''
  replacetext = replacetext.replace(/^minu\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var showeq = ''
  var num = ''
  var dim = ''
  var units = ''
  var quan = ''
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'Min2')
  }
  var nums = new Array()
  var thistext = ''
  for (var a = 0; a < inputarray.length; a = a + 1) {
    inputarray[a] = inputarray[a].replace(/^\s+|\s+$/g, '')
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[a]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    if (basestring === '') {
      basestring = self[tempid].Units_base_string
    } else {
      if (basestring != self[tempid].Units_base_string) {
        Set_Error(this.Original_id, 'Min2')
      }
    }
    if (self[tempid].Format_size == '1x1') {
      nums.push(self[tempid].Solution_real['0-0'])
      showeq = showeq + ', ' + self[tempid].Format_showequation
      num = num + ', ' + self[tempid].Solution_real['0-0']
      dim = dim + ', 1x1'
      units = units + ', ' + self[tempid].Units_units
      quan = quan + ', ' + self[tempid].Units_quantity
    } else {
      for (var i in self[tempid].Solution_real) {
        nums.push(self[tempid].Solution_real[i])
      }
      showeq = showeq + ', ' + self[tempid].Format_showequation
      num = num + ', ' + self[tempid].Solution_real['0-0']
      dim = dim + ', ' + self[tempid].Format_size
      units = units + ', ' + self[tempid].Units_units
      quan = quan + ', ' + self[tempid].Units_quantity
    }
    showeq = showeq.replace(/^\,/, '')
    num = num.replace(/^\,/, '')
    dim = dim.replace(/^\,/, '')
    units = units.replace(/^\,/, '')
    quan = quan.replace(/^\,/, '')
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var id = CreateEq(this.fileid, 0, eqobj)
  self[id].Units_units = self[tempid].Units_units
  self[id].Units_base_array = self[tempid].Units_base_array
  self[id].Units_base_string = self[tempid].Units_base_string
  self[id].Solution_real['0-0'] = Math.min.apply(null, nums)
  self[id].Format_showequation = 'minu\\left(' + showeq + '\\right)'
  this.Solution_temps.push(self[id].Format_id)
  self[id].Models_numerical = 'minu\\left(' + num + '\\right)'
  self[id].Models_dimensions = 'minu\\left(' + dim + '\\right)'
  self[id].Models_quantities = 'minu\\left(' + quan + '\\right)'
  self[id].Models_units = 'minu\\left(' + units + '\\right)'
  DOM_Object[id]['real'] = self[id].Solution_real
  DOM_Object[id]['size'] = self[id]['Format_size']
  DOM_Object[id]['imag']['0-0'] = 0
  DOM_Object[id]['units'] = self[id].Units_units
  self[pid].Solution_variable_array[pos] = id
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//-------------------------------- MATH FUNCTION MAX INDEX ------------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.maxInd = function (replacetext, pid, pos, callback) {
  replacetext = replacetext.replace(/^maxInd\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var showeq = ''
  var num = ''
  var dim = ''
  var units = ''
  var quan = ''
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'Max1')
  }
  var nums = new Array()
  var thistext = ''
  for (var a = 0; a < inputarray.length; a = a + 1) {
    inputarray[a] = inputarray[a].replace(/^\s+|\s+$/g, '')
    if (isNumber(inputarray[a])) {
      nums.push(parseFloat(inputarray[a]))
      showeq = showeq + ', ' + inputarray[a]
      num = num + ', ' + inputarray[a]
      dim = dim + ', 1x1'
      units = units + ', NA'
      quan = quan + ', NA'
    } else if (inputarray[a].match('#Table')) {
      var numberarray = Get_Table_Elements(inputarray[a], 1)
      for (var b = 0; b < numberarray.length; b = b + 1) {
        nums.push(numberarray[b])
        showeq = showeq + ', ' + inputarray[a]
        num = num + ', ' + inputarray[a]
        dim = dim + ', 1x1'
        units = units + ', NA'
        quan = quan + ', NA'
      }
    } else {
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 1, eqobj)
      if (self[tempid].Format_size == '1x1') {
        nums.push(ToNum(self[tempid].Solution_real['0-0']))
      } else {
        for (var i in self[tempid].Solution_real) {
          nums.push(ToNum(self[tempid].Solution_real[i]))
        }
      }
      num = num + ', ' + self[tempid].Format_showequation
      dim = dim + ', ' + self[tempid].Format_size
      units = units + ', ' + self[tempid].Units_units
      quan = quan + ', ' + self[tempid].Units_quantity
      showeq = showeq + ', ' + self[tempid].Format_showequation
    }
  }

  // Find the max index
  var max = nums[0]
  var maxIndex = 0
  for (var i = 1; i < nums.length; i++) {
    if (nums[i] > max) {
      maxIndex = i
      max = nums[i]
    }
  }

  showeq = showeq.replace(/^\,/, '')
  num = num.replace(/^\,/, '')
  dim = dim.replace(/^\,/, '')
  units = units.replace(/^\,/, '')
  quan = quan.replace(/^\,/, '')
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var id = CreateEq(this.fileid, 0, eqobj)
  self[id].Solution_real['0-0'] = maxIndex
  self[id].Format_showequation = 'maxInd\\left(' + showeq + '\\right)'
  this.Solution_temps.push(self[id].Format_id)
  self[id].Models_numerical = 'maxInd\\left(' + num + '\\right)'
  self[id].Models_dimensions = 'maxInd\\left(' + dim + '\\right)'
  self[id].Models_quantities = 'maxInd\\left(' + quan + '\\right)'
  self[id].Models_units = 'maxInd\\left(' + units + '\\right)'
  DOM_Object[id]['real'] = self[id].Solution_real
  DOM_Object[id]['size'] = self[id]['Format_size']
  DOM_Object[id]['imag']['0-0'] = 0
  DOM_Object[id]['units'] = ''
  self[pid].Solution_variable_array[pos] = id
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//-------------------------------- MATH FUNCTION MAX INDEX ------------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.minInd = function (replacetext, pid, pos, callback) {
  replacetext = replacetext.replace(/^minInd\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var showeq = ''
  var num = ''
  var dim = ''
  var units = ''
  var quan = ''
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'Min1')
  }
  var nums = new Array()
  var thistext = ''
  for (var a = 0; a < inputarray.length; a = a + 1) {
    inputarray[a] = inputarray[a].replace(/^\s+|\s+$/g, '')
    if (isNumber(inputarray[a])) {
      nums.push(parseFloat(inputarray[a]))
      showeq = showeq + ', ' + inputarray[a]
      num = num + ', ' + inputarray[a]
      dim = dim + ', 1x1'
      units = units + ', NA'
      quan = quan + ', NA'
    } else if (inputarray[a].match('#Table')) {
      var numberarray = Get_Table_Elements(inputarray[a], 1)
      for (var b = 0; b < numberarray.length; b = b + 1) {
        nums.push(numberarray[b])
        showeq = showeq + ', ' + inputarray[a]
        num = num + ', ' + inputarray[a]
        dim = dim + ', 1x1'
        units = units + ', NA'
        quan = quan + ', NA'
      }
    } else {
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 1, eqobj)
      if (self[tempid].Format_size == '1x1') {
        nums.push(ToNum(self[tempid].Solution_real['0-0']))
      } else {
        for (var i in self[tempid].Solution_real) {
          nums.push(ToNum(self[tempid].Solution_real[i]))
        }
      }
      num = num + ', ' + self[tempid].Format_showequation
      dim = dim + ', ' + self[tempid].Format_size
      units = units + ', ' + self[tempid].Units_units
      quan = quan + ', ' + self[tempid].Units_quantity
      showeq = showeq + ', ' + self[tempid].Format_showequation
    }
  }

  // Find the min index
  var min = nums[0]
  var minIndex = 0
  for (var i = 1; i < nums.length; i++) {
    if (nums[i] < min) {
      minIndex = i
      min = nums[i]
    }
  }

  showeq = showeq.replace(/^\,/, '')
  num = num.replace(/^\,/, '')
  dim = dim.replace(/^\,/, '')
  units = units.replace(/^\,/, '')
  quan = quan.replace(/^\,/, '')
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var id = CreateEq(this.fileid, 0, eqobj)
  self[id].Solution_real['0-0'] = minIndex
  self[id].Format_showequation = 'minInd\\left(' + showeq + '\\right)'
  this.Solution_temps.push(self[id].Format_id)
  self[id].Models_numerical = 'minInd\\left(' + num + '\\right)'
  self[id].Models_dimensions = 'minInd\\left(' + dim + '\\right)'
  self[id].Models_quantities = 'minInd\\left(' + quan + '\\right)'
  self[id].Models_units = 'minInd\\left(' + units + '\\right)'
  DOM_Object[id]['real'] = self[id].Solution_real
  DOM_Object[id]['size'] = self[id]['Format_size']
  DOM_Object[id]['imag']['0-0'] = 0
  DOM_Object[id]['units'] = ''
  self[pid].Solution_variable_array[pos] = id
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//------------------------------------- FUNCTION TO FIND NATURAL LOG --------------------------------------//
//---------------------------------------------------------------------------------------------------------//
function NatLog(obj, callback) {
  if (obj['real'] === '') {
    var real = 0
  } else {
    var real = obj['real']
  }
  if (obj['imag'] === '') {
    var imag = 0
  } else {
    var imag = obj['imag']
  }
  //	var modulus=ToNum(Math.sqrt(Math.pow(real,2)+Math.pow(imag,2)));
  var modulus = Math.sqrt(parseFloat(Big(real).pow(2).plus(Big(imag).pow(2))))
  var argument = ToNum(Math.atan2(imag, real))
  obj['real'] = Math.log(modulus)
  obj['imag'] = argument
  callback()
}
//---------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------------------ TRANSPOSING A MATRIX ---------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
/*
This function handles transposing a matrix. This can be done by calling Transpose(X) where X  is text or an equation ID. It can also be done by calling []^T
*/
Equation.prototype.Transpose = function (text, pid, pos, callback) {
  var flag = 0
  replacetext = text.replace(/^Transpose\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length == 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Transpose')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Transpose1')
    flag = 1
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var id1 = CreateEq(this.fileid, 1, eqobj)
    var newid = MatrixTranspose(id1)
    self[newid].Format_showequation = self[id1].Format_showequation + '^T'
    this.Solution_temps.push(newid)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['imag'] = self[newid].Solution_imag
    DOM_Object[newid]['units'] = self[newid].Units_units
    SetModels('Transpose', newid, id1)
    self[pid].Solution_variable_array[pos] = newid
  } else {
    var newid = ''
  }
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function MatrixTranspose(oldid) {
  var sizes = self[oldid].Format_size.split('x')
  var size1 = sizes[0]
  var size2 = sizes[1]
  var realarray = new Array()
  var imagarray = new Array()
  for (var index1 = 0; index1 < size2; ++index1) {
    for (var index2 = 0; index2 < size1; ++index2) {
      var key1 = index1 + '-' + index2
      var key2 = index2 + '-' + index1
      realarray[key1] = self[oldid].Solution_real[key2]
      imagarray[key1] = self[oldid].Solution_imag[key2]
    }
  }
  var eqobj = {
    Page_position: DOM_Object[oldid]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: self[oldid].Original_id,
    equation: 'Temp=0'
  }
  var id = CreateEq(this.fileid, 0, eqobj)
  self[id].Solution_real = realarray
  self[id].Solution_imag = imagarray
  self[id].Format_size = size2 + 'x' + size1
  self[id].Format_numinds = self[oldid].Format_numinds
  self[id].Format_showtype = 'builtin'
  self[id].Units_base_string = self[oldid].Units_base_string
  self[id].Units_units = self[oldid].Units_units
  self[id].Units_base_array = self[oldid].Units_base_array
  DOM_Object[id]['real'] = self[id].Solution_real
  DOM_Object[id]['imag'] = self[id].Solution_imag
  DOM_Object[id]['size'] = self[id]['Format_size']
  DOM_Object[id]['imag']['0-0'] = 0
  DOM_Object[id]['units'] = self[id].Units_units
  return id
}

//---------------------------------------------------------------------------------------------------------//
//-------------------------------- GET THE SIZE OF THE MATRIX ---------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.Size = function (replacetext, pid, pos, callback) {
  var flag = 1
  replacetext = replacetext.replace(/^Size\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Size')
    flag = 0
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'Size1')
    flag = 0
  }
  if (inputarray.length < 2) {
    Set_Error(this.Original_id, 'Size2')
    flag = 0
  }
  if (flag == 1) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var eqid = CreateEq(this.fileid, 1, eqobj)

    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[1]
    }
    var numid = CreateEq(this.fileid, 1, eqobj)
    //if (self[numid].Solution_real['0-0']===0) { Set_Error(this.Original_id, "Size3"); flag=0; }

    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      Format_size: '1x1'
    }
    var id = CreateEq(this.fileid, 0, eqobj)

    var temp = self[eqid].Format_size.split('x')
    if (parseInt(self[numid].Solution_real['0-0'], 10) > temp.length) {
      self[id].Solution_real['0-0'] = 0
    } else {
      self[id].Solution_real['0-0'] = temp[parseInt(self[numid].Solution_real['0-0'])]
    }

    console.log('I set the size to ' + self[id].Solution_real['0-0'])

    self[id].Solution_imag['0-0'] = 0
    DOM_Object[id]['real'] = self[id].Solution_real
    DOM_Object[id]['size'] = self[id]['Format_size']
    DOM_Object[id]['imag']['0-0'] = 0
    self[id].Format_showequation =
      'Size\\left(' + self[eqid].Format_showequation + ',' + self[numid].Format_showequation + '\\right)'
    this.Solution_temps.push(self[id].Format_id)
    this.Solution_temps.push(self[eqid].Format_id)
    this.Solution_temps.push(self[numid].Format_id)
    SetModels('Size', id, eqid, numid)
    self[pid].Solution_variable_array[pos] = id
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    DOM_Object[id]['real'] = self[id].Solution_real
    DOM_Object[id]['size'] = self[id]['Format_size']
    DOM_Object[id]['imag']['0-0'] = 0
    DOM_Object[id]['units'] = self[id].Units_units
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------ CREATE NEW MATRIX WITH GIVEN DEFAULT -----------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.CreateMatrix = function (replacetext, pid, pos, callback) {
  var maxes = new Array()
  var current = new Array()
  var total = 1
  var flag = 0
  var key = ''
  var size = ''
  var showeq = ''
  var num = ''
  var dim = ''
  var units = ''
  var quan = ''
  replacetext = replacetext.replace(/^CreateMatrix\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'CreateMatrix')
    flag = 1
  } else if (inputarray.length < 4) {
    Set_Error(this.Original_id, 'CreateMatrix1')
    flag = 1
  }
  var realdefault = 0
  var imagdefault = 0
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var rdid = CreateEq(this.fileid, 1, eqobj)
    showeq = showeq + ', ' + self[rdid].Format_showequation
    num = num + ', ' + self[rdid].Solution_real['0-0']
    dim = dim + ', ' + self[rdid].Format_size

    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[1]
    }
    var idid = CreateEq(this.fileid, 1, eqobj)
    showeq = showeq + ', ' + self[idid].Format_showequation
    num = num + ', ' + self[idid].Solution_real['0-0']
    dim = dim + ', ' + self[idid].Format_size

    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    var id = CreateEq(this.fileid, 0, eqobj)

    for (var a = 2; a < inputarray.length; a++) {
      var eqobj = {
        Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 1, eqobj)
      maxes[a - 2] = self[tempid].Solution_real['0-0']
      this.Solution_temps.push(tempid)
      showeq = showeq + ', ' + self[tempid].Format_showequation
      num = num + ', ' + self[tempid].Solution_real['0-0']
      dim = dim + ', ' + self[tempid].Format_size
    }
    for (var a = 0; a < maxes.length; a++) {
      total = total * maxes[a]
      current[a] = 0
      size = size + 'x' + maxes[a]
    }
    size = size.replace(/^\x/, '')
    num = num.replace(/^\,/, '')
    showeq = showeq.replace(/^\,/, '')
    dim = dim.replace(/^\,/, '')
    for (var a = 0; a < total; a++) {
      current[maxes.length - 1] = parseInt(current[maxes.length - 1], 10) + 1
      for (var b = maxes.length - 1; b >= 0; b--) {
        if (current[b] == maxes[b]) {
          current[b - 1] = parseInt(current[b - 1], 10) + 1
          current[b] = 0
        }
      }
      key = ''
      for (var b = 0; b < maxes.length; b++) {
        key = key + '-' + current[b]
      }
      key = key.replace(/^\-/, '')
      self[id].Solution_real[key] = self[rdid].Solution_real['0-0']
      self[id].Solution_imag[key] = self[idid].Solution_real['0-0']
    }
    self[id].Solution_realdefault = self[rdid].Solution_real['0-0']
    self[id].Solution_imagdefault = self[idid].Solution_real['0-0']
    self[id].Format_size = size
    this.Solution_temps.push(self[id].Format_id, rdid, idid)
    self[id].Format_showequation = 'CreateMatrix\\left(' + showeq + '\\right)'
    self[id].Models_numerical = 'CreateMatrix\\left(' + num + '\\right)'
    self[id].Models_dimensions = 'CreateMatrix\\left(' + dim + '\\right)'
    self[id].Models_quantities = 'CreateMatrix\\left(' + quan + '\\right)'
    self[id].Models_units = 'CreateMatrix\\left(' + units + '\\right)'
    DOM_Object[id]['real'] = self[id].Solution_real
    DOM_Object[id]['size'] = self[id]['Format_size']
    DOM_Object[id]['imag']['0-0'] = 0
    DOM_Object[id]['units'] = self[id].Units_units
    self[pid].Solution_variable_array[pos] = id
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------------- CREATE AN IDENTITY MATRIX ------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.Identity = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^Identity\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Identity')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Identity1')
    flag = 1
  }
  if (flag === 0) {
    var key = ''
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'IdentEq=' + inputarray[0]
    }
    var tempid = CreateEq(this.fileid, 1, eqobj)
    var size = self[tempid].Solution_real['0-0']
    for (var a = 0; a < size; a++) {
      for (var b = 0; b < size; b++) {
        key = a + '-' + b
        if (a == b) {
          self[tempid].Solution_real[key] = 1
        } else {
          self[tempid].Solution_real[key] = 0
        }
      }
    }
    self[tempid].Format_showequation = 'Identity\\left(' + self[tempid].Format_showequation + '\\right)'
    self[tempid].Format_size = size + 'x' + size
    this.Solution_temps.push(tempid)
    SetModels('Identity', tempid, tempid)
    DOM_Object[tempid]['real'] = self[tempid].Solution_real
    DOM_Object[tempid]['size'] = self[tempid]['Format_size']
    DOM_Object[tempid]['imag']['0-0'] = 0
    DOM_Object[tempid]['units'] = self[tempid].Units_units
    self[pid].Solution_variable_array[pos] = tempid
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
  } else {
    self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
  }
}
//-------------------------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------------------------------------------//
//----------------------------------------------- MATH FUNCTION - Integrate with Newton-Cotes -------------------------------------------------//
//---------------------------------------------------------------------------------------------------------------------------------------------//
/*
This is the function to integrate functions using the Newton-Cotes methods. It takes in a string that is comma separated to give 5 inputs.
 0 	- The vector holding the x data
1	- The vector holding the y data
2 	- The order of the integral - 1 for trapezoid, 2 Simpsons 1/3, 3 for 3/8, 4 for Booles
http://www.stanford.edu/~fringer/teaching/numerical_methods_02/handouts/lecture5.pdf
*/
Equation.prototype.NewtonCotes = function (text, pid, pos, callback) {
  var flag = 0
  var I = Big(0)
  var replacetext = text.replace(/^\s+|\s+$/g, '')
  replacetext = replacetext.replace(/^[NewtonCotes(]+/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'NewtonCotes')
  }
  if (inputarray.length < 3) {
    Set_Error(this.Original_id, 'NC4')
  }
  if (inputarray.length > 3) {
    Set_Error(this.Original_id, 'NC5')
  }
  var xdata = inputarray[0]
  var ydata = inputarray[1]
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[2]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  var order = self[id1].Solution_real['0-0']
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + xdata
  }
  var xid = CreateEq(this.fileid, 1, eqobj)
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + ydata
  }
  var yid = CreateEq(this.fileid, 1, eqobj)
  var size = self[xid].Format_size.split('x')
  var size1 = size[1]
  var lower = self[xid].Solution_real['0-0']
  var upper = 0
  var upper = 0
  if (order == 2) {
    if ((size1 - 1) % 2 !== 0) {
      Set_Error(this.Original_id, 'NC1')
      flag = 1
    }
  }
  if (order == 3) {
    if ((size1 - 1) % 3 !== 0) {
      Set_Error(this.Original_id, 'NC2')
      flag = 1
    }
  }
  if (order == 4) {
    if ((size1 - 1) % 4 !== 0) {
      Set_Error(this.Original_id, 'NC3')
      flag = 1
    }
  }
  if (parseInt(size1, 10) < 5) {
    Set_Error(this.Original_id, 'NC8')
    flag = 1
  }
  if (self[xid].Format_size != self[yid].Format_size) {
    Set_Error(this.Original_id, 'NC6')
    flag = 1
  }
  if (!isNumber(order)) {
    Set_Error(this.Original_id, 'NC7')
    flag = 1
  }
  if (!flag) {
    if (order == 1) {
      for (var i = 0; i < size1 - 1; i = i + 1) {
        x1 = self[xid].Solution_real['0-' + parseInt(parseInt(i, 10), 10)]
        x2 = self[xid].Solution_real['0-' + parseInt(parseInt(i, 10) + 1, 10)]
        y1 = self[yid].Solution_real['0-' + parseInt(parseInt(i, 10), 10)]
        y2 = self[yid].Solution_real['0-' + parseInt(parseInt(i, 10) + 1, 10)]
        I = I.plus(
          Big(0.5)
            .times(Big(x2).minus(Big(x1)))
            .times(Big(y2).plus(Big(y1)))
        )
        if (ToNum(x2) > ToNum(upper)) {
          upper = x2
        }
      }
    }
    if (order == 2) {
      for (var i = 0; i < size1 - 2; i = i + 2) {
        x1 = self[xid].Solution_real['0-' + parseInt(parseInt(i, 10), 10)]
        x2 = self[xid].Solution_real['0-' + parseInt(parseInt(i, 10) + 1, 10)]
        x3 = self[xid].Solution_real['0-' + parseInt(parseInt(i, 10) + 2, 10)]
        y1 = self[yid].Solution_real['0-' + parseInt(parseInt(i, 10), 10)]
        y2 = self[yid].Solution_real['0-' + parseInt(parseInt(i, 10) + 1, 10)]
        y3 = self[yid].Solution_real['0-' + parseInt(parseInt(i, 10) + 2, 10)]
        I = I.plus(
          Big(1)
            .div(Big(6))
            .times(Big(x3).minus(Big(x1)))
            .times(
              Big(y1)
                .plus(Big(4).times(Big(y2)))
                .plus(Big(y3))
            )
        )
        if (ToNum(x3) > ToNum(upper)) {
          upper = x3
        }
      }
    }
    if (order == 3) {
      for (var i = 0; i < size1 - 4; i = i + 3) {
        x1 = self[xid].Solution_real['0-' + parseInt(parseInt(i, 10), 10)]
        x2 = self[xid].Solution_real['0-' + parseInt(parseInt(i, 10) + 1, 10)]
        x3 = self[xid].Solution_real['0-' + parseInt(parseInt(i, 10) + 2, 10)]
        x4 = self[xid].Solution_real['0-' + parseInt(parseInt(i, 10) + 3, 10)]
        y1 = self[yid].Solution_real['0-' + parseInt(parseInt(i, 10), 10)]
        y2 = self[yid].Solution_real['0-' + parseInt(parseInt(i, 10) + 1, 10)]
        y3 = self[yid].Solution_real['0-' + parseInt(parseInt(i, 10) + 2, 10)]
        y4 = self[yid].Solution_real['0-' + parseInt(parseInt(i, 10) + 3, 10)]
        I = I.plus(
          Big(1)
            .div(Big(8))
            .times(Big(x4).minus(Big(x1)))
            .times(
              Big(y1)
                .plus(Big(3).times(Big(y2)))
                .plus(Big(3).times(Big(y3)))
                .plus(Big(y4))
            )
        )
        if (ToNum(x4) > ToNum(upper)) {
          upper = x4
        }
      }
    }
    if (order == 4) {
      for (var i = 0; i <= size1 - 5; i = i + 4) {
        x1 = self[xid].Solution_real['0-' + parseInt(parseInt(i, 10), 10)]
        x2 = self[xid].Solution_real['0-' + parseInt(parseInt(i, 10) + 1, 10)]
        x3 = self[xid].Solution_real['0-' + parseInt(parseInt(i, 10) + 2, 10)]
        x4 = self[xid].Solution_real['0-' + parseInt(parseInt(i, 10) + 3, 10)]
        x5 = self[xid].Solution_real['0-' + parseInt(parseInt(i, 10) + 4, 10)]
        y1 = self[yid].Solution_real['0-' + parseInt(parseInt(i, 10), 10)]
        y2 = self[yid].Solution_real['0-' + parseInt(parseInt(i, 10) + 1, 10)]
        y3 = self[yid].Solution_real['0-' + parseInt(parseInt(i, 10) + 2, 10)]
        y4 = self[yid].Solution_real['0-' + parseInt(parseInt(i, 10) + 3, 10)]
        y5 = self[yid].Solution_real['0-' + parseInt(parseInt(i, 10) + 4, 10)]
        I = I.plus(
          Big(1)
            .div(Big(90))
            .times(Big(x5).minus(Big(x1)))
            .times(
              Big(7)
                .times(Big(y1))
                .plus(Big(32).times(Big(y2)))
                .plus(Big(12).times(Big(y3)))
                .plus(Big(32).times(Big(y4)))
                .plus(Big(7).times(Big(y5)))
            )
        )
        if (ToNum(x5) > ToNum(upper)) {
          upper = x5
        }
      }
    }
  }
  var baseunits = {}
  for (var i in self[xid].Units_base_array) {
    baseunits[i] = self[xid].Units_base_array[i] + self[yid].Units_base_array[i]
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var id = CreateEq(this.fileid, 0, eqobj)
  self[id].Page_position = DOM_Object[this.Format_id]['location']
  self[id].Solution_real['0-0'] = parseFloat(I)
  self[id].Solution_imag['0-0'] = 0
  self[id].Format_showtype = 'builtin'
  var xunits = self[xid].Units_units
  self[id].Format_showequation =
    '\\int_{' +
    lower +
    ' ' +
    xunits +
    '}^{' +
    upper +
    ' ' +
    xunits +
    '}' +
    self[yid].Format_showequation +
    '\\hspace{1mm}\\mathrm{dx}'
  self[id].Units_base_array = baseunits
  self[id].Recompose_Units()
  DOM_Object[id]['real'] = self[id].Solution_real
  DOM_Object[id]['size'] = self[id]['Format_size']
  DOM_Object[id]['imag']['0-0'] = 0
  DOM_Object[id]['units'] = self[id].Units_units
  this.Solution_temps.push(self[id].Format_id)
  SetModels('NewtonCotes', id, xid, yid, lower, upper)
  self[pid].Solution_variable_array[pos] = id
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------------------------------------------//
//------------------------------------ MATH FUNCTION - Integrate x and y data with unequally spaced x data ------------------------------------//
//---------------------------------------------------------------------------------------------------------------------------------------------//
/*
This is the function to integrate functions using the Newton-Cotes methods. It takes in a string that is comma separated to give 5 inputs.
1 		- The x variable 
2	 	- The y variable

*/
Equation.prototype.Integrate = function (text, pid, pos, callback) {
  var replacetext = text.replace(/^\s+|\s+$/g, '')
  replacetext = replacetext.replace(/^Integrate\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Integrate')
  }
  if (inputarray.length < 2) {
    Set_Error(this.Original_id, 'Integrate1')
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'Integrate2')
  }
  var xvar = inputarray[0]
  var yvar = inputarray[1]
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + xvar
  }
  var xid = CreateEq(this.fileid, 1, eqobj)
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + yvar
  }
  var yid = CreateEq(this.fileid, 1, eqobj)
  var sizes = self[xid].Format_size.split('x')
  var size1 = sizes[1]
  var xlow = self[xid].Solution_real['0-0']
  if (self[xid].Format_size != self[yid].Format_size) {
    Set_Error(this.Original_id, 'Integrate3')
    flag = 1
  }
  if (parseInt(size1, 10) < 5) {
    Set_Error(this.Original_id, 'Integrate4')
    flag = 1
  }
  var xhigh = 0
  var Integral = Big(0)
  for (var index = 0; index < sizes[1] - 1; index++) {
    var xdist = Big(self[xid].Solution_real['0-' + parseInt(index + 1, 10)]).minus(
      Big(self[xid].Solution_real['0-' + index])
    )
    var ydiff = Big(self[yid].Solution_real['0-' + index]).plus(
      Big(self[yid].Solution_real['0-' + parseInt(index + 1, 10)])
    )
    Integral = Integral.plus(Big(xdist).times(Big(ydiff)).times(Big(0.5)))
    if (ToNum(self[xid].Solution_real['0-' + parseInt(index + 1, 10)]) > xhigh) {
      xhigh = ToNum(self[xid].Solution_real['0-' + parseInt(index + 1, 10)])
    }
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var id = CreateEq(this.fileid, 0, eqobj)
  var baseunits = new Array()
  for (var index in self[xid].Units_base_array) {
    self[id].Units_base_array[index] =
      parseInt(self[xid].Units_base_array[index], 10) + parseInt(self[yid].Units_base_array[index], 10)
  }
  self[id].Solution_real['0-0'] = Integral
  self[id].Solution_imag['0-0'] = 0
  self[id].Recompose_Units()
  self[id].Format_name = '\\int_{' + xlow + '}^{' + xhigh + '}' + yvar + '\\mathrm{d}' + xvar
  self[id].Solution_toreplace = 'Integrate(' + xvar + ',' + yvar + ')'
  self[id].Format_showtype = 'builtin'
  self[id].Format_showequation = '\\int_{' + xlow + '}^{' + xhigh + '}' + yvar + '\\mathrm{d}\\hspace{1mm}' + xvar
  DOM_Object[id]['real'] = self[id].Solution_real
  DOM_Object[id]['size'] = self[id]['Format_size']
  DOM_Object[id]['imag']['0-0'] = 0
  DOM_Object[id]['units'] = self[id].Units_units
  SetModels('Integrate', id, xid, yid, xlow, xhigh, xvar, yvar)
  this.Solution_temps.push(self[id].Format_id)
  self[pid].Solution_variable_array[pos] = id
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------- MATH FUNCTION - Differentiate data using the centered finite difference function ---------------------------------//
//---------------------------------------------------------------------------------------------------------------------------------------------------------//
/*
This function takes the derivative of a given function using the centered finite difference method. The user is allowed to select a number of settings.
0	the vector or variable name of the data
1	the space between each item - with units
2	the order of the derivative - 1, 2, 3, 4
3 	the accuracy level - 1 or 2
*/
Equation.prototype.Derivative = function (text, pid, pos, callback) {
  var index = 0
  var f_x = {}
  var Diff = {}
  var flag = 0
  var replacetext = text.replace(/^\s+|\s+$/g, '')
  replacetext = replacetext.replace(/^[Derivative(]+/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Derivative')
    flag = 1
  }
  if (inputarray.length < 4) {
    Set_Error(this.Original_id, 'Derivative1')
    flag = 1
  }
  if (inputarray.length > 4) {
    Set_Error(this.Original_id, 'Derivative2')
    flag = 1
  }
  var ydata = inputarray[0]
  var x_space = inputarray[1]
  var order = inputarray[2]
  var accuracy = inputarray[3]
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + ydata
  }
  var yid = CreateEq(this.fileid, 1, eqobj)
  var f_x = self[yid].Solution_real
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + x_space
  }
  var x_space = CreateEq(this.fileid, 1, eqobj)
  var xspace = self[x_space].Solution_real['0-0']
  if (order != 1 && order != 2 && order != 3 && order != 4) {
    Set_Error(this.Original_id, 'Derivative3')
    flag = 1
  }
  if (accuracy != 1 && accuracy != 2) {
    Set_Error(this.Original_id, 'Derivative4')
    flag = 1
  }
  var sizes = self[yid].Format_size.split('x')
  var size1 = sizes[1]
  if (parseInt(size1, 10) < 5) {
    Set_Error(this.Original_id, 'Derivative5')
    flag = 1
  }
  if (flag === 0) {
    if (order == '1') {
      if (accuracy == '1') {
        for (var i = 1; i < Object.keys(f_x).length - 1; i++) {
          if (i > 0) {
            var ind1 = '0-' + parseInt(parseInt(i, 10) + 1, 10)
            var ind2 = '0-' + parseInt(parseInt(i, 10) - 1, 10)
            Diff[ind2] = ToNum((f_x[ind1] - f_x[ind2]) / (2 * xspace))
          }
        }
      } else if (accuracy == '2') {
        for (var i = 2; i < Object.keys(f_x).length - 2; i++) {
          if (i > 1) {
            var ind1 = '0-' + parseInt(parseInt(i, 10) + 1, 10)
            var ind2 = '0-' + parseInt(parseInt(i, 10) - 1, 10)
            var ind3 = '0-' + parseInt(parseInt(i, 10) + 2, 10)
            var ind4 = '0-' + parseInt(parseInt(i, 10) - 2, 10)
            Diff[ind4] = ToNum((-f_x[ind3] + 8 * f_x[ind1] - 8 * f_x[ind2] - f_x[ind4]) / (12 * xspace))
          }
        }
      }
    }
    if (order == '2') {
      if (accuracy == '1') {
        for (var i = 1; i < Object.keys(f_x).length - 1; i++) {
          if (i > 0) {
            var ind1 = '0-' + parseInt(parseInt(i, 10) + 1, 10)
            var ind2 = '0-' + parseInt(parseInt(i, 10) - 1, 10)
            Diff[ind2] = ToNum((f_x[ind1] - 2 * f_x['0-' + i] + f_x[ind2]) / Math.pow(xspace, 2))
          }
        }
      } else if (accuracy == '2') {
        for (var i = 2; i < Object.keys(f_x).length - 2; i++) {
          if (i > 1) {
            var ind1 = '0-' + parseInt(parseInt(i, 10) + 1, 10)
            var ind2 = '0-' + parseInt(parseInt(i, 10) - 1, 10)
            var ind3 = '0-' + parseInt(parseInt(i, 10) + 2, 10)
            var ind4 = '0-' + parseInt(parseInt(i, 10) - 2, 10)
            Diff[ind4] = ToNum(
              (-f_x[ind3] + 16 * f_x[ind1] - 30 * f_x['0-' + i] + 16 * f_x[ind2] - f_x[ind4]) /
                (12 * Math.pow(xspace, 2))
            )
          }
        }
      }
    }
    if (order == '3') {
      if (accuracy == '1') {
        for (var i = 2; i < Object.keys(f_x).length - 2; i++) {
          if (i > 1) {
            var ind1 = '0-' + parseInt(parseInt(i, 10) + 1, 10)
            var ind2 = '0-' + parseInt(parseInt(i, 10) - 1, 10)
            var ind3 = '0-' + parseInt(parseInt(i, 10) + 2, 10)
            var ind4 = '0-' + parseInt(parseInt(i, 10) - 2, 10)
            Diff[ind2] = ToNum((f_x[ind3] - 2 * f_x[ind1] + 2 * f_x[ind2] - f_x[ind4]) / (2 * Math.pow(xspace, 3)))
          }
        }
      } else if (accuracy == '2') {
        for (var i = 3; i < Object.keys(f_x).length - 3; i++) {
          if (i > 2) {
            var ind1 = '0-' + parseInt(parseInt(i, 10) + 1, 10)
            var ind2 = '0-' + parseInt(parseInt(i, 10) - 1, 10)
            var ind3 = '0-' + parseInt(parseInt(i, 10) + 2, 10)
            var ind4 = '0-' + parseInt(parseInt(i, 10) - 2, 10)
            var ind5 = '0-' + parseInt(parseInt(i, 10) + 3, 10)
            var ind6 = '0-' + parseInt(parseInt(i, 10) - 3, 10)
            Diff[ind4] = ToNum(
              (-f_x[ind5] + 8 * f_x[ind3] - 13 * f_x[ind1] + 13 * f_x[ind2] - 8 * f_x[ind4] + f_x[ind6]) /
                (8 * Math.pow(xspace, 3))
            )
          }
        }
      }
    }
    if (order == '4') {
      if (accuracy == '1') {
        for (var i = 2; i < Object.keys(f_x).length - 2; i++) {
          if (i > 1) {
            var ind1 = '0-' + parseInt(parseInt(i, 10) + 1, 10)
            var ind2 = '0-' + parseInt(parseInt(i, 10) - 1, 10)
            var ind3 = '0-' + parseInt(parseInt(i, 10) + 2, 10)
            var ind4 = '0-' + parseInt(parseInt(i, 10) - 2, 10)
            Diff[ind2] = ToNum(
              (f_x[ind3] - 4 * f_x[ind1] + 6 * f_x['0-' + i] - 4 * f_x[ind2] + f_x[ind4]) / (xspace ^ 4)
            )
          }
        }
      } else if (accuracy == '2') {
        for (var i = 3; i < Object.keys(f_x).length - 3; i++) {
          if (i > 2) {
            var ind1 = '0-' + parseInt(parseInt(i, 10) + 1, 10)
            var ind2 = '0-' + parseInt(parseInt(i, 10) - 1, 10)
            var ind3 = '0-' + parseInt(parseInt(i, 10) + 2, 10)
            var ind4 = '0-' + parseInt(parseInt(i, 10) - 2, 10)
            var ind5 = '0-' + parseInt(parseInt(i, 10) + 3, 10)
            var ind6 = '0-' + parseInt(parseInt(i, 10) - 3, 10)
            Diff[ind4] = ToNum(
              (-f_x[ind5] +
                12 * f_x[ind3] +
                39 * f_x[ind1] +
                56 * f_x['0-' + i] -
                39 * f_x[ind2] +
                12 * f_x[ind4] +
                f_x[ind6]) /
                (6 * Math.pow(xspace, 4))
            )
          }
        }
      }
    }

    var baseunits = {}
    for (var i in self[yid].Units_base_array) {
      baseunits[i] = self[yid].Units_base_array[i] - order * self[x_space].Units_base_array[i]
    }
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    var id = CreateEq(this.fileid, 0, eqobj)
    if (flag == 1) {
      self[id].Solution_real['0-0'] = 'Error'
    } else {
      self[id].Solution_real = Diff
    }
    self[id].Solution_imag['0-0'] = 0
    self[id].Format_showequation = '\\frac{d^' + order + '}{dx}' + self[yid].Format_showequation
    self[id].Units_base_array = baseunits
    self[id].Recompose_Units()
    DOM_Object[id]['real'] = self[id].Solution_real
    DOM_Object[id]['size'] = self[id]['Format_size']
    DOM_Object[id]['imag']['0-0'] = 0
    DOM_Object[id]['units'] = self[id].Units_units
    this.Solution_temps.push(self[id].Format_id)
    SetModels('Derivative', id, yid, x_space)
    self[pid].Solution_variable_array[pos] = id
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------- MATH FUNCTION - Differentiate data using the centered finite difference function ---------------------------------//
//---------------------------------------------------------------------------------------------------------------------------------------------------------//
/*
This function takes the derivative of a given data set where the x spacing was not done at even intervals. It uses the lagrange technique in Chapra 457
0	the vector or variable name of the data for x data as taken
1	the vector or variable name of the data for the y data
2	the vector or variable name of the data for x data derivative locations
*/
Equation.prototype.DerivativeUn = function (text, pid, pos, callback) {
  var index = 0
  var f_x = {}
  var Diff = {}
  var eflag = 0
  var replacetext = text.replace(/^\s+|\s+$/g, '')
  replacetext = replacetext.replace(/^[DerivativeUn(]+/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'DerivativeUn')
    eflag = 1
  }
  if (inputarray.length < 3) {
    Set_Error(this.Original_id, 'DerivativeUn1')
    eflag = 1
  }
  if (inputarray.length > 3) {
    Set_Error(this.Original_id, 'DerivativeUn2')
    eflag = 1
  }
  var xdata = inputarray[0]
  var ydata = inputarray[1]
  var newxdata = inputarray[2]
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + xdata
  }
  var xid = CreateEq(this.fileid, 1, eqobj)
  var xlocs = self[xid].Solution_real
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + ydata
  }
  var yid = CreateEq(this.fileid, 1, eqobj)
  var f_x = self[yid].Solution_real
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + newxdata
  }
  var newxid = CreateEq(this.fileid, 1, eqobj)
  var newx = self[newxid].Solution_real
  if (self[xid].Format_size != self[yid].Format_size) {
    Set_Error(this.Original_id, 'DerivativeUn4')
    flag = 1
  }
  var sizes = self[xid].Format_size.split('x')
  var size1 = sizes[1]
  if (parseInt(size1, 10) < 5) {
    Set_Error(this.Original_id, 'DerivativeUn5')
    flag = 1
  }

  if (eflag === 0) {
    i = 1
    var flag = 0
    for (var newi = 0; newi < Object.keys(newx).length; newi++) {
      flag = 0
      while (flag === 0 && i < Object.keys(xlocs).length - 1) {
        var diff0 = Math.abs(newx['0-' + newi] - xlocs['0-' + parseInt(i - 1, 10)])
        var diff1 = Math.abs(newx['0-' + newi] - xlocs['0-' + parseInt(i, 10)])
        var diff2 = Math.abs(newx['0-' + newi] - xlocs['0-' + parseInt(parseInt(i, 10) + 1, 10)])
        if (
          (diff1 < diff0 && diff1 < diff2) ||
          (diff1 < diff0 && diff1 == diff2) ||
          (diff1 == diff0 && diff1 < diff2) ||
          (diff1 < diff2 && i == 1) ||
          (diff1 < diff0 && i == Object.keys(xlocs).length - 2)
        ) {
          flag = 1
        } else {
          i = parseInt(i, 10) + 1
        }
        if (flag == 1) {
          var f0 = f_x['0-' + parseInt(i - 1, 10)]
          var f1 = f_x['0-' + i]
          var f2 = f_x['0-' + parseInt(parseInt(i, 10) + 1, 10)]
          var x0 = xlocs['0-' + parseInt(i - 1, 10)]
          var x1 = xlocs['0-' + parseInt(i, 10)]
          var x2 = xlocs['0-' + parseInt(parseInt(i, 10) + 1, 10)]
          var x = newx['0-' + newi]
          Diff['0-' + newi] = ToNum(
            ToNum(f0 * ((2 * x - x1 - x2) / ((x0 - x1) * (x0 - x2)))) +
              ToNum(f1 * ((2 * x - x0 - x2) / ((x1 - x0) * (x1 - x2)))) +
              ToNum(f2 * ((2 * x - x0 - x1) / ((x2 - x0) * (x2 - x1))))
          )
        }
      }
      if (flag === 0) {
        Set_Error(this.Original_id, 'DerivativeUn3', newx['0-' + newi])
        eflag = 1
      }
    }
    var baseunits = {}
    for (var i in self[yid].Units_base_array) {
      baseunits[i] = self[yid].Units_base_array[i] - self[xid].Units_base_array[i]
    }
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    var id = CreateEq(this.fileid, 0, eqobj)
    if (eflag === 0) {
      self[id].Solution_real = Diff
    } else {
      self[id].Solution_real['0-0'] = 'Error'
    }
    self[id].Solution_imag = 0
    if (eflag === 0) {
      self[id].Format_showequation = '\\frac{d}{dx}' + self[yid].Format_showequation
    } else {
      self[id].Format_showequation = 'Error'
    }
    self[id].Units_base_array = baseunits
    self[id].Recompose_Units()
    this.Solution_temps.push(self[id].Format_id)
    DOM_Object[id]['real'] = self[id].Solution_real
    DOM_Object[id]['size'] = self[id]['Format_size']
    DOM_Object[id]['imag']['0-0'] = 0
    DOM_Object[id]['units'] = self[id].Units_units
    SetModels('DerivativeUn', id, xid, yid, newxid)
    self[pid].Solution_variable_array[pos] = id
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//------------------------------- GET THE REAL PORTION OF THE MATRIX --------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.Real = function (replacetext, pid, pos, callback) {
  var flag = 1
  replacetext = replacetext.replace(/^Real\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Real')
    flag = 0
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Real1')
    flag = 0
  }
  if (flag == 1) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var id = CreateEq(this.fileid, 1, eqobj)
    console.log(self[id])
    self[id].Format_showequation = 'Real\\left(' + replacetext + '\\right)'
    self[id].Solution_imag = {}
    self[id].Solution_imagdefault = 0
    this.Solution_temps.push(self[id].Format_id)
    SetModels('Real', id, id)
    DOM_Object[id]['real'] = self[id].Solution_real
    DOM_Object[id]['size'] = self[id]['Format_size']
    DOM_Object[id]['imag']['0-0'] = 0
    DOM_Object[id]['units'] = self[id].Units_units
    self[pid].Solution_variable_array[pos] = id
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//----------------------------- GET THE IMAGINARY PORTION OF THE MATRIX -----------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.Imag = function (replacetext, pid, pos, callback) {
  var flag = 1
  replacetext = replacetext.replace(/^Imag\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Imag')
    flag = 0
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Imag1')
    flag = 0
  }
  if (flag == 1) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var id = CreateEq(this.fileid, 1, eqobj)
    self[id].Format_showequation = 'Imag\\left(' + replacetext + '\\right)'
    self[id].Solution_realdefault = self[id].Solution_imagdefault
    self[id].Solution_imagdefault = 0
    this.Solution_temps.push(self[id].Format_id)
    self[id].Solution_real = JSON.parse(JSON.stringify(self[id].Solution_imag))
    self[id].Solution_imag = {}
    SetModels('Imag', id, id)
    self[pid].Solution_variable_array[pos] = id
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  }
  DOM_Object[id]['real'] = self[id].Solution_real
  DOM_Object[id]['size'] = self[id]['Format_size']
  DOM_Object[id]['imag']['0-0'] = 0
  DOM_Object[id]['units'] = self[id].Units_units
  self[pid].Solution_variable_array[pos] = id
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//----------------------------------- APPEND ONE MATRIX TO ANOTHER ----------------------------------------//
//---------------------------------------------------------------------------------------------------------//
/*
	This function takes in two matrixes and a number. The code then appends the  second matrix to the first along the index specified.
*/
Equation.prototype.Append = function (replacetext, pid, pos, callback) {
  var splitkey = '',
    key = '',
    num = '',
    flag = 0,
    testflag = 0
  replacetext = replacetext.replace(/^Append\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Append')
    testflag = 1
  }
  if (inputarray.length > 3) {
    Set_Error(this.Original_id, 'Append1')
    testflag = 1
  }
  if (inputarray.length < 3) {
    Set_Error(this.Original_id, 'Append2')
    testflag = 1
  }
  if (testflag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var eqid1 = CreateEq(this.fileid, 1, eqobj)
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[1]
    }
    var eqid2 = CreateEq(this.fileid, 1, eqobj)
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[2]
    }
    var indid = CreateEq(this.fileid, 1, eqobj)
    var index = self[indid].Solution_real['0-0']
    var ind1 = self[eqid1].Format_size.split('x')
    var ind2 = self[eqid2].Format_size.split('x')
    var maxindex = Math.max(parseInt(index, 10) + 1, ind1.length, ind2.length)
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'builtin',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    var id = CreateEq(this.fileid, 0, eqobj)
    if (index > ind1.length - 1) {
      flag = 1
      for (var a in self[eqid1].Solution_real) {
        key = ''
        splitkey = a.split('-')
        for (var b = 0; b < maxindex; b++) {
          if (splitkey[b] === undefined) {
            splitkey[b] = 0
          }
        }
        for (var b = 0; b < splitkey.length; b++) {
          key = key + '-' + splitkey[b]
        }
        key = key.replace(/^\-/, '')
        self[id].Solution_real[key] = self[eqid1].Solution_real[a]
        self[id].Solution_imag[key] = self[eqid1].Solution_imag[a]
        delete self[id].Solution_imag[key]
      }
    } else {
      self[id].Solution_real = self[eqid1].Solution_real
      self[id].Solution_imag = self[eqid1].Solution_imag
    }
    for (var a in self[eqid2].Solution_real) {
      key = ''
      splitkey = a.split('-')
      for (var b = 0; b < maxindex; b++) {
        if (splitkey[b] === undefined) {
          splitkey[b] = 0
        }
      }
      if (flag == 1) {
        splitkey[index] = parseInt(splitkey[index], 10) + parseInt(ind1[index], 10) + parseInt(1, 10)
      } else {
        splitkey[index] = parseInt(splitkey[index], 10) + parseInt(ind1[index], 10)
      }
      for (var b = 0; b < splitkey.length; b++) {
        key = key + '-' + splitkey[b]
      }
      key = key.replace(/^\-/, '')
      self[id].Solution_real[key] = self[eqid2].Solution_real[a]
      self[id].Solution_imag[key] = self[eqid2].Solution_imag[a]
    }
    self[id].Format_showequation = 'Append\\left(' + replacetext + '\\right)'
    self[id].Units_units = self[eqid1].Units_units
    this.Solution_temps.push(self[eqid1].Format_id)
    this.Solution_temps.push(self[eqid2].Format_id)
    this.Solution_temps.push(self[indid].Format_id)
    this.Solution_temps.push(self[id].Format_id)
    DOM_Object[id]['real'] = self[id].Solution_real
    DOM_Object[id]['size'] = self[id]['Format_size']
    DOM_Object[id]['imag']['0-0'] = 0
    DOM_Object[id]['units'] = self[id].Units_units
    SetModels('Append', id, eqid1, eqid2, indid)
    self[pid].Solution_variable_array[pos] = id
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------------- GENERATE A RANDOM NUMBER -------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.rand = function (replacetext, pid, pos, callback) {
  var flag = 0
  var result = 0
  replacetext = replacetext.replace(/^rand\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'rand')
    flag = 1
  }
  if (inputarray.length < 2) {
    Set_Error(this.Original_id, 'rand1')
    flag = 1
  }
  if (inputarray.length > 3) {
    Set_Error(this.Original_id, 'rand1')
    flag = 1
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var id1 = CreateEq(this.fileid, 1, eqobj)
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[1]
    }
    var id2 = CreateEq(this.fileid, 1, eqobj)
    var lower = self[id1].Solution_real['0-0']
    var upper = self[id2].Solution_real['0-0']
    var multiplier = 1
    if (lower > upper) {
      Set_Error(this.Original_id, 'rand2')
    }
    if (inputarray.length > 2) {
      var eqobj = {
        Page_position: parseInt(DOM_Object[this.Format_id]['location']),
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[2]
      }
      var preid = CreateEq(this.fileid, 1, eqobj)
      var precision = parseInt(self[preid].Solution_real['0-0'])
      var mult = Math.pow(10, precision)
      if (precision < 0) {
        Set_Error(this.Original_id, 'rand3')
      }
    }
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    var ran = Math.random()
    if (lower >= 0) {
      result = lower + Math.floor(Math.random() * (upper * mult - lower * mult)) / mult
    } else if (lower < 0 && upper > 0) {
      result = (Math.floor(ran * (upper * mult - lower * mult + 1)) + lower * mult) / mult
    } else if (lower < 0 && upper < 0) {
      result = (Math.floor(ran * (upper * mult - lower * mult + 1)) + lower * mult) / mult
    }
    self[newid].Solution_real['0-0'] = result
    self[newid].Format_showequation =
      'rand \\left(' +
      self[id1].Format_showequation +
      ', ' +
      self[id2].Format_showequation +
      ', ' +
      self[preid].Format_showequation +
      '\\right)'
  } else {
    var newid = ''
  }
  DOM_Object[newid]['real'] = self[newid].Solution_real
  DOM_Object[newid]['size'] = self[newid]['Format_size']
  DOM_Object[newid]['imag']['0-0'] = 0
  DOM_Object[newid]['units'] = self[newid].Units_units
  this.Solution_temps.push(newid, id1, id2, preid)
  SetModels('rand', newid, id1, id2, preid)
  self[pid].Solution_variable_array[pos] = newid
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------- GENERATE A MATRIX OF RANDOM NUMBERS --------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.randMat = function (replacetext, pid, pos, callback) {
  var flag = 0
  var result = {}
  var key = ''
  replacetext = replacetext.replace(/^randMat\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'randMat')
    flag = 1
  }
  if (inputarray.length < 5) {
    Set_Error(this.Original_id, 'randMat1')
    flag = 1
  }
  if (inputarray.length > 5) {
    Set_Error(this.Original_id, 'randMat1')
    flag = 1
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var id1 = CreateEq(this.fileid, 1, eqobj)
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[1]
    }
    var id2 = CreateEq(this.fileid, 1, eqobj)
    var lower = self[id1].Solution_real['0-0']
    var upper = self[id2].Solution_real['0-0']
    var multiplier = 1
    if (lower > upper) {
      Set_Error(this.Original_id, 'randMat2')
    }
    if (inputarray.length > 2) {
      var eqobj = {
        Page_position: parseInt(DOM_Object[this.Format_id]['location']),
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[2]
      }
      var preid = CreateEq(this.fileid, 1, eqobj)
      var precision = self[preid].Solution_real['0-0']
      mult = Math.pow(10, precision)
      if (precision < 0) {
        Set_Error(this.Original_id, 'randMat3')
      }
    }
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[3]
    }
    var d1id = CreateEq(this.fileid, 1, eqobj)
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[4]
    }
    var d2id = CreateEq(this.fileid, 1, eqobj)
    for (var a = 0; a < self[d1id].Solution_real['0-0']; a++) {
      for (var b = 0; b < self[d2id].Solution_real['0-0']; b++) {
        var ran = Math.random()
        key = a + '-' + b
        if (lower >= 0) {
          result[key] = lower + Math.floor(Math.random() * (upper * mult - lower * mult)) / mult
        } else if (lower < 0 && upper > 0) {
          result[key] = (Math.floor(ran * (upper * mult - lower * mult + 1)) + lower * mult) / mult
        } else if (lower < 0 && upper < 0) {
          result[key] = (Math.floor(ran * (upper * mult - lower * mult + 1)) + lower * mult) / mult
        } //\
      }
    }
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    self[newid].Solution_real = result
    self[newid].Format_size = self[d1id].Solution_real['0-0'] + 'x' + self[d2id].Solution_real['0-0']
    self[newid].Format_showequation =
      'randMat \\left(' +
      self[id1].Format_showequation +
      ', ' +
      self[id2].Format_showequation +
      ', ' +
      self[preid].Format_showequation +
      ', ' +
      self[d1id].Format_showequation +
      ', ' +
      self[d2id].Format_showequation +
      '\\right)'
  } else {
    var newid = ''
  }
  this.Solution_temps.push(newid, id1, id2, preid)
  DOM_Object[newid]['real'] = self[newid].Solution_real
  DOM_Object[newid]['size'] = self[newid]['Format_size']
  DOM_Object[newid]['imag']['0-0'] = 0
  DOM_Object[newid]['units'] = self[newid].Units_units
  SetModels('randMat', newid, id1, id2, preid)
  self[pid].Solution_variable_array[pos] = newid
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}

//-------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------------------- SQUASH A MATRIX ----------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.Squash = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^Squash\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Squash')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Squash')
    flag = 1
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var id1 = CreateEq(this.fileid, 1, eqobj)
    var newid = SquashMatrix(id1)
    self[newid].Format_showequation = 'Squash(' + self[id1].Format_showequation + ')'
  } else {
    var newid = ''
  }
  this.Solution_temps.push(newid)
  SetModels('Squash', newid, id1)
  self[pid].Solution_variable_array[pos] = newid
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  DOM_Object[newid]['real'] = self[newid].Solution_real
  DOM_Object[newid]['size'] = self[newid]['Format_size']
  DOM_Object[newid]['imag']['0-0'] = 0
  DOM_Object[newid]['units'] = self[newid].Units_units
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------------- Gauss Elimination Routine ------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
/*
This is a gauss elimination routine with partial pivoting. First, checks are done to ensure that this is a matrix and that 
it is square. Second, if the equation being solved is Ax=b where A is the coefficient matrix, x is the displacement, and 
b is the solution, then b is augmented onto the end of the A matrix to make the forward elimination easier. Third, a simple 
row pivoting algorithm is implemented to ensure that the largest number for that column is used. Fourth, the forward 
substitution is carried out. Once complete, the back substitution algorithm is performed.
*/

Equation.prototype.GaussE = function (replacetext, pid, pos, callback) {
  var flag = 0
  var newmat = {}
  var newsize = 0
  var size = 0
  var key = ''
  var factor = 0
  replacetext = replacetext.replace(/^GaussE\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'GaussE')
    flag = 1
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'GaussE1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[1]
  }
  var id2 = CreateEq(this.fileid, 1, eqobj)
  var sizes1 = self[id1].Format_size.split('x')
  var sizes2 = self[id2].Format_size.split('x')
  if (sizes1[0] != sizes1[1]) {
    Set_Error(this.Original_id, 'GaussE2')
    flag = 1
  }
  if (sizes1[0] != sizes2[0]) {
    Set_Error(this.Original_id, 'GaussE3')
    flag = 1
  }
  if (sizes2[1] != '1') {
    Set_Error(this.Original_id, 'GaussE4')
    flag = 1
  }
  if (flag === 0) {
    var finalid = Gauss_Elimination(id1, id2, this.Original_id)
    this.Solution_temps.push(finalid)
    SetModels('GaussE', finalid, id1, id2)
    DOM_Object[finalid]['real'] = self[finalid].Solution_real
    DOM_Object[finalid]['size'] = self[finalid]['Format_size']
    DOM_Object[finalid]['imag']['0-0'] = 0
    DOM_Object[finalid]['units'] = self[finalid].Units_units
    self[pid].Solution_variable_array[pos] = finalid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  } else {
    var finalid = ''
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Gauss_Elimination(id1, id2, Original_id) {
  var x = {}
  var index = 0
  if (self[id1].Format_size == '1x1') {
    Set_Error(Original_id, 'Gauss2', id1)
  }
  var sizes = self[id1].Format_size.split('x')
  if (sizes[0] !== sizes[1]) {
    Set_Error(Original_id, 'Gauss2', id1)
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[Original_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var newid = CreateEq(this.fileid, 0, eqobj)
  newmat = self[id1].Solution_real
  // Append the b matrix onto the coefficient matrix
  for (var a = 0; a < sizes[0]; a++) {
    key = a + '-' + sizes[0]
    newmat[key] = self[id2].Solution_real[a + '-0']
  }
  self[newid].Solution_real = newmat
  newsize = parseInt(sizes[0]) + 1
  size = parseInt(sizes[0])
  index = 0
  for (var a = 0; a < size - 1; a++) {
    var max = 0
    var tempobj = {}
    for (var b = a; b < size; b++) {
      if (Math.abs(newmat[b + '-' + a]) > max) {
        max = Math.abs(newmat[b + '-' + a])
        index = b
      }
    }
    // This is the row pivoting.
    if (index !== a) {
      for (var b = 0; b < newsize; b++) {
        tempobj[b] = newmat[a + '-' + b]
        newmat[a + '-' + b] = newmat[index + '-' + b]
        newmat[index + '-' + b] = tempobj[b]
      }
    }
    // This is the forward elimination
    for (var b = a + 1; b < size; b++) {
      factor = parseFloat(Big(newmat[b + '-' + a]).div(Big(newmat[a + '-' + a])))
      for (var c = a; c < newsize; c++) {
        newmat[b + '-' + c] = parseFloat(Big(newmat[b + '-' + c]).minus(Big(factor).times(Big(newmat[a + '-' + c]))))
      }
    }
  }
  for (var a = 0; a < size; a++) {
    x[a + '-0'] = 0
  }
  x[size - 1 + '-0'] = ToNum(
    newmat[parseInt(size - 1) + '-' + size] / newmat[parseInt(size - 1) + '-' + parseInt(size - 1)]
  )
  // The is the back substitution
  for (var a = size - 2; a >= 0; a--) {
    var temp = 0
    for (var b = a + 1; b < size; b++) {
      temp = parseFloat(Big(temp).plus(Big(newmat[a + '-' + b]).times(Big(x[parseInt(b) + '-0']))))
    }
    x[a + '-0'] = parseFloat(
      Big(newmat[a + '-' + size])
        .minus(Big(temp))
        .div(Big(newmat[a + '-' + a]))
    )
    //		x[a+'-0']=ToNum(ToNum((newmat[a+'-'+size]-ToNum(temp)))/ToNum(newmat[a+'-'+a]));
  }
  self[newid].Solution_real = x
  self[newid].Format_showequation =
    'GaussE \\left(' + self[id1].Format_showequation + ', ' + self[id2].Format_showequation + '\\right)'
  for (var i in self[newid].Units_base_array) {
    self[newid].Units_base_array[i] = self[id2].Units_base_array[i] - self[id1].Units_base_array[i]
  }
  self[newid].Recompose_Units()
  self[newid].Get_BaseString()
  return newid
}
//-------------------------------------------------------------------------------------------------------------------------//

/*-------------------------------------------------------------------------------------------------------------------------*/
/*--------------------------------------------- LU DECOMPOSITION ALGORITHM ------------------------------------------------*/
/*-------------------------------------------------------------------------------------------------------------------------*\
	This algorithm decomposes a matrix into upper and lower matrices through LU decomposition. It returns two 				\
	two-dimensional matrices. It expects that the user called the function using [a, b]=LUDecomp(Matrix) and the code 		\
	prevents the use of the function inline with other items as you cannot determine which returned value will be used.		\
/*-------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.LUDecomp = function (replacetext, pid, pos, callback) {
  this.inline = 0
  var flag = 0
  var newmat = {}
  var newsize = 0
  var size = 0
  var key = ''
  var factor = 0
  var lower = {}
  replacetext = replacetext.replace(/^LUDecomp\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var left = this.Format_left.replace(/^\s+|\s+$|^\[|\]$/g, '')
  var outputarray = InputArray(left)
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'LUDecomp')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'LUDecomp1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  if (self[id1].Format_size == '1x1') {
    Set_Error(this.Original_id, 'LUDecomp3', id1)
    flag = 1
  }
  var sizes = self[id1].Format_size.split('x')
  if (sizes[0] !== sizes[1]) {
    Set_Error(this.Original_id, 'LUDecomp4', id1)
    flag = 1
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    newmat = self[id1].Solution_real
    size = parseInt(sizes[0])
    index = 0
    for (var a = 0; a < size - 1; a++) {
      for (var b = a + 1; b < size; b++) {
        factor = parseFloat(Big(newmat[b + '-' + a]).div(Big(newmat[a + '-' + a])))
        for (var c = a; c < size; c++) {
          newmat[b + '-' + c] = parseFloat(Big(newmat[b + '-' + c]).minus(Big(factor).times(Big(newmat[a + '-' + c]))))
        }
        lower[b + '-' + a] = factor
      }
    }
    for (var a = 0; a < size; a++) {
      for (var b = 0; b < size; b++) {
        if (a < b) {
          newmat[b + '-' + a] = 0
        }
      }
    }
    for (var a = 0; a < size; a++) {
      for (var b = 0; b < size; b++) {
        if (a < b) {
          lower[a + '-' + b] = 0
        } else if (a == b) {
          lower[a + '-' + b] = 1
        }
      }
    }
    self[newid].Solution_real = newmat
    self[newid].Format_showequation = 'LUDecomp \\left(' + self[id1].Format_showequation + '\\right)'
    SetModels('LUDecomp', newid, id1)
    this.Format_type = 6
    this.Solution_temps.push(newid)
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_name: outputarray[0],
      equation: outputarray[0] + '=' + this.Format_right
    }
    var upid = CreateEq(this.fileid, 0, eqobj)
    self[upid].Solution_real = newmat
    self[upid].Format_showequation = 'LUDecomp \\left(' + self[id1].Format_showequation + '\\right)'
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_name: outputarray[1],
      equation: outputarray[1] + '=' + this.Format_right
    }
    var downid = CreateEq(this.fileid, 0, eqobj)
    self[downid].Solution_real = lower
    self[downid].Format_showequation = 'LUDecomp \\left(' + self[id1].Format_showequation + '\\right)'
    this.connected_ids = {}
    this.connected_ids[upid] = 1
    this.connected_ids[downid] = 1
    DOM_Object[upid]['real'] = self[upid].Solution_real
    DOM_Object[upid]['size'] = self[upid]['Format_size']
    DOM_Object[upid]['imag']['0-0'] = 0
    DOM_Object[upid]['units'] = self[upid].Units_units
    DOM_Object[downid]['real'] = self[downid].Solution_real
    DOM_Object[downid]['size'] = self[downid]['Format_size']
    DOM_Object[downid]['imag']['0-0'] = 0
    DOM_Object[downid]['units'] = self[downid].Units_units
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    self[pid].Solution_variable_array[pos] = newid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  } else {
    var newid = ''
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------------- LU MATRIX INVERSE Routine ------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
/*
This is the algorithm to compute the inverse of a matrix using the LU decomposition scheme.
*/
Equation.prototype.InverseLU = function (replacetext, pid, pos, callback) {
  var flag = 0
  var upper = {}
  var newsize = 0
  var size = 0
  var key = ''
  var factor = 0
  var lower = {}
  var index = 0
  replacetext = replacetext.replace(/^InverseLU\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'InverseLU')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'InverseLU')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  if (self[id1].Format_size == '1x1') {
    Set_Error(this.Original_id, 'InverseLU2', id1)
    flag = 1
  }
  var sizes = self[id1].Format_size.split('x')
  if (sizes[0] !== sizes[1]) {
    Set_Error(this.Original_id, 'InverseLU2', id1)
    flag = 1
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    upper = self[id1].Solution_real
    size = parseInt(sizes[0])
    for (var a = 0; a < size - 1; a++) {
      for (var b = a + 1; b < size; b++) {
        factor = parseFloat(Big(upper[b + '-' + a]).div(Big(upper[a + '-' + a])))
        for (var c = a; c < size; c++) {
          upper[b + '-' + c] = parseFloat(Big(upper[b + '-' + c]).minus(Big(factor).times(upper[a + '-' + c])))
        }
        lower[b + '-' + a] = factor
      }
    }
    var Matrix = {}
    for (var a = 0; a < size; a++) {
      for (var b = 0; b < size; b++) {
        if (a < b) {
          upper[b + '-' + a] = 0
        }
      }
    }
    for (var a = 0; a < size; a++) {
      for (var b = 0; b < size; b++) {
        if (a < b) {
          lower[a + '-' + b] = 0
        } else if (a == b) {
          lower[a + '-' + b] = 1
        }
      }
    }

    for (var row = 0; row < size; row++) {
      var D = {}
      var B = {}
      for (var c = 0; c < size; c++) {
        if (c == row) {
          B[c] = 1
        } else {
          B[c] = 0
        }
      }
      for (var a = 0; a < size; a++) {
        var temp = B[a]
        // The is the forward substitution on the lower
        for (var b = 0; b < a; b++) {
          temp = parseFloat(Big(temp).minus(Big(Big(lower[a + '-' + b]).times(Big(D[b])))))
        }
        D[a] = parseFloat(Big(temp).div(Big(lower[a + '-' + a])))
      }
      vect = {}
      for (var a = 0; a < size; a++) {
        vect[a] = 0
      }
      for (var a = size - 1; a >= 0; a--) {
        var temp = D[a]
        // The is the back substitution
        for (var b = a + 1; b < size; b++) {
          temp = parseFloat(Big(temp).minus(Big(upper[a + '-' + b]).times(Big(vect[b]))))
        }
        vect[a] = parseFloat(Big(temp).div(Big(upper[a + '-' + a])))
      }
      for (var a = 0; a < size; a++) {
        Matrix[a + '-' + row] = vect[a]
      }
    }
    self[newid].Solution_real = Matrix
    self[newid].Format_showequation = self[id1].Format_showequation + '^{-1}'
    this.Solution_temps.push(newid)
    SetModels('InverseLU', newid, id1)
    self[newid].Units_base_array = self[id1].Units_base_array
    self[newid].Units_base_string = self[id1].Units_base_string
    self[newid].Units_units = self[id1].Units_units
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    self[pid].Solution_variable_array[pos] = newid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  } else {
    var newid = ''
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//-------------------------------- MATH FUNCTION MEAN (Average) -------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.mean = function (replacetext, pid, pos, callback) {
  var basestring = ''
  var tempbasestring = ''
  var average = 0
  var avgImag = 0
  var count = 0
  var temp = ''
  var matsize = 0
  var matcount = 0
  replacetext = replacetext.replace(/^mean\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var showeq = ''
  var num = ''
  var dim = ''
  var units = ''
  var quan = ''
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'Mean1')
  }
  var nums = new Array()
  var thistext = ''
  for (var a = 0; a < inputarray.length; a = a + 1) {
    inputarray[a] = inputarray[a].replace(/^\s+|\s+$/g, '')
    if (isNumber(inputarray[a])) {
      average = parseFloat(average) + parseFloat(inputarray[a])
      count = parseInt(count, 10) + 1
      num = num + ', ' + inputarray[a]
      dim = dim + ', 1x1'
      units = units + ', NA'
      quan = quan + ', NA'
      showeq = showeq + ', ' + inputarray[a]
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 0, eqobj)
    } else if (inputarray[a].match('#Table')) {
      var numberarray = Get_Table_Elements(inputarray[a], 1)
      for (var b = 0; b < numberarray.length; b = b + 1) {
        average = parseFloat(average) + parseFloat(numberarray[b])
        count = parseInt(count, 10) + 1
        num = num + ', ' + numberarray[b]
        dim = dim + ', 1x1'
        units = units + ', NA'
        quan = quan + ', NA'
      }
      showeq = showeq + ', ' + inputarray[a]
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 0, eqobj)
    } else {
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 1, eqobj)
      if (a === 0) {
        basestring = self[tempid].Units_base_string
      } else {
        if (basestring != self[tempid].Units_base_string) {
          Set_Error(this.Original_id, 'Mean2')
        }
      }
      if (self[tempid].Format_size == '1x1') {
        average = parseFloat(average) + ToNum(self[tempid].Solution_real['0-0'])
        avgImag = parseFloat(avgImag) + ToNum(self[tempid].Solution_imag['0-0'])
        count = parseInt(count, 10) + 1
      } else {
        temp = self[tempid].Format_size.split('x')
        matsize = temp[0]
        matcount = 0
        for (var mat = 1; mat < temp.length; mat++) {
          matsize = matsize * temp[mat]
        }
        for (var i in self[tempid].Solution_real) {
          average = ToNum(average) + ToNum(self[tempid].Solution_real[i])
          if (self[tempid].Solution_imag[i] !== undefined) {
            avgImag = parseFloat(avgImag) + ToNum(self[tempid].Solution_imag[i])
          } else {
            avgImag = parseFloat(avgImag) + ToNum(self[tempid].Solution_imagdefault)
          }
          count = parseInt(count, 10) + 1
          matcount = parseInt(matcount, 10) + 1
        }
        for (var mat = matcount; mat < matsize; mat++) {
          average = ToNum(average) + ToNum(self[tempid].Solution_realdefault)
          avgImag = parseFloat(avgImag) + ToNum(self[tempid].Solution_imagdefault)
          count = parseInt(count, 10) + 1
        }
      }
      num = num + ', ' + self[tempid].Format_showequation
      dim = dim + ', ' + self[tempid].Format_size
      if (self[tempid].Units_units === '') {
        units = units + ', NA'
      } else {
        units = units + ', ' + self[tempid].Units_units
      }
      if (self[tempid].Units_quantity === '') {
        quan = quan + ', NA'
      } else {
        quan = quan + ', ' + self[tempid].Units_quantity
      }
      showeq = showeq + ', ' + self[tempid].Format_showequation
    }
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var eqid = CreateEq(this.fileid, 0, eqobj)
  self[eqid].Solution_real['0-0'] = ToNum(average / count)
  self[eqid].Solution_imag['0-0'] = ToNum(avgImag / count)
  showeq = showeq.replace(/^,/, '')
  num = num.replace(/^,/, '')
  dim = dim.replace(/^,/, '')
  quan = quan.replace(/^,/, '')
  units = units.replace(/^,/, '')
  self[eqid].Format_showequation = 'mean\\left(' + showeq + '\\right)'
  this.Solution_temps.push(eqid)
  DOM_Object[eqid]['real'] = self[eqid].Solution_real
  DOM_Object[eqid]['size'] = self[eqid]['Format_size']
  DOM_Object[eqid]['imag'] = self[eqid].Solution_imag
  DOM_Object[eqid]['units'] = self[eqid].Units_units
  self[eqid].Units_base_array = self[tempid].Units_base_array
  self[eqid].Units_base_string = self[tempid].Units_base_string
  self[eqid].Units_units = self[tempid].Units_units
  self[eqid].Models_numerical = 'mean\\left(' + num + '\\right)'
  self[eqid].Models_dimensions = 'mean\\left(' + dim + '\\right)'
  self[eqid].Models_quantities = 'mean\\left(' + quan + '\\right)'
  self[eqid].Models_units = 'mean\\left(' + units + '\\right)'
  self[pid].Solution_variable_array[pos] = eqid
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//-------------------------------- MATH FUNCTION SUM -------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.sum = function (replacetext, pid, pos, callback) {
  var basestring = '',
    tempbasestring = '',
    sum = 0,
    temp = '',
    matsize = 0,
    matcount = 0,
    showeq = '',
    num = '',
    imagSum = 0
  var dim = '',
    units = '',
    quan = '',
    nums = new Array(),
    thistext = ''
  replacetext = replacetext.replace(/^sum\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'Sum1')
  }

  // Loop through the inputs and add them together
  for (var a = 0; a < inputarray.length; a = a + 1) {
    inputarray[a] = inputarray[a].replace(/^\s+|\s+$/g, '')

    // If its a number, add it to the sum
    if (isNumber(inputarray[a])) {
      sum = parseFloat(sum) + parseFloat(inputarray[a])
      num = num + ', ' + inputarray[a]
      dim = dim + ', 1x1'
      units = units + ', NA'
      quan = quan + ', NA'
      showeq = showeq + ', ' + inputarray[a]

      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 0, eqobj)

      // If it's a table, add the cells
    } else if (inputarray[a].match('#Table')) {
      var numberarray = Get_Table_Elements(inputarray[a], 1)
      for (var b = 0; b < numberarray.length; b = b + 1) {
        sum = parseFloat(sum) + parseFloat(numberarray[b])
        num = num + ', ' + numberarray[b]
        dim = dim + ', 1x1'
        units = units + ', NA'
        quan = quan + ', NA'
      }
      showeq = showeq + ', ' + inputarray[a]

      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 0, eqobj)

      // If it needs to be solved, do that
    } else {
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 1, eqobj)
      if (a === 0) {
        basestring = self[tempid].Units_base_string
      } else {
        if (basestring != self[tempid].Units_base_string) {
          Set_Error(this.Original_id, 'Sum2')
        }
      }
      if (self[tempid].Format_size == '1x1') {
        sum = parseFloat(sum) + ToNum(self[tempid].Solution_real['0-0'])
        imagSum = parseFloat(imagSum) + ToNum(self[tempid].Solution_imag['0-0'])
      } else {
        temp = self[tempid].Format_size.split('x')
        matsize = temp[0]
        matcount = 0
        for (var mat = 1; mat < temp.length; mat++) {
          matsize = matsize * temp[mat]
        }
        for (var i in self[tempid].Solution_real) {
          sum = ToNum(sum) + ToNum(self[tempid].Solution_real[i])
          if (self[tempid].Solution_imag[i] !== undefined) {
            imagSum = ToNum(imagSum) + ToNum(self[tempid].Solution_imag[i])
          }
          matcount = parseInt(matcount, 10) + 1
        }
        for (var mat = matcount; mat < matsize; mat++) {
          sum = ToNum(sum) + ToNum(self[tempid].Solution_realdefault)
          imagSum = ToNum(imagSum) + ToNum(self[tempid].Solution_imagdefault)
        }
      }

      // Create the display items
      num = num + ', ' + self[tempid].Format_showequation
      dim = dim + ', ' + self[tempid].Format_size
      if (self[tempid].Units_units === '') {
        units = units + ', NA'
      } else {
        units = units + ', ' + self[tempid].Units_units
      }
      if (self[tempid].Units_quantity === '') {
        quan = quan + ', NA'
      } else {
        quan = quan + ', ' + self[tempid].Units_quantity
      }
      showeq = showeq + ', ' + self[tempid].Format_showequation
    }
  }

  // Place the results variable object into the variable in place of the text
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var eqid = CreateEq(this.fileid, 0, eqobj)
  self[eqid].Solution_real['0-0'] = sum
  self[eqid].Solution_imag['0-0'] = imagSum
  self[eqid].Format_showtype = 'builtin'

  showeq = showeq.replace(/^,/, '')
  num = num.replace(/^,/, '')
  dim = dim.replace(/^,/, '')
  quan = quan.replace(/^,/, '')
  units = units.replace(/^,/, '')

  self[eqid].Format_showequation = 'sum\\left(' + showeq + '\\right)'
  this.Solution_temps.push(eqid)
  DOM_Object[eqid]['real'] = self[eqid].Solution_real
  DOM_Object[eqid]['imag'] = self[eqid].Solution_imag
  DOM_Object[eqid]['size'] = self[eqid]['Format_size']
  DOM_Object[eqid]['units'] = self[eqid].Units_units
  self[eqid].Units_base_array = self[tempid].Units_base_array
  self[eqid].Units_base_string = self[tempid].Units_base_string
  self[eqid].Units_units = self[tempid].Units_units
  self[eqid].Models_numerical = 'sum\\left(' + num + '\\right)'
  self[eqid].Models_dimensions = 'sum\\left(' + dim + '\\right)'
  self[eqid].Models_quantities = 'sum\\left(' + quan + '\\right)'
  self[eqid].Models_units = 'sum\\left(' + units + '\\right)'
  self[pid].Solution_variable_array[pos] = eqid
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//------------------------------------------ MATH FUNCTION MEDIAN -----------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.median = function (replacetext, pid, pos, callback) {
  var showeq = ''
  var num = ''
  var dim = ''
  var units = ''
  var quan = ''
  var matsize = 0
  var basestring = ''
  var tempbasestring = ''
  var answer = 0
  var quantity = ''
  var matcount = 0
  replacetext = replacetext.replace(/^median\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'Median1')
  }
  var nums = new Array()
  var thistext = ''
  for (var a = 0; a < inputarray.length; a = a + 1) {
    inputarray[a] = inputarray[a].replace(/^\s+|\s+$/g, '')
    if (isNumber(inputarray[a])) {
      nums.push(parseFloat(inputarray[a]))
      if (quantity !== '') {
        Set_Error(this.Original_id, 'Median1')
      }
      num = num + ', ' + inputarray[a]
      dim = dim + ', 1x1'
      units = units + ', NA'
      quan = quan + ', NA'
      showeq = showeq + ', ' + inputarray[a]
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 0, eqobj)
    } else if (inputarray[a].match('#Table')) {
      var numberarray = Get_Table_Elements(inputarray[a], 1)
      for (var b = 0; b < numberarray.length; b++) {
        nums.push(numberarray[b])
        num = num + ', ' + numberarray[b]
        dim = dim + ', 1x1'
        units = units + ', NA'
        quan = quan + ', NA'
      }
      showeq = showeq + ', ' + inputarray[a]
      if (quantity !== '') {
        Set_Error(this.Original_id, 'Median1')
      }
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 0, eqobj)
    } else {
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 1, eqobj)
      if (self[tempid].Format_size == '1x1') {
        nums.push(ToNum(self[tempid].Solution_real['0-0']))
        if (quantity !== '') {
          Set_Error(this.Original_id, 'Median1')
        }
      } else {
        temp = self[tempid].Format_size.split('x')
        matsize = temp[0]
        matcount = 0
        for (var mat = 1; mat < temp.length; mat++) {
          matsize = matsize * temp[mat]
        }
        for (var i in self[tempid].Solution_real) {
          nums.push(ToNum(self[tempid].Solution_real[i]))
          matcount = parseInt(matcount, 10) + 1
        }
      }
      for (var mat = matcount; mat < matsize; mat++) {
        nums.push(self[tempid].Solution_realdefault)
      }
      num = num + ', ' + self[tempid].Format_showequation
      dim = dim + ', ' + self[tempid].Format_size
      if (self[tempid].Units_units === '') {
        units = units + ', NA'
      } else {
        units = units + ', ' + self[tempid].Units_units
      }
      if (self[tempid].Units_quantity === '') {
        quan = quan + ', NA'
      } else {
        quan = quan + ', ' + self[tempid].Units_quantity
      }
      showeq = showeq + ', ' + self[tempid].Format_showequation
    }
  }
  nums.sort(function (y, z) {
    return y - z
  })
  if (nums.length % 2 == 1) {
    answer = nums[Math.floor(nums.length / 2)]
  } else {
    answer = ToNum((nums[Math.floor(nums.length / 2)] + nums[Math.ceil(nums.length / 2)]) / 2)
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var eqid = CreateEq(this.fileid, 0, eqobj)
  self[eqid].Solution_real['0-0'] = answer
  showeq = showeq.replace(/^,/, '')
  num = num.replace(/^,/, '')
  dim = dim.replace(/^,/, '')
  quan = quan.replace(/^,/, '')
  units = units.replace(/^,/, '')
  self[eqid].Format_showequation = 'median\\left(' + replacetext + '\\right)'
  this.Solution_temps.push(eqid)
  self[eqid].Units_base_array = self[tempid].Units_base_array
  self[eqid].Units_base_string = self[tempid].Units_base_string
  self[eqid].Units_units = self[tempid].Units_units
  self[eqid].Models_numerical = 'median\\left(' + num + '\\right)'
  self[eqid].Models_dimensions = 'median\\left(' + dim + '\\right)'
  self[eqid].Models_quantities = 'median\\left(' + quan + '\\right)'
  self[eqid].Models_units = 'median\\left(' + units + '\\right)'
  DOM_Object[eqid]['real'] = self[eqid].Solution_real
  DOM_Object[eqid]['size'] = self[eqid]['Format_size']
  DOM_Object[eqid]['imag']['0-0'] = 0
  DOM_Object[eqid]['units'] = self[eqid].Units_units
  self[pid].Solution_variable_array[pos] = eqid
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//------------------------------------------ MATH FUNCTION MODE -------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.mode = function (replacetext, pid, pos, callback) {
  var showeq = ''
  var num = ''
  var dim = ''
  var units = ''
  var quan = ''
  var basestring = ''
  var tempbasestring = ''
  var answer = 0
  var modeobj = {}
  var sol = 0
  var matcount = 0
  var modenum = 0
  var modearray = new Array()
  var matsize = 0
  replacetext = replacetext.replace(/^mode\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'Mode1')
  }
  var nums = new Array()
  var thistext = ''
  for (var a = 0; a < inputarray.length; a = a + 1) {
    inputarray[a] = inputarray[a].replace(/^\s+|\s+$/g, '')
    if (isNumber(inputarray[a])) {
      if (modeobj[inputarray[a]] === undefined) {
        modeobj[inputarray[a]] = 1
      } else {
        modeobj[inputarray[a]] = parseInt(modeobj[inputarray[a]], 10) + 1
      }
      num = num + ', ' + inputarray[a]
      dim = dim + ', 1x1'
      units = units + ', NA'
      quan = quan + ', NA'
      showeq = showeq + ', ' + inputarray[a]
    } else if (inputarray[a].match('#Table')) {
      var numberarray = Get_Table_Elements(inputarray[a], 1)
      for (var b = 0; b < numberarray.length; b = b + 1) {
        if (modeobj[numberarray[b]] === undefined) {
          modeobj[numberarray[b]] = 1
        } else {
          modeobj[numberarray[b]] = parseInt(modeobj[numberarray[b]], 10) + 1
        }
        num = num + ', ' + numberarray[b]
        dim = dim + ', 1x1'
        units = units + ', NA'
        quan = quan + ', NA'
      }
      showeq = showeq + ', ' + inputarray[a]
    } else {
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 1, eqobj)
      if (self[tempid].Format_size == '1x1') {
        sol = ToNum(self[tempid].Solution_real['0-0'])
        if (modeobj[sol] === undefined) {
          modeobj[sol] = 1
        } else {
          modeobj[sol] = parseInt(modeobj[sol], 10) + 1
        }
      } else {
        temp = self[tempid].Format_size.split('x')
        matsize = temp[0]
        for (var i in self[tempid].Solution_real) {
          sol = ToNum(self[tempid].Solution_real[i])
          if (modeobj[sol] === undefined) {
            modeobj[sol] = 1
          } else {
            modeobj[sol] = parseInt(modeobj[sol], 10) + 1
          }
          matcount = parseInt(matcount, 10) + 1
        }
      }
      num = num + ', ' + self[tempid].Format_showequation
      dim = dim + ', ' + self[tempid].Format_size
      if (self[tempid].Units_units === '') {
        units = units + ', NA'
      } else {
        units = units + ', ' + self[tempid].Units_units
      }
      if (self[tempid].Units_quantity === '') {
        quan = quan + ', NA'
      } else {
        quan = quan + ', ' + self[tempid].Units_quantity
      }
      showeq = showeq + ', ' + self[tempid].Format_showequation
    }
  }
  for (var a in modeobj) {
    if (modeobj[a] > modenum) {
      modenum = modeobj[a]
    }
  }

  for (var a in modeobj) {
    if (modeobj[a] == modenum) {
      modearray.push(a)
    }
  }

  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var eqid = CreateEq(this.fileid, 0, eqobj)
  for (var a = 0; a < modearray.length; a++) {
    self[eqid].Solution_real['0-' + a] = modearray[a]
  }
  this.Solution_temps.push(eqid)
  showeq = showeq.replace(/^,/, '')
  num = num.replace(/^,/, '')
  dim = dim.replace(/^,/, '')
  quan = quan.replace(/^,/, '')
  units = units.replace(/^,/, '')
  self[eqid].Format_showequation = 'mode\\left(' + showeq + '\\right)'
  DOM_Object[eqid]['real'] = self[eqid].Solution_real
  DOM_Object[eqid]['size'] = self[eqid]['Format_size']
  DOM_Object[eqid]['imag']['0-0'] = 0
  DOM_Object[eqid]['units'] = self[eqid].Units_units
  self[eqid].Models_numerical = 'mode\\left(' + num + '\\right)'
  self[eqid].Models_dimensions = 'mode\\left(' + dim + '\\right)'
  self[eqid].Models_quantities = 'mode\\left(' + quan + '\\right)'
  self[eqid].Models_units = 'mode\\left(' + units + '\\right)'
  self[pid].Solution_variable_array[pos] = eqid
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//------------------------------------------ MATH FUNCTION RANGE ------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.range = function (replacetext, pid, pos, callback) {
  var max = 0
  var min = 9999999999999999999999999999
  var sol = 0
  var matcount = 0
  var matsize = 0
  var startflag = 0
  var showeq = ''
  var num = ''
  var dim = ''
  var units = ''
  var quan = ''
  replacetext = replacetext.replace(/^range\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'Range1')
  }
  var nums = new Array()
  var thistext = ''
  for (var a = 0; a < inputarray.length; a = a + 1) {
    inputarray[a] = inputarray[a].replace(/^\s+|\s+$/g, '')
    if (isNumber(inputarray[a])) {
      if (a === 0) {
        max = inputarray[a]
        min = inputarray[a]
      }
      if (ToNum(inputarray[a]) > max) {
        max = ToNum(inputarray[a])
      } else if (ToNum(inputarray[a]) < min) {
        min = ToNum(inputarray[a])
      }
      num = num + ', ' + inputarray[a]
      dim = dim + ', 1x1'
      units = units + ', NA'
      quan = quan + ', NA'
      showeq = showeq + ', ' + inputarray[a]
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 0, eqobj)
    } else if (inputarray[a].match('#Table')) {
      var numberarray = Get_Table_Elements(inputarray[a], 1)
      if (a === 0) {
        max = ToNum(numberarray[0])
        min = ToNum(numberarray[a])
      }
      for (var b = 0; b < numberarray.length; b = b + 1) {
        if (ToNum(numberarray[b]) > max) {
          max = ToNum(numberarray[b])
        } else if (ToNum(numberarray[b]) < min) {
          min = ToNum(numberarray[b])
        }
        num = num + ', ' + numberarray[b]
        dim = dim + ', 1x1'
        units = units + ', NA'
        quan = quan + ', NA'
      }
      showeq = showeq + ', ' + inputarray[a]
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 0, eqobj)
    } else {
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 1, eqobj)
      if (self[tempid].Format_size == '1x1') {
        sol = ToNum(self[tempid].Solution_real['0-0'])
        if (a === 0) {
          max = sol
          min = sol
        }
        if (sol > max) {
          max = sol
        }
        if (sol < min) {
          min = sol
        }
      } else {
        temp = self[tempid].Format_size.split('x')
        matsize = temp[0]
        matcount = 0
        for (var mat = 1; mat < temp.length; mat++) {
          matsize = matsize * temp[mat]
        }
        if (a === 0) {
          startflag = 0
        }
        for (var i in self[tempid].Solution_real) {
          sol = ToNum(self[tempid].Solution_real[i])
          if (startflag === 0) {
            max = sol
            min = sol
            startflag = 1
          }
          if (ToNum(sol) > max) {
            max = sol
          }
          if (ToNum(sol) < min) {
            min = sol
          }
          matcount = parseInt(matcount, 10) + 1
        }
      }
      if (matcount < matsize - 1) {
        if (self[tempid].Solution_realdefault > max) {
          max = self[tempid].Solution_realdefault
        }
        if (self[tempid].Solution_realdefault < min) {
          min = self[tempid].Solution_realdefault
        }
      }
      num = num + ', ' + self[tempid].Format_showequation
      dim = dim + ', ' + self[tempid].Format_size
      if (self[tempid].Units_units === '') {
        units = units + ', NA'
      } else {
        units = units + ', ' + self[tempid].Units_units
      }
      if (self[tempid].Units_quantity === '') {
        quan = quan + ', NA'
      } else {
        quan = quan + ', ' + self[tempid].Units_quantity
      }
      showeq = showeq + ', ' + self[tempid].Format_showequation
    }
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var eqid = CreateEq(this.fileid, 0, eqobj)
  showeq = showeq.replace(/^,/, '')
  num = num.replace(/^,/, '')
  dim = dim.replace(/^,/, '')
  quan = quan.replace(/^,/, '')
  units = units.replace(/^,/, '')
  self[eqid].Solution_real['0-0'] = ToNum(max - min)
  self[eqid].Format_showequation = 'range\\left(' + showeq + '\\right)'
  self[eqid].Units_base_array = self[tempid].Units_base_array
  self[eqid].Units_base_string = self[tempid].Units_base_string
  self[eqid].Units_units = self[tempid].Units_units
  self[eqid].Models_numerical = 'range\\left(' + num + '\\right)'
  self[eqid].Models_dimensions = 'range\\left(' + dim + '\\right)'
  self[eqid].Models_quantities = 'range\\left(' + quan + '\\right)'
  self[eqid].Models_units = 'range\\left(' + units + '\\right)'
  DOM_Object[eqid]['real'] = self[eqid].Solution_real
  DOM_Object[eqid]['size'] = self[eqid]['Format_size']
  DOM_Object[eqid]['imag']['0-0'] = 0
  DOM_Object[eqid]['units'] = self[eqid].Units_units
  this.Solution_temps.push(eqid)
  self[pid].Solution_variable_array[pos] = eqid
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//-------------------------------- MATH FUNCTION STANDARD DEVIATION ---------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.stdev = function (replacetext, pid, pos, callback) {
  var average = 0
  var count = 0
  var temp = ''
  var matsize = 0
  var matcount = 0
  inobj = {}
  var thisavg = 0
  var minsum = 0
  var sol = 0
  var showeq = ''
  var num = ''
  var dim = ''
  var units = ''
  var quan = ''
  replacetext = replacetext.replace(/^stdev\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'StdDev1')
  }
  var nums = new Array()
  var thistext = ''
  for (var a = 0; a < inputarray.length; a++) {
    inputarray[a] = inputarray[a].replace(/^\s+|\s+$/g, '')
    if (isNumber(inputarray[a])) {
      average = parseFloat(average) + parseFloat(inputarray[a])
      count = parseInt(count, 10) + 1
      num = num + ', ' + inputarray[a]
      dim = dim + ', 1x1'
      units = units + ', NA'
      quan = quan + ', NA'
      showeq = showeq + ', ' + inputarray[a]
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 0, eqobj)
    } else if (inputarray[a].match('#Table')) {
      var numberarray = Get_Table_Elements(inputarray[a], 1)
      for (var b = 0; b < numberarray.length; b = b + 1) {
        average = parseFloat(average) + parseFloat(numberarray[b])
        count = parseInt(count, 10) + 1
        num = num + ', ' + numberarray[b]
        dim = dim + ', 1x1'
        units = units + ', NA'
        quan = quan + ', NA'
      }
      showeq = showeq + ', ' + inputarray[a]
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 0, eqobj)
    } else {
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 1, eqobj)
      if (self[tempid].Format_size == '1x1') {
        average = parseFloat(average) + ToNum(self[tempid].Solution_real['0-0'] / self[tempid].Units_multiplier)
        count = parseInt(count, 10) + 1
        inobj[a] = tempid
      } else {
        temp = self[tempid].Format_size.split('x')
        matsize = temp[0]
        matcount = 0
        inobj[a] = tempid
        for (var mat = 1; mat < parseInt(temp.length, 10); mat++) {
          matsize = matsize * temp[mat]
        }
        for (var i in self[tempid].Solution_real) {
          average = ToNum(average) + ToNum(self[tempid].Solution_real[i] / self[tempid].Units_multiplier)
          count = parseInt(count, 10) + 1
          matcount++
        }
      }
      for (var mat = matcount; mat < matsize; mat++) {
        average = ToNum(average) + ToNum(self[tempid].Solution_realdefault)
        count = parseInt(count, 10) + 1
      }
      num = num + ', ' + self[tempid].Format_showequation
      dim = dim + ', ' + self[tempid].Format_size
      if (self[tempid].Units_units === '') {
        units = units + ', NA'
      } else {
        units = units + ', ' + self[tempid].Units_units
      }
      if (self[tempid].Units_quantity === '') {
        quan = quan + ', NA'
      } else {
        quan = quan + ', ' + self[tempid].Units_quantity
      }
      showeq = showeq + ', ' + self[tempid].Format_showequation
    }
  }
  thisavg = ToNum(average / count)
  for (var a = 0; a < inputarray.length; a++) {
    inputarray[a] = inputarray[a].replace(/^\s+|\s+$/g, '')
    if (isNumber(inputarray[a])) {
      minsum = minsum + ToNum(Math.pow(inputarray[a] - thisavg, 2))
    } else if (inputarray[a].match('#Table')) {
      var numberarray = Get_Table_Elements(inputarray[a], 1)
      for (var b = 0; b < numberarray.length; b++) {
        minsum = minsum + ToNum(Math.pow(numberarray[b] - thisavg, 2))
      }
    } else {
      if (self[inobj[a]].Format_size == '1x1') {
        sol = ToNum(self[tempid].Solution_real['0-0'] / self[tempid].Units_multiplier)
        minsum = minsum + ToNum(Math.pow(sol - thisavg, 2))
      } else {
        temp = self[inobj[a]].Format_size.split('x')
        for (var i in self[tempid].Solution_real) {
          sol = ToNum(self[tempid].Solution_real[i] / self[tempid].Units_multiplier)
          minsum = ToNum(minsum) + ToNum(Math.pow(sol - thisavg, 2))
        }
      }
      for (var mat = matcount; mat < matsize; mat++) {
        minsum = minsum + ToNum(Math.pow(self[tempid].Solution_realdefault - thisavg, 2))
      }
    }
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var eqid = CreateEq(this.fileid, 0, eqobj)
  showeq = showeq.replace(/^,/, '')
  num = num.replace(/^,/, '')
  dim = dim.replace(/^,/, '')
  quan = quan.replace(/^,/, '')
  units = units.replace(/^,/, '')
  self[eqid].Solution_real['0-0'] = ToNum(Math.pow(ToNum(minsum / (count - 1)), 0.5))
  self[eqid].Format_showequation = 'stdev\\left(' + showeq + '\\right)'
  this.Solution_temps.push(eqid)
  DOM_Object[eqid]['real'] = self[eqid].Solution_real
  DOM_Object[eqid]['size'] = self[eqid]['Format_size']
  DOM_Object[eqid]['imag']['0-0'] = 0
  DOM_Object[eqid]['units'] = self[eqid].Units_units
  self[eqid].Format_showequation = 'stdev\\left(' + showeq + '\\right)'
  if (tempid !== undefined) {
    self[eqid].Units_base_array = self[tempid].Units_base_array
    self[eqid].Units_base_string = self[tempid].Units_base_string
    self[eqid].Units_units = self[tempid].Units_units
  }
  self[eqid].Models_numerical = 'stdev\\left(' + num + '\\right)'
  self[eqid].Models_dimensions = 'stdev\\left(' + dim + '\\right)'
  self[eqid].Models_quantities = 'stdev\\left(' + quan + '\\right)'
  self[eqid].Models_units = 'stdev\\left(' + units + '\\right)'
  self[pid].Solution_variable_array[pos] = eqid
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//----------------------------------------- MATH FUNCTION VARIANCE ----------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.variance = function (replacetext, pid, pos, callback) {
  var sum1 = 0
  var count = 0
  var temp = ''
  var matsize = 0
  var matcount = 0
  var sum2 = 0
  var sol = 0
  var showeq = ''
  var num = ''
  var dim = ''
  var units = ''
  var quan = ''
  replacetext = replacetext.toString().replace(/^variance\(/, '')
  replacetext = replacetext.toString().replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'Variance1')
  }
  for (var a = 0; a < inputarray.length; a++) {
    inputarray[a] = inputarray[a].replace(/^\s+|\s+$/g, '')
    if (isNumber(inputarray[a])) {
      sum1 = sum1 + parseFloat(inputarray[a])
      sum2 = sum2 + Math.pow(parseFloat(inputarray[a]), 2)
      count++
      num = num + ', ' + inputarray[a]
      dim = dim + ', 1x1'
      units = units + ', NA'
      quan = quan + ', NA'
      showeq = showeq + ', ' + inputarray[a]
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 0, eqobj)
    } else if (inputarray[a].match('#Table')) {
      var numberarray = Get_Table_Elements(inputarray[a], 1)
      for (var b = 0; b < numberarray.length; b++) {
        sum1 = sum1 + parseFloat(numberarray[b])
        sum2 = sum2 + Math.pow(parseFloat(numberarray[b]), 2)
        count++
        num = num + ', ' + numberarray[b]
        dim = dim + ', 1x1'
        units = units + ', NA'
        quan = quan + ', NA'
      }
      showeq = showeq + ', ' + inputarray[a]
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 0, eqobj)
    } else {
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 1, eqobj)
      if (self[tempid].Format_size == '1x1') {
        sol = ToNum(self[tempid].Solution_real['0-0'] / self[tempid].Units_multiplier)
        sum1 = sum1 + parseFloat(sol)
        sum2 = sum2 + Math.pow(parseFloat(sol), 2)
        count++
      } else {
        temp = self[tempid].Format_size.split('x')
        matsize = temp[0]
        matcount = 0
        for (var mat = 1; mat < temp.length; mat++) {
          matsize = matsize * temp[mat]
        }
        for (var i in self[tempid].Solution_real) {
          sol = ToNum(self[tempid].Solution_real[i] / self[tempid].Units_multiplier)
          sum1 = sum1 + parseFloat(sol)
          sum2 = sum2 + Math.pow(parseFloat(sol), 2)
          count++
          matcount++
        }
      }
      for (var mat = matcount; mat < matsize; mat++) {
        sum1 = sum1 + parseFloat(self[tempid].Solution_realdefault)
        sum2 = sum2 + Math.pow(parseFloat(self[tempid].Solution_realdefault), 2)
        count++
      }
      num = num + ', ' + self[tempid].Format_showequation
      dim = dim + ', ' + self[tempid].Format_size
      if (self[tempid].Units_units === '') {
        units = units + ', NA'
      } else {
        units = units + ', ' + self[tempid].Units_units
      }
      if (self[tempid].Units_quantity === '') {
        quan = quan + ', NA'
      } else {
        quan = quan + ', ' + self[tempid].Units_quantity
      }
      showeq = showeq + ', ' + self[tempid].Format_showequation
    }
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var eqid = CreateEq(this.fileid, 0, eqobj)
  self[eqid].Solution_real['0-0'] = ToNum((ToNum(sum2) - ToNum(Math.pow(sum1, 2) / count)) / (count - 1))
  this.Solution_temps.push(eqid)
  showeq = showeq.replace(/^,/, '')
  num = num.replace(/^,/, '')
  dim = dim.replace(/^,/, '')
  quan = quan.replace(/^,/, '')
  units = units.replace(/^,/, '')
  self[eqid].Format_showequation = 'variance\\left(' + showeq + '\\right)'
  if (tempid !== undefined) {
    self[eqid].Units_base_array = self[tempid].Units_base_array
    self[eqid].Units_base_string = self[tempid].Units_base_string
    self[eqid].Units_units = self[tempid].Units_units
  }
  self[eqid].Models_numerical = 'variance\\left(' + num + '\\right)'
  self[eqid].Models_dimensions = 'variance\\left(' + dim + '\\right)'
  self[eqid].Models_quantities = 'variance\\left(' + quan + '\\right)'
  self[eqid].Models_units = 'variance\\left(' + units + '\\right)'
  DOM_Object[eqid]['real'] = self[eqid].Solution_real
  DOM_Object[eqid]['size'] = self[eqid]['Format_size']
  DOM_Object[eqid]['imag']['0-0'] = 0
  DOM_Object[eqid]['units'] = self[eqid].Units_units
  self[pid].Solution_variable_array[pos] = eqid
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//-------------------------------- MATH FUNCTION COEFFICIENT OF VARIANCE ----------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.cv = function (replacetext, pid, pos, callback) {
  var average = 0
  var count = 0
  var temp = ''
  var matsize = 0
  var matcount = 0
  var thisavg = 0
  var minsum = 0
  var sol = 0
  replacetext = replacetext.replace(/^cv\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var showeq = ''
  var num = ''
  var dim = ''
  var units = ''
  var quan = ''
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'CV1')
  }
  var nums = new Array()
  var thistext = ''
  for (var a = 0; a < inputarray.length; a++) {
    inputarray[a] = inputarray[a].replace(/^\s+|\s+$/g, '')
    if (isNumber(inputarray[a])) {
      average = parseFloat(average) + parseFloat(inputarray[a])
      count = parseInt(count, 10) + 1
      num = num + ', ' + inputarray[a]
      dim = dim + ', 1x1'
      units = units + ', NA'
      quan = quan + ', NA'
      showeq = showeq + ', ' + inputarray[a]
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 0, eqobj)
    } else if (inputarray[a].match('#Table')) {
      var numberarray = Get_Table_Elements(inputarray[a], 1)
      for (var b = 0; b < numberarray.length; b++) {
        average = parseFloat(average) + parseFloat(numberarray[b])
        count = parseInt(count, 10) + 1
        num = num + ', ' + numberarray[b]
        dim = dim + ', 1x1'
        units = units + ', NA'
        quan = quan + ', NA'
      }
      showeq = showeq + ', ' + inputarray[a]
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 0, eqobj)
    } else {
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 1, eqobj)
      if (self[tempid].Format_size == '1x1') {
        average = parseFloat(average) + ToNum(self[tempid].Solution_real['0-0'] / self[tempid].Units_multiplier)
        count++
      } else {
        temp = self[tempid].Format_size.split('x')
        matsize = temp[0]
        matcount = 0
        for (var mat = 1; mat < temp.length; mat++) {
          matsize = matsize * temp[mat]
        }
        for (var i in self[tempid].Solution_real) {
          average = ToNum(average) + ToNum(self[tempid].Solution_real[i] / self[tempid].Units_multiplier)
          count++
          matcount++
        }
      }
      for (var mat = matcount; mat < matsize; mat++) {
        average = ToNum(average) + ToNum(self[tempid].Solution_realdefault)
        count++
      }
      num = num + ', ' + self[tempid].Format_showequation
      dim = dim + ', ' + self[tempid].Format_size
      if (self[tempid].Units_units === '') {
        units = units + ', NA'
      } else {
        units = units + ', ' + self[tempid].Units_units
      }
      if (self[tempid].Units_quantity === '') {
        quan = quan + ', NA'
      } else {
        quan = quan + ', ' + self[tempid].Units_quantity
      }
      showeq = showeq + ', ' + self[tempid].Format_showequation
    }
  }
  thisavg = ToNum(average / count)
  for (var a = 0; a < inputarray.length; a++) {
    inputarray[a] = inputarray[a].replace(/^\s+|\s+$/g, '')
    if (isNumber(inputarray[a])) {
      minsum = minsum + ToNum(Math.pow(inputarray[a] - thisavg, 2))
    } else if (inputarray[a].match('#Table')) {
      var numberarray = Get_Table_Elements(inputarray[a], 1)
      for (var b = 0; b < numberarray.length; b = b + 1) {
        minsum = minsum + ToNum(Math.pow(numberarray[b] - thisavg, 2))
      }
    } else {
      var eqobj = {
        Page_position: DOM_Object[this.Format_id]['location'],
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + inputarray[a]
      }
      var tempid = CreateEq(this.fileid, 1, eqobj)
      if (self[tempid].Format_size == '1x1') {
        sol = ToNum(self[tempid].Solution_real['0-0'] / self[tempid].Units_multiplier)
        minsum = minsum + ToNum(Math.pow(sol - thisavg, 2))
      } else {
        temp = self[tempid].Format_size.split('x')
        for (var i in self[tempid].Solution_real) {
          sol = ToNum(self[tempid].Solution_real[i] / self[tempid].Units_multiplier)
          minsum = minsum + ToNum(Math.pow(sol - thisavg, 2))
        }
      }
      for (var mat = matcount; mat < matsize; mat++) {
        minsum = minsum + ToNum(Math.pow(self[tempid].Solution_realdefault - thisavg, 2))
      }
    }
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var eqid = CreateEq(this.fileid, 0, eqobj)
  self[eqid].Solution_real['0-0'] = ToNum(100 * Math.pow(ToNum(minsum / (count - 1)), 0.5)) / thisavg
  this.Solution_temps.push(eqid)
  showeq = showeq.replace(/^,/, '')
  num = num.replace(/^,/, '')
  dim = dim.replace(/^,/, '')
  quan = quan.replace(/^,/, '')
  units = units.replace(/^,/, '')
  self[eqid].Format_showequation = 'cv\\left(' + showeq + '\\right)'
  if (tempid !== undefined) {
    self[eqid].Units_base_array = self[tempid].Units_base_array
    self[eqid].Units_base_string = self[tempid].Units_base_string
    self[eqid].Units_units = self[tempid].Units_units
  }
  self[eqid].Models_numerical = 'cv\\left(' + num + '\\right)'
  self[eqid].Models_dimensions = 'cv\\left(' + dim + '\\right)'
  self[eqid].Models_quantities = 'cv\\left(' + quan + '\\right)'
  self[eqid].Models_units = 'cv\\left(' + units + '\\right)'
  DOM_Object[eqid]['real'] = self[eqid].Solution_real
  DOM_Object[eqid]['size'] = self[eqid]['Format_size']
  DOM_Object[eqid]['imag']['0-0'] = 0
  DOM_Object[eqid]['units'] = self[eqid].Units_units
  self[pid].Solution_variable_array[pos] = eqid
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//------------------------------------ MATH FUNCTION POLYFIT  ---------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.polyfit = function (replacetext, pid, pos, callback) {
  DeleteConnectedEqs(this.Format_id)
  var average = 0,
    key = '',
    sumkey = '',
    meanx = 0,
    meany = 0,
    flag = 0
  replacetext = replacetext.replace(/^polyfit\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Polyfit')
    flag = 1
  }
  if (inputarray.length < 3) {
    Set_Error(this.Original_id, 'Polyfit1')
    flag = 1
  }
  if (inputarray.length > 3) {
    Set_Error(this.Original_id, 'Polyfit2')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    var matid = CreateEq(this.fileid, 0, eqobj)
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    var vecid = CreateEq(this.fileid, 0, eqobj)
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var typeid = CreateEq(this.fileid, 1, eqobj)
    var type = self[typeid].Solution_real['0-0']
    if (type % 1 !== 0 || self[typeid].Format_size != '1x1') {
      Set_Error(this.Original_id, 'Polyfit4', typeid)
    }
    var xsum = new Array(ToNum(ToNum(type) * 2) + 1)
    var ysum = new Array(parseInt(type, 10) + 1)
    for (var a = 0; a < xsum.length; a++) {
      xsum[a] = 0
      ysum[a] = 0
    }
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[1]
    }
    var xid = CreateEq(this.fileid, 1, eqobj)
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[2]
    }
    var yid = CreateEq(this.fileid, 1, eqobj)
    var sizes = self[xid].Format_size.split('x')
    if (self[xid].Format_size != self[yid].Format_size) {
      Set_Error(this.Original_id, 'Polyfit5', xid, yid)
    } //\
    if (sizes[0] > sizes[1]) {
      var thislength = sizes[0]
    } else {
      var thislength = ToNum(sizes[1])
    }
    var count = ToNum(sizes[0] * sizes[1])
    for (var a = 0; a < sizes[0]; a++) {
      for (var b = 0; b < sizes[1]; b++) {
        key = a + '-' + b
        for (var power = 0; power <= parseInt(type, 10) * 2; power++) {
          xsum[power] = xsum[power] + Math.pow(self[xid].Solution_real[key], power)
          ysum[power] = ysum[power] + self[yid].Solution_real[key] * Math.pow(self[xid].Solution_real[key], power)
        }
      }
    }
    for (var a = 0; a <= type; a++) {
      for (var b = 0; b <= type; b++) {
        key = a + '-' + b
        sumkey = parseInt(a, 10) + parseInt(b, 10)
        self[matid].Solution_real[a + '-' + b] = xsum[sumkey]
      }
      self[vecid].Solution_real[a + '-0'] = ysum[a]
    }
    var avg = ysum[0] / (sizes[0] * sizes[1])
    this.Format_type = 6
    self[matid].Solution_real['0-0'] = thislength
    self[matid].Format_size = ToNum(ToNum(type) + ToNum(1)) + 'x' + ToNum(ToNum(type) + ToNum(1))
    self[vecid].Format_size = ToNum(type) + 1 + 'x1'
    var eqid = Gauss_Elimination(matid, vecid, this.Original_id)
    self[eqid].Format_showequation = 'polyfit\\left(' + replacetext + '\\right)'
    this.Solution_temps.push(eqid, matid, vecid)
    var left = this.Format_left.replace(/^\s+|\s+$|^\[|\]$/g, '')
    var outputarray = InputArray(left)
    if (outputarray.length > 2) {
      Set_Error(this.Original_id, 'Polyfit3')
    }
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
      Format_name: outputarray[0],
      equation: outputarray[0] + '=' + this.Format_right
    }
    var coid = CreateEq(this.fileid, 0, eqobj)
    self[coid].Solution_real = JSON.parse(JSON.stringify(self[eqid].Solution_real))
    self[coid].Format_size = ToNum(parseInt(type, 10) + 1) + 'x1'
    self[coid].Format_showequation = 'polyfit \\left(' + replacetext + '\\right)'
    this.connected_ids = {}
    this.connected_ids[coid] = 1
    var pre = 0
    var diffsum = 0
    var avgsum = 0
    if (outputarray.length == 2) {
      for (var a = 0; a < sizes[0]; a++) {
        for (var b = 0; b < sizes[1]; b++) {
          key = a + '-' + b
          pre = 0
          for (var c = 0; c < Object.keys(self[coid].Solution_real).length; c++) {
            pre = pre + ToNum(self[coid].Solution_real[c + '-0'] * Math.pow(self[xid].Solution_real[key], c))
          }
          diffsum = diffsum + Math.pow(self[yid].Solution_real[key] - pre, 2)
          avgsum = avgsum + Math.pow(self[yid].Solution_real[key] - avg, 2)
        }
      }
      var eqobj = {
        Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
        Format_name: outputarray[1],
        equation: outputarray[1] + '=' + this.Format_right
      }
      var rid = CreateEq(this.fileid, 0, eqobj)
      self[rid].Solution_real['0-0'] = 1 - diffsum / avgsum
      self[rid].Format_showequation = 'polyfit \\left(' + replacetext + '\\right)'
      DOM_Object[rid]['type'] = 'equation'
    }
    DOM_Object[coid][type] = 'equation'
    this.connected_ids[coid] = 1
    this.connected_ids[rid] = 1
    AddConnectedEqs(this.Format_id)
    DOM_Object[eqid]['real'] = self[eqid].Solution_real
    DOM_Object[eqid]['size'] = self[eqid]['Format_size']
    DOM_Object[eqid]['imag']['0-0'] = 0
    DOM_Object[eqid]['units'] = self[eqid].Units_units
    DOM_Object[coid]['real'] = self[coid].Solution_real
    DOM_Object[coid]['size'] = self[coid]['Format_size']
    DOM_Object[coid]['imag']['0-0'] = 0
    DOM_Object[coid]['units'] = self[coid].Units_units
    if (outputarray.length == 2) {
      DOM_Object[rid]['real'] = self[rid].Solution_real
      DOM_Object[rid]['size'] = self[rid]['Format_size']
      DOM_Object[rid]['imag']['0-0'] = 0
      DOM_Object[rid]['units'] = self[rid].Units_units
    }
    SetModels('polyfit', eqid, typeid, xid, yid)
    self[pid].Solution_variable_array[pos] = eqid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//------------------------------------ MATH FUNCTION POWERFIT  --------------------------------------------//
/*
This is a function to fit data to a curve of the form y=Ax^B. It returns a and b where A is e^a and b is B.
Source - http://mathworld.wolfram.com/LeastSquaresFittingPowerLaw.html
*/
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.powerfit = function (replacetext, pid, pos, callback) {
  DeleteConnectedEqs(this.Format_id)
  var xsum = 0,
    ysum = 0,
    xysum = 0,
    x2sum = 0,
    sum = 0,
    avg = 0,
    key = '',
    flag = 0
  replacetext = replacetext.replace(/^powerfit\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  this.Format_type = 6
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'Powerfit')
    flag = 1
  }
  if (inputarray.length < 2) {
    Set_Error(this.Original_id, 'Powerfit1')
    flag = 1
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'Powerfit1')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var xid = CreateEq(this.fileid, 1, eqobj)
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[1]
    }
    var yid = CreateEq(this.fileid, 1, eqobj)
    if (self[xid].Format_size != self[yid].Format_size) {
      Set_Error(this.Original_id, 'Powerfit2')
    }
    var sizes = self[xid].Format_size.split('x')
    var type = 0
    if (sizes[0] > sizes[1]) {
      var thislength = sizes[0]
    } else {
      var thislength = ToNum(sizes[1])
      type = 1
    }
    var count = ToNum(sizes[0] * sizes[1])
    for (var a = 0; a < thislength; a++) {
      if (type == 1) {
        key = '0-' + a
      } else {
        key = a + '-0'
      }
      xsum = ToNum(xsum) + Math.log(self[xid].Solution_real[key])
      x2sum = ToNum(x2sum) + Math.pow(Math.log(self[xid].Solution_real[key]), 2)
      ysum = ToNum(ysum) + Math.log(self[yid].Solution_real[key])
      xysum = ToNum(xysum) + ToNum(Math.log(self[xid].Solution_real[key]) * Math.log(self[yid].Solution_real[key]))
      sum = sum + ToNum(self[yid].Solution_real[key])
    }
    var B = (thislength * xysum - xsum * ysum) / (thislength * x2sum - Math.pow(xsum, 2))
    var A = Math.pow(Math.E, (ysum - B * xsum) / thislength)
    avg = ToNum(sum / count)
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    var eqid = CreateEq(this.fileid, 0, eqobj)
    self[eqid].Solution_real['0-0'] = A
    self[eqid].Solution_real['1-0'] = B
    self[eqid].Format_showequation = 'powerfit\\left(' + replacetext + '\\right)'
    var left = this.Format_left.replace(/^\s+|\s+$|^\[|\]$/g, '')
    var outputarray = InputArray(left)
    if (outputarray.length > 2) {
      Set_Error(this.Original_id, 'Powerfit3')
    }
    var pre = 0
    var diffsum = 0
    var avgsum = 0
    if (outputarray.length == 2) {
      for (var a = 0; a < sizes[0]; a++) {
        for (var b = 0; b < sizes[1]; b++) {
          key = a + '-' + b
          pre = 0
          pre = pre + ToNum(A * Math.pow(self[xid].Solution_real[key], B))
          diffsum = diffsum + Math.pow(self[yid].Solution_real[key] - pre, 2)
          avgsum = avgsum + Math.pow(self[yid].Solution_real[key] - avg, 2)
        }
      }
      var eqobj = {
        Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
        Format_name: outputarray[1],
        equation: outputarray[1] + '=' + this.Format_right
      }
      var rid = CreateEq(this.fileid, 0, eqobj)
      self[rid].Solution_real['0-0'] = 1 - diffsum / avgsum
      self[rid].Format_showequation = 'powerfit \\left(' + replacetext + '\\right)'
      DOM_Object[rid]['type'] = 'equation'
    }
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
      Format_name: outputarray[0],
      equation: outputarray[0] + '=' + this.Format_right
    }
    var coid = CreateEq(this.fileid, 0, eqobj)
    self[coid].Solution_real = JSON.parse(JSON.stringify(self[eqid].Solution_real))
    self[coid].Format_size = '2x1'
    self[coid].Format_showequation = 'powerfit \\left(' + replacetext + '\\right)'
    this.connected_ids = {}
    this.connected_ids[coid] = 1
    this.connected_ids[rid] = 1
    this.Solution_temps.push(eqid)
    AddConnectedEqs(this.Format_id)
    SetModels('powerfit', eqid, xid, yid)
    DOM_Object[eqid]['real'] = self[eqid].Solution_real
    DOM_Object[eqid]['size'] = self[eqid]['Format_size']
    DOM_Object[eqid]['imag']['0-0'] = 0
    DOM_Object[eqid]['units'] = self[eqid].Units_units
    DOM_Object[coid]['real'] = self[coid].Solution_real
    DOM_Object[coid]['size'] = self[coid]['Format_size']
    DOM_Object[coid]['imag']['0-0'] = 0
    DOM_Object[coid]['units'] = self[coid].Units_units
    DOM_Object[rid]['real'] = self[rid].Solution_real
    DOM_Object[rid]['size'] = self[rid]['Format_size']
    DOM_Object[rid]['imag']['0-0'] = 0
    DOM_Object[rid]['units'] = self[rid].Units_units
    self[pid].Solution_variable_array[pos] = eqid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//-------------------------------------- MATH FUNCTION LOGFIT  --------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
/* This is a function to fit data to a curve of the form y=a+b * ln x. It returns a and b. 
Source - http://mathworld.wolfram.com/LeastSquaresFittingLogarithmic.html
*/
Equation.prototype.logfit = function (replacetext, pid, pos, callback) {
  DeleteConnectedEqs(this.Format_id)
  var xsum = 0,
    ysum = 0,
    xysum = 0,
    x2sum = 0,
    flag = 0
  replacetext = replacetext.replace(/^logfit\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  this.Format_type = 6
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'Logfit')
    flag = 1
  }
  if (inputarray.length < 2) {
    Set_Error(this.Original_id, 'Logfit1')
    flag = 1
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'Logfit1')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var xid = CreateEq(this.fileid, 1, eqobj)
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[1]
    }
    var yid = CreateEq(this.fileid, 1, eqobj)
    if (self[xid].Format_size != self[yid].Format_size) {
      Set_Error(this.Original_id, 'Logfit2')
    }
    var sizes = self[xid].Format_size.split('x')
    if (sizes[0] > sizes[1]) {
      var thislength = sizes[0]
    } else {
      var thislength = ToNum(sizes[1])
      type = 1
    }
    var count = ToNum(sizes[0] * sizes[1])
    for (var a = 0; a < thislength; a++) {
      if (type == 1) {
        key = '0-' + a
      } else {
        key = a + '-0'
      }
      xsum = xsum + Math.log(self[xid].Solution_real[key]) / Math.log(Math.E)
      x2sum = x2sum + Math.pow(Math.log(self[xid].Solution_real[key]) / Math.log(Math.E), 2)
      ysum = ysum + ToNum(self[yid].Solution_real[key])
      xysum = xysum + self[yid].Solution_real[key] * (Math.log(self[xid].Solution_real[key]) / Math.log(Math.E))
    }
    var B = (thislength * xysum - xsum * ysum) / (thislength * x2sum - Math.pow(xsum, 2))
    var A = (ysum - B * xsum) / thislength
    var avg = ysum / thislength
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    var eqid = CreateEq(this.fileid, 0, eqobj)
    self[eqid].Solution_real['0-0'] = A
    self[eqid].Solution_real['1-0'] = B
    self[eqid].Format_showequation = 'logfit\\left(' + replacetext + '\\right)'
    self[eqid].Format_size = '2x1'
    var left = this.Format_left.replace(/^\s+|\s+$|^\[|\]$/g, '')
    var outputarray = InputArray(left)
    if (outputarray.length > 2) {
      Set_Error(this.Original_id, 'Logfit3')
    }
    var pre = 0
    var diffsum = 0
    var avgsum = 0
    if (outputarray.length == 2) {
      for (var a = 0; a < sizes[0]; a++) {
        for (var b = 0; b < sizes[1]; b++) {
          key = a + '-' + b
          pre = 0
          pre = pre + ToNum(A) + B * Math.log(self[xid].Solution_real[key])
          diffsum = diffsum + ToNum(Math.pow(self[yid].Solution_real[key] - pre, 2))
          avgsum = avgsum + ToNum(Math.pow(self[yid].Solution_real[key] - avg, 2))
        }
      }
      var eqobj = {
        Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
        Format_name: outputarray[1],
        equation: outputarray[1] + '=' + this.Format_right
      }
      var rid = CreateEq(this.fileid, 0, eqobj)
      self[rid].Solution_real['0-0'] = 1 - diffsum / avgsum
      self[rid].Format_showequation = 'logfit \\left(' + replacetext + '\\right)'
      DOM_Object[rid]['type'] = 'equation'
    }
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
      equation: outputarray[0] + '=' + this.Format_right,
      Format_name: outputarray[0]
    }
    var coid = CreateEq(this.fileid, 0, eqobj)
    self[coid].Solution_real = JSON.parse(JSON.stringify(self[eqid].Solution_real))
    self[coid].Format_size = '2x1'
    self[coid].Format_showequation = 'logfit \\left(' + replacetext + '\\right)'
    this.connected_ids = {}
    this.connected_ids[coid] = 1
    this.connected_ids[rid] = 1
    this.Solution_temps.push(eqid)
    AddConnectedEqs(this.Format_id)
    DOM_Object[eqid]['real'] = self[eqid].Solution_real
    DOM_Object[eqid]['size'] = self[eqid]['Format_size']
    DOM_Object[eqid]['imag']['0-0'] = 0
    DOM_Object[eqid]['units'] = self[eqid].Units_units
    DOM_Object[coid]['real'] = self[coid].Solution_real
    DOM_Object[coid]['size'] = self[coid]['Format_size']
    DOM_Object[coid]['imag']['0-0'] = 0
    DOM_Object[coid]['units'] = self[coid].Units_units
    DOM_Object[rid]['real'] = self[rid].Solution_real
    DOM_Object[rid]['size'] = self[rid]['Format_size']
    DOM_Object[rid]['imag']['0-0'] = 0
    DOM_Object[rid]['units'] = self[rid].Units_units
    SetModels('logfit', eqid, xid, yid)
    self[pid].Solution_variable_array[pos] = eqid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//-------------------------------------- MATH FUNCTION EXPFIT  --------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
/*  This is a function to fit data to a curve of the form y=Ae^Bx. It returns a and b where A=exp(a) and B=b
http://mathworld.wolfram.com/LeastSquaresFittingExponential.html
*/
Equation.prototype.expfit = function (replacetext, pid, pos, callback) {
  DeleteConnectedEqs(this.Format_id)
  var x2ysum = 0,
    ylnysum = 0,
    xysum = 0,
    xylnysum = 0,
    ysum = 0,
    x2ysum,
    avg = 0,
    type = 0,
    flag = 0
  replacetext = replacetext.replace(/^expfit\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  this.Format_type = 6
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'Expfit')
    flag = 1
  }
  if (inputarray.length < 2) {
    Set_Error(this.Original_id, 'Expfit1')
    flag = 1
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'Expfit1')
    flag = 1
  }
  if (flag == 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var xid = CreateEq(this.fileid, 1, eqobj)
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[1]
    }
    var yid = CreateEq(this.fileid, 1, eqobj)
    if (self[xid].Format_size != self[yid].Format_size) {
      Set_Error(this.Original_id, 'Expfit2')
    }
    var sizes = self[xid].Format_size.split('x')
    if (sizes[0] > sizes[1]) {
      var thislength = sizes[0]
    } else {
      var thislength = ToNum(sizes[1])
      type = 1
    }
    var count = ToNum(sizes[0] * sizes[1])
    for (var a = 0; a < thislength; a++) {
      if (type == 1) {
        key = '0-' + a
      } else {
        key = a + '-0'
      }
      x2ysum = x2ysum + Math.pow(self[xid].Solution_real[key], 2) * self[yid].Solution_real[key]
      ylnysum = ylnysum + self[yid].Solution_real[key] * Math.log(self[yid].Solution_real[key])
      xysum = xysum + ToNum(self[xid].Solution_real[key] * self[yid].Solution_real[key])
      xylnysum =
        xylnysum +
        ToNum(self[xid].Solution_real[key] * self[yid].Solution_real[key] * Math.log(self[yid].Solution_real[key]))
      ysum = ysum + ToNum(self[yid].Solution_real[key])
      avg = avg + self[yid].Solution_real[key]
    }
    avg = avg / count
    var A = ToNum((x2ysum * ylnysum - xysum * xylnysum) / (ysum * x2ysum - Math.pow(xysum, 2)))
    var B = ToNum((ysum * xylnysum - xysum * ylnysum) / (ysum * x2ysum - Math.pow(xysum, 2)))
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    var eqid = CreateEq(this.fileid, 0, eqobj)
    self[eqid].Solution_real['0-0'] = ToNum(Math.pow(Math.E, A))
    self[eqid].Solution_real['1-0'] = B
    self[eqid].Format_size = '2x1'
    self[eqid].Format_size = '2x1'
    self[eqid].Format_showequation = 'expfit \\left(' + replacetext + '\\right)'
    var left = this.Format_left.replace(/^\s+|\s+$|^\[|\]$/g, '')
    var outputarray = InputArray(left)
    if (outputarray.length > 2) {
      Set_Error(this.Original_id, 'Expfit3')
    }
    var pre = 0
    var diffsum = 0
    var avgsum = 0
    if (outputarray.length == 2) {
      for (var a = 0; a < sizes[0]; a++) {
        for (var b = 0; b < sizes[1]; b++) {
          key = a + '-' + b
          pre = 0
          pre = pre + Math.pow(Math.E, A) * Math.pow(Math.E, B * self[xid].Solution_real[key])
          diffsum = diffsum + ToNum(Math.pow(self[yid].Solution_real[key] - pre, 2))
          avgsum = avgsum + ToNum(Math.pow(self[yid].Solution_real[key] - avg, 2))
        }
      }
      var eqobj = {
        Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
        Format_name: outputarray[1],
        equation: outputarray[1] + '=' + this.Format_right
      }
      var rid = CreateEq(this.fileid, 0, eqobj)
      self[rid].Solution_real['0-0'] = 1 - diffsum / avgsum
      self[rid].Format_showequation = 'expfit \\left(' + replacetext + '\\right)'
      DOM_Object[rid]['type'] = 'equation'
    }
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
      Format_name: outputarray[0], //\
      equation: outputarray[0] + '=' + this.Format_right
    }
    var coid = CreateEq(this.fileid, 0, eqobj)
    self[coid].Solution_real = JSON.parse(JSON.stringify(self[eqid].Solution_real))
    self[coid].Format_size = '2x1'
    self[coid].Format_showequation = 'expfit \\left(' + replacetext + '\\right)'
    this.connected_ids = {}
    this.connected_ids[coid] = 1
    this.connected_ids[rid] = 1
    this.Solution_temps.push(eqid)
    AddConnectedEqs(this.Format_id)
    DOM_Object[eqid]['real'] = self[eqid].Solution_real
    DOM_Object[eqid]['size'] = self[eqid]['Format_size']
    DOM_Object[eqid]['imag']['0-0'] = 0
    DOM_Object[eqid]['units'] = self[eqid].Units_units
    DOM_Object[coid]['real'] = self[coid].Solution_real
    DOM_Object[coid]['size'] = self[coid]['Format_size']
    DOM_Object[coid]['imag']['0-0'] = 0
    DOM_Object[coid]['units'] = self[coid].Units_units
    DOM_Object[rid]['real'] = self[rid].Solution_real
    DOM_Object[rid]['size'] = self[rid]['Format_size']
    DOM_Object[rid]['imag']['0-0'] = 0
    DOM_Object[rid]['units'] = self[rid].Units_units
    SetModels('expfit', eqid, xid, yid)
    self[pid].Solution_variable_array[pos] = eqid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//------------------------------------ MATH FUNCTION HISTOGRAM --------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
/*
This function takes in a set of data in the form of a vector or matrix along with a second parameter. If 
the second parameter is a number then it creates an x and y vector of equally spaced numbers between the 
lowest and highest numbers in y. It then loops through the data and adds 1 to each "bin" where the number should fall.

If the second parameter is a vector, it uses each number in that vector as the center value of the bin 
and the ends of the bin are equally spaced on either end. If the vector is equally spaced, then bins will be as well.
*/
Equation.prototype.histogram = function (replacetext, pid, pos, callback) {
  DeleteConnectedEqs(this.Format_id)
  nums = Array()
  mins = new Array()
  maxes = new Array()
  binsize = 0
  var count = 0
  bins = Array()
  hist = {}
  binobj = {}
  replacetext = replacetext.replace(/^histogram\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  this.Format_type = 6
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'Histogram')
  }
  if (inputarray.length != 2) {
    Set_Error(this.Original_id, 'Histogram1')
  }

  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Original_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'histEq=' + inputarray[0]
  }
  var dataid = CreateEq(this.fileid, 1, eqobj)

  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Original_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'histEq2=' + inputarray[1]
  }
  var binid = CreateEq(this.fileid, 1, eqobj)

  console.log('The solution for the dataid is ...')
  console.log(self[dataid])
  console.log('The solution for the binid is ...')
  console.log(self[binid])

  for (var i in self[dataid].Solution_real) {
    nums.push(self[dataid].Solution_real[i])
  }
  nums = nums.sort(function (y, z) {
    return y - z
  })
  var min = nums[0]
  var max = nums[nums.length - 1]
  if (self[binid].Format_size == '1x1') {
    console.log('The max, min, and the numbins are ' + min + ', ' + max + ' and ' + numbins)
    var numbins = parseFloat(Big(self[binid].Solution_real['0-0']))
    binsize = parseFloat(Big(max).minus(Big(min)).div(numbins))
    for (var a = min; a < max; a = parseFloat(Big(a).plus(Big(binsize)))) {
      mins[count] = a
      maxes[count] = parseFloat(Big(a).plus(Big(binsize)))
      binobj['0-' + count] = ToNum((maxes[count] - mins[count]) / 2) + ToNum(mins[count])
      count++
    }
  } else {
    for (var i in self[binid].Solution_real) {
      bins.push(ToNum(self[binid].Solution_real[i]))
    }
    bins = bins.sort(function (y, z) {
      return y - z
    })
    if (min < bins[0]) {
      bins[0] = min
    }
    if (max > bins[bins.length - 1]) {
      bins[bins.length - 1] = max
    }
    for (var a = 0; a < bins.length - 1; a++) {
      mins[a] = bins[a]
      maxes[a] = bins[a + 1]
      binobj['0-' + a] = ToNum((maxes[a] - mins[a]) / 2) + ToNum(mins[a])
    }
  }
  for (var i in self[dataid].Solution_real) {
    for (var a = 0; a < mins.length; a++) {
      if (hist['0-' + a] === undefined) {
        hist['0-' + a] = 0
      }
      if (self[dataid].Solution_real[i] >= mins[a] && self[dataid].Solution_real[i] < maxes[a]) {
        hist['0-' + a] = hist['0-' + a] + 1 / (maxes[a] - mins[a])
      }
      if (self[dataid].Solution_real[i] == maxes[a] && a == mins.length - 1) {
        hist['0-' + a] = hist['0-' + a] + 1 / (maxes[a] - mins[a])
      }
    }
  }
  var left = this.Format_left.replace(/^\s+|\s+$|^\[|\]$/g, '')
  var outputarray = InputArray(left)
  if (outputarray.length > 2) {
    Set_Error(this.Original_id, 'Histogram3')
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Original_id]['location'], 10),
    Format_name: outputarray[0], //\
    equation: outputarray[0] + '=' + this.Format_right
  }
  var xid = CreateEq(this.fileid, 0, eqobj)
  self[xid].Solution_real = binobj
  self[xid].Format_size = '1x' + count++
  self[xid].Format_showequation =
    'histogram\\left(' + self[dataid].Format_showequation + ', ' + self[binid].Format_showequation + '\\right)'
  var eqobj = {
    Page_position: DOM_Object[this.Original_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var eqid = CreateEq(this.fileid, 0, eqobj)
  self[eqid].Solution_real = hist
  self[eqid].Format_size = '1x' + mins.length
  self[eqid].Format_showequation =
    'histogram\\left(' + self[dataid].Format_showequation + ', ' + self[binid].Format_showequation + '\\right)'
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Original_id]['location'], 10),
    Format_name: outputarray[1], //\
    equation: outputarray[1] + '=' + this.Format_right
  }
  var yid = CreateEq(this.fileid, 0, eqobj)
  self[yid].Solution_real = hist
  self[yid].Format_size = '1x' + mins.length
  self[yid].Format_showequation =
    'histogram\\left(' + self[dataid].Format_showequation + ', ' + self[binid].Format_showequation + '\\right)'
  this.connected_ids = {}
  this.connected_ids[xid] = 1
  this.connected_ids[yid] = 1
  this.Solution_temps.push(eqid)
  AddConnectedEqs(this.Format_id)
  SetModels('histogram', eqid, dataid, binid)
  self[pid].Solution_variable_array[pos] = eqid
  DOM_Object[eqid]['real'] = self[eqid].Solution_real
  DOM_Object[eqid]['size'] = self[eqid]['Format_size']
  DOM_Object[eqid]['imag']['0-0'] = 0
  DOM_Object[eqid]['units'] = self[eqid].Units_units
  DOM_Object[xid]['real'] = self[xid].Solution_real
  DOM_Object[xid]['size'] = self[xid]['Format_size']
  DOM_Object[xid]['imag']['0-0'] = 0
  DOM_Object[xid]['units'] = self[xid].Units_units
  DOM_Object[yid]['real'] = self[yid].Solution_real
  DOM_Object[yid]['size'] = self[yid]['Format_size']
  DOM_Object[yid]['imag']['0-0'] = 0
  DOM_Object[yid]['units'] = self[yid].Units_units
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//------------------------------------ GET THE NUMBER OF INDICES ------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
Equation.prototype.numinds = function (replacetext, pid, pos, callback) {
  var flag = 1
  var indexes = 0
  var ilength = 0
  var numind = 0
  replacetext = replacetext.replace(/^numinds\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'numinds')
    flag = 0
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'numinds1')
    flag = 0
  }
  if (flag == 1) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var id = CreateEq(this.fileid, 1, eqobj)
    indexes = self[id].Format_size.split('x')
    ilength = indexes.length
    if (self[id].Format_size == '1x1') {
      numinds = 1
    } else {
      numinds = ilength
    }
    self[id].Solution_imag['0-0'] = 0
    self[id].Solution_real = {}
    self[id].Solution_imag = {}
    self[id].Solution_real['0-0'] = numinds
    self[id].Format_size = '1x1'
    self[id].Format_showequation = 'numinds\\left(' + self[id].Format_showequation + '\\right)'
    this.Solution_temps.push(id)
    SetModels('numinds', id, id)
    self[pid].Solution_variable_array[pos] = id
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    DOM_Object[id]['real'] = self[id].Solution_real
    DOM_Object[id]['size'] = self[id]['Format_size']
    DOM_Object[id]['imag']['0-0'] = 0
    DOM_Object[id]['units'] = self[id].Units_units
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------------- CHOLESKY FACTORIZATION ---------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
/*
This function performs the Cholesky decomposition for a symetric matrix. That is a matrix that is symetric about the diagonal. Page 244.
*/
Equation.prototype.Cholesky = function (replacetext, pid, pos, callback) {
  var flag = 0
  var sum1 = 0
  var sum2 = 0
  var U = {}
  replacetext = replacetext.replace(/^Cholesky\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Cholesky')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Cholesky1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  var sizes = self[id1].Format_size.split('x')
  if (sizes[0] !== sizes[1]) {
    Set_Error(this.Original_id, 'Cholesky2', id1)
    flag = 1
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    size = parseInt(sizes[0])
    for (var a = 0; a < parseInt(sizes[0]); a++) {
      sum1 = self[id1].Solution_real[a + '-' + a]
      for (var b = 0; b < a; b++) {
        sum1 = sum1 - Math.pow(U[b + '-' + a], 2)
      }
      U[a + '-' + a] = Math.pow(sum1, 0.5)
      for (var b = a + 1; b < parseInt(sizes[0]); b++) {
        sum2 = self[id1].Solution_real[a + '-' + b]
        for (var c = 0; c < a; c++) {
          sum2 = sum2 - U[c + '-' + a] * U[c + '-' + b]
        }
        U[a + '-' + b] = sum2 / U[a + '-' + a]
        if (self[id1].Solution_real[a + '-' + b] != self[id1].Solution_real[b + '-' + a]) {
          Set_Error(this.Original_id, 'Cholesky3')
        }
      }
    }
    // Fill out the bottom with zeros
    for (var a = 0; a < parseInt(sizes[0]); a++) {
      for (var b = a - 1; b >= 0; b--) {
        U[a + '-' + b] = 0
      }
    }
    tempMat = {}
    for (var a = 0; a < parseInt(sizes[0]); a++) {
      for (var b = 0; b < parseInt(sizes[0]); b++) {
        tempMat[a + '-' + b] = U[b + '-' + a]
      }
    }
    self[newid].Solution_real = tempMat
    self[newid].Format_size = self[id1].Format_size

    self[newid].Format_showequation = 'Cholesky\\left(' + self[id1].Format_showequation + '\\right)'
    this.Solution_temps.push(newid)
    self[newid].Units_base_array = self[id1].Units_base_array
    self[newid].Units_units = self[id1].Units_units
    self[newid].Units_quantity = self[id1].Units_quantity
    self[newid].Units_showunits = self[id1].Units_showunits
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    SetModels('Cholesky', newid, id1)
    self[pid].Solution_variable_array[pos] = newid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  } else {
    var newid = ''
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------------- MATRIX NORM CALCULATION ---------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
/*
	The Norm function calculates the norm of the vector or matrix 
*/
Equation.prototype.Norm = function (replacetext, pid, pos, callback) {
  var flag = 0
  var norm = 1
  var Sol = 0
  replacetext = replacetext.replace(/^Norm\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Norm')
    flag = 1
  }
  if (inputarray.length > 2 || inputarray.length == 1) {
    Set_Error(this.Original_id, 'Norm1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var matid = CreateEq(this.fileid, 1, eqobj)
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[1]
  }
  var normid = CreateEq(this.fileid, 1, eqobj)
  norm = self[normid].Solution_real['0-0']
  if (norm !== parseInt(norm) && flag === 0) {
    Set_Error(this.Original_id, 'Norm2', norm)
    flag = 1
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    for (var index in self[matid].Solution_real) {
      if (self[matid].Solution_imag[index] === undefined) {
        Sol = Sol + Math.pow(Math.abs(self[matid].Solution_real[index]), norm)
      } else {
        Sol =
          Sol +
          Math.pow(
            Math.abs(
              Math.sqrt(Math.pow(self[matid].Solution_real[index], 2) + Math.pow(self[matid].Solution_imag[index], 2))
            ),
            norm
          )
      }
    }
    self[newid].Solution_real['0-0'] = Math.pow(Sol, 1 / norm)
    self[newid].Format_showequation =
      '\\left|\\left|\\hspace{0.5em}' + self[matid].Format_showequation + '\\hspace{0.5em}\\right|\\right|_' + norm
    self[newid].Units_base_array = self[matid].Units_base_array
    self[newid].Units_units = self[matid].Units_units
    self[newid].Units_quantity = self[matid].Units_quantity
    this.Solution_temps.push(newid)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    SetModels('Norm', newid, matid, normid)
    self[pid].Solution_variable_array[pos] = newid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  } else {
    var newid = ''
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------------- COLUMN NORM CALCULATION ---------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.CSNorm = function (replacetext, pid, pos, callback) {
  var flag = 0
  var sums = new Array()
  var thissum = 0
  replacetext = replacetext.replace(/^CSNorm\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'CSNorm')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'CSNorm1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var matid = CreateEq(this.fileid, 1, eqobj)
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    var sizes = self[matid].Format_size.split('x')
    for (var b = 0; b < parseInt(sizes[1]); b++) {
      thissum = 0
      for (var a = 0; a < parseInt(sizes[0]); a++) {
        if (self[matid].Solution_imag[a + '-' + b] === undefined) {
          thissum = ToNum(thissum) + Math.abs(self[matid].Solution_real[a + '-' + b])
        } else {
          thissum =
            ToNum(thissum) +
            Math.abs(
              Math.sqrt(
                Math.pow(self[matid].Solution_real[a + '-' + b], 2) +
                  Math.pow(self[matid].Solution_imag[a + '-' + b], 2)
              )
            )
        }
      }
      sums.push(thissum)
    }
    self[newid].Solution_real['0-0'] = Math.max.apply(null, sums)
    self[newid].Format_showequation =
      '\\left|\\left|\\hspace{0.5em} ' + self[matid].Format_showequation + '\\hspace{0.5em} \\right|\\right|_C'
    self[newid].Units_base_array = self[matid].Units_base_array
    self[newid].Units_units = self[matid].Units_units
    self[newid].Units_quantity = self[matid].Units_quantity
    this.Solution_temps.push(newid)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    SetModels('CSNorm', newid, matid)
    self[pid].Solution_variable_array[pos] = newid
  } else {
    var newid = ''
  }
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------------- ROW NORM CALCULATION ------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.RSNorm = function (replacetext, pid, pos, callback) {
  var flag = 0
  var sums = new Array()
  var thissum = 0
  replacetext = replacetext.replace(/^RSNorm\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'RSNorm')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'RSNorm1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var matid = CreateEq(this.fileid, 1, eqobj)
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    var sizes = self[matid].Format_size.split('x')
    for (var a = 0; a < parseInt(sizes[0]); a++) {
      thissum = 0
      for (var b = 0; b < parseInt(sizes[1]); b++) {
        if (self[matid].Solution_imag[a + '-' + b] === undefined) {
          thissum = ToNum(thissum) + Math.abs(self[matid].Solution_real[a + '-' + b])
        } else {
          thissum =
            ToNum(thissum) +
            Math.abs(
              Math.sqrt(
                Math.pow(self[matid].Solution_real[a + '-' + b], 2) +
                  Math.pow(self[matid].Solution_imag[a + '-' + b], 2)
              )
            )
        }
      }
      sums.push(thissum)
    }
    self[newid].Solution_real['0-0'] = Math.max.apply(null, sums)
    self[newid].Format_showequation =
      '\\left|\\left|\\hspace{0.5em} ' + self[matid].Format_showequation + '\\hspace{0.5em} \\right|\\right|_R'
    self[newid].Units_base_array = self[matid].Units_base_array
    self[newid].Units_units = self[matid].Units_units
    self[newid].Units_quantity = self[matid].Units_quantity
    this.Solution_temps.push(newid)
    SetModels('RSNorm', newid, matid)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    self[pid].Solution_variable_array[pos] = newid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  } else {
    var newid = ''
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------------- TRACE OF A MATRIX ---------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.Trace = function (replacetext, pid, pos, callback) {
  var flag = 0
  var sum = 0
  replacetext = replacetext.replace(/^Trace\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Trace')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Trace1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var matid = CreateEq(this.fileid, 1, eqobj)
  var sizes = self[matid].Format_size.split('x')
  if (sizes[0] != sizes[1]) {
    Set_Error(this.Original_id, 'Trace2')
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    for (var a = 0; a < parseInt(sizes[0]); a++) {
      sum = ToNum(sum) + self[matid].Solution_real[a + '-' + a]
    }
    self[newid].Solution_real['0-0'] = sum
    self[newid].Format_showequation = 'Trace \\left(' + self[matid].Format_showequation + '\\right)'
    self[newid].Units_base_array = self[matid].Units_base_array
    self[newid].Units_units = self[matid].Units_units
    self[newid].Units_quantity = self[matid].Units_quantity
    this.Solution_temps.push(newid)
    SetModels('Trace', newid, matid)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    self[pid].Solution_variable_array[pos] = newid
  } else {
    var newid = ''
  }
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------------- COMPLEX CONJUGATE ---------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.Conj = function (replacetext, pid, pos, callback) {
  var flag = 0
  var real = {}
  var imag = {}
  replacetext = replacetext.replace(/^Conj\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Conj')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Conj1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var matid = CreateEq(this.fileid, 1, eqobj)
  if (flag === 0) {
    var sizes = self[matid].Format_size.split('x')
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    for (var a = 0; a < parseInt(sizes[0]); a++) {
      for (var b = 0; b < parseInt(sizes[0]); b++) {
        real[a + '-' + b] = self[matid].Solution_real[a + '-' + b]
        imag[a + '-' + b] = -self[matid].Solution_imag[a + '-' + b]
      }
    }
    self[newid].Solution_real = real
    self[newid].Solution_imag = imag
    self[newid].Format_size = self[matid].Format_size
    self[newid].Format_showequation = '\\overline{\\left(' + self[matid].Format_showequation + '\\right)}'
    self[newid].Units_base_array = self[matid].Units_base_array
    self[newid].Units_units = self[matid].Units_units
    self[newid].Units_quantity = self[matid].Units_quantity
    this.Solution_temps.push(newid)
    SetModels('Conj', newid, matid)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    self[pid].Solution_variable_array[pos] = newid
  } else {
    var newid = ''
  }
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------- DOT MULTIPLICATION ----------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.DotMult = function (replacetext, pid, pos, callback) {
  //	|
  var flag = 0,
    key = '',
    tempr = {} //	|
  replacetext = replacetext.replace(/^DotMult\(/, '') //	|
  replacetext = replacetext.replace(/\)$/, '') //	|
  var inputarray = InputArray(replacetext) //	|
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'DotMult')
    flag = 1
  } //	|
  if (inputarray.length == 1 || inputarray.length > 2) {
    Set_Error(this.Original_id, 'DotMult')
    flag = 1
  } //	|
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction', //	|
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  } //	|
  var id1 = CreateEq(this.fileid, 1, eqobj) //	|
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction', //	|
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[1]
  } //	|
  var id2 = CreateEq(this.fileid, 1, eqobj) //	|
  var sizes1 = self[id1].Format_size.split('x') //	|
  var sizes2 = self[id2].Format_size.split('x') //	|
  if (sizes1[0] != sizes2[0] || sizes1[1] != sizes2[1]) {
    Set_Error(this.Original_id, 'DotMult2')
    flag = 1
  } //	|
  if (flag === 0) {
    //	|
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction', //	|
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    } //	|
    var newid = CreateEq(this.fileid, 0, eqobj) //	|
    for (
      var a = 0;
      a < sizes1[0];
      a++ //  |
    ) {
      for (
        var b = 0;
        b < sizes1[1];
        b++ //  |
      ) {
        key = a + '-' + b //  |
        tempr = MultComplex(
          self[id1].Solution_real[key],
          self[id1].Solution_imag[key],
          self[id2].Solution_real[key],
          self[id2].Solution_imag[key]
        )
        self[newid].Solution_real[key] = tempr.real //  |
        self[newid].Solution_imag[key] = tempr.imag //  |
      } //  |
    } //  |
    self[newid].Format_size = self[id1].Format_size //	|
    self[newid].Format_showequation = self[id1].Format_showequation + ' \\odot ' + self[id2].Format_showequation //	|
    var baseunits = new Array() //	|
    for (var index in self[id1].Units_base_array) {
      //	|
      self[newid].Units_base_array[index] =
        parseInt(self[id1].Units_base_array[index]) + parseInt(self[id2].Units_base_array[index])
    }
    this.Solution_temps.push(newid) //	|
    DOM_Object[newid]['real'] = self[newid].Solution_real //	|
    DOM_Object[newid]['imag'] = self[newid].Solution_imag //	|
    DOM_Object[newid]['size'] = self[id1]['Format_size'] //	|
    DOM_Object[newid]['units'] = self[newid].Units_units //	|
    SetModels('DotMult', newid, id1, id2) //	|
    self[pid].Solution_variable_array[pos] = newid //	|
  } else {
    var newid = ''
  } //	|
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1) //	|
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1) //	|
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback) //	|
} //	|
//-------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------------- DOT DIVISION ----------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.DotDiv = function (replacetext, pid, pos, callback) {
  //	|
  var flag = 0,
    key = '',
    tempr = 0,
    tempi = 0 //	|
  replacetext = replacetext.replace(/^DotDiv\(/, '') //	|
  replacetext = replacetext.replace(/\)$/, '') //	|
  var inputarray = InputArray(replacetext) //	|
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'DotDiv')
    flag = 1
  } //	|
  if (inputarray.length == 1 || inputarray.length > 2) {
    Set_Error(this.Original_id, 'DotDiv')
    flag = 1
  } //	|
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction', //	|
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  } //	|
  var id1 = CreateEq(this.fileid, 1, eqobj) //	|
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction', //	|
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[1]
  } //	|
  var id2 = CreateEq(this.fileid, 1, eqobj) //	|
  var sizes1 = self[id1].Format_size.split('x') //	|
  var sizes2 = self[id2].Format_size.split('x') //	|
  if (sizes1[0] != sizes2[0] || sizes1[1] != sizes2[1]) {
    Set_Error(this.Original_id, 'DotDiv2')
    flag = 1
  } //	|
  if (flag === 0) {
    //	|
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction', //	|
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    } //	|
    var newid = CreateEq(this.fileid, 0, eqobj) //	|
    for (
      var a = 0;
      a < sizes1[0];
      a++ //  |
    ) {
      for (
        var b = 0;
        b < sizes1[1];
        b++ //  |
      ) {
        key = a + '-' + b //  |
        tempr = DivComplex(
          self[id1].Solution_real[key],
          self[id1].Solution_imag[key],
          self[id2].Solution_real[key],
          self[id2].Solution_imag[key]
        )
        self[newid].Solution_real[key] = tempr.real //  |
        self[newid].Solution_imag[key] = tempr.imag //  |
      } //  |
    } //  |
    self[newid].Format_size = self[id1].Format_size //	|
    self[newid].Format_showequation =
      '\\frac{' + self[id1].Format_showequation + '}{' + self[id2].Format_showequation + '}' //	|
    var baseunits = new Array() //	|
    for (var index in self[id1].Units_base_array) {
      //	|
      self[newid].Units_base_array[index] =
        parseInt(self[id1].Units_base_array[index]) - parseInt(self[id2].Units_base_array[index])
    }
    this.Solution_temps.push(newid) //	|
    DOM_Object[newid]['real'] = self[newid].Solution_real //	|
    DOM_Object[newid]['imag'] = self[newid].Solution_imag //	|
    DOM_Object[newid]['size'] = self[id1]['Format_size'] //	|
    DOM_Object[newid]['units'] = self[newid].Units_units //	|
    SetModels('DotMult', newid, id1, id2) //	|
    self[pid].Solution_variable_array[pos] = newid //	|
  } else {
    var newid = ''
  } //	|
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1) //	|
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1) //	|
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback) //	|
} //	|
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------------- DOT PRODUCT -----------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.Dot = function (replacetext, pid, pos, callback) {
  var flag = 0
  var num = {}
  var ranswer = {}
  var ianswer = {}
  var sumr = 0
  var sumi = 0
  var key = ''
  var dim = 0
  replacetext = replacetext.replace(/^Dot\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Dot')
    flag = 1
  }
  if (inputarray.length > 3) {
    Set_Error(this.Original_id, 'Dot1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[1]
  }
  var id2 = CreateEq(this.fileid, 1, eqobj)
  if (inputarray.length == 3) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[2]
    }
    var id3 = CreateEq(this.fileid, 1, eqobj)
    dim = self[id3].Solution_real['0-0']
    if (dim !== 0 && dim != 1) {
      Set_Error(this.Original_id, 'Dot3')
      flag = 1
    }
  }
  var sizes1 = self[id1].Format_size.split('x')
  var sizes2 = self[id2].Format_size.split('x')
  if (sizes1[0] != sizes2[0] || sizes1[1] != sizes2[1]) {
    Set_Error(this.Original_id, 'Dot2')
    flag = 1
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    if (dim == '0') {
      for (var a = 0; a < sizes1[0]; a++) {
        sumr = 0
        sumi = 0
        for (var b = 0; b < sizes1[1]; b++) {
          key = a + '-' + b
          var itemp = -1 * self[id1].Solution_imag[key]
          num = MultComplex(
            self[id1].Solution_real[key],
            self[id1].Solution_imag[key],
            self[id2].Solution_real[key],
            self[id2].Solution_imag[key]
          )
          sumr = sumr + num['real']
          sumi = sumi + num['imag']
        }
        self[newid].Solution_real[a + '-0'] = sumr
        self[newid].Solution_imag[a + '-0'] = sumi
      }
      self[newid].Format_size = sizes1[1] - 1 + 'x1'
    } else if (dim == '1') {
      for (var b = 0; b < sizes1[1]; b++) {
        sumr = 0
        sumi = 0
        for (var a = 0; a < sizes1[0]; a++) {
          key = a + '-' + b
          var itemp = -1 * self[id1].Solution_imag[key]
          num = MultComplex(
            self[id1].Solution_real[key],
            self[id1].Solution_imag[key],
            self[id2].Solution_real[key],
            self[id2].Solution_imag[key]
          )
          sumr = sumr + num['real']
          sumi = sumi + num['imag']
        }
        self[newid].Solution_real['0-' + b] = sumr
        self[newid].Solution_imag['0-' + b] = sumi
      }
      self[newid].Format_size = '1x' + (sizes1[0] - 1)
    }
    if (dim === 0) {
      self[newid].Format_showequation =
        '\\overrightarrow{' + self[id1].Format_showequation + ' \\circ ' + self[id2].Format_showequation + '}'
    } else {
      self[newid].Format_showequation =
        self[id1].Format_showequation + ' \\downarrow \\circ ' + self[id2].Format_showequation
    }
    var baseunits = new Array()
    for (var index in self[id1].Units_base_array) {
      self[newid].Units_base_array[index] =
        parseInt(self[id1].Units_base_array[index]) + parseInt(self[id2].Units_base_array[index])
    }
    self[newid].Recompose_Units()
    this.Solution_temps.push(newid)
    SetModels('Dot', newid, id1, id2)
    self[pid].Solution_variable_array[pos] = newid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
  } else {
    var newid = ''
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//----------------------------------------------- CROSS PRODUCT -----------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.Cross = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^Cross\(/, '')
  replacetext = replacetext.replace(/^cross\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Cross')
    flag = 1
  }
  if (inputarray.length == 1 || inputarray.length > 2) {
    Set_Error(this.Original_id, 'Cross1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[1]
  }
  var id2 = CreateEq(this.fileid, 1, eqobj)
  var sizes1 = self[id1].Format_size.split('x')
  var sizes2 = self[id2].Format_size.split('x')
  if (sizes1[0] != sizes2[0] || sizes1[1] != 3 || sizes1[0] != 1) {
    Set_Error(this.Original_id, 'Cross2')
    flag = 1
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)

    self[newid].Solution_real['0-0'] = parseFloat(
      Big(self[id1].Solution_real['0-1'])
        .times(Big(self[id2].Solution_real['0-2']))
        .minus(Big(self[id1].Solution_real['0-2']).times(Big(self[id2].Solution_real['0-1'])))
    )
    self[newid].Solution_real['0-1'] = parseFloat(
      Big(-1).times(
        Big(self[id1].Solution_real['0-0'])
          .times(Big(self[id2].Solution_real['0-2']))
          .minus(Big(self[id1].Solution_real['0-2']).times(Big(self[id2].Solution_real['0-0'])))
      )
    )
    self[newid].Solution_real['0-2'] = parseFloat(
      Big(self[id1].Solution_real['0-0'])
        .times(Big(self[id2].Solution_real['0-1']))
        .minus(Big(self[id1].Solution_real['0-1']).times(Big(self[id2].Solution_real['0-0'])))
    )

    //		self[newid].Solution_real['0-0']=self[id1].Solution_real['0-1']*self[id2].Solution_real['0-2']-self[id1].Solution_real['0-2']*self[id2].Solution_real['0-1'];
    //		self[newid].Solution_real['0-1']=-(self[id1].Solution_real['0-0']*self[id2].Solution_real['0-2']-self[id1].Solution_real['0-2']*self[id2].Solution_real['0-0']);
    //		self[newid].Solution_real['0-2']=self[id1].Solution_real['0-0']*self[id2].Solution_real['0-1']-self[id1].Solution_real['0-1']*self[id2].Solution_real['0-0']

    self[newid].Format_size = '1x3'
    self[newid].Format_showequation =
      '\\left(' + self[id1].Format_showequation + ' \\times ' + self[id2].Format_showequation + '\\right)'
    var baseunits = new Array()
    for (var index in self[id1].Units_base_array) {
      self[newid].Units_base_array[index] =
        parseInt(self[id1].Units_base_array[index]) + parseInt(self[id2].Units_base_array[index])
    }
    self[newid].Recompose_Units()

    this.Solution_temps.push(newid)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['units'] = self[newid].Units_units
    SetModels('Cross', newid, id1, id2)
    self[pid].Solution_variable_array[pos] = newid
  } else {
    var newid = ''
  }
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------- THRESHOLD FOR MATRICES ------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.Threshold = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^Threshold\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Threshold')
    flag = 1
  }
  if (inputarray.length == 1 || inputarray.length == 2 || inputarray.length > 3) {
    Set_Error(this.Original_id, 'Threshold1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var matid = CreateEq(this.fileid, 1, eqobj)
  if (inputarray[1] == 'Null') {
    var low = 'Null'
  } else {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[1]
    }
    var lowid = CreateEq(this.fileid, 1, eqobj)
    var low = self[lowid].Solution_real['0-0']
  }
  if (inputarray[2] == 'Null') {
    var high = 'Null'
  } else {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[2]
    }
    var highid = CreateEq(this.fileid, 1, eqobj)
    var high = self[highid].Solution_real['0-0']
  }
  if (low != 'Null' && high != 'Null') {
    if (low > high) {
      Set_Error(this.Original_id, 'Threshold2')
      flag = 1
    }
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    for (var i in self[matid].Solution_real) {
      if (self[matid].Solution_real[i] != 'Null' && self[matid].Solution_real[i] > high) {
        self[newid].Solution_real[i] = high
      } else if (self[matid].Solution_real[i] != 'Null' && self[matid].Solution_real[i] < low) {
        self[newid].Solution_real[i] = low
      } else {
        self[newid].Solution_real[i] = self[matid].Solution_real[i]
      }
    }
    self[newid].Format_size = self[matid].Format_size
    if (inputarray[1] == 'Null' && inputarray[2] == 'Null') {
      self[newid].Format_showequation = '\\left(' + self[matid].Format_showequation + '\\right)^{Null}_{Null}'
    } else if (inputarray[1] == 'Null') {
      self[newid].Format_showequation =
        '\\left(' + self[matid].Format_showequation + '\\right)^{' + self[highid].Format_showequation + '}_{Null}'
    } else if (inputarray[2] == 'Null') {
      self[newid].Format_showequation =
        '\\left(' + self[matid].Format_showequation + '\\right)^{Null}_{' + self[lowid].Format_showequation + '}'
    } else {
      self[newid].Format_showequation =
        '\\left(' +
        self[matid].Format_showequation +
        '\\right)^{' +
        self[highid].Format_showequation +
        '}_{' +
        self[lowid].Format_showequation +
        '}'
    }
    self[newid].Units_base_array = self[matid].Units_base_array
    self[newid].Units_units = self[matid].Units_units
    self[newid].Units_quantity = self[matid].Units_quantity
    this.Solution_temps.push(newid)
    SetModels('Threshold', newid, matid, lowid, highid)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    self[pid].Solution_variable_array[pos] = newid
  } else {
    var newid = ''
  }
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------- IS THE ITEM A COLUMN -------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.isColumn = function (replacetext, pid, pos, callback) {
  var flag = 0
  var answer = 0
  replacetext = replacetext.replace(/^isColumn\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'isColumn')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'isColumn1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    var sizes = self[id1].Format_size.split('x')
    if (parseInt(sizes[0]) > 1 && parseInt(sizes[1]) == 1) {
      answer = 1
    }
    if (sizes.length > 2) {
      answer = 0
    }
    self[newid].Solution_real['0-0'] = answer
    self[newid].Format_showequation =
      'isColumn \\hspace{0.1em} \\left( \\hspace{0.2em}' + self[id1].Format_showequation + '\\hspace{0.2em}\\right)'
    this.Solution_temps.push(newid)
    SetModels('isColumn', newid, id1)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    self[pid].Solution_variable_array[pos] = newid
  } else {
    var newid = ''
  }
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------------- IS THE ITEM A ROW --------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.isRow = function (replacetext, pid, pos, callback) {
  var flag = 0
  var answer = 0
  replacetext = replacetext.replace(/^isRow\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'isRow')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'isRow1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    var sizes = self[id1].Format_size.split('x')
    if (parseInt(sizes[0]) == 1 && parseInt(sizes[1]) > 1) {
      answer = 1
    }
    if (sizes.length > 2) {
      answer = 0
    }
    self[newid].Solution_real['0-0'] = answer
    self[newid].Format_showequation =
      'isRow \\hspace{0.1em} \\left( \\hspace{0.2em}' + self[id1].Format_showequation + '\\hspace{0.2em}\\right)'
    this.Solution_temps.push(newid)
    SetModels('isRow', newid, id1)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    self[pid].Solution_variable_array[pos] = newid
  } else {
    var newid = ''
  }
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------- IS THE ITEM A MATRIX -------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.isMatrix = function (replacetext, pid, pos, callback) {
  var flag = 0
  var answer = 0
  replacetext = replacetext.replace(/^isMatrix\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'isMatrix')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'isMatrix1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    var sizes = self[id1].Format_size.split('x')
    if (parseInt(sizes[0]) > 1 && parseInt(sizes[1]) > 1) {
      answer = 1
    }
    if (sizes.length > 2) {
      answer = 0
    }
    self[newid].Solution_real['0-0'] = answer
    self[newid].Format_showequation =
      'isMatrix  \\hspace{0.1em} \\left( \\hspace{0.2em}' + self[id1].Format_showequation + '\\hspace{0.2em}\\right)'
    this.Solution_temps.push(newid)
    SetModels('isMatrix', newid, id1)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    self[pid].Solution_variable_array[pos] = newid
  } else {
    var newid = ''
  }
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------- NUMBER OF ARRAY ELEMENTS ---------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.NumEl = function (replacetext, pid, pos, callback) {
  var flag = 0
  var answer = 1
  replacetext = replacetext.replace(/^NumEl\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'NumEl')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'NumEl1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    var sizes = self[id1].Format_size.split('x')
    for (var a = 0; a < sizes.length; a++) {
      answer = answer * sizes[a]
    }
    self[newid].Solution_real['0-0'] = answer
    self[newid].Format_showequation =
      'NumEl  \\hspace{0.1em} \\left( \\hspace{0.2em}' + self[id1].Format_showequation + '\\hspace{0.2em}\\right)'
    this.Solution_temps.push(newid)
    SetModels('NumEl', newid, id1)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    self[pid].Solution_variable_array[pos] = newid
  } else {
    var newid = ''
  }
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------- NUMBER OF ARRAY ELEMENTS ---------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.length = function (replacetext, pid, pos, callback) {
  var flag = 0
  var answer = 1
  replacetext = replacetext.replace(/^length\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'length')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'length1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    var sizes = self[id1].Format_size.split('x')
    for (var a = 0; a < sizes.length; a++) {
      if (parseInt(sizes[a]) > answer) {
        answer = parseInt(sizes[a])
      }
    }
    self[newid].Solution_real['0-0'] = answer
    self[newid].Format_showequation =
      'length  \\hspace{0.1em} \\left( \\hspace{0.2em}' + self[id1].Format_showequation + '\\hspace{0.2em}\\right)'
    this.Solution_temps.push(newid)
    SetModels('length', newid, id1)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    self[pid].Solution_variable_array[pos] = newid
  } else {
    var newid = ''
  }
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//----------------------------------------- FLIP A MATRIX LEFT TO RIGHT ---------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.fliplr = function (replacetext, pid, pos, callback) {
  var flag = 0
  var ranswer = {}
  var ianswer = {}
  var key = ''
  replacetext = replacetext.replace(/^fliplr\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'fliplr')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'fliplr1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  var sizes = self[id1].Format_size.split('x')
  if (sizes.length > 3) {
    Set_Error(this.Original_id, 'fliplr2')
    flag = 1
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    for (var a = 0; a < sizes[0]; a++) {
      for (var b = 0; b < sizes[1]; b++) {
        key = a + '-' + parseInt(sizes[1] - b - 1)
        if (self[id1].Solution_real[key] === undefined) {
          ranswer[a + '-' + b] = self[id1].Solution_realdefault
        } else {
          ranswer[a + '-' + b] = self[id1].Solution_real[key]
        }
        if (self[id1].Solution_imag[key] === undefined) {
          ianswer[a + '-' + b] = self[id1].Solution_imagdefault
        } else {
          ianswer[a + '-' + b] = self[id1].Solution_imag[key]
        }
      }
    }
    self[newid].Solution_real = ranswer
    self[newid].Solution_imag = ianswer
    self[newid].Format_size = self[id1].Format_size
    self[newid].Format_showequation =
      'fliplr  \\hspace{0.1em} \\left( \\hspace{0.2em}' + self[id1].Format_showequation + '\\hspace{0.2em}\\right)'
    self[newid].Units_base_array = self[id1].Units_base_array
    self[newid].Units_units = self[id1].Units_units
    self[newid].Units_quantity = self[id1].Units_quantity
    this.Solution_temps.push(newid)
    SetModels('fliplr', newid, id1)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    self[pid].Solution_variable_array[pos] = newid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  } else {
    var newid = ''
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//----------------------------------------- FLIP A MATRIX UP / DOWN -------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.flipud = function (replacetext, pid, pos, callback) {
  var flag = 0
  var ranswer = {}
  var ianswer = {}
  var key = ''
  replacetext = replacetext.replace(/^flipud\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'flipud')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'flipud1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  var sizes = self[id1].Format_size.split('x')
  if (sizes.length > 3) {
    Set_Error(this.Original_id, 'flipud2')
    flag = 1
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    for (var a = 0; a < sizes[0]; a++) {
      for (var b = 0; b < sizes[1]; b++) {
        key = parseInt(sizes[0] - a - 1) + '-' + b
        if (self[id1].Solution_real[key] === undefined) {
          ranswer[a + '-' + b] = self[id1].Solution_realdefault
        } else {
          ranswer[a + '-' + b] = self[id1].Solution_real[key]
        }
        if (self[id1].Solution_imag[key] === undefined) {
          ianswer[a + '-' + b] = self[id1].Solution_imagdefault
        } else {
          ianswer[a + '-' + b] = self[id1].Solution_imag[key]
        }
      }
    }
    self[newid].Solution_real = ranswer
    self[newid].Solution_imag = ianswer
    self[newid].Format_size = self[id1].Format_size
    self[newid].Format_showequation =
      'flipud  \\hspace{0.1em} \\left( \\hspace{0.2em}' + self[id1].Format_showequation + '\\hspace{0.2em}\\right)'
    self[newid].Units_base_array = self[id1].Units_base_array
    self[newid].Units_units = self[id1].Units_units
    self[newid].Units_quantity = self[id1].Units_quantity
    this.Solution_temps.push(newid)
    SetModels('flipud', newid, id1)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    self[pid].Solution_variable_array[pos] = newid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  } else {
    var newid = ''
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------- GET / SET THE DIAGONAL OF A MATRIX ----------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.diag = function (replacetext, pid, pos, callback) {
  var flag = 0
  var offset = 0
  var size = 0
  var ranswer = {}
  var key = ''
  var ianswer = {}
  var num = 0
  replacetext = replacetext.replace(/^diag\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'diag')
    flag = 1
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'diag1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  if (inputarray.length == 2) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[1]
    }
    var id2 = CreateEq(this.fileid, 1, eqobj)
    offset = self[id2].Solution_real['0-0']
    var sizes = self[id2].Format_size.split('x')
    if (sizes[0] != '1' || sizes[1] != '1') {
      Set_Error(this.Original_id, 'diag4')
      flag = 1
    }
  }
  var sizes = self[id1].Format_size.split('x')
  if (sizes.length > 2) {
    Set_Error(this.Original_id, 'diag2')
    flag = 1
  }
  if (sizes[1] == '1') {
    Set_Error(this.Original_id, 'diag3')
    flag = 1
  }
  //	if ((inputarray.length==2)&&(sizes[0]!=sizes[1])) { Set_Error(this.Original_id, "diag5"); flag=1; }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    if (sizes[0] == '1') {
      if (parseInt(sizes[0]) > parseInt(sizes[1])) {
        size = parseInt(sizes[0]) + Math.abs(offset)
      } else {
        size = parseInt(sizes[1]) + Math.abs(offset)
      }
      if (parseInt(offset) < 0) {
        for (var a = 0; a < size; a++) {
          for (var b = 0; b < size; b++) {
            ranswer[a + '-' + b] = 0
            ianswer[a + '-' + b] = 0
            num = parseInt(a) + parseInt(offset)
            key = '0-' + num
            if (a + parseInt(offset) == b) {
              ranswer[a + '-' + b] = self[id1].Solution_real[key]
              ianswer[a + '-' + b] = self[id1].Solution_imag[key]
            }
          }
        }
      } else {
        for (var a = 0; a < size; a++) {
          for (var b = 0; b < size; b++) {
            ranswer[a + '-' + b] = 0
            ianswer[a + '-' + b] = 0
            if (a == b - parseInt(offset)) {
              ranswer[a + '-' + b] = self[id1].Solution_real['0-' + a]
              ianswer[a + '-' + b] = self[id1].Solution_imag['0-' + a]
            }
          }
        }
      }
      self[newid].Format_size = a + 'x' + a
    } else {
      for (var a = 0; a < sizes[0] - Math.abs(offset); a++) {
        if (offset < 0) {
          num = parseInt(Math.abs(offset)) + a
          key = num + '-' + a
          ranswer['0-' + a] = self[id1].Solution_real[key]
          ianswer['0-' + a] = self[id1].Solution_imag[key]
        } else {
          num = parseInt(offset) + a
          key = a + '-' + num
          ranswer['0-' + a] = self[id1].Solution_real[key]
          ianswer['0-' + a] = self[id1].Solution_imag[key]
        }
      }
      num = sizes[0] - Math.abs(offset)
      self[newid].Format_size = '1x' + num
    }
    self[newid].Solution_real = ranswer
    self[newid].Solution_imag = ianswer
    if (inputarray.length == 1) {
      self[newid].Format_showequation =
        'diag  \\hspace{0.1em} \\left( \\hspace{0.2em}' + self[id1].Format_showequation + '\\hspace{0.2em}\\right)'
    } else {
      self[newid].Format_showequation =
        'diag  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        self[id1].Format_showequation +
        ', ' +
        self[id2].Format_showequation +
        '\\hspace{0.2em}\\right)'
    }
    self[newid].Units_base_array = self[id1].Units_base_array
    self[newid].Units_units = self[id1].Units_units
    self[newid].Units_quantity = self[id1].Units_quantity
    this.Solution_temps.push(newid)
    SetModels('Diag', newid, id1, id2)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    self[pid].Solution_variable_array[pos] = newid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  } else {
    var newid = ''
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//--------------------------------- GET / SET THE UPPER RIGHT PORTION OF A MATRIX -----------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.matur = function (replacetext, pid, pos, callback) {
  var flag = 0
  var offset = 0
  var size = 0
  var ranswer = {}
  var key = ''
  var ianswer = {}
  var num = 0
  replacetext = replacetext.replace(/^matur\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'matur')
    flag = 1
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'matur1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  if (inputarray.length == 2) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[1]
    }
    var id2 = CreateEq(this.fileid, 1, eqobj)
    offset = self[id2].Solution_real['0-0']
    var sizes = self[id2].Format_size.split('x')
    if (sizes[0] != '1' || sizes[1] != '1') {
      Set_Error(this.Original_id, 'matur2')
      flag = 1
    }
  }
  var sizes = self[id1].Format_size.split('x')
  if (sizes.length > 2) {
    Set_Error(this.Original_id, 'matur3')
    flag = 1
  }
  if (sizes[0] != sizes[1]) {
    Set_Error(this.Original_id, 'matur4')
    flag = 1
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    for (var a = 0; a < sizes[0]; a++) {
      for (var b = 0; b < sizes[1]; b++) {
        ranswer[a + '-' + b] = 0
        ianswer[a + '-' + b] = 0
        key = a + '-' + b
        if (b >= parseInt(a) + parseInt(offset)) {
          ranswer[key] = self[id1].Solution_real[key]
          ianswer[key] = self[id1].Solution_imag[key]
        }
      }
    }
    self[newid].Format_size = a + 'x' + a
    self[newid].Solution_real = ranswer
    self[newid].Solution_imag = ianswer
    if (inputarray.length == 1) {
      self[newid].Format_showequation =
        'matur  \\hspace{0.1em} \\left( \\hspace{0.2em}' + self[id1].Format_showequation + '\\hspace{0.2em}\\right)'
    } else {
      self[newid].Format_showequation =
        'matur  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        self[id1].Format_showequation +
        ', ' +
        self[id2].Format_showequation +
        '\\hspace{0.2em}\\right)'
    }
    self[newid].Units_base_array = self[id1].Units_base_array
    self[newid].Units_units = self[id1].Units_units
    self[newid].Units_quantity = self[id1].Units_quantity
    this.Solution_temps.push(newid)
    SetModels('matur', newid, id1, id2)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    self[pid].Solution_variable_array[pos] = newid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  } else {
    var newid = ''
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//--------------------------------- GET / SET THE LOWER LEFT PORTION OF A MATRIX ------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.matll = function (replacetext, pid, pos, callback) {
  var flag = 0
  var offset = 0
  var size = 0
  var ranswer = {}
  var key = ''
  var ianswer = {}
  var num = 0
  replacetext = replacetext.replace(/^matll\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'matll')
    flag = 1
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'matll1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  if (inputarray.length == 2) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[1]
    }
    var id2 = CreateEq(this.fileid, 1, eqobj)
    offset = self[id2].Solution_real['0-0']
    var sizes = self[id2].Format_size.split('x')
    if (sizes[0] != '1' || sizes[1] != '1') {
      Set_Error(this.Original_id, 'matll2')
      flag = 1
    }
  }
  var sizes = self[id1].Format_size.split('x')
  if (sizes.length > 2) {
    Set_Error(this.Original_id, 'matll3')
    flag = 1
  }
  if (sizes[0] != sizes[1]) {
    Set_Error(this.Original_id, 'matll4')
    flag = 1
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    for (var a = 0; a < sizes[0]; a++) {
      for (var b = 0; b < sizes[1]; b++) {
        ranswer[a + '-' + b] = 0
        ianswer[a + '-' + b] = 0
        key = a + '-' + b
        if (b <= parseInt(a) + parseInt(offset)) {
          ranswer[key] = self[id1].Solution_real[key]
          ianswer[key] = self[id1].Solution_imag[key]
        }
      }
    }
    self[newid].Format_size = a + 'x' + a
    self[newid].Solution_real = ranswer
    self[newid].Solution_imag = ianswer
    if (inputarray.length == 1) {
      self[newid].Format_showequation =
        'matll  \\hspace{0.1em} \\left( \\hspace{0.2em}' + self[id1].Format_showequation + '\\hspace{0.2em}\\right)'
    } else {
      self[newid].Format_showequation =
        'matll  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        self[id1].Format_showequation +
        ', ' +
        self[id2].Format_showequation +
        '\\hspace{0.2em}\\right)'
    }
    self[newid].Units_base_array = self[id1].Units_base_array
    self[newid].Units_units = self[id1].Units_units
    self[newid].Units_quantity = self[id1].Units_quantity
    this.Solution_temps.push(newid)
    SetModels('matll', newid, id1, id2)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    self[pid].Solution_variable_array[pos] = newid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  } else {
    var newid = ''
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//------------------------------- FIND POSSIBLE ROOT BRACKETS THROUGH INCREMENTAL SEARCH ----------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.incSearch = function (replacetext, pid, pos, callback) {
  var flag = 0
  var variable = 'x'
  var xdiff = 1
  var xs = {}
  var index = 0
  var ns = 50
  var oid = this.Original_id
  replacetext = replacetext.replace(/^incSearch\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'incSearch')
    flag = 1
  }
  if (inputarray.length < 3) {
    Set_Error(this.Original_id, 'incSearch1')
    flag = 1
  }
  if (inputarray.length > 5) {
    Set_Error(this.Original_id, 'incSearch2')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[1]
  }
  var minid = CreateEq(this.fileid, 1, eqobj)
  var min = self[minid].Solution_real['0-0']
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[2]
  }
  var maxid = CreateEq(this.fileid, 1, eqobj)
  var max = self[maxid].Solution_real['0-0']
  if (min > max) {
    Set_Error(this.Original_id, 'incSearch3')
    flag = 1
  }
  if (inputarray.length > 3) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[3]
    }
    var nsid = CreateEq(this.fileid, 1, eqobj)
    var ns = self[nsid].Solution_real['0-0']
  }
  if (inputarray.length == 5) {
    variable = inputarray[4]
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    xdiff = (max - min) / ns
    Solve_Function(min, xdiff, max, variable, inputarray[0], newid, oid, function () {
      Find_Increments(min, xdiff, max, newid, oid, function () {})
    })
    this.Solution_temps.push(newid)
    if (inputarray.length == 3) {
      self[newid].Format_showequation =
        'incSearch  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        inputarray[0] +
        ', ' +
        self[minid].Format_showequation +
        ', ' +
        self[maxid].Format_showequation +
        '\\hspace{0.2em}\\right)'
    }
    if (inputarray.length == 4) {
      self[newid].Format_showequation =
        'incSearch  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        inputarray[0] +
        ', ' +
        self[minid].Format_showequation +
        ', ' +
        self[maxid].Format_showequation +
        ', ' +
        self[nsid].Format_showequation +
        '\\hspace{0.2em}\\right)'
    }
    if (inputarray.length == 5) {
      self[newid].Format_showequation =
        'incSearch  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        inputarray[0] +
        ', ' +
        self[minid].Format_showequation +
        ', ' +
        self[maxid].Format_showequation +
        ', ' +
        self[nsid].Format_showequation +
        ', ' +
        variable +
        '\\hspace{0.2em}\\right)'
    }
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    SetModels('incSearch', newid, inputarray[0], minid, maxid, nsid, variable, inputarray.length)
    self[pid].Solution_variable_array[pos] = newid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  } else {
    var newid = ''
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Solve_Function(min, xdiff, max, variable, text, newid, oid, callback) {
  var Inputs = {}
  Inputs[variable] = '[' + min + ':' + xdiff + ':' + max + ']'
  var eqobj = {
    Page_position: DOM_Object[self[oid].Format_id]['location'],
    Solution_Inputs: Inputs,
    Format_showtype: 'InnerFunction',
    Original_id: self[oid].Original_id,
    equation: 'NewEq=' + text
  }
  var tempid = CreateEq(this.fileid, 1, eqobj)
  self[newid].Solution_real = self[tempid].Solution_real
  self[newid].Format_size = self[tempid].Format_size
  self[oid].Solution_temps.push(tempid)
  if (typeof callback == 'function') {
    callback()
  }
}
function Find_Increments(min, xdiff, max, newid, oid) {
  var answer = {}
  var count = 0
  var size = self[newid].Format_size.split('x')
  for (var a = 0; a < size[1] - 1; a++) {
    k1 = '0-' + a
    k2 = '0-' + parseInt(a + 1)
    if (
      (self[newid].Solution_real[k1] > 0 && self[newid].Solution_real[k2] < 0) ||
      (self[newid].Solution_real[k1] < 0 && self[newid].Solution_real[k2] > 0)
    ) {
      var low = ToNum(ToNum(min) + ToNum(xdiff * a))
      var high = ToNum(ToNum(min) + ToNum(xdiff * (a + 1)))
      answer[count + '-0'] = low
      answer[count + '-1'] = high
      count++
    }
  }
  self[newid].Solution_real = answer
  self[newid].Format_size = count + '-2'
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------- BISECTION METHOD OF FINDING ROOTS -------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.Bisect = function (replacetext, pid, pos, callback) {
  var flag = 0
  var variable = 'x'
  var oid = this.Original_id
  var iter = 0
  var es = 0.001
  var xr = 0
  var xrold = 0
  var maxit = 50
  replacetext = replacetext.replace(/^Bisect\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Bisect')
    flag = 1
  }
  if (inputarray.length < 3) {
    Set_Error(this.Original_id, 'Bisect1')
    flag = 1
  }
  if (inputarray.length > 5) {
    Set_Error(this.Original_id, 'Bisect2')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[1]
  }
  var xlid = CreateEq(this.fileid, 1, eqobj)
  var xl = self[xlid].Solution_real['0-0']
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[2]
  }
  var xuid = CreateEq(this.fileid, 1, eqobj)
  var xu = self[xuid].Solution_real['0-0']
  xr = xu
  if (xl > xu) {
    Set_Error(this.Original_id, 'Bisect3')
    flag = 1
  }
  if (inputarray.length > 3) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[3]
    }
    var esid = CreateEq(this.fileid, 1, eqobj)
    es = self[esid].Solution_real['0-0']
  }
  if (inputarray.length > 4) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[4]
    }
    var itid = CreateEq(this.fileid, 1, eqobj)
    maxit = self[itid].Solution_real['0-0']
  }
  if (inputarray.length > 5) {
    variable = inputarray[5]
  }
  var Inputs = {}
  Inputs[variable] = '[' + xl + ', ' + xu + ']'
  var eqobj = {
    Page_position: DOM_Object[self[oid].Format_id]['location'],
    Solution_Inputs: Inputs,
    Format_showtype: 'InnerFunction',
    Original_id: self[oid].Original_id,
    equation: 'NewEq=' + inputarray[0]
  }
  var tempid = CreateEq(this.fileid, 1, eqobj)
  if (self[tempid].Solution_real['0-0'] * self[tempid].Solution_real['0-1'] > 0) {
    Set_Error(this.Original_id, 'Bisect4')
    flag = 1
  }
  delete self[tempid]
  delete DOM_Object[tempid]
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    self[newid].xl = xl
    self[newid].xu = xu
    self[newid].xr = xr
    self[newid].xrold = xr
    self[newid].es = es
    self[newid].maxit = maxit
    self[newid].iter = iter
    self[newid].tf = 0
    while (self[newid].tf === 0) {
      Solve_BFunction(inputarray[0], newid, oid, variable, function () {
        Find_BValues(newid, oid, function () {})
      })
    }
    self[newid].Solution_real['0-0'] = self[newid].xr
    self[newid].Solution_real['0-1'] = self[newid].ea
    self[newid].Solution_real['0-2'] = self[newid].iter
    if (inputarray.length == 3) {
      self[newid].Format_showequation =
        'Bisect  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        inputarray[0] +
        ', ' +
        self[xlid].Format_showequation +
        ', ' +
        self[xuid].Format_showequation +
        '\\hspace{0.2em}\\right)'
    }
    if (inputarray.length == 4) {
      self[newid].Format_showequation =
        'Bisect  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        inputarray[0] +
        ', ' +
        self[xlid].Format_showequation +
        ', ' +
        self[xuid].Format_showequation +
        ', ' +
        self[esid].Format_showequation +
        '\\hspace{0.2em}\\right)'
    }
    if (inputarray.length == 5) {
      self[newid].Format_showequation =
        'Bisect  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        inputarray[0] +
        ', ' +
        self[xlid].Format_showequation +
        ', ' +
        self[xuid].Format_showequation +
        ', ' +
        self[esid].Format_showequation +
        ', ' +
        self[itid].Format_showequation +
        '\\hspace{0.2em}\\right)'
    }
    this.Solution_temps.push(newid)
    self[pid].Solution_variable_array[pos] = newid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    SetModels('Bisect', newid, inputarray[0], xlid, xuid, esid, itid, inputarray.length)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
  } else {
    var newid = ''
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Solve_BFunction(text, newid, oid, variable, callback) {
  self[newid].xrold = self[newid].xr
  if (ToNum(self[newid].xl) + ToNum(self[newid].xu) === 0) {
    self[newid].xr = 0
  } else {
    self[newid].xr = ToNum((ToNum(self[newid].xl) + ToNum(self[newid].xu)) / 2)
  }
  var Inputs = {}
  Inputs[variable] = '[' + self[newid].xl + ', ' + self[newid].xr + ']'
  var eqobj = {
    Page_position: DOM_Object[self[oid].Format_id]['location'],
    Solution_Inputs: Inputs,
    Format_showtype: 'InnerFunction',
    Original_id: self[oid].Original_id,
    equation: 'NewEq=' + text
  }
  var tempid = CreateEq(this.fileid, 1, eqobj)
  self[newid].Solution_real = self[tempid].Solution_real
  self[newid].Format_size = self[tempid].Format_size
  self[oid].Solution_temps.push(tempid)
  if (typeof callback == 'function') {
    callback()
  }
}
function Find_BValues(newid, oid) {
  self[newid].ea = Math.abs((self[newid].xr - self[newid].xrold) / self[newid].xr) * 100
  if (
    (self[newid].Solution_real['0-0'] < 0 && self[newid].Solution_real['0-1'] > 0) ||
    (self[newid].Solution_real['0-0'] > 0 && self[newid].Solution_real['0-1'] < 0)
  ) {
    self[newid].xu = self[newid].xr
  } else if (self[newid].Solution_real['0-0'] * self[newid].Solution_real['0-1'] === 0) {
    self[newid].ea = 0
  } else {
    self[newid].xl = self[newid].xr
  }
  self[newid].iter++
  if (self[newid].iter > self[newid].maxit || self[newid].ea < self[newid].es) {
    self[newid].tf = 1
  }
  delete DOM_Object[self[newid].deleteid]
  delete self[newid].deleteid
}
//-------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------- FALSE POSITION METHOD OF FINDING ROOTS -------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.FalsePos = function (replacetext, pid, pos, callback) {
  var flag = 0
  var variable = 'x'
  var oid = this.Original_id
  var iter = 0
  var es = 0.001
  var xr = 0
  var xrold = 0
  var maxit = 50
  var fl = 0
  var fu = 0
  replacetext = replacetext.replace(/^FalsePos\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'FalsePos')
    flag = 1
  }
  if (inputarray.length < 3) {
    Set_Error(this.Original_id, 'FalsePos1')
    flag = 1
  }
  if (inputarray.length > 5) {
    Set_Error(this.Original_id, 'FalsePos2')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[1]
  }
  var xlid = CreateEq(this.fileid, 1, eqobj)
  var xl = self[xlid].Solution_real['0-0']
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[2]
  }
  var xuid = CreateEq(this.fileid, 1, eqobj)
  var xu = self[xuid].Solution_real['0-0']
  xr = xu
  if (xl > xu) {
    Set_Error(this.Original_id, 'FalsePos3')
    flag = 1
  }
  if (inputarray.length > 3) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[3]
    }
    var esid = CreateEq(this.fileid, 1, eqobj)
    es = self[esid].Solution_real['0-0']
  }
  if (inputarray.length > 4) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[4]
    }
    var itid = CreateEq(this.fileid, 1, eqobj)
    maxit = self[itid].Solution_real['0-0']
  }
  if (inputarray.length > 5) {
    variable = inputarray[5]
  }
  var Inputs = {}
  Inputs[variable] = '[' + xl + ', ' + xu + ']'
  var eqobj = {
    Page_position: DOM_Object[self[oid].Format_id]['location'],
    Solution_Inputs: Inputs,
    Format_showtype: 'InnerFunction',
    Original_id: self[oid].Original_id,
    equation: 'NewEq=' + inputarray[0]
  }
  var tempid = CreateEq(this.fileid, 1, eqobj)
  if (self[tempid].Solution_real['0-0'] * self[tempid].Solution_real['0-1'] > 0) {
    Set_Error(this.Original_id, 'FalsePos4')
    flag = 1
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    self[newid].xl = xl
    self[newid].xu = xu
    self[newid].xr = xr
    self[newid].xrold = xr
    self[newid].es = es
    self[newid].maxit = maxit
    self[newid].iter = iter
    self[newid].tf = 0
    self[newid].Solution_real['0-0'] = self[tempid].Solution_real['0-0']
    self[newid].Solution_real['0-1'] = self[tempid].Solution_real['0-1']
    delete self[tempid]
    delete DOM_Object[tempid]
    while (self[newid].tf === 0) {
      Solve_FPFunction(inputarray[0], newid, oid, variable, function () {
        Find_FPValues(newid, oid, function () {})
      })
    }
    self[newid].Solution_real['0-0'] = self[newid].xr
    self[newid].Solution_real['0-1'] = self[newid].ea
    self[newid].Solution_real['0-2'] = self[newid].iter
    if (inputarray.length == 3) {
      self[newid].Format_showequation =
        'FalsePos  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        inputarray[0] +
        ', ' +
        self[xlid].Format_showequation +
        ', ' +
        self[xuid].Format_showequation +
        '\\hspace{0.2em}\\right)'
    }
    if (inputarray.length == 4) {
      self[newid].Format_showequation =
        'FalsePos  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        inputarray[0] +
        ', ' +
        self[xlid].Format_showequation +
        ', ' +
        self[xuid].Format_showequation +
        ', ' +
        self[esid].Format_showequation +
        '\\hspace{0.2em}\\right)'
    }
    if (inputarray.length == 5) {
      self[newid].Format_showequation =
        'FalsePos  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        inputarray[0] +
        ', ' +
        self[xlid].Format_showequation +
        ', ' +
        self[xuid].Format_showequation +
        ', ' +
        self[esid].Format_showequation +
        ', ' +
        self[itid].Format_showequation +
        '\\hspace{0.2em}\\right)'
    }
    this.Solution_temps.push(newid)
    SetModels('FalsePos', newid, inputarray[0], xlid, xuid, esid, itid, inputarray.length)
    self[pid].Solution_variable_array[pos] = newid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
  } else {
    var newid = ''
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Solve_FPFunction(text, newid, oid, variable, callback) {
  fl = ToNum(self[newid].Solution_real['0-0'])
  fu = ToNum(self[newid].Solution_real['0-1'])
  var sub = self[newid].xl - self[newid].xu
  self[newid].xrold = self[newid].xr
  if (ToNum(self[newid].xl) - ToNum(self[newid].xu) === 0) {
    self[newid].xr = 0
  } else {
    self[newid].xr = ToNum(self[newid].xu) - (ToNum(fu) * sub) / ToNum(fl - fu)
  }
  var Inputs = {}
  Inputs[variable] = '[' + self[newid].xl + ', ' + self[newid].xr + ']'
  var eqobj = {
    Page_position: DOM_Object[self[oid].Format_id]['location'],
    Solution_Inputs: Inputs,
    Format_showtype: 'InnerFunction',
    Original_id: self[oid].Original_id,
    equation: 'NewEq=' + text
  }
  var tempid = CreateEq(this.fileid, 1, eqobj)
  self[newid].Solution_real = self[tempid].Solution_real
  self[newid].Format_size = self[tempid].Format_size
  self[oid].Solution_temps.push(tempid)
  if (typeof callback == 'function') {
    callback()
  }
}
function Find_FPValues(newid, oid) {
  self[newid].ea = Math.abs((self[newid].xr - self[newid].xrold) / self[newid].xr) * 100
  if (
    (self[newid].Solution_real['0-0'] < 0 && self[newid].Solution_real['0-1'] > 0) ||
    (self[newid].Solution_real['0-0'] > 0 && self[newid].Solution_real['0-1'] < 0)
  ) {
    self[newid].xu = self[newid].xr
  } else if (self[newid].Solution_real['0-0'] * self[newid].Solution_real['0-1'] === 0) {
    self[newid].ea = 0
  } else {
    self[newid].xl = self[newid].xr
  }
  self[newid].iter++
  if (self[newid].iter > self[newid].maxit || self[newid].ea < self[newid].es) {
    self[newid].tf = 1
  }
  delete DOM_Object[self[newid].deleteid]
  delete self[newid].deleteid
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//---------------------------------------- SECANT METHOD OF FINDING ROOTS -------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.Secant = function (replacetext, pid, pos, callback) {
  var flag = 0
  var variable = 'x'
  var oid = this.Original_id
  var iter = 0
  var es = 0.0001
  var xr = 0
  var xrold = 0
  var maxit = 50
  var fl = 0
  var fu = 0
  replacetext = replacetext.replace(/^Secant\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Secant')
    flag = 1
  }
  if (inputarray.length < 3) {
    Set_Error(this.Original_id, 'Secant1')
    flag = 1
  }
  if (inputarray.length > 5) {
    Set_Error(this.Original_id, 'Secant2')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[1]
  }
  var x1id = CreateEq(this.fileid, 1, eqobj)
  var x1 = self[x1id].Solution_real['0-0']
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[2]
  }
  var x2id = CreateEq(this.fileid, 1, eqobj)
  var x2 = self[x2id].Solution_real['0-0']
  if (inputarray.length > 3) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[3]
    }
    var esid = CreateEq(this.fileid, 1, eqobj)
    es = self[esid].Solution_real['0-0']
  }
  if (inputarray.length > 4) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[4]
    }
    var itid = CreateEq(this.fileid, 1, eqobj)
    maxit = self[itid].Solution_real['0-0']
  }
  if (inputarray.length > 5) {
    variable = inputarray[5]
  }
  var Inputs = {}
  Inputs[variable] = x1
  var eqobj = {
    Page_position: DOM_Object[self[oid].Format_id]['location'],
    Solution_Inputs: Inputs,
    Format_showtype: 'InnerFunction',
    Original_id: self[oid].Original_id,
    equation: 'NewEq=' + inputarray[0]
  }
  var tempid1 = CreateEq(this.fileid, 1, eqobj)
  var y1 = self[tempid1].Solution_real['0-0']
  this.Solution_temps.push(tempid1)
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    self[newid].x1 = x1
    self[newid].x2 = x2
    self[newid].y1 = y1
    self[newid].es = es
    self[newid].maxit = maxit
    self[newid].iter = iter
    self[newid].tf = 0
    while (self[newid].tf === 0) {
      Solve_SFunction(inputarray[0], newid, oid, variable, function () {
        Find_SValues(newid, oid, function () {})
      })
    }
    self[newid].Solution_real['0-0'] = self[newid].x2
    self[newid].Solution_real['0-1'] = self[newid].ea
    self[newid].Solution_real['0-2'] = self[newid].iter
    if (inputarray.length == 3) {
      self[newid].Format_showequation =
        'Secant  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        self[tempid1].Format_showequation +
        ', ' +
        self[x1id].Format_showequation +
        ', ' +
        self[x2id].Format_showequation +
        '\\hspace{0.2em}\\right)'
    }
    if (inputarray.length == 4) {
      self[newid].Format_showequation =
        'Secant  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        self[tempid1].Format_showequation +
        ', ' +
        self[x1id].Format_showequation +
        ', ' +
        self[x2id].Format_showequation +
        ', ' +
        self[esid].Format_showequation +
        '\\hspace{0.2em}\\right)'
    }
    if (inputarray.length == 5) {
      self[newid].Format_showequation =
        'Secant  \\hspace{0.1em} \\left( \\hspace{0.2em}' +
        self[tempid1].Format_showequation +
        ', ' +
        self[x1id].Format_showequation +
        ', ' +
        self[x2id].Format_showequation +
        ', ' +
        self[esid].Format_showequation +
        ', ' +
        self[itid].Format_showequation +
        '\\hspace{0.2em}\\right)'
    }
    SetModels('Secant', newid, inputarray[0], x1id, x2id, esid, itid, inputarray.length)
    this.Solution_temps.push(newid)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    self[pid].Solution_variable_array[pos] = newid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  } else {
    var newid = ''
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
function Solve_SFunction(text, newid, oid, variable, callback) {
  var Inputs = {}
  Inputs[variable] = self[newid].x2
  var eqobj = {
    Page_position: DOM_Object[self[oid].Format_id]['location'],
    Solution_Inputs: Inputs,
    Format_showtype: 'InnerFunction',
    Original_id: self[oid].Original_id,
    equation: 'NewEq=' + text
  }
  var tempid = CreateEq(this.fileid, 1, eqobj)
  self[newid].y2 = JSON.parse(JSON.stringify(self[tempid].Solution_real['0-0']))
  self[oid].Solution_temps.push(tempid)
  if (typeof callback == 'function') {
    callback()
  }
}
function Find_SValues(newid, oid) {
  var top = self[newid].y2 * (self[newid].x1 - self[newid].x2)
  var bot = self[newid].y1 - self[newid].y2
  var temp = self[newid].x2 - ToNum(top / bot)
  self[newid].x1 = JSON.parse(JSON.stringify(self[newid].x2))
  self[newid].x2 = temp
  self[newid].y1 = JSON.parse(JSON.stringify(self[newid].y2))
  self[newid].ea = Math.abs(self[newid].x1 - self[newid].x2)
  self[newid].iter++
  if (self[newid].iter > self[newid].maxit || self[newid].ea < self[newid].es) {
    self[newid].tf = 1
  }
  delete DOM_Object[self[newid].deleteid]
  delete self[newid].deleteid
}
//-------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------- FIND THE FFT OF A DATASET ---------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.FFT = function (replacetext, pid, pos, callback) {
  var fileid = this.fileid,
    signal = [],
    a = 0
  var flag = 0
  replacetext = replacetext.replace(/^FFT\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'FFT')
    flag = 1
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'FFT2')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var dataid = CreateEq(this.fileid, 1, eqobj)
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[1]
  }
  var srid = CreateEq(this.fileid, 1, eqobj)
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'FFTEq=0'
  }
  var retid = CreateEq(this.fileid, 1, eqobj)
  if (flag === 0) {
    var Num = Object.keys(self[dataid].Solution_real).length
    var twopow = Math.pow(2, Math.ceil(Math.log2(Num)))
    for (a = Num; a < twopow; a++) {
      self[dataid].Solution_real['0-' + a] = 0
      self[dataid].Solution_imag['0-' + a] = 0
    }
    var fft = new FFT(twopow, self[srid]['Solution_real']['0-0'])
    for (a = 0; a < Object.keys(self[dataid]['Solution_real']).length; a++) {
      signal.push(self[dataid]['Solution_real']['0-' + a])
    }
    fft.forward(signal)
    spectrum = fft.spectrum
    for (var a = 0; a < twopow / 2; a++) {
      self[retid].Solution_real['0-' + a] = spectrum[a]
    }
    self[retid].Format_size = '1x' + parseInt(a)
    self[retid].Format_showequation =
      'FFT  \\left( \\hspace{0.2em}' +
      self[dataid].Format_showequation +
      ', ' +
      self[srid].Format_showequation +
      '\\hspace{0.2em}\\right)'
    SetModels('FFT', retid, dataid)
    self[pid].Solution_variable_array[pos] = retid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
    SetModels('FFT', retid, dataid, srid)
  } else {
    self[pid].Solution_variable_array[pos] = retid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
  }
}
//-------------------------------------------------------------------------------------------------------------------------//

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------ FUNCTIONS FOR THE FFT ALGORITHM ------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*
	This class was taken from a github account here: https://github.com/corbanbrook/dsp.js/. The functions show good agreement with the fourier transform.
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
// Fourier Transform Module used by DFT, FFT, RFFT
function FourierTransform(bufferSize, sampleRate) {
  this.bufferSize = bufferSize
  this.sampleRate = sampleRate
  this.bandwidth = ((2 / bufferSize) * sampleRate) / 2

  this.spectrum = new Float32Array(bufferSize / 2)
  this.real = new Float32Array(bufferSize)
  this.imag = new Float32Array(bufferSize)

  this.peakBand = 0
  this.peak = 0

  /**
   * Calculates the *middle* frequency of an FFT band.
   *
   * @param {Number} index The index of the FFT band.
   *
   * @returns The middle frequency in Hz.
   */
  this.getBandFrequency = function (index) {
    return this.bandwidth * index + this.bandwidth / 2
  }

  this.calculateSpectrum = function () {
    var spectrum = this.spectrum,
      real = this.real,
      imag = this.imag,
      bSi = 2 / this.bufferSize,
      sqrt = Math.sqrt,
      rval,
      ival,
      mag

    for (var i = 0, N = bufferSize / 2; i < N; i++) {
      rval = real[i]
      ival = imag[i]
      mag = bSi * sqrt(rval * rval + ival * ival)

      if (mag > this.peak) {
        this.peakBand = i
        this.peak = mag
      }

      spectrum[i] = mag
    }
  }
}

/**
 * FFT is a class for calculating the Discrete Fourier Transform of a signal
 * with the Fast Fourier Transform algorithm.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed. Must be power of 2
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
function FFT(bufferSize, sampleRate) {
  FourierTransform.call(this, bufferSize, sampleRate)

  this.reverseTable = new Uint32Array(bufferSize)

  var limit = 1
  var bit = bufferSize >> 1

  var i

  while (limit < bufferSize) {
    for (i = 0; i < limit; i++) {
      this.reverseTable[i + limit] = this.reverseTable[i] + bit
    }

    limit = limit << 1
    bit = bit >> 1
  }

  this.sinTable = new Float32Array(bufferSize)
  this.cosTable = new Float32Array(bufferSize)

  for (i = 0; i < bufferSize; i++) {
    this.sinTable[i] = Math.sin(-Math.PI / i)
    this.cosTable[i] = Math.cos(-Math.PI / i)
  }
}

/**
 * Performs a forward transform on the sample buffer.
 * Converts a time domain signal to frequency domain spectra.
 *
 * @param {Array} buffer The sample buffer. Buffer Length must be power of 2
 *
 * @returns The frequency spectrum array
 */
FFT.prototype.forward = function (buffer) {
  // Locally scope variables for speed up
  var bufferSize = this.bufferSize,
    cosTable = this.cosTable,
    sinTable = this.sinTable,
    reverseTable = this.reverseTable,
    real = this.real,
    imag = this.imag,
    spectrum = this.spectrum

  var k = Math.floor(Math.log(bufferSize) / Math.LN2)

  if (Math.pow(2, k) !== bufferSize) {
    throw 'Invalid buffer size, must be a power of 2.'
  }
  if (bufferSize !== buffer.length) {
    throw (
      'Supplied buffer is not the same size as defined FFT. FFT Size: ' + bufferSize + ' Buffer Size: ' + buffer.length
    )
  }

  var halfSize = 1,
    phaseShiftStepReal,
    phaseShiftStepImag,
    currentPhaseShiftReal,
    currentPhaseShiftImag,
    off,
    tr,
    ti,
    tmpReal,
    i

  for (i = 0; i < bufferSize; i++) {
    real[i] = buffer[reverseTable[i]]
    imag[i] = 0
  }

  while (halfSize < bufferSize) {
    //phaseShiftStepReal = Math.cos(-Math.PI/halfSize);
    //phaseShiftStepImag = Math.sin(-Math.PI/halfSize);
    phaseShiftStepReal = cosTable[halfSize]
    phaseShiftStepImag = sinTable[halfSize]

    currentPhaseShiftReal = 1
    currentPhaseShiftImag = 0

    for (var fftStep = 0; fftStep < halfSize; fftStep++) {
      i = fftStep

      while (i < bufferSize) {
        off = i + halfSize
        tr = currentPhaseShiftReal * real[off] - currentPhaseShiftImag * imag[off]
        ti = currentPhaseShiftReal * imag[off] + currentPhaseShiftImag * real[off]

        real[off] = real[i] - tr
        imag[off] = imag[i] - ti
        real[i] += tr
        imag[i] += ti

        i += halfSize << 1
      }

      tmpReal = currentPhaseShiftReal
      currentPhaseShiftReal = tmpReal * phaseShiftStepReal - currentPhaseShiftImag * phaseShiftStepImag
      currentPhaseShiftImag = tmpReal * phaseShiftStepImag + currentPhaseShiftImag * phaseShiftStepReal
    }

    halfSize = halfSize << 1
  }

  return this.calculateSpectrum()
}

//-------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------- FIND THE FOURIER TRANSFORM OF A DATASET -----------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.Fourier = function (replacetext, pid, pos, callback) {
  var flag = 0
  replacetext = replacetext.replace(/^Fourier\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Fourier')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var dataid = CreateEq(this.fileid, 1, eqobj)
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var retid = CreateEq(this.fileid, 0, eqobj)
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Fourier')
    flag = 1
  }
  if (flag === 0) {
    var Num = Object.keys(self[dataid].Solution_real).length
    for (var a = 0; a < Num; a++) {
      var real = 0
      var imag = 0
      for (var b = 0; b < Num; b++) {
        real = real + self[dataid].Solution_real['0-' + b] * Math.cos((-2 * Math.PI * a * b) / Num)
        imag = imag + self[dataid].Solution_real['0-' + b] * Math.sin((-2 * Math.PI * a * b) / Num)
      }
      self[retid].Solution_real['0-' + a] = real
      self[retid].Solution_imag['0-' + a] = imag
    }
    self[retid].Format_size = '1-' + Object.keys(self[retid].Solution_real).length
    self[retid].Units_units = ''
    self[retid].Units_quantity = ''
    this.Solution_temps.push(retid)
    self[retid].Format_showequation =
      'Fourier  \\left( \\hspace{0.2em}' + self[dataid].Format_showequation + '\\hspace{0.2em}\\right)'
    DOM_Object[retid]['real'] = self[retid].Solution_real
    DOM_Object[retid]['size'] = self[retid]['Format_size']
    DOM_Object[retid]['imag']['0-0'] = 0
    DOM_Object[retid]['units'] = self[retid].Units_units
    SetModels('Fourier', retid, dataid)
    self[pid].Solution_variable_array[pos] = retid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
//----------------------------------- DUPLICATE A ROW INTO A MATRIX OF SPECIFIED SIZE -------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.Row2Mat = function (replacetext, pid, pos, callback) {
  var flag = 0
  var key1 = ''
  var key2 = ''
  replacetext = replacetext.replace(/^Row2Mat\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Row2Mat')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  var Cols = Object.keys(self[id1].Solution_real).length
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[1]
  }
  var id2 = CreateEq(this.fileid, 1, eqobj)
  var Rows = self[id2].Solution_real['0-0']
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var retid = CreateEq(this.fileid, 0, eqobj)
  if (inputarray.length > 0 && inputarray.length < 2) {
    Set_Error(this.Original_id, 'Row2Mat1')
    flag = 1
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'Row2Mat2')
    flag = 1
  }
  var size = self[id1].Format_size.split('x')
  if (size[0] != '1') {
    Set_Error(this.Original_id, 'Row2Mat3')
    flag = 1
  }
  if (flag === 0) {
    for (var a = 0; a < Rows; a++) {
      for (var b = 0; b < Cols; b++) {
        key1 = a + '-' + b
        key2 = '0-' + b
        self[retid].Solution_real[key1] = self[id1].Solution_real[key2]
      }
    }
    self[retid].Format_size = Rows + '-' + Cols
    self[retid].Units_units = self[id1].Units_units
    self[retid].Units_quantity = self[id1].Units_quantity
    this.Solution_temps.push(retid)
    self[retid].Format_showequation =
      'Row2Mat  \\left( \\hspace{0.2em}' +
      self[id1].Format_showequation +
      ', ' +
      self[id2].Format_showequation +
      '\\hspace{0.2em}\\right)'
    SetModels('Row2Mat', retid, id1, id2)
    DOM_Object[retid]['real'] = self[retid].Solution_real
    DOM_Object[retid]['size'] = self[retid]['Format_size']
    DOM_Object[retid]['imag']['0-0'] = 0
    DOM_Object[retid]['units'] = self[retid].Units_units
    self[pid].Solution_variable_array[pos] = retid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//----------------------------------- DUPLICATE A COLUMN INTO A MATRIX OF SPECIFIED SIZE ----------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.Col2Mat = function (replacetext, pid, pos, callback) {
  var flag = 0
  var key1 = ''
  var key2 = ''
  replacetext = replacetext.replace(/^Col2Mat\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Col2Mat')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  var Cols = Object.keys(self[id1].Solution_real).length
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[1]
  }
  var id2 = CreateEq(this.fileid, 1, eqobj)
  var Rows = self[id2].Solution_real['0-0']
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=0'
  }
  var retid = CreateEq(this.fileid, 0, eqobj)
  if (inputarray.length > 0 && inputarray.length < 2) {
    Set_Error(this.Original_id, 'Col2Mat1')
    flag = 1
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'Col2Mat2')
    flag = 1
  }
  var size = self[id1].Format_size.split('x')
  if (size[1] != '1') {
    Set_Error(this.Original_id, 'Col2Mat3')
    flag = 1
  }
  if (flag === 0) {
    for (var a = 0; a < Rows; a++) {
      for (var b = 0; b < Cols; b++) {
        key1 = b + '-' + a
        key2 = b + '-0'
        self[retid].Solution_real[key1] = self[id1].Solution_real[key2]
      }
    }
    self[retid].Format_size = Rows + '-' + Cols
    self[retid].Units_units = self[id1].Units_units
    self[retid].Units_quantity = self[id1].Units_quantity
    this.Solution_temps.push(retid)
    self[retid].Format_showequation =
      'Col2Mat  \\left( \\hspace{0.2em}' +
      self[id1].Format_showequation +
      ', ' +
      self[id2].Format_showequation +
      '\\hspace{0.2em}\\right)'
    SetModels('Col2Mat', retid, id1, id2)
    DOM_Object[retid]['real'] = self[retid].Solution_real
    DOM_Object[retid]['size'] = self[retid]['Format_size']
    DOM_Object[retid]['imag']['0-0'] = 0
    DOM_Object[retid]['units'] = self[retid].Units_units
    self[pid].Solution_variable_array[pos] = retid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
/*
This is the function that solves simple ODEs. It is a straight Runge-Kutta 4 with no step size adjustment or stiffness.
The code takes in three inputs: a vector X for the steps, a single input representing the initial value of "y" and the 
function being integrated.
*/
Equation.prototype.ODE4 = function (replacetext, pid, pos, callback) {
  var flag = 0,
    key1 = '',
    key2 = '',
    key3 = '',
    key4 = '',
    key5 = '',
    key6 = '',
    mult = 1
  var yshowtext = '\\begin{bmatrix} '
  var showtext = '\\begin{bmatrix} '
  replacetext = replacetext.replace(/^ODE4\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'ODE4')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'xid=' + inputarray[0]
  }
  var xid = CreateEq(this.fileid, 1, eqobj)
  var ytext = inputarray[2]
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'newyid=0'
  }
  var newyid = CreateEq(this.fileid, 0, eqobj)
  if (inputarray.length < 3) {
    Set_Error(this.Original_id, 'ODE41')
    flag = 1
  }
  if (inputarray.length > 3) {
    Set_Error(this.Original_id, 'ODE41')
    flag = 1
  }
  ODE = {}
  ODE.k1 = {}
  ODE.k2 = {}
  ODE.k3 = {}
  ODE.k4 = {}
  ODE.phi = {}
  ODE.x = xid
  ODE.y = newyid
  ODE.yval = new Array()
  ODE.yt = inputarray[2]
  ODE.yraw = inputarray[1]
  ODE.raw = inputarray[2]
  ODE.yshow = {}
  ODE.show = {}
  ODE.fileid = this.fileid
  ODE.loc = DOM_Object[this.Format_id]['location']
  ODE.oid = this.Original_id
  ODE.newtext = ''
  ODE.yunits = {}
  if (flag == 0) {
    var regexp = new RegExp('^[[]')
    ODE.yraw = ODE.yraw.replace(regexp, '')
    ODE.raw = ODE.raw.replace(regexp, '')
    var regexp = new RegExp(']$')
    ODE.yraw = ODE.yraw.replace(regexp, '')
    ODE.raw = ODE.raw.replace(regexp, '')
    ODE.ytext = new Array()
    ODE.text = new Array()
    ODE.ytext = InputArray(ODE.yraw)
    ODE.text = InputArray(ODE.raw)
    ODE.stext = new Array()
    ODE.showtext = '\\begin{bmatrix} '
    ODE.rt = {}
    if (ODE.text.length != ODE.ytext.length) {
      Set_Error(this.Original_id, 'ODE42')
      flag = 1
    }
    if (flag === 0) {
      for (var a = 0; a < Object.keys(self[xid].Solution_real).length - 1; a++) {
        if (a === 0) {
          Solve_ODE4(a, 0, 1, 0)
        } else {
          Solve_ODE4(a, 0, 0, 0)
        }
      }
    }
    this.Solution_temps.push(xid)
    this.Solution_temps.push(newyid)
    for (var a = 0; a < Object.keys(ODE.yshow).length; a++) {
      yshowtext = yshowtext + '' + ODE.yshow[a] + '\\\\'
    }
    yshowtext = yshowtext + ' \\end{bmatrix}'
    self[newyid].Format_showequation =
      'ODE4  \\left( \\hspace{0.2em}' +
      self[xid].Format_showequation +
      ', ' +
      yshowtext +
      ', ' +
      ODE.newtext +
      '\\hspace{0.2em}\\right)'
    //		SetModels("ODE4", newyid, xid, ODE.y0id, );
    DOM_Object[newyid]['real'] = self[newyid].Solution_real
    DOM_Object[newyid]['size'] = self[newyid]['Format_size']
    DOM_Object[newyid]['imag']['0-0'] = 0
    DOM_Object[newyid]['units'] = self[newyid].Units_units
    self[pid].Solution_variable_array[pos] = newyid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
/*
This is step 1 and it happens for each x. The separated text is stepped through and if the text matches "x" or with 
any "y" which is y0, y1, y2, etc then it is replaced with that current value.
This equation is then solved and the Solve_ODE function is recalled with an incremented ypos. At the beginning of the 
if statement, if the ypos is being solved then it is stored.
*/
function Solve_ODE4(xpos, kpos, init, ypos) {
  console.log('In the solve ODE4 function with xpos, kpos, and ypos of ' + xpos + ' - ' + kpos + ' - ' + ypos)

  if (init == 1) {
    for (var b = 0; b < ODE.text.length; b++) {
      ODE.stext[b] = SplitText(ODE.text[b])
    }
    var b = 0
    while (b < ODE.text.length) {
      var eqobj = {
        Page_position: parseInt(ODE.loc),
        Format_showtype: 'InnerFunction',
        Original_id: ODE.oid,
        equation: 'ThisEq=' + ODE.ytext[b]
      }
      console.log('--- 1. About to solve ' + ODE.ytext[b])
      var y0id = CreateEq(ODE.fileid, 1, eqobj)
      ODE.yval[b] = self[y0id].Solution_real['0-0']
      ODE.yunits[b] = self[y0id].Units_units
      self[ODE.y].Solution_real[b + '-0'] = self[y0id].Solution_real['0-0']
      ODE.yshow[b] = self[y0id].Format_showequation
      ODE.y0id = y0id
      ODE.y0nummodel = self[y0id].Models_numerical
      ODE.y0unitmodel = self[y0id].Models_units
      ODE.y0dimmodel = self[y0id].Models_dimensions
      ODE.y0quanmodel = self[y0id].Models_quantities
      self[ODE.oid].Solution_temps.push(y0id)
      b++
    }
  }
  if (kpos === 0) {
    if (ypos === 0) {
      ODE.xval = self[ODE.x].Solution_real['0-' + xpos]
      var val1 = self[ODE.x].Solution_real['0-' + xpos]
      var val2 = self[ODE.x].Solution_real['0-' + parseInt(parseInt(xpos) + 1)]
      ODE.xval2 = parseFloat(Big(val2).minus(Big(val1)).div(Big(2)))
      ODE.xval3 = val2
      ODE.xdist = parseFloat(Big(val2).minus(Big(val1)))
    }
    if (ypos < ODE.text.length) {
      if (ypos > 0) {
        var ytemp = ypos - 1
        ODE.k1[ytemp] = {}
        ODE.k1[ytemp]['slope'] = self[ODE.tempid].Solution_real['0-0']
        ODE.k1[ytemp]['y'] = parseFloat(Big(ODE.yval[ytemp]).plus(Big(ODE.k1[ytemp]['slope']).times(Big(ODE.xval2))))
      }
      ODE.ytext = ''
      for (var index = 0; index < ODE['stext'][ypos].length; index++) {
        var flag = 0
        for (var c = 0; c < ODE.yval.length; c++) {
          var ytemp = 'y' + c
          if (ODE.stext[ypos][index] == ytemp) {
            ODE.ytext = ODE.ytext + '' + ODE.yval[c] + ' ' + ODE.yunits[c]
            flag = 1
          }
        }
        if (ODE.stext[ypos][index] == 'x') {
          ODE.ytext = ODE.ytext + '' + ODE.xval
          flag = 1
        }
        if (flag === 0) {
          ODE.ytext = ODE.ytext + '' + ODE['stext'][ypos][index]
        }
      }
      var eqobj = {
        Page_position: parseInt(ODE.loc),
        Format_showtype: 'InnerFunction',
        Original_id: ODE.oid,
        equation: 'Temp1=' + ODE.ytext
      }
      var tempid = CreateEq(ODE.fileid, 0, eqobj)
      ODE.tempid = tempid
      self[ODE.oid].Solution_temps.push(tempid)
      console.log('--- 2. About to solve ' + ODE.ytext)
      eqPromise(tempid).then(Solve_ODE4(xpos, 0, 0, ++ypos))
    } else {
      var ytemp = ypos - 1
      ODE.k1[ytemp] = {}
      ODE.k1[ytemp]['slope'] = self[ODE.tempid].Solution_real['0-0']
      ODE.k1[ytemp]['y'] = parseFloat(Big(ODE.yval[ytemp]).plus(Big(ODE.k1[ytemp]['slope']).times(Big(ODE.xval2))))
      Solve_ODE4(xpos, 1, 0, 0)
    }
  }
  if (kpos == 1) {
    if (ypos < ODE.text.length) {
      if (ypos > 0) {
        var ytemp = ypos - 1
        ODE.k2[ytemp] = {}
        ODE.k2[ytemp]['slope'] = self[ODE.tempid].Solution_real['0-0']
        ODE.k2[ytemp]['y'] = parseFloat(Big(ODE.yval[ytemp]).plus(Big(ODE.k2[ytemp]['slope']).times(Big(ODE.xval2))))
      }
      ODE.ytext = ''
      for (var index = 0; index < ODE['stext'][ypos].length; index++) {
        var flag = 0
        for (var c = 0; c < ODE.yval.length; c++) {
          var ytemp = 'y' + c
          if (ODE.stext[ypos][index] == ytemp) {
            ODE.ytext = ODE.ytext + '' + ODE.k1[c]['y'] + ' ' + ODE.yunits[c]
            flag = 1
          }
        }
        if (ODE.stext[ypos][index] == 'x') {
          ODE.ytext = ODE.ytext + '' + parseFloat(ODE.xval + ODE.xval2)
          flag = 1
        }
        if (flag === 0) {
          ODE.ytext = ODE.ytext + '' + ODE['stext'][ypos][index]
        }
      }
      var eqobj = {
        Page_position: parseInt(ODE.loc),
        Format_showtype: 'InnerFunction',
        Original_id: ODE.oid,
        equation: 'Temp2=' + ODE.ytext
      }
      var tempid = CreateEq(ODE.fileid, 0, eqobj)
      ODE.tempid = tempid
      self[ODE.oid].Solution_temps.push(tempid)
      console.log('--- 3. About to solve ' + ODE.ytext)
      eqPromise(tempid).then(Solve_ODE4(xpos, 1, 0, ++ypos))
    } else {
      var ytemp = ypos - 1
      ODE.k2[ytemp] = {}
      ODE.k2[ytemp]['slope'] = self[ODE.tempid].Solution_real['0-0']
      ODE.k2[ytemp]['y'] = parseFloat(Big(ODE.yval[ytemp]).plus(Big(ODE.k2[ytemp]['slope']).times(Big(ODE.xval2))))
      Solve_ODE4(xpos, 2, 0, 0)
    }
  }
  if (kpos == 2) {
    if (ypos < ODE.text.length) {
      if (ypos > 0) {
        var ytemp = ypos - 1
        ODE.k3[ytemp] = {}
        ODE.k3[ytemp]['slope'] = self[ODE.tempid].Solution_real['0-0']
        ODE.k3[ytemp]['y'] = parseFloat(Big(ODE.yval[ytemp]).plus(Big(ODE.k3[ytemp]['slope']).times(Big(ODE.xdist))))
      }
      ODE.ytext = ''
      for (var index = 0; index < ODE['stext'][ypos].length; index++) {
        var flag = 0
        for (var c = 0; c < ODE.yval.length; c++) {
          var ytemp = 'y' + c
          if (ODE.stext[ypos][index] == ytemp) {
            ODE.ytext = ODE.ytext + '' + ODE.k2[c]['y'] + ' ' + ODE.yunits[c]
            flag = 1
          }
        }
        if (ODE.stext[ypos][index] == 'x') {
          ODE.ytext = ODE.ytext + '' + parseFloat(ODE.xval + ODE.xval2)
          flag = 1
        }
        if (flag === 0) {
          ODE.ytext = ODE.ytext + '' + ODE['stext'][ypos][index]
        }
      }
      var eqobj = {
        Page_position: parseInt(ODE.loc),
        Format_showtype: 'InnerFunction',
        Original_id: ODE.oid,
        equation: 'Temp3=' + ODE.ytext
      }
      var tempid = CreateEq(ODE.fileid, 0, eqobj)
      ODE.tempid = tempid
      self[ODE.oid].Solution_temps.push(tempid)
      console.log('--- 4. About to solve ' + ODE.ytext)
      eqPromise(tempid).then(Solve_ODE4(xpos, 2, 0, ++ypos))
    } else {
      var ytemp = ypos - 1
      ODE.k3[ytemp] = {}
      ODE.k3[ytemp]['slope'] = self[ODE.tempid].Solution_real['0-0']
      ODE.k3[ytemp]['y'] = parseFloat(Big(ODE.yval[ytemp]).plus(Big(ODE.k3[ytemp]['slope']).times(Big(ODE.xdist))))
      Solve_ODE4(xpos, 3, 0, 0)
    }
  }
  if (kpos == 3) {
    if (ypos < ODE.text.length) {
      if (ypos > 0) {
        var ytemp = ypos - 1
        ODE.k4[ytemp] = {}
        ODE.k4[ytemp]['slope'] = self[ODE.tempid].Solution_real['0-0']
        if (xpos === 0) {
          ODE.show[ytemp] = self[ODE.tempid].Format_showequation
        }
        ODE.k4[ytemp]['y'] = parseFloat(Big(ODE.yval[ytemp]).plus(Big(ODE.k4[ytemp]['slope']).times(Big(ODE.xdist))))
      }
      ODE.ytext = ''
      for (var index = 0; index < ODE['stext'][ypos].length; index++) {
        var flag = 0
        for (var c = 0; c < ODE.yval.length; c++) {
          var ytemp = 'y' + c
          if (ODE.stext[ypos][index] == ytemp) {
            ODE.ytext = ODE.ytext + '' + ODE.k3[c]['y'] + ' ' + ODE.yunits[c]
            flag = 1
            if (xpos === 0) {
              ODE.rt[ODE.k3[c]['y']] = ytemp
            }
          }
        }
        if (ODE.stext[ypos][index] == 'x') {
          if (xpos === 0) {
            ODE.rt[ODE.xval3] = 'x'
          }
          ODE.ytext = ODE.ytext + '' + ODE.xval3
          flag = 1
        }
        if (flag === 0) {
          ODE.ytext = ODE.ytext + '' + ODE['stext'][ypos][index]
        }
      }
      var eqobj = {
        Page_position: parseInt(ODE.loc),
        Format_showtype: 'InnerFunction',
        Original_id: ODE.oid,
        equation: 'Temp4=' + ODE.ytext
      }
      var tempid = CreateEq(ODE.fileid, 0, eqobj)
      ODE.tempid = tempid
      self[ODE.oid].Solution_temps.push(tempid)
      console.log('--- 5. About to solve ' + ODE.ytext)
      eqPromise(tempid).then(Solve_ODE4(xpos, 3, 0, ++ypos))
    } else {
      var ytemp = ypos - 1
      ODE.k4[ytemp] = {}
      ODE.k4[ytemp]['slope'] = self[ODE.tempid].Solution_real['0-0']
      ODE.k4[ytemp]['y'] = parseFloat(Big(ODE.yval[ytemp]).plus(Big(ODE.k4[ytemp]['slope']).times(Big(ODE.xdist))))
      if (xpos === 0) {
        ODE.show[ytemp] = self[ODE.tempid].Format_showequation
      }
      for (var c = 0; c < ODE.yval.length; c++) {
        ODE.phi[c] =
          (1 / 6) * (ODE.k1[c]['slope'] + 2 * ODE.k2[c]['slope'] + 2 * ODE.k3[c]['slope'] + ODE.k4[c]['slope'])
        self[ODE.y].Solution_real[c + '-' + parseInt(xpos + 1)] = parseFloat(
          Big(ODE.yval[c]).plus(Big(ODE.phi[c]).times(Big(ODE.xdist)))
        )
        ODE.yval[c] = parseFloat(Big(ODE.yval[c]).plus(Big(ODE.phi[c]).times(Big(ODE.xdist))))
      }
      ODE.newtext = ' \\begin{bmatrix}'
      for (var a = 0; a < Object.keys(ODE.show).length; a++) {
        var temparr = SplitText(ODE.show[a])
        for (var t in ODE.rt) {
          for (var b = 0; b < temparr.length; b++) {
            if (t == temparr[b]) {
              temparr[b] = ODE.rt[t]
            }
          }
        }
        for (var b = 0; b < temparr.length; b++) {
          ODE.newtext = ODE.newtext + '' + temparr[b]
        }
        ODE.newtext = ODE.newtext + '\\\\'
      }
      ODE.newtext = ODE.newtext + ' \\end{bmatrix}'
    }
  }
}
//-------------------------------------------------------------------------------------------------------------------------//

/*-------------------------------------------------------------------------------------------------------------------------*/
/*----------------------------------------------- DETERMINANT ALGORITHM ---------------------------------------------------*/
/*-------------------------------------------------------------------------------------------------------------------------*\
	This algorithm decomposes a matrix into upper and lower matrices through LU decomposition. It then multiplies the		\
	diagonals of the two matrices to get the determinant.																	\
/*-------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Det = function (replacetext, pid, pos, callback) {
  ;(this.inline = 0),
    (flag = 0),
    (newmat = {}),
    (newsize = 0),
    (size = 0),
    (key = ''),
    (factor = 0),
    (lower = {}),
    (det = 0),
    (det1 = 1),
    (det2 = 1)
  replacetext = replacetext.replace(/^Det\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Det')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'Det1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  if (self[id1].Format_size == '1x1') {
    Set_Error(this.Original_id, 'Det2', id1)
    flag = 1
  }
  var sizes = self[id1].Format_size.split('x')
  if (sizes[0] !== sizes[1]) {
    Set_Error(this.Original_id, 'Det3', id1)
    flag = 1
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    newmat = self[id1].Solution_real
    size = parseInt(sizes[0])
    index = 0
    for (var a = 0; a < size - 1; a++) {
      for (var b = a + 1; b < size; b++) {
        factor = parseFloat(Big(newmat[b + '-' + a]).div(Big(newmat[a + '-' + a])))
        for (var c = a; c < size; c++) {
          newmat[b + '-' + c] = parseFloat(Big(newmat[b + '-' + c]).minus(Big(factor).times(Big(newmat[a + '-' + c]))))
        }
        lower[b + '-' + a] = factor
      }
    }
    for (var a = 0; a < size; a++) {
      for (var b = 0; b < size; b++) {
        if (a < b) {
          newmat[b + '-' + a] = 0
        }
      }
    }
    for (var a = 0; a < size; a++) {
      for (var b = 0; b < size; b++) {
        if (a < b) {
          lower[a + '-' + b] = 0
        } else if (a == b) {
          lower[a + '-' + b] = 1
        }
      }
    }
    self[newid].Format_showequation = 'Det \\left(' + self[id1].Format_showequation + '\\right)'
    SetModels('Det', newid, id1)
    this.Solution_temps.push(newid)
    for (var a = 0; a < size; a++) {
      det1 = det1 * newmat[a + '-' + a]
    }
    for (var a = 0; a < size; a++) {
      det2 = det2 * lower[a + '-' + a]
    }
    self[newid]['Format_size'] = '1x1'
    self[newid]['Solution_real']['0-0'] = det1 * det2
    self[newid]['Solution_imag']['0-0'] = 0
    self[newid]['Units_units'] = ''
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    SetModels('Det', newid, id1)
    self[pid].Solution_variable_array[pos] = newid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  } else {
    var newid = ''
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

/*---------------------------------------------------------------------------------------------------------------------------------------------*/
/*----------------------------------------------------- TAKE A MATRIX TO AN EXPONENT ----------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------*\

/*---------------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.MatPow = function (text, pid, pos, callback) {
  var flag = 0,
    solution_realarray = {},
    solution_imagarray = {},
    index1 = 0,
    index2 = 0,
    index3 = 0,
    key1 = '',
    key2 = '',
    key3 = '',
    key4 = ''
  var replacetext = text.replace(/^\s+|\s+$/g, '')
  replacetext = replacetext.replace(/^[MatPow(]+/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'MatPow')
    flag = 1
  }
  if (inputarray.length < 2) {
    Set_Error(this.Original_id, 'MatPow1')
    flag = 1
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'MatPow2')
    flag = 1
  }
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var expid = CreateEq(this.fileid, 1, eqobj)
  var num = self[expid]['Solution_real']['0-0']
  var eqobj = {
    Page_position: DOM_Object[this.Format_id]['location'],
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[1]
  }
  var baseid = CreateEq(this.fileid, 1, eqobj)
  var sizes = self[baseid]['Format_size'].split('x')
  if (sizes[0] != sizes[1]) {
    Set_Error(this.Original_id, 'MatPow3')
    flag = 1
  }
  var dim = sizes[0]
  var multid = CreateEq(this.fileid, 1, eqobj)
  if (self[expid]['Format_size'] != '1x1') {
    Set_Error(this.Original_id, 'MatPow4')
    flag = 1
  }
  if (self[expid]['Solution_real'] < 0) {
    Set_Error(this.Original_id, 'MatPow5')
    flag = 1
  }
  if (flag == 0) {
    for (var a = 0; a < num - 1; a++) {
      for (index1 = 0; index1 < dim; index1++) {
        for (index2 = 0; index2 < dim; index2++) {
          key1 = index1 + '-' + index2
          solution_realarray[key1] = 0
          solution_imagarray[key1] = 0
          for (index3 = 0; index3 < dim; index3++) {
            key2 = index2 + '-' + index1
            key3 = index1 + '-' + index3
            key4 = index3 + '-' + index2
            real1 = self[baseid].Solution_real[key3]
            imag1 = self[baseid].Solution_imag[key3]
            real2 = self[multid].Solution_real[key4]
            imag2 = self[multid].Solution_imag[key4]
            if (real1 === undefined) {
              real1 = 0
            }
            if (imag1 === undefined) {
              imag1 = 0
            }
            if (real2 === undefined) {
              real2 = 0
            }
            if (imag2 === undefined) {
              imag2 = 0
            }
            var r1 = parseFloat(Big(real1).times(Big(real2)))
            var r2 = parseFloat(Big(imag1).times(Big(imag2)))
            var i1 = parseFloat(Big(real1).times(Big(imag2)))
            var i2 = parseFloat(Big(imag1).times(Big(real2)))
            var real = parseFloat(Big(r1).minus(Big(r2)))
            var imag = parseFloat(Big(i1).plus(Big(i2)))
            solution_realarray[key1] = parseFloat(Big(solution_realarray[key1]).plus(Big(real)))
            solution_imagarray[key1] = parseFloat(Big(solution_imagarray[key1]).plus(Big(imag)))
          }
        }
      }
      self[multid].Solution_real = JSON.parse(JSON.stringify(solution_realarray))
      self[multid].Solution_imag = JSON.parse(JSON.stringify(solution_imagarray))
    }
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[1]
    }
    var id = CreateEq(this.fileid, 0, eqobj)
    for (var i in self[baseid].Units_base_array) {
      self[id].Units_base_array[i] = self[baseid].Units_base_array[i] * num
    }
    self[id].Recompose_Units()
    self[id].Get_BaseString()
    self[id]['Solution_real'] = self[multid].Solution_real
    self[id]['Solution_imag'] = self[multid].Solution_imag
    self[id]['Format_size'] = self[baseid].Format_size
    DOM_Object[id]['real'] = self[multid].Solution_real
    DOM_Object[id]['imag'] = self[multid].Solution_imag
    DOM_Object[id]['size'] = self[multid]['Format_size']
    DOM_Object[id]['units'] = self[multid].Units_units
    this.Solution_temps.push(self[id].Format_id)
    SetModels('MatPow', baseid, expid)
    self[id].Format_showequation =
      '\\left[' + self[baseid]['Format_showequation'] + '\\right]^{' + self[expid]['Format_showequation'] + '}'
    self[id].Show_Solution()
    self[pid].Solution_variable_array[pos] = id
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------------------------------------------//

/*---------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------- MATH FUNCTION - Integrate a vector point by point to return a vector  ------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------*\
/*---------------------------------------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.IntVec = function (text, pid, pos, callback) {
  var temp1 = 0,
    temp2 = 0,
    previous = 0,
    key1 = '',
    key2 = '',
    key3 = '',
    flag = 0
  var replacetext = text.replace(/^\s+|\s+$/g, '')
  replacetext = replacetext.replace(/^IntVec\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'IntVec')
    flag = 1
  }
  if (inputarray.length < 2) {
    Set_Error(this.Original_id, 'IntVec1')
    flag = 1
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'IntVec2')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[1]
  }
  var yid = CreateEq(this.fileid, 1, eqobj)
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location'], 10),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var xid = CreateEq(this.fileid, 1, eqobj)
  var sizes = self[yid].Format_size.split('x')
  var size = sizes[1]
  var sizes2 = self[xid].Format_size.split('x')
  if (parseInt(size, 10) < 3) {
    Set_Error(this.Original_id, 'IntVec3')
    flag = 1
  }
  if (parseInt(sizes2[1], 10) != parseInt(sizes[1])) {
    Set_Error(this.Original_id, 'IntVec4')
    flag = 1
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: DOM_Object[this.Format_id]['location'],
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    var id = CreateEq(this.fileid, 0, eqobj)
    self[id]['Solution_real']['0-0'] = 0
    for (var a = 1; a < size; a++) {
      key1 = '0-' + a
      key2 = '0-' + parseInt(a + 1, 10)
      key3 = '0-' + parseInt(a - 1, 10)
      temp1 = (self[yid]['Solution_real'][key3] + self[yid]['Solution_real'][key1]) / 2
      temp2 = self[xid]['Solution_real'][key1] - self[xid]['Solution_real'][key3]
      self[id]['Solution_real'][key1] = self[id]['Solution_real'][key3] + temp1 * temp2
    }
    for (var a = 0; a < size - 1; a++) {
      self[id]['Solution_real']['0-' + a] = self[id]['Solution_real']['0-' + parseInt(a + 1, 10)]
    }
    delete self[id]['Solution_real']['0-' + parseInt(a, 10)]

    for (var index in self[xid].Units_base_array) {
      self[id].Units_base_array[index] =
        parseInt(self[xid].Units_base_array[index], 10) + parseInt(self[yid].Units_base_array[index], 10)
    }

    DOM_Object[id]['real'] = self[id].Solution_real
    DOM_Object[id]['size'] = self[id]['Format_size']
    DOM_Object[id]['imag']['0-0'] = 0
    DOM_Object[id]['units'] = self[id].Units_units
    this.Solution_temps.push(self[id].Format_id)
    //		SetModels("Derivative", id, yid, x_space);
    self[id].Format_showequation =
      'IntVec \\left(' + self[xid].Format_showequation + ', ' + self[yid].Format_showequation + '  \\right)'
    self[pid].Solution_variable_array[pos] = id
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//---------------------------------------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//-------------------------------- RETURN A NUMBER THAT DEPENDS ON THE SIGN OF THE ENTRY ----------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.sign = function (replacetext, pid, pos, callback) {
  var flag = 0,
    negid = '',
    retid = '',
    posid = '',
    zeroid = '',
    posnum = 1,
    neg = -1,
    zero = 0,
    eqobj = {}
  replacetext = replacetext.replace(/^sign\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'sign')
    flag = 1
  }
  if (inputarray.length > 4) {
    Set_Error(this.Original_id, 'sign1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var itemid = CreateEq(this.fileid, 1, eqobj)
  if (inputarray[1] !== undefined) {
    eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[1]
    }
    posid = CreateEq(this.fileid, 1, eqobj)
    posnum = self[posid]['Solution_real']['0-0']
  }
  if (inputarray[2] !== undefined) {
    eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[2]
    }
    negid = CreateEq(this.fileid, 1, eqobj)
    neg = self[negid]['Solution_real']['0-0']
  }
  if (inputarray[3] !== undefined) {
    eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[3]
    }
    zeroid = CreateEq(this.fileid, 1, eqobj)
    zero = self[zeroid]['Solution_real']['0-0']
  }
  if (flag === 0) {
    eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    retid = CreateEq(this.fileid, 0, eqobj)
    for (var key in self[itemid]['Solution_real']) {
      if (self[itemid]['Solution_real'][key] > 0) {
        self[retid]['Solution_real'][key] = posnum
      }
      if (self[itemid]['Solution_real'][key] < 0) {
        self[retid]['Solution_real'][key] = neg
      }
      if (self[itemid]['Solution_real'][key] === 0) {
        self[retid]['Solution_real'][key] = zero
      }
    }
    this.Solution_temps.push(retid)
    if (inputarray[3] !== undefined) {
      self[retid].Format_showequation =
        'sign \\left( \\hspace{0.2em}' +
        self[itemid].Format_showequation +
        ', ' +
        self[posid].Format_showequation +
        ', ' +
        self[negid].Format_showequation +
        ', ' +
        self[zeroid].Format_showequation +
        '\\hspace{0.2em}\\right)'
    } else if (inputarray[2] !== undefined) {
      self[retid].Format_showequation =
        'sign \\left( \\hspace{0.2em}' +
        self[itemid].Format_showequation +
        ', ' +
        self[posid].Format_showequation +
        ', ' +
        self[negid].Format_showequation +
        '\\hspace{0.2em}\\right)'
    } else if (inputarray[1] !== undefined) {
      self[retid].Format_showequation =
        'sign \\left( \\hspace{0.2em}' +
        self[itemid].Format_showequation +
        ', ' +
        self[posid].Format_showequation +
        '\\hspace{0.2em}\\right)'
    } else {
      self[retid].Format_showequation =
        'sign \\left( \\hspace{0.2em}' + self[itemid].Format_showequation + '\\hspace{0.2em}\\right)'
    }
    if (inputarray.length >= 4) {
      SetModels('sign', retid, itemid, posid, negid, zeroid)
    } else if (inputarray.length >= 3) {
      SetModels('sign', retid, itemid, posid, negid)
    } else if (inputarray.length >= 2) {
      SetModels('sign', retid, itemid, posid)
    } else {
      SetModels('sign', retid, itemid)
    }
    DOM_Object[retid]['real'] = self[retid].Solution_real
    DOM_Object[retid]['size'] = '1x1'
    DOM_Object[retid]['imag']['0-0'] = 0
    self[pid].Solution_variable_array[pos] = retid
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//
/*-------------------------------------------------------------------------------------------------------------------------*/
/*-------------------------------------- SQUASH A MATRIX WITH SINGLE INDICES ----------------------------------------------*/
/*-------------------------------------------------------------------------------------------------------------------------*/
/*  This function is called whenever a new matrix has been created and it may have more indexes than necessary. For         |
    instance, if a matrix must be at least 2 dimensions, but if it is 1x1x1x1, this is meaningless. The code removes the    |
    excess ones.                                                                                                            |
/*-------------------------------------------------------------------------------------------------------------------------*/
function SquashMatrix(thisid) {
  //	|
  var eqobj = { Original_id: self[thisid].Format_id, equation: 'TempEq=0' } //	|
  var id = CreateEq(self[thisid].fileid, 0, eqobj) //	|
  var count = 0,
    splitkey = new Array(),
    key = '',
    newsize = '' //	|
  var splitsize = self[thisid]['Format_size'].split('x') //	|
  for (var a = 0; a < splitsize.length; a++) {
    if (splitsize[a] > 1) {
      newsize = newsize + 'x' + splitsize[a]
    }
  } //	|
  newsize = newsize.replace(/^x/, '') //	|
  for (var a = 0; a < splitsize.length; a++) {
    if (splitsize[a] > 1) {
      count = parseInt(count, 10) + 1
    }
  } //	|
  console.log('The count and size are ' + count + ' -' + self[thisid]['Format_size'] + ' - ' + newsize)
  if (count == 0) {
    //  |
    for (var a in self[thisid].Solution_real) {
      //	|
      self[id].Solution_real['0-0'] = self[thisid].Solution_real[a]
      newsize = '1x1'
    } //	|
  } //	|
  else {
    if (count == 1) {
      newsize = '1x' + newsize
    } //	|
    for (var a in self[thisid].Solution_real) {
      //	|
      key = ''
      splitkey = a.split('-') //	|
      if (count == 1) {
        key = '0'
      } //	|
      for (var b = 0; b < splitkey.length; b++) {
        if (splitsize[b] > 1) {
          key = key + '-' + splitkey[b]
        }
      } //	|
      key = key.replace(/^\-/, '') //	|
      self[id].Solution_real[key] = self[thisid].Solution_real[a] //	|
    } //	|
  } //	|
  self[id].Format_showequation = self[thisid].Format_showequation //	|
  self[id].Format_size = newsize //	|
  DOM_Object[id]['size'] = newsize //	|
  console.log('The count and size are ' + count + ' - ' + newsize)
  return id //	|
} //	|
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------------ ROTATE A 2 D MATRIX ----------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.rotate = function (replacetext, pid, pos, callback) {
  var flag = 0,
    retid = '',
    eqobj = {},
    nums = [],
    newkey = '',
    sizes = [],
    newrow = 0,
    newcol = 0
  replacetext = replacetext.replace(/^rotate\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'rotate')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'rotate1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id = CreateEq(this.fileid, 1, eqobj)
  if (flag === 0) {
    eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    retid = CreateEq(this.fileid, 0, eqobj)
    var sizes = self[id]['Format_size'].split('x')
    if (sizes.length > 2) {
      Set_Error(this.Original_id, 'rotate2')
      flag = 1
    }
    if (flag === 0) {
      for (var col = sizes[1] - 1; col >= 0; col--) {
        newcol = 0
        for (var row = 0; row < sizes[0]; row++) {
          self[retid]['Solution_real'][newrow + '-' + newcol] = self[id]['Solution_real'][row + '-' + col]
          newcol = newcol + 1
        }
        newrow = newrow + 1
      }
      this.Solution_temps.push(retid)
      self[retid].Format_showequation =
        'rotate \\left( \\hspace{0.2em}' + self[id].Format_showequation + '\\hspace{0.2em}\\right)'
      //		SetModels("size", retid, itemid, posid, negid, zeroid);
      DOM_Object[retid]['real'] = self[retid].Solution_real
      DOM_Object[retid]['size'] = '1x1'
      DOM_Object[retid]['imag']['0-0'] = 0
      self[pid].Solution_variable_array[pos] = retid
      self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
      self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    }
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//
/*-------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------- CHANGE A DATE AND TIME TO UTC FORMAT ----------------------------------------*/
/*-------------------------------------------------------------------------------------------------------------------------*
	This function takes in dates of several formats and changes them to the integer representing UTC. This is needed to 	\
	plot dates on the X axis. This function is very different from others. It must protect for the case where a user is 	\
	changing a column or row of table text to a UTC number, it must protect for the case where the user is entering a 		\
	single snippet of text to be transformed, and it must protect for the case where the user has a column or row of a 		\
	variable that needs to be changed. This last case could happen if a database is read into the memory.					\
/*-------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.parseDate = function (replacetext, pid, pos, callback) {
  var flag = 0,
    retid = '',
    eqobj = {},
    textstring = '',
    text = []
  replacetext = replacetext.replace(/^parseDate\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  //	var inputarray=InputArray(replacetext);
  //	if (inputarray.length===0) { Set_Error(this.Original_id, "NoEntry", "parseDate"); flag=1; }
  //	if (inputarray.length>1) 	{	Set_Error(this.Original_id, "parseDate1"); flag=1; }
  if (flag === 0) {
    eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    retid = CreateEq(this.fileid, 0, eqobj)
    textstring = replacetext.split(';')
    for (var a = 0; a < textstring.length; a++) {
      self[retid]['Solution_real']['0-' + a] = Date.parse(textstring[a])
      self[retid]['Solution_imag']['0-' + a] = 0
    }
    this.Solution_temps.push(retid)
    self[retid].Format_showequation =
      'parseDate \\left( \\hspace{0.2em} \\text{' + replacetext + '}\\hspace{0.2em}\\right)'
    //		SetModels("size", retid, itemid, posid, negid, zeroid);
    DOM_Object[retid]['real'] = self[retid].Solution_real
    DOM_Object[retid]['size'] = '1x1'
    DOM_Object[retid]['imag']['0-0'] = 0
    self[pid].Solution_variable_array[pos] = retid
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

/*-------------------------------------------------------------------------------------------------------------------------*/
/*----------------------------------------------- POSITIVE DEFINITE -------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------------------------------------*\
	This algorithm determines whether or not a matrix is positive definite. It uses Sylvester's criterion which asserts		\
	that a a Hermitian matrix is positive definite if and only if each matrix from the top left corner out in steps of 2x2	\
	to 3x3 to NxN are positive. The algorithm does this by decomposing the matrices into upper and lower matrices through 	\
	LU decomposition. It then multiplies the diagonals of the two matrices to get the determinant.							\
/*-------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.isPosDef = function (replacetext, pid, pos, callback) {
  ;(this.inline = 0),
    (flag = 0),
    (newmat = {}),
    (newsize = 0),
    (size = 0),
    (key = ''),
    (factor = 0),
    (lower = {}),
    (det = 0),
    (det1 = 1),
    (det2 = 1),
    (fin = 1),
    (tmp = 0)
  replacetext = replacetext.replace(/^isPosDef\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'isPosDef')
    flag = 1
  }
  if (inputarray.length > 1) {
    Set_Error(this.Original_id, 'isPosDef1')
    flag = 1
  }
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)
  if (self[id1].Format_size == '1x1') {
    Set_Error(this.Original_id, 'isPosDef2', id1)
    flag = 1
  }
  var sizes = self[id1].Format_size.split('x')
  if (sizes[0] !== sizes[1]) {
    Set_Error(this.Original_id, 'isPosDef3', id1)
    flag = 1
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    size = parseInt(sizes[0])
    index = 0
    for (var ind = 1; ind <= size; ind++) {
      det1 = 1
      det2 = 1
      newmat = JSON.parse(JSON.stringify(self[id1].Solution_real))
      for (var a = 0; a < ind - 1; a++) {
        for (var b = a + 1; b < ind; b++) {
          factor = parseFloat(Big(newmat[b + '-' + a]).div(Big(newmat[a + '-' + a])))
          for (var c = a; c < ind; c++) {
            newmat[b + '-' + c] = parseFloat(
              Big(newmat[b + '-' + c]).minus(Big(factor).times(Big(newmat[a + '-' + c])))
            )
          }
          lower[b + '-' + a] = factor
        }
      }
      for (var a = 0; a < ind; a++) {
        for (var b = 0; b < ind; b++) {
          if (a < b) {
            newmat[b + '-' + a] = 0
          }
        }
      }
      for (var a = 0; a < ind; a++) {
        for (var b = 0; b < ind; b++) {
          if (a < b) {
            lower[a + '-' + b] = 0
          } else if (a == b) {
            lower[a + '-' + b] = 1
          }
        }
      }
      for (var a = 0; a < ind; a++) {
        det1 = det1 * newmat[a + '-' + a]
      }
      for (var a = 0; a < ind; a++) {
        det2 = det2 * lower[a + '-' + a]
      }
      tmp = det1 * det2
      if (tmp <= 0) {
        fin = 0
        break
      }
    }
    self[newid].Format_showequation = 'isPosDef \\left(' + self[id1].Format_showequation + '\\right)'
    SetModels('isPosDef', newid, id1)
    this.Solution_temps.push(newid)
    self[newid]['Format_size'] = '1x1'
    self[newid]['Solution_real']['0-0'] = fin
    self[newid]['Solution_imag']['0-0'] = 0
    self[newid]['Units_units'] = ''
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    SetModels('isPosDef', newid, id1)
    self[pid].Solution_variable_array[pos] = newid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  } else {
    var newid = ''
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

/*-------------------------------------------------------------------------------------------------------------------------*/
/*--------------------------------------------------- INTERPOLATE ---------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------------------------------------*\
	This algorithm takes in a vector and creates a new one. The new vector has a number of points interpolated between 		\
	each point. That number of points is taken in as an input.																\
/*-------------------------------------------------------------------------------------------------------------------------*/
Equation.prototype.Interpolate = function (replacetext, pid, pos, callback) {
  var flag = 0,
    size = 0,
    index1 = 0,
    index2 = 0,
    key = '',
    newnum = 0,
    number = 0
  replacetext = replacetext.replace(/^Interpolate\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  var inputarray = InputArray(replacetext)
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'Interpolate')
    flag = 1
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'Interpolate1')
    flag = 1
  }
  if (flag === 0) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    var newid = CreateEq(this.fileid, 0, eqobj)
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[0]
    }
    var vecid = CreateEq(this.fileid, 1, eqobj)
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[1]
    }
    var numid = CreateEq(this.fileid, 1, eqobj)
    number = self[numid].Solution_real['0-0']
    var sizes = self[vecid].Format_size.split('x')
    size = parseInt(sizes[1])
    for (var ind1 = 0; ind1 < size - 1; ind1++) {
      self[newid]['Solution_real']['0-' + index2] = self[vecid]['Solution_real']['0-' + index1]
      for (var ind2 = 0; ind2 < self[numid]['Solution_real']['0-0']; ind2++) {
        newnum = parseFloat(
          Big(self[vecid]['Solution_real']['0-' + parseInt(index1 + 1)])
            .minus(Big(self[vecid]['Solution_real']['0-' + index1]))
            .div(Big(number))
        )
        self[newid]['Solution_real']['0-' + index2] = parseFloat(
          Big(self[vecid]['Solution_real']['0-' + index1]).plus(Big(newnum).times(Big(ind2)))
        )
        index2 = index2 + 1
      }
      index1 = index1 + 1
    }
    index1 = index1 - 1
    newnum = parseFloat(
      Big(self[vecid]['Solution_real']['0-' + parseInt(index1 + 1)])
        .minus(Big(self[vecid]['Solution_real']['0-' + index1]))
        .div(Big(number))
    )
    self[newid]['Solution_real']['0-' + index2] = parseFloat(
      Big(self[vecid]['Solution_real']['0-' + index1]).plus(Big(newnum).times(Big(ind2)))
    )
    self[newid].Format_showequation =
      'Interpolate \\left(' + self[vecid].Format_showequation + ', ' + self[numid].Format_showequation + '\\right)'
    SetModels('Interpolate', newid, vecid, numid)
    this.Solution_temps.push(newid)
    self[newid]['Format_size'] = '1x' + index2
    self[newid]['Units_units'] = self[vecid]['Units_units']
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['units'] = self[newid].Units_units
    self[pid].Solution_variable_array[pos] = newid
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  } else {
    var newid = ''
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//------------------------------------- TEST AN IF STATEMENT AND RETURN RESULTS -------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.IfElse = function (replacetext, pid, pos, callback) {
  var flag = 0,
    testflag = 1,
    eqobj = {}
  replacetext = replacetext.replace(/^IfElse\(/, '')
  replacetext = replacetext.replace(/\)$/, '')
  this.inputarray = InputArray(replacetext)
  if (this.inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'IfElse')
    flag = 1
  }
  if (this.inputarray[1] == '&lt;') {
    this.inputarray[1] = '<'
  }
  if (this.inputarray[1] == '&lt=;') {
    this.inputarray[1] = '<='
  }
  if (this.inputarray[1] == '&gt;') {
    this.inputarray[1] = '>'
  }
  if (this.inputarray[1] == '&gt=;') {
    this.inputarray[1] = '>='
  }
  if (this.inputarray.length > 5) {
    Set_Error(this.Original_id, 'IfElse1')
    flag = 1
  }
  if (this.inputarray.length < 4) {
    Set_Error(this.Original_id, 'IfElse2')
    flag = 1
  }
  if (
    this.inputarray[1] != '==' &&
    this.inputarray[1] != '!=' &&
    this.inputarray[1] != '>' &&
    this.inputarray[1] != '<' &&
    this.inputarray[1] != '>=' &&
    this.inputarray[1] != '<='
  ) {
    Set_Error(this.Original_id, 'IfElse3')
    flag = 1
  }
  if (flag === 0) {
    eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + this.inputarray[0]
    }
    this.id1 = CreateEq(this.fileid, 1, eqobj)
    eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + this.inputarray[2]
    }
    this.id2 = CreateEq(this.fileid, 1, eqobj)
    eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + this.inputarray[3]
    }
    this.id3 = CreateEq(this.fileid, 1, eqobj)
    if (this.inputarray[4] !== undefined) {
      eqobj = {
        Page_position: parseInt(DOM_Object[this.Format_id]['location']),
        Format_showtype: 'InnerFunction',
        Original_id: this.Original_id,
        equation: 'TempEq=' + this.inputarray[4]
      }
      this.id4 = CreateEq(this.fileid, 1, eqobj)
    }
    if (this.inputarray[1] == '==') {
      if (self[this.id1]['Format_size'] == self[this.id2]['Format_size']) {
        testflag = 1
        for (var index in self[this.id1]['Solution_real']) {
          if (self[this.id1]['Solution_real'][index] != self[this.id2]['Solution_real'][index]) {
            testflag = 0
            break
          }
        }
      } else {
        testflag = 0
      }
    } else if (this.inputarray[1] == '!=') {
      if (self[this.id1]['Format_size'] == self[this.id2]['Format_size']) {
        testflag = 0
      } else {
        for (var index in self[this.id1]['Solution_real']) {
          if (self[this.id1]['Solution_real'][index] == self[this.id2]['Solution_real'][index]) {
            testflag = 0
            break
          }
        }
      }
    } else if (this.inputarray[1] == '>') {
      testflag = 1
      for (var index in self[this.id1]['Solution_real']) {
        if (self[this.id1]['Solution_real'][index] <= self[this.id2]['Solution_real'][index]) {
          testflag = 0
          break
        }
      }
    } else if (this.inputarray[1] == '<') {
      testflag = 1
      for (var index in self[this.id1]['Solution_real']) {
        if (self[this.id1]['Solution_real'][index] >= self[this.id2]['Solution_real'][index]) {
          testflag = 0
          break
        }
      }
    } else if (this.inputarray[1] == '>=') {
      testflag = 1
      for (var index in self[this.id1]['Solution_real']) {
        if (self[this.id1]['Solution_real'][index] < self[this.id2]['Solution_real'][index]) {
          testflag = 0
          break
        }
      }
    } else if (this.inputarray[1] == '<=') {
      testflag = 1
      for (var index in self[this.id1]['Solution_real']) {
        if (self[this.id1]['Solution_real'][index] > self[this.id2]['Solution_real'][index]) {
          testflag = 0
          break
        }
      }
    }
    eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=0'
    }
    this.retid = CreateEq(this.fileid, 0, eqobj)
    if (testflag == 1) {
      self[this.retid]['Solution_real'] = self[this.id3]['Solution_real']
      self[this.retid]['Solution_imag'] = self[this.id3]['Solution_imag']
      self[this.retid]['Units_units'] = self[this.id3]['Units_units']
    } else if (this.inputarray[4] !== undefined) {
      self[this.retid]['Solution_real'] = self[this.id4]['Solution_real']
      self[this.retid]['Solution_imag'] = self[this.id4]['Solution_imag']
      self[this.retid]['Units_units'] = self[this.id4]['Units_units']
    } else {
      self[this.retid]['Solution_real']['0-0'] = 0
      self[this.retid]['Solution_imag']['0-0'] = 0
      self[this.retid]['Units_units'] = ''
    }
    if (this.inputarray[4] !== undefined) {
      self[this.retid].Format_showequation =
        '\\left( \\text{if} \\left( \\hspace{0.2em}' +
        self[this.id1].Format_showequation +
        '' +
        this.inputarray[1] +
        '' +
        self[this.id2].Format_showequation +
        '\\right) \\left(' +
        self[this.id3].Format_showequation +
        '\\right) \\text{else} \\left( ' +
        self[this.id4].Format_showequation +
        '\\right)\\hspace{0.2em}\\right)'
      SetModels('IfElse', this.retid, this.id1, this.id2, this.id3, this.id4)
    } else if (this.inputarray[3] !== undefined) {
      self[this.retid].Format_showequation =
        '\\left( \\text{if} \\left( \\hspace{0.2em}' +
        self[this.id1].Format_showequation +
        '' +
        this.inputarray[1] +
        '' +
        self[this.id2].Format_showequation +
        '\\right) \\left(' +
        self[this.id3].Format_showequation +
        '\\right) \\hspace{0.2em}\\right)'
      SetModels('IfElse', this.retid, this.id1, this.id2, this.id3)
    }
    DOM_Object[this.retid]['real'] = self[this.retid].Solution_real
    DOM_Object[this.retid]['size'] = self[this.retid].Format_size
    DOM_Object[this.retid]['imag'] = self[this.retid].Solution_imag
    DOM_Object[this.retid]['units'] = self[this.retid].Units_units
    self[pid].Solution_variable_array[pos] = this.retid
    self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
    self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  }
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//------------------------------------- DIVIDE A COMPLEX NUMBER -------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
function DivideComplex(obj, callback) {
  var numreal = obj['numreal']
  var numimag = obj['numimag']
  var denreal = obj['denreal']
  var denimag = obj['denimag']
  if (obj['numreal'] === '') {
    numreal = 0
  }
  if (obj['numimag'] === '') {
    numimag = 0
  }
  if (obj['denreal'] === '') {
    denreal = 0
  }
  if (obj['denimag'] === '') {
    denimag = 0
  }
  var a = Big(numreal)
  var b = Big(numimag)
  var c = Big(denreal)
  var d = Big(denimag)
  var nr = Big(a)
    .times(Big(c))
    .plus(Big(b).times(Big(d)))
  var ni = Big(b)
    .times(Big(c))
    .minus(Big(a).times(Big(d)))
  var den = Big(c)
    .times(Big(c))
    .plus(Big(d).times(Big(d)))

  if ((nr == 1 && den == 0) || (nr == 0 && den == 0)) {
    obj['real'] == 0
  } else {
    obj['real'] = parseFloat(Big(nr).div(Big(den)))
  }
  if ((ni == 1 && den == 0) || (ni == 0 && den == 0)) {
    obj['imag'] == 0
  } else {
    obj['imag'] = parseFloat(Big(ni).div(Big(den)))
  }
  if ((numreal === 0 && numimag === 0) || (denreal === 0 && denimag === 0)) {
    obj['real'] = 0
    obj['imag'] = 0
  }
  callback()
}
//---------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//----------------------------------------- DIVIDE COMPLEX NUMBERS --------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
/*
For division, the algorithm for complex numbers uses the complex conjugate :
(a+bi)/(c+di)=((a+bi)*(c-di))/((c+di)*(c-di)) and is then divided out.
*/
function DivComplex(r1, i1, r2, i2) {
  //	|
  if (r1 === undefined) {
    r1 = 0
  }
  if (i1 === undefined) {
    i1 = 0
  }
  if (r2 === undefined) {
    r2 = 0
  }
  if (i2 === undefined) {
    i2 = 0
  } //	|
  if (r1 === NaN) {
    r1 = 0
  }
  if (i1 === NaN) {
    i1 = 0
  }
  if (r2 === NaN) {
    r2 = 0
  }
  if (i2 === NaN) {
    i2 = 0
  } //	|
  var number = {} //	|
  if ((i1 === 0 && i2 === 0) || (i1 === 0 && isNaN(i2)) || (isNaN(i1) && i2 === 0) || (isNaN(i1) && isNaN(i2))) {
    //	|
    number.real = parseFloat(Big(r1).div(Big(r2))) //	|
    number.imag = 0 //	|
  } //	|
  else {
    var c = parseFloat(r2) //	|
    var d = -1 * parseFloat(i2) //	|
    var a1 = r1 //	|
    var b1 = i1 //	|
    var a2 = r2 //	|
    var b2 = i2 //	|
    var nr = parseFloat(
      Big(a1)
        .times(Big(c))
        .minus(Big(b1).times(Big(d)))
    ) //	|
    var ni = parseFloat(
      Big(a1)
        .times(Big(d))
        .plus(Big(b1).times(Big(c)))
    ) //	|
    var dr = parseFloat(
      Big(a2)
        .times(Big(c))
        .minus(Big(b2).times(Big(d)))
    ) //	|
    var di = parseFloat(
      Big(a2)
        .times(Big(d))
        .minus(Big(b2).times(Big(c)))
    ) //	|
    number.real = parseFloat(Big(nr).div(Big(dr))) //	|
    number.imag = parseFloat(Big(ni).div(Big(dr))) //	|
  } //	|
  return number //	|
} //	|
//-------------------------------------------------------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
//--------------------------------------- MULTIPLY COMPLEX NUMBERS --------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
function MultComplex(r1, i1, r2, i2) {
  if (r1 === undefined) {
    r1 = 0
  }
  if (i1 === undefined) {
    i1 = 0
  }
  if (r2 === undefined) {
    r2 = 0
  }
  if (i2 === undefined) {
    i2 = 0
  }
  if (r1 === NaN) {
    r1 = 0
  }
  if (i1 === NaN) {
    i1 = 0
  }
  if (r2 === NaN) {
    r2 = 0
  }
  if (i2 === NaN) {
    i2 = 0
  }
  var number = {}
  number.real = r1 * r2 - -1 * i1 * i2
  number.imag = ToNum(r1 * i2) + ToNum(i1 * r2)
  return number
}
//-------------------------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//------------------------------------ ROOT OF A COMPLEX NUMBER -------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
function SquareRoot(obj, callback) {
  if (obj['real'] === '') {
    var real = 0
  } else {
    var real = obj['real']
  }
  if (obj['imag'] === '') {
    var imag = 0
  } else {
    var imag = obj['imag']
  }
  var r = ToNum(Math.pow(Math.pow(real, 2) + Math.pow(imag, 2), 0.5))
  var theta = Math.atan2(imag, real)
  obj['real'] = ToNum(Math.pow(r, parseFloat(1 / 2)) * Math.cos(theta / 2))
  obj['imag'] = ToNum(Math.pow(r, parseFloat(1 / 2)) * Math.sin(theta / 2))
  if (real === 0 && imag === 0) {
    obj['real'] = 0
    obj['imag'] = 0
  }
  callback()
}
//---------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------//
//------------------------------------ SQUARING A COMPLEX NUMBER ------------------------------------------//
//---------------------------------------------------------------------------------------------------------//
function SquareComplex(obj, callback) {
  if (obj['real'] === '') {
    var real = 0
  } else {
    var real = obj['real']
  }
  if (obj['imag'] === '') {
    var imag = 0
  } else {
    var imag = obj['imag']
  }
  obj['real'] = parseFloat(
    Big(real)
      .times(Big(real))
      .minus(Big(imag).times(Big(imag)))
  )
  obj['imag'] = parseFloat(Big(real).times(Big(imag)).times(Big(2)))
  callback()
}
//---------------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------------------------------//
//----------------------------------------------- FIRST POSITIVES ---------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------------------------//
Equation.prototype.firstPos = function (replacetext, pid, pos, callback) {
  var flag = 0

  // Clean around the input text
  replacetext = replacetext.replace(/^firstPos\(/, '')
  replacetext = replacetext.replace(/^firstPos\(/, '')
  replacetext = replacetext.replace(/\)$/, '')

  // Parse out the input array into it components
  var inputarray = InputArray(replacetext)

  // Make sure that there is the proper number of inputs
  if (inputarray.length === 0) {
    Set_Error(this.Original_id, 'NoEntry', 'firstPos')
    flag = 1
  }
  if (inputarray.length > 2) {
    Set_Error(this.Original_id, 'firstPos')
    flag = 1
  }

  // Solve for the input array
  var eqobj = {
    Page_position: parseInt(DOM_Object[this.Format_id]['location']),
    Format_showtype: 'InnerFunction',
    Original_id: this.Original_id,
    equation: 'TempEq=' + inputarray[0]
  }
  var id1 = CreateEq(this.fileid, 1, eqobj)

  // Set an initial default for the second input
  var zeroIndex = 0

  // Solve for the dimension if entered
  if (inputarray.length == 2) {
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + inputarray[1]
    }
    var id2 = CreateEq(this.fileid, 1, eqobj)

    zeroIndex = self[id2].Solution_real['0-0']
  }

  // Get the dimensions of the input array
  var sizes1 = self[id1].Format_size.split('x')

  if (flag === 0) {
    var ind1 = 0
    var ind2 = 0
    var ansObj = {}
    var thisKey = ''

    // Create an empty equation to hold the solution
    var eqobj = {
      Page_position: parseInt(DOM_Object[this.Format_id]['location']),
      Format_showtype: 'InnerFunction',
      Original_id: this.Original_id,
      equation: 'TempEq=' + replacetext
    }
    var newid = CreateEq(this.fileid, 0, eqobj)

    // Loop through the array and find the first case where the number passes from negative to positive.
    if (sizes1[0] == 1 || sizes1[0] == '1' || zeroIndex == 0) {
      var prevValue = 0
      var prevKey = ''
      for (var thisInd1 = 0; thisInd1 < sizes1[0]; thisInd1++) {
        var thisFlag = 0
        for (var thisInd2 = 0; thisInd2 < sizes1[1]; thisInd2++) {
          if (thisFlag == 0) {
            thisKey = thisInd1 + '-' + thisInd2
            if (thisInd2 != 0) {
              prevKey = thisInd1 + '-' + parseInt(thisInd2 - 1)
              if (self[id1].Solution_real[prevKey] <= 0 && self[id1].Solution_real[thisKey] > 0) {
                self[newid].Solution_real[ind1 + '-' + ind2] = JSON.parse(JSON.stringify(thisInd2))
                ind2 = ind2 + 1
                if (sizes1[0] > 1 && sizes1[1] > 1) {
                  thisFlag = 1
                }
              }
            }
          }
        }
        if (sizes1[0] > 1 && sizes1[1] > 1 && thisFlag == 0) {
          self[newid].Solution_real[ind1 + '-' + ind2] = 0
          ind2 = ind2 + 1
        }
      }
    }

    // Loop through the array and find the first case where the number passes from negative to positive.
    if (sizes1[1] == 1 || sizes1[1] == '1' || zeroIndex == 1) {
      var prevValue = 0
      var prevKey = ''
      for (var thisInd2 = 0; thisInd2 < sizes1[1]; thisInd2++) {
        var thisFlag = 0
        for (var thisInd1 = 0; thisInd1 < sizes1[0]; thisInd1++) {
          thisKey = parseInt(thisInd1) + '-' + thisInd2
          if (thisInd1 != 0) {
            prevKey = parseInt(thisInd1 - 1) + '-' + thisInd2
            if (self[id1].Solution_real[prevKey] <= 0 && self[id1].Solution_real[thisKey] > 0) {
              thisFlag = 1
              self[newid].Solution_real[ind1 + '-' + ind2] = JSON.parse(JSON.stringify(thisInd1))
              ind2 = ind2 + 1
            }
          }
        }
        if (sizes1[0] > 1 && sizes1[1] > 1 && thisFlag == 0) {
          self[newid].Solution_real[ind1 + '-' + ind2] = 0
          ind2 = ind2 + 1
        }
      }
    }

    // If no crossing point was found, set the solution to zero
    if (ind2 == 0) {
      self[newid].Solution_real['0-0'] = 0
    }

    if (inputarray.length == 2) {
      self[newid].Format_showequation =
        'firstPos \\left(' + self[id1].Format_showequation + ', ' + self[id2].Format_showequation + '\\right)'
    } else {
      self[newid].Format_showequation = 'firstPos \\left(' + self[id1].Format_showequation + '\\right)'
    }

    // Pass the units to the solution equation
    self[newid].Units_base_array[index] = self[id1].Units_base_array[index]
    self[newid].Recompose_Units()

    // Push the solution numbers to the DOM Object
    this.Solution_temps.push(newid)
    DOM_Object[newid]['real'] = self[newid].Solution_real
    DOM_Object[newid]['imag']['0-0'] = 0
    DOM_Object[newid]['size'] = self[newid]['Format_size']
    DOM_Object[newid]['units'] = self[newid].Units_units
    SetModels('firstPos', newid, id1, id2)
    self[pid].Solution_variable_array[pos] = newid
  } else {
    var newid = ''
  }

  // Place the new equation into the solution array in placed of the function call
  self[pid].Solution_variable_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Solution_key_array.splice(parseInt(pos, 10) + 1, 1)
  self[pid].Remove_BuiltInEquations(parseInt(pos, 10) + 1, callback)
}
//-------------------------------------------------------------------------------------------------------------------------//

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------- FUNCTIONS TO HANDLE LOOPS AND STATEMENTS -----------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------ THE EQUATION PROMISE -----------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This function is a constructor that lets the user create a promise for an equation. In essence, the function lets the user ensure that the equation is solved 		\
	before moving on. This is used in conjunction with the "then" method.																								\
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function eqPromise(eqid) {
  return new Promise(function (fulfill, reject) {
    self[eqid].Solve_Equation(DOM_Object[eqid]['equation'], 0)
  })
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------ THE STRUCTURE PROMISE ----------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This function is a constructor that lets the user create a promise for a structure. In essence, the function lets the user ensure that the structure is solved 		\
	before moving on. This is used in conjunction with the "then" method.																								\
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function StrucPromise(structID, pos, flag) {
  return new Promise(function (fulfill, reject) {
    DoStructures(structID, pos, flag)
  })
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------ THE DO STRUCTURES FUNCTION -----------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This function is called for every for loop, while loop, or if statement. There are three inputs, the id, the position, and the flag. 								\
		id   - the id of the item being ran																																\
		pos  - the position within the perform loop																														\
		flag - sets whether the loop is being run for the first time. 																									\
	When the function starts, if the id in question is a loop, the flag is checked. If the flag is 1, then the prep functions are called with the DoStructures function \
	set as the callback with the flag set to 0. If the flag is zero, then the function solves whatever lies at the position of the perform loop given by the pos input. \
	If this is an equation, it is solved, if this is a loop, the DoStructures function is run for that loop.															\
	The perform array is created in the loop and statement prep functions and is an ordered array of the id of the item in question and its order within the 			\
	structure. The pos is incremented after each run and if it is greater than the perform array, then the counters are incremented. For a while loop, the conditions 	\
	are checked to see if it will run again. For a for loop, the counters are checked. Note that for if else statements, the prep functions must ensure that the 		\
	peform array contains only the block that is to be run. 																											\
	Case 1 - First run through - values are calculatted, function is recalled																							\
	Case 2 - Function run with counter at 0 - test is performed and if true, the first item is solved and the program is recalled										\
	Case 3 - Function is called with number higher than array count - recalculate conditions, recall with pos at 0														\
	Case 4 - Normal run - the code pulls the item in question, runs it, and then recalls the function with the next number												\
SolveWhileLoopParameters(loopid, firstrun, callback)
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function DoStructures(id, pos, flag, callback) {
  //console.log('In DoStructures with an ID of '+id+', the pos is '+pos+', the size of the perform array is '+DOM_Object[id].Loop_Perform.length+' the flag is '+flag+', the type is '+DOM_Object[id]['type']+', the truefalse is '+DOM_Object[id].Loop_truefalse+', and the counter is '+DOM_Object[id].Loop_countervalue);
  console.log(
    'In Do structures with id, pos, and flag of ' +
      id +
      ', ' +
      pos +
      ', ' +
      flag +
      ' and a type of ' +
      DOM_Object[id]['content']['type']
  )

  if (DOM_Object[id]['component_type_id'] == 7) {
    if (flag == 1 && self[id]['content']['whileLoop'].Loop_counterValue == 0) {
      PrepLoopEquations(id)
      Populate_Item(id)
      SolveWhileLoopParameters(id, 1)
      CheckWhileLoop(id)
      DoStructures(id, 0, 0)
    } else if (pos >= DOM_Object[id]['content']['whileLoop'].Loop_Perform.length) {
      console.log('pos>psize')
      self[id]['content']['whileLoop'].Loop_counterValue++
      DoStructures(id, 0, 1)
    } else if (flag == 1) {
      SolveWhileLoopParameters(id, 0, function () {
        CheckWhileLoop(id, function () {
          DoStructures(id, 0, 0)
        })
      })
    } else {
      console.log(
        'Solving ' +
          DOM_Object[id]['content']['whileLoop'].Loop_Perform[0] +
          ' with the true false and step limits set to ' +
          self[id]['content']['whileLoop'].Loop_truefalse +
          ' and ' +
          self[id]['content']['whileLoop'].Loop_stepLimit
      )
      if (
        self[id]['content']['whileLoop'].Loop_truefalse &&
        self[id]['content']['whileLoop'].Loop_countervalue < self[id]['content']['whileLoop'].Loop_stepLimit
      ) {
        var thisid = DOM_Object[id]['content']['whileLoop'].Loop_Perform[pos]
        pos = pos + 1
        if (DOM_Object[thisid]['type'] == 'equation' && DOM_Object[thisid]['active'] == 1) {
          console.log('Solving ' + DOM_Object[thisid]['equation'])
          eqPromise(thisid).then(DoStructures(id, pos, 0))
        } else if (DOM_Object[thisid]['type'] == 'forloop') {
          DoStructures(thisid, 0, 1, function () {
            DoStructures(id, pos, 0)
          })
        } else if (DOM_Object[thisid]['type'] == 'whileloop') {
          DoStructures(thisid, 0, 1, function () {
            DoStructures(id, pos, 0)
          })
        } else if (DOM_Object[thisid]['type'] == 'ifelse') {
          DoStructures(thisid, 0, 1, function () {
            DoStructures(id, pos, 0)
          })
        } else {
          DoStructures(id, pos, 0)
        }
      }
    }
  }
  if (DOM_Object[id]['component_type_id'] == 6) {
    if (flag == 1) {
      PrepLoopEquations(id)
      Populate_Item(id)
      var counterid = ''
      var newid = ''
      var eqobj = {
        Page_position: DOM_Object[id]['order'],
        Format_name: DOM_Object[id]['content']['forLoop']['counter'],
        equation: DOM_Object[id].counter + '=0'
      }
      var counterid = CreateEq(DOM_Object[id]['fileid'], 0, eqobj)
      DOM_Object[counterid] = {}
      DOM_Object[counterid]['real'] = {}
      DOM_Object[counterid]['imag'] = {}
      DOM_Object[counterid]['active'] = 1
      DOM_Object[counterid]['name'] = DOM_Object[id]['content']['forLoop']['counter']
      DOM_Object[counterid]['type'] = 'equation'
      DOM_Object[counterid]['ID'] = self[counterid]['Format_id']
      DOM_Object[counterid]['order'] = DOM_Object[id]['order']
      DOM_Object[counterid]['real']['0-0'] = DOM_Object[id].start
      DOM_Object[counterid]['imag']['0-0'] = 0
      DOM_Object[counterid]['size'] = '1x1'
      DOM_Object[id]['content']['forLoop'].valueid = counterid
      self[id]['content']['forLoop'].Loop_counterValue = 0
      console.log(
        'For the for loop ' +
          id +
          ', i just created the counter ' +
          DOM_Object[id]['content']['forLoop']['counter'] +
          ' at position ' +
          DOM_Object[id]['order']
      )
      switch (DOM_Object[id]['content']['forLoop'].limitFactor) {
        case '<':
          for (
            var a = DOM_Object[id]['content']['forLoop'].start;
            a < DOM_Object[id]['content']['forLoop'].stop;
            a = parseFloat(Big(a).plus(Big(DOM_Object[id]['content']['forLoop'].increment))) //\
          ) {
            console.log(
              'The id is ' +
                id +
                ', the counter is ' +
                a +
                ', the valueid is ' +
                DOM_Object[id]['content']['forLoop'].valueid +
                ' - ' +
                DOM_Object[DOM_Object[id]['content']['forLoop']['valueid']]['real']['0-0'] +
                ' and in DOM Object it is ' +
                Object.keys(DOM_Object[DOM_Object[id]['content']['forLoop'].valueid])
            )
            DOM_Object[DOM_Object[id]['content']['forLoop'].valueid]['real']['0-0'] = a
            self[id]['content']['forLoop'].Loop_counterValue++
            DoStructures(id, 0, 0)
          }
          break
        case '<=':
          for (
            var a = parseFloat(DOM_Object[id]['content']['forLoop'].start);
            a <= parseFloat(DOM_Object[id]['content']['forLoop'].stop);
            a = parseFloat(Big(a).plus(Big(DOM_Object[id]['content']['forLoop'].increment)))
          ) {
            DOM_Object[DOM_Object[id]['content']['forLoop'].valueid]['real']['0-0'] = a
            self[id]['content']['forLoop'].Loop_counterValue++
            DoStructures(id, 0, 0)
          }
          break
        case '>':
          for (
            var a = parseFloat(DOM_Object[id]['content']['forLoop'].start);
            a > parseFloat(DOM_Object[id]['content']['forLoop'].stop);
            a = parseFloat(Big(a).plus(Big(DOM_Object[id]['content']['forLoop'].increment)))
          ) {
            DOM_Object[DOM_Object[id]['content']['forLoop'].valueid]['real']['0-0'] = a
            self[id]['content']['forLoop'].Loop_counterValue++
            DoStructures(id, 0, 0)
          }
          break
        case '>=':
          for (
            var a = parseFloat(DOM_Object[id]['content']['forLoop'].start);
            a >= parseFloat(DOM_Object[id]['content']['forLoop'].stop);
            a = parseFloat(Big(a).plus(Big(DOM_Object[id]['content']['forLoop'].increment)))
          ) {
            DOM_Object[DOM_Object[id]['content']['forLoop'].valueid]['real']['0-0'] = a
            self[id]['content']['forLoop'].Loop_counterValue++
            DoStructures(id, 0, 0)
          }
          break
      }
      for (var i in DOM_Object) {
        if (DOM_Object[i]['Dependents'] !== undefined) {
          delete DOM_Object[i]['Dependents'][counterid]
        }
      }
      delete DOM_Object[counterid]
      delete DOM_Object[counterid]
      DOM_Object[id].status = '1'
    } else if (DOM_Object[id].Errors_flag != '1') {
      if (pos < DOM_Object[id]['content']['forLoop'].Loop_Perform.length) {
        var thisid = DOM_Object[id]['content']['forLoop'].Loop_Perform[pos]
        console.log(
          'The position is ' +
            pos +
            ' and the item is ' +
            thisid +
            ' and the type is ' +
            DOM_Object[thisid]['type'] +
            ' - ' +
            DOM_Object[thisid]['active']
        )
        pos = pos + 1
        if (DOM_Object[thisid]['type'] == 'equation' && DOM_Object[thisid]['active'] == 1) {
          self[thisid].Solve_Equation(DOM_Object[thisid]['equation'], 0, function () {
            DoStructures(id, pos, 0)
          })
        } else if (DOM_Object[thisid]['component_type_id'] == 6) {
          DoStructures(thisid, 0, 1, function () {
            DoStructures(id, pos, 0)
          })
        } else if (DOM_Object[thisid]['component_type_id'] == 7) {
          DoStructures(thisid, 0, 1, function () {
            DoStructures(id, pos, 0)
          })
        } else if (DOM_Object[thisid]['component_type_id'] == 8) {
          DoStructures(thisid, 0, 1, function () {
            DoStructures(id, pos, 0)
          })
        }
      }
    }
  }
  if (DOM_Object[id]['component_type_id'] == 8) {
    console.log('I am in the if else part of the do structures ')
    if (flag == 1) {
      SolveIfElseParameters(id, function () {
        PrepStatementEquations(id, function () {
          CheckStatement(id, function () {
            SetActive(id, function () {
              Populate_Item(id, function () {
                DoStructures(id, 0, 0)
              })
            })
          })
        })
      })
    } else {
      console.log('The length and pos are ' + DOM_Object[id]['content']['ifelse']['Loop_Perform'].length + ' - ' + pos)

      console.log('With the flag set to 0 in the if/else of do structures, the DOM_Object of the loop is ...')
      console.log(DOM_Object)
      console.log(DOM_Object[id])

      if (pos < DOM_Object[id]['content']['ifelse'].Loop_Perform.length) {
        var thisid = DOM_Object[id]['content']['ifelse'].Loop_Perform[pos]
        pos = pos + 1
        console.log(
          'I am looking at the equation ' +
            thisid +
            ' - ' +
            DOM_Object[thisid]['equation'] +
            ' and it is active - ' +
            DOM_Object[thisid]['active']
        )
        if (DOM_Object[thisid]['type'] == 'equation' && DOM_Object[thisid]['active'] == 1) {
          self[thisid].Solve_Equation(DOM_Object[thisid]['equation'], 0, function () {
            DoStructures(id, pos, 0)
          })
        } else if (DOM_Object[thisid]['type'] == 'forLoop') {
          DoStructures(thisid, 0, 1, function () {
            DoStructures(id, pos, 0)
          })
        } else if (DOM_Object[thisid]['type'] == 'whileLoop') {
          DoStructures(thisid, 0, 1, function () {
            DoStructures(id, pos, 0)
          })
        } else if (DOM_Object[thisid]['type'] == 'ifelse') {
          DoStructures(thisid, 0, 1, function () {
            DoStructures(id, pos, 0)
          })
        }
      }
      console.log('Pos is too big and I am done with the structure')
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*--------------------------------------------------------- CREATE A NEW FOR LOOP -------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function ForLoop(loopObj) {
  this.Name = ''
  this.fileid = loopObj['fileid']
  this.inputFile = ''
  this.inputID = ''
  this.itemid = loopObj['itemid']
  this.Format_id = loopObj['itemid']
  this.id = loopObj['itemid']
  this.location = 0
  this.Page_position = 0
  this.topparentid = 'none'
  this.parentid = 'none'
  this.Page_lastposition = 0
  this.component_type_id = 6
  this.content = {}
  this.content.forLoop = {}
  this.content.forLoop.counter = 'a'
  this.content.forLoop.Loop_counterValue = 0
  this.content.forLoop.valueid = ''
  this.content.forLoop.startText = '0'
  this.content.forLoop.start = 0
  this.content.forLoop.stopText = '1'
  this.content.forLoop.stop = 1
  this.content.forLoop.increment = 1
  this.content.forLoop.incrementText = '1'
  this.content.forLoop.numSteps = 1
  this.content.forLoop.status = 0
  this.content.forLoop.Format_haschanged = 1 // 	\
  this.content.forLoop.firstRun = 0
  this.content.forLoop.limitFactor = '<'
  this.content.forLoop.Errors_flag = 0
  this.content.forLoop.Errors_errors = new Array() // 	\
  this.content['type'] = 'forLoop'
  for (var item in loopObj) {
    this['content']['forLoop'][item] = loopObj['content']['forLoop'][item]
  }
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------- SOLVE FOR LOOP PARAMETERS ----------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This function looks at a for loop and solves the three parameters for that loop - the start number, the stop number, and the increment number.						\
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function SolveLoopParameters(loopid, callback) {
  var eqobj = {
    Page_position: DOM_Object[loopid]['order'],
    Page_parentid: DOM_Object[loopid]['content']['parentid'],
    Page_topparentid: DOM_Object[loopid]['content']['topparentid'],
    Format_showtype: 'InnerFunction',
    equation: 'myeq=' + self[loopid]['content']['forLoop'].startText
  }
  var id1 = CreateEq(self[loopid]['content'].fileid, 0, eqobj)
  var eqobj = {
    Page_position: DOM_Object[loopid]['order'],
    Page_parentid: DOM_Object[loopid]['content']['parentid'],
    Page_topparentid: DOM_Object[loopid]['content']['topparentid'],
    Format_showtype: 'InnerFunction',
    equation: 'myeq=' + self[loopid]['content']['forLoop'].stopText
  }
  var id2 = CreateEq(self[loopid]['content'].fileid, 0, eqobj)
  var eqobj = {
    Page_position: DOM_Object[loopid]['order'],
    Page_parentid: DOM_Object[loopid]['content']['parentid'],
    Page_topparentid: DOM_Object[loopid]['content']['topparentid'],
    Format_showtype: 'InnerFunction',
    equation: 'myeq=' + self[loopid]['content']['forLoop'].incrementText
  }
  var id3 = CreateEq(self[loopid]['content'].fileid, 0, eqobj)
  eqPromise(id1).then(eqPromise(id2).then(eqPromise(id3).then(SetLoopParameters(loopid, id1, id2, id3, callback))))
}
function SetLoopParameters(loopid, id1, id2, id3, callback) {
  // Set the parameter values from the equation results
  self[loopid]['content']['forLoop'].start = self[id1]['Solution_real']['0-0']
  self[loopid]['content']['forLoop'].stop = self[id2]['Solution_real']['0-0']
  self[loopid]['content']['forLoop'].increment = self[id3]['Solution_real']['0-0']

  // Calculate the number of steps to be taken
  if (self[loopid].limitFactor == '<=') {
    self[loopid]['content']['forLoop'].numSteps = parseInt(
      Math.floor(
        (self[loopid]['content']['forLoop'].stop - self[loopid]['content']['forLoop'].start) /
          self[loopid]['content']['forLoop'].increment
      ),
      10
    )
    if (
      self[loopid]['content']['forLoop'].stop < self[loopid]['content']['forLoop'].start ||
      self[loopid]['content']['forLoop'].increment < 0
    ) {
      self[loopid]['content']['forLoop'].numSteps = 0
    }
  }
  if (self[loopid]['content']['forLoop'].limitFactor == '<') {
    self[loopid]['content']['forLoop'].numSteps = parseInt(
      Math.floor(
        (self[loopid]['content']['forLoop'].stop -
          (self[loopid]['content']['forLoop'].start - self[loopid]['content']['forLoop'].increment / 2)) /
          self[loopid]['content']['forLoop'].increment
      ),
      10
    )
    if (
      self[loopid]['content']['forLoop'].stop < self[loopid]['content']['forLoop'].start ||
      self[loopid]['content']['forLoop'].increment < 0
    ) {
      self[loopid]['content']['forLoop'].numSteps = 0
    }
  }
  if (self[loopid]['content']['forLoop'].limitFactor == '>=') {
    self[loopid]['content']['forLoop'].numSteps = parseInt(
      Math.floor(self[loopid]['content']['forLoop'].start - self[loopid]['content']['forLoop'].stop) /
        (-1 * self[loopid]['content']['forLoop'].increment),
      10
    )
    if (
      self[loopid]['content']['forLoop'].start < self[loopid]['content']['forLoop'].stop ||
      self[loopid]['content']['forLoop'].increment > 0
    ) {
      self[loopid]['content']['forLoop'].numSteps = 0
    }
  }
  if (self[loopid]['content']['forLoop'].limitFactor == '>') {
    self[loopid]['content']['forLoop'].numSteps = parseInt(
      Math.floor(
        (self[loopid]['content']['forLoop'].start -
          (self[loopid]['content']['forLoop'].stop - self[loopid]['content']['forLoop'].increment / 2)) /
          (-1 * self[loopid]['content']['forLoop'].increment)
      ),
      10
    )
    if (
      self[loopid]['content']['forLoop'].start < self[loopid]['content']['forLoop'].stop ||
      self[loopid]['content']['forLoop'].increment > 0
    ) {
      self[loopid]['content']['forLoop'].numSteps = 0
    }
  }
  if (self[loopid]['content']['forLoop'].numSteps < 0) {
    self[loopid]['content']['forLoop'].numSteps = 0
  }
  if (self[loopid]['content']['forLoop'].numSteps === 0) {
    Set_Error(loopid, 'ForLoop1')
  }
  self[loopid]['Dependents'] = {}
  DOM_Object[loopid]['Dependents'] = {}
  console.log(
    'The start, stop, increment, and numSteps are ' +
      self[loopid]['content']['forLoop'].start +
      '-' +
      self[loopid]['content']['forLoop'].stop +
      '-' +
      self[loopid]['content']['forLoop'].increment +
      '-' +
      self[loopid]['content']['forLoop'].numSteps
  )
  for (var a in DOM_Object[id1]['Dependents']) {
    self[loopid]['Dependents'][a] = 1
    DOM_Object[loopid]['Dependents'][a] = 1
  }
  for (var a in DOM_Object[id2]['Dependents']) {
    self[loopid]['Dependents'][a] = 1
    DOM_Object[loopid]['Dependents'][a] = 1
  }
  for (var a in DOM_Object[id3]['Dependents']) {
    self[loopid]['Dependents'][a] = 1
    DOM_Object[loopid]['Dependents'][a] = 1
  }
  if (typeof callback == 'function') {
    callback()
  }
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------- RETURN FOR LOOP PARAMETERS ---------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function PassForLoopParameters(ID) {
  postMessage({ messageType: 'LoopParametersResult', ID: ID, loopObject: self[ID] })
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------- PREP LOOP EQUATIONS ----------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This is the first function called when a loop is updated and solved. It sets all the equation solutions back to zero. It then looks to see if a previous version 	\
	of the matrix exists. If it does, then the current matrix is set to retaining the values of the previous loop update. 												\
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function PrepLoopEquations(loopid, callback) {
  var type = DOM_Object[loopid]['content']['type']
  console.log(
    'In Prep Loop Equations for ' +
      type +
      '-' +
      loopid +
      ' with a first run of ' +
      DOM_Object[loopid]['content'][type]['firstRun']
  )
  if (DOM_Object[loopid]['content'][type]['firstRun'] == 1) {
    self[loopid]['content'][type].Loop_countervalue = 0
    if (self[loopid] === undefined) {
      self[loopid] = {}
      for (var objProp in DOM_Object[loopid]) {
        self[loopid][objProp] = DOM_Object[loopid][objProp]
      }
    }
    for (var objid in DOM_Object) {
      if (DOM_Object[objid]['component_type_id'] == '7') {
        self[objid]['content']['whileLoop']['firstRun'] = 0
      }
      if (DOM_Object[objid]['component_type_id'] == '6') {
        self[objid]['content']['forLoop']['firstRun'] = 0
      }
      if (DOM_Object[objid]['component_type_id'] == '3') {
        DOM_Object[objid]['real'] = {}
        DOM_Object[objid]['imag'] = {}
        DOM_Object[objid].tempsolr = {}
        DOM_Object[objid].tempsoli = {}
        self[objid] = new Equation(objid)
        self[objid].Populate_Equation(DOM_Object[objid]['newEquation'])
        DOM_Object[objid]['name'] = self[objid]['Format_name']
        var thiseq = MatchClosestEquation(DOM_Object[objid]['name'], DOM_Object[loopid]['order'], objid, 0, 0)
        if (typeof DOM_Object[thiseq] == 'object') {
          DOM_Object[objid]['real'] = JSON.parse(JSON.stringify(DOM_Object[thiseq]['real']))
          DOM_Object[objid]['imag'] = JSON.parse(JSON.stringify(DOM_Object[thiseq]['imag']))
          DOM_Object[objid]['numinds'] = JSON.parse(JSON.stringify(DOM_Object[thiseq]['numinds']))
          DOM_Object[objid]['tempsolr'] = JSON.parse(JSON.stringify(DOM_Object[thiseq]['real']))
          DOM_Object[objid]['tempsoli'] = JSON.parse(JSON.stringify(DOM_Object[thiseq]['imag']))
          DOM_Object[objid]['size'] = JSON.parse(JSON.stringify(DOM_Object[thiseq]['size']))
          DOM_Object[objid]['units'] = JSON.parse(JSON.stringify(DOM_Object[thiseq]['units']))
          DOM_Object[objid]['basearray'] = JSON.parse(JSON.stringify(DOM_Object[thiseq]['basearray']))
          DOM_Object[objid]['equation'] = JSON.parse(JSON.stringify(DOM_Object[thiseq]['newEquation']))
          DOM_Object[objid]['fileid'] = JSON.parse(JSON.stringify(DOM_Object[thiseq]['fileid']))
          console.log('In the prep loop equations, the real matrix has been set to ...')
          console.log(DOM_Object[objid]['real'])
          console.log(self[thiseq])
        }
      }
    }
  }
  self[loopid]['content'][type]['firstRun'] = 0
  DOM_Object[loopid]['content'][type].firstRun = 0
  if (DOM_Object[loopid]['content'][type].limitfactor == '&lt;') {
    DOM_Object[loopid]['content'][type].limitfactor = '<'
  }
  if (DOM_Object[loopid]['content'][type].limitfactor == '&gt;') {
    DOM_Object[loopid]['content'][type].limitfactor = '>'
  }
  if (DOM_Object[loopid]['content'][type].limitfactor == '&lt=;') {
    DOM_Object[loopid]['content'][type].limitfactor = '<='
  }
  if (DOM_Object[loopid]['content'][type].limitfactor == '&gt=;') {
    DOM_Object[loopid]['content'][type].limitfactor = '>='
  }
  if (typeof callback == 'function') {
    callback()
  }
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------- PREP STATEMENT EQUATIONS ---------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This is the first function called when a loop is updated and solved. It sets all the equation solutions back to zero. It then looks to see if a previous version 	\
	of the matrix exists. If it does, then the current matrix is set to retaining the values of the previous loop update. 												\
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function PrepStatementEquations(loopid, callback) {
  console.log('In Prep Statement Equations')
  for (var stind in DOM_Object[loopid]['content']['ifelse']['Statement_Order']) {
    var stID = DOM_Object[loopid]['content']['ifelse']['Statement_Order'][stind]
    for (var eqID in DOM_Object[stID]['children']) {
      if (DOM_Object[eqID]['type'] == 'equation') {
        var eqobj = {
          Page_position: DOM_Object[eqID]['order'],
          Page_parentid: DOM_Object[eqID]['parentid'],
          Page_topparentid: DOM_Object[eqID]['topparentid'],
          equation: DOM_Object[eqID]['equation'],
          id: eqID
        }
        var newid = CreateEq(this.fileid, 0, eqobj)
      }
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------- POPULATE THE ARRAY OF ITEMS TO BE PERFORMED IN THE STRUCTURES --------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This function populates an array for each loop or if else statement. The array holds the equations, loops and statements embedded within the structure. During		\
	the DoStructures algorithm, it is this array that the code steps through, executing each item in order. To create this array, this algorithm appends each item		\
	in the loop or structure's children object to the array and appends the position of that item to a mirrored array. Once all the items have been added, a simple		\
	bubble sort algorithm is used to ensure that they are in order.																										\
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function Populate_Item(loopid, callback) {
  console.log('In Populate Items')

  console.log('At the beginning of Populate_Item, the DOM_Object of the loop is ...')
  console.log(DOM_Object[loopid])

  var itemID = '',
    a = 0,
    swapped = false,
    temp = '',
    stID = '',
    stind = '',
    type = ''
  type = DOM_Object[loopid]['content']['type']
  console.log('The loop id is ' + loopid + ' and the type is ' + type)
  if (DOM_Object[loopid]['content'][type] !== undefined) {
    DOM_Object[loopid]['content'][type]['Loop_Perform'] = new Array()
    DOM_Object[loopid]['content'][type]['Loop_Pos'] = new Array()
    for (itemID in DOM_Object) {
      if (
        DOM_Object[itemID]['component_type_id'] == 6 ||
        DOM_Object[itemID]['component_type_id'] == 7 ||
        DOM_Object[itemID]['component_type_id'] == 8
      ) {
        if (DOM_Object[itemID]['content']['parentid'] == loopid) {
          DOM_Object[loopid]['content'][type].Loop_Perform.push(itemID)
          DOM_Object[loopid]['content'][type].Loop_Pos.push(DOM_Object[itemID]['order'])
        }
      } else {
        if (DOM_Object[itemID]['parentid'] == loopid) {
          DOM_Object[loopid]['content'][type].Loop_Perform.push(itemID)
          DOM_Object[loopid]['content'][type].Loop_Pos.push(DOM_Object[itemID]['order'])
        }
      }
    }
    do {
      swapped = false
      for (var i = 0; i < DOM_Object[loopid]['content'][type].Loop_Pos.length - 1; i++) {
        if (DOM_Object[itemID]['content'] !== undefined) {
          if (DOM_Object[loopid]['content'][type].Loop_Pos[i] > DOM_Object[loopid]['content'][type].Loop_Pos[i + 1]) {
            temp = DOM_Object[loopid]['content'][type].Loop_Pos[i]
            DOM_Object[loopid]['content'][type].Loop_Pos[i] = DOM_Object[loopid]['content'][type].Loop_Pos[i + 1]
            DOM_Object[loopid]['content'][type].Loop_Pos[i + 1] = temp
            temp = DOM_Object[loopid]['content'][type].Loop_Perform[i]
            DOM_Object[loopid]['content'][type].Loop_Perform[i] =
              DOM_Object[loopid]['content'][type].Loop_Perform[i + 1]
            DOM_Object[loopid]['content'][type].Loop_Perform[i + 1] = temp
            swapped = true
          }
        }
      }
    } while (swapped)

    console.log('At the end of Populate_Item, the DOM_Object is ...')
    console.log(DOM_Object)
  }
  if (typeof callback == 'function') {
    callback()
  }
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------ PREP PLOT DATA TO BE RETURNED --------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This function called when a user has entered data for a plot and the entered equation has been solved. This function takes that solution and then formats the 		\
	data to be passed back to the main function in the proper format.																									\
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function PrepPlotData(eqID, plotObj, PlotID, DataID, className, callback) {
  console.log(
    'In Prep Plot Data Function with plot ID of ' +
      PlotID +
      ', a data ID of ' +
      DataID +
      ', andd a className ' +
      className
  )
  var Data = '',
    oldlength = 0,
    dataIndex = 0
  for (var thisData = 0; thisData < plotObject['Chart_dataobj'].length; thisData++) {
    if (plotObject['Chart_dataobj'][thisData]['Format_id'] == DataID) {
      Data = plotObj['Chart_dataobj'][thisData]
      dataIndex = thisData
    }
  }
  DOM_Object[PlotID]['Dependents'][DataID] = {}
  for (var dep in DOM_Object[eqID]['Dependents']) {
    DOM_Object[PlotID]['Dependents'][DataID][dep] = {}
    DOM_Object[PlotID]['Dependents'][DataID][dep]['axis'] = className
    DOM_Object[PlotID]['Dependents'][DataID][dep]['active'] = 1
  }

  if (!parseInt(plotObj.Errors_flag)) {
    console.log('The format type is ' + Data.Format_type)

    // if ((Data.Format_type=="bar")||(Data.Format_type=="column"))
    // {	plotObj['Chart_dataobj'][dataIndex]['PointData']={};
    // 	for (var index=0; index<Object.keys(DOM_Object[eqID].real).length; index++)
    // 	{	plotObj['Chart_dataobj'][dataIndex]['PointData'][index]={y:DOM_Object[eqID].real['0-'+index]};		}
    // }else if (Data.Format_type=="heatmap")

    if (Data.Format_type == 'heatmap') {
      var count = 0
      for (index in DOM_Object[eqID].real) {
        var key = index.split('-')
        if (plotObj['Chart_dataobj'][dataIndex]['PointData'][count] === undefined) {
          plotObj['Chart_dataobj'][dataIndex]['PointData'][count] = {}
        }
        plotObj['Chart_dataobj'][dataIndex]['PointData'][count]['x'] = parseInt(key[0], 10)
        plotObj['Chart_dataobj'][dataIndex]['PointData'][count]['y'] = parseInt(key[1], 10)
        plotObj['Chart_dataobj'][dataIndex]['PointData'][count]['value'] = DOM_Object[eqID].real[index]
        count++
      }
    } else {
      console.log(
        'The x and y data names are ' +
          plotObj['Chart_dataobj'][dataIndex]['xdata_name'] +
          ' - ' +
          plotObj['Chart_dataobj'][dataIndex]['ydata_name']
      )
      console.log('The className is ' + className)

      if (className == 'plot_xdatainput') {
        for (var index = 0; index < Object.keys(DOM_Object[eqID].real).length; index++) {
          if (plotObj['Chart_dataobj'][dataIndex]['PointData'][index] === undefined) {
            plotObj['Chart_dataobj'][dataIndex]['PointData'][index] = {}
          }
          plotObj['Chart_dataobj'][dataIndex]['PointData'][index]['x'] = DOM_Object[eqID]['real']['0-' + index]
          if (
            plotObj['Chart_dataobj'][dataIndex]['PointData'][index]['y'] === undefined ||
            plotObj['Chart_dataobj'][dataIndex]['ydata_name'] == ''
          ) {
            plotObj['Chart_dataobj'][dataIndex]['PointData'][index]['y'] = index
          }
        }
      }
      if (className == 'plot_ydatainput') {
        oldlength = Object.keys(plotObj['Chart_dataobj'][dataIndex]['PointData']).length

        for (var index = 0; index < Object.keys(DOM_Object[eqID].real).length; index++) {
          if (plotObj['Chart_dataobj'][dataIndex]['PointData'][index] === undefined) {
            plotObj['Chart_dataobj'][dataIndex]['PointData'][index] = {}
          }
          plotObj['Chart_dataobj'][dataIndex]['PointData'][index]['y'] = DOM_Object[eqID]['real']['0-' + index]
          if (
            plotObj['Chart_dataobj'][dataIndex]['PointData'][index]['x'] === undefined ||
            plotObj['Chart_dataobj'][dataIndex]['xdata_name'] == ''
          ) {
            plotObj['Chart_dataobj'][dataIndex]['PointData'][index]['x'] = index
          }
        }
        for (var index2 = index; index2 <= oldlength; index2++) {
          delete plotObj['Chart_dataobj'][dataIndex]['PointData'][index2]
        }
      }
      if (className == 'plot_zdatainput') {
        for (var index = 0; index < Object.keys(DOM_Object[eqID].real).length; index++) {
          if (plotObj['Chart_dataobj'][dataIndex]['PointData'][index] === undefined) {
            plotObj['Chart_dataobj'][dataIndex]['PointData'][index] = {}
          }
          plotObj['Chart_dataobj'][dataIndex]['PointData'][index]['z'] = DOM_Object[eqID]['real']['0-' + index]
        }
      }
      if (className == 'plot_cdatainput') {
        for (var index = 0; index < Object.keys(DOM_Object[eqID].real).length; index++) {
          if (plotObj['Chart_dataobj'][dataIndex]['PointData'][index] === undefined) {
            plotObj['Chart_dataobj'][dataIndex]['PointData'][index] = {}
          }
          plotObj['Chart_dataobj'][dataIndex]['PointData'][index]['c'] = DOM_Object[eqID]['real']['0-' + index]
        }
      }
      if (className == 'Lathe') {
        plotObj['Chart_dataobj'][dataIndex]['curve'] = DOM_Object[eqID]['real']
      }
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------//

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------- PASS THE PLOT OBJECT BACK TO THE MAIN PROGRAM WITH THE NEW DATA ---------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This function is passed the data that resulted from solving the input to an equation. It sends that data to the main program.										\
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function PassPlotData(plotObj, PlotID, DataID, className) {
  console.log('In Pass Plot Data Function')
  console.log('Return the data with the contents plotID - ' + PlotID + ', dataID - ' + DataID)
  postMessage({
    messageType: 'PlotDataResults',
    plotID: PlotID,
    DataID: DataID,
    eventErrorFlag: eventErrorFlag,
    eventError: eventError,
    className: className,
    Dependents: DOM_Object[PlotID]['Dependents'],
    plotObj: plotObj
  })
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------- PASS THE RESULTS OF FORMATTING THE SOLUTION BACK TO THE MAIN PROGRAM  ------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This function is passed the data that resulted from formatting the solution. It sends that data to the main program.												\
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function passSolutionResults(eqID) {
  postMessage({
    messageType: 'SolutionResults',
    eqID: eqID,
    eqObj: self[eqID]
  })
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------- THE WHILE LOOP OBJECT ---------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function WhileLoop(loopObj) {
  this.Name = ''
  this.fileid = loopObj['fileid']
  this.itemid = loopObj['itemid']
  this.Format_id = loopObj['itemid']
  this.id = loopObj['itemid']
  this.location = loopObj['order']
  this.component_type_id = 7
  this.Page_lastposition = 0
  this.topparentid = 'none'
  this.parentid = 'none'
  this.content = {}
  this.content.whileLoop = {}
  this.content['whileLoop'].Page_position = 0
  this.content['whileLoop'].Loop_status = ''
  this.content['whileLoop'].Loop_numSteps = '' // 	\
  this.content['whileLoop'].Loop_stepLimit = 100 // 	\
  this.content['whileLoop'].Loop_countervalue = 0
  this.content['whileLoop'].firstRun = '1'
  this.content['whileLoop'].Loop_String = ''
  this.content['whileLoop'].Loop_TFString = ''
  this.content['whileLoop'].Loop_ValuesString = ''
  this.content['whileLoop'].Loop_Perform = new Array()
  this.content['whileLoop'].Errors_flag = 0
  this.content['whileLoop'].Errors_errors = new Array()
  this.content['whileLoop'].Dependents = {}
  this.content['whileLoop'].Loop_Values = {}
  this.content['whileLoop'].statementBlock = {}
  this.content['type'] = 'whileLoop'
  this.content.whileLoop.Errors_flag = 0
  this.content.whileLoop.Errors_errors = new Array() // 	\
  for (var item in loopObj) {
    this['content']['whileLoop'][item] = loopObj['content']['whileLoop'][item]
  }
  // Example : While flag!=1 would be recorded as while flag condition dependent
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*--------------------------------------------- SOLVE THE VALUES FOR THE BLOCKS WITHIN A WHILE LOOP -------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This function is passed an id for a while loop. It then looks at the object that holds the text for the == or != conditions and solves each of those equations.		\
	This happens each time that one of those parameters is changed on the DOM when this function is called from the main program. It also happens each time through 	\
	the loop so that the algorithm can check to see the state of the conditions to check whether the loop should continue or not.										\
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function SolveWhileLoopParameters(loopid, firstrun, callback) {
  console.log('In Solve Loop Parameters')
  DOM_Object[loopid]['content']['whileLoop']['Dependents'] = {}
  if (firstrun == 1) {
    var looppos = DOM_Object[loopid]['order']
  } else {
    var looppos = parseInt(DOM_Object[loopid]['content']['Page_lastposition'], 10) + 1
  }
  for (var a = 0; a < self[loopid]['content']['whileLoop']['statementBlock'].length; a++) {
    for (var b = 0; b < self[loopid]['content']['whileLoop']['statementBlock'][a].length; b++) {
      if (self[loopid]['content']['whileLoop']['statementBlock'][a][b]['flagText'] !== undefined) {
        if (self[loopid]['content']['whileLoop']['statementBlock'][a][b]['flagText'].match(/^\d+$/)) {
          self[loopid]['content']['whileLoop']['statementBlock'][a][b]['flagValue'] = parseInt(
            self[loopid]['content']['whileLoop']['statementBlock'][a][b]['flagText'],
            10
          )
        } else {
          if (firstrun == 1) {
            console.log('The position is ' + looppos + ' and the loopid is ' + loopid)
            var eqobj = {
              Page_position: looppos,
              Format_showtype: 'InnerFunction',
              equation: 'FlagEq=' + self[loopid]['content']['whileLoop']['statementBlock'][a][b]['flagText'],
              Page_parentid: loopid,
              Page_topparentid: loopid
            }
          } else {
            var eqobj = {
              Page_position: DOM_Object[loopid]['Page_lastposition'],
              Format_showtype: 'InnerFunction',
              equation: 'FlagEq=' + self[loopid]['content']['whileLoop']['statementBlock'][a][b]['flagText'],
              Page_parentid: loopid,
              Page_topparentid: loopid
            }
          }
          var id = CreateEq(self[loopid]['fileid'], 1, eqobj)
          for (var k in DOM_Object[id]['Dependents']) {
            DOM_Object[loopid]['content']['whileLoop']['Dependents'][k] = 1
            if (self[loopid] !== undefined) {
              if (self[loopid]['content']['whileLoop']['Dependents'] === undefined) {
                self[loopid]['content']['whileLoop']['Dependents'] = {}
              }
              self[loopid]['content']['whileLoop']['Dependents'][k] = 1
            }
          }
          self[loopid]['content']['whileLoop']['statementBlock'][a][b]['flagValue'] = self[id].Solution_real['0-0']
          delete self[id]
          delete DOM_Object[id]
        }
        if (self[loopid]['content']['whileLoop']['statementBlock'][a][b]['dependentText'].match(/^\d+$/)) {
          self[loopid]['content']['whileLoop']['statementBlock'][a][b]['dependentValue'] = parseInt(
            self[loopid]['content']['whileLoop']['statementBlock'][a][b]['dependentText'],
            10
          )
        } else {
          if (firstrun == 1) {
            var eqobj = {
              Page_position: looppos,
              Original_id: loopid,
              Format_showtype: 'InnerFunction',
              equation: 'DepEq=' + self[loopid]['content']['whileLoop']['statementBlock'][a][b]['dependentText']
            }
          } else {
            var eqobj = {
              Page_position: looppos,
              equation: 'DepEq=' + self[loopid]['content']['whileLoop']['statementBlock'][a][b]['dependentText']
            }
          }
          var id = CreateEq(self[loopid]['fileid'], 1, eqobj)
          for (var k in DOM_Object[id]['content']['whileLoop']['Dependents']) {
            DOM_Object[loopid]['content']['whileLoop']['Dependents'][k] = 1
            if (self[loopid] !== undefined) {
              if (self[loopid]['content']['whileLoop']['Dependents'] === undefined) {
                self[loopid]['content']['whileLoop']['Dependents'] = {}
              }
              self[loopid]['content']['whileLoop']['Dependents'][k] = 1
            }
          }
          self[loopid]['content']['whileLoop']['statementBlock'][a][b]['dependentValue'] = self[id].Solution_real['0-0']
          delete self[id]
          delete DOM_Object[id]
        }
      }
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*----------------------------------------------- CHECK WHILE LOOP FOR TRUE / FALSE AND FOR ERRORS OR PROBLEMS --------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This function is called whenever the user changes something about the loop. If checks for any errors that may occur during the running of the loop and sets the 	|
	error flag if there is a problem.																																	|
	In the first step, each statement is tested depending on the values entered. If it meets those conditions, the truefalse item for the object is set to true.		|
	In the next section, the statement is recreated with the individual statements replaced with the resulting true or false. 											|
	If (((flag==1)||(flag==2))||((flag==3)&&(flag!=5))) then becomes ... (((true)||(false))||(false)&&(false)). This is then solved and the result placed in the 		|
	true false property for the IfElse Statement.                                                                                                                       |
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function CheckWhileLoop(loopid, callback) {
  var dependent = '',
    condition = '',
    flag = '',
    statementstring = '',
    tfstring = '',
    valuestring = '',
    temp1 = '',
    temp2 = '',
    temp3 = ''
  console.log('In Check While Loop')
  for (var a = 0; a < self[loopid]['content']['whileLoop']['statementBlock'].length; a++) {
    for (var b = 0; b < self[loopid]['content']['whileLoop']['statementBlock'][a].length; b++) {
      flag = self[loopid]['content']['whileLoop']['statementBlock'][a][b]['flagValue']
      dependent = self[loopid]['content']['whileLoop']['statementBlock'][a][b]['dependentValue']
      condition = self[loopid]['content']['whileLoop']['statementBlock'][a][b]['conditionText']
      if (condition == '==' && flag == dependent) {
        self[loopid]['content']['whileLoop']['statementBlock'][a][b]['truefalse'] = true
      } else if (condition == '==') {
        self[loopid]['content']['whileLoop']['statementBlock'][a][b]['truefalse'] = false
      }
      if (condition == '!=' && flag != dependent) {
        self[loopid]['content']['whileLoop']['statementBlock'][a][b]['truefalse'] = true
      } else if (condition == '!=') {
        self[loopid]['content']['whileLoop']['statementBlock'][a][b]['truefalse'] = false
      }
      if (condition == '>' && flag > dependent) {
        self[loopid]['content']['whileLoop']['statementBlock'][a][b]['truefalse'] = true
      } else if (condition == '>') {
        self[loopid]['content']['whileLoop']['statementBlock'][a][b]['truefalse'] = false
      }
      if (condition == '>=' && flag >= dependent) {
        self[loopid]['content']['whileLoop']['statementBlock'][a][b]['truefalse'] = true
      } else if (condition == '>=') {
        self[loopid]['content']['whileLoop']['statementBlock'][a][b]['truefalse'] = false
      }
      if (condition == '<' && flag < dependent) {
        self[loopid]['content']['whileLoop']['statementBlock'][a][b]['truefalse'] = true
      } else if (condition == '<') {
        self[loopid]['content']['whileLoop']['statementBlock'][a][b]['truefalse'] = false
      }
      if (condition == '<=' && flag <= dependent) {
        self[loopid]['content']['whileLoop']['statementBlock'][a][b]['truefalse'] = true
      } else if (condition == '<=') {
        self[loopid]['content']['whileLoop']['statementBlock'][a][b]['truefalse'] = false
      }
    }
  }

  for (var a = 0; a < self[loopid]['content']['whileLoop']['statementBlock'].length; a++) {
    if (a !== 0) {
      statementstring = statementstring + self[loopid]['content']['whileLoop']['statementBlock'][a][0]['blockOption']
    }
    if (a !== 0) {
      tfstring = tfstring + self[loopid]['content']['whileLoop']['statementBlock'][a][0]['blockOption']
    }
    if (a !== 0) {
      valuestring = valuestring + self[loopid]['content']['whileLoop']['statementBlock'][a][0]['blockOption']
    }
    statementstring = statementstring + '('
    tfstring = tfstring + '('
    valuestring = valuestring + '('
    for (var b = 0; b < self[loopid]['content']['whileLoop']['statementBlock'][a].length; b++) {
      if (b !== 0) {
        statementstring = statementstring + self[loopid]['content']['whileLoop']['statementBlock'][a][b]['blockOption']
      }
      if (b !== 0) {
        tfstring = tfstring + self[loopid]['content']['whileLoop']['statementBlock'][a][b]['blockOption']
      }
      if (b !== 0) {
        valuestring = valuestring + self[loopid]['content']['whileLoop']['statementBlock'][a][b]['blockOption']
      }
      statementstring = statementstring + '('
      tfstring = tfstring + '('
      valuestring = valuestring + '('
      temp1 = self[loopid]['content']['whileLoop']['statementBlock'][a][b]['truefalse']
      tfstring = tfstring + '' + temp1 + ''
      temp1 = self[loopid]['content']['whileLoop']['statementBlock'][a][b]['flagText']
      temp2 = self[loopid]['content']['whileLoop']['statementBlock'][a][b]['conditionText']
      temp3 = self[loopid]['content']['whileLoop']['statementBlock'][a][b]['dependentText']
      statementstring = statementstring + '' + temp1 + '' + temp2 + '' + temp3 + ''
      temp1 = self[loopid]['content']['whileLoop']['statementBlock'][a][b]['flagValue']
      temp2 = self[loopid]['content']['whileLoop']['statementBlock'][a][b]['conditionText']
      temp3 = self[loopid]['content']['whileLoop']['statementBlock'][a][b]['dependentValue']
      valuestring = valuestring + '' + temp1 + '' + temp2 + '' + temp3 + ''
      statementstring = statementstring + ')'
      tfstring = tfstring + ')'
      valuestring = valuestring + ')'
    }
    statementstring = statementstring + ')'
    tfstring = tfstring + ')'
    valuestring = valuestring + ')'
  }
  self[loopid]['content']['whileLoop']['Loop_String'] = statementstring
  self[loopid]['content']['whileLoop']['Loop_TFString'] = tfstring
  self[loopid]['content']['whileLoop']['Loop_ValueString'] = valuestring
  console.log('At the end of check loop')
  console.log('The statement string is ' + self[loopid]['content']['whileLoop']['Loop_String'])
  console.log('The truefalse string is ' + self[loopid]['content']['whileLoop']['Loop_TFString'])
  console.log('The value string is ' + self[loopid]['content']['whileLoop']['Loop_ValueString'])
  self[loopid]['content']['whileLoop']['Loop_truefalse'] = eval(tfstring.replace(/<div[^>]*>|<\/div>/g, ''))
  if (typeof callback == 'function') {
    callback()
  }
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*--------------------------------------------- PASS THE VALUES FOR THE BLOCKS WITHIN A WHILE LOOP BACK ---------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This function is passed an id for a while loop. It returns the object created in the SolveWhileLoopParameters function back to the main algorithm.					\
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function PassWhileParameters(loopID) {
  postMessage({
    messageType: 'WhileLoopParametersResult',
    ID: loopID,
    loopObject: self[loopID]
  })
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*-------------------------------------------------- CREATE A NEW IF ELSE STATEMENT AND POPULATE IT -------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function IfElse(loopObj) {
  this.fileid = loopObj['fileid']
  this.itemid = loopObj['itemid']
  this.id = loopObj['itemid']
  this.location = loopObj['order']
  this.order = loopObj['order']
  this.component_type_id = 8
  this.Page_lastposition = loopObj['order']
  this.content = {}
  this.content.topparentid = 'none'
  this.content.parentid = 'none'
  this.content.ifelse = {}
  this.content['ifelse'].Page_position = 0
  this.content['ifelse'].Statement_Type = 'if'
  this.content['ifelse'].Statement_String = ''
  this.content['ifelse'].Statement_TFString = ''
  this.content['ifelse'].StatementID = loopObj['itemid']
  this.content['ifelse'].Statement_ValueString = ''
  this.content['ifelse'].Statement_truefalse = false // 	\
  this.content['ifelse'].Statement_Execute = '0' // 	\
  this.content['ifelse'].Statement_Parent = loopObj['itemid']
  this.content['ifelse'].Statement_Order = new Array()
  this.content['ifelse'].Errors_errors = new Array() // 	\
  this.content['ifelse'].Errors_flag = 0 // 	\
  this.content['ifelse'].Statement_Values = {}
  this.content['ifelse'].statementBlock = {}
  this.content['ifelse'].firstRun = 1
  this.content['type'] = 'ifelse' // Type as in versus for loop or while loop or equation, etc
  this.content['ifelse']['type'] = 'if' // Type as in if, ifelse, or else
  this.content.ifelse.Errors_flag = 0
  this.content.ifelse.Errors_errors = new Array() // 	\
  for (var item in loopObj.content.ifelse) {
    this['content']['ifelse'][item] = loopObj['content']['ifelse'][item]
  }
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------- SOLVE THE VALUES FOR THE BLOCKS WITHIN A IF ELSE STATEMENT --------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This function is passed an id for an if/else statement. It then looks at the object that holds the text for the conditions and solves each of those equations.		\
	This happens each time that one of those parameters is changed on the DOM when this function is called from the main program. It also happens each time through 	\
	the loop so that the algorithm can check to see the state of the conditions to check whether the loop should continue or not.										\
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function SolveIfElseParameters(loopid, callback) {
  console.log('In Solve If Else Parameters')
  DOM_Object[loopid]['content']['ifelse']['Dependents'] = {}
  for (var a = 0; a < self[loopid]['content']['ifelse']['statementBlock'].length; a++) {
    for (var b = 0; b < self[loopid]['content']['ifelse']['statementBlock'][a].length; b++) {
      if (self[loopid]['content']['ifelse']['statementBlock'][a][b]['flagText'] !== undefined) {
        if (self[loopid]['content']['ifelse']['statementBlock'][a][b]['flagText'].match(/^\d+$/)) {
          self[loopid]['content']['ifelse']['statementBlock'][a][b]['flagValue'] = parseInt(
            self[loopid]['content']['ifelse']['statementBlock'][a][b]['flagText'],
            10
          )
        } else {
          console.log('the location is ' + DOM_Object[loopid]['order'])
          var eqobj = {
            Page_position: DOM_Object[loopid]['order'],
            Format_showtype: 'InnerFunction',
            equation: 'FlagEq=' + self[loopid]['content']['ifelse']['statementBlock'][a][b]['flagText'],
            Page_parentid: loopid,
            Page_topparentid: loopid
          }
          var id = CreateEq(self[loopid]['fileid'], 1, eqobj)
          for (var k in DOM_Object[id]['Dependents']) {
            DOM_Object[loopid]['content']['ifelse']['Dependents'][k] = 1
            if (self[loopid] !== undefined) {
              if (self[loopid]['content']['ifelse']['Dependents'] === undefined) {
                self[loopid]['content']['ifelse']['Dependents'] = {}
              }
              self[loopid]['content']['ifelse']['Dependents'][k] = 1
            }
          }
          self[loopid]['content']['ifelse']['statementBlock'][a][b]['flagValue'] = self[id].Solution_real['0-0']
          console.log('--- The flag value is ' + self[id].Solution_real['0-0'])
          delete self[id]
          delete DOM_Object[id]
        }
        if (self[loopid]['content']['ifelse']['statementBlock'][a][b]['dependentText'].match(/^\d+$/)) {
          self[loopid]['content']['ifelse']['statementBlock'][a][b]['dependentValue'] = parseFloat(
            self[loopid]['content']['ifelse']['statementBlock'][a][b]['dependentText'],
            10
          )
        } else {
          var eqobj = {
            Page_position: DOM_Object[loopid]['order'],
            Original_id: loopid,
            Format_showtype: 'InnerFunction',
            equation: 'DepEq=' + self[loopid]['content']['ifelse']['statementBlock'][a][b]['dependentText']
          }
          var id = CreateEq(self[loopid]['fileid'], 1, eqobj)
          for (var k in DOM_Object[id]['Dependents']) {
            DOM_Object[loopid]['content']['ifelse']['Dependents'][k] = 1
            if (self[loopid] !== undefined) {
              if (self[loopid]['content']['ifelse']['Dependents'] === undefined) {
                self[loopid]['content']['ifelse']['Dependents'] = {}
              }
              self[loopid]['content']['ifelse']['Dependents'][k] = 1
            }
          }
          self[loopid]['content']['ifelse']['statementBlock'][a][b]['dependentValue'] = self[id].Solution_real['0-0']
          console.log('--- The dependent value is ' + self[id].Solution_real['0-0'])
          delete self[id]
          delete DOM_Object[id]
        }
      }
    }
  }
  if (typeof callback == 'function') {
    callback()
  }
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*----------------------------------------- CHECK IF/ELSE STATEMENTS FOR TRUE / FALSE AND FOR ERRROS AND EXECUTION ----------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This function is called to check whether or not the if / else statement is true or false and to determine whether or not it is active. This is done each time the 	|
	statement is altered. There are three steps to complete the action. The code allows users to enter multiple conditions and to use the binary and / or by using 		|
	the && and || symbols. The values of the flag and dependents were established in the previous function. 															|
	1. The function first checks the status of each statement separately and sets a true or false depending on if those values meet the requirements established. 		|
	2. The function rebuilds the if statement with the statements replaced with those true/false values and solves it. 													|
	3. The third step marks whether this particulare statement should be executed. It does this by looking at previous if / else statements and executing accordingly.	|
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function CheckStatement(loopid, callback) {
  var dependent = '',
    condition = '',
    flag = '',
    statementstring = '',
    tfstring = '',
    valuestring = '',
    temp1 = '',
    temp2 = '',
    temp3 = '',
    parentStatement = '',
    flag = 0
  console.log('In Check Statement')

  console.log('At the beginning of CheckStatement, the DOM_Object of the loop is ...')
  console.log(DOM_Object[loopid])

  for (var a = 0; a < self[loopid]['content']['ifelse']['statementBlock'].length; a++) {
    for (var b = 0; b < self[loopid]['content']['ifelse']['statementBlock'][a].length; b++) {
      flag = self[loopid]['content']['ifelse']['statementBlock'][a][b]['flagValue']
      dependent = self[loopid]['content']['ifelse']['statementBlock'][a][b]['dependentValue']
      condition = self[loopid]['content']['ifelse']['statementBlock'][a][b]['conditionText']
      if (condition == '==' && flag == dependent) {
        self[loopid]['content']['ifelse']['statementBlock'][a][b]['truefalse'] = true
      } else if (condition == '==') {
        self[loopid]['content']['ifelse']['statementBlock'][a][b]['truefalse'] = false
      }
      if (condition == '!=' && flag != dependent) {
        self[loopid]['content']['ifelse']['statementBlock'][a][b]['truefalse'] = true
      } else if (condition == '!=') {
        self[loopid]['content']['ifelse']['statementBlock'][a][b]['truefalse'] = false
      }
      if (condition == '>' && flag > dependent) {
        self[loopid]['content']['ifelse']['statementBlock'][a][b]['truefalse'] = true
      } else if (condition == '>') {
        self[loopid]['content']['ifelse']['statementBlock'][a][b]['truefalse'] = false
      }
      if (condition == '>=' && flag >= dependent) {
        self[loopid]['content']['ifelse']['statementBlock'][a][b]['truefalse'] = true
      } else if (condition == '>=') {
        self[loopid]['content']['ifelse']['statementBlock'][a][b]['truefalse'] = false
      }
      if (condition == '<' && flag < dependent) {
        self[loopid]['content']['ifelse']['statementBlock'][a][b]['truefalse'] = true
      } else if (condition == '<') {
        self[loopid]['content']['ifelse']['statementBlock'][a][b]['truefalse'] = false
      }
      if (condition == '<=' && flag <= dependent) {
        self[loopid]['content']['ifelse']['statementBlock'][a][b]['truefalse'] = true
      } else if (condition == '<=') {
        self[loopid]['content']['ifelse']['statementBlock'][a][b]['truefalse'] = false
      }
    }
  }

  for (var a = 0; a < self[loopid]['content']['ifelse']['statementBlock'].length; a++) {
    if (a !== 0) {
      statementstring = statementstring + self[loopid]['content']['ifelse']['statementBlock'][a][0]['blockOption']
    }
    if (a !== 0) {
      tfstring = tfstring + self[loopid]['content']['ifelse']['statementBlock'][a][0]['blockOption']
    }
    if (a !== 0) {
      valuestring = valuestring + self[loopid]['content']['ifelse']['statementBlock'][a][0]['blockOption']
    }
    statementstring = statementstring + '('
    tfstring = tfstring + '('
    valuestring = valuestring + '('
    for (var b = 0; b < self[loopid]['content']['ifelse']['statementBlock'][a].length; b++) {
      if (b !== 0) {
        statementstring = statementstring + self[loopid]['content']['ifelse']['statementBlock'][a][b]['blockOption']
      }
      if (b !== 0) {
        tfstring = tfstring + self[loopid]['content']['ifelse']['statementBlock'][a][b]['blockOption']
      }
      if (b !== 0) {
        valuestring = valuestring + self[loopid]['content']['ifelse']['statementBlock'][a][b]['blockOption']
      }
      statementstring = statementstring + '('
      tfstring = tfstring + '('
      valuestring = valuestring + '('
      temp1 = self[loopid]['content']['ifelse']['statementBlock'][a][b]['truefalse']
      tfstring = tfstring + '' + temp1 + ''
      temp1 = self[loopid]['content']['ifelse']['statementBlock'][a][b]['flagText']
      temp2 = self[loopid]['content']['ifelse']['statementBlock'][a][b]['conditionText']
      temp3 = self[loopid]['content']['ifelse']['statementBlock'][a][b]['dependentText']
      statementstring = statementstring + '' + temp1 + '' + temp2 + '' + temp3 + ''
      temp1 = self[loopid]['content']['ifelse']['statementBlock'][a][b]['flagValue']
      temp2 = self[loopid]['content']['ifelse']['statementBlock'][a][b]['conditionText']
      temp3 = self[loopid]['content']['ifelse']['statementBlock'][a][b]['dependentValue']
      valuestring = valuestring + '' + temp1 + '' + temp2 + '' + temp3 + ''
      statementstring = statementstring + ')'
      tfstring = tfstring + ')'
      valuestring = valuestring + ')'
    }
    statementstring = statementstring + ')'
    tfstring = tfstring + ')'
    valuestring = valuestring + ')'
  }
  self[loopid]['content']['ifelse']['Loop_String'] = statementstring
  self[loopid]['content']['ifelse']['Loop_TFString'] = tfstring
  self[loopid]['content']['ifelse']['Loop_ValueString'] = valuestring
  self[loopid]['content']['ifelse']['Statement_truefalse'] = eval(tfstring.replace(/<div[^>]*>|<\/div>/g, ''))
  DOM_Object[loopid]['content']['ifelse']['Statement_String'] = statementstring
  DOM_Object[loopid]['content']['ifelse']['Statement_TFString'] = tfstring
  DOM_Object[loopid]['content']['ifelse']['Statement_ValueString'] = valuestring
  DOM_Object[loopid]['content']['ifelse']['Statement_truefalse'] = eval(tfstring.replace(/<div[^>]*>|<\/div>/g, ''))
  parentStatement = DOM_Object[loopid]['content']['ifelse']['parentStatement']
  for (var a in DOM_Object) {
    if (DOM_Object[a]['component_type_id'] == 8) {
      console.log('The item in question is ...')
      console.log(DOM_Object[a])
      if (DOM_Object[a]['content']['ifelse']['parentStatement'] == parentStatement) {
        DOM_Object[parentStatement]['content']['ifelse']['Statement_Order'].push({
          location: DOM_Object[a]['order'] - DOM_Object[parentStatement]['order'],
          ID: a,
          Execute: 0
        })
      } //  \
    }
  }
  flag = 0
  DOM_Object[parentStatement]['content']['ifelse']['Statement_Order'] = DOM_Object[parentStatement]['content'][
    'ifelse'
  ]['Statement_Order'].sort(dynamicSort('location'))
  for (var a = 0; a < DOM_Object[parentStatement]['content']['ifelse']['Statement_Order'].length; a++) {
    var id = DOM_Object[parentStatement]['content']['ifelse']['Statement_Order'][a]['ID']
    console.log(
      'The true false, type, and flag of the statement are ' +
        DOM_Object[id]['content']['ifelse']['Statement_truefalse'] +
        '-' +
        DOM_Object[id]['content']['ifelse']['Statement_Type'] +
        '-' +
        flag
    )
    if (DOM_Object[id]['content']['ifelse']['Statement_Type'] != 'else') {
      if (DOM_Object[id]['content']['ifelse']['Statement_truefalse'] === true && flag === 0) {
        DOM_Object[id]['content']['ifelse']['Statement_Execute'] = 1
        flag = 1
        DOM_Object[parentStatement]['content']['ifelse']['Statement_Order'][a]['Execute'] = 1
      } else {
        DOM_Object[id]['content']['ifelse']['Statement_Execute'] = 0
        DOM_Object[parentStatement]['content']['ifelse']['Statement_Order'][a]['Execute'] = 0
      }
    } else {
      if (DOM_Object[id]['content']['ifelse']['Statement_Type'] == 'else' && flag === 0) {
        DOM_Object[id]['content']['ifelse']['Statement_Execute'] = 1
        DOM_Object[parentStatement]['content']['ifelse']['Statement_Order'][a]['Execute'] = 1
      } else {
        DOM_Object[id]['content']['ifelse']['Statement_Execute'] = 0
        DOM_Object[parentStatement]['content']['ifelse']['Statement_Order'][a]['Execute'] = 0
      }
    }
  }
  for (var a = 0; a < DOM_Object[parentStatement]['content']['ifelse']['Statement_Order'].length; a++) {
    var id = DOM_Object[parentStatement]['content']['ifelse']['Statement_Order'][a]['ID']
    DOM_Object[id]['content']['ifelse']['Statement_Order'] =
      DOM_Object[parentStatement]['content']['ifelse']['Statement_Order']
    self[id]['content']['ifelse']['Statement_Order'] =
      DOM_Object[parentStatement]['content']['ifelse']['Statement_Order']
  }
  console.log('At the end of CheckStatement, the DOM_Object of the loop is ...')
  console.log(DOM_Object[loopid])

  if (typeof callback == 'function') {
    callback()
  }
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*----------------------------------------------------------------- SET ACTIVE OR INACTIVE ----------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*
    This function sets the items to active or inactive for if/else statements. To do this, the code simply looks at whether the statement execute flag is set.          |
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function SetActive(id, callback) {
  var thisID = ''

  console.log('At the beginning of SetActive, the DOM_Object of the loop is ...')
  console.log(DOM_Object[id])

  if (DOM_Object[id] !== undefined) {
    for (var i = 0; i < DOM_Object[id]['content']['ifelse']['Statement_Order'].length; i++) {
      thisID = DOM_Object[id]['content']['ifelse']['Statement_Order'][i]['ID']
      if (DOM_Object[thisID]['content']['ifelse']['Statement_Execute'] == 1) {
        DOM_Object[thisID]['content']['ifelse']['active'] = 1
        for (var x in DOM_Object) {
          if (DOM_Object[x]['content'] !== undefined) {
            if (DOM_Object[x]['content']['parentid'] == id) {
              DOM_Object[x]['content']['active'] = 1
              self[x]['content']['active'] = 1
            }
          }
        }
      } else {
        DOM_Object[thisID]['content']['ifelse']['active'] = 0
        for (var x in DOM_Object) {
          if (DOM_Object[x]['content'] !== undefined) {
            if (DOM_Object[x]['content']['parentid'] == id) {
              DOM_Object[x]['content']['active'] = 0
              self[x]['content']['active'] = 0
            }
          }
        }
      }
    }
  }

  console.log('At the end of SetActive, the DOM_Object of the loop is ...')
  console.log(DOM_Object[id])

  if (typeof callback == 'function') {
    callback()
  }
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*--------------------------------------------- PASS THE VALUES FOR THE BLOCKS WITHIN A WHILE LOOP BACK ---------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This function is passed an id for a while loop. It returns the object created in the SolveWhileLoopParameters function back to the main algorithm.					\
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function PassIfElseParameters(ID) {
  postMessage({ messageType: 'IfElseParametersResult', ID: ID, loopObject: self[ID] })
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------ HANDLE SURFACE DATA ------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*
	solveSurfaceData	-	This is the function called when the worker is first called from the main program. It asks as a steward and calls the remaining functions.	\
							The equation solver promise is initiated from this function and the remaining functions are called from the promise.						\
	setSurfaceData		-	This function sets x, y, or z data to the solution of the equation as well as the size and length.											\
	getSurfaceExtremes	-	This function looks at the mins and maxes for each axes for all datasets and sets the overall min and max for the chart						\
	sendSurfaceData		-	This function just sends the data that was created back to the main program																	\
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------- FORMAT ENTERED SURFACE DATA ---------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	These are the first two steps in taking an entry and prepraing it for a surface map. In the first function, an equation is created with the given text and solved	\
	for given the proper parameters. In the second function, the results are placed into the proper spot in the data object. Remember, only the data object is passed	\
	to this function and sent around and not the entire plot object. This was due to the original object containing DOM elements which made it unable to send.			\
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function solveSurfaceData(PlotID, DataID, dataObject, axis, type, Props) {
  var equation = '',
    eqobj = {},
    id = '',
    dataIndex = 0
  for (var a = 0; a < dataObject.length; a++) {
    if (dataObject[a]['Format_id'] == DataID) {
      dataIndex = a
    }
  }
  console.log('in the solve surface with an axis of ' + axis + ' and a data index of ' + dataIndex)
  if (axis == 'X') {
    equation = dataObject[dataIndex]['xDataRaw']
  }
  if (axis == 'Y') {
    equation = dataObject[dataIndex]['yDataRaw']
  }
  if (axis == 'Z') {
    equation = dataObject[dataIndex]['zDataRaw']
  }
  if (axis == 'C') {
    equation = dataObject[dataIndex]['cDataRaw']
  }
  eqobj = {
    Page_position: parseInt(DOM_Object[PlotID]['order'], 10),
    Format_showtype: 'InnerFunction',
    equation: 'Temp=' + equation
  }
  id = CreateEq(FileID, 0, eqobj)
  console.log('In solve surface data with an equation of ' + equation + ' and a type of ' + type)
  if (type == 'surface' || type == 'pointCloud') {
    eqPromise(id).then(
      setSurfaceData(PlotID, DataID, dataObject, axis, id, function () {
        sendSurfaceData(PlotID, dataObject, type, DataID, Props, axis)
      })
    )
  } else if (type == 'line') {
    eqPromise(id).then(
      setSurfaceData(PlotID, DataID, dataObject, axis, id, function () {
        // setLinePoints		(PlotID, DataID, dataObject, axis, Props, function() {
        sendSurfaceData(PlotID, dataObject, 'line', DataID, Props, axis)
      })
    )
  } else if (type == 'lathe') {
    eqPromise(id).then(
      setLatheData(PlotID, DataID, dataObject, axis, id, function () {
        sendSurfaceData(PlotID, dataObject, 'lathe', DataID, Props, axis)
      })
    )
  }
}

function setSurfaceData(PlotID, DataID, dataObject, axis, id, callback) {
  var cMax = -99999999999,
    cMin = 999999999999,
    dataIndex = 0
  for (var a = 0; a < dataObject.length; a++) {
    if (dataObject[a]['Format_id'] == DataID) {
      dataIndex = a
    }
  }
  if (DOM_Object[PlotID]['Dependents'] === undefined) {
    DOM_Object[PlotID]['Dependents'] = {}
  }
  if (DOM_Object[PlotID]['Dependents'][axis] === undefined) {
    DOM_Object[PlotID]['Dependents'][axis] = {}
  }
  for (var a in DOM_Object[id]['Dependents']) {
    DOM_Object[PlotID]['Dependents'][axis][a] = 1
  }
  if (axis == 'X') {
    dataObject[dataIndex].xData = self[id].Solution_real
    var lengths = self[id].Format_size.split('x')
    dataObject[dataIndex].xLength = lengths[1]
  }
  if (axis == 'Y') {
    dataObject[dataIndex].yData = self[id].Solution_real
    var lengths = self[id].Format_size.split('x')
    dataObject[dataIndex].yLength = lengths[1]
  }
  if (axis == 'Z') {
    dataObject[dataIndex].zData = self[id].Solution_real
    var lengths = self[id].Format_size.split('x')
    dataObject[dataIndex].xLength = lengths[0]
    dataObject[dataIndex].yLength = lengths[1]
  }
  if (axis == 'C') {
    dataObject[dataIndex].cData = self[id].Solution_real
    for (var a in dataObject[dataIndex].cData) {
      if (dataObject[dataIndex].cData[a] < cMin) {
        cMin = dataObject[dataIndex].cData[a]
      }
      if (dataObject[dataIndex].cData[a] > cMax) {
        cMax = dataObject[dataIndex].cData[a]
      }
    }
    dataObject[dataIndex]['cMax'] = cMax
    dataObject[dataIndex]['cMin'] = cMin
  }
  if (typeof callback == 'function') {
    callback()
  }
}

function setLatheData(PlotID, DataID, dataObject, axis, id, callback) {
  var dataIndex = 0
  for (var a = 0; a < dataObject.length; a++) {
    if (dataObject[a]['Format_id'] == DataID) {
      dataIndex = a
    }
  }
  if (axis == 'X') {
    dataObject[dataIndex].xData = self[id].Solution_real
    var lengths = self[id].Format_size.split('x')
    dataObject[dataIndex].xLength = lengths[1]
  }
  if (axis == 'Y') {
    dataObject[dataIndex].yData = self[id].Solution_real
    var lengths = self[id].Format_size.split('x')
    dataObject[dataIndex].yLength = lengths[1]
  }
  if (typeof callback == 'function') {
    callback()
  }
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------- SET THE EXTREMES FOR EVERY PLOT --------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This is the fourth step in the creation of a surface map. The code simply steps through and finds and maximum and minimum for each axis.							\
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function getSurfaceExtremes(PlotID, DataID, dataObject, Props, callback) {
  var dataIndex = 0
  for (var a = 0; a < dataObject.length; a++) {
    if (dataObject[a]['Format_id'] == DataID) {
      dataIndex = a
    }
  }
  if (dataObject[dataIndex].xMin < Props.xMin) {
    Props.xMin = dataObject[dataIndex].xMin
  }
  if (dataObject[dataIndex].xMax > Props.xMax) {
    Props.xMax = dataObject[dataIndex].xMax
  }
  if (dataObject[dataIndex].yMin < Props.yMin) {
    Props.yMin = dataObject[dataIndex].yMin
  }
  if (dataObject[dataIndex].yMax > Props.yMax) {
    Props.yMax = dataObject[dataIndex].yMax
  }
  if (dataObject[dataIndex].zMin < Props.zMin) {
    Props.zMin = dataObject[dataIndex].zMin
    Props.flag = 1
  }
  if (dataObject[dataIndex].zMax > Props.zMax) {
    Props.zMax = dataObject[dataIndex].zMax
    Props.flag = 1
  }
  if (typeof callback == 'function') {
    callback()
  }
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------- SET THE POINTS FOR A LINE --------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This code sets the individual data points for each line. This is done by creating a spline curve and adding a vector point for each point in the users data. If		\
	either the X or Y are not populated, then the index for those points is used.																						\
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function setLinePoints(PlotID, DataID, dataObject, axis, Props, callback) {
  var xVal = 0,
    yVal = 0,
    zVal = 0,
    lineData = [],
    xMax = -9999999999,
    xMin = 9999999999,
    yMax = -9999999999,
    yMin = 9999999999,
    zMax = -9999999999,
    zMin = 9999999999,
    dataIndex = 0
  var cMax = -9999999999,
    cMin = 9999999999
  for (var a = 0; a < dataObject.length; a++) {
    if (dataObject[a]['Format_id'] == DataID) {
      dataIndex = a
    }
  }
  if (axis == 'X') {
    var thislength = Object.keys(dataObject[dataIndex]['xData']).length
  }
  if (axis == 'Y') {
    var thislength = Object.keys(dataObject[dataIndex]['yData']).length
  }
  if (axis == 'Z') {
    var thislength = Object.keys(dataObject[dataIndex]['zData']).length
  }
  if (axis == 'C') {
    var thislength = Object.keys(dataObject[dataIndex]['cData']).length
  }
  console.log(
    'The lengths of the x, y, z, and c components are ' +
      Object.keys(dataObject[dataIndex]['xData']).length +
      '-' +
      Object.keys(dataObject[dataIndex]['yData']).length +
      '-' +
      Object.keys(dataObject[dataIndex]['zData']).length +
      '-' +
      Object.keys(dataObject[dataIndex]['cData']).length
  )
  for (var thisDataID in dataObject) {
    if (dataObject[thisDataID]['type'] == 'line') {
      for (var a = 0; a < thislength; a++) {
        if (dataObject[thisDataID].xData['0-' + a] === undefined) {
          xVal = a
        } else {
          xVal = dataObject[thisDataID].xData['0-' + a]
        }
        if (dataObject[thisDataID].yData['0-' + a] === undefined) {
          yVal = a
        } else {
          yVal = dataObject[thisDataID].yData['0-' + a]
        }
        zVal = dataObject[thisDataID].zData['0-' + a]
        cVal = dataObject[thisDataID].cData['0-' + a]
        console.log('A new three vector is being pushed with values of ' + xVal + '-' + yVal + '-' + zVal)
        // lineData.push(new THREE.Vector3(xVal, yVal, zVal));
        if (xVal > xMax) {
          dataObject[thisDataID].xMax = xVal
          xMax = xVal
        }
        if (xVal < xMin) {
          dataObject[thisDataID].xMin = xVal
          xMin = xVal
        }
        if (yVal > yMax) {
          dataObject[thisDataID].yMax = yVal
          yMax = yVal
        }
        if (yVal < yMin) {
          dataObject[thisDataID].yMin = yVal
          yMin = yVal
        }
        if (zVal > zMax) {
          dataObject[thisDataID].zMax = zVal
          zMax = zVal
        }
        if (zVal < zMin) {
          dataObject[thisDataID].zMin = zVal
          zMin = zVal
        }
        if (cVal > cMax) {
          dataObject[thisDataID].cMax = cVal
          cMax = cVal
        }
        if (cVal < cMin) {
          dataObject[thisDataID].cMin = cVal
          cMin = cVal
        }
      }
    }
  }
  Props.xMin = xMin
  Props.xMax = xMax
  Props.yMin = yMin
  Props.yMax = yMax
  Props.zMin = zMin
  Props.zMax = zMax
  // dataObject[dataIndex].lineGeometry=new THREE.SplineCurve3(lineData);
  if (typeof callback == 'function') {
    callback()
  }
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------- SET THE COLORS IN THE SURFACE MAP ------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	The sixth and final code involved in solving and sending surface map data, this code simply sends the data created back to the main code.
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function sendSurfaceData(PlotID, dataObject, type, DataID, Props, axis, callback) {
  postMessage({
    messageType: 'SurfaceData',
    PlotID: PlotID,
    DataID: DataID,
    Props: Props,
    Axis: axis,
    Deps: DOM_Object[PlotID]['Dependents'],
    type: type,
    dataObject: dataObject
  })
  if (typeof callback == 'function') {
    callback()
  }
}

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------- THE XML REQUEST FUNCTION ------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*	This function is used throughout the worker to make ajax calls to the document controller.
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadData(url, callback) {
  var xhr
  if (typeof XMLHttpRequest !== 'undefined') xhr = new XMLHttpRequest()
  else {
    var versions = [
      'MSXML2.XmlHttp.5.0',
      'MSXML2.XmlHttp.4.0',
      'MSXML2.XmlHttp.3.0',
      'MSXML2.XmlHttp.2.0',
      'Microsoft.XmlHttp'
    ]
    for (var i = 0, len = versions.length; i < len; i++) {
      try {
        xhr = new ActiveXObject(versions[i])
        break
      } catch (e) {}
    }
  }
  xhr.onreadystatechange = ensureReadiness
  function ensureReadiness() {
    if (xhr.readyState < 4) {
      return
    }
    if (xhr.status !== 200) {
      return
    }
    if (xhr.readyState === 4) {
      callback(xhr)
    }
  }
  xhr.open('GET', url, true)
  xhr.send('')
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/* big.js v3.1.3 https://github.com/MikeMcl/big.js/LICENCE */ ;(function (global) {
  'use strict'
  var DP = 20,
    RM = 1,
    MAX_DP = 1e6,
    MAX_POWER = 1e6,
    E_NEG = -7,
    E_POS = 21,
    P = {},
    isValid = /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i,
    Big
  function bigFactory() {
    function Big(n) {
      var x = this
      if (!(x instanceof Big)) {
        return n === void 0 ? bigFactory() : new Big(n)
      }
      if (n instanceof Big) {
        x.s = n.s
        x.e = n.e
        x.c = n.c.slice()
      } else {
        parse(x, n)
      }
      x.constructor = Big
    }
    Big.prototype = P
    Big.DP = DP
    Big.RM = RM
    Big.E_NEG = E_NEG
    Big.E_POS = E_POS
    return Big
  }
  function format(x, dp, toE) {
    var Big = x.constructor,
      i = dp - (x = new Big(x)).e,
      c = x.c
    if (c.length > ++dp) {
      rnd(x, i, Big.RM)
    }
    if (!c[0]) {
      ++i
    } else if (toE) {
      i = dp
    } else {
      c = x.c
      i = x.e + i + 1
    }
    for (; c.length < i; c.push(0)) {}
    i = x.e
    return toE === 1 || (toE && (dp <= i || i <= Big.E_NEG))
      ? (x.s < 0 && c[0] ? '-' : '') +
          (c.length > 1 ? c[0] + '.' + c.join('').slice(1) : c[0]) +
          (i < 0 ? 'e' : 'e+') +
          i
      : x.toString()
  }
  function parse(x, n) {
    var e, i, nL
    if (n === 0 && 1 / n < 0) {
      n = '-0'
    } else if (!isValid.test((n += ''))) {
      throwErr(NaN)
    }
    x.s = n.charAt(0) == '-' ? ((n = n.slice(1)), -1) : 1
    if ((e = n.indexOf('.')) > -1) {
      n = n.replace('.', '')
    }
    if ((i = n.search(/e/i)) > 0) {
      if (e < 0) {
        e = i
      }
      e += +n.slice(i + 1)
      n = n.substring(0, i)
    } else if (e < 0) {
      e = n.length
    }
    for (i = 0; n.charAt(i) == '0'; i++) {}
    if (i == (nL = n.length)) {
      x.c = [(x.e = 0)]
    } else {
      for (; n.charAt(--nL) == '0'; ) {}
      x.e = e - i - 1
      x.c = []
      for (e = 0; i <= nL; x.c[e++] = +n.charAt(i++)) {}
    }
    return x
  }
  function rnd(x, dp, rm, more) {
    var u,
      xc = x.c,
      i = x.e + dp + 1
    if (rm === 1) {
      more = xc[i] >= 5
    } else if (rm === 2) {
      more = xc[i] > 5 || (xc[i] == 5 && (more || i < 0 || xc[i + 1] !== u || xc[i - 1] & 1))
    } else if (rm === 3) {
      more = more || xc[i] !== u || i < 0
    } else {
      more = false
      if (rm !== 0) {
        throwErr('!Big.RM!')
      }
    }
    if (i < 1 || !xc[0]) {
      if (more) {
        x.e = -dp
        x.c = [1]
      } else {
        x.c = [(x.e = 0)]
      }
    } else {
      xc.length = i--
      if (more) {
        for (; ++xc[i] > 9; ) {
          xc[i] = 0
          if (!i--) {
            ++x.e
            xc.unshift(1)
          }
        }
      }
      for (i = xc.length; !xc[--i]; xc.pop()) {}
    }
    return x
  }
  function throwErr(message) {
    var err = new Error(message)
    err.name = 'BigError'
    throw err
  }
  P.abs = function () {
    var x = new this.constructor(this)
    x.s = 1
    return x
  }
  P.cmp = function (y) {
    var xNeg,
      x = this,
      xc = x.c,
      yc = (y = new x.constructor(y)).c,
      i = x.s,
      j = y.s,
      k = x.e,
      l = y.e
    if (!xc[0] || !yc[0]) {
      return !xc[0] ? (!yc[0] ? 0 : -j) : i
    }
    if (i != j) {
      return i
    }
    xNeg = i < 0
    if (k != l) {
      return (k > l) ^ xNeg ? 1 : -1
    }
    i = -1
    j = (k = xc.length) < (l = yc.length) ? k : l
    for (; ++i < j; ) {
      if (xc[i] != yc[i]) {
        return (xc[i] > yc[i]) ^ xNeg ? 1 : -1
      }
    }
    return k == l ? 0 : (k > l) ^ xNeg ? 1 : -1
  }
  P.div = function (y) {
    var x = this,
      Big = x.constructor,
      dvd = x.c,
      dvs = (y = new Big(y)).c,
      s = x.s == y.s ? 1 : -1,
      dp = Big.DP
    if (dp !== ~~dp || dp < 0 || dp > MAX_DP) {
      throwErr('!Big.DP!')
    }
    if (!dvd[0] || !dvs[0]) {
      if (dvd[0] == dvs[0]) {
        throwErr(NaN)
      }
      if (!dvs[0]) {
        throwErr(s / 0)
      }
      return new Big(s * 0)
    }
    var dvsL,
      dvsT,
      next,
      cmp,
      remI,
      u,
      dvsZ = dvs.slice(),
      dvdI = (dvsL = dvs.length),
      dvdL = dvd.length,
      rem = dvd.slice(0, dvsL),
      remL = rem.length,
      q = y,
      qc = (q.c = []),
      qi = 0,
      digits = dp + (q.e = x.e - y.e) + 1
    q.s = s
    s = digits < 0 ? 0 : digits
    dvsZ.unshift(0)
    for (; remL++ < dvsL; rem.push(0)) {}
    do {
      for (next = 0; next < 10; next++) {
        if (dvsL != (remL = rem.length)) {
          cmp = dvsL > remL ? 1 : -1
        } else {
          for (remI = -1, cmp = 0; ++remI < dvsL; ) {
            if (dvs[remI] != rem[remI]) {
              cmp = dvs[remI] > rem[remI] ? 1 : -1
              break
            }
          }
        }
        if (cmp < 0) {
          for (dvsT = remL == dvsL ? dvs : dvsZ; remL; ) {
            if (rem[--remL] < dvsT[remL]) {
              remI = remL
              for (; remI && !rem[--remI]; rem[remI] = 9) {}
              --rem[remI]
              rem[remL] += 10
            }
            rem[remL] -= dvsT[remL]
          }
          for (; !rem[0]; rem.shift()) {}
        } else {
          break
        }
      }
      qc[qi++] = cmp ? next : ++next
      if (rem[0] && cmp) {
        rem[remL] = dvd[dvdI] || 0
      } else {
        rem = [dvd[dvdI]]
      }
    } while ((dvdI++ < dvdL || rem[0] !== u) && s--)
    if (!qc[0] && qi != 1) {
      qc.shift()
      q.e--
    }
    if (qi > digits) {
      rnd(q, dp, Big.RM, rem[0] !== u)
    }
    return q
  }
  P.eq = function (y) {
    return !this.cmp(y)
  }
  P.gt = function (y) {
    return this.cmp(y) > 0
  }
  P.gte = function (y) {
    return this.cmp(y) > -1
  }
  P.lt = function (y) {
    return this.cmp(y) < 0
  }
  P.lte = function (y) {
    return this.cmp(y) < 1
  }
  P.sub = P.minus = function (y) {
    var i,
      j,
      t,
      xLTy,
      x = this,
      Big = x.constructor,
      a = x.s,
      b = (y = new Big(y)).s
    if (a != b) {
      y.s = -b
      return x.plus(y)
    }
    var xc = x.c.slice(),
      xe = x.e,
      yc = y.c,
      ye = y.e
    if (!xc[0] || !yc[0]) {
      return yc[0] ? ((y.s = -b), y) : new Big(xc[0] ? x : 0)
    }
    if ((a = xe - ye)) {
      if ((xLTy = a < 0)) {
        a = -a
        t = xc
      } else {
        ye = xe
        t = yc
      }
      t.reverse()
      for (b = a; b--; t.push(0)) {}
      t.reverse()
    } else {
      j = ((xLTy = xc.length < yc.length) ? xc : yc).length
      for (a = b = 0; b < j; b++) {
        if (xc[b] != yc[b]) {
          xLTy = xc[b] < yc[b]
          break
        }
      }
    }
    if (xLTy) {
      t = xc
      xc = yc
      yc = t
      y.s = -y.s
    }
    if ((b = (j = yc.length) - (i = xc.length)) > 0) {
      for (; b--; xc[i++] = 0) {}
    }
    for (b = i; j > a; ) {
      if (xc[--j] < yc[j]) {
        for (i = j; i && !xc[--i]; xc[i] = 9) {}
        --xc[i]
        xc[j] += 10
      }
      xc[j] -= yc[j]
    }
    for (; xc[--b] === 0; xc.pop()) {}
    for (; xc[0] === 0; ) {
      xc.shift()
      --ye
    }
    if (!xc[0]) {
      y.s = 1
      xc = [(ye = 0)]
    }
    y.c = xc
    y.e = ye
    return y
  }
  P.mod = function (y) {
    var yGTx,
      x = this,
      Big = x.constructor,
      a = x.s,
      b = (y = new Big(y)).s
    if (!y.c[0]) {
      throwErr(NaN)
    }
    x.s = y.s = 1
    yGTx = y.cmp(x) == 1
    x.s = a
    y.s = b
    if (yGTx) {
      return new Big(x)
    }
    a = Big.DP
    b = Big.RM
    Big.DP = Big.RM = 0
    x = x.div(y)
    Big.DP = a
    Big.RM = b
    return this.minus(x.times(y))
  }
  P.add = P.plus = function (y) {
    var t,
      x = this,
      Big = x.constructor,
      a = x.s,
      b = (y = new Big(y)).s
    if (a != b) {
      y.s = -b
      return x.minus(y)
    }
    var xe = x.e,
      xc = x.c,
      ye = y.e,
      yc = y.c
    if (!xc[0] || !yc[0]) {
      return yc[0] ? y : new Big(xc[0] ? x : a * 0)
    }
    xc = xc.slice()
    if ((a = xe - ye)) {
      if (a > 0) {
        ye = xe
        t = yc
      } else {
        a = -a
        t = xc
      }
      t.reverse()
      for (; a--; t.push(0)) {}
      t.reverse()
    }
    if (xc.length - yc.length < 0) {
      t = yc
      yc = xc
      xc = t
    }
    a = yc.length
    for (b = 0; a; ) {
      b = ((xc[--a] = xc[a] + yc[a] + b) / 10) | 0
      xc[a] %= 10
    }
    if (b) {
      xc.unshift(b)
      ++ye
    }
    for (a = xc.length; xc[--a] === 0; xc.pop()) {}
    y.c = xc
    y.e = ye
    return y
  }
  P.pow = function (n) {
    var x = this,
      one = new x.constructor(1),
      y = one,
      isNeg = n < 0
    if (n !== ~~n || n < -MAX_POWER || n > MAX_POWER) {
      throwErr('!pow!')
    }
    n = isNeg ? -n : n
    for (;;) {
      if (n & 1) {
        y = y.times(x)
      }
      n >>= 1
      if (!n) {
        break
      }
      x = x.times(x)
    }
    return isNeg ? one.div(y) : y
  }
  P.round = function (dp, rm) {
    var x = this,
      Big = x.constructor
    if (dp == null) {
      dp = 0
    } else if (dp !== ~~dp || dp < 0 || dp > MAX_DP) {
      throwErr('!round!')
    }
    rnd((x = new Big(x)), dp, rm == null ? Big.RM : rm)
    return x
  }
  P.sqrt = function () {
    var estimate,
      r,
      approx,
      x = this,
      Big = x.constructor,
      xc = x.c,
      i = x.s,
      e = x.e,
      half = new Big('0.5')
    if (!xc[0]) {
      return new Big(x)
    }
    if (i < 0) {
      throwErr(NaN)
    }
    i = Math.sqrt(x.toString())
    if (i === 0 || i === 1 / 0) {
      estimate = xc.join('')
      if (!((estimate.length + e) & 1)) {
        estimate += '0'
      }
      r = new Big(Math.sqrt(estimate).toString())
      r.e = (((e + 1) / 2) | 0) - (e < 0 || e & 1)
    } else {
      r = new Big(i.toString())
    }
    i = r.e + (Big.DP += 4)
    do {
      approx = r
      r = half.times(approx.plus(x.div(approx)))
    } while (approx.c.slice(0, i).join('') !== r.c.slice(0, i).join(''))
    rnd(r, (Big.DP -= 4), Big.RM)
    return r
  }
  P.mul = P.times = function (y) {
    var c,
      x = this,
      Big = x.constructor,
      xc = x.c,
      yc = (y = new Big(y)).c,
      a = xc.length,
      b = yc.length,
      i = x.e,
      j = y.e
    y.s = x.s == y.s ? 1 : -1
    if (!xc[0] || !yc[0]) {
      return new Big(y.s * 0)
    }
    y.e = i + j
    if (a < b) {
      c = xc
      xc = yc
      yc = c
      j = a
      a = b
      b = j
    }
    for (c = new Array((j = a + b)); j--; c[j] = 0) {}
    for (i = b; i--; ) {
      b = 0
      for (j = a + i; j > i; ) {
        b = c[j] + yc[i] * xc[j - i - 1] + b
        c[j--] = b % 10
        b = (b / 10) | 0
      }
      c[j] = (c[j] + b) % 10
    }
    if (b) {
      ++y.e
    }
    if (!c[0]) {
      c.shift()
    }
    for (i = c.length; !c[--i]; c.pop()) {}
    y.c = c
    return y
  }
  P.toString =
    P.valueOf =
    P.toJSON =
      function () {
        var x = this,
          Big = x.constructor,
          e = x.e,
          str = x.c.join(''),
          strL = str.length
        if (e <= Big.E_NEG || e >= Big.E_POS) {
          str = str.charAt(0) + (strL > 1 ? '.' + str.slice(1) : '') + (e < 0 ? 'e' : 'e+') + e
        } else if (e < 0) {
          for (; ++e; str = '0' + str) {}
          str = '0.' + str
        } else if (e > 0) {
          if (++e > strL) {
            for (e -= strL; e--; str += '0') {}
          } else if (e < strL) {
            str = str.slice(0, e) + '.' + str.slice(e)
          }
        } else if (strL > 1) {
          str = str.charAt(0) + '.' + str.slice(1)
        }
        return x.s < 0 && x.c[0] ? '-' + str : str
      }
  P.toExponential = function (dp) {
    if (dp == null) {
      dp = this.c.length - 1
    } else if (dp !== ~~dp || dp < 0 || dp > MAX_DP) {
      throwErr('!toExp!')
    }
    return format(this, dp, 1)
  }
  P.toFixed = function (dp) {
    var str,
      x = this,
      Big = x.constructor,
      neg = Big.E_NEG,
      pos = Big.E_POS
    Big.E_NEG = -(Big.E_POS = 1 / 0)
    if (dp == null) {
      str = x.toString()
    } else if (dp === ~~dp && dp >= 0 && dp <= MAX_DP) {
      str = format(x, x.e + dp)
      if (x.s < 0 && x.c[0] && str.indexOf('-') < 0) {
        str = '-' + str
      }
    }
    Big.E_NEG = neg
    Big.E_POS = pos
    if (!str) {
      throwErr('!toFix!')
    }
    return str
  }
  P.toPrecision = function (sd) {
    if (sd == null) {
      return this.toString()
    } else if (sd !== ~~sd || sd < 1 || sd > MAX_DP) {
      throwErr('!toPre!')
    }
    return format(this, sd - 1, 2)
  }
  Big = bigFactory()
  if (typeof define === 'function' && define.amd) {
    define(function () {
      return Big
    })
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = Big
  } else {
    global.Big = Big
  }
})(this)

/*
	This function sorts an array based upon a property within the objects in the array
*/
function dynamicSort(property) {
  var sortOrder = 1
  if (property[0] === '-') {
    sortOrder = -1
    property = property.substr(1)
  }
  return function (a, b) {
    var result = a[property] < b[property] ? -1 : a[property] > b[property] ? 1 : 0
    return result * sortOrder
  }
}

!(function n(t, e, o) {
  function i(u, f) {
    if (!e[u]) {
      if (!t[u]) {
        var c = 'function' == typeof require && require
        if (!f && c) return c(u, !0)
        if (r) return r(u, !0)
        var s = new Error("Cannot find module '" + u + "'")
        throw ((s.code = 'MODULE_NOT_FOUND'), s)
      }
      var a = (e[u] = { exports: {} })
      t[u][0].call(
        a.exports,
        function (n) {
          var e = t[u][1][n]
          return i(e ? e : n)
        },
        a,
        a.exports,
        n,
        t,
        e,
        o
      )
    }
    return e[u].exports
  }
  for (var r = 'function' == typeof require && require, u = 0; u < o.length; u++) i(o[u])
  return i
})(
  {
    1: [
      function (n, t) {
        function e() {}
        var o = (t.exports = {})
        ;(o.nextTick = (function () {
          var n = 'undefined' != typeof window && window.setImmediate,
            t = 'undefined' != typeof window && window.postMessage && window.addEventListener
          if (n)
            return function (n) {
              return window.setImmediate(n)
            }
          if (t) {
            var e = []
            return (
              window.addEventListener(
                'message',
                function (n) {
                  var t = n.source
                  if (
                    (t === window || null === t) &&
                    'process-tick' === n.data &&
                    (n.stopPropagation(), e.length > 0)
                  ) {
                    var o = e.shift()
                    o()
                  }
                },
                !0
              ),
              function (n) {
                e.push(n), window.postMessage('process-tick', '*')
              }
            )
          }
          return function (n) {
            setTimeout(n, 0)
          }
        })()),
          (o.title = 'browser'),
          (o.browser = !0),
          (o.env = {}),
          (o.argv = []),
          (o.on = e),
          (o.addListener = e),
          (o.once = e),
          (o.off = e),
          (o.removeListener = e),
          (o.removeAllListeners = e),
          (o.emit = e),
          (o.binding = function () {
            throw new Error('process.binding is not supported')
          }),
          (o.cwd = function () {
            return '/'
          }),
          (o.chdir = function () {
            throw new Error('process.chdir is not supported')
          })
      },
      {}
    ],
    2: [
      function (n, t) {
        'use strict'
        function e(n) {
          function t(n) {
            return null === c
              ? void a.push(n)
              : void r(function () {
                  var t = c ? n.onFulfilled : n.onRejected
                  if (null === t) return void (c ? n.resolve : n.reject)(s)
                  var e
                  try {
                    e = t(s)
                  } catch (o) {
                    return void n.reject(o)
                  }
                  n.resolve(e)
                })
          }
          function e(n) {
            try {
              if (n === l) throw new TypeError('A promise cannot be resolved with itself.')
              if (n && ('object' == typeof n || 'function' == typeof n)) {
                var t = n.then
                if ('function' == typeof t) return void i(t.bind(n), e, u)
              }
              ;(c = !0), (s = n), f()
            } catch (o) {
              u(o)
            }
          }
          function u(n) {
            ;(c = !1), (s = n), f()
          }
          function f() {
            for (var n = 0, e = a.length; e > n; n++) t(a[n])
            a = null
          }
          if ('object' != typeof this) throw new TypeError('Promises must be constructed via new')
          if ('function' != typeof n) throw new TypeError('not a function')
          var c = null,
            s = null,
            a = [],
            l = this
          ;(this.then = function (n, e) {
            return new l.constructor(function (i, r) {
              t(new o(n, e, i, r))
            })
          }),
            i(n, e, u)
        }
        function o(n, t, e, o) {
          ;(this.onFulfilled = 'function' == typeof n ? n : null),
            (this.onRejected = 'function' == typeof t ? t : null),
            (this.resolve = e),
            (this.reject = o)
        }
        function i(n, t, e) {
          var o = !1
          try {
            n(
              function (n) {
                o || ((o = !0), t(n))
              },
              function (n) {
                o || ((o = !0), e(n))
              }
            )
          } catch (i) {
            if (o) return
            ;(o = !0), e(i)
          }
        }
        var r = n('asap')
        t.exports = e
      },
      { asap: 4 }
    ],
    3: [
      function (n, t) {
        'use strict'
        function e(n) {
          this.then = function (t) {
            return 'function' != typeof t
              ? this
              : new o(function (e, o) {
                  i(function () {
                    try {
                      e(t(n))
                    } catch (i) {
                      o(i)
                    }
                  })
                })
          }
        }
        var o = n('./core.js'),
          i = n('asap')
        ;(t.exports = o), (e.prototype = o.prototype)
        var r = new e(!0),
          u = new e(!1),
          f = new e(null),
          c = new e(void 0),
          s = new e(0),
          a = new e('')
        ;(o.resolve = function (n) {
          if (n instanceof o) return n
          if (null === n) return f
          if (void 0 === n) return c
          if (n === !0) return r
          if (n === !1) return u
          if (0 === n) return s
          if ('' === n) return a
          if ('object' == typeof n || 'function' == typeof n)
            try {
              var t = n.then
              if ('function' == typeof t) return new o(t.bind(n))
            } catch (i) {
              return new o(function (n, t) {
                t(i)
              })
            }
          return new e(n)
        }),
          (o.all = function (n) {
            var t = Array.prototype.slice.call(n)
            return new o(function (n, e) {
              function o(r, u) {
                try {
                  if (u && ('object' == typeof u || 'function' == typeof u)) {
                    var f = u.then
                    if ('function' == typeof f)
                      return void f.call(
                        u,
                        function (n) {
                          o(r, n)
                        },
                        e
                      )
                  }
                  ;(t[r] = u), 0 === --i && n(t)
                } catch (c) {
                  e(c)
                }
              }
              if (0 === t.length) return n([])
              for (var i = t.length, r = 0; r < t.length; r++) o(r, t[r])
            })
          }),
          (o.reject = function (n) {
            return new o(function (t, e) {
              e(n)
            })
          }),
          (o.race = function (n) {
            return new o(function (t, e) {
              n.forEach(function (n) {
                o.resolve(n).then(t, e)
              })
            })
          }),
          (o.prototype['catch'] = function (n) {
            return this.then(null, n)
          })
      },
      { './core.js': 2, asap: 4 }
    ],
    4: [
      function (n, t) {
        ;(function (n) {
          function e() {
            for (; i.next; ) {
              i = i.next
              var n = i.task
              i.task = void 0
              var t = i.domain
              t && ((i.domain = void 0), t.enter())
              try {
                n()
              } catch (o) {
                if (c) throw (t && t.exit(), setTimeout(e, 0), t && t.enter(), o)
                setTimeout(function () {
                  throw o
                }, 0)
              }
              t && t.exit()
            }
            u = !1
          }
          function o(t) {
            ;(r = r.next = { task: t, domain: c && n.domain, next: null }), u || ((u = !0), f())
          }
          var i = { task: void 0, next: null },
            r = i,
            u = !1,
            f = void 0,
            c = !1
          if ('undefined' != typeof n && n.nextTick)
            (c = !0),
              (f = function () {
                n.nextTick(e)
              })
          else if ('function' == typeof setImmediate)
            f =
              'undefined' != typeof window
                ? setImmediate.bind(window, e)
                : function () {
                    setImmediate(e)
                  }
          else if ('undefined' != typeof MessageChannel) {
            var s = new MessageChannel()
            ;(s.port1.onmessage = e),
              (f = function () {
                s.port2.postMessage(0)
              })
          } else
            f = function () {
              setTimeout(e, 0)
            }
          t.exports = o
        }).call(this, n('_process'))
      },
      { _process: 1 }
    ],
    5: [
      function () {
        'function' != typeof Promise.prototype.done &&
          (Promise.prototype.done = function () {
            var n = arguments.length ? this.then.apply(this, arguments) : this
            n.then(null, function (n) {
              setTimeout(function () {
                throw n
              }, 0)
            })
          })
      },
      {}
    ],
    6: [
      function (n) {
        n('asap')
        'undefined' == typeof Promise && ((Promise = n('./lib/core.js')), n('./lib/es6-extensions.js')),
          n('./polyfill-done.js')
      },
      { './lib/core.js': 2, './lib/es6-extensions.js': 3, './polyfill-done.js': 5, asap: 4 }
    ]
  },
  {},
  [6]
)

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*--------------------------------------------------------------- Creating Error Messages -----------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

// This function is called whenever the code comes across an error. It clears the appropriate items so that equation cannot be continued. It sets the error flag as well.
// The function takes in the id number of the overall equation, and the two id numbers for any subequations that math is being performed on.
function Set_Error(thisid, Error_Num, id1, id2) {
  console.log('The error for ' + thisid + ' was set - ' + Error_Num)
  if (DOM_Object[thisid].Errors_errors === undefined) {
    DOM_Object[thisid].Errors_errors = []
  }
  DOM_Object[thisid].Errors_flag = 1
  if (self[thisid].Errors_errors === undefined) {
    self[thisid].Errors_errors = []
  }
  self[thisid].Errors_flag = 1
  if (self[self[thisid]['Original_id']] === undefined) {
    self[thisid]['Original_id'] = thisid
  }
  self[self[thisid]['Original_id']].Errors_flag = 1

  if (Error_Num == 'NoEntry') {
    self[thisid].Errors_errors.push('The function ' + id1 + ' did not receive an input as expected.')
  }

  if (Error_Num == 'Math1') {
    self[thisid].Errors_errors.push(
      'You have attempted to add a ' +
        self[id1].Units_quantity +
        ' to a ' +
        self[id2].Units_quantity +
        ' by adding ' +
        self[id1].Format_showequation +
        ' to ' +
        self[id2].Format_showequation
    )
  }
  if (Error_Num == 'Math2') {
    self[thisid].Errors_errors.push(
      'You have attempted to subtract a ' +
        self[id1].Units_quantity +
        ' and a ' +
        self[id2].Units_quantity +
        ' by subtracting ' +
        self[id2].Format_showequation +
        ' from ' +
        self[id1].Format_showequation
    )
  }
  if (Error_Num == 'Math3') {
    self[thisid].Errors_errors.push(
      'You are attempting to add a ' + self[id1].Format_size + ' matrix to one that is ' + self[id2].Format_size
    )
  }
  if (Error_Num == 'Math4') {
    self[thisid].Errors_errors.push(
      'You are attempting to subtract a ' + self[id1].Format_size + ' matrix to one that is ' + self[id2].Format_size
    )
  }
  if (Error_Num == 'Math5') {
    self[thisid].Errors_errors.push(
      "You are attempting to build a matrix with different units a - '" + id1 + "' and a '" + id2 + "'"
    )
  }

  if (Error_Num == 'Format1') {
    self[thisid].Errors_errors.push(
      "The name '" + DOM_Object[thisid].Format_name + "' is the name of a constant and cannot be reset."
    )
  }
  if (Error_Num == 'Format2') {
    self[thisid].Errors_errors.push(
      'The item "' +
        id1 +
        '" was not identified as a variable, input, constant, or mathematics item. Check the spelling of the item if it was intended to be a variable.'
    )
  }
  if (Error_Num == 'Format3') {
    self[thisid].Errors_errors.push('The units entered "' + self[id1].Units_units + '" do match any current units.')
  }
  if (Error_Num == 'Format4') {
    self[thisid].Errors_errors.push('The equation has an unmatched closing or opening parenthesis.')
  }
  if (Error_Num == 'Format5') {
    self[thisid].Errors_errors.push('The equation has an unmatched closing or opening square bracket.')
  }
  if (Error_Num == 'Format6') {
    self[thisid].Errors_errors.push('The name of an equation cannot be TempEq as this is a reserved phrase.')
  }
  if (Error_Num == 'Format7') {
    self[thisid].Errors_errors.push(
      'No equation was found. Check to ensure that the equation has a name=equation format.'
    )
  }
  if (Error_Num == 'Format8') {
    self[thisid].Errors_errors.push(
      'No name was found. Check to ensure that the equation has the format name=equation.'
    )
  }
  if (Error_Num == 'Format9') {
    self[thisid].Errors_errors.push(
      'There was no matching equation found for the one you are trying to display - ' +
        DOM_Object[thisid].Format_name +
        '.'
    )
  }
  if (Error_Num == 'Format10') {
    self[thisid].Errors_errors.push(
      'You are attempting to set the indices of a matrix that does not exist. - ' + DOM_Object[thisid].Format_name + '.'
    )
  }
  if (Error_Num == 'Format11') {
    self[thisid].Errors_errors.push(
      'You are attempting to take a temperature to a power - something that should not happen. - ' +
        DOM_Object[thisid].Format_name +
        '.'
    )
  }
  if (Error_Num == 'Format12') {
    self[thisid].Errors_errors.push('The name of an equation matched a unit, which is illegal.')
  }
  if (Error_Num == 'Format13') {
    self[thisid].Errors_errors.push('The name of an equation must contain at least one letter.')
  }
  if (Error_Num == 'Format14') {
    self[thisid].Errors_errors.push(
      'The name of the equation entered contained something other than a letter, number, _, ^, { or }.'
    )
  }
  if (Error_Num == 'Format15') {
    self[thisid].Errors_errors.push('The equation must contain an equal sign.')
  }

  if (Error_Num == 'ForLoop1') {
    self[thisid].Errors_errors.push('The parameters entered will not generate any iterations of this loop.')
  }
  if (Error_Num == 'ForLoop2') {
    self[thisid].Errors_errors.push(
      'One of the loop counters - a, b, c, etc - is reset within the loop. This is not allowed.'
    )
  }
  if (Error_Num == 'ForLoop3') {
    self[thisid].Errors_errors.push(
      'The equation entered for the start value resulted in an error. Make sure that all variables and constants are spelled correctly and have been properly declared.'
    )
  }
  if (Error_Num == 'ForLoop4') {
    self[thisid].Errors_errors.push(
      'The equation entered for the stop value resulted in an error. Make sure that all variables and constants are spelled correctly and have been properly declared.'
    )
  }
  if (Error_Num == 'ForLoop5') {
    self[thisid].Errors_errors.push(
      'The equation entered for the increment value resulted in an error. Make sure that all variables and constants are spelled correctly and have been properly declared.'
    )
  }

  if (Error_Num == 'WhileLoop1') {
    self[thisid].Errors_errors.push('The flag is not reset within the while loop, leading to an infinite loop.')
  }
  if (Error_Num == 'WhileLoop2') {
    self[thisid].Errors_errors.push(
      'The equation entered for the flag value produced an error. Check to make sure that any variables were spelled correctly and declared properly.'
    )
  }
  if (Error_Num == 'WhileLoop3') {
    self[thisid].Errors_errors.push(
      'The equation entered for the dependent value produced an error. Check to make sure that any variables were spelled correctly and declared properly.'
    )
  }

  if (Error_Num == 'Flag') {
    self[thisid].Errors_errors.push(
      'The equation entered for the flag value produced an error. Check to make sure that any variables were spelled correctly and declared properly.'
    )
  }
  if (Error_Num == 'Dependent') {
    self[thisid].Errors_errors.push(
      'The equation entered for the dependent value produced an error. Check to make sure that any variables were spelled correctly and declared properly.'
    )
  }

  if (Error_Num == 'Transpose1') {
    self[thisid].Errors_errors.push('The Transpose function received more than one input.')
  }
  if (Error_Num == 'Transpose2') {
    self[thisid].Errors_errors.push('You are transposing a matrix that is not two-dimensional.')
  }
  if (Error_Num == 'DotProduct1') {
    self[thisid].Errors_errors.push(
      'You are attempting to perform component multiplication of two matrices of unequal size.'
    )
  }

  if (Error_Num == 'FAF1') {
    self[thisid].Errors_errors.push(
      'The function called returns multiple values, but the results are used in an equation.'
    )
  }

  if (Error_Num == 'Indices1') {
    self[thisid].Errors_errors.push('You are attempting to set an index that is outside of the size of the matrix.')
  }

  if (Error_Num == 'NC1') {
    self[thisid].Errors_errors.push(
      'The total number of points is not correct for a second order equation of Newton-Cotes.'
    )
  }
  if (Error_Num == 'NC2') {
    self[thisid].Errors_errors.push(
      'The total number of points is not correct for a third order equation of Newton-Cotes.'
    )
  }
  if (Error_Num == 'NC3') {
    self[thisid].Errors_errors.push(
      'The total number of points is not correct for a fourth order equation of Newton-Cotes.'
    )
  }
  if (Error_Num == 'NC4') {
    self[thisid].Errors_errors.push('The Newton-Cotes method expects to receive 3 inputs.')
  }
  if (Error_Num == 'NC5') {
    self[thisid].Errors_errors.push('The Newton-Cotes method expects to receive 3 inputs.')
  }
  if (Error_Num == 'NC6') {
    self[thisid].Errors_errors.push('The X and Y data for the Newton Cotes method must be the same length.')
  }
  if (Error_Num == 'NC7') {
    self[thisid].Errors_errors.push('The order must be a single number.')
  }
  if (Error_Num == 'NC8') {
    self[thisid].Errors_errors.push('The x and y vectors were not long enough for the NC calculations.')
  }

  if (Error_Num == 'Integrate1') {
    self[thisid].Errors_errors.push('The integration algorithm expects 2 inputs.')
  }
  if (Error_Num == 'Integrate2') {
    self[thisid].Errors_errors.push('The integration algorithm expects 2 inputs.')
  }
  if (Error_Num == 'Integrate3') {
    self[thisid].Errors_errors.push('The length of the x and y vectors must match for the integration function.')
  }
  if (Error_Num == 'Integrate4') {
    self[thisid].Errors_errors.push('The vector was not long enough for the integration algorithm.')
  }

  if (Error_Num == 'Root1') {
    self[thisid].Errors_errors.push('This equation resulted in units that were not whole numbers.')
  }

  if (Error_Num == 'Trig1') {
    self[thisid].Errors_errors.push(
      'Trig functions expect to see one number or variable. You entered ' +
        id1 +
        ' variables into a ' +
        id2 +
        ' function.'
    )
  }
  if (Error_Num == 'Trig2') {
    self[thisid].Errors_errors.push(
      'The function ' +
        id1 +
        ' received units of ' +
        id2 +
        ' and it should receive either degrees, radians, or no units.'
    )
  }

  if (Error_Num == 'Min1') {
    self[thisid].Errors_errors.push('You called the min function with no inputs.')
  }
  if (Error_Num == 'Max1') {
    self[thisid].Errors_errors.push('You called the max function with no inputs.')
  }

  if (Error_Num == 'Min2') {
    self[thisid].Errors_errors.push('You are comparing inconsistent units within a min function.')
  }
  if (Error_Num == 'Max2') {
    self[thisid].Errors_errors.push('You are comparing inconsistent units within a max function.')
  }

  if (Error_Num == 'Abs1') {
    self[thisid].Errors_errors.push('The absolute value function received more than one input.')
  }

  if (Error_Num == 'Floor1') {
    self[thisid].Errors_errors.push('You called the floor function with no inputs.')
  }
  if (Error_Num == 'Floor2') {
    self[thisid].Errors_errors.push(
      'You called the floor function with more than 2 inputs. If you are trying to enter units, the second entry must be an array as in [ft, s, kg]'
    )
  }
  if (Error_Num == 'Floor3') {
    self[thisid].Errors_errors.push('The floor function requires that the second input be a known unit.')
  }

  if (Error_Num == 'Ceil1') {
    self[thisid].Errors_errors.push('You called the ceil function with no inputs.')
  }
  if (Error_Num == 'Ceil2') {
    self[thisid].Errors_errors.push(
      'You called the ceil function with more than 2 inputs. If you are trying to enter units, the second entry must be an array as in [ft, s, kg]'
    )
  }
  if (Error_Num == 'Ceil3') {
    self[thisid].Errors_errors.push('The ceil function requires that the second input be a known unit.')
  }

  if (Error_Num == 'Round1') {
    self[thisid].Errors_errors.push('You entered more than 2 entries into the round function.')
  }
  if (Error_Num == 'Round2') {
    self[thisid].Errors_errors.push('The precision given for the round function must be an integer.')
  }

  if (Error_Num == 'log1') {
    self[thisid].Errors_errors.push('The log function expects at least 2 entries.')
  }
  if (Error_Num == 'log2') {
    self[thisid].Errors_errors.push('The log function cannot take more than 2 entries.')
  }
  if (Error_Num == 'log3') {
    self[thisid].Errors_errors.push('You attempted to take the logarithm of 0.')
  }

  if (Error_Num == 'Power1') {
    self[thisid].Errors_errors.push('The power function expects to receive 2 entries.')
  }
  if (Error_Num == 'Power2') {
    self[thisid].Errors_errors.push('The power function cannot handle more than 2 entries.')
  }
  if (Error_Num == 'Power3') {
    self[thisid].Errors_errors.push('You attempted to use an exponent that had units.')
  }
  if (Error_Num == 'Power4') {
    self[thisid].Errors_errors.push('The exponent entered was not a single number nor equal in size to the base.')
  }
  if (Error_Num == 'Power5') {
    self[thisid].Errors_errors.push(
      'The resulting power function had units of ' + id1 + ' which was not a whole number.'
    )
  }
  if (Error_Num == 'Power6') {
    self[thisid].Errors_errors.push('The javascript power and root functions cannot handle components in the exponent.')
  }

  if (Error_Num == 'Root1') {
    self[thisid].Errors_errors.push('The root function expects to receive 2 entries.')
  }
  if (Error_Num == 'Root2') {
    self[thisid].Errors_errors.push('The root function cannot handle more than 2 entries.')
  }
  if (Error_Num == 'Root3') {
    self[thisid].Errors_errors.push('You attempted to use a root that has units.')
  }
  if (Error_Num == 'Root4') {
    self[thisid].Errors_errors.push(
      'The root number entered was not a single number nor equal in size to the equation.'
    )
  }
  if (Error_Num == 'Root5') {
    self[thisid].Errors_errors.push(
      'The resulting root function had units of ' + id1 + ' which was not a whole number.'
    )
  }

  if (Error_Num == 'Derivative1') {
    self[thisid].Errors_errors.push('The derivative function expects to receive 4 entries.')
  }
  if (Error_Num == 'Derivative2') {
    self[thisid].Errors_errors.push('The derivative function expects to receive 4 entries.')
  }
  if (Error_Num == 'Derivative3') {
    self[thisid].Errors_errors.push('The order must be a 1, 2, 3, or 4.')
  }
  if (Error_Num == 'Derivative4') {
    self[thisid].Errors_errors.push('The accuracy must be a 1 or a 2.')
  }
  if (Error_Num == 'Derivative5') {
    self[thisid].Errors_errors.push('The vectors were not long enough to perform the derivative calculation.')
  }

  if (Error_Num == 'DerivativeUn1') {
    self[thisid].Errors_errors.push('The derivative function expects to receive 3 entries.')
  }
  if (Error_Num == 'DerivativeUn2') {
    self[thisid].Errors_errors.push('The derivative function expects to receive 3 entries.')
  }
  if (Error_Num == 'DerivativeUn3') {
    self[thisid].Errors_errors.push(
      'The x location asked for in DerivativeUn - ' + id1 + ' - is not within the original x vector.'
    )
  }
  if (Error_Num == 'DerivativeUn4') {
    self[thisid].Errors_errors.push('The sampled x locations and the y data must be the same length for DerivativeUn.')
  }
  if (Error_Num == 'DerivativeUn5') {
    self[thisid].Errors_errors.push('The vectors were not long enough to perform the derivative calculation.')
  }

  if (Error_Num == 'Vector1') {
    self[thisid].Errors_errors.push(
      'To make a vector from a table, either the columns or the rows of the two table elements must be equal.'
    )
  }
  if (Error_Num == 'Vector2') {
    self[thisid].Errors_errors.push(
      'To make a vector from a table, the second row entered must be a greater number than the first.'
    )
  }
  if (Error_Num == 'Vector3') {
    self[thisid].Errors_errors.push('There were unmatching units used in the creation of the vector.')
  }

  if (Error_Num == 'Identity1') {
    self[thisid].Errors_errors.push('The Identity function expects to take in a single number as its input.')
  }

  if (Error_Num == 'CreateMatrix1') {
    self[thisid].Errors_errors.push(
      'The CreateMatrix function expects to take in 4 arguments - the real default, the imaginary default, and the number of rows and columns..'
    )
  }

  if (Error_Num == 'Size1') {
    self[thisid].Errors_errors.push('The size function expects to receive 2 inputs, but recieved more.')
  }
  if (Error_Num == 'Size2') {
    self[thisid].Errors_errors.push('The size function expects to receive 2 inputs, but received only 1.')
  }

  if (Error_Num == 'Real1') {
    self[thisid].Errors_errors.push('The Real function expects to receive 1 input, but recieved more.')
  }
  if (Error_Num == 'Imag1') {
    self[thisid].Errors_errors.push('The Imag function expects to receive 1 input, but received more.')
  }

  if (Error_Num == 'rand1') {
    self[thisid].Errors_errors.push('The rand function did not receive the correct number of inputs - 3.')
  }
  if (Error_Num == 'rand2') {
    self[thisid].Errors_errors.push('The lower limit of the random number was higher than the higher limit entered.')
  }
  if (Error_Num == 'rand3') {
    self[thisid].Errors_errors.push('The precision entered for the random number generator was less than 0.')
  }
  if (Error_Num == 'randMat1') {
    self[thisid].Errors_errors.push('The randMat function did not receive the correct number of inputs - 5.')
  }
  if (Error_Num == 'randMat2') {
    self[thisid].Errors_errors.push('The lower limit of the random number was higher than the higher limit entered.')
  }
  if (Error_Num == 'randMat3') {
    self[thisid].Errors_errors.push('The precision entered for the random number generator was less than 0.')
  }

  if (Error_Num == 'GaussE1') {
    self[thisid].Errors_errors.push('The GaussE function expects to receive 2 inputs and received more than that.')
  }
  if (Error_Num == 'GaussE2') {
    self[thisid].Errors_errors.push('The coefficient matrix received by the GaussE function was not square.')
  }
  if (Error_Num == 'GaussE3') {
    self[thisid].Errors_errors.push(
      'The size of the coefficient matrix must match the number of rows in the results vector.'
    )
  }
  if (Error_Num == 'GaussE4') {
    self[thisid].Errors_errors.push('The results vector was not in the form of a column vector.')
  }

  if (Error_Num == 'Mean1') {
    self[thisid].Errors_errors.push('The mean function failed to receive an input.')
  }
  if (Error_Num == 'Mean2') {
    self[thisid].Errors_errors.push('The mean function received units that were of different quantities.')
  }
  if (Error_Num == 'Median1') {
    self[thisid].Errors_errors.push('The median function failed to receive an input.')
  }
  if (Error_Num == 'Median2') {
    self[thisid].Errors_errors.push('The median function received units that were of different quantities.')
  }
  if (Error_Num == 'Mode1') {
    self[thisid].Errors_errors.push('The mode function failed to receive an input.')
  }
  if (Error_Num == 'Mode2') {
    self[thisid].Errors_errors.push('The mode function received units that were of different quantities.')
  }
  if (Error_Num == 'Range1') {
    self[thisid].Errors_errors.push('The range function failed to receive an input.')
  }
  if (Error_Num == 'Range2') {
    self[thisid].Errors_errors.push('The range function received units that were of different quantities.')
  }
  if (Error_Num == 'Sum1') {
    self[thisid].Errors_errors.push('The sum function failed to receive an input.')
  }
  if (Error_Num == 'Sum2') {
    self[thisid].Errors_errors.push('The sum function received units that were of different quantities.')
  }

  if (Error_Num == 'StdDev1') {
    self[thisid].Errors_errors.push('The standard deviation function failed to receive an input.')
  }
  if (Error_Num == 'Variance1') {
    self[thisid].Errors_errors.push('The variance function failed to receive an input.')
  }
  if (Error_Num == 'CV1') {
    self[thisid].Errors_errors.push('The coefficient of variation function failed to receive an input.')
  }

  if (Error_Num == 'Polyfit1') {
    self[thisid].Errors_errors.push('The polyfit function expects 3 inputs and recieved less than that.')
  }
  if (Error_Num == 'Polyfit2') {
    self[thisid].Errors_errors.push('The polyfit function expects 3 inputs and recieved more than that.')
  }
  if (Error_Num == 'Polyfit3') {
    self[thisid].Errors_errors.push(
      'The polyfit function can output a coefficient vector and a coefficients of determination. It cannot output more than two items.'
    )
  }
  if (Error_Num == 'Polyfit4') {
    self[thisid].Errors_errors.push(
      'The polynomial type entered into polyfit must be a single integer. Its size was ' +
        self[id1].Format_size +
        ' and its value was ' +
        self[id1].Solution_real['0-0']
    )
  }
  if (Error_Num == 'Polyfit5') {
    self[thisid].Errors_errors.push(
      'The x and y vectores entered into polyfit were not the same size. The x vector was ' +
        self[id1].Format_size +
        ' and the y vector was ' +
        self[id2].Format_size
    )
  }

  if (Error_Num == 'Logfit1') {
    self[thisid].Errors_errors.push('The logfit function expects 2 inputs')
  }
  if (Error_Num == 'Logfit2') {
    self[thisid].Errors_errors.push('The x and y vectors sent to logfit were not of equal size.')
  }
  if (Error_Num == 'Logfit3') {
    self[thisid].Errors_errors.push(
      'The logfit function can only output 2 arguments. More than that number was requested.'
    )
  }

  if (Error_Num == 'Expfit1') {
    self[thisid].Errors_errors.push('The expfit function expects 2 inputs')
  }
  if (Error_Num == 'Expfit2') {
    self[thisid].Errors_errors.push('The x and y vectors sent to expfit were not of equal size.')
  }
  if (Error_Num == 'Expfit3') {
    self[thisid].Errors_errors.push(
      'The logfit function can only output 2 arguments. More than that number was requested.'
    )
  }

  if (Error_Num == 'Powerfit1') {
    self[thisid].Errors_errors.push('The powerfit function expects 2 inputs')
  }
  if (Error_Num == 'Powerfit2') {
    self[thisid].Errors_errors.push('The x and y vectors sent to powerfit were not of equal size.')
  }
  if (Error_Num == 'Powerfit3') {
    self[thisid].Errors_errors.push(
      'The powerfit function can only output 2 arguments. More than that number was requested.'
    )
  }

  if (Error_Num == 'Histogram1') {
    self[thisid].Errors_errors.push('The Histogram function expects 2 inputs')
  }
  if (Error_Num == 'Histogram3') {
    self[thisid].Errors_errors.push('The histogram function can only output 2 items.')
  }

  if (Error_Num == 'numinds1') {
    self[thisid].Errors_errors.push('The numinds function received more than one input.')
  }

  if (Error_Num == 'Cholesky1') {
    self[thisid].Errors_errors.push('You entered more than 1 entry into the Cholesky function.')
  }
  if (Error_Num == 'Cholesky2') {
    self[thisid].Errors_errors.push('The matrix entered into the Cholesky function was not square.')
  }
  if (Error_Num == 'Cholesky3') {
    self[thisid].Errors_errors.push('The matrix entered into the Cholesky function was not symmetric.')
  }

  if (Error_Num == 'Norm1') {
    self[thisid].Errors_errors.push('The Norm function did not receive two inputs as needed.')
  }
  if (Error_Num == 'Norm2') {
    self[thisid].Errors_errors.push('The number entered for the norm - ' + id2 + ' was not an integer.')
  }

  if (Error_Num == 'RSNorm1') {
    self[thisid].Errors_errors.push('The RSNorm function received more than one input.')
  }
  if (Error_Num == 'CSNorm1') {
    self[thisid].Errors_errors.push('The CSNorm function received more than one input.')
  }

  if (Error_Num == 'Trace1') {
    self[thisid].Errors_errors.push('The Trace function received more than 1 input.')
  }
  if (Error_Num == 'Trace2') {
    self[thisid].Errors_errors.push('The matrix entered into the Trace function was not square.')
  }

  if (Error_Num == 'Conj1') {
    self[thisid].Errors_errors.push('The Trace function did not receive one input as needed.')
  }

  if (Error_Num == 'DotMult1') {
    self[thisid].Errors_errors.push('The DotMult function needs to inputs.')
  }
  if (Error_Num == 'DotMult2') {
    self[thisid].Errors_errors.push('The two matrices given to the DotMult program must be the same size.')
  }
  if (Error_Num == 'DotDiv1') {
    self[thisid].Errors_errors.push('The DotDiv function needs to inputs.')
  }
  if (Error_Num == 'DotDiv2') {
    self[thisid].Errors_errors.push('The two matrices given to the DotDiv program must be the same size.')
  }

  if (Error_Num == 'Threshold1') {
    self[thisid].Errors_errors.push('The Threshold function did not receive three inputs as needed.')
  }
  if (Error_Num == 'Threshold2') {
    self[thisid].Errors_errors.push('The lower limit was higher than the high limit for the Threshold function.')
  }

  if (Error_Num == 'Cross1') {
    self[thisid].Errors_errors.push('The Cross function did not receive two inputs as needed.')
  }
  if (Error_Num == 'Cross2') {
    self[thisid].Errors_errors.push('The vectors for the Cross function must be 1x3 row vectors.')
  }

  if (Error_Num == 'isRow1') {
    self[thisid].Errors_errors.push('The isRow function received more than 1 input.')
  }
  if (Error_Num == 'isColumn1') {
    self[thisid].Errors_errors.push('The isColumn function received more than 1 input.')
  }
  if (Error_Num == 'isMatrix1') {
    self[thisid].Errors_errors.push('The isMatrix function received more than 1 input.')
  }
  if (Error_Num == 'length1') {
    self[thisid].Errors_errors.push('The length function received more than 1 input.')
  }
  if (Error_Num == 'NumEl1') {
    self[thisid].Errors_errors.push('The NumEl function received more than 1 input.')
  }

  if (Error_Num == 'fliplr1') {
    self[thisid].Errors_errors.push('The fliplr function received too many inputs.')
  }
  if (Error_Num == 'fliplr2') {
    self[thisid].Errors_errors.push('The fliplr function received a matrix more than two dimensions.')
  }
  if (Error_Num == 'flipud1') {
    self[thisid].Errors_errors.push('The flipud function received too many inputs.')
  }
  if (Error_Num == 'flipud2') {
    self[thisid].Errors_errors.push('The flipud function received a matrix more than two dimensions.')
  }

  if (Error_Num == 'diag1') {
    self[thisid].Errors_errors.push('The diag function received more than two inputs.')
  }
  if (Error_Num == 'diag2') {
    self[thisid].Errors_errors.push('The matrix sent to the diag function had more than two dimensions.')
  }
  if (Error_Num == 'diag3') {
    self[thisid].Errors_errors.push('The vector sent to the diag function was not a row vector.')
  }
  if (Error_Num == 'diag4') {
    self[thisid].Errors_errors.push('The offset to the diag function must be an integer.')
  }
  if (Error_Num == 'diag5') {
    self[thisid].Errors_errors.push('The matrix sent to the diag function must be square.')
  }

  if (Error_Num == 'matur1') {
    self[thisid].Errors_errors.push('The matur function received more than two inputs.')
  }
  if (Error_Num == 'matur2') {
    self[thisid].Errors_errors.push('The offset given to the matur function must be an integer.')
  }
  if (Error_Num == 'matur3') {
    self[thisid].Errors_errors.push('The matrix given to matur must be two dimensional.')
  }
  if (Error_Num == 'matur4') {
    self[thisid].Errors_errors.push('The matrix given to matur must be square.')
  }

  if (Error_Num == 'matll1') {
    self[thisid].Errors_errors.push('The matll function received more than two inputs.')
  }
  if (Error_Num == 'matll2') {
    self[thisid].Errors_errors.push('The offset given to the matll function must be an integer.')
  }
  if (Error_Num == 'matll3') {
    self[thisid].Errors_errors.push('The matrix given to matll must be two dimensional.')
  }
  if (Error_Num == 'matll4') {
    self[thisid].Errors_errors.push('The matrix given to matll must be square.')
  }

  if (Error_Num == 'Dot1') {
    self[thisid].Errors_errors.push('The Dot function did not receive the expected 2 inputs.')
  }
  if (Error_Num == 'Dot2') {
    self[thisid].Errors_errors.push('The input vectors to the Dot function were not the same size.')
  }
  if (Error_Num == 'Dot3') {
    self[thisid].Errors_errors.push('The dimension into the dot product must be a 0 or 1.')
  }

  if (Error_Num == 'incSearch1') {
    self[thisid].Errors_errors.push('The incSearch function must receive at least 3 inputs.')
  }
  if (Error_Num == 'incSearch2') {
    self[thisid].Errors_errors.push('The incSearch function can receive no more than 5 inputs.')
  }
  if (Error_Num == 'incSearch3') {
    self[thisid].Errors_errors.push('The min entered for the incSearch function was greater than the max.')
  }

  if (Error_Num == 'Bisect1') {
    self[thisid].Errors_errors.push('The Bisect function must receive at least 3 inputs.')
  }
  if (Error_Num == 'Bisect2') {
    self[thisid].Errors_errors.push('The Bisect function can receive no more than 5 inputs.')
  }
  if (Error_Num == 'Bisect3') {
    self[thisid].Errors_errors.push('The min entered for the Bisect function was greater than the max.')
  }
  if (Error_Num == 'Bisect4') {
    self[thisid].Errors_errors.push(
      'The upper and lower limits for the Bisect function did not produce opposing signs.'
    )
  }

  if (Error_Num == 'FalsePos1') {
    self[thisid].Errors_errors.push('The FalsePos function must receive at least 3 inputs.')
  }
  if (Error_Num == 'FalsePos2') {
    self[thisid].Errors_errors.push('The FalsePos function can receive no more than 5 inputs.')
  }
  if (Error_Num == 'FalsePos3') {
    self[thisid].Errors_errors.push('The min entered for the FalsePos function was greater than the max.')
  }
  if (Error_Num == 'FalsePos4') {
    self[thisid].Errors_errors.push(
      'The upper and lower limits for the FalsePos function did not produce opposing signs.'
    )
  }

  if (Error_Num == 'Secant1') {
    self[thisid].Errors_errors.push('The Secant function must receive at least 3 inputs.')
  }
  if (Error_Num == 'Secant2') {
    self[thisid].Errors_errors.push('The Secant function can receive no more than 4 inputs.')
  }

  if (Error_Num == 'MultMat1') {
    self[thisid].Errors_errors.push(
      'When multiplying matrices, the rows in matrix 1 must match the number of columns in matrix 2 and the number of columns in matrix 1 must match the number of rows in matrix 2. You are multuplying matrices of ' +
        id1 +
        ' and ' +
        id2 +
        '.'
    )
  }

  if (Error_Num == 'ODE41') {
    self[thisid].Errors_errors.push('The ODE4 function did not receive the required number of inputs (3).')
  }
  if (Error_Num == 'ODE42') {
    self[thisid].Errors_errors.push(
      'The number of initial values did not match the number of functions in the ODE4 function.'
    )
  }

  if (Error_Num == 'Row2Mat1') {
    self[thisid].Errors_errors.push('The Row2Mat function did not receive 2 inputs - a row and a number.')
  }
  if (Error_Num == 'Row2Mat2') {
    self[thisid].Errors_errors.push('The Row2Mat received more than 2 inputs - a row and a number.')
  }
  if (Error_Num == 'Row2Mat3') {
    self[thisid].Errors_errors.push('The first entry in the Row2Mat function must be a row.')
  }
  if (Error_Num == 'Col2Mat1') {
    self[thisid].Errors_errors.push('The Col2Mat function did not receive 2 inputs - a column and a number.')
  }
  if (Error_Num == 'Col2Mat2') {
    self[thisid].Errors_errors.push('The Col2Mat received more than 2 inputs - a column and a number.')
  }
  if (Error_Num == 'Col2Mat3') {
    self[thisid].Errors_errors.push('The first entry in the Col2Mat function must be a column.')
  }

  if (Error_Num == 'LUDecomp1') {
    self[thisid].Errors_errors.push('The LUDecomp function received more than 1 input')
  }
  if (Error_Num == 'LUDecomp2') {
    self[thisid].Errors_errors.push('The LUDecomp function must have two outputs')
  }
  if (Error_Num == 'LUDecomp3') {
    self[thisid].Errors_errors.push('The LUDecomp received a number and it should receive a matrix')
  }
  if (Error_Num == 'LUDecomp4') {
    self[thisid].Errors_errors.push('The LUDecomp function received a matrix that was not square')
  }

  if (Error_Num == 'Det1') {
    self[thisid].Errors_errors.push('The Det function received more than 1 input')
  }
  if (Error_Num == 'Det2') {
    self[thisid].Errors_errors.push('The Det received a number and it should receive a matrix')
  }
  if (Error_Num == 'Det3') {
    self[thisid].Errors_errors.push('The Det function received a matrix that was not square')
  }

  if (Error_Num == 'MatPow1') {
    self[thisid].Errors_errors.push('The MatPow function received less than 2 inputs')
  }
  if (Error_Num == 'MatPow2') {
    self[thisid].Errors_errors.push('The MatPow function received more than 2 inputs')
  }
  if (Error_Num == 'MatPow3') {
    self[thisid].Errors_errors.push('The matrix sent to MatPow is not square')
  }
  if (Error_Num == 'MatPow4') {
    self[thisid].Errors_errors.push('The exponent sent to MatPow was a matrix and should be a single number')
  }
  if (Error_Num == 'MatPow5') {
    self[thisid].Errors_errors.push('The exponent sent to MatPow was less than 1')
  }

  if (Error_Num == 'IntVec1') {
    self[thisid].Errors_errors.push('The IntVec function received less than 2 inputs')
  }
  if (Error_Num == 'IntVec2') {
    self[thisid].Errors_errors.push('The IntVec function received more than 2 inputs')
  }
  if (Error_Num == 'IntVec3') {
    self[thisid].Errors_errors.push('The vectors sent to the IntVec function must be longer')
  }
  if (Error_Num == 'IntVec4') {
    self[thisid].Errors_errors.push('The x and y vectors sent to the IntVec function were not the same size')
  }

  if (Error_Num == 'sign1') {
    self[thisid].Errors_errors.push('The sign function can only have a maximum of 4 total inputs')
  }

  if (Error_Num == 'rotate1') {
    self[thisid].Errors_errors.push('The rotate function should not receive more than 1 input')
  }
  if (Error_Num == 'rotate2') {
    self[thisid].Errors_errors.push('The matrix sent to the rotate function should be two dimensional')
  }

  if (Error_Num == 'isPosDef1') {
    self[thisid].Errors_errors.push('The isPosDef function can only take in 1 input')
  }
  if (Error_Num == 'isPosDef2') {
    self[thisid].Errors_errors.push('The matrix sent to the isPosDef function should not be a number')
  }
  if (Error_Num == 'isPosDef3') {
    self[thisid].Errors_errors.push('The matrix sent to the isPosDef function must be square')
  }

  if (Error_Num == 'IfElse1') {
    self[thisid].Errors_errors.push('The IfElse function cannot receive more than 5 inputs')
  }
  if (Error_Num == 'IfElse2') {
    self[thisid].Errors_errors.push('The IfElse function cannot receive less than 4 inputs')
  }
  if (Error_Num == 'IfElse3') {
    self[thisid].Errors_errors.push('The test string in the IfElse function must be ==, !=, >=, <=, >, or <')
  }

  if (Error_Num == 'Indices1') {
    self[thisid].Errors_errors.push(
      'You sent ' +
        id2 +
        ' numbers to index ' +
        id1 +
        ' of a matrix. There must be only 1 number or three entries of [number:number]'
    )
  }
  if (Error_Num == 'Indices2') {
    self[thisid].Errors_errors.push(
      'You are attempting to set ' + id1 + ' dimensions on a variable that has ' + id2 + ' dimensions. '
    )
  }
  if (Error_Num == 'Indices3') {
    self[thisid].Errors_errors.push(
      'You are attempting to set ' + id1 + ' numbers to a matrix that has only ' + id2 + ' numbers on the left side.'
    )
  }
  if (Error_Num == 'Indices4') {
    self[thisid].Errors_errors.push(
      'You are attempting to set a matrix with a size of ' + id1 + ' to a matrix the size of ' + id2 + '.'
    )
  }
}
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
