pragma solidity 0.4.18;
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract RegistryWithAppellate is Ownable {
// TODO: Extend ACL & Registry (Mike Goldin)

  // -----
  // Duplicated Registry Code.
  // Remove when this contract extends Registry.
  // -----
  struct Listing {  
    address owner; // owner of listing 
    uint timestamp;
    bool whitelisted;
  }

  // Maps listingHashes to associated listing data
  mapping(bytes32 => Listing) public listings;

  /// @dev returns true if listing is whitelisted
  function isWhitelisted(bytes32 _listing) public view returns (bool whitelisted) {
    return listings[_listing].whitelisted;
  }

  event AppealRequested(bytes32 indexed listing);
  event AppealGranted(bytes32 indexed listing);
  event AppealDenied(bytes32 indexed listing);

  function listingOwner(bytes32 listing) public view returns (address) {
    return listings[listing].owner;
  }

  function timestampOfAppeal(bytes32 listing) public view returns (uint) {
    return listings[listing].timestamp;
  }

  function submitAppeal(bytes32 listing) public returns (bytes32) {
    require(listings[listing].owner == 0x0);
    require(!listings[listing].whitelisted); 

    listings[listing] = Listing(
      msg.sender,
      now,
      false
    );
    AppealRequested(listing);
    return listing;
  }

  function grantAppeal(bytes32 listing) public onlyOwner {
    require(listings[listing].owner != 0x0);
    require(!listings[listing].whitelisted);
    listings[listing].whitelisted = true;
    // TODO: Fire Registry event as well
    AppealGranted(listing);
  }

  function denyAppeal(bytes32 listing) public onlyOwner {
    require(listings[listing].owner != 0x0);
    require(!listings[listing].whitelisted);
    listings[listing].owner = 0x0;
    AppealDenied(listing);
  }

}
