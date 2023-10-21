// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {Roles} from "./Roles.sol";

contract WhitelistManager {
    using Roles for Roles.Role;

    Roles.Role private _verifiers;
    Roles.Role private _owners;
    Roles.Role private _whitelisted;

    constructor() {
        _owners.add(msg.sender);
        _verifiers.add(msg.sender);
        _whitelisted.add(msg.sender);
    }

    /**
     * @dev Checks the _owners role for the sender
     */
    modifier onlyOwners() {
        require(_owners.has(msg.sender), "DOES_NOT_HAVE_OWNER_ROLE");
        _;
    }
    /**
     * @dev Checks the _verifiers role for the sender
     */
    modifier onlyVerifiers() {
        require(_verifiers.has(msg.sender), "DOES_NOT_HAVE_VERIFIER_ROLE");
        _;
    }

    /**
     * @dev Checks the _verifier or _owner role for the sender
     */
    modifier onlyAuthorities() {
        require(
            _verifiers.has(msg.sender) || _owners.has(msg.sender),
            "ONLY_AUTHORITIES_ARE_ALLOWED_TO_EXECUTE_THIS_FUNC"
        );
        _;
    }

    /**
     * @dev To add a single address to whitelist
     */
    function whitelistAddress(address _address) public onlyAuthorities {
        _whitelisted.add(_address);
    }

    /**
     * @dev To add multiple addresses to whitelist
     */
    function whitelistAddresses(
        address[] memory _addresses
    ) public onlyAuthorities {
        for (uint256 i = 0; i < _addresses.length; i++) {
            _whitelisted.add(_addresses[i]);
        }
    }

    /**
     * @dev To add an address to verifier role
     */
    function addVerifier(address _address) public onlyOwners {
        _verifiers.add(_address);
    }

    /**
     * @dev To remove an address to verifier role
     */
    function removeVerifier(address _address) public onlyOwners {
        _verifiers.add(_address);
    }

    /**
     * @dev To check whether the address is whitelisted or not
     */
    function isWhitelisted(address _address) external view returns (bool) {
        return _whitelisted.has(_address);
    }

    function isWhitelistedAll() external view returns (address[] memory) {}

    /**
     * @dev To remove an address from whitelist
     */
    function removeWhitelisted(address _address) public onlyAuthorities {
        _whitelisted.remove(_address);
    }

    /**
     * @dev To remove multiple addresses from whitelist
     */
    function removeWhitelistedAddresses(
        address[] memory _addresses
    ) public onlyAuthorities {
        for (uint256 i = 0; i < _addresses.length; i++) {
            _whitelisted.remove(_addresses[i]);
        }
    }
}
