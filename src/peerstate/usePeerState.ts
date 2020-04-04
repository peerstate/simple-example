import { useReducer, Reducer } from "react";
import { Operation } from "fast-json-patch";
import jwt from "jsonwebtoken";
import {
  AuthFilter,
  EncryptionFilter,
  jsonPatchReducer,
  Keychain,
  Action
} from "./";

type InternalState<T> = {
  peerState: T;
  keys: Keychain;
};

// TODO: handle case where token expires
export const usePeerState = function<StateTreeType>(
  initialState: StateTreeType,
  authFilter: AuthFilter<StateTreeType>,
  encryptionFilter: EncryptionFilter<StateTreeType>,
  keychain: Keychain
) {
  const [state, dispatch] = useReducer<
    Reducer<InternalState<StateTreeType>, Action>
  >(
    function(state: InternalState<StateTreeType>, action: Action) {
      // TODO: ensure keys exist in keychain
      const serverPublicKey = keychain.getServerPublicKey();
      const operation = authFilter(
        state.peerState,
        action,
        serverPublicKey,
        keychain.getSecretForEncryptionGroup
      );
      if (!operation) {
        console.warn(`UNAUTHORIZED: action was blocked`, { action });
        return state;
      }
      return {
        ...state,
        peerState: jsonPatchReducer<StateTreeType>(state.peerState, operation)
      };
    },
    { peerState: initialState, keys: keychain }
  );
  const sign = (op: Operation) => {
    if (typeof keychain.getSignedPublicKey() !== "string") {
      throw new Error("signed public key is not available, try again later");
    }
    const senderId = keychain.getUserInfo().id;
    return encryptionFilter(
      state.peerState,
      {
        senderToken: keychain.getSignedPublicKey(),
        operationToken: jwt.sign(op, keychain.getPrivateKey(), {
          algorithm: "RS256"
        })
      },
      op,
      senderId,
      keychain.getSecretForEncryptionGroup
    );
  };
  return { state: state.peerState, dispatch, sign };
};
