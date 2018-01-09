pragma solidity 0.4.18;

contract ACL {
  event SuperuserAdded(address indexed granter, address indexed grantee);
  event SuperuserRemoved(address indexed granter, address indexed grantee);
  event RoleAdded(address indexed granter, address indexed grantee, string indexed what);
  event RoleRemoved(address indexed granter, address indexed grantee, string indexed what);

  mapping(address => bool) superusers;
  mapping(string => RoleList) roles;

  modifier requireSuperuser() {
    require(isSuperuser(msg.sender));
    _;
  }

  modifier requireRole(string role) {
    require(isSuperuser(msg.sender) || hasRole(msg.sender, role));
    _;
  }

  function isSuperuser(address who) view public returns (bool) {
    return superusers[who];
  }

  function hasRole(address who, string role) view public returns (bool) {
    return roles[role].actors[who];
  }

  function _addSuperuser(address who) internal {
    superusers[who] = true;
    SuperuserAdded(msg.sender, who);
  }

  function _removeSuperuser(address who) internal { 
    delete superusers[who];
    SuperuserRemoved(msg.sender, who);
  }

  /// Adds a role to a grantee without any role checking
  /// Add role checking in deriving contract
  function _addRole(address grantee, string role) internal {
    roles[role].actors[grantee] = true;
    RoleAdded(msg.sender, grantee, role);
  }

  function _removeRole(address grantee, string role) internal {
    delete roles[role].actors[grantee];
    RoleRemoved(msg.sender, grantee, role);
  }

  struct RoleList {
    mapping(address => bool) actors;
  }
}
