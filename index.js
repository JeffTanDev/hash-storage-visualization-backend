const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Storage nodes with reduced capacity to demonstrate collisions
const storageLocations = [
  { 
    id: 1, 
    name: 'Storage Node A', 
    capacity: 3,
    usedCapacity: 0,
    storedItems: [],
    collisions: 0,
    chain: [] // For chaining method
  },
  { 
    id: 2, 
    name: 'Storage Node B', 
    capacity: 3,
    usedCapacity: 0,
    storedItems: [],
    collisions: 0,
    chain: []
  },
  { 
    id: 3, 
    name: 'Storage Node C', 
    capacity: 3,
    usedCapacity: 0,
    storedItems: [],
    collisions: 0,
    chain: []
  },
  { 
    id: 4, 
    name: 'Storage Node D', 
    capacity: 3,
    usedCapacity: 0,
    storedItems: [],
    collisions: 0,
    chain: []
  }
];

// Hash functions
function calculateHash(input) {
  return crypto.createHash('sha256')
    .update(input)
    .digest('hex')
    .substring(0, 8);
}

function secondaryHash(input) {
  // 使用更复杂的哈希函数组合
  const md5Hash = crypto.createHash('md5')
    .update(input)
    .digest('hex');
  
  const sha1Hash = crypto.createHash('sha1')
    .update(input)
    .digest('hex');
  
  // 组合两个哈希值并取模
  const combinedHash = parseInt(md5Hash.substring(0, 8), 16) ^ 
                      parseInt(sha1Hash.substring(0, 8), 16);
  
  // 确保步长不为0，且与表大小互质
  const stepSize = (combinedHash % (storageLocations.length - 2)) + 2;
  
  return stepSize;
}

// Collision resolution methods
function handleChaining(input, hash, initialIndex) {
  const storageItem = {
    id: hash,
    content: input,
    timestamp: new Date().toISOString(),
    size: 1,
    originalLocation: storageLocations[initialIndex].name
  };

  const node = storageLocations[initialIndex];
  node.chain.push(storageItem);
  node.usedCapacity += storageItem.size;

  return {
    hash,
    location: node.name,
    details: {
      hashLength: hash.length,
      storageNode: {
        ...node,
        storedItems: undefined
      },
      originalLocation: node.name,
      isCollision: node.chain.length > 1,
      collisionMethod: 'chaining',
      timestamp: new Date().toISOString()
    }
  };
}

function handleLinearProbing(input, hash, initialIndex) {
  let currentIndex = initialIndex;
  let attempts = 0;
  
  while (attempts < storageLocations.length) {
    const node = storageLocations[currentIndex];
    if (node.usedCapacity < node.capacity) {
      const storageItem = {
        id: hash,
        content: input,
        timestamp: new Date().toISOString(),
        size: 1,
        originalLocation: storageLocations[initialIndex].name
      };

      node.storedItems.push(storageItem);
      node.usedCapacity += storageItem.size;

      if (currentIndex !== initialIndex) {
        node.collisions++;
      }

      return {
        hash,
        location: node.name,
        details: {
          hashLength: hash.length,
          storageNode: {
            ...node,
            storedItems: undefined
          },
          originalLocation: storageLocations[initialIndex].name,
          isCollision: currentIndex !== initialIndex,
          collisionMethod: 'linear-probing',
          timestamp: new Date().toISOString()
        }
      };
    }
    currentIndex = (currentIndex + 1) % storageLocations.length;
    attempts++;
  }
  
  throw new Error('All storage nodes are full');
}

function handleDoubleHashing(input, hash, initialIndex) {
  const stepSize = secondaryHash(input);
  let currentIndex = initialIndex;
  let attempts = 0;
  
  while (attempts < storageLocations.length) {
    const node = storageLocations[currentIndex];
    if (node.usedCapacity < node.capacity) {
      const storageItem = {
        id: hash,
        content: input,
        timestamp: new Date().toISOString(),
        size: 1,
        originalLocation: storageLocations[initialIndex].name,
        stepSize: stepSize,
        probeSequence: attempts + 1 // 添加探测序列信息
      };

      node.storedItems.push(storageItem);
      node.usedCapacity += storageItem.size;

      if (currentIndex !== initialIndex) {
        node.collisions++;
      }

      return {
        hash,
        location: node.name,
        details: {
          hashLength: hash.length,
          storageNode: {
            ...node,
            storedItems: undefined
          },
          originalLocation: storageLocations[initialIndex].name,
          isCollision: currentIndex !== initialIndex,
          collisionMethod: 'double-hashing',
          stepSize: stepSize,
          probeSequence: attempts + 1,
          timestamp: new Date().toISOString()
        }
      };
    }
    currentIndex = (currentIndex + stepSize) % storageLocations.length;
    attempts++;
  }
  
  throw new Error('All storage nodes are full');
}

// Calculate hash value and determine storage location with collision handling
function calculateHashAndLocation(input, method = 'chaining') {
  const hash = calculateHash(input);
  const initialIndex = parseInt(hash, 16) % storageLocations.length;

  switch (method) {
    case 'chaining':
      return handleChaining(input, hash, initialIndex);
    case 'linear-probing':
      return handleLinearProbing(input, hash, initialIndex);
    case 'double-hashing':
      return handleDoubleHashing(input, hash, initialIndex);
    default:
      throw new Error('Invalid collision resolution method');
  }
}

// Reset all storage nodes
function resetStorageNodes() {
  storageLocations.forEach(node => {
    node.usedCapacity = 0;
    node.storedItems = [];
    node.collisions = 0;
    node.chain = [];
  });
}

app.post('/api/hash', (req, res) => {
  const { input, method } = req.body;
  
  if (!input) {
    return res.status(400).json({ error: 'Please enter data' });
  }

  try {
    const result = calculateHashAndLocation(input, method);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/reset', (req, res) => {
  try {
    resetStorageNodes();
    res.json({ message: 'All storage nodes have been reset' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/storage-nodes', (req, res) => {
  const nodesWithoutItems = storageLocations.map(node => ({
    ...node,
    storedItems: undefined,
    chain: undefined
  }));
  res.json(nodesWithoutItems);
});

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