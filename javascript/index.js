function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/*********************************************************************************/

const webSocket = io('/lobby');

/*********************************************************************************/

function createTable(data) {
  let table = document.getElementById('tableId');
  if (table){
    // do nothing
    //console.log('table already exists');
    table.remove();
  }  
  table = document.createElement('table');
  table.id = 'tableId';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');  

  data[0].forEach(key => {
    const th = document.createElement('th');
    th.textContent = key;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);  

  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  data.forEach((row, index) => {
    if (index > 0) { // Skip the header row
      const rowElement = document.createElement('tr');
      row.forEach(cellData => {
        const cell = document.createElement('td');
        /*
        const a = document.createElement('a');
        a.href = 'https://www.example.com'; // Replace with your desired URL
        a.textContent = 'Click me';
        */
        //  console.log(typeof cellData);
        if(String(cellData).startsWith('http')){
          const a = document.createElement('a');
          a.href = cellData;
          a.textContent = cellData;
          cell.appendChild(a);
        }
        else{
          cell.textContent = cellData;
        }
        
        rowElement.appendChild(cell);
      });
      tbody.appendChild(rowElement);
    }
  });
  table.appendChild(tbody);

  // Append the table to a specific element in the DOM
  const container = document.getElementById('myTable'); // Replace with your container ID
  container.appendChild(table);

  //console.log('myData')
}

/*const myData = [
  ['Name', 'Age', 'City'],
  ['Alice', 25, 'New York'],
  ['Bob', 30, 'Los Angeles'],
  ['Charlie', 28, 'Chicago']
];

window.onload = createTable(myData);*/

// console.log('LOADED');

/*********************************************************************************/

const btn = document.getElementById('createGame');
btn.addEventListener('click', async () => {
  try {
    const response = await fetch('/create_game', { method: 'GET' });
    const myText = await response.text();
    console.error('myText :' + myText);
    window.location.href = myText;
  } 
  catch (error) {
    console.error('Error :' + error);
  }
});

/*********************************************************************************/

webSocket.on('message', (data) => {
  const myMessage = JSON.parse(data);
  const typeOfMessage = Object.keys(myMessage)[0];

  switch(typeOfMessage) {
    case 'listOfCurrentGames':
      let allUrls = [];
      let allUrlsCount = {};
      for (let e of Object.keys(myMessage['listOfCurrentGames'])) {
        let url = 'http://' + location.hostname + ':3000/games/' + e;
        allUrls.push(url);
        allUrlsCount[url] = myMessage['listOfCurrentGames'][e].length;
      }

      let myUrlsData = [['url', 'clients']];
      for (let e of Object.keys(allUrlsCount)) {
        myUrlsData.push([e, allUrlsCount[e]]);
      }

      createTable(myUrlsData);

      break;    
    }

});

webSocket.on('connect', () => {
  console.log('socket.io connected to lobby');
});

/*********************************************************************************/
/*********************************************************************************/
/*********************************************************************************/
/*********************************************************************************/























