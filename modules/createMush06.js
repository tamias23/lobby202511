/*
pour identifier les bords de chaque joueur : 
trouver les 2 square les plus au nord/sud
prendre le centre x
tous les vertices qui appartiennent a 1 ou 2 squares et qui sont plus haut/bas que x appartiennent au bord
*/

/*
https://www.alamy.com/double-shape-of-trapezoid-design-image402272427.html
https://www.alamy.com/2d-black-shapes-set-with-vocabulary-in-english-with-their-name-clip-art-collection-for-child-learning-geometric-shapes-flash-card-of-preschool-kids-image453385359.html
quatrefoil
trifecta

*/

const fs = require('fs');
let dataFolder = '../data/';

function setDataFolder(dataFolder0){
  dataFolder = dataFolder0;
}



function getRandomFilename(){
    let files = fs.readdirSync(dataFolder);
    let indice = Math.floor(Math.random() * (files.length)) 
    //console.log('indice =', indice)
    return files[indice].replace('_board.json', '');
}

function getMainPage(boardFilename, allPiecesDict, whatColorToDrawFor, timeInfo) {
    let makeItBlack = 'no';

    const myColors = {
        'orange' : 'rgb(100%,54.901961%,0%)',
        'blue' : 'rgb(20%,60%,100%)',
        'green' : 'rgb(0%,80%,32.156863%)',
        'grey' : 'rgb(66.666667%,66.666667%,66.666667%)',
        'yellow' : 'rgb(100.0%,95.0%,0%)',
        'white' : 'rgb(100.0%,100.0%,100.0%)',
        'purple' : 'rgb(80.0%,40.0%,100.0%)',
        //'black' : 'rgb(0.0%,0.0%,0.0%)',
        'black' : 'black',
        'purple2' : '#a569bd',
        'purple3' : '#4a235a',
        'red1' : ' #e74c3c',
        'red2' : ' #DE3163',
        'red3' : '#f50c4f',
        'red4' : '#800000',
        'gold1' : '#d4ac0d',
        'gold2' : '#f4d03f',
        'fuchsia' : '#FF00FF',
    };



    let colorWhiteStroke = 'black';
    let colorWhiteFill = 'white';
    let colorYellowStroke = 'black';
    let colorYellowFill = 'black'; //red4 fuchsia black yellow

    if (colorYellowFill === 'black'){
        makeItBlack = 'yes';
    }

    console.log('BoardFilename = ' + boardFilename)
    let board = JSON.parse(fs.readFileSync(dataFolder + boardFilename + '_board.json'));  
    //let board = require('./data/' + boardFilename + '_board.json'); 
    let bg_polys = board.allPolygons; 
    let bg_edges = board.allEdges; 


    const beautify = require('beautify');

    let jsdom = require('jsdom');
    const { JSDOM } = jsdom;
    const dom = new JSDOM('<!DOCTYPE html><body></body>');

    let head = dom.window.document.querySelector('head');



    let css = dom.window.document.createElement('link');
    css.setAttribute('rel', 'stylesheet');
    css.setAttribute('href', 'myFirstCSS.css');
    head.appendChild(css);

    let script = dom.window.document.createElement('script');
    script.setAttribute('src', '/socket.io/socket.io.js');
    head.appendChild(script);

    script = dom.window.document.createElement('script');
    script.setAttribute('src', 'main.js');
    script.setAttribute('type', 'module');
    head.appendChild(script);



    let body = dom.window.document.querySelector('body');



    let ns = 'http://www.w3.org/2000/svg';
    let svg = dom.window.document.createElementNS(ns, 'svg');
    svg.setAttributeNS(null, 'id', 'board');
    svg.setAttributeNS(null, 'boardid', boardFilename.split('_')[1]);
    svg.setAttributeNS(null, 'fullboardid', boardFilename);
    svg.setAttributeNS(null, 'width', '896'); //907 907pt 100%
    svg.setAttributeNS(null, 'height', '504'); //500 500pt 100%

    svg.setAttributeNS(null, 'viewBox', '0 0 896 504');

    svg.setAttributeNS(null, 'version', '1.1');

    svg.setAttributeNS(null, 'actualyellowcolor', myColors[colorYellowFill]);
    body.appendChild(svg);

    

    /*let myCanvas = dom.window.document.createElementNS(ns, 'canvas');
    myCanvas.setAttributeNS(null, 'id', 'myCanvas');
    myCanvas.setAttributeNS(null, 'width', 950);
    myCanvas.setAttributeNS(null, 'height', 500);
    myCanvas.setAttributeNS(null, 'background-color', 'black');
    svg.appendChild(myCanvas);*/

    let rect = dom.window.document.createElementNS(ns, 'rect');
    rect.setAttributeNS(null, 'id', 'canvas');
    rect.setAttributeNS(null, 'x', '0');
    rect.setAttributeNS(null, 'y', '0'); 
    rect.setAttributeNS(null, 'width', '896');
    rect.setAttributeNS(null, 'height', '504');
    rect.setAttributeNS(null, 'fill', 'rgb(30%,30%,30%)');
    //rect.setAttributeNS(null, 'fill', 'grey');    
    rect.setAttributeNS(null, 'fill-opacity', 1);
    rect.setAttributeNS(null, 'stroke', 'none');
    svg.appendChild(rect);
    
    {
        const blackPlaceForPieces = dom.window.document.createElementNS(ns, 'rect');
        blackPlaceForPieces.setAttributeNS(null, 'id', 'blackPlaceForPieces');
        blackPlaceForPieces.setAttributeNS(null, 'x', '610');
        blackPlaceForPieces.setAttributeNS(null, 'y', '80'); 
        blackPlaceForPieces.setAttributeNS(null, 'width', '170'); 
        blackPlaceForPieces.setAttributeNS(null, 'height', '300'); 
        blackPlaceForPieces.setAttributeNS(null, 'fill', '#273746'); // https://htmlcolorcodes.com/

        svg.appendChild(blackPlaceForPieces);

        const blackPlaceForCircles = dom.window.document.createElementNS(ns, 'rect');
        blackPlaceForCircles.setAttributeNS(null, 'id', 'blackPlaceForCircles');
        blackPlaceForCircles.setAttributeNS(null, 'x', '335');
        blackPlaceForCircles.setAttributeNS(null, 'y', '420'); 
        blackPlaceForCircles.setAttributeNS(null, 'width', '145'); 
        blackPlaceForCircles.setAttributeNS(null, 'height', '40'); 
        blackPlaceForCircles.setAttributeNS(null, 'fill', ' #273746'); // https://htmlcolorcodes.com/

        svg.appendChild(blackPlaceForCircles);

        const blackPlaceForWhiteClock = dom.window.document.createElementNS(ns, 'rect');
        blackPlaceForWhiteClock.setAttributeNS(null, 'id', 'blackPlaceForWhiteClock');
        blackPlaceForWhiteClock.setAttributeNS(null, 'x', '55');
        blackPlaceForWhiteClock.setAttributeNS(null, 'y', '110'); 
        blackPlaceForWhiteClock.setAttributeNS(null, 'width', '125'); 
        blackPlaceForWhiteClock.setAttributeNS(null, 'height', '48'); 
        blackPlaceForWhiteClock.setAttributeNS(null, 'fill', '#273746');

        svg.appendChild(blackPlaceForWhiteClock);

        const blackPlaceForYellowClock = dom.window.document.createElementNS(ns, 'rect');
        blackPlaceForYellowClock.setAttributeNS(null, 'id', 'blackPlaceForYellowClock');
        blackPlaceForYellowClock.setAttributeNS(null, 'x', '55');
        blackPlaceForYellowClock.setAttributeNS(null, 'y', '260'); 
        blackPlaceForYellowClock.setAttributeNS(null, 'width', '125'); 
        blackPlaceForYellowClock.setAttributeNS(null, 'height', '48'); 
        blackPlaceForYellowClock.setAttributeNS(null, 'fill', '#273746');

        svg.appendChild(blackPlaceForYellowClock);
    }


    // console.log(bg_edges);

    let boardOfPolys = dom.window.document.createElementNS(ns, 'g');
    boardOfPolys.setAttributeNS(null, 'id', 'boardOfPolys');
    /*if (whatColorToDrawFor == 'white') {
        boardOfPolys.setAttributeNS(null, 'transform', 'translate(200, 10) rotate(180, 200, 205) scale(1.0)');
    }
    else{
        boardOfPolys.setAttributeNS(null, 'transform', 'translate(200, 10) scale(1.0)');
    }*/
    //boardOfPolys.setAttributeNS(null, 'transform', 'translate(200, 10) rotate(180, 200, 205) scale(1.0)');
    boardOfPolys.setAttributeNS(null, 'transform', 'translate(200, 10) scale(1.0)');

    // draw all squares (even if they are other shapes!)
    for (let key in bg_polys){
        /*const neigh1 = [];
        const neigh2 = [];
        for (let n in bg_polys[key].neighbours){
            //console.log('%', n);
            neigh1[neigh1.length] = numberToId[bg_polys[key].neighbours[n]];
            let kk = Math.min(bg_polys[key].neighbours[n], bg_polys[key].id) + '_' + Math.max(bg_polys[key].neighbours[n], bg_polys[key].id);
            if (bg_edges[kk].color != 'red'){
                neigh2[neigh2.length] = numberToId[bg_polys[key].neighbours[n]];
            }
            //console.log(kk);
        }
        //console.log(bg_polys[key].neighbours, neigh1);
        */
        let square = dom.window.document.createElementNS(ns, 'g');
        square.setAttributeNS(null, 'class', 'square ' + bg_polys[key].color + ' empty');
        square.setAttributeNS(null, 'id', bg_polys[key].name);
        square.setAttributeNS(null, 'center', bg_polys[key].center);
        let myPath = dom.window.document.createElementNS(ns, 'path');
        // myPath.setAttributeNS(null, 'neighbours', neigh1);
        // myPath.setAttributeNS(null, 'neighbors', neigh2);
        myPath.setAttributeNS(null, 'style', 'fill-rule:nonzero;fill:' + myColors[bg_polys[key].color] + ';fill-opacity:1;stroke-width:3.0;stroke-linecap:round;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:10;');
        let d = 'M ' + bg_polys[key].points[0][0] + ' ' +  bg_polys[key].points[0][1];
        let firstElement = true;
        for (let e in bg_polys[key].points){
            if(firstElement){
                firstElement = false;
            }
            else{
                d = d + ' L ' + bg_polys[key].points[e][0] + ' ' + bg_polys[key].points[e][1];
            }
        }
        d = d + ' L ' + bg_polys[key].points[0][0] + ' ' +  bg_polys[key].points[0][1];
        myPath.setAttributeNS(null, 'd', d);
        square.appendChild(myPath);
        boardOfPolys.appendChild(square);
    }
    
    //draw red edges
    for (let key in bg_edges){
        if(bg_edges[key].color == 'red'){
            let myPath = dom.window.document.createElementNS(ns, 'line');
            myPath.setAttributeNS(null, 'x1', bg_edges[key].sharedPoints[0][0]);
            myPath.setAttributeNS(null, 'y1', bg_edges[key].sharedPoints[0][1]);
            myPath.setAttributeNS(null, 'x2', bg_edges[key].sharedPoints[1][0]);
            myPath.setAttributeNS(null, 'y2', bg_edges[key].sharedPoints[1][1]);
            // myPath.setAttributeNS(null, 'style', 'fill-rule:nonzero;fill:rgb(100%,0%,0%);fill-opacity:1;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:miter;stroke:rgb(100%,0%,0%);stroke-opacity:1;stroke-miterlimit:10;');            
            myPath.setAttributeNS(null, 'style', 'fill-rule:nonzero;fill:rgb(100%,0%,0%);fill-opacity:1;stroke-width:3.0;stroke-linecap:round;stroke-linejoin:miter;stroke:rgb(100%,0%,0%);stroke-opacity:1;stroke-miterlimit:10;');            
            boardOfPolys.appendChild(myPath);
        }
    }

    // draw labels
    for (let key in bg_polys){
        //console.log(key, bg_polys[key].name)
        let myPath = dom.window.document.createElementNS(ns, 'text');
        myPath.setAttributeNS(null, 'class', 'polysquare_id');
        //myPath.setAttributeNS(null, 'user-select', 'none');
        myPath.setAttributeNS(null, 'x', bg_polys[key].center[0] - 5);
        myPath.setAttributeNS(null, 'y', bg_polys[key].center[1] + 2);
        //fill-opacity:var(--var0);
        //myPath.setAttributeNS(null, 'style', 'font-size:6;fill:rgb(100%,100%,100%);fill-opacity:var(--var0);stroke-width:2.5;');
        myPath.setAttributeNS(null, 'style', 'font-size:6;fill:rgb(100%,100%,100%);fill-opacity:1;stroke-width:2.5;');
        myPath.textContent = bg_polys[key].name;
        boardOfPolys.appendChild(myPath);
    }

    //draw id
    /*{
        let myPath = dom.window.document.createElementNS(ns, 'text');
        myPath.setAttributeNS(null, 'class', 'label visible');
        myPath.setAttributeNS(null, 'x', 710); // 707 - 220
        myPath.setAttributeNS(null, 'y', 492); // 500 - 5
        //fill-opacity:var(--var0);
        //myPath.setAttributeNS(null, 'style', 'font-size:6;fill:rgb(100%,100%,100%);fill-opacity:var(--var0);stroke-width:2.5;');
        myPath.setAttributeNS(null, 'style', 'font-size:8.5;fill:rgb(100%,100%,100%);fill-opacity:1;stroke-width:2.5;');
        myPath.textContent = boardFilename.split('_')[1];
        boardOfPolys.appendChild(myPath);
    }*/

    let setOfAllPieces = dom.window.document.createElementNS(ns, 'g');
    setOfAllPieces.setAttributeNS(null, 'id', 'setOfAllPieces');
    setOfAllPieces.setAttributeNS(null, 'transform', 'translate(0, 0) scale(1.0)');
    let hardTranslate = -300

    if (makeItBlack === 'yes'){
        for (let i=0;i<allPiecesDict['trifoxes'];i++){
            let trifoxes = dom.window.document.createElementNS(ns, 'g');
            trifoxes.setAttributeNS(null, 'class', 'draggable trifoxes yellow');
            trifoxes.setAttributeNS(null, 'id', 'yellow_trifoxes_' + i);
            trifoxes.setAttributeNS(null, 'transform', 'translate(' + (760 + hardTranslate + i * 15) + ', 255) scale(0.09)');

            const path = dom.window.document.createElementNS(ns, 'path');
            // A rx ry rotate LargeArcFlag SweepFlag x y
            path.setAttributeNS(null, 'd', 'M 0 0 A 10 25 0 0 1 110 110 Z');
            path.setAttributeNS(null, 'stroke', '' + myColors[colorYellowStroke] + '');
            path.setAttributeNS(null, 'fill', '' + myColors[colorYellowFill] + '');
            path.setAttributeNS(null, 'stroke-width', '20');

            // Repeat the path three times to create the full symbol
            for (let j = 0; j < 3; j++) {
              const rotatedPath = path.cloneNode();          
              rotatedPath.setAttributeNS(null, 'transform', `rotate(${j * 120} 0 0)`);
              trifoxes.appendChild(rotatedPath);
            }

            /***********************************************/

            const path2 = dom.window.document.createElementNS(ns, 'path');
            // A rx ry rotate LargeArcFlag SweepFlag x y
            path2.setAttributeNS(null, 'd', 'M 0 0 A 10 25 0 0 1 110 110 Z');
            path2.setAttributeNS(null, 'stroke', 'white');
            path2.setAttributeNS(null, 'fill', 'black');
            path2.setAttributeNS(null, 'stroke-width', '15');

            // Repeat the path three times to create the full symbol
            for (let j = 0; j < 3; j++) {
              const rotatedPath2 = path2.cloneNode();          
              rotatedPath2.setAttributeNS(null, 'transform', `rotate(${j * 120} 0 0) scale(0.5)`);
              trifoxes.appendChild(rotatedPath2);
            }

            /***********************************************/

            setOfAllPieces.appendChild(trifoxes);
        }
    }
    else{
        for (let i=0;i<allPiecesDict['trifoxes'];i++){
            let trifoxes = dom.window.document.createElementNS(ns, 'g');
            trifoxes.setAttributeNS(null, 'class', 'draggable trifoxes yellow');
            trifoxes.setAttributeNS(null, 'id', 'yellow_trifoxes_' + i);
            trifoxes.setAttributeNS(null, 'transform', 'translate(' + (760 + hardTranslate + i * 15) + ', 255) scale(0.09)');

            const path = dom.window.document.createElementNS(ns, 'path');
            // A rx ry rotate LargeArcFlag SweepFlag x y
            path.setAttributeNS(null, 'd', 'M 0 0 A 10 25 0 0 1 110 110 Z');
            path.setAttributeNS(null, 'stroke', '' + myColors[colorYellowStroke] + '');
            path.setAttributeNS(null, 'fill', '' + myColors[colorYellowFill] + '');
            path.setAttributeNS(null, 'stroke-width', '20');

            // Repeat the path three times to create the full symbol
            for (let j = 0; j < 3; j++) {
              const rotatedPath = path.cloneNode();          
              rotatedPath.setAttributeNS(null, 'transform', `rotate(${j * 120} 0 0)`);
              trifoxes.appendChild(rotatedPath);
            }

            setOfAllPieces.appendChild(trifoxes);
        }
    }

    for (let i=0;i<allPiecesDict['trifoxes'];i++){
        let trifoxes = dom.window.document.createElementNS(ns, 'g');
        trifoxes.setAttributeNS(null, 'class', 'draggable trifoxes white');
        trifoxes.setAttributeNS(null, 'id', 'white_trifoxes_' + i);
        trifoxes.setAttributeNS(null, 'transform', 'translate(' + (760 + hardTranslate + i * 15) + ', 285) scale(0.09)');

        const path = dom.window.document.createElementNS(ns, 'path');
        // A rx ry rotate LargeArcFlag SweepFlag x y
        path.setAttributeNS(null, 'd', 'M 0 0 A 10 25 0 0 1 110 110 Z');
        path.setAttributeNS(null, 'stroke', '' + myColors[colorWhiteStroke] + '');
        path.setAttributeNS(null, 'fill', '' + myColors[colorWhiteFill] + '');
        path.setAttributeNS(null, 'stroke-width', '20');

        // Repeat the path three times to create the full symbol
        for (let j = 0; j < 3; j++) {
          const rotatedPath = path.cloneNode();          
          rotatedPath.setAttributeNS(null, 'transform', `rotate(${j * 120} 0 0)`);
          trifoxes.appendChild(rotatedPath);
        }

        setOfAllPieces.appendChild(trifoxes);
    }

    let nbSoldiers = allPiecesDict['soldier'];

    if (makeItBlack === 'yes'){
        for (let i=0;i<nbSoldiers;i++){
            let mySoldier = dom.window.document.createElementNS(ns, 'g');
            mySoldier.setAttributeNS(null, 'class', 'draggable soldier yellow');
            mySoldier.setAttributeNS(null, 'id', 'yellow_soldier_' + i);
            let z = 730 + hardTranslate + i * 7;
            mySoldier.setAttributeNS(null, 'transform', 'translate(' + z + ', 170) scale(0.9)');
            let ellipse1 = dom.window.document.createElementNS(ns, 'ellipse');
            let ellipse2 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse1.setAttributeNS(null, 'cx', 0);
            ellipse1.setAttributeNS(null, 'cy', 0);
            ellipse1.setAttributeNS(null, 'rx', 8);
            ellipse1.setAttributeNS(null, 'ry', 8);
            ellipse1.setAttributeNS(null, 'style', 'fill:black;stroke:white;stroke-width:1;');
            ellipse2.setAttributeNS(null, 'cx', 0);
            ellipse2.setAttributeNS(null, 'cy', 0);
            ellipse2.setAttributeNS(null, 'rx', 10);
            ellipse2.setAttributeNS(null, 'ry', 10);
            ellipse2.setAttributeNS(null, 'style', 'fill:white;stroke:black;stroke-width:6;');

            
            mySoldier.appendChild(ellipse2);
            mySoldier.appendChild(ellipse1);

            setOfAllPieces.appendChild(mySoldier);
        }
    }
    else{
        for (let i=0;i<nbSoldiers;i++){
            let mySoldier = dom.window.document.createElementNS(ns, 'g');
            mySoldier.setAttributeNS(null, 'class', 'draggable soldier yellow');
            mySoldier.setAttributeNS(null, 'id', 'yellow_soldier_' + i);
            let z = 730 + hardTranslate + i * 7;
            mySoldier.setAttributeNS(null, 'transform', 'translate(' + z + ', 170) scale(0.9)');
            let ellipse1 = dom.window.document.createElementNS(ns, 'ellipse');
            let ellipse2 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse1.setAttributeNS(null, 'cx', 0);
            ellipse1.setAttributeNS(null, 'cy', 0);
            ellipse1.setAttributeNS(null, 'rx', 10);
            ellipse1.setAttributeNS(null, 'ry', 10);
            ellipse1.setAttributeNS(null, 'style', 'fill:' + myColors[colorYellowFill] + ';stroke:' + myColors[colorYellowFill] + ';stroke-width:4;');
            ellipse2.setAttributeNS(null, 'cx', 0);
            ellipse2.setAttributeNS(null, 'cy', 0);
            ellipse2.setAttributeNS(null, 'rx', 12);
            ellipse2.setAttributeNS(null, 'ry', 12);
            ellipse2.setAttributeNS(null, 'style', 'fill:none;stroke:' + myColors[colorYellowStroke] + ';stroke-width:2;');        

            mySoldier.appendChild(ellipse1);
            mySoldier.appendChild(ellipse2);

            setOfAllPieces.appendChild(mySoldier);
        }
    }

    for (let i=0;i<nbSoldiers;i++){
        let mySoldier = dom.window.document.createElementNS(ns, 'g');
        mySoldier.setAttributeNS(null, 'class', 'draggable soldier white');
        mySoldier.setAttributeNS(null, 'id', 'white_soldier_' + i);
        let z = 730 + hardTranslate + i * 7;
        mySoldier.setAttributeNS(null, 'transform', 'translate(' + z + ', 200) scale(0.9)');
        let ellipse1 = dom.window.document.createElementNS(ns, 'ellipse');
        let ellipse2 = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse1.setAttributeNS(null, 'cx', 0);
        ellipse1.setAttributeNS(null, 'cy', 0);
        ellipse1.setAttributeNS(null, 'rx', 10);
        ellipse1.setAttributeNS(null, 'ry', 10);
        ellipse1.setAttributeNS(null, 'style', 'fill:' + myColors['white'] + ';stroke:' + myColors['white'] + ';stroke-width:4;');
        ellipse2.setAttributeNS(null, 'cx', 0);
        ellipse2.setAttributeNS(null, 'cy', 0);
        ellipse2.setAttributeNS(null, 'rx', 12);
        ellipse2.setAttributeNS(null, 'ry', 12);
        ellipse2.setAttributeNS(null, 'style', 'fill:none;stroke:' + myColors[colorWhiteStroke] + ';stroke-width:2;');
        mySoldier.appendChild(ellipse1);
        mySoldier.appendChild(ellipse2);

        setOfAllPieces.appendChild(mySoldier);
    }

    if (makeItBlack === 'yes'){
        for (let i=0;i<1;i++){
            let myGoddess = dom.window.document.createElementNS(ns, 'g');
            myGoddess.setAttributeNS(null, 'class', 'draggable goddess yellow');
            myGoddess.setAttributeNS(null, 'id', 'yellow_goddess_' + i);
            let z = 730 + hardTranslate + i * 25;
            myGoddess.setAttributeNS(null, 'transform', 'translate(' + z + ', 255) scale(0.23)');        
            let myPolygon = dom.window.document.createElementNS(ns, 'polygon');
            // myPolygon.setAttributeNS(null, 'points', '50 0 100 65 50 100 0 65');
            myPolygon.setAttributeNS(null, 'points', '0 -55 50 15 0 55 -50 15');
            myPolygon.setAttributeNS(null, 'fill', 'black');
            myPolygon.setAttributeNS(null, 'stroke', 'black');
            myPolygon.setAttributeNS(null, 'stroke-width', 8);

            let myPolygon2 = dom.window.document.createElementNS(ns, 'polygon');
            myPolygon2.setAttributeNS(null, 'points', '0 -15 20 10 0 20 -20 10');
            myPolygon2.setAttributeNS(null, 'fill', 'black');
            myPolygon2.setAttributeNS(null, 'stroke', 'white');
            myPolygon2.setAttributeNS(null, 'stroke-width', 4);        

            myGoddess.appendChild(myPolygon);
            myGoddess.appendChild(myPolygon2);
            setOfAllPieces.appendChild(myGoddess);
        }
    }
    else{
        for (let i=0;i<1;i++){
            let myGoddess = dom.window.document.createElementNS(ns, 'g');
            myGoddess.setAttributeNS(null, 'class', 'draggable goddess yellow');
            myGoddess.setAttributeNS(null, 'id', 'yellow_goddess_' + i);
            let z = 730 + hardTranslate + i * 25;
            myGoddess.setAttributeNS(null, 'transform', 'translate(' + z + ', 255) scale(0.23)');        
            let myPolygon = dom.window.document.createElementNS(ns, 'polygon');
            // myPolygon.setAttributeNS(null, 'points', '50 0 100 65 50 100 0 65');
            myPolygon.setAttributeNS(null, 'points', '0 -55 50 15 0 55 -50 15');
            myPolygon.setAttributeNS(null, 'fill', myColors[colorYellowFill]);
            myPolygon.setAttributeNS(null, 'stroke', myColors[colorYellowStroke]);
            myPolygon.setAttributeNS(null, 'stroke-width', 8);

            let myPolygon2 = dom.window.document.createElementNS(ns, 'polygon');
            myPolygon2.setAttributeNS(null, 'points', '0 -15 20 10 0 20 -20 10');
            myPolygon2.setAttributeNS(null, 'fill', myColors[colorYellowStroke]);
            myPolygon2.setAttributeNS(null, 'stroke', myColors[colorYellowStroke]);
            myPolygon2.setAttributeNS(null, 'stroke-width', 8);        

            myGoddess.appendChild(myPolygon);
            myGoddess.appendChild(myPolygon2);
            setOfAllPieces.appendChild(myGoddess);
        }
    }

    for (let i=0;i<1;i++){
        /*let myGoddess = dom.window.document.createElementNS(ns, 'g');
        myGoddess.setAttributeNS(null, 'class', 'draggable goddess white');
        myGoddess.setAttributeNS(null, 'id', 'white_goddess_' + i);
        let z = 730 + i * 25;
        myGoddess.setAttributeNS(null, 'transform', 'translate(' + z + ', 275) scale(0.8)');        
        let myRect = dom.window.document.createElementNS(ns, 'rect');
        myRect.setAttributeNS(null, 'x', 0); myRect.setAttributeNS(null, 'y', 0); 
        myRect.setAttributeNS(null, 'width', 19); myRect.setAttributeNS(null, 'height', 19); 
        myRect.setAttributeNS(null, 'transform', 'rotate(45, 0, 0)');
        myRect.setAttributeNS(null, 'style', 'fill:' + myColors['white'] + ';stroke:' + myColors[colorWhiteStroke] + ';stroke-width:2;');
        myGoddess.appendChild(myRect);
        setOfAllPieces.appendChild(myGoddess);*/

        let myGoddess = dom.window.document.createElementNS(ns, 'g');
        myGoddess.setAttributeNS(null, 'class', 'draggable goddess white');
        myGoddess.setAttributeNS(null, 'id', 'white_goddess_' + i);
        let z = 730 + hardTranslate + i * 25;
        myGoddess.setAttributeNS(null, 'transform', 'translate(' + z + ', 285) scale(0.23)');        
        let myPolygon = dom.window.document.createElementNS(ns, 'polygon');
        // myPolygon.setAttributeNS(null, 'points', '50 0 100 65 50 100 0 65');
        myPolygon.setAttributeNS(null, 'points', '0 -55 50 15 0 55 -50 15');
        myPolygon.setAttributeNS(null, 'fill', myColors[colorWhiteFill]);
        myPolygon.setAttributeNS(null, 'stroke', myColors[colorWhiteStroke]);
        myPolygon.setAttributeNS(null, 'stroke-width', 8);

        let myPolygon2 = dom.window.document.createElementNS(ns, 'polygon');
        myPolygon2.setAttributeNS(null, 'points', '0 -15 20 10 0 20 -20 10');
        myPolygon2.setAttributeNS(null, 'fill', myColors[colorWhiteStroke]);
        myPolygon2.setAttributeNS(null, 'stroke', myColors[colorWhiteStroke]);
        myPolygon2.setAttributeNS(null, 'stroke-width', 8);        

        myGoddess.appendChild(myPolygon);
        myGoddess.appendChild(myPolygon2);
        setOfAllPieces.appendChild(myGoddess);
    }

    for (let i=0;i<allPiecesDict['bishop'];i++){
        let myTriangle = dom.window.document.createElementNS(ns, 'g');
        myTriangle.setAttributeNS(null, 'class', 'draggable bishop yellow');
        myTriangle.setAttributeNS(null, 'id', 'yellow_bishop_' + i);
        let z = 780 + hardTranslate + i * 10;
        myTriangle.setAttributeNS(null, 'transform', 'translate(' + z + ', 130) scale(1.0)');
        let myPolygon = dom.window.document.createElementNS(ns, 'polygon');
        myPolygon.setAttributeNS(null, 'points', '40 32 30 50 50 50');
        myPolygon.setAttributeNS(null, 'fill', myColors[colorYellowFill]);
        myPolygon.setAttributeNS(null, 'stroke', myColors[colorYellowStroke]);
        myPolygon.setAttributeNS(null, 'stroke-width', '2');
        myTriangle.appendChild(myPolygon);
        setOfAllPieces.appendChild(myTriangle);
    }

    for (let i=0;i<allPiecesDict['bishop'];i++){
        let myTriangle = dom.window.document.createElementNS(ns, 'g');
        myTriangle.setAttributeNS(null, 'class', 'draggable bishop white');
        myTriangle.setAttributeNS(null, 'id', 'white_bishop_' + i);
        let z = 780 + hardTranslate + i * 10;
        myTriangle.setAttributeNS(null, 'transform', 'translate(' + z + ', 155) scale(1.0)');
        let myPolygon = dom.window.document.createElementNS(ns, 'polygon');
        myPolygon.setAttributeNS(null, 'points', '40 32 30 50 50 50');
        myPolygon.setAttributeNS(null, 'fill', myColors['white']);
        myPolygon.setAttributeNS(null, 'stroke', myColors[colorWhiteStroke]);
        myPolygon.setAttributeNS(null, 'stroke-width', '2');
        myTriangle.appendChild(myPolygon);
        setOfAllPieces.appendChild(myTriangle);
    }

    for (let i=0;i<2;i++){
        let myKing = dom.window.document.createElementNS(ns, 'g');
        myKing.setAttributeNS(null, 'class', 'draggable king yellow');
        myKing.setAttributeNS(null, 'id', 'yellow_king_' + i);
        let z = 720 + hardTranslate + i * 20;
        myKing.setAttributeNS(null, 'transform', 'translate(' + z + ', 5) scale(0.46)');
        let myPolygon = dom.window.document.createElementNS(ns, 'polygon');
        myPolygon.setAttributeNS(null, 'points', '50 165 55 180 70 180 60 190 65 205 50 195 35 205 40 190 30 180 45 180');
        myPolygon.setAttributeNS(null, 'fill', myColors[colorYellowFill]);
        myPolygon.setAttributeNS(null, 'stroke', myColors[colorYellowStroke]);
        myPolygon.setAttributeNS(null, 'stroke-width', 3);
        //let ellipse1 = dom.window.document.createElementNS(ns, 'ellipse');
        //let ellipse2 = dom.window.document.createElementNS(ns, 'ellipse');
        //let ellipse3 = dom.window.document.createElementNS(ns, 'ellipse');
        let ellipse4 = dom.window.document.createElementNS(ns, 'ellipse');
        /*ellipse1.setAttributeNS(null, 'cx', 50);
        ellipse1.setAttributeNS(null, 'cy', 187);
        ellipse1.setAttributeNS(null, 'rx', 20);
        ellipse1.setAttributeNS(null, 'ry', 20);
        ellipse1.setAttributeNS(null, 'style', 'fill:none;stroke:' + myColors[colorYellowFill] + ';stroke-width:5;');
        ellipse2.setAttributeNS(null, 'cx', 50);
        ellipse2.setAttributeNS(null, 'cy', 187);
        ellipse2.setAttributeNS(null, 'rx', 22.5);
        ellipse2.setAttributeNS(null, 'ry', 22.5);
        ellipse2.setAttributeNS(null, 'style', 'fill:none;stroke:black;stroke-width:3;');
        ellipse3.setAttributeNS(null, 'cx', 50);
        ellipse3.setAttributeNS(null, 'cy', 187);
        ellipse3.setAttributeNS(null, 'rx', 17.5);
        ellipse3.setAttributeNS(null, 'ry', 17.5);
        ellipse3.setAttributeNS(null, 'style', 'fill:none;stroke:black;stroke-width:3;');*/
        ellipse4.setAttributeNS(null, 'cx', 50);
        ellipse4.setAttributeNS(null, 'cy', 187);
        ellipse4.setAttributeNS(null, 'rx', 22.5);
        ellipse4.setAttributeNS(null, 'ry', 22.5);
        ellipse4.setAttributeNS(null, 'style', 'opacity:0.01;fill:' + myColors[colorYellowStroke] + ';stroke:' + myColors[colorYellowStroke] + ';stroke-width:3;');
        myKing.appendChild(ellipse4);
        myKing.appendChild(myPolygon);
        //myKing.appendChild(ellipse1);
        //myKing.appendChild(ellipse2);
        //myKing.appendChild(ellipse3);
        setOfAllPieces.appendChild(myKing);
    }

    for (let i=0;i<2;i++){
        let myKing = dom.window.document.createElementNS(ns, 'g');
        myKing.setAttributeNS(null, 'class', 'draggable king white');
        myKing.setAttributeNS(null, 'id', 'white_king_' + i);
        let z = 720 + hardTranslate + i * 20;
        myKing.setAttributeNS(null, 'transform', 'translate(' + z + ', 30) scale(0.46)');
        let myPolygon = dom.window.document.createElementNS(ns, 'polygon');
        myPolygon.setAttributeNS(null, 'points', '50 165 55 180 70 180 60 190 65 205 50 195 35 205 40 190 30 180 45 180');
        myPolygon.setAttributeNS(null, 'fill', myColors[colorWhiteFill]);
        myPolygon.setAttributeNS(null, 'stroke', myColors[colorWhiteStroke]);
        myPolygon.setAttributeNS(null, 'stroke-width', 3);
        //let ellipse1 = dom.window.document.createElementNS(ns, 'ellipse');
        //let ellipse2 = dom.window.document.createElementNS(ns, 'ellipse');
        //let ellipse3 = dom.window.document.createElementNS(ns, 'ellipse');
        let ellipse4 = dom.window.document.createElementNS(ns, 'ellipse');
        /*ellipse1.setAttributeNS(null, 'cx', 50);
        ellipse1.setAttributeNS(null, 'cy', 187);
        ellipse1.setAttributeNS(null, 'rx', 20);
        ellipse1.setAttributeNS(null, 'ry', 20);
        ellipse1.setAttributeNS(null, 'style', 'fill:none;stroke:' + myColors[colorWhiteFill] + ';stroke-width:5;');
        ellipse2.setAttributeNS(null, 'cx', 50);
        ellipse2.setAttributeNS(null, 'cy', 187);
        ellipse2.setAttributeNS(null, 'rx', 22.5);
        ellipse2.setAttributeNS(null, 'ry', 22.5);
        ellipse2.setAttributeNS(null, 'style', 'fill:none;stroke:black;stroke-width:3;');
        ellipse3.setAttributeNS(null, 'cx', 50);
        ellipse3.setAttributeNS(null, 'cy', 187);
        ellipse3.setAttributeNS(null, 'rx', 17.5);
        ellipse3.setAttributeNS(null, 'ry', 17.5);
        ellipse3.setAttributeNS(null, 'style', 'fill:none;stroke:black;stroke-width:3;');*/
        ellipse4.setAttributeNS(null, 'cx', 50);
        ellipse4.setAttributeNS(null, 'cy', 187);
        ellipse4.setAttributeNS(null, 'rx', 22.5);
        ellipse4.setAttributeNS(null, 'ry', 22.5);
        ellipse4.setAttributeNS(null, 'style', 'opacity:0.01;fill:' + myColors[colorWhiteStroke] + ';stroke:' + myColors[colorWhiteStroke] + ';stroke-width:3;');
        myKing.appendChild(ellipse4);
        myKing.appendChild(myPolygon);
        //myKing.appendChild(ellipse1);
        //myKing.appendChild(ellipse2);
        //myKing.appendChild(ellipse3);
        setOfAllPieces.appendChild(myKing);
    }

    let sizeSmallRoundLeg = 80;
    let sizeSmallRoundLeg_minuse = 40;

    if (makeItBlack === 'yes'){
        for (let i=0;i<allPiecesDict['mage'];i++){
            let myMage = dom.window.document.createElementNS(ns, 'g');
            myMage.setAttributeNS(null, 'class', 'draggable mage yellow');
            myMage.setAttributeNS(null, 'id', 'yellow_mage_' + i);
            let z = 800 + hardTranslate + i * 25;
            myMage.setAttributeNS(null, 'transform', 'translate(' + z + ', 83) scale(0.040)');        
            let ellipse1 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse1.setAttributeNS(null, 'cx', 130.773); ellipse1.setAttributeNS(null, 'cy', 438.01); ellipse1.setAttributeNS(null, 'rx', sizeSmallRoundLeg); ellipse1.setAttributeNS(null, 'ry', sizeSmallRoundLeg);
            ellipse1.setAttributeNS(null, 'style', 'fill:' + myColors[colorYellowStroke] + ';stroke:' + myColors[colorYellowStroke] + ';stroke-width:10;');
            let ellipse2 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse2.setAttributeNS(null, 'cx', 5.774); ellipse2.setAttributeNS(null, 'cy', 221.505); ellipse2.setAttributeNS(null, 'rx', sizeSmallRoundLeg); ellipse2.setAttributeNS(null, 'ry', sizeSmallRoundLeg);
            ellipse2.setAttributeNS(null, 'style', 'fill:' + myColors[colorYellowStroke] + ';stroke:' + myColors[colorYellowStroke] + ';stroke-width:10;');
            let ellipse3 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse3.setAttributeNS(null, 'cx', 130.773); ellipse3.setAttributeNS(null, 'cy', 5); ellipse3.setAttributeNS(null, 'rx', sizeSmallRoundLeg); ellipse3.setAttributeNS(null, 'ry', sizeSmallRoundLeg);
            ellipse3.setAttributeNS(null, 'style', 'fill:' + myColors[colorYellowStroke] + ';stroke:' + myColors[colorYellowStroke] + ';stroke-width:10;');
            let ellipse4 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse4.setAttributeNS(null, 'cx', 380.771); ellipse4.setAttributeNS(null, 'cy', 5); ellipse4.setAttributeNS(null, 'rx', sizeSmallRoundLeg); ellipse4.setAttributeNS(null, 'ry', sizeSmallRoundLeg);
            ellipse4.setAttributeNS(null, 'style', 'fill:' + myColors[colorYellowStroke] + ';stroke:' + myColors[colorYellowStroke] + ';stroke-width:10;');
            let ellipse5 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse5.setAttributeNS(null, 'cx', 505.771); ellipse5.setAttributeNS(null, 'cy', 221.505); ellipse5.setAttributeNS(null, 'rx', sizeSmallRoundLeg); ellipse5.setAttributeNS(null, 'ry', sizeSmallRoundLeg);
            ellipse5.setAttributeNS(null, 'style', 'fill:' + myColors[colorYellowStroke] + ';stroke:' + myColors[colorYellowStroke] + ';stroke-width:10;');
            let ellipse6 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse6.setAttributeNS(null, 'cx', 380.771); ellipse6.setAttributeNS(null, 'cy', 438.01); ellipse6.setAttributeNS(null, 'rx', sizeSmallRoundLeg); ellipse6.setAttributeNS(null, 'ry', sizeSmallRoundLeg);
            ellipse6.setAttributeNS(null, 'style', 'fill:' + myColors[colorYellowStroke] + ';stroke:' + myColors[colorYellowStroke] + ';stroke-width:10;');

            let myPolygon = dom.window.document.createElementNS(ns, 'polygon');
            myPolygon.setAttributeNS(null, 'points', '130.773,438.01 5.774,221.505 130.773,5  380.771,5 505.771,221.505 380.771,438.01');
            myPolygon.setAttributeNS(null, 'fill', 'black');
            myPolygon.setAttributeNS(null, 'stroke', 'black');
            myPolygon.setAttributeNS(null, 'stroke-width', 30);

            let ellipse7 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse7.setAttributeNS(null, 'cx', 255.7725); ellipse7.setAttributeNS(null, 'cy', 221.505); ellipse7.setAttributeNS(null, 'rx', 20); ellipse7.setAttributeNS(null, 'ry', 20);
            ellipse7.setAttributeNS(null, 'style', 'fill:none;stroke:' + myColors[colorYellowStroke] + ';stroke-width:20;');
            let ellipse8 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse8.setAttributeNS(null, 'cx', 255.7725); ellipse8.setAttributeNS(null, 'cy', 221.505); ellipse8.setAttributeNS(null, 'rx', 50); ellipse8.setAttributeNS(null, 'ry', 50);
            ellipse8.setAttributeNS(null, 'style', 'fill:none;stroke:' + myColors[colorYellowStroke] + ';stroke-width:20;');
            
            let ellipse9 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse9.setAttributeNS(null, 'cx', 255.7725); ellipse9.setAttributeNS(null, 'cy', 221.505); ellipse9.setAttributeNS(null, 'rx', 80); ellipse9.setAttributeNS(null, 'ry', 80);
            ellipse9.setAttributeNS(null, 'style', 'fill:none;stroke:white;stroke-width:30;');
            let ellipse10 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse10.setAttributeNS(null, 'cx', 255.7725); ellipse10.setAttributeNS(null, 'cy', 221.505); ellipse10.setAttributeNS(null, 'rx', 110); ellipse10.setAttributeNS(null, 'ry', 110);
            ellipse10.setAttributeNS(null, 'style', 'fill:none;stroke:black;stroke-width:20;');
            let ellipse11 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse11.setAttributeNS(null, 'cx', 255.7725); ellipse11.setAttributeNS(null, 'cy', 221.505); ellipse11.setAttributeNS(null, 'rx', 140); ellipse11.setAttributeNS(null, 'ry', 140);
            ellipse11.setAttributeNS(null, 'style', 'fill:none;stroke:white;stroke-width:30;');
            
            let ellipse12 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse12.setAttributeNS(null, 'cx', 255.7725); ellipse12.setAttributeNS(null, 'cy', 221.505); ellipse12.setAttributeNS(null, 'rx', 170); ellipse12.setAttributeNS(null, 'ry', 170);
            ellipse12.setAttributeNS(null, 'style', 'fill:none;stroke:' + myColors[colorYellowStroke] + ';stroke-width:20;');
            
            myMage.appendChild(ellipse1);
            myMage.appendChild(ellipse2);
            myMage.appendChild(ellipse3);
            myMage.appendChild(ellipse4);
            myMage.appendChild(ellipse5);
            myMage.appendChild(ellipse6);
            myMage.appendChild(myPolygon);
            //myMage.appendChild(ellipse7);
            //myMage.appendChild(ellipse8);
            myMage.appendChild(ellipse9);
            myMage.appendChild(ellipse10);
            myMage.appendChild(ellipse11);
            //myMage.appendChild(ellipse12);
            setOfAllPieces.appendChild(myMage);
        }
    }
    else{
        for (let i=0;i<allPiecesDict['mage'];i++){
            let myMage = dom.window.document.createElementNS(ns, 'g');
            myMage.setAttributeNS(null, 'class', 'draggable mage yellow');
            myMage.setAttributeNS(null, 'id', 'yellow_mage_' + i);
            let z = 800 + hardTranslate + i * 25;
            myMage.setAttributeNS(null, 'transform', 'translate(' + z + ', 83) scale(0.040)');        
            let ellipse1 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse1.setAttributeNS(null, 'cx', 130.773); ellipse1.setAttributeNS(null, 'cy', 438.01); ellipse1.setAttributeNS(null, 'rx', sizeSmallRoundLeg); ellipse1.setAttributeNS(null, 'ry', sizeSmallRoundLeg);
            ellipse1.setAttributeNS(null, 'style', 'fill:' + myColors[colorYellowStroke] + ';stroke:' + myColors[colorYellowStroke] + ';stroke-width:10;');
            let ellipse2 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse2.setAttributeNS(null, 'cx', 5.774); ellipse2.setAttributeNS(null, 'cy', 221.505); ellipse2.setAttributeNS(null, 'rx', sizeSmallRoundLeg); ellipse2.setAttributeNS(null, 'ry', sizeSmallRoundLeg);
            ellipse2.setAttributeNS(null, 'style', 'fill:' + myColors[colorYellowStroke] + ';stroke:' + myColors[colorYellowStroke] + ';stroke-width:10;');
            let ellipse3 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse3.setAttributeNS(null, 'cx', 130.773); ellipse3.setAttributeNS(null, 'cy', 5); ellipse3.setAttributeNS(null, 'rx', sizeSmallRoundLeg); ellipse3.setAttributeNS(null, 'ry', sizeSmallRoundLeg);
            ellipse3.setAttributeNS(null, 'style', 'fill:' + myColors[colorYellowStroke] + ';stroke:' + myColors[colorYellowStroke] + ';stroke-width:10;');
            let ellipse4 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse4.setAttributeNS(null, 'cx', 380.771); ellipse4.setAttributeNS(null, 'cy', 5); ellipse4.setAttributeNS(null, 'rx', sizeSmallRoundLeg); ellipse4.setAttributeNS(null, 'ry', sizeSmallRoundLeg);
            ellipse4.setAttributeNS(null, 'style', 'fill:' + myColors[colorYellowStroke] + ';stroke:' + myColors[colorYellowStroke] + ';stroke-width:10;');
            let ellipse5 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse5.setAttributeNS(null, 'cx', 505.771); ellipse5.setAttributeNS(null, 'cy', 221.505); ellipse5.setAttributeNS(null, 'rx', sizeSmallRoundLeg); ellipse5.setAttributeNS(null, 'ry', sizeSmallRoundLeg);
            ellipse5.setAttributeNS(null, 'style', 'fill:' + myColors[colorYellowStroke] + ';stroke:' + myColors[colorYellowStroke] + ';stroke-width:10;');
            let ellipse6 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse6.setAttributeNS(null, 'cx', 380.771); ellipse6.setAttributeNS(null, 'cy', 438.01); ellipse6.setAttributeNS(null, 'rx', sizeSmallRoundLeg); ellipse6.setAttributeNS(null, 'ry', sizeSmallRoundLeg);
            ellipse6.setAttributeNS(null, 'style', 'fill:' + myColors[colorYellowStroke] + ';stroke:' + myColors[colorYellowStroke] + ';stroke-width:10;');

            let myPolygon = dom.window.document.createElementNS(ns, 'polygon');
            myPolygon.setAttributeNS(null, 'points', '130.773,438.01 5.774,221.505 130.773,5  380.771,5 505.771,221.505 380.771,438.01');
            myPolygon.setAttributeNS(null, 'fill', myColors[colorYellowFill]);
            myPolygon.setAttributeNS(null, 'stroke', '' + myColors[colorYellowStroke] + '');
            myPolygon.setAttributeNS(null, 'stroke-width', 30);

            let ellipse7 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse7.setAttributeNS(null, 'cx', 255.7725); ellipse7.setAttributeNS(null, 'cy', 221.505); ellipse7.setAttributeNS(null, 'rx', 20); ellipse7.setAttributeNS(null, 'ry', 20);
            ellipse7.setAttributeNS(null, 'style', 'fill:none;stroke:' + myColors[colorYellowStroke] + ';stroke-width:20;');
            let ellipse8 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse8.setAttributeNS(null, 'cx', 255.7725); ellipse8.setAttributeNS(null, 'cy', 221.505); ellipse8.setAttributeNS(null, 'rx', 50); ellipse8.setAttributeNS(null, 'ry', 50);
            ellipse8.setAttributeNS(null, 'style', 'fill:none;stroke:' + myColors[colorYellowStroke] + ';stroke-width:20;');
            let ellipse9 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse9.setAttributeNS(null, 'cx', 255.7725); ellipse9.setAttributeNS(null, 'cy', 221.505); ellipse9.setAttributeNS(null, 'rx', 80); ellipse9.setAttributeNS(null, 'ry', 80);
            ellipse9.setAttributeNS(null, 'style', 'fill:none;stroke:' + myColors[colorYellowStroke] + ';stroke-width:20;');
            let ellipse10 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse10.setAttributeNS(null, 'cx', 255.7725); ellipse10.setAttributeNS(null, 'cy', 221.505); ellipse10.setAttributeNS(null, 'rx', 110); ellipse10.setAttributeNS(null, 'ry', 110);
            ellipse10.setAttributeNS(null, 'style', 'fill:none;stroke:' + myColors[colorYellowStroke] + ';stroke-width:20;');
            let ellipse11 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse11.setAttributeNS(null, 'cx', 255.7725); ellipse11.setAttributeNS(null, 'cy', 221.505); ellipse11.setAttributeNS(null, 'rx', 140); ellipse11.setAttributeNS(null, 'ry', 140);
            ellipse11.setAttributeNS(null, 'style', 'fill:none;stroke:' + myColors[colorYellowStroke] + ';stroke-width:20;');
            let ellipse12 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse12.setAttributeNS(null, 'cx', 255.7725); ellipse12.setAttributeNS(null, 'cy', 221.505); ellipse12.setAttributeNS(null, 'rx', 170); ellipse12.setAttributeNS(null, 'ry', 170);
            ellipse12.setAttributeNS(null, 'style', 'fill:none;stroke:' + myColors[colorYellowStroke] + ';stroke-width:20;');
            
            myMage.appendChild(ellipse1);
            myMage.appendChild(ellipse2);
            myMage.appendChild(ellipse3);
            myMage.appendChild(ellipse4);
            myMage.appendChild(ellipse5);
            myMage.appendChild(ellipse6);
            myMage.appendChild(myPolygon);
            //myMage.appendChild(ellipse7);
            //myMage.appendChild(ellipse8);
            myMage.appendChild(ellipse9);
            myMage.appendChild(ellipse10);
            myMage.appendChild(ellipse11);
            //myMage.appendChild(ellipse12);
            setOfAllPieces.appendChild(myMage);
        }
    }

    for (let i=0;i<allPiecesDict['mage'];i++){
        let myMage = dom.window.document.createElementNS(ns, 'g');
        myMage.setAttributeNS(null, 'class', 'draggable mage white');
        myMage.setAttributeNS(null, 'id', 'white_mage_' + i);
        let z = 800 + hardTranslate + i * 25;
        myMage.setAttributeNS(null, 'transform', 'translate(' + z + ', 112) scale(0.040)');        
        let ellipse1_line = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse1_line.setAttributeNS(null, 'cx', 130.773); ellipse1_line.setAttributeNS(null, 'cy', 438.01); ellipse1_line.setAttributeNS(null, 'rx', sizeSmallRoundLeg); ellipse1_line.setAttributeNS(null, 'ry', sizeSmallRoundLeg);
        ellipse1_line.setAttributeNS(null, 'style', 'fill:' + myColors[colorWhiteStroke] + ';stroke:' + myColors[colorWhiteStroke] + ';stroke-width:10;');
        let ellipse2_line = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse2_line.setAttributeNS(null, 'cx', 5.774); ellipse2_line.setAttributeNS(null, 'cy', 221.505); ellipse2_line.setAttributeNS(null, 'rx', sizeSmallRoundLeg); ellipse2_line.setAttributeNS(null, 'ry', sizeSmallRoundLeg);
        ellipse2_line.setAttributeNS(null, 'style', 'fill:' + myColors[colorWhiteStroke] + ';stroke:' + myColors[colorWhiteStroke] + ';stroke-width:10;');
        let ellipse3_line = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse3_line.setAttributeNS(null, 'cx', 130.773); ellipse3_line.setAttributeNS(null, 'cy', 5); ellipse3_line.setAttributeNS(null, 'rx', sizeSmallRoundLeg); ellipse3_line.setAttributeNS(null, 'ry', sizeSmallRoundLeg);
        ellipse3_line.setAttributeNS(null, 'style', 'fill:' + myColors[colorWhiteStroke] + ';stroke:' + myColors[colorWhiteStroke] + ';stroke-width:10;');
        let ellipse4_line = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse4_line.setAttributeNS(null, 'cx', 380.771); ellipse4_line.setAttributeNS(null, 'cy', 5); ellipse4_line.setAttributeNS(null, 'rx', sizeSmallRoundLeg); ellipse4_line.setAttributeNS(null, 'ry', sizeSmallRoundLeg);
        ellipse4_line.setAttributeNS(null, 'style', 'fill:' + myColors[colorWhiteStroke] + ';stroke:' + myColors[colorWhiteStroke] + ';stroke-width:10;');
        let ellipse5_line = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse5_line.setAttributeNS(null, 'cx', 505.771); ellipse5_line.setAttributeNS(null, 'cy', 221.505); ellipse5_line.setAttributeNS(null, 'rx', sizeSmallRoundLeg); ellipse5_line.setAttributeNS(null, 'ry', sizeSmallRoundLeg);
        ellipse5_line.setAttributeNS(null, 'style', 'fill:' + myColors[colorWhiteStroke] + ';stroke:' + myColors[colorWhiteStroke] + ';stroke-width:10;');
        let ellipse6_line = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse6_line.setAttributeNS(null, 'cx', 380.771); ellipse6_line.setAttributeNS(null, 'cy', 438.01); ellipse6_line.setAttributeNS(null, 'rx', sizeSmallRoundLeg); ellipse6_line.setAttributeNS(null, 'ry', sizeSmallRoundLeg);
        ellipse6_line.setAttributeNS(null, 'style', 'fill:' + myColors[colorWhiteStroke] + ';stroke:' + myColors[colorWhiteStroke] + ';stroke-width:10;');

        let ellipse1 = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse1.setAttributeNS(null, 'cx', 130.773); ellipse1.setAttributeNS(null, 'cy', 438.01); ellipse1.setAttributeNS(null, 'rx', sizeSmallRoundLeg - sizeSmallRoundLeg_minuse); ellipse1.setAttributeNS(null, 'ry', sizeSmallRoundLeg - sizeSmallRoundLeg_minuse);
        ellipse1.setAttributeNS(null, 'style', 'fill:' + myColors[colorWhiteFill] + ';stroke:' + myColors[colorWhiteFill] + ';stroke-width:1;');
        let ellipse2 = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse2.setAttributeNS(null, 'cx', 5.774); ellipse2.setAttributeNS(null, 'cy', 221.505); ellipse2.setAttributeNS(null, 'rx', sizeSmallRoundLeg - sizeSmallRoundLeg_minuse); ellipse2.setAttributeNS(null, 'ry', sizeSmallRoundLeg - sizeSmallRoundLeg_minuse);
        ellipse2.setAttributeNS(null, 'style', 'fill:' + myColors[colorWhiteFill] + ';stroke:' + myColors[colorWhiteFill] + ';stroke-width:10;');
        let ellipse3 = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse3.setAttributeNS(null, 'cx', 130.773); ellipse3.setAttributeNS(null, 'cy', 5); ellipse3.setAttributeNS(null, 'rx', sizeSmallRoundLeg - sizeSmallRoundLeg_minuse); ellipse3.setAttributeNS(null, 'ry', sizeSmallRoundLeg - sizeSmallRoundLeg_minuse);
        ellipse3.setAttributeNS(null, 'style', 'fill:' + myColors[colorWhiteFill] + ';stroke:' + myColors[colorWhiteFill] + ';stroke-width:10;');
        let ellipse4 = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse4.setAttributeNS(null, 'cx', 380.771); ellipse4.setAttributeNS(null, 'cy', 5); ellipse4.setAttributeNS(null, 'rx', sizeSmallRoundLeg - sizeSmallRoundLeg_minuse); ellipse4.setAttributeNS(null, 'ry', sizeSmallRoundLeg - sizeSmallRoundLeg_minuse);
        ellipse4.setAttributeNS(null, 'style', 'fill:' + myColors[colorWhiteFill] + ';stroke:' + myColors[colorWhiteFill] + ';stroke-width:10;');
        let ellipse5 = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse5.setAttributeNS(null, 'cx', 505.771); ellipse5.setAttributeNS(null, 'cy', 221.505); ellipse5.setAttributeNS(null, 'rx', sizeSmallRoundLeg - sizeSmallRoundLeg_minuse); ellipse5.setAttributeNS(null, 'ry', sizeSmallRoundLeg - sizeSmallRoundLeg_minuse);
        ellipse5.setAttributeNS(null, 'style', 'fill:' + myColors[colorWhiteFill] + ';stroke:' + myColors[colorWhiteFill] + ';stroke-width:10;');
        let ellipse6 = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse6.setAttributeNS(null, 'cx', 380.771); ellipse6.setAttributeNS(null, 'cy', 438.01); ellipse6.setAttributeNS(null, 'rx', sizeSmallRoundLeg - sizeSmallRoundLeg_minuse); ellipse6.setAttributeNS(null, 'ry', sizeSmallRoundLeg - sizeSmallRoundLeg_minuse);
        ellipse6.setAttributeNS(null, 'style', 'fill:' + myColors[colorWhiteFill] + ';stroke:' + myColors[colorWhiteFill] + ';stroke-width:10;');

        let myPolygon = dom.window.document.createElementNS(ns, 'polygon');
        myPolygon.setAttributeNS(null, 'points', '130.773,438.01 5.774,221.505 130.773,5  380.771,5 505.771,221.505 380.771,438.01');
        myPolygon.setAttributeNS(null, 'fill', myColors[colorWhiteFill]);
        myPolygon.setAttributeNS(null, 'stroke', '' + myColors[colorWhiteStroke] + '');
        myPolygon.setAttributeNS(null, 'stroke-width', 35);

        let ellipse7 = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse7.setAttributeNS(null, 'cx', 255.7725); ellipse7.setAttributeNS(null, 'cy', 221.505); ellipse7.setAttributeNS(null, 'rx', 20); ellipse7.setAttributeNS(null, 'ry', 20);
        ellipse7.setAttributeNS(null, 'style', 'fill:' + myColors[colorWhiteFill] + ';stroke:' + myColors[colorWhiteFill] + ';stroke-width:30;');
        let ellipse8 = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse8.setAttributeNS(null, 'cx', 255.7725); ellipse8.setAttributeNS(null, 'cy', 221.505); ellipse8.setAttributeNS(null, 'rx', 50); ellipse8.setAttributeNS(null, 'ry', 50);
        ellipse8.setAttributeNS(null, 'style', 'fill:none;stroke:' + myColors[colorWhiteStroke] + ';stroke-width:20;');
        let ellipse9 = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse9.setAttributeNS(null, 'cx', 255.7725); ellipse9.setAttributeNS(null, 'cy', 221.505); ellipse9.setAttributeNS(null, 'rx', 60); ellipse9.setAttributeNS(null, 'ry', 60);
        ellipse9.setAttributeNS(null, 'style', 'fill:black;stroke:' + myColors[colorWhiteStroke] + ';stroke-width:30;');
        let ellipse10 = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse10.setAttributeNS(null, 'cx', 255.7725); ellipse10.setAttributeNS(null, 'cy', 221.505); ellipse10.setAttributeNS(null, 'rx', 110); ellipse10.setAttributeNS(null, 'ry', 110);
        ellipse10.setAttributeNS(null, 'style', 'fill:none;stroke:' + myColors[colorWhiteStroke] + ';stroke-width:20;');
        let ellipse11 = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse11.setAttributeNS(null, 'cx', 255.7725); ellipse11.setAttributeNS(null, 'cy', 221.505); ellipse11.setAttributeNS(null, 'rx', 140); ellipse11.setAttributeNS(null, 'ry', 140);
        ellipse11.setAttributeNS(null, 'style', 'fill:none;stroke:' + myColors[colorWhiteStroke] + ';stroke-width:40;');
        let ellipse12 = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse12.setAttributeNS(null, 'cx', 255.7725); ellipse12.setAttributeNS(null, 'cy', 221.505); ellipse12.setAttributeNS(null, 'rx', 170); ellipse12.setAttributeNS(null, 'ry', 170);
        ellipse12.setAttributeNS(null, 'style', 'fill:none;stroke:' + myColors[colorWhiteStroke] + ';stroke-width:20;');
        
        myMage.appendChild(ellipse1_line);
        myMage.appendChild(ellipse2_line);
        myMage.appendChild(ellipse3_line);
        myMage.appendChild(ellipse4_line);
        myMage.appendChild(ellipse5_line);
        myMage.appendChild(ellipse6_line);
        myMage.appendChild(myPolygon);
        myMage.appendChild(ellipse1);
        myMage.appendChild(ellipse2);
        myMage.appendChild(ellipse3);
        myMage.appendChild(ellipse4);
        myMage.appendChild(ellipse5);
        myMage.appendChild(ellipse6);
        

        myMage.appendChild(ellipse9);

        myMage.appendChild(ellipse11);

        myMage.appendChild(ellipse7);
        setOfAllPieces.appendChild(myMage);
    }

    const sideLength = 28;
    const radius = sideLength / 2;
    const points = Array.from({length: 6}, (_, index) => {
        const angle = (Math.PI / 3) * index;
        return `${radius * Math.cos(angle)},${radius * Math.sin(angle)}`;
    }).join(' ');



    if (makeItBlack === 'yes'){
        for (let i=0;i<allPiecesDict['siren'];i++){
            let mySiren = dom.window.document.createElementNS(ns, 'g');
            mySiren.setAttributeNS(null, 'class', 'draggable siren yellow');
            mySiren.setAttributeNS(null, 'id', 'yellow_siren_' + i);
            let z = 810 + hardTranslate + i * 7;
            mySiren.setAttributeNS(null, 'transform', 'translate(' + z + ', 255) scale(0.8)');
            let ellipse1 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse1.setAttributeNS(null, 'cx', 0); ellipse1.setAttributeNS(null, 'cy', 0); ellipse1.setAttributeNS(null, 'rx', 10); ellipse1.setAttributeNS(null, 'ry', 10);
            ellipse1.setAttributeNS(null, 'style', 'fill:white;stroke:white;stroke-width:4;');            
            let polygon = dom.window.document.createElementNS(ns, 'polygon');
            polygon.setAttribute('points', points);
            polygon.setAttribute('fill', 'black');
            polygon.setAttribute('stroke', 'black');
            polygon.setAttributeNS(null, 'style', 'fill:black;stroke:black;stroke-width:2;');

            let line1 = dom.window.document.createElementNS(ns, 'line');
            line1.setAttributeNS(null, 'x1', -8); line1.setAttributeNS(null, 'x2', 8); line1.setAttributeNS(null, 'y1', -8); line1.setAttributeNS(null, 'y2', 8);
            line1.setAttributeNS(null, 'style', 'stroke:white;stroke-width:1;');
            let line2 = dom.window.document.createElementNS(ns, 'line');
            line2.setAttributeNS(null, 'x1', -8); line2.setAttributeNS(null, 'x2', 8); line2.setAttributeNS(null, 'y1', 8); line2.setAttributeNS(null, 'y2', -8);
            line2.setAttributeNS(null, 'style', 'stroke:white;stroke-width:1;');
            let line3 = dom.window.document.createElementNS(ns, 'line');
            line3.setAttributeNS(null, 'x1', 10); line3.setAttributeNS(null, 'x2', -10); line3.setAttributeNS(null, 'y1', 0); line3.setAttributeNS(null, 'y2', 0);
            line3.setAttributeNS(null, 'style', 'stroke:white;stroke-width:1;');
            let line4 = dom.window.document.createElementNS(ns, 'line');
            line4.setAttributeNS(null, 'x1', 0); line4.setAttributeNS(null, 'x2', 0); line4.setAttributeNS(null, 'y1', -10); line4.setAttributeNS(null, 'y2', 10);
            line4.setAttributeNS(null, 'style', 'stroke:white;stroke-width:1;');

            let ellipse3 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse3.setAttributeNS(null, 'cx', 0); ellipse3.setAttributeNS(null, 'cy', 0); ellipse3.setAttributeNS(null, 'rx', 1); ellipse3.setAttributeNS(null, 'ry', 1);
            ellipse3.setAttributeNS(null, 'style', 'fill:white;stroke:white;stroke-width:11;');

            let ellipse4 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse4.setAttributeNS(null, 'cx', 0); ellipse4.setAttributeNS(null, 'cy', 0); ellipse4.setAttributeNS(null, 'rx', 1); ellipse4.setAttributeNS(null, 'ry', 1);
            ellipse4.setAttributeNS(null, 'style', 'fill:white;stroke:black;stroke-width:9;');

            mySiren.appendChild(ellipse1);
            //mySiren.appendChild(ellipse2);
            mySiren.appendChild(polygon);
            mySiren.appendChild(line1);
            mySiren.appendChild(line2);
            mySiren.appendChild(line3);
            mySiren.appendChild(line4);
            mySiren.appendChild(ellipse3);
            mySiren.appendChild(ellipse4);
            setOfAllPieces.appendChild(mySiren);
        }
    }
    else{
        for (let i=0;i<allPiecesDict['siren'];i++){
            let mySiren = dom.window.document.createElementNS(ns, 'g');
            mySiren.setAttributeNS(null, 'class', 'draggable siren yellow');
            mySiren.setAttributeNS(null, 'id', 'yellow_siren_' + i);
            let z = 810 + hardTranslate + i * 7;
            mySiren.setAttributeNS(null, 'transform', 'translate(' + z + ', 255) scale(0.8)');
            let ellipse1 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse1.setAttributeNS(null, 'cx', 0); ellipse1.setAttributeNS(null, 'cy', 0); ellipse1.setAttributeNS(null, 'rx', 10); ellipse1.setAttributeNS(null, 'ry', 10);
            ellipse1.setAttributeNS(null, 'style', 'fill:' + myColors[colorYellowFill] + ';stroke:' + myColors[colorYellowFill] + ';stroke-width:4;');
            /*let ellipse2 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse2.setAttributeNS(null, 'cx', 0); ellipse2.setAttributeNS(null, 'cy', 0); ellipse2.setAttributeNS(null, 'rx', 12); ellipse2.setAttributeNS(null, 'ry', 12);
            ellipse2.setAttributeNS(null, 'style', 'fill:none;stroke:black;stroke-width:2;');*/
            let polygon = dom.window.document.createElementNS(ns, 'polygon');
            polygon.setAttribute('points', points);
            polygon.setAttribute('fill', myColors[colorYellowFill]);
            polygon.setAttribute('stroke', myColors[colorYellowStroke]);
            polygon.setAttributeNS(null, 'style', 'fill:' + myColors[colorYellowFill]+ ';stroke:' + myColors[colorYellowStroke] + ';stroke-width:2;');

            let line1 = dom.window.document.createElementNS(ns, 'line');
            line1.setAttributeNS(null, 'x1', -8); line1.setAttributeNS(null, 'x2', 8); line1.setAttributeNS(null, 'y1', -8); line1.setAttributeNS(null, 'y2', 8);
            line1.setAttributeNS(null, 'style', 'stroke:' + myColors[colorYellowStroke] + ';stroke-width:1;');
            let line2 = dom.window.document.createElementNS(ns, 'line');
            line2.setAttributeNS(null, 'x1', -8); line2.setAttributeNS(null, 'x2', 8); line2.setAttributeNS(null, 'y1', 8); line2.setAttributeNS(null, 'y2', -8);
            line2.setAttributeNS(null, 'style', 'stroke:' + myColors[colorYellowStroke] + ';stroke-width:1;');
            let line3 = dom.window.document.createElementNS(ns, 'line');
            line3.setAttributeNS(null, 'x1', 10); line3.setAttributeNS(null, 'x2', -10); line3.setAttributeNS(null, 'y1', 0); line3.setAttributeNS(null, 'y2', 0);
            line3.setAttributeNS(null, 'style', 'stroke:' + myColors[colorYellowStroke] + ';stroke-width:1;');
            let line4 = dom.window.document.createElementNS(ns, 'line');
            line4.setAttributeNS(null, 'x1', 0); line4.setAttributeNS(null, 'x2', 0); line4.setAttributeNS(null, 'y1', -10); line4.setAttributeNS(null, 'y2', 10);
            line4.setAttributeNS(null, 'style', 'stroke:' + myColors[colorYellowStroke] + ';stroke-width:1;');

            let ellipse3 = dom.window.document.createElementNS(ns, 'ellipse');
            ellipse3.setAttributeNS(null, 'cx', 0); ellipse3.setAttributeNS(null, 'cy', 0); ellipse3.setAttributeNS(null, 'rx', 1); ellipse3.setAttributeNS(null, 'ry', 1);
            ellipse3.setAttributeNS(null, 'style', 'fill:' + myColors[colorYellowStroke] + ';stroke:' + myColors[colorYellowStroke] + ';stroke-width:11;');

            mySiren.appendChild(ellipse1);

            mySiren.appendChild(polygon);
            mySiren.appendChild(line1);
            mySiren.appendChild(line2);
            mySiren.appendChild(line3);
            mySiren.appendChild(line4);
            mySiren.appendChild(ellipse3);
            setOfAllPieces.appendChild(mySiren);
        }
    }

    for (let i=0;i<allPiecesDict['siren'];i++){
        let mySiren = dom.window.document.createElementNS(ns, 'g');
        mySiren.setAttributeNS(null, 'class', 'draggable siren white');
        mySiren.setAttributeNS(null, 'id', 'white_siren_' + i);
        let z = 810 + hardTranslate + i * 7;
        mySiren.setAttributeNS(null, 'transform', 'translate(' + z + ', 285) scale(0.8)');        
        let ellipse1 = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse1.setAttributeNS(null, 'cx', 0); ellipse1.setAttributeNS(null, 'cy', 0); ellipse1.setAttributeNS(null, 'rx', 10); ellipse1.setAttributeNS(null, 'ry', 10);
        ellipse1.setAttributeNS(null, 'style', 'fill:' + myColors[colorWhiteFill] + ';stroke:' + myColors[colorWhiteFill] + ';stroke-width:4;');
        /*let ellipse2 = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse2.setAttributeNS(null, 'cx', 0); ellipse2.setAttributeNS(null, 'cy', 0); ellipse2.setAttributeNS(null, 'rx', 12); ellipse2.setAttributeNS(null, 'ry', 12);
        ellipse2.setAttributeNS(null, 'style', 'fill:none;stroke:black;stroke-width:2;');*/
        let polygon = dom.window.document.createElementNS(ns, 'polygon');
        polygon.setAttribute('points', points);
        polygon.setAttribute('fill', myColors[colorWhiteFill]);
        polygon.setAttribute('stroke', myColors[colorWhiteStroke]);
        polygon.setAttributeNS(null, 'style', 'fill:' + myColors[colorWhiteFill]+ ';stroke:' + myColors[colorWhiteStroke] + ';stroke-width:2;');

        let line1 = dom.window.document.createElementNS(ns, 'line');
        line1.setAttributeNS(null, 'x1', -8); line1.setAttributeNS(null, 'x2', 8); line1.setAttributeNS(null, 'y1', -8); line1.setAttributeNS(null, 'y2', 8);
        line1.setAttributeNS(null, 'style', 'stroke:' + myColors[colorWhiteStroke] + ';stroke-width:1;');
        let line2 = dom.window.document.createElementNS(ns, 'line');
        line2.setAttributeNS(null, 'x1', -8); line2.setAttributeNS(null, 'x2', 8); line2.setAttributeNS(null, 'y1', 8); line2.setAttributeNS(null, 'y2', -8);
        line2.setAttributeNS(null, 'style', 'stroke:' + myColors[colorWhiteStroke] + ';stroke-width:1;');
        let line3 = dom.window.document.createElementNS(ns, 'line');
        line3.setAttributeNS(null, 'x1', 10); line3.setAttributeNS(null, 'x2', -10); line3.setAttributeNS(null, 'y1', 0); line3.setAttributeNS(null, 'y2', 0);
        line3.setAttributeNS(null, 'style', 'stroke:' + myColors[colorWhiteStroke] + ';stroke-width:1;');
        let line4 = dom.window.document.createElementNS(ns, 'line');
        line4.setAttributeNS(null, 'x1', 0); line4.setAttributeNS(null, 'x2', 0); line4.setAttributeNS(null, 'y1', -10); line4.setAttributeNS(null, 'y2', 10);
        line4.setAttributeNS(null, 'style', 'stroke:' + myColors[colorWhiteStroke] + ';stroke-width:1;');

        let ellipse3 = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse3.setAttributeNS(null, 'cx', 0); ellipse3.setAttributeNS(null, 'cy', 0); ellipse3.setAttributeNS(null, 'rx', 1); ellipse3.setAttributeNS(null, 'ry', 1);
        ellipse3.setAttributeNS(null, 'style', 'fill:' + myColors[colorWhiteStroke] + ';stroke:' + myColors[colorWhiteStroke] + ';stroke-width:11;');

        let ellipse4 = dom.window.document.createElementNS(ns, 'ellipse');
        ellipse4.setAttributeNS(null, 'cx', 0); ellipse4.setAttributeNS(null, 'cy', 0); ellipse4.setAttributeNS(null, 'rx', 1); ellipse4.setAttributeNS(null, 'ry', 1);
        ellipse4.setAttributeNS(null, 'style', 'fill:white;stroke:white;stroke-width:6;');

        mySiren.appendChild(ellipse1);

        mySiren.appendChild(polygon);
        mySiren.appendChild(line1);
        mySiren.appendChild(line2);
        mySiren.appendChild(line3);
        mySiren.appendChild(line4);
        mySiren.appendChild(ellipse3);
        mySiren.appendChild(ellipse4);
        setOfAllPieces.appendChild(mySiren);
    }

    let nbGhouls = allPiecesDict['ghoul'];

    if (makeItBlack === 'yes'){
        for (let i=0;i<nbGhouls;i++){
            let myGhoul = dom.window.document.createElementNS(ns, 'g');
            myGhoul.setAttributeNS(null, 'class', 'draggable ghoul yellow');
            myGhoul.setAttributeNS(null, 'id', 'yellow_ghoul_' + i);
            let z = 740 + hardTranslate + i * 11;
            myGhoul.setAttributeNS(null, 'transform', 'translate(' + z + ', 320) scale(0.8)');        
            let myRect = dom.window.document.createElementNS(ns, 'rect');
            myRect.setAttributeNS(null, 'x', 0); myRect.setAttributeNS(null, 'y', 0); 
            myRect.setAttributeNS(null, 'width', 19); myRect.setAttributeNS(null, 'height', 19); 
            myRect.setAttributeNS(null, 'style', 'fill:black;stroke:black;stroke-width:2;');
            myGhoul.appendChild(myRect);

            myRect = dom.window.document.createElementNS(ns, 'rect');
            myRect.setAttributeNS(null, 'x', 7); myRect.setAttributeNS(null, 'y', 7); 
            myRect.setAttributeNS(null, 'width', 5); myRect.setAttributeNS(null, 'height', 5); 
            myRect.setAttributeNS(null, 'style', 'fill:black;stroke:white;stroke-width:1.0;');
            myGhoul.appendChild(myRect);

            setOfAllPieces.appendChild(myGhoul);
        }
    }
    else{
        for (let i=0;i<nbGhouls;i++){
            let myGhoul = dom.window.document.createElementNS(ns, 'g');
            myGhoul.setAttributeNS(null, 'class', 'draggable ghoul yellow');
            myGhoul.setAttributeNS(null, 'id', 'yellow_ghoul_' + i);
            let z = 740 + hardTranslate + i * 11;
            myGhoul.setAttributeNS(null, 'transform', 'translate(' + z + ', 320) scale(0.8)');        
            let myRect = dom.window.document.createElementNS(ns, 'rect');
            myRect.setAttributeNS(null, 'x', 0); myRect.setAttributeNS(null, 'y', 0); 
            myRect.setAttributeNS(null, 'width', 19); myRect.setAttributeNS(null, 'height', 19); 
            myRect.setAttributeNS(null, 'style', 'fill:' + myColors[colorYellowFill] + ';stroke:' + myColors[colorYellowStroke] + ';stroke-width:2;');
            myGhoul.appendChild(myRect);



            setOfAllPieces.appendChild(myGhoul);
        }
    }

    for (let i=0;i<nbGhouls;i++){
        let myGhoul = dom.window.document.createElementNS(ns, 'g');
        myGhoul.setAttributeNS(null, 'class', 'draggable ghoul white');
        myGhoul.setAttributeNS(null, 'id', 'white_ghoul_' + i);
        let z = 740 + hardTranslate + i * 11;
        myGhoul.setAttributeNS(null, 'transform', 'translate(' + z + ', 340) scale(0.8)');        
        let myRect = dom.window.document.createElementNS(ns, 'rect');
        myRect.setAttributeNS(null, 'x', 0); myRect.setAttributeNS(null, 'y', 0); 
        myRect.setAttributeNS(null, 'width', 19); myRect.setAttributeNS(null, 'height', 19); 
        myRect.setAttributeNS(null, 'style', 'fill:' + myColors[colorWhiteFill] + ';stroke:' + myColors[colorWhiteStroke] + ';stroke-width:2;');
        myGhoul.appendChild(myRect);
        


        setOfAllPieces.appendChild(myGhoul);
    }

    //boardOfPolys.appendChild(setOfAllPieces);
    svg.appendChild(boardOfPolys);
    setOfAllPieces.setAttributeNS(null, 'transform', 'translate(200, 10) scale(1.0)');
    svg.appendChild(setOfAllPieces);
    
    

    Array.from(dom.window.document.getElementsByClassName('draggable')).forEach(
        function(item){
          item.setAttributeNS(null, 'currentposition', 'created');
        });    

    { 
        //setup randomly
        let myButtonSetupRandomly = dom.window.document.createElementNS(ns, 'g');
        myButtonSetupRandomly.setAttributeNS(null, 'id', 'myButtonSetupRandomly');
        myButtonSetupRandomly.setAttributeNS(null, 'class', 'myButtonSetupRandomly button');    
        let myRect = dom.window.document.createElementNS(ns, 'rect');
        myRect.setAttributeNS(null, 'x', 770); 
        myRect.setAttributeNS(null, 'y', 70); 
        myRect.setAttributeNS(null, 'width', 90); 
        myRect.setAttributeNS(null, 'height', 20); 
        myRect.setAttributeNS(null, 'style', 'fill:#dddddd;stroke:black;stroke-width:1;');
        myButtonSetupRandomly.appendChild(myRect);
        
        let myLabel = dom.window.document.createElementNS(ns, 'text');
        myLabel.setAttributeNS(null, 'x', 815);
        myLabel.setAttributeNS(null, 'y', 84);
        myLabel.setAttributeNS(null, 'style', 'text-anchor:center;font-family:Arial;font-size:9px;fill:black;text-anchor:middle;pointer-events:none;font-weight:bold;');
        myLabel.textContent = 'Random Setup';
        myButtonSetupRandomly.appendChild(myLabel);
        svg.appendChild(myButtonSetupRandomly);
    }

    { 
        // new board
        let myButtonNewBoardRequested = dom.window.document.createElementNS(ns, 'g');
        myButtonNewBoardRequested.setAttributeNS(null, 'id', 'myButtonNewBoardRequested');
        myButtonNewBoardRequested.setAttributeNS(null, 'class', 'myButtonNewBoardRequested button');    
        let myRect = dom.window.document.createElementNS(ns, 'rect');
        myRect.setAttributeNS(null, 'x', 770); 
        myRect.setAttributeNS(null, 'y', 10); 
        myRect.setAttributeNS(null, 'width', 90); 
        myRect.setAttributeNS(null, 'height', 20); 
        myRect.setAttributeNS(null, 'style', 'fill:#dddddd;stroke:black;stroke-width:1;');
        myButtonNewBoardRequested.appendChild(myRect);

        let myLabel2 = dom.window.document.createElementNS(ns, 'text');
        myLabel2.setAttributeNS(null, 'x', 815);
        myLabel2.setAttributeNS(null, 'y', 24);
        myLabel2.setAttributeNS(null, 'style', 'text-anchor:center;font-family:Arial;font-size:10px;fill:black;text-anchor:middle;pointer-events:none;font-weight:bold;');
        myLabel2.textContent = 'Switch Board';
        myButtonNewBoardRequested.appendChild(myLabel2);
        svg.appendChild(myButtonNewBoardRequested);
    }

    { 
        // rotate
        let myButton5 = dom.window.document.createElementNS(ns, 'g');
        myButton5.setAttributeNS(null, 'id', 'myButton5');
        myButton5.setAttributeNS(null, 'class', 'myButton5 button');    
        let myRect = dom.window.document.createElementNS(ns, 'rect');
        myRect.setAttributeNS(null, 'x', 770); 
        myRect.setAttributeNS(null, 'y', 40); 
        myRect.setAttributeNS(null, 'width', 90); 
        myRect.setAttributeNS(null, 'height', 20); 
        myRect.setAttributeNS(null, 'style', 'fill:#dddddd;stroke:black;stroke-width:1;');
        myButton5.appendChild(myRect);

        let myLabel3 = dom.window.document.createElementNS(ns, 'text');
        myLabel3.setAttributeNS(null, 'x', 815);
        myLabel3.setAttributeNS(null, 'y', 54);
        myLabel3.setAttributeNS(null, 'style', 'text-anchor:center;font-family:Arial;font-size:10px;fill:black;text-anchor:middle;pointer-events:none;font-weight:bold;');
        myLabel3.textContent = 'Flip Board';
        myButton5.appendChild(myLabel3);
        svg.appendChild(myButton5);
    }



    let setOfCircles = dom.window.document.createElementNS(ns, 'g');
    setOfCircles.setAttributeNS(null, 'id', 'setOfCircles');
    setOfCircles.setAttributeNS(null, 'transform', 'translate(-385, 20) scale(1.0)');

    { 
        let myButtonEndTurn = dom.window.document.createElementNS(ns, 'g');
        myButtonEndTurn.setAttributeNS(null, 'id', 'myButtonEndTurn');
        myButtonEndTurn.setAttributeNS(null, 'class', 'myButtonEndTurn button');    
        let myRect = dom.window.document.createElementNS(ns, 'rect');
        myRect.setAttributeNS(null, 'x', 910); 
        myRect.setAttributeNS(null, 'y', 408); 
        myRect.setAttributeNS(null, 'width', 62); 
        myRect.setAttributeNS(null, 'height', 23); 
        myRect.setAttributeNS(null, 'style', 'fill:grey;stroke:black;stroke-width:1;');
        myButtonEndTurn.appendChild(myRect);
        let myPath = dom.window.document.createElementNS(ns, 'text');
        myPath.setAttributeNS(null, 'class', 'label visible');
        myPath.setAttributeNS(null, 'x', 915);
        myPath.setAttributeNS(null, 'y', 423);
        myPath.setAttributeNS(null, 'style', 'text-align:center;font-family:monospace;font-size:11px;fill:black;fill-opacity:1;stroke-width:3.5;pointer-events:none;textLength="100%"');
        myPath.textContent = 'end turn'
        myButtonEndTurn.appendChild(myPath);
        setOfCircles.appendChild(myButtonEndTurn);
    }

    //if(myLastColor !== 'grey')
    {
        let myCircleGrey = dom.window.document.createElementNS(ns, 'g');
        myCircleGrey.setAttributeNS(null, 'id', 'myCircleGrey');
        myCircleGrey.setAttributeNS(null, 'class', 'myCircleGrey colorSelector');
        myCircleGrey.setAttributeNS(null, 'fill', myColors['grey']);
        myCircleGrey.setAttributeNS(null, 'originalcolor', myColors['grey']);
        myCircleGrey.setAttributeNS(null, 'color', 'grey');
        let myCircle = dom.window.document.createElementNS(ns, 'circle');
        myCircle.setAttributeNS(null, 'cx', 740); 
        myCircle.setAttributeNS(null, 'cy', 420); 
        myCircle.setAttributeNS(null, 'r', 15); 
        myCircle.setAttributeNS(null, 'style', 'stroke:black;stroke-width:1;');
        myCircleGrey.appendChild(myCircle);
        setOfCircles.appendChild(myCircleGrey);
    }

    //if(myLastColor !== 'green')
    {
        let myCircleGreen = dom.window.document.createElementNS(ns, 'g');
        myCircleGreen.setAttributeNS(null, 'id', 'myCircleGreen');
        myCircleGreen.setAttributeNS(null, 'class', 'myCircleGreen colorSelector');
        myCircleGreen.setAttributeNS(null, 'fill', myColors['green']);
        myCircleGreen.setAttributeNS(null, 'originalcolor', myColors['green']);
        myCircleGreen.setAttributeNS(null, 'color', 'green');
        let myCircle = dom.window.document.createElementNS(ns, 'circle');
        myCircle.setAttributeNS(null, 'cx', 775); 
        myCircle.setAttributeNS(null, 'cy', 420); 
        myCircle.setAttributeNS(null, 'r', 15); 
        myCircle.setAttributeNS(null, 'style', 'stroke:black;stroke-width:1;');
        myCircleGreen.appendChild(myCircle);
        setOfCircles.appendChild(myCircleGreen);
    }

    //if(myLastColor !== 'blue')
    {
        let myCircleBlue = dom.window.document.createElementNS(ns, 'g');
        myCircleBlue.setAttributeNS(null, 'id', 'myCircleBlue');
        myCircleBlue.setAttributeNS(null, 'class', 'myCircleBlue colorSelector');
        myCircleBlue.setAttributeNS(null, 'fill', myColors['blue']);
        myCircleBlue.setAttributeNS(null, 'originalcolor', myColors['blue']);
        myCircleBlue.setAttributeNS(null, 'color', 'blue');
        let myCircle = dom.window.document.createElementNS(ns, 'circle');
        myCircle.setAttributeNS(null, 'cx', 810); 
        myCircle.setAttributeNS(null, 'cy', 420); 
        myCircle.setAttributeNS(null, 'r', 15); 
        myCircle.setAttributeNS(null, 'style', 'stroke:black;stroke-width:1;');
        myCircleBlue.appendChild(myCircle);
        setOfCircles.appendChild(myCircleBlue);
    }

    //if(myLastColor !== 'orange')
    {
        let myCircleOrange = dom.window.document.createElementNS(ns, 'g');
        myCircleOrange.setAttributeNS(null, 'id', 'myCircleOrange');
        myCircleOrange.setAttributeNS(null, 'class', 'myCircleOrange colorSelector');    
        myCircleOrange.setAttributeNS(null, 'fill', myColors['orange']);
        myCircleOrange.setAttributeNS(null, 'originalcolor', myColors['orange']);
        myCircleOrange.setAttributeNS(null, 'color', 'orange');
        let myCircle = dom.window.document.createElementNS(ns, 'circle');
        myCircle.setAttributeNS(null, 'cx', 845); 
        myCircle.setAttributeNS(null, 'cy', 420); 
        myCircle.setAttributeNS(null, 'r', 15); 
        myCircle.setAttributeNS(null, 'style', 'stroke:black;stroke-width:1;');
        myCircleOrange.appendChild(myCircle);
        setOfCircles.appendChild(myCircleOrange);
    }

    svg.appendChild(setOfCircles);




    {
        const purpleFooter = dom.window.document.createElementNS(ns, 'rect');
        purpleFooter.setAttributeNS(null, 'id', 'purpleFooter');
        purpleFooter.setAttributeNS(null, 'x', '0');
        purpleFooter.setAttributeNS(null, 'y', '470'); // Position at bottom of SVG
        purpleFooter.setAttributeNS(null, 'width', '896'); // Match SVG width
        purpleFooter.setAttributeNS(null, 'height', '50'); // Set height of footer
        // purpleFooter.setAttributeNS(null, 'fill', '#800080'); // Set purple color
        //purpleFooter.setAttributeNS(null, 'fill', '#7B68EE'); // Set purple color
        purpleFooter.setAttributeNS(null, 'fill', 'black'); // Set purple color

        svg.appendChild(purpleFooter);
    }

    {
        let clockWhite = dom.window.document.createElementNS(ns, 'text');
        clockWhite.setAttributeNS(null, 'id', 'clockWhite');
        clockWhite.setAttributeNS(null, 'x', 60);
        clockWhite.setAttributeNS(null, 'y', 150);
        clockWhite.setAttributeNS(null, 'style', 'font-family="Arial";font-size:50px;fill:white;fill-opacity:1;stroke-width:10;');
        // clockWhite.textContent = timeInfo['timeWhite'];

        let minutes = Math.floor(timeInfo['timeWhite'] / 60000);
        let seconds = Math.floor((timeInfo['timeWhite'] % 60000) / 1000);
        clockWhite.textContent = minutes + ':' + seconds.toString().padStart(2, '0');

        svg.appendChild(clockWhite);

        let clockYellow = dom.window.document.createElementNS(ns, 'text');
        clockYellow.setAttributeNS(null, 'id', 'clockYellow');
        clockYellow.setAttributeNS(null, 'x', 60);
        clockYellow.setAttributeNS(null, 'y', 300);
        clockYellow.setAttributeNS(null, 'style', 'font-family="Arial";font-size:50px;fill:white;fill-opacity:1;stroke-width:10;');
        // clockYellow.textContent = timeInfo['timeYellow'];

        minutes = Math.floor(timeInfo['timeYellow'] / 60000);
        seconds = Math.floor((timeInfo['timeYellow'] % 60000) / 1000);
        clockYellow.textContent = minutes + ':' + seconds.toString().padStart(2, '0');

        svg.appendChild(clockYellow);
    }

    //return pretty(dom.serialize());
    return beautify(dom.serialize(), {format: 'xml'});
}

module.exports.setDataFolder = setDataFolder;
module.exports.getMainPage = getMainPage;
module.exports.getRandomFilename = getRandomFilename;

