#!/usr/bin/env node
import 'source-map-support/register';

import { App } from 'aws-cdk-lib';
import {
    SteampipeServiceStack,
    SteampipeNetworkStack,
} from '../lib';

interface InstanceEnv {
    readonly account: string;
    readonly region: string;
    readonly instance: string;
}

async function main() {
    const app = new App();

    const account = app.node.tryGetContext('account');
    if (!account) {
        throw new Error('CDK command에서 account를 "-c account=XXXX"처럼 입력하세요.');
    }

    const instance = app.node.tryGetContext('instance');
    if (!instance) {
        throw new Error('CDK command에서 instance를 "-c instance=XXXX"처럼 입력하세요.');
    }

    const stack: 'service' | 'network'  = app.node.tryGetContext('stack');
    if (!stack) {
        throw new Error('CDK command에서 stack "-c stack=XXXX"처럼 입력하세요.');
    } else if (!['service', 'network'].includes(stack)) {
        throw new Error(`입력한 "stack"='${stack}'가 유효하지 않습니다., "stack"는 ['service', 'network']이어야 합니다.`);
    }

    const region = 'ap-northeast-1';
    const instanceEnv: InstanceEnv = {
        account,
        region,
        instance,
    };
    switch (stack) {
        case 'network':
            generateNetworkStack(app, instanceEnv);
            break;
        case 'service':
            generateServiceStack(app, instanceEnv);
            break;
    }
}

function generateServiceStack(app: App, instanceEnv: InstanceEnv) {
    new SteampipeServiceStack(app, instanceEnv.instance + '-service-stack', instanceEnv);
}

function generateNetworkStack(app: App, instanceEnv: InstanceEnv) {
    new SteampipeNetworkStack(app, instanceEnv.instance + '-network-stack', instanceEnv);
}

main().catch(console.error);
