import React, { useEffect, useReducer, Reducer } from "react";
import Gun from "gun/gun";

import {
  createAuthFilter,
  createEncryptionFilter,
  createKeychain,
  createPeerState,
  Action,
  Keychain,
} from "@peerstate/core";

// TODO: use @peerstate/react instead of DIY
// import { usePeerState } from "@peerstate/react";

type InternalState<T> = {
  peerState: T;
  keys: Keychain;
};
type StateTreeType = any;

const myAuthFilter = createAuthFilter<StateTreeType>({
  "/lastName": () => true,
  "/users/:userId": () => true,
  "/counter": () => true,
});

const myEncryptionFilter = createEncryptionFilter<StateTreeType>({
  "/lastName": () => ["2"],
  "/counter": () => ["2"],
});

// TODO: put this URL in the right place
const SERVER_URL = "https://100.115.92.201:4000";
const keychain = createKeychain(SERVER_URL);

let userId: string = keychain.getUserInfo().id;

// TODO: put this URL in the right place
const gun = Gun(["https://gun-matrix.herokuapp.com/gun"]);

export default function App() {
  const { nextState, sign: signWithState } = createPeerState(
    myAuthFilter,
    myEncryptionFilter,
    keychain
  );
  const [internalState, dispatch] = useReducer<
    Reducer<InternalState<StateTreeType>, Action>
  >(nextState, {
    peerState: {},
    keys: keychain,
  });
  const state = internalState.peerState;
  const sign = signWithState.bind(null, state);
  // const { state, dispatch, sign } = usePeerState<StateTreeType>(
  //   {},
  //   myAuthFilter,
  //   myEncryptionFilter,
  //   keychain
  // );

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
      {/* <Messenger /> */}
    </div>
  );
}
