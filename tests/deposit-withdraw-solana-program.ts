import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DepositWithdrawSolanaProgram } from "../target/types/deposit_withdraw_solana_program";
import { assert } from "chai";

describe("deposit-withdraw-solana-program", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .DepositWithdrawSolanaProgram as Program<DepositWithdrawSolanaProgram>;

  // Generate a keypair for the payer (this should ideally be your wallet keypair)
  const payer = anchor.web3.Keypair.generate();
  const user1 = anchor.web3.Keypair.generate();
  const user2 = anchor.web3.Keypair.generate();

  // Generate keypair for the bank account
  const bank = anchor.web3.Keypair.generate();

  it("Is initialized!", async () => {
    // Generate keypair for the bank account
    const [bank, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("bankaccount"), payer.publicKey.toBuffer()],
      program.programId
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        payer.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      ),
      "confirmed"
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        user1.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      ),
      "confirmed"
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        user2.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      ),
      "confirmed"
    );

    const name = "Test Bank";
    // Call the initialize instruction
    await program.methods
      .initialize(name)
      .accounts({
        bank: bank,
        user: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([payer])
      .rpc();

    // Fetch the bank account
    const bankAccount = await program.account.bank.fetch(bank);
    console.log(bankAccount.name, name);
    console.log(bankAccount.balance.toNumber(), 0);
    console.log(bankAccount.owner.toBase58(), payer.publicKey.toBase58());

    console.log("Bank Balance",(await provider.connection.getAccountInfo(bank)).lamports);
    console.log("Payer Balance",(await provider.connection.getAccountInfo(payer.publicKey)).lamports);

    const depositAmount = new anchor.BN(8000000000);

    const tx = await program.methods
      .deposit(depositAmount)
      .accounts({
        bank: bank,
        user: user1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

      console.log("Bank Balance",(await provider.connection.getAccountInfo(bank)).lamports);
      console.log("Payer Balance",(await provider.connection.getAccountInfo(payer.publicKey)).lamports);
    console.log(
      (await provider.connection.getAccountInfo(user1.publicKey)).lamports
    );

    const deposit2 = new anchor.BN(8000000000);

    await program.methods
      .deposit(deposit2)
      .accounts({
        bank: bank,
        user: user2.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

      console.log("Bank Balance",(await provider.connection.getAccountInfo(bank)).lamports);
      console.log("Payer Balance",(await provider.connection.getAccountInfo(payer.publicKey)).lamports);
    console.log(
      (await provider.connection.getAccountInfo(user2.publicKey)).lamports
    );

    try {
      // Try to withdraw from the bank account with a different user
      await program.methods
        .withdraw(deposit2)
        .accounts({
          bank: bank,
          user: user2.publicKey,
        })
        .signers([user2])
        .rpc();

      assert.fail("Non-owner was able to withdraw funds");
    } catch (err) {
      // console.log(err.message);
      assert.include(
        err.message,
        "Transaction simulation failed: Error processing Instruction 0: incorrect program id for instruction."
      ); // Adjust the error message as per your program's implementation
    }

    await program.methods
      .withdraw(deposit2)
      .accounts({
        bank: bank,
        user: payer.publicKey,
      })
      .signers([payer])
      .rpc();

    console.log("Bank Balance",(await provider.connection.getAccountInfo(bank)).lamports);
    console.log("Payer Balance",(await provider.connection.getAccountInfo(payer.publicKey)).lamports);
  });
});
