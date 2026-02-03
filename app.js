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

let gridSizeFt = parseInt(gardenSizeSelect.value); // garden size in feet
let gridSizeInches = gridSizeFt * 12; // internal 1-inch grid
let canvasSize = 600; // pixels
let cellSizePx = canvasSize / gridSizeInches; // size of 1 inch in pixels

const emojiMap = { herb:"🌿", vegetable:"🥕", fruit:"🍅", flower:"🌸", corn:"🌽", bean:"🫘", other:"🌱" };

// Initialize garden grid
function initGrid() {
  gardenGrid = [];
  for(let y=0;y<gridSizeInches;y++){
    gardenGrid[y]=[];
    for(let x=0;x<gridSizeInches;x++){
      gardenGrid[y][x]={ type:'empty', plant:null };
    }
  }
}

// Draw grid and plants
function drawGrid() {
  ctx.clearRect(0,0,canvasSize,canvasSize);

  // Draw tiles
  for(let y=0;y<gridSizeInches;y++){
    for(let x=0;x<gridSizeInches;x++){
      const cell = gardenGrid[y][x];
      ctx.fillStyle = cell.type==='tilled' ? '#deb887' :
                      cell.type==='raised' ? '#a0522d' : '#7cfc00';
      ctx.fillRect(x*cellSizePx, y*cellSizePx, cellSizePx, cellSizePx);
    }
  }

  // Draw visual 1-ft grid every 12 inches
  ctx.strokeStyle = "#00000044";
  for(let i=0;i<=gridSizeInches;i+=12){
    ctx.beginPath();
    ctx.moveTo(i*cellSizePx, 0);
    ctx.lineTo(i*cellSizePx, canvasSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i*cellSizePx);
    ctx.lineTo(canvasSize, i*cellSizePx);
    ctx.stroke();
  }

  // Draw plants with scaled emoji
  placedPlants.forEach(p=>{
    const w = p.occupiedTiles[p.occupiedTiles.length-1].x - p.occupiedTiles[0].x +1;
    const h = p.occupiedTiles[p.occupiedTiles.length-1].y - p.occupiedTiles[0].y +1;
    const emoji = emojiMap[p.plant.category] || '🌱';
    const xPx = p.occupiedTiles[0].x * cellSizePx;
    const yPx = p.occupiedTiles[0].y * cellSizePx;
    ctx.font = `${cellSizePx*Math.max(w,h)*0.8}px Arial`;
    ctx.fillText(emoji, xPx, yPx + cellSizePx*h*0.8);
  });
}

// Load seeds.csv
async function loadSeeds() {
  const resp = await fetch('seeds.csv');
  const text = await resp.text();
  const rows = text.split('\n').slice(1);
  const categories = {};

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

    if(!categories[plant.category]) categories[plant.category] = [];
    categories[plant.category].push({index:plantsData.length-1, name: plant.variety});
  });

  // Build <select> with <optgroup>
  plantSelect.innerHTML='<option value="">--Select Plant--</option>';
  for(const cat in categories){
    const og = document.createElement('optgroup');
    og.label = cat.charAt(0).toUpperCase()+cat.slice(1);
    categories[cat].forEach(p=>{
      const option = document.createElement('option');
      option.value = p.index;
      option.textContent = p.name;
      og.appendChild(option);
    });
    plantSelect.appendChild(og);
  }

  populateSidebar();
}

// Categorize plant
function categorize(crop){
  crop=crop.toLowerCase();
  if(crop.includes('herb')) return 'herb';
  if(crop.includes('flower')) return 'flower';
  if(crop.includes('tomato')||crop.includes('pepper')||crop.includes('cucumber')||crop.includes('squash')||crop.includes('melon')||crop.includes('beet')||crop.includes('carrot')) return 'vegetable';
  if(crop.includes('corn')) return 'corn';
  if(crop.includes('bean')) return 'bean';
  return 'other';
}

// Tools
document.getElementById('tiller').onclick = ()=>currentTool='tilled';
document.getElementById('raisedBed').onclick = ()=>currentTool='raised';
plantSelect.onchange = ()=>currentTool='plant';
document.getElementById('toggleSidebar').onclick = ()=>sidebar.style.display = sidebar.style.display==='none'?'block':'none';
gardenSizeSelect.onchange = ()=>{
  gridSizeFt = parseInt(gardenSizeSelect.value);
  gridSizeInches = gridSizeFt * 12;
  cellSizePx = canvasSize / gridSizeInches;
  initGrid();
  drawGrid();
  placedPlants=[];
};

// Snap function
function snapCoordinate(coord, snapSize){
  return Math.floor(coord / snapSize) * snapSize;
}

// Canvas click
canvas.addEventListener('click', e=>{
  const rect = canvas.getBoundingClientRect();
  let x = Math.floor((e.clientX - rect.left)/cellSizePx);
  let y = Math.floor((e.clientY - rect.top)/cellSizePx);

  // Tools
  if(currentTool==='tilled') { gardenGrid[y][x].type='tilled'; drawGrid(); return; }
  if(currentTool==='raised') { gardenGrid[y][x].type='raised'; drawGrid(); return; }

  if(currentTool==='plant' && plantSelect.value){
    const plant = plantsData[plantSelect.value];
    const snapTiles = plant.spacing; // spacing in inches
    x = snapCoordinate(x, snapTiles);
    y = snapCoordinate(y, snapTiles);

    const occupiedTiles = [];
    let canPlace=true;

    for(let dy=0; dy<snapTiles; dy++){
      for(let dx=0; dx<snapTiles; dx++){
        const nx = x + dx;
        const ny = y + dy;
        if(ny>=gridSizeInches || nx>=gridSizeInches){
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
      drawGrid();
    } else {
      alert("Cannot place here. Check spacing or soil type.");
    }
  }
});

// Tooltip
canvas.addEventListener('mousemove', e=>{
  const rect=canvas.getBoundingClientRect();
  const x=Math.floor((e.clientX-rect.left)/cellSizePx);
  const y=Math.floor((e.clientY-rect.top)/cellSizePx);
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

// Populate sidebar with all seeds.csv info
function populateSidebar(){
  plantList.innerHTML='';
  plantsData.forEach(p=>{
    const li=document.createElement('li');
    li.innerHTML = `<strong>${p.variety}</strong> (${p.crop}) - Start: ${p.start_method}, Spacing: ${p.spacing} in, Notes: ${p.notes}`;
    plantList.appendChild(li);
  });
}

// Initialize
window.onload = async ()=>{
  initGrid();
  await loadSeeds();
  drawGrid();
};
