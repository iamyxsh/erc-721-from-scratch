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

/*
  In this block I will try to replicate real worl transactions and see how my contract
  stands against it. Following are some txs that will happen and tests accordingly :-

    1. Owner mints 10 tokens (1-10)
    2. Alice mints 5 tokens (11-15)
    3. Bob mints 3 tokens (16-18)
    4. To mints 1 token (19)

    5. Owner transfers Token 4 to Alice 
    6. Bob transfers Token 16 to To 
    7. Alice Burns Token 12 
    8. Alice approves To for Token 11 
    9. To transfers the Token 11 to Bob 
    10. Owner approves all Bob 
    11. Bob transfers Token 1 and Token 7 to Bob 

    At the end of the all the txs, we should have following state:-

    1. Total -> 19-1 = 18 (1 burned)
    2. Total Burned = 1
    3. Owner tokens -> 0, 2, 3, 5, 6, 8, 9 
    4. Alice tokens -> 4, 10, 13, 14
    5. Bob tokens -> 1, 7, 11, 15, 17
    6. To tokens -> 16, 18
*/

describe("Real world scenarios 🌎", async () => {
  let ERC: ERC721__factory;
  let ERC721: ERC721;

  let owner: Signer, to: Signer, alice: Signer, bob: Signer;

  let tree: any;
  let proofForOwner, proofForAlice, proofForTo, proofForBob;

  beforeEach(async () => {
    [owner, to, alice, bob] = await ethers.getSigners();

    tree = generateMerkelTree([
      await owner.getAddress(),
      await to.getAddress(),
      await alice.getAddress(),
      await bob.getAddress(),
    ]);

    proofForOwner = tree.getHexProof(keccak256(await owner.getAddress()));
    proofForAlice = tree.getHexProof(keccak256(await alice.getAddress()));
    proofForBob = tree.getHexProof(keccak256(await bob.getAddress()));
    proofForTo = tree.getHexProof(keccak256(await to.getAddress()));

    ERC = await ethers.getContractFactory("ERC721");
    ERC721 = await ERC.deploy(NAME, SYMBOL, tree.getRoot(), 20);
    await ERC721.deployed();

    /* Step 1 */
    await ERC721.connect(owner).mint(
      await owner.getAddress(),
      10,
      proofForOwner
    );

    /* Step 2 */
    await ERC721.connect(alice).mint(
      await alice.getAddress(),
      5,
      proofForAlice
    );

    /* Step 3 */
    await ERC721.connect(bob).mint(await bob.getAddress(), 3, proofForBob);

    /* Step 4 */
    await ERC721.connect(to).mint(await to.getAddress(), 1, proofForTo);

    /* Step 5 */
    await ERC721.connect(owner).transferFrom(
      await owner.getAddress(),
      await alice.getAddress(),
      4
    );

    /* Step 6 */
    await ERC721.connect(bob).transferFrom(
      await bob.getAddress(),
      await to.getAddress(),
      16
    );

    /* Step 7 */
    await ERC721.connect(alice).burn(12);

    /* Step 8 */
    await ERC721.connect(alice).approve(await to.getAddress(), 11);

    /* Step 9 */
    await ERC721.connect(to).transferFrom(
      await alice.getAddress(),
      await bob.getAddress(),
      11
    );

    /* Step 10 */
    await ERC721.connect(owner).setApprovalForAll(await bob.getAddress(), true);

    /* Step 11 */
    await ERC721.connect(bob).transferFrom(
      await owner.getAddress(),
      await bob.getAddress(),
      1
    );
    await ERC721.connect(bob).transferFrom(
      await owner.getAddress(),
      await bob.getAddress(),
      7
    );
  });

  it("should show total = 18", async () => {
    const total = await ERC721.total();
    console.log(total);
    expect(total).to.be.equal(18);
  });

  it("should show totalBurned = 1", async () => {
    const totalBurned = await ERC721.totalBurned();
    expect(totalBurned).to.be.equal(1);
  });

  it("should show balanceOf owner = 7 and correct tokens", async () => {
    const balanceOf = await ERC721.balanceOf(await owner.getAddress());

    const ownerOf0 = await ERC721.ownerOf(0);
    const ownerOf2 = await ERC721.ownerOf(2);
    const ownerOf3 = await ERC721.ownerOf(3);
    const ownerOf5 = await ERC721.ownerOf(5);
    const ownerOf6 = await ERC721.ownerOf(6);
    const ownerOf8 = await ERC721.ownerOf(8);
    const ownerOf9 = await ERC721.ownerOf(9);

    expect(balanceOf).to.be.equal(7);

    expect(ownerOf0).to.be.equal(await owner.getAddress());
    expect(ownerOf2).to.be.equal(await owner.getAddress());
    expect(ownerOf3).to.be.equal(await owner.getAddress());
    expect(ownerOf5).to.be.equal(await owner.getAddress());
    expect(ownerOf6).to.be.equal(await owner.getAddress());
    expect(ownerOf8).to.be.equal(await owner.getAddress());
    expect(ownerOf9).to.be.equal(await owner.getAddress());
  });

  it("should show balanceOf alice = 4 and correct tokens", async () => {
    const balanceOf = await ERC721.balanceOf(await alice.getAddress());

    const ownerOf4 = await ERC721.ownerOf(4);
    const ownerOf10 = await ERC721.ownerOf(10);
    const ownerOf13 = await ERC721.ownerOf(13);
    const ownerOf14 = await ERC721.ownerOf(14);

    expect(balanceOf).to.be.equal(4);

    expect(ownerOf4).to.be.equal(await alice.getAddress());
    expect(ownerOf10).to.be.equal(await alice.getAddress());
    expect(ownerOf13).to.be.equal(await alice.getAddress());
    expect(ownerOf14).to.be.equal(await alice.getAddress());
  });

  it("should show balanceOf bob = 5 and correct tokens", async () => {
    const balanceOf = await ERC721.balanceOf(await bob.getAddress());

    const ownerOf1 = await ERC721.ownerOf(1);
    const ownerOf7 = await ERC721.ownerOf(7);
    const ownerOf11 = await ERC721.ownerOf(11);
    const ownerOf15 = await ERC721.ownerOf(15);
    const ownerOf17 = await ERC721.ownerOf(17);

    expect(balanceOf).to.be.equal(5);

    expect(ownerOf1).to.be.equal(await bob.getAddress());
    expect(ownerOf7).to.be.equal(await bob.getAddress());
    expect(ownerOf11).to.be.equal(await bob.getAddress());
    expect(ownerOf15).to.be.equal(await bob.getAddress());
    expect(ownerOf17).to.be.equal(await bob.getAddress());
  });

  it("should show balanceOf to = 2 and correct tokens", async () => {
    const balanceOf = await ERC721.balanceOf(await to.getAddress());

    const ownerOf16 = await ERC721.ownerOf(16);
    const ownerOf18 = await ERC721.ownerOf(18);

    expect(balanceOf).to.be.equal(2);

    expect(ownerOf16).to.be.equal(await to.getAddress());
    expect(ownerOf18).to.be.equal(await to.getAddress());
  });
});
