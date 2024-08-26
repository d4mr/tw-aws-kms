import { KmsSigner, Signature } from "aws-kms-signer";
import { type KMSClientConfig } from "@aws-sdk/client-kms";
import { type Account } from "thirdweb/wallets";

import {
  type PreparedTransaction,
  serializeTransaction,
} from "thirdweb/transaction";

import { toBytes } from "thirdweb/utils";

import type {
  TypedData,
  TypedDataDefinition,
  SignableMessage,
  TransactionSerializable,
} from "viem";

import { keccak256, type Address as TwAddress } from "thirdweb";

import { hashTypedData, recoverMessageAddress } from "viem";
import type { Hex } from "thirdweb";

type SendTransactionResult = {
  transactionHash: Hex;
};

type SendTransactionOption = TransactionSerializable & {
  chainId: number;
};

export class AwsKmsAccount implements Account {
  private readonly signer: KmsSigner;
  public address: TwAddress = "0x" as unknown as TwAddress;

  constructor(keyId: string, config?: KMSClientConfig) {
    this.signer = new KmsSigner(keyId, config);
  }

  public async getAddress(): Promise<TwAddress> {
    if (!this.address || this.address === "0x") {
      const addressUnprefixed = (
        await this.signer.getAddress()
      ).toString() as TwAddress;
      this.address = `0x${addressUnprefixed}` as TwAddress;
    }
    return this.address;
  }

  public async signMessage({
    message,
  }: {
    message: SignableMessage;
  }): Promise<Hex> {
    let messageHash: Hex;
    if (typeof message === "string") {
      // For string messages, prefix with "\x19Ethereum Signed Message:\n" + message.length
      const prefixedMessage = `\x19Ethereum Signed Message:\n${message.length}${message}`;
      messageHash = keccak256(toBytes(prefixedMessage));
    } else if ("raw" in message) {
      // For raw messages, hash directly without prefixing
      messageHash = keccak256(message.raw);
    } else {
      throw new Error("Invalid message format");
    }

    const signature = await this.signer.sign(
      Buffer.from(messageHash.slice(2), "hex")
    );

    return this.signatureToHex(signature);
  }

  public async signTransaction(tx: TransactionSerializable): Promise<Hex> {
    const serializedTx = serializeTransaction({ transaction: tx });
    const txHash = keccak256(serializedTx);
    const signature = await this.signer.sign(
      Buffer.from(txHash.slice(2), "hex")
    );

    return signature.toString() as Hex;
  }

  public async signTypedData<
    const typedData extends TypedData | Record<string, unknown>,
    primaryType extends keyof typedData | "EIP712Domain" = keyof typedData
  >(_typedData: TypedDataDefinition<typedData, primaryType>): Promise<Hex> {
    const typedDataHash = hashTypedData(_typedData);
    const signature = await this.signer.sign(
      Buffer.from(typedDataHash.slice(2), "hex")
    );
    return this.signatureToHex(signature);
  }

  // Stub methods that require RPC interaction
  public async sendTransaction(
    _transaction: SendTransactionOption
  ): Promise<SendTransactionResult> {
    throw new Error("sendTransaction not implemented");
  }

  // Optional methods
  public async estimateGas(_transaction: PreparedTransaction): Promise<bigint> {
    throw new Error("estimateGas not implemented");
  }

  private signatureToHex(signature: Signature): Hex {
    const r = signature.r.toString("hex").padStart(64, "0");
    const s = signature.s.toString("hex").padStart(64, "0");
    const v = signature.v.toString(16).padStart(2, "0");
    return `0x${r}${s}${v}` as Hex;
  }
}
