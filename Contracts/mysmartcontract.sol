// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FileRecordRegistry
 * @dev Stores multiple records containing a filename, SHA-256 hash, and UUIDv4,
 *      with support for retrieving records by filename.
 */
contract FileRecordRegistry {
    
    struct Record {
        string fileName;
        string sha256Hash;
        string uuid;
        address recordedBy;
        uint256 timestamp;
    }

    // Dynamic array storing all records
    Record[] public records;

    // Maps keccak256(fileName) => array of record IDs matching that filename
    mapping(bytes32 => uint256[]) private fileNameToRecordIds;

    // Mapping to track record IDs created by a specific user
    mapping(address => uint256[]) public userRecordIds;

    event RecordAdded(
        uint256 indexed recordId,
        address indexed recordedBy,
        string fileName,
        string sha256Hash,
        string uuid,
        uint256 timestamp
    );

    /**
     * @notice Stores a new record and indexes it by filename.
     */
    function addRecord(
        string calldata _fileName,
        string calldata _sha256Hash,
        string calldata _uuid
    ) external returns (uint256 recordId) {
        require(bytes(_fileName).length > 0, "Filename cannot be empty");
        require(bytes(_sha256Hash).length > 0, "SHA-256 hash cannot be empty");
        require(bytes(_uuid).length > 0, "UUID cannot be empty");

        recordId = records.length;

        records.push(Record({
            fileName: _fileName,
            sha256Hash: _sha256Hash,
            uuid: _uuid,
            recordedBy: msg.sender,
            timestamp: block.timestamp
        }));

        // Map filename hash to record ID
        bytes32 nameHash = keccak256(bytes(_fileName));
        fileNameToRecordIds[nameHash].push(recordId);

        userRecordIds[msg.sender].push(recordId);

        emit RecordAdded(recordId, msg.sender, _fileName, _sha256Hash, _uuid, block.timestamp);
    }

    /**
     * @notice Retrieves all records matching a given filename.
     * @param _fileName The name of the file to search for.
     * @return matchingRecords Array of all Record structs matching the filename.
     */
    function getRecordsByFileName(string calldata _fileName) 
        external 
        view 
        returns (Record[] memory matchingRecords) 
    {
        bytes32 nameHash = keccak256(bytes(_fileName));
        uint256[] storage ids = fileNameToRecordIds[nameHash];
        
        uint256 total = ids.length;
        matchingRecords = new Record[](total);

        for (uint256 i = 0; i < total; i++) {
            matchingRecords[i] = records[ids[i]];
        }

        return matchingRecords;
    }

    /**
     * @notice Retrieves the most recently added record matching a given filename.
     * @param _fileName The name of the file to search for.
     */
    function getLatestRecordByFileName(string calldata _fileName)
        external
        view
        returns (
            string memory fileName,
            string memory sha256Hash,
            string memory uuid,
            address recordedBy,
            uint256 timestamp
        )
    {
        bytes32 nameHash = keccak256(bytes(_fileName));
        uint256[] storage ids = fileNameToRecordIds[nameHash];
        require(ids.length > 0, "No records found for this filename");

        uint256 latestId = ids[ids.length - 1];
        Record storage r = records[latestId];
        return (r.fileName, r.sha256Hash, r.uuid, r.recordedBy, r.timestamp);
    }

    /**
     * @notice Fetches a single record by its index ID.
     */
    function getRecord(uint256 _recordId) external view returns (
        string memory fileName,
        string memory sha256Hash,
        string memory uuid,
        address recordedBy,
        uint256 timestamp
    ) {
        require(_recordId < records.length, "Record does not exist");
        Record storage r = records[_recordId];
        return (r.fileName, r.sha256Hash, r.uuid, r.recordedBy, r.timestamp);
    }

    /**
     * @notice Returns the total count of stored records.
     */
    function totalRecords() external view returns (uint256) {
        return records.length;
    }

    /**
     * @notice Returns all record IDs submitted by a specific address.
     */
    function getUserRecordIds(address _user) external view returns (uint256[] memory) {
        return userRecordIds[_user];
    }
}