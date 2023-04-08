import * as deployed from '../deployments/arbitrum.json';

const deploymentNames = typeof Array.from(Object.keys(deployed))
export type DeploymentName = typeof deploymentNames[number]

export interface Deployment {
  address:string,
  contract:string
}

export type Deployments = Record<DeploymentName, Deployment>
