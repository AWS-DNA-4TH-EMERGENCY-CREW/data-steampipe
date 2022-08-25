import { Stack } from 'aws-cdk-lib';
import { createNetworkResources } from './workflow-network-resources';
import { InstanceConfig } from '../'

export function deployNetworkResources(stack: Stack, name: string): void {
    const instance: InstanceConfig = {
        account: stack.account,
        region: stack.region,
        name: name,
    };
    createNetworkResources(stack, instance);
}