// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
import {MintableBaseToken} from "../tokens/MintableBaseToken.sol";
import {SafeMath} from "../libraries/math/SafeMath.sol";
import {IERC20} from "../libraries/token/IERC20.sol";
import {SafeERC20} from "../libraries/token/SafeERC20.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";


contract InstantVester is Initializable, ReentrancyGuardUpgradeable, OwnableUpgradeable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    MintableBaseToken public claimToken;
    MintableBaseToken public depositToken;

    address[] public receivers;
    uint256 public totalVested;
    uint256 public vestedForUser;

    uint256 public claimWeight;
    uint256 public burnWeight;

    mapping(address => bool) public isReceiver;
    mapping(address => uint256) public receiverWeights;
    mapping(address => uint256) public accountTotalVested;
    mapping(address => bool) public isHandler;

    event Send(address[] _receivers, uint[] amounts);
    event InstantVest(address account, uint256 claimAmount, uint256 burnAmount);

    function initialize(
        MintableBaseToken _depositToken,
        MintableBaseToken _claimToken,
        uint256 _claimWeight,
        uint256 _burnWeight,
        address[] memory _receivers,
        uint256[] memory _receiverWeights
    ) public initializer {
        claimWeight = _claimWeight;
        burnWeight = _burnWeight;

        receivers = new address[](_receivers.length);
        uint totalDistribution = uint(1e18).sub(_burnWeight).sub(_claimWeight);
        for(uint i=0; i < _receivers.length; i++){
            address receiver = _receivers[i];
            isReceiver[receiver] = true;
            receivers[i] = _receivers[i];
            uint weight = _receiverWeights[i];
            receiverWeights[receiver] = weight;
            require(totalDistribution >= weight, 'InstantVester: Total distribution over 100%');
            totalDistribution = totalDistribution.sub(weight);
        }
        require(totalDistribution == 0, 'InstantVester: Total distribution under 100%');

        depositToken = _depositToken;
        claimToken = _claimToken;
        receivers = _receivers;

        __Ownable_init();
        __ReentrancyGuard_init();
    }
    function setReceiverWeight(address _receiver, uint256 _weight) external onlyOwner {
        require(isReceiver[_receiver], 'InstantVester: Receiver not found');
        receiverWeights[_receiver] = _weight;
    }

    function setBurnWeight(uint256 _weight) external onlyOwner {
        burnWeight = _weight;
    }

    function setClaimWeight(uint256 _weight) external onlyOwner {
        claimWeight = _weight;
    }

    function withdraw(uint256 amount) external onlyOwner {
        // only owner can withdraw tokens directly
        IERC20(claimToken).safeTransfer(msg.sender, amount);
    }

    function getRecieverWeight(address receiver) public view returns (uint) {
        uint weight = receiverWeights[receiver];
        return (weight > 0) ? weight : claimWeight;
    }
    function getProportion(uint256 amount, uint256 percentage) public pure returns (uint) {
        return amount.mul(percentage).div(1e18);
    }
    function getRecieverAmount(uint256 amount, address receiver) public view returns (uint256) {
        uint weight = getRecieverWeight(receiver);
        return getProportion(amount, weight);
    }

    function setHandler(address _handler, bool _isActive) external onlyOwner {
        isHandler[_handler] = _isActive;
    }

    function validatePermissions() public view {
        require(
            MintableBaseToken(depositToken).isHandler(address(this)),
            'Instant vester is not a handler and cannot transfer'
        );

        require(
            MintableBaseToken(depositToken).isMinter(address(this)),
            'Instant vester is not a minter and cannot burn'
        );
    }

    function instantVest(uint256 amount) public nonReentrant {
        _instantVestForAccount(msg.sender, amount);
    }

    function instantVestForAccount(address account, uint256 amount) public onlyHandler nonReentrant {
        _instantVestForAccount(account, amount);
    }

    function _instantVestForAccount(address account, uint256 amount) internal {
        require(depositToken.balanceOf(account) >= amount, 'InstantVester: amount exceeds balance');
        uint claimAmount = getProportion(amount, claimWeight);
        require(claimToken.balanceOf(address(this)) >= claimAmount, 'InstantVester: Insufficient vester balance');
        depositToken.burn(address(account), amount);

        for(uint i=0; i < receivers.length; i++) {
            uint recieverAmount = getRecieverAmount(amount, receivers[i]);
            claimToken.transfer(receivers[i], recieverAmount);
        }

        uint burnAmount = getProportion(amount, burnWeight);
        claimToken.burn(address(this), burnAmount);

        claimToken.transfer(account, claimAmount);

        emit InstantVest(account, amount, burnAmount);
    }

    modifier onlyHandler() {
        require(isHandler[msg.sender], "MintableBaseToken: forbidden");
        _;
    }
}


