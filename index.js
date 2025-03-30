const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Storage nodes with real-time capacity and stored items
const storageLocations = [
  { 
    id: 1, 
    name: 'Storage Node A', 
    capacity: 1000,
    usedCapacity: 0,
    storedItems: []
  },
  { 
    id: 2, 
    name: 'Storage Node B', 
    capacity: 1000,
    usedCapacity: 0,
    storedItems: []
  },
  { 
    id: 3, 
    name: 'Storage Node C', 
    capacity: 1000,
    usedCapacity: 0,
    storedItems: []
  },
  { 
    id: 4, 
    name: 'Storage Node D', 
    capacity: 1000,
    usedCapacity: 0,
    storedItems: []
  }
];

// Calculate hash value and determine storage location
function calculateHashAndLocation(input) {
  // Calculate hash using SHA-256
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  
  // Use first 8 characters of hash as storage location index
  const locationIndex = parseInt(hash.substring(0, 8), 16) % storageLocations.length;
  
  // Create storage item
  const storageItem = {
    id: hash,
    content: input,
    timestamp: new Date().toISOString(),
    size: 1 // Each item takes 1 unit of capacity
  };

  // Update storage location
  const location = storageLocations[locationIndex];
  if (location.usedCapacity < location.capacity) {
    location.storedItems.push(storageItem);
    location.usedCapacity += storageItem.size;
  } else {
    throw new Error('Storage location is full');
  }
  
  return {
    hash,
    location: location.name,
    details: {
      hashLength: hash.length,
      storageNode: {
        ...location,
        storedItems: undefined // Don't send stored items in the main response
      },
      timestamp: new Date().toISOString()
    }
  };
}

app.post('/api/hash', (req, res) => {
  const { input } = req.body;
  
  if (!input) {
    return res.status(400).json({ error: 'Please enter data' });
  }

  try {
    const result = calculateHashAndLocation(input);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/storage-nodes', (req, res) => {
  // Send storage nodes without stored items for the main view
  const nodesWithoutItems = storageLocations.map(node => ({
    ...node,
    storedItems: undefined
  }));
  res.json(nodesWithoutItems);
});

// New endpoint to get storage node details
app.get('/api/storage-nodes/:id', (req, res) => {
  const node = storageLocations.find(n => n.id === parseInt(req.params.id));
  if (!node) {
    return res.status(404).json({ error: 'Storage node not found' });
  }
  res.json(node);
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
}); 