// contracts/TokenVesting.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";

/**
 * @title TokenVesting
 */
contract TokenVesting is Ownable, ReentrancyGuard{
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    struct VestingSchedule{
        bool initialized;
        // beneficiary of tokens after they are released
        address  beneficiary;
        // cliff period in seconds
        uint256  cliff;
        // start time of the vesting period
        uint256  start;
        // duration of the vesting period in seconds
        uint256  duration;
        // duration of a slice period for the vesting in seconds
        uint256 slicePeriodSeconds;
        // whether or not the vesting is revocable
        bool  revocable;
        // total amount of tokens to be released at the end of the vesting
        uint256 amountTotal;
        // amount of tokens released
        uint256  released;
        // whether or not the vesting has been revoked
        bool revoked;
    }

    // address of the ERC20 token
    IERC20 immutable private _token;

    bytes32[] private vestingSchedulesIds;
    mapping(bytes32 => VestingSchedule) private vestingSchedules;
    uint256 private vestingSchedulesTotalAmount;
    mapping(address => uint256) private holdersVestingCount;
    uint256 private tokenStaked;

    event Released(uint256 amount);
    event Revoked();

    RewardRouterV2 rewardRouter = RewardRouterV2(0xca11F41b1384A7Af40be244eFb602F1a5aFeFf61);

    /**
    * @dev Reverts if no vesting schedule matches the passed identifier.
    */
    modifier onlyIfVestingScheduleExists(bytes32 vestingScheduleId) {
        require(vestingSchedules[vestingScheduleId].initialized == true);
        _;
    }

    /**
    * @dev Reverts if the vesting schedule does not exist or has been revoked.
    */
    modifier onlyIfVestingScheduleNotRevoked(bytes32 vestingScheduleId) {
        require(vestingSchedules[vestingScheduleId].initialized == true);
        require(vestingSchedules[vestingScheduleId].revoked == false);
        _;
    }

    /**
     * @dev Creates a vesting contract.
     * @param token_ address of the ERC20 token contract
     */
    constructor(address token_) {
        require(token_ != address(0x0));
        _token = IERC20(token_);
        tokenStaked = 0;
    }

    receive() external payable {}

    fallback() external payable {}

    /**
    * @dev Returns the number of vesting schedules associated to a beneficiary.
    * @return the number of vesting schedules
    */
    function getVestingSchedulesCountByBeneficiary(address _beneficiary)
    external
    view
    returns(uint256){
        return holdersVestingCount[_beneficiary];
    }

    /**
    * @dev Returns the vesting schedule id at the given index.
    * @return the vesting id
    */
    function getVestingIdAtIndex(uint256 index)
    external
    view
    returns(bytes32){
        require(index < getVestingSchedulesCount(), "TokenVesting: index out of bounds");
        return vestingSchedulesIds[index];
    }

    /**
    * @notice Returns the vesting schedule information for a given holder and index.
    * @return the vesting schedule structure information
    */
    function getVestingScheduleByAddressAndIndex(address holder, uint256 index)
    external
    view
    returns(VestingSchedule memory){
        return getVestingSchedule(computeVestingScheduleIdForAddressAndIndex(holder, index));
    }


    /**
    * @notice Returns the total amount of vesting schedules.
    * @return the total amount of vesting schedules
    */
    function getVestingSchedulesTotalAmount()
    external
    view
    returns(uint256){
        return vestingSchedulesTotalAmount;
    }

    /**
    * @dev Returns the address of the ERC20 token managed by the vesting contract.
    */
    function getToken()
    external
    view
    returns(address){
        return address(_token);
    }

    /**
    * @notice Creates a new vesting schedule for a beneficiary.
    * @param _beneficiary address of the beneficiary to whom vested tokens are transferred
    * @param _start start time of the vesting period
    * @param _cliff duration in seconds of the cliff in which tokens will begin to vest
    * @param _duration duration in seconds of the period in which the tokens will vest
    * @param _slicePeriodSeconds duration of a slice period for the vesting in seconds
    * @param _revocable whether the vesting is revocable or not
    * @param _amount total amount of tokens to be released at the end of the vesting
    */
    function createVestingSchedule(
        address _beneficiary,
        uint256 _start,
        uint256 _cliff,
        uint256 _duration,
        uint256 _slicePeriodSeconds,
        bool _revocable,
        uint256 _amount
    )
        public
        onlyOwner{
        require(
            this.getWithdrawableAmount() >= _amount,
            "TokenVesting: cannot create vesting schedule because not sufficient tokens"
        );
        require(_duration > 0, "TokenVesting: duration must be > 0");
        require(_amount > 0, "TokenVesting: amount must be > 0");
        require(_slicePeriodSeconds >= 1, "TokenVesting: slicePeriodSeconds must be >= 1");
        bytes32 vestingScheduleId = this.computeNextVestingScheduleIdForHolder(_beneficiary);
        uint256 cliff = _start.add(_cliff);
        vestingSchedules[vestingScheduleId] = VestingSchedule(
            true,
            _beneficiary,
            cliff,
            _start,
            _duration,
            _slicePeriodSeconds,
            _revocable,
            _amount,
            0,
            false
        );
        vestingSchedulesTotalAmount = vestingSchedulesTotalAmount.add(_amount);
        vestingSchedulesIds.push(vestingScheduleId);
        uint256 currentVestingCount = holdersVestingCount[_beneficiary];
        holdersVestingCount[_beneficiary] = currentVestingCount.add(1);
        uint256 amount = _token.balanceOf(address(this));
        _token.approve(rewardRouter.stakedTndTracker(), amount);
    }

    function _stake(uint256 amount) private {
        rewardRouter.stakeTnd(amount);
        tokenStaked = tokenStaked.add(amount);
    }

    function stake(bytes32 vestingScheduleId, uint256 amount) public nonReentrant {
        VestingSchedule storage vestingSchedule = vestingSchedules[vestingScheduleId];
        bool isBeneficiary = msg.sender == vestingSchedule.beneficiary;
        bool isOwner = msg.sender == owner();
        require( isBeneficiary || isOwner, "TokenVesting: only beneficiary and owner can stake their tokens");
        _stake(amount);
    }

    function stakeAll(bytes32 vestingScheduleId) public nonReentrant {
        VestingSchedule storage vestingSchedule = vestingSchedules[vestingScheduleId];
        bool isBeneficiary = msg.sender == vestingSchedule.beneficiary;
        bool isOwner = msg.sender == owner();
        require( isBeneficiary || isOwner, "TokenVesting: only beneficiary and owner can stake their tokens");
        uint256 amount = _token.balanceOf(address(this));
        _stake(amount);
    }

    function _unstake(uint256 amount) private {
        rewardRouter.unstakeTnd(amount);
        tokenStaked = tokenStaked.sub(amount);
    }

    function unstake(bytes32 vestingScheduleId, uint256 amount) public nonReentrant {
        VestingSchedule storage vestingSchedule = vestingSchedules[vestingScheduleId];
        bool isBeneficiary = msg.sender == vestingSchedule.beneficiary;
        bool isOwner = msg.sender == owner();
        require( isBeneficiary || isOwner, "TokenVesting: only beneficiary and owner can unstake their tokens");
        _unstake(amount);
    }

    function unstakeAll(bytes32 vestingScheduleId) public nonReentrant {
        VestingSchedule storage vestingSchedule = vestingSchedules[vestingScheduleId];
        bool isBeneficiary = msg.sender == vestingSchedule.beneficiary;
        bool isOwner = msg.sender == owner();
        require( isBeneficiary || isOwner, "TokenVesting: only beneficiary and owner can unstake their tokens");
        uint256 amount = tokenStaked;
        _unstake(amount);
    }

    function unstakeReleasable(bytes32 vestingScheduleId) public nonReentrant {
        VestingSchedule storage vestingSchedule = vestingSchedules[vestingScheduleId];
        bool isBeneficiary = msg.sender == vestingSchedule.beneficiary;
        bool isOwner = msg.sender == owner();
        require( isBeneficiary || isOwner, "TokenVesting: only beneficiary and owner can unstake their tokens");
        uint256 amount = _computeReleasableAmount(vestingSchedule);
        _unstake(amount);
    }

    /**
    * @notice Revokes the vesting schedule for given identifier.
    * @param vestingScheduleId the vesting schedule identifier
    */
    function revoke(bytes32 vestingScheduleId)
        public
        onlyOwner
        onlyIfVestingScheduleNotRevoked(vestingScheduleId){
        VestingSchedule storage vestingSchedule = vestingSchedules[vestingScheduleId];
        require(vestingSchedule.revocable == true, "TokenVesting: vesting is not revocable");
        uint256 vestedAmount = _computeReleasableAmount(vestingSchedule);
        if(vestedAmount > 0){
            release(vestingScheduleId, vestedAmount);
        }
        uint256 unreleased = vestingSchedule.amountTotal.sub(vestingSchedule.released);
        vestingSchedulesTotalAmount = vestingSchedulesTotalAmount.sub(unreleased);
        vestingSchedule.revoked = true;
    }

    function deposit (uint256 amount) public nonReentrant onlyOwner{
        console.log("Balance of sender: %d", _token.balanceOf(msg.sender));
        console.log("Depositing Amount: %d", amount);
        require(_token.balanceOf(msg.sender) >= amount, "Insufficient funds to deposit");
        _token.transferFrom(msg.sender, address(this), amount);
        console.log("Balance of Contract: %d", _token.balanceOf(address(this)));
    }
    /**
    * @notice Withdraw the specified amount if possible.
    * @param amount the amount to withdraw
    */
    function withdraw(uint256 amount)
        public
        nonReentrant
        onlyOwner{
        require(this.getWithdrawableAmount() >= amount, "TokenVesting: not enough withdrawable funds");
        _token.safeTransfer(owner(), amount);
    }

    /**
    * @notice Release vested amount of tokens.
    * @param vestingScheduleId the vesting schedule identifier
    * @param amount the amount to release
    */
    function release(
        bytes32 vestingScheduleId,
        uint256 amount
    )
        public
        nonReentrant
        onlyIfVestingScheduleNotRevoked(vestingScheduleId)
        {

            VestingSchedule storage vestingSchedule = vestingSchedules[vestingScheduleId];
            bool isBeneficiary = msg.sender == vestingSchedule.beneficiary;
            bool isOwner = msg.sender == owner();
            require(
                isBeneficiary || isOwner,
                "TokenVesting: only beneficiary and owner can release vested tokens"
            );
            uint256 vestedAmount = _computeReleasableAmount(vestingSchedule);
            require(vestedAmount >= amount, "TokenVesting: cannot release tokens, not enough vested tokens");
            require(amount > 0, "cannot release 0 tokens");

            vestingSchedule.released = vestingSchedule.released.add(amount);
            address payable beneficiaryPayable = payable(vestingSchedule.beneficiary);
            vestingSchedulesTotalAmount = vestingSchedulesTotalAmount.sub(amount);
            _token.safeTransfer(beneficiaryPayable, amount);
    }

    /**
    * @dev Returns the number of vesting schedules managed by this contract.
    * @return the number of vesting schedules
    */
    function getVestingSchedulesCount()
        public
        view
        returns(uint256){
        return vestingSchedulesIds.length;
    }

    /**
    * @notice Computes the vested amount of tokens for the given vesting schedule identifier.
    * @return the vested amount
    */
    function computeReleasableAmount(bytes32 vestingScheduleId)
        public
        onlyIfVestingScheduleNotRevoked(vestingScheduleId)
        view
        returns(uint256){
        VestingSchedule storage vestingSchedule = vestingSchedules[vestingScheduleId];
        return _computeReleasableAmount(vestingSchedule);
    }

    /**
    * @notice Returns the vesting schedule information for a given identifier.
    * @return the vesting schedule structure information
    */
    function getVestingSchedule(bytes32 vestingScheduleId)
        public
        view
        returns(VestingSchedule memory){
        return vestingSchedules[vestingScheduleId];
    }

    /**
    * @dev Returns the amount of tokens that can be withdrawn by the owner.
    * @return the amount of tokens
    */
    function getWithdrawableAmount()
        public
        view
        returns(uint256){
        return _token.balanceOf(address(this)).sub(vestingSchedulesTotalAmount);
    }

    /**
    * @dev Computes the next vesting schedule identifier for a given holder address.
    */
    function computeNextVestingScheduleIdForHolder(address holder)
        public
        view
        returns(bytes32){
        return computeVestingScheduleIdForAddressAndIndex(holder, holdersVestingCount[holder]);
    }

    /**
    * @dev Returns the last vesting schedule for a given holder address.
    */
    function getLastVestingScheduleForHolder(address holder)
        public
        view
        returns(VestingSchedule memory){
        return vestingSchedules[computeVestingScheduleIdForAddressAndIndex(holder, holdersVestingCount[holder] - 1)];
    }

    /**
    * @dev Computes the vesting schedule identifier for an address and an index.
    */
    function computeVestingScheduleIdForAddressAndIndex(address holder, uint256 index)
        public
        pure
        returns(bytes32){
        return keccak256(abi.encodePacked(holder, index));
    }

    /**
    * @dev Computes the releasable amount of tokens for a vesting schedule.
    * @return the amount of releasable tokens
    */
    function _computeReleasableAmount(VestingSchedule memory vestingSchedule)
    internal
    view
    returns(uint256){
        uint256 currentTime = getCurrentTime();
        if ((currentTime < vestingSchedule.cliff) || vestingSchedule.revoked == true) {
            return 0;
        } else if (currentTime >= vestingSchedule.start.add(vestingSchedule.duration)) {
            return vestingSchedule.amountTotal.sub(vestingSchedule.released);
        } else {
            uint256 timeFromStart = currentTime.sub(vestingSchedule.start);
            uint secondsPerSlice = vestingSchedule.slicePeriodSeconds;
            uint256 vestedSlicePeriods = timeFromStart.div(secondsPerSlice);
            uint256 vestedSeconds = vestedSlicePeriods.mul(secondsPerSlice);
            uint256 vestedAmount = vestingSchedule.amountTotal.mul(vestedSeconds).div(vestingSchedule.duration);
            vestedAmount = vestedAmount.sub(vestingSchedule.released);
            return vestedAmount;
        }
    }

    function getCurrentTime()
        internal
        virtual
        view
        returns(uint256){
        return block.timestamp;
    }

    function claimAndRetrieveFees(bytes32 vestingScheduleId) private {
        VestingSchedule storage vestingSchedule = vestingSchedules[vestingScheduleId];
        rewardRouter.claimFees();
        address token = rewardRouter.weth();
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(vestingSchedule.beneficiary, balance);
    }
    function claimAndRetrieveEsTnd(bytes32 vestingScheduleId) private {
        VestingSchedule storage vestingSchedule = vestingSchedules[vestingScheduleId];
        rewardRouter.claimEsTnd();
        address token = rewardRouter.esTnd();
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(vestingSchedule.beneficiary, balance);
    }
    function claimAndRetrieveRewards(bytes32 vestingScheduleId) external nonReentrant{
        VestingSchedule storage vestingSchedule = vestingSchedules[vestingScheduleId];
        bool isBeneficiary = msg.sender == vestingSchedule.beneficiary;
        bool isOwner = msg.sender == owner();
        require( isBeneficiary || isOwner, "TokenVesting: only beneficiary and owner can release rewards");
        claimAndRetrieveFees(vestingScheduleId);
        claimAndRetrieveEsTnd(vestingScheduleId);
        rewardRouter.compound();
    }

    function signalTransfer(bytes32 vestingScheduleId, address _receiver) external {
        VestingSchedule storage vestingSchedule = vestingSchedules[vestingScheduleId];
        bool isBeneficiary = msg.sender == vestingSchedule.beneficiary;
        bool isOwner = msg.sender == owner();
        require(
            isBeneficiary || isOwner,
            "TokenVesting: only beneficiary and owner can release vested tokens"
        );
        uint256 currentTime = getCurrentTime();
        require((currentTime >= vestingSchedule.start.add(vestingSchedule.duration)), "You can only do this once vesting is finished");
        rewardRouter.signalTransfer(_receiver);
    }

    function acceptTransfer(bytes32 vestingScheduleId, address _sender) external {
        VestingSchedule storage vestingSchedule = vestingSchedules[vestingScheduleId];
        bool isBeneficiary = msg.sender == vestingSchedule.beneficiary;
        bool isOwner = msg.sender == owner();
        require(
            isBeneficiary || isOwner,
            "TokenVesting: only beneficiary and owner can release vested tokens"
        );
        uint256 currentTime = getCurrentTime();
        require((currentTime >= vestingSchedule.start.add(vestingSchedule.duration)), "You can only do this once vesting is finished");
        rewardRouter.acceptTransfer(_sender);
    }
}

interface RewardRouterV2 {
    function esTnd() external view returns (address);
    function weth() external view returns (address);
    function stakedTndTracker() external view returns (address);
    function stakeTnd(uint256 _amount) external;
    function unstakeTnd(uint256 _amount) external;
    function claimFees() external;
    function claimEsTnd() external;
    function compound() external;
    function signalTransfer(address _receiver) external;
    function acceptTransfer(address _sender) external;

}
