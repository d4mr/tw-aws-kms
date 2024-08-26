import { describe, beforeAll, test, expect } from "bun:test";

import { AwsKmsAccount } from "./index";
import {
  recoverMessageAddress,
  recoverTypedDataAddress,
  recoverPublicKey,
  type SignableMessage,
  hashTypedData,
  keccak256,
  type TransactionSerializable,
} from "viem";
import { parseTransaction } from "viem";
import { env } from "./env";
import { publicKeyToAddress } from "viem/accounts";
import { recover } from "thirdweb/extensions/farcaster/idRegistry";
import { serializeTransaction } from "thirdweb";

describe("AwsKmsAccount", () => {
  let awsKmsAccount: AwsKmsAccount;

  beforeAll(() => {
    // Initialize your AWS KMS Account with appropriate credentials

    awsKmsAccount = new AwsKmsAccount(env.AWS_KMS_KEY_ID, {
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
      region: env.AWS_REGION,
    });
  });

  test("getAddress returns a valid address", async () => {
    const address = await awsKmsAccount.getAddress();
    expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  test("signMessage and recover address", async () => {
    const message: SignableMessage = "hello";
    const signature = await awsKmsAccount.signMessage({ message });
    const recoveredAddress = await recoverMessageAddress({
      message,
      signature,
    });
    const actualAddress = await awsKmsAccount.getAddress();
    expect(recoveredAddress).toBe(actualAddress);
  });

  test("signTypedData and recover address", async () => {
    const domain = {
      name: "Example",
      version: "1",
      chainId: 1,
      verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC" as const,
    };

    const types = {
      Person: [
        { name: "name", type: "string" },
        { name: "wallet", type: "address" },
      ],
    } as const;

    const value = {
      name: "Bob",
      wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB" as const,
    };

    const typedData = {
      domain,
      types,
      primaryType: "Person",
      message: value,
    } as const;

    const signature = await awsKmsAccount.signTypedData(typedData);

    const recoveredAddress = await recoverTypedDataAddress({
      ...typedData,
      signature,
    });

    const actualAddress = await awsKmsAccount.getAddress();
    expect(recoveredAddress).toBe(actualAddress);
  });

  test("signTransaction and recover public key", async () => {
    const transaction: TransactionSerializable = {
      to: "0x0000000000000000000000000000000000000000",
      value: 1000000000000000000n,
      maxFeePerGas: 20000000000n,
      maxPriorityFeePerGas: 1000000000n,
      nonce: 0,
      type: "eip1559",
      chainId: 1,
      authorizationList: undefined,
    };

    const signature = await awsKmsAccount.signTransaction(transaction);
    const serializedTx = serializeTransaction({ transaction });
    const txHash = keccak256(serializedTx);

    const recoveredPublicKey = await recoverPublicKey({
      hash: txHash,
      signature: `0x${signature}`,
    });

    const recoveredAddress = publicKeyToAddress(recoveredPublicKey);
    const actualAddress = await awsKmsAccount.getAddress();

    expect(recoveredAddress).toBe(actualAddress);
  });
});
