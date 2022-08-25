import {Stack, Tags} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { deploySteampipe } from './resources-service';
import { deployNetworkResources } from './resources-network';

export interface InstanceProps {
    readonly account: string;
    readonly region: string;
    readonly instance: string;
}

export function initTags(stack: Stack) {
    const tags = Tags.of(stack);
    tags.add('Service', 'emergency-time');
    tags.add('Team', 'emergency-crew');
    tags.add('Environment', 'prod');
    tags.add('User', 'sunil');
}

export class SteampipeNetworkStack extends Stack {
    constructor(scope: Construct, id: string, props: InstanceProps) {
        super(scope, id, {
            env: { account: props.account, region: props.region },
            description: `Network Infrastructure for "${props.instance}"`,
        });
        initTags(this);
        deployNetworkResources(this, props.instance);
    }
}

export class SteampipeServiceStack extends Stack {
    constructor(scope: Construct, id: string, props: InstanceProps) {
        super(scope, id, {
            env: { account: props.account, region: props.region },
            description: `Steampipe Service worker for "${props.instance}"`,
        });
        initTags(this);
        deploySteampipe(this, props.instance);
    }
}
