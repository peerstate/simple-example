import React, { useEffect } from "react";
import Gun from "gun/gun";

import {
  createAuthFilter,
  createEncryptionFilter,
  createKeychain,
  Action,
} from "@peerstate/core";

import { usePeerState } from "@peerstate/react";

type StateTreeType = any;

/**
 * Authorization Filters
 *
 * 1. match a part of the state tree
 * 2. check who is trying to access
 * 3. return true if they are allowed
 */
const myAuthFilter = createAuthFilter<StateTreeType>({
  "/lastName": () => true,
  "/users/:userId": () => true,
  "/counter": () => true,
});

/**
 * Encryption Filters
 *
 * 1. match a part of the state tree
 * 2. return false if there is no need to encrypt
 * 3. to encrypt return a list of user ID's that can see the information
 */
const myEncryptionFilter = createEncryptionFilter<StateTreeType>({
  "/lastName": () => ["2"],
  "/counter": () => ["2"],
});

const SERVER_URL = process.env.REACT_APP_SERVER_URL || "https://localhost:4000";
const keychain = createKeychain(SERVER_URL);

let userId: string = keychain.getUserInfo().id;

// you will probably want to use your own p2p relay
const gun = Gun(["https://gun-matrix.herokuapp.com/gun"]);

export default function App() {
  const { state, dispatch, sign } = usePeerState<StateTreeType>(
    {},
    myAuthFilter,
    myEncryptionFilter,
    keychain
  );

  // connect peerstate to a distributed p2p database
  useEffect(() => {
    return gun
      .get("peerstate-example")
      .get(userId)
      .map()
      .on((action: any) => dispatch(action as Action)).off;
  }, [dispatch]);

  return (
    <div className="App">
      {JSON.stringify(state)}
      <button
        onClick={async () => {
          if (!userId) throw new Error("no auth token present");
          try {
            const action = await sign({
              op: "add",
              path: "/counter",
              value: (state.counter || 0) + 1,
            });
            // @ts-ignore
            const newOpRef = gun
              .get("peerstate-example")
              .get("actions")
              .get(action.operationToken)
              .put(action as never);
            gun
              .get("peerstate-example")
              .get(userId)
              .set(newOpRef as never);
          } catch (e) {
            console.error(e);
          }
        }}
      >
        dispatch
      </button>
      <button
        onClick={async () => {
          await keychain.login("user1@example.com", "password1");
          userId = keychain.getUserInfo().id;
        }}
      >
        login
      </button>
      <button
        onClick={() => {
          keychain.newKeypair();
        }}
      >
        generate key
      </button>
      <button
        onClick={() => {
          keychain.fetchOrCreateSecret("2");
        }}
      >
        shared secret
      </button>
      <button
        onClick={async () => {
          keychain.rotateKeys();
        }}
      >
        rotate keys
      </button>
    </div>
  );
}
