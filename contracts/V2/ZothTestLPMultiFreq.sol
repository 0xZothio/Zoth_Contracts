// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {Roles} from "../utils/Roles.sol";
import {IERC20} from "../Interfaces/IERC20.sol";
import {ReentrancyGuard} from "../utils/ReentrancyGuard.sol";
import {IWhitelistManager} from "../Interfaces/IWhitelistManager.sol";

// import "hardhat/console.sol";
// AAVE USDC : 0xe9DcE89B076BA6107Bb64EF30678efec11939234 [FOR_TEST]
/**
 * @author Zoth.io
 * @notice This contract is a pool contract that inherits the properties of the ERC721 token standard.
 */

contract ZothTestLPMultiFreq is ERC721URIStorage, ReentrancyGuard {
    using Roles for Roles.Role;
    using Counters for Counters.Counter;
    using SafeMath for uint256;
    uint256 constant SECS_IN_YEAR = 31536000;

    IERC20 public immutable usdc;
    IWhitelistManager public immutable whitelistManager;
    address public immutable owner;

    Counters.Counter private _tokenIds;

    Roles.Role private _owners;

    // Mappings for data storage
    mapping(address => uint256) public stakingBalance;
    mapping(address => uint256) public balances;
    mapping(address => mapping(uint256 => uint256)) public cyclesClaimed;
    mapping(address => mapping(uint256 => uint256)) public prevClaimed;
    mapping(address => mapping(uint256 => uint256)) public yieldClaimed;
    mapping(address => mapping(uint256 => bool)) public withdrawClaimed;

    // Vars for the pool
    uint256 public tenure1;
    uint256 public tenure2;
    uint256 public tenure3;
    uint256 public reward;
    uint256 public freq;
    uint256 public poolId;
    uint256 public hotPeriod;
    uint256 public cooldownPeriod;

    // Mappings for User Deposits
    mapping(address => mapping(uint256 => uint256)) public userStartTime;
    mapping(address => mapping(uint256 => uint256)) public userEndTime;
    mapping(address => mapping(uint256 => uint256)) public userDepositAmount;
    mapping(address => uint256) public totalUserDeposits;

    // Structs

    struct YieldDetails {
        uint256 balance;
        uint256 totalYield;
        uint256 unlockedYield;
        uint256 lockedYield;
        uint256 cyclesLeft;
        uint256 timeLeft;
        uint256 cyclesElapsed;
        uint256 nextTransferTime;
    }

    constructor(
        address _usdcAddress,
        address _whitelistManager
    ) ERC721("ZothInvoiceFactoringPool2", "ZIFP2") {
        usdc = IERC20(_usdcAddress);
        owner = msg.sender;
        _owners.add(msg.sender);
        whitelistManager = IWhitelistManager(_whitelistManager);
    }

    /**
     * @dev Checks the _owners role for the sender
     */
    modifier onlyOwners() {
        require(_owners.has(msg.sender), "DOES_NOT_HAVE_OWNER_ROLE");
        _;
    }

    modifier onlyWhitelisted() {
        require(
            whitelistManager.isWhitelisted(msg.sender),
            "USER_IS_NOT_WHITELIST"
        );
        _;
    }

    /**
     * @dev Set the variables for the pool cycle - Start Date, End Date and Reward Rate
     * @param _tenure1 tenure 1 variable
     * @param _tenure2 tenure 2 variable
     * @param _tenure3 tenure 3 variable
     * @param _reward reward percentage of the pool
     * @param _freq frequency of the withdrawl
     * @param _poolId Pool Identifier number
     * @param _hotPeriod Cooldown Period after which rewards can be claimed
     */
    function setContractVariables(
        uint256 _tenure1,
        uint256 _tenure2,
        uint256 _tenure3,
        uint256 _reward,
        uint256 _freq,
        uint256 _poolId,
        uint256 _hotPeriod,
        uint256 _coolDownPeriod
    ) external onlyOwners {
        tenure1 = _tenure1;
        tenure2 = _tenure2;
        tenure3 = _tenure3;
        reward = _reward;
        freq = _freq;
        poolId = _poolId;
        hotPeriod = _hotPeriod;
        cooldownPeriod = _coolDownPeriod;
    }

    /**
     * @dev Creates a deposit to the pool
     * @param amount Amount of USDC that user wants to deposit to the pool
     * @param _tenureOption Tenure Option
     * conditions :
     * tenureOption = 1 | 2 | 3
     * amount > 0
     * allowance >= amount
     * transfer should be successfull
     */
    function deposit(
        uint256 amount,
        uint256 _tenureOption
    ) public onlyWhitelisted nonReentrant returns (uint256) {
        require(
            _tenureOption == 1 || _tenureOption == 2 || _tenureOption == 3,
            "[deposit(uint256 amount,uint256 _tenureOption)] : Tenure Option check : Tenure options should be between 1 and 3"
        );
        require(
            amount > 0,
            "[deposit(uint256 amount,uint256 _tenureOption)] : Amount check : Deposit amount must be greater than zero"
        );
        require(
            usdc.allowance(msg.sender, address(this)) >= amount,
            "[deposit(uint256 amount,uint256 _tenureOption)] : USDC allowance check : Contract not authorized to spend tokens"
        );
        require(
            usdc.transferFrom(msg.sender, address(this), amount),
            "[deposit(uint256 amount,uint256 _tenureOption)] : Transfer Check : Transfer failed"
        );

        uint256 currentTimestamp = block.timestamp;

        uint256 tenure = (_tenureOption == 1)
            ? tenure1
            : ((_tenureOption == 2) ? tenure2 : tenure3);

        uint256 endLend = currentTimestamp + tenure;

        // Mapping Updates Deposits
        totalUserDeposits[msg.sender]++;
        userStartTime[msg.sender][totalUserDeposits[msg.sender]] =
            currentTimestamp +
            cooldownPeriod;
        userEndTime[msg.sender][totalUserDeposits[msg.sender]] = endLend;
        userDepositAmount[msg.sender][totalUserDeposits[msg.sender]] = amount;

        stakingBalance[msg.sender] += amount;
        balances[msg.sender] += amount;

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _mint(msg.sender, newTokenId);

        if (amount <= 10000 * 10 ** 6) {
            // blue
            _setTokenURI(
                newTokenId,
                "https://red-domestic-penguin-939.mypinata.cloud/ipfs/QmUx3UiUcAcbNKdd1kbgAZJtJawko44XY45XuLNp72DmFY"
            );
        } else if (amount > 10000 * 10 ** 6 && amount <= 25000 * 10 ** 6) {
            // green
            _setTokenURI(
                newTokenId,
                "https://red-domestic-penguin-939.mypinata.cloud/ipfs/QmZsTtJnitPujJEN2BKRSt7k6uMLqr2FCkGo5imGLZFFzc"
            );
        } else if (amount > 25000 * 10 ** 6 && amount <= 50000 * 10 ** 6) {
            // pink
            _setTokenURI(
                newTokenId,
                "https://red-domestic-penguin-939.mypinata.cloud/ipfs/QmZrrFxQnvPEeUhakJj8U8crYx5WuGLMuM35FpquUVAxBk"
            );
        } else if (amount > 50000 * 10 ** 6 && amount <= 100000 * 10 ** 6) {
            // silver
            _setTokenURI(
                newTokenId,
                "https://red-domestic-penguin-939.mypinata.cloud/ipfs/QmRcrA2iUwffz4fcTUpnxTDzZ83ZX8HBV4c9NnEej35Mrf"
            );
        } else {
            // gold
            _setTokenURI(
                newTokenId,
                "https://red-domestic-penguin-939.mypinata.cloud/ipfs/QmZBtT6boS7qcmQJiX3i4rfXTApQWZ8aNUpV3Yx1r3ekpU"
            );
        }

        return newTokenId;
    }

    function _inCooldown(
        uint256 _depositNumber
    ) public view onlyWhitelisted returns (bool) {
        uint256 _userStartTime = userStartTime[msg.sender][_depositNumber];
        if (block.timestamp > _userStartTime) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Gets the yield claim details
     * @param _depositNumber Deposit Number for which one wants to get the yield details
     * conditions :
     * balance > 0
     * elapsedTime > 0
     * timeInterval > 0
     * cyclesElapsed <= freq
     */
    function yieldClaimDetails(
        uint256 _depositNumber
    ) public view onlyWhitelisted returns (YieldDetails memory _yieldDetails) {
        uint256 _userStartTime = userStartTime[msg.sender][_depositNumber];
        uint256 _userEndTime = userEndTime[msg.sender][_depositNumber];
        uint256 balance = userDepositAmount[msg.sender][_depositNumber];

        require(_inCooldown(_depositNumber), "Loan still in cooldown period");

        uint256 elapsedTime = block.timestamp - _userStartTime;
        uint256 timeInterval = (_userEndTime - _userStartTime) / freq;
        uint256 cyclesElapsed = elapsedTime / timeInterval;

        uint256 _timeFraction = ((_userEndTime - _userStartTime) * (10 ** 6)) /
            SECS_IN_YEAR;

        uint256 totalYield = (balance * reward * _timeFraction) / (10 ** 8);

        uint256 unlockedYield = 0;

        uint256 _cyclesClaimed = _getCyclesClaimed(_depositNumber);

        uint256 nextTransferTime = 0;
        // * >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
        // Check to see if cycles elapsed are greater than zero in order to cover the integer overflow case.
        // -> When cycles elapsed is zero and yield generated is zero
        // * >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
        if (cyclesElapsed > 0) {
            uint256 lastTransferTime = (_userStartTime +
                (_cyclesClaimed * timeInterval));
            nextTransferTime = lastTransferTime + timeInterval;
            if (block.timestamp < lastTransferTime) {
                nextTransferTime = lastTransferTime;
            }
            unlockedYield = ((cyclesElapsed * totalYield) / freq);
        }

        uint256 cyclesLeft;
        uint256 lockedYield;
        // * >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
        // Check to see the frequency and totalYield check
        // -> To prevent the integer overflow in cyclesLeft & lockedYield variable
        // -> Returning default values otherwise
        // * >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
        if (freq >= cyclesElapsed && totalYield >= unlockedYield) {
            cyclesLeft = freq - cyclesElapsed;
            lockedYield = totalYield - unlockedYield;
        } else {
            unlockedYield = totalYield;
            nextTransferTime = _userEndTime;
        }
        uint256 timeLeft = cyclesLeft * timeInterval;

        _yieldDetails.balance = balance;
        _yieldDetails.totalYield = totalYield;
        _yieldDetails.unlockedYield = unlockedYield;
        _yieldDetails.lockedYield = lockedYield;
        _yieldDetails.cyclesLeft = cyclesLeft;
        _yieldDetails.timeLeft = timeLeft;
        _yieldDetails.cyclesElapsed = cyclesElapsed;
        _yieldDetails.nextTransferTime = nextTransferTime;

        return _yieldDetails;
    }

    /**
     * @dev Returns the number of cycles
     * @param _depositNumber Deposit Number for which one wants to claim the yield.
     */

    function _getCyclesClaimed(
        uint256 _depositNumber
    ) private view returns (uint256) {
        return cyclesClaimed[msg.sender][_depositNumber];
    }

    /**
     * @dev Allows user to claim the yield
     * @param _depositNumber Deposit Number for which one wants to claim the yield.
     * conditions :
     * balance > 0
     * elapsedTime > 0
     * timeInterval > 0
     * cyclesElapsed <= freq
     */
    function yieldClaim(uint256 _depositNumber) public onlyWhitelisted {
        YieldDetails memory _details = yieldClaimDetails(_depositNumber);

        require(
            block.timestamp >= _details.nextTransferTime,
            "[yieldClaim(uint256 _depositNumber)] : Last Transfer check : not enough time has passed since last transfer"
        );

        require(
            yieldClaimed[msg.sender][_depositNumber] < _details.totalYield,
            "[yieldClaim(uint256 _depositNumber)] : User Claim Check : total yield already claimed"
        );

        uint256 _prevClaimed = prevClaimed[msg.sender][_depositNumber];
        cyclesClaimed[msg.sender][_depositNumber] += 1;
        require(
            usdc.transfer(msg.sender, _details.unlockedYield - _prevClaimed),
            "TRANSFER FAILED"
        );

        prevClaimed[msg.sender][_depositNumber] = _details.unlockedYield;

        // This variable update is to verify that previous claimed yield is updated on the mapping yieldClaimed
        if (_details.cyclesElapsed < freq) {
            yieldClaimed[msg.sender][_depositNumber] +=
                _details.unlockedYield -
                _prevClaimed;
        } else {
            yieldClaimed[msg.sender][_depositNumber] = _details.unlockedYield;
        }
    }

    /**
     * @dev Get the total portfolio balance ivensted in the pool
     */
    function getportfoliobalance() public view returns (uint256) {
        return (stakingBalance[msg.sender]);
    }

    /**
     * @dev Allows user withdraw the total pool amount in deposit
     * @param _depositNumber Deposit Number for which one wants to claim the yield.
     * conditions :
     * deposit > 0
     * block.timestamp >= end tenure of the pool deposit
     */
    function withdraw(uint256 _depositNumber) public onlyWhitelisted {
        require(
            userDepositAmount[msg.sender][_depositNumber] > 0,
            "[withdraw(uint256 _depositNumber)] : Insufficient balance in staking amount."
        );
        require(
            block.timestamp >= userEndTime[msg.sender][_depositNumber],
            "[withdraw(uint256 _depositNumber)] : Loan Tenure is not over"
        );
        require(
            withdrawClaimed[msg.sender][_depositNumber] == false,
            "[withdraw(uint256 _depositNumber)] : Loan Tenure is already withdrawed"
        );
        require(
            block.timestamp <=
                userEndTime[msg.sender][_depositNumber] + hotPeriod,
            "[yieldClaimDetails(uint256 _depositNumber)] : Deposit Hot period check"
        );

        uint256 _amountToTransfer = userDepositAmount[msg.sender][
            _depositNumber
        ];

        userDepositAmount[msg.sender][_depositNumber] = 0;
        withdrawClaimed[msg.sender][_depositNumber] = true;
        stakingBalance[msg.sender] -= _amountToTransfer;

        require(
            usdc.transfer(msg.sender, _amountToTransfer),
            "withdraw(uint256 _depositNumber) : TRANSFER FAILED"
        );
    }

    /**
     * @dev Allows the owners to transfer the funds from the contract to any reciever
     * @param _amount Amount you want to withdraw
     * @param _receiver Reciever account
     * conditions :
     * contract balance >= amount
     */
    function _transfer(uint256 _amount, address _receiver) public onlyOwners {
        uint256 contractBalance = usdc.balanceOf(address(this));
        require(contractBalance >= _amount, "Insufficient Balance");
        require(usdc.transfer(_receiver, _amount * 10 ** 6), "TRANSFER FAILED");
    }
}
