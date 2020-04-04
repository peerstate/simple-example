import { Operation, compare } from "fast-json-patch";
import React, { useEffect } from "react";
import Gun from "gun/gun";

import Messenger from "../Messenger";
import {
  createAuthFilter,
  createEncryptionFilter,
  usePeerState,
  createKeychain,
  Action
} from "../../peerstate";
import { MatchResult } from "path-to-regexp";

type StateTreeType = any;

const myAuthFilter = createAuthFilter<StateTreeType>({
  "/lastName": () => true,
  "/users/:userId": (
    senderId: string,
    state: StateTreeType,
    action: Operation,
    params: MatchResult
  ) => true,
  "/counter": () => true
});

const myEncryptionFilter = createEncryptionFilter<StateTreeType>({
  "/lastName": () => ["2"],
  "/counter": () => ["2"]
});

// TODO: put this URL in the right place
const SERVER_URL = "https://100.115.92.201:4000";
const keychain = createKeychain(SERVER_URL);

let userId: string = keychain.getUserInfo().id;

// TODO: put this URL in the right place
const gun = Gun(["https://gunjs.herokuapp.com/gun"]);

export default function App() {
  const { state, dispatch, sign } = usePeerState<StateTreeType>(
    {},
    myAuthFilter,
    myEncryptionFilter,
    keychain
  );

  useEffect(() => {
    return gun
      .get("peerstate-example")
      .get(userId)
      .map()
      .on((action: any) => dispatch(action as Action)).off;
  }, [gun, dispatch, keychain]);

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
              value: (state.counter || 0) + 1
            });
            // @ts-ignore
            const newOpRef = gun
              .get("peerstate-example")
              .get("actions")
              .get(action.operationToken)
              .put(action as never);
            gun.get(userId).set(newOpRef as never);
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
      {/* <Messenger /> */}
    </div>
  );
}
