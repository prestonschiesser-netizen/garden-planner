const canvas = document.getElementById('gardenCanvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
const plantSelect = document.getElementById('plantSelect');
const sidebar = document.getElementById('sidebar');
const plantList = document.getElementById('plantList');
const gardenSizeSelect = document.getElementById('gardenSize');

let currentTool = null;
let plantsData = [];
let gardenGrid = [];
let placedPlants = [];

let gridSize = parseInt(gardenSizeSelect.value);
let cellSize = 600 / gridSize;

const emojiMap = { herb:"🌿", vegetable:"🥕", fruit:"🍅", flower:"🌸", corn:"🌽", bean:"🫘", other:"🌱" };

// Initialize garden grid
function initGrid() {
  gardenGrid = [];
  for(let y=0;y<gridSize;y++){
    gardenGrid[y]=[];
    for(let x=0;x<gridSize;x++){
      gardenGrid[y][x]={ type:'empty', plant:null };
    }
  }
}

// Draw garden grid and plants
function drawGrid() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let y=0;y<gridSize;y++){
    for(let x=0;x<gridSize;x++){
      const cell = gardenGrid[y][x];
      ctx.fillStyle = cell.type==='tilled' ? '#deb887' :
                      cell.type==='raised' ? '#a0522d' : '#7cfc00';
      ctx.fillRect(x*cellSize, y*cellSize, cellSize-1, cellSize-1);

      if(cell.plant){
        const emoji = emojiMap[cell.plant.category] || '🌱';
        ctx.font = `${cellSize*0.6}px Arial`;
        ctx.fillText(emoji, x*cellSize + cellSize*0.2, y*cellSize + cellSize*0.7);
      }

      ctx.strokeStyle = "#00000022";
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
      spacing: parseInt(cols[5]),
      notes: cols[6],
      category: categorize(cols[0])
    };
    plantsData.push(plant);
    const option = document.createElement('option');
    option.value = plantsData.length-1;
    option.textContent = plant.variety;
    plantSelect.appendChild(option);
  });
}

// Categorize plant for emoji
function categorize(crop){
  crop=crop.toLowerCase();
  if(crop.includes('herb')) return 'herb';
  if(crop.includes('flower')) return 'flower';
  if(crop.includes('tomato')||crop.includes('pepper')||crop.includes('cucumber')||crop.includes('squash')||crop.includes('melon')||crop.includes('beet')||crop.includes('carrot')) return 'vegetable';
  if(crop.includes('corn')) return 'corn';
  if(crop.includes('bean')) return 'bean';
  return 'other';
}

// Tool selection
document.getElementById('tiller').onclick = ()=>currentTool='tilled';
document.getElementById('raisedBed').onclick = ()=>currentTool='raised';
plantSelect.onchange = ()=>currentTool='plant';
document.getElementById('toggleSidebar').onclick = ()=>sidebar.style.display = sidebar.style.display==='none'?'block':'none';
gardenSizeSelect.onchange = ()=>{
  gridSize=parseInt(gardenSizeSelect.value);
  cellSize=600/gridSize;
  initGrid();
  drawGrid();
  placedPlants=[];
  updateSidebar();
};

// Snap function for plant placement based on spacing
function snapCoordinate(coord, snapSize){
  return Math.floor(coord / snapSize) * snapSize;
}

// Place plants respecting spacing and soil
canvas.addEventListener('click', e=>{
  const rect = canvas.getBoundingClientRect();
  let x = Math.floor((e.clientX - rect.left)/cellSize);
  let y = Math.floor((e.clientY - rect.top)/cellSize);

  if(currentTool==='tilled') { gardenGrid[y][x].type='tilled'; drawGrid(); return; }
  if(currentTool==='raised') { gardenGrid[y][x].type='raised'; drawGrid(); return; }
  if(currentTool==='plant' && plantSelect.value){
    const plant = plantsData[plantSelect.value];
    const snapTiles = Math.ceil(plant.spacing / 12);

    // Snap x/y to plant's spacing grid
    x = snapCoordinate(x, snapTiles);
    y = snapCoordinate(y, snapTiles);

    const occupiedTiles = [];
    let canPlace=true;

    for(let dy=0; dy<snapTiles; dy++){
      for(let dx=0; dx<snapTiles; dx++){
        const nx = x + dx;
        const ny = y + dy;
        if(ny>=gridSize || nx>=gridSize){
          canPlace=false; break;
        }
        const cell = gardenGrid[ny][nx];
        if(cell.plant) canPlace=false;
        if(plant.category!=='herb' && cell.type!=='tilled' && cell.type!=='raised') canPlace=false;
      }
    }

    if(canPlace){
      for(let dy=0; dy<snapTiles; dy++){
        for(let dx=0; dx<snapTiles; dx++){
          const nx = x + dx;
          const ny = y + dy;
          gardenGrid[ny][nx].plant = plant;
          occupiedTiles.push({x:nx,y:ny});
        }
      }
      placedPlants.push({plant, occupiedTiles});
      updateSidebar();
      drawGrid();
    } else {
      alert("Cannot place here. Check spacing or soil type.");
    }
  }
});

// Tooltip
canvas.addEventListener('mousemove', e=>{
  const rect=canvas.getBoundingClientRect();
  const x=Math.floor((e.clientX-rect.left)/cellSize);
  const y=Math.floor((e.clientY-rect.top)/cellSize);
  const cell=gardenGrid[y]?.[x];
  if(cell && cell.plant){
    tooltip.style.display='block';
    tooltip.style.left=(e.pageX+10)+'px';
    tooltip.style.top=(e.pageY+10)+'px';
    tooltip.innerHTML=`
      <strong>${cell.plant.variety}</strong><br>
      Crop: ${cell.plant.crop}<br>
      Start: ${cell.plant.start_method}<br>
      Spacing: ${cell.plant.spacing} in<br>
      Notes: ${cell.plant.notes}
    `;
  } else tooltip.style.display='none';
});

// Update sidebar
function updateSidebar(){
  plantList.innerHTML='';
  placedPlants.forEach(p=>{
    const li=document.createElement('li');
    li.textContent=`${p.plant.variety} - ${p.occupiedTiles.length} tiles`;
    plantList.appendChild(li);
  });
}

// Initialize
window.onload = async ()=>{
  initGrid();
  await loadSeeds();
  drawGrid();
};
