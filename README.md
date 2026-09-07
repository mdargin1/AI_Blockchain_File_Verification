# AI Blockchain File Integrity Verification

A demonstration of using a blockchain to verify the integrity of files

This project employs Node.js on the server, React.js in the client, a Solidity smart contract with the Sepolia Ethereum Testnet, with a call to the OpenAI API.

Publically accessible example:
1. First register a file into the blockchain for verification here:
[Register a file for verification](http://207.148.10.217:3001/)

2. Users can verify whether the contents of a file matches a registered file here:
[Verifier Link](http://207.148.10.217:3001/verify.html)

Note: You may have to use a PC or Mac computer and not a mobile device to open those links, because they do not use SSL.

A decentralized file integrity registry and verification suite. The project computes the SHA-256 hash of a file locally in the browser, anchors metadata (filename, hash, and generated UUIDv4) onto the Ethereum Sepolia testnet via a Solidity smart contract, verifies file integrity against on-chain records, and generates non-technical AI explanations of verification outcomes using OpenAI.

---

## Architecture Overview

* **Smart Contract (`Contracts/mysmartcontract.sol`):** Deployed on the Sepolia testnet. Stores immutable records indexed by `keccak256(fileName)` for efficient $O(1)$ lookups while maintaining version history.
* **Backend (`server.js`):** Node.js Express server interfacing with Sepolia via `ethers.js` (v6) using a funded relayer wallet. Exposes endpoints for file registration, queries, and AI analysis.
* **Client Frontend (`index.html` & `verify.html`):** Standalone React 18 apps that calculate SHA-256 hashes client-side using `crypto-js` without uploading file contents.
* **AI Analysis Service:** Integrates OpenAI (`gpt-4o-mini`) via backend proxy to interpret verification results into plain English without exposing files or private API keys.

---

## Security & Privacy Highlights

* **Privacy-Preserving:** Raw file contents are never transmitted to the server, recorded on the blockchain, or shared with the LLM. Only client-side computed hashes and metadata are processed.
* **Zero Override Authority:** The AI model acts strictly as an explainer and cannot alter or override the blockchain verification truth.
* **Secret Protection:** API keys and blockchain private keys are managed exclusively via server-side environment variables and are ignored by git.

---

## Prerequisites

* [Node.js](https://nodejs.org/) (v22 or higher)
* An Ethereum wallet with **Sepolia Testnet ETH**
* An active **Sepolia RPC URL** (Alchemy, Infura, or public RPC)
* An **OpenAI API Key**



Running the Application
Start the Node.js server:

Bash
node server.js


License
MIT License.
