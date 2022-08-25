import { Stack } from 'aws-cdk-lib';
import { createSteampipeFargate } from './workflow-steampipe-fargate';
import { InstanceConfig } from '../';

export function deploySteampipe(stack: Stack, name: string): void {
    const instance: InstanceConfig = {
        account: stack.account,
        region: stack.region,
        name: name,
    };
    createSteampipeFargate(stack, instance);
}
