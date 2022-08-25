import { Stack, Tags } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { InstanceConfig } from '../';
import { NetworkLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export function createNetworkResources(stack: Stack, instance: InstanceConfig) {
    const vpc = new ec2.Vpc(stack, 'steampipe-vpc', {
        cidr: '10.80.0.0/16',
        // natGateways: 0,
        maxAzs: 1,
        subnetConfiguration: [
            {
                name: 'steampipe-public-subnet-1',
                subnetType: ec2.SubnetType.PUBLIC,
                cidrMask: 24,
            },
            {
                name: 'steampipe-private-subnet-1',
                subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
                cidrMask: 24,
            },
        ],
    });

    const lb = new NetworkLoadBalancer(stack, 'steampipe-nlb', {
        loadBalancerName: 'steampipe-nlb',
        vpc: vpc,
        internetFacing: false,
    });

    Tags.of(lb).add('lookupName', 'steampipe-nlb');
}
