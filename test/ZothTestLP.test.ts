import { expect } from "chai";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";

describe("ZothTestLP", function () {
  async function runEveryTime() {
    const [owner, otherAccount] = await ethers.getSigners();

    const testUSDCContract = await ethers.getContractFactory("TestUSDC");
    const testUSDC = await testUSDCContract.deploy();

    const testUSDCAddress = await testUSDC.getAddress();

    const amountToTransfer = ethers.parseUnits("1000", 6);

    await testUSDC.transfer(otherAccount, amountToTransfer);

    const zothTestLPContract = await ethers.getContractFactory("ZothTestLP");
    const ZothTestLP = await zothTestLPContract.deploy(testUSDCAddress);

    const zothTestLPAddress = await ZothTestLP.getAddress();

    await testUSDC.transfer(zothTestLPAddress, amountToTransfer);

    return { owner, otherAccount, testUSDC, ZothTestLP };
  }

  // ! >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  // ! DEPLOYMENT TESTS
  // ! >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  describe("Deployment", async () => {
    it("[Deployment] : Should initiate the contract with provided USDC address", async () => {
      const { ZothTestLP } = await loadFixture(runEveryTime);
      expect(await ZothTestLP.getAddress()).to.not.null;
    });
  });

  // ! >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  // ! VARIABLE INITIATION TESTS
  // ! >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  describe("Variable Initiation", async () => {
    it("[setContractVariables() | getContractVariables()] : Should Initiate the variables properly for the contract", async () => {
      const { ZothTestLP } = await loadFixture(runEveryTime);

      // Setting contract variables
      const tenure1 = (2629743 * 3).toString(); // 3 months
      const tenure2 = (2629743 * 6).toString(); // 6 months
      const tenure3 = (2629743 * 9).toString(); // 9 months

      const reward = "10";
      const freq = "4";
      const poolId = "100001";
      const coolDownPeriod = (86400 * 4).toString(); // 4 days

      await ZothTestLP.setContractVariables(
        tenure1,
        tenure2,
        tenure3,
        reward,
        freq,
        poolId,
        coolDownPeriod
      );

      const vars = await ZothTestLP.getContractVariables();
      expect(vars[0]).to.equal("7889229");
      expect(vars[1]).to.equal("15778458");
      expect(vars[2]).to.equal("23667687");
      expect(vars[3]).to.equal("10");
      expect(vars[4]).to.equal("4");
      expect(vars[5]).to.equal("100001");
      expect(vars[6]).to.equal("345600");
    });
  });

  // ! >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  // ! GOVERNANCE TESTS
  // ! >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  describe("Governance", async () => {
    it("[addVerifierRole()] : Assigns the address to verifier role by owner", async () => {
      const { ZothTestLP, otherAccount } = await loadFixture(runEveryTime);
      await ZothTestLP.addVerifierRole(otherAccount.address);
    });
    it("[addWhitelistAddress()] : Assigns the address to whitelist role by authorities", async () => {
      const { ZothTestLP, otherAccount } = await loadFixture(runEveryTime);
      await ZothTestLP.addWhitelistAddress(otherAccount.address);
    });
    it("[addWhitelistAddress() | removeWhitelistAddress()] : Remove the address to whitelist role by authorities", async () => {
      const { ZothTestLP, otherAccount } = await loadFixture(runEveryTime);
      await ZothTestLP.addWhitelistAddress(otherAccount.address);
      await ZothTestLP.removeWhitelistAddress(otherAccount.address);
    });
  });

  // ! >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  // ! DEPOSIT TESTS
  // ! >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  describe("Deposit", async () => {
    it("[deposit()] : Successful Token Transfer tUSDC (account -> other account)", async () => {
      const { otherAccount, testUSDC } = await loadFixture(runEveryTime);

      const formattedBalance = ethers.parseUnits("1000", 6);

      const bal = await testUSDC.balanceOf(otherAccount.address);

      expect(bal).to.equal(formattedBalance);
    });
    it("[deposit()] : Successfully deposit 100tUSDC into Liquidity Pool with tenure 1", async () => {
      const { ZothTestLP, otherAccount, testUSDC } = await loadFixture(
        runEveryTime
      );
      // Setting variables for LP contract
      await ZothTestLP.setContractVariables(
        "7889229",
        "15778458",
        "23667687",
        "12",
        "1",
        "100001",
        "345600"
      );

      // Whitelisting other account
      await ZothTestLP.addWhitelistAddress(otherAccount.address);

      // Allowance of tUSDC transfer for LP token contract
      const zothTestLPAddress = await ZothTestLP.getAddress();
      const spender_amount = ethers.parseUnits("1000000000", 6);
      await testUSDC
        .connect(otherAccount)
        .approve(zothTestLPAddress, spender_amount);

      // depositing 100 tUSDC into LP

      await ZothTestLP.connect(otherAccount).deposit(
        ethers.parseUnits("100", 6),
        1
      );

      const totalUserDeposits = await ZothTestLP.connect(
        otherAccount
      ).totalUserDeposits(otherAccount.address);

      const userDepositAmount = await ZothTestLP.userDepositAmount(
        otherAccount.address,
        1
      );

      const stakingBalance = await ZothTestLP.stakingBalance(
        otherAccount.address
      );

      const balances = await ZothTestLP.balances(otherAccount.address);

      expect(totalUserDeposits).to.equal("1");
      expect(userDepositAmount).to.equal("100000000");
      expect(stakingBalance).to.equal("100000000");
      expect(balances).to.equal("100000000");
    });

    it("[deposit()] : Revert deposit 100tUSDC into Liquidity Pool with tenure <undefined : 4 ,5 ,6 ...>", async () => {
      const { ZothTestLP, otherAccount, testUSDC } = await loadFixture(
        runEveryTime
      );
      // Setting variables for LP contract
      await ZothTestLP.setContractVariables(
        "7889229",
        "15778458",
        "23667687",
        "12",
        "1",
        "100001",
        "345600"
      );

      // Whitelisting other account
      await ZothTestLP.addWhitelistAddress(otherAccount.address);

      // Allowance of tUSDC transfer for LP token contract
      const zothTestLPAddress = await ZothTestLP.getAddress();
      const spender_amount = ethers.parseUnits("1000000000", 6);
      await testUSDC
        .connect(otherAccount)
        .approve(zothTestLPAddress, spender_amount);

      // depositing 100 tUSDC into LP

      await expect(
        ZothTestLP.connect(otherAccount).deposit("100", 4)
      ).to.be.revertedWith(
        "[deposit(uint256 amount,uint256 _tenureOption)] : Tenure Option check : Tenure options should be between 1 and 3"
      );
    });

    it("[deposit()] : Revert deposit 0 tUSDC into Liquidity Pool with tenure <defined>", async () => {
      const { ZothTestLP, otherAccount, testUSDC } = await loadFixture(
        runEveryTime
      );
      // Setting variables for LP contract
      await ZothTestLP.setContractVariables(
        "7889229",
        "15778458",
        "23667687",
        "12",
        "1",
        "100001",
        "345600"
      );

      // Whitelisting other account
      await ZothTestLP.addWhitelistAddress(otherAccount.address);

      // Allowance of tUSDC transfer for LP token contract
      const zothTestLPAddress = await ZothTestLP.getAddress();
      const spender_amount = ethers.parseUnits("1000000000", 6);
      await testUSDC
        .connect(otherAccount)
        .approve(zothTestLPAddress, spender_amount);

      // depositing 100 tUSDC into LP

      await expect(
        ZothTestLP.connect(otherAccount).deposit("0", 1)
      ).to.be.revertedWith(
        "[deposit(uint256 amount,uint256 _tenureOption)] : Amount check : Deposit amount must be greater than zero"
      );
    });

    it("[deposit()] : Revert deposit 100 tUSDC into Liquidity Pool with no allowance", async () => {
      const { ZothTestLP, otherAccount } = await loadFixture(runEveryTime);
      // Setting variables for LP contract
      await ZothTestLP.setContractVariables(
        "7889229",
        "15778458",
        "23667687",
        "12",
        "1",
        "100001",
        "345600"
      );

      // Whitelisting other account
      await ZothTestLP.addWhitelistAddress(otherAccount.address);

      // depositing 100 tUSDC into LP

      await expect(
        ZothTestLP.connect(otherAccount).deposit("100", 1)
      ).to.be.revertedWith(
        "[deposit(uint256 amount,uint256 _tenureOption)] : USDC allowance check : Contract not authorized to spend tokens"
      );
    });
  });

  // ! >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  // ! YIELD CLAIM DETAIL TESTS
  // ! >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  describe("Yield Claim Detail", async () => {
    it("[yieldClaimDetails()] : Successfully Gives details for deposit number 1 after depositing into LP", async () => {
      const { ZothTestLP, otherAccount, testUSDC } = await loadFixture(
        runEveryTime
      );
      // Setting variables for LP contract
      await ZothTestLP.setContractVariables(
        "7889229",
        "15778458",
        "23667687",
        "12",
        "1",
        "100001",
        "345600"
      );

      // Whitelisting other account
      await ZothTestLP.addWhitelistAddress(otherAccount.address);

      // Allowance of tUSDC transfer for LP token contract
      const zothTestLPAddress = await ZothTestLP.getAddress();
      const spender_amount = ethers.parseUnits("1000000000", 6);
      await testUSDC
        .connect(otherAccount)
        .approve(zothTestLPAddress, spender_amount);

      // depositing 100 tUSDC into LP

      await ZothTestLP.connect(otherAccount).deposit(
        ethers.parseUnits("100", 6),
        1
      );

      // increase the timestamp of block after cooldown
      //   await time.increaseTo(1698883539);

      const vars = await ZothTestLP.connect(otherAccount).yieldClaimDetails(
        "1"
      );

      expect(vars[0]).to.equal("100000000");
      expect(vars[1]).to.equal("3001980");
      expect(vars[2]).to.equal("0");
      expect(vars[3]).to.equal("3001980");
      expect(vars[4]).to.equal("1");
      expect(vars[5]).to.equal("7889229");
    });
  });
  //     it("[yieldClaimDetails()] : Reverts the details for deposit number 1 after depositing into LP because of deposit in cooldown period", async () => {
  //       const { ZothTestLP, otherAccount, testUSDC } = await loadFixture(
  //         runEveryTime
  //       );
  //       // Setting variables for LP contract
  //       await ZothTestLP.setContractVariables(
  //         "7889229",
  //         "15778458",
  //         "23667687",
  //         "10",
  //         "4",
  //         "100001",
  //         "345600"
  //       );

  //       // Whitelisting other account
  //       await ZothTestLP.addWhitelistAddress(otherAccount.address);

  //       // Allowance of tUSDC transfer for LP token contract
  //       const zothTestLPAddress = await ZothTestLP.getAddress();
  //       const spender_amount = ethers.parseUnits("1000000000", 6);
  //       await testUSDC
  //         .connect(otherAccount)
  //         .approve(zothTestLPAddress, spender_amount);

  //       // depositing 100 tUSDC into LP

  //       await ZothTestLP.connect(otherAccount).deposit("100", 1);

  //       await expect(
  //         ZothTestLP.connect(otherAccount).yieldClaimDetails("1")
  //       ).to.be.revertedWith(
  //         "[yieldClaimDetails(uint256 _depositNumber)] : Cooldown check : Your deposit is still in cooldown"
  //       );
  //     });
  //   });
  // ! >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  // ! YIELD CLAIM TESTS
  // ! >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  //   describe("Yield Claim", async () => {
  //     it("[yieldClaim()] : Successfully claims the unlocked yield after making a deposit", async () => {
  //       const { ZothTestLP, otherAccount, testUSDC } = await loadFixture(
  //         runEveryTime
  //       );
  //       // Setting variables for LP contract
  //       await ZothTestLP.setContractVariables(
  //         "7889229",
  //         "15778458",
  //         "23667687",
  //         "10",
  //         "4",
  //         "100001",
  //         "345600"
  //       );

  //       // Whitelisting other account
  //       await ZothTestLP.addWhitelistAddress(otherAccount.address);

  //       // Allowance of tUSDC transfer for LP token contract
  //       const zothTestLPAddress = await ZothTestLP.getAddress();
  //       const spender_amount = ethers.parseUnits("1000000000", 6);
  //       await testUSDC
  //         .connect(otherAccount)
  //         .approve(zothTestLPAddress, spender_amount);

  //       // depositing 100 tUSDC into LP

  //       await ZothTestLP.connect(otherAccount).deposit("100", 1);

  //       // increase the timestamp of block after cooldown
  //       await time.increaseTo(1698883539);

  //       await ZothTestLP.connect(otherAccount).yieldClaim("1");

  //       const new_balance_tUSDC = await testUSDC.balanceOf(otherAccount.address);

  //       expect(new_balance_tUSDC).to.equal("902000000");
  //     });
  //     it("[yieldClaim()] : Reverts the yield claim details if yield is already claimed and not enough time has passed", async () => {
  //       const { ZothTestLP, otherAccount, testUSDC } = await loadFixture(
  //         runEveryTime
  //       );
  //       // Setting variables for LP contract
  //       await ZothTestLP.setContractVariables(
  //         "7889229",
  //         "15778458",
  //         "23667687",
  //         "10",
  //         "4",
  //         "100001",
  //         "345600"
  //       );

  //       // Whitelisting other account
  //       await ZothTestLP.addWhitelistAddress(otherAccount.address);

  //       // Allowance of tUSDC transfer for LP token contract
  //       const zothTestLPAddress = await ZothTestLP.getAddress();
  //       const spender_amount = ethers.parseUnits("1000000000", 6);
  //       await testUSDC
  //         .connect(otherAccount)
  //         .approve(zothTestLPAddress, spender_amount);

  //       // depositing 100 tUSDC into LP

  //       await ZothTestLP.connect(otherAccount).deposit("100", 1);

  //       // increase the timestamp of block after cooldown
  //       await time.increaseTo(1698883539);

  //       await ZothTestLP.connect(otherAccount).yieldClaim("1");

  //       await expect(
  //         ZothTestLP.connect(otherAccount).yieldClaim("1")
  //       ).to.be.revertedWith(
  //         "[yieldClaim(uint256 _depositNumber)] : Last Transfer check : not enough time has passed since last transfer"
  //       );
  //     });
  //   });
  // ! >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  // ! WITHDRAW TESTS
  // ! >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  //   describe("Withdraw", async () => {
  //     it("[withdraw()] : Successfully withdraw after the tenure is over", async () => {
  //       const { ZothTestLP, otherAccount, testUSDC } = await loadFixture(
  //         runEveryTime
  //       );
  //       // Setting variables for LP contract
  //       await ZothTestLP.setContractVariables(
  //         "7889229",
  //         "15778458",
  //         "23667687",
  //         "10",
  //         "4",
  //         "100001",
  //         "345600"
  //       );

  //       // Whitelisting other account
  //       await ZothTestLP.addWhitelistAddress(otherAccount.address);

  //       // Allowance of tUSDC transfer for LP token contract
  //       const zothTestLPAddress = await ZothTestLP.getAddress();
  //       const spender_amount = ethers.parseUnits("1000000000", 6);
  //       await testUSDC
  //         .connect(otherAccount)
  //         .approve(zothTestLPAddress, spender_amount);

  //       // depositing 100 tUSDC into LP

  //       await ZothTestLP.connect(otherAccount).deposit("100", 1);

  //       // increase the timestamp of block to end time of the deposit
  //       await time.increaseTo(1698883539);

  //       // Claim yield
  //       await ZothTestLP.connect(otherAccount).yieldClaim("1");

  //       await ZothTestLP.connect(otherAccount).withdraw("1");

  //       const new_bal = await testUSDC.balanceOf(otherAccount.address);

  //       expect(new_bal).to.equal("1002000000");
  //     });

  //     it("[withdraw()] : Revert withdraw if end time is not reached", async () => {
  //       const { ZothTestLP, otherAccount, testUSDC } = await loadFixture(
  //         runEveryTime
  //       );
  //       // Setting variables for LP contract
  //       await ZothTestLP.setContractVariables(
  //         "7889229",
  //         "15778458",
  //         "23667687",
  //         "10",
  //         "4",
  //         "100001",
  //         "345600"
  //       );

  //       // Whitelisting other account
  //       await ZothTestLP.addWhitelistAddress(otherAccount.address);

  //       // Allowance of tUSDC transfer for LP token contract
  //       const zothTestLPAddress = await ZothTestLP.getAddress();
  //       const spender_amount = ethers.parseUnits("1000000000", 6);
  //       await testUSDC
  //         .connect(otherAccount)
  //         .approve(zothTestLPAddress, spender_amount);

  //       // depositing 100 tUSDC into LP

  //       await ZothTestLP.connect(otherAccount).deposit("100", 1);

  //       await expect(
  //         ZothTestLP.connect(otherAccount).withdraw("1")
  //       ).to.be.revertedWith(
  //         "[withdraw(uint256 _depositNumber)] : Loan Tenure is not over"
  //       );
  //     });
  //   });
});
