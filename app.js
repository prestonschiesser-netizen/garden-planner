const canvas = document.getElementById('gardenCanvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
const plantSelect = document.getElementById('plantSelect');
const gridSize = 10; // default grid size, scalable later
const cellSize = 50; // pixels

let currentTool = null;
let plantsData = []; // loaded from CSV
let gardenGrid = []; // stores info for each cell

// category → emoji
const emojiMap = {
  herb: "🌿",
  vegetable: "🥕",
  fruit: "🍅",
  flower: "🌸",
  corn: "🌽",
  bean: "🫘",
  other: "🌱"
};

// Initialize grid
function initGrid() {
  for (let y=0; y<gridSize; y++) {
    gardenGrid[y] = [];
    for (let x=0; x<gridSize; x++) {
      gardenGrid[y][x] = { type: 'empty', plant: null };
    }
  }
}

// Draw grid
function drawGrid() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let y=0;y<gridSize;y++){
    for(let x=0;x<gridSize;x++){
      const cell = gardenGrid[y][x];
      ctx.fillStyle = cell.type === 'tilled' ? '#deb887' :
                      cell.type === 'raised' ? '#a0522d' : '#7cfc00';
      ctx.fillRect(x*cellSize, y*cellSize, cellSize-1, cellSize-1);

      // Draw plant emoji
      if(cell.plant){
        ctx.font = `${cellSize*0.6}px Arial`;
        ctx.fillText(emojiMap[cell.plant.category] || "🌱",
                     x*cellSize + cellSize*0.2,
                     y*cellSize + cellSize*0.7);
      }

      // Draw grid lines
      ctx.strokeStyle = "#000";
      ctx.strokeRect(x*cellSize, y*cellSize, cellSize, cellSize);
    }
  }
}

// Load seeds.csv
async function loadSeeds() {
  const resp = await fetch('seeds.csv');
  const text = await resp.text();
  const rows = text.split('\n').slice(1);
  rows.forEach(row=>{
    if(!row.trim()) return;
    const cols = row.split(',');
    const plant = {
      crop: cols[0],
      variety: cols[1],
      start_method: cols[2],
      start_time: cols[3],
      outside_time: cols[4],
      spacing: cols[5],
      notes: cols[6],
      category: categorize(cols[0])
    };
    plantsData.push(plant);
    const option = document.createElement('option');
    option.value = plantsData.length-1; // index
    option.textContent = plant.variety;
    plantSelect.appendChild(option);
  });
}

// categorize crop
function categorize(crop){
  crop = crop.toLowerCase();
  if(crop.includes('herb')) return 'herb';
  if(crop.includes('flower')) return 'flower';
  if(crop.includes('tomato') || crop.includes('pepper') || crop.includes('cucumber') || crop.includes('squash') || crop.includes('melon') || crop.includes('beet') || crop.includes('carrot') || crop.includes('corn')) return 'vegetable';
  if(crop.includes('corn')) return 'corn';
  if(crop.includes('bean')) return 'bean';
  return 'other';
}

// Tool selection
document.getElementById('tiller').onclick = ()=>currentTool='tilled';
document.getElementById('raisedBed').onclick = ()=>currentTool='raised';
plantSelect.onchange = ()=>currentTool='plant';

// Handle clicks on canvas
canvas.addEventListener('click', e=>{
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left)/cellSize);
  const y = Math.floor((e.clientY - rect.top)/cellSize);
  const cell = gardenGrid[y][x];

  if(currentTool==='tilled') cell.type='tilled';
  else if(currentTool==='raised') cell.type='raised';
  else if(currentTool==='plant' && plantSelect.value){
    if(cell.type==='tilled' || plantsData[plantSelect.value].category==='herb'){
      cell.plant = plantsData[plantSelect.value];
    }
  }

  drawGrid();
});

// Tooltip on hover
canvas.addEventListener('mousemove', e=>{
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left)/cellSize);
  const y = Math.floor((e.clientY - rect.top)/cellSize);
  const cell = gardenGrid[y]?.[x];
  if(cell && cell.plant){
    tooltip.style.display='block';
    tooltip.style.left = (e.pageX + 10)+'px';
    tooltip.style.top = (e.pageY + 10)+'px';
    tooltip.innerHTML = `
      <strong>${cell.plant.variety}</strong><br>
      Crop: ${cell.plant.crop}<br>
      Start: ${cell.plant.start_method}<br>
      Spacing: ${cell.plant.spacing} in<br>
      Notes: ${cell.plant.notes}
    `;
  } else tooltip.style.display='none';
});

// Save/load to localStorage
function saveGarden(){ localStorage.setItem('gardenGrid', JSON.stringify(gardenGrid)); }
function loadGarden(){
  const saved = localStorage.getItem('gardenGrid');
  if(saved){ gardenGrid = JSON.parse(saved); drawGrid(); }
}

window.onload = async ()=>{
  initGrid();
  await loadSeeds();
  loadGarden();
  drawGrid();
}

// Save automatically every 10 seconds
setInterval(saveGarden, 10000);
