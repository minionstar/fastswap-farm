const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { assert } = require('chai');

const MasterChef = artifacts.require('MasterChef');
const MockERC20 = artifacts.require('MockERC20');

contract('MasterChef', ([alice, bob, carol, minter, migrator]) => {
  beforeEach(async () => {
    this.fast = await MockERC20.new('Fast', 'Fast', web3.utils.toWei('1000000000', 'ether'), { from: minter });
  });

  it('should set correct state variables', async () => {
    const timestamp = await time.latest();
    this.chef = await MasterChef.new(
      this.fast.address,
      timestamp.add(time.duration.seconds(2)),
      { from: alice },
    );

    const fast = await this.chef.fast();
    assert.equal(fast.valueOf(), this.fast.address);
  });

  it('should correct change variables', async () => {
    const timestamp = await time.latest();
    this.chef = await MasterChef.new(
      this.fast.address,
      timestamp.add(time.duration.seconds(2)),
      { from: alice },
    );

    await this.chef.setMigrator(migrator);

    const newMigrator = await this.chef.migrator();
    assert.equal(newMigrator.valueOf(), migrator);
  });

  // eslint-disable-next-line
  context('With ERC/LP token added to the field', () => {
    beforeEach(async () => {
      this.lp = await MockERC20.new('LPToken', 'LP', web3.utils.toWei('10000000000', 'ether'), { from: minter });
      await this.lp.transfer(alice, web3.utils.toWei('1000', 'ether'), { from: minter });
      await this.lp.transfer(bob, web3.utils.toWei('1000', 'ether'), { from: minter });
      await this.lp.transfer(carol, web3.utils.toWei('1000', 'ether'), { from: minter });

      this.lp2 = await MockERC20.new('LPToken2', 'LP2', web3.utils.toWei('10000000000', 'ether'), { from: minter });
      await this.lp2.transfer(alice, web3.utils.toWei('1000', 'ether'), { from: minter });
      await this.lp2.transfer(bob, web3.utils.toWei('1000', 'ether'), { from: minter });
      await this.lp2.transfer(carol, web3.utils.toWei('1000', 'ether'), { from: minter });
    });

    it('should return correct poolLength', async () => {
      const timestamp = await time.latest();
      this.chef = await MasterChef.new(
        this.fast.address,
        timestamp.add(time.duration.seconds(2)),
        { from: alice },
      );
      this.fast.transfer(this.chef.address, web3.utils.toWei('1000000000', 'ether'), { from: minter });

      await expectRevert(this.chef.add(0, this.lp.address, true), 'add: incorrect value');
      await this.chef.add(20, this.lp.address, true);
      assert.equal(await this.chef.poolLength(), 1);

      await this.chef.add(20, this.lp2.address, false);
      assert.equal(await this.chef.poolLength(), 2);
    });

    it('should allow emergency withdraw', async () => {
      const timestamp = await time.latest();
      this.chef = await MasterChef.new(
        this.fast.address,
        timestamp.add(time.duration.seconds(2)),
        { from: alice },
      );
      this.fast.transfer(this.chef.address, web3.utils.toWei('1000000000', 'ether'), { from: minter });

      await this.chef.add(20, this.lp.address, true);

      await this.lp.approve(this.chef.address, web3.utils.toWei('1000', 'ether'), { from: bob });
      await this.chef.deposit(0, web3.utils.toWei('100', 'ether'), { from: bob });
      assert.equal(await this.lp.balanceOf(bob), web3.utils.toWei('900', 'ether'));

      await this.chef.emergencyWithdraw(0, { from: bob });
      assert.equal(await this.lp.balanceOf(bob), web3.utils.toWei('1000', 'ether'));
    });

    it('should allow emergency withdraw', async () => {
      const timestamp = await time.latest();
      this.chef = await MasterChef.new(
        this.fast.address,
        timestamp.add(time.duration.seconds(2)),
        { from: alice },
      );
      this.fast.transfer(this.chef.address, web3.utils.toWei('1000000000', 'ether'), { from: minter });

      await expectRevert(this.chef.emergencyFastWithdraw(web3.utils.toWei('100', 'ether'), { from: bob }), 'Ownable: caller is not the owner');
      await expectRevert(this.chef.emergencyFastWithdraw(0, { from: alice }), 'emergencyFastWithdraw: amount must be greater than zero');

      await this.chef.emergencyFastWithdraw(web3.utils.toWei('100', 'ether'), { from: alice });
      assert.equal(await this.fast.balanceOf(alice), web3.utils.toWei('100', 'ether'));
    });

    it('should return correct values pendingFast for 1 user', async () => {
      const timestamp = await time.latest();
      this.chef = await MasterChef.new(
        this.fast.address,
        timestamp.add(time.duration.seconds(2)),
        { from: alice },
      );
      this.fast.transfer(this.chef.address, web3.utils.toWei('20000', 'ether'), { from: minter });

      await this.chef.add(web3.utils.toWei('20000', 'ether'), this.lp.address, true);
      await this.lp.approve(this.chef.address, web3.utils.toWei('20001', 'ether'), { from: bob });
      await this.chef.deposit(0, web3.utils.toWei('91', 'ether'), { from: bob });
      assert.equal(await this.chef.pendingFast(0, bob), 0);

      await time.increase(time.duration.days(1));
      let pendingFast = await this.chef.pendingFast(0, bob);
      assert(pendingFast > web3.utils.toWei('217', 'ether'));
      assert(pendingFast < web3.utils.toWei('221', 'ether'));

      await time.increase(time.duration.days(1));
      pendingFast = await this.chef.pendingFast(0, bob);
      assert(pendingFast > web3.utils.toWei('437', 'ether'));
      assert(pendingFast < web3.utils.toWei('441', 'ether'));

      await time.increase(time.duration.days(1));
      pendingFast = await this.chef.pendingFast(0, bob);
      assert(pendingFast > web3.utils.toWei('657', 'ether'));
      assert(pendingFast < web3.utils.toWei('661', 'ether'));

      await time.increase(time.duration.days(7));
      pendingFast = await this.chef.pendingFast(0, bob);
      assert(pendingFast > web3.utils.toWei('2195', 'ether'));
      assert(pendingFast < web3.utils.toWei('2199', 'ether'));

      await time.increase(time.duration.days(81));
      pendingFast = await this.chef.pendingFast(0, bob);
      assert(pendingFast > web3.utils.toWei('19999', 'ether'));
      assert(pendingFast <= web3.utils.toWei('20000', 'ether'));

      await time.increase(time.duration.days(91));
      pendingFast = await this.chef.pendingFast(0, bob);
      assert(pendingFast > web3.utils.toWei('19999', 'ether'));
      assert(pendingFast <= web3.utils.toWei('20000', 'ether'));
    });

    it('should return correct values pendingFast for 1 user, deposit after start', async () => {
      const timestamp = await time.latest();
      this.chef = await MasterChef.new(
        this.fast.address,
        timestamp.add(time.duration.seconds(2)),
        { from: alice },
      );
      this.fast.transfer(this.chef.address, web3.utils.toWei('20000', 'ether'), { from: minter });

      await this.chef.add(web3.utils.toWei('20000', 'ether'), this.lp.address, true);

      await time.increase(time.duration.days(1));
      await this.lp.approve(this.chef.address, web3.utils.toWei('20001', 'ether'), { from: bob });
      await this.chef.deposit(0, web3.utils.toWei('91', 'ether'), { from: bob });
      assert.equal(await this.chef.pendingFast(0, bob), 0);

      await time.increase(time.duration.days(1));
      let pendingFast = await this.chef.pendingFast(0, bob);
      assert(pendingFast > web3.utils.toWei('217', 'ether'));
      assert(pendingFast < web3.utils.toWei('221', 'ether'));

      await time.increase(time.duration.days(1));
      pendingFast = await this.chef.pendingFast(0, bob);
      assert(pendingFast > web3.utils.toWei('437', 'ether'));
      assert(pendingFast < web3.utils.toWei('441', 'ether'));

      await time.increase(time.duration.days(1));
      pendingFast = await this.chef.pendingFast(0, bob);
      assert(pendingFast > web3.utils.toWei('657', 'ether'));
      assert(pendingFast < web3.utils.toWei('661', 'ether'));

      await time.increase(time.duration.days(7));
      pendingFast = await this.chef.pendingFast(0, bob);
      assert(pendingFast > web3.utils.toWei('2195', 'ether'));
      assert(pendingFast < web3.utils.toWei('2199', 'ether'));

      await time.increase(time.duration.days(81));
      pendingFast = await this.chef.pendingFast(0, bob);
      assert(pendingFast > web3.utils.toWei('19779', 'ether'));
      assert(pendingFast < web3.utils.toWei('19781', 'ether'));
    });

    it('should return correct values fast balanceOf for 1 user', async () => {
      const timestamp = await time.latest();
      this.chef = await MasterChef.new(
        this.fast.address,
        timestamp.add(time.duration.seconds(2)),
        { from: alice },
      );
      this.fast.transfer(this.chef.address, web3.utils.toWei('20000', 'ether'), { from: minter });

      await this.chef.add(web3.utils.toWei('20000', 'ether'), this.lp.address, false);
      await this.lp.approve(this.chef.address, web3.utils.toWei('20001', 'ether'), { from: bob });
      await this.chef.deposit(0, web3.utils.toWei('1', 'ether'), { from: bob });
      assert.equal(await this.chef.pendingFast(0, bob), 0);

      await time.increase(time.duration.days(10));
      let pendingFast = await this.chef.pendingFast(0, bob);
      assert(pendingFast > web3.utils.toWei('2195', 'ether'));
      assert(pendingFast < web3.utils.toWei('2199', 'ether'));

      await this.chef.deposit(0, web3.utils.toWei('1', 'ether'), { from: bob });
      assert.equal(await this.chef.pendingFast(0, bob), 0);

      await time.increase(time.duration.days(81));
      pendingFast = await this.chef.pendingFast(0, bob);
      assert(pendingFast > web3.utils.toWei('17800', 'ether'));
      assert(pendingFast < web3.utils.toWei('17804', 'ether'));
    });

    it('should return correct values Fast balanceOf for 1 user. Change pool', async () => {
      const timestamp = await time.latest();
      this.chef = await MasterChef.new(
        this.fast.address,
        timestamp.add(time.duration.seconds(2)),
        { from: alice },
      );
      this.fast.transfer(this.chef.address, web3.utils.toWei('300000', 'ether'), { from: minter });

      await this.chef.add(web3.utils.toWei('40000', 'ether'), this.lp.address, false);
      await this.lp.approve(this.chef.address, web3.utils.toWei('1000', 'ether'), { from: bob });
      await this.chef.deposit(0, web3.utils.toWei('100', 'ether'), { from: bob });

      await time.increase(time.duration.days(1));
      await this.chef.deposit(0, 0, { from: bob });
      const balanceOf = await this.fast.balanceOf(bob);
      assert(balanceOf > web3.utils.toWei('437', 'ether'));
      assert(balanceOf < web3.utils.toWei('441', 'ether'));
    });

    it('should return correct values Fast balanceOf for 2 user', async () => {
      const timestamp = await time.latest();
      this.chef = await MasterChef.new(
        this.fast.address,
        timestamp.add(time.duration.seconds(2)),
        { from: alice },
      );

      this.fast.transfer(this.chef.address, web3.utils.toWei('20000', 'ether'), { from: minter });
      await this.chef.add(web3.utils.toWei('20000', 'ether'), this.lp.address, true);

      await this.lp.approve(this.chef.address, web3.utils.toWei('1000', 'ether'), { from: bob });
      await this.chef.deposit(0, web3.utils.toWei('100', 'ether'), { from: bob });

      await this.lp.approve(this.chef.address, web3.utils.toWei('1000', 'ether'), { from: carol });
      await this.chef.deposit(0, web3.utils.toWei('100', 'ether'), { from: carol });

      await time.increase(time.duration.days(1));
      await this.chef.deposit(0, 0, { from: bob });
      await this.chef.deposit(0, 0, { from: carol });
      let balanceOf = await this.fast.balanceOf(bob);
      assert(balanceOf > web3.utils.toWei('107', 'ether'));
      assert(balanceOf < web3.utils.toWei('111', 'ether'));

      balanceOf = await this.fast.balanceOf(carol);
      assert(balanceOf > web3.utils.toWei('107', 'ether'));
      assert(balanceOf < web3.utils.toWei('111', 'ether'));
    });

    it('should return correct values Fast balanceOf for 2 user on different days', async () => {
      const timestamp = await time.latest();
      this.chef = await MasterChef.new(
        this.fast.address,
        timestamp.add(time.duration.seconds(2)),
        { from: alice },
      );

      this.fast.transfer(this.chef.address, web3.utils.toWei('200000', 'ether'), { from: minter });
      await this.chef.add(web3.utils.toWei('200000', 'ether'), this.lp.address, false);

      await this.lp.approve(this.chef.address, web3.utils.toWei('1000', 'ether'), { from: bob });
      await this.chef.deposit(0, web3.utils.toWei('100', 'ether'), { from: bob });

      await time.increase(time.duration.days(1));
      await this.chef.deposit(0, 0, { from: bob });
      let balanceOf = await this.fast.balanceOf(bob);
      assert(balanceOf > web3.utils.toWei('217', 'ether'));
      assert(balanceOf < web3.utils.toWei('221', 'ether'));

      await this.lp.approve(this.chef.address, web3.utils.toWei('1000', 'ether'), { from: carol });
      await this.chef.deposit(0, web3.utils.toWei('100', 'ether'), { from: carol });

      await time.increase(time.duration.days(1));
      await this.chef.deposit(0, 0, { from: bob });
      await this.chef.deposit(0, 0, { from: carol });
      balanceOf = await this.fast.balanceOf(bob);
      assert(balanceOf > web3.utils.toWei('327', 'ether'));
      assert(balanceOf < web3.utils.toWei('331', 'ether'));

      balanceOf = await this.fast.balanceOf(carol);
      assert(balanceOf > web3.utils.toWei('107', 'ether'));
      assert(balanceOf < web3.utils.toWei('111', 'ether'));
    });

    it('should return correct values Fast balanceOf for 2 user on different days. Recount at the end', async () => {
      const timestamp = await time.latest();
      this.chef = await MasterChef.new(
        this.fast.address,
        timestamp.add(time.duration.seconds(2)),
        { from: alice },
      );

      this.fast.transfer(this.chef.address, web3.utils.toWei('200000', 'ether'), { from: minter });
      await this.chef.add(web3.utils.toWei('200000', 'ether'), this.lp.address, true);

      await this.lp.approve(this.chef.address, web3.utils.toWei('1000', 'ether'), { from: bob });
      await this.chef.deposit(0, web3.utils.toWei('100', 'ether'), { from: bob });

      await time.increase(time.duration.days(1));
      const pendingFast = await this.chef.pendingFast(0, bob);
      assert(pendingFast > web3.utils.toWei('217', 'ether'));
      assert(pendingFast < web3.utils.toWei('221', 'ether'));

      await this.lp.approve(this.chef.address, web3.utils.toWei('1000', 'ether'), { from: carol });
      await this.chef.deposit(0, web3.utils.toWei('100', 'ether'), { from: carol });

      await time.increase(time.duration.days(1));
      await this.chef.deposit(0, 0, { from: bob });
      await this.chef.deposit(0, 0, { from: carol });
      let balanceOf = await this.fast.balanceOf(bob);
      assert(balanceOf > web3.utils.toWei('327', 'ether'));
      assert(balanceOf < web3.utils.toWei('331', 'ether'));

      balanceOf = await this.fast.balanceOf(carol);
      assert(balanceOf > web3.utils.toWei('107', 'ether'));
      assert(balanceOf < web3.utils.toWei('111', 'ether'));
    });

    it('should return correct values Fast and LP balanceOf for 1 user', async () => {
      const timestamp = await time.latest();
      this.chef = await MasterChef.new(
        this.fast.address,
        timestamp.add(time.duration.seconds(2)),
        { from: alice },
      );
      this.fast.transfer(this.chef.address, web3.utils.toWei('200000', 'ether'), { from: minter });

      await this.chef.add(web3.utils.toWei('200000', 'ether'), this.lp.address, false);
      await this.lp.approve(this.chef.address, web3.utils.toWei('1000', 'ether'), { from: bob });

      await this.chef.withdraw(0, 0, { from: bob });
      assert.equal(await this.fast.balanceOf(bob), 0);

      await this.chef.deposit(0, web3.utils.toWei('100', 'ether'), { from: bob });

      await time.increase(time.duration.days(1));
      // Trying to shoot more than necessary
      await expectRevert(this.chef.withdraw(0, web3.utils.toWei('200', 'ether'), { from: carol }), 'withdraw: not good');
      await this.chef.withdraw(0, web3.utils.toWei('100', 'ether'), { from: bob });
      const balanceOf = await this.fast.balanceOf(bob);

      assert(balanceOf > web3.utils.toWei('217', 'ether'));
      assert(balanceOf < web3.utils.toWei('221', 'ether'));

      assert.equal(await this.lp.balanceOf(bob), web3.utils.toWei('1000', 'ether'));
    });

    it('checking if user can participate in 2 pools the same time', async () => {
      const timestamp = await time.latest();
      this.chef = await MasterChef.new(
        this.fast.address,
        timestamp.add(time.duration.seconds(2)),
        { from: alice },
      );
      this.fast.transfer(this.chef.address, web3.utils.toWei('40000', 'ether'), { from: minter });

      await this.chef.add(web3.utils.toWei('20000', 'ether'), this.lp.address, true);
      await this.lp.approve(this.chef.address, web3.utils.toWei('20001', 'ether'), { from: bob });

      await this.chef.add(web3.utils.toWei('20000', 'ether'), this.lp2.address, true);
      await this.lp2.approve(this.chef.address, web3.utils.toWei('20001', 'ether'), { from: bob });

      await this.chef.deposit(0, web3.utils.toWei('91', 'ether'), { from: bob });
      await this.chef.deposit(1, web3.utils.toWei('91', 'ether'), { from: bob });

      assert.equal(await this.chef.pendingFast(0, bob), 0);
      assert.equal(await this.chef.pendingFast(1, bob), 0);

      await time.increase(time.duration.days(1));
      let pendingFast = await this.chef.pendingFast(0, bob);
      assert(pendingFast > web3.utils.toWei('217', 'ether'));
      assert(pendingFast < web3.utils.toWei('221', 'ether'));

      pendingFast = await this.chef.pendingFast(1, bob);
      assert(pendingFast > web3.utils.toWei('217', 'ether'));
      assert(pendingFast < web3.utils.toWei('221', 'ether'));
    });
  });
});
