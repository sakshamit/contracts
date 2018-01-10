pragma solidity 0.4.18;
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

// will make this extend ACL when Olaf's PRs are in
contract PsuedoNewsroomTCR is Ownable {

  struct NewsroomRegistryApplication {  
    address nominatorAddress; // user that nominated the newsroom 
    uint timestamp;
  }

  event NewsroomApplied(address indexed newsroomAddress, address indexed submitter);
  event NewsroomApproved(address indexed newsroomAddress);
  event NewsroomDenied(address indexed newsroomAddress);

  mapping(address => NewsroomRegistryApplication) private applications;
  mapping(address => bool) private waitingNewsrooms;
  mapping(address => bool) private approvedNewsrooms;


  function submitNewsroomApplication(address newsroom) public returns (address) {
    require(!waitingNewsrooms[newsroom]); //application not currently in progress
    require(!approvedNewsrooms[newsroom]); //newsroom can't already be approved

    applications[newsroom] = NewsroomRegistryApplication(
      msg.sender,
      now
    );
    waitingNewsrooms[newsroom] = true;
    NewsroomApplied(newsroom, msg.sender);
    return newsroom;
  }

  function approveNewsroom(address newsroom) public onlyOwner {
    require(waitingNewsrooms[newsroom]);
    delete waitingNewsrooms[newsroom];
    delete applications[newsroom];
    approvedNewsrooms[newsroom] = true;
    NewsroomApproved(newsroom);
  }

  function denyContent(address newsroom) public onlyOwner {
    require(waitingNewsrooms[newsroom]);
    delete waitingNewsrooms[newsroom];
    delete applications[newsroom];
    NewsroomDenied(newsroom);
  }

}
