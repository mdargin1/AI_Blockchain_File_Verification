import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// 1. Serve static files from the current folder
app.use(express.static(__dirname));

// 2. Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/verify', (req, res) => {
  res.sendFile(path.join(__dirname, 'verify.html'));
});

// --- Blockchain Setup ---
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const CONTRACT_ABI = [
  "function addRecord(string calldata _fileName, string calldata _sha256Hash, string calldata _uuid) external returns (uint256)",
  "function getRecordsByFileName(string calldata _fileName) external view returns (tuple(string fileName, string sha256Hash, string uuid, address recordedBy, uint256 timestamp)[])",
  "function getLatestRecordByFileName(string calldata _fileName) external view returns (string memory fileName, string memory sha256Hash, string memory uuid, address recordedBy, uint256 timestamp)",
  "event RecordAdded(uint256 indexed recordId, address indexed recordedBy, string fileName, string sha256Hash, string uuid, uint256 timestamp)"
];

const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

// --- OpenAI Setup (Timeout: 15 seconds) ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 15000 // 15 seconds
});

// POST: Add a record
app.post('/api/records', async (req, res) => {
  try {
    const { fileName, sha256Hash } = req.body;
    if (!fileName || !sha256Hash) {
      return res.status(400).json({ error: 'fileName and sha256Hash are required.' });
    }

    const uuid = uuidv4();
    const tx = await contract.addRecord(fileName, sha256Hash, uuid);
    const receipt = await tx.wait(1);

    let recordId = null;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed && parsed.name === 'RecordAdded') {
          recordId = parsed.args.recordId.toString();
          break;
        }
      } catch {}
    }

    return res.json({ success: true, txHash: tx.hash, recordId, uuid, fileName, sha256Hash });
  } catch (error) {
    console.error('Error writing record:', error);
    return res.status(500).json({ error: error.reason || error.message });
  }
});

// GET: Retrieve records by filename
app.get('/api/records/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const records = await contract.getRecordsByFileName(fileName);

    const formattedRecords = records.map((rec) => ({
      fileName: rec.fileName,
      sha256Hash: rec.sha256Hash,
      uuid: rec.uuid,
      recordedBy: rec.recordedBy,
      timestamp: new Date(Number(rec.timestamp) * 1000).toISOString()
    }));

    return res.json({ success: true, records: formattedRecords });
  } catch (error) {
    console.error('Error fetching records:', error);
    return res.status(500).json({ error: error.reason || error.message });
  }
});

// POST: AI Explanation of Verification Results
app.post('/api/explain', async (req, res) => {
  try {
    const { fileName, verificationStatus, hashMatch, timestamp } = req.body;

    if (!fileName || verificationStatus === undefined || hashMatch === undefined) {
      return res.status(400).json({ error: 'Missing required verification details.' });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not defined in environment variables.');
      return res.status(503).json({
        error: 'AI analysis is temporarily unavailable. The blockchain verification results above remain valid.'
      });
    }

    // Prepare metadata payload for LLM
    const verificationData = {
      fileName,
      verificationStatus,
      hashMatch,
      timestamp: timestamp || new Date().toISOString()
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a cybersecurity assistant. Explain blockchain file integrity verification results in clear, non-technical language. Keep the response under 150 words. Do not speculate or invent details. Base your explanation only on the supplied verification results.'
        },
        {
          role: 'user',
          content: JSON.stringify(verificationData)
        }
      ],
      max_tokens: 250
    });

    const explanation = completion.choices[0]?.message?.content?.trim();
    return res.json({ success: true, explanation });
  } catch (error) {
    // Log complete error internally without sending sensitive details to the client
    console.error('OpenAI API Error:', error);
    return res.status(503).json({
      error: 'AI analysis is temporarily unavailable. The blockchain verification results above remain valid.'
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server listening on http://0.0.0.0:${PORT}`);
});