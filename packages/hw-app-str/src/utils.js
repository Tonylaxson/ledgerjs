/********************************************************************************
 *   Ledger Node JS API
 *   (c) 2017-2018 Ledger
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 ********************************************************************************/
//@flow

import crc16xmodem from "crc/lib/crc16_xmodem";
import base32 from "base32.js";
import nacl from "tweetnacl";

// TODO use bip32-path library
export function splitPath(path: string): number[] {
  let result = [];
  let components = path.split("/");
  components.forEach(element => {
    let number = parseInt(element, 10);
    if (isNaN(number)) {
      return; // FIXME shouldn't it throws instead?
    }
    if (element.length > 1 && element[element.length - 1] === "'") {
      number += 0x80000000;
    }
    result.push(number);
  });
  return result;
}

export function foreach<T, A>(
  arr: T[],
  callback: (T, number) => Promise<A>
): Promise<A[]> {
  function iterate(index, array, result) {
    if (index >= array.length) {
      return result;
    } else {
      return callback(array[index], index).then(function(res) {
        result.push(res);
        return iterate(index + 1, array, result);
      });
    }
  }
  return Promise.resolve().then(() => iterate(0, arr, []));
}

export function encodeEd25519PublicKey (
  rawPublicKey: Buffer
): string {
  let versionByte = 6 << 3; // 'G'
  let data          = Buffer.from(rawPublicKey);
  let versionBuffer = Buffer.from([versionByte]);
  let payload       = Buffer.concat([versionBuffer, data]);
  let checksum      = Buffer.alloc(2);
  checksum.writeUInt16LE(crc16xmodem(payload), 0);
  let unencoded     = Buffer.concat([payload, checksum]);
  return base32.encode(unencoded);
}

export function verifyEd25519Signature (
  data: Buffer,
  signature: Buffer,
  publicKey: Buffer
): boolean {
  data      = new Uint8Array(data.toJSON().data);
  signature = new Uint8Array(signature.toJSON().data);
  publicKey = new Uint8Array(publicKey.toJSON().data);
  return nacl.sign.detached.verify(data, signature, publicKey);
}

export function checkStellarBip32Path(
  path: string): void {
  if (!path.startsWith("44'/148'")) {
    throw new Error("Not a Stellar BIP32 path. Path: " + path + "."
      + " The Stellar app is authorized only for paths starting with 44'/148'."
      + " Example: 44'/148'/0'");
  }
  path.split('/').forEach(function (element) {
    if (!element.toString().endsWith('\'')) {
      throw new Error("Detected a non-hardened path element in requested BIP32 path." +
        " Non-hardended paths are not supported at this time. Please use an all-hardened path." +
        " Example: 44'/148'/0'");
    }
  });
}
