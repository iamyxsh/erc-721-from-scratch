/* eslint-disable node/no-missing-import */
/* eslint-disable camelcase */
import { expect } from "chai";
import { Signer } from "ethers";
import { ethers } from "hardhat";
import { ERC721, ERC721__factory } from "../../typechain";

const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const NAME = "Awesome";
const SYMBOL = "AWS";

const generateMerkelTree = (addresses: string[]) => {
  const leaves = addresses.map((x) => keccak256(x));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  return tree;
};

describe("Wrong path ❌", () => {
  let ERC: ERC721__factory;
  let ERC721: ERC721;

  let owner: Signer,
    to: Signer,
    alice: Signer,
    bob: Signer,
    notWhitelisted: Signer;
  let tree: any;

  beforeEach(async () => {
    [owner, to, alice, bob, notWhitelisted] = await ethers.getSigners();

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

  it("should not allow non-whitelisted minter", async () => {
    const qty = 9;
    const proofForNonWhitelisted = tree.getHexProof(
      keccak256(await notWhitelisted.getAddress())
    );

    const minting = ERC721.connect(notWhitelisted).mint(
      await notWhitelisted.getAddress(),
      qty,
      proofForNonWhitelisted
    );

    await expect(minting).to.be.revertedWith("not a whitelisted minter");

    expect(await ERC721.total()).to.be.equal(0);
  });

  it("should not allow minting when paused", async () => {
    const qty = 9;
    const proofForAlice = tree.getHexProof(keccak256(await alice.getAddress()));

    await ERC721.pauseMinting();

    const minting = ERC721.connect(alice).mint(
      await alice.getAddress(),
      qty,
      proofForAlice
    );

    await expect(minting).to.be.revertedWith("paused");

    expect(await ERC721.total()).to.be.equal(0);
  });

  it("should not allow minting to zero address", async () => {
    const qty = 9;
    const proofForAlice = tree.getHexProof(keccak256(await alice.getAddress()));

    const minting = ERC721.connect(alice).mint(
      ethers.constants.AddressZero,
      qty,
      proofForAlice
    );

    await expect(minting).to.be.revertedWith("address cannot be zero");

    expect(await ERC721.total()).to.be.equal(0);
  });

  it("should not allow minting more than MAX_SUPPLY", async () => {
    const qty = 11;
    const proofForAlice = tree.getHexProof(keccak256(await alice.getAddress()));

    const minting = ERC721.connect(alice).mint(
      await alice.getAddress(),
      qty,
      proofForAlice
    );

    await expect(minting).to.be.revertedWith("more than max supply");

    expect(await ERC721.total()).to.be.equal(0);
  });

  it("should not allow mint quantity to be zero", async () => {
    const qty = 0;
    const proofForAlice = tree.getHexProof(keccak256(await alice.getAddress()));

    const minting = ERC721.connect(alice).mint(
      await alice.getAddress(),
      qty,
      proofForAlice
    );

    await expect(minting).to.be.revertedWith("quantity cannot be zero");

    expect(await ERC721.total()).to.be.equal(0);
  });

  it("should not allow transfer to zero address", async () => {
    const qty = 9;
    const proofForAlice = tree.getHexProof(keccak256(await alice.getAddress()));

    await ERC721.connect(alice).mint(
      await alice.getAddress(),
      qty,
      proofForAlice
    );

    const transfer = ERC721.connect(alice).transferFrom(
      await alice.getAddress(),
      ethers.constants.AddressZero,
      4
    );

    await expect(transfer).to.be.revertedWith("address cannot be zero");

    expect(await ERC721.total()).to.be.equal(qty);
  });

  it("should not allow a non-owner address to transfer", async () => {
    const qty = 9;
    const proofForAlice = tree.getHexProof(keccak256(await alice.getAddress()));

    await ERC721.connect(alice).mint(
      await alice.getAddress(),
      qty,
      proofForAlice
    );

    const transfer = ERC721.connect(bob).transferFrom(
      await alice.getAddress(),
      await bob.getAddress(),
      4
    );

    await expect(transfer).to.be.revertedWith("not allowed");

    expect(await ERC721.total()).to.be.equal(qty);
  });

  it("should not allow a non-approved address to transfer", async () => {
    const qty = 9;
    const proofForAlice = tree.getHexProof(keccak256(await alice.getAddress()));

    await ERC721.connect(alice).mint(
      await alice.getAddress(),
      qty,
      proofForAlice
    );

    const transfer = ERC721.connect(bob).transferFrom(
      await alice.getAddress(),
      await bob.getAddress(),
      4
    );

    await expect(transfer).to.be.revertedWith("not allowed");

    await ERC721.connect(alice).approve(await bob.getAddress(), 4);

    await ERC721.connect(bob).transferFrom(
      await alice.getAddress(),
      await bob.getAddress(),
      4
    );

    expect(await ERC721.total()).to.be.equal(qty);
    expect(await ERC721.ownerOf(4)).to.be.equal(await bob.getAddress());
  });

  it("should allow only owner to pause/unpause", async () => {
    const pausing = ERC721.connect(alice).pauseMinting();

    await expect(pausing).to.be.revertedWith("only owner");

    const unpausing = ERC721.connect(alice).unpauseMinting();

    await expect(unpausing).to.be.revertedWith("only owner");
  });

  it("should not allow transfer of non minted token", async () => {
    const qty = 9;
    const proofForAlice = tree.getHexProof(keccak256(await alice.getAddress()));

    await ERC721.connect(alice).mint(
      await alice.getAddress(),
      qty,
      proofForAlice
    );

    const transfer = ERC721.connect(alice).transferFrom(
      await alice.getAddress(),
      await bob.getAddress(),
      qty + 1
    );

    await expect(transfer).to.be.revertedWith("invalid _id");
  });

  it("should not allow transfer of burned token", async () => {
    const qty = 9;
    const proofForAlice = tree.getHexProof(keccak256(await alice.getAddress()));

    await ERC721.connect(alice).mint(
      await alice.getAddress(),
      qty,
      proofForAlice
    );

    await ERC721.connect(alice).burn(4);

    const transfer = ERC721.connect(alice).transferFrom(
      await alice.getAddress(),
      await bob.getAddress(),
      4
    );

    await expect(transfer).to.be.revertedWith("token burned");
  });

  it("should not allow transfer of burned token", async () => {
    const qty = 9;
    const proofForAlice = tree.getHexProof(keccak256(await alice.getAddress()));

    await ERC721.connect(alice).mint(
      await alice.getAddress(),
      qty,
      proofForAlice
    );

    await ERC721.connect(alice).burn(4);

    const transfer = ERC721.connect(alice).transferFrom(
      await alice.getAddress(),
      await bob.getAddress(),
      4
    );

    await expect(transfer).to.be.revertedWith("token burned");
  });
});
