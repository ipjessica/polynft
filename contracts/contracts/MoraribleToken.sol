// taken from ERC721.sol
pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../node_modules/@openzeppelin/contracts/utils/Counters.sol";

contract MoraribleToken is ERC721 {
    // counter for IDs
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIDs;

    // token name and symbol
    constructor () ERC721("MoraribleToken", "MORA") {}

    // define items
    struct Item {
        uint256 id;
        address creator;
        // point to metadata stored on ipfs
        string uri;
    }

    // map uint 256 ID to an item with that ID
    mapping (uint256 => Item) public Items;

    // to mint , returns ID (from mapping)
    function createItem(string memory uri) public returns (uint256) {
        // increment counters
        _tokenIDs.increment();
        // store current ID in newItemId
        uint256 newItemId = _tokenIDs.current();
        // msg.sender = creator 
        // assign ownership of this ID to this sender
        _safeMint(msg.sender, newItemId);

        // create item to store in mapping
        Items[newItemId] = Item(newItemId, msg.sender, uri);

        return newItemId;
    }

    // override default implementation of getting uri because our structure of
    // the url will not have an incremental path that is relative to _tokenId
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        return Items[tokenId].uri;
    }
}

/*

IN PROGRESS

 */

// taken from ERC721.sol
/* pragma solidity ^0.8.0;

import "github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/ERC721.sol";
import "github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/IERC721.sol";
import "github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Counters.sol";

import "./Marketplace.sol";

contract MoraribleToken is ERC721, MoraribleMarketContract {
    // counter for IDs
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIDs;

    // token name and symbol
    constructor () ERC721("MoraribleToken", "MORA") {}

    // define items
    struct Item {
        uint256 id;
        address creator;
        // point to metadata stored on ipfs
        string uri;
    }

    // map uint 256 ID to an item with that ID
    mapping (uint256 => Item) public Items;
    
    /*
    modifier HasTransferApproval(address tokenAddress, uint256 tokenId) {
        IERC721 tokenContract = IERC721(tokenAddress);
        require(tokenContract.getApproved(tokenId) == address(this));
        _;
    }
    */
/*
    // to mint , returns ID (from mapping)
    function createItem(string memory uri) HasTransferApproval(itemsForSale[id].tokenAddress, itemsForSale[id].tokenId) public returns (uint256) {
        // increment counters
        _tokenIDs.increment();
        // store current ID in newItemId
        uint256 newItemId = _tokenIDs.current();
        // msg.sender = creator 
        // assign ownership of this ID to this sender
        _safeMint(msg.sender, newItemId);

        // create item to store in mapping
        Items[newItemId] = Item(newItemId, msg.sender, uri);

        return newItemId;
    }

    // override default implementation of getting uri because our structure of
    // the url will not have an incremental path that is relative to _tokenId
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        return Items[tokenId].uri;
    }
}

     */