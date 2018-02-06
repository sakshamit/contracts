pragma solidity ^0.4.18;

import "./ContractAddressRegistry.sol";
import "./ACL.sol";

contract RestrictedAddressRegistry is ContractAddressRegistry {

  modifier onlySuperuser(address _sender, address _contractAddress) {
    ACL aclContract = ACL(_contractAddress);
    require(aclContract.isSuperuser(_sender));
    _;
  }

  /**
  @dev Contructor         Sets the addresses for token, voting, and parameterizer
  @param _tokenAddr       Address of the TCR's intrinsic ERC20 token
  @param _plcrAddr        Address of a PLCR voting contract for the provided token
  @param _paramsAddr      Address of a Parameterizer contract 
  */
  function RestrictedAddressRegistry(
      address _tokenAddr,
      address _plcrAddr,
      address _paramsAddr
  ) public ContractAddressRegistry(_tokenAddr, _plcrAddr, _paramsAddr) {
      
  }

  // --------------------
  // PUBLISHER INTERFACE:
  // --------------------

  /**
  @dev                Allows a user to start an application. Takes tokens from user and sets
                      apply stage end time.
  @param _amount      The number of ERC20 tokens a user is willing to potentially stake
  */
  function apply(address _listingAddress, uint _amount, string _data) onlySuperuser(msg.sender, _listingAddress) public {
    super.apply(_listingAddress, _amount, _data);
  }
}
