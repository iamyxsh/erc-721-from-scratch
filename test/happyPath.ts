/* eslint-disable node/no-missing-import */
/* eslint-disable camelcase */
import { expect } from "chai";
import { Signer } from "ethers";
import { ethers } from "hardhat";
import { ERC721, ERC721__factory } from "../typechain";

const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const NAME = "Awesome";
const SYMBOL = "AWS";

const generateMerkelTree = (addresses: string[]) => {
  const leaves = addresses.map((x) => keccak256(x));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  return tree;
};

describe("Happy Path 😁", function () {
  let ERC: ERC721__factory;
  let ERC721: ERC721;

  let owner: Signer, to: Signer, alice: Signer, bob: Signer;
  let tree: any;

  beforeEach(async () => {
    [owner, to, alice, bob] = await ethers.getSigners();

    tree = generateMerkelTree([
      await owner.getAddress(),
      await to.getAddress(),
      await alice.getAddress(),
      await bob.getAddress(),
    ]);

    ERC = await ethers.getContractFactory("ERC721");
    ERC721 = await ERC.deploy(NAME, SYMBOL, tree.getRoot(), 10);
    await ERC721.deployed();
  });

  it("should deploy the contract with correct info", async function () {
    const name = await ERC721.name();
    const symbol = await ERC721.symbol();
    const root = await ERC721.MINTER_MERKLE_ROOT();
    const _owner = await ERC721.owner();

    expect(name).to.be.equal(NAME);
    expect(symbol).to.be.equal(SYMBOL);
    expect(root).to.be.equal("0x" + tree.getRoot().toString("hex"));
    expect(_owner).to.be.equal(await owner.getAddress());
  });

  it("should mint in bulk and show correct balance + ownerOf", async () => {
    const qty = 9;
    const proofForAlice = tree.getHexProof(keccak256(await alice.getAddress()));

    const aliceBalanceBeforeMint = await ERC721.balanceOf(
      await alice.getAddress()
    );

    await ERC721.connect(alice).mint(
      await alice.getAddress(),
      qty,
      proofForAlice
    );

    const aliceBalanceAfterMint = await ERC721.balanceOf(
      await alice.getAddress()
    );

    const ownerOfToken0 = await ERC721.ownerOf(0);
    const ownerOfToken5 = await ERC721.ownerOf(4);
    const ownerOfToken9 = await ERC721.ownerOf(qty - 1);

    expect(aliceBalanceBeforeMint.toString()).to.be.equal("0");
    expect(aliceBalanceAfterMint.toString()).to.be.equal(qty + "");
    expect(ownerOfToken0).to.be.equal(await alice.getAddress());
    expect(ownerOfToken5).to.be.equal(await alice.getAddress());
    expect(ownerOfToken9).to.be.equal(await alice.getAddress());
  });

  it("should transfer to a wallet and show correct balance + ownerOf", async () => {
    const tokenId = 4;
    const qty = 9;
    const proofForOwner = tree.getHexProof(keccak256(await owner.getAddress()));

    await ERC721.connect(owner).mint(
      await owner.getAddress(),
      qty,
      proofForOwner
    );

    const balanceOfOwnerBeforeTransfer = await ERC721.balanceOf(
      await owner.getAddress()
    );

    const balanceOfAliceBeforeTransfer = await ERC721.balanceOf(
      await alice.getAddress()
    );

    const ownerOfToken4BeforeTransfer = await ERC721.ownerOf(tokenId);

    const total = await ERC721.total();

    await ERC721["safeTransferFrom(address,address,uint256)"](
      await owner.getAddress(),
      await alice.getAddress(),
      tokenId
    );

    const balanceOfOwnerAfterTransfer = await ERC721.balanceOf(
      await owner.getAddress()
    );

    const balanceOfAliceAfterTransfer = await ERC721.balanceOf(
      await alice.getAddress()
    );

    const ownerOfToken4AfterTransfer = await ERC721.ownerOf(tokenId);

    const ownerOfToken5 = await ERC721.ownerOf(tokenId + 1);
    const ownerOfToken3 = await ERC721.ownerOf(tokenId - 1);

    expect(total).to.be.equal(qty);
    expect(balanceOfOwnerBeforeTransfer).to.be.equal(qty);
    expect(balanceOfAliceBeforeTransfer).to.be.equal(0);
    expect(ownerOfToken4BeforeTransfer).to.be.equal(await owner.getAddress());
    expect(balanceOfOwnerAfterTransfer).to.be.equal(qty - 1);
    expect(balanceOfAliceAfterTransfer).to.be.equal(1);
    expect(ownerOfToken4AfterTransfer).to.be.equal(await alice.getAddress());
    expect(ownerOfToken5).to.be.equal(await owner.getAddress());
    expect(ownerOfToken3).to.be.equal(await owner.getAddress());
  });

  it("should approve another address and then transfer", async () => {
    const tokenId = 4;
    const qty = 9;
    const proofForOwner = tree.getHexProof(keccak256(await owner.getAddress()));

    await ERC721.connect(owner).mint(
      await owner.getAddress(),
      qty,
      proofForOwner
    );

    const approvalOfToken4BeforeApproval = await ERC721.getApproved(tokenId);

    await ERC721.connect(owner).approve(await alice.getAddress(), tokenId);

    const approvalOfToken4AfterApproval = await ERC721.getApproved(tokenId);

    const ownerOfToken4BeforeTransfer = await ERC721.ownerOf(tokenId);

    await ERC721.connect(alice).transferFrom(
      await owner.getAddress(),
      await bob.getAddress(),
      tokenId
    );

    const ownerOfToken4AfterTransfer = await ERC721.ownerOf(tokenId);

    const approvalOfToken4AfterTransfer = await ERC721.getApproved(tokenId);

    expect(approvalOfToken4BeforeApproval).to.be.equal(
      ethers.constants.AddressZero
    );
    expect(approvalOfToken4AfterApproval).to.be.equal(await alice.getAddress());
    expect(ownerOfToken4BeforeTransfer).to.be.equal(await owner.getAddress());
    expect(ownerOfToken4AfterTransfer).to.be.equal(await bob.getAddress());
    expect(approvalOfToken4AfterTransfer).to.be.equal(
      ethers.constants.AddressZero
    );
  });

  it("should approve another address and then transfer", async () => {
    const tokenId = 4;
    const qty = 9;
    const proofForOwner = tree.getHexProof(keccak256(await owner.getAddress()));

    await ERC721.connect(owner).mint(
      await owner.getAddress(),
      qty,
      proofForOwner
    );

    const approvalOfToken4BeforeApproval = await ERC721.getApproved(tokenId);

    await ERC721.connect(owner).approve(await alice.getAddress(), tokenId);

    const approvalOfToken4AfterApproval = await ERC721.getApproved(tokenId);

    const ownerOfToken4BeforeTransfer = await ERC721.ownerOf(tokenId);

    await ERC721.connect(alice).transferFrom(
      await owner.getAddress(),
      await bob.getAddress(),
      tokenId
    );

    const ownerOfToken4AfterTransfer = await ERC721.ownerOf(tokenId);

    const approvalOfToken4AfterTransfer = await ERC721.getApproved(tokenId);

    expect(approvalOfToken4BeforeApproval).to.be.equal(
      ethers.constants.AddressZero
    );
    expect(approvalOfToken4AfterApproval).to.be.equal(await alice.getAddress());
    expect(ownerOfToken4BeforeTransfer).to.be.equal(await owner.getAddress());
    expect(ownerOfToken4AfterTransfer).to.be.equal(await bob.getAddress());
    expect(approvalOfToken4AfterTransfer).to.be.equal(
      ethers.constants.AddressZero
    );
  });

  it("should approve for all and then transfer", async () => {
    const tokenId = 4;
    const qty = 9;
    const proofForOwner = tree.getHexProof(keccak256(await owner.getAddress()));

    await ERC721.connect(owner).mint(
      await owner.getAddress(),
      qty,
      proofForOwner
    );

    const approvalForAllBefore = await ERC721.isApprovedForAll(
      await owner.getAddress(),
      await alice.getAddress()
    );

    await ERC721.connect(owner).setApprovalForAll(
      await alice.getAddress(),
      true
    );

    const approvalForAllAfter = await ERC721.isApprovedForAll(
      await owner.getAddress(),
      await alice.getAddress()
    );

    await ERC721.connect(alice).transferFrom(
      await owner.getAddress(),
      await bob.getAddress(),
      tokenId
    );

    await ERC721.connect(alice).transferFrom(
      await owner.getAddress(),
      await bob.getAddress(),
      tokenId + 1
    );

    await ERC721.connect(alice).transferFrom(
      await owner.getAddress(),
      await bob.getAddress(),
      tokenId + 2
    );

    const ownerOfToken4AfterTransfer = await ERC721.ownerOf(tokenId);
    const ownerOfToken5AfterTransfer = await ERC721.ownerOf(tokenId + 1);
    const ownerOfToken6AfterTransfer = await ERC721.ownerOf(tokenId + 2);

    expect(approvalForAllBefore).to.be.equal(false);
    expect(approvalForAllAfter).to.be.equal(true);
    expect(ownerOfToken4AfterTransfer).to.be.equal(await bob.getAddress());
    expect(ownerOfToken5AfterTransfer).to.be.equal(await bob.getAddress());
    expect(ownerOfToken6AfterTransfer).to.be.equal(await bob.getAddress());
  });

  it("should pause-unpause minting", async () => {
    const tokenId = 4;
    const qty = 9;
    const proofForOwner = tree.getHexProof(keccak256(await owner.getAddress()));

    await ERC721.connect(owner).pauseMinting();

    const minting = ERC721.connect(owner).mint(
      await owner.getAddress(),
      qty,
      proofForOwner
    );

    await expect(minting).to.be.revertedWith("paused");

    await ERC721.connect(owner).unpauseMinting();

    await ERC721.connect(owner)
      .connect(owner)
      .mint(await owner.getAddress(), qty, proofForOwner);

    const ownerOf4 = await ERC721.ownerOf(tokenId);

    expect(ownerOf4).to.be.equal(await owner.getAddress());
  });

  it("should allow burning token", async () => {
    const tokenId = 4;
    const qty = 9;
    const proofForOwner = tree.getHexProof(keccak256(await owner.getAddress()));

    await ERC721.connect(owner)
      .connect(owner)
      .mint(await owner.getAddress(), qty, proofForOwner);

    await ERC721.connect(owner).burn(tokenId);

    const burned = ERC721.ownerOf(tokenId);

    const ownerOf3 = await ERC721.ownerOf(tokenId - 1);
    const ownerOf5 = await ERC721.ownerOf(tokenId + 1);

    await expect(burned).to.be.revertedWith("token burned");

    expect(ownerOf3).to.be.equal(await owner.getAddress());
    expect(ownerOf5).to.be.equal(await owner.getAddress());
    expect(await ERC721.totalBurned()).to.be.equal(1);
    expect(await ERC721.total()).to.be.equal(qty - 1);
  });
});
