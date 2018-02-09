pragma solidity ^0.4.18;

import "./RestrictedAddressRegistry.sol";

contract RestrictedAddressRegistryWithAppeals is RestrictedAddressRegistry {

  event AppealRequested(address indexed requester, address indexed listing);
  event AppealGranted(address indexed listing);
  event AppealFeeSet(uint fee);
  event MakeAppealLengthSet(uint length);
  event AppealLengthSet(uint length);
  event FeeRecipientSet(address recipient);

  modifier onlyAppellate {
    require(msg.sender == appellate);
    _;
  }

  modifier onlyFeeRecipient {
    require(msg.sender == feeRecipient);
    _;
  }

  address public appellate;
  address public feeRecipient;
  uint public appealFee;
  uint public requestAppealPhaseLength = 259200; // 3 days
  uint public judgeAppealPhaseLength = 1209600; // 14 days

  uint public deniedAppealFees;

  // struct handles data from end of challenge lost through appeals process
  struct Appeal {
    uint makeAppealExpiry;
    bool appealRequested;
    uint appealFeePaid;
    uint appealExpiry;
    bool appealGranted;
  }

  mapping(address => Appeal) public appeals;

  /**
  @dev Contructor           Sets the addresses for token, voting, and parameterizer
  @param tokenAddr          Address of the TCR's intrinsic ERC20 token
  @param plcrAddr           Address of a PLCR voting contract for the provided token
  @param paramsAddr         Address of a Parameterizer contract 
  @param appellateAddr      Address of JAB multisig
  @param feeRecipientAddr   Address of entity that collects fees from denied appeals
  */
  function RestrictedAddressRegistryWithAppeals(
      address tokenAddr,
      address plcrAddr,
      address paramsAddr,
      address appellateAddr,
      address feeRecipientAddr
  ) public RestrictedAddressRegistry(tokenAddr, plcrAddr, paramsAddr) {
      appellate = appellateAddr;
      feeRecipient = feeRecipientAddr;
  }

  function resolveChallenge(address listingAddress) internal {
    uint challengeID = listings[listingAddress].challengeID;
    if (voting.isPassed(challengeID)) { // Case: challenge failed
      super.resolveChallenge(listingAddress);
    } else { // Case: challenge succeeded, enter appeals phase
      Appeal storage appeal = appeals[listingAddress];
      if(appeal.makeAppealExpiry == 0) { // if not already in it
        appeal.makeAppealExpiry = now + requestAppealPhaseLength;
      }
    }
  }

  // --------
  // ANYONE INTERFACE
  // --------

  /**
  @notice Update state of listing/appeal after appeal has been processed (or window for 
          requesting appeal has passed). Sends to parent's resolveChallenge function
          if appeal was not requested or was not granted. Sends to resolveOverturnedChallenge
          if it was granted. Reverts if cannot be processed yet.
  @param listingAddress Address of listing associated with appeal
  */
  function resolvePostAppealPhase(address listingAddress) external {
    var appeal = appeals[listingAddress];
    if (appeal.makeAppealExpiry == 0 || now < appeal.makeAppealExpiry) { // covers uninitialized as well as < 3 days
      revert();
    } else if (!appeal.appealRequested) { // waiting period over, appeal never requested
      super.resolveChallenge(listingAddress);
    } else if (appeal.appealExpiry < now) {
      if (appeal.appealGranted) {
        // appeal granted. override decision of voters.
        resolveOverturnedChallenge(listingAddress);
      } else {
        super.resolveChallenge(listingAddress);
        deniedAppealFees += appeal.appealFeePaid;
        delete appeals[listingAddress];
      }
    }
  }

  /**
  @notice Determines the winner in a challenge. Rewards the winner tokens and
          either whitelists or de-whitelists the listingAddress.
  @param listingAddress Address of listing with a challenge that is to be resolved
  */
  function resolveOverturnedChallenge(address listingAddress) private {
    Appeal storage appeal = appeals[listingAddress];
    uint challengeID = listings[listingAddress].challengeID;

    // Calculates the winner's reward,
    // which is: (winner's full stake) + (dispensationPct * loser's stake)
    uint reward = determineReward(challengeID);

    // Records whether the listingAddress is a listing or an application
    bool wasWhitelisted = getListingIsWhitelisted(listingAddress);
    
    whitelistApplication(listingAddress);

    // Unlock stake so that it can be retrieved by the applicant
    // Also return their appeal fee
    listings[listingAddress].unstakedDeposit += reward + appeal.appealFeePaid;

    if (!wasWhitelisted) { 
        NewListingWhitelisted(listingAddress); 
    }    

    // Sets flag on challenge being processed
    challenges[challengeID].resolved = true;

    // Stores the total tokens used for voting by the losing side for reward purposes
    challenges[challengeID].totalTokens = voting.getTotalNumberOfTokensForLosingOption(challengeID);

    delete appeals[listingAddress];
  }


  // --------------------
  // PUBLISHER INTERFACE:
  // --------------------

  /**
  @notice Requests an appeal for a listing that has been successfully challenged (and had state updated)
          Must be initialized and within correct application period 
          (0 < appeal.makeAppealExpiry < now) 
          and not already requested
  @param listingAddress address of listing that has been successfully challenged
  */
  function requestAppeal(address listingAddress) external {
    var listing = listings[listingAddress];
    require(listing.owner == msg.sender);

    var appeal = appeals[listingAddress];
    if (appeal.makeAppealExpiry == 0 || appeal.makeAppealExpiry < now) { // uninitialized or expired
      revert();
    } else if (appeal.appealRequested) { // already requested, why are you doing this?
      revert();
    } else {
      require(token.transferFrom(msg.sender, this, appealFee));
      appeal.appealRequested = true;
      appeal.appealFeePaid = appealFee;
      AppealRequested(msg.sender, listingAddress);
    }
  }

  // --------
  // SPECIAL USER INTERFACE:
  // --------

  /**
  @notice Grants a requested appeal, if the appeal has not expired (or already been granted)
  @param listingAddress The address of the listing associated with the appeal
  */
  function grantAppeal(address listingAddress) onlyAppellate external {
    var appeal = appeals[listingAddress];
    require(appeal.appealExpiry > 0 && appeal.appealExpiry < now); // appeal requested and not expired
    require(!appeal.appealGranted); // don't grant twice, that would be dumb
    appeal.appealGranted = true;    
    AppealGranted(listingAddress);
  }

  /**
  @notice Transfers deniedAppealFees to fee recipient. Can only be called by recipient.
  */
  function withdrawDeniedAppealsFees() onlyFeeRecipient external {
    require(token.transferFrom(this, msg.sender, deniedAppealFees));
    deniedAppealFees = 0;
  }

  /**
  @notice Set new value for appeal fee
          Can only be called by Appellate
  @param fee The new value for the appeal fee
  */
  function setAppealFee(uint fee) onlyAppellate external {
    require(fee > 0); // safety check
    appealFee = fee;
    AppealFeeSet(fee);
  }

  /**
  @notice Set new value for the length of "Request Appeal Phase"
          Can only be called by Appellate
  @param length The new value for the "Request Appeal Phase" length
  */
  function setMakeAppealLength(uint length) onlyAppellate external {
    require(length > 0); // safety check
    requestAppealPhaseLength = length;
    MakeAppealLengthSet(length);
  }

  /**
  @notice Set new value for the length of "Judge Appeal Phase"
          Can only be called by Appellate
  @param length The new value for the "Judge Appeal Phase" length
  */
  function setAppealLength(uint length) onlyAppellate external {
    require(length > 0); // safety check
    judgeAppealPhaseLength = length;
    AppealLengthSet(length);
  }

  /**
  @notice Set new value for the Fee Recipient
          Can only be called by Appellate
  @param recipient The new value for the Fee Recipient
  */
  function setFeeRecipient(address recipient) onlyAppellate external {
    feeRecipient = recipient;
    FeeRecipientSet(recipient);
  }


}
