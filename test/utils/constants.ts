import {Deployments} from "../../types";
import * as deployed from "../../deployments/arbitrum.json";

export const CONTRACTS: Deployments = {
  TND: {
   address: deployed.TND,
   contract: "TND",
  },
  esTND: {
   address: deployed.esTND,
   contract: "EsTND",
  },
  bnTND: {
   address: deployed.bnTND,
   contract: "MintableBaseToken",
  },
  sTND: {
   address: deployed.sTND,
   contract: "RewardTracker",
  },
  sTND_RewardDistributor: {
   address: deployed.sTND_RewardDistributor,
   contract: "RewardDistributor",
  },
  sbTND: {
   address: deployed.sbTND,
   contract: "RewardTracker",
  },
  BonusDistributor: {
   address: deployed.BonusDistributor,
   contract: "RewardTracker",
  },
  sbfTND: {
   address: deployed.sbfTND,
   contract: "RewardTracker",
  },
  sbfTND_RewardDistributor: {
   address: deployed.sbfTND_RewardDistributor,
   contract: "RewardDistributor",
  },
  RewardRouter: {
   address: deployed.RewardRouter,
   contract: "RewardRouterV2",
  },
  vTND: {
    address: deployed.vTND,
    contract: "VesterV2",
  },
  InstantVester: {
    address: deployed.InstantVester,
    contract: "InstantVester",
  },
  Burner: {
    address: deployed.Burner,
    contract: "Burner",
  }
}

export const SECONDS_PER_DAY = 86400;

export const adminAddress = '0x85aBbC0f8681c4fB33B6a3A601AD99E92A32D1ac';
export const multisigAddress = '0x80b54e18e5Bb556C6503e1C6F2655749c9e41Da2';
